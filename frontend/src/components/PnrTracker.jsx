import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Ticket,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';

const SAMPLE_CHIPS = [
  { label: 'PNR 4521896304 (12951 CNF)', value: '4521896304', mode: 'pnr' },
  { label: 'PNR 8291045623 (12734 RAC/CNF)', value: '8291045623', mode: 'pnr' },
  { label: 'PNR 3904812756 (12301 WL)', value: '3904812756', mode: 'pnr' },
  { label: 'Train 22436 (Vande Bharat)', value: '22436', mode: 'train' },
  { label: 'Train 12723 (Telangana Exp)', value: '12723', mode: 'train' },
];

export default function PnrTracker({ initialIdentifier }) {
  const [identifier, setIdentifier] = useState(initialIdentifier || '4521896304');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const runLookup = async (rawValue) => {
    const cleaned = String(rawValue || '').replace(/\s|-/g, '').trim();
    if (!cleaned) {
      setError('Please enter a 10-digit PNR / PR number or a 5-digit Train number.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = /^\d{10}$/.test(cleaned)
        ? await apiClient.trackPnr(cleaned)
        : await apiClient.getTrainRunningStatus(cleaned);
      setData(response);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialIdentifier) {
      setIdentifier(initialIdentifier);
      runLookup(initialIdentifier);
    } else {
      runLookup('4521896304');
    }
  }, [initialIdentifier]);

  const handleSubmit = (e) => {
    e.preventDefault();
    runLookup(identifier);
  };

  const trainInfo = data?.trainInfo;
  const pnrDetails = data?.pnrDetails;
  const live = trainInfo?.liveSimulation;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            PNR / PR Number &amp; Simulated Train Status Tracker
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter a <strong>10-digit PNR / PR number</strong> to fetch passenger booking status and
            linked train tracking, or a <strong>5-digit Train number</strong> to inspect simulated
            running position via MCP tools (<code className="text-indigo-600">track_by_pnr</code> /{' '}
            <code className="text-indigo-600">get_train_running_status</code>).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Ticket className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter 10-digit PNR (e.g. 4521896304) or Train No. (e.g. 12951)"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Tracking via MCP...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Track PNR / Train
              </>
            )}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Sample inputs:</span>
          {SAMPLE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => {
                setIdentifier(chip.value);
                runLookup(chip.value);
              }}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && data && !data.found && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">{data.message || data.error}</p>
          {data.samplePnrs && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.samplePnrs.map((p) => (
                <button
                  key={p.pnr}
                  type="button"
                  onClick={() => {
                    setIdentifier(p.pnr);
                    runLookup(p.pnr);
                  }}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  {p.pnr} ({p.route})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && data?.found && (
        <div className="space-y-6">
          {/* MCP Execution Banner */}
          {data.mcpExecution && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  Real MCP Call Executed: <code>{data.mcpExecution.toolName}</code> with{' '}
                  <code>{JSON.stringify(data.mcpExecution.inputParams)}</code>
                </span>
              </div>
              <span className="font-semibold">{data.mcpExecution.durationMs} ms • Demo Data</span>
            </div>
          )}

          {/* PNR Booking Card (when PNR searched) */}
          {pnrDetails && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    PNR / PR Number (Demonstration)
                  </span>
                  <h3 className="mt-0.5 font-mono text-2xl font-bold text-slate-900">
                    {pnrDetails.pnr}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
                    Class: {pnrDetails.travelClass}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                    Quota: {pnrDetails.quota}
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                    {pnrDetails.chartStatus}
                  </span>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2 pr-4">Passenger</th>
                      <th className="py-2 pr-4">Booking Status</th>
                      <th className="py-2">Current Status (Demo)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pnrDetails.passengers.map((pax) => (
                      <tr key={pax.passengerNo}>
                        <td className="py-2.5 pr-4 font-medium text-slate-700">
                          Passenger {pax.passengerNo}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">{pax.bookingStatus}</td>
                        <td className="py-2.5 font-semibold text-emerald-700">
                          {pax.currentStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Simulated Live Train Position Card */}
          {trainInfo && live && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">
                      {trainInfo.trainNumber}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{trainInfo.trainName}</h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Route: {trainInfo.source} ({trainInfo.departureTime}) → {trainInfo.destination} (
                    {trainInfo.arrivalTime}) • {trainInfo.duration}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    live.delayMinutes > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  <Navigation className="h-3.5 w-3.5" />
                  {live.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Simulated Route Progress</span>
                  <span>{live.progressPercent}% Completed</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all"
                    style={{ width: `${live.progressPercent}%` }}
                  />
                </div>
                <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-600" />
                    <div>
                      <p className="text-slate-500">Current Station (Demo)</p>
                      <p className="font-bold text-slate-900">
                        {live.currentStationName} ({live.currentStationCode})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-slate-500">Next Scheduled Halt</p>
                      <p className="font-bold text-slate-900">
                        {live.nextStationName} • ETA {live.expectedNextArrival}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500">Platform / Last Report</p>
                    <p className="font-bold text-slate-900">
                      PF {live.platformNumber} • {live.lastReportedTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* Route Timeline */}
              <div className="mt-5">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Station-by-Station Route Timeline
                </h4>
                <div className="space-y-2">
                  {trainInfo.schedule.map((stop) => {
                    const isCurrent = stop.stationCode === live.currentStationCode;
                    return (
                      <div
                        key={stop.stopNo}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
                          isCurrent
                            ? 'border-indigo-400 bg-indigo-50 font-semibold text-indigo-950'
                            : 'border-slate-100 bg-white text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              isCurrent ? 'bg-indigo-600 ring-4 ring-indigo-200' : 'bg-slate-300'
                            }`}
                          />
                          <span>
                            {stop.stationName} ({stop.stationCode})
                          </span>
                          {isCurrent && (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] text-white">
                              Simulated Location
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-slate-500">
                          <span>Arr: {stop.arrival}</span>
                          <span>Dep: {stop.departure}</span>
                          <span>PF {stop.platform}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
