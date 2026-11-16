/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The indices of `columns` in the order the user moved the columns with the identifiers `order` to.
 * A column the order does not name keeps its place behind the named ones, and the sort is stable.
 */
export const getOrderedColumnIndices = <T>(
  columns: readonly T[],
  getId: (column: T) => string | undefined,
  order: readonly string[] | undefined,
): number[] => {
  const indices = columns.map((_, index) => index);

  if (!order || order.length === 0) {
    return indices;
  }

  const rank = new Map(order.map((id, index) => [id, index]));

  return indices.sort((left, right) => {
    const leftRank = rank.get(getId(columns[left]) ?? "") ?? order.length + left;
    const rightRank = rank.get(getId(columns[right]) ?? "") ?? order.length + right;

    return leftRank - rightRank || left - right;
  });
};

/**
 * The identifiers of `columns` that have one, in their order.
 */
export const getColumnIds = <T>(columns: readonly T[], getId: (column: T) => string | undefined): string[] =>
  columns.map(getId).filter((id): id is string => id !== undefined);

/**
 * `order` with the two columns swapped, for a column moved up or down by one place among
 * `movableIds`. Returns `undefined` when the column is already at the end it moves toward.
 */
export const moveColumnInOrder = (
  order: readonly string[],
  columnId: string,
  movableIds: readonly string[],
  offset: -1 | 1,
): string[] | undefined => {
  const movableIndex = movableIds.indexOf(columnId);
  const targetId = movableIds[movableIndex + offset];

  if (movableIndex === -1 || targetId === undefined) {
    return undefined;
  }

  const next = [...order];
  const from = next.indexOf(columnId);
  const to = next.indexOf(targetId);

  if (from === -1 || to === -1) {
    return undefined;
  }

  next[from] = targetId;
  next[to] = columnId;

  return next;
};
