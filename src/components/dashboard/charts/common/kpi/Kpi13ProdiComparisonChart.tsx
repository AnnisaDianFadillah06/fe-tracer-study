import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LabelList,
  Legend,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MOCK_STUDENTS, PRODI_LIST, Student } from "@/lib/mockData";
import { MethodologyBlock } from "./Methodology";

/** Master list of 32 prodi names for realistic comparison demo. */
const ALL_PRODI = (() => {
  const base = Array.from(new Set(PRODI_LIST.map((p) => p.name)));
  const extras = [
    "Manajemen Pemasaran","Manajemen Aset","Bahasa Inggris","Bahasa Jepang",
    "Usaha Perjalanan Wisata","Teknik Otomotif","Teknik Aeronautika","Teknik Industri",
    "Teknik Geodesi","Teknik Pertambangan","Teknik Lingkungan","Manajemen Logistik",
    "Sistem Informasi","Multimedia","Robotika","Mekatronika",
    "Teknik Geomatika","Bisnis Digital","Statistika Terapan","Manajemen Energi",
  ];
  return [...base, ...extras];
})();

const indicators = [
  { key: "keterserapan", label: "Keterserapan", thresholdBaik: 70, thresholdUnggul: 85 },
  { key: "masaTunggu", label: "Masa Tunggu ≤ 6 bln", thresholdBaik: 65, thresholdUnggul: 80 },
  { key: "kesesuaian", label: "Kesesuaian Bidang", thresholdBaik: 70, thresholdUnggul: 85 },
  { key: "wirausaha", label: "Wirausaha", thresholdBaik: 5, thresholdUnggul: 10 },
] as const;

type IndicatorKey = (typeof indicators)[number]["key"];
type SortMode = "name" | "valueDesc" | "valueAsc";

/** Deterministic pseudo-random value per (prodi, indicator) so chart is stable */
const seededValue = (seed: string, min: number, max: number) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const r = Math.abs(Math.sin(h)) % 1;
  return Math.round(min + r * (max - min));
};

const computeValue = (prodi: string, ind: IndicatorKey): number => {
  if (ind === "wirausaha") return seededValue(prodi + ind, 2, 14);
  return seededValue(prodi + ind, 45, 95);
};

const Kpi13ProdiComparisonChart = ({ loading, error, isEmpty }: { loading?: boolean; error?: string | null; isEmpty?: boolean }) => {
  const [indicator, setIndicator] = useState<IndicatorKey>("keterserapan");
  const [sortMode, setSortMode] = useState<SortMode>("valueDesc");
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({
    open: false, title: "", students: [],
  });

  const indMeta = indicators.find((i) => i.key === indicator)!;

  const rows = useMemo(() => {
    const base = ALL_PRODI.map((p) => ({
      name: p,
      value: computeValue(p, indicator),
      prodiList: [p],
    }));
    if (sortMode === "name") base.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortMode === "valueAsc") base.sort((a, b) => a.value - b.value);
    else base.sort((a, b) => b.value - a.value);
    return base;
  }, [indicator, sortMode]);

  // Stacked data → value + remainder
  const stackedRows = rows.map((r) => ({
    ...r,
    remainder: Math.max(0, 100 - r.value),
  }));

  const handleClick = (row: any) => {
    const names: string[] = row.prodiList || [];
    const students = MOCK_STUDENTS.filter((s) =>
      names.some((n) => s.prodi.toLowerCase() === n.toLowerCase())
    );
    setModal({
      open: true,
      title: `${indMeta.label} — ${row.name}`,
      students,
    });
  };

  const InnerLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (width < 22) return null;
    return (
      <text x={x + width / 2} y={y + height / 2} fill="#fff" fontSize={13} fontWeight={700}
        textAnchor="middle" dominantBaseline="central">
        {value}%
      </text>
    );
  };

  const headerControls = (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="text-xs text-muted-foreground">Urutkan:</label>
      <select
        value={sortMode}
        onChange={(e) => setSortMode(e.target.value as SortMode)}
        className="text-xs px-2 py-1.5 rounded-md border border-border bg-card"
      >
        <option value="valueDesc">Nilai tertinggi</option>
        <option value="valueAsc">Nilai terendah</option>
        <option value="name">Nama (A-Z)</option>
      </select>
    </div>
  );

  return (
    <>
      <KpiCard
        loading={loading}
        error={error}
        empty={isEmpty}
        title="Perbandingan KPI Lintas Program Studi"
        subtitle="Stacked bar — capaian vs sisa target, threshold Baik & Unggul"
        headerExtra={headerControls}
        methodology={
          <MethodologyBlock
            description="Membandingkan capaian KPI yang dipilih antar program studi."
            formula={<>Capaian Prodi (%) = (Lulusan Memenuhi Indikator pada Prodi / Total Lulusan Prodi) × 100%<br/>Sisa Target (%) = 100% − Capaian Prodi</>}
            notes="Threshold Baik &amp; Unggul mengikuti pedoman LAM/BAN-PT per indikator."
          />
        }
      >
        <div className="flex flex-wrap gap-2 mb-4">
          {indicators.map((ind) => (
            <button
              key={ind.key}
              onClick={() => setIndicator(ind.key)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                indicator === ind.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-muted"
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>
        <div className="max-h-[520px] overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin">
        <div style={{ height: Math.max(stackedRows.length * 28 + 80, 240) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedRows} layout="vertical" margin={{ top: 40, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={11} orientation="top" />
              <YAxis type="category" dataKey="name" width={170} fontSize={11} interval={0} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(v: number, n: string) => [`${v}%`, n === "value" ? "Capaian" : "Sisa target"]} />
              <Legend wrapperStyle={{ fontSize: 12 }}
                payload={[
                  { value: "Capaian", type: "square", color: C.blue },
                  { value: "Sisa target", type: "square", color: C.gray },
                ]} />
              <Bar dataKey="value" stackId="a" name="value" cursor="pointer"
                onClick={(d: any) => handleClick(d)}
                activeBar={{ stroke: "hsl(var(--foreground))", strokeWidth: 2 } as any}>
                {stackedRows.map((d, i) => (
                  <Cell key={i} fill={d.value >= indMeta.thresholdBaik ? C.blue : C.orange} />
                ))}
                <LabelList dataKey="value" content={InnerLabel} />
              </Bar>
              <Bar dataKey="remainder" stackId="a" name="remainder" fill={C.gray} radius={[0, 4, 4, 0]}
                cursor="pointer" onClick={(d: any) => handleClick(d)}
                activeBar={{ stroke: C.grayDark, strokeWidth: 2 } as any}>
                <LabelList dataKey="remainder" content={InnerLabel} />
              </Bar>
              <ReferenceLine x={indMeta.thresholdBaik} stroke={C.green} strokeDasharray="6 3" strokeWidth={2}
                ifOverflow="extendDomain"
                label={{ value: `Baik ${indMeta.thresholdBaik}%`, position: "insideTopLeft", fill: C.green, fontSize: 11, fontWeight: 600, dy: -8 }} />
              <ReferenceLine x={indMeta.thresholdUnggul} stroke={C.purple} strokeDasharray="6 3" strokeWidth={2}
                ifOverflow="extendDomain"
                label={{ value: `Unggul ${indMeta.thresholdUnggul}%`, position: "insideTopRight", fill: C.purple, fontSize: 11, fontWeight: 600, dy: -8 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: C.blue }} />Memenuhi threshold Baik</span>
          <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: C.orange }} />Belum memenuhi</span>
          <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: C.gray }} />Sisa target</span>
        </div>
      </KpiCard>
      <StudentDataModal
        isOpen={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.title}
        students={modal.students}
        columns={[]}
      />
    </>
  );
};

export default Kpi13ProdiComparisonChart;
