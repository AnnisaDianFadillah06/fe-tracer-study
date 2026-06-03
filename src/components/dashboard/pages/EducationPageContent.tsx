import { BookOpen, Sparkles, Wallet, GraduationCap, Award, Activity, Camera } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SummaryCards, { SummaryCardItem } from "@/components/dashboard/SummaryCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import {
  Kpi9CompetencyGapChart,
  Kpi10LearningPerceptionChart,
  Kpi11FundingSourceChart,
} from "@/components/dashboard/charts/common";

const DEFAULT_SUMMARY: SummaryCardItem[] = [
  { title: "Skor Kompetensi", value: "4,1", hint: "Avg Likert", icon: Award, color: "bg-blue-500/10 text-blue-500" },
  { title: "Gap Terbesar", value: "B. Inggris", hint: "-1,1 poin", icon: Activity, color: "bg-destructive/10 text-destructive" },
  { title: "Metode Terbaik", value: "Magang", hint: "Skor 4,5", icon: Sparkles, color: "bg-emerald-500/10 text-emerald-500" },
  { title: "Avg Persepsi", value: "4,0", hint: "Semua metode", icon: BookOpen, color: "bg-purple-500/10 text-purple-500" },
  { title: "Mandiri/Keluarga", value: "58%", hint: "Sumber utama", icon: Wallet, color: "bg-amber-500/10 text-amber-500" },
  { title: "Beasiswa", value: "36%", hint: "Pem. + Swasta", icon: GraduationCap, color: "bg-primary/10 text-primary" },
];

type KpiKey = "k9" | "k10" | "k11";

interface Props {
  summary?: SummaryCardItem[];
  emptyKpis?: KpiKey[];
}

const EducationPageContent = ({ summary = DEFAULT_SUMMARY, emptyKpis = [] }: Props) => {
  const { tahunLulus, week } = useGlobalFilters();
  const tahunLabel = tahunLulus === "all" ? "Semua Tahun" : tahunLulus;
  const isEmpty = (k: KpiKey) => emptyKpis.includes(k);
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
          <TabsContent value="k9"><Kpi9CompetencyGapChart isEmpty={isEmpty("k9")} /></TabsContent>
          <TabsContent value="k10"><Kpi10LearningPerceptionChart isEmpty={isEmpty("k10")} /></TabsContent>
          <TabsContent value="k11"><Kpi11FundingSourceChart isEmpty={isEmpty("k11")} /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default EducationPageContent;