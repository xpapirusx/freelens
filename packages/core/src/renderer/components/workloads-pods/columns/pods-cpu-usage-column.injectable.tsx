/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getInjectable } from "@ogre-tools/injectable";
import { observer } from "mobx-react";
import { UsageCell } from "../../usage-cell/usage-cell";
import podStoreInjectable from "../../workloads-pods/store.injectable";
import { formatCores, podResourceTotals } from "../pod-resources";
import { COLUMN_PRIORITY } from "./column-priority";

import type { Pod } from "@freelensapp/kube-object";

import type { PodStore } from "../store";

interface PodCpuCellProps {
  pod: Pod;
  podStore: PodStore;
}

const PodCpuCell = observer(({ pod, podStore }: PodCpuCellProps) => {
  const { cpu } = podStore.getPodKubeMetrics(pod);
  const { requests, limits } = podResourceTotals(pod, "cpu");
  const hasMetrics = !isNaN(cpu);

  const tooltipLines: string[] = [];

  if (hasMetrics) {
    tooltipLines.push(`Usage: ${formatCores(cpu)} cores`);
  }

  if (requests > 0) {
    tooltipLines.push(`Requests: ${formatCores(requests)} cores`);
  }

  if (limits > 0) {
    tooltipLines.push(`Limit: ${formatCores(limits)} cores`);
  }

  if (hasMetrics && limits > 0) {
    tooltipLines.push(`${((cpu * 100) / limits).toFixed(1)}% of limit`);
  }

  return (
    <UsageCell usage={cpu} capacity={limits} requests={requests} format={formatCores} tooltipLines={tooltipLines} />
  );
});

const columnId = "cpuUsage";

export const podsUsedCpuColumnInjectable = getInjectable({
  id: "pods-cpu-usage-column",
  instantiate: (di) => {
    const podStore = di.inject(podStoreInjectable);

    return {
      id: columnId,
      kind: "Pod",
      apiVersion: "v1",
      priority: COLUMN_PRIORITY.CPU_USAGE,
      content: (pod: Pod) => <PodCpuCell pod={pod} podStore={podStore} />,
      header: { title: "CPU", className: "cpu", sortBy: columnId, id: columnId },
      sortingCallBack: (pod: Pod) => {
        const { cpu } = podStore.getPodKubeMetrics(pod);

        return isNaN(cpu) ? 0 : cpu;
      },
    };
  },
  injectionToken: podListLayoutColumnInjectionToken,
});
