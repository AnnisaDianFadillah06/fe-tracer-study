import { cn } from "@/lib/utils";
import { institution } from "@/config/institution";

interface InstitutionLogoProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showText?: boolean;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

/**
 * Lockup logo aplikasi: gambar merek + dua baris teks.
 *
 * Marknya memakai `logo-mark.png` — versi tanpa wordmark. Berkas
 * `logo.png` yang utuh menyertakan tulisan "SMART TRACER" di bawah gambar,
 * dan pada ukuran 36–44px di sini tulisan itu tidak terbaca sama sekali,
 * sekadar jadi noda abu-abu. Yang utuh dipakai untuk og:image dan tempat
 * lain yang ukurannya besar.
 *
 * Subjudulnya jatuh ke akronim institusi dari konfigurasi. Jangan tulis
 * nama perguruan tinggi langsung di pemanggilnya.
 */
const InstitutionLogo = ({
  className,
  markClassName,
  textClassName,
  showText = true,
  title = "Tracer Study",
  subtitle = institution.shortName,
  compact = false,
}: InstitutionLogoProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex aspect-square flex-none items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-white/95 shadow-sm ring-1 ring-black/5",
          compact ? "h-9 w-9" : "h-11 w-11",
          markClassName,
        )}
      >
        <img
          src="/icon/logo-mark.png"
          alt={`Logo ${institution.shortName}`}
          className="h-auto w-auto max-h-[78%] max-w-[78%] object-contain"
        />
      </div>

      {showText && (
        <div className={textClassName}>
          <span className="font-heading font-bold text-lg leading-none">{title}</span>
          <span className="block -mt-0.5 text-xs text-muted-foreground">{subtitle}</span>
        </div>
      )}
    </div>
  );
};

export default InstitutionLogo;
