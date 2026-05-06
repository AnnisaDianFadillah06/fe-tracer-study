import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ThemeToggle } from "@/components/ThemeToggle";
import PolbanLogo from "@/components/PolbanLogo";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { getInitialForms, type FormListItem } from "@/lib/formManagement";
import { ArrowRight, LogOut } from "lucide-react";

const StudentFormListPage = () => {
  const navigate = useNavigate();
  const { session, isLoggedIn, logout } = useStudentAuth();
  const [forms] = useState<FormListItem[]>(() => getInitialForms());

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [isLoggedIn, navigate]);

  const filteredForms = useMemo(() => {
    if (!session) return [];
    const angkatanTarget = session.angkatan ? `Lulusan Angkatan ${session.angkatan}` : "";

    return forms.filter((form) => {
      if (!form.target || form.target.length === 0) return false;
      if (form.target.includes("Semua Alumni")) return true;
      if (angkatanTarget && form.target.includes(angkatanTarget)) return true;
      return false;
    });
  }, [forms, session]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-6 h-14">
        <PolbanLogo compact title="Tracer Study" subtitle="POLBAN" textClassName="hidden sm:block" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-bold">Daftar Kuisioner Tracer Study</h1>
          <p className="text-sm text-muted-foreground">
            {session?.username}, pilih kuisioner yang sesuai dengan angkatan Anda untuk mulai mengisi.
          </p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama Kuisioner</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Sasaran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredForms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Belum ada kuisioner untuk angkatan Anda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredForms.map((form, index) => {
                      const hasResponded = form.responses.some(
                        (response) => response.respondent?.toLowerCase() === session?.username?.toLowerCase()
                      );

                      return (
                        <TableRow key={form.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium">{form.title}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {form.description || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {form.target.length > 0 ? form.target.join(", ") : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={hasResponded ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-700"}>
                              {hasResponded ? "Sudah diisi" : "Belum diisi"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => navigate(`/form/${form.id}?mode=student`)}
                            >
                              Isi Kuisioner
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudentFormListPage;
