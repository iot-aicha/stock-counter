'use client';

import { useState, useEffect, useRef } from 'react';

const VideoStream = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const imgRef = useRef(null);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const refreshImage = () => {
      if (imgRef.current && !hasError) {
        const timestamp = Date.now();
        setLastUpdate(timestamp);
        imgRef.current.src = `http://localhost:5001/api/live-video?t=${timestamp}`;
      }
    };

    const startRefreshInterval = () => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Start with immediate load
      refreshImage();
      
      // Then refresh every 1000ms (1 second) for smoother experience
      intervalRef.current = setInterval(refreshImage, 1000);
    };

    if (!hasError) {
      startRefreshInterval();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [hasError, retryCount]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    console.log('Image loaded successfully');
  };

  const handleError = (e) => {
    console.error('Image load error:', e);
    setIsLoading(false);
    setHasError(true);
    
    // Clear the interval to stop making requests while in error state
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Retry after 3 seconds
    timeoutRef.current = setTimeout(() => {
      console.log('Retrying image load...');
      setRetryCount(prev => prev + 1);
      setHasError(false);
      setIsLoading(true);
    }, 3000);
  };

  const handleManualRefresh = () => {
    setRetryCount(prev => prev + 1);
    setHasError(false);
    setIsLoading(true);
  };

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-300">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Loading camera feed...</p>
          </div>
        </div>
      )}
      
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-10">
          <div className="text-center">
            <div className="text-4xl mb-2">📷</div>
            <p className="mt-2 text-sm">Camera feed unavailable</p>
            <p className="text-xs mt-1 mb-3">Retrying in 3 seconds...</p>
            <button 
              onClick={handleManualRefresh}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              Retry Now
            </button>
          </div>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={`http://localhost:5001/api/live-video?t=${lastUpdate}`}
          alt="Live camera feed"
          className="w-full h-full object-contain"
          onLoad={handleLoad}
          onError={handleError}
          crossOrigin="anonymous"
        />
      )}
      
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        {hasError ? 'Error' : 'Live'}
      </div>
      
      {/* Debug info */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        Retry: {retryCount}
      </div>
    </div>
  );
};

export default VideoStream;