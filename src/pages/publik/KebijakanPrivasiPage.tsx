import { useEffect, useState } from "react";
import PublicPageShell from "@/components/publik/PublicPageShell";
import { Card, CardContent } from "@/components/ui/card";
import PrivacyNotice from "@/components/privacy/PrivacyNotice";
import api from "@/lib/api";
import { Loader2, ShieldCheck } from "lucide-react";

interface NoticeMeta {
  notice_version: string;
  retention_years: number;
}

/**
 * Halaman publik Kebijakan Privasi.
 *
 * Isinya PERSIS pemberitahuan yang disetujui alumni sebelum mengisi kuesioner
 * -- komponennya satu, lihat PrivacyNotice. Yang membedakan hanya wadahnya:
 * di sini tanpa kotak centang, karena halaman ini memberitahu, bukan meminta
 * persetujuan.
 *
 * Versi dan masa simpan diambil dari backend, bukan ditulis di sini. Kalau
 * ditulis di frontend, angka yang diumumkan bisa berbeda dari angka yang
 * tercatat di persetujuan alumni begitu kebijakannya berubah -- dan yang
 * mengikat institusi adalah yang tercatat.
 */
const KebijakanPrivasiPage = () => {
  const [meta, setMeta] = useState<NoticeMeta | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isError, setError] = useState(false);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const { data } = await api.get("/public/privacy-notice");
        if (data.success) setMeta(data.data);
        else setError(true);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchMeta();
  }, []);

  return (
    <PublicPageShell
      title="Kebijakan Privasi"
      description="Pemberitahuan perlindungan data pribadi bagi alumni yang mengisi kuesioner tracer study, sesuai UU No. 27 Tahun 2022."
    >
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Memuat kebijakan…
          </CardContent>
        </Card>
      ) : isError || !meta ? (
        <Card>
          <CardContent className="py-20 text-center text-destructive">
            Gagal memuat kebijakan privasi. Silakan muat ulang halaman.
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-3xl">
          <CardContent className="space-y-6 pt-6 pb-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
              </div>
              <div className="space-y-1">
                <h2 className="font-heading text-xl font-bold">
                  Pemberitahuan Perlindungan Data Pribadi
                </h2>
                <p className="text-sm text-muted-foreground">
                  Versi {meta.notice_version} &middot; UU No. 27 Tahun 2022
                </p>
              </div>
            </div>

            <PrivacyNotice retentionYears={meta.retention_years} variant="public" />
          </CardContent>
        </Card>
      )}
    </PublicPageShell>
  );
};

export default KebijakanPrivasiPage;
