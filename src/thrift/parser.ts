import {
  ThriftType,
  ParsedField,
  ParsedStruct,
  ParsedList,
  ParsedSet,
  ParsedMap,
  ParsedMessage,
  ParseResult,
  getTypeName,
} from './types';

export class ThriftParser {
  private buffer: Uint8Array;
  private position: number;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.position = 0;
  }

  parse(): ParseResult {
    try {
      this.position = 0;

      if (this.buffer.length === 0) {
        return {
          success: false,
          error: 'Empty buffer',
          totalBytes: 0,
        };
      }

      const data = this.tryParseMessage() || this.parseStruct();

      return {
        success: true,
        data,
        totalBytes: this.buffer.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorPosition: this.position,
        totalBytes: this.buffer.length,
      };
    }
  }

  private tryParseMessage(): ParsedMessage | null {
    const startPos = this.position;

    try {
      const versionAndType = this.readI32();

      if ((versionAndType & 0xffff0000) === 0x80010000) {
        const messageType = versionAndType & 0xff;
        const messageName = this.readString();
        const sequenceId = this.readI32();
        const body = this.parseStruct();

        return {
          type: 'message',
          format: 'strict',
          messageType,
          messageName,
          sequenceId,
          body,
          byteOffset: startPos,
          byteLength: this.position - startPos,
        };
      } else {
        this.position = startPos;
        const messageName = this.readString();
        const messageType = this.readByte();
        const sequenceId = this.readI32();
        const body = this.parseStruct();

        return {
          type: 'message',
          format: 'old',
          messageType,
          messageName,
          sequenceId,
          body,
          byteOffset: startPos,
          byteLength: this.position - startPos,
        };
      }
    } catch {
      this.position = startPos;
      return null;
    }
  }

  private parseStruct(): ParsedStruct {
    const startPos = this.position;
    const fields: ParsedField[] = [];

    while (true) {
      const fieldType = this.readByte();

      if (fieldType === ThriftType.STOP) {
        break;
      }

      const fieldId = this.readI16();
      const fieldStartPos = this.position;
      const value = this.readValue(fieldType);
      const fieldLength = this.position - fieldStartPos;

      fields.push({
        fieldId,
        fieldType,
        value,
        byteOffset: fieldStartPos,
        byteLength: fieldLength,
        typeName: getTypeName(fieldType),
      });
    }

    return {
      type: 'struct',
      fields,
      byteOffset: startPos,
      byteLength: this.position - startPos,
    };
  }

  private readValue(type: ThriftType): any {
    switch (type) {
      case ThriftType.BOOL:
        return this.readBool();
      case ThriftType.BYTE:
        return this.readByte();
      case ThriftType.I16:
        return this.readI16();
      case ThriftType.I32:
        return this.readI32();
      case ThriftType.I64:
        return this.readI64();
      case ThriftType.DOUBLE:
        return this.readDouble();
      case ThriftType.STRING:
        return this.readString();
      case ThriftType.STRUCT:
        return this.parseStruct();
      case ThriftType.LIST:
        return this.parseList();
      case ThriftType.SET:
        return this.parseSet();
      case ThriftType.MAP:
        return this.parseMap();
      case ThriftType.UUID:
        return this.readUUID();
      default:
        throw new Error(`Unknown type: ${type} at position ${this.position}`);
    }
  }

  private parseList(): ParsedList {
    const startPos = this.position;
    const elementType = this.readByte();
    const size = this.readI32();

    if (size < 0 || size > 2147483647) {
      throw new Error(`Invalid list size: ${size}`);
    }

    const elements: any[] = [];
    for (let i = 0; i < size; i++) {
      elements.push(this.readValue(elementType));
    }

    return {
      type: 'list',
      elementType,
      elements,
      byteOffset: startPos,
      byteLength: this.position - startPos,
    };
  }

  private parseSet(): ParsedSet {
    const startPos = this.position;
    const elementType = this.readByte();
    const size = this.readI32();

    if (size < 0 || size > 2147483647) {
      throw new Error(`Invalid set size: ${size}`);
    }

    const elements: any[] = [];
    for (let i = 0; i < size; i++) {
      elements.push(this.readValue(elementType));
    }

    return {
      type: 'set',
      elementType,
      elements,
      byteOffset: startPos,
      byteLength: this.position - startPos,
    };
  }

  private parseMap(): ParsedMap {
    const startPos = this.position;
    const keyType = this.readByte();
    const valueType = this.readByte();
    const size = this.readI32();

    if (size < 0 || size > 2147483647) {
      throw new Error(`Invalid map size: ${size}`);
    }

    const entries: Array<{ key: any; value: any }> = [];
    for (let i = 0; i < size; i++) {
      const key = this.readValue(keyType);
      const value = this.readValue(valueType);
      entries.push({ key, value });
    }

    return {
      type: 'map',
      keyType,
      valueType,
      entries,
      byteOffset: startPos,
      byteLength: this.position - startPos,
    };
  }

  private readBool(): boolean {
    return this.readByte() !== 0;
  }

  private readByte(): number {
    if (this.position >= this.buffer.length) {
      throw new Error(`Unexpected end of buffer at position ${this.position}`);
    }
    return this.buffer[this.position++];
  }

  private readI16(): number {
    if (this.position + 2 > this.buffer.length) {
      throw new Error(`Unexpected end of buffer at position ${this.position}`);
    }
    const value =
      (this.buffer[this.position] << 8) | this.buffer[this.position + 1];
    this.position += 2;
    return value > 0x7fff ? value - 0x10000 : value;
  }

  private readI32(): number {
    if (this.position + 4 > this.buffer.length) {
      throw new Error(`Unexpected end of buffer at position ${this.position}`);
    }
    const value =
      (this.buffer[this.position] << 24) |
      (this.buffer[this.position + 1] << 16) |
      (this.buffer[this.position + 2] << 8) |
      this.buffer[this.position + 3];
    this.position += 4;
    return value | 0;
  }

  private readI64(): bigint {
    if (this.position + 8 > this.buffer.length) {
      throw new Error(`Unexpected end of buffer at position ${this.position}`);
    }
    let value = 0n;
    for (let i = 0; i < 8; i++) {
      value = (value << 8n) | BigInt(this.buffer[this.position + i]);
    }
    this.position += 8;
    return value;
  }

  private readDouble(): number {
    const int64 = this.readI64();
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigInt64(0, int64, false);
    return view.getFloat64(0, false);
  }

  private readString(): string {
    const length = this.readI32();

    if (length < 0) {
      throw new Error(`Invalid string length: ${length}`);
    }

    if (this.position + length > this.buffer.length) {
      throw new Error(`Unexpected end of buffer at position ${this.position}`);
    }

    const bytes = this.buffer.slice(this.position, this.position + length);
    this.position += length;

    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return `<binary data: ${length} bytes>`;
    }
  }

  private readUUID(): string {
    if (this.position + 16 > this.buffer.length) {
      throw new Error(`Unexpected end of buffer at position ${this.position}`);
    }

    const bytes = Array.from(
      this.buffer.slice(this.position, this.position + 16)
    );
    this.position += 16;

    const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}
