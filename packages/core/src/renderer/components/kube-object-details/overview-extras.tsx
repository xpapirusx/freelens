/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { Link } from "@freelensapp/routing";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect } from "react";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import configMapStoreInjectable from "../config-maps/store.injectable";
import secretStoreInjectable from "../config-secrets/store.injectable";
import getWorkloadPodsInjectable from "../dock/logs/get-workload-pods.injectable";
import { DrawerTitle } from "../drawer";
import getDetailsUrlInjectable from "../kube-detail-params/get-details-url.injectable";
import serviceStoreInjectable from "../network-services/store.injectable";
import podStoreInjectable from "../workloads-pods/store.injectable";
import styles from "./overview-extras.module.scss";

import type { KubeObject, Pod as PodType } from "@freelensapp/kube-object";

import type { ApiManager } from "../../../common/k8s-api/api-manager";
import type { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import type { GetWorkloadPods } from "../dock/logs/get-workload-pods.injectable";
import type { GetDetailsUrl } from "../kube-detail-params/get-details-url.injectable";

interface Dependencies {
  apiManager: ApiManager;
  getDetailsUrl: GetDetailsUrl;
  subscribeStores: SubscribeStores;
  getWorkloadPods: GetWorkloadPods;
  podStore: KubeObjectStore<PodType> & { isLoaded: boolean };
  serviceStore: KubeObjectStore<KubeObject>;
  configMapStore: KubeObjectStore<KubeObject>;
  secretStore: KubeObjectStore<KubeObject>;
}

function selectorOf(object: KubeObject): string[] {
  const spec = (object as KubeObject & { spec?: Record<string, unknown> }).spec;
  const selector = spec?.selector ?? spec?.template;
  const labels = Array.isArray(selector)
    ? selector
    : ((selector as { matchLabels?: Record<string, string>; metadata?: { labels?: Record<string, string> } })
        ?.matchLabels ?? (selector as { metadata?: { labels?: Record<string, string> } })?.metadata?.labels);

  return Array.isArray(labels)
    ? labels.map(String)
    : Object.entries(labels ?? {}).map(([key, value]) => `${key}=${value}`);
}

/** Walk a pod spec for the config maps and secrets it references. */
function findConfigurationNames(value: unknown, result: { configMaps: Set<string>; secrets: Set<string> }): void {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => findConfigurationNames(item, result));

    return;
  }

  const entry = value as Record<string, unknown>;

  if (entry.configMap && typeof entry.configMap === "object") {
    const name = (entry.configMap as Record<string, unknown>).name;

    if (typeof name === "string") result.configMaps.add(name);
  }
  if (entry.secret && typeof entry.secret === "object") {
    const name = (entry.secret as Record<string, unknown>).secretName ?? (entry.secret as Record<string, unknown>).name;

    if (typeof name === "string") result.secrets.add(name);
  }
  if (entry.configMapRef && typeof entry.configMapRef === "object") {
    const name = (entry.configMapRef as Record<string, unknown>).name;

    if (typeof name === "string") result.configMaps.add(name);
  }
  if (entry.secretRef && typeof entry.secretRef === "object") {
    const name = (entry.secretRef as Record<string, unknown>).name;

    if (typeof name === "string") result.secrets.add(name);
  }
  if (entry.imagePullSecrets && Array.isArray(entry.imagePullSecrets)) {
    entry.imagePullSecrets.forEach((ref) => {
      const name = (ref as Record<string, unknown>)?.name;

      if (typeof name === "string") result.secrets.add(name);
    });
  }

  Object.values(entry).forEach((child) => findConfigurationNames(child, result));
}

function resourceLink(object: KubeObject, apiManager: ApiManager, getDetailsUrl: GetDetailsUrl) {
  const link = apiManager.lookupApiLink({
    kind: object.kind,
    apiVersion: object.apiVersion,
    name: object.getName(),
    namespace: object.getNs(),
    uid: object.getId(),
  });

  if (!link) {
    return <span>{object.getName()}</span>;
  }

  return <Link to={getDetailsUrl(link)}>{`${object.kind.toLowerCase()}/${object.getName()}`}</Link>;
}

const NonInjectedRelatedResources = observer(
  ({
    object,
    apiManager,
    getDetailsUrl,
    subscribeStores,
    getWorkloadPods,
    podStore,
    serviceStore,
    configMapStore,
    secretStore,
  }: Dependencies & { object: KubeObject }) => {
    const namespace = object.getNs() ?? "";

    useEffect(
      () =>
        subscribeStores([podStore, serviceStore, configMapStore, secretStore], {
          namespaces: namespace ? [namespace] : undefined,
        }),
      [namespace, podStore, serviceStore, configMapStore, secretStore, subscribeStores],
    );

    const pods: PodType[] =
      object instanceof Pod
        ? [object]
        : podStore.isLoaded
          ? getWorkloadPods({
              owner: { uid: object.getId(), kind: object.kind, name: object.getName() },
              namespace,
              podSelector: selectorOf(object),
            })
          : [];

    const services = new Set<KubeObject>();
    const names = { configMaps: new Set<string>(), secrets: new Set<string>() };

    for (const pod of pods) {
      serviceStore.getByLabel(pod.getLabels()).forEach((service) => {
        if (service.getNs() === namespace) services.add(service);
      });
      findConfigurationNames(pod.toPlainObject(), names);
    }

    const configuration: KubeObject[] = [
      ...configMapStore.items.filter((item) => item.getNs() === namespace && names.configMaps.has(item.getName())),
      ...secretStore.items.filter((item) => item.getNs() === namespace && names.secrets.has(item.getName())),
    ];

    const groups = [
      { title: `Children (${pods.length})`, items: pods },
      { title: `Services (${services.size})`, items: [...services] },
      { title: `Configuration (${configuration.length})`, items: configuration },
    ].filter((group) => group.items.length > 0);

    if (groups.length === 0) {
      return null;
    }

    return (
      <div className={styles.RelatedResources}>
        <DrawerTitle>Related Resources</DrawerTitle>
        {groups.map((group) => (
          <div key={group.title} className={styles.group}>
            <div className={styles.groupTitle}>{group.title}</div>
            {group.items.map((item) => (
              <div key={item.getId()} className={styles.item}>
                {resourceLink(item as KubeObject, apiManager, getDetailsUrl)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  },
);

export const RelatedResources = withInjectables<Dependencies, { object: KubeObject }>(NonInjectedRelatedResources, {
  getProps: (di, props) => ({
    ...props,
    apiManager: di.inject(apiManagerInjectable),
    getDetailsUrl: di.inject(getDetailsUrlInjectable),
    subscribeStores: di.inject(subscribeStoresInjectable),
    getWorkloadPods: di.inject(getWorkloadPodsInjectable),
    podStore: di.inject(podStoreInjectable) as never,
    serviceStore: di.inject(serviceStoreInjectable) as never,
    configMapStore: di.inject(configMapStoreInjectable) as never,
    secretStore: di.inject(secretStoreInjectable) as never,
  }),
});

/** App Info from the well-known Kubernetes labels, as Radar shows it. */
export function AppInfo({ object }: { object: KubeObject }) {
  const labels = new Map<string, string>();

  for (const label of object.getLabels()) {
    const separator = label.indexOf("=");

    if (separator > 0) {
      labels.set(label.slice(0, separator), label.slice(separator + 1));
    }
  }

  const values = [
    ["App Name", "app.kubernetes.io/name"],
    ["Part Of", "app.kubernetes.io/part-of"],
    ["Managed By", "app.kubernetes.io/managed-by"],
    ["Version", "app.kubernetes.io/version"],
  ]
    .map(([title, key]) => ({ title, value: labels.get(key) }))
    .filter(({ value }) => !!value);

  if (values.length === 0) {
    return null;
  }

  return (
    <div className={styles.AppInfo}>
      <DrawerTitle>App Info</DrawerTitle>
      {values.map(({ title, value }) => (
        <div key={title} className={styles.row}>
          <span className={styles.label}>{title}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}
