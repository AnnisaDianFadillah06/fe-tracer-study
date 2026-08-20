import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { institution } from "@/config/institution";
import { grantConsent, type ConsentState } from "@/lib/privacy";

interface ConsentGateProps {
  consent: ConsentState;
  /** Dipanggil setelah persetujuan tercatat di server. */
  onGranted: () => void;
}

/**
 * Layar persetujuan pemrosesan data pribadi (UU No. 27 Tahun 2022).
 *
 * KENAPA SEBELUM FORMULIR, BUKAN DI DALAMNYA
 * ------------------------------------------
 * Persetujuan adalah dasar hukum untuk memproses, jadi ia harus ada sebelum
 * data pertama tersimpan — dan autosave menyimpan sejak jawaban pertama.
 * Menaruhnya sebagai kotak centang di akhir formulir berarti seluruh isian
 * sudah tersimpan di server sebelum alumni sempat menyetujui apa pun.
 *
 * KENAPA CENTANG, BUKAN SEKADAR TOMBOL "LANJUT"
 * ---------------------------------------------
 * Pasal 22 menentukan persetujuan diberikan secara tertulis atau terekam,
 * dan Pasal 24 mewajibkan pengendali menunjukkan buktinya. Tombol "Lanjut"
 * pada halaman berisi teks panjang tidak membedakan orang yang menyetujui
 * dari orang yang sekadar ingin melewati halaman. Satu tindakan tegas yang
 * hanya punya satu makna adalah bedanya.
 *
 * YANG SENGAJA TIDAK DILAKUKAN
 * ----------------------------
 * Kotak centang TIDAK dicentang otomatis, dan tombol lanjut tidak aktif
 * sampai dicentang. Persetujuan yang sudah tercentang saat halaman dibuka
 * bukan persetujuan — ia hanya menampung kelalaian orang membaca.
 */
const ConsentGate = ({ consent, onGranted }: ConsentGateProps) => {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGrant = async () => {
    setSaving(true);
    setError(null);
    try {
      await grantConsent();
      onGranted();
    } catch {
      setError("Persetujuan gagal disimpan. Periksa koneksi Anda lalu coba lagi.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <Card className="max-w-2xl w-full glass-card">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="font-heading text-xl font-bold">
                Pemberitahuan Perlindungan Data Pribadi
              </h1>
              <p className="text-sm text-muted-foreground">
                Versi {consent.current_version} &middot; UU No. 27 Tahun 2022
              </p>
            </div>
          </div>

          {/* Pemberitahuan bahwa ketentuannya BERUBAH, bukan sekadar diulang.
              Alumni yang sudah pernah menyetujui berhak tahu bahwa ia diminta
              lagi karena ada yang berbeda, bukan karena sistem lupa. */}
          {consent.needs_renewal && (
            <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
              <p>
                Pemberitahuan ini telah diperbarui sejak terakhir Anda menyetujuinya
                (versi {consent.granted_version}). Mohon baca kembali sebelum melanjutkan.
              </p>
            </div>
          )}

          <div className="space-y-4 text-sm leading-relaxed">
            <section className="space-y-1">
              <h2 className="font-semibold">Data apa yang dikumpulkan</h2>
              <p className="text-muted-foreground">
                Identitas Anda (nama, NIM, NIK, NPWP, surel, nomor telepon), riwayat
                akademik, serta jawaban Anda atas kuesioner tracer study — termasuk
                status pekerjaan, masa tunggu kerja, kesesuaian bidang kerja, dan
                pendapatan.
              </p>
            </section>

            <section className="space-y-1">
              <h2 className="font-semibold">Untuk apa data digunakan</h2>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Statistik penyerapan lulusan untuk evaluasi kurikulum program studi.</li>
                <li>Pemenuhan indikator akreditasi LAM dan BAN-PT.</li>
                <li>Pelaporan penyerapan lulusan ke PDDIKTI, yang merupakan kewajiban hukum {institution.name}.</li>
              </ul>
              <p className="text-muted-foreground">
                Jawaban Anda diolah menjadi angka gabungan. Yang tampil di dasbor dan
                laporan publik adalah ringkasan per program studi dan per tahun
                kelulusan, bukan jawaban perorangan.
              </p>
            </section>

            <section className="space-y-1">
              <h2 className="font-semibold">Bagaimana data dilindungi</h2>
              <p className="text-muted-foreground">
                NIK dan NPWP disimpan dalam bentuk terenkripsi. Akses staf dibatasi
                menurut perannya, dan setiap perbuatan atas data Anda — termasuk
                ekspor untuk pelaporan — tercatat dalam jejak audit yang dapat Anda
                lihat sendiri di halaman Data Saya.
              </p>
            </section>

            <section className="space-y-1">
              <h2 className="font-semibold">Berapa lama disimpan</h2>
              <p className="text-muted-foreground">
                {consent.retention_years} tahun sejak tahun kelulusan Anda.
              </p>
            </section>

            <section className="space-y-1">
              <h2 className="font-semibold">Hak Anda</h2>
              <p className="text-muted-foreground">
                Anda berhak melihat seluruh data Anda, meminta perbaikan bila keliru,
                meminta penghapusan, mengajukan keberatan, dan menarik persetujuan ini
                kapan saja melalui halaman <strong>Data Saya</strong>.
              </p>
              {/* Batas penarikan dinyatakan di muka, bukan disimpan sebagai
                  kejutan. Menjanjikan penarikan yang "menghapus segalanya" lalu
                  tidak melakukannya jauh lebih merusak kepercayaan daripada
                  menyatakan batasnya sejak awal. */}
              <p className="text-muted-foreground">
                Menarik persetujuan menghentikan pengisian berikutnya, tetapi tidak
                serta-merta menghapus jawaban yang sudah terkirim — sebagiannya wajib
                disimpan untuk pelaporan PDDIKTI. Ajukan permintaan penghapusan bila
                Anda menghendakinya, dan permintaan itu akan dijawab tertulis.
              </p>
            </section>

            <section className="space-y-1">
              <h2 className="font-semibold">Menghubungi pengelola</h2>
              <p className="text-muted-foreground">
                {institution.unit} {institution.name}
                {institution.email ? ` — ${institution.email}` : ""}
              </p>
            </section>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
            <Checkbox
              id="consent-check"
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="consent-check" className="text-sm font-normal leading-relaxed cursor-pointer">
              Saya telah membaca dan memahami pemberitahuan di atas, dan menyetujui
              pemrosesan data pribadi saya untuk keperluan yang disebutkan.
            </Label>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleGrant}
              disabled={!checked || saving}
              className="flex-1 gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Setuju dan Lanjutkan
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Tanpa persetujuan ini, kuesioner tracer study tidak dapat diisi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsentGate;
