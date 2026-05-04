import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiService } from "@/lib/apiClient";

type DemoAccount = {
  id: number;
  name: string;
  email: string;
  role: string;
  program_name?: string | null;
  program_code?: string | null;
  program_degree?: string | null;
  password_hint?: string;
};

const LoginWithAPI = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [demoLoading, setDemoLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isLoading } = useAuth();

  useEffect(() => {
    const loadDemoAccounts = async () => {
      try {
        const response = await apiService.getDemoAccounts();
        setDemoAccounts(response.data || response);
      } catch (error) {
        console.error("Failed to load demo accounts:", error);
      } finally {
        setDemoLoading(false);
      }
    };

    loadDemoAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Email dan password harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      await login(email, password);
      
      // Clear form
      setEmail("");
      setPassword("");
      
      // Redirect ke dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (error: any) {
      console.error("Login error:", error);
      // Error toast sudah ditampilkan di hook
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="flex justify-center mb-8">
          <div className="rounded-full bg-primary/10 p-3">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
        </div>

        <h1 className="mb-2 text-center text-3xl font-bold">Tracer Study</h1>
        <p className="mb-8 text-center text-muted-foreground">
          Login ke dashboard Anda
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="bg-background"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="bg-background pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Login...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-4 rounded-lg border border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="text-center font-medium text-foreground">Akun demo yang tersedia</p>
          {demoLoading ? (
            <p className="mt-3 text-center text-sm text-muted-foreground">Memuat akun dari database...</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {demoAccounts.map((account) => (
                <li key={account.id} className="flex flex-col items-center gap-0.5 text-center">
                  <span className="font-medium text-foreground">{account.name}</span>
                  <span>{account.email} / {account.password_hint ?? "-"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginWithAPI;
