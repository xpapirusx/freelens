/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createStorageInjectable from "../../../utils/create-storage/create-storage.injectable";

/**
 * The values of one column the user narrowed a table to, and whether the rows that carry them are
 * the ones shown or the ones hidden.
 */
export interface TableColumnFilter {
  values: string[];
  excluded: boolean;
}

/**
 * The column filters of every table, by table identifier and then by column identifier.
 */
export interface TableColumnFiltersStorageState {
  [tableId: string]: Record<string, TableColumnFilter>;
}

const tableColumnFiltersStorageInjectable = getInjectable({
  id: "table-column-filters-storage",

  instantiate: (di) => {
    const createStorage = di.inject(createStorageInjectable);

    return createStorage<TableColumnFiltersStorageState>("table-column-filters", {});
  },
});

export default tableColumnFiltersStorageInjectable;
