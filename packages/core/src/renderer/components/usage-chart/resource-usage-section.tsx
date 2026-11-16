/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { observer } from "mobx-react";
import { DrawerTitle } from "../drawer";
import { formatCores, formatMemoryUsage } from "./formatters";
import { seriesPointsOf } from "./metrics-series";
import { MiniBarChart } from "./mini-bar-chart";
import styles from "./resource-usage-section.module.scss";

import type { ReactNode } from "react";

import type { MetricData } from "../../../common/k8s-api/endpoints/metrics.api";

const CPU_COLOR = "#00a7a0";
const MEMORY_COLOR = "#c93dce";

export interface ResourceUsageSectionProps {
  /** The CPU usage series, absent when the kind carries no CPU metric. */
  cpu?: MetricData;
  /** The memory usage series, absent when the kind carries no memory metric. */
  memory?: MetricData;
  /** The requested CPU, as cores, for the dashed reference line. */
  cpuRequest?: number;
  /** The CPU limit, as cores, for the dashed reference line. */
  cpuLimit?: number;
  /** The requested memory, as bytes, for the dashed reference line. */
  memoryRequest?: number;
  /** The memory limit, as bytes, for the dashed reference line. */
  memoryLimit?: number;
  /** The label of the limit line, e.g. "Allocatable" for nodes. */
  limitTitle?: string;
  isPending?: boolean;
  /** Content rendered below the charts, e.g. per-container usage. */
  children?: ReactNode;
}

/**
 * The "Resource Usage" section of the details drawer: compact CPU and Memory
 * bar charts of the usage series with the request and limit reference lines,
 * as the resource usage is shown in the details.
 */
export const ResourceUsageSection = observer(
  ({
    cpu,
    memory,
    cpuRequest,
    cpuLimit,
    memoryRequest,
    memoryLimit,
    limitTitle,
    isPending,
    children,
  }: ResourceUsageSectionProps) => {
    if (isPending && !cpu && !memory) {
      return (
        <div className={styles.ResourceUsageSection}>
          <DrawerTitle>Resource Usage</DrawerTitle>
          <div className={styles.unavailable}>Loading metrics…</div>
        </div>
      );
    }

    const hasCpu = !!cpu && !isMetricsEmptyLocal(cpu);
    const hasMemory = !!memory && !isMetricsEmptyLocal(memory);

    if (!hasCpu && !hasMemory) {
      return (
        <div className={styles.ResourceUsageSection}>
          <DrawerTitle>Resource Usage</DrawerTitle>
          <div className={styles.unavailable}>
            <Icon small material="info" />
            Metrics are not available for this resource
          </div>
        </div>
      );
    }

    return (
      <div className={styles.ResourceUsageSection}>
        <DrawerTitle>Resource Usage</DrawerTitle>
        <div className={styles.grid}>
          {hasCpu && (
            <div className={styles.metric}>
              <div className={styles.metricLabel}>CPU</div>
              <MiniBarChart
                dataPoints={seriesPointsOf(cpu)}
                color={CPU_COLOR}
                request={cpuRequest}
                limit={cpuLimit}
                limitTitle={limitTitle}
                format={formatCores}
              />
            </div>
          )}
          {hasMemory && (
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Memory</div>
              <MiniBarChart
                dataPoints={seriesPointsOf(memory)}
                color={MEMORY_COLOR}
                request={memoryRequest}
                limit={memoryLimit}
                limitTitle={limitTitle}
                format={formatMemoryUsage}
              />
            </div>
          )}
        </div>
        {children}
      </div>
    );
  },
);

function isMetricsEmptyLocal(metric: MetricData): boolean {
  return seriesPointsOf(metric).length === 0;
}
