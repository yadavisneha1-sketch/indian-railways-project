import express from 'express';
import { getAiConfigStatus } from '../config/env.js';
import { DEMO_NOTICE } from '../data/railwayData.js';
import { mcpClientManager } from '../mcp/client.js';
import { runRailwayAssistant } from '../services/aiService.js';
import { getDashboardSummary, listAllStations } from '../services/railwayService.js';

export const apiRouter = express.Router();

apiRouter.get('/health', async (req, res, next) => {
  try {
    const tools = await mcpClientManager.listTools();
    res.json({
      status: 'ok',
      service: 'railway-ai-assistant-backend',
      mcpConnected: true,
      mcpToolsCount: tools.length,
      aiMode: getAiConfigStatus(),
      isDemoData: true,
      disclaimer: DEMO_NOTICE,
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/dashboard', async (req, res, next) => {
  try {
    const tools = await mcpClientManager.listTools();
    const summary = getDashboardSummary();
    res.json({
      ...summary,
      aiMode: getAiConfigStatus(),
      mcpToolsCount: tools.length,
      stations: listAllStations(),
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/stations', (req, res) => {
  res.json({
    isDemoData: true,
    disclaimer: DEMO_NOTICE,
    stations: listAllStations(),
  });
});

apiRouter.get('/stations/:code', async (req, res, next) => {
  try {
    const stationQuery = String(req.params.code || '').trim();
    if (!stationQuery) {
      return res.status(400).json({ error: 'Station code or name is required.' });
    }
    const execution = await mcpClientManager.callTool('get_station_information', { stationQuery });
    res.json({ mcpExecution: execution, ...execution.result });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/trains/search', async (req, res, next) => {
  try {
    const source = String(req.query.source || '').trim();
    const destination = String(req.query.destination || '').trim();
    const date = String(req.query.date || '').trim();
    const travelClass = String(req.query.travelClass || '').trim();

    if (!source || !destination) {
      return res.status(400).json({
        error: 'Both "source" and "destination" query parameters are required.',
      });
    }

    if (source.toLowerCase() === destination.toLowerCase()) {
      return res.status(400).json({
        error: 'Source and destination stations must be different.',
      });
    }

    const execution = await mcpClientManager.callTool('search_trains', {
      source,
      destination,
      ...(date ? { date } : {}),
      ...(travelClass ? { travelClass } : {}),
    });

    res.json({ mcpExecution: execution, ...execution.result });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/trains/:trainQuery/schedule', async (req, res, next) => {
  try {
    const trainQuery = String(req.params.trainQuery || '').trim();
    if (!trainQuery) {
      return res.status(400).json({ error: 'Train number or name is required.' });
    }
    const execution = await mcpClientManager.callTool('get_train_schedule', { trainQuery });
    res.json({ mcpExecution: execution, ...execution.result });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/trains/:identifier/status', async (req, res, next) => {
  try {
    const identifier = String(req.params.identifier || '').trim();
    if (!identifier) {
      return res.status(400).json({ error: 'Train number or PNR is required.' });
    }
    const execution = await mcpClientManager.callTool('get_train_running_status', { identifier });
    res.json({ mcpExecution: execution, ...execution.result });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/pnr/:pnr', async (req, res, next) => {
  try {
    const pnr = String(req.params.pnr || '').replace(/\s|-/g, '').trim();
    if (!/^\d{10}$/.test(pnr)) {
      return res.status(400).json({
        error: 'Invalid PNR/PR number. Please enter a 10-digit numeric PNR (e.g., 4521896304).',
      });
    }
    const execution = await mcpClientManager.callTool('track_by_pnr', { pnr });
    res.json({ mcpExecution: execution, ...execution.result });
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/journey/plan', async (req, res, next) => {
  try {
    const source = String(req.body?.source || '').trim();
    const destination = String(req.body?.destination || '').trim();
    const date = String(req.body?.date || '').trim();
    const preference = req.body?.preference === 'budget' ? 'budget' : 'fastest';

    if (!source || !destination) {
      return res.status(400).json({ error: 'Both source and destination are required.' });
    }

    const execution = await mcpClientManager.callTool('plan_journey', {
      source,
      destination,
      ...(date ? { date } : {}),
      preference,
    });
    res.json({ mcpExecution: execution, ...execution.result });
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/chat', async (req, res, next) => {
  try {
    const message = String(req.body?.message || '').trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message) {
      return res.status(400).json({ error: 'Chat message cannot be empty.' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Chat message must be 1000 characters or fewer.' });
    }

    const result = await runRailwayAssistant({ message, history });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/mcp/tools', async (req, res, next) => {
  try {
    const tools = await mcpClientManager.listTools();
    res.json({
      serverName: 'railway-ai-mcp-server',
      transport: 'stdio',
      toolsCount: tools.length,
      tools,
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/mcp/call', async (req, res, next) => {
  try {
    const toolName = String(req.body?.toolName || '').trim();
    const args = req.body?.arguments && typeof req.body.arguments === 'object' ? req.body.arguments : {};

    if (!toolName) {
      return res.status(400).json({ error: 'toolName is required.' });
    }

    const execution = await mcpClientManager.callTool(toolName, args);
    res.json(execution);
  } catch (error) {
    next(error);
  }
});
