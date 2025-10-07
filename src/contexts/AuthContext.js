import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '../utils/authFetch';

interface StravaConnection {
  connected: boolean;
  athlete?: {
    id: string;
    firstname: string;
    lastname: string;
    username: string;
  };
}

interface ConnectionState {
  strava: StravaConnection;
  loading: boolean;
}

interface ConnectionContextType extends ConnectionState {
  refreshConnections: () => Promise<void>;
  disconnectStrava: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConnectionState>({
    strava: { connected: false },
    loading: true
  });

  const refreshConnections = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const stravaStatus = await apiClient.get('/api/strava/oauth/status');
      setState({
        strava: stravaStatus,
        loading: false
      });
    } catch (error) {
      console.error('Failed to load connections:', error);
      setState({ strava: { connected: false }, loading: false });
    }
  }, []);

  const disconnectStrava = useCallback(async () => {
    try {
      await apiClient.post('/api/strava/oauth/disconnect');
      await refreshConnections();
    } catch (error) {
      console.error('Failed to disconnect Strava:', error);
      throw error;
    }
  }, [refreshConnections]);

  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  return (
    <ConnectionContext.Provider value={{ ...state, refreshConnections, disconnectStrava }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnections = () => {
  const context = useContext(ConnectionContext);
  if (!context) throw new Error('useConnections must be used within ConnectionProvider');
  return context;
};