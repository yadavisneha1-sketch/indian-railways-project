import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, getAiConfigStatus, isOriginAllowed } from './config/env.js';
import { mcpClientManager } from './mcp/client.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIST_DIR = path.resolve(__dirname, '../../frontend/dist');
const FRONTEND_INDEX_HTML = path.join(FRONTEND_DIST_DIR, 'index.html');

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter);

  if (fs.existsSync(FRONTEND_INDEX_HTML)) {
    app.use(express.static(FRONTEND_DIST_DIR));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next();
      }
      return res.sendFile(FRONTEND_INDEX_HTML);
    });
  } else {
    app.get('/', (req, res) => {
      res.json({
        name: 'Railway AI Assistant API',
        status: 'running',
        endpoints: [
          'GET /api/health',
          'GET /api/dashboard',
          'GET /api/trains/search',
          'GET /api/trains/:trainQuery/schedule',
          'GET /api/trains/:identifier/status',
          'GET /api/pnr/:pnr',
          'GET /api/stations',
          'GET /api/stations/:code',
          'POST /api/journey/plan',
          'POST /api/chat',
          'GET /api/mcp/tools',
          'POST /api/mcp/call',
        ],
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const isDirectExecution =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());

if (isDirectExecution) {
  const app = createApp();
  const server = app.listen(env.port, async () => {
    const aiStatus = getAiConfigStatus();
    console.log(`[Backend] Railway AI Assistant running at http://localhost:${env.port}`);
    console.log(`[AI Mode] ${aiStatus.modeLabel}`);
    try {
      const tools = await mcpClientManager.listTools();
      console.log(`[MCP Client] Connected to railway-ai-mcp-server (${tools.length} tools ready)`);
    } catch (err) {
      console.error('[MCP Client] Initial connection warning:', err.message);
    }
  });

  const shutdown = async () => {
    await mcpClientManager.close();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
