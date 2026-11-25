import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Connects to `@samarth-23-eng/india-mcp`, prints all available tools and schemas,
 * and attempts a sample Hyderabad -> Tirupati query if a train-search tool is present.
 */
async function inspectIndiaMcp() {
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  const transport = new StdioClientTransport({
    command: npxCommand,
    args: ['-y', '@samarth-23-eng/india-mcp'],
  });

  const client = new Client({
    name: 'indian-railways-inspector',
    version: '1.0.0',
  });

  console.log('Starting @samarth-23-eng/india-mcp over stdio...');
  await client.connect(transport);
  console.log('Connected!\n');

  try {
    const { tools } = await client.listTools();
    console.log(`Found ${tools.length} tool(s):\n`);

    for (const tool of tools) {
      console.log(`- Name: ${tool.name}`);
      if (tool.description) {
        console.log(`  Description: ${tool.description}`);
      }
      console.log(`  Input Schema: ${JSON.stringify(tool.inputSchema, null, 2)}\n`);
    }

    // Look for a railway/train-between-stations tool automatically based on name/description.
    const trainSearchTool = tools.find((t) => {
      const text = `${t.name} ${t.description ?? ''}`.toLowerCase();
      return (
        text.includes('between') ||
        (text.includes('train') && text.includes('station')) ||
        text.includes('search_train') ||
        text.includes('search-train')
      );
    });

    if (trainSearchTool) {
      console.log(`--- Testing tool: ${trainSearchTool.name} (Hyderabad/SC -> Tirupati/TPTY) ---`);
      const props = trainSearchTool.inputSchema?.properties ?? {};
      const sampleArgs = {};

      for (const key of Object.keys(props)) {
        const lower = key.toLowerCase();
        if (lower.includes('from') || lower.includes('source') || lower.includes('origin')) {
          sampleArgs[key] = 'SC';
        } else if (lower.includes('to') || lower.includes('dest')) {
          sampleArgs[key] = 'TPTY';
        } else if (lower.includes('date')) {
          sampleArgs[key] = '2026-11-26';
        }
      }

      console.log('Calling with args:', JSON.stringify(sampleArgs));
      const result = await client.callTool({
        name: trainSearchTool.name,
        arguments: sampleArgs,
      });
      console.log('Sample response:\n', JSON.stringify(result, null, 2));
    } else {
      console.log('No obvious trains-between-stations tool matched automatically.');
    }
  } finally {
    await client.close();
  }
}

inspectIndiaMcp().catch((error) => {
  console.error('Failed to inspect @samarth-23-eng/india-mcp:', error);
  process.exitCode = 1;
});
