"use dom";

import { curveMonotoneX } from "@visx/curve";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";
import { useId, useMemo } from "react";

export type TimeseriesPoint = {
  date: string;
  value: number;
};

type TimeseriesChartProps = {
  data: TimeseriesPoint[];
  height?: number;
  dark?: boolean;
  dom?: import("expo/dom").DOMProps;
};

export default function TimeseriesChart({
  data,
  height = 220,
  dark = true,
}: TimeseriesChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const width = 390;
  const margin = { top: 16, right: 8, bottom: 24, left: 8 };
  const stroke = dark ? "#FAFAFA" : "#0A0A0A";
  const grid = dark ? "rgba(250,250,250,0.12)" : "rgba(10,10,10,0.12)";
  const muted = dark ? "#A3A3A3" : "#737373";

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
          color: muted,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
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
    range: [margin.left, width - margin.right],
  });

  const maxValue = Math.max(...points.map((p) => p.value), 1);
  const yScale = scaleLinear({
    domain: [0, maxValue * 1.1],
    range: [height - margin.bottom, margin.top],
  });

  const solidPoints =
    points.length > 2 ? points.slice(0, -1) : points;
  const dashPoints =
    points.length > 2 ? points.slice(-2) : [];

  const yTicks = [0.25, 0.5, 0.75, 1].map((t) => maxValue * 1.1 * t);

  return (
    <div style={{ width: "100%", overflow: "hidden", background: "transparent" }}>
      <svg
        height={height}
        style={{ display: "block", width: "100%" }}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = yScale(tick) ?? 0;
          return (
            <line
              key={tick}
              stroke={grid}
              strokeDasharray="3,4"
              strokeWidth={1}
              x1={margin.left}
              x2={width - margin.right}
              y1={y}
              y2={y}
            />
          );
        })}

        <AreaClosed
          curve={curveMonotoneX}
          data={points}
          fill={`url(#${gradientId})`}
          x={(d) => xScale(d.date) ?? 0}
          y={(d) => yScale(d.value) ?? 0}
          yScale={yScale}
        />
        <LinePath
          curve={curveMonotoneX}
          data={solidPoints}
          stroke={stroke}
          strokeWidth={2}
          x={(d) => xScale(d.date) ?? 0}
          y={(d) => yScale(d.value) ?? 0}
        />
        {dashPoints.length === 2 ? (
          <LinePath
            curve={curveMonotoneX}
            data={dashPoints}
            stroke={stroke}
            strokeDasharray="5,5"
            strokeWidth={2}
            x={(d) => xScale(d.date) ?? 0}
            y={(d) => yScale(d.value) ?? 0}
          />
        ) : null}
      </svg>
    </div>
  );
}
