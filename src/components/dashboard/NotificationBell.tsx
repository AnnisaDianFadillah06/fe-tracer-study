import { Link } from "react-router-dom";
import { Bell, ClipboardCheck, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/common/useNotifications";

/**
 * Lonceng pemberitahuan: pintasan ke pekerjaan yang menunggu tindakan.
 *
 * Isinya sengaja hanya dua hal, dan keduanya punya halaman tujuan yang sudah
 * ada. Titik penanda muncul hanya kalau ada yang benar-benar menunggu —
 * sebelumnya titik itu di-hardcode, jadi selalu menyala dan tak berarti apa-apa.
 *
 * Peran yang tidak berkepentingan menerima angka nol dari peladen, sehingga
 * baris yang tidak relevan tidak pernah muncul dan tidak perlu ada pengecekan
 * peran kedua di sini.
 */

interface NotificationItem {
  key: string;
  count: number;
  label: string;
  href: string;
  icon: typeof Bell;
}

const NotificationBell = () => {
  const { summary } = useNotifications();

  const items: NotificationItem[] = [
    {
      key: "approvals",
      count: summary.approvals_pending,
      label: "permintaan persetujuan menunggu",
      href: "/dashboard/approvals",
      icon: ClipboardCheck,
    },
    {
      key: "dsr",
      count: summary.data_subject_requests_pending,
      label: "permintaan data alumni belum ditinjau",
      href: "/dashboard/permintaan-data",
      icon: ShieldQuestion,
    },
  ].filter((item) => item.count > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Pemberitahuan">
          <Bell className="w-5 h-5" />
          {summary.total > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 bg-card border-border">
        <DropdownMenuLabel>Pemberitahuan</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            Tidak ada yang menunggu tindakan.
          </div>
        ) : (
          items.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem key={item.key} asChild>
                <Link to={item.href} className="flex items-start gap-2">
                  <Icon className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span className="text-sm">
                    <span className="font-medium">{item.count}</span> {item.label}
                  </span>
                </Link>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
