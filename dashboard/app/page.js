'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import VideoStream from './components/VideoStream';
import ResultsDisplay from './components/ResultsDisplay';
import AlertsPanel from './components/AlertsPanel';
import StatusBar from './components/StatusBar';

const API_BASE = 'http://localhost:5001/api';

// Debounce function to limit API calls
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default function Dashboard() {
  const [latestResults, setLatestResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Memoize expensive calculations
  const processedHistory = useMemo(() => 
    history.slice().reverse(), [history]
  );

  const fetchInitialData = useCallback(async () => {
    try {
      const [resultsRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/latest-results`),
        fetch(`${API_BASE}/history`)
      ]);

      if (resultsRes.ok) {
        const results = await resultsRes.json();
        setLatestResults(results);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }

      setConnectionStatus('connected');
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setupSSEConnection = useCallback(() => {
    try {
      console.log('Setting up SSE connection...');
      const eventSource = new EventSource(`${API_BASE}/events`);
  
      eventSource.onopen = () => {
        console.log('SSE connection established');
        setConnectionStatus('connected');
      };
  
      eventSource.onmessage = (event) => {
        try {
          if (event.data.trim() === ': heartbeat') {
            return; // Ignore heartbeat messages
          }
          
          const data = JSON.parse(event.data);
          if (data.type === 'new_processing') {
            setLatestResults(prev => ({ ...data.data }));
            setHistory(prev => [...prev.slice(-99), data.data]);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };
  
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnectionStatus('disconnected');
        eventSource.close();
        
        // Retry connection after delay
        setTimeout(() => {
          console.log('Retrying SSE connection...');
          setupSSEConnection();
        }, 5000);
      };
  
      return () => {
        console.log('Closing SSE connection');
        eventSource.close();
      };
    } catch (error) {
      console.error('SSE connection failed:', error);
      setConnectionStatus('disconnected');
      
      // Retry after delay
      setTimeout(setupSSEConnection, 5000);
    }
  }, []);

  const checkHealth = useCallback(debounce(async () => {
    try {
      const response = await fetch(`${API_BASE}/health`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.log('Health check failed:', error.message);
      setConnectionStatus('disconnected');
    }
  }, 10000), []); // Check every 10 seconds instead of 1

  useEffect(() => {
    fetchInitialData();
    setupSSEConnection();
    
    const healthInterval = setInterval(checkHealth, 30000);
    return () => {
      clearInterval(healthInterval);
    };
  }, [fetchInitialData, setupSSEConnection, checkHealth]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stock Detection Dashboard</h1>
              <p className="text-sm text-gray-600">Real-time inventory monitoring</p>
            </div>
            <StatusBar status={connectionStatus} lastUpdate={latestResults?.timestamp} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AlertsPanel results={latestResults} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Camera Feed</h2>
            <VideoStream />
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h2>
            {latestResults ? (

              // In your page.js, update the status display section:
<div className="grid grid-cols-2 gap-4">
  <div className="text-center p-4 bg-green-50 rounded-lg">
    <div className="text-2xl font-bold text-green-700">
      {latestResults?.summary?.correctly_placed || 0}
    </div>
    <div className="text-sm text-green-600">Correctly Placed</div>
  </div>
  <div className="text-center p-4 bg-red-50 rounded-lg">
    <div className="text-2xl font-bold text-red-700">
      {latestResults?.summary?.misplaced || 0}
    </div>
    <div className="text-sm text-red-600">Misplaced</div>
  </div>
  <div className="text-center p-4 bg-yellow-50 rounded-lg">
    <div className="text-2xl font-bold text-yellow-700">
      {latestResults?.summary?.missing_items || 0}
    </div>
    <div className="text-sm text-yellow-600">Missing</div>
  </div>
  <div className="text-center p-4 bg-blue-50 rounded-lg">
    <div className="text-2xl font-bold text-blue-700">
      {latestResults?.summary?.extra_items || 0}
    </div>
    <div className="text-sm text-blue-600">Extra Items</div>
  </div>
</div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        </div>

        <ResultsDisplay results={latestResults} history={processedHistory} />
      </main>
    </div>
  );
}