import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import "echarts-gl";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAxisValue, formatMeasure, type CatalogMeasure, type DrillPoint } from "@/lib/olapExplorer";
import { highlightOpacity, type Plan3D } from "@/lib/olap3d";
import { measureDirection, statusRamp } from "@/lib/chartColors";

interface Props {
  plan: Plan3D;
  measure: CatalogMeasure;
  /** Label dimensi sumbu X, kedalaman, dan pemutar (string, bukan fungsi: harus stabil antar-render). */
  xLabel: string;
  zLabel: string;
  frameLabel: string | null;
  height?: number;
  /** Klik batang → titik drill (semua dimensi) dan nilainya. */
  onBarClick?: (point: DrillPoint, value: number) => void;
  /** Akibat klik, untuk petunjuk dan tooltip: "menyaring, merinci, atau melihat alumninya". */
  clickAction?: string;
}

/**
 * Sudut kamera siap pakai. Semuanya proyeksi ortografis: batang di belakang
 * TIDAK mengecil, jadi tingginya bisa dibandingkan dengan jujur -- perspektif
 * membuat batang belakang tampak lebih pendek dari nilainya.
 *  - Atas    = peta panas (warna saja), kedalaman × X terbaca utuh;
 *  - Depan   = batang menurut X, satu baris kedalaman menutupi yang lain;
 *  - Samping = batang menurut kedalaman.
 */
const VIEWS = {
  // beta "Miring" menyesuaikan bentuk kotak (lihat `box.miringBeta`).
  miring: { label: "Miring", alpha: 22, beta: 38 },
  atas: { label: "Atas", alpha: 90, beta: 0 },
  depan: { label: "Depan", alpha: 0, beta: 0 },
  samping: { label: "Samping", alpha: 0, beta: 90 },
} as const;
type View = keyof typeof VIEWS;

/**
 * Jarak minimum antarlabel kategori di layar. Label 3D selalu mendatar,
 * sedangkan sumbu X menurun miring, jadi label yang lebih rapat dari ini
 * bertumpuk seperti anak tangga.
 */
const LABEL_GAP_PX = { x: 90, z: 14 };

/**
 * Tinggi yang benar-benar terlihat = orthographicSize × angka ini (diukur
 * dari layar: echarts-gl tidak memakai orthographicSize apa adanya).
 */
const ORTHO_KE_PANDANG = 1.38;

/** Batas lebar label kategori (karakter); nama lengkap di tooltip. */
const LABEL_CHARS = 13;

/** Jeda antarbingkai saat diputar otomatis. */
const PLAY_INTERVAL_MS = 2500;

/** Label kategori dipotong supaya sumbu tidak saling menimpa; nama lengkap di tooltip. */
const potong = (s: string, n = LABEL_CHARS) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Warna tema dari variabel CSS ("24 95% 50%") ke bentuk yang dimengerti echarts. */
function themeColor(name: string, alpha = 1): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const [h, s, l] = raw.split(/\s+/);
  return h ? `hsla(${h}, ${s}, ${l}, ${alpha})` : `rgba(128, 128, 128, ${alpha})`;
}

/** Warna hex palet Insight (`--viz-1`, `--viz-neg`, ...) dari variabel CSS. */
function vizColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#808080";
}

/**
 * Skala warna batang dari nilai terendah ke tertinggi.
 *  - ukuran berarah  → merah-kuning-hijau (hijau = lebih baik), seperti status dashboard;
 *  - selisih bertanda → merah di bawah 0, biru di atas 0, seperti batang selisih 2D;
 *  - selain itu      → biru netral, seperti seri tunggal grafik 2D.
 * Ujung pucatnya TIDAK memakai alpha: batang transparan terlihat tembus
 * pandang, dan transparansi sudah dipakai sebagai tanda "tidak disorot".
 */
function skalaWarna(measureKey: string, min: number, max: number): string[] {
  const ramp = statusRamp(measureDirection(measureKey));
  if (ramp) return ramp;
  const pucat = (c: string) =>
    echarts.color.modifyHSL(c, undefined, undefined, document.documentElement.classList.contains("dark") ? 0.26 : 0.86);
  const pos = vizColor(min < 0 && max > 0 ? "--viz-pos" : "--viz-1");
  return min < 0 && max > 0 ? [vizColor("--viz-neg"), pucat(pos), pos] : [pucat(pos), pos];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Grafik batang 3D: X = Dimensi-1, kedalaman = Dimensi-2, tinggi = ukuran.
 * Dimensi ketiga (bila ada) jadi pemutar -- satu grafik per nilainya, dengan
 * sumbu tinggi dan skala warna yang dikunci sama untuk semua bingkai.
 *
 * Penangkal kelemahan grafik 3D:
 *  - batang tertutup  → kamera bisa diputar/di-zoom, sudut siap pakai, dan
 *                       sorotan: kursor di atas batang membuat batang lain
 *                       transparan kecuali satu baris X dan kedalamannya;
 *  - perspektif       → proyeksi ortografis, ukuran juga dikodekan ke warna,
 *                       dan garis bantu di dinding belakang;
 *  - nilai tak terbaca → tooltip lengkap, klik membuka operasi OLAP yang sama
 *                       dengan grafik 2D, dan tabel tetap ada di bawahnya.
 */
const Explorer3DChart = ({
  plan,
  measure,
  xLabel,
  zLabel,
  frameLabel,
  height,
  onBarClick,
  clickAction = "melihat daftar alumninya",
}: Props) => {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  // Warna dibaca dari variabel CSS. Berganti tema = class `dark` di <html>
  // berubah; diamati langsung karena ThemeProvider memasang class itu di
  // efeknya sendiri, SESUDAH efek komponen ini berjalan.
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => {
    const mo = new MutationObserver(() => setThemeTick((t) => t + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<View>("miring");
  const [hovered, setHovered] = useState<{ x: number; z: number; index: number; left: number; top: number } | null>(
    null,
  );

  const frame = plan.frames[Math.min(frameIndex, plan.frames.length - 1)];

  // Handler echarts dipasang sekali; nilai terbaru dibaca lewat ref.
  const latest = useRef({ frame, onBarClick, measure });
  latest.current = { frame, onBarClick, measure };

  const clickable = (value: number, point: DrillPoint | null) =>
    point !== null && !(measure.format === "integer" && value <= 0);

  const nx = Math.max(...plan.frames.map((f) => f.xCategories.length));
  const nz = Math.max(...plan.frames.map((f) => f.zCategories.length));
  // Banyak kategori butuh kanvas lebih tinggi, bukan cuma batang lebih tipis.
  const tinggiKanvas = height ?? (nx > 30 ? 640 : nx > 15 ? 580 : 520);

  // Lebar kanvas ikut menentukan zoom: kotak yang panjang dibatasi lebar,
  // bukan tinggi, dan label berselang dihitung dari jarak dalam piksel.
  const [lebarKanvas, setLebarKanvas] = useState(0);

  // Ukuran kotak mengikuti jumlah kategori, supaya 6 tahun tidak
  // direntangkan selebar 38 prodi.
  const box = useMemo(() => {
    const boxWidth = clamp(nx * 9, 130, 260);
    const boxDepth = clamp(nz * 16, 70, 150);
    const boxHeight = 100;
    // X yang panjang dilihat lebih landai, supaya kotaknya terbentang mendatar
    // mengikuti kanvas yang lebar, bukan menurun ke bawah.
    const miringBeta = boxWidth > boxDepth * 2.5 ? 22 : 38;
    // orthographicSize = tinggi pandangan dalam satuan dunia. Ambil yang
    // lebih besar dari dua kebutuhan: tinggi proyeksi kotak, dan lebar
    // proyeksinya dibagi rasio kanvas. Tambahan untuk ruang label sumbu.
    const a = (VIEWS.miring.alpha * Math.PI) / 180;
    const b = (miringBeta * Math.PI) / 180;
    const tinggiProyeksi =
      boxHeight * Math.cos(a) + (boxWidth * Math.sin(b) + boxDepth * Math.cos(b)) * Math.sin(a);
    const lebarProyeksi = boxWidth * Math.cos(b) + boxDepth * Math.sin(b);
    const rasio = lebarKanvas > 0 ? lebarKanvas / tinggiKanvas : 1.6;
    const tinggiPandang = Math.max(tinggiProyeksi + 50, (lebarProyeksi + 50) / rasio);
    const orthographicSize = tinggiPandang / ORTHO_KE_PANDANG;
    // Piksel per satuan dunia, untuk menjarangkan label sumbu.
    const pxPerUnit = tinggiKanvas / tinggiPandang;
    const jarakX = (boxWidth / nx) * Math.cos(b) * pxPerUnit;
    const jarakZ = (boxDepth / nz) * Math.cos(b) * Math.sin(a) * pxPerUnit;
    return { boxWidth, boxDepth, boxHeight, orthographicSize, miringBeta, jarakX, jarakZ };
  }, [nx, nz, lebarKanvas, tinggiKanvas]);

  const sudut = (k: View) => (k === "miring" ? { alpha: VIEWS.miring.alpha, beta: box.miringBeta } : VIEWS[k]);

  const seriesData = (f: typeof frame, hover: typeof hovered) =>
    f.bars.map((b) => ({
      value: [b.x, b.z, b.value],
      itemStyle: { opacity: highlightOpacity(b, hover) },
    }));

  // ── Pasang / bongkar ──────────────────────────────────────
  useEffect(() => {
    if (!el.current) return;
    const instance = echarts.init(el.current, undefined, { renderer: "canvas" });
    chart.current = instance;

    instance.on("mouseover", (p: { dataIndex?: number; event?: { offsetX: number; offsetY: number } }) => {
      const bar = p.dataIndex === undefined ? undefined : latest.current.frame.bars[p.dataIndex];
      if (bar) {
        setHovered({ x: bar.x, z: bar.z, index: p.dataIndex!, left: p.event?.offsetX ?? 0, top: p.event?.offsetY ?? 0 });
      }
    });
    instance.on("mouseout", () => setHovered(null));
    instance.on("globalout", () => setHovered(null));
    instance.on("click", (p: { dataIndex?: number }) => {
      const { frame: f, onBarClick: click, measure: m } = latest.current;
      const bar = p.dataIndex === undefined ? undefined : f.bars[p.dataIndex];
      if (!bar || !click || bar.point === null) return;
      if (m.format === "integer" && bar.value <= 0) return;
      // echarts-gl memicu klik saat mouseup; event `click` bawaan peramban
      // menyusul sesudahnya dan akan jatuh ke tombol popup yang baru muncul
      // di bawah kursor ("Lihat daftar alumni"). Tunda sampai event itu lewat.
      const point = bar.point;
      setTimeout(() => click(point, bar.value), 0);
    });

    const ro = new ResizeObserver((entries) => {
      instance.resize();
      // Dibulatkan supaya geseran kecil tidak menyusun ulang opsi (dan kamera).
      setLebarKanvas(Math.round(entries[0].contentRect.width / 50) * 50);
    });
    ro.observe(el.current);

    return () => {
      ro.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  // ── Opsi lengkap: saat rencana, ukuran, atau tema berganti ─
  // Bingkai yang tampil dibaca dari ref: ganti bingkai hanya mengganti data
  // (efek di bawah), supaya kamera yang sudah diputar pengguna tidak kembali.
  useEffect(() => {
    const instance = chart.current;
    if (!instance) return;

    const teks = themeColor("--foreground");
    const redup = themeColor("--muted-foreground");
    const garis = themeColor("--border");
    const v = sudut(view);
    const frame = latest.current.frame;

    // Banyak kategori (38 prodi): label ditampilkan berselang sampai jaraknya
    // di layar cukup; nama lengkap tiap batang ada di tooltip.
    const selang = (jarakPx: number, minPx: number) => Math.max(0, Math.ceil(minPx / Math.max(jarakPx, 1)) - 1);

    const sumbu = (name: string, interval = 0, nameGap = 28) => ({
      name: potong(name, 24),
      nameTextStyle: { color: redup, fontSize: 11 },
      nameGap,
      axisLabel: { color: teks, fontSize: 10, interval },
      axisLine: { lineStyle: { color: garis } },
      axisTick: { lineStyle: { color: garis } },
      splitLine: { lineStyle: { color: garis, opacity: 0.6 } },
      axisPointer: { lineStyle: { color: redup } },
    });

    instance.setOption(
      {
        // Tooltip digambar sendiri (lihat `hovered` di JSX): tooltip echarts
        // ditutup setiap kali data diganti untuk sorotan.
        tooltip: { show: false },
        // Ukuran dikodekan dua kali -- tinggi DAN warna. Bila tinggi sulit
        // dibandingkan dari suatu sudut, warnanya tetap terbaca.
        visualMap: {
          show: true,
          dimension: 2,
          min: plan.min,
          max: plan.max === plan.min ? plan.min + 1 : plan.max,
          calculable: false,
          orient: "horizontal",
          left: 0,
          top: 0,
          itemWidth: 12,
          itemHeight: 140,
          text: [formatAxisValue(plan.max), formatAxisValue(plan.min)],
          textStyle: { color: redup, fontSize: 11 },
          inRange: { color: skalaWarna(measure.key, plan.min, plan.max) },
        },
        xAxis3D: {
          type: "category",
          data: frame.xCategories.map((c) => potong(c)),
          // Nama sumbu diberi jarak lebih: label kategori di atasnya menurun.
          ...sumbu(xLabel, selang(box.jarakX, LABEL_GAP_PX.x), 48),
        },
        yAxis3D: {
          type: "category",
          data: frame.zCategories.map((c) => potong(c)),
          ...sumbu(zLabel, selang(box.jarakZ, LABEL_GAP_PX.z), 40),
        },
        zAxis3D: {
          type: "value",
          // Dikunci lintas bingkai, sama seperti skala warnanya.
          min: Math.min(0, plan.min),
          max: plan.max,
          ...sumbu(measure.label),
          axisLabel: {
            color: teks,
            fontSize: 10,
            // Angka 0 berada tepat di pojok tempat label X pertama; disembunyikan
            // supaya keduanya tidak bertabrakan.
            formatter: (val: number) => (val === 0 ? "" : formatAxisValue(val)),
          },
        },
        grid3D: {
          boxWidth: box.boxWidth,
          boxDepth: box.boxDepth,
          boxHeight: box.boxHeight,
          top: 24,
          axisPointer: { show: false },
          splitArea: { show: false },
          light: {
            main: { intensity: 1.15, shadow: false, alpha: 40, beta: 30 },
            ambient: { intensity: 0.45 },
          },
          viewControl: {
            projection: "orthographic",
            orthographicSize: box.orthographicSize,
            minOrthographicSize: 30,
            maxOrthographicSize: 400,
            alpha: v.alpha,
            beta: v.beta,
            // Titik fokus sedikit di bawah tengah kotak: label sumbu ada di
            // bawah, jadi kotaknya digeser naik supaya label tidak terpotong.
            center: [0, -12, 0],
            animation: true,
            animationDurationUpdate: 700,
            rotateSensitivity: 1,
            zoomSensitivity: 1,
            panSensitivity: 1,
          },
        },
        series: [
          {
            type: "bar3D",
            shading: "lambert",
            data: seriesData(frame, null),
            label: { show: false },
            emphasis: {
              label: {
                show: true,
                formatter: (p: { value: number[] }) => formatAxisValue(p.value[2]),
                color: teks,
                fontSize: 12,
                fontWeight: "bold",
              },
            },
            animationDurationUpdate: 500,
          },
        ],
      },
      // Ganti total: sumbu kategori bingkai lama tidak boleh tertinggal.
      true,
    );
    // `view` dan `frame` sengaja tidak di sini: keduanya punya efek sendiri
    // yang tidak menyusun ulang opsi (dan tidak mengembalikan kamera).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, box, themeTick, measure.key, measure.label, measure.format, xLabel, zLabel, frameLabel]);

  // ── Ganti bingkai: kategori sumbu dan data saja ───────────
  useEffect(() => {
    chart.current?.setOption({
      xAxis3D: { data: frame.xCategories.map((c) => potong(c)) },
      yAxis3D: { data: frame.zCategories.map((c) => potong(c)) },
      series: [{ data: seriesData(frame, null) }],
    });
    setHovered(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);

  // ── Sudut kamera ──────────────────────────────────────────
  useEffect(() => {
    const v = sudut(view);
    chart.current?.setOption({
      grid3D: { viewControl: { alpha: v.alpha, beta: v.beta, orthographicSize: box.orthographicSize } },
    });
    // `sudut` hanya bergantung pada `box`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, box]);

  // ── Sorotan: hanya data seri yang diganti, kamera tidak disentuh ─
  useEffect(() => {
    chart.current?.setOption({ series: [{ data: seriesData(frame, hovered) }] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered]);

  // ── Pemutar bingkai ───────────────────────────────────────
  useEffect(() => {
    if (!playing || plan.frames.length < 2) return;
    const t = setInterval(() => setFrameIndex((i) => (i + 1) % plan.frames.length), PLAY_INTERVAL_MS);
    return () => clearInterval(t);
  }, [playing, plan.frames.length]);

  // Rencana baru (dimensi/saringan berganti) mulai dari bingkai pertama.
  useEffect(() => {
    setFrameIndex(0);
    setPlaying(false);
    setHovered(null);
  }, [plan]);

  const hoveredBar = hovered ? frame.bars[hovered.index] : undefined;

  const adaKlik = onBarClick !== undefined && frame.bars.some((b) => clickable(b.value, b.point));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">Sudut pandang</span>
        {(Object.keys(VIEWS) as View[]).map((k) => (
          <Button
            key={k}
            type="button"
            size="sm"
            variant={view === k ? "default" : "outline"}
            className="h-7 px-2.5 text-xs"
            onClick={() => setView(k)}
          >
            {VIEWS[k].label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          title="Kembalikan kamera"
          onClick={() => {
            setView("miring");
            // Sudut yang sama tidak memicu efek; paksa kamera kembali.
            const v = sudut("miring");
            chart.current?.setOption({
              grid3D: { viewControl: { alpha: v.alpha, beta: v.beta, orthographicSize: box.orthographicSize } },
            });
          }}
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      <div className="relative">
        <div ref={el} style={{ height: tinggiKanvas }} className="w-full" />
        {hoveredBar && (
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border bg-card px-3 py-2 text-xs shadow-md"
            style={{
              left: hovered!.left + 14,
              top: hovered!.top + 14,
              // Dekat tepi kanan: tooltip dibalik ke kiri kursor.
              transform: hovered!.left > (el.current?.clientWidth ?? 0) - 260 ? "translateX(calc(-100% - 28px))" : undefined,
            }}
          >
            <p>
              {xLabel}: <b>{frame.xCategories[hoveredBar.x]}</b>
            </p>
            <p>
              {zLabel}: <b>{frame.zCategories[hoveredBar.z]}</b>
            </p>
            {frameLabel && (
              <p>
                {frameLabel}: <b>{frame.key}</b>
              </p>
            )}
            <p className="mt-1 text-sm">
              {measure.label}: <b className="tabular-nums">{formatMeasure(hoveredBar.value, measure.format)}</b>
            </p>
            {onBarClick && clickable(hoveredBar.value, hoveredBar.point) && (
              <p className="mt-1 text-muted-foreground">Klik untuk {clickAction}</p>
            )}
          </div>
        )}
      </div>

      {plan.frameDim && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            onClick={() => setPlaying((p) => !p)}
            disabled={plan.frames.length < 2}
          >
            {playing ? <Pause className="mr-1 h-3.5 w-3.5" /> : <Play className="mr-1 h-3.5 w-3.5" />}
            {playing ? "Jeda" : "Putar"}
          </Button>
          <span className="text-xs text-muted-foreground">{frameLabel}:</span>
          {plan.frames.map((f, i) => (
            <Button
              key={f.key}
              type="button"
              size="sm"
              variant={i === frameIndex ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => {
                setPlaying(false);
                setFrameIndex(i);
              }}
            >
              {f.key}
            </Button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Seret untuk memutar, gulir untuk memperbesar. Arahkan kursor ke batang untuk menyorot baris dan kolomnya
        {adaKlik ? `; klik batang untuk ${clickAction}` : ""}. Tinggi dan warna sama-sama
        menunjukkan {measure.label.toLowerCase()}
        {frameLabel ? `; skalanya sama untuk semua ${frameLabel.toLowerCase()}` : ""}
        {measureDirection(measure.key) ? " (hijau = lebih baik, merah = kurang baik)" : ""}.
      </p>
    </div>
  );
};

export default Explorer3DChart;
