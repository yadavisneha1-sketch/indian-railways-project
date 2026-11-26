const rawApiBase =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
const normalizedBase = rawApiBase.replace(/\/+$/, '');
const API_BASE = normalizedBase
  ? normalizedBase.endsWith('/api')
    ? normalizedBase
    : `${normalizedBase}/api`
  : '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

export const apiClient = {
  getHealth: () => request('/health'),
  getDashboard: () => request('/dashboard'),
  getStations: () => request('/stations'),
  getStationInfo: (code) => request(`/stations/${encodeURIComponent(code)}`),
  searchTrains: ({ source, destination, date, travelClass }) => {
    const params = new URLSearchParams({ source, destination });
    if (date) params.set('date', date);
    if (travelClass) params.set('travelClass', travelClass);
    return request(`/trains/search?${params.toString()}`);
  },
  getTrainSchedule: (trainQuery) =>
    request(`/trains/${encodeURIComponent(trainQuery)}/schedule`),
  getTrainRunningStatus: (identifier) =>
    request(`/trains/${encodeURIComponent(identifier)}/status`),
  trackPnr: (pnr) => request(`/pnr/${encodeURIComponent(pnr)}`),
  planJourney: (payload) =>
    request('/journey/plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  sendChatMessage: (message, history = []) =>
    request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),
  getMcpTools: () => request('/mcp/tools'),
  callMcpTool: (toolName, args) =>
    request('/mcp/call', {
      method: 'POST',
      body: JSON.stringify({ toolName, arguments: args }),
    }),
};
