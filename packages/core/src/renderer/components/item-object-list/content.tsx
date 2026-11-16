/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./item-list-layout.scss";

import { Icon } from "@freelensapp/icon";
import { Spinner } from "@freelensapp/spinner";
import { cssNames, isDefined, isReactNode, noop, prevDefault, stopPropagation } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import autoBindReact from "auto-bind/react";
import { action, observable, observableRef } from "mobx";
import { Observer, observer } from "mobx-react";
import React from "react";
import isTableColumnHiddenInjectable from "../../../features/user-preferences/common/is-table-column-hidden.injectable";
import toggleTableColumnVisibilityInjectable from "../../../features/user-preferences/common/toggle-table-column-visibility.injectable";
import activeThemeInjectable from "../../themes/active.injectable";
import { AddRemoveButtons } from "../add-remove-buttons";
import { Checkbox } from "../checkbox";
import openConfirmDialogInjectable from "../confirm-dialog/open.injectable";
import { MenuItem } from "../menu";
import { MenuActions } from "../menu/menu-actions";
import { NoItems } from "../no-items";
import { Table, TableCell, TableHead, TableRow } from "../table";
import { ColumnFilterDropdown } from "./column-filter/column-filter-dropdown";
import columnResizeStorageInjectable from "./column-resize-storage/storage.injectable";
import pageFiltersStoreInjectable from "./page-filters/store.injectable";
import { hasActiveColumnFilters } from "./table-column-filters/apply-column-filters";
import tableColumnFiltersStorageInjectable from "./table-column-filters/storage.injectable";
import { getColumnIds, moveColumnInOrder } from "./table-column-order/order";
import tableColumnOrderStorageInjectable from "./table-column-order/storage.injectable";

import type { ItemObject, TableCellProps } from "@freelensapp/list-layout";
import type { IClassName, StrictReactNode } from "@freelensapp/utilities";

import type { IComputedValue } from "mobx";

import type { IsTableColumnHidden } from "../../../features/user-preferences/common/is-table-column-hidden.injectable";
import type { ToggleTableColumnVisibility } from "../../../features/user-preferences/common/toggle-table-column-visibility.injectable";
import type { LensTheme } from "../../themes/lens-theme";
import type { StorageLayer } from "../../utils/storage-helper";
import type { AddRemoveButtonsProps } from "../add-remove-buttons";
import type { ConfirmDialogParams } from "../confirm-dialog";
import type { OpenConfirmDialog } from "../confirm-dialog/open.injectable";
import type { TableProps, TableRowProps, TableSortCallbacks } from "../table";
import type { ColumnResizeStorageState } from "./column-resize-storage/storage.injectable";
import type { ItemListStore } from "./list-layout";
import type { Filter, PageFiltersStore } from "./page-filters/store";
import type { ColumnFilterSpec } from "./table-column-filters/apply-column-filters";
import type { TableColumnFilter, TableColumnFiltersStorageState } from "./table-column-filters/storage.injectable";
import type { TableColumnOrderStorageState } from "./table-column-order/storage.injectable";

interface ResizeState {
  columnId: string;
  startX: number;
  tableWidth: number;
  initialFlexGrowValues: Map<string, number>;
  initialColumnRight: number;
}

export interface ItemListLayoutContentProps<Item extends ItemObject, PreLoadStores extends boolean> {
  getFilters: () => Filter[];
  tableId?: string;
  className: IClassName;
  getItems: () => Item[];
  /**
   * The items before this table's column filters narrowed them, which is what a column filter
   * offers its values from.
   */
  getColumnFilterItems: () => Item[];
  /**
   * The getters of the columns that offer a filter by the values they hold, by column identifier.
   */
  columnFilters?: ColumnFilterSpec<Item>;
  store: ItemListStore<Item, PreLoadStores>;
  getIsReady: () => boolean; // show loading indicator while not ready
  isSelectable?: boolean; // show checkbox in rows for selecting items
  isConfigurable?: boolean;
  copyClassNameFromHeadCells?: boolean;
  sortingCallbacks?: TableSortCallbacks<Item>;
  tableProps?: Partial<TableProps<Item>>; // low-level table configuration
  renderTableHeader?: (TableCellProps | undefined | null)[];
  renderTableContents: (item: Item) => (StrictReactNode | TableCellProps)[];
  renderItemMenu?: (item: Item, store: ItemListStore<Item, PreLoadStores>) => StrictReactNode;
  customizeTableRowProps?: (item: Item) => Partial<TableRowProps<Item>>;
  addRemoveButtons?: Partial<AddRemoveButtonsProps>;
  virtual?: boolean;

  // item details view
  hasDetailsView?: boolean;
  detailsItem?: Item;
  onDetails?: (item: Item) => void;

  // other
  customizeRemoveDialog?: (selectedItems: Item[]) => Partial<ConfirmDialogParams>;

  spinnerTestId?: string;

  /**
   * Message to display when a store failed to load
   *
   * @default "Failed to load items"
   */
  failedToLoadMessage?: StrictReactNode;
}

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
  pageFiltersStore: PageFiltersStore;
  openConfirmDialog: OpenConfirmDialog;
  toggleTableColumnVisibility: ToggleTableColumnVisibility;
  isTableColumnHidden: IsTableColumnHidden;
  columnResizeStorage: StorageLayer<ColumnResizeStorageState>;
  tableColumnOrderStorage: StorageLayer<TableColumnOrderStorageState>;
  tableColumnFiltersStorage: StorageLayer<TableColumnFiltersStorageState>;
}

@observer
export class NonInjectedItemListLayoutContent<
  Item extends ItemObject,
  PreLoadStores extends boolean,
> extends React.Component<ItemListLayoutContentProps<Item, PreLoadStores> & Dependencies> {
  private resizeState: ResizeState | null = null;
  private tableRef = React.createRef<HTMLDivElement>();
  private resizeGuideRef = React.createRef<HTMLDivElement>();

  @observable private accessor columnFlexGrow = new Map<string, number>();
  @observable private accessor resizeGuideX: number | null = null;

  // mobx-react 9 forbids reading this.props inside a derivation. getRow/getTableRow
  // (and the showColumn they call) are invoked from foreign derivations — the inner
  // <Observer> render prop and the <Table> row renderer — so they read props from
  // this observable snapshot, refreshed on every update, instead of this.props.
  @observableRef private accessor observableProps: Readonly<
    ItemListLayoutContentProps<Item, PreLoadStores> & Dependencies
  >;

  constructor(props: ItemListLayoutContentProps<Item, PreLoadStores> & Dependencies) {
    super(props);
    this.observableProps = props;
    autoBindReact(this);
    this.loadSavedColumnWidths();
  }

  componentDidUpdate() {
    this.observableProps = this.props;
  }

  componentWillUnmount() {
    this.cleanupResizeListeners();
  }

  @action
  private loadSavedColumnWidths() {
    const { tableId, columnResizeStorage } = this.props;
    if (!tableId) return;

    const savedState = columnResizeStorage.get();
    const tableState = savedState[tableId];

    if (tableState) {
      Object.entries(tableState).forEach(([columnId, flexGrow]) => {
        this.columnFlexGrow.set(columnId, flexGrow);
      });
    }
  }

  @action
  private handleResizeReset(columnId: string) {
    const { tableId, columnResizeStorage } = this.props;

    this.columnFlexGrow.delete(columnId);

    if (tableId) {
      const savedState = columnResizeStorage.get();
      const tableState = savedState[tableId] || {};
      delete tableState[columnId];
      columnResizeStorage.merge({ [tableId]: tableState });
    }
  }

  private handleResizeStart(columnId: string, event: MouseEvent) {
    const tableElement = this.tableRef.current;
    if (!tableElement) return;

    const headers = this.getVisibleHeaders();
    const initialFlexGrowValues = new Map<string, number>();
    headers.forEach((header) => {
      if (header.id) {
        initialFlexGrowValues.set(header.id, this.getColumnFlexGrow(header));
      }
    });

    const headerCell = tableElement.querySelector(`.TableHead .TableCell[id="${columnId}"]`) as HTMLElement;

    if (!headerCell) return;

    const tableRect = tableElement.getBoundingClientRect();
    const headerRect = headerCell.getBoundingClientRect();
    const initialColumnRight = headerRect.right - tableRect.left;

    this.resizeState = {
      columnId,
      startX: event.clientX,
      tableWidth: tableElement.offsetWidth,
      initialFlexGrowValues,
      initialColumnRight,
    };

    this.resizeGuideX = initialColumnRight;

    document.addEventListener("mousemove", this.handleResizeMove);
    document.addEventListener("mouseup", this.handleResizeEnd);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  @action
  private handleResizeMove(event: MouseEvent) {
    if (!this.resizeState) return;

    const { columnId, startX, tableWidth, initialFlexGrowValues } = this.resizeState;
    const deltaX = event.clientX - startX;

    const headers = this.getVisibleHeaders();
    const totalInitialFlexGrow = Array.from(initialFlexGrowValues.values()).reduce((sum, val) => sum + val, 0);
    const pixelsPerFlexUnit = tableWidth / totalInitialFlexGrow;
    const deltaFlexGrow = deltaX / pixelsPerFlexUnit;

    const initialCurrentFlexGrow = initialFlexGrowValues.get(columnId);
    if (!initialCurrentFlexGrow) return;

    const newCurrentFlexGrow = Math.max(0.3, initialCurrentFlexGrow + deltaFlexGrow);
    this.columnFlexGrow.set(columnId, newCurrentFlexGrow);

    requestAnimationFrame(() => {
      const tableElement = this.tableRef.current;
      if (tableElement) {
        const headerCell = tableElement.querySelector(`.TableHead .TableCell[id="${columnId}"]`) as HTMLElement;
        if (headerCell) {
          const tableRect = tableElement.getBoundingClientRect();
          const headerRect = headerCell.getBoundingClientRect();
          const actualColumnRight = headerRect.right - tableRect.left;

          this.resizeGuideX = actualColumnRight;
        }
      }
    });

    const otherColumns = headers.filter((h) => h.id && h.id !== columnId);
    const totalOtherInitialFlexGrow = otherColumns.reduce((sum, h) => sum + (initialFlexGrowValues.get(h.id!) || 0), 0);

    if (totalOtherInitialFlexGrow > 0) {
      otherColumns.forEach((col) => {
        if (!col.id) return;
        const initialFlexGrow = initialFlexGrowValues.get(col.id) || 0;
        const proportion = initialFlexGrow / totalOtherInitialFlexGrow;
        const adjustment = deltaFlexGrow * proportion;
        const newFlexGrow = Math.max(0.3, initialFlexGrow - adjustment);
        this.columnFlexGrow.set(col.id, newFlexGrow);
      });
    }
  }

  @action
  private handleResizeEnd() {
    const { tableId, columnResizeStorage } = this.props;

    if (tableId && this.resizeState) {
      const savedState = columnResizeStorage.get();
      const tableState = savedState[tableId] || {};

      this.columnFlexGrow.forEach((flexGrow, columnId) => {
        tableState[columnId] = Math.round(flexGrow * 100) / 100;
      });

      columnResizeStorage.merge({ [tableId]: tableState });
    }

    this.cleanupResizeListeners();
    this.resizeState = null;
    this.resizeGuideX = null;
  }

  private cleanupResizeListeners() {
    document.removeEventListener("mousemove", this.handleResizeMove);
    document.removeEventListener("mouseup", this.handleResizeEnd);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  private getVisibleHeaders(): (TableCellProps & { id: string })[] {
    const { renderTableHeader = [] } = this.props;
    const nonResizableIds = new Set(["checkbox", "logs", "menu"]);

    return renderTableHeader
      .filter(isDefined)
      .filter((h) => this.showColumn(h))
      .filter((h): h is TableCellProps & { id: string } => !!h.id && !nonResizableIds.has(h.id));
  }

  private getColumnFlexGrow(header: TableCellProps): number {
    if (header.id && this.columnFlexGrow.has(header.id)) {
      return this.columnFlexGrow.get(header.id)!;
    }
    return this.getDefaultFlexGrow(header);
  }

  private getDefaultFlexGrow(header: TableCellProps): number {
    if (!header.id || !this.tableRef.current) return 1;

    const headerCell = this.tableRef.current.querySelector(`.TableHead .TableCell[id="${header.id}"]`) as HTMLElement;

    if (!headerCell) return 1;

    const computedStyle = window.getComputedStyle(headerCell);
    const flexGrow = computedStyle.flexGrow;

    return flexGrow ? parseFloat(flexGrow) : 1;
  }

  // Plain getter (not @computed): reads this.props, which mobx-react 9 forbids
  // inside a derivation. Read from render, reactivity is preserved by the
  // observer render reaction.
  get failedToLoad() {
    return this.props.store.failedLoading;
  }

  renderRow(item: Item) {
    return this.getTableRow(item);
  }

  getTableRow(item: Item) {
    // Read from observableProps: this method is called from the <Table> row
    // renderer and the <Observer> below, which are derivations other than this
    // component's own render, where mobx-react 9 forbids reading this.props.
    const {
      isSelectable,
      renderTableHeader,
      renderTableContents,
      renderItemMenu,
      store,
      hasDetailsView,
      onDetails,
      copyClassNameFromHeadCells,
      customizeTableRowProps = () => ({}),
      detailsItem,
      tableId,
      isConfigurable,
      isTableColumnHidden,
    } = this.observableProps;
    const { isSelected } = store;

    // Inline column-visibility check from the captured snapshot; this.showColumn
    // reads this.props, which is forbidden here (foreign derivation).
    const isColumnShown = ({ id: columnId, showWithColumn }: TableCellProps) =>
      !isConfigurable || !tableId || !isTableColumnHidden(tableId, columnId, showWithColumn);

    // The key matters for a non-virtual list, where <Table> renders these rows
    // as a list; the virtual one wraps each in a keyed <div> (getRow).
    return (
      <TableRow
        key={item.getId()}
        nowrap
        searchItem={item}
        sortItem={item}
        selected={detailsItem && detailsItem.getId() === item.getId()}
        onClick={hasDetailsView ? prevDefault(() => onDetails?.(item)) : undefined}
        {...customizeTableRowProps(item)}
      >
        {isSelectable && (
          <TableCell checkbox isChecked={isSelected(item)} onClick={prevDefault(() => store.toggleSelection(item))} />
        )}
        {renderTableContents(item).map((content, index) => {
          const cellProps: TableCellProps = isReactNode(content) ? { children: content } : content;
          const headCell = renderTableHeader?.[index];

          if (copyClassNameFromHeadCells && headCell) {
            cellProps.className = cssNames(cellProps.className, headCell.className);
          }

          if (!headCell || isColumnShown(headCell)) {
            return (
              <TableCell
                key={index}
                {...cellProps}
                style={{
                  ...cellProps.style,
                  flex:
                    headCell?.id && this.columnFlexGrow.has(headCell.id)
                      ? `${this.columnFlexGrow.get(headCell.id)} 0`
                      : cellProps.style?.flex,
                }}
              />
            );
          }

          return null;
        })}
        {renderItemMenu && (
          <TableCell className="menu">
            <div onClick={stopPropagation}>{renderItemMenu(item, store)}</div>
          </TableCell>
        )}
      </TableRow>
    );
  }

  getRow(uid: string) {
    return (
      <div key={uid}>
        <Observer>
          {() => {
            // observableProps, not this.props: this <Observer> is its own derivation.
            const item = this.observableProps.getItems().find((item) => item.getId() === uid);

            if (!item) return null;

            return this.getTableRow(item);
          }}
        </Observer>
      </div>
    );
  }

  removeItemsDialog(selectedItems: Item[]) {
    const { customizeRemoveDialog, store, openConfirmDialog } = this.props;
    const visibleMaxNamesCount = 5;
    const selectedNames = selectedItems
      .map((ns) => ns.getName())
      .slice(0, visibleMaxNamesCount)
      .join(", ");
    const dialogCustomProps = customizeRemoveDialog ? customizeRemoveDialog(selectedItems) : {};
    const selectedCount = selectedItems.length;
    const tailCount = selectedCount > visibleMaxNamesCount ? selectedCount - visibleMaxNamesCount : 0;
    const tail =
      tailCount > 0 ? (
        <>
          {", and "}
          <b>{tailCount}</b>
          {" more"}
        </>
      ) : null;
    const message =
      selectedCount <= 1 ? (
        <p>
          {"Remove item "}
          <b>{selectedNames}</b>?
        </p>
      ) : (
        <p>
          {"Remove "}
          <b>{selectedCount}</b>
          {" items "}
          <b>{selectedNames}</b>
          {tail}?
        </p>
      );
    const { removeSelectedItems, removeItems } = store;
    const onConfirm =
      typeof removeItems === "function"
        ? () => removeItems.apply(store, [selectedItems])
        : typeof removeSelectedItems === "function"
          ? removeSelectedItems.bind(store)
          : noop;

    openConfirmDialog({
      ok: onConfirm,
      labelOk: "Remove",
      message,
      ...dialogCustomProps,
    });
  }

  private clearColumnFilters() {
    const { tableId, tableColumnFiltersStorage } = this.props;

    if (!tableId) {
      return;
    }

    tableColumnFiltersStorage.merge((draft) => {
      delete draft[tableId];
    });
  }

  renderNoItems() {
    if (this.failedToLoad) {
      return <NoItems>{this.props.failedToLoadMessage}</NoItems>;
    }

    if (!this.props.getIsReady()) {
      return <Spinner center data-testid={this.props.spinnerTestId} />;
    }

    const { tableId, tableColumnFiltersStorage } = this.props;
    const hasColumnFilters = Boolean(tableId && hasActiveColumnFilters(tableColumnFiltersStorage.get()[tableId]));

    if (this.props.getFilters().length > 0 || hasColumnFilters) {
      return (
        <NoItems>
          No items found.
          <p>
            <a
              onClick={() => {
                this.props.pageFiltersStore.reset();
                this.clearColumnFilters();
              }}
              className="contrast"
            >
              Reset filters?
            </a>
          </p>
        </NoItems>
      );
    }

    return <NoItems />;
  }

  renderItems() {
    if (this.props.virtual) {
      return null;
    }

    return this.props.getItems().map((item) => this.getRow(item.getId()));
  }

  renderTableHeader() {
    const { customizeTableRowProps, renderTableHeader, isSelectable, isConfigurable, store, tableId } = this.props;

    if (!renderTableHeader) {
      return null;
    }

    const enabledItems = this.props.getItems().filter((item) => !customizeTableRowProps?.(item).disabled);

    return (
      <TableHead showTopLine nowrap>
        {isSelectable && (
          <Observer>
            {() => (
              <TableCell
                checkbox
                isChecked={store.isSelectedAll(enabledItems)}
                onClick={prevDefault(() => store.toggleSelectionAll(enabledItems))}
              />
            )}
          </Observer>
        )}
        {renderTableHeader.filter(isDefined).map((cellProps, index) => {
          if (!this.showColumn(cellProps)) {
            return null;
          }

          const columnId = cellProps.id;
          const getFilterValues = columnId ? this.props.columnFilters?.[columnId] : undefined;
          const tableFilters = tableId ? this.props.tableColumnFiltersStorage.get()[tableId] : undefined;

          const updateFilter = (filter: TableColumnFilter | undefined) => {
            if (!tableId || !columnId) {
              return;
            }

            this.props.tableColumnFiltersStorage.merge((draft) => {
              const filtersOfTable = (draft[tableId] ??= {});

              if (filter) {
                filtersOfTable[columnId] = filter;
              } else {
                delete filtersOfTable[columnId];
              }

              if (Object.keys(filtersOfTable).length === 0) {
                delete draft[tableId];
              }
            });
          };

          const filterable = Boolean(getFilterValues && columnId && tableId);

          return (
            <TableCell
              key={columnId ?? index}
              onResizeStart={columnId ? (event) => this.handleResizeStart(columnId, event) : undefined}
              onResizeReset={columnId ? () => this.handleResizeReset(columnId) : undefined}
              {...cellProps}
              title={
                filterable && columnId && tableId ? (
                  <>
                    <span className="header-cell-content">{cellProps.title ?? cellProps.children}</span>
                    <ColumnFilterDropdown
                      tableId={tableId}
                      columnId={columnId}
                      label={cellProps.title ?? columnId}
                      items={this.props.getColumnFilterItems()}
                      getValues={getFilterValues!}
                      filter={tableFilters?.[columnId]}
                      onChange={updateFilter}
                    />
                  </>
                ) : (
                  cellProps.title
                )
              }
              resizable={columnId !== "logs" && !!columnId}
              style={{
                ...cellProps.style,
                flex:
                  columnId && this.columnFlexGrow.has(columnId)
                    ? `${this.columnFlexGrow.get(columnId)} 0`
                    : cellProps.style?.flex,
              }}
            />
          );
        })}
        <TableCell className="menu">
          {isConfigurable && tableId ? this.renderColumnVisibilityMenu(tableId) : undefined}
        </TableCell>
      </TableHead>
    );
  }

  renderColumnFilters() {
    const { tableId, renderTableHeader = [], columnFilters, tableColumnFiltersStorage } = this.props;

    if (!tableId || !columnFilters) {
      return null;
    }

    const filters = tableColumnFiltersStorage.get()[tableId];

    if (!hasActiveColumnFilters(filters)) {
      return null;
    }

    const labels = new Map(
      renderTableHeader
        .filter(isDefined)
        .filter((cellProps) => !!cellProps.id)
        .map((cellProps) => [cellProps.id!, cellProps.title ?? cellProps.children]),
    );

    const removeColumnFilter = (columnId: string) =>
      tableColumnFiltersStorage.merge((draft) => {
        const filtersOfTable = draft[tableId];

        if (!filtersOfTable) {
          return;
        }

        delete filtersOfTable[columnId];

        if (Object.keys(filtersOfTable).length === 0) {
          delete draft[tableId];
        }
      });

    return (
      <div className="ColumnFiltersBar">
        {Object.entries(filters ?? {}).map(([columnId, filter]) =>
          filter.values.length === 0 ? null : (
            <span className="ColumnFiltersBar-chip" key={columnId}>
              <span className="chip-label">{labels.get(columnId) ?? columnId}</span>
              <span className="chip-mode">{filter.excluded ? "≠" : "="}</span>
              <span className="chip-values">{filter.values.join(", ")}</span>
              <Icon material="close" smallest onClick={() => removeColumnFilter(columnId)} />
            </span>
          ),
        )}
        <button type="button" className="ColumnFiltersBar-clear" onClick={() => this.clearColumnFilters()}>
          Clear filters
        </button>
      </div>
    );
  }

  render() {
    const {
      store,
      hasDetailsView,
      addRemoveButtons = {},
      virtual,
      sortingCallbacks,
      detailsItem,
      className,
      tableProps = {},
      tableId,
      getItems,
      activeTheme,
    } = this.props;
    const selectedItemId = detailsItem && detailsItem.getId();
    const classNames = cssNames(className, "grow", "shrink-0", "basis-0", activeTheme.get().type);
    const items = getItems();
    const selectedItems = store.pickOnlySelected(items);

    return (
      <div className="items grow shrink-0 basis-0 flex flex-col" ref={this.tableRef}>
        {this.resizeGuideX !== null && (
          <div
            ref={this.resizeGuideRef}
            className="resize-guide"
            style={{ right: `calc(100% - ${this.resizeGuideX}px)` }}
          />
        )}
        {this.renderColumnFilters()}
        <Table
          tableId={tableId}
          virtual={virtual}
          selectable={hasDetailsView}
          sortable={sortingCallbacks}
          getTableRow={this.getRow}
          renderRow={virtual ? undefined : this.renderRow}
          items={items}
          selectedItemId={selectedItemId}
          noItems={this.renderNoItems()}
          className={classNames}
          {...tableProps}
        >
          {this.renderTableHeader()}
          {this.renderItems()}
        </Table>

        <Observer>
          {() => (
            <AddRemoveButtons
              onRemove={
                (store.removeItems || store.removeSelectedItems) && selectedItems.length > 0
                  ? () => this.removeItemsDialog(selectedItems)
                  : undefined
              }
              removeTooltip={`Remove selected items (${selectedItems.length})`}
              {...addRemoveButtons}
            />
          )}
        </Observer>
      </div>
    );
  }

  showColumn({ id: columnId, showWithColumn }: TableCellProps): boolean {
    const { tableId, isConfigurable } = this.props;

    return !isConfigurable || !tableId || !this.props.isTableColumnHidden(tableId, columnId, showWithColumn);
  }

  renderColumnVisibilityMenu(tableId: string) {
    const { renderTableHeader = [], tableColumnOrderStorage } = this.props;
    const headerCells = renderTableHeader.filter(isDefined);
    const movableColumns = headerCells.filter((cellProps) => !!cellProps.id && !cellProps.showWithColumn);
    const allIds = getColumnIds(headerCells, (cellProps) => cellProps.id);
    const savedOrder = tableColumnOrderStorage.get()[tableId] ?? [];
    const order = [
      ...savedOrder.filter((id) => allIds.includes(id)),
      ...allIds.filter((id) => !savedOrder.includes(id)),
    ];

    const move = (columnId: string, offset: -1 | 1) => {
      const next = moveColumnInOrder(
        order,
        columnId,
        movableColumns.map((column) => column.id!),
        offset,
      );

      if (!next) {
        return;
      }

      tableColumnOrderStorage.merge((draft) => {
        draft[tableId] = next;
      });
    };

    return (
      <MenuActions
        id="menu-actions-for-item-object-list-content"
        className="ItemListLayoutVisibilityMenu"
        toolbar={false}
        autoCloseOnSelect={false}
      >
        <div className="menu-header">Columns</div>
        {movableColumns.map((cellProps, index) => {
          const columnId = cellProps.id!;

          return (
            <MenuItem key={columnId} className="input">
              <Checkbox
                label={cellProps.title ?? `<${cellProps.className}>`}
                value={this.showColumn(cellProps)}
                onChange={() => this.props.toggleTableColumnVisibility(tableId, columnId)}
              />
              <span className="column-order-actions">
                <Icon
                  material="arrow_upward"
                  small
                  className={cssNames({ disabled: index === 0 })}
                  tooltip="Move column left"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    move(columnId, -1);
                  }}
                />
                <Icon
                  material="arrow_downward"
                  small
                  className={cssNames({ disabled: index === movableColumns.length - 1 })}
                  tooltip="Move column right"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    move(columnId, 1);
                  }}
                />
              </span>
            </MenuItem>
          );
        })}
        {savedOrder.length > 0 && (
          <MenuItem
            onClick={() =>
              tableColumnOrderStorage.merge((draft) => {
                delete draft[tableId];
              })
            }
          >
            Reset column order
          </MenuItem>
        )}
      </MenuActions>
    );
  }
}

export const ItemListLayoutContent = withInjectables<Dependencies, ItemListLayoutContentProps<ItemObject, boolean>>(
  NonInjectedItemListLayoutContent,
  {
    getProps: (di, props) => ({
      ...props,
      activeTheme: di.inject(activeThemeInjectable),
      pageFiltersStore: di.inject(pageFiltersStoreInjectable),
      openConfirmDialog: di.inject(openConfirmDialogInjectable),
      toggleTableColumnVisibility: di.inject(toggleTableColumnVisibilityInjectable),
      isTableColumnHidden: di.inject(isTableColumnHiddenInjectable),
      columnResizeStorage: di.inject(columnResizeStorageInjectable),
      tableColumnOrderStorage: di.inject(tableColumnOrderStorageInjectable),
      tableColumnFiltersStorage: di.inject(tableColumnFiltersStorageInjectable),
    }),
  },
) as <Item extends ItemObject, PreLoadStores extends boolean>(
  props: ItemListLayoutContentProps<Item, PreLoadStores>,
) => React.ReactElement;
