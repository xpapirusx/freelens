/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect } from "react";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { DrawerTitle } from "../drawer";
import styles from "./policy-findings-details.module.scss";

import type { KubeObject } from "@freelensapp/kube-object";

import type { ApiManager } from "../../../common/k8s-api/api-manager";
import type { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";

interface Dependencies {
  apiManager: ApiManager;
  subscribeStores: SubscribeStores;
}

interface Finding {
  policy: string;
  rule: string;
  result: string;
  message: string;
}

const REPORT_API_BASES = [
  "/apis/policyreports.wgpolicyk8s.io/v1alpha2",
  "/apis/clusterpolicyreports.wgpolicyk8s.io/v1alpha2",
];

function matchesSubject(subject: Record<string, unknown>, object: KubeObject): boolean {
  if (subject.uid && subject.uid === object.getId()) {
    return true;
  }

  return (
    subject.kind === object.kind &&
    subject.name === object.getName() &&
    (!subject.namespace || subject.namespace === object.getNs())
  );
}

const NonInjectedPolicyFindingsDetails = observer(
  ({ object, apiManager, subscribeStores }: Dependencies & { object: KubeObject }) => {
    const stores = REPORT_API_BASES.map((apiBase) => apiManager.getStore(apiBase)).filter(
      (store): store is KubeObjectStore<KubeObject> => !!store,
    );

    useEffect(() => subscribeStores(stores), [apiManager, subscribeStores, object.getNs()]);

    const findings: Finding[] = [];

    for (const store of stores) {
      for (const report of store.items) {
        const plain = report.toPlainObject() as { results?: Record<string, unknown>[] };

        for (const result of plain.results ?? []) {
          const subjects = (Array.isArray(result.subjects) ? result.subjects : [result.subject]) as Record<
            string,
            unknown
          >[];

          if (!subjects?.some((subject) => matchesSubject(subject, object))) {
            continue;
          }

          findings.push({
            policy: String(result.policy ?? ""),
            rule: String(result.rule ?? ""),
            result: String(result.result ?? "warn"),
            message: String(result.message ?? ""),
          });
        }
      }
    }

    const failing = findings.filter((finding) => finding.result.toLowerCase() !== "pass");

    if (failing.length === 0) {
      return null;
    }

    return (
      <div className={styles.PolicyFindingsDetails}>
        <DrawerTitle>{`Policy (${failing.length}) · ${failing.filter((finding) => finding.result.toLowerCase() === "fail").length} failing`}</DrawerTitle>
        {failing.map((finding, index) => (
          <div key={`${finding.policy}-${finding.rule}-${index}`} className={styles.finding}>
            <span className={styles[finding.result.toLowerCase() === "fail" ? "fail" : "warn"]} />
            <div className={styles.content}>
              <div className={styles.title}>
                {finding.policy} <span className={styles.rule}>· {finding.rule}</span>
              </div>
              <div className={styles.message}>{finding.message}</div>
            </div>
          </div>
        ))}
      </div>
    );
  },
);

export const PolicyFindingsDetails = withInjectables<Dependencies, { object: KubeObject }>(
  NonInjectedPolicyFindingsDetails,
  {
    getProps: (di, props) => ({
      ...props,
      apiManager: di.inject(apiManagerInjectable),
      subscribeStores: di.inject(subscribeStoresInjectable),
    }),
  },
);
