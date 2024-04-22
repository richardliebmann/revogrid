import { Component, Listen, Method, Event, EventEmitter, Prop } from '@stencil/core';
import { DataFormat } from '../../types/interfaces';

@Component({ tag: 'revogr-clipboard' })
export class Clipboard {
  /**
   * If readonly mode - disabled Paste event
   */
  @Prop() readonly: boolean;

  /**
   * Paste 1. Fired before paste applied to the grid
   * @property {string} raw - raw data from clipboard
   * @property {ClipboardEvent} event - original event
   * @property {boolean} defaultPrevented - if true, paste will be canceled
   */
  @Event({ eventName: 'beforepaste' }) beforePaste: EventEmitter;

  /**
   * Paste 2. Fired before paste applied to the grid and after data parsed
   * @property {string} raw - raw data from clipboard
   * @property {string[][]} parsed - parsed data
   */
  @Event({ eventName: 'beforepasteapply' }) beforePasteApply: EventEmitter;

  /**
   * Paste 3. Internal method. When data region is ready pass it to the top.
   * @property {string[][]} data - data to paste
   * @property {boolean} defaultPrevented - if true, paste will be canceled
   */
  @Event({ eventName: 'pasteregion', bubbles: false }) pasteRegion: EventEmitter<string[][]>;


  /**
   * Paste 4. Fired after paste applied to the grid
   * @property {string} raw - raw data from clipboard
   * @property {string[][]} parsed - parsed data
   * @property {ClipboardEvent} event - original event
   * @property {boolean} defaultPrevented - if true, paste will be canceled
   */
  @Event({ eventName: 'afterpasteapply' }) afterPasteApply: EventEmitter;

  /**
   * Cut 1. Fired before cut triggered
   * @property {ClipboardEvent} event - original event
   * @property {boolean} defaultPrevented - if true, cut will be canceled
   */
  @Event({ eventName: 'beforecut' }) beforeCut: EventEmitter;

  /**
   * Cut 2. Clears region when cut is done
   */
  @Event({ eventName: 'clearregion' }) clearRegion: EventEmitter<DataTransfer>;

  /**
   * Copy 1. Fired before copy triggered
   * @property {ClipboardEvent} event - original event
   * @property {boolean} defaultPrevented - if true, copy will be canceled
   */
  @Event({ eventName: 'beforecopy' }) beforeCopy: EventEmitter;

  /**
   * Copy Method 1. Fired before copy applied to the clipboard from outside.
   * @property {DataTransfer} event - original event
   * @property {string} data - data to copy
   * @property {boolean} defaultPrevented - if true, copy will be canceled
   */
  @Event({ eventName: 'beforecopyapply' }) beforeCopyApply: EventEmitter;

  /**
   * Copy 2. Fired when region copied
   * @property {DataTransfer} data - data to copy
   * @property {boolean} defaultPrevented - if true, copy will be canceled
   */
  @Event({ eventName: 'copyregion', bubbles: false }) copyRegion: EventEmitter<DataTransfer>;

  @Listen('paste', { target: 'document' }) onPaste(e: ClipboardEvent) {
    // if readonly do nothing
    if (this.readonly) {
      return;
    }
    const clipboardData = this.getData(e);
    const isHTML = clipboardData.types.indexOf('text/html') > -1;
    const data = isHTML ? clipboardData.getData('text/html') : clipboardData.getData('text');
    const dataText = clipboardData.getData('text');

    const beforePaste = this.beforePaste.emit({
      raw: data,
      dataText,
      isHTML,
      event: e,
    });

    if (beforePaste.defaultPrevented) {
      return;
    }

    let parsedData: string[][];
    // if html, then search for table if no table fallback to regular text parsing
    if (beforePaste.detail.isHTML) {
      const table = this.htmlParse(beforePaste.detail.raw);
      parsedData = table || this.textParse(dataText);
    } else {
      parsedData = this.textParse(beforePaste.detail.raw);
    }
    const beforePasteApply = this.beforePasteApply.emit({
      raw: data,
      parsed: parsedData,
      event: e,
    });
    if (beforePasteApply.defaultPrevented) {
      return;
    }
    this.pasteRegion.emit(beforePasteApply.detail.parsed);
    // post paste action
    const afterPasteApply = this.afterPasteApply.emit({
      raw: data,
      parsed: parsedData,
      event: e,
    });
    // keep default behavior if needed
    if (afterPasteApply.defaultPrevented) {
      return;
    }
    e.preventDefault();
  }

  /**
   * Listen to copy event and emit copy region event
   */
  @Listen('copy', { target: 'document' }) copyStarted(e: ClipboardEvent) {
    const beforeCopy = this.beforeCopy.emit({
      event: e,
    });
    if (beforeCopy.defaultPrevented) {
      return;
    }
    const data = this.getData(beforeCopy.detail.event);
    this.copyRegion.emit(data);
    e.preventDefault();
  }

  /**
   * Listen to copy event and emit copy region event
   */
  @Listen('cut', { target: 'document' }) cutStarted(e: ClipboardEvent) {
    const beforeCut = this.beforeCut.emit({
      event: e,
    });
    if (beforeCut.defaultPrevented) {
      return;
    }
    const data = this.getData(beforeCut.detail.event);
    this.copyStarted(e);

    // if readonly do nothing
    if (this.readonly) {
      return;
    }

    this.clearRegion.emit(data);
    e.preventDefault();
  }

  @Method() async doCopy(e: DataTransfer, data?: DataFormat[][]) {
    const beforeCopyApply = this.beforeCopyApply.emit({
      event: e,
      data,
    });
    if (beforeCopyApply.defaultPrevented) {
      return;
    }
    const parsed = data ? this.parserCopy(data) : '';
    e.setData('text/plain', parsed);
  }

  parserCopy(data: DataFormat[][]) {
    return data.map(rgRow => rgRow.join('\t')).join('\n');
  }

  private textParse(data: string) {
    const result: string[][] = [];
    const rows = data.split(/\r\n|\n|\r/);
    for (let y in rows) {
      result.push(rows[y].split('\t'));
    }
    return result;
  }

  private htmlParse(data: string) {
    const result: string[][] = [];
    const fragment = document.createRange().createContextualFragment(data);
    const table = fragment.querySelector('table');
    if (!table) {
      return null;
    }
    for (const rgRow of Array.from(table.rows)) {
      result.push(Array.from(rgRow.cells).map(cell => cell.innerText));
    }
    return result;
  }

  private getData(e: ClipboardEvent) {
    return e.clipboardData || (window as unknown as { clipboardData: DataTransfer | null })?.clipboardData;
  }
}
