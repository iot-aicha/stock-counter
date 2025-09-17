'use client';

const Wifi = () => (
  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
  </svg>
);

const WifiOff = () => (
  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
  </svg>
);

const StatusBar = ({ videoConnected, lastUpdate }) => {
  const getStatusInfo = () => {
    if (videoConnected) {
      return { color: 'text-green-600', icon: Wifi, text: 'Camera Connected' };
    } else {
      return { color: 'text-red-600', icon: WifiOff, text: 'Camera Disconnected' };
    }
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <div className="flex items-center space-x-4 text-sm">
      <div className={`flex items-center ${statusInfo.color}`}>
        <Icon />
        <span>{statusInfo.text}</span>
      </div>
      
      {lastUpdate && (
        <div className="text-gray-600">
          Last update: {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default StatusBar;