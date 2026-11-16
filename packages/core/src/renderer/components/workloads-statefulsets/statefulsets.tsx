/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./statefulsets.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { Badge } from "../badge";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import statefulSetStoreInjectable from "./store.injectable";

import type { StatefulSet } from "@freelensapp/kube-object";

import type { EventStore } from "../events/store";
import type { StatefulSetStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  ready = "ready",
  desired = "desired",
  updated = "updated",
  images = "images",
  age = "age",
}

interface Dependencies {
  statefulSetStore: StatefulSetStore;
  eventStore: EventStore;
}

function getImages(statefulSet: StatefulSet): string[] {
  return Array.from(new Set(statefulSet.getImages().filter((image): image is string => Boolean(image))));
}

function getUpdatedReplicas(statefulSet: StatefulSet): number {
  const status = statefulSet.status;
  if (!status) {
    return 0;
  }
  // When the current revision matches the update revision every current pod is up to date,
  // otherwise fall back to `updatedReplicas`, which the StatefulSetStatus typing does not carry.
  if (status.currentRevision === status.updateRevision) {
    return status.currentReplicas || 0;
  }
  return (status as { updatedReplicas?: number }).updatedReplicas || 0;
}

const NonInjectedStatefulSets = observer((props: Dependencies) => {
  const { eventStore, statefulSetStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="workload_statefulsets"
        className="StatefulSets"
        store={statefulSetStore}
        dependentStores={[eventStore]}
        sortingCallbacks={{
          [columnId.name]: (statefulSet) => statefulSet.getName(),
          [columnId.namespace]: (statefulSet) => statefulSet.getNs(),
          [columnId.ready]: (statefulSet) => statefulSet.status?.readyReplicas,
          [columnId.desired]: (statefulSet) => statefulSet.getReplicas(),
          [columnId.updated]: (statefulSet) => getUpdatedReplicas(statefulSet),
          [columnId.images]: (statefulSet) => getImages(statefulSet)[0] ?? "",
          [columnId.age]: (statefulSet) => -statefulSet.getCreationTimestamp(),
        }}
        searchFilters={[(statefulSet) => statefulSet.getSearchFields()]}
        columnFilters={{
          [columnId.namespace]: (statefulSet) => statefulSet.getNs(),
        }}
        renderHeaderTitle="Stateful Sets"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          {
            title: "Namespace",
            className: "namespace",
            sortBy: columnId.namespace,
            id: columnId.namespace,
          },
          { title: "Ready", className: "ready", sortBy: columnId.ready, id: columnId.ready },
          {
            title: "Desired",
            className: "desired",
            sortBy: columnId.desired,
            id: columnId.desired,
          },
          { title: "Updated", className: "updated", sortBy: columnId.updated, id: columnId.updated },
          {
            title: <WithTooltip tooltip="Container images of the pod template">Images</WithTooltip>,
            className: "images scrollable",
            sortBy: columnId.images,
            id: columnId.images,
          },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(statefulSet) => [
          <WithTooltip>{statefulSet.getName()}</WithTooltip>,
          <NamespaceSelectBadge key="namespace" namespace={statefulSet.getNs()} />,
          statefulSet.status?.readyReplicas || 0,
          statefulSet.getReplicas(),
          getUpdatedReplicas(statefulSet),
          getImages(statefulSet).map((image) => (
            <Badge key={image} className="image" label={image} tooltip={image} small scrollable />
          )),
          <KubeObjectAge key="age" object={statefulSet} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const StatefulSets = withInjectables<Dependencies>(NonInjectedStatefulSets, {
  getProps: (di, props) => ({
    ...props,
    eventStore: di.inject(eventStoreInjectable),
    statefulSetStore: di.inject(statefulSetStoreInjectable),
  }),
});
