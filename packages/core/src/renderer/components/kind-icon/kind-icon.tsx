/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./kind-icon.scss";

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { getKindIconName, getKindTone } from "./kind-icons";

import type { StrictReactNode } from "@freelensapp/utilities";

export interface KindIconProps {
  /**
   * The kind of the resource, such as `Pod` or `Deployment`.
   */
  kind: string;
  className?: string;
  small?: boolean;
  /**
   * Rendered instead of the icon for a kind without one.
   */
  fallback?: StrictReactNode;
}

/**
 * The colored icon of a Kubernetes kind, as the sidebar and the title of a resource list show it. A
 * kind without an icon renders {@link KindIconProps.fallback}, nothing by default.
 */
export const KindIcon = ({ kind, className, small, fallback }: KindIconProps) => {
  const iconName = getKindIconName(kind);

  if (!iconName) {
    return <>{fallback}</>;
  }

  return (
    <Icon
      material={iconName}
      small={small}
      className={cssNames("KindIcon", `kind-tone-${getKindTone(kind)}`, className)}
      data-testid={`kind-icon-${kind}`}
    />
  );
};
