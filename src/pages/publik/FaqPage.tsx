import { ReactNode } from "react";
import { Link } from "react-router-dom";
import PublicPageShell from "@/components/publik/PublicPageShell";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { institution } from "@/config/institution";

/**
 * Pertanyaan yang sering diajukan alumni.
 *
 * Setiap jawaban di sini menggambarkan perilaku sistem yang benar-benar ada,
 * bukan kebijakan yang diandaikan. Kalau suatu saat perilakunya berubah
 * (mis. penarikan persetujuan ikut menghapus jawaban), jawaban di sini WAJIB
 * ikut berubah -- FAQ yang menjanjikan lebih dari yang dikerjakan sistem
 * lebih merusak kepercayaan daripada tidak ada FAQ sama sekali.
 */
interface Faq {
  q: string;
  a: ReactNode;
}

const faqs: Faq[] = [
  {
    q: "Saya lulusan tahun lama. Apakah tetap perlu mengisi?",
    a: (
      <p>
        Perlu, bila Anda menerima undangan pengisian. Kuesioner tracer study
        ditujukan pada angkatan kelulusan tertentu untuk setiap periode, dan
        akun hanya diterbitkan bagi alumni pada angkatan yang sedang ditelusuri.
        Bila Anda tidak menerima undangan, berarti angkatan Anda belum menjadi
        sasaran periode ini.
      </p>
    ),
  },
  {
    q: "Berapa lama pengisiannya, dan bagaimana kalau saya berhenti di tengah?",
    a: (
      <p>
        Jawaban tersimpan otomatis sebagai draf sejak pertanyaan pertama, jadi
        Anda boleh berhenti kapan saja. Masuk kembali dan pengisian dilanjutkan
        dari tempat Anda berhenti — tidak ada yang perlu diulang dari awal.
      </p>
    ),
  },
  {
    q: "Kenapa NIK dan NPWP saya diminta?",
    a: (
      <p>
        Karena pelaporan penyerapan lulusan ke PDDIKTI mensyaratkan keduanya,
        dan pelaporan itu kewajiban hukum {institution.name}. Keduanya disimpan
        dalam bentuk terenkripsi, dan setiap kali data itu diekspor untuk
        pelaporan, perbuatannya tercatat di jejak audit yang bisa Anda lihat
        sendiri di halaman Data Saya.
      </p>
    ),
  },
  {
    q: "Apakah kampus bisa melihat gaji saya per orang?",
    a: (
      <p>
        Yang tampil di dasbor dan laporan publik adalah angka gabungan —
        ringkasan per program studi dan per tahun kelulusan, bukan jawaban
        perorangan. Staf yang menangani data mentah dibatasi menurut perannya,
        dan setiap akses tercatat.
      </p>
    ),
  },
  {
    q: "Saya lupa kata sandi, atau belum pernah menerimanya.",
    a: (
      <p>
        Kata sandi alumni diterbitkan pengelola, bukan dibuat sendiri, sehingga
        pengaturan ulang juga dilakukan pengelola. Kirim surel ke{" "}
        {institution.email} dengan menyebutkan nama dan NIM Anda.
      </p>
    ),
  },
  {
    q: "Data saya salah. Bagaimana memperbaikinya?",
    a: (
      <p>
        Masuk sebagai alumni, buka halaman <strong>Data Saya</strong>, lalu
        ajukan permintaan perbaikan dengan menyebutkan bagian yang keliru.
        Permintaan itu masuk ke pengelola dan dijawab tertulis melalui halaman
        yang sama.
      </p>
    ),
  },
  {
    q: "Bisakah saya menarik persetujuan setelah mengisi?",
    a: (
      <>
        <p>
          Bisa, kapan saja, melalui halaman <strong>Data Saya</strong>.
          Penarikan menghentikan pengisian berikutnya.
        </p>
        <p>
          Yang perlu Anda ketahui sejak awal: penarikan tidak serta-merta
          menghapus jawaban yang sudah terkirim, karena sebagiannya wajib
          disimpan untuk pelaporan PDDIKTI. Bila Anda menghendaki
          penghapusannya, ajukan permintaan penghapusan secara terpisah —
          selengkapnya di{" "}
          <Link to="/kebijakan-privasi" className="text-primary underline underline-offset-4">
            Kebijakan Privasi
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    q: "Ke mana hasil tracer study ini dipublikasikan?",
    a: (
      <p>
        Ringkasannya terbuka untuk umum di halaman{" "}
        <Link to="/statistik" className="text-primary underline underline-offset-4">
          Statistik
        </Link>{" "}
        dan{" "}
        <Link to="/laporan" className="text-primary underline underline-offset-4">
          Laporan Tracer Study
        </Link>
        . Keduanya berisi angka gabungan per program studi dan per tahun
        kelulusan.
      </p>
    ),
  },
];

const FaqPage = () => {
  return (
    <PublicPageShell
      title="Pertanyaan yang Sering Diajukan"
      description="Jawaban atas hal-hal yang paling sering ditanyakan alumni sebelum dan sesudah mengisi kuesioner."
      width="narrow"
    >
      <Card>
        <CardContent className="py-2">
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <AccordionItem key={faq.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground">
        Pertanyaan Anda tidak ada di sini? Kirimkan ke {institution.email} —
        pertanyaan yang berulang akan ditambahkan ke halaman ini. Langkah
        pengisian selengkapnya ada di{" "}
        <Link to="/panduan" className="text-primary underline underline-offset-4">
          Panduan Pengisian
        </Link>
        .
      </p>
    </PublicPageShell>
  );
};

export default FaqPage;
