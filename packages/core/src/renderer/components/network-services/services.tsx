/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./services.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import endpointSliceStoreInjectable from "../network-endpoint-slices/store.injectable";
import { WithTooltip } from "../with-tooltip";
import serviceStoreInjectable from "./store.injectable";

import type { Service } from "@freelensapp/kube-object";

import type { EndpointSliceStore } from "../network-endpoint-slices/store";
import type { ServiceStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  type = "type",
  selector = "selector",
  clusterIp = "cluster-ip",
  externalIp = "external-ip",
  ports = "port",
  endpoints = "endpoints",
  age = "age",
  status = "status",
}

const formatExternalIps = (service: Service) => {
  const externalIps = service.getExternalIps();

  if (externalIps.length > 0) {
    return externalIps.join(", ");
  }

  if (service.spec?.externalName) {
    return service.spec.externalName;
  }

  return "-";
};

const formatSelector = (service: Service) => service.getSelector().join(", ") || "-";

const countReadyEndpoints = (service: Service, endpointSliceStore: EndpointSliceStore) => {
  const slices = endpointSliceStore.getByOwnerReference(
    service.apiVersion,
    service.kind,
    service.getName(),
    service.getNs(),
  );

  return slices.reduce((count, slice) => {
    const ready = (slice.endpoints ?? []).filter((endpoint) => endpoint.conditions?.ready !== false);

    return count + ready.length;
  }, 0);
};

interface Dependencies {
  serviceStore: ServiceStore;
  endpointSliceStore: EndpointSliceStore;
}

@observer
class NonInjectedServices extends React.Component<Dependencies> {
  render() {
    // The store is read from the callbacks the table invokes inside its own
    // MobX derivations, where reading this.props is forbidden (mobx-react 9).
    const { serviceStore, endpointSliceStore } = this.props;

    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="network_services"
          className="Services"
          store={serviceStore}
          dependentStores={[endpointSliceStore]} // endpoint count column reads the endpoint slices
          sortingCallbacks={{
            [columnId.name]: (service) => service.getName(),
            [columnId.namespace]: (service) => service.getNs(),
            [columnId.ports]: (service) => (service.spec.ports || []).map(({ port }) => port)[0],
            [columnId.clusterIp]: (service) => service.getClusterIp(),
            [columnId.type]: (service) => service.getType(),
            [columnId.age]: (service) => -service.getCreationTimestamp(),
            [columnId.status]: (service) => service.getStatus(),
            [columnId.selector]: (service) => formatSelector(service),
            [columnId.endpoints]: (service) => countReadyEndpoints(service, endpointSliceStore),
          }}
          searchFilters={[
            (service) => service.getSearchFields(),
            (service) => service.getSelector().join(" "),
            (service) => service.getPorts().join(" "),
          ]}
          columnFilters={{
            [columnId.namespace]: (service) => service.getNs(),
            [columnId.type]: (service) => service.getType(),
            [columnId.status]: (service) => service.getStatus(),
          }}
          renderHeaderTitle="Services"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Type", className: "type", sortBy: columnId.type, id: columnId.type },
            { title: "Selector", className: "selector", sortBy: columnId.selector, id: columnId.selector },
            { title: "Cluster IP", className: "clusterIp", sortBy: columnId.clusterIp, id: columnId.clusterIp },
            { title: "External IP", className: "externalIp", id: columnId.externalIp },
            { title: "Ports", className: "ports", sortBy: columnId.ports, id: columnId.ports },
            { title: "Endpoints", className: "endpoints", sortBy: columnId.endpoints, id: columnId.endpoints },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
            { title: "Status", className: "status", sortBy: columnId.status, id: columnId.status },
          ]}
          renderTableContents={(service) => [
            <WithTooltip>{service.getName()}</WithTooltip>,
            <NamespaceSelectBadge key="namespace" namespace={service.getNs()} />,
            service.getType(),
            <WithTooltip>{formatSelector(service)}</WithTooltip>,
            <WithTooltip>{service.getClusterIp()}</WithTooltip>,
            <WithTooltip>{formatExternalIps(service)}</WithTooltip>,
            <WithTooltip>{service.getPorts().join(", ")}</WithTooltip>,
            countReadyEndpoints(service, endpointSliceStore),
            <KubeObjectAge key="age" object={service} />,
            { title: service.getStatus(), className: service.getStatus().toLowerCase() },
          ]}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const Services = withInjectables<Dependencies>(NonInjectedServices, {
  getProps: (di, props) => ({
    ...props,
    serviceStore: di.inject(serviceStoreInjectable),
    endpointSliceStore: di.inject(endpointSliceStoreInjectable),
  }),
});
