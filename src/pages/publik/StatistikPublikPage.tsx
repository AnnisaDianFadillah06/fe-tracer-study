import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PublicPageShell from "@/components/publik/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CheckCircle2, Circle, Clock, Loader2 } from "lucide-react";

/**
 * Halaman "Statistik" untuk masyarakat umum: progress pengisian tracer study
 * per program studi.
 *
 * Angkanya dihitung backend dari data langsung (bukan dokumen yang diunggah),
 * dan hanya untuk angkatan di dalam rentang pengarsipan yang diatur Ketua
 * Tracer -- tahun di luar rentang ditolak server, jadi tidak bisa dilewati
 * dengan mengetik tahun lain di URL.
 */

interface ProgressItem {
  prodi: string;
  nama_prodi: string;
  jenjang: string;
  finish: number;
  ongoing: number;
  belum: number;
  jumlah: number;
  persentase: number;
}

interface ProgressPayload {
  graduation_year: number;
  items: ProgressItem[];
  summary: { finish: number; ongoing: number; belum: number; jumlah: number };
}

/**
 * Tiga status pengisian adalah KEADAAN berurutan, bukan identitas kategori,
 * jadi warnanya diambil dari palet status (bukan slot kategorikal). Pemisahan
 * warnanya sudah diverifikasi dengan validator palet: ΔE CVD terburuk 11,3
 * (target >= 8) dan ΔE penglihatan normal 27,6 (ambang >= 15), lolos di mode
 * terang maupun gelap.
 *
 * "Sedang mengisi" berada di bawah 3:1 terhadap permukaan terang. Itu memang
 * sifat palet status, dan penawarnya wajib ada: legenda berlabel, ikon per
 * status, dan tabel angka di bawah chart -- sehingga makna tidak pernah
 * dibawa warna sendirian.
 */
const STATUS = {
  finish:  { label: "Selesai",       color: "#0ca30c", icon: CheckCircle2 },
  ongoing: { label: "Sedang Mengisi", color: "#fab219", icon: Clock },
  belum:   { label: "Belum Mengisi",  color: "#d03b3b", icon: Circle },
} as const;

type StatusKey = keyof typeof STATUS;
const STATUS_ORDER: StatusKey[] = ["finish", "ongoing", "belum"];

/** Tinggi per baris prodi pada chart batang horizontal. */
const ROW_HEIGHT = 26;

const StatistikPublikPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [years, setYears] = useState<number[]>([]);
  const [payload, setPayload] = useState<ProgressPayload | null>(null);
  const [isLoadingYears, setLoadingYears] = useState(true);
  const [isLoadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const yearParam = searchParams.get("tahun");
  const selectedYear = yearParam ? Number(yearParam) : null;

  const setSelectedYear = (year: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("tahun", String(year));
    setSearchParams(params, { replace: true });
  };

  // Tahun yang boleh ditampilkan datang dari server (sudah difilter rentang
  // pengarsipan), lalu tahun terbaru dipilih otomatis supaya halaman tidak
  // terbuka dalam keadaan kosong.
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const { data } = await api.get("/public/statistics/years");
        if (data.success) {
          const list: number[] = data.data.years ?? [];
          setYears(list);
          if (list.length > 0 && (selectedYear === null || !list.includes(selectedYear))) {
            setSelectedYear(list[0]);
          }
        }
      } catch {
        setErrorMessage("Gagal memuat daftar angkatan.");
      } finally {
        setLoadingYears(false);
      }
    };
    fetchYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedYear === null) return;

    const fetchProgress = async () => {
      setLoadingData(true);
      setErrorMessage(null);
      try {
        const { data } = await api.get("/public/statistics/progress", {
          params: { graduation_year: selectedYear },
        });
        if (data.success) setPayload(data.data);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        setErrorMessage(
          status === 404
            ? "Data angkatan tersebut tidak ditampilkan untuk publik."
            : "Gagal memuat data statistik.",
        );
        setPayload(null);
      } finally {
        setLoadingData(false);
      }
    };
    fetchProgress();
  }, [selectedYear]);

  const summary = payload?.summary;
  const overallPercent = summary && summary.jumlah > 0
    ? (summary.finish / summary.jumlah) * 100
    : 0;

  const chartHeight = useMemo(
    () => Math.max(320, (payload?.items.length ?? 0) * ROW_HEIGHT + 40),
    [payload],
  );

  return (
    <PublicPageShell
      title="Progress Pengisian Tracer Study"
      description="Perkembangan pengisian kuesioner tracer study per program studi."
      actions={
        years.length > 0 ? (
          <div className="flex items-center gap-2">
            <label htmlFor="tahun-lulusan" className="text-sm text-muted-foreground">
              Lulusan
            </label>
            <Select
              value={selectedYear !== null ? String(selectedYear) : ""}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger id="tahun-lulusan" className="w-[150px]">
                <SelectValue placeholder="Pilih tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>Tahun {y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null
      }
    >
      {isLoadingYears ? (
        <LoadingCard label="Memuat angkatan…" />
      ) : years.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            Belum ada angkatan yang ditampilkan untuk publik.
          </CardContent>
        </Card>
      ) : errorMessage ? (
        <Card>
          <CardContent className="py-20 text-center text-destructive">{errorMessage}</CardContent>
        </Card>
      ) : isLoadingData || !payload ? (
        <LoadingCard label="Memuat data…" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryTile label="Total Alumni" value={summary!.jumlah} />
            <SummaryTile label={STATUS.finish.label} value={summary!.finish} color={STATUS.finish.color} />
            <SummaryTile label={STATUS.ongoing.label} value={summary!.ongoing} color={STATUS.ongoing.color} />
            <SummaryTile
              label="Persentase Selesai"
              value={`${overallPercent.toFixed(2)}%`}
            />
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-base">
                Progress per Program Studi — Lulusan {payload.graduation_year}
              </CardTitle>
              <Legend />
            </CardHeader>
            <CardContent className="pt-4">
              {/* Batang HORIZONTAL, bukan vertikal seperti situs lama: dengan
                  38 program studi, label vertikal harus dimiringkan 45 derajat
                  dan jadi sulit dibaca. Arah horizontal membuat nama prodi
                  terbaca normal dan tinggi chart tumbuh mengikuti jumlah baris. */}
              <div style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={payload.items}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                    barCategoryGap={4}
                  >
                    <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="prodi"
                      width={230}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <Tooltip content={<ProgressTooltip />} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.5 }} />
                    {STATUS_ORDER.map((key, index) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        stackId="progress"
                        fill={STATUS[key].color}
                        // Sudut membulat hanya di ujung tumpukan, supaya batang
                        // tetap terbaca sebagai satu kesatuan.
                        radius={index === STATUS_ORDER.length - 1 ? [0, 4, 4, 0] : undefined}
                        isAnimationActive={false}
                      >
                        {payload.items.map((item) => (
                          // Celah 2px antar segmen: tanpa ini dua warna
                          // bersebelahan menempel dan batasnya kabur.
                          <Cell key={item.prodi} stroke="hsl(var(--card))" strokeWidth={2} />
                        ))}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-base">Rincian Angka</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program Studi</TableHead>
                      <TableHead className="text-right">{STATUS.finish.label}</TableHead>
                      <TableHead className="text-right">{STATUS.ongoing.label}</TableHead>
                      <TableHead className="text-right">{STATUS.belum.label}</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead className="text-right">Persentase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payload.items.map((item) => (
                      <TableRow key={item.prodi}>
                        <TableCell className="font-medium">{item.prodi}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.finish}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.ongoing}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.belum}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.jumlah}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.persentase.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PublicPageShell>
  );
};

const Legend = () => (
  <div className="flex flex-wrap items-center gap-4 pt-1">
    {STATUS_ORDER.map((key) => {
      const { label, color, icon: Icon } = STATUS[key];
      return (
        <span key={key} className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon className="h-3.5 w-3.5" style={{ color }} aria-hidden />
          {label}
        </span>
      );
    })}
  </div>
);

const SummaryTile = ({
  label, value, color,
}: { label: string; value: number | string; color?: string }) => (
  <Card>
    <CardContent className="pt-4 pb-4">
      <div className="flex items-center gap-2">
        {color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </CardContent>
  </Card>
);

interface TooltipPayloadEntry {
  payload: ProgressItem;
}

const ProgressTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-md">
      <p className="mb-2 text-sm font-medium">{item.prodi}</p>
      <div className="space-y-1">
        {STATUS_ORDER.map((key) => (
          <div key={key} className="flex items-center justify-between gap-6 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS[key].color }} aria-hidden />
              {STATUS[key].label}
            </span>
            <span className="tabular-nums">{item[key]}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between gap-6 border-t border-border/60 pt-1 text-sm">
          <span className="text-muted-foreground">Jumlah</span>
          <span className="tabular-nums font-medium">{item.jumlah}</span>
        </div>
        <div className="flex items-center justify-between gap-6 text-sm">
          <span className="text-muted-foreground">Persentase</span>
          <span className="tabular-nums font-medium">{item.persentase.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
};

const LoadingCard = ({ label }: { label: string }) => (
  <Card>
    <CardContent className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      {label}
    </CardContent>
  </Card>
);

export default StatistikPublikPage;
