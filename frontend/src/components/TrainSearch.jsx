import {
  ArrowLeftRight,
  Bot,
  Calendar,
  Clock,
  Loader2,
  Navigation,
  Search,
  Train,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';

const QUICK_ROUTES = [
  { label: 'MMCT → NDLS', source: 'MMCT', destination: 'NDLS' },
  { label: 'SC → TPTY', source: 'SC', destination: 'TPTY' },
  { label: 'NDLS → BSB', source: 'NDLS', destination: 'BSB' },
  { label: 'HWH → NDLS', source: 'HWH', destination: 'NDLS' },
  { label: 'CSMT → PUNE', source: 'CSMT', destination: 'PUNE' },
];

export default function TrainSearch({
  stations,
  initialQuery,
  onTrackTrain,
  onAskAi,
}) {
  const [source, setSource] = useState(initialQuery?.source || 'MMCT');
  const [destination, setDestination] = useState(initialQuery?.destination || 'NDLS');
  const [date, setDate] = useState(initialQuery?.date || '2026-11-26');
  const [travelClass, setTravelClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Schedule modal state
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleData, setScheduleData] = useState(null);
  const [scheduleError, setScheduleError] = useState('');

  const executeSearch = async (src, dst, dt, cls) => {
    setError('');
    setLoading(true);
    try {
      const data = await apiClient.searchTrains({
        source: src,
        destination: dst,
        date: dt,
        travelClass: cls,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery?.source && initialQuery?.destination) {
      setSource(initialQuery.source);
      setDestination(initialQuery.destination);
      executeSearch(
        initialQuery.source,
        initialQuery.destination,
        initialQuery.date || date,
        ''
      );
    } else {
      executeSearch('MMCT', 'NDLS', '2026-11-26', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    executeSearch(source, destination, date, travelClass);
  };

  const handleSwap = () => {
    setSource(destination);
    setDestination(source);
  };

  const openSchedule = async (trainNumber) => {
    setScheduleLoading(true);
    setScheduleError('');
    setScheduleData(null);
    try {
      const data = await apiClient.getTrainSchedule(trainNumber);
      setScheduleData(data);
    } catch (err) {
      setScheduleError(err.message);
    } finally {
      setScheduleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Search Trains</h2>
            <p className="text-xs text-slate-500">
              Queries the Express backend → MCP Client → MCP Server (<code className="text-indigo-600">search_trains</code>)
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ROUTES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => {
                  setSource(r.source);
                  setDestination(r.destination);
                  executeSearch(r.source, r.destination, date, travelClass);
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Source Station
            </label>
            <input
              list="station-options"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g., MMCT or Mumbai"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              required
            />
          </div>

          <div className="flex items-end justify-center md:col-span-1">
            <button
              type="button"
              onClick={handleSwap}
              title="Swap stations"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </div>

          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Destination Station
            </label>
            <input
              list="station-options"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g., NDLS or New Delhi"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              required
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Journey Date
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Class Filter (Optional)
            </label>
            <select
              value={travelClass}
              onChange={(e) => setTravelClass(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">All Classes</option>
              <option value="1A">1A — First AC</option>
              <option value="2A">2A — AC 2 Tier</option>
              <option value="3A">3A — AC 3 Tier</option>
              <option value="CC">CC — AC Chair Car</option>
              <option value="EC">EC — Executive Chair Car</option>
              <option value="SL">SL — Sleeper Class</option>
            </select>
          </div>

          <div className="flex items-end md:col-span-8">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching via MCP...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search Trains
                </>
              )}
            </button>
          </div>
        </form>

        <datalist id="station-options">
          {(stations || []).map((st) => (
            <option key={st.code} value={st.code}>
              {st.name} ({st.city})
            </option>
          ))}
        </datalist>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">
              Showing {result.count || 0} demonstration train(s) for{' '}
              <span className="text-indigo-700">
                {result.query?.source} → {result.query?.destination}
              </span>
            </p>
            {result.mcpExecution && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                MCP Tool: {result.mcpExecution.toolName} ({result.mcpExecution.durationMs} ms)
              </span>
            )}
          </div>

          {result.trains?.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <Train className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 font-semibold text-slate-800">
                No direct demonstration trains found on this route.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Try one of the quick routes above, or ask the AI Chatbot to plan a connecting journey!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {result.trains.map((train) => (
                <div
                  key={train.trainNumber}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">
                          {train.trainNumber}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">
                          {train.trainName}
                        </h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          {train.type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Runs: {train.runningDays.join(', ')} • Demo Data Only
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openSchedule(train.trainNumber)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Schedule
                      </button>
                      <button
                        type="button"
                        onClick={() => onTrackTrain(train.trainNumber)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Track Status
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onAskAi(
                            `Explain the schedule and best class option for train ${train.trainNumber} (${train.trainName})`
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        <Bot className="h-3.5 w-3.5" />
                        Ask AI
                      </button>
                    </div>
                  </div>

                  {/* Timings Strip */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{train.departureTime}</p>
                      <p className="text-xs font-medium text-slate-600">
                        {train.sourceName} ({train.source})
                      </p>
                    </div>
                    <div className="flex flex-col items-center text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{train.duration}</span>
                      <span className="mt-0.5 text-[11px]">{train.distanceKm} km</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{train.arrivalTime}</p>
                      <p className="text-xs font-medium text-slate-600">
                        {train.destinationName} ({train.destination})
                      </p>
                    </div>
                  </div>

                  {/* Classes */}
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {train.classes.map((cls) => (
                      <div
                        key={cls.code}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <span>{cls.code}</span>
                          <span className="text-slate-400">•</span>
                          <span>₹{cls.demoFareInr}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-medium text-emerald-700">
                          {cls.demoAvailability}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule Modal */}
      {(scheduleLoading || scheduleData || scheduleError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {scheduleData
                    ? `${scheduleData.trainNumber} — ${scheduleData.trainName}`
                    : 'Train Schedule'}
                </h3>
                <p className="text-xs text-slate-500">
                  Retrieved via MCP tool <code className="text-indigo-600">get_train_schedule</code> (Demo Data)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setScheduleData(null);
                  setScheduleError('');
                }}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {scheduleLoading && (
              <div className="flex items-center justify-center py-12 text-sm text-slate-600">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
                Loading timetable via MCP server...
              </div>
            )}

            {scheduleError && (
              <p className="py-6 text-sm text-rose-700">{scheduleError}</p>
            )}

            {scheduleData?.found && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Station</th>
                      <th className="py-2 pr-3">Arrival</th>
                      <th className="py-2 pr-3">Departure</th>
                      <th className="py-2 pr-3">Day</th>
                      <th className="py-2 pr-3">PF</th>
                      <th className="py-2">Dist</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scheduleData.schedule.map((stop) => (
                      <tr key={stop.stopNo}>
                        <td className="py-2.5 pr-3 text-slate-500">{stop.stopNo}</td>
                        <td className="py-2.5 pr-3 font-medium text-slate-900">
                          {stop.stationName} ({stop.stationCode})
                        </td>
                        <td className="py-2.5 pr-3">{stop.arrival}</td>
                        <td className="py-2.5 pr-3">{stop.departure}</td>
                        <td className="py-2.5 pr-3">Day {stop.day}</td>
                        <td className="py-2.5 pr-3">{stop.platform}</td>
                        <td className="py-2.5">{stop.distanceKm} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
