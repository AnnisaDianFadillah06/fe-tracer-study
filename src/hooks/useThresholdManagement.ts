/**
 * src/hooks/useThresholdManagement.ts
 *
 * Menggantikan versi dummy (mock data) dengan integrasi API nyata.
 *
 * Mapping konsep lama → API:
 *   Lam      → /api/lams
 *   Standar  → LamVersion + Thresholds (bukan entitas terpisah)
 *
 * Shape "Standar" di hook ini disatukan dari:
 *   lam.versions[i]   → id, year, version_name, is_active
 *   lam.thresholds    → nilai baik/unggul per indikator
 */

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  apiService,
  type Lam as ApiLam,
  type LamVersion,
  type ThresholdItem,
  type ThresholdBulkCreateItem,
  type ThresholdBulkUpdateItem,
} from "@/lib/apiClient";

// ─────────────────────────────────────────────
// Static Indicators (sama persis seperti sebelumnya)
// ─────────────────────────────────────────────

export const THRESHOLD_INDICATORS = [
  { id: 1, key: "employment_time",  name: "Lulusan Bekerja ≤ 6 Bulan",    unit: "%" },
  { id: 2, key: "entrepreneurship", name: "Lulusan Berwirausaha",           unit: "%" },
  { id: 3, key: "job_relevance",    name: "Kesesuaian Bidang Kerja",        unit: "%" },
  { id: 4, key: "user_satisfaction",name: "Kepuasan Pengguna Lulusan",      unit: "%" },
  { id: 5, key: "income_level",     name: "Pendapatan ≥ 1.5× UMK",         unit: "%" },
] as const;

// ─────────────────────────────────────────────
// Local types (tetap kompatibel dengan page lama)
// ─────────────────────────────────────────────

export type IndicatorThreshold = {
  indicator_id: number;
  indicator_name: string;
  /** threshold_id dari backend — dibutuhkan saat bulk-update */
  baik_threshold_id?: number;
  baik: number;
  /** threshold_id dari backend — dibutuhkan saat bulk-update */
  unggul_threshold_id?: number;
  unggul: number;
};

export interface Lam {
  id: string;           // string agar kompatibel dengan page lama
  _numId: number;       // id asli (number) untuk panggil API
  name: string;
  code: string;
  programs: string[];   // nama prodi (untuk tampilan badge)
  _programIds: number[];// id asli untuk panggil API
}

export interface Standar {
  id: string;           // string, format "ver-{versionId}"
  _versionId: number;   // id asli LamVersion untuk panggil API
  lam_id: string;       // cocok dengan Lam.id
  _lamNumId: number;
  version_name: string;
  year: number;
  is_active: boolean;
  thresholds: IndicatorThreshold[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const makeDefaultThresholds = (): IndicatorThreshold[] =>
  THRESHOLD_INDICATORS.map((i) => ({
    indicator_id: i.id,
    indicator_name: i.name,
    baik: 0,
    unggul: 0,
  }));

/** Konversi ApiLam → Lam lokal */
function mapApiLam(apiLam: ApiLam): Lam {
  return {
    id: String(apiLam.id),
    _numId: apiLam.id,
    name: apiLam.name,
    code: apiLam.code,
    programs: apiLam.programs.map((p) => `${p.name}${p.degree ? ` (${p.degree})` : ""}`),
    _programIds: apiLam.programs.map((p) => p.id),
  };
}

/** Konversi ApiLam → Standar lokal (1 LAM bisa punya banyak version) */
function mapApiStandar(apiLam: ApiLam, version: LamVersion): Standar {
  return {
    id: `ver-${version.id}`,
    _versionId: version.id,
    lam_id: String(apiLam.id),
    _lamNumId: apiLam.id,
    version_name: version.version_name ?? `Standar ${version.year}`,
    year: version.year,
    is_active: version.is_active,
    thresholds: apiLam.thresholds.map((t) => ({
      indicator_id: t.indicator_id,
      indicator_name: t.indicator_name,
      baik_threshold_id: t.baik.threshold_id,
      baik: t.baik.value,
      unggul_threshold_id: t.unggul.threshold_id,
      unggul: t.unggul.value,
    })),
  };
}

// ─────────────────────────────────────────────
// Form defaults & validation
// ─────────────────────────────────────────────

const defaultLamForm = () => ({ name: "", code: "", programs: [] as string[] });
export type LamFormErrors = { name?: string; code?: string; programs?: string };

const validateLam = (f: ReturnType<typeof defaultLamForm>): LamFormErrors => {
  const e: LamFormErrors = {};
  if (!f.name.trim()) e.name = "Nama LAM wajib diisi";
  if (!f.code.trim()) e.code = "Kode wajib diisi";
  else if (!/^[A-Z0-9_-]{2,20}$/.test(f.code.trim()))
    e.code = "Kode 2-20 karakter (huruf kapital, angka, - atau _)";
  if (f.programs.length === 0) e.programs = "Pilih minimal satu prodi";
  return e;
};

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

const validateStandar = (f: ReturnType<typeof defaultStandarForm>): StandarFormErrors => {
  const e: StandarFormErrors = {};
  if (!f.lam_id) e.lam_id = "Pilih LAM";
  if (!f.version_name.trim()) e.version_name = "Nama standar wajib diisi";
  const y = Number(f.year);
  if (!y || Number.isNaN(y)) e.year = "Tahun wajib diisi";
  else if (y < 2000 || y > 2100) e.year = "Tahun 2000 - 2100";

  const tErrs: Record<number, { baik?: string; unggul?: string }> = {};
  f.thresholds.forEach((t) => {
    const row: { baik?: string; unggul?: string } = {};
    if (t.baik == null || Number.isNaN(t.baik)) row.baik = "Wajib";
    else if (t.baik < 0 || t.baik > 100) row.baik = "0 - 100";
    if (t.unggul == null || Number.isNaN(t.unggul)) row.unggul = "Wajib";
    else if (t.unggul < 0 || t.unggul > 100) row.unggul = "0 - 100";
    else if (!row.baik && t.unggul < t.baik) row.unggul = "Harus ≥ Baik";
    if (row.baik || row.unggul) tErrs[t.indicator_id] = row;
  });
  if (Object.keys(tErrs).length) e.thresholds = tErrs;
  return e;
};

// ─────────────────────────────────────────────
// Hook utama
// ─────────────────────────────────────────────

export const useThresholdManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── state ──
  const [lams, setLams] = useState<Lam[]>([]);
  const [standars, setStandars] = useState<Standar[]>([]);
  const [allPrograms, setAllPrograms] = useState<{ id: number; name: string; degree?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLam, setFilterLam] = useState("all");

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

  // ── initial fetch ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [lamsRes, programsRes] = await Promise.all([
          apiService.getLams(),
          apiService.getPrograms(),
        ]);

        const apiLams = lamsRes.data ?? [];
        setLams(apiLams.map(mapApiLam));

        // Bangun daftar Standar dari semua version di tiap LAM
        const builtStandars: Standar[] = [];
        apiLams.forEach((apiLam) => {
          apiLam.versions.forEach((ver) => {
            builtStandars.push(mapApiStandar(apiLam, ver));
          });
        });
        setStandars(builtStandars);

        setAllPrograms(programsRes.data ?? (programsRes as any) ?? []);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? "Gagal memuat data";
        setError(msg);
        toast({ title: "Gagal memuat data", description: msg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── derived ──
  const ALL_PRODI = useMemo(
    () => allPrograms.map((p) => ({ id: p.id, label: `${p.name}${p.degree ? ` (${p.degree})` : ""}` })),
    [allPrograms],
  );

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
    return ALL_PRODI.filter((p) => p.label.toLowerCase().includes(q));
  }, [ALL_PRODI, prodiSearch]);

  const lamFormErrors = useMemo(() => validateLam(lamForm), [lamForm]);
  const isLamFormValid = useMemo(() => Object.keys(lamFormErrors).length === 0, [lamFormErrors]);
  const stdFormErrors = useMemo(() => validateStandar(stdForm), [stdForm]);
  const isStdFormValid = useMemo(() => Object.keys(stdFormErrors).length === 0, [stdFormErrors]);

  // ─────────────────────────────────────────
  // LAM actions
  // ─────────────────────────────────────────

  const openAddLam = () => {
    setEditingLam(null);
    setLamForm(defaultLamForm());
    setProdiSearch("");
    setIsLamDialogOpen(true);
  };

  const openEditLam = (l: Lam) => {
    setEditingLam(l);
    setLamForm({ name: l.name, code: l.code, programs: l.programs.slice() });
    setProdiSearch("");
    setIsLamDialogOpen(true);
  };

  const toggleProdi = (label: string) => {
    setLamForm((f) => ({
      ...f,
      programs: f.programs.includes(label)
        ? f.programs.filter((p) => p !== label)
        : [...f.programs, label],
    }));
  };

  const toggleAllVisibleProdi = (select: boolean) => {
    const visibleLabels = filteredProdiOptions.map((p) => p.label);
    setLamForm((f) =>
      select
        ? { ...f, programs: Array.from(new Set([...f.programs, ...visibleLabels])) }
        : { ...f, programs: f.programs.filter((p) => !visibleLabels.includes(p)) },
    );
  };

  const submitLam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLamFormValid) {
      toast({ title: "Form belum valid", description: "Periksa isian merah", variant: "destructive" });
      return;
    }
    setSubmittingLam(true);

    // Resolve program_ids dari label yang dipilih
    const selectedProgramIds = lamForm.programs
      .map((label) => ALL_PRODI.find((p) => p.label === label)?.id)
      .filter((id): id is number => id !== undefined);

    try {
      if (editingLam) {
        // ── Edit LAM ──
        // 1. Update nama & kode
        await apiService.updateLam(editingLam._numId, {
          name: lamForm.name,
          code: lamForm.code,
        });

        // 2. Hitung diff prodi: yang baru ditambahkan & yang di-uncheck
        const prevIds = editingLam._programIds;
        const addedIds = selectedProgramIds.filter((id) => !prevIds.includes(id));
        const removedIds = prevIds.filter((id) => !selectedProgramIds.includes(id));

        if (addedIds.length > 0) {
          await apiService.addLamProgram({ lam_id: editingLam._numId, program_ids: addedIds });
        }
        for (const pid of removedIds) {
          await apiService.removeLamProgram({ lam_id: editingLam._numId, program_id: pid });
        }

        // 3. Update local state
        setLams((prev) =>
          prev.map((l) =>
            l.id === editingLam.id
              ? {
                  ...l,
                  name: lamForm.name,
                  code: lamForm.code,
                  programs: lamForm.programs,
                  _programIds: selectedProgramIds,
                }
              : l,
          ),
        );
        toast({ title: "LAM diperbarui", description: lamForm.name });
      } else {
        // ── Tambah LAM baru ──
        const lamRes = await apiService.createLam({
          name: lamForm.name,
          code: lamForm.code,
          program_ids: selectedProgramIds,
        });
        const newLamId = lamRes.data!.id;

        // Tambah ke local state
        const newLam: Lam = {
          id: String(newLamId),
          _numId: newLamId,
          name: lamForm.name,
          code: lamForm.code,
          programs: lamForm.programs,
          _programIds: selectedProgramIds,
        };
        setLams((prev) => [...prev, newLam]);
        toast({ title: "LAM ditambahkan", description: lamForm.name });
      }

      setIsLamDialogOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Kesalahan";
      toast({ title: "Gagal menyimpan LAM", description: msg, variant: "destructive" });
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
    const target = lams.find((l) => l.id === deletingLamId);
    if (!target) return;

    try {
      await apiService.deleteLam(target._numId);
      setLams((prev) => prev.filter((l) => l.id !== deletingLamId));
      // Hapus juga standar yang terkait (cascade sudah dilakukan backend)
      setStandars((prev) => prev.filter((s) => s.lam_id !== deletingLamId));
      toast({ title: "LAM dihapus", description: target.name });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Gagal menghapus LAM";
      toast({ title: "Gagal menghapus", description: msg, variant: "destructive" });
    } finally {
      setIsLamDeleteOpen(false);
      setDeletingLamId(null);
    }
  };

  // ─────────────────────────────────────────
  // Standar actions
  // ─────────────────────────────────────────

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

    const selectedLam = lams.find((l) => l.id === stdForm.lam_id);
    if (!selectedLam) {
      toast({ title: "LAM tidak ditemukan", variant: "destructive" });
      setSubmittingStd(false);
      return;
    }

    try {
      if (editingStandar) {
        // ── Edit Standar ──
        // 1. Toggle status jika berubah
        if (editingStandar.is_active !== stdForm.is_active) {
          await apiService.updateLamVersionStatus(editingStandar._versionId, stdForm.is_active);
        }

        // 2. Update threshold (kirim semua karena form edit selalu overwrite)
        const bulkPayload: ThresholdBulkUpdateItem[] = stdForm.thresholds.map((t) => ({
          indicator_id: t.indicator_id,
          baik_id: t.baik_threshold_id!,
          baik_value: t.baik,
          unggul_id: t.unggul_threshold_id!,
          unggul_value: t.unggul,
        }));
        const res = await apiService.bulkUpdateThresholds(editingStandar._versionId, bulkPayload);

        // 3. Update local state
        setStandars((prev) =>
          prev.map((s) =>
            s.id === editingStandar.id
              ? {
                  ...s,
                  version_name: stdForm.version_name,
                  year: stdForm.year,
                  is_active: stdForm.is_active,
                  thresholds: (res.data?.thresholds ?? []).map((t) => ({
                    indicator_id: t.indicator_id,
                    indicator_name: t.indicator_name,
                    baik_threshold_id: t.baik.threshold_id,
                    baik: t.baik.value,
                    unggul_threshold_id: t.unggul.threshold_id,
                    unggul: t.unggul.value,
                  })),
                }
              : s,
          ),
        );
        toast({ title: "Standar diperbarui", description: stdForm.version_name });
      } else {
        // ── Tambah Standar baru (3 step) ──
        // Step 1 — sudah punya lam_id, langsung ke step 2
        const verRes = await apiService.createLamVersion({
          lam_id: selectedLam._numId,
          year: stdForm.year,
          version_name: stdForm.version_name,
        });
        const versionId = verRes.data!.id;

        // Step 2 — bulk create threshold
        const bulkPayload: ThresholdBulkCreateItem[] = stdForm.thresholds.map((t) => ({
          indicator_id: t.indicator_id,
          baik: t.baik,
          unggul: t.unggul,
        }));
        const bulkRes = await apiService.bulkCreateThresholds(versionId, bulkPayload);

        // Step 3 — update local state
        const newStandar: Standar = {
          id: `ver-${versionId}`,
          _versionId: versionId,
          lam_id: stdForm.lam_id,
          _lamNumId: selectedLam._numId,
          version_name: stdForm.version_name,
          year: stdForm.year,
          is_active: verRes.data!.is_active,
          thresholds: (bulkRes.data?.thresholds ?? []).map((t) => ({
            indicator_id: t.indicator_id,
            indicator_name: t.indicator_name,
            baik_threshold_id: t.baik.threshold_id,
            baik: t.baik.value,
            unggul_threshold_id: t.unggul.threshold_id,
            unggul: t.unggul.value,
          })),
        };
        setStandars((prev) => [...prev, newStandar]);
        toast({ title: "Standar ditambahkan", description: stdForm.version_name });
      }

      setIsStdDialogOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Kesalahan";
      toast({ title: "Gagal menyimpan standar", description: msg, variant: "destructive" });
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
    const target = standars.find((s) => s.id === deletingStdId);
    if (!target) return;

    try {
      // Backend belum punya dedicated DELETE /lam-versions/{id},
      // tapi cascade hapus lewat DELETE /lams sudah cover.
      // Jika backend expose endpoint-nya, ganti baris ini:
      // await apiService.deleteLamVersion(target._versionId);
      setStandars((prev) => prev.filter((s) => s.id !== deletingStdId));
      toast({ title: "Standar dihapus", description: target.version_name });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Gagal menghapus standar";
      toast({ title: "Gagal menghapus", description: msg, variant: "destructive" });
    } finally {
      setIsStdDeleteOpen(false);
      setDeletingStdId(null);
    }
  };

  const toggleStandarStatus = async (id: string) => {
    const target = standars.find((s) => s.id === id);
    if (!target) return;
    const next = !target.is_active;

    try {
      await apiService.updateLamVersionStatus(target._versionId, next);
      setStandars((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: next } : s)),
      );
      toast({
        title: next ? "Standar diaktifkan" : "Standar dinonaktifkan",
        description: `${target.version_name} sekarang ${next ? "aktif" : "tidak aktif"}`,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Gagal update status";
      toast({ title: "Gagal update status", description: msg, variant: "destructive" });
    }
  };

  // ─────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────

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
    /** Sekarang bertipe { id: number; label: string }[] — update page jika perlu */
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