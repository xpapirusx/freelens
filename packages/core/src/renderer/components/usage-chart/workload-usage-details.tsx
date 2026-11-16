/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { interval } from "@freelensapp/utilities";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { containerResourceTotals, type ResourceContainer } from "../workloads-pods/pod-resources";
import { ResourceUsageSection } from "./resource-usage-section";
import type { MetricData } from "../../../common/k8s-api/endpoints/metrics.api";
import type { IAsyncComputed } from "../../../common/utils/async-computed";

export interface WorkloadUsageMetricData {
  cpuUsage?: MetricData;
  memoryUsage?: MetricData;
}

export interface WorkloadUsageDetailsProps {
  /** The pod-aggregated metrics of the workload's pods. */
  metrics: IAsyncComputed<WorkloadUsageMetricData>;
  /** The containers of the workload's pod template, the source of the request and limit lines. */
  templateContainers?: ResourceContainer[];
}

/**
 * The "Resource Usage" section for the workload kinds: the usage of the
 * workload's pods with the pod template's requests and limits as the
 * reference lines.
 */
export const WorkloadUsageDetails = observer(({ metrics, templateContainers = [] }: WorkloadUsageDetailsProps) => {
  useEffect(() => {
    const watcher = interval(30, () => metrics.invalidate());

    watcher.start();

    return () => watcher.stop();
  }, [metrics]);

  const data = metrics.value.get();
  const cpu = containerResourceTotals(templateContainers, "cpu");
  const memory = containerResourceTotals(templateContainers, "memory");

  return (
    <ResourceUsageSection
      cpu={data?.cpuUsage}
      memory={data?.memoryUsage}
      cpuRequest={cpu.requests}
      cpuLimit={cpu.limits}
      memoryRequest={memory.requests}
      memoryLimit={memory.limits}
      isPending={metrics.pending.get()}
    />
  );
});
