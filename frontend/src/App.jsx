import { useEffect, useState } from 'react';
import AiChatbot from './components/AiChatbot';
import HeroDashboard from './components/HeroDashboard';
import McpFlowPanel from './components/McpFlowPanel';
import Navbar from './components/Navbar';
import PnrTracker from './components/PnrTracker';
import StationExplorer from './components/StationExplorer';
import TrainSearch from './components/TrainSearch';
import { apiClient } from './services/apiClient';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [health, setHealth] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [stations, setStations] = useState([]);
  const [backendError, setBackendError] = useState('');

  // Cross-tab shortcuts
  const [searchInit, setSearchInit] = useState(null);
  const [trackerIdentifier, setTrackerIdentifier] = useState('4521896304');
  const [pendingChatPrompt, setPendingChatPrompt] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([apiClient.getHealth(), apiClient.getDashboard()])
      .then(([healthData, dashData]) => {
        if (!mounted) return;
        setHealth(healthData);
        setDashboard(dashData);
        setStations(dashData.stations || []);
      })
      .catch((err) => {
        if (!mounted) return;
        setBackendError(
          `Could not connect to Express backend (${err.message}). Make sure the backend server is running on port 5000.`
        );
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleQuickTrainSearch = (source, destination) => {
    setSearchInit({ source, destination, date: '2026-11-26', ts: Date.now() });
    setActiveTab('search');
  };

  const handleTrackIdentifier = (identifier) => {
    setTrackerIdentifier(identifier);
    setActiveTab('tracker');
  };

  const handleAskAi = (prompt) => {
    setPendingChatPrompt(prompt);
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar activeTab={activeTab} onChangeTab={setActiveTab} health={health} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {backendError && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {backendError}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <HeroDashboard
              dashboard={dashboard}
              health={health}
              onNavigate={setActiveTab}
              onQuickPnrTrack={handleTrackIdentifier}
              onQuickTrainSearch={handleQuickTrainSearch}
            />
            <StationExplorer stations={stations} />
          </div>
        )}

        {activeTab === 'search' && (
          <TrainSearch
            stations={stations}
            initialQuery={searchInit}
            onTrackTrain={handleTrackIdentifier}
            onAskAi={handleAskAi}
          />
        )}

        {activeTab === 'tracker' && (
          <PnrTracker initialIdentifier={trackerIdentifier} />
        )}

        {activeTab === 'chat' && (
          <AiChatbot
            health={health}
            pendingPrompt={pendingChatPrompt}
            onConsumePendingPrompt={() => setPendingChatPrompt('')}
          />
        )}

        {activeTab === 'mcp' && <McpFlowPanel />}
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-700">
          Railway AI Assistant — Beginner-Friendly Full-Stack AI + MCP Project
        </p>
        <p className="mt-1">
          Demonstration Data Only • Not affiliated with IRCTC or Indian Railways live feeds.
        </p>
      </footer>
    </div>
  );
}
