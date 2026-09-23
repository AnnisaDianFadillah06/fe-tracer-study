import ExplorerChart from "./ExplorerChart";
import { buildColorMap } from "@/lib/chartColors";
import {
  SINGLE_COLUMN,
  chartSeriesNames,
  type CatalogMeasure,
  type ChartKind,
  type Facet,
} from "@/lib/olapExplorer";

interface Props {
  kind: ChartKind;
  facets: Facet[];
  measure: CatalogMeasure;
  /** Label dimensi yang jadi panel, ditampilkan sebagai keterangan grid. */
  facetLabel: string;
  /** Klik di salah satu panel → (nilai panel, indeks baris di pivot panel, kunci kolom). */
  onPointClick?: (facetKey: string, rowIndex: number, columnKey: string | null) => void;
}

/**
 * Jumlah kolom grid mengikuti kepadatan panel. Panel dengan banyak kategori
 * butuh lebar, jadi diberi satu kolom penuh; panel yang ringkas muat tiga
 * berdampingan dan lebih enak dibandingkan.
 */
function kolomGrid(kategoriTerbanyak: number): string {
  if (kategoriTerbanyak <= 6) return "sm:grid-cols-2 xl:grid-cols-3";
  if (kategoriTerbanyak <= 14) return "xl:grid-cols-2";
  return "";
}

/**
 * Small multiples: satu panel kecil per nilai dimensi ketiga.
 *
 * Seluruh panel memakai sumbu dan skala warna yang sama, sehingga bisa
 * dibandingkan langsung dengan mata. Legendanya ditarik keluar dan ditampilkan
 * sekali saja di atas grid — mengulangnya di tiap panel memakan ruang yang
 * justru dibutuhkan chart-nya.
 *
 * Catatan: sumbu Y tiap panel diskalakan sendiri oleh Recharts. Untuk
 * perbandingan antar panel itu bisa menyesatkan, jadi nilai persisnya tetap
 * perlu dibaca di tabel di bawah.
 */
const ExplorerFacets = ({ kind, facets, measure, facetLabel, onPointClick }: Props) => {
  // Warna diambil dari gabungan seri seluruh panel, bukan per panel. Kalau
  // tiap panel memetakan warnanya sendiri, seri yang sama bisa berbeda warna
  // antar panel dan perbandingannya jadi menyesatkan.
  const semuaSeri = Array.from(
    new Set(facets.flatMap((f) => chartSeriesNames(f.pivot))),
  );
  const colors = buildColorMap(semuaSeri);
  const kategoriTerbanyak = Math.max(...facets.map((f) => f.pivot.rows.length), 0);
  const padat = kategoriTerbanyak > 14;
  const adaLegenda = semuaSeri.length > 1 || semuaSeri[0] !== "nilai";

  return (
    <div className="space-y-3">
      {adaLegenda && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {semuaSeri.map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: colors[s] }}
              />
              {s}
            </span>
          ))}
        </div>
      )}

      <div className={`grid gap-x-4 gap-y-5 ${kolomGrid(kategoriTerbanyak)}`}>
        {facets.map((facet) => (
          <div key={facet.key} className="min-w-0">
            <p className="mb-1 truncate text-xs font-medium" title={facet.key}>
              {facet.key === SINGLE_COLUMN ? "—" : facet.key}
            </p>
            <ExplorerChart
              kind={kind}
              pivot={facet.pivot}
              measure={measure}
              height={padat ? 300 : 220}
              hideLegend
              colors={colors}
              onPointClick={
                onPointClick ? (i, col) => onPointClick(facet.key, i, col) : undefined
              }
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Satu panel per {facetLabel.toLowerCase()}. Sumbu Y tiap panel diskalakan
        sendiri — untuk membandingkan angka persisnya, lihat tabel di bawah.
      </p>
    </div>
  );
};

export default ExplorerFacets;
