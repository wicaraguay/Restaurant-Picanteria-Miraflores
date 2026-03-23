import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface Alert {
  id: string;
  type: AlertType;
  title?: string;
  message: string;
  duration?: number;
}

interface AlertContextType {
  showAlert: (alert: Omit<Alert, 'id'>) => void;
  hideAlert: (id: string) => void;
  alerts: Alert[];
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

let showAlertGlobal: (alert: Omit<Alert, 'id'>) => void = () => {
  console.warn('AlertProvider not initialized');
};

export const toast = {
  success: (message: string, title?: string) => showAlertGlobal({ type: 'success', message, title }),
  error: (message: string, title?: string) => showAlertGlobal({ type: 'error', message, title }),
  warning: (message: string, title?: string) => showAlertGlobal({ type: 'warning', message, title }),
  info: (message: string, title?: string) => showAlertGlobal({ type: 'info', message, title }),
};

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const hideAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const showAlert = useCallback((alert: Omit<Alert, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newAlert = { ...alert, id };
    
    setAlerts(prev => [...prev, newAlert]);

    if (alert.duration !== 0) {
      setTimeout(() => {
        hideAlert(id);
      }, alert.duration || 5000);
    }
  }, [hideAlert]);

  // Expose showAlert globally
  showAlertGlobal = showAlert;

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, alerts }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {alerts.map(alert => (
          <AlertNotification key={alert.id} alert={alert} onClose={() => hideAlert(alert.id)} />
        ))}
      </div>
    </AlertContext.Provider>
  );
};

const AlertNotification: React.FC<{ alert: Alert; onClose: () => void }> = ({ alert, onClose }) => {
  const getStyles = () => {
    switch (alert.type) {
      case 'success':
        return 'bg-green-600 shadow-green-500/20';
      case 'error':
        return 'bg-red-600 shadow-red-500/20';
      case 'warning':
        return 'bg-amber-500 shadow-amber-500/20';
      default:
        return 'bg-blue-600 shadow-blue-500/20';
    }
  };

  const getIcon = () => {
    switch (alert.type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div 
      className={`pointer-events-auto flex items-center gap-4 p-4 pr-12 rounded-2xl text-white shadow-2xl animate-in slide-in-from-right-full fade-in duration-300 relative group ${getStyles()}`}
      role="alert"
    >
      <div className="flex-shrink-0 bg-white/20 p-2 rounded-xl">
        {getIcon()}
      </div>
      <div>
        {alert.title && <p className="font-black text-[10px] uppercase tracking-widest opacity-80 mb-0.5">{alert.title}</p>}
        <p className="font-bold text-sm leading-tight">{alert.message}</p>
      </div>
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
