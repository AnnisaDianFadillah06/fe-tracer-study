import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRole } from "@/contexts/RoleContext";
import {
  useKaprodiQuestionnaires,
} from "@/hooks/dashboard/kaprodi/useKaprodiQuestionnaires";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  Users,
  XCircle,
} from "lucide-react";

const QuestionnaireResultsPage = () => {
  const { selectedProdi } = useRole();
  const navigate = useNavigate();
  const {
    stats,
    questionnaires,
    isLoading,
    isError,
    search,
    setSearch,
  } = useKaprodiQuestionnaires();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-heading font-bold">Hasil Kuesioner Prodi</h2>
          <p className="text-muted-foreground text-sm">
            Daftar kuesioner dan ringkasan responden {selectedProdi ?? "program studi Anda"}
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Finish</p>
                  <p className="text-2xl font-bold">{stats?.finish ?? "…"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ongoing</p>
                  <p className="text-2xl font-bold">{stats?.ongoing ?? "…"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Belum Mengisi</p>
                  <p className="text-2xl font-bold">{stats?.belum_mengisi ?? "…"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari kuesioner berdasarkan judul atau kode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Questionnaire List Table */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">
              Daftar Kuesioner ({questionnaires.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Sasaran</TableHead>
                    <TableHead>Responden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Memuat kuesioner…
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && isError && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-destructive">
                        Gagal memuat kuesioner.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !isError && questionnaires.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        {search
                          ? "Tidak ada kuesioner yang cocok dengan pencarian."
                          : "Belum ada kuesioner untuk prodi Anda."}
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
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium"
                            onClick={() => navigate(`/dashboard/questionnaire-results/${form.id}`)}
                          >
                            <Users className="mr-1 h-4 w-4" />
                            {form.response_count ?? 0} responden
                          </Button>
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
