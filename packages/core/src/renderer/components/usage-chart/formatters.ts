/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { bytesToUnits } from "@freelensapp/utilities";

/** Cores formatted the way the usage charts caption them. */
export function formatCores(cores: number): string {
  if (isNaN(cores)) {
    return "N/A";
  }

  return `${cores < 10 ? cores.toFixed(2) : cores.toFixed(1)} cores`;
}

/** Bytes of memory formatted the way the usage charts caption them. */
export function formatMemoryUsage(bytes: number): string {
  if (isNaN(bytes)) {
    return "N/A";
  }

  return bytesToUnits(bytes, { precision: 1 });
}
