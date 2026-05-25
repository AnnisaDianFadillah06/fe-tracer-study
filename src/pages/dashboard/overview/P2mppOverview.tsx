import { ClipboardList, MailCheck, Users, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import GlobalFilters from "@/components/dashboard/GlobalFilters";
import SummaryCards from "@/components/dashboard/SummaryCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  return (
    <DashboardLayout>
      <GlobalFilters />
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <SummaryCards items={summary} />

        <Tabs defaultValue="k1" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="k1">Respons Rate per Prodi</TabsTrigger>
            <TabsTrigger value="k2">Status Pengisian</TabsTrigger>
            <TabsTrigger value="k3">Tren Partisipasi</TabsTrigger>
            <TabsTrigger value="k13">Perbandingan Antar Prodi</TabsTrigger>
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
