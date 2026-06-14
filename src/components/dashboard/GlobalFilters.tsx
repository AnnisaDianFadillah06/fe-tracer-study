import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Calendar,
  Camera,
  Check,
  Loader2,
  Clock,
  Radio,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlobalFilters, ALL } from "@/contexts/GlobalFiltersContext";
import { Badge } from "@/components/ui/badge";

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
    degree,
    jurusan,
    prodi,
    tahunLulus,
    week,
    setDegree,
    setJurusan,
    setProdi,
    setTahunLulus,
    setWeek,
    reset,
    isApplying,
    lastUpdatedAt,
    applyAll,
    filterOptions,
  } = useGlobalFilters();

  const { tahunLulus: tahunOptions, weekOptions, jenjang: jenjangOptions,
          jurusanList, jurusanMap, prodiList, loading: optLoading, error: optError } = filterOptions;

  // ── Local pending state — committed only on "Terapkan" ────────────────────
  const [pDegree, setPDegree] = useState(degree);
  const [pJurusan, setPJurusan] = useState(jurusan);
  const [pProdi, setPProdi] = useState(prodi);
  const [pTahun, setPTahun] = useState(tahunLulus);
  const [pWeek, setPWeek] = useState(week);

  useEffect(() => { setPDegree(degree); }, [degree]);
  useEffect(() => { setPJurusan(jurusan); }, [jurusan]);
  useEffect(() => { setPProdi(prodi); }, [prodi]);
  useEffect(() => { setPTahun(tahunLulus); }, [tahunLulus]);
  useEffect(() => { setPWeek(week); }, [week]);

  const dirty =
    pDegree !== degree ||
    pJurusan !== jurusan ||
    pProdi !== prodi ||
    pTahun !== tahunLulus ||
    pWeek !== week;

  // ── Cascading options from BE data ────────────────────────────────────────

  /** Jurusan available for the selected jenjang (degree) */
  const availableJurusan = useMemo(() => {
    if (pDegree === ALL) return jurusanList;
    // Keep only jurusan that have at least one prodi with matching jenjang
    return jurusanList.filter((j) =>
      (jurusanMap[j] ?? []).some((prodiName) =>
        prodiList.some((p) => p.nama_prodi === prodiName && p.jenjang === pDegree)
      )
    );
  }, [pDegree, jurusanList, jurusanMap, prodiList]);

  /** Prodi available for the selected jenjang + jurusan */
  const availableProdi = useMemo(() => {
    let list = prodiList;
    if (pDegree !== ALL) list = list.filter((p) => p.jenjang === pDegree);
    if (pJurusan !== ALL) list = list.filter((p) => p.jurusan === pJurusan);
    // Deduplicate by nama_prodi
    const seen = new Set<string>();
    return list.filter((p) => {
      if (seen.has(p.nama_prodi)) return false;
      seen.add(p.nama_prodi);
      return true;
    });
  }, [pDegree, pJurusan, prodiList]);

  // ── Cascade handlers ──────────────────────────────────────────────────────

  const handleDegree = (v: string) => {
    setPDegree(v);
    if (v !== ALL && pJurusan !== ALL) {
      const stillValid = (jurusanMap[pJurusan] ?? []).some((name) =>
        prodiList.some((p) => p.nama_prodi === name && p.jenjang === v)
      );
      if (!stillValid) setPJurusan(ALL);
    }
    if (v !== ALL && pProdi !== ALL) {
      const p = prodiList.find((p) => p.nama_prodi === pProdi);
      if (p && p.jenjang !== v) setPProdi(ALL);
    }
  };

  const handleJurusan = (v: string) => {
    setPJurusan(v);
    if (v !== ALL && pProdi !== ALL) {
      const p = prodiList.find((p) => p.nama_prodi === pProdi);
      if (p && p.jurusan !== v) setPProdi(ALL);
    }
  };

  const handleProdi = (v: string) => {
    setPProdi(v);
    if (v !== ALL) {
      const p = prodiList.find((p) => p.nama_prodi === v);
      if (p) {
        if (pDegree === ALL || pDegree !== p.jenjang) setPDegree(p.jenjang);
        if (pJurusan === ALL || pJurusan !== p.jurusan) setPJurusan(p.jurusan);
      }
    }
  };

  const handleApply = () => {
    applyAll({
      degree: pDegree,
      jurusan: pJurusan,
      prodi: pProdi,
      tahunLulus: pTahun,
      week: pWeek,
    });
  };

  const handleReset = () => {
    setPDegree(ALL);
    setPJurusan(ALL);
    setPProdi(ALL);
    setPTahun("all");
    setPWeek(weekOptions[0] ?? "");
    reset();
  };

  const updatedLabel = lastUpdatedAt.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const updatedDate = lastUpdatedAt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const isDisabled = isApplying || optLoading;

  return (
    <div
      className="w-full border-b border-border bg-background/95 backdrop-blur-md"
      role="region"
      aria-label="Filter global dashboard"
      aria-busy={isApplying}
    >
      {/* Error banner */}
      {optError && (
        <div className="flex items-center gap-2 px-6 py-2 bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Gagal memuat opsi filter: {optError}
        </div>
      )}

      <div className="w-full flex flex-wrap items-end gap-3 px-6 py-3">
        {mode === "full" ? (
          <>
            {/* Jenjang */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Jenjang
              </label>
              <Select value={pDegree} onValueChange={handleDegree} disabled={isDisabled}>
                <SelectTrigger className="h-9 w-[110px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua</SelectItem>
                  {jenjangOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Jurusan */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Jurusan
              </label>
              <Select value={pJurusan} onValueChange={handleJurusan} disabled={isDisabled}>
                <SelectTrigger className="h-9 w-[240px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua Jurusan</SelectItem>
                  {availableJurusan.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prodi */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Prodi
              </label>
              <Select value={pProdi} onValueChange={handleProdi} disabled={isDisabled}>
                <SelectTrigger className="h-9 w-[260px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua Prodi</SelectItem>
                  {availableProdi.map((p) => (
                    <SelectItem key={p.kode_prodi} value={p.nama_prodi}>
                      {p.nama_prodi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <Badge variant="secondary" className="text-sm py-1.5 px-3">
            Prodi: <span className="font-semibold ml-1">{kaprodiName ?? "—"}</span>
          </Badge>
        )}

        {/* Tahun Lulus */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Tahun Lulus
          </label>
          <Select value={pTahun} onValueChange={setPTahun} disabled={isDisabled}>
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun</SelectItem>
              {tahunOptions.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Snapshot Minggu — only in snapshot mode */}
        {inferredDataMode === "snapshot" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Camera className="w-3 h-3" /> Snapshot Minggu
            </label>
            <Select value={pWeek} onValueChange={setPWeek} disabled={isDisabled}>
              <SelectTrigger className="h-9 w-[200px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Actions */}
        <div className="ml-auto flex items-end gap-2">
          <Button
            size="sm"
            onClick={handleApply}
            disabled={isDisabled}
            className="h-9 gap-1.5"
            variant={dirty ? "default" : "secondary"}
          >
            {isApplying || optLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {optLoading ? "Memuat opsi…" : "Memuat…"}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Terapkan{dirty ? " *" : ""}
              </>
            )}
          </Button>
          {mode === "full" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={isDisabled}
            >
              Reset
            </Button>
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
            <Badge
              variant="outline"
              className="h-6 px-2 gap-1 border-primary/30 bg-primary/5 text-foreground"
            >
              <Calendar className="w-3 h-3" />
              Snapshot aktif: <span className="font-semibold">{week}</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="h-6 px-2 gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            >
              <Radio className="w-3 h-3 animate-pulse" />
              Mode: <span className="font-semibold">Realtime</span>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {isApplying ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-primary" /> Memuat data…
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" /> Diperbarui {updatedDate} · {updatedLabel}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalFilters;