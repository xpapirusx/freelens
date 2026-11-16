/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./mini-bar-chart.module.scss";

export interface MiniBarChartProps {
  /** The series as the metrics API returns it: `[unix seconds, value]` pairs. */
  dataPoints: [number, string][];
  /** The css color of the bars. */
  color: string;
  /** The requested amount, a dashed yellow reference line. */
  request?: number;
  /** The limit, a dashed red reference line. */
  limit?: number;
  /** The label of the limit line, e.g. "Allocatable" for nodes. */
  limitTitle?: string;
  /** The short display formatter for the caption. */
  format: (value: number) => string;
  /** The height of the plot in pixels. */
  height?: number;
}

const MAX_BARS = 48;

interface Point {
  timestamp: number;
  value: number;
}

/**
 * A compact bar chart of a resource usage series: one bar per data point,
 * dashed reference lines for the request and the limit, and a caption of the
 * current and the peak value, as the resource usage is shown in the details.
 */
export const MiniBarChart = ({
  dataPoints,
  color,
  request,
  limit,
  limitTitle,
  format,
  height = 64,
}: MiniBarChartProps) => {
  const points: Point[] = dataPoints
    .map(([timestamp, value]) => ({ timestamp, value: Number(value) }))
    .filter((point) => Number.isFinite(point.value));

  if (points.length === 0) {
    return <div className={styles.empty}>No data</div>;
  }

  const bars = points.length <= MAX_BARS ? points : resampleToMax(points, MAX_BARS);
  const values = bars.map((bar) => bar.value);
  const peak = Math.max(...values, request ?? 0, limit ?? 0);
  const scale = peak > 0 ? peak : 1;
  const current = points[points.length - 1].value;
  const seriesPeak = Math.max(...values);

  const percent = (value: number) => `${Math.min(100, (value / scale) * 100)}%`;

  return (
    <div className={styles.MiniBarChart}>
      <div className={styles.plot} style={{ height }}>
        {limit !== undefined && limit > 0 && (
          <div
            className={styles.refLine}
            style={{ bottom: percent(limit), borderTopColor: "var(--colorError)" }}
            title={`${limitTitle ?? "Limit"}: ${format(limit)}`}
          />
        )}
        {request !== undefined && request > 0 && (
          <div
            className={styles.refLine}
            style={{ bottom: percent(request), borderTopColor: "var(--colorWarning)" }}
            title={`Request: ${format(request)}`}
          />
        )}
        {bars.map((bar) => (
          <div
            key={bar.timestamp}
            className={styles.bar}
            style={{ backgroundColor: color, height: percent(bar.value) }}
            title={`${format(bar.value)} @ ${new Date(bar.timestamp * 1000).toLocaleTimeString()}`}
          />
        ))}
      </div>
      <div className={styles.caption}>
        {format(current)} <span className={styles.peak}>(max: {format(seriesPeak)})</span>
      </div>
    </div>
  );
};

function resampleToMax(points: Point[], buckets: number): Point[] {
  const size = Math.ceil(points.length / buckets);
  const resampled: Point[] = [];

  for (let index = 0; index < points.length; index += size) {
    const chunk = points.slice(index, index + size);
    const tallest = chunk.reduce((acc, point) => (point.value > acc.value ? point : acc));

    resampled.push(tallest);
  }

  return resampled;
}
