import {
  ClipboardList,
  MailCheck,
  Users,
  Clock,
  AlertTriangle,
  ListChecks,
  LineChart as LineChartIcon,
  Activity,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SummaryCards, {
  SummaryCardItem,
} from "@/components/dashboard/SummaryCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import {
  Kpi1ParticipationChart,
  Kpi2CompletionStatusChart,
  Kpi3ParticipationTrendChart,
} from "@/components/dashboard/charts/common";
import { useOverviewSummary, OverviewSummaryCards } from "@/hooks/useSummaryCards";
import { useRole } from "@/contexts/RoleContext";

const FALLBACK_SUMMARY: SummaryCardItem[] = [
  { title: "Total Kuesioner", value: "—", hint: "Dikirim", icon: ClipboardList, color: "bg-primary/10 text-primary" },
  { title: "Sudah Mengisi", value: "—", hint: "Response masuk", icon: MailCheck, color: "bg-blue-500/10 text-blue-500" },
  { title: "Response Rate", value: "—", hint: "Tingkat respons", icon: Users, color: "bg-emerald-500/10 text-emerald-500" },
  { title: "Belum Mengisi", value: "—", hint: "Follow-up", icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
];

function formatNumber(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

function buildOverviewCards(cards: OverviewSummaryCards): SummaryCardItem[] {
  const rr = cards.response_rate;
  const trendLabel = rr.trend_pp != null && rr.trend_pp !== 0 ? `${rr.trend_pp > 0 ? "+" : ""}${rr.trend_pp}pp` : undefined;

  return [
    { title: "Total Kuesioner", value: formatNumber(cards.total_kuesioner.value), hint: cards.total_kuesioner.hint, icon: ClipboardList, color: "bg-primary/10 text-primary" },
    { title: "Sudah Mengisi", value: formatNumber(cards.sudah_mengisi.value), hint: cards.sudah_mengisi.hint, icon: MailCheck, color: "bg-blue-500/10 text-blue-500" },
    { title: "Response Rate", value: `${formatNumber(rr.value)}%`, hint: rr.hint, icon: Users, color: "bg-emerald-500/10 text-emerald-500", ...(trendLabel ? { trend: trendLabel, trendUp: rr.trend_direction === "up" } : {}) },
    { title: "Belum Mengisi", value: formatNumber(cards.belum_mengisi.value), hint: cards.belum_mengisi.hint, icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
  ];
}

interface Props {
  /** Hide compare buttons (Kaprodi). */
  hideCompare?: boolean;
  /** Demo: which KPIs should render empty (no data). */
  emptyKpis?: ("k1" | "k2" | "k3")[];
}

const OverviewPageContent = ({
  emptyKpis = [],
}: Props) => {
  const { tahunLulus } = useGlobalFilters();
  const { currentRole } = useRole();
  const { data: cards, loading } = useOverviewSummary();
  const isKaprodi = currentRole === "kaprodi";
  const summary = cards ? buildOverviewCards(cards) : FALLBACK_SUMMARY;
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const tahunLabel = tahunLulus === "all" ? "Semua Tahun" : tahunLulus;
  const isEmpty = (k: Props["emptyKpis"][number]) => emptyKpis?.includes(k);
  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-[1400px] mx-auto">
        <SummaryCards items={summary} />

        <Tabs defaultValue={isKaprodi ? "k2" : "k1"} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto bg-muted/40 p-1.5 rounded-xl gap-1.5">
            {!isKaprodi && (
              <TabsTrigger
                value="k1"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5"
              >
                <ListChecks className="w-4 h-4" />
                Respons Rate per Prodi
              </TabsTrigger>
            )}
            <TabsTrigger
              value="k2"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5"
            >
              <ClipboardList className="w-4 h-4" />
              Status Pengisian Survei Alumni
            </TabsTrigger>
            <TabsTrigger
              value="k3"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5"
            >
              <LineChartIcon className="w-4 h-4" />
              Tren Partisipasi Pengisian
            </TabsTrigger>
          </TabsList>
          {!isKaprodi && (
            <TabsContent value="k1">
              <Kpi1ParticipationChart />
            </TabsContent>
          )}
          <TabsContent value="k2">
            <Kpi2CompletionStatusChart />
          </TabsContent>
          <TabsContent value="k3">
            <Kpi3ParticipationTrendChart />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default OverviewPageContent;
