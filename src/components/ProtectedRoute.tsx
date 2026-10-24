import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AppAction, can } from '../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  actionRequired?: AppAction;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  actionRequired,
}) => {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (actionRequired && !can(role, actionRequired)) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center bg-white rounded-xl shadow-xs border border-slate-200 mt-12">
        <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-2">
          Your current demo role (<strong>{role}</strong>) does not have permission to access this resource or perform this action.
        </p>
        <p className="text-xs text-slate-400 mt-3">
          Tip: You can switch to an <strong>Admin</strong> or <strong>Reviewer</strong> role using the top bar selector in demo mode.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
