import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { ExportProgress } from "@/lib/exportQuestionnaire";

/** Ubah bita jadi satuan yang enak dibaca; dipakai saat persennya tak diketahui. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  /** Kemajuan yang sedang berjalan; null berarti tidak ada ekspor. */
  progress: ExportProgress | null;
  /** Judul kuesioner yang sedang diekspor, untuk baris keterangan. */
  label?: string;
  /** true bila berkasnya format kode mentah untuk unggah DIKTI. */
  rawCode?: boolean;
}

/**
 * Penanda kemajuan ekspor kuesioner.
 *
 * Sebelum ini ekspor berjalan sunyi: satu-satunya tanda adalah label tombol
 * yang berubah jadi "Mengekspor…", sementara lembar Kementerian untuk
 * seangkatan penuh berjalan puluhan detik. Halaman terlihat menggantung dan
 * petugas menekan tombolnya lagi.
 *
 * Dialognya sengaja tidak bisa ditutup: menutupnya hanya menyembunyikan
 * penandanya, tidak membatalkan penyusunan berkas di server.
 *
 * Bentuknya mengikuti dialog kemajuan impor alumni di StudentManagementPage —
 * dua penantian yang serupa sebaiknya terlihat serupa.
 */
const ExportProgressDialog = ({ progress, label, rawCode }: Props) => {
  const menyiapkan = progress?.phase === "menyiapkan";

  return (
    <Dialog open={progress !== null}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {rawCode ? "Mengekspor kode mentah DIKTI" : "Mengekspor hasil kuesioner"}
          </DialogTitle>
          <DialogDescription className="truncate">{label}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Fase menyiapkan tidak punya persen yang jujur, jadi bilahnya diisi
              penuh dan diberi denyut alih-alih angka karangan yang merambat
              sendiri. */}
          <Progress
            value={menyiapkan ? 100 : progress?.percent ?? 100}
            className={menyiapkan || progress?.percent === null ? "animate-pulse" : undefined}
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {menyiapkan ? "Menyusun berkas di server…" : "Mengunduh berkas…"}
            </span>
            {!menyiapkan && progress && (
              <span>
                {progress.percent !== null
                  ? `${progress.percent}%`
                  : formatBytes(progress.loaded)}
              </span>
            )}
          </div>
          {menyiapkan && (
            <p className="text-xs text-muted-foreground">
              Angkatan dengan ribuan responden bisa memakan waktu sampai beberapa
              menit. Jangan menutup atau memuat ulang halaman ini.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportProgressDialog;
