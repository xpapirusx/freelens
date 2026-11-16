/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createPageParamInjectable from "../../navigation/create-page-param.injectable";

export const detailsTabs = ["overview", "spec-status", "timeline", "logs", "metrics", "yaml"] as const;
export type DetailsTab = (typeof detailsTabs)[number];

/** The active tab of the resource details drawer. */
const detailsTabUrlParamInjectable = getInjectable({
  id: "kube-details-tab-url-param",
  instantiate: (di) => {
    const createPageParam = di.inject(createPageParamInjectable);

    return createPageParam<DetailsTab>({
      name: "kube-details-tab",
      defaultValue: "overview",
      parse: (value) => (detailsTabs.includes(value as DetailsTab) ? (value as DetailsTab) : "overview"),
    });
  },
});

export default detailsTabUrlParamInjectable;
