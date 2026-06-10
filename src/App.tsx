import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider } from "@/contexts/RoleContext";
import { AuthProvider } from "@/contexts/AuthContext";        // ✅ tambah
import ProtectedRoute from "@/components/ProtectedRoute";    // ✅ tambah
import Landing from "./pages/Landing";
import Login from "./pages/Login";

import OverviewPage from "./pages/dashboard/overview/OverviewPage";
import EmploymentPage from "./pages/dashboard/employment/EmploymentPage";
import EducationPage from "./pages/dashboard/education/EducationPage";
import KpiOverviewPage from "./pages/dashboard/kpi/KpiOverviewPage";
import ComparePage from "./pages/ComparePage";
import ProfilePage from "./pages/ProfilePage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import TeamManagementPage from "./pages/TeamManagementPage";
import StudentManagementPage from "./pages/StudentManagementPage";
import DaftarFormulirPage from "./pages/FormManagementPage";
import FormBuilderPage from "./pages/FormBuilderPage";
import FormPreviewPage from "./pages/FormPreviewPage";
import ThresholdManagementPage from "./pages/ThresholdManagementPage";
import NotFound from "./pages/NotFound";
import StudentLoginPage from "./pages/StudentLoginPage";
import FormPage from "./pages/FormPage";
import MasterUmpPage from "./pages/MasterUmpPage";

const queryClient = new QueryClient();

// ✅ Helper agar tidak repeat ProtectedRoute di tiap route
const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);
// const P = ({ children }: { children: React.ReactNode }) => (
//   <>{children}</>
// );

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        {/* ✅ AuthProvider di dalam BrowserRouter agar useNavigate bisa dipakai di context */}
        <AuthProvider>
          <RoleProvider>
            <Toaster />
            <Sonner />
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/form/login" element={<StudentLoginPage />} />
              <Route path="/form" element={<FormPage />} />

              {/* Protected — semua dashboard */}
              <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />
              <Route path="/dashboard/overview"             element={<P><OverviewPage /></P>} />
              <Route path="/dashboard/employment"           element={<P><EmploymentPage /></P>} />
              <Route path="/dashboard/education"            element={<P><EducationPage /></P>} />
              <Route path="/dashboard/kpi"                  element={<P><KpiOverviewPage /></P>} />
              <Route path="/dashboard/threshold-management" element={<P><ThresholdManagementPage /></P>} />
              <Route path="/dashboard/master-ump" element={<P><MasterUmpPage /></P>} />
              <Route path="/dashboard/compare"              element={<P><ComparePage /></P>} />
              <Route path="/dashboard/profile"              element={<P><ProfilePage /></P>} />
              <Route path="/dashboard/change-password"      element={<P><ChangePasswordPage /></P>} />
              <Route path="/dashboard/team-management"      element={<P><TeamManagementPage /></P>} />
              <Route path="/dashboard/student-management"   element={<P><StudentManagementPage /></P>} />
              <Route path="/dashboard/form-management"              element={<P><DaftarFormulirPage /></P>} />
              <Route path="/dashboard/form-management/new"          element={<P><FormBuilderPage /></P>} />
              <Route path="/dashboard/form-management/:formId/edit" element={<P><FormBuilderPage /></P>} />
              <Route path="/dashboard/form-management/new/preview"  element={<P><FormPreviewPage /></P>} />
              <Route path="/dashboard/form-management/:formId/preview" element={<P><FormPreviewPage /></P>} />

              {/* Legacy redirects */}
              <Route path="/dashboard/summary"    element={<Navigate to="/dashboard/overview" replace />} />
              <Route path="/dashboard/responden"  element={<Navigate to="/dashboard/overview" replace />} />
              <Route path="/dashboard/p2mpp/*"    element={<Navigate to="/dashboard/overview" replace />} />
              <Route path="/dashboard/kaprodi/*"  element={<Navigate to="/dashboard/overview" replace />} />
              <Route path="/dashboard/kotc/*"     element={<Navigate to="/dashboard/overview" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </RoleProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;