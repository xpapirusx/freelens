/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { WorkloadUsageDetails } from "../usage-chart/workload-usage-details";
import daemonSetMetricsInjectable from "./metrics.injectable";

import type { DaemonSet } from "@freelensapp/kube-object";

import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { WorkloadUsageMetricData } from "../usage-chart/workload-usage-details";

interface Dependencies {
  metrics: IAsyncComputed<WorkloadUsageMetricData>;
}

const NonInjectedDaemonSetMetricsDetailsComponent = observer(
  ({ object, metrics }: KubeObjectDetailsProps<DaemonSet> & Dependencies) => (
    <WorkloadUsageDetails metrics={metrics} templateContainers={object.spec?.template?.spec?.containers ?? []} />
  ),
);

export const DaemonSetMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<DaemonSet>>(
  NonInjectedDaemonSetMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(daemonSetMetricsInjectable, {
        daemonSet: props.object,
      }),
      ...props,
    }),
  },
);
