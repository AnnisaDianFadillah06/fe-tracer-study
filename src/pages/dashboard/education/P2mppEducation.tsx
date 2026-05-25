import { BookOpen, Sparkles, Wallet, GraduationCap, Award, Activity } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import GlobalFilters from "@/components/dashboard/GlobalFilters";
import SummaryCards from "@/components/dashboard/SummaryCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Kpi9CompetencyGapChart,
  Kpi10LearningPerceptionChart,
  Kpi11FundingSourceChart,
} from "@/components/dashboard/charts/common";

const summary = [
  { title: "Skor Kompetensi", value: "4,1", hint: "Rata-rata Likert", icon: Award, color: "bg-blue-500/10 text-blue-500" },
  { title: "Gap Terbesar", value: "B. Inggris", hint: "-1,1 poin", icon: Activity, color: "bg-destructive/10 text-destructive" },
  { title: "Metode Terbaik", value: "Magang", hint: "Skor 4,5", icon: Sparkles, color: "bg-emerald-500/10 text-emerald-500" },
  { title: "Persepsi Pembelajaran", value: "4,0", hint: "Rata-rata semua metode", icon: BookOpen, color: "bg-purple-500/10 text-purple-500" },
  { title: "Mandiri/Keluarga", value: "58%", hint: "Sumber utama biaya", icon: Wallet, color: "bg-amber-500/10 text-amber-500" },
  { title: "Beasiswa", value: "36%", hint: "Pemerintah + Swasta", icon: GraduationCap, color: "bg-primary/10 text-primary" },
];

const P2mppEducationalAssessmentPage = () => {
  return (
    <DashboardLayout>
      <GlobalFilters />
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <SummaryCards items={summary} />

        <Tabs defaultValue="k9" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="k9">Gap Kompetensi Lulusan</TabsTrigger>
            <TabsTrigger value="k10">Persepsi Metode Pembelajaran</TabsTrigger>
            <TabsTrigger value="k11">Sumber Pembiayaan Kuliah</TabsTrigger>
          </TabsList>
          <TabsContent value="k9"><Kpi9CompetencyGapChart /></TabsContent>
          <TabsContent value="k10"><Kpi10LearningPerceptionChart /></TabsContent>
          <TabsContent value="k11"><Kpi11FundingSourceChart /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default P2mppEducationalAssessmentPage;
