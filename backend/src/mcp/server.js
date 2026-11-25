import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  getStationInformation,
  getTrainRunningStatus,
  getTrainSchedule,
  planJourney,
  searchRailwayFaq,
  searchTrains,
  trackByPnr,
} from '../services/railwayService.js';

/**
 * Official Model Context Protocol (MCP) Server for Railway AI Assistant.
 * Exposes 7 railway tools over stdio transport using @modelcontextprotocol/sdk.
 */
export function createRailwayMcpServer() {
  const server = new McpServer({
    name: 'railway-ai-mcp-server',
    version: '1.0.0',
  });

  const wrapJson = (payload) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2),
      },
    ],
  });

  server.registerTool(
    'search_trains',
    {
      title: 'Search Trains',
      description:
        'Search available demonstration trains between a source station and destination station, optionally filtered by journey date (YYYY-MM-DD) or class (1A, 2A, 3A, SL, CC, EC).',
      inputSchema: {
        source: z.string().min(1).describe('Source station code or city name (e.g., MMCT, NDLS, SC, Mumbai)'),
        destination: z.string().min(1).describe('Destination station code or city name (e.g., NDLS, TPTY, BSB)'),
        date: z.string().optional().describe('Optional journey date in YYYY-MM-DD format'),
        travelClass: z.string().optional().describe('Optional travel class filter (e.g., 1A, 2A, 3A, SL, CC, EC)'),
      },
    },
    async ({ source, destination, date, travelClass }) => {
      return wrapJson(searchTrains({ source, destination, date, travelClass }));
    }
  );

  server.registerTool(
    'get_train_schedule',
    {
      title: 'Get Train Schedule',
      description:
        'Retrieve the full route timetable, intermediate stations, arrival/departure times, halts, platforms, and distances for a train number or name.',
      inputSchema: {
        trainQuery: z.string().min(1).describe('Train number (e.g., 12951, 22436) or partial train name (e.g., Rajdhani)'),
      },
    },
    async ({ trainQuery }) => {
      return wrapJson(getTrainSchedule({ trainQuery }));
    }
  );

  server.registerTool(
    'get_station_information',
    {
      title: 'Get Station Information',
      description:
        'Retrieve station details including zone, number of platforms, passenger amenities, and demonstration trains serving the station.',
      inputSchema: {
        stationQuery: z.string().min(1).describe('Station code (e.g., NDLS, HWH, SC) or city/station name'),
      },
    },
    async ({ stationQuery }) => {
      return wrapJson(getStationInformation({ stationQuery }));
    }
  );

  server.registerTool(
    'plan_journey',
    {
      title: 'Plan Journey',
      description:
        'Suggest direct or 1-stop connecting journey options between a source and destination station based on preference (fastest or budget).',
      inputSchema: {
        source: z.string().min(1).describe('Origin station code or city name'),
        destination: z.string().min(1).describe('Destination station code or city name'),
        date: z.string().optional().describe('Optional journey date (YYYY-MM-DD)'),
        preference: z.enum(['fastest', 'budget']).optional().describe('Journey preference: fastest or budget'),
      },
    },
    async ({ source, destination, date, preference }) => {
      return wrapJson(planJourney({ source, destination, date, preference }));
    }
  );

  server.registerTool(
    'railway_faq',
    {
      title: 'Railway FAQ',
      description:
        'Answer common Indian Railway questions such as PNR/RAC/WL rules, Tatkal booking timings, chart preparation, luggage allowance, cancellation/TDR, and helpline 139.',
      inputSchema: {
        question: z.string().min(1).describe('Passenger question or topic keywords'),
      },
    },
    async ({ question }) => {
      return wrapJson(searchRailwayFaq({ question }));
    }
  );

  server.registerTool(
    'track_by_pnr',
    {
      title: 'Track Train & Booking by PNR / PR Number',
      description:
        'Look up a 10-digit PNR (PR) number in the demonstration dataset to retrieve passenger booking status (CNF/RAC/WL) and simulated train running status, current station, delay, and next halt.',
      inputSchema: {
        pnr: z.string().min(1).describe('10-digit PNR / PR number (e.g., 4521896304, 8291045623)'),
      },
    },
    async ({ pnr }) => {
      return wrapJson(trackByPnr({ pnr }));
    }
  );

  server.registerTool(
    'get_train_running_status',
    {
      title: 'Get Train Running Status',
      description:
        'Retrieve simulated demonstration running status, current station, delay in minutes, route progress percentage, and upcoming halts for a train number or 10-digit PNR.',
      inputSchema: {
        identifier: z.string().min(1).describe('5-digit train number (e.g., 12951) or 10-digit PNR number'),
      },
    },
    async ({ identifier }) => {
      return wrapJson(getTrainRunningStatus({ identifier }));
    }
  );

  return server;
}

// Run standalone over stdio when executed directly
const isDirectExecution =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());

if (isDirectExecution) {
  const server = createRailwayMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP Server] railway-ai-mcp-server listening on stdio');
}
