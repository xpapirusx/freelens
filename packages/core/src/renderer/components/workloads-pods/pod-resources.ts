/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { cpuUnitsToNumber, unitsToBytes } from "@freelensapp/utilities";

import type { Node, Pod } from "@freelensapp/kube-object";

interface ResourceContainer {
  resources?: {
    requests?: Partial<Record<string, string>>;
    limits?: Partial<Record<string, string>>;
  };
}

export type { ResourceContainer };

/**
 * The resource totals a set of containers asks for and is capped at, summed.
 * `NaN`-safe: an unset quantity contributes zero.
 */
export function containerResourceTotals(
  containers: ResourceContainer[],
  resource: "cpu" | "memory",
): { requests: number; limits: number } {
  let requests = 0;
  let limits = 0;

  for (const container of containers) {
    const containerRequests = container.resources?.requests;
    const containerLimits = container.resources?.limits;

    if (resource === "cpu") {
      requests += cpuUnitsToNumber(containerRequests?.cpu ?? "") ?? 0;
      limits += cpuUnitsToNumber(containerLimits?.cpu ?? "") ?? 0;
    } else {
      requests += unitsToBytes(containerRequests?.memory ?? "") || 0;
      limits += unitsToBytes(containerLimits?.memory ?? "") || 0;
    }
  }

  return { requests, limits };
}

/**
 * The resource totals a pod asks for and is capped at, summed over its
 * regular containers.
 */
export function podResourceTotals(pod: Pod, resource: "cpu" | "memory"): { requests: number; limits: number } {
  return containerResourceTotals(pod.getContainers(), resource);
}

/**
 * The GPUs a pod asks for, `requests` first and `limits` as the fallback,
 * summed across containers over the known GPU resource names.
 */
export function podGpuTotals(pod: Pod): number {
  let total = 0;

  for (const container of pod.getContainers()) {
    const { requests, limits } = container.resources ?? {};

    total += containerResourceGpu(requests) || containerResourceGpu(limits);
  }

  return total;
}

/**
 * The GPUs a node publishes as allocatable, over the known GPU resource names.
 */
export function nodeAllocatableGpus(node: Node): number {
  const allocatable = node.status?.allocatable ?? {};

  return Object.entries(allocatable).reduce(
    (total, [name, quantity]) => total + (isGpuResourceName(name) ? Number(quantity) || 0 : 0),
    0,
  );
}

const GPU_RESOURCE_NAME = /(^|\.)gpu$|\/gpu$/i;

function isGpuResourceName(name: string): boolean {
  return GPU_RESOURCE_NAME.test(name);
}

function containerResourceGpu(resources: Partial<Record<string, string>> | undefined): number {
  if (!resources) {
    return 0;
  }

  return Object.entries(resources).reduce(
    (total, [name, quantity]) => total + (isGpuResourceName(name) ? Number(quantity) || 0 : 0),
    0,
  );
}

/** Cores formatted the way the nodes page shows them. */
export function formatCores(cores: number): string {
  if (isNaN(cores)) {
    return "N/A";
  }

  return cores < 10 ? cores.toFixed(2) : cores.toFixed(1);
}
