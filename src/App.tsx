import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { GlobalFiltersProvider } from "@/contexts/GlobalFiltersContext";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

import Landing from "./pages/landing/Landing";
import Login from "./pages/auth/Login";
import Unauthorized from "./pages/common/Unauthorized";

// Halaman publik (tanpa login)
import LaporanPublikPage from "./pages/publik/LaporanPublikPage";
import StatistikPublikPage from "./pages/publik/StatistikPublikPage";
import PanduanPage from "./pages/publik/PanduanPage";
import FaqPage from "./pages/publik/FaqPage";
import KebijakanPrivasiPage from "./pages/publik/KebijakanPrivasiPage";

// Dashboard pages
import OverviewPage from "./pages/dashboard/overview/OverviewPage";
import EmploymentPage from "./pages/dashboard/employment/EmploymentPage";
import EducationPage from "./pages/dashboard/education/EducationPage";
import AnalyticsPage from "./pages/dashboard/analytics/AnalyticsPage";
import KpiOverviewPage from "./pages/dashboard/kpi/KpiOverviewPage";
import ComparePage from "./pages/dashboard/ComparePage";
import MultidimensiInsightPage from "./pages/MultidimensiInsightPage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import AlumniDataPage from "./pages/dashboard/AlumniDataPage";
import StakeholderContactsPage from "./pages/dashboard/StakeholderContactsPage";
import QuestionnaireResultsPage from "./pages/dashboard/QuestionnaireResultsPage";

// Konfigurasi OLAP / ETL
import ThresholdManagementPage from "./pages/ThresholdManagementPage";
import MasterUmpPage from "./pages/MasterUmpPage";
import QuestionMappingPage from "./pages/QuestionMappingPage";
import EtlAnomalyLogPage from "./pages/EtlAnomalyLogPage";

// Auth
import ChangePasswordPage from "./pages/auth/ChangePasswordPage";

// Admin pages
import TeamManagementPage from "./pages/team/TeamManagementPage";
import StaffManagementPage from "./pages/staff/StaffManagementPage";
import StudentManagementPage from "./pages/student/StudentManagementPage";
import ApprovalsPage from "./pages/admin/ApprovalsPage";
import MasterDataPage from "./pages/admin/MasterDataPage";
import PublicReportsPage from "./pages/admin/PublicReportsPage";
import PublicSettingsPage from "./pages/admin/PublicSettingsPage";
import DaftarKuisionerPage from "./pages/form/FormManagementPage";
import FormCreationChoicePage from "./pages/form/FormCreationChoicePage";
import FormBuilderPage from "./pages/form/FormBuilderPage";
import FormPreviewPage from "./pages/form/FormPreviewPage";
import FormRespondentsPage from "./pages/form/FormRespondentsPage";

// Student/Alumni form
import FormPage from "./pages/form/FormPage";
import DataSayaPage from "./pages/student/DataSayaPage";
import DataSubjectRequestsPage from "./pages/admin/DataSubjectRequestsPage";
import AuditLogPage from "./pages/admin/AuditLogPage";

import NotFound from "./pages/common/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <RoleProvider>
          {/* GlobalFiltersProvider membungkus seluruh route dashboard supaya
              filter (tahun lulus, prodi, dsb) tetap bertahan antar halaman. */}
          <GlobalFiltersProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Publik — sengaja di luar ProtectedRoute, endpoint-nya juga
                    tanpa auth dan menegakkan sendiri batas publikasi + rentang
                    tahun di sisi server. */}
                <Route path="/laporan" element={<LaporanPublikPage />} />
                <Route path="/statistik" element={<StatistikPublikPage />} />
                <Route path="/panduan" element={<PanduanPage />} />
                <Route path="/faq" element={<FaqPage />} />
                <Route path="/kebijakan-privasi" element={<KebijakanPrivasiPage />} />

                {/* Default redirect */}
                <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />

                {/* Dashboard — permission-protected */}
                <Route path="/dashboard/overview" element={<ProtectedRoute permission="dashboard.overview"><OverviewPage /></ProtectedRoute>} />
                <Route path="/dashboard/employment" element={<ProtectedRoute permission="dashboard.employment"><EmploymentPage /></ProtectedRoute>} />
                <Route path="/dashboard/education" element={<ProtectedRoute permission="dashboard.education"><EducationPage /></ProtectedRoute>} />
                {/* <Route path="/dashboard/analytics" element={<ProtectedRoute permission="dashboard.analytics"><AnalyticsPage /></ProtectedRoute>} /> */}
                <Route path="/dashboard/kpi" element={<ProtectedRoute permission="dashboard.kpi"><KpiOverviewPage /></ProtectedRoute>} />
                <Route path="/dashboard/compare" element={<ProtectedRoute permission="dashboard.overview"><ComparePage /></ProtectedRoute>} />
                <Route path="/dashboard/multidimensi-insight" element={<ProtectedRoute permission="dashboard.multidimensi"><MultidimensiInsightPage /></ProtectedRoute>} />

                {/* Konfigurasi OLAP/ETL — sejajar gate role:head_tracer di BE */}
                <Route path="/dashboard/threshold-management" element={<ProtectedRoute permission="admin.threshold"><ThresholdManagementPage /></ProtectedRoute>} />
                <Route path="/dashboard/master-ump" element={<ProtectedRoute permission="admin.threshold"><MasterUmpPage /></ProtectedRoute>} />
                <Route path="/dashboard/question-mapping" element={<ProtectedRoute permission="admin.etl"><QuestionMappingPage /></ProtectedRoute>} />
                <Route path="/dashboard/etl-anomaly-log" element={<ProtectedRoute permission="admin.etl"><EtlAnomalyLogPage /></ProtectedRoute>} />

                {/* Administration */}
                <Route path="/dashboard/approvals" element={<ProtectedRoute permission="admin.approval"><ApprovalsPage /></ProtectedRoute>} />
                <Route path="/dashboard/master-data" element={<ProtectedRoute permission="admin.master"><MasterDataPage /></ProtectedRoute>} />
                <Route path="/dashboard/public-reports" element={<ProtectedRoute permission="admin.public_report"><PublicReportsPage /></ProtectedRoute>} />
                <Route path="/dashboard/public-settings" element={<ProtectedRoute permission="admin.public_report"><PublicSettingsPage /></ProtectedRoute>} />

                {/* Perlindungan data pribadi — sisi staf. Pasangan dari halaman
                    Data Saya milik alumni; tanpa keduanya, permintaan alumni
                    tersimpan tanpa ada yang dapat membacanya. */}
                <Route path="/dashboard/permintaan-data" element={<ProtectedRoute permission="admin.privacy"><DataSubjectRequestsPage /></ProtectedRoute>} />
                <Route path="/dashboard/jejak-audit" element={<ProtectedRoute permission="admin.privacy"><AuditLogPage /></ProtectedRoute>} />
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

                {/* Kontak penilai — Ketua Tracer & Tim Tracer, sejalan dengan
                    gate role:head_tracer,tracer_team di routes/api.php. */}
                <Route path="/dashboard/stakeholder-contacts" element={<ProtectedRoute permission="admin.stakeholder"><StakeholderContactsPage /></ProtectedRoute>} />

                {/* Akademik (Kaprodi / Kajur / Head Tracer) */}
                <Route path="/dashboard/alumni-data" element={<ProtectedRoute permission="academic.alumni_data"><AlumniDataPage /></ProtectedRoute>} />
                <Route path="/dashboard/questionnaire-results" element={<ProtectedRoute permission="academic.questionnaire_results"><QuestionnaireResultsPage /></ProtectedRoute>} />
                <Route path="/dashboard/questionnaire-results/:formId" element={<ProtectedRoute permission="academic.questionnaire_results"><FormRespondentsPage /></ProtectedRoute>} />

                {/* Profile & settings (any authenticated) */}
                <Route path="/dashboard/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/dashboard/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />

                {/* Alumni / Student form routes */}
                <Route path="/form" element={<Navigate to="/form/fill" replace />} />
                <Route path="/form/:formId" element={<FormPreviewPage />} />
                <Route path="/form/fill" element={<FormPage />} />

                {/* Portal hak subjek data (UU 27/2022). Di luar /dashboard
                    karena pemakainya alumni dengan guard 'alumni', bukan staf. */}
                <Route path="/data-saya" element={<DataSayaPage />} />

                {/* Legacy redirects */}
                <Route path="/dashboard/summary" element={<Navigate to="/dashboard/overview" replace />} />
                <Route path="/dashboard/responden" element={<Navigate to="/dashboard/overview" replace />} />
                <Route path="/dashboard/p2mpp/*" element={<Navigate to="/dashboard/overview" replace />} />
                <Route path="/dashboard/kaprodi/*" element={<Navigate to="/dashboard/overview" replace />} />
                <Route path="/dashboard/kotc/*" element={<Navigate to="/dashboard/overview" replace />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </GlobalFiltersProvider>
        </RoleProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
