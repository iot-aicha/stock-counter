'use client';

import { useState, useEffect } from 'react';
import VideoStream from './components/VideoStream';
import ResultsDisplay from './components/ResultsDisplay';
import AlertsPanel from './components/AlertsPanel';
import StatusBar from './components/StatusBar';

export default function Dashboard() {
  const [latestResults, setLatestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoConnected, setVideoConnected] = useState(false);

  // Simulate data loading (remove this if you have real data)
  useEffect(() => {
    // Set a timeout to simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Simulate video connection after a delay
      setVideoConnected(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

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
            <StatusBar 
              videoConnected={videoConnected} 
              lastUpdate={Date.now()} 
            />
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

          
        </div>

        <ResultsDisplay />
      </main>
    </div>
  );
}