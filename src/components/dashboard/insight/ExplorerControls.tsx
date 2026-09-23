import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import type {
  CatalogCube,
  ExplorerCatalog,
  ExplorerQueryInput,
} from "@/lib/olapExplorer";

/** Nilai penanda "tidak ada" untuk Select — Radix tidak menerima value kosong. */
const NONE = "__none__";

interface Props {
  catalog: ExplorerCatalog;
  cube: CatalogCube;
  input: ExplorerQueryInput;
  onChange: (next: ExplorerQueryInput) => void;
}

const ExplorerControls = ({ catalog, cube, input, onChange }: Props) => {
  const allDimensions = cube.dimension_groups.flatMap((g) => g.members);
  const labelOf = (key: string) =>
    allDimensions.find((d) => d.key === key)?.label ?? key;

  const maxRowDims = catalog.limits.max_dimensions - (input.colDim ? 1 : 0);

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

    if (!selected && input.measures.length >= catalog.limits.max_measures) return;

    onChange({
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

    onChange({ ...input, rowDims: next.filter(Boolean) });
  };

  const addFilter = (member: string) => {
    if (input.filters.some((f) => f.member === member)) return;
    onChange({ ...input, filters: [...input.filters, { member, values: [] }] });
  };

  const unfilteredDimensions = allDimensions.filter(
    (d) => !input.filters.some((f) => f.member === d.key),
  );

  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Susun Analisis</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Sumber data ─────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label>Sumber Data</Label>
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

        <Separator />

        {/* ── Measure ─────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label>Measure</Label>
            <span className="text-xs text-muted-foreground">
              {input.measures.length}/{catalog.limits.max_measures}
            </span>
          </div>

          <ScrollArea className="h-56 rounded-md border">
            <div className="space-y-0.5 p-2">
              {cube.measures.map((m) => {
                const checked = input.measures.includes(m.key);
                const penuh =
                  !checked && input.measures.length >= catalog.limits.max_measures;

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
                    <span className="leading-snug">{m.label}</span>
                  </label>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        {/* ── Dimensi ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <Label>Dimensi</Label>

          <DimensionSelect
            label="Baris"
            value={input.rowDims[0] ?? null}
            groups={availableFor("row0")}
            onChange={(key) => setRowDim(0, key)}
          />

          {/* Slot baris kedua baru muncul setelah yang pertama terisi —
              memilih dimensi baris kedua tanpa yang pertama tidak berarti
              apa-apa, dan menampilkannya hanya membuat panel ini ramai. */}
          {input.rowDims.length > 0 && maxRowDims > 1 && (
            <DimensionSelect
              label="Baris kedua"
              value={input.rowDims[1] ?? null}
              groups={availableFor("row1")}
              onChange={(key) => setRowDim(1, key)}
            />
          )}

          <DimensionSelect
            label="Kolom"
            value={input.colDim}
            groups={availableFor("col")}
            onChange={(key) =>
              onChange({ ...input, colDim: key === NONE ? null : key })
            }
          />
        </div>

        <Separator />

        {/* ── Filter ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <Label>Filter</Label>

          {input.filters.map((f) => (
            <ExplorerFilterRow
              key={f.member}
              filter={f}
              label={labelOf(f.member)}
              onChange={(values) =>
                onChange({
                  ...input,
                  filters: input.filters.map((x) =>
                    x.member === f.member ? { ...x, values } : x,
                  ),
                })
              }
              onRemove={() =>
                onChange({
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
                  Tambah filter
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
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────

interface DimensionSelectProps {
  label: string;
  value: string | null;
  groups: { group: string; members: { key: string; label: string }[] }[];
  onChange: (key: string) => void;
}

const DimensionSelect = ({ label, value, groups, onChange }: DimensionSelectProps) => (
  <div className="space-y-1.5">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
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
