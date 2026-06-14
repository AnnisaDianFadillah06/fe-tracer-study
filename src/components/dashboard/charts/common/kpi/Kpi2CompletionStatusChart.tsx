import { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, Sector } from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MethodologyBlock } from "./Methodology";
import { MOCK_STUDENTS, Student } from "@/lib/mockData";
import { formatPctCount, formatNTotal } from "./format";

const defaultData = [
  { name: "Selesai", value: 612, color: C.green },
  { name: "Sedang Mengisi", value: 184, color: C.orange },
  { name: "Belum Mengisi", value: 297, color: C.red },
];

interface Props {
  data?: typeof defaultData;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
}

const Kpi2CompletionStatusChart = ({
  data = defaultData,
  title = "Status Pengisian Survei per Alumni",
  subtitle, loading, error, isEmpty }: Props) => {
  const effective = data && data.length > 0 ? data : defaultData;
  const total = effective.reduce((s, d) => s + d.value, 0);
  const subtitleText = subtitle ?? `Total target ${total.toLocaleString("id-ID")} alumni`;
  const isDataEmpty = isEmpty || (data?.length === 0);
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({
    open: false, title: "", students: [],
  });
  const handleClick = (entry: any) => {
    const sample = MOCK_STUDENTS.slice(0, entry.value);
    setModal({ open: true, title: `Alumni — ${entry.name} • ${formatNTotal(entry.value, total)}`, students: sample });
  };
  const renderActive = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
          startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={13} fontWeight={600}>{payload.name}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>{value} ({Math.round(value/total*100)}%)</text>
      </g>
    );
  };
  const [activeIdx, setActiveIdx] = useState<number | undefined>();
  return (
  <>
  <KpiCard loading={loading} error={error} empty={isDataEmpty} title={title} subtitle={subtitleText} compareType="completion"
    methodology={
      <MethodologyBlock
        description="Status penyelesaian studi lulusan pada periode terpilih."
        formula={<>% Status = (Jumlah Lulusan pada Status / Total Lulusan Periode) × 100%<br/>Tepat Waktu = Lulus ≤ Masa Studi Normal Program</>}
        notes="Masa studi normal: D3 = 3 thn, D4/S1 = 4 thn."
      />
    }>
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={effective}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={3}
            cursor="pointer"
            activeIndex={activeIdx}
            activeShape={renderActive}
            onMouseEnter={(_, i) => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(undefined)}
            onClick={handleClick}
            label={(e: any) => `${e.name}: ${e.value}`}
          >
            {effective.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle}
            formatter={(v: number, n) => [formatPctCount(Math.round(v/total*100), v, total), n]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
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

export default Kpi2CompletionStatusChart;