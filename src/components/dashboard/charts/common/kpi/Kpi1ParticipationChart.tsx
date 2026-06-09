import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
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
import { formatNTotal, formatPctCount } from "./format";

/** Generate 32 mock prodi rows for realistic vertical scroll. */
const generateMockProdi = () => {
  const names = [
    "T. Elektronika","T. Listrik","T. Telekomunikasi","T. Mesin","T. Konversi Energi","T. Pendingin",
    "T. Sipil","T. Kimia","T. Informatika D3","T. Informatika D4","Akuntansi","Akuntansi Manajemen",
    "Adm. Niaga","Keuangan Perbankan","Keuangan Syariah","Manajemen Pemasaran","Manajemen Aset",
    "Bahasa Inggris","Bahasa Jepang","Usaha Perjalanan Wisata","Teknik Otomotif","Teknik Aeronautika",
    "Teknik Industri","Teknik Geodesi","Teknik Pertambangan","Teknik Lingkungan","Manajemen Logistik",
    "Sistem Informasi","Multimedia","Robotika","Mekatronika","Magister Manajemen",
  ];
  return names.map((p, i) => {
    const total = 25 + ((i * 7) % 60);
    const responded = 40 + ((i * 13) % 55);
    return { prodi: p, responded, notResponded: 100 - responded, total };
  });
};
const defaultData = generateMockProdi();

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

interface Props {
  data?: typeof defaultData;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
}

const Kpi1ParticipationChart = ({
  data = defaultData,
  title = "Response Rate per Program Studi",
  subtitle, loading, error, isEmpty }: Props) => {
  const effectiveData = data && data.length > 0 ? data : defaultData;
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({
    open: false, title: "", students: [],
  });
  const [sortMode, setSortMode] = useState<"valueDesc" | "valueAsc" | "name">("valueDesc");

  const sortedData = useMemo(() => {
    const arr = [...effectiveData];
    if (sortMode === "name") arr.sort((a, b) => a.prodi.localeCompare(b.prodi));
    else if (sortMode === "valueAsc") arr.sort((a, b) => a.responded - b.responded);
    else arr.sort((a, b) => b.responded - a.responded);
    return arr;
  }, [effectiveData, sortMode]);

  const isDataEmpty = isEmpty || (data?.length === 0);
  const subtitleText = subtitle ?? `Realtime — ${effectiveData.length} program studi`;

  const openModal = (row: any, kind: "responded" | "notResponded") => {
    const prodi = row.prodi;
    const total = row.total ?? 50;
    const n = Math.round((kind === "responded" ? row.responded : row.notResponded) / 100 * total);
    const students = MOCK_STUDENTS.filter((s) =>
      s.prodi.toLowerCase().includes(prodi.replace("T. ", "Teknik ").toLowerCase())
    ).slice(0, Math.max(n, 5));
    setModal({
      open: true,
      title: `${kind === "responded" ? "Alumni Sudah Merespons" : "Alumni Belum Merespons"} — ${prodi} • ${formatNTotal(n, total)}`,
      students,
    });
  };

  return (
  <>
  <KpiCard loading={loading} error={error} empty={isDataEmpty} title={title} subtitle={subtitleText}
    methodology={
      <MethodologyBlock
        description="Tingkat partisipasi alumni mengisi tracer study per program studi."
        formula={<>Response Rate (%) = (Jumlah Alumni Merespons / Total Alumni Prodi) × 100%</>}
        notes="Dihitung berdasarkan basis data lulusan aktif per program studi pada periode yang dipilih."
      />
    }
    headerExtra={
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground">Urutkan:</label>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)}
          className="text-xs px-2 py-1.5 rounded-md border border-border bg-card">
          <option value="valueDesc">Nilai tertinggi</option>
          <option value="valueAsc">Nilai terendah</option>
          <option value="name">Nama (A-Z)</option>
        </select>
      </div>
    }>
    <div className="max-h-[520px] overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin">
    <div style={{ height: Math.max(sortedData.length * 28 + 60, 280) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }} barCategoryGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={11} stroke="hsl(var(--muted-foreground))" />
          <YAxis type="category" dataKey="prodi" width={140} fontSize={11} interval={0} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={tooltipStyle}
            formatter={(v: number, n, p: any) => {
              const total = p?.payload?.total ?? 0;
              const count = Math.round((v / 100) * total);
              return [formatPctCount(v, count, total), n === "responded" ? "Sudah Merespons" : "Belum Merespons"];
            }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="responded" name="Sudah Merespons" stackId="a" fill={C.blue}
            cursor="pointer" onClick={(d: any) => openModal(d, "responded")}
            activeBar={{ fill: C.blueDark, stroke: C.blueDark, strokeWidth: 2 } as any}>
            <LabelList dataKey="responded" content={InnerLabel} />
          </Bar>
          <Bar dataKey="notResponded" name="Belum Merespons" stackId="a" fill={C.gray} radius={[0, 4, 4, 0]}
            cursor="pointer" onClick={(d: any) => openModal(d, "notResponded")}
            activeBar={{ fill: C.grayDark, stroke: C.grayDark, strokeWidth: 2 } as any}>
            <LabelList dataKey="notResponded" content={InnerLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    </div>
    <p className="text-[11px] text-muted-foreground mt-2 text-center">
      Total {sortedData.length} prodi — gunakan scroll untuk melihat semuanya.
    </p>
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

export default Kpi1ParticipationChart;