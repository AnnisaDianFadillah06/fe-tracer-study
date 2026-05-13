import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, GraduationCap, Loader2, Search, XCircle } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useKaprodiAlumni } from "@/hooks/useKaprodiAlumni";

const AlumniDataPage = () => {
  const { selectedProdi } = useRole();
  const { stats, alumni, isLoading, isError, search, setSearch } = useKaprodiAlumni(100);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-heading font-bold">Data Alumni Prodi</h2>
          <p className="text-muted-foreground text-sm">
            Data alumni {selectedProdi ?? "program studi Anda"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Alumni</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? "…" : stats?.total ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sudah Mengisi</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {isLoading ? "…" : stats?.answered ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Belum Mengisi</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {isLoading ? "…" : stats?.unanswered ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari NIM atau nama alumni..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">
              Daftar Alumni ({alumni.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>NIM</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Program Studi</TableHead>
                    <TableHead>Jurusan</TableHead>
                    <TableHead>Tahun Lulusan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Memuat data alumni…
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && isError && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-destructive">
                        Gagal memuat data alumni. Pastikan Anda login sebagai kaprodi.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !isError && alumni.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        {search
                          ? "Tidak ada alumni yang cocok dengan pencarian."
                          : "Belum ada alumni untuk program studi Anda."}
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    !isError &&
                    alumni.map((a, index) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-mono font-medium">{a.nim}</TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {a.email ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">{a.program_name ?? "—"}</TableCell>
                        <TableCell className="text-sm">{a.jurusan_name ?? "—"}</TableCell>
                        <TableCell>{a.graduation_year ?? "—"}</TableCell>
                        <TableCell>
                          {a.has_responded === 1 ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Sudah Mengisi
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              Belum Mengisi
                            </Badge>
                          )}
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

export default AlumniDataPage;
