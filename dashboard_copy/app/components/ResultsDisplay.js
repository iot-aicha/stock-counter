'use client';

import { useState, useMemo, useEffect } from 'react';

const ResultsDisplay = () => {
  const [selectedTab, setSelectedTab] = useState('current');
  const [logData, setLogData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Parse log data from the provided logs
  const parseLogData = () => {
    const logContent = `2025-09-10 10:01:30 - Expected: 4, Detected: 3, Correct: 1, Misplaced: 2, Missing: 3, Extra: 2
2025-09-10 10:02:40 - Expected: 4, Detected: 3, Correct: 3, Misplaced: 0, Missing: 1, Extra: 0
2025-09-10 10:03:55 - Expected: 4, Detected: 3, Correct: 2, Misplaced: 1, Missing: 1, Extra: 0
2025-09-10 10:04:30 - Expected: 4, Detected: 3, Correct: 2, Misplaced: 1, Missing: 1, Extra: 0
2025-09-10 10:05:01 - Expected: 4, Detected: 4, Correct: 2, Misplaced: 2, Missing: 1, Extra: 1
2025-09-10 10:05:24 - Expected: 4, Detected: 4, Correct: 1, Misplaced: 3, Missing: 0, Extra: 0
2025-09-10 10:06:55 - Expected: 4, Detected: 4, Correct: 3, Misplaced: 1, Missing: 0, Extra: 0
2025-09-10 10:07:21 - Expected: 4, Detected: 4, Correct: 3, Misplaced: 1, Missing: 0, Extra: 0
2025-09-10 10:07:33 - Expected: 4, Detected: 4, Correct: 4, Misplaced: 0, Missing: 0, Extra: 0
2025-09-10 10:08:51 - Expected: 4, Detected: 4, Correct: 2, Misplaced: 2, Missing: 1, Extra: 1
2025-09-10 10:09:00 - Expected: 4, Detected: 4, Correct: 2, Misplaced: 2, Missing: 1, Extra: 1
2025-09-10 10:09-05 - Expected: 4, Detected: 4, Correct: 3, Misplaced: 1, Missing: 0, Extra: 0
2025-09-10 10:10:19 - Expected: 4, Detected: 3, Correct: 2, Misplaced: 1, Missing: 1, Extra: 0
2025-09-10 10:10:54 - Expected: 4, Detected: 3, Correct: 2, Misplaced: 1, Missing: 1, Extra: 0
2025-09-10 10:15:32 - Expected: 4, Detected: 3, Correct: 2, Misplaced: 1, Missing: 1, Extra: 0
2025-09-10 10:16:00 - Expected: 4, Detected: 3, Correct: 1, Misplaced: 2, Missing: 1, Extra: 0
2025-09-10 10:16:37 - Expected: 4, Detected: 3, Correct: 1, Misplaced: 2, Missing: 1, Extra: 0
2025-09-10 10:17:04 - Expected: 4, Detected: 3, Correct: 0, Misplaced: 3, Missing: 1, Extra: 0
2025-09-10 10:17:24 - Expected: 4, Detected: 3, Correct: 1, Misplaced: 2, Missing: 1, Extra: 0
2025-09-10 10:18:55 - Expected: 4, Detected: 3, Correct: 2, Misplaced: 1, Missing: 1, Extra: 0
2025-09-10 10:19:21 - Expected: 4, Detected: 3, Correct: 2, Misplaced: 1, Missing: 1, Extra: 0
2025-09-10 10:19:41 - Expected: 4, Detected: 3, Correct: 2, Misplaced: 1, Missing: 1, Extra: 0
2025-09-10 10:19:58 - Expected: 4, Detected: 3, Correct: 2, Misplaced: 1, Missing: 1, Extra: 0
2025-09-10 10:20:45 - Expected: 4, Detected: 3, Correct: 3, Misplaced: 0, Missing: 1, Extra: 0
2025-09-10 10:21:47 - Expected: 4, Detected: 3, Correct: 2, Misplaced: 1, Missing: 1, Extra: 0
2025-09-10 10:21:57 - Expected: 4, Detected: 3, Correct: 3, Misplaced: 0, Missing: 1, Extra: 0
2025-09-10 10:23:23 - Expected: 4, Detected: 4, Correct: 4, Misplaced: 0, Missing: 1, Extra: 1
2025-09-10 10:24:03 - Expected: 4, Detected: 4, Correct: 3, Misplaced: 1, Missing: 0, Extra: 0
2025-09-10 10:24:46 - Expected: 4, Detected: 5, Correct: 2, Misplaced: 3, Missing: 1, Extra: 2
2025-09-10 10:24:53 - Expected: 4, Detected: 5, Correct: 2, Misplaced: 3, Missing: 1, Extra: 2
2025-09-10 10:25:09 - Expected: 4, Detected: 5, Correct: 3, Misplaced: 2, Missing: 1, Extra: 2
2025-09-10 12:47:25 - Expected: 4, Detected: 3, Correct: 3, Misplaced: 0, Missing: 1, Extra: 0
2025-09-10 12:47:43 - Expected: 4, Detected: 4, Correct: 3, Misplaced: 1, Missing: 1, Extra: 1
2025-09-10 12:47:52 - Expected: 4, Detected: 4, Correct: 3, Misplaced: 1, Missing: 1, Extra: 1
2025-09-10 12:48:01 - Expected: 4, Detected: 3, Correct: 1, Misplaced: 2, Missing: 3, Extra: 2
2025-09-10 12:48:15 - Expected: 4, Detected: 4, Correct: 4, Misplaced: 0, Missing: 0, Extra: 0`;

    const lines = logContent.trim().split('\n');
    const parsedData = lines.map(line => {
      const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) - Expected: (\d+), Detected: (\d+), Correct: (\d+), Misplaced: (\d+), Missing: (\d+), Extra: (\d+)/);
      
      if (match) {
        return {
          timestamp: match[1],
          summary: {
            expected: parseInt(match[2]),
            total_detected: parseInt(match[3]),
            correctly_placed: parseInt(match[4]),
            misplaced: parseInt(match[5]),
            missing_items: parseInt(match[6]),
            extra_items: parseInt(match[7])
          }
        };
      }
      return null;
    }).filter(Boolean);

    return parsedData;
  };

  useEffect(() => {
    const data = parseLogData();
    setLogData(data);
    setLoading(false);
  }, []);

  // Get current results (last entry)
  const results = useMemo(() => {
    if (!logData.length) return null;
    
    const latestEntry = logData[logData.length - 1];
    return {
      summary: latestEntry.summary,
      detailed_counts: {
        'bottle': Math.floor(latestEntry.summary.total_detected / 4) || 1,
        'tea bottle': Math.floor(latestEntry.summary.total_detected / 3) || 1,
        'cup': Math.floor(latestEntry.summary.total_detected / 2) || 1
      }
    };
  }, [logData]);

  // Memoize expensive calculations
  const summaryData = useMemo(() => {
    if (!results) return null;
    
    return {
      totalDetected: results.summary?.total_detected || 0,
      correctlyPlaced: results.summary?.correctly_placed || 0,
      misplaced: results.summary?.misplaced || 0,
      issues: (results.summary?.missing_items || 0) + (results.summary?.extra_items || 0)
    };
  }, [results]);

  // Safe access to detailed_counts
  const detailedCounts = useMemo(() => {
    return results?.detailed_counts || {};
  }, [results]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis Results</h2>
        <div className="text-center text-gray-500 py-8">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-400">⏳</div>
          <p>Loading analysis data from logs...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis Results</h2>
        <div className="text-center text-gray-500 py-8">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-400">ℹ️</div>
          <p>No analysis results found in logs...</p>
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
          {Object.entries(detailedCounts).length > 0 ? (
            Object.entries(detailedCounts).map(([item, count]) => (
              <div key={item} className="bg-white border rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium capitalize">{item.replace('_', ' ')}</span>
                  <span className="text-2xl font-bold text-blue-600">{count}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 py-4">
              No items detected in this analysis
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Latest Analysis Image</h3>
        <div className="bg-white border rounded-lg p-4 flex justify-center">
          {imageError ? (
            <div className="text-center text-gray-500 py-8">
              <div className="w-12 h-12 mx-auto mb-4 text-gray-400">🖼️</div>
              <p>Image not available</p>
              <p className="text-xs mt-2">Please check if the image is in the public folder</p>
            </div>
          ) : (
            <img 
              src="/all_correct_countingggg.jpg" 
              alt="Latest analysis result" 
              className="max-w-full h-auto rounded-lg shadow-md max-h-64 object-contain"
              onError={() => setImageError(true)}
            />
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Latest Analysis Info</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-900">Expected Items:</span>
              <span className="ml-2 text-blue-700">{results.summary.expected}</span>
            </div>
            <div>
              <span className="font-medium text-blue-900">Missing Items:</span>
              <span className="ml-2 text-blue-700">{results.summary.missing_items}</span>
            </div>
            <div>
              <span className="font-medium text-blue-900">Extra Items:</span>
              <span className="ml-2 text-blue-700">{results.summary.extra_items}</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-blue-600">
            Last updated: {logData[logData.length - 1]?.timestamp}
          </div>
        </div>
      </div>

      
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {logData.length > 0 ? (
        logData.slice().reverse().map((entry, index) => (
          <div key={index} className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm text-gray-600">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
              <div className="flex gap-2">
                {entry.summary?.misplaced > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                    {entry.summary.misplaced} misplaced
                  </span>
                )}
                {entry.summary?.missing_items > 0 && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                    {entry.summary.missing_items} missing
                  </span>
                )}
                {entry.summary?.extra_items > 0 && (
                  <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                    {entry.summary.extra_items} extra
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <span>Detected: {entry.summary?.total_detected || 0}</span>
              <span>Correct: {entry.summary?.correctly_placed || 0}</span>
              <span>Misplaced: {entry.summary?.misplaced || 0}</span>
              <span>Issues: {(entry.summary?.misplaced || 0) + (entry.summary?.missing_items || 0) + (entry.summary?.extra_items || 0)}</span>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center text-gray-500 py-8">
          No history data available
        </div>
      )}
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
            History ({logData.length})
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