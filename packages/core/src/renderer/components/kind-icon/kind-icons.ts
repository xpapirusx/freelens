/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The icon of every Kubernetes kind the application shows, by the lowercase name of the kind. The
 * names are Material Icons, which the icon component renders as the bundled font.
 */
const KIND_ICONS: Record<string, string> = {
  // Workloads
  pod: "view_in_ar",
  deployment: "rocket_launch",
  daemonset: "view_stream",
  statefulset: "storage",
  replicaset: "content_copy",
  replicationcontroller: "content_copy",
  job: "play_arrow",
  cronjob: "schedule",

  // Networking
  service: "power",
  endpoints: "settings_input_antenna",
  endpointslice: "settings_input_antenna",
  ingress: "meeting_room",
  ingressclass: "category",
  networkpolicy: "security",
  portforward: "swap_horiz",

  // Configuration
  configmap: "tune",
  secret: "vpn_key",

  // Storage
  persistentvolumeclaim: "save",
  persistentvolume: "storage",
  storageclass: "dns",

  // Cluster
  node: "memory",
  namespace: "folder_open",
  serviceaccount: "manage_accounts",
  event: "bolt",
  lease: "timer",

  // Scaling
  horizontalpodautoscaler: "zoom_out_map",
  verticalpodautoscaler: "height",
  poddisruptionbudget: "shield",

  // Limits and quotas
  resourcequota: "data_usage",
  limitrange: "straighten",
  priorityclass: "low_priority",
  runtimeclass: "memory",

  // RBAC
  role: "admin_panel_settings",
  clusterrole: "admin_panel_settings",
  rolebinding: "link",
  clusterrolebinding: "link",

  // Admission
  mutatingwebhookconfiguration: "settings_ethernet",
  validatingwebhookconfiguration: "settings_ethernet",
  mutatingadmissionpolicy: "rule",
  mutatingadmissionpolicybinding: "link",
  validatingadmissionpolicy: "rule",
  validatingadmissionpolicybinding: "link",
  podsecuritypolicy: "security",

  // Extensibility
  customresourcedefinition: "extension",

  // Helm
  helmrelease: "anchor",
  helmchart: "apps",
};

/**
 * The kebab-case suffixes of the sidebar item identifiers, which name the kind in the plural. The
 * icon is looked up once the suffix is mapped back to the name of the kind.
 */
const SIDEBAR_ITEM_KINDS: Record<string, string> = {
  pods: "pod",
  deployments: "deployment",
  "daemon-sets": "daemonset",
  "stateful-sets": "statefulset",
  "replica-sets": "replicaset",
  "replication-controller": "replicationcontroller",
  jobs: "job",
  "cron-jobs": "cronjob",
  services: "service",
  endpoints: "endpoints",
  "endpoint-slices": "endpointslice",
  ingresses: "ingress",
  "ingress-classes": "ingressclass",
  "network-policies": "networkpolicy",
  "port-forwards": "portforward",
  "config-maps": "configmap",
  secrets: "secret",
  "persistent-volume-claims": "persistentvolumeclaim",
  "persistent-volumes": "persistentvolume",
  "storage-classes": "storageclass",
  nodes: "node",
  namespaces: "namespace",
  "service-accounts": "serviceaccount",
  events: "event",
  leases: "lease",
  "horizontal-pod-autoscalers": "horizontalpodautoscaler",
  "vertical-pod-autoscalers": "verticalpodautoscaler",
  "pod-disruption-budgets": "poddisruptionbudget",
  "resource-quotas": "resourcequota",
  "limit-ranges": "limitrange",
  "priority-classes": "priorityclass",
  "runtime-classes": "runtimeclass",
  roles: "role",
  "cluster-roles": "clusterrole",
  "role-bindings": "rolebinding",
  "cluster-role-bindings": "clusterrolebinding",
  "mutating-webhook-configurations": "mutatingwebhookconfiguration",
  "validating-webhook-configurations": "validatingwebhookconfiguration",
  "mutating-admission-policies": "mutatingadmissionpolicy",
  "mutating-admission-policy-bindings": "mutatingadmissionpolicybinding",
  "validating-admission-policies": "validatingadmissionpolicy",
  "validating-admission-policy-bindings": "validatingadmissionpolicybinding",
  "pod-security-policies": "podsecuritypolicy",
  "custom-resource-definitions": "customresourcedefinition",
  "helm-releases": "helmrelease",
  "helm-charts": "helmchart",
};

const sidebarItemPrefix = "sidebar-item-";

/**
 * The color family of a kind. A kind keeps the family of its area, so the icons of one area read as
 * one group in the sidebar and in the title of a resource list.
 */
export type KindTone = "green" | "blue" | "amber" | "red" | "pink" | "neutral";

const KIND_TONES: Record<string, KindTone> = {
  pod: "green",
  deployment: "green",
  daemonset: "green",
  statefulset: "green",
  replicaset: "green",
  replicationcontroller: "green",
  job: "green",
  cronjob: "green",

  service: "blue",
  endpoints: "blue",
  endpointslice: "blue",
  ingress: "blue",
  ingressclass: "blue",
  networkpolicy: "blue",
  portforward: "blue",

  configmap: "amber",
  limitrange: "amber",
  resourcequota: "amber",
  priorityclass: "amber",
  runtimeclass: "amber",
  secret: "red",

  persistentvolumeclaim: "pink",
  persistentvolume: "pink",
  storageclass: "pink",

  node: "neutral",
  namespace: "neutral",
  serviceaccount: "pink",
  event: "neutral",
  lease: "neutral",

  horizontalpodautoscaler: "amber",
  verticalpodautoscaler: "amber",
  poddisruptionbudget: "amber",

  role: "pink",
  clusterrole: "pink",
  rolebinding: "pink",
  clusterrolebinding: "pink",

  mutatingwebhookconfiguration: "red",
  validatingwebhookconfiguration: "red",
  mutatingadmissionpolicy: "red",
  mutatingadmissionpolicybinding: "red",
  validatingadmissionpolicy: "red",
  validatingadmissionpolicybinding: "red",
  podsecuritypolicy: "red",

  customresourcedefinition: "blue",

  helmrelease: "blue",
  helmchart: "blue",
};

/**
 * The name of the icon of a kind, or `undefined` for a kind the application knows no icon for. The
 * name of the kind is case-insensitive, and the plural is understood for the kinds the sidebar
 * shows.
 */
export const getKindIconName = (kind: string): string | undefined => {
  const normalized = kind.toLowerCase().replace(/[^a-z0-9]/g, "");
  const singular = normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;

  return KIND_ICONS[normalized] ?? KIND_ICONS[singular];
};

/**
 * The color family of a kind, `neutral` for a kind without one.
 */
export const getKindTone = (kind: string): KindTone => {
  const normalized = kind.toLowerCase().replace(/[^a-z0-9]/g, "");
  const singular = normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;

  return KIND_TONES[normalized] ?? KIND_TONES[singular] ?? "neutral";
};

/**
 * The kind a sidebar item leads to, by the identifier of the item, or `undefined` for an item that
 * is not a kind.
 */
export const getSidebarItemKind = (sidebarItemId: string): string | undefined => {
  if (!sidebarItemId.startsWith(sidebarItemPrefix)) {
    return undefined;
  }

  const suffix = sidebarItemId.slice(sidebarItemPrefix.length);

  return SIDEBAR_ITEM_KINDS[suffix] ?? suffix.replace(/-/g, "");
};
