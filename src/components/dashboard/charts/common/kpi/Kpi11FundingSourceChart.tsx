import { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MethodologyBlock } from "./Methodology";
import { MOCK_STUDENTS, Student } from "@/lib/mockData";
import { renderActivePieShape, usePieActive } from "./pieUtils";
import { formatPctCount } from "./format";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PieChart as PieIcon, BarChart3 } from "lucide-react";

const defaultPie = [
  { name: "Mandiri/Keluarga", value: 58, color: C.blueLight },
  { name: "Beasiswa Pemerintah", value: 22, color: C.green },
  { name: "Beasiswa Institusi/Swasta", value: 14, color: C.orange },
  { name: "Lainnya", value: 6, color: C.gray },
];
const defaultGrouped = [
  { year: "2022", mandiri: 62, pemerintah: 18, swasta: 12, lain: 8 },
  { year: "2023", mandiri: 60, pemerintah: 20, swasta: 13, lain: 7 },
  { year: "2024", mandiri: 58, pemerintah: 22, swasta: 14, lain: 6 },
];

interface Props {
  pieData?: typeof defaultPie;
  groupedData?: typeof defaultGrouped;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
}

const Kpi11FundingSourceChart = ({ pieData = defaultPie, groupedData = defaultGrouped, loading, error, isEmpty }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  const pieActive = usePieActive();
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);
  const openModal = (title: string, n: number) => setModal({ open: true, title, students: MOCK_STUDENTS.slice(0, Math.max(n, 5)) });
  const [view, setView] = useState<"pie" | "bar">("pie");
  return (
  <>
  <KpiCard
    loading={loading}
    error={error}
    empty={isEmpty}
    title="Distribusi Sumber Pembiayaan Kuliah"
    subtitle={view === "pie" ? "Proporsi sumber pembiayaan — periode terakhir" : "Perubahan distribusi antar periode (grouped bar)"}
    compareType="sumberBiaya"
    headerExtra={
      <ToggleGroup type="single" value={view} size="sm" onValueChange={(v) => v && setView(v as any)} className="bg-muted/40 rounded-md p-0.5">
        <ToggleGroupItem value="pie" aria-label="Tampilkan pie" className="h-7 px-2 text-xs gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          <PieIcon className="w-3.5 h-3.5" /> Pie
        </ToggleGroupItem>
        <ToggleGroupItem value="bar" aria-label="Tampilkan grouped bar" className="h-7 px-2 text-xs gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          <BarChart3 className="w-3.5 h-3.5" /> Antar Periode
        </ToggleGroupItem>
      </ToggleGroup>
    }
    methodology={
      view === "pie" ? (
        <MethodologyBlock
          description="Proporsi sumber pembiayaan studi lulusan pada periode terakhir."
          formula={<>% Sumber = (Jumlah Lulusan dengan Sumber Pembiayaan X / Total Lulusan Periode) × 100%</>}
        />
      ) : (
        <MethodologyBlock
          description="Tren proporsi sumber pembiayaan studi antar tahun kelulusan."
          formula={<>% Sumber per Tahun = (Lulusan dengan Sumber X pada Tahun T / Total Lulusan Tahun T) × 100%</>}
        />
      )
    }
  >
    <div className="grid lg:grid-cols-2 gap-5 items-stretch">
      <div className="min-w-0">
        {view === "pie" ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label={(e: any) => `${e.name}: ${e.value}%`}
                  activeIndex={pieActive.activeIndex} activeShape={renderActivePieShape}
                  onMouseEnter={pieActive.onMouseEnter} onMouseLeave={pieActive.onMouseLeave}
                  cursor="pointer" onClick={(d: any) => openModal(`${d.name} (${d.value}%)`, d.value)}>
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [formatPctCount(v, v, pieTotal), n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="year" fontSize={12} />
                <YAxis tickFormatter={(v) => `${v}%`} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="mandiri" name="Mandiri" fill={C.blueLight} radius={[3, 3, 0, 0]} cursor="pointer"
                  onClick={(d: any) => openModal(`Mandiri — ${d.year} (${d.mandiri}%)`, d.mandiri)}
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}>
                  <LabelList dataKey="mandiri" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
                </Bar>
                <Bar dataKey="pemerintah" name="Pemerintah" fill={C.green} radius={[3, 3, 0, 0]} cursor="pointer"
                  onClick={(d: any) => openModal(`Pemerintah — ${d.year} (${d.pemerintah}%)`, d.pemerintah)}
                  activeBar={{ stroke: C.greenDark, strokeWidth: 2 } as any}>
                  <LabelList dataKey="pemerintah" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
                </Bar>
                <Bar dataKey="swasta" name="Inst./Swasta" fill={C.orange} radius={[3, 3, 0, 0]} cursor="pointer"
                  onClick={(d: any) => openModal(`Inst./Swasta — ${d.year} (${d.swasta}%)`, d.swasta)}
                  activeBar={{ stroke: "hsl(20 90% 45%)", strokeWidth: 2 } as any}>
                  <LabelList dataKey="swasta" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
                </Bar>
                <Bar dataKey="lain" name="Lainnya" fill={C.gray} radius={[3, 3, 0, 0]} cursor="pointer"
                  onClick={(d: any) => openModal(`Lainnya — ${d.year} (${d.lain}%)`, d.lain)}
                  activeBar={{ stroke: C.grayDark, strokeWidth: 2 } as any}>
                  <LabelList dataKey="lain" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <aside className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed flex flex-col gap-3">
        {view === "pie" ? (
          <>
            <h4 className="font-semibold text-foreground">Cara Membaca Pie</h4>
            <p className="text-muted-foreground">
              Pie menunjukkan <strong>proporsi sumber pembiayaan</strong> studi lulusan pada periode terakhir. Setiap potongan = persentase
              lulusan yang menggunakan sumber tersebut.
            </p>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: C.blueLight }} /> <strong>Mandiri / Keluarga</strong></li>
              <li className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: C.green }} /> <strong>Beasiswa Pemerintah</strong></li>
              <li className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: C.orange }} /> <strong>Beasiswa Institusi / Swasta</strong></li>
              <li className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: C.gray }} /> <strong>Lainnya</strong></li>
            </ul>
            <p className="text-xs text-muted-foreground border-t border-border pt-2">
              Klik potongan pie untuk melihat daftar alumni dengan sumber pembiayaan tersebut.
            </p>
          </>
        ) : (
          <>
            <h4 className="font-semibold text-foreground">Cara Membaca Grouped Bar</h4>
            <p className="text-muted-foreground">
              Tiap kelompok bar mewakili <strong>satu tahun kelulusan</strong>. Tinggi bar = persentase lulusan
              dengan sumber pembiayaan tertentu pada tahun tersebut.
            </p>
            <p className="text-xs text-muted-foreground">
              Bandingkan ketinggian bar antar tahun untuk melihat <strong>pergeseran tren</strong>: misalnya kenaikan
              porsi beasiswa atau penurunan porsi mandiri.
            </p>
            <p className="text-xs text-muted-foreground border-t border-border pt-2">
              Klik bar untuk melihat data alumni pada sumber & tahun tersebut.
            </p>
          </>
        )}
      </aside>
    </div>
  </KpiCard>
  <StudentDataModal isOpen={modal.open} onClose={() => setModal((m) => ({ ...m, open: false }))} title={modal.title} students={modal.students} columns={[]} />
  </>
  );
};

export default Kpi11FundingSourceChart;