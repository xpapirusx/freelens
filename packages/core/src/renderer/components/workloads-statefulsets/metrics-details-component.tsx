/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { WorkloadUsageDetails } from "../usage-chart/workload-usage-details";
import statefulSetMetricsInjectable from "./metrics.injectable";

import type { StatefulSet } from "@freelensapp/kube-object";

import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { WorkloadUsageMetricData } from "../usage-chart/workload-usage-details";

interface Dependencies {
  metrics: IAsyncComputed<WorkloadUsageMetricData>;
}

const NonInjectedStatefulSetMetricsDetailsComponent = observer(
  ({ object, metrics }: KubeObjectDetailsProps<StatefulSet> & Dependencies) => (
    <WorkloadUsageDetails metrics={metrics} templateContainers={object.spec?.template?.spec?.containers ?? []} />
  ),
);

export const StatefulSetMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<StatefulSet>>(
  NonInjectedStatefulSetMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(statefulSetMetricsInjectable, {
        statefulSet: props.object,
      }),
      ...props,
    }),
  },
);
