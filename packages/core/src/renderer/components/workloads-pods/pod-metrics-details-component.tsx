/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { interval } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { seriesLastValue } from "../usage-chart/metrics-series";
import { ResourceUsageSection } from "../usage-chart/resource-usage-section";
import podMetricsInjectable from "./metrics.injectable";

import type { Pod } from "@freelensapp/kube-object";

import type { PodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";
import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<Partial<PodMetricData>>;
}

const NonInjectedPodMetricsDetailsComponent = observer(({ metrics }: KubeObjectDetailsProps<Pod> & Dependencies) => {
  const data = metrics.value.get();

  useEffect(() => {
    const watcher = interval(30, () => metrics.invalidate());

    watcher.start();

    return () => watcher.stop();
  }, [metrics]);

  return (
    <ResourceUsageSection
      cpu={data?.cpuUsage}
      memory={data?.memoryUsage}
      cpuRequest={seriesLastValue(data?.cpuRequests)}
      cpuLimit={seriesLastValue(data?.cpuLimits)}
      memoryRequest={seriesLastValue(data?.memoryRequests)}
      memoryLimit={seriesLastValue(data?.memoryLimits)}
      isPending={metrics.pending.get()}
    />
  );
});

const PodMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Pod>>(
  NonInjectedPodMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(podMetricsInjectable, {
        pod: props.object,
      }),
      ...props,
    }),
  },
);

export default PodMetricsDetailsComponent;
