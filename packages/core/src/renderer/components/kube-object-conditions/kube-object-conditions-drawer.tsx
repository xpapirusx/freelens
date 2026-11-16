/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./kube-object-conditions.scss";

import { Icon } from "@freelensapp/icon";
import { KubeObject } from "@freelensapp/kube-object";
import { cssNames } from "@freelensapp/utilities";
import { observer } from "mobx-react";
import { ReactiveDuration } from "../duration/reactive-duration";
import { LocaleDate } from "../locale-date";
import { WithTooltip } from "../with-tooltip";
import { getTooltip } from "./components";
import { getConditionTone, sortConditions } from "./utils";

import type { KubeObjectMetadata, KubeObjectStatus } from "@freelensapp/kube-object";

import type { ConditionTone } from "./utils";

export interface KubeObjectConditionsDrawerProps {
  object: KubeObject;
  conditionTypePriorities?: Record<string, number>;
}

const conditionToneIcons: Record<ConditionTone, string> = {
  ok: "check",
  warning: "warning",
  fail: "close",
  unknown: "remove",
};

export const KubeObjectConditionsDrawer = observer((props: KubeObjectConditionsDrawerProps) => {
  const { object, conditionTypePriorities } = props;

  if (!object) {
    return null;
  }

  if (!(object instanceof KubeObject)) {
    return null;
  }

  const conditions = (object as KubeObject<KubeObjectMetadata, KubeObjectStatus>).status?.conditions;

  if (!conditions?.length) {
    return null;
  }

  const sorted = sortConditions(conditions, conditionTypePriorities) ?? [];
  const failing = sorted.filter((condition) => getConditionTone(condition) === "fail").length;

  return (
    <div className="KubeObjectConditions">
      <div className="conditions-header">
        <span className="conditions-title">Conditions</span>
        <span className="conditions-count">{sorted.length}</span>
        {failing > 0 && <span className="conditions-failing">{failing} failing</span>}
      </div>
      <div className="conditions-list">
        {sorted.map((condition) => {
          const id = `drawer-${object.getId()}-condition-${condition.type}`;
          const tone = getConditionTone(condition);

          return (
            <div key={condition.type} className={cssNames("KubeObjectCondition", tone)}>
              <span className="condition-dot">
                <Icon material={conditionToneIcons[tone]} smallest />
              </span>
              <div className="condition-body">
                <div className="condition-head">
                  <WithTooltip tooltip={getTooltip(condition, id)}>
                    <span className="condition-type">{condition.type}</span>
                  </WithTooltip>
                  <span className="condition-status">{condition.status}</span>
                  {condition.reason && <span className="condition-reason">{condition.reason}</span>}
                  {condition.lastTransitionTime && (
                    <span className="condition-time">
                      <WithTooltip tooltip={<LocaleDate date={condition.lastTransitionTime} />}>
                        <ReactiveDuration timestamp={condition.lastTransitionTime} compact />
                      </WithTooltip>
                    </span>
                  )}
                </div>
                {condition.message && <div className="condition-message">{condition.message}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
