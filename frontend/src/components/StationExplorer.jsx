import { Building2, Loader2, MapPin, Train } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';

export default function StationExplorer({ stations }) {
  const [selectedCode, setSelectedCode] = useState('NDLS');
  const [loading, setLoading] = useState(false);
  const [stationData, setStationData] = useState(null);
  const [error, setError] = useState('');

  const fetchStation = async (code) => {
    setSelectedCode(code);
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.getStationInfo(code);
      setStationData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStation('NDLS');
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Railway Station Information Explorer</h2>
          <p className="text-xs text-slate-500">
            Select a station to inspect platforms, zone &amp; amenities via MCP{' '}
            <code className="text-indigo-600">get_station_information</code>
          </p>
        </div>

        <select
          value={selectedCode}
          onChange={(e) => fetchStation(e.target.value)}
          className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-medium focus:border-indigo-500 focus:outline-none"
        >
          {(stations || []).map((st) => (
            <option key={st.code} value={st.code}>
              {st.code} — {st.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          Fetching station details via MCP...
        </div>
      )}

      {error && <p className="text-sm text-rose-700">{error}</p>}

      {!loading && stationData?.found && (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                {stationData.station.name} ({stationData.station.code})
              </h3>
            </div>
            <p className="text-xs text-slate-600">{stationData.station.highlights}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white p-2.5">
                <span className="text-slate-400">City / State</span>
                <p className="font-semibold text-slate-800">
                  {stationData.station.city}, {stationData.station.state}
                </p>
              </div>
              <div className="rounded-lg bg-white p-2.5">
                <span className="text-slate-400">Zone &amp; Platforms</span>
                <p className="font-semibold text-slate-800">
                  {stationData.station.zone} • {stationData.station.platforms} PFs
                </p>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-600">Amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {stationData.station.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <span>Trains Serving {stationData.station.code} (Demo)</span>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {stationData.servingTrains.map((t) => (
                <div
                  key={t.trainNumber}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Train className="h-3.5 w-3.5 text-indigo-600" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {t.trainNumber} {t.trainName}
                      </p>
                      <p className="text-slate-500">Platform {t.platform}</p>
                    </div>
                  </div>
                  <div className="text-right text-slate-600">
                    <p>Arr: {t.arrival}</p>
                    <p>Dep: {t.departure}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
