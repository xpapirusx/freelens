/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./column-filter.scss";

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { useState } from "react";
import { Dropdown } from "../../dropdown";
import { getColumnFilterOptions } from "../table-column-filters/apply-column-filters";

import type { StrictReactNode } from "@freelensapp/utilities";

import type { ColumnFilterGetter } from "../table-column-filters/apply-column-filters";
import type { TableColumnFilter } from "../table-column-filters/storage.injectable";

export interface ColumnFilterDropdownProps<Item> {
  tableId: string;
  columnId: string;
  label: StrictReactNode;
  /**
   * The items before this table's column filters narrowed them, so that the values one filter
   * offers do not disappear once it is applied.
   */
  items: readonly Item[];
  getValues: ColumnFilterGetter<Item>;
  filter: TableColumnFilter | undefined;
  onChange: (filter: TableColumnFilter | undefined) => void;
}

/**
 * The values a column holds, with their counts, so that a table narrows to the rows that carry the
 * chosen ones. Within a column the values are alternatives; several columns narrow the list
 * together.
 */
export function ColumnFilterDropdown<Item>({
  tableId,
  columnId,
  label,
  items,
  getValues,
  filter,
  onChange,
}: ColumnFilterDropdownProps<Item>) {
  const [query, setQuery] = useState("");
  const selected = filter?.values ?? [];
  const excluded = filter?.excluded ?? false;

  const options = getColumnFilterOptions(items, getValues);

  // A selected value keeps its row even when the items no longer carry it, so that it can be
  // removed without first emptying the filter.
  for (const value of selected) {
    if (!options.some((option) => option.value === value)) {
      options.push({ value, count: 0 });
    }
  }

  const visibleOptions = query
    ? options.filter(({ value }) => value.toLowerCase().includes(query.toLowerCase()))
    : options;

  const toggleValue = (value: string) => {
    const nextValues = selected.includes(value)
      ? selected.filter((selectedValue) => selectedValue !== value)
      : [...selected, value];

    onChange(nextValues.length > 0 ? { values: nextValues, excluded } : undefined);
  };

  const setExcluded = (nextExcluded: boolean) => {
    if (selected.length > 0) {
      onChange({ values: selected, excluded: nextExcluded });
    }
  };

  const active = selected.length > 0;

  return (
    <Dropdown
      id={`column-filter-${tableId}-${columnId}`}
      className={cssNames("ColumnFilterDropdown", { active })}
      onClick={(event) => event.stopPropagation()}
      contentForToggle={
        <button
          type="button"
          className="ColumnFilterDropdown-toggle"
          aria-label={`Filter by ${typeof label === "string" ? label : columnId}`}
          aria-pressed={active}
        >
          <Icon material="filter_alt" small />
          {active && <span className="count">{selected.length}</span>}
        </button>
      }
      data-testid={`column-filter-${columnId}`}
    >
      <li className="ColumnFilterMenu" onClick={(event) => event.stopPropagation()}>
        <div className="ColumnFilterMenu-header">
          <span className="ColumnFilterMenu-title">{label}</span>
          {active && (
            <button type="button" className="ColumnFilterMenu-clear" onClick={() => onChange(undefined)}>
              Clear
            </button>
          )}
        </div>
        <div className="ColumnFilterMenu-modes" role="group" aria-label="Filter mode">
          <button
            type="button"
            aria-pressed={!excluded}
            className={cssNames({ pressed: !excluded })}
            onClick={() => setExcluded(false)}
          >
            Include
          </button>
          <button
            type="button"
            aria-pressed={excluded}
            className={cssNames({ pressed: excluded })}
            onClick={() => setExcluded(true)}
          >
            Exclude
          </button>
        </div>
        {options.length > 5 && (
          <div className="ColumnFilterMenu-search">
            <input
              type="text"
              placeholder="Search values..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        )}
        <div className="ColumnFilterMenu-options">
          {visibleOptions.map(({ value, count }) => {
            const isSelected = selected.includes(value);

            return (
              <button
                type="button"
                key={value}
                className={cssNames("ColumnFilterOption", { selected: isSelected })}
                onClick={() => toggleValue(value)}
                aria-pressed={isSelected}
              >
                <span className="ColumnFilterOption-check">{isSelected && <Icon material="check" smallest />}</span>
                <span className="ColumnFilterOption-value" title={value}>
                  {value}
                </span>
                <span className="ColumnFilterOption-count">{count}</span>
              </button>
            );
          })}
          {visibleOptions.length === 0 && <div className="ColumnFilterMenu-empty">No matches</div>}
        </div>
      </li>
    </Dropdown>
  );
}
