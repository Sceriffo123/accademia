import { useAuth } from '../contexts/AuthContext';
import { writeActivityLog } from '../lib/neonDatabase';

export function useActivityLogger() {
  const { user } = useAuth();

  const logActivity = async (
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any
  ) => {
    if (!user) return;

    try {
      await writeActivityLog(user.id, action, resourceType, resourceId, details);
    } catch (error) {
      console.error('🚨 ACTIVITY LOGGER: Errore registrazione:', error);
    }
  };

  const logFormSubmit = (formName: string, data: any = {}) => {
    logActivity('form_submit', 'form', undefined, {
      form_name: formName,
      timestamp: new Date().toISOString(),
      ...data
    });
  };

  const logAction = (actionName: string, targetType: string, targetId?: string, data: any = {}) => {
    logActivity(actionName, targetType, targetId, {
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      ...data
    });
  };

  return {
    logActivity,
    logFormSubmit,
    logAction
  };
}
