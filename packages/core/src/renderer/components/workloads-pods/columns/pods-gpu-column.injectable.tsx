/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getInjectable } from "@ogre-tools/injectable";
import { COLUMN_PRIORITY } from "./column-priority";
import { podGpuTotals } from "../pod-resources";

import type { Pod } from "@freelensapp/kube-object";

const columnId = "gpu";

/**
 * The effective GPU request of a pod, requests falling back to limits, summed
 * across containers. Hidden by default, like the GPU column of the nodes table.
 */
export const podsGpuColumnInjectable = getInjectable({
  id: "pods-gpu-column",
  instantiate: (di) => ({
    id: columnId,
    kind: "Pod",
    apiVersion: "v1",
    priority: COLUMN_PRIORITY.MEMORY_USAGE - 5,
    content: (pod: Pod) => {
      const gpus = podGpuTotals(pod);

      return <span>{gpus > 0 ? gpus : ""}</span>;
    },
    header: { title: "GPU", className: "gpu", sortBy: columnId, id: columnId },
    sortingCallBack: (pod: Pod) => podGpuTotals(pod),
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
