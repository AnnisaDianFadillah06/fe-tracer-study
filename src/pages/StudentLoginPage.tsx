import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useStudentManagement } from "@/hooks/useStudentManagement";
import { ThemeToggle } from "@/components/ThemeToggle";
import PolbanLogo from "@/components/PolbanLogo";

const StudentLoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useStudentAuth();
  const { authenticate } = useStudentManagement();
  const [nimOrEmail, setNimOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nimOrEmail || !password) {
      toast({ title: "Error", description: "Isi NIM/email dan password", variant: "destructive" });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const student = authenticate(nimOrEmail, password);
      if (student) {
        login({
          nim: student.nim,
          username: student.username,
          email: student.email,
          prodi: student.prodi,
          angkatan: student.angkatan,
        });
        navigate("/form");
      } else {
        toast({
          title: "Login Gagal",
          description: "NIM/email atau password salah, atau akun Nonaktif",
          variant: "destructive",
        });
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6">
        <PolbanLogo compact title="Tracer Study" subtitle="POLBAN" textClassName="hidden sm:block" />
        <ThemeToggle />
      </header>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto h-16 w-16 overflow-hidden rounded-2xl border border-border/40 bg-white shadow-sm">
              <img src="/icon/android-chrome-192x192.png" alt="Logo POLBAN" className="h-full w-full object-contain p-1.5" />
            </div>
            <h1 className="font-heading text-2xl font-bold">Masuk</h1>
            <p className="text-sm text-muted-foreground">
              Gunakan NIM dan password yang diberikan admin untuk mengisi kuesioner
            </p>
          </div>

          <Card className="glass-card">
            <CardContent className="pt-6 pb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nimOrEmail">NIM atau Email</Label>
                  <Input
                    id="nimOrEmail"
                    placeholder="211511001 atau nim@student.polban.ac.id"
                    value={nimOrEmail}
                    onChange={(e) => setNimOrEmail(e.target.value)}
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      autoComplete="current-password"
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

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Memverifikasi..." : "Masuk ke Kuesioner"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Hubungi admin jika Anda belum memiliki akun atau lupa password
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentLoginPage;
