import { GraduationCap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TAHUN_LULUS } from "@/lib/mockData";

export const ALL_YEARS = "all";

interface GraduationYearFilterProps {
  /** Nilai tahun terpilih ("all" atau tahun dalam bentuk string). */
  value: string;
  /** Dipanggil saat tahun diganti. */
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Filter tahun kelulusan alumni untuk dashboard.
 *
 * CATATAN: Komponen ini murni UI dan belum terintegrasi dengan backend.
 * Daftar tahun sementara diambil dari `TAHUN_LULUS` (mock data).
 */
const GraduationYearFilter = ({
  value,
  onChange,
  className,
}: GraduationYearFilterProps) => {
  // Urutkan tahun terbaru di atas
  const years = [...TAHUN_LULUS].sort((a, b) => b - a);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-[180px] bg-secondary/50"}>
        <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Tahun Kelulusan" />
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        <SelectItem value={ALL_YEARS}>Semua Tahun</SelectItem>
        {years.map((year) => (
          <SelectItem key={year} value={String(year)}>
            Lulusan {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default GraduationYearFilter;
