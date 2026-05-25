import { useMemo, useState } from "react";
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
import { PRODI_LIST, MOCK_STUDENTS, TAHUN_LULUS, Student } from "@/lib/mockData";

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

/** Week options — mock examples representing OLAP snapshot weeks */
const WEEK_OPTIONS = [
  "2026 Mei - Minggu 3",
  "2026 Mei - Minggu 2",
  "2026 Mei - Minggu 1",
  "2026 Apr - Minggu 4",
  "2026 Apr - Minggu 3",
  "2026 Feb - Minggu 3",
  "2025 Des - Minggu 4",
];

const ALL = "__all__";

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

const GlobalFilters = () => {
  const [degree, setDegree] = useState<string>(ALL);
  const [jurusan, setJurusan] = useState<string>(ALL);
  const [prodi, setProdi] = useState<string>(ALL);
  const [week, setWeek] = useState<string>(WEEK_OPTIONS[0]);
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
    <div className="glass-card p-3 mb-4 flex flex-wrap items-end gap-3 sticky top-16 z-20 backdrop-blur-md bg-card/95">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Degree</label>
        <Select value={degree} onValueChange={handleDegree}>
          <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua</SelectItem>
            {ALL_DEGREE.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Jurusan</label>
        <Select value={jurusan} onValueChange={handleJurusan}>
          <SelectTrigger className="h-9 w-[220px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Jurusan</SelectItem>
            {availableJurusan.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Prodi</label>
        <Select value={prodi} onValueChange={handleProdi}>
          <SelectTrigger className="h-9 w-[240px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Prodi</SelectItem>
            {availableProdi.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Snapshot Minggu</label>
        <Select value={week} onValueChange={setWeek}>
          <SelectTrigger className="h-9 w-[200px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {WEEK_OPTIONS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="ml-auto flex items-end gap-2">
        <Button size="sm" variant="outline" onClick={() => { setDegree(ALL); setJurusan(ALL); setProdi(ALL); }}>
          Reset
        </Button>
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