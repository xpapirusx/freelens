/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./volume-claims.scss";

import { storageClassApiInjectable } from "@freelensapp/kube-api-specifics";
import { Link } from "@freelensapp/routing";
import { stopPropagation, unitsToBytes } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import getDetailsUrlInjectable from "../kube-detail-params/get-details-url.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import podStoreInjectable from "../workloads-pods/store.injectable";
import persistentVolumeClaimStoreInjectable from "./store.injectable";

import type { StorageClassApi } from "@freelensapp/kube-api";
import type { PersistentVolumeClaim } from "@freelensapp/kube-object";

import type { GetDetailsUrl } from "../kube-detail-params/get-details-url.injectable";
import type { PodStore } from "../workloads-pods/store";
import type { PersistentVolumeClaimStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  pods = "pods",
  size = "size",
  accessModes = "access-modes",
  volume = "volume",
  storageClass = "storage-class",
  status = "status",
  age = "age",
}

const accessModeAbbreviations: Record<string, string> = {
  ReadWriteOnce: "RWO",
  ReadOnlyMany: "ROX",
  ReadWriteMany: "RWX",
  ReadWriteOncePod: "RWOP",
};

const accessModeFullNames: Record<string, string> = {
  RWO: "ReadWriteOnce",
  ROX: "ReadOnlyMany",
  RWX: "ReadWriteMany",
  RWOP: "ReadWriteOncePod",
};

const getAccessModes = (claim: PersistentVolumeClaim): string[] =>
  (claim.spec.accessModes ?? []).map((mode) => accessModeAbbreviations[mode] ?? mode);

const accessModesTooltip = (modes: string[]): string =>
  modes.map((mode) => `${mode} (${accessModeFullNames[mode] ?? mode})`).join(", ");

interface Dependencies {
  persistentVolumeClaimStore: PersistentVolumeClaimStore;
  storageClassApi: StorageClassApi;
  podStore: PodStore;
  getDetailsUrl: GetDetailsUrl;
}

@observer
class NonInjectedPersistentVolumeClaims extends React.Component<Dependencies> {
  render() {
    const { persistentVolumeClaimStore, getDetailsUrl, podStore, storageClassApi } = this.props;

    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="storage_volume_claims"
          className="PersistentVolumeClaims"
          store={persistentVolumeClaimStore}
          dependentStores={[podStore]}
          sortingCallbacks={{
            [columnId.name]: (pvc) => pvc.getName(),
            [columnId.namespace]: (pvc) => pvc.getNs(),
            [columnId.pods]: (pvc) => pvc.getPods(podStore.items).map((pod) => pod.getName()),
            [columnId.status]: (pvc) => pvc.getStatus(),
            [columnId.size]: (pvc) => unitsToBytes(pvc.getStorage()),
            [columnId.accessModes]: (pvc) => getAccessModes(pvc).join(", "),
            [columnId.volume]: (pvc) => pvc.spec.volumeName,
            [columnId.storageClass]: (pvc) => pvc.spec.storageClassName,
            [columnId.age]: (pvc) => -pvc.getCreationTimestamp(),
          }}
          searchFilters={[
            (pvc) => pvc.getSearchFields(),
            (pvc) => pvc.getPods(podStore.items).map((pod) => pod.getName()),
          ]}
          columnFilters={{
            [columnId.namespace]: (pvc) => pvc.getNs(),
            [columnId.status]: (pvc) => pvc.getStatus(),
            [columnId.storageClass]: (pvc) => pvc.spec.storageClassName,
            [columnId.accessModes]: (pvc) => getAccessModes(pvc),
          }}
          renderHeaderTitle="Persistent Volume Claims"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            {
              title: "Storage class",
              className: "storageClass",
              sortBy: columnId.storageClass,
              id: columnId.storageClass,
            },
            { title: "Size", className: "size", sortBy: columnId.size, id: columnId.size },
            { title: "Access Modes", className: "accessModes", sortBy: columnId.accessModes, id: columnId.accessModes },
            { title: "Volume", className: "volume", sortBy: columnId.volume, id: columnId.volume },
            { title: "Pods", className: "pods", sortBy: columnId.pods, id: columnId.pods },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
            { title: "Status", className: "status", sortBy: columnId.status, id: columnId.status },
          ]}
          renderTableContents={(pvc) => {
            const pods = pvc.getPods(podStore.items);
            const { storageClassName } = pvc.spec;
            const storageClassDetailsUrl = getDetailsUrl(
              storageClassApi.formatUrlForNotListing({
                name: storageClassName,
              }),
            );

            return [
              <WithTooltip>{pvc.getName()}</WithTooltip>,
              <NamespaceSelectBadge key="namespace" namespace={pvc.getNs()} />,
              <Link key="link" to={storageClassDetailsUrl} onClick={stopPropagation}>
                <WithTooltip>{storageClassName}</WithTooltip>
              </Link>,
              <WithTooltip>{pvc.getStorage()}</WithTooltip>,
              <WithTooltip key="access-modes" tooltip={accessModesTooltip(getAccessModes(pvc))}>
                {getAccessModes(pvc).join(", ")}
              </WithTooltip>,
              <WithTooltip key="volume">{pvc.spec.volumeName}</WithTooltip>,
              <WithTooltip tooltip={pods.map((pod) => pod.getName()).join(", ")}>
                {pods.map((pod) => (
                  <Link key={pod.getId()} to={getDetailsUrl(pod.selfLink)} onClick={stopPropagation}>
                    {pod.getName()}
                  </Link>
                ))}
              </WithTooltip>,
              <KubeObjectAge key="age" object={pvc} />,
              { title: pvc.getStatus(), className: pvc.getStatus().toLowerCase() },
            ];
          }}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const PersistentVolumeClaims = withInjectables<Dependencies>(NonInjectedPersistentVolumeClaims, {
  getProps: (di, props) => ({
    ...props,
    getDetailsUrl: di.inject(getDetailsUrlInjectable),
    persistentVolumeClaimStore: di.inject(persistentVolumeClaimStoreInjectable),
    podStore: di.inject(podStoreInjectable),
    storageClassApi: di.inject(storageClassApiInjectable),
  }),
});
