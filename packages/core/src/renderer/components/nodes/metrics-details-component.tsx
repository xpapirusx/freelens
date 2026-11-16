/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { interval } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { ResourceUsageSection } from "../usage-chart/resource-usage-section";
import { seriesLastValue } from "../usage-chart/metrics-series";
import nodeMetricsInjectable from "./metrics.injectable";

import type { Node } from "@freelensapp/kube-object";

import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<Partial<ClusterMetricData>>;
}

const NonInjectedNodeMetricsDetailsComponent = observer(({ metrics }: KubeObjectDetailsProps<Node> & Dependencies) => {
  const data = metrics.value.get();

  useEffect(() => {
    const watcher = interval(30, () => metrics.invalidate());

    watcher.start();

    return () => watcher.stop();
  }, [metrics]);

  return (
    <ResourceUsageSection
      cpu={data?.cpuUsage}
      memory={data?.workloadMemoryUsage ?? data?.memoryUsage}
      cpuRequest={seriesLastValue(data?.cpuRequests)}
      cpuLimit={seriesLastValue(data?.cpuAllocatableCapacity)}
      memoryRequest={seriesLastValue(data?.memoryRequests)}
      memoryLimit={seriesLastValue(data?.memoryAllocatableCapacity)}
      limitTitle="Allocatable"
      isPending={metrics.pending.get()}
    />
  );
});

export const NodeMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Node>>(
  NonInjectedNodeMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(nodeMetricsInjectable, {
        node: props.object,
      }),
      ...props,
    }),
  },
);
