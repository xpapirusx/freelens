/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./config-maps.scss";

import { bytesToUnits } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import configMapStoreInjectable from "./store.injectable";

import type { ConfigMap } from "@freelensapp/kube-object";

import type { ConfigMapStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  keys = "keys",
  size = "size",
  age = "age",
}

// The size of a ConfigMap is the size of its values, in UTF-8 bytes.
const textEncoder = new TextEncoder();

const valuesByteLength = (values: Partial<Record<string, string>> | undefined): number =>
  Object.values(values ?? {}).reduce((sum, value) => sum + (value ? textEncoder.encode(value).length : 0), 0);

const getDataSize = (configMap: ConfigMap): number =>
  valuesByteLength(configMap.data) + valuesByteLength(configMap.binaryData);

// `bytesToUnits` reports anything non-positive as "N/A", which no ConfigMap data is.
const formatDataSize = (bytes: number): string => (bytes > 0 ? bytesToUnits(bytes) : "0.0B");

interface Dependencies {
  configMapStore: ConfigMapStore;
}

@observer
class NonInjectedConfigMaps extends React.Component<Dependencies> {
  render() {
    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="configuration_configmaps"
          className="ConfigMaps"
          store={this.props.configMapStore}
          sortingCallbacks={{
            [columnId.name]: (configMap) => configMap.getName(),
            [columnId.namespace]: (configMap) => configMap.getNs(),
            [columnId.keys]: (configMap) => configMap.getKeys(),
            [columnId.size]: (configMap) => getDataSize(configMap),
            [columnId.age]: (configMap) => -configMap.getCreationTimestamp(),
          }}
          columnFilters={{
            [columnId.namespace]: (configMap) => configMap.getNs(),
            [columnId.keys]: (configMap) => configMap.getKeys(),
          }}
          searchFilters={[(configMap) => configMap.getSearchFields(), (configMap) => configMap.getKeys()]}
          renderHeaderTitle="Config Maps"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Keys", className: "keys", sortBy: columnId.keys, id: columnId.keys },
            { title: "Size", className: "size", sortBy: columnId.size, id: columnId.size },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(configMap) => [
            <WithTooltip>{configMap.getName()}</WithTooltip>,
            <NamespaceSelectBadge key="namespace" namespace={configMap.getNs()} />,
            <WithTooltip>{configMap.getKeys().join(", ")}</WithTooltip>,
            <WithTooltip>{formatDataSize(getDataSize(configMap))}</WithTooltip>,
            <KubeObjectAge key="age" object={configMap} />,
          ]}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const ConfigMaps = withInjectables<Dependencies>(NonInjectedConfigMaps, {
  getProps: (di, props) => ({
    ...props,
    configMapStore: di.inject(configMapStoreInjectable),
  }),
});
