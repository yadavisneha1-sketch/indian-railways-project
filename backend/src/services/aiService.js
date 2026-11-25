import { env, getAiConfigStatus } from '../config/env.js';
import { DEMO_NOTICE, STATIONS } from '../data/railwayData.js';
import { mcpClientManager } from '../mcp/client.js';

const SYSTEM_PROMPT = `You are "Railway AI Assistant", a helpful, accurate, beginner-friendly assistant for Indian Railways information.
IMPORTANT RULES:
1. Always use the provided MCP tools to look up trains, schedules, stations, journey plans, PNR/PR tracking, running status, and railway FAQs before answering.
2. NEVER invent train numbers, timings, fares, seat availability, or PNR statuses. Only report data returned by the MCP tools.
3. All data in this system is DEMONSTRATION DATA (not live IRCTC or NTES data). Briefly remind the user when sharing schedules, availability, PNR status, or simulated train running status.
4. Explain answers in clear, simple English using bullet points where helpful.
5. If a user provides a 10-digit PNR/PR number, call track_by_pnr. If they ask for live/running status of a train number, call get_train_running_status.`;

/**
 * Strips fields like $schema or additionalProperties that some LLM tool schemas dislike.
 */
function sanitizeSchemaForGemini(schema) {
  if (!schema || typeof schema !== 'object') return { type: 'object', properties: {} };
  const cleaned = {};
  if (schema.type) cleaned.type = schema.type;
  if (schema.description) cleaned.description = schema.description;
  if (schema.enum) cleaned.enum = schema.enum;
  if (schema.required) cleaned.required = schema.required;
  if (schema.properties && typeof schema.properties === 'object') {
    cleaned.properties = {};
    for (const [key, val] of Object.entries(schema.properties)) {
      cleaned.properties[key] = sanitizeSchemaForGemini(val);
    }
  }
  if (schema.items) {
    cleaned.items = sanitizeSchemaForGemini(schema.items);
  }
  return cleaned;
}

/**
 * Calls Google Gemini REST API with native function calling connected to our MCP tools.
 */
async function runWithGemini({ message, history, mcpTools, toolExecutions }) {
  const functionDeclarations = mcpTools.map((tool) => ({
    name: tool.name,
    description: tool.description || tool.name,
    parameters: sanitizeSchemaForGemini(tool.inputSchema),
  }));

  const contents = [];
  for (const turn of history.slice(-6)) {
    if (!turn?.content) continue;
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(turn.content) }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    env.geminiModel
  )}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`;

  for (let round = 0; round < 4; round += 1) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        tools: [{ functionDeclarations }],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    contents.push({ role: 'model', parts });

    const functionCalls = parts.filter((p) => p.functionCall);
    if (functionCalls.length === 0) {
      const textReply = parts
        .filter((p) => p.text)
        .map((p) => p.text)
        .join('\n')
        .trim();
      return textReply || 'I completed checking the railway tools, but could not generate a summary.';
    }

    const functionResponseParts = [];
    for (const part of functionCalls) {
      const { name, args } = part.functionCall;
      const execution = await mcpClientManager.callTool(name, args || {});
      toolExecutions.push(execution);
      functionResponseParts.push({
        functionResponse: {
          name,
          response: { result: execution.result },
        },
      });
    }

    contents.push({ role: 'user', parts: functionResponseParts });
  }

  return 'Reached maximum tool-calling rounds. Please try asking a more specific question.';
}

/**
 * Calls OpenAI (or OpenAI-compatible) Chat Completions API with MCP tools.
 */
async function runWithOpenAI({ message, history, mcpTools, toolExecutions }) {
  const tools = mcpTools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || tool.name,
      parameters: tool.inputSchema || { type: 'object', properties: {} },
    },
  }));

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const turn of history.slice(-6)) {
    if (!turn?.content) continue;
    messages.push({
      role: turn.role === 'assistant' ? 'assistant' : 'user',
      content: String(turn.content),
    });
  }
  messages.push({ role: 'user', content: message });

  const endpoint = `${env.openaiBaseUrl}/chat/completions`;

  for (let round = 0; round < 4; round += 1) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: env.openaiModel,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const assistantMsg = data?.choices?.[0]?.message;
    if (!assistantMsg) {
      throw new Error('OpenAI returned an empty response.');
    }

    messages.push(assistantMsg);

    const toolCalls = assistantMsg.tool_calls || [];
    if (toolCalls.length === 0) {
      return (assistantMsg.content || '').trim();
    }

    for (const call of toolCalls) {
      let parsedArgs = {};
      try {
        parsedArgs = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        parsedArgs = {};
      }
      const execution = await mcpClientManager.callTool(call.function.name, parsedArgs);
      toolExecutions.push(execution);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(execution.result),
      });
    }
  }

  return 'Reached maximum tool-calling rounds. Please try asking a more specific question.';
}

/**
 * Extracts station tokens mentioned in a user prompt for local fallback routing.
 */
function detectStationsInText(text) {
  const lower = text.toLowerCase();
  const found = [];

  for (const st of STATIONS) {
    const codeRegex = new RegExp(`\\b${st.code.toLowerCase()}\\b`, 'i');
    if (
      codeRegex.test(text) ||
      lower.includes(st.city.toLowerCase()) ||
      lower.includes(st.name.toLowerCase())
    ) {
      if (!found.some((item) => item.code === st.code)) {
        // Track position in text so source precedes destination
        const idx =
          text.search(codeRegex) !== -1
            ? text.search(codeRegex)
            : lower.indexOf(st.city.toLowerCase()) !== -1
              ? lower.indexOf(st.city.toLowerCase())
              : lower.indexOf(st.name.toLowerCase());
        found.push({ ...st, index: idx });
      }
    }
  }

  return found.sort((a, b) => a.index - b.index);
}

/**
 * Local deterministic MCP tool-router used when no external LLM API key is set.
 * Still executes real MCP tools via MCP Client -> Stdio -> MCP Server!
 */
async function runWithLocalFallback({ message, toolExecutions }) {
  const text = message.trim();
  const lower = text.toLowerCase();

  // 1. Check for 10-digit PNR / PR number
  const pnrMatch = text.match(/\b(\d{10})\b/);
  if (pnrMatch) {
    const exec = await mcpClientManager.callTool('track_by_pnr', { pnr: pnrMatch[1] });
    toolExecutions.push(exec);
    const data = exec.result;
    if (!data.found) {
      const sampleList = (data.samplePnrs || [])
        .map((p) => `- \`${p.pnr}\` (Train ${p.trainNumber}, ${p.route})`)
        .join('\n');
      return `${data.message || data.error}\n\nTry one of these demonstration PNR numbers:\n${sampleList}\n\n*(${DEMO_NOTICE})*`;
    }
    const { pnrDetails, trainInfo } = data;
    const paxLines = pnrDetails.passengers
      .map((p) => `- Passenger ${p.passengerNo}: **${p.currentStatus}** (Booked: ${p.bookingStatus})`)
      .join('\n');
    const live = trainInfo?.liveSimulation;
    return [
      `**PNR ${pnrDetails.pnr}** — Train **${pnrDetails.trainNumber} ${trainInfo?.trainName || ''}** (${pnrDetails.boardingStation} → ${pnrDetails.destinationStation}, Class ${pnrDetails.travelClass})`,
      `Chart Status: ${pnrDetails.chartStatus}`,
      '',
      '**Passenger Status (Demo):**',
      paxLines,
      live
        ? `\n**Simulated Running Status:** ${live.status} | Current Station: **${live.currentStationName} (${live.currentStationCode})** | Next Halt: **${live.nextStationName}** (ETA ${live.expectedNextArrival}) | Progress: **${live.progressPercent}%**`
        : '',
      `\n*(${DEMO_NOTICE})*`,
    ].join('\n');
  }

  // 2. Check for 5-digit train number
  const trainNumMatch = text.match(/\b(\d{5})\b/);
  if (trainNumMatch) {
    const wantsTracking =
      lower.includes('track') ||
      lower.includes('live') ||
      lower.includes('status') ||
      lower.includes('where') ||
      lower.includes('delay') ||
      lower.includes('running');

    if (wantsTracking) {
      const exec = await mcpClientManager.callTool('get_train_running_status', {
        identifier: trainNumMatch[1],
      });
      toolExecutions.push(exec);
      const data = exec.result;
      if (!data.found) {
        return `${data.message || data.error}\n\n*(${DEMO_NOTICE})*`;
      }
      const { trainInfo } = data;
      const live = trainInfo.liveSimulation;
      return [
        `**${trainInfo.trainNumber} — ${trainInfo.trainName}** (${trainInfo.source} → ${trainInfo.destination})`,
        `- **Simulated Status:** ${live.status}`,
        `- **Current Station:** ${live.currentStationName} (${live.currentStationCode})`,
        `- **Next Stop:** ${live.nextStationName} (${live.nextStationCode}) — ETA ${live.expectedNextArrival}`,
        `- **Route Progress:** ${live.progressPercent}% | Last Report: ${live.lastReportedTime}`,
        `\n*(${DEMO_NOTICE})*`,
      ].join('\n');
    }

    const exec = await mcpClientManager.callTool('get_train_schedule', {
      trainQuery: trainNumMatch[1],
    });
    toolExecutions.push(exec);
    const data = exec.result;
    if (!data.found) {
      return `${data.message || data.error}\n\n*(${DEMO_NOTICE})*`;
    }
    const stops = data.schedule
      .map((s) => `- **${s.stationName} (${s.stationCode})**: Arr ${s.arrival}, Dep ${s.departure} (Day ${s.day}, Platform ${s.platform})`)
      .join('\n');
    return `**Schedule for ${data.trainNumber} — ${data.trainName}** (${data.duration}, ${data.distanceKm} km)\nRunning Days: ${data.runningDays.join(', ')}\n\n${stops}\n\n*(${DEMO_NOTICE})*`;
  }

  // 3. Check for two stations (train search or journey planning)
  const matchedStations = detectStationsInText(text);
  if (matchedStations.length >= 2) {
    const source = matchedStations[0].code;
    const destination = matchedStations[1].code;
    const isPlan = lower.includes('plan') || lower.includes('suggest') || lower.includes('best') || lower.includes('budget');

    if (isPlan) {
      const exec = await mcpClientManager.callTool('plan_journey', {
        source,
        destination,
        preference: lower.includes('budget') || lower.includes('cheap') ? 'budget' : 'fastest',
      });
      toolExecutions.push(exec);
      const data = exec.result;
      if (data.directOptions?.length > 0) {
        const list = data.directOptions
          .map(
            (t) =>
              `- **${t.trainNumber} ${t.trainName}** (${t.type}): Dep ${t.departureTime} (${t.source}) → Arr ${t.arrivalTime} (${t.destination}) | ${t.duration}`
          )
          .join('\n');
        return `${data.recommendation}\n\n${list}\n\n*(${DEMO_NOTICE})*`;
      }
      if (data.connectingOptions?.length > 0) {
        const conn = data.connectingOptions[0];
        return `${data.recommendation}\n\n- Leg 1: **${conn.leg1.trainNumber} ${conn.leg1.trainName}** (${conn.leg1.from} ${conn.leg1.departure} → ${conn.leg1.to} ${conn.leg1.arrival})\n- Leg 2: **${conn.leg2.trainNumber} ${conn.leg2.trainName}** (${conn.leg2.from} ${conn.leg2.departure} → ${conn.leg2.to} ${conn.leg2.arrival})\n\n*(${DEMO_NOTICE})*`;
      }
      return `${data.recommendation}\n\n*(${DEMO_NOTICE})*`;
    }

    const exec = await mcpClientManager.callTool('search_trains', { source, destination });
    toolExecutions.push(exec);
    const data = exec.result;
    if (!data.trains?.length) {
      return `No direct demonstration trains were found from **${source}** to **${destination}**.\n\n*(${DEMO_NOTICE})*`;
    }
    const list = data.trains
      .map((t) => {
        const classes = t.classes.map((c) => `${c.code} (₹${c.demoFareInr})`).join(', ');
        return `- **${t.trainNumber} ${t.trainName}**: Dep ${t.departureTime} → Arr ${t.arrivalTime} (${t.duration}) | Classes: ${classes}`;
      })
      .join('\n');
    return `Found **${data.count}** demonstration train(s) from **${source}** to **${destination}**:\n\n${list}\n\n*(${DEMO_NOTICE})*`;
  }

  // 4. Single station info query
  if (matchedStations.length === 1 && (lower.includes('station') || lower.includes('platform') || lower.includes('amenities') || lower.includes('about'))) {
    const exec = await mcpClientManager.callTool('get_station_information', {
      stationQuery: matchedStations[0].code,
    });
    toolExecutions.push(exec);
    const { station, servingTrains } = exec.result;
    return [
      `**${station.name} (${station.code})** — ${station.city}, ${station.state}`,
      `- Zone: ${station.zone} | Platforms: ${station.platforms}`,
      `- Amenities: ${station.amenities.join(', ')}`,
      `- Summary: ${station.highlights}`,
      `- Demonstration trains serving this station: ${servingTrains.map((t) => `${t.trainNumber} ${t.trainName}`).join('; ')}`,
      `\n*(${DEMO_NOTICE})*`,
    ].join('\n');
  }

  // 5. Named train schedule query (e.g., "Rajdhani schedule", "Vande Bharat")
  const namedTrainMatch = text.match(/\b(rajdhani|shatabdi|vande bharat|deccan queen|telangana|karnataka|narayanadri|venkatadri|grand trunk)\b/i);
  if (namedTrainMatch) {
    const exec = await mcpClientManager.callTool('get_train_schedule', {
      trainQuery: namedTrainMatch[1],
    });
    toolExecutions.push(exec);
    const data = exec.result;
    if (data.found) {
      const stops = data.schedule
        .map((s) => `- ${s.stationName} (${s.stationCode}): Arr ${s.arrival}, Dep ${s.departure}`)
        .join('\n');
      return `**${data.trainNumber} — ${data.trainName}** (${data.source} → ${data.destination}, ${data.duration}):\n\n${stops}\n\n*(${DEMO_NOTICE})*`;
    }
  }

  // 6. Default to Railway FAQ tool
  const exec = await mcpClientManager.callTool('railway_faq', { question: text });
  toolExecutions.push(exec);
  const matches = exec.result?.matches || [];
  const faqText = matches
    .map((m) => `**${m.question}**\n${m.answer}`)
    .join('\n\n');

  return [
    faqText,
    '',
    'You can also ask me to:',
    '- Search trains (e.g., *"Find trains from Mumbai to New Delhi"* or *"Secunderabad to Tirupati"*)',
    '- Track a 10-digit PNR / PR number (e.g., *"Track PNR 4521896304"*) or train status (*"Track train 22436"*)',
    '- Show a train schedule (*"Schedule of 12951"*) or station info (*"Tell me about NDLS station"*)',
    `\n*(${DEMO_NOTICE})*`,
  ].join('\n');
}

/**
 * Orchestrates User -> AI Model -> MCP Client -> MCP Server -> MCP Tool -> Result -> AI Response.
 */
export async function runRailwayAssistant({ message, history = [] }) {
  const aiStatus = getAiConfigStatus();
  const mcpTools = await mcpClientManager.listTools();
  const toolExecutions = [];
  let reply = '';
  let fallbackReason = null;

  try {
    if (aiStatus.activeProvider === 'gemini') {
      reply = await runWithGemini({ message, history, mcpTools, toolExecutions });
    } else if (aiStatus.activeProvider === 'openai') {
      reply = await runWithOpenAI({ message, history, mcpTools, toolExecutions });
    } else {
      reply = await runWithLocalFallback({ message, toolExecutions });
    }
  } catch (error) {
    fallbackReason = error.message;
    reply = await runWithLocalFallback({ message, toolExecutions });
  }

  const executedToolNames = toolExecutions.map((t) => t.toolName).join(', ') || 'None';

  const pipelineFlow = [
    { step: 'User', detail: message },
    {
      step: 'AI Model',
      detail: fallbackReason
        ? `${aiStatus.modeLabel} failed (${fallbackReason}); used Local MCP Router`
        : aiStatus.modeLabel,
    },
    {
      step: 'MCP Client',
      detail: `railway-ai-backend-client discovered ${mcpTools.length} tools via StdioClientTransport`,
    },
    { step: 'MCP Server', detail: 'railway-ai-mcp-server (@modelcontextprotocol/sdk)' },
    { step: 'MCP Tool', detail: executedToolNames },
    {
      step: 'Result',
      detail: `${toolExecutions.length} tool call(s) returned structured JSON`,
    },
    { step: 'AI Response', detail: `${reply.slice(0, 120)}${reply.length > 120 ? '...' : ''}` },
  ];

  return {
    reply,
    aiMode: aiStatus,
    fallbackReason,
    toolExecutions,
    pipelineFlow,
    isDemoData: true,
    disclaimer: DEMO_NOTICE,
  };
}
