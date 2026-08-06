import api from "@/lib/api";

/**
 * Ekspor jawaban satu kuesioner ke Excel.
 *
 * Dipakai bersama oleh Kelola Kuisioner (admin) dan Hasil Kuesioner
 * (kajur/kaprodi/wadir) supaya aturan pemanggilannya tidak bercabang dua.
 * Cakupan data ditentukan backend dari role pemanggil: head_tracer,
 * tracer_team, dan wadir dapat seluruh prodi; kajur dibatasi jurusannya;
 * kaprodi dibatasi prodinya.
 */

export interface ExportableQuestionnaire {
  id: number;
  code: string;
  title: string;
  period_year: number;
  target_graduation_years?: number[] | null;
}

/** "label" = jawaban jadi teks (untuk dibaca), "code" = angka mentah (unggah DIKTI). */
export type ExportFormat = "label" | "code";

export interface ExportResult {
  ok: boolean;
  /** Pesan siap tampil di toast, baik untuk sukses maupun gagal. */
  message: string;
  tahunLulus?: number;
}

/**
 * Endpoint mewajibkan SATU tahun lulus. Sumbu yang dipakai adalah Tahun
 * Lulusan (target_graduation_years), bukan period_year yang merupakan tahun
 * pelaksanaan kuesioner. period_year hanya cadangan kalau targetnya kosong.
 */
export function resolveTahunLulus(form: ExportableQuestionnaire): number | null {
  if (form.target_graduation_years?.length) {
    return Math.max(...form.target_graduation_years);
  }
  return form.period_year || null;
}

export async function exportQuestionnaire(
  form: ExportableQuestionnaire,
  format: ExportFormat = "label",
): Promise<ExportResult> {
  const tahunLulus = resolveTahunLulus(form);

  if (!tahunLulus) {
    return {
      ok: false,
      message: "Kuisioner ini belum punya Tahun Lulusan, jadi data tidak bisa diekspor.",
    };
  }

  try {
    const response = await api.get("/reports/export-alumni", {
      params: { questionnaire_id: form.id, tahun_lulus: tahunLulus, format },
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: String(response.headers["content-type"] || "application/octet-stream"),
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const suffix = format === "code" ? "_kode" : "";
    link.download = `export_${form.code}_${tahunLulus}${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);

    return {
      ok: true,
      tahunLulus,
      message: `File Excel untuk "${form.title}" (Lulusan ${tahunLulus}) sedang diunduh.`,
    };
  } catch (err: unknown) {
    return { ok: false, message: await readErrorMessage(err) };
  }
}

/** Bentuk body galat yang dikirim backend Laravel. */
interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * responseType blob bikin body error ikut jadi Blob, jadi pesan asli dari API
 * harus dibaca ulang sebagai teks. Tanpa ini galat validasi (mis. tahun_lulus
 * kosong) terbaca sebagai masalah akses.
 */
async function readErrorMessage(err: unknown): Promise<string> {
  const response = (err as { response?: { status?: number; data?: unknown } })?.response;

  if (response?.status === 401 || response?.status === 403) {
    return "Sesi Anda tidak punya akses untuk mengekspor data. Silakan login ulang.";
  }

  const fallback = "Gagal mengekspor data.";

  try {
    const raw = response?.data;
    const parsed: ApiErrorBody | undefined = raw instanceof Blob
      ? JSON.parse(await raw.text())
      : (raw as ApiErrorBody | undefined);

    const firstError = parsed?.errors ? Object.values(parsed.errors)[0]?.[0] : undefined;

    return firstError || parsed?.message || fallback;
  } catch {
    // Body bukan JSON (mis. halaman galat HTML) -- pesan bawaan saja.
    return fallback;
  }
}
