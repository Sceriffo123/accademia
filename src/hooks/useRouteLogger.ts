import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { writeActivityLog } from '../lib/neonDatabase';

export function useRouteLogger() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Skip se utente non autenticato
    if (!user || !location.pathname) return;

    const logNavigation = async () => {
      try {
        await writeActivityLog(
          user.id,
          'page_navigation',
          'route',
          undefined,
          {
            from_path: document.referrer ? new URL(document.referrer).pathname : null,
            to_path: location.pathname,
            search: location.search,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
          }
        );
      } catch (error) {
        console.error('🚨 ROUTE LOGGER: Errore registrazione navigazione:', error);
      }
    };

    logNavigation();
  }, [location.pathname, location.search, user]);
}
