import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from "react";

export const ALL = "__all__";

export interface GlobalFiltersState {
  degree: string;
  jurusan: string;
  prodi: string;
  tahunLulus: string; // "all" | year
  week: string;
  setDegree: (v: string) => void;
  setJurusan: (v: string) => void;
  setProdi: (v: string) => void;
  setTahunLulus: (v: string) => void;
  setWeek: (v: string) => void;
  reset: () => void;
  isApplying: boolean;
  triggerApply: (ms?: number) => void;
  /** Timestamp of last successful filter apply / data refresh. */
  lastUpdatedAt: Date;
}

const Ctx = createContext<GlobalFiltersState | undefined>(undefined);

export const WEEK_OPTIONS = [
  "2026 Mei - Minggu 3",
  "2026 Mei - Minggu 2",
  "2026 Mei - Minggu 1",
  "2026 Apr - Minggu 4",
  "2026 Apr - Minggu 3",
  "2026 Feb - Minggu 3",
  "2025 Des - Minggu 4",
];

export function GlobalFiltersProvider({ children }: { children: ReactNode }) {
  const [degree, setDegreeRaw] = useState<string>(ALL);
  const [jurusan, setJurusanRaw] = useState<string>(ALL);
  const [prodi, setProdiRaw] = useState<string>(ALL);
  const [tahunLulus, setTahunLulusRaw] = useState<string>("all");
  const [week, setWeekRaw] = useState<string>(WEEK_OPTIONS[0]);
  const [isApplying, setIsApplying] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>(() => new Date());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerApply = useCallback((ms = 650) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsApplying(true);
    timerRef.current = setTimeout(() => {
      setIsApplying(false);
      setLastUpdatedAt(new Date());
    }, ms);
  }, []);

  const wrap = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); triggerApply(); };
  const setDegree = wrap(setDegreeRaw);
  const setJurusan = wrap(setJurusanRaw);
  const setProdi = wrap(setProdiRaw);
  const setTahunLulus = wrap(setTahunLulusRaw);
  const setWeek = wrap(setWeekRaw);

  const value = useMemo<GlobalFiltersState>(
    () => ({
      degree, jurusan, prodi, tahunLulus, week,
      setDegree, setJurusan, setProdi, setTahunLulus, setWeek,
      reset: () => {
        setDegreeRaw(ALL); setJurusanRaw(ALL); setProdiRaw(ALL); setTahunLulusRaw("all");
        triggerApply();
      },
      isApplying,
      triggerApply,
      lastUpdatedAt,
    }),
    [degree, jurusan, prodi, tahunLulus, week, isApplying, triggerApply, lastUpdatedAt]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGlobalFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback no-op state if used outside provider (e.g. landing). Returns inert defaults.
    return {
      degree: ALL, jurusan: ALL, prodi: ALL, tahunLulus: "all", week: WEEK_OPTIONS[0],
      setDegree: () => {}, setJurusan: () => {}, setProdi: () => {}, setTahunLulus: () => {}, setWeek: () => {},
      reset: () => {},
      isApplying: false,
      triggerApply: () => {},
      lastUpdatedAt: new Date(),
    } as GlobalFiltersState;
  }
  return ctx;
}

/* ===== KPI UI Context — controls whether Compare buttons render (Kaprodi hides) ===== */
interface KpiUIState { hideCompare: boolean }
const KpiUICtx = createContext<KpiUIState>({ hideCompare: false });
export function KpiUIProvider({ hideCompare = false, children }: { hideCompare?: boolean; children: ReactNode }) {
  return <KpiUICtx.Provider value={{ hideCompare }}>{children}</KpiUICtx.Provider>;
}
export function useKpiUI() { return useContext(KpiUICtx); }