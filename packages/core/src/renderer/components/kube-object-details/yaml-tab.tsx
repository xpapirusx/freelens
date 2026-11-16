/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import * as yaml from "js-yaml";
import { MonacoEditor } from "../monaco-editor";
import styles from "./spec-status-tab.module.scss";

import type { KubeObject } from "@freelensapp/kube-object";

/** The object as YAML, read only, without opening the dock editor. */
export function KubeObjectYamlTab({ object }: { object: KubeObject }) {
  const value = yaml.dump(object.toPlainObject(), { noRefs: true, lineWidth: -1 });

  return (
    <div className={styles.YamlTab}>
      <MonacoEditor id={`kube-details-yaml-${object.getId()}`} value={value} language="yaml" readOnly />
    </div>
  );
}
