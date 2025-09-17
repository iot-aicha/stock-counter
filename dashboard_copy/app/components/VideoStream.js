'use client';

import { useState, useEffect, useRef } from 'react';

const VideoStream = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  // Video stream URL
  const videoStreamUrl = 'http://127.0.0.1:5002/video_feed';

  useEffect(() => {
    const refreshImage = () => {
      if (imgRef.current && !hasError) {
        // Use timestamp to prevent caching
        const timestamp = Date.now();
        imgRef.current.src = `${videoStreamUrl}?t=${timestamp}`;
      }
    };

    const startRefreshInterval = () => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Start with immediate load
      refreshImage();
      
      // Then refresh every 100ms for smoother video experience
      intervalRef.current = setInterval(refreshImage, 100);
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
  }, [hasError, retryCount, videoStreamUrl]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = (e) => {
    console.error('Video stream error:', e);
    setIsLoading(false);
    setHasError(true);
    
    // Clear the interval to stop making requests while in error state
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Retry after 5 seconds
    timeoutRef.current = setTimeout(() => {
      setRetryCount(prev => prev + 1);
      setHasError(false);
      setIsLoading(true);
    }, 5000);
  };

  const handleManualRefresh = () => {
    setRetryCount(prev => prev + 1);
    setHasError(false);
    setIsLoading(true);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.25, 1);
      if (newZoom === 1) {
        // Reset pan position when fully zoomed out
        setPanPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Calculate the transform style for the image
  const getTransformStyle = () => {
    return {
      transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px)`,
      transformOrigin: 'center center',
      cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
    };
  };

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-300 shadow-lg">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Connecting to camera feed...</p>
            <p className="text-xs mt-1 text-gray-400"></p>
          </div>
        </div>
      )}
      
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-10">
          <div className="text-center p-4">
            <div className="text-4xl mb-2">📷</div>
            <p className="mt-2 text-sm">Camera feed unavailable</p>
            <p className="text-xs mt-1 mb-3 text-gray-300">
              {retryCount > 0 ? `Retry attempt ${retryCount}` : 'Cannot connect to camera'}
            </p>
            <button 
              onClick={handleManualRefresh}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
            >
              <span className="mr-2">⟳</span> Retry Now
            </button>
          </div>
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="w-full h-full overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imgRef}
            src={videoStreamUrl}
            alt="Live camera feed"
            className="w-full h-full object-contain transition-transform duration-150"
            style={getTransformStyle()}
            onLoad={handleLoad}
            onError={handleError}
            crossOrigin="anonymous"
          />
        </div>
      )}
      
      {/* Zoom controls */}
      {!hasError && !isLoading && (
        <div className="absolute top-2 right-2 flex space-x-2">
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            className="bg-gray-800 bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={handleResetZoom}
            disabled={zoomLevel === 1}
            className="bg-gray-800 bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reset Zoom"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            className="bg-gray-800 bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom In"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      )}
      
      <div className={`absolute bottom-2 right-2 text-xs px-2 py-1 rounded ${
        hasError ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
      }`}>
        {hasError ? 'Disconnected' : 'Live'}
      </div>
      
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        {zoomLevel > 1 && `Zoom: ${zoomLevel.toFixed(2)}x`}
      </div>
    </div>
  );
};

export default VideoStream;