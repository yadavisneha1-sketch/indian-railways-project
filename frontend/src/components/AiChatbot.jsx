import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Loader2,
  Send,
  Trash2,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/apiClient';

const STARTER_PROMPTS = [
  'Track PNR 4521896304 and tell me the current train status',
  'Search trains from Mumbai to New Delhi',
  'Show the full schedule of 22436 Vande Bharat',
  'Plan a journey from Secunderabad to Tirupati',
  'Tell me about NDLS station amenities',
  'What are Tatkal booking timings and PNR rules?',
];

function formatSimpleLines(text) {
  return String(text || '')
    .split('\n')
    .map((line, idx) => {
      // Render **bold** and `code` cleanly without unsafe HTML injection
      const segments = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      return (
        <p key={idx} className={line.trim() === '' ? 'h-2' : 'leading-relaxed'}>
          {segments.map((seg, i) => {
            if (seg.startsWith('**') && seg.endsWith('**')) {
              return (
                <strong key={i} className="font-semibold text-slate-900">
                  {seg.slice(2, -2)}
                </strong>
              );
            }
            if (seg.startsWith('`') && seg.endsWith('`')) {
              return (
                <code
                  key={i}
                  className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-xs text-indigo-800"
                >
                  {seg.slice(1, -1)}
                </code>
              );
            }
            return <span key={i}>{seg}</span>;
          })}
        </p>
      );
    });
}

function ToolTraceCard({ execution }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2
            className={`h-4 w-4 ${
              execution.status === 'success' ? 'text-emerald-600' : 'text-amber-600'
            }`}
          />
          <span className="font-mono font-bold text-indigo-700">{execution.toolName}</span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
            {execution.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <span>{execution.durationMs} ms</span>
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            {expanded ? (
              <>
                Hide Result <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                View Result <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-700">
        <span className="font-semibold text-slate-500">Input: </span>
        {JSON.stringify(execution.inputParams)}
      </div>

      {expanded && (
        <pre className="mt-2 max-h-52 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-emerald-300">
          {JSON.stringify(execution.result, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AiChatbot({ health, pendingPrompt, onConsumePendingPrompt }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your **Railway AI Assistant**. Ask me to search trains, inspect schedules, look up station facilities, plan a journey, explain railway rules, or track a 10-digit PNR / PR number.\n\nEvery answer uses real **MCP (Model Context Protocol)** tools connected to our Node.js MCP server.',
      toolExecutions: [],
      pipelineFlow: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const sendMessage = async (textToSend) => {
    const trimmed = String(textToSend || '').trim();
    if (!trimmed || loading) return;

    setError('');
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const historyForApi = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await apiClient.sendChatMessage(trimmed, historyForApi);
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        toolExecutions: response.toolExecutions || [],
        pipelineFlow: response.pipelineFlow || null,
        aiMode: response.aiMode,
        fallbackReason: response.fallbackReason,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pendingPrompt) {
      sendMessage(pendingPrompt);
      onConsumePendingPrompt?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearHistory = () => {
    setMessages((prev) => [prev[0]]);
    setError('');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Main Chat Column */}
      <div className="flex h-[680px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI Railway Assistant</h2>
              <p className="text-xs text-slate-500">
                {health?.aiMode?.modeLabel || 'Connected to MCP Server'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearHistory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] space-y-3 rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-800'
                }`}
              >
                {msg.role === 'user' ? (
                  <p>{msg.content}</p>
                ) : (
                  <div className="space-y-1">{formatSimpleLines(msg.content)}</div>
                )}

                {msg.fallbackReason && (
                  <p className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs text-amber-900">
                    External LLM API note: {msg.fallbackReason}. Executed via Local MCP Tool Router.
                  </p>
                )}

                {/* MCP Tool Execution Trace inside message */}
                {msg.toolExecutions?.length > 0 && (
                  <div className="space-y-2 border-t border-slate-200 pt-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <Cpu className="h-3.5 w-3.5 text-indigo-600" />
                      MCP Tools Invoked ({msg.toolExecutions.length})
                    </p>
                    {msg.toolExecutions.map((exec, index) => (
                      <ToolTraceCard key={`${msg.id}-tool-${index}`} execution={exec} />
                    ))}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <span>AI Model is discovering &amp; executing MCP tools...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mx-5 mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </div>
        )}

        {/* Composer */}
        <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about trains, schedules, PNR 4521896304, stations, or railway rules..."
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Right Sidebar: Quick Prompts + Live MCP Pipeline */}
      <div className="space-y-5 lg:col-span-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Try Sample Questions</h3>
          <p className="mt-1 text-xs text-slate-500">
            Click any prompt to watch the AI call our MCP tools
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={loading}
                onClick={() => sendMessage(prompt)}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800"
              >
                <span>{prompt}</span>
                <ArrowRight className="ml-2 h-3.5 w-3.5 shrink-0 text-indigo-500" />
              </button>
            ))}
          </div>
        </div>

        {/* Live Architecture Flow Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">
            AI → MCP Execution Pipeline
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            User → AI Model → MCP Client → MCP Server → MCP Tool → Result → AI Response
          </p>

          <div className="mt-4 space-y-2">
            {(
              messages
                .slice()
                .reverse()
                .find((m) => m.pipelineFlow)?.pipelineFlow || [
                { step: 'User', detail: 'Submits natural-language railway query' },
                { step: 'AI Model', detail: 'Chooses matching MCP tool(s) & arguments' },
                { step: 'MCP Client', detail: 'Sends JSON-RPC tool call over Stdio' },
                { step: 'MCP Server', detail: 'railway-ai-mcp-server validates Zod schema' },
                { step: 'MCP Tool', detail: 'Executes search / schedule / PNR / FAQ tool' },
                { step: 'Result', detail: 'Returns structured JSON back to AI' },
                { step: 'AI Response', detail: 'Summarizes answer in plain English' },
              ]
            ).map((item, idx) => (
              <div
                key={item.step}
                className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {idx + 1}
                </span>
                <div>
                  <p className="font-bold text-slate-800">{item.step}</p>
                  <p className="text-slate-600">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
