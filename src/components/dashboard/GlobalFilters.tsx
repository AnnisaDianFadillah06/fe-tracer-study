import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Download, Radio, Calendar, Camera } from "lucide-react";
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
import { PRODI_LIST, MOCK_STUDENTS, TAHUN_LULUS, Student } from "@/lib/mockData";
import { useGlobalFilters, ALL, WEEK_OPTIONS } from "@/contexts/GlobalFiltersContext";
import { Badge } from "@/components/ui/badge";

/** Jurusan grouping — mapping prodi → jurusan */
const JURUSAN_MAP: Record<string, string[]> = {
  "Teknik Elektro": ["Teknik Elektronika", "Teknik Listrik", "Teknik Telekomunikasi"],
  "Teknik Mesin": ["Teknik Mesin", "Teknik Konversi Energi", "Teknik Pendingin"],
  "Teknik Sipil": ["Teknik Sipil"],
  "Teknik Kimia": ["Teknik Kimia"],
  "Teknik Komputer & Informatika": ["Teknik Informatika"],
  "Akuntansi": ["Akuntansi Manajemen"],
  "Adm. Niaga": ["Keuangan Perbankan", "Keuangan Syariah", "Magister Manajemen"],
};
const ALL_JURUSAN = Object.keys(JURUSAN_MAP);
const ALL_DEGREE = ["D3", "D4", "S2"];

function findProdiByName(name: string) {
  return PRODI_LIST.find((p) => p.name === name);
}
function findJurusanOfProdi(name: string) {
  return ALL_JURUSAN.find((j) => JURUSAN_MAP[j].includes(name));
}

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

interface Props {
  /** "kaprodi" hides degree/jurusan/prodi filters (single-prodi view). */
  mode?: "full" | "kaprodi";
  /** Whether this page uses realtime data (overview) vs snapshot (employment/education) */
  dataMode?: "realtime" | "snapshot";
  /** Prodi name shown for kaprodi badge */
  kaprodiName?: string;
}

const todayId = () =>
  new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

const GlobalFilters = ({ mode = "full", dataMode, kaprodiName }: Props) => {
  const location = useLocation();
  const inferredDataMode: "realtime" | "snapshot" =
    dataMode ?? (location.pathname.includes("/overview") ? "realtime" : "snapshot");
  const {
    degree, jurusan, prodi, tahunLulus, week,
    setDegree, setJurusan, setProdi, setTahunLulus, setWeek, reset,
  } = useGlobalFilters();
  const [dlOpen, setDlOpen] = useState(false);
  const [dlYear, setDlYear] = useState<string>("all");

  // Cascading options
  const availableJurusan = useMemo(() => {
    if (degree === ALL) return ALL_JURUSAN;
    return ALL_JURUSAN.filter((j) =>
      JURUSAN_MAP[j].some((p) => findProdiByName(p)?.jenjang === degree)
    );
  }, [degree]);

  const availableProdi = useMemo(() => {
    let list = PRODI_LIST.map((p) => p.name);
    list = Array.from(new Set(list));
    if (degree !== ALL) {
      list = list.filter((n) => {
        const ps = PRODI_LIST.filter((p) => p.name === n);
        return ps.some((p) => p.jenjang === degree);
      });
    }
    if (jurusan !== ALL) {
      list = list.filter((n) => JURUSAN_MAP[jurusan]?.includes(n));
    }
    return list;
  }, [degree, jurusan]);

  const handleDegree = (v: string) => {
    setDegree(v);
    if (jurusan !== ALL && v !== ALL) {
      const ok = JURUSAN_MAP[jurusan]?.some((p) => findProdiByName(p)?.jenjang === v);
      if (!ok) setJurusan(ALL);
    }
    if (prodi !== ALL && v !== ALL) {
      const ps = PRODI_LIST.filter((p) => p.name === prodi);
      if (!ps.some((p) => p.jenjang === v)) setProdi(ALL);
    }
  };

  const handleJurusan = (v: string) => {
    setJurusan(v);
    if (v !== ALL && prodi !== ALL && !JURUSAN_MAP[v]?.includes(prodi)) {
      setProdi(ALL);
    }
  };

  const handleProdi = (v: string) => {
    setProdi(v);
    if (v !== ALL) {
      const ps = PRODI_LIST.find((p) => p.name === v);
      if (ps && (degree === ALL || ps.jenjang !== degree)) setDegree(ps.jenjang);
      const j = findJurusanOfProdi(v);
      if (j && jurusan !== j) setJurusan(j);
    }
  };

  const handleDownload = () => {
    const filtered =
      dlYear === "all"
        ? MOCK_STUDENTS
        : MOCK_STUDENTS.filter((s) => s.tahunLulus === Number(dlYear));
    downloadCSV(filtered, dlYear === "all" ? "all" : Number(dlYear));
    setDlOpen(false);
  };

  return (
    <div className="w-full flex flex-wrap items-end gap-3 px-6 py-3 border-b border-border bg-background/95 backdrop-blur-md">
      {mode === "full" ? (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Jenjang</label>
            <Select value={degree} onValueChange={handleDegree}>
              <SelectTrigger className="h-9 w-[110px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua</SelectItem>
                {ALL_DEGREE.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Jurusan</label>
            <Select value={jurusan} onValueChange={handleJurusan}>
              <SelectTrigger className="h-9 w-[200px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Jurusan</SelectItem>
                {availableJurusan.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prodi</label>
            <Select value={prodi} onValueChange={handleProdi}>
              <SelectTrigger className="h-9 w-[220px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Prodi</SelectItem>
                {availableProdi.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : (
        <Badge variant="secondary" className="text-sm py-1.5 px-3">
          Prodi: <span className="font-semibold ml-1">{kaprodiName ?? "—"}</span>
        </Badge>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tahun Lulus</label>
        <Select value={tahunLulus} onValueChange={setTahunLulus}>
          <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tahun</SelectItem>
            {TAHUN_LULUS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {inferredDataMode === "snapshot" ? (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Camera className="w-3 h-3" /> Snapshot Minggu
          </label>
          <Select value={week} onValueChange={setWeek}>
            <SelectTrigger className="h-9 w-[200px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {WEEK_OPTIONS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mode</label>
          <Badge variant="outline" className="h-9 px-3 gap-1.5 flex items-center text-sm border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Realtime — {todayId()}
          </Badge>
        </div>
      )}

      {inferredDataMode === "snapshot" && (
        <Badge variant="outline" className="self-end h-9 px-3 gap-1.5 flex items-center text-sm border-primary/30 bg-primary/5">
          <Calendar className="w-3.5 h-3.5" /> {week}
        </Badge>
      )}

      <div className="ml-auto flex items-end gap-2">
        {mode === "full" && (
          <Button size="sm" variant="outline" onClick={reset}>Reset</Button>
        )}
        <Button size="sm" onClick={() => setDlOpen(true)} className="gap-2">
          <Download className="w-4 h-4" /> Unduh Data
        </Button>
      </div>

      <Dialog open={dlOpen} onOpenChange={setDlOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unduh Data Alumni</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Pilih tahun lulus yang ingin diunduh (format CSV).</p>
            <Select value={dlYear} onValueChange={setDlYear}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun</SelectItem>
                {TAHUN_LULUS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlOpen(false)}>Batal</Button>
            <Button onClick={handleDownload} className="gap-2"><Download className="w-4 h-4" />Unduh CSV</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GlobalFilters;