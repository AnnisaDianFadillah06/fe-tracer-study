import { useState, type ReactNode } from "react";
import { Calculator, ChevronDown, ChevronUp, Plus, Sigma, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ExplorerFilterRow from "./ExplorerFilterRow";
import FormulaDialog from "./FormulaDialog";
import HelpTip from "./HelpTip";
import { useDimensionValues } from "@/hooks/useExplorer";
import {
  lowerFirst,
  measureLabelOf,
  type CatalogCube,
  type ExplorerCatalog,
  type ExplorerQueryInput,
  type PercentMode,
} from "@/lib/olapExplorer";

/** Nilai penanda "tidak ada" untuk Select — Radix tidak menerima value kosong. */
const NONE = "__none__";

const DEFAULT_MIN_N = 30;

interface Props {
  catalog: ExplorerCatalog;
  cube: CatalogCube;
  input: ExplorerQueryInput;
  onChange: (next: ExplorerQueryInput) => void;
  /** Panel dibuka penuh atau diringkas jadi satu kalimat. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kalimat ringkas susunan saat ini, tampil ketika panel diringkas. */
  summary: string;
}

/**
 * Buang pilihan olah hasil yang tidak lagi masuk akal setelah susunan
 * berubah: urutan pada ukuran yang sudah dilepas, selisih kolom tanpa
 * dimensi kolom, dan persen per baris/kolom tanpa dimensi kolom (setiap
 * baris akan selalu 100%).
 */
function consistent(next: ExplorerQueryInput): ExplorerQueryInput {
  const shown = new Set([...next.measures, ...(next.formulas ?? []).map((f) => f.key)]);
  const out = { ...next };

  if (out.sort && !shown.has(out.sort.by)) out.sort = null;
  if (!out.colDim) {
    out.diff = null;
    if (out.percent === "row" || out.percent === "column") out.percent = "all";
  }

  return out;
}

const ExplorerControls = ({ catalog, cube, input, onChange, open, onOpenChange, summary }: Props) => {
  const [displayOpen, setDisplayOpen] = useState(false);
  const update = (next: ExplorerQueryInput) => onChange(consistent(next));

  const allDimensions = cube.dimension_groups.flatMap((g) => g.members);
  const labelOf = (key: string) =>
    allDimensions.find((d) => d.key === key)?.label ?? key;

  const formulas = input.formulas ?? [];
  const maxFormulas = catalog.limits.max_formulas ?? 3;
  const maxRowDims = catalog.limits.max_dimensions - (input.colDim ? 1 : 0);
  const curatedKeys = new Set(cube.measures.map((m) => m.key));
  const fromColumns = input.measures.filter((m) => !curatedKeys.has(m));
  const measuresFull = input.measures.length >= catalog.limits.max_measures;

  /**
   * Berpindah sumber data mengosongkan seluruh pilihan. Measure dan dimensi
   * milik cube lama tidak berlaku di cube baru — kalau dibawa, peladen
   * menolaknya dan pengguna melihat galat yang tidak ia sebabkan.
   */
  const changeCube = (key: string) => {
    onChange({ cube: key, measures: [], rowDims: [], colDim: null, filters: [] });
  };

  const toggleMeasure = (key: string) => {
    const selected = input.measures.includes(key);

    if (!selected && measuresFull) return;

    update({
      ...input,
      measures: selected
        ? input.measures.filter((m) => m !== key)
        : [...input.measures, key],
    });
  };

  /** Dimensi yang sudah terpakai di tempat lain tidak ditawarkan lagi. */
  const availableFor = (slot: "row0" | "row1" | "col") => {
    const taken = new Set<string>([
      ...input.rowDims,
      ...(input.colDim ? [input.colDim] : []),
    ]);

    const current =
      slot === "col" ? input.colDim : input.rowDims[slot === "row0" ? 0 : 1];
    if (current) taken.delete(current);

    return cube.dimension_groups
      .map((g) => ({
        group: g.group,
        members: g.members.filter((m) => !taken.has(m.key)),
      }))
      .filter((g) => g.members.length > 0);
  };

  const setRowDim = (index: number, key: string) => {
    const next = [...input.rowDims];

    if (key === NONE) {
      next.splice(index, 1);
    } else {
      next[index] = key;
    }

    update({ ...input, rowDims: next.filter(Boolean) });
  };

  const addFilter = (member: string) => {
    if (input.filters.some((f) => f.member === member)) return;
    update({ ...input, filters: [...input.filters, { member, operator: "equals", values: [] }] });
  };

  const unfilteredDimensions = allDimensions.filter(
    (d) => !input.filters.some((f) => f.member === d.key),
  );

  // ── Ukuran dari kolom angka ──
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [pickColumn, setPickColumn] = useState<string>("");
  const [pickFn, setPickFn] = useState<string>("avg");
  const numericColumns = cube.numeric_columns ?? [];
  const pickedColumn = numericColumns.find((c) => c.column === pickColumn);
  const pickedKey = pickedColumn?.functions.find((f) => f.fn === pickFn)?.key ?? null;

  const addColumnMeasure = () => {
    if (!pickedKey || input.measures.includes(pickedKey) || measuresFull) return;
    update({ ...input, measures: [...input.measures, pickedKey] });
    setColumnPickerOpen(false);
    setPickColumn("");
  };

  // ── Rumus ──
  const [formulaOpen, setFormulaOpen] = useState(false);
  const nextFormulaKey = (() => {
    const used = new Set(formulas.map((f) => f.key));
    for (let i = 1; i <= 9; i++) if (!used.has(`rumus_${i}`)) return `rumus_${i}`;
    return "rumus_9";
  })();

  // ── Olah hasil ──
  const hasCount = input.measures.some(
    (m) => cube.measures.find((x) => x.key === m)?.format === "integer",
  );
  const sortables = [
    ...input.measures.map((key) => ({ key, label: measureLabelOf(cube, key) })),
    ...formulas.map((f) => ({ key: f.key, label: f.label })),
  ];

  // Pilihan "selisih dua kolom" = nilai dimensi kolom; kalau kolomnya
  // sudah disaring, cukup nilai yang dipilih di saringan itu.
  const { data: columnValues } = useDimensionValues(input.colDim, input.cube);
  const colFilter = input.filters.find(
    (f) => f.member === input.colDim && (f.operator ?? "equals") === "equals" && f.values.length > 0,
  );
  const diffChoices = colFilter ? colFilter.values : columnValues ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">Susun analisis</CardTitle>
          <p className={open ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>
            {open
              ? "Tiga langkah: pilih yang dihitung, pilih pembagiannya, lalu batasi bila perlu."
              : summary || "Belum ada yang dipilih."}
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => onOpenChange(!open)}>
          {open ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Tutup
            </>
          ) : (
            <>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Ubah susunan
            </>
          )}
        </Button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-5">
          {/* ── Sumber data (hanya bila ada lebih dari satu pilihan) ── */}
          {catalog.cubes.length > 1 && (
            <div className="space-y-1.5 sm:max-w-sm">
              <Label>Data yang dianalisis</Label>
              <Select value={input.cube} onValueChange={changeCube}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalog.cubes.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{cube.description}</p>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-3">
            {/* ── Ukuran ──────────────────────────────────────────── */}
            <div className="space-y-2 xl:border-l xl:pl-6 xl:first:border-l-0 xl:first:pl-0">
              <div className="flex items-baseline justify-between">
                <Label>
                  1. Apa yang ingin dihitung?{" "}
                  <HelpTip>Yang dihitung dari data, misalnya jumlah alumni atau rata-rata gaji.</HelpTip>
                </Label>
                <span className="text-xs text-muted-foreground">
                  {input.measures.length}/{catalog.limits.max_measures} dipilih
                </span>
              </div>

              <p className="text-xs font-medium text-muted-foreground">Siap pakai</p>
              {measuresFull && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Maksimal {catalog.limits.max_measures} ukuran — lepas salah satu untuk menambah yang lain.
                </p>
              )}
              <ScrollArea className="h-44 rounded-md border">
                <div className="space-y-0.5 p-2">
                  {cube.measures.map((m) => {
                    const checked = input.measures.includes(m.key);
                    const penuh = !checked && measuresFull;

                    return (
                      <label
                        key={m.key}
                        className={`flex items-start gap-2 rounded-sm px-1.5 py-1.5 text-sm ${
                          penuh ? "opacity-40" : "cursor-pointer hover:bg-accent"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={penuh}
                          onCheckedChange={() => toggleMeasure(m.key)}
                          className="mt-0.5"
                        />
                        <span className="leading-snug">
                          {m.label}
                          {m.description && (
                            <span className="block text-xs text-muted-foreground">
                              {m.description}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Ukuran dari kolom angka & rumus yang sudah dipilih */}
              {(fromColumns.length > 0 || formulas.length > 0) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {fromColumns.map((key) => (
                    <Chip key={key} icon={<Sigma className="h-3 w-3" />} onRemove={() => toggleMeasure(key)}>
                      {measureLabelOf(cube, key)}
                    </Chip>
                  ))}
                  {formulas.map((f) => (
                    <Chip
                      key={f.key}
                      icon={<Calculator className="h-3 w-3" />}
                      onRemove={() => update({ ...input, formulas: formulas.filter((x) => x.key !== f.key) })}
                    >
                      {f.label}
                    </Chip>
                  ))}
                </div>
              )}

              {numericColumns.length > 0 &&
                (columnPickerOpen ? (
                  <div className="space-y-2 rounded-md border p-2">
                    <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                      <Select value={pickFn} onValueChange={setPickFn}>
                        <SelectTrigger className="h-8 w-32 text-xs" aria-label="Fungsi">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(pickedColumn ?? numericColumns[0]).functions.map((f) => (
                            <SelectItem key={f.fn} value={f.fn}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={pickColumn} onValueChange={setPickColumn}>
                        <SelectTrigger className="h-8 text-xs" aria-label="Kolom angka">
                          <SelectValue placeholder="dari kolom…" />
                        </SelectTrigger>
                        <SelectContent>
                          {numericColumns.map((c) => (
                            <SelectItem key={c.column} value={c.column}>
                              dari {lowerFirst(c.label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setColumnPickerOpen(false)}>
                        Batal
                      </Button>
                      <Button
                        size="sm"
                        onClick={addColumnMeasure}
                        disabled={!pickedKey || input.measures.includes(pickedKey) || measuresFull}
                      >
                        Tambahkan
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled={measuresFull}
                    onClick={() => setColumnPickerOpen(true)}
                  >
                    <Sigma className="mr-2 h-3.5 w-3.5" />
                    Hitung dari kolom angka
                  </Button>
                ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={formulas.length >= maxFormulas}
                onClick={() => setFormulaOpen(true)}
              >
                <Calculator className="mr-2 h-3.5 w-3.5" />
                Buat rumus
              </Button>
            </div>


            {/* ── Dimensi ─────────────────────────────────────────── */}
            <div className="space-y-3 xl:border-l xl:pl-6 xl:first:border-l-0 xl:first:pl-0">
              <Label>
                2. Dibagi menurut apa?{" "}
                <span className="font-normal text-muted-foreground">(opsional)</span>{" "}
                <HelpTip>
                  Memecah hasil menjadi kelompok, misalnya per jurusan atau per tahun lulus. Kosongkan
                  untuk satu angka total.
                </HelpTip>
              </Label>

              <DimensionSelect
                label="Per"
                value={input.rowDims[0] ?? null}
                groups={availableFor("row0")}
                onChange={(key) => setRowDim(0, key)}
              />

              {/* Slot baris kedua baru muncul setelah yang pertama terisi —
                  memilih dimensi baris kedua tanpa yang pertama tidak berarti
                  apa-apa, dan menampilkannya hanya membuat panel ini ramai. */}
              {input.rowDims.length > 0 && maxRowDims > 1 && (
                <DimensionSelect
                  label="Lalu dipecah lagi per"
                  value={input.rowDims[1] ?? null}
                  groups={availableFor("row1")}
                  onChange={(key) => setRowDim(1, key)}
                />
              )}

              <DimensionSelect
                label="Dibandingkan berdampingan antar"
                hint="Menaruh kelompok ini sebagai kolom, sehingga bisa dibandingkan berdampingan dengan kelompok di atas, misalnya status alumni per jurusan."
                value={input.colDim}
                groups={availableFor("col")}
                onChange={(key) =>
                  update({ ...input, colDim: key === NONE ? null : key })
                }
              />
            </div>

            {/* ── Filter ──────────────────────────────────────────── */}
            <div className="space-y-3 xl:border-l xl:pl-6 xl:first:border-l-0 xl:first:pl-0">
              <Label>
                3. Batasi ke…{" "}
                <span className="font-normal text-muted-foreground">(opsional)</span>{" "}
                <HelpTip>Hanya menghitung sebagian data, misalnya alumni angkatan 2023 saja.</HelpTip>
              </Label>

              {input.filters.map((f) => (
                <ExplorerFilterRow
                  key={f.member}
                  cube={input.cube}
                  filter={f}
                  label={labelOf(f.member)}
                  onChange={(next) =>
                    update({
                      ...input,
                      filters: input.filters.map((x) => (x.member === f.member ? next : x)),
                    })
                  }
                  onRemove={() =>
                    update({
                      ...input,
                      filters: input.filters.filter((x) => x.member !== f.member),
                    })
                  }
                />
              ))}

              {unfilteredDimensions.length > 0 && (
                <Select value="" onValueChange={addFilter}>
                  <SelectTrigger className="text-muted-foreground">
                    <span className="flex items-center gap-2 text-sm">
                      <Plus className="h-3.5 w-3.5" />
                      Tambah batasan
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {cube.dimension_groups.map((g) => {
                      const members = g.members.filter(
                        (m) => !input.filters.some((f) => f.member === m.key),
                      );
                      if (members.length === 0) return null;

                      return (
                        <SelectGroup key={g.group}>
                          <SelectLabel>{g.group}</SelectLabel>
                          {members.map((m) => (
                            <SelectItem key={m.key} value={m.key}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <Separator />

          {/* ── Pengaturan tampilan (terlipat) ──────────────────── */}
          <Collapsible open={displayOpen} onOpenChange={setDisplayOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
              <span>
                Pengaturan tampilan{" "}
                <span className="font-normal text-muted-foreground">
                  (persen, urutan, sembunyikan kelompok kecil)
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${displayOpen ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="grid gap-5 pt-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Tampilkan jumlah sebagai{" "}
                    <HelpTip>Ubah angka jumlah menjadi persen dari totalnya, agar kelompok besar dan kecil mudah dibandingkan.</HelpTip>
                  </span>
                  <Select
                    value={input.percent ?? "none"}
                    onValueChange={(v) => update({ ...input, percent: v as PercentMode })}
                    disabled={!hasCount}
                  >
                    <SelectTrigger className="h-8 text-xs" aria-label="Tampilkan jumlah sebagai">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Angka apa adanya</SelectItem>
                      {input.colDim && <SelectItem value="row">Persen dari total baris</SelectItem>}
                      {input.colDim && <SelectItem value="column">Persen dari total kolom</SelectItem>}
                      <SelectItem value="all">Persen dari total keseluruhan</SelectItem>
                    </SelectContent>
                  </Select>
                  {!hasCount && (
                    <p className="text-xs text-muted-foreground">Tersedia bila ada ukuran berupa jumlah.</p>
                  )}
                </div>

                {cube.count_measure && (
                  <div className="space-y-1.5">
                    <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
                      <span>
                        Sembunyikan kelompok kecil{" "}
                        <HelpTip>Menyembunyikan kelompok dengan responden sedikit, karena angkanya kurang bisa dipercaya.</HelpTip>
                      </span>
                      <Switch
                        checked={!!input.minN}
                        onCheckedChange={(on) => update({ ...input, minN: on ? DEFAULT_MIN_N : null })}
                        aria-label="Sembunyikan kelompok kecil"
                      />
                    </label>
                    {!!input.minN && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        responden kurang dari
                        <Input
                          type="number"
                          min={1}
                          value={input.minN}
                          onChange={(e) => {
                            const n = Math.max(1, Number(e.target.value) || 1);
                            update({ ...input, minN: n });
                          }}
                          className="h-8 w-20 text-xs"
                          aria-label="Jumlah responden minimum"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Urutkan</span>
                  <Select
                    value={input.sort?.by ?? NONE}
                    onValueChange={(v) =>
                      update({
                        ...input,
                        sort:
                          v === NONE
                            ? null
                            : { by: v, direction: input.sort?.direction ?? "desc", limit: input.sort?.limit ?? null },
                      })
                    }
                    disabled={sortables.length === 0}
                  >
                    <SelectTrigger className="h-8 text-xs" aria-label="Urutkan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Urutan bawaan</SelectItem>
                      {sortables.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          menurut {lowerFirst(s.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {input.sort && (
                    <div className="grid gap-2">
                      <Select
                        value={input.sort.direction}
                        onValueChange={(v) =>
                          update({ ...input, sort: { ...input.sort!, direction: v as "asc" | "desc" } })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs" aria-label="Arah urutan">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Terbesar dulu</SelectItem>
                          <SelectItem value="asc">Terkecil dulu</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={input.sort.limit ? String(input.sort.limit) : "all"}
                        onValueChange={(v) =>
                          update({ ...input, sort: { ...input.sort!, limit: v === "all" ? null : Number(v) } })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs" aria-label="Jumlah yang ditampilkan">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tampilkan semua</SelectItem>
                          {[5, 10, 20, 50].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} teratas
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {input.colDim && diffChoices.length >= 2 && (
                  <div className="space-y-1.5">
                    <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
                      Tampilkan selisih dua kolom
                      <Switch
                        checked={!!input.diff}
                        onCheckedChange={(on) =>
                          update({ ...input, diff: on ? { a: diffChoices[0], b: diffChoices[1] } : null })
                        }
                        aria-label="Tampilkan selisih dua kolom"
                      />
                    </label>
                    {input.diff && (
                      <div className="grid gap-1 text-xs">
                        <ValueSelect
                          value={input.diff.b}
                          choices={diffChoices}
                          onChange={(b) => update({ ...input, diff: { ...input.diff!, b } })}
                        />
                        <span className="pl-1 text-muted-foreground">dikurangi</span>
                        <ValueSelect
                          value={input.diff.a}
                          choices={diffChoices}
                          onChange={(a) => update({ ...input, diff: { ...input.diff!, a } })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      )}

      <FormulaDialog
        open={formulaOpen}
        onOpenChange={setFormulaOpen}
        cube={cube}
        formulaKey={nextFormulaKey}
        onSave={(f) => {
          update({ ...input, formulas: [...formulas, f] });
          setFormulaOpen(false);
        }}
      />
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────

const Chip = ({
  icon,
  children,
  onRemove,
}: {
  icon: ReactNode;
  children: string;
  onRemove: () => void;
}) => (
  <Badge variant="secondary" className="max-w-full gap-1 py-1 pl-2 pr-1 font-normal">
    {icon}
    <span className="truncate">{children}</span>
    <button
      type="button"
      onClick={onRemove}
      className="rounded-sm p-0.5 hover:bg-background"
      aria-label={`Lepas ${children}`}
    >
      <X className="h-3 w-3" />
    </button>
  </Badge>
);

const ValueSelect = ({
  value,
  choices,
  onChange,
}: {
  value: string;
  choices: string[];
  onChange: (v: string) => void;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="h-8 text-xs">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {choices.map((c) => (
        <SelectItem key={c} value={c}>
          {c}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

interface DimensionSelectProps {
  label: string;
  /** Penjelasan singkat yang muncul di ikon "?" di samping label. */
  hint?: string;
  value: string | null;
  groups: { group: string; members: { key: string; label: string }[] }[];
  onChange: (key: string) => void;
}

const DimensionSelect = ({ label, hint, value, groups, onChange }: DimensionSelectProps) => (
  <div className="space-y-1.5">
    <span className="text-xs font-medium text-muted-foreground">
      {label} {hint && <HelpTip>{hint}</HelpTip>}
    </span>
    <Select value={value ?? NONE} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Tidak ada" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Tidak ada</SelectItem>
        {groups.map((g) => (
          <SelectGroup key={g.group}>
            <SelectLabel>{g.group}</SelectLabel>
            {g.members.map((m) => (
              <SelectItem key={m.key} value={m.key}>
                {m.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default ExplorerControls;
