import assert from 'node:assert/strict';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MCP_SERVER_PATH = path.resolve(__dirname, '../src/mcp/server.js');

describe('MCP Server & All 7 Railway Tools (Stdio Transport)', () => {
  let client;

  before(async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [MCP_SERVER_PATH],
    });
    client = new Client({ name: 'mcp-test-client', version: '1.0.0' });
    await client.connect(transport);
  });

  after(async () => {
    if (client) {
      await client.close();
    }
  });

  async function invokeTool(name, args) {
    const res = await client.callTool({ name, arguments: args });
    assert.ok(Array.isArray(res.content) && res.content.length > 0, `Tool ${name} should return content`);
    const text = res.content[0].text;
    return JSON.parse(text);
  }

  it('discovers all 7 expected MCP tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    assert.deepEqual(names, [
      'get_station_information',
      'get_train_running_status',
      'get_train_schedule',
      'plan_journey',
      'railway_faq',
      'search_trains',
      'track_by_pnr',
    ]);
  });

  it('search_trains returns demonstration trains for MMCT -> NDLS', async () => {
    const data = await invokeTool('search_trains', { source: 'MMCT', destination: 'NDLS' });
    assert.equal(data.isDemoData, true);
    assert.ok(data.count >= 1);
    assert.equal(data.trains[0].trainNumber, '12951');
  });

  it('get_train_schedule returns full stops for 22436 Vande Bharat', async () => {
    const data = await invokeTool('get_train_schedule', { trainQuery: '22436' });
    assert.equal(data.found, true);
    assert.equal(data.trainNumber, '22436');
    assert.ok(Array.isArray(data.schedule) && data.schedule.length >= 4);
  });

  it('get_station_information returns details for NDLS', async () => {
    const data = await invokeTool('get_station_information', { stationQuery: 'NDLS' });
    assert.equal(data.found, true);
    assert.equal(data.station.code, 'NDLS');
    assert.ok(data.servingTrainsCount >= 1);
  });

  it('plan_journey suggests direct or connecting journey for SC -> TPTY', async () => {
    const data = await invokeTool('plan_journey', {
      source: 'SC',
      destination: 'TPTY',
      preference: 'fastest',
    });
    assert.equal(data.isDemoData, true);
    assert.ok(data.directOptions.length >= 1);
  });

  it('railway_faq answers Tatkal booking question', async () => {
    const data = await invokeTool('railway_faq', { question: 'What is Tatkal booking timing?' });
    assert.ok(Array.isArray(data.matches) && data.matches.length >= 1);
    assert.match(data.matches[0].answer, /10:00 AM|11:00 AM/i);
  });

  it('track_by_pnr tracks PNR 4521896304 and linked train simulation', async () => {
    const data = await invokeTool('track_by_pnr', { pnr: '4521896304' });
    assert.equal(data.found, true);
    assert.equal(data.pnrDetails.pnr, '4521896304');
    assert.equal(data.trainInfo.trainNumber, '12951');
    assert.ok(data.trainInfo.liveSimulation.currentStationCode);
  });

  it('get_train_running_status retrieves simulated running status for train 12734', async () => {
    const data = await invokeTool('get_train_running_status', { identifier: '12734' });
    assert.equal(data.found, true);
    assert.equal(data.trainInfo.trainNumber, '12734');
    assert.ok(typeof data.trainInfo.liveSimulation.progressPercent === 'number');
  });
});
