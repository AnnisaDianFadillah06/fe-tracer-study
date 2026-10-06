import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DimensionGroup {
  group: string;
  members: { key: string; label: string }[];
}

interface Props {
  value: string | null;
  groups: DimensionGroup[];
  /** key dimensi yang dipilih, atau null untuk "Tidak ada". */
  onChange: (key: string | null) => void;
  /** Teks tombol saat belum ada pilihan. */
  placeholder?: string;
  /** Tampilkan "Tidak ada" untuk mengosongkan pilihan. */
  allowClear?: boolean;
  /** Isi tombol pemicu; bawaannya nama dimensi terpilih. */
  trigger?: ReactNode;
  className?: string;
}

/**
 * Pemilih dimensi dua langkah: pilih dulu tabelnya (Perusahaan,
 * Program Studi, …), lalu sisinya (jenis instansi, jenjang, jurusan, …).
 * Pencarian melintasi semua tabel, jadi pengguna yang sudah tahu nama sisinya
 * tidak perlu menelusuri tabel satu per satu.
 */
const DimensionPicker = ({
  value,
  groups,
  onChange,
  placeholder = "Tidak ada",
  allowClear = true,
  trigger,
  className,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const selectedGroup = groups.find((g) => g.members.some((m) => m.key === value));
  const selectedLabel = selectedGroup?.members.find((m) => m.key === value)?.label;
  const activeGroup =
    groups.find((g) => g.group === picked) ?? selectedGroup ?? groups[0] ?? null;

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      q === ""
        ? []
        : groups.flatMap((g) =>
            g.members
              .filter((m) => m.label.toLowerCase().includes(q) || g.group.toLowerCase().includes(q))
              .map((m) => ({ ...m, group: g.group })),
          ),
    [groups, q],
  );

  const choose = (key: string | null) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQuery("");
          setPicked(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`h-9 justify-between text-sm font-normal hover:bg-muted hover:text-foreground data-[state=open]:bg-muted ${className ?? "w-[175px]"}`}
          title={selectedGroup && selectedLabel ? `${selectedGroup.group} › ${selectedLabel}` : undefined}
        >
          {trigger ?? (
            <span className={`truncate ${selectedLabel ? "" : "text-muted-foreground"}`}>
              {selectedLabel ?? placeholder}
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[440px] max-w-[92vw] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 border-b p-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari dimensi…"
            aria-label="Cari dimensi"
            className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
          />
          {allowClear && value && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2 text-xs"
              onClick={() => choose(null)}
            >
              <X className="h-3 w-3" /> Kosongkan
            </Button>
          )}
        </div>

        {q !== "" ? (
          <ul className="max-h-72 overflow-y-auto p-1">
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Tidak ada dimensi bernama itu.
              </li>
            )}
            {results.map((m) => (
              <li key={m.key}>
                <Option
                  selected={m.key === value}
                  label={m.label}
                  caption={m.group}
                  onClick={() => choose(m.key)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-[150px_1fr]">
            <ul className="max-h-72 overflow-y-auto border-r bg-muted/30 p-1" aria-label="Tabel dimensi">
              {groups.map((g) => {
                const active = g.group === activeGroup?.group;

                return (
                  <li key={g.group}>
                    <button
                      type="button"
                      onClick={() => setPicked(g.group)}
                      className={`flex w-full items-center justify-between gap-1 rounded-md px-2.5 py-1.5 text-left text-sm ${
                        active ? "bg-background font-medium shadow-sm" : "hover:bg-accent"
                      }`}
                    >
                      <span className="truncate">{g.group}</span>
                      {g.members.some((m) => m.key === value) && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <ul className="max-h-72 overflow-y-auto p-1" aria-label="Sisi dimensi">
              {activeGroup?.members.map((m) => (
                <li key={m.key}>
                  <Option selected={m.key === value} label={m.label} onClick={() => choose(m.key)} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

const Option = ({
  label,
  caption,
  selected,
  onClick,
}: {
  label: string;
  caption?: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-accent"
  >
    <span className="min-w-0">
      <span className="block truncate">{label}</span>
      {caption && <span className="block truncate text-xs text-muted-foreground">{caption}</span>}
    </span>
    {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
  </button>
);

export default DimensionPicker;
