import { useAuth } from '../contexts/AuthContext';
import { permissionManager } from '../lib/permissions';

export const usePermissions = () => {
  const { user } = useAuth();
  
  const hasPermission = (permissionId: string): boolean => {
    if (!user) return false;
    return permissionManager.hasPermission(user.role, permissionId);
  };

  const canManageRole = (targetRole: string): boolean => {
    if (!user) return false;
    return permissionManager.canManageRole(user.role, targetRole);
  };

  const canAccessSection = (section: string): boolean => {
    if (!user) return false;
    return permissionManager.canAccessSection(user.role, section);
  };

  const getVisibleSections = (): string[] => {
    if (!user) return [];
    return permissionManager.getVisibleSections(user.role);
  };

  // Quiz-specific permissions
  const canCreateQuiz = (): boolean => hasPermission('quizzes.create');
  const canEditQuiz = (): boolean => hasPermission('quizzes.edit');
  const canDeleteQuiz = (): boolean => hasPermission('quizzes.delete');
  const canManageQuestions = (): boolean => hasPermission('quizzes.manage_questions');
  const canViewQuizResults = (): boolean => hasPermission('quizzes.view_results');
  const canTakeQuiz = (): boolean => hasPermission('quizzes.take');

  // Course-specific permissions
  const canCreateCourse = (): boolean => hasPermission('courses.create');
  const canEditCourse = (): boolean => hasPermission('courses.edit');
  const canDeleteCourse = (): boolean => hasPermission('courses.delete');
  const canManageModules = (): boolean => hasPermission('courses.manage_modules');
  const canManageEnrollments = (): boolean => hasPermission('courses.manage_enrollments');

  return {
    hasPermission,
    canManageRole,
    canAccessSection,
    getVisibleSections,
    // Quiz permissions
    canCreateQuiz,
    canEditQuiz,
    canDeleteQuiz,
    canManageQuestions,
    canViewQuizResults,
    canTakeQuiz,
    // Course permissions
    canCreateCourse,
    canEditCourse,
    canDeleteCourse,
    canManageModules,
    canManageEnrollments,
  };
};
