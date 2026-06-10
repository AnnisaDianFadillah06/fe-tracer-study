import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Search } from "lucide-react";
import api from "@/lib/api";

const StakeholderContactsPage = () => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [graduationYear, setGraduationYear] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    api.get("/alumni/stats").then(({ data }) => {
      if (data.success) setYears(data.data?.graduation_years ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const params: Record<string, unknown> = { per_page: 100, page };
    if (graduationYear !== "all") params.graduation_year = graduationYear;
    if (statusFilter !== "all") params.alumni_status = statusFilter;
    if (search) params.search = search;
    api.get("/stakeholder-contacts", { params }).then(({ data }) => {
      const pg = data.data;
      setData(pg.data ?? []);
      setPagination({ currentPage: pg.current_page, lastPage: pg.last_page, total: pg.total });
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, [page, graduationYear, statusFilter, search]);

  useEffect(() => { setPage(1); }, [graduationYear, statusFilter, search]);

  const handleExport = async (format: "csv" | "xlsx") => {
    const params: Record<string, string> = { format };
    if (graduationYear !== "all") params.graduation_year = graduationYear;
    if (statusFilter !== "all") params.alumni_status = statusFilter;
    try {
      const { data } = await api.get("/stakeholder-contacts/export", { params, responseType: "blob" });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stakeholder_contacts.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-heading font-bold">Kontak Stakeholder</h2>
            <p className="text-muted-foreground text-sm">Data kontak pengguna lulusan untuk email blast</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleExport("xlsx")} variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Excel</Button>
            <Button onClick={() => handleExport("csv")} variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />CSV</Button>
          </div>
        </div>

        <Card><CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari nama/email kontak atau NIM..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={graduationYear} onValueChange={setGraduationYear}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Lulusan</SelectItem>
                {years.map((y) => <SelectItem key={y} value={String(y)}>Lulusan {y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="bekerja">Bekerja</SelectItem>
                <SelectItem value="wiraswasta">Wiraswasta</SelectItem>
                <SelectItem value="lanjut_studi">Lanjut Studi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent></Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b pb-3"><CardTitle className="text-base">Daftar Kontak ({pagination.total})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>NIM</TableHead>
                <TableHead>Nama Alumni</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Nama Kontak</TableHead>
                <TableHead>Email Kontak</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tahun Lulus</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center"><Loader2 className="inline w-5 h-5 animate-spin" /> Memuat...</TableCell></TableRow>
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Belum ada data kontak stakeholder.</TableCell></TableRow>
                ) : data.map((row, i) => (
                  <TableRow key={row.id}>
                    <TableCell>{(page - 1) * 100 + i + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{row.nim}</TableCell>
                    <TableCell>{row.alumni_name}</TableCell>
                    <TableCell className="capitalize">{row.contact_type}</TableCell>
                    <TableCell>{row.contact_name}</TableCell>
                    <TableCell className="text-sm">{row.contact_email}</TableCell>
                    <TableCell className="capitalize">{row.alumni_status?.replace("_", " ")}</TableCell>
                    <TableCell>{row.graduation_year}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pagination.lastPage > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">Halaman {pagination.currentPage} dari {pagination.lastPage}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pagination.lastPage} onClick={() => setPage(page + 1)}>›</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StakeholderContactsPage;
