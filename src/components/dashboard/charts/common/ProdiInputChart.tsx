import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";

interface ProdiInputChartProps {
  data?: { name: string; count: number; target: number }[];
}

// Extended data with 37 prodis
const defaultData = [
  { name: "D3-Teknik Kimia", count: 92, target: 100 },
  { name: "D3-Teknik Konversi Energi", count: 67, target: 80 },
  { name: "D4-Akuntansi Manajemen", count: 64, target: 70 },
  { name: "D3-Keuangan Perbankan", count: 63, target: 70 },
  { name: "D4-Keuangan Syariah", count: 63, target: 70 },
  { name: "D3-Teknik Telekomunikasi", count: 62, target: 70 },
  { name: "D3-Teknik Mesin", count: 61, target: 70 },
  { name: "D3-Teknik Pendingin", count: 61, target: 70 },
  { name: "D3-Teknik Listrik", count: 60, target: 70 },
  { name: "D3-Teknik Informatika", count: 60, target: 70 },
  { name: "D4-Teknik Informatika", count: 58, target: 70 },
  { name: "D3-Teknik Elektronika", count: 55, target: 70 },
  { name: "D4-Teknik Elektronika", count: 53, target: 70 },
  { name: "D3-Akuntansi", count: 51, target: 60 },
  { name: "D4-Teknik Mesin", count: 49, target: 60 },
  { name: "D3-Administrasi Bisnis", count: 48, target: 60 },
  { name: "D4-Multimedia", count: 47, target: 60 },
  { name: "D3-Teknik Sipil", count: 45, target: 60 },
  { name: "D4-Teknik Sipil", count: 44, target: 60 },
  { name: "D3-Bahasa Inggris", count: 43, target: 55 },
  { name: "D4-Bahasa Inggris", count: 42, target: 55 },
  { name: "D3-Manajemen Pemasaran", count: 41, target: 55 },
  { name: "D4-Logistik Bisnis", count: 40, target: 55 },
  { name: "D3-Teknik Komputer", count: 39, target: 55 },
  { name: "D4-Teknik Komputer", count: 38, target: 55 },
  { name: "D3-Teknik Grafika", count: 37, target: 50 },
  { name: "D4-Desain Grafis", count: 36, target: 50 },
  { name: "D3-Perhotelan", count: 35, target: 50 },
  { name: "D4-Pariwisata", count: 34, target: 50 },
  { name: "D3-Animasi", count: 33, target: 50 },
  { name: "D4-Animasi", count: 32, target: 50 },
  { name: "S2-Magister Manajemen", count: 28, target: 40 },
  { name: "S2-Teknik Elektro", count: 25, target: 40 },
  { name: "S2-Teknik Mesin", count: 22, target: 35 },
  { name: "S2-Teknik Informatika", count: 20, target: 35 },
  { name: "S2-Administrasi Bisnis", count: 18, target: 30 },
  { name: "S2-Teknik Sipil", count: 15, target: 30 },
];

// Transform data to stacked format (Sudah Mengisi / Belum Mengisi)
const transformToStackedData = (data: typeof defaultData) => {
  return data.map(item => {
    const sudah = item.count;
    const belum = item.target - item.count;
    const persenSudah = ((sudah / item.target) * 100);
    const persenBelum = ((belum / item.target) * 100);
    return {
      name: item.name,
      sudah,
      belum: Math.max(0, belum),
      persenSudah,
      persenBelum: Math.max(0, persenBelum),
      target: item.target,
    };
  });
};

const ChartContent = ({ 
  data, 
  height, 
  onBarClick 
}: { 
  data: ReturnType<typeof transformToStackedData>; 
  height: number; 
  onBarClick: (name: string) => void;
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart
      data={data}
      layout="vertical"
      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" horizontal={false} />
      <XAxis 
        type="number" 
        stroke="hsl(215 20% 55%)" 
        fontSize={12}
        domain={[0, 100]}
        tickFormatter={(v) => `${v}%`}
      />
      <YAxis
        dataKey="name"
        type="category"
        width={180}
        stroke="hsl(215 20% 55%)"
        fontSize={11}
        tickLine={false}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: "hsl(222 47% 11%)",
          border: "1px solid hsl(217 33% 22%)",
          borderRadius: "8px",
        }}
        content={({ active, payload }) => {
          if (!active || !payload || !payload.length) return null;
          const item = payload[0]?.payload;
          if (!item) return null;
          return (
            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
              <p className="font-semibold text-sm mb-2">{item.name}</p>
              <p className="text-xs text-emerald-400 mb-1">
                Sudah Mengisi: {item.persenSudah.toFixed(0)}% ({item.sudah} alumni)
              </p>
              <p className="text-xs text-muted-foreground mb-1">
                Belum Mengisi: {item.persenBelum.toFixed(0)}% ({item.belum} alumni)
              </p>
              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                Total: {item.target} alumni
              </p>
            </div>
          );
        }}
      />
      <Legend 
        wrapperStyle={{ paddingTop: "10px" }}
        formatter={(value) => {
          const label = value === "persenSudah" ? "Sudah Mengisi" : "Belum Mengisi";
          return <span className="text-sm text-foreground">{label}</span>;
        }}
      />
      <Bar 
        dataKey="persenSudah"
        name="persenSudah"
        stackId="a"
        fill="#10b981"
        radius={[0, 0, 0, 0]}
        onClick={(data) => onBarClick(data.name)}
        style={{ cursor: "pointer" }}
      />
      <Bar 
        dataKey="persenBelum"
        name="persenBelum"
        stackId="a"
        fill="hsl(215 20% 35%)"
        radius={[0, 4, 4, 0]}
        onClick={(data) => onBarClick(data.name)}
        style={{ cursor: "pointer" }}
      />
    </BarChart>
  </ResponsiveContainer>
);

const ProdiInputChart = ({ data = defaultData }: ProdiInputChartProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const stackedData = transformToStackedData(data);

  const handleBarClick = (name: string) => {
    // Extract prodi name without jenjang prefix
    const prodiName = name.replace(/^(D3|D4|S2)-/, "");
    navigate(`/dashboard/responden?prodi=${encodeURIComponent(prodiName)}`);
  };

  // Calculate chart height based on number of items
  const chartHeight = Math.max(400, stackedData.length * 35);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="chart-container"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold">Input Alumni per Prodi</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">Realtime</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setIsExpanded(true)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-4 h-3 rounded bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Sudah Mengisi</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-3 rounded" style={{ backgroundColor: "hsl(215 20% 35%)" }} />
            <span className="text-xs text-muted-foreground">Belum Mengisi</span>
          </div>
        </div>
        
        {/* Scrollable container */}
        <div className="overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <ChartContent data={stackedData} height={chartHeight} onBarClick={handleBarClick} />
        </div>
        
        <p className="text-xs text-center text-muted-foreground mt-2">
          Klik bar untuk melihat detail responden prodi
        </p>
      </motion.div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {isExpanded && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-xl w-[95vw] h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-heading font-semibold text-lg">Input Alumni per Prodi - Detail</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4 overflow-y-auto h-[calc(90vh-80px)]">
                <ChartContent data={stackedData} height={chartHeight} onBarClick={handleBarClick} />
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
};

export default ProdiInputChart;
