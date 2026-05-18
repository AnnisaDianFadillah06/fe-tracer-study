import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

import Landing from "./pages/landing/Landing";
import Login from "./pages/auth/Login";
import Unauthorized from "./pages/common/Unauthorized";

// Dashboard pages
import OverviewPage from "./pages/dashboard/overview/OverviewPage";
import EmploymentPage from "./pages/dashboard/employment/EmploymentPage";
import EducationPage from "./pages/dashboard/education/EducationPage";
import AnalyticsPage from "./pages/dashboard/analytics/AnalyticsPage";
import ComparePage from "./pages/dashboard/ComparePage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import AlumniDataPage from "./pages/dashboard/AlumniDataPage";
import QuestionnaireResultsPage from "./pages/dashboard/QuestionnaireResultsPage";
import StatisticsPage from "./pages/dashboard/StatisticsPage";
import ReportsPage from "./pages/dashboard/ReportsPage";

// Auth
import ChangePasswordPage from "./pages/auth/ChangePasswordPage";

// Admin pages
import TeamManagementPage from "./pages/team/TeamManagementPage";
import StaffManagementPage from "./pages/staff/StaffManagementPage";
import StudentManagementPage from "./pages/student/StudentManagementPage";
import DaftarKuisionerPage from "./pages/form/FormManagementPage";
import FormCreationChoicePage from "./pages/form/FormCreationChoicePage";
import FormBuilderPage from "./pages/form/FormBuilderPage";
import FormPreviewPage from "./pages/form/FormPreviewPage";
import FormRespondentsPage from "./pages/form/FormRespondentsPage";

// Student/Alumni form
import StudentFormListPage from "./pages/student/StudentFormListPage";
import FormPage from "./pages/form/FormPage";

import NotFound from "./pages/common/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <RoleProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Default redirect */}
            <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />

            {/* Dashboard — permission-protected */}
            <Route path="/dashboard/overview" element={<ProtectedRoute permission="dashboard.overview"><OverviewPage /></ProtectedRoute>} />
            <Route path="/dashboard/employment" element={<ProtectedRoute permission="dashboard.employment"><EmploymentPage /></ProtectedRoute>} />
            <Route path="/dashboard/education" element={<ProtectedRoute permission="dashboard.education"><EducationPage /></ProtectedRoute>} />
            <Route path="/dashboard/analytics" element={<ProtectedRoute permission="dashboard.analytics"><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/dashboard/compare" element={<ProtectedRoute permission="dashboard.overview"><ComparePage /></ProtectedRoute>} />

            {/* Administration */}
            <Route path="/dashboard/team-management" element={<ProtectedRoute permission="admin.user"><TeamManagementPage /></ProtectedRoute>} />
            <Route path="/dashboard/staff-management" element={<ProtectedRoute permission="admin.user"><StaffManagementPage /></ProtectedRoute>} />
            <Route path="/dashboard/student-management" element={<ProtectedRoute permission="admin.user"><StudentManagementPage /></ProtectedRoute>} />
            <Route path="/dashboard/form-management" element={<ProtectedRoute permission="admin.questionnaire"><DaftarKuisionerPage /></ProtectedRoute>} />
            <Route path="/dashboard/form-management/new" element={<ProtectedRoute permission="admin.questionnaire"><FormCreationChoicePage /></ProtectedRoute>} />
            <Route path="/dashboard/form-management/new/builder" element={<ProtectedRoute permission="admin.questionnaire"><FormBuilderPage /></ProtectedRoute>} />
            <Route path="/dashboard/form-management/:formId/edit" element={<ProtectedRoute permission="admin.questionnaire"><FormBuilderPage /></ProtectedRoute>} />
            <Route path="/dashboard/form-management/new/preview" element={<ProtectedRoute permission="admin.questionnaire"><FormPreviewPage /></ProtectedRoute>} />
            <Route path="/dashboard/form-management/:formId/preview" element={<ProtectedRoute permission="admin.questionnaire"><FormPreviewPage /></ProtectedRoute>} />
            <Route path="/dashboard/form-management/:formId/respondents" element={<ProtectedRoute permission="admin.questionnaire"><FormRespondentsPage /></ProtectedRoute>} />

            {/* Data viewers */}
            <Route path="/dashboard/alumni-data" element={<ProtectedRoute permission="data.view_prodi"><AlumniDataPage /></ProtectedRoute>} />
            <Route path="/dashboard/questionnaire-results" element={<ProtectedRoute permission="data.view_prodi"><QuestionnaireResultsPage /></ProtectedRoute>} />
            <Route path="/dashboard/questionnaire-results/:formId" element={<ProtectedRoute permission="data.view_prodi"><FormRespondentsPage /></ProtectedRoute>} />

            {/* Reports (Pimpinan) */}
            <Route path="/dashboard/statistics" element={<ProtectedRoute permission="data.view_all"><StatisticsPage /></ProtectedRoute>} />
            <Route path="/dashboard/reports" element={<ProtectedRoute permission="data.view_all"><ReportsPage /></ProtectedRoute>} />

            {/* Profile & settings (any authenticated) */}
            <Route path="/dashboard/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/dashboard/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />

            {/* Alumni / Student form routes */}
            <Route path="/form" element={<StudentFormListPage />} />
            <Route path="/form/:formId" element={<FormPreviewPage />} />
            <Route path="/form/fill" element={<FormPage />} />

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
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
