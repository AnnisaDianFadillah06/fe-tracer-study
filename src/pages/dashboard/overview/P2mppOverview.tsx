import { ClipboardList, MailCheck, Users, Clock, AlertTriangle, TrendingUp, Activity, ListChecks, LineChart as LineChartIcon, BarChart3 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SummaryCards from "@/components/dashboard/SummaryCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import {
  Kpi1ParticipationChart,
  Kpi2CompletionStatusChart,
  Kpi3ParticipationTrendChart,
  Kpi13ProdiComparisonChart,
} from "@/components/dashboard/charts/common";

const summary = [
  { title: "Total Kuesioner", value: "1.692", hint: "Kuesioner dikirim", icon: ClipboardList, color: "bg-primary/10 text-primary" },
  { title: "Sudah Mengisi", value: "1.227", hint: "Response masuk", icon: MailCheck, color: "bg-blue-500/10 text-blue-500" },
  { title: "Response Rate", value: "72,5%", hint: "Tingkat respons", trend: "+5,2%", trendUp: true, icon: Users, color: "bg-emerald-500/10 text-emerald-500" },
  { title: "Rata-rata Waktu", value: "4,2", hint: "Hari pengisian", icon: Clock, color: "bg-amber-500/10 text-amber-500" },
  { title: "Belum Mengisi", value: "465", hint: "Follow-up needed", icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
  { title: "Tren Partisipasi", value: "↑ 5 thn", hint: "Stabil naik", icon: TrendingUp, color: "bg-purple-500/10 text-purple-500" },
];

const P2mppOverviewPage = () => {
  const { tahunLulus } = useGlobalFilters();
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const tahunLabel = tahunLulus === "all" ? "Semua Tahun" : tahunLulus;
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
            <Activity className="w-3 h-3 mr-1.5 animate-pulse" /> Realtime — {today}
          </Badge>
          <Badge variant="secondary">Data Tahun Lulus: <span className="font-semibold ml-1">{tahunLabel}</span></Badge>
        </div>
        <SummaryCards items={summary} />

        <Tabs defaultValue="k1" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto bg-muted/40 p-1.5 rounded-xl gap-1.5">
            <TabsTrigger value="k1" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5 transition-all"><ListChecks className="w-4 h-4"/>Respons Rate per Prodi</TabsTrigger>
            <TabsTrigger value="k2" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5 transition-all"><ClipboardList className="w-4 h-4"/>Status Pengisian</TabsTrigger>
            <TabsTrigger value="k3" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5 transition-all"><LineChartIcon className="w-4 h-4"/>Tren Partisipasi</TabsTrigger>
            <TabsTrigger value="k13" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5 transition-all"><BarChart3 className="w-4 h-4"/>Perbandingan Antar Prodi</TabsTrigger>
          </TabsList>
          <TabsContent value="k1"><Kpi1ParticipationChart /></TabsContent>
          <TabsContent value="k2"><Kpi2CompletionStatusChart /></TabsContent>
          <TabsContent value="k3"><Kpi3ParticipationTrendChart /></TabsContent>
          <TabsContent value="k13"><Kpi13ProdiComparisonChart /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default P2mppOverviewPage;
