import PDFKitFont from "pdfkit/js/mixins/fonts";
import pdfDoc, { options, text } from "pdfkit";
import {
  DEFAULT_COLOR_PALETTE,
  DEFAULT_LINE_GAP,
  DEFAULT_MARGINS,
  DEFAULT_TEXT_SIZES,
  SIZES,
} from "./constant";
import { renderTable, TableColumn, TableConfig, TableData } from "./tables";

export type TextOptions = Exclude<Parameters<typeof text>[1], undefined>;

export type VOptions = TextOptions & {
  fontSize?: number;
  font?: typeof PDFKitFont;
};

export type TextSizes = "normal" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type TextSizesMap = Record<
  TextSizes,
  {
    size: number;
  }
>;

export type MultiTypeTextFormatter<T> = (value: T) => string | null;

export type PDFDocOptions<
  CV extends Exclude<unknown, Function> = DefaultMultiType,
> = Omit<typeof options, ""> & {
  size?: [number, number] | keyof typeof SIZES;
  textSizes?: TextSizesMap;
  header?: string | { text: string; marginTop: number; marginBottom: number };
  // formatter?: MultiTypeTextFormatter<CV>;
};

type Options = Omit<typeof options, "margins" | "size"> & {
  textSizes?: TextSizesMap;
  size: [number, number];
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
};

export type DefaultMultiType =
  | string
  | number
  | boolean
  | Date
  | undefined
  | null;

function defaultMultiTypeTextFormatter(value: DefaultMultiType): string | null {
  if (value === undefined || value === null) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value;
  return null;
}

export class PDFDoc<
  CV = DefaultMultiType,
  V extends CV | DefaultMultiType = CV | DefaultMultiType,
> extends pdfDoc {
  options: Options;
  currentLineGap: number = DEFAULT_LINE_GAP;
  currentFontSize: number = DEFAULT_TEXT_SIZES.normal.size;
  textSizes: TextSizesMap;
  private formatter?: MultiTypeTextFormatter<CV>;
  private defaultFormatters: MultiTypeTextFormatter<DefaultMultiType> =
    defaultMultiTypeTextFormatter;
  private header:
    | { text: string; marginTop: number; marginBottom: number }
    | undefined;

  constructor(options?: PDFDocOptions<CV>) {
    super({ ...options, autoFirstPage: false });
    this.options = {
      ...options,
      size:
        typeof options?.size !== "undefined"
          ? Array.isArray(options.size)
            ? (options.size as [number, number])
            : (SIZES[options.size] as [number, number])
          : (SIZES.A4 as [number, number]),
      margins: options?.margin
        ? {
            top: options.margin,
            bottom: options.margin,
            left: options.margin,
            right: options.margin,
          }
        : options?.margins || DEFAULT_MARGINS,
    };

    this.lineGap(this.currentLineGap);
    this.fontSize(this.currentFontSize);

    this.textSizes = options?.textSizes || DEFAULT_TEXT_SIZES;
    // this.formatter = options?.formatter;

    this.header =
      typeof options?.header === "string"
        ? {
            text: options.header,
            marginTop: this.options.margins.top / 2,
            marginBottom: this.options.margins.top / 2,
          }
        : options?.header;

    // adjust margin top to include header
    if (this.header) {
      const headerHeight = this.heightOfStringWithoutTailingLineGap(
        this.header.text,
      );
      if (this.header.marginTop)
        this.options.margins.top =
          headerHeight + this.header.marginTop + this.header.marginBottom;
    }
    this.registerListeners();
    this.addPage();
  }

  registerListeners() {
    // add header if exists when add page
    this.on("pageAdded", () => {
      this.renderHeader();
    });
  }

  private renderHeader() {
    if (this.header) {
      this.fillColor(DEFAULT_COLOR_PALETTE.secondary);
      this.x = this.options.margins.left;
      this.y = this.header.marginTop;
      this.text(this.header.text);
      this.y = this.options.margins.top;
      this.fillColor(DEFAULT_COLOR_PALETTE.primary);
    }
  }

  formatText(text: V): string {
    let output: string | null = null;
    if (this.formatter) {
      output = this.formatter(text as unknown as CV);
    }
    if (output === null) {
      output = this.defaultFormatters(text as DefaultMultiType);
    }
    if (output === null) {
      throw new Error(`Cannot format text: ${text}`);
    }
    return output;
  }

  multiTypeText(text: V, opts?: VOptions): this;
  multiTypeText(text: V, x?: number, y?: number, opts?: VOptions): this;

  multiTypeText(
    text: V,
    xOrOpts?: number | VOptions,
    y?: number,
    opts?: VOptions,
  ) {
    const formattedText = this.formatText(text);
    if (typeof xOrOpts === "number") {
      this.text(formattedText, xOrOpts, y, opts);
    } else {
      this.text(formattedText, xOrOpts);
    }
    return this;
  }

  lineGap(lineGap: number): this {
    super.lineGap(lineGap);
    this.currentLineGap = lineGap;
    return this;
  }

  private _setFontSizeAndText(
    text: V,
    xOrOpts: number | TextOptions | undefined,
    y: number | undefined,
    opts: TextOptions | undefined,
    fontSize: number,
  ): this {
    const prevFontSize = this.currentFontSize;
    this.fontSize(fontSize);
    if (typeof xOrOpts === "number") {
      this.multiTypeText(text, xOrOpts, y, opts);
    } else {
      this.multiTypeText(text, xOrOpts);
    }
    this.fontSize(prevFontSize);
    return this;
  }

  h1(text: V, opts?: TextOptions): this;
  h1(text: V, x?: number, y?: number, opts?: TextOptions): this;
  h1(text: V, xOrOpts?: number | TextOptions, y?: number, opts?: TextOptions) {
    return this._setFontSizeAndText(
      text,
      xOrOpts,
      y,
      opts,
      this.textSizes.h1.size,
    );
  }

  h2(text: V, opts?: TextOptions): this;
  h2(text: V, x?: number, y?: number, opts?: TextOptions): this;
  h2(text: V, xOrOpts?: number | TextOptions, y?: number, opts?: TextOptions) {
    return this._setFontSizeAndText(
      text,
      xOrOpts,
      y,
      opts,
      this.textSizes.h2.size,
    );
  }

  h3(text: V, opts?: TextOptions): this;
  h3(text: V, x?: number, y?: number, opts?: TextOptions): this;

  h3(text: V, xOrOpts?: number | TextOptions, y?: number, opts?: TextOptions) {
    return this._setFontSizeAndText(
      text,
      xOrOpts,
      y,
      opts,
      this.textSizes.h3.size,
    );
  }

  h4(text: V, opts?: TextOptions): this;
  h4(text: V, x?: number, y?: number, opts?: TextOptions): this;

  h4(text: V, xOrOpts?: number | TextOptions, y?: number, opts?: TextOptions) {
    return this._setFontSizeAndText(
      text,
      xOrOpts,
      y,
      opts,
      this.textSizes.h4.size,
    );
  }

  h5(text: V, opts?: TextOptions): this;
  h5(text: V, x?: number, y?: number, opts?: TextOptions): this;

  h5(text: V, xOrOpts?: number | TextOptions, y?: number, opts?: TextOptions) {
    return this._setFontSizeAndText(
      text,
      xOrOpts,
      y,
      opts,
      this.textSizes.h5.size,
    );
  }

  h6(text: V, opts?: TextOptions): this;
  h6(text: V, x?: number, y?: number, opts?: TextOptions): this;

  h6(text: V, xOrOpts?: number | TextOptions, y?: number, opts?: TextOptions) {
    return this._setFontSizeAndText(
      text,
      xOrOpts,
      y,
      opts,
      this.textSizes.h6.size,
    );
  }

  normal(text: V, opts?: TextOptions): this;
  normal(text: V, x?: number, y?: number, opts?: TextOptions): this;

  normal(
    text: V,
    xOrOpts?: number | TextOptions,
    y?: number,
    opts?: TextOptions,
  ) {
    return this._setFontSizeAndText(
      text,
      xOrOpts,
      y,
      opts,
      this.textSizes.normal.size,
    );
  }

  fontSize(size: number): this {
    super.fontSize(size);
    this.currentFontSize = size;
    return this;
  }

  getMarginAdjustedZeroX() {
    return this.options.margins.left;
  }

  getMarginAddedZeroY() {
    return this.options.margins.top;
  }

  getMarginAdjustedWidth() {
    return (
      (this.page?.width ?? this.options.size[0]) -
      this.options.margins.left -
      this.options.margins.right
    );
  }

  getMarginAdjustedHeight() {
    return (
      (this.page?.height ?? this.options.size[1]) -
      (this.options.margins.top + this.options.margins.bottom)
    );
  }

  heightOfStringWithoutTailingLineGap(text: string, opts?: TextOptions) {
    return (
      this.heightOfString(text, {
        width: this.getMarginAdjustedWidth(),
        ...opts,
      }) - this.currentLineGap
    );
  }

  table<T extends readonly TableColumn<string>[]>(
    config: TableConfig<T>,
    data: TableData<T, CV>,
  ) {
    renderTable<T, CV>({ doc: this, config, data });
  }
}
