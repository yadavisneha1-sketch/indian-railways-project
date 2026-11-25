import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Cpu,
  MapPin,
  Search,
  Ticket,
  Train,
} from 'lucide-react';

export default function HeroDashboard({
  dashboard,
  health,
  onNavigate,
  onQuickPnrTrack,
  onQuickTrainSearch,
}) {
  const stats = dashboard?.stats || {
    totalTrains: 12,
    totalStations: 15,
    samplePnrsCount: 6,
    faqCount: 7,
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 p-6 text-white shadow-lg sm:p-10">
        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-200">
            <Cpu className="h-3.5 w-3.5" />
            <span>Model Context Protocol (MCP) + AI Railway Assistant</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Smart Railway Search, PNR Tracking &amp; AI Assistant
          </h1>

          <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
            Search Indian Railway demonstration routes, inspect full station timetables,
            track train &amp; booking status with 10-digit PNR / PR numbers, and chat with
            an AI assistant backed by a real{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-indigo-200">
              @modelcontextprotocol/sdk
            </code>{' '}
            stdio server.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('search')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow hover:bg-slate-100"
            >
              <Search className="h-4 w-4 text-indigo-600" />
              Search Trains
            </button>
            <button
              type="button"
              onClick={() => onNavigate('tracker')}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500"
            >
              <Ticket className="h-4 w-4" />
              Track by PNR / Train No.
            </button>
            <button
              type="button"
              onClick={() => onNavigate('chat')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
            >
              <Bot className="h-4 w-4" />
              Ask AI Assistant
            </button>
          </div>
        </div>
      </section>

      {/* Demonstration Data Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm">
          <p className="font-semibold">Demonstration Dataset Notice</p>
          <p className="text-amber-800">
            All train schedules, seat availability labels, PNR records, and simulated running
            statuses in this app use local demonstration data — not live IRCTC or NTES servers.
            {health?.aiMode && (
              <span className="ml-1 font-medium">
                Active AI Engine: {health.aiMode.modeLabel}.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Dashboard Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Sample Trains</span>
            <Train className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalTrains}</p>
          <p className="mt-1 text-xs text-slate-500">Rajdhani, Vande Bharat, Shatabdi &amp; SF</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Stations Indexed</span>
            <MapPin className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalStations}</p>
          <p className="mt-1 text-xs text-slate-500">Major Indian Railway junctions</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">MCP Server Tools</span>
            <Cpu className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {health?.mcpToolsCount ?? 7}
          </p>
          <p className="mt-1 text-xs text-slate-500">Live stdio tools via official SDK</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Sample PNRs</span>
            <Ticket className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.samplePnrsCount}</p>
          <p className="mt-1 text-xs text-slate-500">Ready for PNR &amp; status lookup</p>
        </div>
      </section>

      {/* Featured Routes & Quick PNR Chips */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Popular Demonstration Routes</h2>
              <p className="text-xs text-slate-500">
                Click any route to run a live train search via MCP
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('search')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Open Search →
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(dashboard?.featuredTrains || []).map((train) => (
              <button
                key={train.trainNumber}
                type="button"
                onClick={() => onQuickTrainSearch(train.source, train.destination)}
                className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                    #{train.trainNumber}
                  </span>
                  <span className="text-xs font-medium text-emerald-700">
                    {train.liveStatus}
                  </span>
                </div>
                <p className="mt-2 line-clamp-1 font-semibold text-slate-900">
                  {train.trainName}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    {train.source} ({train.departureTime}) → {train.destination} ({train.arrivalTime})
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Quick PNR / PR Test Numbers</h2>
          <p className="mt-1 text-xs text-slate-500">
            Click a sample 10-digit PNR number to track booking &amp; train status
          </p>

          <div className="mt-4 space-y-2.5">
            {(dashboard?.samplePnrs || []).slice(0, 5).map((item) => (
              <button
                key={item.pnr}
                type="button"
                onClick={() => onQuickPnrTrack(item.pnr)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs transition hover:border-indigo-300 hover:bg-indigo-50/50"
              >
                <div>
                  <p className="font-mono font-bold text-slate-900">{item.pnr}</p>
                  <p className="text-slate-500">
                    Train {item.trainNumber} • {item.route}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                  {item.class}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
