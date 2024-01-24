import size from 'lodash/size';
import debounce from 'lodash/debounce';
import range from 'lodash/range';

import { setStore } from '../../utils/store.utils';
import ColumnDataProvider from '../../services/column.data.provider';
import { BasePlugin } from '../base.plugin';
import {
  ColumnProp,
  Order,
  CellCompareFunc,
  ColumnRegular,
  InitialHeaderClick,
  DataType,
} from '../..';
import { DimensionRows } from '../..';
import { PluginProviders } from '../../';

export type SortingOrder = Record<ColumnProp, Order>;
type SortingOrderFunction = Record<ColumnProp, CellCompareFunc | undefined>;
type ColumnSetEvent = {
  order: SortingOrder;
};

/**
 * lifecycle
 * 1) @event beforesorting - sorting just started, nothing happened yet, can be from column or from source, if type is from rows - column will be undefined
 * 2) @metod updateColumnSorting - column sorting icon applied to grid and column get updated, data still untiuched
 * 3) @event beforesortingapply - before we applied sorting data to data source, you can prevent event and data will not be sorted. It's called only from column sorting click
 * 4) @event afterSortingApply - sorting applied, just finished event, from rows and columns
 *
 * If you prevent event it'll not reach farther steps
 */

export default class SortingPlugin extends BasePlugin {
  // sorting order per column
  private sorting: SortingOrder | null = null;

  // sorting function per column, multiple columns sorting supported
  private sortingFunc: SortingOrderFunction | null = null;
  private doSort = debounce(
    (order: SortingOrder, comparison: SortingOrderFunction) =>
      this.sort(order, comparison),
    50,
  );

  constructor(
    protected revogrid: HTMLRevoGridElement,
    providers: PluginProviders,
  ) {
    super(revogrid, providers);

    const aftersourceset = async ({
      detail: { type },
    }: CustomEvent<{
      type: DimensionRows;
    }>) => {
      // if sorting was provided - sort data
      if (!!this.sorting && this.sortingFunc) {
        const beforeEvent = this.emit('beforesorting', { type });
        if (beforeEvent.defaultPrevented) {
          return;
        }
        this.doSort(this.sorting, this.sortingFunc);
      }
    };
    const aftercolumnsset = async ({
      detail: { order },
    }: CustomEvent<ColumnSetEvent>) => {
      const columns = await this.revogrid.getColumns();
      const sortingFunc: SortingOrderFunction = {};

      for (let prop in order) {
        const cmp = this.getComparer(
          ColumnDataProvider.getColumnByProp(columns, prop),
          order[prop],
        );
        sortingFunc[prop] = cmp;
      }
      this.doSort(order, sortingFunc);
    };
    const headerclick = async (e: CustomEvent<InitialHeaderClick>) => {
      if (e.defaultPrevented) {
        return;
      }

      if (!e.detail.column.sortable) {
        return;
      }

      this.headerclick(
        e.detail.column,
        e.detail.index,
        e.detail?.originalEvent?.shiftKey,
      );
    };

    this.addEventListener('after-any-source', aftersourceset);
    this.addEventListener('aftercolumnsset', aftercolumnsset);
    this.addEventListener('initialHeaderClick', headerclick);
  }

  private getComparer(column: ColumnRegular, order: Order): CellCompareFunc {
    const cellCmp: CellCompareFunc =
      column?.cellCompare?.bind({ order }) || this.defaultCellCompare;
    if (order == 'asc') {
      return cellCmp;
    }
    if (order == 'desc') {
      return this.descCellCompare(cellCmp);
    }
    return undefined;
  }

  /**
   * Apply sorting to data on header click
   * If additive - add to existing sorting, multiple columns can be sorted
   */
  async headerclick(column: ColumnRegular, index: number, additive: boolean) {
    let order: Order = this.getNextOrder(column.order);
    const beforeEvent = this.emit('beforesorting', { column, order, additive });
    if (beforeEvent.defaultPrevented) {
      return;
    }
    order = beforeEvent.detail.order;
    const newCol = await this.revogrid.updateColumnSorting(
      beforeEvent.detail.column,
      index,
      order,
      additive,
    );

    // apply sort data
    const beforeApplyEvent = this.emit('beforesortingapply', {
      column: newCol,
      order,
      additive,
    });
    if (beforeApplyEvent.defaultPrevented) {
      return;
    }
    order = beforeApplyEvent.detail.order;
    const cmp = this.getComparer(column, order);

    if (additive && this.sorting) {
      const sorting: SortingOrder = {};
      const sortingFunc: SortingOrderFunction = {};

      this.sorting = {
        ...this.sorting,
        ...sorting,
      };
      // extend sorting function with new sorting for multiple columns sorting
      this.sortingFunc = {
        ...this.sortingFunc,
        ...sortingFunc,
      };

      if (column.prop in sorting && size(sorting) > 1 && order === undefined) {
        delete sorting[column.prop];
        delete sortingFunc[column.prop];
      } else {
        sorting[column.prop] = order;
        sortingFunc[column.prop] = cmp;
      }
    } else {
      if (order) {
        // reset sorting
        this.sorting = { [column.prop]: order };
        this.sortingFunc = { [column.prop]: cmp };
      } else {
        delete this.sorting[column.prop];
        delete this.sortingFunc[column.prop];
      }
    }

    this.doSort(this.sorting, this.sortingFunc);
  }

  /**
   * Sort items by sorting function
   * @requires proxyItems applied to row store
   * @requires source applied to row store
   *
   * @param sorting - per column sorting
   * @param data - this.stores['rgRow'].store.get('source')
   */
  async sort(
    sorting: SortingOrder,
    sortingFunc: SortingOrderFunction,
    types: DimensionRows[] = ['rgRow', 'rowPinStart', 'rowPinEnd'],
  ) {
    // if no sorting - reset
    if (!size(sorting)) {
      this.sorting = null;
      this.sortingFunc = null;

      for (let type of types) {
        const store = await this.revogrid.getSourceStore(type);
        // row data
        const source = store.get('source');
        // row indexes
        const proxyItems = range(0, source.length);
        setStore(store, {
          proxyItems,
          source: [...source],
        });
      }
    } else {
      // set sorting
      this.sorting = sorting;
      this.sortingFunc = sortingFunc;

      // by default it'll sort by rgRow store
      // todo: support multiple stores
      for (let type of types) {
        const store = await this.revogrid.getSourceStore(type);
        // row data
        const source = store.get('source');
        // row indexes
        const proxyItems = store.get('proxyItems');
        const data = this.sortIndexByItems(
          [...proxyItems],
          source,
          sortingFunc,
        );
        setStore(store, {
          proxyItems: data,
          source: [...source],
        });
      }
    }
    this.emit('afterSortingApply');
  }

  defaultCellCompare(prop: ColumnProp, a: DataType, b: DataType) {
    const av = a[prop]?.toString().toLowerCase();
    const bv = b[prop]?.toString().toLowerCase();

    return av == bv ? 0 : av > bv ? 1 : -1;
  }

  descCellCompare(cmp: CellCompareFunc) {
    return (prop: ColumnProp, a: DataType, b: DataType): number => {
      return -1 * cmp(prop, a, b);
    };
  }

  sortIndexByItems(
    indexes: number[],
    source: DataType[],
    sortingFunc: SortingOrderFunction,
  ): number[] {
    // if no sorting - return unsorted indexes
    if (Object.entries(sortingFunc).length === 0) {
      // Unsort indexes
      return [...Array(indexes.length).keys()];
    }
    //
    /**
     * go through all indexes and align in new order
     * performs a multi-level sorting by applying multiple comparison functions to determine the order of the items based on different properties.
     */
    return indexes.sort((a, b) => {
      for (const [prop, cmp] of Object.entries(sortingFunc)) {
        const itemA = source[a];
        const itemB = source[b];

        /**
         * If the comparison function returns a non-zero value (sorted), it means that the items should be sorted based on the given property. In such a case, the function immediately returns the sorted value, indicating the order in which the items should be arranged.
         * If none of the comparison functions result in a non-zero value, indicating that the items are equal or should remain in the same order, the function eventually returns 0.
         */
        const sorted = cmp(prop, itemA, itemB);
        if (sorted) {
          return sorted;
        }
      }
      return 0;
    });
  }

  getNextOrder(currentOrder: Order): Order {
    switch (currentOrder) {
      case undefined:
        return 'asc';
      case 'asc':
        return 'desc';
      case 'desc':
        return undefined;
    }
  }
}
