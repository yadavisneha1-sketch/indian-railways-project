import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { mcpClientManager } from '../src/mcp/client.js';
import { createApp } from '../src/server.js';

describe('Express REST API & AI + MCP Integration', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await mcpClientManager.close();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('GET /api/health confirms MCP connection and AI mode', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.mcpConnected, true);
    assert.equal(body.mcpToolsCount, 7);
    assert.equal(body.isDemoData, true);
  });

  it('GET /api/trains/search returns trains and validates bad input', async () => {
    const badRes = await fetch(`${baseUrl}/api/trains/search?source=NDLS&destination=NDLS`);
    assert.equal(badRes.status, 400);

    const goodRes = await fetch(`${baseUrl}/api/trains/search?source=SC&destination=TPTY`);
    assert.equal(goodRes.status, 200);
    const data = await goodRes.json();
    assert.ok(data.count >= 2);
    assert.equal(data.mcpExecution.toolName, 'search_trains');
  });

  it('GET /api/pnr/:pnr validates format and retrieves sample PNR + train tracking', async () => {
    const invalidRes = await fetch(`${baseUrl}/api/pnr/12345`);
    assert.equal(invalidRes.status, 400);

    const validRes = await fetch(`${baseUrl}/api/pnr/8291045623`);
    assert.equal(validRes.status, 200);
    const data = await validRes.json();
    assert.equal(data.found, true);
    assert.equal(data.pnrDetails.trainNumber, '12734');
    assert.equal(data.mcpExecution.toolName, 'track_by_pnr');
  });

  it('POST /api/chat invokes real MCP tools and returns full pipeline trace', async () => {
    const emptyRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });
    assert.equal(emptyRes.status, 400);

    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Track PNR 4521896304' }),
    });
    assert.equal(chatRes.status, 200);
    const data = await chatRes.json();
    assert.match(data.reply, /4521896304/);
    assert.ok(Array.isArray(data.toolExecutions) && data.toolExecutions.length >= 1);
    assert.equal(data.toolExecutions[0].toolName, 'track_by_pnr');
    assert.equal(data.toolExecutions[0].status, 'success');
    assert.ok(Array.isArray(data.pipelineFlow) && data.pipelineFlow.length === 7);
  });

  it('GET /api/mcp/tools and POST /api/mcp/call work directly', async () => {
    const listRes = await fetch(`${baseUrl}/api/mcp/tools`);
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.toolsCount, 7);

    const callRes = await fetch(`${baseUrl}/api/mcp/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolName: 'get_station_information',
        arguments: { stationQuery: 'HWH' },
      }),
    });
    assert.equal(callRes.status, 200);
    const callData = await callRes.json();
    assert.equal(callData.status, 'success');
    assert.equal(callData.result.station.code, 'HWH');
  });
});
