/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { byValue } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";
import { computed } from "mobx";
import { kubeObjectDetailItemInjectionToken } from "./kube-object-detail-item-injection-token";

/**
 * The enabled detail items, with the order number kept so that the details
 * drawer can group them into tabs (metrics, events, the resource itself).
 */
const kubeObjectDetailItemsInjectable = getInjectable({
  id: "kube-object-detail-items",

  instantiate: (di) => {
    const computedInjectMany = di.inject(computedInjectManyInjectionToken);
    const items = computedInjectMany(kubeObjectDetailItemInjectionToken);

    return computed(() =>
      items
        .get()
        .filter((item) => item.enabled.get())
        .sort(byValue((item) => item.orderNumber))
        .map((item) => ({ Component: item.Component, orderNumber: item.orderNumber })),
    );
  },
});

export default kubeObjectDetailItemsInjectable;
