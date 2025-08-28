import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  operatorOnly?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  adminOnly = false, 
  superAdminOnly = false,
  operatorOnly = false 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // SuperAdmin ha accesso a tutto
  if (profile?.role === 'superadmin') {
    return <>{children}</>;
  }

  // Controlli specifici per ruolo
  if (superAdminOnly && profile?.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (adminOnly && !['admin', 'superadmin'].includes(profile?.role || '')) {
    return <Navigate to="/dashboard" replace />;
  }

  if (operatorOnly && !['operator', 'admin', 'superadmin'].includes(profile?.role || '')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}