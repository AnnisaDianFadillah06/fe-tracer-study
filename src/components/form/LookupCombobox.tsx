import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useLookupOptions,
  type LookupSource,
} from "@/hooks/form/useLookupOptions";

interface LookupComboboxProps {
  source: LookupSource;
  /** Kolom tabel referensi yang disimpan sebagai jawaban. */
  valueField?: "id" | "code";
  value: string;
  onChange: (value: string) => void;
  /**
   * Jawaban pertanyaan induk — hanya dipakai kab/kota, isinya provinces.id
   * milik provinsi yang sedang terpilih.
   */
  parentValue?: string;
  /** Teks yang muncul saat induk belum dijawab. */
  parentEmptyHint?: string;
  hasError?: boolean;
  id?: string;
}

/**
 * Isian yang pilihannya diambil dari tabel referensi, bukan dari opsi yang
 * diketik pembuat borang.
 *
 * Yang tampil selalu nama ("Kota Bandung"); yang tersimpan kunci barisnya
 * (cities.id). Sebelumnya alumni harus mengunduh CSV, mencari kodenya, lalu
 * mengetik ulang — sumber utama jawaban wilayah yang tidak cocok dengan tabel
 * referensi dan karenanya gagal dicocokkan ETL.
 *
 * Kab/kota tidak pernah menampilkan 528 baris sekaligus: daftarnya diminta
 * per provinsi, sehingga yang perlu ditelusuri alumni tinggal belasan.
 */
const LookupCombobox = ({
  source,
  valueField = "id",
  value,
  onChange,
  parentValue,
  parentEmptyHint = "Pilih provinsi terlebih dahulu",
  hasError = false,
  id,
}: LookupComboboxProps) => {
  const [open, setOpen] = useState(false);

  // Endpoint kab/kota menyaring dengan province_code, sedangkan jawaban
  // provinsi yang tersimpan adalah provinces.id. Daftar provinsi dipakai
  // sebagai penerjemah id -> code; sudah ter-cache, jadi tidak menambah
  // permintaan jaringan.
  const needsParent = source === "city";
  const { options: provinces } = useLookupOptions(needsParent ? "province" : undefined);
  const parentCode = useMemo(() => {
    if (!needsParent || !parentValue) return undefined;
    return provinces.find((p) => p.value === parentValue)?.code;
  }, [needsParent, parentValue, provinces]);

  const { options, isLoading, error } = useLookupOptions(source, valueField, parentCode);

  const selectedLabel = options.find((o) => o.value === value)?.label;
  const isWaitingForParent = needsParent && !parentValue;
  const disabled = isWaitingForParent || (isLoading && options.length === 0);

  const placeholder = isWaitingForParent
    ? parentEmptyHint
    : isLoading && options.length === 0
      ? "Memuat daftar…"
      : "Pilih dari daftar";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedLabel && "text-muted-foreground",
            hasError && "border-destructive",
          )}
        >
          <span className="truncate">{selectedLabel ?? placeholder}</span>
          {isLoading && options.length === 0 ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Ketik untuk mencari…" />
          <CommandList>
            <CommandEmpty>
              {error ?? "Tidak ada yang cocok dengan pencarian Anda."}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  // cmdk menyaring berdasarkan value item, bukan teks anaknya.
                  // Label digabung agar pencarian mengenai nama wilayah, dan
                  // kunci baris tetap dibawa lewat onSelect.
                  value={`${option.label} ${option.hint ?? ""}`}
                  onSelect={() => {
                    onChange(option.value === value ? "" : option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      option.value === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.hint && (
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {option.hint}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default LookupCombobox;
