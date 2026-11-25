import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MCP_SERVER_PATH = path.resolve(__dirname, './server.js');

class RailwayMcpClientManager {
  constructor() {
    this.client = null;
    this.transport = null;
    this.connectPromise = null;
    this.cachedTools = [];
  }

  /**
   * Ensures a live stdio connection to our MCP server (backend/src/mcp/server.js).
   */
  async ensureConnected() {
    if (this.client) {
      return this.client;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = (async () => {
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [MCP_SERVER_PATH],
      });

      const client = new Client({
        name: 'railway-ai-backend-client',
        version: '1.0.0',
      });

      client.onclose = () => {
        this.client = null;
        this.transport = null;
        this.cachedTools = [];
      };

      await client.connect(transport);
      this.transport = transport;
      this.client = client;

      const { tools } = await client.listTools();
      this.cachedTools = tools;

      return client;
    })();

    try {
      return await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  /**
   * Discovers tools exposed by the MCP server.
   */
  async listTools() {
    const client = await this.ensureConnected();
    const { tools } = await client.listTools();
    this.cachedTools = tools;
    return tools;
  }

  /**
   * Invokes an MCP tool through the official MCP Client -> Stdio -> MCP Server flow
   * and returns structured metadata for UI transparency.
   */
  async callTool(toolName, args = {}) {
    const startedAt = Date.now();
    const client = await this.ensureConnected();

    try {
      const rawResult = await client.callTool({
        name: toolName,
        arguments: args,
      });

      const durationMs = Date.now() - startedAt;
      const textContent = rawResult?.content?.find((item) => item.type === 'text')?.text ?? '';
      let parsedData = textContent;
      try {
        parsedData = JSON.parse(textContent);
      } catch {
        // Keep raw text if not JSON
      }

      const isError = Boolean(rawResult?.isError || parsedData?.error);

      return {
        toolName,
        inputParams: args,
        status: isError ? 'warning' : 'success',
        durationMs,
        result: parsedData,
        rawText: textContent,
      };
    } catch (error) {
      return {
        toolName,
        inputParams: args,
        status: 'error',
        durationMs: Date.now() - startedAt,
        result: { error: error.message || 'MCP tool invocation failed' },
        rawText: error.message || 'MCP tool invocation failed',
      };
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.transport = null;
      this.cachedTools = [];
    }
  }
}

export const mcpClientManager = new RailwayMcpClientManager();
