import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useFilterOptions, FilterOptions } from "@/hooks/useFilterOptions";

export const ALL = "__all__";

export interface GlobalFiltersState {
  degree: string;
  jurusan: string;
  prodi: string;
  tahunLulus: string;
  week: string;
  /** Raw ISO week key (e.g. "2024-W06") matching the selected week label */
  weekKey: string;
  setDegree: (v: string) => void;
  setJurusan: (v: string) => void;
  setProdi: (v: string) => void;
  setTahunLulus: (v: string) => void;
  setWeek: (v: string) => void;
  reset: () => void;
  isApplying: boolean;
  triggerApply: (ms?: number) => void;
  applyAll: (next: {
    degree: string;
    jurusan: string;
    prodi: string;
    tahunLulus: string;
    week: string;
  }) => void;
  lastUpdatedAt: Date;
  /** Full filter-options from BE (pass-through so children avoid double-fetch) */
  filterOptions: FilterOptions;
}

const Ctx = createContext<GlobalFiltersState | undefined>(undefined);

export function GlobalFiltersProvider({ children }: { children: ReactNode }) {
  const filterOptions = useFilterOptions();

  // ── Derived defaults (wait until BE data arrives) ──────────────────────────
  const defaultWeek = filterOptions.weekOptions[0] ?? "";

  const [degree, setDegreeRaw] = useState<string>(ALL);
  const [jurusan, setJurusanRaw] = useState<string>(ALL);
  const [prodi, setProdiRaw] = useState<string>(ALL);
  const [tahunLulus, setTahunLulusRaw] = useState<string>("all");
  const [week, setWeekRaw] = useState<string>("");

  // Once BE data loads, initialise week to the latest snapshot
  useEffect(() => {
    if (!filterOptions.loading && filterOptions.weekOptions.length > 0 && week === "") {
      setWeekRaw(filterOptions.weekOptions[0]);
    }
  }, [filterOptions.loading, filterOptions.weekOptions, week]);

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

  const setDegree = setDegreeRaw;
  const setJurusan = setJurusanRaw;
  const setProdi = setProdiRaw;
  const setTahunLulus = setTahunLulusRaw;
  const setWeek = setWeekRaw;

  const applyAll = useCallback(
    (next: {
      degree: string;
      jurusan: string;
      prodi: string;
      tahunLulus: string;
      week: string;
    }) => {
      setDegreeRaw(next.degree);
      setJurusanRaw(next.jurusan);
      setProdiRaw(next.prodi);
      setTahunLulusRaw(next.tahunLulus);
      setWeekRaw(next.week);
      triggerApply();
    },
    [triggerApply]
  );

  // Derive the raw ISO key that corresponds to the selected week label
  const weekKey = useMemo(() => {
    const idx = filterOptions.weekOptions.indexOf(week);
    return idx !== -1 ? filterOptions.weekKeys[idx] : filterOptions.weekKeys[0] ?? "";
  }, [week, filterOptions.weekOptions, filterOptions.weekKeys]);

  const value = useMemo<GlobalFiltersState>(
    () => ({
      degree,
      jurusan,
      prodi,
      tahunLulus,
      week,
      weekKey,
      setDegree,
      setJurusan,
      setProdi,
      setTahunLulus,
      setWeek,
      reset: () => {
        setDegreeRaw(ALL);
        setJurusanRaw(ALL);
        setProdiRaw(ALL);
        setTahunLulusRaw("all");
        setWeekRaw(filterOptions.weekOptions[0] ?? "");
        triggerApply();
      },
      isApplying,
      triggerApply,
      applyAll,
      lastUpdatedAt,
      filterOptions,
    }),
    [
      degree,
      jurusan,
      prodi,
      tahunLulus,
      week,
      weekKey,
      isApplying,
      triggerApply,
      applyAll,
      lastUpdatedAt,
      filterOptions,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGlobalFilters(): GlobalFiltersState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Inert fallback when used outside provider
    const noopFilterOptions: FilterOptions = {
      tahunLulus: [],
      weekOptions: [],
      weekKeys: [],
      jenjang: [],
      jurusanList: [],
      jurusanMap: {},
      prodiList: [],
      loading: false,
      error: null,
    };
    return {
      degree: ALL,
      jurusan: ALL,
      prodi: ALL,
      tahunLulus: "all",
      week: "",
      weekKey: "",
      setDegree: () => {},
      setJurusan: () => {},
      setProdi: () => {},
      setTahunLulus: () => {},
      setWeek: () => {},
      reset: () => {},
      isApplying: false,
      triggerApply: () => {},
      applyAll: () => {},
      lastUpdatedAt: new Date(),
      filterOptions: noopFilterOptions,
    };
  }
  return ctx;
}

/* ===== KPI UI Context ======================================================= */
interface KpiUIState {
  hideCompare: boolean;
}
const KpiUICtx = createContext<KpiUIState>({ hideCompare: false });

export function KpiUIProvider({
  hideCompare = false,
  children,
}: {
  hideCompare?: boolean;
  children: ReactNode;
}) {
  return <KpiUICtx.Provider value={{ hideCompare }}>{children}</KpiUICtx.Provider>;
}

export function useKpiUI() {
  return useContext(KpiUICtx);
}