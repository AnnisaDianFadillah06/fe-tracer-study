import { BookOpen, Sparkles, Wallet, GraduationCap, Award, Activity } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SummaryCards, { SummaryCardItem } from "@/components/dashboard/SummaryCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Kpi9CompetencyGapChart,
  Kpi10LearningPerceptionChart,
  Kpi11FundingSourceChart,
} from "@/components/dashboard/charts/common";
import { useEducationSummary } from "@/hooks/useSummaryCards";

const FALLBACK_SUMMARY: SummaryCardItem[] = [
  { title: "Skor Kompetensi", value: "—", hint: "Avg Likert", icon: Award, color: "bg-blue-500/10 text-blue-500" },
  { title: "Gap Terbesar", value: "—", hint: "—", icon: Activity, color: "bg-destructive/10 text-destructive" },
  { title: "Metode Terbaik", value: "—", hint: "—", icon: Sparkles, color: "bg-emerald-500/10 text-emerald-500" },
  { title: "Avg Persepsi", value: "—", hint: "Semua metode", icon: BookOpen, color: "bg-purple-500/10 text-purple-500" },
  { title: "Mandiri/Keluarga", value: "—", hint: "Sumber utama", icon: Wallet, color: "bg-amber-500/10 text-amber-500" },
  { title: "Beasiswa", value: "—", hint: "Pem. + Swasta", icon: GraduationCap, color: "bg-primary/10 text-primary" },
];

function formatNumber(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

function buildEducationCards(cards: NonNullable<ReturnType<typeof useEducationSummary>["data"]>): SummaryCardItem[] {
  return [
    { title: "Skor Kompetensi", value: formatNumber(cards.skor_kompetensi.value), hint: cards.skor_kompetensi.hint, icon: Award, color: "bg-blue-500/10 text-blue-500" },
    { title: "Gap Terbesar", value: cards.gap_terbesar.label, hint: cards.gap_terbesar.hint, icon: Activity, color: "bg-destructive/10 text-destructive" },
    { title: "Metode Terbaik", value: cards.metode_terbaik.label, hint: cards.metode_terbaik.hint, icon: Sparkles, color: "bg-emerald-500/10 text-emerald-500" },
    { title: "Avg Persepsi", value: formatNumber(cards.avg_persepsi.value), hint: cards.avg_persepsi.hint, icon: BookOpen, color: "bg-purple-500/10 text-purple-500" },
    { title: "Mandiri/Keluarga", value: `${cards.mandiri_keluarga.pct}%`, hint: cards.mandiri_keluarga.hint, icon: Wallet, color: "bg-amber-500/10 text-amber-500" },
    { title: "Beasiswa", value: `${cards.beasiswa.pct}%`, hint: cards.beasiswa.hint, icon: GraduationCap, color: "bg-primary/10 text-primary" },
  ];
}

const EducationPageContent = () => {
  const { data: cards, loading } = useEducationSummary();
  const summary = cards ? buildEducationCards(cards) : FALLBACK_SUMMARY;
  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-[1400px] mx-auto">
        <SummaryCards items={summary} />

        <Tabs defaultValue="k9" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto bg-muted/40 p-1.5 rounded-xl gap-1.5">
            <TabsTrigger value="k9" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5"><Activity className="w-4 h-4"/>Gap Kompetensi Lulusan</TabsTrigger>
            <TabsTrigger value="k10" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5"><Sparkles className="w-4 h-4"/>Persepsi Metode Pembelajaran</TabsTrigger>
            <TabsTrigger value="k11" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow rounded-lg px-4 py-2.5"><Wallet className="w-4 h-4"/>Sumber Pembiayaan Kuliah</TabsTrigger>
          </TabsList>
          <TabsContent value="k9"><Kpi9CompetencyGapChart /></TabsContent>
          <TabsContent value="k10"><Kpi10LearningPerceptionChart /></TabsContent>
          <TabsContent value="k11"><Kpi11FundingSourceChart /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default EducationPageContent;
