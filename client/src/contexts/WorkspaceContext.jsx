import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      if (!user) {
        setWorkspaceId(null);
        setLoadingWorkspace(false);
        return;
      }

      setLoadingWorkspace(true);
      try {
        const workspaces = await api.get('/workspaces');
        if (workspaces && workspaces.length > 0) {
          if (isMounted) setWorkspaceId(workspaces[0].id);
        } else {
          const defaultWs = await api.post('/workspaces/default', { name: 'Demo SaaS' });
          if (isMounted) setWorkspaceId(defaultWs.id);
        }
      } catch (err) {
        console.error('Failed to load workspace:', err);
      } finally {
        if (isMounted) setLoadingWorkspace(false);
      }
    }

    loadWorkspace();
    return () => { isMounted = false; };
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, setWorkspaceId, loadingWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
