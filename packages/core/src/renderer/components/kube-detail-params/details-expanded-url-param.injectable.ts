/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createPageParamInjectable from "../../navigation/create-page-param.injectable";

/** Keeps the full-screen state of the resource details drawer in the URL. */
const detailsExpandedUrlParamInjectable = getInjectable({
  id: "kube-details-expanded-url-param",
  instantiate: (di) => {
    const createPageParam = di.inject(createPageParamInjectable);

    return createPageParam({ name: "kube-details-expanded", defaultValue: "" });
  },
});

export default detailsExpandedUrlParamInjectable;
