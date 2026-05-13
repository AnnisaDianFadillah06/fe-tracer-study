import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  KpiSection,
  Kpi1ParticipationChart,
  Kpi2CompletionStatusChart,
  Kpi3ParticipationTrendChart,
  Kpi4AbsorptionChart,
  Kpi5WaitingTimeChart,
  Kpi6FieldRelevanceChart,
  Kpi7EntrepreneurshipChart,
  Kpi8IncomeChart,
  Kpi9CompetencyGapChart,
  Kpi10LearningPerceptionChart,
  Kpi11FundingSourceChart,
  Kpi12WorkplaceDistributionChart,
  Kpi13ProdiComparisonChart,
} from "@/components/dashboard/charts/common";

const KpiOverviewPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-[1400px] mx-auto">
        <header>
          <h1 className="font-heading font-bold text-2xl">Ringkasan KPI Tracer Study</h1>
          <p className="text-sm text-muted-foreground">
            Halaman ini menggabungkan 13 KPI utama dashboard tracer study Polban sesuai
            spesifikasi visualisasi dan psikologi warna (BAN-PT, LAM Teknik, LAM Infokom, IKU PT).
          </p>
        </header>

        <KpiSection no="1" title="Tingkat Partisipasi Alumni (Realtime)" desc="Bar chart — comparing categories. Biru: sudah merespons; Abu-abu: belum.">
          <Kpi1ParticipationChart />
        </KpiSection>

        <KpiSection no="2" title="Status Kelengkapan Pengisian Survei" desc="Pie chart — part-to-whole. Hijau / Oranye / Merah.">
          <Kpi2CompletionStatusChart />
        </KpiSection>

        <KpiSection no="3" title="Partisipasi Alumni Antar Periode" desc="Line chart — showing change over time. Threshold PDDIKTI 30% & LAM/BAN-PT 50%.">
          <Kpi3ParticipationTrendChart />
        </KpiSection>

        <KpiSection no="4" title="Tingkat Keterserapan Lulusan" desc="Combo chart (tren + threshold) + Pie distribusi status.">
          <Kpi4AbsorptionChart />
        </KpiSection>

        <KpiSection no="5" title="Masa Tunggu Kerja Lulusan" desc="Combo chart rata-rata + Bar distribusi kategori (<3, 3-6, >6 bulan).">
          <Kpi5WaitingTimeChart />
        </KpiSection>

        <KpiSection no="6" title="Kesesuaian Bidang Kerja" desc="Combo chart + Pie tingkat kesesuaian + Horizontal bar alasan ketidaksesuaian.">
          <Kpi6FieldRelevanceChart />
        </KpiSection>

        <KpiSection no="7" title="Persentase Lulusan Berwirausaha" desc="Combo chart hijau + Pie distribusi posisi wirausaha.">
          <Kpi7EntrepreneurshipChart />
        </KpiSection>

        <KpiSection no="8" title="Pendapatan Lulusan" desc="Combo chart distribusi pendapatan + tren rata-rata + threshold UMK & 1,5x UMK.">
          <Kpi8IncomeChart />
        </KpiSection>

        <KpiSection no="9" title="Analisis Gap Kompetensi Lulusan" desc="Radar chart (saat lulus vs industri) + Horizontal bar gap per kompetensi.">
          <Kpi9CompetencyGapChart />
        </KpiSection>

        <KpiSection no="10" title="Persepsi Metode Pembelajaran" desc="Radar chart 7 metode pembelajaran (skor Likert 1-5).">
          <Kpi10LearningPerceptionChart />
        </KpiSection>

        <KpiSection no="11" title="Distribusi Sumber Pembiayaan Kuliah" desc="Pie + Grouped bar chart antar periode.">
          <Kpi11FundingSourceChart />
        </KpiSection>

        <KpiSection no="12" title="Sebaran Instansi & Lokasi Kerja" desc="Pie level instansi + Grouped bar antar periode.">
          <Kpi12WorkplaceDistributionChart />
        </KpiSection>

        <KpiSection no="13" title="Perbandingan KPI Lintas Program Studi" desc="Combo chart dengan threshold dinamis per lembaga akreditasi prodi.">
          <Kpi13ProdiComparisonChart />
        </KpiSection>
      </div>
    </DashboardLayout>
  );
};

export default KpiOverviewPage;