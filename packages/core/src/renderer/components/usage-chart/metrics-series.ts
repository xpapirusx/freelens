/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { MetricData } from "../../../common/k8s-api/endpoints/metrics.api";

/**
 * The series of a metric as `[unix seconds, value]` pairs, empty when the
 * metric carries no result.
 */
export function seriesPointsOf(metric: MetricData | undefined): [number, string][] {
  return metric?.data.result[0]?.values ?? [];
}

/**
 * The last value of a metric series as a number, `undefined` when the series
 * carries no point.
 */
export function seriesLastValue(metric: MetricData | undefined): number | undefined {
  const points = seriesPointsOf(metric);
  const last = points[points.length - 1];

  if (!last) {
    return undefined;
  }

  const value = Number(last[1]);

  return Number.isFinite(value) ? value : undefined;
}
