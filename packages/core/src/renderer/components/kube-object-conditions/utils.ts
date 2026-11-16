import type { Condition } from "@freelensapp/kube-object";

function timeToUnix(dateStr?: string): number {
  if (!dateStr) return 0;
  const time = Date.parse(dateStr);
  return Number.isNaN(time) ? 0 : Math.floor(time / 1000);
}

/**
 * Higher priority: first on the list if the timestamp is the same.
 */
const defaultConditionTypePriorities: Record<string, number> = {
  PodScheduled: 1,
  PodReadyToStartContainers: 2,
  ContainersReady: 3,
  ArtifactInStorage: 3,
  Released: 3,
  Initialized: 4,
  Ready: 5,
  Synced: 6,
};

/**
 * Sort conditions (the newer first) using heuristic: first sorts fields by
 * date and if the date is the same then checks priority from the object.
 */
export function sortConditions(
  conditions: Condition[],
  conditionTypePriorities: Record<string, number> = defaultConditionTypePriorities,
): Condition[] | undefined {
  return conditions?.sort(
    (a, b) =>
      timeToUnix(b.lastTransitionTime) - timeToUnix(a.lastTransitionTime) ||
      (conditionTypePriorities[b.type] ?? 0) - (conditionTypePriorities[a.type] ?? 0),
  );
}

/**
 * Condition types for which `status: "True"` records a problem rather than health, the polarity
 * SIG API Machinery leaves to each controller. Assembled from the kubelet's node conditions, the
 * conditions of pods and workloads, and the conventional operator conditions.
 */
const negativePolarityConditionTypes = new Set([
  "MemoryPressure",
  "DiskPressure",
  "PIDPressure",
  "NetworkUnavailable",
  "DisruptionTarget",
  "ReplicaFailure",
  "NamespaceDeletionDiscoveryFailure",
  "NamespaceDeletionGroupVersionParsingFailure",
  "NamespaceDeletionContentFailure",
  "NamespaceContentRemaining",
  "NamespaceFinalizersRemaining",
  "KernelDeadlock",
  "ReadonlyFilesystem",
  "ContainerRuntimeUnhealthy",
  "KubeletUnhealthy",
  "ResourceExhausted",
  "Degraded",
  "Failed",
  "Stalled",
  "OutOfSync",
  "ComparisonError",
  "SyncError",
  "DeletionError",
  "InvalidSpecError",
  "ErrorOccurred",
  "Denied",
  "Drifted",
  "Fallback",
  "ConfigUnsupported",
  "LowConfidence",
]);

export type ConditionTone = "ok" | "warning" | "fail" | "unknown";

/**
 * How a condition reads: `ok` when its status records health, `fail` when it records a problem,
 * taking the polarity of the condition type into account, and `unknown` for a status that is
 * neither `True` nor `False`.
 */
export const getConditionTone = (condition: Condition): ConditionTone => {
  if (condition.status !== "True" && condition.status !== "False") {
    return "unknown";
  }

  const healthy = negativePolarityConditionTypes.has(condition.type)
    ? condition.status === "False"
    : condition.status === "True";

  return healthy ? "ok" : "fail";
};
