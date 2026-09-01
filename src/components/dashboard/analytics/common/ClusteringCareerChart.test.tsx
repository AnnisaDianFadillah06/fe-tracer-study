import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LegendLabel } from "./ClusteringCareerChart";

describe("LegendLabel keyboard accessibility", () => {
  it("memanggil onSelect saat Enter ditekan", () => {
    const onSelect = vi.fn();
    render(<LegendLabel value="Teknik Informatika" onSelect={onSelect} />);

    fireEvent.keyDown(screen.getByRole("button", { name: "Teknik Informatika" }), { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith("Teknik Informatika");
  });

  it("memanggil onSelect saat diklik", () => {
    const onSelect = vi.fn();
    render(<LegendLabel value="Teknik Informatika" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Teknik Informatika" }));

    expect(onSelect).toHaveBeenCalledWith("Teknik Informatika");
  });

  it("tidak bereaksi pada tombol selain Enter/Space", () => {
    const onSelect = vi.fn();
    render(<LegendLabel value="Teknik Informatika" onSelect={onSelect} />);

    fireEvent.keyDown(screen.getByRole("button", { name: "Teknik Informatika" }), { key: "Tab" });

    expect(onSelect).not.toHaveBeenCalled();
  });
});
