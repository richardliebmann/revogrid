import {
  Component,
  Event,
  EventEmitter,
  h,
  Host,
  Listen,
  Prop,
  VNode,
  Element,
  Watch,
} from '@stencil/core';
import ColumnService from '../data/column.service';
import { codesLetter } from '../../utils/key.codes';
import { MOBILE_CLASS, SELECTION_BORDER_CLASS } from '../../utils/consts';
import { DSourceState } from '@store';
import {
  getRange,
  isRangeSingleCell,
} from '@store';
import {
  EventData,
  getElStyle,
  getFocusCellBasedOnEvent,
} from './selection.utils';
import { isEditInput } from '../editors/edit.utils';
import { KeyboardService } from './keyboard.service';
import { AutoFillService } from './autofill.service';
import { verifyTouchTarget } from '../../utils/events';
import {
  Observable,
  SelectionStoreState,
  DimensionSettingsState,
  DataType,
  DimensionRows,
  ColumnRegular,
  DimensionCols,
  Cell,
  DragStartEvent,
} from '../../components';
import { EditCellStore, MultiDimensionType } from '@type';
import {
  FocusRenderEvent,
  ApplyFocusEvent,
  AllDimensionType,
  DataFormat,
} from '@type';
import {
  Editors,
  BeforeSaveDataDetails,
  BeforeEdit,
  RangeArea,
  TempRange,
  ChangedRange,
  BeforeRangeSaveDataDetails,
  SaveDataDetails,
} from '@type';

/**
 * Component for overlaying the grid with the selection.
 */
@Component({
  tag: 'revogr-overlay-selection',
  styleUrl: 'revogr-overlay-style.scss',
})
export class OverlaySelection {
  // #region Properties
  /**
   * Readonly mode.
   */
  @Prop() readonly: boolean;
  /**
   * Range selection allowed.
   */
  @Prop() range: boolean;
  /**
   * Enable revogr-order-editor component (read more in revogr-order-editor component).
   * Allows D&D.
   */
  @Prop() canDrag: boolean;

  /**
   * Enable revogr-clipboard component (read more in revogr-clipboard component).
   * Allows copy/paste.
   */
  @Prop() useClipboard: boolean;

  /** Stores */
  /** Selection, range, focus. */
  @Prop() selectionStore: Observable<SelectionStoreState>;
  /** Dimension settings Y. */
  @Prop() dimensionRow: Observable<DimensionSettingsState>;
  /** Dimension settings X. */
  @Prop() dimensionCol: Observable<DimensionSettingsState>;

  // --------------------------------------------------------------------------
  //
  //  Static stores, not expected to change during component lifetime
  //
  // --------------------------------------------------------------------------

  /**
   * Row data store.
   */
  @Prop() dataStore: Observable<DSourceState<DataType, DimensionRows>>;

  /**
   * Column data store.
   */
  @Prop() colData: Observable<DSourceState<ColumnRegular, DimensionCols>>;
  /**
   * Last real coordinates positions + 1.
   */
  @Prop() lastCell: Cell;
  /**
   * Custom editors register.
   */
  @Prop() editors: Editors;
  /**
   * If true applys changes when cell closes if not Escape.
   */
  @Prop() applyChangesOnClose = false;
  /**
   * Additional data to pass to renderer.
   */
  @Prop() additionalData: any;

  /**
   * Is mobile view mode.
   */
  @Prop() isMobileDevice: boolean;

  // #endregion

  // #region Events
  /**
   * Before clipboard copy happened. Validate data before copy.
   * To prevent the default behavior of editing data and use your own implementation, call `e.preventDefault()`.
   */
  @Event({ eventName: 'beforecopyregion', cancelable: true })
  beforeCopyRegion: EventEmitter;
  /**
   * Before region paste happened.
   */
  @Event({ eventName: 'beforepasteregion', cancelable: true })
  beforeRegionPaste: EventEmitter;

  /**
   * Cell edit apply to the data source.
   * Triggers datasource edit on the root level.
   */
  @Event({ eventName: 'celleditapply', cancelable: true })
  cellEditApply: EventEmitter<BeforeSaveDataDetails>;

  /**
   * Before cell focus.
   */
  @Event({ eventName: 'beforecellfocusinit', cancelable: true })
  beforeFocusCell: EventEmitter<BeforeSaveDataDetails>;


  /**
   * Fired when change of viewport happens.
   * Usually when we switch between pinned regions.
   */
  @Event({ eventName: 'beforenextvpfocus', cancelable: true })
  beforeNextViewportFocus: EventEmitter<Cell>;

  /**
   * Set edit cell.
   */
  @Event({ eventName: 'setedit' }) setEdit: EventEmitter<BeforeEdit>;

  /**
   * Before range applied.
   */
  @Event({ eventName: 'beforeapplyrange' })
  beforeApplyRange: EventEmitter<FocusRenderEvent>;
  /**
   * Before range selection applied.
   */
  @Event({ eventName: 'beforesetrange' }) beforeSetRange: EventEmitter;

  /**
   * Before editor render.
   */
  @Event({ eventName: 'beforeeditrender' })
  beforeEditRender: EventEmitter<FocusRenderEvent>;

  /**
   * Set range.
   */
  @Event({ eventName: 'setrange' }) setRange: EventEmitter<
    RangeArea & { type: MultiDimensionType }
  >;

  /** Select all. */
  @Event({ eventName: 'selectall' }) selectAll: EventEmitter;
  /**
   * Used for editors support when editor close requested.
   */
  @Event({ eventName: 'canceledit' }) cancelEdit: EventEmitter;

  /**
   * Set temp range area during autofill.
   */
  @Event({ eventName: 'settemprange' })
  setTempRange: EventEmitter<TempRange | null>;

  /**
   * Before cell get focused.
   * To prevent the default behavior of applying the edit data, you can call `e.preventDefault()`.
   */
  @Event({ eventName: 'applyfocus' })
  applyFocus: EventEmitter<FocusRenderEvent>;

  /**
   * Cell get focused.
   * To prevent the default behavior of applying the edit data, you can call `e.preventDefault()`.
   */
  @Event({ eventName: 'focuscell' }) focusCell: EventEmitter<ApplyFocusEvent>;
  /** Range data apply. */
  @Event({ eventName: 'beforerangedataapply' })
  beforeRangeDataApply: EventEmitter<FocusRenderEvent>;
  /** Selection range changed. */
  @Event({ eventName: 'selectionchangeinit', cancelable: true })
  selectionChange: EventEmitter<ChangedRange>;
  /** Before range copy. */
  @Event({ eventName: 'beforerangecopyapply', cancelable: true, bubbles: true })
  beforeRangeCopyApply: EventEmitter<ChangedRange>;

  /** Range data apply.
   * Triggers datasource edit on the root level.
   */
  @Event({ eventName: 'rangeeditapply', cancelable: true })
  rangeEditApply: EventEmitter<BeforeRangeSaveDataDetails>;
  /** Range copy. */
  @Event({ eventName: 'clipboardrangecopy', cancelable: true })
  rangeClipboardCopy: EventEmitter;
  @Event({ eventName: 'clipboardrangepaste', cancelable: true })
  rangeClipboardPaste: EventEmitter;

  /**
   * Before key up event proxy, used to prevent key up trigger.
   * If you have some custom behaviour event, use this event to check if it wasn't processed by internal logic.
   * Call preventDefault().
   */
  @Event({ eventName: 'beforekeydown' })
  beforeKeyDown: EventEmitter<KeyboardEvent>;
  /**
   * Before key down event proxy, used to prevent key down trigger.
   * If you have some custom behaviour event, use this event to check if it wasn't processed by internal logic.
   * Call preventDefault().
   */
  @Event({ eventName: 'beforekeyup' }) beforeKeyUp: EventEmitter<KeyboardEvent>;
  /**
   * Runs before cell save.
   * Can be used to override or cancel original save.
   */
  @Event({ eventName: 'beforecellsave', cancelable: true })
  beforeCellSave: EventEmitter;

  // #endregion

  // #region Private Properties
  @Element() element: HTMLElement;
  private clipboard: HTMLRevogrClipboardElement;

  protected columnService: ColumnService;
  private keyboardService: KeyboardService | null = null;
  private autoFillService: AutoFillService | null = null;
  private orderEditor: HTMLRevogrOrderEditorElement;
  private revogrEdit: HTMLRevogrEditElement | null = null;
  private unsubscribeSelectionStore: { (): void }[] = [];
  // #endregion

  // #region Listeners
  @Listen('touchmove', { target: 'document' })
  @Listen('mousemove', { target: 'document' })
  onMouseMove(e: MouseEvent | TouchEvent) {
    if (this.selectionStore.get('focus')) {
      this.autoFillService.selectionMouseMove(e);
    }
  }

  /**
   * Action finished inside of the document.
   * Pointer left document, clear any active operation.
   */
  @Listen('touchend', { target: 'document' })
  @Listen('mouseup', { target: 'document' })
  @Listen('mouseleave', { target: 'document' })
  onMouseUp() {
    // Clear auto fill selection
    // when pointer left document,
    // clear any active operation.
    this.autoFillService.clearAutoFillSelection(
      this.selectionStore.get('focus'),
      this.selectionStore.get('range'),
    );
  }

  /**
   * Row drag started.
   * This event is fired when drag action started on cell.
   */
  @Listen('dragstartcell') onCellDrag(e: CustomEvent<DragStartEvent>) {
    // Invoke drag start on order editor.
    this.orderEditor?.dragStart(e.detail);
  }

  /**
   * Get keyboard down from element.
   * This event is fired when keyboard key is released.
   */
  @Listen('keyup', { target: 'document' }) onKeyUp(e: KeyboardEvent) {
    // Emit before key up event.
    this.beforeKeyUp.emit(e);
  }

  /**
   * Get keyboard down from element.
   * This event is fired when keyboard key is pressed.
   */
  @Listen('keydown', { target: 'document' }) onKeyDown(e: KeyboardEvent) {
    // Emit before key down event and check if default prevention is set.
    const proxy = this.beforeKeyDown.emit(e);
    if (e.defaultPrevented || proxy.defaultPrevented) {
      return;
    }
    // Invoke key down on keyboard service.
    this.keyboardService?.keyDown(
      e,
      this.range,
      !!this.selectionStore.get('edit'),
      {
        focus: this.selectionStore.get('focus'),
        range: this.selectionStore.get('range'),
      },
    );
  }
  // #endregion

  /**
   * Selection & Keyboard
   */
  @Watch('selectionStore') selectionServiceSet(
    s: Observable<SelectionStoreState>,
  ) {
    // clear subscriptions
    this.unsubscribeSelectionStore.forEach(v => v());
    this.unsubscribeSelectionStore.length = 0;
    this.unsubscribeSelectionStore.push(s.onChange('nextFocus', (v) => this.doFocus(v, v)));

    this.keyboardService = new KeyboardService({
      selectionStore: s,
      range: r => this.triggerRangeEvent(r),
      focus: (f, changes, focusNextViewport) => {
        if (focusNextViewport) {
          this.beforeNextViewportFocus.emit(f);
          return false;
        } else {
          return this.doFocus(f, f, changes);
        }
      },
      change: val => {
        if (this.readonly) {
          return;
        }
        this.doEdit(val);
      },
      cancel: async () => {
        await this.revogrEdit.cancelChanges();
        this.closeEdit();
      },
      clearCell: () => !this.readonly && this.clearCell(),
      internalPaste: () => !this.readonly && this.beforeRegionPaste.emit(),
      getData: () => this.getData(),
      selectAll: () => this.selectAll.emit(),
    });
    this.createAutoFillService();
  }
  /** Autofill */
  @Watch('dimensionRow')
  @Watch('dimensionCol')
  createAutoFillService() {
    this.autoFillService = new AutoFillService({
      dimensionRow: this.dimensionRow,
      dimensionCol: this.dimensionCol,
      columnService: this.columnService,
      dataStore: this.dataStore,

      clearRangeDataApply: e =>
        this.beforeRangeDataApply.emit({
          ...e,
          ...this.types,
        }),
      setTempRange: e => this.setTempRange.emit(e),
      selectionChanged: e => this.selectionChange.emit(e),

      rangeCopy: e => this.beforeRangeCopyApply.emit(e),
      rangeDataApply: e => this.rangeEditApply.emit(e),

      setRange: e => this.triggerRangeEvent(e),
      getData: () => this.getData(),
    });
  }

  /** Columns */
  @Watch('dataStore')
  @Watch('colData')
  columnServiceSet() {
    this.columnService?.destroy();
    this.columnService = new ColumnService(this.dataStore, this.colData);
    this.createAutoFillService();
  }

  connectedCallback() {
    this.columnServiceSet();
    this.selectionServiceSet(this.selectionStore);
  }

  disconnectedCallback() {
    // clear subscriptions
    this.unsubscribeSelectionStore.forEach(v => v());
    this.unsubscribeSelectionStore.length = 0;
    this.columnService?.destroy();
  }

  async componentWillRender() {
    const editCell = this.selectionStore.get('edit');
    if (!editCell) {
      await this.revogrEdit?.beforeDisconnect?.();
    }
  }

  private renderRange(range: RangeArea) {
    const style = getElStyle(
      range,
      this.dimensionRow.state,
      this.dimensionCol.state,
    );
    return [
      <div class={SELECTION_BORDER_CLASS} style={style}>
        {this.isMobileDevice && (
          <div class="range-handlers">
            <span class={MOBILE_CLASS}></span>
            <span class={MOBILE_CLASS}></span>
          </div>
        )}
      </div>,
    ];
  }

  private renderEditor() {
    // Check if edit access
    const editCell = this.selectionStore.get('edit');
    // Readonly or Editor closed
    if (this.readonly || !editCell) {
      return null;
    }
    const val =
      editCell.val || this.columnService.getCellData(editCell.y, editCell.x);
    const editable = {
      ...editCell,
      ...this.columnService.getSaveData(editCell.y, editCell.x, val),
    };
    const renderEvent = this.beforeEditRender.emit({
      range: {
        ...editCell,
        x1: editCell.x,
        y1: editCell.y,
      },
      ...this.types,
    });

    // Render prevented
    if (renderEvent.defaultPrevented) {
      return null;
    }

    const style = getElStyle(
      renderEvent.detail.range,
      this.dimensionRow.state,
      this.dimensionCol.state,
    );
    return (
      <revogr-edit
        style={style}
        ref={el => (this.revogrEdit = el)}
        additionalData={this.additionalData}
        editCell={editable}
        saveOnClose={this.applyChangesOnClose}
        column={this.columnService.rowDataModel(editCell.y, editCell.x)}
        editor={this.columnService.getCellEditor(
          editCell.y,
          editCell.x,
          this.editors,
        )}
        onCloseedit={e => this.closeEdit(e)}
        onCelledit={e => {
          const saveEv = this.beforeCellSave.emit(e.detail);
          if (!saveEv.defaultPrevented) {
            this.cellEdit(saveEv.detail);
          }

          // if not clear navigate to next cell after edit
          if (!saveEv.detail.preventFocus) {
            this.focusNext();
          }
        }}
      />
    );
  }

  render() {
    const nodes: VNode[] = [];
    const editCell = this.renderEditor();

    // Editor
    if (editCell) {
      nodes.push(editCell);
    } else {
      const range = this.selectionStore.get('range');
      const focus = this.selectionStore.get('focus');

      // Clipboard
      if ((range || focus) && this.useClipboard) {
        nodes.push(
          <revogr-clipboard
            readonly={this.readonly}
            onCopyregion={e => this.onCopy(e.detail)}
            onClearregion={() => !this.readonly && this.clearCell()}
            ref={e => (this.clipboard = e)}
            onPasteregion={e => this.onPaste(e.detail)}
          />,
        );
      }

      // Range
      if (range) {
        nodes.push(...this.renderRange(range));
      }
      // Autofill
      if (focus && !this.readonly && this.range) {
        nodes.push(this.autoFillService.renderAutofill(range, focus));
      }

      // Order
      if (this.canDrag) {
        nodes.push(
          <revogr-order-editor
            ref={e => (this.orderEditor = e)}
            dataStore={this.dataStore}
            dimensionRow={this.dimensionRow}
            dimensionCol={this.dimensionCol}
            parent={this.element}
            onRowdragstartinit={e => this.rowDragStart(e)}
          />,
        );
      }
    }
    return (
      <Host
        class={{ mobile: this.isMobileDevice }}
        onDblClick={(e: MouseEvent) => this.onElementDblClick(e)}
        onMouseDown={(e: MouseEvent) => this.onElementMouseDown(e)}
        onTouchStart={(e: TouchEvent) => this.onElementMouseDown(e, true)}
      >
        {nodes}
        <slot name="data" />
      </Host>
    );
  }

  /**
   * Executes the focus operation on the specified range of cells.
   */
  private doFocus(focus: Cell, end: Cell, changes?: Partial<Cell>) {
    const { defaultPrevented } = this.beforeFocusCell.emit(
      this.columnService.getSaveData(focus.y, focus.x),
    );
    if (defaultPrevented) {
      return false;
    }
    const evData: FocusRenderEvent = {
      range: {
        ...focus,
        x1: end.x,
        y1: end.y,
      },
      next: changes,
      ...this.types,
    };
    const applyEvent = this.applyFocus.emit(evData);
    if (applyEvent.defaultPrevented) {
      return false;
    }
    const { range } = applyEvent.detail;
    return !this.focusCell.emit({
      focus: {
        x: range.x,
        y: range.y,
      },
      end: {
        x: range.x1,
        y: range.y1,
      },
      ...applyEvent.detail,
    }).defaultPrevented;
  }

  private triggerRangeEvent(range: RangeArea) {
    const type = this.types.rowType;
    const applyEvent = this.beforeApplyRange.emit({
      range: { ...range },
      ...this.types,
    });
    if (applyEvent.defaultPrevented) {
      return false;
    }
    const data = this.columnService.getRangeTransformedToProps(
      applyEvent.detail.range,
      this.dataStore,
    );
    let e = this.beforeSetRange.emit(data);
    e = this.setRange.emit({ ...applyEvent.detail.range, type });
    if (e.defaultPrevented) {
      return false;
    }
    return !e.defaultPrevented;
  }

  /**
   * Open Editor on DblClick
   */
  private onElementDblClick(e: MouseEvent) {
    // DblClick prevented outside - Editor will not open
    
    // Get data from the component
    const data = this.getData();
    const focusCell = getFocusCellBasedOnEvent(e, data);
    if (!focusCell) {
      return;
    }
    this.doEdit();
  }

  /**
   * Handle mouse down event on Host element
   */
  private onElementMouseDown(e: MouseEvent | TouchEvent, touch = false) {
    // Get the target element from the event object
    const targetElement = e.target as HTMLElement | undefined;
    // Ignore focus if clicked input
    if (isEditInput(targetElement)) {
      return;
    }

    // Get data from the component
    const data = this.getData();
    const focusCell = getFocusCellBasedOnEvent(e, data);
    if (!focusCell) {
      return;
    }

    // Set focus on the current cell
    this.focus(focusCell, this.range && e.shiftKey);

    // Initiate autofill selection
    if (this.range) {
      this.autoFillService.selectionStart(targetElement, this.getData());

      // Prevent default behavior for mouse events,
      // but only if target element is not a mobile input
      if (!touch) {
        e.preventDefault();
      } else if (
        verifyTouchTarget((e as TouchEvent).touches[0], MOBILE_CLASS)
      ) {
        // Prevent default behavior for touch events
        // if target element is a mobile input
        e.preventDefault();
      }
    }
  }

  /**
   * Start cell editing
   */
  protected doEdit(val = '') {
    if (this.canEdit()) {
      const focus = this.selectionStore.get('focus');

      const data = this.columnService.getSaveData(focus.y, focus.x);
      this.setEdit?.emit({
        ...data,
        val,
      });
    }
  }

  /**
   * Close editor event triggered
   * @param details - if requires focus next
   */
  private closeEdit(e?: CustomEvent<boolean>) {
    this.cancelEdit.emit();
    if (e?.detail) {
      this.focusNext();
    }
  }

  /**
   * Edit finished.
   * Close Editor and save.
   */
  protected cellEdit(e: SaveDataDetails) {
    const dataToSave = this.columnService.getSaveData(e.rgRow, e.rgCol, e.val);
    this.cellEditApply.emit(dataToSave);
  }

  private getRegion() {
    const focus = this.selectionStore.get('focus');
    let range = this.selectionStore.get('range');
    if (!range) {
      range = getRange(focus, focus);
    }
    return range;
  }
  private onCopy(e: DataTransfer) {
    const range = this.getRegion();
    const canCopyEvent = this.beforeCopyRegion.emit(range);
    if (canCopyEvent.defaultPrevented) {
      return false;
    }
    let rangeData: DataFormat[][] | undefined;

    if (range) {
      const { data, mapping } = this.columnService.copyRangeArray(
        range,
        this.dataStore,
      );
      const event = this.rangeClipboardCopy.emit({
        range,
        data,
        mapping,
        ...this.types,
      });
      if (!event.defaultPrevented) {
        rangeData = event.detail.data;
      }
    }

    this.clipboard.doCopy(e, rangeData);
    return true;
  }

  private onPaste(data: string[][]) {
    const focus = this.selectionStore.get('focus');
    const isEditing = this.selectionStore.get('edit') !== null;
    if (!focus || isEditing) {
      return;
    }
    let { changed, range } = this.columnService.getTransformedDataToApply(
      focus,
      data,
    );
    const { defaultPrevented: canPaste } = this.rangeClipboardPaste.emit({
      data: changed,
      range,
      ...this.types,
    });
    if (canPaste) {
      return;
    }
    this.autoFillService.onRangeApply(changed, range);
  }

  private async focusNext() {
    const canFocus = await this.keyboardService.keyChangeSelection(
      new KeyboardEvent('keydown', {
        code: codesLetter.ARROW_DOWN,
      }),
      this.range,
    );
    if (!canFocus) {
      this.closeEdit();
    }
  }

  protected clearCell() {
    if (
      this.selectionStore.get('range') &&
      !isRangeSingleCell(this.selectionStore.get('range'))
    ) {
      const data = this.columnService.getRangeStaticData(
        this.selectionStore.get('range'),
        '',
      );
      this.autoFillService.onRangeApply(data, this.selectionStore.get('range'));
    } else if (this.canEdit()) {
      const focused = this.selectionStore.get('focus');
      const cell = this.columnService.getSaveData(focused.y, focused.x);
      this.cellEdit({
        rgRow: focused.y,
        rgCol: focused.x,
        val: '',
        type: cell.type,
        prop: cell.prop,
      });
    }
  }

  private rowDragStart({ detail }: CustomEvent<{ cell: Cell; text: string }>) {
    detail.text = this.columnService.getCellData(detail.cell.y, detail.cell.x);
  }

  /**
   * Verify if edit allowed.
   */
  protected canEdit() {
    if (this.readonly) {
      return false;
    }
    const focus = this.selectionStore.get('focus');
    return focus && !this.columnService?.isReadOnly(focus.y, focus.x);
  }

  get edited(): EditCellStore {
    return this.selectionStore.get('edit');
  }

  /**
   * Sets the focus on a cell and optionally edits a range.
   */
  focus(cell?: Cell, isRangeEdit = false) {
    if (!cell) return false;

    const end = cell;
    const start = this.selectionStore.get('focus');

    if (isRangeEdit && start) {
      return this.triggerRangeEvent(getRange(start, end));
    }

    return this.doFocus(cell, end);
  }

  get types(): AllDimensionType {
    return {
      rowType: this.dataStore.get('type'),
      colType: this.columnService.type,
    };
  }

  /**
   * Collect data
   */
  protected getData(): EventData {
    return {
      el: this.element,
      rows: this.dimensionRow.state,
      cols: this.dimensionCol.state,
      lastCell: this.lastCell,
      focus: this.selectionStore.get('focus'),
      range: this.selectionStore.get('range'),
    };
  }
}
