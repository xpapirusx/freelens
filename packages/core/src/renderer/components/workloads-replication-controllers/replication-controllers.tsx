/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { Badge } from "../badge";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import replicationControllerStoreInjectable from "./replication-controller-store.injectable";
import "./replication-controllers.scss";

import { WithTooltip } from "../with-tooltip";

import type { ReplicationController } from "@freelensapp/kube-object";

import type { ReplicationControllerStore } from "./replication-controller-store";

enum columnId {
  name = "name",
  namespace = "namespace",
  desired = "desired",
  current = "current",
  ready = "ready",
  owner = "owner",
  status = "status",
  selector = "selector",
}

interface Dependencies {
  store: ReplicationControllerStore;
}

function getOwnerText(item: ReplicationController): string {
  const owner = item.metadata.ownerReferences?.[0];
  return owner ? `${owner.kind}: ${owner.name}` : "";
}

function getStatusText(item: ReplicationController): string {
  return item.getDesiredReplicas() > 0 ? "Active" : "Old";
}

const NonInjectedReplicationControllers = observer((props: Dependencies) => (
  <SiblingsInTabLayout>
    <KubeObjectListLayout
      isConfigurable
      tableId="workload_replication_controllers"
      className="ReplicationControllers"
      store={props.store}
      sortingCallbacks={{
        [columnId.name]: (item) => item.getName(),
        [columnId.namespace]: (item) => item.getNs(),
        [columnId.selector]: (item) => item.getSelectorLabels(),
        [columnId.desired]: (item) => item.getDesiredReplicas(),
        [columnId.current]: (item) => item.getReplicas(),
        [columnId.ready]: (item) => item.status?.readyReplicas,
        [columnId.owner]: (item) => getOwnerText(item),
        [columnId.status]: (item) => getStatusText(item),
      }}
      searchFilters={[(item) => item.getSearchFields(), (item) => item.getSelectorLabels()]}
      columnFilters={{
        [columnId.namespace]: (item) => item.getNs(),
        [columnId.status]: (item) => getStatusText(item),
      }}
      renderHeaderTitle="Replication Controllers"
      renderTableHeader={[
        { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
        {
          title: "Namespace",
          className: "namespace",
          sortBy: columnId.namespace,
          id: columnId.namespace,
        },
        { title: "Desired", className: "desired", sortBy: columnId.desired, id: columnId.desired },
        { title: "Current", className: "current", sortBy: columnId.current, id: columnId.current },
        { title: "Ready", className: "ready", sortBy: columnId.ready, id: columnId.ready },
        {
          title: "Owner",
          className: "owner",
          sortBy: columnId.owner,
          id: columnId.owner,
        },
        { title: "Status", className: "status", sortBy: columnId.status, id: columnId.status },
        {
          title: "Selector",
          className: "selector",
          sortBy: columnId.selector,
          id: columnId.selector,
        },
      ]}
      renderTableContents={(item) => [
        <WithTooltip>{item.getName()}</WithTooltip>,
        <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
        item.getReplicas() || 0,
        item.getDesiredReplicas(),
        item.status?.readyReplicas || 0,
        <WithTooltip>{getOwnerText(item)}</WithTooltip>,
        <WithTooltip>{getStatusText(item)}</WithTooltip>,
        item.getSelectorLabels().map((label) => <Badge key={label} label={label} tooltip={label} />),
      ]}
    />
  </SiblingsInTabLayout>
));

export const ReplicationControllers = withInjectables<Dependencies>(NonInjectedReplicationControllers, {
  getProps: (di, props) => ({
    ...props,
    store: di.inject(replicationControllerStoreInjectable),
  }),
});
