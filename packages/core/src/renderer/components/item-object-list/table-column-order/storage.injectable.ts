/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createStorageInjectable from "../../../utils/create-storage/create-storage.injectable";

/**
 * The identifiers of the columns of a table, in the order the user moved them to.
 */
export interface TableColumnOrderStorageState {
  [tableId: string]: string[];
}

const tableColumnOrderStorageInjectable = getInjectable({
  id: "table-column-order-storage",

  instantiate: (di) => {
    const createStorage = di.inject(createStorageInjectable);

    return createStorage<TableColumnOrderStorageState>("table-column-order", {});
  },
});

export default tableColumnOrderStorageInjectable;
