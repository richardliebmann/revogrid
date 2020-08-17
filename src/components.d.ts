/* eslint-disable */
/* tslint:disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */
import { HTMLStencilElement, JSXBase } from "@stencil/core/internal";
import { ColumnData, ColumnDataSchemaRegular, DataType, DimensionSettingsState, DimensionType, Edition, Selection, ViewPortResizeEvent, ViewPortScrollEvent, ViewSettingSizeProp, VirtualPositionItem } from "./interfaces";
import { ObservableMap } from "@stencil/store";
export namespace Components {
    interface RevoGrid {
        "colSize": number;
        "columns": ColumnData;
        "frameSize": number;
        "range": boolean;
        "readonly": boolean;
        "resize": boolean;
        "rowSize": number;
        "source": DataType[];
    }
    interface RevogrData {
        "colData": ColumnDataSchemaRegular[];
        "cols": VirtualPositionItem[];
        "rows": VirtualPositionItem[];
    }
    interface RevogrEdit {
        "dimensionCol": ObservableMap<DimensionSettingsState>;
        "dimensionRow": ObservableMap<DimensionSettingsState>;
        "editCell": Edition.EditCell|null;
        "parent": string;
    }
    interface RevogrHeader {
        "canResize": boolean;
        "colData": ColumnDataSchemaRegular[];
        "cols": VirtualPositionItem[];
        "parent": string;
    }
    interface RevogrOverlaySelection {
        "dimensionCol": ObservableMap<DimensionSettingsState>;
        "dimensionRow": ObservableMap<DimensionSettingsState>;
        "lastCell": Selection.Cell;
        "parent": string;
        "position": Selection.Cell;
        "readonly": boolean;
    }
    interface RevogrScrollVirtual {
        "contentSize": number;
        "dimension": DimensionType;
        "setScroll": (e: ViewPortScrollEvent) => Promise<void>;
    }
    interface RevogrTextEditor {
        "value": string;
    }
    interface RevogrViewport {
        "range": boolean;
        "readonly": boolean;
        "resize": boolean;
        "uuid": string|null;
    }
    interface RevogrViewportScroll {
        "contentHeight": number;
        "contentWidth": number;
        "setScroll": (e: ViewPortScrollEvent) => Promise<void>;
    }
}
declare global {
    interface HTMLRevoGridElement extends Components.RevoGrid, HTMLStencilElement {
    }
    var HTMLRevoGridElement: {
        prototype: HTMLRevoGridElement;
        new (): HTMLRevoGridElement;
    };
    interface HTMLRevogrDataElement extends Components.RevogrData, HTMLStencilElement {
    }
    var HTMLRevogrDataElement: {
        prototype: HTMLRevogrDataElement;
        new (): HTMLRevogrDataElement;
    };
    interface HTMLRevogrEditElement extends Components.RevogrEdit, HTMLStencilElement {
    }
    var HTMLRevogrEditElement: {
        prototype: HTMLRevogrEditElement;
        new (): HTMLRevogrEditElement;
    };
    interface HTMLRevogrHeaderElement extends Components.RevogrHeader, HTMLStencilElement {
    }
    var HTMLRevogrHeaderElement: {
        prototype: HTMLRevogrHeaderElement;
        new (): HTMLRevogrHeaderElement;
    };
    interface HTMLRevogrOverlaySelectionElement extends Components.RevogrOverlaySelection, HTMLStencilElement {
    }
    var HTMLRevogrOverlaySelectionElement: {
        prototype: HTMLRevogrOverlaySelectionElement;
        new (): HTMLRevogrOverlaySelectionElement;
    };
    interface HTMLRevogrScrollVirtualElement extends Components.RevogrScrollVirtual, HTMLStencilElement {
    }
    var HTMLRevogrScrollVirtualElement: {
        prototype: HTMLRevogrScrollVirtualElement;
        new (): HTMLRevogrScrollVirtualElement;
    };
    interface HTMLRevogrTextEditorElement extends Components.RevogrTextEditor, HTMLStencilElement {
    }
    var HTMLRevogrTextEditorElement: {
        prototype: HTMLRevogrTextEditorElement;
        new (): HTMLRevogrTextEditorElement;
    };
    interface HTMLRevogrViewportElement extends Components.RevogrViewport, HTMLStencilElement {
    }
    var HTMLRevogrViewportElement: {
        prototype: HTMLRevogrViewportElement;
        new (): HTMLRevogrViewportElement;
    };
    interface HTMLRevogrViewportScrollElement extends Components.RevogrViewportScroll, HTMLStencilElement {
    }
    var HTMLRevogrViewportScrollElement: {
        prototype: HTMLRevogrViewportScrollElement;
        new (): HTMLRevogrViewportScrollElement;
    };
    interface HTMLElementTagNameMap {
        "revo-grid": HTMLRevoGridElement;
        "revogr-data": HTMLRevogrDataElement;
        "revogr-edit": HTMLRevogrEditElement;
        "revogr-header": HTMLRevogrHeaderElement;
        "revogr-overlay-selection": HTMLRevogrOverlaySelectionElement;
        "revogr-scroll-virtual": HTMLRevogrScrollVirtualElement;
        "revogr-text-editor": HTMLRevogrTextEditorElement;
        "revogr-viewport": HTMLRevogrViewportElement;
        "revogr-viewport-scroll": HTMLRevogrViewportScrollElement;
    }
}
declare namespace LocalJSX {
    interface RevoGrid {
        "colSize"?: number;
        "columns"?: ColumnData;
        "frameSize"?: number;
        "range"?: boolean;
        "readonly"?: boolean;
        "resize"?: boolean;
        "rowSize"?: number;
        "source"?: DataType[];
    }
    interface RevogrData {
        "colData"?: ColumnDataSchemaRegular[];
        "cols"?: VirtualPositionItem[];
        "rows"?: VirtualPositionItem[];
    }
    interface RevogrEdit {
        "dimensionCol"?: ObservableMap<DimensionSettingsState>;
        "dimensionRow"?: ObservableMap<DimensionSettingsState>;
        "editCell"?: Edition.EditCell|null;
        "onBeforeEdit"?: (event: CustomEvent<Edition.SaveDataDetails>) => void;
        "parent"?: string;
    }
    interface RevogrHeader {
        "canResize"?: boolean;
        "colData"?: ColumnDataSchemaRegular[];
        "cols"?: VirtualPositionItem[];
        "onHeaderClick"?: (event: CustomEvent<ColumnDataSchemaRegular>) => void;
        "onHeaderResize"?: (event: CustomEvent<ViewSettingSizeProp>) => void;
        "parent"?: string;
    }
    interface RevogrOverlaySelection {
        "dimensionCol"?: ObservableMap<DimensionSettingsState>;
        "dimensionRow"?: ObservableMap<DimensionSettingsState>;
        "lastCell"?: Selection.Cell;
        "parent"?: string;
        "position"?: Selection.Cell;
        "readonly"?: boolean;
    }
    interface RevogrScrollVirtual {
        "contentSize"?: number;
        "dimension"?: DimensionType;
        "onScrollVirtual"?: (event: CustomEvent<ViewPortScrollEvent>) => void;
    }
    interface RevogrTextEditor {
        "onEdit"?: (event: CustomEvent<Edition.SaveData>) => void;
        "value"?: string;
    }
    interface RevogrViewport {
        "range"?: boolean;
        "readonly"?: boolean;
        "resize"?: boolean;
        "uuid"?: string|null;
    }
    interface RevogrViewportScroll {
        "contentHeight"?: number;
        "contentWidth"?: number;
        "onResizeViewport"?: (event: CustomEvent<ViewPortResizeEvent>) => void;
        "onScrollViewport"?: (event: CustomEvent<ViewPortScrollEvent>) => void;
    }
    interface IntrinsicElements {
        "revo-grid": RevoGrid;
        "revogr-data": RevogrData;
        "revogr-edit": RevogrEdit;
        "revogr-header": RevogrHeader;
        "revogr-overlay-selection": RevogrOverlaySelection;
        "revogr-scroll-virtual": RevogrScrollVirtual;
        "revogr-text-editor": RevogrTextEditor;
        "revogr-viewport": RevogrViewport;
        "revogr-viewport-scroll": RevogrViewportScroll;
    }
}
export { LocalJSX as JSX };
declare module "@stencil/core" {
    export namespace JSX {
        interface IntrinsicElements {
            "revo-grid": LocalJSX.RevoGrid & JSXBase.HTMLAttributes<HTMLRevoGridElement>;
            "revogr-data": LocalJSX.RevogrData & JSXBase.HTMLAttributes<HTMLRevogrDataElement>;
            "revogr-edit": LocalJSX.RevogrEdit & JSXBase.HTMLAttributes<HTMLRevogrEditElement>;
            "revogr-header": LocalJSX.RevogrHeader & JSXBase.HTMLAttributes<HTMLRevogrHeaderElement>;
            "revogr-overlay-selection": LocalJSX.RevogrOverlaySelection & JSXBase.HTMLAttributes<HTMLRevogrOverlaySelectionElement>;
            "revogr-scroll-virtual": LocalJSX.RevogrScrollVirtual & JSXBase.HTMLAttributes<HTMLRevogrScrollVirtualElement>;
            "revogr-text-editor": LocalJSX.RevogrTextEditor & JSXBase.HTMLAttributes<HTMLRevogrTextEditorElement>;
            "revogr-viewport": LocalJSX.RevogrViewport & JSXBase.HTMLAttributes<HTMLRevogrViewportElement>;
            "revogr-viewport-scroll": LocalJSX.RevogrViewportScroll & JSXBase.HTMLAttributes<HTMLRevogrViewportScrollElement>;
        }
    }
}
