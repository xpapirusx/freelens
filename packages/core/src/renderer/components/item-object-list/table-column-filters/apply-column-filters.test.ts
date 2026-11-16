/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { applyColumnFilters, getColumnFilterOptions, hasActiveColumnFilters } from "./apply-column-filters";

interface Row {
  name: string;
  status?: string;
  tags?: string[];
}

const rows: Row[] = [
  { name: "a", status: "Running", tags: ["web", "prod"] },
  { name: "b", status: "Pending", tags: ["web"] },
  { name: "c", status: "Failed", tags: ["batch", "prod"] },
  { name: "d" },
];

const spec = {
  status: (row: Row) => row.status,
  tags: (row: Row) => row.tags,
};

describe("column filters", () => {
  it("keeps every item without a filter", () => {
    expect(applyColumnFilters(rows, undefined, spec)).toBe(rows);
    expect(applyColumnFilters(rows, {}, spec)).toBe(rows);
  });

  it("keeps the items that carry any of the values chosen in a column", () => {
    const filtered = applyColumnFilters(rows, { status: { values: ["Running", "Failed"], excluded: false } }, spec);

    expect(filtered.map((row) => row.name)).toEqual(["a", "c"]);
  });

  it("narrows by every column that has a filter", () => {
    const filtered = applyColumnFilters(
      rows,
      {
        status: { values: ["Running", "Failed"], excluded: false },
        tags: { values: ["prod"], excluded: false },
      },
      spec,
    );

    expect(filtered.map((row) => row.name)).toEqual(["a", "c"]);
  });

  it("hides the items that carry any of the values of an excluding filter", () => {
    const filtered = applyColumnFilters(rows, { status: { values: ["Pending"], excluded: true } }, spec);

    expect(filtered.map((row) => row.name)).toEqual(["a", "c", "d"]);
  });

  it("keeps an item without a value unless the filter excludes values", () => {
    expect(
      applyColumnFilters(rows, { status: { values: ["Running"], excluded: false } }, spec).map((row) => row.name),
    ).toEqual(["a"]);
    expect(
      applyColumnFilters(rows, { status: { values: ["Running"], excluded: true } }, spec).map((row) => row.name),
    ).toEqual(["b", "c", "d"]);
  });

  it("leaves an applied value of a column without a getter alone", () => {
    const filtered = applyColumnFilters(rows, { missing: { values: ["x"], excluded: false } }, spec);

    expect(filtered).toBe(rows);
  });
});

describe("column filter options", () => {
  it("counts the values of a column, most common first", () => {
    expect(getColumnFilterOptions(rows, (row) => row.status)).toEqual([
      { value: "Failed", count: 1 },
      { value: "Pending", count: 1 },
      { value: "Running", count: 1 },
    ]);
  });

  it("counts every value an item carries", () => {
    expect(getColumnFilterOptions(rows, (row) => row.tags)).toEqual([
      { value: "prod", count: 2 },
      { value: "web", count: 2 },
      { value: "batch", count: 1 },
    ]);
  });
});

describe("an active column filter", () => {
  it("is one that chose a value", () => {
    expect(hasActiveColumnFilters(undefined)).toBe(false);
    expect(hasActiveColumnFilters({ status: { values: [], excluded: false } })).toBe(false);
    expect(hasActiveColumnFilters({ status: { values: ["Running"], excluded: false } })).toBe(true);
  });
});
