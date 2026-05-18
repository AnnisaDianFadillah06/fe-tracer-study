import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/contexts/RoleContext";
import {
  useKaprodiQuestionnaires,
  type KaprodiQuestionnaire,
} from "@/hooks/useKaprodiQuestionnaires";
import api from "@/lib/api";
import {
  BarChart3,
  Eye,
  FileSpreadsheet,
  Loader2,
  Search,
  Users,
} from "lucide-react";

const QuestionnaireResultsPage = () => {
  const { selectedProdi } = useRole();
  const { toast } = useToast();
  const {
    responseRate,
    questionnaires,
    isLoading,
    isError,
    search,
    setSearch,
  } = useKaprodiQuestionnaires();

  const [exportingId, setExportingId] = useState<number | null>(null);

  const handlePreview = (form: KaprodiQuestionnaire) => {
    // Buka preview di tab baru — halaman preview sudah existing
    window.open(
      `/dashboard/form-management/${form.id}/preview`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleExport = async (form: KaprodiQuestionnaire) => {
    setExportingId(form.id);
    try {
      const response = await api.get("/reports/export-alumni", {
        params: { questionnaire_id: form.id },
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `export_${form.code}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export berhasil",
        description: `File Excel untuk "${form.title}" sedang diunduh.`,
      });
    } catch {
      toast({
        title: "Gagal",
        description: "Gagal mengekspor data. Pastikan ada responden untuk kuesioner ini.",
        variant: "destructive",
      });
    } finally {
      setExportingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-heading font-bold">Hasil Kuesioner Prodi</h2>
          <p className="text-muted-foreground text-sm">
            Ringkasan hasil kuesioner {selectedProdi ?? "program studi Anda"}
          </p>
        </div>

        {/* Response Rate Card (1 card saja) */}
        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "…" : `${responseRate.toFixed(1)}%`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Persentase alumni prodi yang sudah mengisi kuesioner kementrian
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari kuisioner berdasarkan judul, deskripsi, atau kode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Table — read-only, tanpa Status Published column, tanpa Edit/Delete */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">
              Daftar Kuisioner ({questionnaires.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Sasaran</TableHead>
                    <TableHead>Responden</TableHead>
                    <TableHead>Prodi</TableHead>
                    <TableHead className="w-[260px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Memuat kuisioner…
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && isError && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-destructive">
                        Gagal memuat kuisioner. Pastikan Anda login sebagai kaprodi.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !isError && questionnaires.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        {search
                          ? "Tidak ada kuisioner yang cocok dengan pencarian."
                          : "Belum ada kuisioner untuk prodi Anda."}
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    !isError &&
                    questionnaires.map((form, index) => (
                      <TableRow key={form.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium leading-snug">{form.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {form.code} • {(form.sections ?? []).length} bagian
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {(form as any).target_graduation_years?.length > 0
                              ? `Lulusan ${(form as any).target_graduation_years.join(", ")}`
                              : form.target || `Lulusan ${form.period_year}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {form.response_count ?? 0} responden
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {form.is_global ? (
                            <Badge variant="secondary" className="text-xs">
                              Wajib
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Opsional • {selectedProdi ?? `Prodi #${form.program_id}`}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreview(form)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                exportingId === form.id || (form.response_count ?? 0) === 0
                              }
                              title={
                                (form.response_count ?? 0) === 0
                                  ? "Tidak ada responden untuk diekspor"
                                  : "Export ke Excel"
                              }
                              onClick={() => handleExport(form)}
                            >
                              <FileSpreadsheet className="mr-2 h-4 w-4" />
                              {exportingId === form.id ? "Mengekspor…" : "Export"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default QuestionnaireResultsPage;
