import { institution } from "@/config/institution";

interface PrivacyNoticeProps {
  /** Masa simpan data pribadi, dalam tahun sejak kelulusan. */
  retentionYears: number;
  /**
   * Halaman publik dibaca orang yang belum tentu punya akun, jadi kalimat yang
   * menyuruh "buka halaman Data Saya" harus diikuti keterangan bahwa halaman
   * itu ada di balik login. Di layar persetujuan alumni sudah login, sehingga
   * keterangan itu justru mengganggu.
   */
  variant?: "consent" | "public";
}

/**
 * Isi pemberitahuan perlindungan data pribadi (UU No. 27 Tahun 2022).
 *
 * KENAPA DIPISAH DARI ConsentGate
 * -------------------------------
 * Teks ini sekarang tampil di dua tempat: layar persetujuan sebelum kuesioner,
 * dan halaman publik /kebijakan-privasi. Kalau keduanya menyalin teks
 * masing-masing, cepat atau lambat isinya berbeda -- dan pemberitahuan privasi
 * yang berbeda antara yang diumumkan dan yang disetujui adalah persoalan
 * hukum, bukan sekadar rapi-rapi kode. Satu sumber, dua pemakai.
 *
 * Nilai yang bisa berubah (masa simpan, versi) TIDAK ditulis di sini melainkan
 * diterima sebagai prop, karena keduanya berasal dari config backend
 * (config/privacy.php) dan harus sama persis dengan yang tercatat saat alumni
 * menyetujui.
 */
const PrivacyNotice = ({ retentionYears, variant = "consent" }: PrivacyNoticeProps) => {
  const isPublic = variant === "public";

  return (
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
          lihat sendiri di halaman <strong>Data Saya</strong>
          {isPublic ? " setelah masuk sebagai alumni" : ""}.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold">Berapa lama disimpan</h2>
        <p className="text-muted-foreground">
          {retentionYears} tahun sejak tahun kelulusan Anda.
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

      {/* Hanya di halaman publik: pembaca yang belum login tidak punya tombol
          apa pun di hadapannya, jadi caranya mengetuk harus disebutkan. Di
          layar persetujuan, tombolnya sudah ada di halaman yang sama. */}
      {isPublic && (
        <section className="space-y-1">
          <h2 className="font-semibold">Cara mengajukan hak Anda</h2>
          <p className="text-muted-foreground">
            Masuk sebagai alumni, buka halaman <strong>Data Saya</strong>, lalu
            pilih jenis permintaan yang Anda kehendaki (melihat, memperbaiki,
            menghapus, atau keberatan). Permintaan itu masuk ke pengelola dan
            dijawab tertulis melalui halaman yang sama.
          </p>
          <p className="text-muted-foreground">
            Bila Anda tidak dapat mengakses akun, kirimkan permintaan beserta
            nama dan NIM ke {institution.email}.
          </p>
        </section>
      )}

      <section className="space-y-1">
        <h2 className="font-semibold">Menghubungi pengelola</h2>
        <p className="text-muted-foreground">
          {institution.unit} {institution.name}
          {institution.email ? ` — ${institution.email}` : ""}
        </p>
      </section>
    </div>
  );
};

export default PrivacyNotice;
