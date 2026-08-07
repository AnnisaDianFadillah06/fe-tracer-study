/**
 * src/hooks/useThresholdManagement.ts
 *
 * Perubahan dari versi sebelumnya:
 * - THRESHOLD_INDICATORS tidak lagi array statis — di-fetch dari
 *   GET /api/threshold-indicators (bawa dynamic_param_unit & is_system_calculated).
 * - IndicatorThreshold punya field baru: param_value.
 * - Indikator dengan is_system_calculated = true (tracer_response) tidak wajib
 *   diisi baik/unggul di form — dihitung otomatis oleh BE.
 * - submitStandar mengirim param_value ke bulk endpoint untuk indikator dinamis.
 */

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/common/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  apiService,
  type Lam as ApiLam,
  type LamVersion,
  type ThresholdIndicatorMeta,
  type ThresholdBulkCreateItem,
  type ThresholdBulkUpdateItem,
  type TracerResponseBreakdown,
} from "@/lib/apiClient";

// ─────────────────────────────────────────────
// Local types
// ─────────────────────────────────────────────

export type IndicatorThreshold = {
  indicator_id: number;
  indicator_name: string;       // sudah terinterpolasi dari BE (mis. "Lulusan Bekerja ≤ 4 Bulan")
  baik_threshold_id?: number;
  baik: number;
  unggul_threshold_id?: number;
  unggul: number;
  /** hanya relevan kalau indikator punya dynamic_param_unit (employment_time / salary_above_ump) */
  param_value?: number | null;
  /** true untuk tracer_response — nilainya dihitung sistem, bukan dari kolom baik/unggul di sini */
  is_system_calculated?: boolean;
};

export interface Lam {
  id: string;
  _numId: number;
  name: string;
  code: string;
  programs: string[];
  _programIds: number[];
}

export interface Standar {
  id: string;
  _versionId: number;
  lam_id: string;
  _lamNumId: number;
  version_name: string;
  year: number;
  year_end: number | null; // null = versi ini masih berlaku sampai sekarang
  is_active: boolean;
  thresholds: IndicatorThreshold[];
}

/** "2021–2022" kalau sudah digantikan versi berikutnya, "2026–sekarang" kalau masih berlaku */
export const formatVersionRange = (year: number, yearEnd: number | null): string =>
  yearEnd ? `${year}–${yearEnd}` : `${year}–sekarang`;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

// Indikator system-calculated (tracer_response) tidak pernah punya baris di sini —
// BE menolak (422) kalau indicator_id-nya ikut terkirim di payload bulk create/update.
const makeDefaultThresholds = (indicators: ThresholdIndicatorMeta[]): IndicatorThreshold[] =>
  indicators
    .filter((i) => !i.is_system_calculated)
    .map((i) => ({
      indicator_id: i.id,
      indicator_name: i.name,
      baik: 0,
      unggul: 0,
      param_value: i.dynamic_param_unit ? 0 : undefined,
    }));

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

function mapApiStandar(apiLam: ApiLam, version: LamVersion): Standar {
  const versionThresholds = (version as any).thresholds ?? apiLam.thresholds ?? [];
  return {
    id: `ver-${version.id}`,
    _versionId: version.id,
    lam_id: String(apiLam.id),
    _lamNumId: apiLam.id,
    version_name: version.version_name ?? `Standar ${version.year}`,
    year: version.year,
    year_end: version.year_end ?? null,
    is_active: version.is_active,
    thresholds: versionThresholds.map((t: any) => ({
      indicator_id: t.indicator_id,
      indicator_name: t.indicator_name,
      baik_threshold_id: t.baik?.threshold_id,
      baik: t.baik?.value ?? 0,
      unggul_threshold_id: t.unggul?.threshold_id,
      unggul: t.unggul?.value ?? 0,
      param_value: t.dynamic_param?.value ?? undefined,
      is_system_calculated: t.is_system_calculated,
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

const defaultStandarForm = (indicators: ThresholdIndicatorMeta[]) => ({
  lam_id: "",
  version_name: "",
  year: new Date().getFullYear(),
  is_active: true,
  thresholds: makeDefaultThresholds(indicators),
});
export type StandarFormErrors = {
  lam_id?: string;
  version_name?: string;
  year?: string;
  thresholds?: Record<number, { baik?: string; unggul?: string; param_value?: string }>;
};

const validateStandar = (
  f: ReturnType<typeof defaultStandarForm>,
  indicators: ThresholdIndicatorMeta[],
): StandarFormErrors => {
  const e: StandarFormErrors = {};
  if (!f.lam_id) e.lam_id = "Pilih LAM";
  if (!f.version_name.trim()) e.version_name = "Nama standar wajib diisi";
  const y = Number(f.year);
  if (!y || Number.isNaN(y)) e.year = "Tahun wajib diisi";
  else if (y < 2000 || y > 2100) e.year = "Tahun 2000 - 2100";

  const indicatorById = Object.fromEntries(indicators.map((i) => [i.id, i]));
  const tErrs: Record<number, { baik?: string; unggul?: string; param_value?: string }> = {};

  f.thresholds.forEach((t) => {
    const meta = indicatorById[t.indicator_id];
    const row: { baik?: string; unggul?: string; param_value?: string } = {};

    // Indikator system-calculated (tracer_response): baik/unggul tidak divalidasi,
    // BE yang menghitung otomatis.
    if (!meta?.is_system_calculated) {
      if (t.baik == null || Number.isNaN(t.baik)) row.baik = "Wajib";
      else if (t.baik < 0 || t.baik > 100) row.baik = "0 - 100";
      if (t.unggul == null || Number.isNaN(t.unggul)) row.unggul = "Wajib";
      else if (t.unggul < 0 || t.unggul > 100) row.unggul = "0 - 100";
      else if (!row.baik && t.unggul < t.baik) row.unggul = "Harus ≥ Baik";
    }

    // Indikator dengan parameter dinamis (bulan / multiplier UMP): wajib diisi > 0
    if (meta?.dynamic_param_unit) {
      if (t.param_value == null || Number.isNaN(t.param_value)) row.param_value = "Wajib";
      else if (t.param_value <= 0) row.param_value = "Harus lebih dari 0";
    }

    if (row.baik || row.unggul || row.param_value) tErrs[t.indicator_id] = row;
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
  const [indicators, setIndicators] = useState<ThresholdIndicatorMeta[]>([]); // baru — dari API
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
  const [stdForm, setStdForm] = useState(defaultStandarForm([]));
  const [submittingStd, setSubmittingStd] = useState(false);
  const [isStdDeleteOpen, setIsStdDeleteOpen] = useState(false);
  const [deletingStdId, setDeletingStdId] = useState<string | null>(null);

  /* Breakdown tracer_response (system-calculated) — dibaca langsung dari data yang
     sudah dihitung sistem sebelumnya, bukan dihitung ulang saat modal dibuka. */
  const [tracerBreakdown, setTracerBreakdown] = useState<TracerResponseBreakdown[]>([]);
  const [tracerBreakdownLoading, setTracerBreakdownLoading] = useState(false);

  // ── initial fetch ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [lamsRes, programsRes, indicatorsRes] = await Promise.all([
          apiService.getLams(),
          apiService.getPrograms(),
          apiService.getThresholdIndicators(), // baru
        ]);

        const apiLams = lamsRes.data ?? [];
        setLams(apiLams.map(mapApiLam));

        const builtStandars: Standar[] = [];
        apiLams.forEach((apiLam) => {
          apiLam.versions.forEach((ver) => {
            builtStandars.push(mapApiStandar(apiLam, ver));
          });
        });
        setStandars(builtStandars);

        setAllPrograms(programsRes.data ?? (programsRes as any) ?? []);
        setIndicators(indicatorsRes.data ?? []);
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
  const stdFormErrors = useMemo(() => validateStandar(stdForm, indicators), [stdForm, indicators]);
  const isStdFormValid = useMemo(() => Object.keys(stdFormErrors).length === 0, [stdFormErrors]);

  // ─────────────────────────────────────────
  // LAM actions (tidak berubah)
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

    const selectedProgramIds = lamForm.programs
      .map((label) => ALL_PRODI.find((p) => p.label === label)?.id)
      .filter((id): id is number => id !== undefined);

    try {
      if (editingLam) {
        await apiService.updateLam(editingLam._numId, {
          name: lamForm.name,
          code: lamForm.code,
        });

        const prevIds = editingLam._programIds;
        const addedIds = selectedProgramIds.filter((id) => !prevIds.includes(id));
        const removedIds = prevIds.filter((id) => !selectedProgramIds.includes(id));

        if (addedIds.length > 0) {
          await apiService.addLamProgram({ lam_id: editingLam._numId, program_ids: addedIds });
        }
        for (const pid of removedIds) {
          await apiService.removeLamProgram({ lam_id: editingLam._numId, program_id: pid });
        }

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
        const lamRes = await apiService.createLam({
          name: lamForm.name,
          code: lamForm.code,
          program_ids: selectedProgramIds,
        });
        const newLamId = lamRes.data!.id;

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
    setStdForm({ ...defaultStandarForm(indicators), lam_id: lams[0]?.id ?? "" });
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

  // Baru — untuk indikator dengan dynamic_param_unit (employment_time, salary_above_ump)
  const updateThresholdParam = (indicator_id: number, value: number) => {
    setStdForm((f) => ({
      ...f,
      thresholds: f.thresholds.map((t) =>
        t.indicator_id === indicator_id ? { ...t, param_value: value } : t,
      ),
    }));
  };

  const indicatorById = useMemo(
    () => Object.fromEntries(indicators.map((i) => [i.id, i])),
    [indicators],
  );

  const hasSystemCalculatedIndicator = useMemo(
    () => indicators.some((i) => i.is_system_calculated),
    [indicators],
  );

  // Breakdown tracer_response langsung dimuat begitu modal Standar dibuka & LAM dipilih —
  // tidak menunggu submit, karena nilainya sudah dihitung sistem sebelumnya (event-driven).
  useEffect(() => {
    if (!isStdDialogOpen || !stdForm.lam_id || !hasSystemCalculatedIndicator) {
      setTracerBreakdown([]);
      return;
    }
    const lamNumId = lamById[stdForm.lam_id]?._numId;
    if (!lamNumId) {
      setTracerBreakdown([]);
      return;
    }

    let cancelled = false;
    setTracerBreakdownLoading(true);
    apiService
      .getTracerResponseByLam(lamNumId)
      .then((res) => {
        if (!cancelled) setTracerBreakdown(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setTracerBreakdown([]);
      })
      .finally(() => {
        if (!cancelled) setTracerBreakdownLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isStdDialogOpen, stdForm.lam_id, hasSystemCalculatedIndicator, lamById]);

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
        if (editingStandar.is_active !== stdForm.is_active) {
          await apiService.updateLamVersionStatus(editingStandar._versionId, stdForm.is_active);
        }

        // Indikator system-calculated (tracer_response) tidak dikirim sama sekali —
        // BE menolak (422) request bulk update yang menyertakan indicator_id-nya.
        const bulkPayload: ThresholdBulkUpdateItem[] = stdForm.thresholds
          .filter((t) => !indicatorById[t.indicator_id]?.is_system_calculated)
          .map((t) => {
            const meta = indicatorById[t.indicator_id];
            return {
              indicator_id: t.indicator_id,
              baik_id: t.baik_threshold_id!,
              baik_value: t.baik,
              unggul_id: t.unggul_threshold_id!,
              unggul_value: t.unggul,
              param_value: meta?.dynamic_param_unit ? t.param_value ?? null : undefined,
            };
          });
        const res = await apiService.bulkUpdateThresholds(editingStandar._versionId, bulkPayload);

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
                    param_value: t.dynamic_param?.value ?? undefined,
                    is_system_calculated: t.is_system_calculated,
                  })),
                }
              : s,
          ),
        );
        toast({ title: "Standar diperbarui", description: stdForm.version_name });
      } else {
        const verRes = await apiService.createLamVersion({
          lam_id: selectedLam._numId,
          year: stdForm.year,
          version_name: stdForm.version_name,
        });
        const versionId = verRes.data!.id;

        // Indikator system-calculated (tracer_response) tidak dikirim sama sekali —
        // BE menolak (422) request bulk create yang menyertakan indicator_id-nya.
        const bulkPayload: ThresholdBulkCreateItem[] = stdForm.thresholds
          .filter((t) => !indicatorById[t.indicator_id]?.is_system_calculated)
          .map((t) => {
            const meta = indicatorById[t.indicator_id];
            return {
              indicator_id: t.indicator_id,
              baik: t.baik,
              unggul: t.unggul,
              param_value: meta?.dynamic_param_unit ? t.param_value ?? null : undefined,
            };
          });
        const bulkRes = await apiService.bulkCreateThresholds(versionId, bulkPayload);

        const newStandar: Standar = {
          id: `ver-${versionId}`,
          _versionId: versionId,
          lam_id: stdForm.lam_id,
          _lamNumId: selectedLam._numId,
          version_name: stdForm.version_name,
          year: stdForm.year,
          year_end: verRes.data!.year_end ?? null,
          is_active: verRes.data!.is_active,
          thresholds: (bulkRes.data?.thresholds ?? []).map((t) => ({
            indicator_id: t.indicator_id,
            indicator_name: t.indicator_name,
            baik_threshold_id: t.baik.threshold_id,
            baik: t.baik.value,
            unggul_threshold_id: t.unggul.threshold_id,
            unggul: t.unggul.value,
            param_value: t.dynamic_param?.value ?? undefined,
            is_system_calculated: t.is_system_calculated,
          })),
        };
        setStandars((prev) => [...prev, newStandar]);

        // Data threshold baru ini juga dipakai chart dashboard (react-query cache lain, di luar hook ini).
        // Invalidate supaya begitu pindah ke halaman grafik, tidak menunggu TTL cache BE habis.
        queryClient.invalidateQueries({ queryKey: ["dashboard-thresholds"] });

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
      await apiService.deleteLamVersion(target._versionId);
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

  return {
    /* data */
    lams,
    standars,
    lamById,
    filteredStandar,
    indicators,          // baru — dipakai page menggantikan import THRESHOLD_INDICATORS statis
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
    updateThresholdParam,   // baru
    tracerBreakdown,        // baru — breakdown per prodi utk indikator system-calculated
    tracerBreakdownLoading, // baru
    confirmDeleteStandar,
    deleteStandar,
    isStdDeleteOpen,
    setIsStdDeleteOpen,
    toggleStandarStatus,
  };
};