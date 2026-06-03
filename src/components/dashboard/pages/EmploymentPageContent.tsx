import { Briefcase, Clock, Target, Rocket, DollarSign, Camera, Building2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SummaryCards, { SummaryCardItem } from "@/components/dashboard/SummaryCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import {
  Kpi4AbsorptionChart,
  Kpi5WaitingTimeChart,
  Kpi6FieldRelevanceChart,
  Kpi7EntrepreneurshipChart,
  Kpi8IncomeChart,
  Kpi12WorkplaceDistributionChart,
} from "@/components/dashboard/charts/common";

const DEFAULT_SUMMARY: SummaryCardItem[] = [
  { title: "Keterserapan", value: "84%", hint: "Bekerja/usaha", trend: "+3%", trendUp: true, icon: Briefcase, color: "bg-blue-500/10 text-blue-500" },
  { title: "Kerja ≤ 6 bln", value: "85%", hint: "Cepat terserap", trend: "+7%", trendUp: true, icon: Clock, color: "bg-amber-500/10 text-amber-500" },
  { title: "Kesesuaian", value: "79%", hint: "Sangat erat + erat", trend: "+3%", trendUp: true, icon: Target, color: "bg-emerald-500/10 text-emerald-500" },
  { title: "Wirausaha", value: "11%", hint: "Owner/co-founder", trend: "+3%", trendUp: true, icon: Rocket, color: "bg-green-500/10 text-green-500" },
  { title: "Avg Pendapatan", value: "Rp 9,1 jt", hint: "71% ≥ 1,2× UMP", trend: "+8%", trendUp: true, icon: DollarSign, color: "bg-primary/10 text-primary" },
  { title: "Level Nasional", value: "47%", hint: "Sebaran perusahaan", icon: Building2, color: "bg-purple-500/10 text-purple-500" },
];

type KpiKey = "k4" | "k5" | "k6" | "k7" | "k8" | "k12";

interface Props {
  summary?: SummaryCardItem[];
  emptyKpis?: KpiKey[];
}

const EmploymentPageContent = ({ summary = DEFAULT_SUMMARY, emptyKpis = [] }: Props) => {
  const { tahunLulus, week } = useGlobalFilters();
  const tahunLabel = tahunLulus === "all" ? "Semua Tahun" : tahunLulus;
  const isEmpty = (k: KpiKey) => emptyKpis.includes(k);
  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-[1400px] mx-auto">
        <SummaryCards items={summary} />

        <Tabs defaultValue="k4" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto bg-muted/40 p-1.5 rounded-xl gap-1.5">
            {[
              { v: "k4", icon: Briefcase, label: "Keterserapan Lulusan" },
              { v: "k5", icon: Clock, label: "Masa Tunggu Kerja" },
              { v: "k6", icon: Target, label: "Kesesuaian Bidang" },
              { v: "k7", icon: Rocket, label: "Lulusan Berwirausaha" },
              { v: "k8", icon: DollarSign, label: "Pendapatan Lulusan" },
              { v: "k12", icon: Building2, label: "Sebaran Level Perusahaan" },
            ].map(({ v, icon: Icon, label }) => (
              <TabsTrigger key={v} value={v} className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5">
                <Icon className="w-4 h-4" />{label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="k4"><Kpi4AbsorptionChart isEmpty={isEmpty("k4")} /></TabsContent>
          <TabsContent value="k5"><Kpi5WaitingTimeChart isEmpty={isEmpty("k5")} /></TabsContent>
          <TabsContent value="k6"><Kpi6FieldRelevanceChart isEmpty={isEmpty("k6")} /></TabsContent>
          <TabsContent value="k7"><Kpi7EntrepreneurshipChart isEmpty={isEmpty("k7")} /></TabsContent>
          <TabsContent value="k8"><Kpi8IncomeChart isEmpty={isEmpty("k8")} /></TabsContent>
          <TabsContent value="k12"><Kpi12WorkplaceDistributionChart isEmpty={isEmpty("k12")} /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default EmploymentPageContent;