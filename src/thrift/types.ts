export enum ThriftType {
  STOP = 0,
  VOID = 1,
  BOOL = 2,
  BYTE = 3,
  DOUBLE = 4,
  I16 = 6,
  I32 = 8,
  I64 = 10,
  STRING = 11,
  STRUCT = 12,
  MAP = 13,
  SET = 14,
  LIST = 15,
  UUID = 16,
}

export interface ParsedField {
  fieldId: number;
  fieldType: ThriftType;
  value: any;
  byteOffset: number;
  byteLength: number;
  typeName: string;
}

export interface ParsedStruct {
  type: 'struct';
  fields: ParsedField[];
  byteOffset: number;
  byteLength: number;
}

export interface ParsedList {
  type: 'list';
  elementType: ThriftType;
  elements: any[];
  byteOffset: number;
  byteLength: number;
}

export interface ParsedSet {
  type: 'set';
  elementType: ThriftType;
  elements: any[];
  byteOffset: number;
  byteLength: number;
}

export interface ParsedMap {
  type: 'map';
  keyType: ThriftType;
  valueType: ThriftType;
  entries: Array<{ key: any; value: any }>;
  byteOffset: number;
  byteLength: number;
}

export interface ParsedMessage {
  type: 'message';
  format: 'strict' | 'old';
  messageType: number;
  messageName: string;
  sequenceId: number;
  body: ParsedStruct | null;
  byteOffset: number;
  byteLength: number;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedMessage | ParsedStruct | any;
  error?: string;
  errorPosition?: number;
  totalBytes: number;
}

export function getTypeName(type: ThriftType): string {
  switch (type) {
    case ThriftType.STOP:
      return 'STOP';
    case ThriftType.VOID:
      return 'VOID';
    case ThriftType.BOOL:
      return 'BOOL';
    case ThriftType.BYTE:
      return 'BYTE';
    case ThriftType.DOUBLE:
      return 'DOUBLE';
    case ThriftType.I16:
      return 'I16';
    case ThriftType.I32:
      return 'I32';
    case ThriftType.I64:
      return 'I64';
    case ThriftType.STRING:
      return 'STRING';
    case ThriftType.STRUCT:
      return 'STRUCT';
    case ThriftType.MAP:
      return 'MAP';
    case ThriftType.SET:
      return 'SET';
    case ThriftType.LIST:
      return 'LIST';
    case ThriftType.UUID:
      return 'UUID';
    default:
      return `UNKNOWN(${type})`;
  }
}
