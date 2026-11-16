/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import detailsExpandedUrlParamInjectable from "./details-expanded-url-param.injectable";
import detailsTabUrlParamInjectable from "./details-tab-url-param.injectable";
import showDetailsInjectable from "./show-details.injectable";

export type HideDetails = () => void;

const hideDetailsInjectable = getInjectable({
  id: "hide-details",
  instantiate: (di): HideDetails => {
    const showDetails = di.inject(showDetailsInjectable);
    const expandedUrlParam = di.inject(detailsExpandedUrlParamInjectable);
    const tabUrlParam = di.inject(detailsTabUrlParamInjectable);

    return () => {
      expandedUrlParam.clear();
      tabUrlParam.clear();
      showDetails("");
    };
  },
});

export default hideDetailsInjectable;
