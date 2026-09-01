import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import ClusteringHeatmapChart from "./ClusteringHeatmapChart";

// ChartProdiFilter butuh AuthContext + fetch data asli lewat useFilterOptions --
// tidak relevan untuk tes keyboard handler ini, jadi diganti stub kosong.
vi.mock("@/components/dashboard/DashboardFilters", () => ({
  ChartProdiFilter: () => null,
}));

function renderChart(domain: string) {
  return render(
    <TooltipProvider>
      <ClusteringHeatmapChart domain={domain} />
    </TooltipProvider>,
  );
}

function getHeatmapCells(container: HTMLElement): HTMLElement[] {
  // Sel heatmap dibedakan dari tombol info (ⓘ) lewat class Tailwind
  // min-w-[100px] yang cuma dipakai sel data, bukan elemen UI lain.
  return Array.from(container.querySelectorAll('[role="button"].min-w-\\[100px\\]'));
}

describe("ClusteringHeatmapChart keyboard accessibility", () => {
  it("membuka modal lewat tombol Enter, bukan cuma klik mouse", async () => {
    const { container } = renderChart("wait-time");

    const cells = getHeatmapCells(container);
    expect(cells.length).toBeGreaterThan(0);

    fireEvent.keyDown(cells[0], { key: "Enter" });

    expect(await screen.findByText(/Domain: Pola Masa Tunggu Kerja/)).toBeInTheDocument();
  });

  it("tidak bereaksi pada tombol selain Enter/Space", () => {
    const { container } = renderChart("wait-time");
    const cells = getHeatmapCells(container);

    fireEvent.keyDown(cells[0], { key: "Tab" });

    expect(screen.queryByText(/Domain: Pola Masa Tunggu Kerja/)).not.toBeInTheDocument();
  });
});
