import { Briefcase, Clock, Target, Rocket, DollarSign, MapPin } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import GlobalFilters from "@/components/dashboard/GlobalFilters";
import SummaryCards from "@/components/dashboard/SummaryCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Kpi4AbsorptionChart,
  Kpi5WaitingTimeChart,
  Kpi6FieldRelevanceChart,
  Kpi7EntrepreneurshipChart,
  Kpi8IncomeChart,
  Kpi12WorkplaceDistributionChart,
} from "@/components/dashboard/charts/common";

const summary = [
  { title: "Keterserapan", value: "84%", hint: "Lulusan bekerja/usaha", trend: "+3%", trendUp: true, icon: Briefcase, color: "bg-blue-500/10 text-blue-500" },
  { title: "Masa Tunggu", value: "3,1 bln", hint: "Rata-rata", trend: "-0,5", trendUp: true, icon: Clock, color: "bg-amber-500/10 text-amber-500" },
  { title: "Kesesuaian Bidang", value: "79%", hint: "Sangat erat + erat", trend: "+3%", trendUp: true, icon: Target, color: "bg-emerald-500/10 text-emerald-500" },
  { title: "Wirausaha", value: "11%", hint: "Owner/co-founder", trend: "+3%", trendUp: true, icon: Rocket, color: "bg-green-500/10 text-green-500" },
  { title: "Rata-rata Pendapatan", value: "Rp 9,1 jt", hint: "1,5× UMK", trend: "+8%", trendUp: true, icon: DollarSign, color: "bg-primary/10 text-primary" },
  { title: "Instansi Nasional", value: "47%", hint: "Sebaran utama", icon: MapPin, color: "bg-purple-500/10 text-purple-500" },
];

const P2mppEmploymentOutcomePage = () => {
  return (
    <DashboardLayout>
      <GlobalFilters />
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <SummaryCards items={summary} />

        <Tabs defaultValue="k4" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="k4">Tingkat Keterserapan Lulusan</TabsTrigger>
            <TabsTrigger value="k5">Masa Tunggu Kerja Lulusan</TabsTrigger>
            <TabsTrigger value="k6">Kesesuaian Bidang Kerja</TabsTrigger>
            <TabsTrigger value="k7">Lulusan Berwirausaha</TabsTrigger>
            <TabsTrigger value="k8">Pendapatan Lulusan</TabsTrigger>
            <TabsTrigger value="k12">Sebaran Instansi & Lokasi Kerja</TabsTrigger>
          </TabsList>
          <TabsContent value="k4"><Kpi4AbsorptionChart /></TabsContent>
          <TabsContent value="k5"><Kpi5WaitingTimeChart /></TabsContent>
          <TabsContent value="k6"><Kpi6FieldRelevanceChart /></TabsContent>
          <TabsContent value="k7"><Kpi7EntrepreneurshipChart /></TabsContent>
          <TabsContent value="k8"><Kpi8IncomeChart /></TabsContent>
          <TabsContent value="k12"><Kpi12WorkplaceDistributionChart /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default P2mppEmploymentOutcomePage;
