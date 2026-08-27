import { Link } from "react-router-dom";
import PublicPageShell from "@/components/publik/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { institution } from "@/config/institution";
import { KeyRound, ListChecks, ShieldCheck, Save, HelpCircle } from "lucide-react";

/**
 * Panduan pengisian kuesioner untuk alumni, versi ringkas.
 *
 * Sengaja BUKAN salinan buku panduan lengkap: yang dibutuhkan orang di
 * halaman publik hanya cukup untuk berani mulai mengisi -- cara masuk, berapa
 * lama, apa yang terjadi kalau berhenti di tengah, dan kenapa NIK diminta.
 * Sisanya lebih baik dijawab di FAQ daripada menenggelamkan empat hal itu.
 *
 * Setiap keterangan di sini menggambarkan perilaku sistem yang sebenarnya
 * (draf otomatis, kredensial terbitan pengelola, enkripsi NIK/NPWP). Jangan
 * menambah janji yang belum ada penopangnya di kode.
 */
const langkah = [
  {
    icon: KeyRound,
    title: "1. Masuk dengan akun alumni",
    body: (
      <>
        <p>
          Alumni tidak mendaftar sendiri. Kata sandi diterbitkan pengelola
          tracer study dan dibagikan bersama undangan pengisian. Di halaman
          Login, isikan <strong>NIM atau surel alumni</strong> Anda beserta
          kata sandi tersebut — sistem mengarahkan Anda langsung ke kuesioner.
        </p>
        <p>
          Belum menerima kata sandi, atau lupa? Hubungi pengelola di{" "}
          {institution.email} dengan menyebutkan nama dan NIM Anda.
        </p>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "2. Baca pemberitahuan perlindungan data",
    body: (
      <>
        <p>
          Sebelum kuesioner terbuka, Anda diminta membaca dan menyetujui
          pemberitahuan perlindungan data pribadi. Persetujuan diminta di awal,
          bukan di akhir, supaya tidak ada satu jawaban pun yang tersimpan
          sebelum Anda menyetujuinya.
        </p>
        <p>
          Isinya dapat Anda baca lebih dulu di halaman{" "}
          <Link to="/kebijakan-privasi" className="text-primary underline underline-offset-4">
            Kebijakan Privasi
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    icon: ListChecks,
    title: "3. Isi kuesioner",
    body: (
      <>
        <p>
          Kuesioner mengikuti instrumen tracer study Kementerian, ditambah
          pertanyaan khusus dari program studi Anda bila ada. Pertanyaan yang
          tidak relevan tidak akan muncul: bila Anda menjawab sedang bekerja,
          pertanyaan tentang studi lanjut dilewati dengan sendirinya.
        </p>
        <p>
          Siapkan <strong>NIK</strong> dan <strong>NPWP</strong> (bila ada).
          Keduanya diminta karena pelaporan ke PDDIKTI mensyaratkannya, dan
          keduanya disimpan dalam bentuk terenkripsi.
        </p>
      </>
    ),
  },
  {
    icon: Save,
    title: "4. Berhenti kapan saja, lanjutkan nanti",
    body: (
      <p>
        Jawaban Anda tersimpan otomatis sebagai draf sejak pertanyaan pertama.
        Bila Anda menutup halaman atau koneksi terputus di tengah jalan, masuk
        kembali dan pengisian dilanjutkan dari tempat Anda berhenti — tidak ada
        yang perlu diulang.
      </p>
    ),
  },
];

const PanduanPage = () => {
  return (
    <PublicPageShell
      title="Panduan Pengisian"
      description={`Empat langkah mengisi kuesioner tracer study ${institution.name}, dari masuk sampai jawaban terkirim.`}
    >
      <div className="max-w-3xl space-y-4">
        {langkah.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <CardTitle className="pt-1.5 text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pl-[4.5rem] text-sm leading-relaxed text-muted-foreground">
              {body}
            </CardContent>
          </Card>
        ))}

        <Card className="bg-muted/40">
          <CardContent className="flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-sm">
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-muted-foreground">
                Masih ada yang mengganjal? Pertanyaan yang paling sering
                ditanyakan alumni sudah dikumpulkan di halaman FAQ.
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link to="/faq">Buka FAQ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  );
};

export default PanduanPage;
