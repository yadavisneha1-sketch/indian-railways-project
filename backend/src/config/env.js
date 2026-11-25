import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env if it exists; silently ignore if missing so .env.example defaults still work
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const rawProvider = (process.env.LLM_PROVIDER || 'auto').toLowerCase().trim();

export const env = {
  port: Number(process.env.PORT) || 5000,
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  llmProvider: rawProvider,
  geminiApiKey: (process.env.GEMINI_API_KEY || '').trim(),
  geminiModel: (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim(),
  openaiApiKey: (process.env.OPENAI_API_KEY || '').trim(),
  openaiModel: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
  openaiBaseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
};

/**
 * Determines which LLM backend is active without exposing secret key values.
 */
export function getAiConfigStatus() {
  const hasGemini = Boolean(env.geminiApiKey);
  const hasOpenAi = Boolean(env.openaiApiKey);

  let activeProvider = 'fallback';
  let activeModel = 'local-mcp-router';

  if (env.llmProvider === 'gemini' && hasGemini) {
    activeProvider = 'gemini';
    activeModel = env.geminiModel;
  } else if (env.llmProvider === 'openai' && hasOpenAi) {
    activeProvider = 'openai';
    activeModel = env.openaiModel;
  } else if (env.llmProvider === 'auto') {
    if (hasGemini) {
      activeProvider = 'gemini';
      activeModel = env.geminiModel;
    } else if (hasOpenAi) {
      activeProvider = 'openai';
      activeModel = env.openaiModel;
    }
  }

  return {
    activeProvider,
    activeModel,
    hasApiKey: activeProvider !== 'fallback',
    modeLabel:
      activeProvider === 'fallback'
        ? 'Local MCP Tool-Router Mode (No LLM API key configured)'
        : `${activeProvider.toUpperCase()} (${activeModel}) + MCP Tool Calling`,
  };
}
