import { useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Ikon "?" kecil yang menjelaskan istilah saat disorot, difokus, atau diklik.
 *
 * Tooltip Radix bawaannya hanya untuk hover dan justru menutup saat ikonnya
 * ditekan, jadi di layar sentuh penjelasannya tidak pernah muncul; di sini
 * klik membuka/menutupnya. Isinya lewat portal dan muncul ke bawah: tanpa
 * portal, ikon di baris atas toolbar memunculkan tooltip yang tertutup header.
 */
const HelpTip = ({ children }: { children: string }) => {
  const [open, setOpen] = useState(false);
  // Radix menutup tooltip saat pointerdown di ikon, sebelum klik; penutupan
  // itu diabaikan supaya klik yang menentukan buka/tutup.
  const pressing = useRef(false);
  // Ditutup lewat klik: jangan dibuka lagi oleh hover selama kursor masih
  // di atas ikon, baru boleh setelah kursor keluar.
  const closedByClick = useRef(false);

  const handleOpenChange = (next: boolean) => {
    if (!next && pressing.current) return;
    if (next && closedByClick.current) return;
    setOpen(next);
  };

  return (
    <Tooltip open={open} onOpenChange={handleOpenChange}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex align-middle text-muted-foreground hover:text-foreground"
          aria-label={children}
          onPointerDown={() => {
            pressing.current = true;
          }}
          onClick={(e) => {
            e.preventDefault();
            pressing.current = false;
            closedByClick.current = open;
            setOpen(!open);
          }}
          onPointerLeave={() => {
            pressing.current = false;
            closedByClick.current = false;
          }}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipPrimitive.Portal>
        <TooltipContent side="bottom" collisionPadding={8} className="max-w-xs text-xs">
          {children}
        </TooltipContent>
      </TooltipPrimitive.Portal>
    </Tooltip>
  );
};

export default HelpTip;
