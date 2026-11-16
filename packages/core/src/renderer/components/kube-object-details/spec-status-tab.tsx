/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { DrawerTitle } from "../drawer";
import styles from "./spec-status-tab.module.scss";

import type { KubeObject } from "@freelensapp/kube-object";

/** The raw spec and status of the object, as Radar's "Spec & status" tab shows it. */
export function KubeObjectSpecStatusTab({ object }: { object: KubeObject }) {
  const spec = (object as KubeObject & { spec?: unknown }).spec;
  const status = (object as KubeObject & { status?: unknown }).status;

  return (
    <div className={styles.SpecStatusTab}>
      <DrawerTitle>Spec</DrawerTitle>
      <pre>{spec === undefined ? "No spec" : JSON.stringify(spec, null, 2)}</pre>
      <DrawerTitle>Status</DrawerTitle>
      <pre>{status === undefined ? "No status" : JSON.stringify(status, null, 2)}</pre>
    </div>
  );
}
