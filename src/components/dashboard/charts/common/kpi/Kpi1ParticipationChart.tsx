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
import { MOCK_STUDENTS, Student } from "@/lib/mockData";

const defaultData = [
  { prodi: "T. Elektro", responded: 72, notResponded: 28 },
  { prodi: "T. Mesin", responded: 65, notResponded: 35 },
  { prodi: "T. Sipil", responded: 58, notResponded: 42 },
  { prodi: "T. Kimia", responded: 81, notResponded: 19 },
  { prodi: "T. Informatika", responded: 76, notResponded: 24 },
  { prodi: "Akuntansi", responded: 49, notResponded: 51 },
  { prodi: "Adm. Niaga", responded: 55, notResponded: 45 },
];

const InnerLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (width < 28) return null;
  return (
    <text x={x + width / 2} y={y + height / 2} fill="#fff" fontSize={10} fontWeight={600}
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
}

const Kpi1ParticipationChart = ({
  data = defaultData,
  title = "Response Rate per Program Studi",
  subtitle = "Realtime — periode aktif", loading, error }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({
    open: false, title: "", students: [],
  });
  const [sortMode, setSortMode] = useState<"valueDesc" | "valueAsc" | "name">("valueDesc");

  const sortedData = useMemo(() => {
    const arr = [...data];
    if (sortMode === "name") arr.sort((a, b) => a.prodi.localeCompare(b.prodi));
    else if (sortMode === "valueAsc") arr.sort((a, b) => a.responded - b.responded);
    else arr.sort((a, b) => b.responded - a.responded);
    return arr;
  }, [data, sortMode]);

  const openModal = (prodi: string, kind: "responded" | "notResponded") => {
    const students = MOCK_STUDENTS.filter((s) =>
      s.prodi.toLowerCase().includes(prodi.replace("T. ", "Teknik ").toLowerCase())
    );
    setModal({
      open: true,
      title: `${kind === "responded" ? "Alumni Sudah Merespons" : "Alumni Belum Merespons"} — ${prodi}`,
      students,
    });
  };

  return (
  <>
  <KpiCard loading={loading} error={error} title={title} subtitle={subtitle}
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
    <div className="max-h-[520px] overflow-y-auto pr-1">
    <div style={{ height: Math.max(sortedData.length * 44 + 60, 280) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={11} stroke="hsl(var(--muted-foreground))" />
          <YAxis type="category" dataKey="prodi" width={110} fontSize={11} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [`${v}%`, n === "responded" ? "Sudah Merespons" : "Belum Merespons"]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="responded" name="Sudah Merespons" stackId="a" fill={C.blue}
            cursor="pointer" onClick={(d: any) => openModal(d.prodi, "responded")}>
            <LabelList dataKey="responded" content={InnerLabel} />
          </Bar>
          <Bar dataKey="notResponded" name="Belum Merespons" stackId="a" fill={C.gray} radius={[0, 4, 4, 0]}
            cursor="pointer" onClick={(d: any) => openModal(d.prodi, "notResponded")}>
            <LabelList dataKey="notResponded" content={InnerLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
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

export default Kpi1ParticipationChart;