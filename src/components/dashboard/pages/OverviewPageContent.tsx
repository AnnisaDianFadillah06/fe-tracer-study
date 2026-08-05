import { useMemo } from "react";
import {
  ClipboardList,
  MailCheck,
  Users,
  Clock,
  AlertTriangle,
  ListChecks,
  LineChart as LineChartIcon,
  Activity,
  PencilLine,
  GraduationCap,
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
import { useResponseRatePie, type ResponseRatePieResponse } from "@/hooks/useResponseRate";
import { useRingkasanTahun } from "@/hooks/useRingkasanTahun";
import { useRole } from "@/contexts/RoleContext";

const FALLBACK_SUMMARY: SummaryCardItem[] = [
  { title: "Total Kuesioner", value: "—", hint: "Terbit", icon: ClipboardList, color: "bg-primary/10 text-primary" },
  { title: "Total Alumni", value: "—", hint: "Sasaran", icon: GraduationCap, color: "bg-violet-500/10 text-violet-500" },
  { title: "Sudah Mengisi", value: "—", hint: "Response masuk", icon: MailCheck, color: "bg-blue-500/10 text-blue-500" },
  { title: "Sedang Mengisi", value: "—", hint: "Draf berjalan", icon: PencilLine, color: "bg-amber-500/10 text-amber-500" },
  { title: "Belum Mengisi", value: "—", hint: "Belum mulai", icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
  { title: "Response Rate", value: "—", hint: "Tingkat respons", icon: Users, color: "bg-emerald-500/10 text-emerald-500" },
];

function formatNumber(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

/** Ambil satu irisan donat berdasarkan kunci statusnya. */
function sliceValue(
  pie: ResponseRatePieResponse | null,
  status: "submitted" | "ongoing" | "started",
  fallbackName: string,
): number | null {
  const item = pie?.data?.find((d) => d.status === status || d.name === fallbackName);
  return item ? item.value : null;
}

/**
 * Kartu ringkasan Overview.
 *
 * Dua hal yang diluruskan di sini:
 *
 * 1. Kartu "Total Kuesioner" dulu menampilkan 505, padahal itu jumlah ALUMNI,
 *    bukan jumlah kuesioner. Kini dipisah menjadi dua kartu: jumlah kuesioner
 *    terbit (angka yang sama dengan halaman Manajemen Kuisioner) dan jumlah
 *    alumni sasaran.
 *
 * 2. "Sedang Mengisi" tidak ada pada endpoint ringkasan, yang hanya mengenal
 *    dua keadaan: sudah dan belum mengirim. Akibatnya kartu "Belum Mengisi"
 *    dulu bernilai 360 (359 belum mulai + 1 draf berjalan) sementara irisan
 *    donat berlabel sama bernilai 359 — dua angka berbeda dengan label identik
 *    pada satu layar. Ketiganya kini memakai pembagian yang sama dengan donat
 *    sehingga jumlahnya pas dengan total alumni.
 *
 * Bila sumber pendukung belum termuat, kartu kembali memakai angka ringkasan
 * atau menampilkan tanda pisah agar tidak ada kolom kosong.
 */
function buildOverviewCards(
  cards: OverviewSummaryCards,
  pie: ResponseRatePieResponse | null,
  totalKuesioner: number | null,
): SummaryCardItem[] {
  const rr = cards.response_rate;
  const trendLabel = rr.trend_pp != null && rr.trend_pp !== 0 ? `${rr.trend_pp > 0 ? "+" : ""}${rr.trend_pp}pp` : undefined;

  const sedang = sliceValue(pie, "ongoing", "Sedang Mengisi");
  const belumMulai = sliceValue(pie, "started", "Belum Mengisi");

  return [
    { title: "Total Kuesioner", value: totalKuesioner != null ? formatNumber(totalKuesioner) : "—", hint: "Terbit", icon: ClipboardList, color: "bg-primary/10 text-primary" },
    { title: "Total Alumni", value: formatNumber(cards.total_kuesioner.value), hint: "Sasaran", icon: GraduationCap, color: "bg-violet-500/10 text-violet-500" },
    { title: "Sudah Mengisi", value: formatNumber(cards.sudah_mengisi.value), hint: cards.sudah_mengisi.hint, icon: MailCheck, color: "bg-blue-500/10 text-blue-500" },
    { title: "Sedang Mengisi", value: sedang != null ? formatNumber(sedang) : "—", hint: "Draf berjalan", icon: PencilLine, color: "bg-amber-500/10 text-amber-500" },
    { title: "Belum Mengisi", value: formatNumber(belumMulai ?? cards.belum_mengisi.value), hint: belumMulai != null ? "Belum mulai" : cards.belum_mengisi.hint, icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
    { title: "Response Rate", value: `${formatNumber(rr.value)}%`, hint: rr.hint, icon: Users, color: "bg-emerald-500/10 text-emerald-500", ...(trendLabel ? { trend: trendLabel, trendUp: rr.trend_direction === "up" } : {}) },
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
  // Donat status pengisian sudah dimuat halaman ini untuk KPI 2; memanggil
  // kaitnya di sini tidak menambah permintaan jaringan karena kunci kuerinya
  // sama persis dan hasilnya dibagi oleh TanStack Query.
  const { data: pie } = useResponseRatePie();

  // Jumlah kuesioner diambil dari ringkasan per tahun lulusan — sumber yang
  // sama dengan halaman Manajemen Kuisioner, sehingga kedua layar tidak
  // menampilkan angka berbeda. Cakupannya sudah dibatasi server sesuai
  // jabatan, dan tiap kuesioner hanya menyasar satu tahun lulusan sehingga
  // penjumlahan lintas tahun tidak menghitung ganda.
  const { years: ringkasanTahun } = useRingkasanTahun();
  const totalKuesioner = useMemo(() => {
    if (ringkasanTahun.length === 0) return null;
    if (tahunLulus === "all") {
      return ringkasanTahun.reduce((a, r) => a + r.kuesioner, 0);
    }
    return ringkasanTahun.find((r) => String(r.tahun) === String(tahunLulus))?.kuesioner ?? 0;
  }, [ringkasanTahun, tahunLulus]);

  const isKaprodi = currentRole === "kaprodi";
  const summary = cards ? buildOverviewCards(cards, pie, totalKuesioner) : FALLBACK_SUMMARY;
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
