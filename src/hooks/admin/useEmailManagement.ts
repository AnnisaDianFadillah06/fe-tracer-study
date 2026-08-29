import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useJurusan } from "@/hooks/common/useJurusan";
import { useRingkasanTahun } from "@/hooks/useRingkasanTahun";
import type { EmailSelectionPayload, EmailSelectionState } from "@/types/emailSelection";

interface ProgramOption {
  id: number;
  name: string;
  code: string | null;
  degree: string | null;
  jurusan: string | null;
}

/**
 * Baris alumni untuk tabel "Manajemen Email" -- BEDA dari `Student` di
 * useStudentManagement.ts: mempertahankan `response_status` dan
 * `password_issued_at` yang di sana dibuang saat mapping ke `Student`.
 * `GET /alumni` (AlumniProfileRepository::paginateForAdminWithResponseStatus())
 * SUDAH mengembalikan keduanya -- tidak ada kerja backend baru untuk ini.
 */
export interface EmailAlumniRow {
  id: number;
  nim: string;
  name: string;
  email: string;
  programName: string | null;
  jurusanName: string | null;
  graduationYear: number | null;
  /** null = belum pernah diterbitkan kredensialnya. */
  passwordIssuedAt: string | null;
  responseStatus: "finished" | "ongoing" | "not_started";
  /** Pengiriman email TERAKHIR untuk alumni ini (lintas kind account/reminder) -- null = belum pernah dikirimi apa pun. */
  lastEmail: {
    kind: "account" | "reminder";
    status: "queued" | "sent" | "failed";
    error: string | null;
    at: string | null;
  } | null;
}

const PER_PAGE = 20;

/**
 * Hook data untuk halaman "Manajemen Email" -- LEBIH RINGAN dari
 * useStudentManagement.ts (tidak butuh state CRUD tambah/edit/hapus, hanya
 * baca + seleksi hybrid untuk dua aksi bulk).
 */
export function useEmailManagement() {
  const { jurusanNames: jurusanOptions } = useJurusan();
  const { years: yearSummaries } = useRingkasanTahun();

  const { data: programsResponse } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data } = await api.get("/programs", { params: { include_inactive: true } });
      return data;
    },
    staleTime: 60_000,
    retry: 1,
  });

  const programs: ProgramOption[] = useMemo(() => {
    if (programsResponse?.success && Array.isArray(programsResponse.data)) {
      return programsResponse.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        code: item.code ?? null,
        degree: item.degree ?? null,
        jurusan: item.jurusan ?? null,
      }));
    }
    return [];
  }, [programsResponse]);

  // ── Filter (mengontrol isi tabel DAN scope "pilih semua sesuai filter") ──
  const [year, setYear] = useState("");
  const [jurusan, setJurusan] = useState("");
  const [prodi, setProdi] = useState("");

  const programsCarryJurusan = programs.some((p) => !!p.jurusan);
  const prodiOptions = jurusan && programsCarryJurusan ? programs.filter((p) => p.jurusan === jurusan) : programs;

  /** Ganti filter apa pun membatalkan seleksi -- cakupannya sudah beda. */
  const [selection, setSelection] = useState<EmailSelectionState>({ mode: "page", selected: new Set() });

  const applyFilterChange = useCallback((mutator: () => void) => {
    mutator();
    setSelection({ mode: "page", selected: new Set() });
    setPage(1);
  }, []);

  // ── Daftar alumni (paginated) ─────────────────────────────────────────
  const [page, setPage] = useState(1);

  const buildParams = useCallback((): Record<string, string> => {
    const params: Record<string, string> = { sort: "nim", with_last_email_status: "1" };
    if (year) params.graduation_year = year;
    if (jurusan) params.jurusan = jurusan;
    if (prodi) params.program_id = prodi;
    return params;
  }, [year, jurusan, prodi]);

  const { data: apiResponse, isLoading, isError } = useQuery({
    queryKey: ["alumni-email-management", year, jurusan, prodi, page],
    queryFn: async () => {
      const { data } = await api.get("/alumni", {
        params: { ...buildParams(), per_page: String(PER_PAGE), page: String(page) },
      });
      return data;
    },
    retry: 1,
    staleTime: 15_000,
  });

  const paginationMeta = useMemo(() => {
    const d = apiResponse?.data;
    return { currentPage: d?.current_page ?? 1, lastPage: d?.last_page ?? 1, total: d?.total ?? 0 };
  }, [apiResponse]);

  const rows: EmailAlumniRow[] = useMemo(() => {
    if (!apiResponse?.success || !Array.isArray(apiResponse?.data?.data)) return [];
    return apiResponse.data.data.map((a: any) => ({
      id: a.id,
      nim: a.nim ?? "",
      name: a.name ?? "",
      email: a.email ?? "",
      programName: a.program_name ?? null,
      jurusanName: a.jurusan_name ?? null,
      graduationYear: a.graduation_year ?? null,
      passwordIssuedAt: a.password_issued_at ?? null,
      responseStatus: a.response_status ?? "not_started",
      lastEmail: a.last_email_status
        ? {
            kind: a.last_email_kind,
            status: a.last_email_status,
            error: a.last_email_error ?? null,
            at: a.last_email_at ?? null,
          }
        : null,
    }));
  }, [apiResponse]);

  // ── Seleksi hybrid ──────────────────────────────────────────────────────
  const pageNims = useMemo(() => rows.map((r) => r.nim), [rows]);

  const isRowSelected = useCallback(
    (nim: string): boolean => {
      if (selection.mode === "page") return selection.selected.has(nim);
      return !selection.excluded.has(nim);
    },
    [selection],
  );

  const toggleRow = useCallback((nim: string) => {
    setSelection((prev) => {
      if (prev.mode === "page") {
        const next = new Set(prev.selected);
        if (next.has(nim)) next.delete(nim);
        else next.add(nim);
        return { mode: "page", selected: next };
      }
      const next = new Set(prev.excluded);
      if (next.has(nim)) next.delete(nim);
      else next.add(nim);
      return { mode: "all-filtered", excluded: next };
    });
  }, []);

  const allPageRowsSelected = pageNims.length > 0 && pageNims.every((nim) => isRowSelected(nim));
  const somePageRowsSelected = pageNims.some((nim) => isRowSelected(nim));
  /** Untuk checkbox header: true / false / "indeterminate". */
  const headerCheckboxState: boolean | "indeterminate" = allPageRowsSelected
    ? true
    : somePageRowsSelected
      ? "indeterminate"
      : false;

  const toggleSelectAllOnPage = useCallback(() => {
    setSelection((prev) => {
      if (allPageRowsSelected) {
        // Lepas semua baris halaman ini.
        if (prev.mode === "page") {
          const next = new Set(prev.selected);
          pageNims.forEach((nim) => next.delete(nim));
          return { mode: "page", selected: next };
        }
        const next = new Set(prev.excluded);
        pageNims.forEach((nim) => next.add(nim));
        return { mode: "all-filtered", excluded: next };
      }
      // Centang semua baris halaman ini.
      if (prev.mode === "page") {
        const next = new Set(prev.selected);
        pageNims.forEach((nim) => next.add(nim));
        return { mode: "page", selected: next };
      }
      const next = new Set(prev.excluded);
      pageNims.forEach((nim) => next.delete(nim));
      return { mode: "all-filtered", excluded: next };
    });
  }, [allPageRowsSelected, pageNims]);

  /** "Pilih semua N sesuai filter" -- banner muncul begitu semua baris halaman ini tercentang manual. */
  const selectAllMatchingFilter = useCallback(() => {
    setSelection({ mode: "all-filtered", excluded: new Set() });
  }, []);

  const clearSelection = useCallback(() => {
    setSelection({ mode: "page", selected: new Set() });
  }, []);

  const selectedCount =
    selection.mode === "page" ? selection.selected.size : Math.max(0, paginationMeta.total - selection.excluded.size);

  /**
   * Banner "pilih semua sesuai filter" hanya berguna kalau memang ada
   * baris di luar halaman ini yang belum tercentang.
   */
  const showSelectAllBanner =
    selection.mode === "page" && allPageRowsSelected && paginationMeta.total > pageNims.length;

  const selectionPayload: EmailSelectionPayload = useMemo(() => {
    if (selection.mode === "page") {
      return { nims: Array.from(selection.selected) };
    }
    const payload: EmailSelectionPayload = { excluded_nims: Array.from(selection.excluded) };
    if (year) payload.graduation_year = Number(year);
    if (jurusan) payload.jurusan = jurusan;
    if (prodi) payload.program_id = Number(prodi);
    return payload;
  }, [selection, year, jurusan, prodi]);

  return {
    // filter
    year, jurusan, prodi,
    setYear: (v: string) => applyFilterChange(() => setYear(v)),
    setJurusan: (v: string) => applyFilterChange(() => setJurusan(v)),
    setProdi: (v: string) => applyFilterChange(() => setProdi(v)),
    jurusanOptions, programs, prodiOptions, yearSummaries,
    // list
    rows, isLoading, isError, page, setPage, paginationMeta,
    // seleksi
    selection, isRowSelected, toggleRow,
    headerCheckboxState, toggleSelectAllOnPage,
    showSelectAllBanner, selectAllMatchingFilter, clearSelection,
    selectedCount, selectionPayload,
  };
}
