/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { ColumnFilterDropdown } from "./column-filter-dropdown";

const rows = [
  { id: "a", status: "Running" },
  { id: "b", status: "Running" },
  { id: "c", status: "Pending" },
];

const renderDropdown = (
  onChange = vi.fn(),
  filter = undefined as { values: string[]; excluded: boolean } | undefined,
) => {
  const di = getDiForUnitTesting();
  const render = renderFor(di);
  const user = userEvent.setup();

  render(
    <ColumnFilterDropdown
      tableId="pods"
      columnId="status"
      label="Status"
      items={rows}
      getValues={(row) => row.status}
      filter={filter}
      onChange={onChange}
    />,
  );

  return { user, onChange };
};

describe("column filter dropdown", () => {
  it("offers the values of the column with their counts", async () => {
    const { user } = renderDropdown();

    await user.click(screen.getByRole("button", { name: "Filter by Status" }));

    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("asks for the values chosen in the column", async () => {
    const { user, onChange } = renderDropdown();

    await user.click(screen.getByRole("button", { name: "Filter by Status" }));
    await user.click(screen.getByRole("button", { name: /Running/ }));

    expect(onChange).toHaveBeenCalledWith({ values: ["Running"], excluded: false });
  });

  it("marks the rows that do not carry the values when excluding", async () => {
    const { user, onChange } = renderDropdown(vi.fn(), { values: ["Running"], excluded: false });

    await user.click(screen.getByRole("button", { name: "Filter by Status" }));
    await user.click(screen.getByRole("button", { name: "Exclude" }));

    expect(onChange).toHaveBeenCalledWith({ values: ["Running"], excluded: true });
  });

  it("clears the filter", async () => {
    const { user, onChange } = renderDropdown(vi.fn(), { values: ["Running"], excluded: false });

    await user.click(screen.getByRole("button", { name: "Filter by Status" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
