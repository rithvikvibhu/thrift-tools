import {
  parse,
  SyntaxType,
  ThriftDocument,
  ThriftErrors,
  StructDefinition,
  UnionDefinition,
  ExceptionDefinition,
  FunctionType,
  BaseType,
} from '@creditkarma/thrift-parser';
import { ParsedStruct, ParsedMessage, ParsedField, ThriftType } from './types';

export interface IdlSchema {
  structs: Record<string, SchemaStruct>;
}

export interface SchemaStruct {
  name: string;
  fields: SchemaField[];
}

export interface SchemaField {
  id: number | null;
  name: string;
  fieldType: FieldTypeInfo;
}

export type IdlSchemaParseResult =
  | { success: true; schema: IdlSchema; warnings?: string[] }
  | { success: false; error: string };

export interface FieldTypeInfo {
  kind: 'primitive' | 'identifier' | 'list' | 'set' | 'map' | 'unknown';
  thriftType: ThriftType | null;
  displayName: string;
  referenceName?: string;
  keyType?: FieldTypeInfo;
  valueType?: FieldTypeInfo;
}

export interface MatchedFieldDetail {
  fieldId: number;
  fieldName?: string;
  expectedTypeLabel?: string;
  expectedThriftType?: ThriftType | null;
  typeMatch?: boolean;
  notes?: string;
  nestedMatch?: MatchedStruct;
}

export interface MatchedStruct {
  structName: string;
  matchedFields: number;
  schemaFieldCount: number;
  fieldCount: number;
  score: number;
  fields: Record<number, MatchedFieldDetail>;
}

export interface IdlMatchResult {
  structMatch: MatchedStruct | null;
  context?: {
    kind: 'message' | 'struct';
    name?: string;
  };
}

export function parseIdlSchema(source: string): IdlSchemaParseResult {
  try {
    const result = parse(source);

    if (isThriftErrors(result)) {
      const firstError = result.errors[0];
      const message = firstError
        ? `${firstError.message} (line ${firstError.loc.start.line})`
        : 'Unknown IDL parse error';
      return {
        success: false,
        error: message,
      };
    }

    const schema = buildSchema(result);
    return { success: true, schema };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to parse Thrift IDL',
    };
  }
}

export function matchParseResultToSchema(
  data: ParsedStruct | ParsedMessage,
  schema: IdlSchema
): IdlMatchResult | null {
  if (!data) {
    return null;
  }

  if (data.type === 'message') {
    const structMatch = data.body
      ? matchStructToSchema(data.body, schema)
      : null;
    return {
      structMatch,
      context: {
        kind: 'message',
        name: data.messageName,
      },
    };
  }

  if (data.type === 'struct') {
    return {
      structMatch: matchStructToSchema(data, schema),
      context: {
        kind: 'struct',
      },
    };
  }

  return null;
}

export function matchStructToSchema(
  struct: ParsedStruct,
  schema: IdlSchema
): MatchedStruct | null {
  let bestMatch: MatchedStruct | null = null;

  for (const structName of Object.keys(schema.structs)) {
    const schemaStruct = schema.structs[structName];
    const match = matchStructAgainstDefinition(struct, schemaStruct, schema, {
      visited: new Set(),
    });

    if (!match || match.matchedFields === 0) {
      continue;
    }

    if (!bestMatch || match.score > bestMatch.score) {
      bestMatch = match;
    }
  }

  return bestMatch;
}

function matchStructAgainstDefinition(
  struct: ParsedStruct,
  schemaStruct: SchemaStruct,
  schema: IdlSchema,
  context: { visited: Set<string> }
): MatchedStruct | null {
  const schemaFieldMap = new Map<number, SchemaField>();
  for (const field of schemaStruct.fields) {
    if (field.id !== null) {
      schemaFieldMap.set(field.id, field);
    }
  }

  if (schemaFieldMap.size === 0) {
    return null;
  }

  const matchedFields: Record<number, MatchedFieldDetail> = {};
  let matchedCount = 0;
  let typeMatches = 0;
  let typeMismatches = 0;

  for (const field of struct.fields) {
    const schemaField = schemaFieldMap.get(field.fieldId);
    if (!schemaField) {
      continue;
    }

    matchedCount += 1;
    const typeMatch = compareFieldTypes(field, schemaField.fieldType);
    if (typeMatch) {
      typeMatches += 1;
    } else {
      typeMismatches += 1;
    }

    let nestedMatch: MatchedStruct | undefined;
    if (
      schemaField.fieldType.kind === 'identifier' &&
      field.value &&
      typeof field.value === 'object' &&
      (field.value as ParsedStruct).type === 'struct'
    ) {
      const nestedStructName = schemaField.fieldType.referenceName;
      if (
        nestedStructName &&
        schema.structs[nestedStructName] &&
        !context.visited.has(nestedStructName)
      ) {
        context.visited.add(nestedStructName);
        nestedMatch = matchStructAgainstDefinition(
          field.value as ParsedStruct,
          schema.structs[nestedStructName],
          schema,
          { visited: new Set(context.visited) }
        ) as MatchedStruct | undefined;
      }
    }

    matchedFields[field.fieldId] = {
      fieldId: field.fieldId,
      fieldName: schemaField.name,
      expectedTypeLabel: schemaField.fieldType.displayName,
      expectedThriftType: schemaField.fieldType.thriftType,
      typeMatch,
      nestedMatch,
    };
  }

  if (matchedCount === 0) {
    return null;
  }

  const score = matchedCount * 10 + typeMatches * 5 - typeMismatches * 2;

  return {
    structName: schemaStruct.name,
    matchedFields: matchedCount,
    schemaFieldCount: schemaFieldMap.size,
    fieldCount: struct.fields.length,
    score,
    fields: matchedFields,
  };
}

function compareFieldTypes(
  parsedField: ParsedField,
  schemaFieldType: FieldTypeInfo
): boolean {
  if (schemaFieldType.thriftType === null) {
    return true;
  }
  return parsedField.fieldType === schemaFieldType.thriftType;
}

function buildSchema(document: ThriftDocument): IdlSchema {
  const structs: Record<string, SchemaStruct> = {};

  for (const statement of document.body) {
    if (isStructLike(statement)) {
      const schemaStruct: SchemaStruct = {
        name: statement.name.value,
        fields: statement.fields.map((field) => ({
          id: field.fieldID ? field.fieldID.value : null,
          name: field.name.value,
          fieldType: toFieldTypeInfo(field.fieldType),
        })),
      };
      structs[schemaStruct.name] = schemaStruct;
    }
  }

  return { structs };
}

function toFieldTypeInfo(fieldType: FunctionType): FieldTypeInfo {
  switch (fieldType.type) {
    case SyntaxType.Identifier:
      return {
        kind: 'identifier',
        thriftType: ThriftType.STRUCT,
        displayName: fieldType.value,
        referenceName: fieldType.value,
      };
    case SyntaxType.SetType:
      return {
        kind: 'set',
        thriftType: ThriftType.SET,
        displayName: `set<${toFieldTypeInfo(fieldType.valueType).displayName}>`,
        valueType: toFieldTypeInfo(fieldType.valueType),
      };
    case SyntaxType.ListType:
      return {
        kind: 'list',
        thriftType: ThriftType.LIST,
        displayName: `list<${
          toFieldTypeInfo(fieldType.valueType).displayName
        }>`,
        valueType: toFieldTypeInfo(fieldType.valueType),
      };
    case SyntaxType.MapType: {
      const keyType = toFieldTypeInfo(fieldType.keyType);
      const valueType = toFieldTypeInfo(fieldType.valueType);
      return {
        kind: 'map',
        thriftType: ThriftType.MAP,
        displayName: `map<${keyType.displayName}, ${valueType.displayName}>`,
        keyType,
        valueType,
      };
    }
    case SyntaxType.VoidKeyword:
      return {
        kind: 'primitive',
        thriftType: ThriftType.VOID,
        displayName: 'void',
      };
    default:
      return {
        kind: 'primitive',
        thriftType: toPrimitiveThriftType(fieldType as BaseType),
        displayName: primitiveDisplayName(fieldType as BaseType),
      };
  }
}

function primitiveDisplayName(type: BaseType): string {
  switch (type.type) {
    case SyntaxType.StringKeyword:
      return 'string';
    case SyntaxType.BinaryKeyword:
      return 'binary';
    case SyntaxType.BoolKeyword:
      return 'bool';
    case SyntaxType.ByteKeyword:
    case SyntaxType.I8Keyword:
      return 'byte';
    case SyntaxType.I16Keyword:
      return 'i16';
    case SyntaxType.I32Keyword:
      return 'i32';
    case SyntaxType.I64Keyword:
      return 'i64';
    case SyntaxType.DoubleKeyword:
      return 'double';
    default:
      return type.type;
  }
}

function toPrimitiveThriftType(type: BaseType): ThriftType | null {
  switch (type.type) {
    case SyntaxType.StringKeyword:
    case SyntaxType.BinaryKeyword:
      return ThriftType.STRING;
    case SyntaxType.BoolKeyword:
      return ThriftType.BOOL;
    case SyntaxType.ByteKeyword:
    case SyntaxType.I8Keyword:
      return ThriftType.BYTE;
    case SyntaxType.I16Keyword:
      return ThriftType.I16;
    case SyntaxType.I32Keyword:
      return ThriftType.I32;
    case SyntaxType.I64Keyword:
      return ThriftType.I64;
    case SyntaxType.DoubleKeyword:
      return ThriftType.DOUBLE;
    default:
      return null;
  }
}

function isStructLike(
  statement: any
): statement is StructDefinition | UnionDefinition | ExceptionDefinition {
  return (
    statement.type === SyntaxType.StructDefinition ||
    statement.type === SyntaxType.UnionDefinition ||
    statement.type === SyntaxType.ExceptionDefinition
  );
}

function isThriftErrors(
  node: ThriftDocument | ThriftErrors
): node is ThriftErrors {
  return node.type === SyntaxType.ThriftErrors;
}
