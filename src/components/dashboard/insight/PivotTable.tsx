import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReactNode } from "react";
import {
  SINGLE_COLUMN,
  buildTableLayout,
  canTotal,
  drillPointOf,
  formatMeasure,
  type CatalogDimension,
  type CatalogMeasure,
  type DrillPoint,
  type Pivot,
} from "@/lib/olapExplorer";

interface Props {
  pivot: Pivot;
  measures: CatalogMeasure[];
  rowDimensions: CatalogDimension[];
  hasColumnDimension: boolean;
  /** Kunci dimensi kolom — dibutuhkan untuk drill-down dari sel. */
  colDim?: string | null;
  /** Klik angka → daftar alumni di baliknya. Tanpa prop ini tabel tidak bisa diklik. */
  onCellClick?: (point: DrillPoint, measure: CatalogMeasure, value: number | null) => void;
}

/**
 * Tabel pivot: dimensi baris di kiri, dimensi kolom membentang ke kanan, satu
 * kolom per measure di bawah tiap nilai kolom.
 *
 * Kolom dan baris total hanya muncul untuk measure yang boleh dijumlahkan
 * (lihat canTotal di olapExplorer.ts). Untuk rata-rata, selnya sengaja
 * dikosongkan — menjumlahkan rata-rata menghasilkan angka yang tidak berarti,
 * dan angka yang tidak berarti di kolom bernama "Total" akan dipercaya.
 */
const PivotTable = ({
  pivot,
  measures,
  rowDimensions,
  hasColumnDimension,
  colDim = null,
  onCellClick,
}: Props) => {
  const showTotals = hasColumnDimension;
  const totalableMeasures = measures.filter((m) => canTotal(m.format));
  const rowDims = rowDimensions.map((d) => d.key);

  /**
   * Angka yang bisa diklik: ada nilainya, bukan cacah nol (daftarnya pasti
   * kosong), dan titiknya tidak memuat kelompok "(kosong)". Baris/kolom yang
   * tidak disebut (sel total) berarti "semua nilai" dimensi itu.
   */
  const cell = (
    content: ReactNode,
    value: number | null,
    m: CatalogMeasure,
    rowKeys: string[] | null,
    colKey: string | null,
  ): ReactNode => {
    if (!onCellClick || value === null || (m.format === "integer" && value <= 0)) return content;
    // Kolom hasil hitungan (selisih) bukan kelompok data — tidak ada alumninya.
    if (colKey !== null && pivot.derivedColumns?.includes(colKey)) return content;

    // Baris subtotal hanya membawa kunci kelompoknya (prefiks); dimensi yang
    // lebih dalam berarti "semua nilai".
    const point = drillPointOf(
      rowKeys ? rowDims.slice(0, rowKeys.length) : [],
      rowKeys ?? [],
      colKey === null ? null : colDim,
      colKey ?? SINGLE_COLUMN,
    );
    if (point === null) return content;

    return (
      <button
        type="button"
        className="rounded-sm underline decoration-dotted underline-offset-4 hover:text-primary hover:decoration-solid"
        title="Lihat daftar alumninya"
        onClick={() => onCellClick(point, m, value)}
      >
        {content}
      </button>
    );
  };

  // Baris dikelompokkan per dimensi luar dengan subtotal per tingkat
  // (buildTableLayout); satu dimensi baris tetap berupa daftar biasa.
  const layout = buildTableLayout(pivot, measures, rowDimensions.length);

  /** Sel angka satu baris tabel: setiap kolom × ukuran, lalu total baris. */
  const valueCells = (
    valueOf: (col: string, m: CatalogMeasure) => number | null,
    totalOf: (m: CatalogMeasure) => number | null | undefined,
    keys: string[],
    bold = false,
  ) => (
    <>
      {pivot.columnKeys.map((col) =>
        measures.map((m, i) => {
          const value = valueOf(col, m);
          return (
            <TableCell
              key={`${col}-${m.key}`}
              className={`text-right tabular-nums ${i === 0 ? "border-l" : ""} ${bold ? "font-semibold" : ""}`}
            >
              {/* Subtotal rata-rata sengaja kosong: tidak boleh dijumlah. */}
              {bold && !canTotal(m.format) ? "—" : cell(formatMeasure(value, m.format), value, m, keys, col)}
            </TableCell>
          );
        }),
      )}

      {showTotals &&
        totalableMeasures.map((m, i) => {
          const total = totalOf(m) ?? null;
          return (
            <TableCell
              key={`total-${m.key}`}
              className={`text-right font-semibold tabular-nums ${i === 0 ? "border-l" : ""}`}
            >
              {cell(formatMeasure(total, m.format), total, m, keys, null)}
            </TableCell>
          );
        })}
    </>
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          {hasColumnDimension && (
            <TableRow>
              <TableHead colSpan={Math.max(rowDimensions.length, 1)} />
              {pivot.columnKeys.map((col) => (
                <TableHead
                  key={col}
                  colSpan={measures.length}
                  className="border-l text-center font-semibold"
                >
                  {col === SINGLE_COLUMN ? "—" : col}
                </TableHead>
              ))}
              {showTotals && totalableMeasures.length > 0 && (
                <TableHead
                  colSpan={totalableMeasures.length}
                  className="border-l text-center font-semibold"
                >
                  Total
                </TableHead>
              )}
            </TableRow>
          )}

          <TableRow>
            {rowDimensions.length > 0 ? (
              rowDimensions.map((d) => (
                <TableHead key={d.key} className="whitespace-nowrap">
                  {d.label}
                </TableHead>
              ))
            ) : (
              <TableHead />
            )}

            {pivot.columnKeys.map((col) =>
              measures.map((m, i) => (
                <TableHead
                  key={`${col}-${m.key}`}
                  className={`whitespace-nowrap text-right ${i === 0 ? "border-l" : ""}`}
                >
                  {m.label}
                </TableHead>
              )),
            )}

            {showTotals &&
              totalableMeasures.map((m, i) => (
                <TableHead
                  key={`total-${m.key}`}
                  className={`whitespace-nowrap text-right ${i === 0 ? "border-l" : ""}`}
                >
                  {m.label}
                </TableHead>
              ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {rowDimensions.length === 0
            ? pivot.rows.map((row) => (
                <TableRow key="total">
                  <TableCell className="font-medium">Seluruh data</TableCell>
                  {valueCells(
                    (col, m) => row.cells[col]?.[m.key]?.value ?? null,
                    (m) => row.totals[m.key],
                    row.keys,
                  )}
                </TableRow>
              ))
            : layout.map((line) =>
                line.kind === "subtotal" ? (
                  <TableRow key={`sub-${line.path.join("\u0000")}`} className="bg-muted/50 font-semibold hover:bg-muted/60">
                    <TableCell colSpan={rowDimensions.length - (line.labelLevel! - 1)} className="whitespace-nowrap">
                      Subtotal {line.path[line.path.length - 1]}
                    </TableCell>
                    {valueCells(
                      (col, m) => line.values[col]?.[m.key] ?? null,
                      (m) => line.totals[m.key],
                      line.path,
                      true,
                    )}
                  </TableRow>
                ) : (
                  <TableRow key={line.path.join("\u0000")}>
                    {line.keyCells.map((k, i) =>
                      k ? (
                        <TableCell
                          key={i}
                          rowSpan={k.rowSpan}
                          className={`whitespace-nowrap align-top font-medium ${k.rowSpan > 1 ? "border-r bg-card" : ""}`}
                        >
                          {k.text}
                        </TableCell>
                      ) : null,
                    )}
                    {valueCells(
                      (col, m) => line.values[col]?.[m.key] ?? null,
                      (m) => line.totals[m.key],
                      line.path,
                    )}
                  </TableRow>
                ),
              )}
        </TableBody>

        {showTotals && totalableMeasures.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={Math.max(rowDimensions.length, 1)} className="font-semibold">
                Total
              </TableCell>

              {pivot.columnKeys.map((col) =>
                measures.map((m, i) => (
                  <TableCell
                    key={`foot-${col}-${m.key}`}
                    className={`text-right font-semibold tabular-nums ${
                      i === 0 ? "border-l" : ""
                    }`}
                  >
                    {canTotal(m.format)
                      ? cell(
                          formatMeasure(pivot.columnTotals[col]?.[m.key] ?? null, m.format),
                          pivot.columnTotals[col]?.[m.key] ?? null,
                          m,
                          null,
                          col,
                        )
                      : "—"}
                  </TableCell>
                )),
              )}

              {totalableMeasures.map((m, i) => (
                <TableCell
                  key={`foot-total-${m.key}`}
                  className={`text-right font-semibold tabular-nums ${
                    i === 0 ? "border-l" : ""
                  }`}
                >
                  {cell(formatMeasure(pivot.grandTotals[m.key], m.format), pivot.grandTotals[m.key], m, null, null)}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
};

export default PivotTable;
