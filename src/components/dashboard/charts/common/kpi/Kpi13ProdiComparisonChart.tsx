import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";

const indicators = [
  { key: "keterserapan", label: "Keterserapan" },
  { key: "masaTunggu", label: "Masa Tunggu ≤ 6 bln" },
  { key: "kesesuaian", label: "Kesesuaian Bidang" },
  { key: "wirausaha", label: "Wirausaha" },
] as const;

type IndicatorKey = (typeof indicators)[number]["key"];
type ProdiRow = { prodi: string; value: number; threshold: number; lembaga: string };

const defaultData: Record<IndicatorKey, ProdiRow[]> = {
  keterserapan: [
    { prodi: "T. Elektro", value: 86, threshold: 80, lembaga: "LAM Teknik" },
    { prodi: "T. Mesin", value: 78, threshold: 80, lembaga: "LAM Teknik" },
    { prodi: "T. Sipil", value: 82, threshold: 80, lembaga: "LAM Teknik" },
    { prodi: "T. Kimia", value: 88, threshold: 80, lembaga: "LAM Teknik" },
    { prodi: "T. Informatika", value: 91, threshold: 80, lembaga: "LAM Infokom" },
    { prodi: "Akuntansi", value: 74, threshold: 80, lembaga: "BAN-PT" },
    { prodi: "Adm. Niaga", value: 79, threshold: 80, lembaga: "BAN-PT" },
  ],
  masaTunggu: [
    { prodi: "T. Elektro", value: 76, threshold: 70, lembaga: "LAM Teknik" },
    { prodi: "T. Mesin", value: 68, threshold: 70, lembaga: "LAM Teknik" },
    { prodi: "T. Sipil", value: 72, threshold: 70, lembaga: "LAM Teknik" },
    { prodi: "T. Kimia", value: 80, threshold: 70, lembaga: "LAM Teknik" },
    { prodi: "T. Informatika", value: 88, threshold: 70, lembaga: "LAM Infokom" },
    { prodi: "Akuntansi", value: 64, threshold: 70, lembaga: "BAN-PT" },
    { prodi: "Adm. Niaga", value: 71, threshold: 70, lembaga: "BAN-PT" },
  ],
  kesesuaian: [
    { prodi: "T. Elektro", value: 82, threshold: 80, lembaga: "LAM Teknik" },
    { prodi: "T. Mesin", value: 76, threshold: 80, lembaga: "LAM Teknik" },
    { prodi: "T. Sipil", value: 81, threshold: 80, lembaga: "LAM Teknik" },
    { prodi: "T. Kimia", value: 84, threshold: 80, lembaga: "LAM Teknik" },
    { prodi: "T. Informatika", value: 86, threshold: 80, lembaga: "LAM Infokom" },
    { prodi: "Akuntansi", value: 70, threshold: 80, lembaga: "BAN-PT" },
    { prodi: "Adm. Niaga", value: 73, threshold: 80, lembaga: "BAN-PT" },
  ],
  wirausaha: [
    { prodi: "T. Elektro", value: 6, threshold: 5, lembaga: "LAM Teknik" },
    { prodi: "T. Mesin", value: 8, threshold: 5, lembaga: "LAM Teknik" },
    { prodi: "T. Sipil", value: 4, threshold: 5, lembaga: "LAM Teknik" },
    { prodi: "T. Kimia", value: 7, threshold: 5, lembaga: "LAM Teknik" },
    { prodi: "T. Informatika", value: 12, threshold: 5, lembaga: "LAM Infokom" },
    { prodi: "Akuntansi", value: 3, threshold: 5, lembaga: "BAN-PT" },
    { prodi: "Adm. Niaga", value: 9, threshold: 5, lembaga: "BAN-PT" },
  ],
};

interface Props {
  data?: Record<IndicatorKey, ProdiRow[]>;
}

const Kpi13ProdiComparisonChart = ({ data = defaultData }: Props) => {
  const [selected, setSelected] = useState<IndicatorKey>("keterserapan");
  const rows = data[selected];
  return (
    <KpiCard
      title="Perbandingan KPI Lintas Program Studi"
      subtitle="Threshold dinamis per lembaga akreditasi (LAM Teknik / LAM Infokom / BAN-PT)"
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {indicators.map((ind) => (
          <button
            key={ind.key}
            onClick={() => setSelected(ind.key)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
              selected === ind.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            {ind.label}
          </button>
        ))}
      </div>
      <div style={{ height: rows.length * 44 + 60 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} layout="vertical" margin={{ top: 10, right: 60, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={11} />
            <YAxis type="category" dataKey="prodi" width={120} fontSize={11} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, _n, p: any) => [`${v}% (target ${p.payload.threshold}% — ${p.payload.lembaga})`, "Capaian"]}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
              {rows.map((d, i) => (
                <Cell key={i} fill={d.value >= d.threshold ? C.blue : C.orange} />
              ))}
              <LabelList dataKey="value" position="right" fontSize={11} formatter={(v: number) => `${v}%`} />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: C.blue }} /> Memenuhi threshold</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: C.orange }} /> Belum memenuhi</span>
        <span className="flex items-center gap-1.5">
          <div className="w-4 h-0.5" style={{ background: C.red, borderTop: `2px dashed ${C.red}` }} />
          Threshold LAM/BAN-PT (per prodi)
        </span>
      </div>
    </KpiCard>
  );
};

export default Kpi13ProdiComparisonChart;