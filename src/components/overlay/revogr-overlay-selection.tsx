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
import SelectionStoreService from '../../store/selection/selection.store.service';
import { codesLetter } from '../../utils/key.codes';
import { MOBILE_CLASS, SELECTION_BORDER_CLASS } from '../../utils/consts';
import { DSourceState } from '../../store/dataSource/data.store';
import { getRange, isRangeSingleCell } from '../../store/selection/selection.helpers';
import { getCurrentCell, getElStyle } from './selection.utils';
import { isEditInput } from '../editors/edit.utils';
import { KeyboardService } from './keyboard.service';
import { AutoFillService } from './autofill.service';
import { getFromEvent, verifyTouchTarget } from '../../utils/events';
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
import { MultiDimensionType } from '../../types/dimension';
import {
  FocusRenderEvent,
  ApplyFocusEvent,
  AllDimensionType,
} from '../../types/interfaces';
import {
  Editors,
  BeforeSaveDataDetails,
  BeforeEdit,
  RangeArea,
  TempRange,
  ChangedRange,
  BeforeRangeSaveDataDetails,
  SaveDataDetails,
} from '../../types/selection';

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
   * Last cell position.
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

  protected selectionStoreService: SelectionStoreService;
  private keyboardService: KeyboardService | null = null;
  private autoFillService: AutoFillService | null = null;
  private orderEditor: HTMLRevogrOrderEditorElement;
  private revogrEdit: HTMLRevogrEditElement | null = null;
  // #endregion

  // #region Listeners
  @Listen('touchmove', { target: 'document' })
  @Listen('mousemove', { target: 'document' })
  onMouseMove(e: MouseEvent | TouchEvent) {
    if (this.selectionStoreService.focused) {
      this.autoFillService.selectionMouseMove(e);
    }
  }

  /** Action finished inside of the document. */
  /** Pointer left document, clear any active operation. */
  @Listen('touchend', { target: 'document' })
  @Listen('mouseup', { target: 'document' })
  @Listen('mouseleave', { target: 'document' })
  onMouseUp() {
    this.autoFillService.clearAutoFillSelection();
  }

  /** Row drag started. */
  @Listen('dragstartcell') onCellDrag(e: CustomEvent<DragStartEvent>) {
    this.orderEditor?.dragStart(e.detail);
  }

  /** Get keyboard down from element. */
  @Listen('keyup', { target: 'document' }) onKeyUp(e: KeyboardEvent) {
    this.beforeKeyUp.emit(e);
  }

  /** Get keyboard down from element. */
  @Listen('keydown', { target: 'document' }) onKeyDown(e: KeyboardEvent) {
    const proxy = this.beforeKeyDown.emit(e);
    if (e.defaultPrevented || proxy.defaultPrevented) {
      return;
    }
    this.keyboardService?.keyDown(e, this.range);
  }
  // #endregion

  /** Selection & Keyboard */
  @Watch('selectionStore') selectionServiceSet(
    s: Observable<SelectionStoreState>,
  ) {
    this.selectionStoreService = new SelectionStoreService(s, {
      changeRange: range => this.triggerRangeEvent(range),
      focus: (focus, end) => this.doFocus(focus, end),
    });

    this.keyboardService = new KeyboardService({
      selectionStoreService: this.selectionStoreService,
      selectionStore: s,
      range: r => this.selectionStoreService.changeRange(r),
      focusNext: (f, next) => this.doFocus(f, f, next),
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
      selectionStoreService: this.selectionStoreService,
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
      const range = this.selectionStoreService.ranged;
      const selectionFocus = this.selectionStoreService.focused;

      // Clipboard
      if ((range || selectionFocus) && this.useClipboard) {
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
      if (selectionFocus && !this.readonly && this.range) {
        nodes.push(this.autoFillService.renderAutofill(range, selectionFocus));
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
        // Open Editor on DblClick
        onDblClick={(e: MouseEvent) => {
          // DblClick prevented outside - Editor will not open
          if (!e.defaultPrevented) {
            this.doEdit();
          }
        }}
        onMouseDown={(e: MouseEvent) => this.onElementMouseDown(e)}
        onTouchStart={(e: TouchEvent) => this.onElementMouseDown(e, true)}
      >
        {nodes}
        <slot name="data" />
      </Host>
    );
  }

  private doFocus(focus: Cell, end: Cell, next?: Partial<Cell>) {
    const { defaultPrevented } = this.beforeFocusCell.emit(
      this.columnService.getSaveData(focus.y, focus.x),
    );
    if (defaultPrevented) {
      return false;
    }
    const evData = {
      range: {
        ...focus,
        x1: end.x,
        y1: end.y,
      },
      next,
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

  protected onElementMouseDown(e: MouseEvent | TouchEvent, touch = false) {
    // Ignore focus if clicked input
    if (isEditInput(e.target as HTMLElement | undefined)) {
      return;
    }
    const data = this.getData();
    if (e.defaultPrevented) {
      return;
    }
    const x = getFromEvent(e, 'clientX');
    const y = getFromEvent(e, 'clientY');
    // skip touch
    if (x === null || y === null) {
      return;
    }
    // Regular cell click
    const focusCell = getCurrentCell({ x, y }, data);
    this.selectionStoreService.focus(focusCell, this.range && e.shiftKey);

    // Initiate autofill selection
    if (this.range) {
      this.autoFillService.selectionStart(e.target as HTMLElement, data);
      if (!touch) {
        e.preventDefault();
      } else if (
        verifyTouchTarget((e as TouchEvent).touches[0], MOBILE_CLASS)
      ) {
        e.preventDefault();
      }
    }
  }

  /**
   * Start cell editing
   */
  protected doEdit(val = '') {
    if (this.canEdit()) {
      const editCell = this.selectionStore.get('focus');
      const data = this.columnService.getSaveData(editCell.y, editCell.x);
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
    const focus = this.selectionStoreService.focused;
    let range = this.selectionStoreService.ranged;
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
    let rangeData: (any[][]) | undefined;

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
    const focus = this.selectionStoreService.focused;
    const isEditing = this.selectionStoreService.edited !== null;
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
      this.selectionStoreService.ranged &&
      !isRangeSingleCell(this.selectionStoreService.ranged)
    ) {
      const data = this.columnService.getRangeStaticData(
        this.selectionStoreService.ranged,
        '',
      );
      this.autoFillService.onRangeApply(
        data,
        this.selectionStoreService.ranged,
      );
    } else if (this.canEdit()) {
      const focused = this.selectionStoreService.focused;
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
    const editCell = this.selectionStoreService.focused;
    return editCell && !this.columnService?.isReadOnly(editCell.y, editCell.x);
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
  protected getData() {
    return {
      el: this.element,
      rows: this.dimensionRow.state,
      cols: this.dimensionCol.state,
      lastCell: this.lastCell,
    };
  }
}
