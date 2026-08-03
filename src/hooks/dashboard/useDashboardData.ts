import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

// ── Types for raw alumni data from backend ────────────────────────────────
export interface AlumniWithResponses {
  id: number;
  nim: string;
  name: string;
  email: string;
  phone: string | null;
  program_id: number | null;
  program_name: string | null;
  graduation_year: number | null;
  created_at: string | null;
  // Joined from responses/employment_records/education_records as needed
  employment_status?: string | null;
  waiting_months?: number | null;
  salary_current?: number | null;
  company_name?: string | null;
  job_title?: string | null;
  work_city?: string | null;
  is_further_study?: boolean;
  institution_name?: string | null;
}

// ── Types for computed dashboard data ─────────────────────────────────────
export interface DashboardSummary {
  totalAlumni: number;
  totalResponden: number;
  partisipasiPersen: number;
  bekerja: number;
  wiraswasta: number;
  studiLanjut: number;
  mencariKerja: number;
  belumBekerja: number;
  avgWaitingMonths: number;
  avgSalary: number;
  byYear: Record<string, YearSummary>;
  byProdi: Record<string, ProdiSummary>;
}

export interface YearSummary {
  total: number;
  bekerja: number;
  wiraswasta: number;
  studiLanjut: number;
  mencariKerja: number;
  avgWaiting: number;
}

export interface ProdiSummary {
  name: string;
  total: number;
  bekerja: number;
  wiraswasta: number;
  avgWaiting: number;
  avgSalary: number;
}

/**
 * Fetches all alumni data from the backend and computes dashboard summaries.
 * This is the single source of truth for all dashboard pages.
 *
 * Uses /api/alumni with a large per_page to get all records.
 * Falls back to empty data if the backend is unavailable.
 */
export function useDashboardData() {
  const query = useQuery({
    queryKey: ["dashboard-alumni-all"],
    queryFn: async (): Promise<AlumniWithResponses[]> => {
      // Fetch all alumni (paginated, get all pages)
      const { data } = await api.get("/alumni", {
        params: { per_page: 1000 },
      });

      if (data.success && data.data?.data) {
        return data.data.data;
      }
      return [];
    },
    staleTime: 60_000, // Cache for 1 minute
    retry: 1,
  });

  const alumni = query.data ?? [];

  // ── Compute summary ───────────────────────────────────────────────────
  const summary: DashboardSummary = computeSummary(alumni);

  return {
    alumni,
    summary,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// ── Summary computation ─────────────────────────────────────────────────
function computeSummary(alumni: AlumniWithResponses[]): DashboardSummary {
  const totalAlumni = alumni.length;
  const totalResponden = alumni.filter((a) => a.employment_status).length;

  const bekerja = alumni.filter((a) => a.employment_status === "employed").length;
  const wiraswasta = alumni.filter((a) => a.employment_status === "entrepreneur").length;
  const studiLanjut = alumni.filter((a) => a.is_further_study).length;
  const mencariKerja = alumni.filter((a) => a.employment_status === "seeking_work").length;
  const belumBekerja = totalAlumni - bekerja - wiraswasta - studiLanjut - mencariKerja;

  const withWaiting = alumni.filter(
    (a) => a.waiting_months !== null && a.waiting_months !== undefined
  );
  const avgWaitingMonths =
    withWaiting.length > 0
      ? withWaiting.reduce((sum, a) => sum + (a.waiting_months ?? 0), 0) /
        withWaiting.length
      : 0;

  const withSalary = alumni.filter(
    (a) => a.salary_current !== null && a.salary_current !== undefined && a.salary_current > 0
  );
  const avgSalary =
    withSalary.length > 0
      ? withSalary.reduce((sum, a) => sum + (a.salary_current ?? 0), 0) /
        withSalary.length
      : 0;

  // Group by year
  const byYear: Record<string, YearSummary> = {};
  alumni.forEach((a) => {
    const year = a.graduation_year ? String(a.graduation_year) : "unknown";
    if (!byYear[year]) {
      byYear[year] = {
        total: 0,
        bekerja: 0,
        wiraswasta: 0,
        studiLanjut: 0,
        mencariKerja: 0,
        avgWaiting: 0,
      };
    }
    byYear[year].total++;
    if (a.employment_status === "employed") byYear[year].bekerja++;
    if (a.employment_status === "entrepreneur") byYear[year].wiraswasta++;
    if (a.is_further_study) byYear[year].studiLanjut++;
    if (a.employment_status === "seeking_work") byYear[year].mencariKerja++;
  });

  // Compute avgWaiting per year
  Object.keys(byYear).forEach((year) => {
    const yearAlumni = alumni.filter(
      (a) => String(a.graduation_year) === year && a.waiting_months != null
    );
    byYear[year].avgWaiting =
      yearAlumni.length > 0
        ? yearAlumni.reduce((s, a) => s + (a.waiting_months ?? 0), 0) /
          yearAlumni.length
        : 0;
  });

  // Group by prodi
  const byProdi: Record<string, ProdiSummary> = {};
  alumni.forEach((a) => {
    const prodi = a.program_name ?? "Unknown";
    if (!byProdi[prodi]) {
      byProdi[prodi] = {
        name: prodi,
        total: 0,
        bekerja: 0,
        wiraswasta: 0,
        avgWaiting: 0,
        avgSalary: 0,
      };
    }
    byProdi[prodi].total++;
    if (a.employment_status === "employed") byProdi[prodi].bekerja++;
    if (a.employment_status === "entrepreneur") byProdi[prodi].wiraswasta++;
  });

  // Compute avgWaiting & avgSalary per prodi
  Object.keys(byProdi).forEach((prodi) => {
    const prodiAlumni = alumni.filter((a) => (a.program_name ?? "Unknown") === prodi);

    const withW = prodiAlumni.filter((a) => a.waiting_months != null);
    byProdi[prodi].avgWaiting =
      withW.length > 0
        ? withW.reduce((s, a) => s + (a.waiting_months ?? 0), 0) / withW.length
        : 0;

    const withS = prodiAlumni.filter(
      (a) => a.salary_current != null && a.salary_current > 0
    );
    byProdi[prodi].avgSalary =
      withS.length > 0
        ? withS.reduce((s, a) => s + (a.salary_current ?? 0), 0) / withS.length
        : 0;
  });

  return {
    totalAlumni,
    totalResponden,
    partisipasiPersen:
      totalAlumni > 0 ? (totalResponden / totalAlumni) * 100 : 0,
    bekerja,
    wiraswasta,
    studiLanjut,
    mencariKerja,
    belumBekerja,
    avgWaitingMonths,
    avgSalary,
    byYear,
    byProdi,
  };
}

// ── Export report ────────────────────────────────────────────────────────
export async function exportAlumniReport() {
  const response = await api.get("/reports/export-alumni", {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = `Laporan_Tracer_Study_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
