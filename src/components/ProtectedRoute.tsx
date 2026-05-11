import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";
import { type Permission } from "@/lib/rbac";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: Permission;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, permission, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { currentRole, can } = useRole();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
