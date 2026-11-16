/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { interval } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { formatCores, formatMemoryUsage } from "../usage-chart/formatters";
import { seriesLastValue, seriesPointsOf } from "../usage-chart/metrics-series";
import { MiniBarChart } from "../usage-chart/mini-bar-chart";
import podContainerMetricsInjectable from "./container-metrics.injectable";
import styles from "./pod-container-usage.module.scss";

import type { Container, Pod } from "@freelensapp/kube-object";

import type { PodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";
import type { IAsyncComputed } from "../../../common/utils/async-computed";

const CPU_COLOR = "#00a7a0";
const MEMORY_COLOR = "#c93dce";

interface ContainerMetricsProps {
  container: Container;
  pod: Pod;
}

interface Dependencies {
  podContainerMetrics: IAsyncComputed<Partial<PodMetricData>>;
}

const NonInjectedPodDetailsContainerMetrics = observer(
  ({ podContainerMetrics }: ContainerMetricsProps & Dependencies) => {
    const data = podContainerMetrics.value.get();

    useEffect(() => {
      const watcher = interval(30, () => podContainerMetrics.invalidate());

      watcher.start();

      return () => watcher.stop();
    }, [podContainerMetrics]);

    const hasCpu = seriesPointsOf(data?.cpuUsage).length > 0;
    const hasMemory = seriesPointsOf(data?.memoryUsage).length > 0;

    if (!hasCpu && !hasMemory) {
      return null;
    }

    return (
      <div className={styles.PodContainerUsage}>
        {hasCpu && (
          <MiniBarChart
            dataPoints={seriesPointsOf(data?.cpuUsage)}
            color={CPU_COLOR}
            request={seriesLastValue(data?.cpuRequests)}
            limit={seriesLastValue(data?.cpuLimits)}
            format={formatCores}
            height={40}
          />
        )}
        {hasMemory && (
          <MiniBarChart
            dataPoints={seriesPointsOf(data?.memoryUsage)}
            color={MEMORY_COLOR}
            request={seriesLastValue(data?.memoryRequests)}
            limit={seriesLastValue(data?.memoryLimits)}
            format={formatMemoryUsage}
            height={40}
          />
        )}
      </div>
    );
  },
);

export const PodDetailsContainerMetrics = withInjectables<Dependencies, ContainerMetricsProps>(
  NonInjectedPodDetailsContainerMetrics,
  {
    getProps: (di, props) => ({
      ...props,
      podContainerMetrics: di.inject(podContainerMetricsInjectable, {
        pod: props.pod,
        container: props.container,
      }),
    }),
  },
);
