import { ClipboardList, MailCheck, Users, Clock, AlertTriangle, TrendingUp, ListChecks, LineChart as LineChartIcon, BarChart3, Activity } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SummaryCards, { SummaryCardItem } from "@/components/dashboard/SummaryCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import {
  Kpi1ParticipationChart,
  Kpi2CompletionStatusChart,
  Kpi3ParticipationTrendChart,
  Kpi13ProdiComparisonChart,
} from "@/components/dashboard/charts/common";

const DEFAULT_SUMMARY: SummaryCardItem[] = [
  { title: "Total Kuesioner", value: "1.692", hint: "Dikirim", icon: ClipboardList, color: "bg-primary/10 text-primary" },
  { title: "Sudah Mengisi", value: "1.227", hint: "Response masuk", icon: MailCheck, color: "bg-blue-500/10 text-blue-500" },
  { title: "Response Rate", value: "72,5%", hint: "Tingkat respons", trend: "+5,2%", trendUp: true, icon: Users, color: "bg-emerald-500/10 text-emerald-500" },
  { title: "Rata-rata Waktu", value: "4,2 hr", hint: "Pengisian", icon: Clock, color: "bg-amber-500/10 text-amber-500" },
  { title: "Belum Mengisi", value: "465", hint: "Follow-up", icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
  { title: "Tren 5 Thn", value: "↑ Stabil", hint: "Naik konsisten", icon: TrendingUp, color: "bg-purple-500/10 text-purple-500" },
];

interface Props {
  /** Override summary cards (per-role). */
  summary?: SummaryCardItem[];
  /** Hide compare buttons (Kaprodi). */
  hideCompare?: boolean;
  /** Demo: which KPIs should render empty (no data). */
  emptyKpis?: ("k1" | "k2" | "k3" | "k13")[];
}

const OverviewPageContent = ({ summary = DEFAULT_SUMMARY, emptyKpis = [] }: Props) => {
  const { tahunLulus } = useGlobalFilters();
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const tahunLabel = tahunLulus === "all" ? "Semua Tahun" : tahunLulus;
  const isEmpty = (k: Props["emptyKpis"][number]) => emptyKpis?.includes(k);
  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-[1400px] mx-auto">
        <SummaryCards items={summary} />

        <Tabs defaultValue="k1" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto bg-muted/40 p-1.5 rounded-xl gap-1.5">
            <TabsTrigger value="k1" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5"><ListChecks className="w-4 h-4"/>Respons Rate per Prodi</TabsTrigger>
            <TabsTrigger value="k2" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5"><ClipboardList className="w-4 h-4"/>Status Pengisian</TabsTrigger>
            <TabsTrigger value="k3" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5"><LineChartIcon className="w-4 h-4"/>Tren Partisipasi</TabsTrigger>
            <TabsTrigger value="k13" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5"><BarChart3 className="w-4 h-4"/>Perbandingan Antar Prodi</TabsTrigger>
          </TabsList>
          <TabsContent value="k1"><Kpi1ParticipationChart data={isEmpty("k1") ? [] : undefined} /></TabsContent>
          <TabsContent value="k2"><Kpi2CompletionStatusChart data={isEmpty("k2") ? [] : undefined} /></TabsContent>
          <TabsContent value="k3"><Kpi3ParticipationTrendChart data={isEmpty("k3") ? [] : undefined} /></TabsContent>
          <TabsContent value="k13"><Kpi13ProdiComparisonChart isEmpty={isEmpty("k13")} /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default OverviewPageContent;