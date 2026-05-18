import { useRef, useState } from "react";
import ExcelJS from "exceljs";
import { useStudentManagement } from "@/hooks/useStudentManagement";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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
import { Plus, Edit, Trash2, Search, Eye, EyeOff, GraduationCap, Download, Upload, CheckCircle2, XCircle, FileSpreadsheet, Loader2 } from "lucide-react";

const StudentManagementPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
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

  /**
   * Export data mahasiswa ke file .xlsx proper — tiap field jadi kolom terpisah.
   *
   * Sebelumnya pakai CSV dengan separator `,` — di Excel locale Indonesia
   * (expected `;`) semua field menempel ke kolom A. Fix: pakai exceljs
   * untuk generate binary .xlsx yang tidak bergantung locale.
   */
  const handleExport = async () => {
    if (students.length === 0) {
      toast({ title: "Tidak ada data", description: "Belum ada data mahasiswa untuk diekspor.", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Tracer Study Polban";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Data Mahasiswa");
      sheet.columns = [
        { header: "NIM",           key: "nim",      width: 20 },
        { header: "Nama",          key: "username", width: 32 },
        { header: "Email",         key: "email",    width: 32 },
        { header: "Program Studi", key: "prodi",    width: 32 },
        { header: "Jurusan",       key: "jurusan",  width: 28 },
        { header: "Tahun Lulus",   key: "angkatan", width: 14 },
        { header: "Status",        key: "status",   width: 12 },
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
      students.forEach((s) => {
        sheet.addRow({
          nim:      s.nim,
          username: s.username,
          email:    s.email,
          prodi:    s.prodi,
          jurusan:  s.jurusan,
          angkatan: s.angkatan,
          status:   s.status,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Data_Mahasiswa_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: "Berhasil", description: `${students.length} data mahasiswa terunduh (.xlsx).` });
    } catch (err) {
      console.error("[StudentManagement] export failed:", err);
      toast({ title: "Gagal", description: "Gagal mengunduh data mahasiswa.", variant: "destructive" });
    } finally {
      setIsExporting(false);
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
      const response = await api.get("/admin/alumni/template", {
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

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      
      if (lines.length < 2) {
        toast({ title: "Error", description: "File CSV kosong atau tidak valid", variant: "destructive" });
        return;
      }

      // Skip header row and process data
      const importedCount = lines.slice(1).length;
      toast({ 
        title: "Berhasil", 
        description: `${importedCount} data mahasiswa siap untuk diimpor. Fitur impor lengkap akan diaktifkan di versi berikutnya.` 
      });
    } catch (error) {
      toast({ title: "Error", description: "Gagal membaca file CSV", variant: "destructive" });
    }

    // Reset input
    event.target.value = "";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold">Manajemen Akun Mahasiswa</h2>
            <p className="text-muted-foreground text-sm">
              Kelola akun mahasiswa untuk mengakses kuesioner tracer study
            </p>
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
              Export
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
                  <p className="text-2xl font-bold">{students.length}</p>
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
                  <p className="text-2xl font-bold">{students.filter((s) => s.status === "aktif").length}</p>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterJurusan} onValueChange={setFilterJurusan}>
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
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">Daftar Mahasiswa ({filtered.length})</CardTitle>
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
                    <TableHead>Angkatan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
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
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
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
                <Label htmlFor="angkatan">Angkatan *</Label>
                <Select value={formData.angkatan} onValueChange={(v) => setFormData({ ...formData, angkatan: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih Angkatan" /></SelectTrigger>
                  <SelectContent>
                    {["2019", "2020", "2021", "2022", "2023", "2024"].map((y) => (
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
                        {program.name}
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
    </DashboardLayout>
  );
};

export default StudentManagementPage;
