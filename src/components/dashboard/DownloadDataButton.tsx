import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MOCK_STUDENTS, TAHUN_LULUS, Student } from "@/lib/mockData";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

function downloadCSV(students: Student[], year: number | "all") {
  const cols: { key: keyof Student; label: string }[] = [
    { key: "nama", label: "Nama" },
    { key: "nim", label: "NIM" },
    { key: "prodi", label: "Program Studi" },
    { key: "jenjang", label: "Jenjang" },
    { key: "tahunLulus", label: "Tahun Lulus" },
    { key: "status", label: "Status" },
    { key: "kesesuaianBidang", label: "Kesesuaian Bidang" },
    { key: "waktuTunggu", label: "Waktu Tunggu (bln)" },
    { key: "gaji", label: "Gaji" },
  ];
  const headers = cols.map((c) => c.label).join(",");
  const rows = students
    .map((s) =>
      cols
        .map((c) => {
          const v = s[c.key];
          if (c.key === "gaji") return formatCurrency(v as number);
          return String(v ?? "").replace(/,/g, " ");
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tracer-study-${year === "all" ? "semua-tahun" : year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const DownloadDataButton = () => {
  const { isApplying } = useGlobalFilters();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<string>("all");

  const handleDownload = () => {
    const filtered = year === "all"
      ? MOCK_STUDENTS
      : MOCK_STUDENTS.filter((s) => s.tahunLulus === Number(year));
    downloadCSV(filtered, year === "all" ? "all" : Number(year));
    setOpen(false);
  };

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              disabled={isApplying}
              aria-label="Unduh data alumni"
            >
              <Download className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Unduh Data</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unduh Data Alumni</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Pilih tahun lulus yang ingin diunduh (format CSV).</p>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun</SelectItem>
                {TAHUN_LULUS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleDownload} className="gap-2"><Download className="w-4 h-4" />Unduh CSV</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DownloadDataButton;