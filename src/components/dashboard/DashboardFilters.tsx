import { useState } from "react";
import { Filter, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { LAM_THRESHOLDS } from "@/lib/mockData"; // TODO: ganti ke BE saat endpoint tersedia
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFilterOptions } from "@/hooks/useFilterOptions";

interface DashboardFiltersProps {
  selectedProdi: string;
  setSelectedProdi: (value: string) => void;
  selectedTahun: string;
  setSelectedTahun: (value: string) => void;
  selectedJenjang: string;
  setSelectedJenjang: (value: string) => void;
}

const DashboardFilters = ({
  selectedProdi,
  setSelectedProdi,
  selectedTahun,
  setSelectedTahun,
  selectedJenjang,
  setSelectedJenjang,
}: DashboardFiltersProps) => {
  const { prodiList, tahunLulus, jenjang, loading } = useFilterOptions();

  // Deduplicated prodi names for the single-select dropdown
  const uniqueProdiNames = [...new Set(prodiList.map((p) => p.nama_prodi))];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Prodi Filter */}
      <Select value={selectedProdi} onValueChange={setSelectedProdi} disabled={loading}>
        <SelectTrigger className="w-[200px] bg-secondary/50">
          <SelectValue placeholder="Program Studi" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          <SelectItem value="all">Semua Prodi</SelectItem>
          {uniqueProdiNames.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tahun Lulus Filter */}
      <Select value={selectedTahun} onValueChange={setSelectedTahun} disabled={loading}>
        <SelectTrigger className="w-[140px] bg-secondary/50">
          <SelectValue placeholder="Tahun Lulus" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          <SelectItem value="all">Semua Tahun</SelectItem>
          {tahunLulus.map((year) => (
            <SelectItem key={year} value={year}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Jenjang Filter */}
      <Select value={selectedJenjang} onValueChange={setSelectedJenjang} disabled={loading}>
        <SelectTrigger className="w-[100px] bg-secondary/50">
          <SelectValue placeholder="Jenjang" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          <SelectItem value="all">Semua</SelectItem>
          {jenjang.map((j) => (
            <SelectItem key={j} value={j}>
              {j}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* LAM Info — masih pakai mock, TODO: ganti ke BE */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Info className="w-4 h-4" />
            <span className="hidden md:inline">Info LAM</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm bg-card border-border p-4">
          <h4 className="font-semibold mb-2">Threshold LAM Akreditasi</h4>
          <div className="space-y-2 text-sm">
            {Object.entries(LAM_THRESHOLDS).map(([lam, data]) => (
              <div key={lam}>
                <span className="font-medium text-primary">
                  {lam} ({data.threshold}%)
                </span>
                <span className="text-muted-foreground">
                  {" "}= {data.prodi.slice(0, 3).join(", ")}
                  {data.prodi.length > 3 ? "..." : ""}
                </span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

// ─── Multi-select prodi filter for charts ────────────────────────────────────

interface ChartProdiFilterProps {
  selectedProdi: string[];
  onChange: (prodi: string[]) => void;
  showLamInfo?: boolean;
}

export const ChartProdiFilter = ({
  selectedProdi,
  onChange,
  showLamInfo = true,
}: ChartProdiFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { prodiList, loading } = useFilterOptions();

  const uniqueProdiNames = [...new Set(prodiList.map((p) => p.nama_prodi))];

  const toggleProdi = (prodi: string) => {
    if (selectedProdi.includes(prodi)) {
      onChange(selectedProdi.filter((p) => p !== prodi));
    } else {
      onChange([...selectedProdi, prodi]);
    }
  };

  const selectAll = () => onChange(uniqueProdiNames);
  const clearAll = () => onChange([]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-8 text-xs"
          disabled={loading}
        >
          <Filter className="w-3 h-3" />
          {selectedProdi.length === 0 || selectedProdi.length === uniqueProdiNames.length
            ? "Semua Prodi"
            : `${selectedProdi.length} Prodi`}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-card border-border" align="start">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium">Filter Prodi</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={selectAll}
            >
              Semua
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={clearAll}
            >
              Reset
            </Button>
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {uniqueProdiNames.map((prodiName) => (
            <label
              key={prodiName}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 cursor-pointer"
            >
              <Checkbox
                checked={selectedProdi.includes(prodiName)}
                onCheckedChange={() => toggleProdi(prodiName)}
              />
              <span className="text-xs flex-1">{prodiName}</span>
              {/* threshold per-prodi masih dari mock — TODO: ganti ke BE */}
              {showLamInfo && (
                <span className="text-[10px] text-muted-foreground">LAM</span>
              )}
            </label>
          ))}
        </div>
        {showLamInfo && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              Threshold berdasarkan LAM masing-masing prodi
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default DashboardFilters;