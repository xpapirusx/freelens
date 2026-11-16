/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { AppInfo, RelatedResources } from "../../overview-extras";
import { PermissionsDetails } from "../../permissions-details";
import { PolicyFindingsDetails } from "../../policy-findings-details";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";

/** The Radar-like "App Info" block, right after the generic metadata. */
export const appInfoDetailItemInjectable = getInjectable({
  id: "app-info-detail-item",

  instantiate: () => ({
    Component: AppInfo,
    enabled: computed(() => true),
    orderNumber: 1,
  }),

  injectionToken: kubeObjectDetailItemInjectionToken,
});

/** Pods, services and configuration related to the object in the details. */
export const relatedResourcesDetailItemInjectable = getInjectable({
  id: "related-resources-detail-item",

  instantiate: () => ({
    Component: RelatedResources,
    enabled: computed(() => true),
    orderNumber: 2,
  }),

  injectionToken: kubeObjectDetailItemInjectionToken,
});

/** The effective RBAC rules of the resource's service account. */
export const permissionsDetailItemInjectable = getInjectable({
  id: "permissions-detail-item",

  instantiate: () => ({
    Component: PermissionsDetails,
    enabled: computed(() => true),
    orderNumber: 3,
  }),

  injectionToken: kubeObjectDetailItemInjectionToken,
});

/** The findings of installed PolicyReport producers, e.g. Kyverno. */
export const policyFindingsDetailItemInjectable = getInjectable({
  id: "policy-findings-detail-item",

  instantiate: () => ({
    Component: PolicyFindingsDetails,
    enabled: computed(() => true),
    orderNumber: 4,
  }),

  injectionToken: kubeObjectDetailItemInjectionToken,
});
