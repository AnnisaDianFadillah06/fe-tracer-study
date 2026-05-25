import { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MOCK_STUDENTS, Student } from "@/lib/mockData";

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
}

const Kpi2CompletionStatusChart = ({
  data = defaultData,
  title = "Status Pengisian Survei per Alumni",
  subtitle = "Total target 1.093 alumni", loading, error }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({
    open: false, title: "", students: [],
  });
  const handleClick = (entry: any) => {
    const sample = MOCK_STUDENTS.slice(0, entry.value);
    setModal({ open: true, title: `Alumni — ${entry.name}`, students: sample });
  };
  return (
  <>
  <KpiCard loading={loading} error={error} title={title} subtitle={subtitle} compareType="completion">
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={3}
            cursor="pointer"
            onClick={handleClick}
            label={(e: any) => `${e.name}: ${e.value}`}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
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