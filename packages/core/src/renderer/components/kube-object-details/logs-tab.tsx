/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { Pod } from "@freelensapp/kube-object";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect } from "react";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import createPodLogsTabInjectable from "../dock/logs/create-pod-logs-tab.injectable";
import getWorkloadPodsInjectable from "../dock/logs/get-workload-pods.injectable";
import { DrawerTitle } from "../drawer";
import podStoreInjectable from "../workloads-pods/store.injectable";
import styles from "./logs-tab.module.scss";

import type { Container, KubeObject, Pod as PodType } from "@freelensapp/kube-object";

import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import type { GetWorkloadPods } from "../dock/logs/get-workload-pods.injectable";
import type { PodStore } from "../workloads-pods/store";

type CreatePodLogsTab = (data: { selectedPod: PodType; selectedContainer: Container }) => string;

interface Dependencies {
  podStore: PodStore;
  subscribeStores: SubscribeStores;
  createPodLogsTab: CreatePodLogsTab;
  getWorkloadPods: GetWorkloadPods;
}

function podSelectorOf(object: KubeObject): string[] {
  const spec = (object as KubeObject & { spec?: Record<string, unknown> }).spec;
  const selector = spec?.selector ?? spec?.template;
  const labels = Array.isArray(selector)
    ? selector
    : ((selector as { matchLabels?: Record<string, string>; metadata?: { labels?: Record<string, string> } })
        ?.matchLabels ?? (selector as { metadata?: { labels?: Record<string, string> } })?.metadata?.labels);

  if (Array.isArray(labels)) {
    return labels.map(String);
  }

  return Object.entries(labels ?? {}).map(([key, value]) => `${key}=${value}`);
}

const NonInjectedLogsTab = observer(
  ({ object, podStore, subscribeStores, createPodLogsTab, getWorkloadPods }: Dependencies & { object: KubeObject }) => {
    const namespace = object.getNs() ?? "";

    useEffect(
      () => subscribeStores([podStore], { namespaces: namespace ? [namespace] : undefined }),
      [namespace, podStore, subscribeStores],
    );

    const pods: PodType[] =
      object instanceof Pod
        ? [object]
        : podStore.isLoaded
          ? getWorkloadPods({
              owner: { uid: object.getId(), kind: object.kind, name: object.getName() },
              namespace,
              podSelector: podSelectorOf(object),
            })
          : [];

    return (
      <div className={styles.LogsTab}>
        <DrawerTitle>Logs</DrawerTitle>
        {pods.length === 0 && <div className={styles.empty}>No pods found for this resource</div>}
        {pods.map((pod) =>
          pod.getContainers().map((container) => (
            <div key={`${pod.getId()}-${container.name}`} className={styles.row}>
              <span className={styles.podName}>{pod.getName()}</span>
              <span className={styles.containerName}>{container.name}</span>
              <Icon
                small
                material="terminal"
                tooltip="Open logs"
                onClick={() => createPodLogsTab({ selectedPod: pod, selectedContainer: container })}
              />
            </div>
          )),
        )}
      </div>
    );
  },
);

export const KubeObjectLogsTab = withInjectables<Dependencies, { object: KubeObject }>(NonInjectedLogsTab, {
  getProps: (di, props) => ({
    ...props,
    podStore: di.inject(podStoreInjectable),
    subscribeStores: di.inject(subscribeStoresInjectable),
    createPodLogsTab: di.inject(createPodLogsTabInjectable),
    getWorkloadPods: di.inject(getWorkloadPodsInjectable),
  }),
});
