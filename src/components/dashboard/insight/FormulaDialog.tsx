import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FORMULA_OPS,
  formatMeasure,
  lowerFirst,
  measureFormatOf,
  measureLabelOf,
  type CatalogCube,
  type Formula,
  type FormulaOp,
  type MeasureFormat,
} from "@/lib/olapExplorer";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cube: CatalogCube;
  /** Kunci rumus yang boleh dipakai (rumus_1, …) — dari pemanggil. */
  formulaKey: string;
  onSave: (formula: Formula) => void;
}

const FORMAT_CHOICES: Record<FormulaOp, { value: MeasureFormat; label: string; example: number }[]> = {
  div: [
    { value: "ratio", label: "Berapa kali", example: 4.88 },
    { value: "percent", label: "Persen", example: 72.5 },
    { value: "decimal", label: "Angka biasa", example: 1.25 },
  ],
  sub: [],
  add: [],
  mul: [],
};

/** Pilihan tampilan untuk − + ×: ikut satuan ukuran pertama, atau angka biasa. */
function formatChoices(op: FormulaOp, leftFormat: MeasureFormat) {
  if (op === "div") return FORMAT_CHOICES.div;

  const same =
    leftFormat === "currency"
      ? { value: "currency" as const, label: "Rupiah", example: 1500000 }
      : leftFormat === "integer"
        ? { value: "integer" as const, label: "Bilangan bulat", example: 120 }
        : { value: "decimal" as const, label: "Angka biasa", example: 1.25 };

  return same.value === "decimal" ? [same] : [same, { value: "decimal" as const, label: "Angka biasa", example: 1.25 }];
}

/** Tampilan yang wajar untuk dua ukuran: rupiah÷rupiah = berapa kali, cacah÷cacah = persen. */
function suggestedFormat(op: FormulaOp, left: MeasureFormat, right: MeasureFormat): MeasureFormat {
  if (op !== "div") return formatChoices(op, left)[0].value;
  if (left === "integer" && right === "integer") return "percent";
  if (left === right) return "ratio";
  return "decimal";
}

/**
 * Pembuat rumus: dua ukuran digabung dengan ÷ − + ×.
 *
 * Contoh yang dituju: "Rata-rata gaji ÷ Rata-rata UMP" (kelipatan gaji
 * terhadap UMP) atau "Jumlah alumni terserap ÷ Jumlah alumni" (tingkat
 * keterserapan). Semua pilihan berupa kalimat; nama rumus diisi otomatis
 * tapi bisa diganti.
 */
const FormulaDialog = ({ open, onOpenChange, cube, formulaKey, onSave }: Props) => {
  const options = useMemo(
    () => [
      { group: "Siap pakai", items: cube.measures.map((m) => ({ key: m.key, label: m.label })) },
      ...(cube.numeric_columns ?? []).map((c) => ({
        group: c.label,
        items: c.functions.map((f) => ({ key: f.key, label: `${f.label} ${lowerFirst(c.label)}` })),
      })),
    ],
    [cube],
  );

  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [op, setOp] = useState<FormulaOp>("div");
  const [format, setFormat] = useState<MeasureFormat>("ratio");
  const [label, setLabel] = useState("");
  const [labelTouched, setLabelTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setLeft("");
      setRight("");
      setOp("div");
      setFormat("ratio");
      setLabel("");
      setLabelTouched(false);
    }
  }, [open]);

  const leftLabel = left ? measureLabelOf(cube, left) : "";
  const rightLabel = right ? measureLabelOf(cube, right) : "";
  const symbol = FORMULA_OPS.find((o) => o.value === op)!.symbol;
  const autoLabel = left && right ? `${leftLabel} ${symbol} ${lowerFirst(rightLabel)}` : "";

  // Nama mengikuti pilihan sampai pengguna mengetiknya sendiri.
  useEffect(() => {
    if (!labelTouched) setLabel(autoLabel);
  }, [autoLabel, labelTouched]);

  // Tampilan disarankan ulang setiap kali ukuran atau operator berganti.
  useEffect(() => {
    if (left && right) {
      setFormat(suggestedFormat(op, measureFormatOf(cube, left), measureFormatOf(cube, right)));
    }
  }, [left, right, op, cube]);

  const choices = formatChoices(op, left ? measureFormatOf(cube, left) : "decimal");
  const example = choices.find((c) => c.value === format) ?? choices[0];
  const ready = left !== "" && right !== "" && label.trim() !== "";

  const measureSelect = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((g) => (
          <SelectGroup key={g.group}>
            <SelectLabel>{g.group}</SelectLabel>
            {g.items.map((i) => (
              <SelectItem key={i.key} value={i.key}>
                {i.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ready) return;
            onSave({ key: formulaKey, label: label.trim(), left, op, right, format });
          }}
        >
          <DialogHeader>
            <DialogTitle>Buat rumus</DialogTitle>
            <DialogDescription>
              Gabungkan dua ukuran — misalnya rata-rata gaji dibagi rata-rata UMP untuk melihat
              berapa kali lipat gaji alumni dibanding UMP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Ukuran pertama</Label>
            {measureSelect(left, setLeft, "Pilih ukuran…")}
          </div>

          <div className="space-y-2">
            <Label>Operasi</Label>
            <div className="grid grid-cols-4 gap-2">
              {FORMULA_OPS.map((o) => (
                <Button
                  key={o.value}
                  type="button"
                  variant={op === o.value ? "default" : "outline"}
                  onClick={() => setOp(o.value)}
                  className="flex-col gap-0 py-6"
                >
                  <span className="text-lg leading-none">{o.symbol}</span>
                  <span className="text-[11px] font-normal">{o.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ukuran kedua</Label>
            {measureSelect(right, setRight, "Pilih ukuran…")}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tampilkan sebagai</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as MeasureFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {choices.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label} ({formatMeasure(c.example, c.value)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="formula-label">Nama rumus</Label>
              <Input
                id="formula-label"
                value={label}
                maxLength={150}
                placeholder="mis. Kelipatan gaji terhadap UMP"
                onChange={(e) => {
                  setLabel(e.target.value);
                  setLabelTouched(true);
                }}
              />
            </div>
          </div>

          {left && right && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Untuk setiap kelompok: <strong className="text-foreground">{leftLabel}</strong>{" "}
              {FORMULA_OPS.find((o) => o.value === op)!.label}{" "}
              <strong className="text-foreground">{lowerFirst(rightLabel)}</strong>, ditampilkan seperti{" "}
              <strong className="text-foreground">{formatMeasure(example.example, example.value)}</strong>.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={!ready}>
              Tambahkan rumus
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormulaDialog;
