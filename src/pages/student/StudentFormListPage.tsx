import { useEffect, useState } from "react";
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
import { ArrowRight, LogOut, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface BackendQuestionnaire {
  id: number;
  code: string;
  title: string;
  description: string | null;
  status: string;
  program_id: number | null;
  is_global: boolean;
  questions: unknown[];
}

const StudentFormListPage = () => {
  const navigate = useNavigate();
  const { session, isLoggedIn, logout } = useStudentAuth();
  const [forms, setForms] = useState<BackendQuestionnaire[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!session?.kodeProdi) return;

    const fetchForms = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get("/tracer-study/forms", {
          params: { kode_prodi: session.kodeProdi },
        });

        if (data.success && data.data) {
          setForms(data.data);
        }
      } catch (err) {
        console.warn("[StudentFormListPage] Failed to fetch forms:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForms();
  }, [session?.kodeProdi]);

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
          <h1 className="font-heading text-2xl font-bold">Daftar Kuesioner Tracer Study</h1>
          <p className="text-sm text-muted-foreground">
            {session?.username}, berikut adalah kuesioner yang tersedia untuk program studi Anda ({session?.prodi}).
          </p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama Kuesioner</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Pertanyaan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Memuat kuesioner...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : forms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Belum ada kuesioner aktif untuk program studi Anda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    forms.map((form, index) => (
                      <TableRow key={form.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <p className="font-medium leading-snug">{form.title}</p>
                          <p className="text-xs text-muted-foreground">{form.code}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {form.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            form.is_global
                              ? "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                              : "border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                          }>
                            {form.is_global ? "Kementerian" : "Prodi"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {Array.isArray(form.questions) ? form.questions.length : 0} soal
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => navigate("/form/fill")}
                          >
                            Isi Kuesioner
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
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