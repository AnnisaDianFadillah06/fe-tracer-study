import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
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
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { apiClient } from "@/lib/apiClient";

const DownloadDataButton = () => {
  const { isApplying } = useGlobalFilters();
  const filterOptions = useFilterOptions();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

  const years = filterOptions.tahunLulus ?? [];

  const handleDownload = async () => {
    if (!year) return;
    setDownloading(true);
    try {
      const response = await apiClient.get("/admin/reports/export-alumni", {
        params: { tahun_lulus: year },
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tracer-study-${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      alert("Gagal mengunduh data. Pastikan Anda memiliki akses.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setOpen(true); if (!year && years.length > 0) setYear(years[0]); }}
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
            <p className="text-sm text-muted-foreground">Pilih tahun lulus yang ingin diunduh.</p>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tahun" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleDownload} disabled={!year || downloading} className="gap-2">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? "Mengunduh..." : "Unduh"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DownloadDataButton;
