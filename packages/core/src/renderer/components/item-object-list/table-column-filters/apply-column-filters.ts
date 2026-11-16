/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { TableColumnFilter, TableColumnFiltersStorageState } from "./storage.injectable";

/**
 * The values an item carries in one column. A column offers one value or several, and an item
 * without one is only hidden by a filter that excludes values.
 */
export type ColumnFilterGetter<Item> = (item: Item) => string | string[] | undefined;

/**
 * The getters of the filterable columns of a table, by column identifier.
 */
export type ColumnFilterSpec<Item> = Record<string, ColumnFilterGetter<Item>>;

export interface ColumnFilterOption {
  value: string;
  count: number;
}

const valuesOf = (raw: string | string[] | undefined): string[] => {
  if (raw === undefined) {
    return [];
  }

  return Array.isArray(raw) ? raw.map(String) : [String(raw)];
};

/**
 * `items` narrowed to the rows the column filters of a table keep: within a column the selected
 * values are alternatives, across columns every filter has to match, and an excluded filter hides
 * the rows that carry any of its values.
 */
export const applyColumnFilters = <Item>(
  items: Item[],
  filters: Record<string, TableColumnFilter> | undefined,
  spec: ColumnFilterSpec<Item> | undefined,
): Item[] => {
  const active = Object.entries(filters ?? {}).filter(
    ([columnId, filter]) => filter.values.length > 0 && spec?.[columnId],
  );

  if (!spec || active.length === 0) {
    return items;
  }

  return items.filter((item) =>
    active.every(([columnId, filter]) => {
      const values = valuesOf(spec[columnId](item));
      const carries = filter.values.some((value) => values.includes(value));

      return filter.excluded ? !carries : carries;
    }),
  );
};

/**
 * The values one column offers at the moment, with the number of the items that carry each, most
 * common first and ties in alphabetical order.
 */
export const getColumnFilterOptions = <Item>(
  items: readonly Item[],
  getter: ColumnFilterGetter<Item>,
): ColumnFilterOption[] => {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const value of valuesOf(getter(item))) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return Array.from(counts, ([value, count]) => ({ value, count })).sort(
    (left, right) => right.count - left.count || left.value.localeCompare(right.value),
  );
};

/**
 * Whether any filter of a table keeps a row out.
 */
export const hasActiveColumnFilters = (filters: TableColumnFiltersStorageState[string] | undefined) =>
  Object.values(filters ?? {}).some((filter) => filter.values.length > 0);
