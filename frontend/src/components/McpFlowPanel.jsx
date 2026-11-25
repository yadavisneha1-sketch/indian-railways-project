import { ArrowRight, CheckCircle2, Cpu, Loader2, Play, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';

const DEFAULT_ARGS_BY_TOOL = {
  search_trains: { source: 'MMCT', destination: 'NDLS' },
  get_train_schedule: { trainQuery: '12951' },
  get_station_information: { stationQuery: 'NDLS' },
  plan_journey: { source: 'SC', destination: 'TPTY', preference: 'fastest' },
  railway_faq: { question: 'What is Tatkal booking timing?' },
  track_by_pnr: { pnr: '4521896304' },
  get_train_running_status: { identifier: '22436' },
};

const FLOW_STEPS = [
  'User',
  'AI Model',
  'MCP Client',
  'MCP Server',
  'MCP Tool',
  'Result',
  'AI Response',
];

export default function McpFlowPanel() {
  const [tools, setTools] = useState([]);
  const [loadingTools, setLoadingTools] = useState(true);
  const [selectedTool, setSelectedTool] = useState('search_trains');
  const [argsJson, setArgsJson] = useState(
    JSON.stringify(DEFAULT_ARGS_BY_TOOL.search_trains, null, 2)
  );
  const [running, setRunning] = useState(false);
  const [callResult, setCallResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient
      .getMcpTools()
      .then((data) => {
        if (!active) return;
        setTools(data.tools || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
      })
      .finally(() => {
        if (active) setLoadingTools(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSelectTool = (name) => {
    setSelectedTool(name);
    setArgsJson(JSON.stringify(DEFAULT_ARGS_BY_TOOL[name] || {}, null, 2));
    setCallResult(null);
    setError('');
  };

  const handleExecute = async (e) => {
    e.preventDefault();
    setError('');
    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(argsJson || '{}');
    } catch {
      setError('Arguments must be valid JSON.');
      return;
    }

    setRunning(true);
    try {
      const res = await apiClient.callMcpTool(selectedTool, parsedArgs);
      setCallResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Architecture Flow Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-700">
          <Cpu className="h-5 w-5" />
          <h2 className="text-xl font-bold text-slate-900">
            How AI Connects to External Tools via MCP
          </h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          The <strong>Model Context Protocol (MCP)</strong> standardizes how AI models discover
          and call external backend tools. Below is the live pipeline running inside this project
          using <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">@modelcontextprotocol/sdk</code> over{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">StdioServerTransport</code>:
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {FLOW_STEPS.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800">
                {index + 1}. {step}
              </div>
              {index < FLOW_STEPS.length - 1 && (
                <ArrowRight className="h-4 w-4 text-slate-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live Tool Discovery + Interactive Tester */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Wrench className="h-4 w-4 text-indigo-600" />
            Discovered MCP Tools ({tools.length})
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Fetched live via <code>client.listTools()</code> from <code>railway-ai-mcp-server</code>
          </p>

          {loadingTools ? (
            <div className="flex items-center gap-2 py-8 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Listing MCP tools...
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {tools.map((tool) => {
                const active = selectedTool === tool.name;
                return (
                  <button
                    key={tool.name}
                    type="button"
                    onClick={() => handleSelectTool(tool.name)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-indigo-500 bg-indigo-50/70'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-mono text-xs font-bold text-indigo-700">{tool.name}</p>
                    <p className="mt-1 text-xs text-slate-600">{tool.description}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
          <h3 className="text-base font-bold text-slate-900">
            Interactive MCP Tool Playground
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Execute any MCP tool directly through <code>StdioClientTransport</code> and inspect the raw JSON-RPC result.
          </p>

          <form onSubmit={handleExecute} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Selected Tool
              </label>
              <input
                type="text"
                readOnly
                value={selectedTool}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-mono text-sm font-semibold text-indigo-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Input Arguments (JSON)
              </label>
              <textarea
                rows={5}
                value={argsJson}
                onChange={(e) => setArgsJson(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={running}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Invoking MCP Server...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run MCP Tool
                </>
              )}
            </button>
          </form>

          {callResult && (
            <div className="mt-5 space-y-2 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Status: {callResult.status}
                </span>
                <span className="text-slate-500">Execution Time: {callResult.durationMs} ms</span>
              </div>
              <pre className="max-h-80 overflow-auto rounded-xl bg-slate-900 p-4 font-mono text-xs text-emerald-300">
                {JSON.stringify(callResult.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
