/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { getColumnIds, getOrderedColumnIndices, moveColumnInOrder } from "./order";

const columns = [{ id: "name" }, { id: "namespace" }, { id: "age" }, { id: "node" }];
const getId = (column: { id?: string }) => column.id;

describe("column order", () => {
  it("keeps the given order without a stored one", () => {
    expect(getOrderedColumnIndices(columns, getId, undefined)).toEqual([0, 1, 2, 3]);
    expect(getOrderedColumnIndices(columns, getId, [])).toEqual([0, 1, 2, 3]);
  });

  it("puts the columns the order names first, in that order", () => {
    expect(getOrderedColumnIndices(columns, getId, ["age", "name"])).toEqual([2, 0, 1, 3]);
  });

  it("keeps a column the order does not name behind the named ones, in its place", () => {
    expect(getOrderedColumnIndices(columns, getId, ["node"])).toEqual([3, 0, 1, 2]);
  });

  it("reads the identifiers of the columns that have one", () => {
    expect(getColumnIds([...columns, {}], getId)).toEqual(["name", "namespace", "age", "node"]);
  });

  describe("moving a column", () => {
    it("swaps it with the neighbor in the direction it moves", () => {
      expect(moveColumnInOrder(["name", "namespace", "age"], "age", ["name", "namespace", "age"], -1)).toEqual([
        "name",
        "age",
        "namespace",
      ]);
    });

    it("does nothing at the end it moves toward", () => {
      expect(moveColumnInOrder(["name", "age"], "name", ["name", "age"], -1)).toBeUndefined();
      expect(moveColumnInOrder(["name", "age"], "age", ["name", "age"], 1)).toBeUndefined();
    });

    it("does nothing for a column the order does not name", () => {
      expect(moveColumnInOrder(["name", "age"], "node", ["name", "age", "node"], -1)).toBeUndefined();
    });
  });
});
