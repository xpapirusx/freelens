/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { WorkloadUsageDetails } from "../usage-chart/workload-usage-details";
import deploymentMetricsInjectable from "./metrics.injectable";

import type { Deployment } from "@freelensapp/kube-object";

import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { WorkloadUsageMetricData } from "../usage-chart/workload-usage-details";

interface Dependencies {
  metrics: IAsyncComputed<WorkloadUsageMetricData>;
}

const NonInjectedDeploymentMetricsDetailsComponent = observer(
  ({ object, metrics }: KubeObjectDetailsProps<Deployment> & Dependencies) => (
    <WorkloadUsageDetails metrics={metrics} templateContainers={object.spec?.template?.spec?.containers ?? []} />
  ),
);

export const DeploymentMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Deployment>>(
  NonInjectedDeploymentMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(deploymentMetricsInjectable, {
        deployment: props.object,
      }),
      ...props,
    }),
  },
);
