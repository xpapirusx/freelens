/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./ingresses.scss";

import {
  type ComputedIngressRoute,
  computeRouteDeclarations,
  type Ingress,
  type IngressSpec,
} from "@freelensapp/kube-object";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import ingressStoreInjectable from "./ingress-store.injectable";

import type { IngressStore } from "./ingress-store";

enum columnId {
  name = "name",
  namespace = "namespace",
  ingressClass = "ingress-class",
  hosts = "hosts",
  loadBalancers = "load-balancers",
  rules = "rules",
  tls = "tls",
  age = "age",
}

interface Dependencies {
  ingressStore: IngressStore;
}

// Keep in sync: this is also the `max` passed to showRoutes() for the row content below,
// so the reserved row height always matches what's actually painted (1 rule + "N more..." line).
const MAX_VISIBLE_ROUTES = 1;

// Mirrors how many lines showRoutes(routes, max) actually paints: up to `max` rule lines,
// plus one more line for the "N more..." ellipsis when there's overflow.
function countVisibleRouteLines(routeCount: number, max: number) {
  return Math.min(routeCount, max) + (routeCount > max ? 1 : 0) || 1;
}

function showLoadBalancers(loadBalancers: (string | undefined)[], max: number) {
  return (
    <>
      {loadBalancers.slice(0, max).join(", ")}
      {loadBalancers.length > max && ` +${loadBalancers.length - max}`}
    </>
  );
}

function showRoutes(routes: ComputedIngressRoute[], max: number) {
  return (
    <>
      {routes.slice(0, max).map((decl) =>
        decl.displayAsLink ? (
          <div key={decl.url} className="ingressRule">
            <a href={decl.url} rel="noreferrer" target="_blank" onClick={(e) => e.stopPropagation()}>
              {decl.url}
            </a>
            {` ⇢ ${decl.service}`}
          </div>
        ) : (
          <div key={decl.url} className="ingressRule">
            {`${decl.url} ⇢ ${decl.service}`}
          </div>
        ),
      )}
      {routes.length > max && (
        <div key="ellipsis" className="ingressRule">
          {routes.length - max} more...
        </div>
      )}
    </>
  );
}

// Not in the IngressSpec type yet, so read it defensively.
const getIngressClassName = (ingress: Ingress) =>
  (ingress.spec as (IngressSpec & { ingressClassName?: string }) | undefined)?.ingressClassName;

const formatIngressClass = (ingress: Ingress) => getIngressClassName(ingress) ?? "-";

const formatHosts = (ingress: Ingress) => ingress.getHosts().join(", ") || "-";

const formatTls = (ingress: Ingress) => {
  const tls = ingress.spec.tls ?? [];
  const secrets = tls.map(({ secretName }) => secretName).filter(Boolean);

  if (secrets.length > 0) {
    return secrets.join(", ");
  }

  return tls.length > 0 ? "✓" : "-";
};

const NonInjectedIngresses = observer((props: Dependencies) => {
  const { ingressStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="network_ingresses"
        className="Ingresses"
        store={ingressStore}
        sortingCallbacks={{
          [columnId.name]: (ingress) => ingress.getName(),
          [columnId.namespace]: (ingress) => ingress.getNs(),
          [columnId.age]: (ingress) => -ingress.getCreationTimestamp(),
          [columnId.ingressClass]: (ingress) => formatIngressClass(ingress),
          [columnId.hosts]: (ingress) => formatHosts(ingress),
          [columnId.tls]: (ingress) => ingress.spec.tls?.length ?? 0,
        }}
        searchFilters={[(ingress) => ingress.getSearchFields(), (ingress) => ingress.getPorts()]}
        columnFilters={{
          [columnId.namespace]: (ingress) => ingress.getNs(),
          [columnId.ingressClass]: (ingress) => getIngressClassName(ingress),
          [columnId.tls]: (ingress) => ((ingress.spec.tls?.length ?? 0) > 0 ? "TLS" : "-"),
        }}
        renderHeaderTitle="Ingresses"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          { title: "Class", className: "ingressClass", sortBy: columnId.ingressClass, id: columnId.ingressClass },
          { title: "Hosts", className: "hosts", sortBy: columnId.hosts, id: columnId.hosts },
          { title: "LoadBalancers", className: "loadbalancers", id: columnId.loadBalancers },
          { title: "Rules", className: "rules", id: columnId.rules },
          { title: "TLS", className: "tls", sortBy: columnId.tls, id: columnId.tls },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(ingress) => {
          const loadBalancers = ingress.getLoadBalancers();
          const routes = computeRouteDeclarations(ingress);

          return [
            <WithTooltip>{ingress.getName()}</WithTooltip>,
            <NamespaceSelectBadge key="namespace" namespace={ingress.getNs()} />,
            <WithTooltip>{formatIngressClass(ingress)}</WithTooltip>,
            <WithTooltip>{formatHosts(ingress)}</WithTooltip>,
            <WithTooltip tooltip={showLoadBalancers(loadBalancers, 20)}>
              {showLoadBalancers(loadBalancers, 1)}
            </WithTooltip>,
            <WithTooltip tooltip={showRoutes(routes, 20)}>{showRoutes(routes, MAX_VISIBLE_ROUTES)}</WithTooltip>,
            <WithTooltip>{formatTls(ingress)}</WithTooltip>,
            <KubeObjectAge key="age" object={ingress} />,
          ];
        }}
        tableProps={{
          customRowHeights: (item, lineHeight, paddings) => {
            const lines = countVisibleRouteLines(computeRouteDeclarations(item).length, MAX_VISIBLE_ROUTES);

            return lines * lineHeight + paddings;
          },
        }}
      />
    </SiblingsInTabLayout>
  );
});

export const Ingresses = withInjectables<Dependencies>(NonInjectedIngresses, {
  getProps: (di, props) => ({
    ...props,
    ingressStore: di.inject(ingressStoreInjectable),
  }),
});
