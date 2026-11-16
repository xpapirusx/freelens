/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Injectable } from "@ogre-tools/injectable";
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import React from "react";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import namespaceMetricsInjectable from "../namespaces/metrics.injectable";
import { NamespaceMetricsDetailsComponent } from "../namespaces/metrics-details-component";
import ingressMetricsInjectable from "../network-ingresses/metrics.injectable";
import { IngressMetricsDetailsComponent } from "../network-ingresses/metrics-details-component";
import nodeMetricsInjectable from "../nodes/metrics.injectable";
import { NodeMetricsDetailsComponent } from "../nodes/metrics-details-component";
import persistentVolumeClaimMetricsInjectable from "../storage-volume-claims/metrics.injectable";
import { PersistentVolumeClaimMetricsDetailsComponent } from "../storage-volume-claims/metrics-details-component";
import { renderFor } from "../test-utils/renderFor";
import daemonSetMetricsInjectable from "../workloads-daemonsets/metrics.injectable";
import { DaemonSetMetricsDetailsComponent } from "../workloads-daemonsets/metrics-details-component";
import deploymentMetricsInjectable from "../workloads-deployments/metrics.injectable";
import { DeploymentMetricsDetailsComponent } from "../workloads-deployments/metrics-details-component";
import jobMetricsInjectable from "../workloads-jobs/metrics.injectable";
import { JobMetricsDetailsComponent } from "../workloads-jobs/metrics-details-component";
import podContainerMetricsInjectable from "../workloads-pods/container-metrics.injectable";
import podMetricsInjectable from "../workloads-pods/metrics.injectable";
import { PodDetailsContainerMetrics } from "../workloads-pods/pod-details-container-metrics";
import PodMetricsDetailsComponent from "../workloads-pods/pod-metrics-details-component";
import replicaSetMetricsInjectable from "../workloads-replicasets/metrics.injectable";
import { ReplicaSetMetricsDetailsComponent } from "../workloads-replicasets/metrics-details-component";
import statefulSetMetricsInjectable from "../workloads-statefulsets/metrics.injectable";
import { StatefulSetMetricsDetailsComponent } from "../workloads-statefulsets/metrics-details-component";

import type {
  Container,
  DaemonSet,
  Deployment,
  Ingress,
  Job,
  Namespace,
  Node,
  PersistentVolumeClaim,
  Pod,
  ReplicaSet,
  StatefulSet,
} from "@freelensapp/kube-object";

import type { MetricData } from "../../../common/k8s-api/endpoints/metrics.api";
import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { AtLeastOneMetricTab, ResourceMetricsProps } from "./resource-metrics";

let capturedTimeRangedProps: ResourceMetricsProps<string> | undefined;
let capturedSectionProps: Record<string, unknown> | undefined;
let capturedWorkloadProps: Record<string, unknown> | undefined;

vi.mock("./index", () => ({
  TimeRangedResourceMetrics: (props: ResourceMetricsProps<string>) => {
    capturedTimeRangedProps = props;

    return <div data-testid="time-ranged-resource-metrics" />;
  },
}));

vi.mock("../usage-chart/resource-usage-section", () => ({
  ResourceUsageSection: (props: Record<string, unknown>) => {
    capturedSectionProps = props;

    return <div data-testid="resource-usage-section" />;
  },
}));

vi.mock("../usage-chart/workload-usage-details", () => ({
  WorkloadUsageDetails: (props: Record<string, unknown>) => {
    capturedWorkloadProps = props;

    return <div data-testid="workload-usage-details" />;
  },
}));

vi.mock("../usage-chart/mini-bar-chart", () => ({
  MiniBarChart: () => <div data-testid="mini-bar-chart" />,
}));

const metricData = (values: [string, string][]): MetricData =>
  ({
    data: { result: [{ metric: {}, values }] },
  }) as unknown as MetricData;

const fakeMetrics = <T,>(data: T | undefined): IAsyncComputed<T> =>
  ({
    value: { get: () => data as T },
    pending: { get: () => false },
    invalidate: vi.fn(),
  }) as unknown as IAsyncComputed<T>;

const namespace = {
  getId: () => "namespace-id",
  getName: () => "namespace-name",
  getNs: () => "namespace-name",
} as unknown as Namespace;

const ingress = {
  getId: () => "ingress-id",
  getName: () => "ingress-name",
  getNs: () => "ingress-ns",
} as unknown as Ingress;

const node = {
  getId: () => "node-id",
  getName: () => "node-name",
  getNs: () => "node-ns",
} as unknown as Node;

const persistentVolumeClaim = {
  getId: () => "pvc-id",
  getName: () => "pvc-name",
  getNs: () => "pvc-ns",
} as unknown as PersistentVolumeClaim;

const daemonSet = {
  getId: () => "daemon-set-id",
  getName: () => "daemon-set-name",
  getNs: () => "daemon-set-ns",
} as unknown as DaemonSet;

const deployment = {
  getId: () => "deployment-id",
  getName: () => "deployment-name",
  getNs: () => "deployment-ns",
} as unknown as Deployment;

const job = {
  getId: () => "job-id",
  getName: () => "job-name",
  getNs: () => "job-ns",
} as unknown as Job;

const pod = {
  getId: () => "pod-id",
  getName: () => "pod-name",
  getNs: () => "pod-ns",
} as unknown as Pod;

const container = {
  name: "pod-container",
} as Container;

const replicaSet = {
  getId: () => "replica-set-id",
  getName: () => "replica-set-name",
  getNs: () => "replica-set-ns",
} as unknown as ReplicaSet;

const statefulSet = {
  getId: () => "stateful-set-id",
  getName: () => "stateful-set-name",
  getNs: () => "stateful-set-ns",
} as unknown as StatefulSet;

type AdapterCase = {
  name: string;
  injectable: Injectable<unknown, unknown, any>;
  renderElement: () => React.ReactElement;
  expectedParams: unknown;
  expectWiring: (metrics: IAsyncComputed<never>) => void;
};

const adapterCases: AdapterCase[] = [
  {
    name: "namespace details",
    injectable: namespaceMetricsInjectable,
    renderElement: () => <NamespaceMetricsDetailsComponent object={namespace} />,
    expectedParams: {
      namespace,
    },
    expectWiring: (metrics) => {
      expect(capturedWorkloadProps).toEqual(expect.objectContaining({ metrics }));
    },
  },
  {
    name: "ingress details",
    injectable: ingressMetricsInjectable,
    renderElement: () => <IngressMetricsDetailsComponent object={ingress} />,
    expectedParams: {
      ingress,
    },
    expectWiring: (metrics) => {
      expect(capturedTimeRangedProps).toEqual(
        expect.objectContaining({
          object: ingress,
          tabs: ["Network", "Duration"] as AtLeastOneMetricTab,
          metrics,
        }),
      );
    },
  },
  {
    name: "node details",
    injectable: nodeMetricsInjectable,
    renderElement: () => <NodeMetricsDetailsComponent object={node} />,
    expectedParams: {
      node,
    },
    expectWiring: () => {
      expect(capturedSectionProps).toEqual(
        expect.objectContaining({
          cpu: nodeMetricData.cpuUsage,
          memory: nodeMetricData.workloadMemoryUsage,
          cpuLimit: 3,
          memoryLimit: 4,
          limitTitle: "Allocatable",
        }),
      );
    },
  },
  {
    name: "persistent volume claim details",
    injectable: persistentVolumeClaimMetricsInjectable,
    renderElement: () => <PersistentVolumeClaimMetricsDetailsComponent object={persistentVolumeClaim} />,
    expectedParams: {
      persistentVolumeClaim,
    },
    expectWiring: (metrics) => {
      expect(capturedTimeRangedProps).toEqual(
        expect.objectContaining({
          object: persistentVolumeClaim,
          tabs: ["Disk"] as AtLeastOneMetricTab,
          metrics,
        }),
      );
    },
  },
  {
    name: "daemon set details",
    injectable: daemonSetMetricsInjectable,
    renderElement: () => <DaemonSetMetricsDetailsComponent object={daemonSet} />,
    expectedParams: {
      daemonSet,
    },
    expectWiring: (metrics) => {
      expect(capturedWorkloadProps).toEqual(expect.objectContaining({ metrics, templateContainers: [] }));
    },
  },
  {
    name: "deployment details",
    injectable: deploymentMetricsInjectable,
    renderElement: () => <DeploymentMetricsDetailsComponent object={deployment} />,
    expectedParams: {
      deployment,
    },
    expectWiring: (metrics) => {
      expect(capturedWorkloadProps).toEqual(expect.objectContaining({ metrics, templateContainers: [] }));
    },
  },
  {
    name: "job details",
    injectable: jobMetricsInjectable,
    renderElement: () => <JobMetricsDetailsComponent object={job} />,
    expectedParams: {
      job,
    },
    expectWiring: (metrics) => {
      expect(capturedWorkloadProps).toEqual(expect.objectContaining({ metrics, templateContainers: [] }));
    },
  },
  {
    name: "pod details",
    injectable: podMetricsInjectable,
    renderElement: () => <PodMetricsDetailsComponent object={pod} />,
    expectedParams: {
      pod,
    },
    expectWiring: () => {
      expect(capturedSectionProps).toEqual(
        expect.objectContaining({
          cpu: podMetricData.cpuUsage,
          memory: podMetricData.memoryUsage,
          cpuRequest: 1,
          cpuLimit: 2,
          memoryRequest: 1,
          memoryLimit: 2,
        }),
      );
    },
  },
  {
    name: "pod container details",
    injectable: podContainerMetricsInjectable,
    renderElement: () => <PodDetailsContainerMetrics pod={pod} container={container} />,
    expectedParams: {
      pod,
      container,
    },
    expectWiring: () => {
      expect(screen.getAllByTestId("mini-bar-chart")).toHaveLength(2);
    },
  },
  {
    name: "replica set details",
    injectable: replicaSetMetricsInjectable,
    renderElement: () => <ReplicaSetMetricsDetailsComponent object={replicaSet} />,
    expectedParams: {
      replicaSet,
    },
    expectWiring: (metrics) => {
      expect(capturedWorkloadProps).toEqual(expect.objectContaining({ metrics, templateContainers: [] }));
    },
  },
  {
    name: "stateful set details",
    injectable: statefulSetMetricsInjectable,
    renderElement: () => <StatefulSetMetricsDetailsComponent object={statefulSet} />,
    expectedParams: {
      statefulSet,
    },
    expectWiring: (metrics) => {
      expect(capturedWorkloadProps).toEqual(expect.objectContaining({ metrics, templateContainers: [] }));
    },
  },
];

const podMetricData = {
  cpuUsage: metricData([["0", "5"]]),
  cpuRequests: metricData([["0", "1"]]),
  cpuLimits: metricData([["0", "2"]]),
  memoryUsage: metricData([["0", "6"]]),
  memoryRequests: metricData([["0", "1"]]),
  memoryLimits: metricData([["0", "2"]]),
};

const nodeMetricData = {
  cpuUsage: metricData([["0", "5"]]),
  cpuRequests: metricData([["0", "1"]]),
  cpuAllocatableCapacity: metricData([["0", "3"]]),
  memoryUsage: metricData([["0", "6"]]),
  workloadMemoryUsage: metricData([["0", "7"]]),
  memoryRequests: metricData([["0", "1"]]),
  memoryAllocatableCapacity: metricData([["0", "4"]]),
};

describe("metrics details adapters", () => {
  beforeEach(() => {
    capturedTimeRangedProps = undefined;
    capturedSectionProps = undefined;
    capturedWorkloadProps = undefined;
  });

  const runAdapterCase = ({ expectedParams, expectWiring, injectable, name, renderElement }: AdapterCase) => {
    it(`wires ${name} through the usage details`, async () => {
      const di = getDiForUnitTesting();
      const render = renderFor(di);
      let capturedInjectableParams: unknown;
      const data =
        name === "pod details"
          ? podMetricData
          : name === "node details"
            ? nodeMetricData
            : name === "pod container details"
              ? {
                  cpuUsage: metricData([["0", "5"]]),
                  cpuRequests: metricData([["0", "1"]]),
                  cpuLimits: metricData([["0", "2"]]),
                  memoryUsage: metricData([["0", "6"]]),
                  memoryRequests: metricData([["0", "1"]]),
                  memoryLimits: metricData([["0", "2"]]),
                }
              : undefined;
      const metrics = fakeMetrics(data);

      di.override(injectable, (_di, params) => {
        capturedInjectableParams = params;

        return metrics as never;
      });

      render(renderElement());

      expect(capturedInjectableParams).toEqual(expectedParams);
      expectWiring(metrics as never);
    });
  };

  adapterCases.forEach((testCase) => runAdapterCase(testCase));
});
