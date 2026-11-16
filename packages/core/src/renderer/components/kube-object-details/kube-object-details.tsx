/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./kube-object-details.scss";

import { Icon } from "@freelensapp/icon";
import { Spinner } from "@freelensapp/spinner";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Drawer } from "../drawer";
import { KindIcon } from "../kind-icon";
import detailsExpandedUrlParamInjectable from "../kube-detail-params/details-expanded-url-param.injectable";
import detailsTabUrlParamInjectable, { type DetailsTab } from "../kube-detail-params/details-tab-url-param.injectable";
import hideDetailsInjectable from "../kube-detail-params/hide-details.injectable";
import kubeDetailsUrlParamInjectable from "../kube-detail-params/kube-details-url.injectable";
import { KubeObjectMenu } from "../kube-object-menu";
import { Tab, Tabs } from "../tabs";
import currentKubeObjectInDetailsInjectable from "./current-kube-object-in-details.injectable";
import kubeObjectDetailItemsInjectable from "./kube-object-detail-items/kube-object-detail-items.injectable";
import { KubeObjectLogsTab } from "./logs-tab";
import { KubeObjectSpecStatusTab } from "./spec-status-tab";
import { KubeObjectYamlTab } from "./yaml-tab";

import type { KubeObject } from "@freelensapp/kube-object";

import type { IComputedValue } from "mobx";

import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { PageParam } from "../../navigation/page-param";
import type { HideDetails } from "../kube-detail-params/hide-details.injectable";
import type { CurrentKubeObject } from "./current-kube-object-in-details.injectable";

export interface KubeObjectDetailsProps<Kube extends KubeObject = KubeObject> {
  className?: string;
  object: Kube;
}

interface DetailItemView {
  Component: React.ElementType<KubeObjectDetailsProps>;
  orderNumber: number;
}

interface Dependencies {
  detailItems: IComputedValue<DetailItemView[]>;
  kubeObject: IAsyncComputed<CurrentKubeObject>;
  hideDetails: HideDetails;
  kubeDetailsUrlParam: PageParam<string>;
  expandedUrlParam: PageParam<string>;
  tabUrlParam: PageParam<DetailsTab>;
}

const tabs: { id: DetailsTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "spec-status", label: "Spec & status" },
  { id: "timeline", label: "Timeline" },
  { id: "logs", label: "Logs" },
  { id: "metrics", label: "Metrics" },
  { id: "yaml", label: "YAML" },
];

/** The existing detail items fall into the tabs by their role in the drawer. */
const tabForOrderNumber = (orderNumber: number): DetailsTab => {
  if (orderNumber === -1) {
    return "metrics";
  }

  if (orderNumber === Infinity) {
    return "timeline";
  }

  return "overview";
};

const NonInjectedKubeObjectDetails = observer((props: Dependencies) => {
  const { detailItems, hideDetails, kubeObject, kubeDetailsUrlParam, expandedUrlParam, tabUrlParam } = props;

  const currentKubeObject = kubeObject.value.get();
  const isLoading = kubeObject.pending.get();

  // Only open the drawer when an object is actually selected in the URL. The
  // async-computed reports `pending === true` on its very first evaluation even
  // when no object is selected; React 18's createRoot commits that transient
  // state, which flashed an empty details drawer open on startup (React 17's
  // legacy renderer never painted it). Gating on the URL param avoids the flash.
  const hasSelectedObject = Boolean(kubeDetailsUrlParam.get());
  const expanded = hasSelectedObject && expandedUrlParam.get() === "true";
  const activeTab: DetailsTab = hasSelectedObject ? tabUrlParam.get() : "overview";
  const object = currentKubeObject?.object;

  return (
    <Drawer
      className="KubeObjectDetails flex flex-col"
      expanded={expanded}
      open={hasSelectedObject && Boolean(isLoading || currentKubeObject)}
      title={object ? `${object.kind}: ${object.getName()}` : ""}
      titleIcon={object && <KindIcon kind={object.kind} small />}
      toolbar={
        object && (
          <>
            <KubeObjectMenu object={object} toolbar={true} />
            <Icon
              material={expanded ? "fullscreen_exit" : "fullscreen"}
              tooltip={expanded ? "Exit full screen" : "Full screen"}
              onClick={() =>
                expandedUrlParam.get() === "true" ? expandedUrlParam.clear() : expandedUrlParam.set("true")
              }
            />
          </>
        )
      }
      onClose={hideDetails}
    >
      {isLoading && <Spinner center />}
      {currentKubeObject?.error && (
        <div className="m-auto">
          Resource loading has failed:
          <b>{currentKubeObject.error}</b>
        </div>
      )}
      {object && (
        <>
          <Tabs<DetailsTab>
            className="KubeObjectDetailsTabs"
            withBorder
            value={activeTab}
            onChange={(tab) => tabUrlParam.set(tab)}
          >
            {tabs.map((tab) => (
              <Tab key={tab.id} value={tab.id} label={tab.label} />
            ))}
          </Tabs>
          <div className="KubeObjectDetailsTabContent">
            {detailItems
              .get()
              .filter((item) => tabForOrderNumber(item.orderNumber) === activeTab)
              .map(({ Component }, index) => (
                // The object id is part of the key so that switching to another
                // object remounts the detail components: otherwise React keeps the
                // same instances and every local state of the details (revealed
                // secrets, loaded references, expanded sections) leaks from one
                // object to the next (#2416).
                <Component key={`${object.getId()}-${index}`} object={object} />
              ))}
            {activeTab === "spec-status" && <KubeObjectSpecStatusTab object={object} />}
            {activeTab === "logs" && <KubeObjectLogsTab object={object} />}
            {activeTab === "yaml" && <KubeObjectYamlTab object={object} />}
          </div>
        </>
      )}
    </Drawer>
  );
});

export const KubeObjectDetails = withInjectables<Dependencies>(NonInjectedKubeObjectDetails, {
  getProps: (di, props) => ({
    ...props,
    hideDetails: di.inject(hideDetailsInjectable),
    detailItems: di.inject(kubeObjectDetailItemsInjectable),
    kubeObject: di.inject(currentKubeObjectInDetailsInjectable),
    kubeDetailsUrlParam: di.inject(kubeDetailsUrlParamInjectable),
    expandedUrlParam: di.inject(detailsExpandedUrlParamInjectable),
    tabUrlParam: di.inject(detailsTabUrlParamInjectable),
  }),
});
