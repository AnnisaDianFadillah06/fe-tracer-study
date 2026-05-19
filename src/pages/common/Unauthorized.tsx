import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";

const Unauthorized = () => {
  const { defaultRoute } = useRole();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <ShieldX className="w-16 h-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-heading font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground max-w-md">
          Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.
        </p>
        <Button asChild>
          <Link to={defaultRoute}>Kembali ke Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default Unauthorized;
