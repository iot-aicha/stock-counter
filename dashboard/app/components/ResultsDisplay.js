'use client';

import { useState, useMemo } from 'react';

const ResultsDisplay = ({ results, history }) => {
  const [selectedTab, setSelectedTab] = useState('current');

  // Memoize expensive calculations
  const summaryData = useMemo(() => {
    if (!results) return null;
    
    return {
      totalDetected: results.summary.total_detected,
      correctlyPlaced: results.summary.correctly_placed,
      misplaced: results.summary.misplaced,
      issues: results.summary.missing_items + results.summary.extra_items
    };
  }, [results]);

  if (!results) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis Results</h2>
        <div className="text-center text-gray-500 py-8">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-400">ℹ️</div>
          <p>Waiting for first analysis results...</p>
        </div>
      </div>
    );
  }

  const renderCurrentResults = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-100 rounded-lg">
            <div className="text-2xl font-bold text-green-800">{summaryData.totalDetected}</div>
            <div className="text-sm text-green-700">Total Detected</div>
          </div>
          <div className="text-center p-3 bg-blue-100 rounded-lg">
            <div className="text-2xl font-bold text-blue-800">{summaryData.correctlyPlaced}</div>
            <div className="text-sm text-blue-700">Correctly Placed</div>
          </div>
          <div className="text-center p-3 bg-red-100 rounded-lg">
            <div className="text-2xl font-bold text-red-800">{summaryData.misplaced}</div>
            <div className="text-sm text-red-700">Misplaced</div>
          </div>
          <div className="text-center p-3 bg-yellow-100 rounded-lg">
            <div className="text-2xl font-bold text-yellow-800">{summaryData.issues}</div>
            <div className="text-sm text-yellow-700">Issues</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Item Counts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(results.detailed_counts).map(([item, count]) => (
            <div key={item} className="bg-white border rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="font-medium capitalize">{item}</span>
                <span className="text-2xl font-bold text-blue-600">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Processed Image</h3>
        <img
          src={`http://localhost:5001/api/annotated-image?t=${new Date().getTime()}`}
          alt="Annotated analysis"
          className="w-full max-w-md mx-auto rounded-lg shadow-md"
        />
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {history.map((entry, index) => (
        <div key={index} className="bg-white border rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm text-gray-600">
              {new Date(entry.timestamp).toLocaleString()}
            </span>
            <div className="flex gap-2">
              {entry.summary.misplaced > 0 && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                  {entry.summary.misplaced} misplaced
                </span>
              )}
              {entry.summary.missing_items > 0 && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                  {entry.summary.missing_items} missing
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span>Detected: {entry.summary.total_detected}</span>
            <span>Correct: {entry.summary.correctly_placed}</span>
            <span>Issues: {entry.summary.misplaced + entry.summary.missing_items}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b">
        <nav className="flex -mb-px">
          <button
            onClick={() => setSelectedTab('current')}
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              selectedTab === 'current'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Current Analysis
          </button>
          <button
            onClick={() => setSelectedTab('history')}
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              selectedTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            History ({history.length})
          </button>
        </nav>
      </div>

      <div className="p-6">
        {selectedTab === 'current' ? renderCurrentResults() : renderHistory()}
      </div>
    </div>
  );
};

export default ResultsDisplay;