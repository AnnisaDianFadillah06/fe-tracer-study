import {
  Briefcase,
  Clock,
  Target,
  Rocket,
  DollarSign,
  Building2,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SummaryCards, {
  SummaryCardItem,
} from "@/components/dashboard/SummaryCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Kpi4AbsorptionChart,
  Kpi5WaitingTimeChart,
  Kpi6FieldRelevanceChart,
  Kpi7EntrepreneurshipChart,
  Kpi8IncomeChart,
  Kpi12WorkplaceDistributionChart,
} from "@/components/dashboard/charts/common";
import { useEmploymentSummary, EmploymentSummaryCards } from "@/hooks/useSummaryCards";

const FALLBACK_SUMMARY: SummaryCardItem[] = [
  { title: "Keterserapan", value: "—", hint: "Bekerja/usaha", icon: Briefcase, color: "bg-blue-500/10 text-blue-500" },
  { title: "Kerja ≤ 6 bln", value: "—", hint: "Cepat terserap", icon: Clock, color: "bg-amber-500/10 text-amber-500" },
  { title: "Kesesuaian", value: "—", hint: "Sangat erat + erat", icon: Target, color: "bg-emerald-500/10 text-emerald-500" },
  { title: "Wirausaha", value: "—", hint: "Owner/co-founder", icon: Rocket, color: "bg-green-500/10 text-green-500" },
  { title: "Avg Pendapatan", value: "—", hint: "Pendapatan rata-rata", icon: DollarSign, color: "bg-primary/10 text-primary" },
  { title: "Level Nasional", value: "—", hint: "Sebaran perusahaan", icon: Building2, color: "bg-purple-500/10 text-purple-500" },
];

function formatNumber(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

function buildEmploymentCards(cards: EmploymentSummaryCards): SummaryCardItem[] {
  return [
    { title: "Keterserapan", value: `${formatNumber(cards.keterserapan.value)}%`, hint: cards.keterserapan.hint, icon: Briefcase, color: "bg-blue-500/10 text-blue-500" },
    { title: "Kerja ≤ 6 bln", value: `${formatNumber(cards.masa_tunggu_cepat.value)}%`, hint: cards.masa_tunggu_cepat.hint, icon: Clock, color: "bg-amber-500/10 text-amber-500" },
    { title: "Kesesuaian", value: `${formatNumber(cards.kesesuaian.value)}%`, hint: cards.kesesuaian.hint, icon: Target, color: "bg-emerald-500/10 text-emerald-500" },
    { title: "Wirausaha", value: `${formatNumber(cards.wirausaha.value)}%`, hint: cards.wirausaha.hint, icon: Rocket, color: "bg-green-500/10 text-green-500" },
    { title: "Avg Pendapatan", value: cards.avg_pendapatan.label || `Rp ${formatNumber(cards.avg_pendapatan.value)}`, hint: cards.avg_pendapatan.hint, icon: DollarSign, color: "bg-primary/10 text-primary" },
    { title: "Level Nasional", value: `${formatNumber(cards.level_nasional.value)}%`, hint: cards.level_nasional.hint, icon: Building2, color: "bg-purple-500/10 text-purple-500" },
  ];
}

const EmploymentPageContent = () => {
  const { data: cards } = useEmploymentSummary();
  const hasExpectedShape = cards && cards.keterserapan && cards.masa_tunggu_cepat;
  const summary = hasExpectedShape ? buildEmploymentCards(cards) : FALLBACK_SUMMARY;
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
              <TabsTrigger
                key={v}
                value={v}
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5"
              >
                <Icon className="w-4 h-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="k4">
            <Kpi4AbsorptionChart />
          </TabsContent>
          <TabsContent value="k5">
            <Kpi5WaitingTimeChart />
          </TabsContent>
          <TabsContent value="k6">
            <Kpi6FieldRelevanceChart />
          </TabsContent>
          <TabsContent value="k7">
            <Kpi7EntrepreneurshipChart />
          </TabsContent>
          <TabsContent value="k8">
            <Kpi8IncomeChart />
          </TabsContent>
          <TabsContent value="k12">
            <Kpi12WorkplaceDistributionChart />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default EmploymentPageContent;
