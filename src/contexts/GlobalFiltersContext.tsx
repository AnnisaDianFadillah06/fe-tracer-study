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
import { useOrgLevels, OrgLevelsState } from "@/hooks/useOrgLevels";

export const ALL = "__all__";

export interface GlobalFiltersState {
  degree: string;
  jurusan: string;
  prodi: string;
  tahunLulus: string;
  /** Unique snapshot id (DimWaktu.id_waktu) -- this IS the selection value, not a label. */
  week: string;
  /** Alias of `week`, kept for existing call sites that read the raw filter key. */
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
  /**
   * Fase 5 (DFR-20/21) — jumlah & label level struktur organisasi aktif
   * (pass-through, sama pola dengan `filterOptions`). `isGeneric` selalu
   * false untuk template 1-level (Politeknik/POLBAN) atau saat endpoint
   * admin-nya tidak bisa diakses (role selain head_tracer) -- GlobalFilters
   * dijamin merender UI lama tanpa perubahan pada kasus itu.
   */
  orgLevels: OrgLevelsState;
}

const Ctx = createContext<GlobalFiltersState | undefined>(undefined);

export function GlobalFiltersProvider({ children }: { children: ReactNode }) {
  const filterOptions = useFilterOptions();
  const orgLevels = useOrgLevels();

  const [degree, setDegreeRaw] = useState<string>(ALL);
  const [jurusan, setJurusanRaw] = useState<string>(ALL);
  const [prodi, setProdiRaw] = useState<string>(ALL);
  const [tahunLulus, setTahunLulusRaw] = useState<string>("all");
  // `week` holds the unique snapshot id (weekKeys entry), NOT the display
  // label. Two snapshots can share an identical label (e.g. two ETL runs in
  // the same calendar week), and matching by label would make the second
  // one permanently unselectable -- see FilterMetaRepository::getSnapshot().
  const [week, setWeekRaw] = useState<string>("");

  // Once BE data loads, initialise week to the latest snapshot
  useEffect(() => {
    if (!filterOptions.loading && filterOptions.weekKeys.length > 0 && week === "") {
      setWeekRaw(filterOptions.weekKeys[0]);
    }
  }, [filterOptions.loading, filterOptions.weekKeys, week]);

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

  // `week` already IS the unique id; `weekKey` is just an alias for callers
  // that were written against the old name.
  const weekKey = week;

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
        setWeekRaw(filterOptions.weekKeys[0] ?? "");
        triggerApply();
      },
      isApplying,
      triggerApply,
      applyAll,
      lastUpdatedAt,
      filterOptions,
      orgLevels,
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
      orgLevels,
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
    const noopOrgLevels: OrgLevelsState = {
      levels: [{ id: -1, institution_type: "politeknik", level_index: 1, label: "Jurusan", is_required: true }],
      institutionType: "politeknik",
      isGeneric: false,
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
      orgLevels: noopOrgLevels,
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