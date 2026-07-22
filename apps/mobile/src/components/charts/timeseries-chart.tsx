"use dom";

import { curveMonotoneX } from "@visx/curve";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";
import { useMemo } from "react";

export type TimeseriesPoint = {
  date: string;
  value: number;
};

type TimeseriesChartProps = {
  data: TimeseriesPoint[];
  height?: number;
  color?: string;
  dark?: boolean;
  dom?: import("expo/dom").DOMProps;
};

export default function TimeseriesChart({
  data,
  height = 160,
  color = "#0A0A0A",
  dark = false,
}: TimeseriesChartProps) {
  const width = 360;
  const padding = { top: 12, right: 8, bottom: 8, left: 8 };

  const points = useMemo(
    () =>
      data.map((d) => ({
        date: new Date(d.date),
        value: d.value,
      })),
    [data]
  );

  if (points.length === 0) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: dark ? "#A3A3A3" : "#737373",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        No chart data
      </div>
    );
  }

  const xScale = scaleTime({
    domain: [
      Math.min(...points.map((p) => p.date.getTime())),
      Math.max(...points.map((p) => p.date.getTime())),
    ],
    range: [padding.left, width - padding.right],
  });

  const maxValue = Math.max(...points.map((p) => p.value), 1);
  const yScale = scaleLinear({
    domain: [0, maxValue * 1.1],
    range: [height - padding.bottom, padding.top],
  });

  const stroke = dark ? "#FAFAFA" : color;
  const fill = dark ? "rgba(250,250,250,0.12)" : "rgba(10,10,10,0.1)";

  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      <svg
        height={height}
        style={{ display: "block", width: "100%" }}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
      >
        <AreaClosed
          curve={curveMonotoneX}
          data={points}
          fill={fill}
          x={(d) => xScale(d.date) ?? 0}
          y={(d) => yScale(d.value) ?? 0}
          yScale={yScale}
        />
        <LinePath
          curve={curveMonotoneX}
          data={points}
          stroke={stroke}
          strokeWidth={2}
          x={(d) => xScale(d.date) ?? 0}
          y={(d) => yScale(d.value) ?? 0}
        />
      </svg>
    </div>
  );
}
