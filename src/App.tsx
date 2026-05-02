import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider } from "@/contexts/RoleContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";

// Router pages (role-agnostic, delegates to role-specific components)
import OverviewPage from "./pages/dashboard/overview/OverviewPage";
import EmploymentPage from "./pages/dashboard/employment/EmploymentPage";
import EducationPage from "./pages/dashboard/education/EducationPage";
import AnalyticsPage from "./pages/dashboard/analytics/AnalyticsPage";

// Shared pages
import ComparePage from "./pages/ComparePage";
import ProfilePage from "./pages/ProfilePage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import TeamManagementPage from "./pages/TeamManagementPage";
import StudentManagementPage from "./pages/StudentManagementPage";
import DaftarFormulirPage from "./pages/FormManagementPage";
import FormBuilderPage from "./pages/FormBuilderPage";
import FormPreviewPage from "./pages/FormPreviewPage";
import NotFound from "./pages/NotFound";

// Student-facing pages
import StudentLoginPage from "./pages/StudentLoginPage";
import FormPage from "./pages/FormPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <RoleProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            
            {/* Default redirect */}
            <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />
            
            {/* Dashboard pages — role determined by RoleContext, not URL */}
            <Route path="/dashboard/overview" element={<OverviewPage />} />
            <Route path="/dashboard/employment" element={<EmploymentPage />} />
            <Route path="/dashboard/education" element={<EducationPage />} />
            <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
            
            {/* Shared Routes */}
            <Route path="/dashboard/compare" element={<ComparePage />} />
            <Route path="/dashboard/profile" element={<ProfilePage />} />
            <Route path="/dashboard/change-password" element={<ChangePasswordPage />} />
            <Route path="/dashboard/team-management" element={<TeamManagementPage />} />
            <Route path="/dashboard/student-management" element={<StudentManagementPage />} />
            <Route path="/dashboard/form-management" element={<DaftarFormulirPage />} />
            <Route path="/dashboard/form-management/new" element={<FormBuilderPage />} />
            <Route path="/dashboard/form-management/:formId/edit" element={<FormBuilderPage />} />
            <Route path="/dashboard/form-management/new/preview" element={<FormPreviewPage />} />
            <Route path="/dashboard/form-management/:formId/preview" element={<FormPreviewPage />} />

            {/* Student-facing form routes */}
            <Route path="/form/login" element={<StudentLoginPage />} />
            <Route path="/form" element={<FormPage />} />
            
            {/* Legacy redirects */}
            <Route path="/dashboard/summary" element={<Navigate to="/dashboard/overview" replace />} />
            <Route path="/dashboard/responden" element={<Navigate to="/dashboard/overview" replace />} />
            <Route path="/dashboard/p2mpp/*" element={<Navigate to="/dashboard/overview" replace />} />
            <Route path="/dashboard/kaprodi/*" element={<Navigate to="/dashboard/overview" replace />} />
            <Route path="/dashboard/kotc/*" element={<Navigate to="/dashboard/overview" replace />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
