import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDimensionValues } from "@/hooks/useExplorer";
import { FILTER_OPERATORS, type ExplorerFilter, type FilterOperator } from "@/lib/olapExplorer";
import { cn } from "@/lib/utils";

interface Props {
  cube: string;
  filter: ExplorerFilter;
  label: string;
  onChange: (next: ExplorerFilter) => void;
  onRemove: () => void;
}

/**
 * Satu baris filter: nama dimensi, nilai-nilai yang dipilih, dan tombol hapus.
 *
 * Daftar nilainya diambil dari peladen per dimensi, bukan disimpulkan dari
 * hasil query — pengguna perlu melihat pilihan yang ada sebelum menyaring,
 * termasuk nilai yang justru belum muncul di hasil saat ini.
 */
const ExplorerFilterRow = ({ cube, filter, label, onChange, onRemove }: Props) => {
  const [open, setOpen] = useState(false);
  const operator: FilterOperator = filter.operator ?? "equals";

  // "ada nilainya"/"kosong" tidak memilih nilai, jadi daftarnya tidak perlu diambil.
  const needsValues = operator === "equals" || operator === "notEquals";
  const { data: values, isLoading } = useDimensionValues(needsValues ? filter.member : null, cube);

  const toggle = (value: string) => {
    onChange({
      ...filter,
      values: filter.values.includes(value)
        ? filter.values.filter((v) => v !== value)
        : [...filter.values, value],
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onRemove}
          aria-label={`Hapus filter ${label}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Select
        value={operator}
        onValueChange={(v) => onChange({ ...filter, operator: v as FilterOperator })}
      >
        <SelectTrigger className="h-8 text-xs" aria-label={`Jenis saringan ${label}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTER_OPERATORS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {label} {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {needsValues && (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            <span className="truncate">
              {filter.values.length === 0
                ? "Semua nilai"
                : `${filter.values.length} dipilih`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-0" align="start">
          <ScrollArea className="h-64">
            <div className="p-1">
              {isLoading && (
                <p className="px-2 py-3 text-sm text-muted-foreground">Memuat nilai…</p>
              )}

              {!isLoading && (values ?? []).length === 0 && (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  Tidak ada nilai untuk dimensi ini.
                </p>
              )}

              {(values ?? []).map((value) => {
                const selected = filter.values.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggle(value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                      "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{value}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      )}

      {needsValues && filter.values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filter.values.map((value) => (
            <Badge key={value} variant="secondary" className="max-w-full">
              <span className="truncate">{value}</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExplorerFilterRow;
