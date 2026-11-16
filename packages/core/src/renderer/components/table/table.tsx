/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./table.scss";

import assert from "node:assert";
import { cssNames, isDefined } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import autoBindReact from "auto-bind/react";
import { observer } from "mobx-react";
import React from "react";
import { VirtualList } from "../virtual-list";
import orderByUrlParamInjectable from "./order-by-url-param.injectable";
import sortByUrlParamInjectable from "./sort-by-url-param.injectable";
import { getSorted } from "./sorting";
import { TableHead } from "./table-head";
import tableModelInjectable from "./table-model/table-model.injectable";
import { TableRow } from "./table-row";

import type { ItemObject } from "@freelensapp/list-layout";
import type { StrictReactNode } from "@freelensapp/utilities";

import type { PageParam } from "../../navigation/page-param";
import type { TableCellElem } from "./table-cell";
import type { TableHeadElem } from "./table-head";
import type { TableModel } from "./table-model/table-model";
import type { TableRowElem, TableRowProps } from "./table-row";

export type TableSortBy = string;
export type TableOrderBy = "asc" | "desc";
export interface TableSortParams {
  sortBy: TableSortBy;
  orderBy: TableOrderBy;
}
export type TableSortCallback<Item> = (data: Item) => undefined | string | number | (string | number)[];
export type TableSortCallbacks<Item> = Record<string, TableSortCallback<Item>>;

export interface TableProps<Item> extends React.DOMAttributes<HTMLDivElement> {
  /**
   * Used for persisting sort order and visible columns
   */
  tableId?: string;
  /**
   * The raw data for the table
   */
  items?: Item[];
  /**
   * Optional addition class names for the root HTML element
   */
  className?: string;
  /**
   * Setup auto-sizing for all columns (flex: 1 0)
   */
  autoSize?: boolean;
  /**
   * Highlight rows on hover
   */
  selectable?: boolean;
  /**
   * Use scrollbar if content is bigger than parent's height
   */
  scrollable?: boolean;
  /**
   * @deprecated Unused
   */
  storageKey?: string;
  /**
   * Define sortable callbacks for every column in `<TableHead><TableCell sortBy="someCol"></TableCell></TableHead>`
   * @sortItem argument in the callback is an object, provided in `<TableRow sortItem={someColDataItem}></TableRow>`
   */
  sortable?: TableSortCallbacks<Item>;
  /**
   * sorting state is managed globally from url params
   */
  sortSyncWithUrl?: boolean;
  /**
   * default sorting params
   */
  sortByDefault?: Partial<TableSortParams>;
  /**
   * callback on sort change
   *
   * Default: global sync with url
   */
  onSort?: (params: TableSortParams) => void;
  /**
   * This is shown when {@link TableProps.items} is empty
   */
  noItems?: StrictReactNode;
  /**
   * Allows to scroll list to selected item
   */
  selectedItemId?: string;

  /**
   * Use virtual list component to render only visible rows. By default uses a
   * auto sizer to fill available height
   */
  virtual?: boolean;
  /**
   * Only used when virtual is true. Sets the virtual list to be a fixed height.
   * Needed when used in contexts that already have a parent component that
   * is `overflow-y: scroll`,
   */
  virtualHeight?: number;
  /**
   * Row padding in pixels
   */
  rowPadding?: number;
  /**
   * Row line height in pixels
   */
  rowLineHeight?: number;
  customRowHeights?: (item: Item, lineHeight: number, paddings: number) => number;
  getTableRow?: (uid: string) => React.ReactElement<TableRowProps<Item>> | undefined | null;
  renderRow?: (item: Item, index: number) => React.ReactElement<TableRowProps<Item>> | undefined | null;
}

interface Dependencies {
  model: TableModel;
  sortByUrlParam: PageParam<string>;
  orderByUrlParam: PageParam<string>;
}

@observer
class NonInjectedTable<Item extends ItemObject> extends React.Component<TableProps<Item> & Dependencies> {
  state = { contentWidth: 0 };

  private readonly scrollContainerRef = React.createRef<HTMLDivElement>();
  private scrollResizeObserver?: ResizeObserver;

  static defaultProps: TableProps<any> = {
    scrollable: true,
    autoSize: true,
    rowPadding: 12,
    rowLineHeight: 20,
    sortSyncWithUrl: true,
    customRowHeights: (item, lineHeight, paddings) => lineHeight + paddings,
  };

  constructor(props: TableProps<Item> & Dependencies) {
    super(props);
    autoBindReact(this);
  }

  componentDidMount() {
    const { sortable, tableId, virtual } = this.props;

    if (sortable && !tableId) {
      console.error("Table must have props.tableId if props.sortable is specified");
    }

    if (virtual) {
      this.measureContentWidth();
      this.scrollResizeObserver = new ResizeObserver(() => this.measureContentWidth());

      if (this.scrollContainerRef.current) {
        this.scrollResizeObserver.observe(this.scrollContainerRef.current);
      }
    }
  }

  componentDidUpdate() {
    if (this.props.virtual) {
      this.measureContentWidth();
    }
  }

  componentWillUnmount() {
    this.scrollResizeObserver?.disconnect();
  }

  /**
   * The header and the virtual rows must share one width. Sum the minimum
   * width of every column: when it exceeds the available space the table
   * scrolls horizontally instead of squeezing the columns to nothing.
   */
  private measureContentWidth = () => {
    const container = this.scrollContainerRef.current;

    if (!container) {
      return;
    }

    const cells = container.querySelectorAll<HTMLElement>(".TableHead .TableCell");
    let minimumWidth = 0;

    cells.forEach((cell) => {
      const style = window.getComputedStyle(cell);
      const minWidth = parseFloat(style.minWidth) || 0;
      const flexBasis = style.flexBasis.endsWith("px") ? parseFloat(style.flexBasis) || 0 : 0;

      minimumWidth += Math.max(minWidth, flexBasis);
    });

    const nextWidth = Math.max(container.clientWidth, Math.ceil(minimumWidth));

    if (nextWidth !== this.state.contentWidth) {
      this.setState({ contentWidth: nextWidth });
    }
  };

  // Plain getters (not @computed): they read this.props, which mobx-react 9
  // forbids inside a derivation. Read from render, reactivity is preserved by
  // the observer render reaction.
  get isSortable() {
    const { sortable, tableId } = this.props;

    return Boolean(sortable && tableId);
  }

  get sortParams() {
    const modelParams = this.props.tableId ? this.props.model.getSortParams(this.props.tableId) : {};

    return Object.assign({}, this.props.sortByDefault, modelParams);
  }

  renderHead() {
    const { children } = this.props;
    const content = React.Children.toArray(children) as (TableRowElem<Item> | TableHeadElem)[];
    const headElem = content.find((elem) => elem.type === TableHead);

    if (!headElem) {
      return null;
    }

    const headProps = this.props.virtual
      ? { style: { ...headElem.props.style, width: this.state.contentWidth || undefined } }
      : {};

    if (this.isSortable) {
      const columns = React.Children.toArray(headElem.props.children) as TableCellElem[];

      return React.cloneElement(headElem, {
        ...headProps,
        children: columns.map((elem) => {
          if (elem.props.checkbox) {
            return elem;
          }
          const title =
            elem.props.title ||
            // copy cell content to title if it's a string
            // usable if part of TableCell's content is hidden when there is not enough space
            (typeof elem.props.children === "string" ? elem.props.children : undefined);

          return React.cloneElement(elem, {
            title,
            _sort: this.sort,
            _sorting: this.sortParams,
            _nowrap: headElem.props.nowrap,
          });
        }),
      });
    }

    return React.cloneElement(headElem, headProps);
  }

  getSorted(rawItems: Item[]) {
    const { sortBy, orderBy } = this.sortParams;

    if (!sortBy || !orderBy) {
      return rawItems;
    }

    return getSorted(rawItems, this.props.sortable?.[sortBy], orderBy);
  }

  protected onSort({ sortBy, orderBy }: TableSortParams) {
    assert(this.props.tableId);
    this.props.model.setSortParams(this.props.tableId, { sortBy, orderBy });
    const { sortSyncWithUrl, onSort } = this.props;

    if (sortSyncWithUrl) {
      this.props.sortByUrlParam.set(sortBy);
      this.props.orderByUrlParam.set(orderBy);
    }

    onSort?.({ sortBy, orderBy });
  }

  sort(colName: TableSortBy) {
    const { sortBy, orderBy } = this.sortParams;
    const sameColumn = sortBy == colName;
    const newSortBy: TableSortBy = colName;
    const newOrderBy: TableOrderBy = !orderBy || !sameColumn || orderBy === "desc" ? "asc" : "desc";

    this.onSort({
      sortBy: String(newSortBy),
      orderBy: newOrderBy,
    });
  }

  private getContent() {
    const { items = [], renderRow, children } = this.props;
    const content = React.Children.toArray(children) as (TableRowElem<Item> | TableHeadElem)[];

    if (renderRow) {
      content.push(...items.map(renderRow).filter(isDefined));
    }

    return content;
  }

  renderRows() {
    const {
      noItems,
      virtual,
      customRowHeights,
      rowLineHeight,
      rowPadding,
      items = [],
      getTableRow,
      selectedItemId,
      className,
      virtualHeight,
    } = this.props;
    const content = this.getContent();
    let rows: React.ReactElement<TableRowProps<Item>>[] = content.filter((elem) => elem.type === TableRow);
    let sortedItems = (rows.length ? rows.map((row) => row.props.sortItem) : items).filter(isDefined);

    if (this.isSortable) {
      sortedItems = this.getSorted(sortedItems);

      if (rows.length) {
        rows = sortedItems.map((item) => rows.find((row) => item == row.props.sortItem)).filter(isDefined);
      }
    }

    if (!rows.length && !items.length && noItems) {
      return noItems;
    }

    if (virtual) {
      assert(customRowHeights && rowLineHeight && rowPadding);
      const rowHeights = sortedItems.map((item) => customRowHeights(item, rowLineHeight, rowPadding * 2));

      return (
        <VirtualList
          items={sortedItems}
          rowHeights={rowHeights}
          getRow={getTableRow}
          selectedItemId={selectedItemId}
          className={className}
          fixedHeight={virtualHeight}
          width={this.state.contentWidth || "100%"}
        />
      );
    }

    return rows;
  }

  render() {
    const { selectable, scrollable, autoSize, virtual, className } = this.props;
    const classNames = cssNames("Table flex flex-col", className, {
      selectable,
      scrollable,
      sortable: this.isSortable,
      autoSize,
      virtual,
      horizontalScroll: virtual,
    });
    const head = this.renderHead();
    const rows = this.renderRows();

    return (
      <div className={classNames}>
        {virtual ? (
          <div className="TableHorizontalScroll" ref={this.scrollContainerRef}>
            {head}
            {rows}
          </div>
        ) : (
          <>
            {head}
            {rows}
          </>
        )}
      </div>
    );
  }
}

export const Table = withInjectables<Dependencies, TableProps<ItemObject>>(NonInjectedTable, {
  getProps: (di, props) => ({
    ...props,
    model: di.inject(tableModelInjectable),
    orderByUrlParam: di.inject(orderByUrlParamInjectable),
    sortByUrlParam: di.inject(sortByUrlParamInjectable),
  }),
}) as <Item>(props: TableProps<Item>) => React.ReactElement;
