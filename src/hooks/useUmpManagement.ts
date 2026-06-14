/**
 * src/hooks/useUmpManagement.ts
 *
 * Hook utama untuk halaman Master UMP.
 * Mengintegrasikan 6 endpoint:
 *   GET  /ump/years
 *   GET  /ump/:tahun
 *   GET  /ump/:tahun/fetch-bps
 *   POST /ump/import           (multipart)
 *   POST /ump/:tahun/bulk-save
 *   PATCH /ump/:tahun/provinces/:id_provinsi
 *   GET  /ump/template         (blob download)
 */

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  apiService,
  type UmpRow,
  type UmpSumber,
  type UmpBulkSavePayloadRow,
} from "@/lib/apiClient";

// ─────────────────────────────────────────────
// Local types
// ─────────────────────────────────────────────

export type { UmpRow, UmpSumber };

export interface UmpState {
  tahun: number;
  sudahTersimpan: boolean;
  rows: UmpRow[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export const useUmpManagement = () => {
  const { toast } = useToast();

  // ── data state ──
  const [years, setYears] = useState<number[]>([]);
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [rows, setRows] = useState<UmpRow[]>([]);
  const [sudahTersimpan, setSudahTersimpan] = useState(false);

  // draft = rows yang sudah di-fetch/import/edit tapi belum di-bulk-save
  const [isDirty, setIsDirty] = useState(false);

  // ── loading flags ──
  const [loadingInit, setLoadingInit]     = useState(true);
  const [loadingYear, setLoadingYear]     = useState(false);
  const [fetching, setFetching]           = useState(false);
  const [importing, setImporting]         = useState(false);
  const [saving, setSaving]               = useState(false);

  // ── inline edit ──
  const [editingIdx, setEditingIdx]       = useState<number | null>(null);
  const [editingValue, setEditingValue]   = useState<string>("");

  // ── add year modal ──
  const [addYearOpen, setAddYearOpen]     = useState(false);
  const [newYearInput, setNewYearInput]   = useState<string>(
    String(new Date().getFullYear())
  );

  // ── confirm save dialog (ada baris kosong) ──
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [emptyProvinsi, setEmptyProvinsi]     = useState<string[]>([]);

  // ── banner ──
  const [banner, setBanner] = useState<{
    kind: "success" | "warning" | "error";
    text: string;
  } | null>(null);

  // ─────────────────────────────────────────
  // Initial load — ambil list tahun + data tahun terbaru
  // ─────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      setLoadingInit(true);
      try {
        const res = await apiService.getUmpYears();
        const sortedYears = (res.data ?? []).sort((a, b) => b - a);
        setYears(sortedYears);

        if (sortedYears.length > 0) {
          await loadYear(sortedYears[0]);
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? "Gagal memuat data UMP";
        toast({ title: "Gagal memuat data", description: msg, variant: "destructive" });
      } finally {
        setLoadingInit(false);
      }
    };
    init();
  }, []);

  // ─────────────────────────────────────────
  // Load data satu tahun dari DB
  // ─────────────────────────────────────────

  const loadYear = async (tahun: number) => {
    setLoadingYear(true);
    setIsDirty(false);
    setBanner(null);
    try {
      const res = await apiService.getUmpByTahun(tahun);
      setActiveYear(tahun);
      setRows(res.data.rows);
      setSudahTersimpan(res.data.sudah_tersimpan);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Gagal memuat data tahun";
      toast({ title: `Gagal memuat UMP ${tahun}`, description: msg, variant: "destructive" });
    } finally {
      setLoadingYear(false);
    }
  };

  // ─────────────────────────────────────────
  // Pilih tahun dari dropdown
  // ─────────────────────────────────────────

  const handleSelectYear = async (val: string) => {
    if (val === "__add__") {
      setAddYearOpen(true);
      return;
    }
    await loadYear(Number(val));
  };

  // ─────────────────────────────────────────
  // Tambah tahun baru (buat draft kosong)
  // ─────────────────────────────────────────

  const handleAddYear = async () => {
    const y = Number(newYearInput);
    if (!y || y < 2000 || y > 2100) {
      toast({ title: "Tahun tidak valid", description: "Masukkan tahun 4 digit (2000–2100)." });
      return;
    }
    if (years.includes(y)) {
      toast({ title: "Tahun sudah ada", description: `Data UMP ${y} sudah tersedia.` });
      setAddYearOpen(false);
      await loadYear(y);
      return;
    }

    // Buat draft kosong — load dari API supaya dapat 34 baris KOSONG dari master
    setAddYearOpen(false);
    setLoadingYear(true);
    try {
      const res = await apiService.getUmpByTahun(y);
      setActiveYear(y);
      setRows(res.data.rows);
      setSudahTersimpan(false);
      setIsDirty(false);
      // Tambahkan ke list tahun (belum tersimpan, tapi sudah bisa di-fetch/import)
      setYears((prev) => [y, ...prev]);
      setBanner({
        kind: "warning",
        text: `Tahun ${y} ditambahkan. Tabel masih kosong — gunakan Fetch BPS atau Import Excel.`,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Gagal membuat tahun baru";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    } finally {
      setLoadingYear(false);
    }
  };

  // ─────────────────────────────────────────
  // Fetch BPS
  // ─────────────────────────────────────────

  const handleFetchBps = async () => {
    if (!activeYear) return;
    setFetching(true);
    setBanner(null);
    try {
      const res = await apiService.fetchUmpFromBps(activeYear);
      setRows(res.data.rows);
      setIsDirty(true);
      const { ok_count, fail_count } = res.data;
      const allFailed = ok_count === 0 && fail_count > 0;
        setBanner({
        kind: allFailed ? "error" : fail_count > 0 ? "warning" : "success",
        text: allFailed
            ? `Data UMP ${activeYear} tidak tersedia di BPS. Gunakan Import Excel atau isi manual.`
            : `${ok_count} provinsi berhasil difetch dari BPS.` +
            (fail_count > 0 ? ` ${fail_count} provinsi gagal, isi manual.` : ""),
        });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Gagal fetch BPS";
      toast({ title: "Gagal fetch BPS", description: msg, variant: "destructive" });
      setBanner({ kind: "error", text: msg });
    } finally {
      setFetching(false);
    }
  };

  // ─────────────────────────────────────────
  // Import Excel/CSV
  // ─────────────────────────────────────────

  const handleImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.csv";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setImporting(true);
      setBanner(null);
      try {
        const res = await apiService.importUmpFile(file);

        if (!res.success) {
          toast({ title: "Import gagal", description: res.message, variant: "destructive" });
          return;
        }

        setRows(res.data.rows);
        setIsDirty(true);

        // Jika tahun dari file berbeda dengan activeYear, update
        if (res.data.tahun && res.data.tahun !== activeYear) {
          setActiveYear(res.data.tahun);
          if (!years.includes(res.data.tahun)) {
            setYears((prev) => [res.data.tahun!, ...prev]);
          }
        }

        const unrecognized = res.data.unrecognized ?? [];
        setBanner({
          kind: unrecognized.length > 0 ? "warning" : "success",
          text:
            `Import selesai dari "${file.name}". ${res.data.ok_count} baris berhasil.` +
            (unrecognized.length > 0
              ? ` ${unrecognized.length} nama provinsi tidak dikenali: ${unrecognized.join(", ")}.`
              : ""),
        });
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? "Gagal import file";
        toast({ title: "Gagal import", description: msg, variant: "destructive" });
        setBanner({ kind: "error", text: msg });
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  // ─────────────────────────────────────────
  // Download template
  // ─────────────────────────────────────────

  const handleDownloadTemplate = async () => {
    try {
      const blob = await apiService.downloadUmpTemplate();
      downloadBlob(blob, "template_ump.csv");
      toast({ title: "Template diunduh", description: "template_ump.csv" });
    } catch (err: any) {
      toast({ title: "Gagal download template", variant: "destructive" });
    }
  };

  // ─────────────────────────────────────────
  // Inline edit (optimistic — simpan ke state lokal, PATCH ke API)
  // ─────────────────────────────────────────

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditingValue(rows[idx].nilai_ump != null ? String(rows[idx].nilai_ump) : "");
  };

  const commitEdit = async () => {
    if (editingIdx == null || !activeYear) return;

    const raw = editingValue.replace(/[^\d]/g, "");
    const num = raw ? Number(raw) : null;
    const targetRow = rows[editingIdx];

    // Update lokal dulu (optimistic)
    setRows((prev) =>
      prev.map((r, i) =>
        i === editingIdx
          ? { ...r, nilai_ump: num, sumber: "MANUAL" as UmpSumber, error_msg: null }
          : r
      )
    );
    setEditingIdx(null);
    setEditingValue("");

    // Kalau sudah tersimpan sebelumnya → langsung PATCH ke API
    if (sudahTersimpan && num !== null) {
      try {
        await apiService.updateUmpSingle(activeYear, targetRow.id_provinsi, num);
        toast({
          title: "Berhasil diperbarui",
          description: `UMP ${targetRow.nama_provinsi} diperbarui.`,
        });
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? "Gagal update";
        toast({ title: "Gagal update", description: msg, variant: "destructive" });
        // Rollback
        setRows((prev) =>
          prev.map((r, i) => (i === editingIdx ? targetRow : r))
        );
        return;
      }
    } else {
      // Belum tersimpan → tandai dirty supaya Simpan Semua aktif
      setIsDirty(true);
    }
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setEditingValue("");
  };

  // ─────────────────────────────────────────
  // Bulk Save
  // ─────────────────────────────────────────

  const handleSaveClick = () => {
    const empties = rows
      .filter((r) => r.nilai_ump == null)
      .map((r) => r.nama_provinsi);

    if (empties.length > 0) {
      setEmptyProvinsi(empties);
      setConfirmSaveOpen(true);
      return;
    }
    void doSave();
  };

  const doSave = async () => {
    if (!activeYear) return;
    setSaving(true);
    setConfirmSaveOpen(false);

    const payload: UmpBulkSavePayloadRow[] = rows.map((r) => ({
      id_provinsi: r.id_provinsi,
      nilai_ump: r.nilai_ump,
      sumber: r.sumber === "KOSONG" || r.sumber === "GAGAL" ? "MANUAL" : r.sumber,
    }));

    try {
      const res = await apiService.bulkSaveUmp(activeYear, payload);
      setIsDirty(false);
      setSudahTersimpan(true);

      // Refresh dari DB supaya id terisi
      const refreshed = await apiService.getUmpByTahun(activeYear);
      setRows(refreshed.data.rows);

      // Pastikan tahun ada di list
      setYears((prev) =>
        prev.includes(activeYear) ? prev : [activeYear, ...prev].sort((a, b) => b - a)
      );

      setBanner({
        kind: "success",
        text: `Data UMP ${activeYear} berhasil disimpan. ${res.data.saved_count} provinsi tersimpan${res.data.skipped_count > 0 ? `, ${res.data.skipped_count} dilewati` : ""}.`,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Gagal menyimpan";
      toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" });
      setBanner({ kind: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────
  // Batalkan perubahan (reload dari DB)
  // ─────────────────────────────────────────

  const handleDiscard = async () => {
    if (!activeYear) return;
    await loadYear(activeYear);
    setBanner(null);
  };

  // ─────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────

  const filledCount = useMemo(
    () => rows.filter((r) => r.nilai_ump != null).length,
    [rows]
  );

  const isAnyLoading = loadingInit || loadingYear || fetching || importing || saving;

  // ─────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────

  return {
    // data
    years,
    activeYear,
    rows,
    sudahTersimpan,
    isDirty,
    filledCount,

    // loading
    loadingInit,
    loadingYear,
    fetching,
    importing,
    saving,
    isAnyLoading,

    // year selector
    handleSelectYear,
    addYearOpen,
    setAddYearOpen,
    newYearInput,
    setNewYearInput,
    handleAddYear,

    // actions
    handleFetchBps,
    handleImportClick,
    handleDownloadTemplate,
    handleSaveClick,
    doSave,
    handleDiscard,

    // inline edit
    editingIdx,
    editingValue,
    setEditingValue,
    startEdit,
    commitEdit,
    cancelEdit,

    // confirm save dialog
    confirmSaveOpen,
    setConfirmSaveOpen,
    emptyProvinsi,

    // banner
    banner,
    setBanner,
  };
};