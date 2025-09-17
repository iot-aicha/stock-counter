'use client';

const AlertTriangle = () => (
  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const CheckCircle = () => (
  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircle = () => (
  <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Clock = () => (
  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertsPanel = ({ results }) => {
  if (!results || !results.alerts || results.alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <CheckCircle />
          <span className="text-green-800 font-medium">All items are correctly placed and accounted for</span>
        </div>
      </div>
    );
  }

  const criticalAlerts = results.alerts.filter(alert => alert.level === 'critical');
  const warningAlerts = results.alerts.filter(alert => alert.level === 'warning');
  const infoAlerts = results.alerts.filter(alert => alert.level === 'info');

  return (
    <div className="mb-6 space-y-3">
      {criticalAlerts.map((alert, index) => (
        <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle />
            <span className="text-red-800 font-medium">{alert.message}</span>
          </div>
        </div>
      ))}

      {warningAlerts.map((alert, index) => (
        <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle />
            <span className="text-yellow-800">{alert.message}</span>
          </div>
        </div>
      ))}

      {infoAlerts.map((alert, index) => (
        <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock />
            <span className="text-blue-800">{alert.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertsPanel;