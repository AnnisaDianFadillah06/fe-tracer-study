import { useEffect, useState } from "react";
import PublicPageShell from "@/components/publik/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import {
  formatFileSize, publicReportDownloadUrl, publicReportPreviewUrl, type PublicReport,
} from "@/lib/publicReports";
import { Download, FileText, Loader2, Maximize2 } from "lucide-react";
import { institution } from "@/config/institution";

/**
 * Halaman "Laporan TS" untuk masyarakat umum.
 *
 * Hanya laporan yang sudah diterbitkan Ketua Tracer yang muncul, dan hanya yang
 * tahunnya di dalam rentang pengarsipan -- keduanya ditegakkan backend, bukan
 * disaring di sini.
 *
 * Pratinjau memakai <iframe> ke route preview supaya PDF dirender viewer bawaan
 * peramban. Tidak memakai pustaka PDF: satu-satunya yang dibutuhkan halaman ini
 * adalah menampilkan dan mengunduh, dan pustaka penampil PDF berukuran ratusan
 * kilobyte untuk halaman yang dibuka pengunjung sekali setahun.
 */
const LaporanPublikPage = () => {
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isError, setError] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data } = await api.get("/public/reports");
        if (data.success) setReports(data.data ?? []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <PublicPageShell
      title="Laporan Tracer Study"
      description={`Hasil tracer study ${institution.name} dituangkan dalam laporan sesuai tahun pelaksanaan. Berkas dapat dibaca langsung di halaman ini atau diunduh dalam format PDF.`}
    >
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Memuat laporan…
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="py-20 text-center text-destructive">
            Gagal memuat laporan. Silakan muat ulang halaman.
          </CardContent>
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
            <FileText className="h-10 w-10" aria-hidden />
            <p>Belum ada laporan yang dipublikasikan.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardHeader className="border-b border-border/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="font-heading text-2xl font-bold">{report.title}</CardTitle>
                    {report.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                      PDF • {formatFileSize(report.file_size)} • {report.download_count} unduhan
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(publicReportPreviewUrl(report.id), "_blank", "noopener")}
                    >
                      <Maximize2 className="mr-2 h-4 w-4" aria-hidden />
                      Layar Penuh
                    </Button>
                    {/* Unduhan sengaja <a download>, bukan fetch lewat axios:
                        route-nya publik dan responsnya berkas, jadi peramban
                        yang menanganinya tanpa perlu menahan PDF di memori. */}
                    <Button asChild size="sm">
                      <a href={publicReportDownloadUrl(report.id)} download={report.file_name}>
                        <Download className="mr-2 h-4 w-4" aria-hidden />
                        Unduh PDF
                      </a>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <iframe
                  src={publicReportPreviewUrl(report.id)}
                  title={`Pratinjau ${report.title}`}
                  className="h-[70vh] min-h-[420px] w-full border-0 bg-muted"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PublicPageShell>
  );
};

export default LaporanPublikPage;
