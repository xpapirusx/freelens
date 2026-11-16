/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { LineProgress } from "../line-progress";
import styles from "./usage-cell.module.scss";

import type { StrictReactNode } from "@freelensapp/utilities";

export interface UsageCellProps {
  /** The current usage, `NaN` when no metric is available. */
  usage: number;
  /** The capacity the bar is scaled to: a limit or an allocatable. `0` hides the bar. */
  capacity: number;
  /** The requested amount, rendered as a lighter line behind the usage. */
  requests?: number;
  /** The short display formatter, applied to usage and capacity alike. */
  format: (value: number) => string;
  /** The lines of a hover tooltip; none is rendered without them. */
  tooltipLines?: string[];
  /** Content shown instead of the computed text when given. */
  children?: StrictReactNode;
}

/**
 * A compact usage cell for resource lists: a bar of the usage against a
 * capacity with the requested amount as a marker, next to a short
 * "usage / capacity" text, as the resource tables show them.
 */
export const UsageCell = ({ usage, capacity, requests, format, tooltipLines, children }: UsageCellProps) => {
  const hasUsage = Number.isFinite(usage);
  const hasRequests = requests !== undefined && requests > 0;
  const hasBar = capacity > 0 && (hasUsage || hasRequests);

  if (!hasBar && !hasUsage) {
    return <span className={styles.usageText}>N/A</span>;
  }

  const text =
    children ?? (hasUsage ? (capacity > 0 ? `${format(usage)} / ${format(capacity)}` : format(usage)) : "N/A");

  return (
    <div className={styles.UsageCell}>
      {hasBar && (
        <LineProgress
          className={styles.bar}
          max={capacity}
          value={hasUsage ? usage : 0}
          secondaryValue={hasRequests ? requests : undefined}
          tooltip={
            tooltipLines?.length
              ? {
                  children: (
                    <>
                      {tooltipLines.map((line, index) => (
                        <div key={index}>{line}</div>
                      ))}
                    </>
                  ),
                  style: { whiteSpace: "pre-line" as const },
                }
              : undefined
          }
        />
      )}
      <span className={styles.usageText}>{text}</span>
    </div>
  );
};
