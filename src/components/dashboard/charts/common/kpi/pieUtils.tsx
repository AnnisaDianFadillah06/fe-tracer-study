import { useState } from "react";
import { Sector } from "recharts";

/** Active sector renderer — slight zoom + outer ring for hover affordance. */
export const renderActivePieShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.5}
      />
    </g>
  );
};

/** Hook to manage hovered slice index for a Pie. */
export const usePieActive = () => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  return {
    activeIndex,
    onMouseEnter: (_: any, i: number) => setActiveIndex(i),
    onMouseLeave: () => setActiveIndex(undefined),
  };
};

/** Find index of max-value entry; -1 if empty. */
export const findMaxIndex = <T extends Record<string, any>>(arr: T[], key: keyof T): number => {
  if (!arr.length) return -1;
  let idx = 0;
  let max = Number(arr[0][key]) || 0;
  for (let i = 1; i < arr.length; i++) {
    const v = Number(arr[i][key]) || 0;
    if (v > max) {
      max = v;
      idx = i;
    }
  }
  return idx;
};