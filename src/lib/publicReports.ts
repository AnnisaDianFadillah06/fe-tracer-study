import api from "@/lib/api";

/**
 * Helper laporan publik.
 *
 * Unduhan dan pratinjau TIDAK lewat instance axios: keduanya dibuka sebagai
 * URL langsung (window.open / <iframe src>), yang tidak membawa header
 * Authorization. Itu justru yang diinginkan — route publiknya memang tanpa
 * auth. Yang penting URL-nya absolut ke backend, karena frontend dan backend
 * berjalan di origin berbeda sehingga path relatif akan menunjuk ke frontend.
 */

export interface PublicReport {
  id: number;
  title: string;
  description: string | null;
  report_year: number;
  file_name: string;
  file_size: number;
  published_at: string | null;
  download_count: number;
}

/** Basis URL API tanpa garis miring di ujung. */
function apiBaseUrl(): string {
  return String(api.defaults.baseURL ?? "").replace(/\/+$/, "");
}

/** Memicu unduhan berkas (Content-Disposition: attachment) dan menaikkan penghitung. */
export function publicReportDownloadUrl(id: number): string {
  return `${apiBaseUrl()}/public/reports/${id}/download`;
}

/** Menampilkan PDF inline; sengaja tidak dihitung sebagai unduhan. */
export function publicReportPreviewUrl(id: number): string {
  return `${apiBaseUrl()}/public/reports/${id}/preview`;
}

/**
 * Ukuran berkas dalam satuan yang enak dibaca. Memakai kelipatan 1024 (KB/MB)
 * mengikuti kebiasaan sistem operasi, bukan 1000.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  // Byte utuh tidak perlu desimal; satuan lebih besar dibulatkan 1 angka.
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}
