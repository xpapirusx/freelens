/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { DrawerTitle } from "../drawer";
import clusterRoleBindingStoreInjectable from "../user-management/cluster-role-bindings/store.injectable";
import clusterRoleStoreInjectable from "../user-management/cluster-roles/store.injectable";
import roleBindingStoreInjectable from "../user-management/role-bindings/store.injectable";
import roleStoreInjectable from "../user-management/roles/store.injectable";
import styles from "./permissions-details.module.scss";

import type { KubeObject, PolicyRule } from "@freelensapp/kube-object";

import type { ClusterRoleBindingStore } from "../user-management/cluster-role-bindings/store";
import type { ClusterRoleStore } from "../user-management/cluster-roles/store";
import type { RoleBindingStore } from "../user-management/role-bindings/store";
import type { RoleStore } from "../user-management/roles/store";

interface Dependencies {
  roleStore: RoleStore;
  clusterRoleStore: ClusterRoleStore;
  roleBindingStore: RoleBindingStore;
  clusterRoleBindingStore: ClusterRoleBindingStore;
}

function serviceAccountNameOf(object: KubeObject): string {
  if (object.kind === "ServiceAccount") {
    return object.getName();
  }

  if (object instanceof Pod) {
    return object.getServiceAccountName();
  }

  const spec = (object as KubeObject & { spec?: { template?: { spec?: { serviceAccountName?: string } } } }).spec;

  return spec?.template?.spec?.serviceAccountName || "default";
}

function matchesServiceAccount(
  subjects: { kind?: string; name?: string; namespace?: string }[],
  name: string,
  namespace: string,
): boolean {
  return subjects.some(
    (subject) =>
      (subject.kind === "ServiceAccount" && subject.name === name && (subject.namespace ?? namespace) === namespace) ||
      (subject.kind === "Group" &&
        (subject.name === "system:serviceaccounts" || subject.name === `system:serviceaccounts:${namespace}`)),
  );
}

const NonInjectedPermissionsDetails = observer(
  ({
    object,
    roleStore,
    clusterRoleStore,
    roleBindingStore,
    clusterRoleBindingStore,
  }: Dependencies & { object: KubeObject }) => {
    const namespace = object.getNs() ?? "";
    const serviceAccount = serviceAccountNameOf(object);

    const bindings = [
      ...clusterRoleBindingStore.items.filter((binding) =>
        matchesServiceAccount(binding.getSubjects(), serviceAccount, namespace),
      ),
      ...roleBindingStore.items.filter(
        (binding) =>
          binding.getNs() === namespace && matchesServiceAccount(binding.getSubjects(), serviceAccount, namespace),
      ),
    ];

    const rules: PolicyRule[] = [];

    for (const binding of bindings) {
      const roleRef = binding.roleRef;
      const role =
        roleRef?.kind === "ClusterRole"
          ? clusterRoleStore.getByName(roleRef.name)
          : roleStore.getByName(roleRef?.name ?? "", namespace);

      if (role) {
        rules.push(...role.getRules());
      }
    }

    if (rules.length === 0) {
      return null;
    }

    const visible = rules.slice(0, 8);

    return (
      <div className={styles.PermissionsDetails}>
        <DrawerTitle>{`Permissions via ServiceAccount: ${serviceAccount}`}</DrawerTitle>
        <div className={styles.summary}>
          {bindings.length} binding{bindings.length === 1 ? "" : "s"} · {rules.length} distinct rules
        </div>
        {visible.map((rule, index) => (
          <div key={index} className={styles.rule}>
            <span className={styles.verbs}>{(rule.verbs ?? []).join(", ")}</span>
            <span className={styles.resources}>{(rule.resources ?? []).join(", ")}</span>
            <span className={styles.groups}>{(rule.apiGroups ?? []).join(", ") || "core"}</span>
          </div>
        ))}
        {rules.length > visible.length && (
          <div className={styles.more}>+{rules.length - visible.length} more rules</div>
        )}
      </div>
    );
  },
);

export const PermissionsDetails = withInjectables<Dependencies, { object: KubeObject }>(NonInjectedPermissionsDetails, {
  getProps: (di, props) => ({
    ...props,
    roleStore: di.inject(roleStoreInjectable),
    clusterRoleStore: di.inject(clusterRoleStoreInjectable),
    roleBindingStore: di.inject(roleBindingStoreInjectable),
    clusterRoleBindingStore: di.inject(clusterRoleBindingStoreInjectable),
  }),
});
