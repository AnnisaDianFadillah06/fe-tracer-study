import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Calendar, Camera, Check, Loader2, Clock, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODI_LIST, TAHUN_LULUS } from "@/lib/mockData";
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

interface Props {
  /** "kaprodi" hides degree/jurusan/prodi filters (single-prodi view). */
  mode?: "full" | "kaprodi";
  /** Whether this page uses realtime data (overview) vs snapshot (employment/education) */
  dataMode?: "realtime" | "snapshot";
  /** Prodi name shown for kaprodi badge */
  kaprodiName?: string;
}

const GlobalFilters = ({ mode = "full", dataMode, kaprodiName }: Props) => {
  const location = useLocation();
  const inferredDataMode: "realtime" | "snapshot" =
    dataMode ?? (location.pathname.includes("/overview") ? "realtime" : "snapshot");
  const {
    degree, jurusan, prodi, tahunLulus, week,
    setDegree, setJurusan, setProdi, setTahunLulus, setWeek, reset, isApplying, lastUpdatedAt,
  } = useGlobalFilters();
  const [pendingWeek, setPendingWeek] = useState<string>(week);
  useEffect(() => { setPendingWeek(week); }, [week]);
  const weekDirty = pendingWeek !== week;

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

  const updatedLabel = lastUpdatedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const updatedDate = lastUpdatedAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div
      className="w-full border-b border-border bg-background/95 backdrop-blur-md"
      role="region"
      aria-label="Filter global dashboard"
      aria-busy={isApplying}
    >
    <div className="w-full flex flex-wrap items-end gap-3 px-6 py-3">
      {mode === "full" ? (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Jenjang</label>
            <Select value={degree} onValueChange={handleDegree} disabled={isApplying}>
              <SelectTrigger className="h-9 w-[110px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua</SelectItem>
                {ALL_DEGREE.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Jurusan</label>
            <Select value={jurusan} onValueChange={handleJurusan} disabled={isApplying}>
              <SelectTrigger className="h-9 w-[200px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Jurusan</SelectItem>
                {availableJurusan.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prodi</label>
            <Select value={prodi} onValueChange={handleProdi} disabled={isApplying}>
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
        <Select value={tahunLulus} onValueChange={setTahunLulus} disabled={isApplying}>
          <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tahun</SelectItem>
            {TAHUN_LULUS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {inferredDataMode === "snapshot" ? (
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Camera className="w-3 h-3" /> Snapshot Minggu
            </label>
            <Select value={pendingWeek} onValueChange={setPendingWeek} disabled={isApplying}>
              <SelectTrigger className="h-9 w-[200px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEEK_OPTIONS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            disabled={!weekDirty || isApplying}
            onClick={() => setWeek(pendingWeek)}
            className="h-9 gap-1.5"
          >
            {isApplying ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Memuat…</>
            ) : (
              <><Check className="w-4 h-4" /> Terapkan</>
            )}
          </Button>
        </div>
      ) : null}

      <div className="ml-auto flex items-end gap-2">
        {mode === "full" && (
          <Button size="sm" variant="outline" onClick={reset} disabled={isApplying}>Reset</Button>
        )}
      </div>
    </div>

    {/* Active snapshot / mode + last-updated banner */}
    <div
      className="w-full flex flex-wrap items-center justify-between gap-2 px-6 py-1.5 bg-muted/30 border-t border-border/60 text-xs"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-2 flex-wrap">
        {inferredDataMode === "snapshot" ? (
          <Badge variant="outline" className="h-6 px-2 gap-1 border-primary/30 bg-primary/5 text-foreground">
            <Calendar className="w-3 h-3" />
            Snapshot aktif: <span className="font-semibold">{week}</span>
          </Badge>
        ) : (
          <Badge variant="outline" className="h-6 px-2 gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            Mode: <span className="font-semibold">Realtime</span>
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {isApplying ? (
          <><Loader2 className="w-3 h-3 animate-spin text-primary" /> Memuat data…</>
        ) : (
          <><Clock className="w-3 h-3" /> Diperbarui {updatedDate} · {updatedLabel}</>
        )}
      </div>
    </div>
    </div>
  );
};

export default GlobalFilters;