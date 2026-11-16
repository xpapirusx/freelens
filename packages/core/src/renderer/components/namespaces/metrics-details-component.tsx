/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { WorkloadUsageDetails } from "../usage-chart/workload-usage-details";
import namespaceMetricsInjectable from "./metrics.injectable";

import type { Namespace } from "@freelensapp/kube-object";

import type { PodMetricInNamespaceData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-in-namespace.injectable";
import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<PodMetricInNamespaceData>;
}

const NonInjectedNamespaceMetricsDetailsComponent = observer(
  ({ metrics }: KubeObjectDetailsProps<Namespace> & Dependencies) => <WorkloadUsageDetails metrics={metrics} />,
);

export const NamespaceMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Namespace>>(
  NonInjectedNamespaceMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(namespaceMetricsInjectable, {
        namespace: props.object,
      }),
      ...props,
    }),
  },
);
