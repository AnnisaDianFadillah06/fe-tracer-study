import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PRODI_LIST } from "@/lib/mockData";

/* ============================================================
   STATIC INDICATORS — 5 indikator threshold (tidak bisa diedit)
   ============================================================ */
export const THRESHOLD_INDICATORS = [
  { id: 1, key: "employment_time", name: "Lulusan Bekerja ≤ 6 Bulan", unit: "%" },
  { id: 2, key: "entrepreneurship", name: "Lulusan Berwirausaha", unit: "%" },
  { id: 3, key: "job_relevance", name: "Kesesuaian Bidang Kerja", unit: "%" },
  { id: 4, key: "user_satisfaction", name: "Kepuasan Pengguna Lulusan", unit: "%" },
  { id: 5, key: "income_level", name: "Pendapatan ≥ 1.5× UMK", unit: "%" },
] as const;

export type IndicatorThreshold = {
  indicator_id: number;
  indicator_name: string;
  baik: number;
  unggul: number;
};

export interface Lam {
  id: string;
  name: string;
  code: string;
  programs: string[];
}

export interface Standar {
  id: string;
  lam_id: string;
  version_name: string;
  year: number;
  is_active: boolean;
  thresholds: IndicatorThreshold[];
}

export const ALL_PRODI = PRODI_LIST.map((p) => `${p.name} (${p.jenjang})`);

const makeDefaultThresholds = (): IndicatorThreshold[] =>
  THRESHOLD_INDICATORS.map((i) => ({
    indicator_id: i.id,
    indicator_name: i.name,
    baik: 0,
    unggul: 0,
  }));

const initialLams: Lam[] = [
  {
    id: "lam-1",
    name: "LAM INFOKOM",
    code: "INFOKOM",
    programs: ["Teknik Informatika (D3)", "Teknik Informatika (D4)"],
  },
  {
    id: "lam-2",
    name: "LAM Teknik",
    code: "TEKNIK",
    programs: ["Teknik Mesin (D3)", "Teknik Elektronika (D3)", "Teknik Listrik (D3)"],
  },
];

const initialStandar: Standar[] = [
  {
    id: "std-1",
    lam_id: "lam-1",
    version_name: "Standar 2025",
    year: 2025,
    is_active: true,
    thresholds: [
      { indicator_id: 1, indicator_name: "Lulusan Bekerja ≤ 6 Bulan", baik: 75, unggul: 85 },
      { indicator_id: 2, indicator_name: "Lulusan Berwirausaha", baik: 15, unggul: 25 },
      { indicator_id: 3, indicator_name: "Kesesuaian Bidang Kerja", baik: 40, unggul: 60 },
      { indicator_id: 4, indicator_name: "Kepuasan Pengguna Lulusan", baik: 65, unggul: 75 },
      { indicator_id: 5, indicator_name: "Pendapatan ≥ 1.5× UMK", baik: 65, unggul: 80 },
    ],
  },
  {
    id: "std-2",
    lam_id: "lam-2",
    version_name: "Standar 2024",
    year: 2024,
    is_active: true,
    thresholds: [
      { indicator_id: 1, indicator_name: "Lulusan Bekerja ≤ 6 Bulan", baik: 70, unggul: 80 },
      { indicator_id: 2, indicator_name: "Lulusan Berwirausaha", baik: 10, unggul: 20 },
      { indicator_id: 3, indicator_name: "Kesesuaian Bidang Kerja", baik: 45, unggul: 65 },
      { indicator_id: 4, indicator_name: "Kepuasan Pengguna Lulusan", baik: 60, unggul: 75 },
      { indicator_id: 5, indicator_name: "Pendapatan ≥ 1.5× UMK", baik: 60, unggul: 75 },
    ],
  },
];

/* ---------- LAM form ---------- */
const defaultLamForm = () => ({
  name: "",
  code: "",
  programs: [] as string[],
});
export type LamFormErrors = {
  name?: string;
  code?: string;
  programs?: string;
};
const validateLam = (f: ReturnType<typeof defaultLamForm>): LamFormErrors => {
  const e: LamFormErrors = {};
  if (!f.name.trim()) e.name = "Nama LAM wajib diisi";
  if (!f.code.trim()) e.code = "Kode wajib diisi";
  else if (!/^[A-Z0-9_-]{2,20}$/.test(f.code.trim()))
    e.code = "Kode 2-20 karakter (huruf kapital, angka, - atau _)";
  if (f.programs.length === 0) e.programs = "Pilih minimal satu prodi";
  return e;
};

/* ---------- Standar form ---------- */
const defaultStandarForm = () => ({
  lam_id: "",
  version_name: "",
  year: new Date().getFullYear(),
  is_active: true,
  thresholds: makeDefaultThresholds(),
});
export type StandarFormErrors = {
  lam_id?: string;
  version_name?: string;
  year?: string;
  thresholds?: Record<number, { baik?: string; unggul?: string }>;
};
const validateStandar = (
  f: ReturnType<typeof defaultStandarForm>,
): StandarFormErrors => {
  const e: StandarFormErrors = {};
  if (!f.lam_id) e.lam_id = "Pilih LAM";
  if (!f.version_name.trim()) e.version_name = "Nama standar wajib diisi";
  const y = Number(f.year);
  if (!y || Number.isNaN(y)) e.year = "Tahun wajib diisi";
  else if (y < 2000 || y > 2100) e.year = "Tahun 2000 - 2100";

  const tErrs: Record<number, { baik?: string; unggul?: string }> = {};
  f.thresholds.forEach((t) => {
    const row: { baik?: string; unggul?: string } = {};
    if (t.baik === null || t.baik === undefined || Number.isNaN(t.baik)) row.baik = "Wajib";
    else if (t.baik < 0 || t.baik > 100) row.baik = "0 - 100";
    if (t.unggul === null || t.unggul === undefined || Number.isNaN(t.unggul)) row.unggul = "Wajib";
    else if (t.unggul < 0 || t.unggul > 100) row.unggul = "0 - 100";
    else if (!row.baik && t.unggul < t.baik) row.unggul = "Harus ≥ Baik";
    if (row.baik || row.unggul) tErrs[t.indicator_id] = row;
  });
  if (Object.keys(tErrs).length) e.thresholds = tErrs;
  return e;
};

export const useThresholdManagement = () => {
  const { toast } = useToast();
  const [lams, setLams] = useState<Lam[]>([]);
  const [standars, setStandars] = useState<Standar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterLam, setFilterLam] = useState<string>("all");

  /* LAM dialog */
  const [isLamDialogOpen, setIsLamDialogOpen] = useState(false);
  const [editingLam, setEditingLam] = useState<Lam | null>(null);
  const [lamForm, setLamForm] = useState(defaultLamForm());
  const [prodiSearch, setProdiSearch] = useState("");
  const [submittingLam, setSubmittingLam] = useState(false);
  const [isLamDeleteOpen, setIsLamDeleteOpen] = useState(false);
  const [deletingLamId, setDeletingLamId] = useState<string | null>(null);

  /* Standar dialog */
  const [isStdDialogOpen, setIsStdDialogOpen] = useState(false);
  const [editingStandar, setEditingStandar] = useState<Standar | null>(null);
  const [stdForm, setStdForm] = useState(defaultStandarForm());
  const [submittingStd, setSubmittingStd] = useState(false);
  const [isStdDeleteOpen, setIsStdDeleteOpen] = useState(false);
  const [deletingStdId, setDeletingStdId] = useState<string | null>(null);

  /* fetch */
  useEffect(() => {
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      try {
        setLams(initialLams);
        setStandars(initialStandar);
        setLoading(false);
      } catch (e: any) {
        setError(e?.message ?? "Gagal memuat data");
        setLoading(false);
        toast({
          title: "Gagal memuat data",
          description: e?.message ?? "Terjadi kesalahan",
          variant: "destructive",
        });
      }
    }, 600);
    return () => clearTimeout(t);
  }, []);

  const lamById = useMemo(
    () => Object.fromEntries(lams.map((l) => [l.id, l])),
    [lams],
  );

  const filteredStandar = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return standars.filter((s) => {
      const lam = lamById[s.lam_id];
      const matchSearch =
        !q ||
        s.version_name.toLowerCase().includes(q) ||
        String(s.year).includes(q) ||
        (lam &&
          (lam.name.toLowerCase().includes(q) ||
            lam.code.toLowerCase().includes(q) ||
            lam.programs.some((p) => p.toLowerCase().includes(q))));
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "aktif" ? s.is_active : !s.is_active);
      const matchLam = filterLam === "all" || s.lam_id === filterLam;
      return matchSearch && matchStatus && matchLam;
    });
  }, [standars, lamById, searchQuery, filterStatus, filterLam]);

  const filteredProdiOptions = useMemo(() => {
    const q = prodiSearch.toLowerCase();
    return ALL_PRODI.filter((p) => p.toLowerCase().includes(q));
  }, [prodiSearch]);

  const lamFormErrors = useMemo(() => validateLam(lamForm), [lamForm]);
  const isLamFormValid = useMemo(
    () => Object.keys(lamFormErrors).length === 0,
    [lamFormErrors],
  );
  const stdFormErrors = useMemo(() => validateStandar(stdForm), [stdForm]);
  const isStdFormValid = useMemo(
    () => Object.keys(stdFormErrors).length === 0,
    [stdFormErrors],
  );

  /* ===== LAM actions ===== */
  const openAddLam = () => {
    setEditingLam(null);
    setLamForm(defaultLamForm());
    setProdiSearch("");
    setIsLamDialogOpen(true);
  };
  const openEditLam = (l: Lam) => {
    setEditingLam(l);
    setLamForm({ name: l.name, code: l.code, programs: [...l.programs] });
    setProdiSearch("");
    setIsLamDialogOpen(true);
  };
  const toggleProdi = (name: string) => {
    setLamForm((f) => ({
      ...f,
      programs: f.programs.includes(name)
        ? f.programs.filter((p) => p !== name)
        : [...f.programs, name],
    }));
  };
  const toggleAllVisibleProdi = (select: boolean) => {
    setLamForm((f) => {
      const v = filteredProdiOptions;
      return select
        ? { ...f, programs: Array.from(new Set([...f.programs, ...v])) }
        : { ...f, programs: f.programs.filter((p) => !v.includes(p)) };
    });
  };
  const submitLam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLamFormValid) {
      toast({ title: "Form belum valid", description: "Periksa isian merah", variant: "destructive" });
      return;
    }
    setSubmittingLam(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      if (editingLam) {
        setLams((p) => p.map((l) => (l.id === editingLam.id ? { ...l, ...lamForm } : l)));
        toast({ title: "LAM diperbarui", description: lamForm.name });
      } else {
        setLams((p) => [...p, { id: `lam-${Date.now()}`, ...lamForm }]);
        toast({ title: "LAM ditambahkan", description: lamForm.name });
      }
      setIsLamDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Gagal menyimpan LAM",
        description: err?.message ?? "Kesalahan",
        variant: "destructive",
      });
    } finally {
      setSubmittingLam(false);
    }
  };
  const confirmDeleteLam = (id: string) => {
    setDeletingLamId(id);
    setIsLamDeleteOpen(true);
  };
  const deleteLam = async () => {
    if (!deletingLamId) return;
    const used = standars.some((s) => s.lam_id === deletingLamId);
    if (used) {
      toast({
        title: "Tidak dapat menghapus LAM",
        description: "Masih memiliki Standar Penilaian. Hapus standar terlebih dahulu.",
        variant: "destructive",
      });
      setIsLamDeleteOpen(false);
      setDeletingLamId(null);
      return;
    }
    const target = lams.find((l) => l.id === deletingLamId);
    setLams((p) => p.filter((l) => l.id !== deletingLamId));
    toast({ title: "LAM dihapus", description: target?.name ?? "" });
    setIsLamDeleteOpen(false);
    setDeletingLamId(null);
  };

  /* ===== Standar actions ===== */
  const openAddStandar = () => {
    setEditingStandar(null);
    setStdForm({ ...defaultStandarForm(), lam_id: lams[0]?.id ?? "" });
    setIsStdDialogOpen(true);
  };
  const openEditStandar = (s: Standar) => {
    setEditingStandar(s);
    setStdForm({
      lam_id: s.lam_id,
      version_name: s.version_name,
      year: s.year,
      is_active: s.is_active,
      thresholds: s.thresholds.map((t) => ({ ...t })),
    });
    setIsStdDialogOpen(true);
  };
  const updateThreshold = (indicator_id: number, field: "baik" | "unggul", value: number) => {
    setStdForm((f) => ({
      ...f,
      thresholds: f.thresholds.map((t) =>
        t.indicator_id === indicator_id ? { ...t, [field]: value } : t,
      ),
    }));
  };
  const submitStandar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStdFormValid) {
      toast({ title: "Form belum valid", description: "Periksa isian merah", variant: "destructive" });
      return;
    }
    setSubmittingStd(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      if (editingStandar) {
        setStandars((p) =>
          p.map((s) => (s.id === editingStandar.id ? { ...s, ...stdForm } : s)),
        );
        toast({ title: "Standar diperbarui", description: stdForm.version_name });
      } else {
        setStandars((p) => [...p, { id: `std-${Date.now()}`, ...stdForm }]);
        toast({ title: "Standar Penilaian ditambahkan", description: stdForm.version_name });
      }
      setIsStdDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Gagal menyimpan standar",
        description: err?.message ?? "Kesalahan",
        variant: "destructive",
      });
    } finally {
      setSubmittingStd(false);
    }
  };
  const confirmDeleteStandar = (id: string) => {
    setDeletingStdId(id);
    setIsStdDeleteOpen(true);
  };
  const deleteStandar = async () => {
    if (!deletingStdId) return;
    const t = standars.find((s) => s.id === deletingStdId);
    setStandars((p) => p.filter((s) => s.id !== deletingStdId));
    toast({ title: "Standar dihapus", description: t?.version_name ?? "" });
    setIsStdDeleteOpen(false);
    setDeletingStdId(null);
  };
  const toggleStandarStatus = (id: string) => {
    const t = standars.find((s) => s.id === id);
    if (!t) return;
    const next = !t.is_active;
    setStandars((p) => p.map((s) => (s.id === id ? { ...s, is_active: next } : s)));
    toast({
      title: next ? "Standar diaktifkan" : "Standar dinonaktifkan",
      description: `${t.version_name} sekarang ${next ? "aktif" : "tidak aktif"}`,
    });
  };

  return {
    /* data */
    lams,
    standars,
    lamById,
    filteredStandar,
    loading,
    error,

    /* filters */
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterLam,
    setFilterLam,

    /* LAM */
    isLamDialogOpen,
    setIsLamDialogOpen,
    editingLam,
    lamForm,
    setLamForm,
    lamFormErrors,
    isLamFormValid,
    submittingLam,
    prodiSearch,
    setProdiSearch,
    filteredProdiOptions,
    openAddLam,
    openEditLam,
    submitLam,
    toggleProdi,
    toggleAllVisibleProdi,
    confirmDeleteLam,
    deleteLam,
    isLamDeleteOpen,
    setIsLamDeleteOpen,

    /* Standar */
    isStdDialogOpen,
    setIsStdDialogOpen,
    editingStandar,
    stdForm,
    setStdForm,
    stdFormErrors,
    isStdFormValid,
    submittingStd,
    openAddStandar,
    openEditStandar,
    submitStandar,
    updateThreshold,
    confirmDeleteStandar,
    deleteStandar,
    isStdDeleteOpen,
    setIsStdDeleteOpen,
    toggleStandarStatus,
  };
};
