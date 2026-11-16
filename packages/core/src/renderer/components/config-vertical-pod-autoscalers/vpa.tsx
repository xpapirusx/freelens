/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./vpa.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectConditionsList } from "../kube-object-conditions";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import verticalPodAutoscalerStoreInjectable from "./store.injectable";

import type { VerticalPodAutoscalerStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  mode = "mode",
  age = "age",
  conditions = "conditions",
}

interface Dependencies {
  verticalPodAutoscalerStore: VerticalPodAutoscalerStore;
}

@observer
class NonInjectedVerticalPodAutoscalers extends React.Component<Dependencies> {
  render() {
    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="configuration_vpa"
          className="VerticalPodAutoscalers"
          store={this.props.verticalPodAutoscalerStore}
          sortingCallbacks={{
            [columnId.name]: (vpa) => vpa.getName(),
            [columnId.namespace]: (vpa) => vpa.getNs(),
            [columnId.mode]: (vpa) => vpa.getMode(),
            [columnId.age]: (vpa) => -vpa.getCreationTimestamp(),
          }}
          searchFilters={[(vpa) => vpa.getSearchFields()]}
          columnFilters={{
            [columnId.namespace]: (vpa) => vpa.getNs(),
          }}
          renderHeaderTitle="Vertical Pod Autoscalers"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Mode", className: "mode", sortBy: columnId.mode, id: columnId.mode },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
            { title: "Conditions", className: "conditions scrollable", id: columnId.conditions },
          ]}
          renderTableContents={(vpa) => [
            vpa.getName(),
            <NamespaceSelectBadge key="namespace" namespace={vpa.getNs()} />,
            vpa.getMode(),
            <KubeObjectAge key="age" object={vpa} />,
            <KubeObjectConditionsList key="conditions" object={vpa} />,
          ]}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const VerticalPodAutoscalers = withInjectables<Dependencies>(NonInjectedVerticalPodAutoscalers, {
  getProps: (di, props) => ({
    ...props,
    verticalPodAutoscalerStore: di.inject(verticalPodAutoscalerStoreInjectable),
  }),
});
