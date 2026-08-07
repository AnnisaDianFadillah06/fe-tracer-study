import { useRef, useState } from "react";
import ExcelJS from "exceljs";
import { useStudentManagement } from "@/hooks/admin/useStudentManagement";
import { useToast } from "@/hooks/common/use-toast";
import api from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import TablePagination from "@/components/common/TablePagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Search, Eye, EyeOff, GraduationCap, Download, Upload, CheckCircle2, XCircle, FileSpreadsheet, Loader2, ArrowLeft, KeyRound } from "lucide-react";
import PilihTahun from "@/components/common/PilihTahun";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRingkasanTahun } from "@/hooks/useRingkasanTahun";

const StudentManagementPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  /** Kemajuan pengambilan lintas halaman saat ekspor; null bila tidak berjalan. */
  const [exportProgress, setExportProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const {
    students,
    filtered,
    searchQuery,
    setSearchQuery,
    filterProdi,
    setFilterProdi,
    filterJurusan,
    setFilterJurusan,
    filterGraduationYear,
    setFilterGraduationYear,
    page,
    setPage,
    paginationMeta,
    fetchAllStudents,
    jurusanOptions,
    programs,
    isDialogOpen,
    setIsDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    editingStudent,
    showPassword,
    setShowPassword,
    formData,
    setFormData,
    handleOpenAdd,
    handleOpenEdit,
    handleSubmit,
    handleDelete,
    confirmDelete,
    isLoading,
  } = useStudentManagement();

  // ── Penerbitan kredensial alumni (RBAC-16) ────────────────────────────────
  // Hanya Ketua Tracer: berkas hasilnya adalah daftar kata sandi banyak orang
  // sekaligus. Backend menegakkan batas yang sama lewat role:head_tracer —
  // penyembunyian tombol di sini murni supaya peran lain tidak menemui 403.
  const { user } = useAuth();
  const isHeadTracer = user?.role === "head_tracer";
  const [isCredDialogOpen, setIsCredDialogOpen] = useState(false);
  const [isIssuingCreds, setIsIssuingCreds] = useState(false);
  const [onlyWithoutCreds, setOnlyWithoutCreds] = useState(true);
  // Tiga penyaring lingkup penerbitan. Semuanya opsional dan saling bebas:
  // "" berarti tidak menyaring pada sumbu itu. Jurusan tanpa prodi berarti
  // seluruh prodi di bawahnya; keduanya berarti irisannya; tidak satu pun
  // berarti seluruh alumni.
  /** Tahun lulus sasaran penerbitan; "" berarti seluruh tahun lulus. */
  const [credYear, setCredYear] = useState("");
  const [credJurusan, setCredJurusan] = useState("");
  const [credProdi, setCredProdi] = useState("");
  /** Kemajuan penerbitan berpotong; null saat tidak sedang berjalan. */
  const [credProgress, setCredProgress] = useState<{ done: number; remaining: number } | null>(null);

  // Daftar tahun lulus dipakai pemilih di dalam dialog. Sumber yang sama
  // dengan kartu tahun di layar awal, jadi pilihannya selalu sinkron.
  const { years: yearSummaries } = useRingkasanTahun();

  /**
   * Dialog penerbitan harus bisa dibuka DARI LAYAR KARTU TAHUN juga.
   *
   * Semula angkatannya diambil dari penyaring halaman, sehingga tombolnya
   * tidak berguna sebelum petugas masuk ke salah satu angkatan — dan karena
   * dialognya dulu hanya dipasang di cabang render setelah angkatan dipilih,
   * menekannya di layar kartu tidak memunculkan apa pun sama sekali.
   * Angkatan kini dipilih di dalam dialog, dengan penyaring halaman sebagai
   * nilai awal bila memang sedang aktif.
   */
  const openCredDialog = () => {
    const yearFromFilter =
      filterGraduationYear && filterGraduationYear !== "all" ? filterGraduationYear : "";
    setCredYear(yearFromFilter);
    setCredJurusan(filterJurusan && filterJurusan !== "all" ? filterJurusan : "");
    setCredProdi(filterProdi && filterProdi !== "all" ? String(filterProdi) : "");
    setIsCredDialogOpen(true);
  };

  /**
   * Prodi yang boleh dipilih, menyempit begitu jurusan dipilih.
   *
   * Tanpa penyempitan ini daftarnya memuat prodi dari jurusan lain, dan
   * memilihnya menghasilkan irisan kosong — nol alumni, tanpa petunjuk apa
   * pun bahwa sebabnya kombinasi yang mustahil.
   *
   * Penyaringan hanya dilakukan bila daftar prodi memang MEMBAWA keterangan
   * jurusan. Kalau tidak ada satu pun yang membawanya, menyaring berarti
   * mengosongkan seluruh pilihan berdasarkan data yang tidak kita punya —
   * petugas melihat dropdown kosong tanpa tahu sebabnya, dan tidak ada jalan
   * memilih prodi sama sekali. Dalam keadaan itu lebih baik menampilkan
   * semuanya: penyaring jurusan tetap ditegakkan di server, jadi lingkup
   * penerbitannya tidak melebar.
   */
  const programsCarryJurusan = programs.some((p) => !!p.jurusan);
  const credProdiOptions =
    credJurusan && programsCarryJurusan
      ? programs.filter((p) => p.jurusan === credJurusan)
      : programs;

  /**
   * Ekspor data alumni ke berkas .xlsx.
   *
   * KOLOMNYA SAMA PERSIS DENGAN TEMPLAT IMPOR (DATA-06), berikut urutannya,
   * supaya berkas hasil ekspor dapat disunting lalu diunggah kembali tanpa
   * menyusun ulang apa pun. Acuannya `AlumniTemplateSheet` di backend; kalau
   * salah satunya berubah, keduanya harus ikut berubah.
   *
   * Sebelumnya kolomnya berbeda jauh: hanya tujuh kolom, tanpa Kode PT, Kode
   * Prodi, No. HP, NIK, dan NPWP, ditambah satu kolom Status yang tidak
   * dikenal templat. Berkasnya karena itu SELALU ditolak saat diunggah balik,
   * karena Kode Prodi diwajibkan importer dan nama program studi tidak
   * menggantikannya. Kolom Status dibuang: nilainya selalu "aktif" dan
   * importer mengabaikannya.
   *
   * Berformat .xlsx, bukan CSV berpemisah koma — di Excel berlokal Indonesia
   * yang mengharapkan titik koma, seluruh kolom menempel menjadi satu.
   */
  const handleExport = async () => {
    if (students.length === 0) {
      toast({ title: "Tidak ada data", description: "Belum ada data mahasiswa untuk diekspor.", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    setExportProgress(null);
    try {
      // Seluruh halaman ditarik, bukan hanya yang sedang terbuka. Daftar di
      // layar dipetak per seratus baris; ekspor yang mengikuti petakan itu
      // akan terpotong diam-diam, dan berkas terpotong tetap terlihat lengkap
      // saat hendak diunggah kembali.
      const rows = await fetchAllStudents((loaded, total) =>
        setExportProgress({ loaded, total }),
      );

      if (rows.length === 0) {
        toast({
          title: "Tidak ada data",
          description: "Tidak ada alumni yang cocok dengan penyaring saat ini.",
          variant: "destructive",
        });
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Tracer Study Polban";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Data Alumni");
      // Judul dan lebar kolom mengikuti AlumniTemplateSheet di backend.
      sheet.columns = [
        { header: "Kode PT",       key: "kodePt",    width: 12 },
        { header: "Kode Prodi",    key: "kodeProdi", width: 14 },
        { header: "NIM",           key: "nim",       width: 20 },
        { header: "Nama",          key: "username",  width: 32 },
        { header: "No. HP",        key: "phone",     width: 18 },
        { header: "Surel",         key: "email",     width: 32 },
        { header: "Tahun Lulus",   key: "angkatan",  width: 14 },
        { header: "NIK",           key: "nik",       width: 22 },
        { header: "NPWP",          key: "npwp",      width: 22 },
        { header: "Program Studi", key: "namaProdi", width: 36 },
        { header: "Jurusan",       key: "jurusan",   width: 28 },
      ];

      // Styling header
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FF1F2937" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDBEAFE" },
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 24;
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      // Data rows
      rows.forEach((s) => {
        sheet.addRow({
          kodePt:    s.kodePt,
          kodeProdi: s.kodeProdi,
          nim:       s.nim,
          username:  s.username,
          phone:     s.phone,
          email:     s.email,
          angkatan:  s.angkatan,
          nik:       s.nik,
          npwp:      s.npwp,
          namaProdi: s.namaProdi,
          jurusan:   s.jurusan,
        });
      });

      // NIM, No. HP, NIK, dan NPWP ditulis sebagai TEKS, bukan angka. Excel
      // memangkas nol di depan dan mengubah rangkaian digit panjang menjadi
      // notasi ilmiah; NIK enam belas digit bahkan kehilangan ketelitiannya.
      // Berkas yang rusak begitu tidak akan cocok lagi saat diunggah kembali.
      ["C", "E", "H", "I"].forEach((col) => {
        sheet.getColumn(col).numFmt = "@";
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Data_Alumni_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Berhasil",
        description:
          `${rows.length} data alumni terunduh (.xlsx), mencakup seluruh halaman ` +
          `sesuai penyaring yang sedang aktif.`,
      });
    } catch (err) {
      console.error("[StudentManagement] export failed:", err);
      toast({ title: "Gagal", description: "Gagal mengunduh data alumni.", variant: "destructive" });
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  /**
   * Download template Excel kosong (header saja) dari backend.
   * Admin & kepala tracer bisa mengisi sesuai kolom, lalu (di versi berikutnya)
   * upload kembali untuk bulk import.
   */
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const response = await api.get("/alumni/template", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Template_Import_Alumni.xlsx";
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Template terunduh", description: "Silakan isi kolom sesuai format, lalu upload kembali via fitur Import (akan aktif di versi berikutnya)." });
    } catch {
      toast({ title: "Gagal", description: "Gagal mengunduh template. Pastikan Anda login sebagai admin atau kepala tracer.", variant: "destructive" });
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  /** Satu baris kredensial hasil penerbitan. */
  type IssuedCredential = { nim: string; name: string; email: string; password: string };

  /**
   * Terbitkan kata sandi alumni, lalu unduh berkasnya.
   *
   * BERJALAN BERPOTONG. Pencincangan kata sandi sengaja lambat — sekitar
   * sepertiga detik per orang — sehingga satu angkatan yang berisi ribuan
   * alumni tidak mungkin selesai dalam satu permintaan HTTP. Server
   * menerbitkan satu potong lalu memberi tahu berapa yang tersisa; perulangan
   * di sini melanjutkan dengan kursor `after_nim` sampai habis.
   *
   * Hasil tiap potong dikumpulkan di memori peramban, dan berkasnya baru
   * dirakit setelah semuanya selesai. Server tidak boleh menyimpan hasil
   * antara: isinya kata sandi polos, dan menaruhnya di disk walau sementara
   * persis yang harus dihindari.
   *
   * Formatnya .xlsx, bukan CSV. Berkas CSV berpemisah koma dibuka Excel
   * berlokal Indonesia dengan seluruh kolom menempel jadi satu — masalah yang
   * sama sudah pernah ditemui pada ekspor data mahasiswa di atas.
   *
   * Tidak akan pernah ada tombol "unduh ulang". Kata sandi tersimpan tersandi
   * satu arah, jadi bila berkasnya hilang satu-satunya jalan adalah
   * menerbitkan ulang — dan kata sandi lama mati.
   */
  const handleIssueCredentials = async () => {
    setIsIssuingCreds(true);
    setCredProgress(null);

    const rows: IssuedCredential[] = [];
    let cursor: string | null = null;

    try {
      // Perulangan tak bersyarat dengan penjaga di dalam: berhenti saat server
      // melaporkan tidak ada sisa, atau saat satu potong tidak menghasilkan
      // apa-apa (penjaga kedua, supaya kekeliruan di sisi server tidak pernah
      // berubah menjadi perulangan tanpa akhir di peramban).
      for (;;) {
        const payload: Record<string, unknown> = {
          only_without_credentials: onlyWithoutCreds,
        };
        if (credYear) payload.graduation_year = Number(credYear);
        if (credJurusan) payload.jurusan = credJurusan;
        if (credProdi) payload.program_id = Number(credProdi);
        if (cursor) payload.after_nim = cursor;

        const { data } = await api.post("/alumni/credentials/issue", payload);
        const batch: IssuedCredential[] = data?.data?.issued ?? [];
        const remaining: number = Number(data?.data?.remaining ?? 0);

        rows.push(...batch);
        cursor = data?.data?.last_nim ?? null;
        setCredProgress({ done: rows.length, remaining });

        if (batch.length === 0 || remaining <= 0 || !cursor) break;
      }

      if (rows.length === 0) {
        throw new Error("Tidak ada kredensial yang diterbitkan.");
      }

      await downloadCredentialWorkbook(rows);

      setIsCredDialogOpen(false);
      toast({
        title: "Kredensial diterbitkan",
        description:
          `${rows.length} kata sandi dibuat dan berkasnya terunduh. Berkas ini satu-satunya ` +
          `salinan — simpan di tempat aman, dan hapus setelah kiriman surel selesai.`,
        duration: 12000,
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? error?.message ?? "Gagal menerbitkan kredensial.";

      // Potongan yang sudah terbit TIDAK dapat dibatalkan — kata sandinya
      // sudah berganti di basis data. Berkasnya tetap diunduh supaya
      // kredensial itu tidak hilang bersama kegagalannya; tanpa ini, alumni
      // pada potongan tersebut terkunci tanpa siapa pun tahu kata sandinya.
      if (rows.length > 0) {
        await downloadCredentialWorkbook(rows);
        toast({
          title: "Penerbitan terhenti di tengah",
          description:
            `${message} ${rows.length} kredensial yang terlanjur terbit sudah diunduh dan tetap ` +
            `berlaku. Jalankan lagi dengan pilihan "hanya yang belum pernah menerima kredensial" ` +
            `untuk melanjutkan sisanya.`,
          variant: "destructive",
          duration: 20000,
        });
      } else {
        toast({ title: "Gagal", description: message, variant: "destructive", duration: 12000 });
      }
    } finally {
      setIsIssuingCreds(false);
      setCredProgress(null);
    }
  };

  /** Rakit dan unduh berkas kredensial. Dipakai jalur sukses maupun jalur gagal-sebagian. */
  const downloadCredentialWorkbook = async (rows: IssuedCredential[]) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Tracer Study Polban";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Kredensial Alumni");
    sheet.columns = [
      { header: "NIM", key: "nim", width: 20 },
      { header: "Nama", key: "name", width: 32 },
      { header: "Surel", key: "email", width: 32 },
      { header: "Kata Sandi", key: "password", width: 20 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FF1F2937" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 24;
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    rows.forEach((r) => sheet.addRow(r));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Kredensial_Alumni_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await api.post("/alumni/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast({
        title: "Berhasil",
        description: data.message || `${data.data?.imported ?? 0} data alumni berhasil diimpor.`,
      });

      if (data.data?.errors?.length > 0) {
        toast({
          title: "Peringatan",
          description: `${data.data.errors.length} baris gagal diimpor. Periksa format data.`,
          variant: "destructive",
        });
      }

      // Refresh data
      window.location.reload();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Gagal mengimpor file";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }

    // Reset input
    event.target.value = "";
  };

  // Dialog tambah/ubah mahasiswa diangkat ke variabel supaya bisa dipakai
  // baik di layar kartu tahun maupun di layar tabel.
  const studentDialog = (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingStudent ? "Edit Akun Mahasiswa" : "Tambah Akun Mahasiswa"}</DialogTitle>
              <DialogDescription>
                {editingStudent ? "Perbarui data akun mahasiswa" : "Buat akun baru untuk mahasiswa mengakses kuesioner"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nim">NIM *</Label>
                  <Input
                    id="nim"
                    value={formData.nim}
                    onChange={(e) => setFormData({ ...formData, nim: e.target.value })}
                    placeholder="211511001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="angkatan">Tahun Lulusan *</Label>
                  <Select value={formData.angkatan} onValueChange={(v) => setFormData({ ...formData, angkatan: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih Tahun Lulusan" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + 2 - i)).map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="prodi">Program Studi *</Label>
                  <Select
                    value={formData.programId}
                    onValueChange={(v) => setFormData({ ...formData, programId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih Program Studi" /></SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={String(program.id)}>
                          {program.name}{program.degree ? ` (${program.degree})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="mahasiswa123"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nim@student.polban.ac.id"
                    required
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="password">
                    Password {editingStudent ? "(kosongkan jika tidak diganti)" : "*"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min. 8 karakter"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="status">Status Akun</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v: "aktif" | "nonaktif") => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="nonaktif">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button type="submit">{editingStudent ? "Simpan Perubahan" : "Buat Akun"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
  );

  // Aksi lintas angkatan — impor massal, unduh templat, dan tambah mahasiswa
  // tidak terikat pada satu tahun, jadi tetap tersedia di layar kartu.
  const globalActions = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        onChange={handleImportCSV}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadTemplate}
        disabled={isDownloadingTemplate}
        title="Unduh template Excel kosong sebagai acuan import"
      >
        {isDownloadingTemplate ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="mr-2 h-4 w-4" />
        )}
        Template
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        title="Import data dari file CSV/Excel"
      >
        <Download className="mr-2 h-4 w-4" />
        Import
      </Button>
      {isHeadTracer && (
        <Button
          variant="outline"
          size="sm"
          onClick={openCredDialog}
          title="Terbitkan kata sandi alumni dan unduh berkasnya untuk kiriman surel"
        >
          <KeyRound className="mr-2 h-4 w-4" />
          Terbitkan Kredensial
        </Button>
      )}
      <Button onClick={handleOpenAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Tambah Mahasiswa
      </Button>
    </>
  );

  /**
   * Dialog penerbitan kredensial (RBAC-16).
   *
   * Disimpan sebagai variabel, bukan ditulis langsung di satu cabang render,
   * karena halaman ini punya DUA layar: kartu tahun dan daftar per angkatan.
   * Tombolnya tampil di keduanya, jadi dialognya harus terpasang di keduanya
   * juga — pola yang sama sudah dipakai `studentDialog` di atas.
   */
  const credentialDialog = (
    <Dialog open={isCredDialogOpen} onOpenChange={setIsCredDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Terbitkan Kredensial Alumni</DialogTitle>
          <DialogDescription>
            Kata sandi baru dibuat acak untuk tiap alumni, lalu berkasnya langsung terunduh.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="cred-year">Tahun Lulus</Label>
            <Select
              value={credYear === "" ? "all" : credYear}
              onValueChange={(v) => setCredYear(v === "all" ? "" : v)}
            >
              <SelectTrigger id="cred-year">
                <SelectValue placeholder="Pilih tahun lulus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua lulusan</SelectItem>
                {yearSummaries.map((y) => (
                  <SelectItem key={y.tahun} value={String(y.tahun)}>
                    Lulusan {y.tahun}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cred-jurusan">Jurusan</Label>
              <Select
                value={credJurusan === "" ? "all" : credJurusan}
                onValueChange={(v) => {
                  const next = v === "all" ? "" : v;
                  setCredJurusan(next);
                  // Prodi yang sudah dipilih dilepas kalau tidak bernaung di
                  // jurusan yang baru — kalau dibiarkan, irisannya kosong dan
                  // penerbitan gagal tanpa sebab yang terlihat.
                  setCredProdi((prev) => {
                    if (!prev || !next) return prev;
                    const p = programs.find((x) => String(x.id) === prev);
                    return p && p.jurusan === next ? prev : "";
                  });
                }}
              >
                <SelectTrigger id="cred-jurusan">
                  <SelectValue placeholder="Semua jurusan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua jurusan</SelectItem>
                  {jurusanOptions.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cred-prodi">Program studi</Label>
              <Select
                value={credProdi === "" ? "all" : credProdi}
                onValueChange={(v) => setCredProdi(v === "all" ? "" : v)}
              >
                <SelectTrigger id="cred-prodi">
                  <SelectValue placeholder="Semua program studi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {credJurusan ? "Semua prodi jurusan ini" : "Semua program studi"}
                  </SelectItem>
                  {credProdiOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                      {p.degree ? ` (${p.degree})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {credProdiOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {programs.length === 0
                    ? "Daftar program studi belum termuat. Muat ulang halaman bila tetap kosong."
                    : `Tidak ada program studi terdaftar di bawah ${credJurusan}.`}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Ketiga penyaring opsional. Yang dibiarkan kosong berarti tidak menyaring pada sumbu itu
            — memilih jurusan saja berarti seluruh program studi di bawahnya, dan tidak memilih apa
            pun berarti seluruh alumni.
            <br />
            Lingkup sebesar apa pun ditangani sekaligus: prosesnya dipecah otomatis menjadi beberapa
            tahap karena pencincangan kata sandi sengaja lambat. Untuk lingkup besar penerbitan bisa
            berjalan beberapa menit — biarkan jendela ini terbuka sampai selesai.
          </p>

          <div className="flex items-start gap-2">
            <Checkbox
              id="only-without-creds"
              checked={onlyWithoutCreds}
              onCheckedChange={(v) => setOnlyWithoutCreds(v === true)}
            />
            <Label htmlFor="only-without-creds" className="font-normal leading-snug">
              Hanya alumni yang belum pernah menerima kredensial
              <span className="block text-muted-foreground">
                Biarkan tercentang saat menjangkau alumni baru, supaya kata sandi orang yang
                sudah terlanjur dikirimi surel tidak ikut berganti.
              </span>
            </Label>
          </div>

          {credProgress && (
            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Menerbitkan…</span>
                <span className="text-muted-foreground">
                  {credProgress.done} selesai
                  {credProgress.remaining > 0 && ` • ${credProgress.remaining} tersisa`}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.round(
                      (credProgress.done / Math.max(1, credProgress.done + credProgress.remaining)) * 100,
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Jangan tutup jendela ini — berkasnya baru dirakit setelah seluruh tahap selesai.
              </p>
            </div>
          )}

          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
            <p className="font-medium text-destructive">Berkasnya hanya bisa diunduh sekali</p>
            <p className="text-muted-foreground">
              Kata sandi disimpan dalam bentuk tersandi satu arah, jadi tidak bisa dibuka lagi
              setelah ini. Bila berkasnya hilang, satu-satunya jalan adalah menerbitkan ulang —
              dan kata sandi lama akan mati. Isinya setara daftar kata sandi banyak orang:
              simpan di tempat aman, dan hapus setelah kiriman surel selesai.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCredDialogOpen(false)} disabled={isIssuingCreds}>
            Batal
          </Button>
          <Button onClick={handleIssueCredentials} disabled={isIssuingCreds}>
            {isIssuingCreds ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menerbitkan…
              </>
            ) : (
              <>
                <KeyRound className="mr-2 h-4 w-4" />
                Terbitkan &amp; Unduh
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Layar kartu tahun ────────────────────────────────────────────────
  if (filterGraduationYear === "") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h2 className="font-heading text-2xl font-bold">Manajemen Akun Mahasiswa</h2>
            <p className="text-muted-foreground text-sm">
              Pilih tahun lulus untuk mengelola akun mahasiswa
            </p>
          </div>
          <PilihTahun
            mode="alumni"
            onSelect={(t) => { setFilterGraduationYear(t === null ? "all" : String(t)); setPage(1); }}
            onSearch={(q) => { setSearchQuery(q); setFilterGraduationYear("all"); setPage(1); }}
            searchPlaceholder="Cari NIM atau nama mahasiswa..."
            actions={globalActions}
          />
        </div>

        {/* Dialog tambah/ubah tetap dipasang supaya tombol Tambah Mahasiswa
            di layar kartu tetap berfungsi. Begitu pula dialog kredensial —
            tanpa ini tombolnya tertekan tapi tidak memunculkan apa pun. */}
        {studentDialog}
        {credentialDialog}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold">
              Manajemen Akun Mahasiswa
              <span className="font-normal text-muted-foreground">
                {" — "}{filterGraduationYear === "all" ? "Semua Lulusan" : `Lulusan ${filterGraduationYear}`}
              </span>
            </h2>
            <p className="text-muted-foreground text-sm">
              Kelola akun mahasiswa untuk mengakses kuesioner tracer study
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => { setFilterGraduationYear(""); setSearchQuery(""); setPage(1); }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
              Pilih Tahun Lulus
            </Button>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleImportCSV}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              title="Unduh template Excel kosong sebagai acuan import"
            >
              {isDownloadingTemplate ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              title="Import data dari file CSV/Excel (coming soon)"
            >
              <Download className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || students.length === 0}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {/* Kemajuan ditampilkan karena pengambilan lintas halaman pada
                  angkatan besar berlangsung beberapa detik; tanpa penanda,
                  tombol yang diam terlihat seperti macet. */}
              {isExporting && exportProgress
                ? `Menyiapkan ${exportProgress.loaded}/${exportProgress.total}`
                : "Export"}
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Mahasiswa
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{paginationMeta.total}</p>
                  <p className="text-xs text-muted-foreground">Total Mahasiswa</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{paginationMeta.total}</p>
                  <p className="text-xs text-muted-foreground">Akun Aktif</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{students.filter((s) => s.status === "nonaktif").length}</p>
                  <p className="text-xs text-muted-foreground">Akun Nonaktif</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search */}
        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Cari NIM, username, atau email..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                />
              </div>
              <Select value={filterProdi} onValueChange={setFilterProdi}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Filter Program Studi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Program Studi</SelectItem>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={String(program.id)}>
                      {program.name}{program.degree ? ` (${program.degree})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterJurusan} onValueChange={(v) => { setFilterJurusan(v); setPage(1); }}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Filter Jurusan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jurusan</SelectItem>
                  {jurusanOptions.map((jurusan) => (
                    <SelectItem key={jurusan} value={jurusan}>
                      {jurusan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterGraduationYear} onValueChange={(v) => { setFilterGraduationYear(v); setPage(1); }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tahun Lulusan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + 1 - i).map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">Daftar Mahasiswa ({paginationMeta.total})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>NIM</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Program Studi</TableHead>
                    <TableHead>Jurusan</TableHead>
                    <TableHead>Tahun Lulusan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Memuat data mahasiswa...</div>
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        Tidak ada data mahasiswa ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((student, index) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-mono font-medium">{student.nim}</TableCell>
                        <TableCell>{student.username}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{student.email}</TableCell>
                        <TableCell><span className="text-sm">{student.prodi}</span></TableCell>
                        <TableCell><span className="text-sm">{student.jurusan || "-"}</span></TableCell>
                        <TableCell>{student.angkatan}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              student.status === "aktif"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                            }
                          >
                            {student.status === "aktif" ? (
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                            )}
                            {student.status === "aktif" ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 whitespace-nowrap">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(student)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => confirmDelete(student.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Hapus
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              page={paginationMeta.currentPage}
              totalPages={paginationMeta.lastPage}
              total={paginationMeta.total}
              itemLabel="mahasiswa"
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      </div>

      {studentDialog}

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akun Mahasiswa?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun yang dihapus tidak dapat dipulihkan. Mahasiswa tidak akan bisa mengakses kuesioner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {credentialDialog}
    </DashboardLayout>
  );
};

export default StudentManagementPage;
