import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, ArrowUpToLine, Calculator, ChevronDown, Clock, LayoutGrid, Loader2, Plus, Sigma, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ExplorerFilterRow from "./ExplorerFilterRow";
import FormulaDialog from "./FormulaDialog";
import DimensionPicker from "./DimensionPicker";
import HelpTip from "./HelpTip";
import { useDimensionValues } from "@/hooks/useExplorer";
import {
  lowerFirst,
  measureLabelOf,
  swapRowsColumns,
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
  /** Kembali ke susunan kosong. */
  onReset: () => void;
  /** Roll-up: ada hanya bila masih ada slice/dice/rincian yang bisa dilepas. */
  onRollUp?: () => void;
  /** Kalimat ringkas susunan saat ini, tampil di strip status. */
  summary: string;
  fetching: boolean;
  /** Waktu hasil terakhir dihitung (ms), untuk "Diperbarui …". */
  updatedAt?: number;
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

const ExplorerControls = ({
  catalog,
  cube,
  input,
  onChange,
  onReset,
  onRollUp,
  summary,
  fetching,
  updatedAt,
}: Props) => {
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

  // Ringkasan di tombol pemicu popover.
  const measureCount = input.measures.length + formulas.length;
  const measureSummary =
    measureCount === 0
      ? "Pilih ukuran"
      : measureCount === 1
        ? input.measures[0]
          ? measureLabelOf(cube, input.measures[0])
          : formulas[0].label
        : `${measureCount} ukuran`;
  const filterCount = input.filters.length;
  const displayChanged =
    (input.percent ?? "none") !== "none" || !!input.minN || !!input.sort || !!input.diff;

  return (
    <div
      className="w-full border-b border-border bg-background/95 backdrop-blur-md"
      role="region"
      aria-label="Susun analisis"
    >
      <div className="flex w-full flex-wrap items-end gap-3 px-6 py-3">
        {catalog.cubes.length > 1 && (
          <Field label="Data">
            <Select value={input.cube} onValueChange={changeCube}>
              <SelectTrigger className="h-9 w-[180px] text-sm">
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
          </Field>
        )}

        <Field
          label="Dihitung"
          hint="Yang dihitung dari data, misalnya jumlah alumni atau rata-rata gaji."
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 w-[210px] justify-between text-sm font-normal hover:bg-muted hover:text-foreground data-[state=open]:bg-muted"
              >
                <span className={`truncate ${measureCount === 0 ? "text-muted-foreground" : ""}`}>
                  {measureSummary}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" onOpenAutoFocus={(e) => e.preventDefault()} className="max-h-[75vh] w-[400px] space-y-2 overflow-y-auto">
    <div className="flex items-baseline justify-between">
      <Label>
        Apa yang dihitung?{" "}
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
            </PopoverContent>
          </Popover>
        </Field>

        <DimensionSelect
          label="Per (Dice)"
          hint="Memecah hasil menjadi kelompok (dice), misalnya per jurusan atau per tahun lulus. Kosongkan untuk satu angka total."
          value={input.rowDims[0] ?? null}
          groups={availableFor("row0")}
          onChange={(key) => setRowDim(0, key)}
        />

        {/* Slot baris kedua baru muncul setelah yang pertama terisi —
            memilih dimensi baris kedua tanpa yang pertama tidak berarti
            apa-apa. */}
        {input.rowDims.length > 0 && maxRowDims > 1 && (
          <DimensionSelect
            label="Lalu per (Dice)"
            value={input.rowDims[1] ?? null}
            groups={availableFor("row1")}
            onChange={(key) => setRowDim(1, key)}
          />
        )}

        <DimensionSelect
          label="Dibandingkan antar (Dice)"
          hint="Menaruh kelompok ini sebagai kolom, sehingga bisa dibandingkan berdampingan dengan kelompok di atas, misalnya status alumni per jurusan."
          value={input.colDim}
          groups={availableFor("col")}
          onChange={(key) => update({ ...input, colDim: key === NONE ? null : key })}
        />

        <Field label="Putar" hint="Tukar dimensi Per dengan Dibandingkan antar (baris jadi kolom, kolom jadi baris).">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            aria-label="Tukar baris dan kolom"
            disabled={input.colDim === null || input.rowDims.length === 0}
            onClick={() => update(swapRowsColumns(input))}
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </Field>

        <Field label="Batasi (Slice)" hint="Slice: hanya menghitung sebagian data, misalnya alumni angkatan 2023 saja.">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 w-[140px] justify-between text-sm font-normal hover:bg-muted hover:text-foreground data-[state=open]:bg-muted"
              >
                <span className={`truncate ${filterCount === 0 ? "text-muted-foreground" : ""}`}>
                  {filterCount === 0 ? "Semua data" : `${filterCount} batasan`}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" onOpenAutoFocus={(e) => e.preventDefault()} className="max-h-[75vh] w-[380px] space-y-3 overflow-y-auto">
    <Label>
      Batasi data ke…{" "}
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
      <DimensionPicker
        value={null}
        groups={cube.dimension_groups
          .map((g) => ({
            group: g.group,
            members: g.members.filter((m) => !input.filters.some((f) => f.member === m.key)),
          }))
          .filter((g) => g.members.length > 0)}
        onChange={(key) => key && addFilter(key)}
        allowClear={false}
        className="w-full text-muted-foreground"
        trigger={
          <span className="flex items-center gap-2 text-sm">
            <Plus className="h-3.5 w-3.5" />
            Tambah batasan
          </span>
        }
      />
    )}
            </PopoverContent>
          </Popover>
        </Field>

        <div className="ml-auto flex items-end gap-2">
          <Field label="Tampilan">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 text-sm font-normal hover:bg-muted hover:text-foreground data-[state=open]:bg-muted">
                  <SlidersHorizontal className="h-4 w-4" />
                  Atur
                  {displayChanged && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" onOpenAutoFocus={(e) => e.preventDefault()} className="max-h-[75vh] w-[340px] space-y-4 overflow-y-auto">
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
              </PopoverContent>
            </Popover>
          </Field>
          {onRollUp && (
            <Button size="sm" variant="outline" className="h-9" onClick={onRollUp} title="Roll-up: lepas langkah rincian/saringan terakhir">
              <ArrowUpToLine className="mr-1.5 h-4 w-4" />
              Naik
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-9" onClick={onReset}>
            Reset
          </Button>
          <Button size="sm" variant="outline" className="h-9" asChild>
            <Link to="/dashboard/insight/board">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Dashboard Saya
            </Link>
          </Button>
        </div>
      </div>

      {/* Ringkasan apa yang sedang ditampilkan + status hitung, sejajar dengan
          strip snapshot di dashboard lain. */}
      <div
        className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-6 py-1.5 text-xs"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <Badge
          variant="outline"
          className="h-6 max-w-full gap-1 border-primary/30 bg-primary/5 px-2 font-normal text-foreground"
        >
          <Sigma className="h-3 w-3 shrink-0" />
          <span className="truncate">{summary || "Pilih apa yang ingin dihitung untuk memulai"}</span>
        </Badge>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {fetching ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-primary" /> Menghitung…
            </>
          ) : (
            updatedAt && (
              <>
                <Clock className="h-3 w-3" /> Diperbarui{" "}
                {new Date(updatedAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </>
            )
          )}
        </div>
      </div>

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
    </div>
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

/** Kolom pita filter: label kapital kecil di atas kontrolnya, sama dengan filter global dashboard. */
const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
      {hint && <HelpTip>{hint}</HelpTip>}
    </label>
    {children}
  </div>
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
  <Field label={label} hint={hint}>
    <DimensionPicker
      value={value}
      groups={groups}
      onChange={(key) => onChange(key ?? NONE)}
      className="w-[190px]"
    />
  </Field>
);

export default ExplorerControls;
