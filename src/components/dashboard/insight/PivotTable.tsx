import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SINGLE_COLUMN,
  canTotal,
  formatMeasure,
  type CatalogDimension,
  type CatalogMeasure,
  type Pivot,
} from "@/lib/olapExplorer";

interface Props {
  pivot: Pivot;
  measures: CatalogMeasure[];
  rowDimensions: CatalogDimension[];
  hasColumnDimension: boolean;
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
const PivotTable = ({ pivot, measures, rowDimensions, hasColumnDimension }: Props) => {
  const showTotals = hasColumnDimension;
  const totalableMeasures = measures.filter((m) => canTotal(m.format));

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
          {pivot.rows.map((row) => (
            <TableRow key={row.keys.join("\u0000") || "total"}>
              {rowDimensions.length > 0 ? (
                row.keys.map((k, i) => (
                  <TableCell key={i} className="whitespace-nowrap font-medium">
                    {k}
                  </TableCell>
                ))
              ) : (
                <TableCell className="font-medium">Seluruh data</TableCell>
              )}

              {pivot.columnKeys.map((col) =>
                measures.map((m, i) => (
                  <TableCell
                    key={`${col}-${m.key}`}
                    className={`text-right tabular-nums ${i === 0 ? "border-l" : ""}`}
                  >
                    {formatMeasure(row.cells[col]?.[m.key]?.value ?? null, m.format)}
                  </TableCell>
                )),
              )}

              {showTotals &&
                totalableMeasures.map((m, i) => (
                  <TableCell
                    key={`total-${m.key}`}
                    className={`text-right font-semibold tabular-nums ${
                      i === 0 ? "border-l" : ""
                    }`}
                  >
                    {formatMeasure(row.totals[m.key], m.format)}
                  </TableCell>
                ))}
            </TableRow>
          ))}
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
                      ? formatMeasure(pivot.columnTotals[col]?.[m.key] ?? null, m.format)
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
                  {formatMeasure(pivot.grandTotals[m.key], m.format)}
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
