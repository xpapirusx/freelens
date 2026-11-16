/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { bytesToUnits } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { observer } from "mobx-react";
import { UsageCell } from "../../usage-cell/usage-cell";
import podStoreInjectable from "../../workloads-pods/store.injectable";
import { podResourceTotals } from "../pod-resources";
import { COLUMN_PRIORITY } from "./column-priority";

import type { Pod } from "@freelensapp/kube-object";

import type { PodStore } from "../store";

function bytesToUnitsAligned(bytes: number): string {
  if (bytes < 1024) {
    return `${(bytes / 1024).toFixed(1)}Ki`;
  }
  return bytesToUnits(bytes, { precision: 1 }).replace(/B$/, "");
}

interface PodMemoryCellProps {
  pod: Pod;
  podStore: PodStore;
}

const PodMemoryCell = observer(({ pod, podStore }: PodMemoryCellProps) => {
  const { memory } = podStore.getPodKubeMetrics(pod);
  const { requests, limits } = podResourceTotals(pod, "memory");
  const hasMetrics = !isNaN(memory);

  const tooltipLines: string[] = [];

  if (hasMetrics) {
    tooltipLines.push(`Usage: ${bytesToUnits(memory, { precision: 3 })}`);
  }

  if (requests > 0) {
    tooltipLines.push(`Requests: ${bytesToUnitsAligned(requests)}`);
  }

  if (limits > 0) {
    tooltipLines.push(`Limit: ${bytesToUnitsAligned(limits)}`);
  }

  if (hasMetrics && limits > 0) {
    tooltipLines.push(`${((memory * 100) / limits).toFixed(1)}% of limit`);
  }

  return (
    <UsageCell
      usage={memory}
      capacity={limits}
      requests={requests}
      format={bytesToUnitsAligned}
      tooltipLines={tooltipLines}
    />
  );
});

const columnId = "memoryUsage";

export const podsUsedMemoryColumnInjectable = getInjectable({
  id: "pods-memory-usage-column",
  instantiate: (di) => {
    const podStore = di.inject(podStoreInjectable);

    return {
      id: columnId,
      kind: "Pod",
      apiVersion: "v1",
      priority: COLUMN_PRIORITY.MEMORY_USAGE,
      content: (pod: Pod) => <PodMemoryCell pod={pod} podStore={podStore} />,
      header: { title: "Memory", className: "memory", sortBy: columnId, id: columnId },
      sortingCallBack: (pod: Pod) => {
        const { memory } = podStore.getPodKubeMetrics(pod);

        return isNaN(memory) ? 0 : memory;
      },
    };
  },
  injectionToken: podListLayoutColumnInjectionToken,
});
