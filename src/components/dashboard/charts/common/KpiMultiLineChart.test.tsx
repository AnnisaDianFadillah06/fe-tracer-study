import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { CustomDot } from "./KpiMultiLineChart";

describe("CustomDot", () => {
  it("membesarkan radius saat titik tahun sedang dipilih", () => {
    const { container } = render(
      <svg>
        <CustomDot cx={10} cy={20} payload={{ year: "2024" }} fill="#000" selectedYear="2024" />
      </svg>,
    );
    expect(container.querySelector("circle")).toHaveAttribute("r", "8");
  });

  it("meredupkan titik tahun yang tidak dipilih", () => {
    const { container } = render(
      <svg>
        <CustomDot cx={10} cy={20} payload={{ year: "2023" }} fill="#000" selectedYear="2024" />
      </svg>,
    );
    expect(container.querySelector("circle")).toHaveAttribute("opacity", "0.35");
  });
});
