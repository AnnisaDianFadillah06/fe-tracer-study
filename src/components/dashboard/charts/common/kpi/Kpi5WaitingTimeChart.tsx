import { useState, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  LabelList,
  Cell,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import { MethodologyBlock } from "./Methodology";
import { markMax } from "./format";
import { useLamFilter, LamFilterControls, lamSubtitle } from "./useLamFilter";
import { useMasaTungguBar, useMasaTungguDistribusi, useMasaTungguDrillDown, usePolaPencarianKerja, useMasaTungguPrediksi } from "@/hooks/useMasaTunggu";
import { useKpiFormula, findFormulaGroup } from "@/hooks/useKpiFormula";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import DrillDownModal from "@/components/dashboard/DrillDownModal";
import { buildColorMap } from "@/lib/chartColors";

const CONTEXT_COLUMN = { key: "masa_tunggu_bekerja", label: "Masa Tunggu (bln)" };

const Kpi5WaitingTimeChart = () => {
  const lam = useLamFilter("waitingTime");
  // Ambang "cepat" dinamis dari LAM terpilih (indikator employment_time) --
  // dulu selalu 6 bulan hardcode. undefined = biarkan BE pakai default 6.
  const batasCepatBulan = lam.dynamicParam?.value;

  const barHook        = useMasaTungguBar(batasCepatBulan);
  const distribusiHook = useMasaTungguDistribusi();
  const drillHook      = useMasaTungguDrillDown();
  const polaHook       = usePolaPencarianKerja();
  const prediksiHook   = useMasaTungguPrediksi();

  // Label angka bulan yang ditampilkan (fallback 6 kalau belum ada konteks LAM/prodi).
  const batasLabel = batasCepatBulan ?? 6;

  const { tahunLulus } = useGlobalFilters();

  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    rentang?: "cepat" | "0-3" | "3-6" | ">6";
    tahun_lulus?: string;
    batas_cepat_bulan?: number;
  }>({ open: false, title: "" });

  const openModal = (title: string, rentang: "cepat" | "0-3" | "3-6" | ">6", tahun?: string, batasCepat?: number) => {
    setModal({ open: true, title, rentang, tahun_lulus: tahun, batas_cepat_bulan: batasCepat });
    drillHook.fetch({ rentang, tahun_lulus: tahun, page: 1, batas_cepat_bulan: batasCepat });
  };

  const handlePageChange = useCallback((page: number, search?: string) => {
    if (!modal.rentang) return;
    drillHook.fetch({
      rentang: modal.rentang,
      tahun_lulus: modal.tahun_lulus,
      page,
      search,
      batas_cepat_bulan: modal.batas_cepat_bulan,
    });
  }, [modal.rentang, modal.tahun_lulus, modal.batas_cepat_bulan, drillHook]);

  // Aggregate bar data: per-prodi/tahun → per tahun (sum count, hitung pct)
  const comboData = useMemo(() => {
    if (!barHook.data?.data) return [];
    const byTahun = new Map<string, { total: number; totalCepat: number }>();
    barHook.data.data.forEach((d) => {
      const cur = byTahun.get(d.tahun_lulus) ?? { total: 0, totalCepat: 0 };
      byTahun.set(d.tahun_lulus, {
        total:      cur.total      + d.count_alumni,
        totalCepat: cur.totalCepat + d.count_masa_tunggu_cepat,
      });
    });
    return [...byTahun.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, v]) => ({
        year,
        pct:   v.total > 0 ? Math.round((v.totalCepat / v.total) * 100 * 10) / 10 : 0,
        n:     v.totalCepat,
        total: v.total,
      }));
  }, [barHook.data]);

  // FR-025: ringkasan rata-rata & median masa tunggu per prodi (weighted
  // average lintas tahun yang sedang tampil di filter global) — dipakai
  // tabel ringkasan di bawah, terpisah dari comboData (yang mengagregasi
  // per tahun, lintas prodi).
  //
  // Catatan kejujuran statistik untuk kolom median: median TIDAK linear
  // (tidak seperti rata-rata), jadi "rata-rata dari beberapa median per
  // tahun" BUKAN median sebenarnya lintas tahun -- itu butuh data mentah
  // per-alumni yang tidak tersedia lewat measure Cube.js teragregasi ini.
  // Kalau hanya 1 tahun aktif di filter (kasus paling umum), nilainya PAS
  // (median asli tahun tsb). Kalau "semua tahun", kolom ini adalah
  // pendekatan (rata-rata median per tahun, weighted by jumlah alumni) --
  // cukup representatif untuk ranking cepat/lambat antar prodi, tapi bukan
  // definisi median murni.
  const prodiSummary = useMemo(() => {
    if (!barHook.data?.data) return [];
    const byProdi = new Map<string, {
      jenjang: string; jurusan: string;
      totalAlumni: number; totalCepat: number; weightedWaktu: number; weightedMedian: number;
    }>();
    barHook.data.data.forEach((d) => {
      const cur = byProdi.get(d.nama_prodi) ?? { jenjang: d.jenjang, jurusan: d.jurusan, totalAlumni: 0, totalCepat: 0, weightedWaktu: 0, weightedMedian: 0 };
      byProdi.set(d.nama_prodi, {
        jenjang: cur.jenjang,
        jurusan: cur.jurusan,
        totalAlumni:    cur.totalAlumni    + d.count_alumni,
        totalCepat:     cur.totalCepat     + d.count_masa_tunggu_cepat,
        weightedWaktu:  cur.weightedWaktu  + d.avg_masa_tunggu_bekerja * d.count_alumni,
        weightedMedian: cur.weightedMedian + d.median_masa_tunggu_bekerja * d.count_alumni,
      });
    });
    return [...byProdi.entries()]
      .map(([prodi, v]) => ({
        prodi,
        jenjang: v.jenjang,
        jurusan: v.jurusan,
        totalAlumni: v.totalAlumni,
        avgMasaTunggu: v.totalAlumni > 0 ? Math.round((v.weightedWaktu / v.totalAlumni) * 10) / 10 : 0,
        medianMasaTunggu: v.totalAlumni > 0 ? Math.round((v.weightedMedian / v.totalAlumni) * 10) / 10 : 0,
        pctCepat: v.totalAlumni > 0 ? Math.round((v.totalCepat / v.totalAlumni) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => a.avgMasaTunggu - b.avgMasaTunggu);
  }, [barHook.data]);

  // FR-027: gabungkan titik historis + 1 titik prediksi jadi satu seri chart,
  // dengan garis solid untuk historis dan garis putus-putus untuk prediksi.
  // Titik historis terakhir diduplikasi ke kolom "predicted" supaya garis
  // putus-putus tersambung visual dari titik terakhir, bukan melompat.
  const prediksiChartData = useMemo(() => {
    const d = prediksiHook.data;
    if (!d || d.historis.length === 0) return [];
    const rows: { tahun: string; actual: number | null; predicted: number | null }[] =
      d.historis.map((h) => ({ tahun: h.tahun_lulus, actual: h.median, predicted: null }));
    if (d.prediksi && rows.length > 0) {
      rows[rows.length - 1].predicted = rows[rows.length - 1].actual;
      rows.push({ tahun: d.prediksi.tahun_lulus, actual: null, predicted: d.prediksi.median });
    }
    return rows;
  }, [prediksiHook.data]);

  // FR-026: rata-rata bulan sebelum lulus mulai cari kerja — konteks penjelas
  // pola masa tunggu (bukan chart besar berdiri sendiri). Weighted average
  // lintas prodi/tahun yang sedang tampil di filter global.
  const polaPencarian = useMemo(() => {
    const rows = polaHook.data?.data ?? [];
    if (rows.length === 0) return null;
    let totalAlumni = 0, weightedTunggu = 0;
    let totalSebelum = 0, weightedSebelum = 0;
    let totalSesudah = 0, weightedSesudah = 0;
    rows.forEach((r) => {
      totalAlumni    += r.count_alumni;
      weightedTunggu += r.avg_masa_tunggu_bekerja * r.count_alumni;
      totalSebelum    += r.count_mulai_sebelum;
      weightedSebelum += r.avg_bulan_sebelum_lulus * r.count_mulai_sebelum;
      totalSesudah    += r.count_mulai_sesudah;
      weightedSesudah += r.avg_bulan_sesudah_lulus * r.count_mulai_sesudah;
    });
    if (totalAlumni === 0) return null;
    const totalMulai = totalSebelum + totalSesudah;
    return {
      avgMasaTunggu:    Math.round((weightedTunggu / totalAlumni) * 10) / 10,
      avgSebelumLulus:  totalSebelum > 0 ? Math.round((weightedSebelum / totalSebelum) * 10) / 10 : null,
      avgSesudahLulus:  totalSesudah > 0 ? Math.round((weightedSesudah / totalSesudah) * 10) / 10 : null,
      pctMulaiSebelum:  totalMulai > 0 ? Math.round((totalSebelum / totalMulai) * 1000) / 10 : 0,
      pctMulaiSesudah:  totalMulai > 0 ? Math.round((totalSesudah / totalMulai) * 1000) / 10 : 0,
    };
  }, [polaHook.data]);

  // Aggregate distribusi: semua prodi/tahun → total per rentang
  const distData = useMemo(() => {
    if (!distribusiHook.data?.data) return [];
    let t03 = 0, t36 = 0, t6plus = 0;
    distribusiHook.data.data.forEach((d) => {
      t03    += d.count_tunggu_0_3_bulan;
      t36    += d.count_tunggu_3_6_bulan;
      t6plus += d.count_tunggu_lebih_6_bulan;
    });
    const total = t03 + t36 + t6plus || 1;
    const colorMap = buildColorMap(["< 3 bulan", "3-6 bulan", "> 6 bulan"]);
    return [
      { cat: "< 3 bulan", value: Math.round(t03    / total * 100 * 10) / 10, count: t03,    total, rentang: "0-3"  as const, color: colorMap["< 3 bulan"] },
      { cat: "3-6 bulan", value: Math.round(t36    / total * 100 * 10) / 10, count: t36,    total, rentang: "3-6"  as const, color: colorMap["3-6 bulan"] },
      { cat: "> 6 bulan", value: Math.round(t6plus / total * 100 * 10) / 10, count: t6plus, total, rentang: ">6"   as const, color: colorMap["> 6 bulan"] },
    ];
  }, [distribusiHook.data]);

  const latestYear = comboData.length > 0 ? comboData[comboData.length - 1].year : undefined;
  const isAllYear = tahunLulus === "all";
  // Distribusi (useMasaTungguDistribusi) sekarang default ke tahun_lulus
  // terbaru kalau "all" -- subtitle harus konsisten dengan itu.
  const distTahun = isAllYear ? latestYear : tahunLulus;

  const showRefLine = !lam.isDisabled && !!lam.threshold;
  const isLoading   = barHook.loading || distribusiHook.loading;
  const hasError    = barHook.error || distribusiHook.error;

  // "Total Lulusan Bekerja" (denominator masa tunggu) ditentukan oleh status mana
  // saja yang dianggap valid/bekerja — dikonfigurasi di halaman Pemetaan Pertanyaan
  // (digunakan_oleh = masa_tunggu_valid_status). Dirender sebagai catatan dinamis
  // di bawah formula, bukan mengganti struktur formula (angka batas bulan tetap
  // konstanta institusional, bukan hasil pemetaan kode → kategori).
  const validStatusFormula = useKpiFormula("status_pekerjaan", "masa_tunggu_valid_status");
  const validStatusGroup = findFormulaGroup(validStatusFormula.groups, "valid");
  const totalBekerjaNote = validStatusGroup
    ? `"Total Lulusan Bekerja" mencakup status: ${validStatusGroup.options.join(", ")}.`
    : null;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">
        {/* ── Bar: tren % ≤ ambang cepat (dinamis per LAM, default 6 bulan) ── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && comboData.length === 0}
          title={`% Lulusan Mendapat Kerja dalam ≤ ${batasLabel} Bulan`}
          subtitle={lamSubtitle(lam)}
          compareType="waktuTunggu"
          headerExtra={<LamFilterControls lam={lam} />}
          methodology={
            <MethodologyBlock
              description="Mengukur kecepatan lulusan memperoleh pekerjaan pertama setelah lulus."
              formula={<>% ≤ {batasLabel} Bulan = (Jumlah Lulusan dengan Masa Tunggu ≤ {batasLabel} Bulan / Total Lulusan Bekerja) × 100%</>}
              notes={
                <>
                  Masa tunggu dihitung dari bulan kelulusan ke bulan mulai pekerjaan pertama. Ambang{" "}
                  {batasLabel} bulan mengikuti standar LAM yang sedang dipilih (indikator "employment_time")
                  — 6 bulan dipakai sebagai default kalau belum ada LAM/prodi terpilih.
                  {totalBekerjaNote && <> {totalBekerjaNote}</>}
                </>
              }
            />
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={markMax(comboData, "pct")} margin={{ top: 30, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="year" fontSize={13} stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Tahun Kelulusan", position: "insideBottom", offset: -8, fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  domain={[0, 100]} fontSize={13} stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${v}%`}
                  label={{ value: `% Lulusan ≤ ${batasLabel} bln`, angle: -90, position: "insideLeft", fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, _name, p: any) =>
                    [`${v}% (${p.payload.n}/${p.payload.total} lulusan)`, `≤ ${batasLabel} bulan`]
                  }
                />
                {tahunLulus !== "all" && (
                  <ReferenceArea x1={tahunLulus} x2={tahunLulus} fill="hsl(var(--foreground))" fillOpacity={0.06}
                    stroke="hsl(var(--foreground))" strokeOpacity={0.3} strokeDasharray="3 3" />
                )}
                {markMax(comboData, "pct").filter((d) => d.isMax).map((d) => (
                  <ReferenceArea key={`max-${d.year}`} x1={d.year} x2={d.year}
                    fill="hsl(45 95% 55%)" fillOpacity={0.14}
                    stroke="hsl(45 95% 45%)" strokeOpacity={0.55} strokeDasharray="4 2" />
                ))}
                <Bar
                  dataKey="pct" name={`% ≤ ${batasLabel} bln`} radius={[6, 6, 0, 0]} maxBarSize={60}
                  cursor="pointer"
                  onClick={(d: any) => openModal(
                    `Lulusan ≤ ${batasLabel} bln — ${d.year} (${d.pct}% • ${d.n}/${d.total})`, "cepat", d.year, batasCepatBulan
                  )}
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}
                >
                  {markMax(comboData, "pct").map((d) => (
                    <Cell
                      key={d.year}
                      fill={showRefLine && lam.threshold ? (d.pct >= lam.threshold ? C.blue : C.orange) : C.blue}
                    />
                  ))}
                  <LabelList dataKey="pct" position="center" fill="#fff" fontSize={12} fontWeight={600} formatter={(v: number) => `${v}%`} />
                  <LabelList dataKey="isMax" position="top" content={(p: any) =>
                    p.value ? <text x={p.x + p.width / 2} y={p.y - 6} fontSize={11} fontWeight={700} fill="hsl(38 92% 38%)" textAnchor="middle">★ Tertinggi</text> : null
                  } />
                </Bar>
                <Line type="monotone" dataKey="pct" name="Tren" stroke={C.blueDark} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 } as any} />
                {showRefLine && (
                  <ReferenceLine
                    y={lam.threshold} stroke={C.red} strokeDasharray="6 3" strokeWidth={2}
                    label={{ value: `Target ${lam.level === "baik" ? "Baik" : "Unggul"} ≥ ${lam.threshold}%`, fill: C.red, fontSize: 12, fontWeight: 600, position: "insideTopRight" }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>

        {/* ── Bar horizontal: distribusi rentang ── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && distData.length === 0}
          title="Distribusi Kategori Masa Tunggu"
          subtitle={distTahun ? `Tahun kelulusan ${distTahun}${isAllYear ? " (default: terbaru)" : ""} — sumbu X: % lulusan` : "Memuat…"}
          compareType="waktuTunggu"
          methodology={
            <MethodologyBlock
              description="Proporsi lulusan menurut kategori rentang masa tunggu kerja."
              formula={<>% Kategori = (Jumlah Lulusan pada Kategori / Total Lulusan Bekerja) × 100%</>}
              notes={totalBekerjaNote ?? undefined}
            />
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                <XAxis
                  type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={13}
                  label={{ value: "Persentase Lulusan (%)", position: "insideBottom", offset: -8, fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis type="category" dataKey="cat" width={100} fontSize={13} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                <Bar
                  dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={40}
                  cursor="pointer"
                  onClick={(d: any) => openModal(`Masa tunggu ${d.cat} (${d.value}% · ${d.count} alumni)`, d.rentang, distTahun)}
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}
                >
                  {distData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  <LabelList dataKey="value" position="center" fill="#fff" fontSize={12} fontWeight={600} formatter={(v: number) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>
      </div>

      {/* ── FR-026: Konteks pola pencarian kerja (sebelum/sesudah lulus + durasi) ── */}
      {polaPencarian && (
        <div className="glass-card p-4 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Mulai cari kerja sebelum lulus</p>
            <p className="text-lg font-semibold">
              {polaPencarian.pctMulaiSebelum.toFixed(1)}%
              {polaPencarian.avgSebelumLulus != null && (
                <span className="text-sm font-normal text-muted-foreground"> · rata-rata {polaPencarian.avgSebelumLulus.toFixed(1)} bulan sebelum</span>
              )}
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-xs text-muted-foreground">Mulai cari kerja sesudah lulus</p>
            <p className="text-lg font-semibold">
              {polaPencarian.pctMulaiSesudah.toFixed(1)}%
              {polaPencarian.avgSesudahLulus != null && (
                <span className="text-sm font-normal text-muted-foreground"> · rata-rata {polaPencarian.avgSesudahLulus.toFixed(1)} bulan sesudah</span>
              )}
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-xs text-muted-foreground">Rata-rata masa tunggu hingga bekerja</p>
            <p className="text-lg font-semibold">{polaPencarian.avgMasaTunggu.toFixed(1)} bulan</p>
          </div>
          <p className="text-xs text-muted-foreground max-w-md">
            Konteks tambahan untuk membaca pola masa tunggu di atas: kapan alumni mulai mencari kerja
            relatif terhadap kelulusan, dan berapa lama sampai akhirnya bekerja.
          </p>
        </div>
      )}

      {/* ── FR-025: Tabel ringkasan rata-rata masa tunggu per prodi ── */}
      <KpiCard
        loading={isLoading} error={hasError}
        empty={!isLoading && prodiSummary.length === 0}
        title="Ringkasan Masa Tunggu per Program Studi"
        subtitle="Rata-rata & median masa tunggu kerja (bulan) diurutkan tercepat ke terlama."
        methodology={
          <MethodologyBlock
            description="Rata-rata dan median masa tunggu kerja per program studi, dihitung berbobot jumlah alumni lintas tahun kelulusan yang sedang tampil di filter."
            formula={<>Rata-rata (bln) = Σ(avg_masa_tunggu_tahun × jumlah_alumni_tahun) / Σ(jumlah_alumni_tahun)</>}
            notes="Kolom median memakai measure percentile_cont(0.5) langsung dari Cube.js. Saat filter tahun tunggal, nilainya median asli tahun tsb.; saat 'semua tahun' dipilih, nilainya adalah rata-rata berbobot dari median per tahun — pendekatan yang representatif untuk ranking, bukan median murni lintas tahun (median tidak bisa digabung linear seperti rata-rata)."
          />
        }
      >
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="py-2 px-3 font-medium">Program Studi</th>
                <th className="py-2 px-3 font-medium">Jurusan</th>
                <th className="py-2 px-3 font-medium text-right">Total Alumni</th>
                <th className="py-2 px-3 font-medium text-right">Rata-rata (bln)</th>
                <th className="py-2 px-3 font-medium text-right">Median (bln)</th>
                <th className="py-2 px-3 font-medium text-right">% ≤ {batasLabel} bln</th>
              </tr>
            </thead>
            <tbody>
              {prodiSummary.map((r) => (
                <tr key={r.prodi} className="border-b border-border/50 hover:bg-muted/40">
                  <td className="py-2 px-3">{r.prodi}</td>
                  <td className="py-2 px-3 text-muted-foreground">{r.jurusan}</td>
                  <td className="py-2 px-3 text-right">{r.totalAlumni}</td>
                  <td className="py-2 px-3 text-right font-medium">{r.avgMasaTunggu.toFixed(1)}</td>
                  <td className="py-2 px-3 text-right font-medium">{r.medianMasaTunggu.toFixed(1)}</td>
                  <td className="py-2 px-3 text-right">{r.pctCepat.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </KpiCard>

      {/* ── FR-027: Prediksi tren median masa tunggu periode berikutnya ── */}
      <KpiCard
        loading={prediksiHook.loading} error={prediksiHook.error}
        empty={!prediksiHook.loading && prediksiChartData.length === 0}
        emptyMessage="Data historis belum cukup untuk membuat proyeksi (minimal 3 tahun)."
        title="Prediksi Tren Median Masa Tunggu"
        subtitle="Proyeksi periode berikutnya berbasis tren linier data historis (semua prodi, sesuai filter aktif)."
        methodology={
          <MethodologyBlock
            description="Prediksi median masa tunggu kerja untuk tahun kelulusan berikutnya, dihitung dari regresi linier atas median tahun-tahun sebelumnya."
            formula={<>median(tahun) ≈ slope × tahun + intercept</>}
            notes={prediksiHook.data?.metodologi.catatan ?? "Proyeksi berbasis tren linier data historis; bukan jaminan, hanya estimasi arah tren."}
          />
        }
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={prediksiChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="tahun" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={(v) => `${v} bln`} fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, n: string) => [`${v} bulan`, n === "actual" ? "Historis" : "Prediksi"]}
              />
              <Line type="monotone" dataKey="actual" name="Historis" stroke={C.blueDark} strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
              <Line type="monotone" dataKey="predicted" name="Prediksi" stroke={C.orange} strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 4 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </KpiCard>

      {/* ── Drill-down Modal ── */}
      <DrillDownModal
        isOpen={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.title}
        data={drillHook.data}
        loading={drillHook.loading}
        error={drillHook.error}
        contextColumn={CONTEXT_COLUMN}
        onPageChange={handlePageChange}
      />
    </>
  );
};

export default Kpi5WaitingTimeChart;
