import { createContext, useContext, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ContextMenu } from '@base-ui-components/react/context-menu';
import {
  ParsedStruct,
  ParsedList,
  ParsedSet,
  ParsedMap,
  ParsedMessage,
  getTypeName,
} from '../thrift/types';

interface TreeContextValue {
  buffer: Uint8Array | null;
}

const TreeContext = createContext<TreeContextValue>({ buffer: null });

function useTreeContext() {
  return useContext(TreeContext);
}

interface TreeNodeProps {
  label: string;
  value?: any;
  children?: React.ReactNode;
  type?: string;
  byteOffset?: number;
  byteLength?: number;
  defaultExpanded?: boolean;
  isField?: boolean;
}

function TreeNode({
  label,
  value,
  children,
  type,
  byteOffset,
  byteLength,
  defaultExpanded = false,
  isField = false,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = children !== undefined && children !== null;
  const { buffer } = useTreeContext();

  const canCopyHex =
    buffer && byteOffset !== undefined && byteLength !== undefined;
  const valueString =
    isField && value !== undefined && value !== null
      ? formatValueAsString(value)
      : null;
  const valueHex =
    isField && value !== undefined && value !== null
      ? formatValueAsHex(value)
      : null;
  const hasMenu = Boolean(canCopyHex || valueHex || valueString);
  const showValueActions = Boolean(valueHex || valueString);

  const typeColors: { [key: string]: string } = {
    BOOL: 'text-purple-600',
    BYTE: 'text-orange-600',
    I16: 'text-blue-600',
    I32: 'text-blue-600',
    I64: 'text-blue-600',
    DOUBLE: 'text-green-600',
    STRING: 'text-red-600',
    STRUCT: 'text-gray-700',
    LIST: 'text-teal-600',
    SET: 'text-teal-600',
    MAP: 'text-cyan-600',
    UUID: 'text-pink-600',
  };

  const typeColor = type
    ? typeColors[type] || 'text-gray-600'
    : 'text-gray-600';

  const copyBytesAsHex = () => {
    if (!canCopyHex || !buffer) {
      return;
    }
    const slice = buffer.slice(byteOffset!, byteOffset! + byteLength!);
    copyText(bytesToHex(slice));
  };

  const copyValueHex = () => {
    if (valueHex) {
      copyText(valueHex);
    }
  };

  const copyValueString = () => {
    if (valueString) {
      copyText(valueString);
    }
  };

  return (
    <ContextMenu.Root>
      <div className='select-none'>
        <ContextMenu.Trigger
          className='flex items-center gap-2 py-1 hover:bg-gray-50 rounded px-2 cursor-pointer group'
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          <span className='flex-shrink-0 w-4'>
            {hasChildren &&
              (expanded ? (
                <ChevronDown className='w-4 h-4 text-gray-500' />
              ) : (
                <ChevronRight className='w-4 h-4 text-gray-500' />
              ))}
          </span>
          <span className='font-medium text-gray-800'>{label}</span>
          {type && (
            <span
              className={`text-xs font-semibold ${typeColor} bg-gray-100 px-2 py-0.5 rounded`}
            >
              {type}
            </span>
          )}
          {value !== undefined && value !== null && (
            <span className='text-gray-600 font-mono text-sm'>
              ={' '}
              {typeof value === 'bigint'
                ? value.toString()
                : JSON.stringify(value)}
            </span>
          )}
          {byteOffset !== undefined && (
            <span className='ml-auto text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity'>
              @{byteOffset} ({byteLength} bytes)
            </span>
          )}
        </ContextMenu.Trigger>
        {hasChildren && expanded && (
          <div className='ml-6 border-l border-gray-200 pl-2'>{children}</div>
        )}
      </div>
      {hasMenu && (
        <ContextMenu.Portal>
          <ContextMenu.Positioner className='outline-none'>
            <ContextMenu.Popup className='origin-[var(--transform-origin)] rounded-md bg-[canvas] py-1 text-gray-900 shadow-lg shadow-gray-200 outline outline-1 outline-gray-200 transition-[opacity] data-[ending-style]:opacity-0 dark:shadow-none dark:-outline-offset-1 dark:outline-gray-300'>
              {canCopyHex && (
                <ContextMenu.Item
                  className='flex cursor-default py-2 pr-8 pl-4 text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-gray-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-gray-900'
                  onClick={copyBytesAsHex}
                >
                  Copy bytes as hex
                </ContextMenu.Item>
              )}
              {canCopyHex && showValueActions && (
                <ContextMenu.Separator className='mx-4 my-1.5 h-px bg-gray-200' />
              )}
              {valueHex && (
                <ContextMenu.Item
                  className='flex cursor-default py-2 pr-8 pl-4 text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-gray-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-gray-900'
                  onClick={copyValueHex}
                >
                  Copy value as hex
                </ContextMenu.Item>
              )}
              {valueString && (
                <ContextMenu.Item
                  className='flex cursor-default py-2 pr-8 pl-4 text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-gray-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-gray-900'
                  onClick={copyValueString}
                >
                  Copy value as string
                </ContextMenu.Item>
              )}
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      )}
    </ContextMenu.Root>
  );
}

function renderValue(value: any, index?: number): React.ReactNode {
  if (value && typeof value === 'object') {
    if ('type' in value) {
      if (value.type === 'struct') {
        return renderStruct(value as ParsedStruct, index);
      } else if (value.type === 'list') {
        return renderList(value as ParsedList, index);
      } else if (value.type === 'set') {
        return renderSet(value as ParsedSet, index);
      } else if (value.type === 'map') {
        return renderMap(value as ParsedMap, index);
      }
    }
  }
  return null;
}

function renderStruct(struct: ParsedStruct, index?: number): React.ReactNode {
  const label = index !== undefined ? `[${index}]` : 'Struct';

  return (
    <TreeNode
      label={label}
      type='STRUCT'
      byteOffset={struct.byteOffset}
      byteLength={struct.byteLength}
      defaultExpanded={true}
    >
      {struct.fields.map((field, idx) => (
        <TreeNode
          key={idx}
          label={`Field ${field.fieldId}`}
          type={field.typeName}
          value={
            typeof field.value === 'object' && field.value?.type
              ? undefined
              : field.value
          }
          byteOffset={field.byteOffset}
          byteLength={field.byteLength}
          defaultExpanded={true}
          isField={true}
        >
          {renderValue(field.value)}
        </TreeNode>
      ))}
      {struct.fields.length === 0 && (
        <div className='text-sm text-gray-400 italic py-1 px-2'>
          Empty struct
        </div>
      )}
    </TreeNode>
  );
}

function renderList(list: ParsedList, index?: number): React.ReactNode {
  const label = index !== undefined ? `[${index}]` : 'List';

  return (
    <TreeNode
      label={`${label} (${list.elements.length} items)`}
      type={`LIST<${getTypeName(list.elementType)}>`}
      byteOffset={list.byteOffset}
      byteLength={list.byteLength}
      defaultExpanded={true}
    >
      {list.elements.map((element, idx) => {
        const elementValue = renderValue(element, idx);
        if (elementValue) {
          return <div key={idx}>{elementValue}</div>;
        }
        return (
          <TreeNode
            key={idx}
            label={`[${idx}]`}
            value={element}
            type={getTypeName(list.elementType)}
          />
        );
      })}
    </TreeNode>
  );
}

function renderSet(set: ParsedSet, index?: number): React.ReactNode {
  const label = index !== undefined ? `[${index}]` : 'Set';

  return (
    <TreeNode
      label={`${label} (${set.elements.length} items)`}
      type={`SET<${getTypeName(set.elementType)}>`}
      byteOffset={set.byteOffset}
      byteLength={set.byteLength}
      defaultExpanded={true}
    >
      {set.elements.map((element, idx) => {
        const elementValue = renderValue(element, idx);
        if (elementValue) {
          return <div key={idx}>{elementValue}</div>;
        }
        return (
          <TreeNode
            key={idx}
            label={`[${idx}]`}
            value={element}
            type={getTypeName(set.elementType)}
          />
        );
      })}
    </TreeNode>
  );
}

function renderMap(map: ParsedMap, index?: number): React.ReactNode {
  const label = index !== undefined ? `[${index}]` : 'Map';

  return (
    <TreeNode
      label={`${label} (${map.entries.length} entries)`}
      type={`MAP<${getTypeName(map.keyType)}, ${getTypeName(map.valueType)}>`}
      byteOffset={map.byteOffset}
      byteLength={map.byteLength}
      defaultExpanded={true}
    >
      {map.entries.map((entry, idx) => {
        const keyStr =
          typeof entry.key === 'bigint'
            ? entry.key.toString()
            : JSON.stringify(entry.key);
        const valueNode = renderValue(entry.value, idx);

        if (valueNode) {
          return (
            <TreeNode key={idx} label={`[${keyStr}]`}>
              {valueNode}
            </TreeNode>
          );
        }

        return (
          <TreeNode
            key={idx}
            label={`[${keyStr}]`}
            value={entry.value}
            type={getTypeName(map.valueType)}
          />
        );
      })}
    </TreeNode>
  );
}

function renderMessage(message: ParsedMessage): React.ReactNode {
  const messageTypeNames: { [key: number]: string } = {
    1: 'CALL',
    2: 'REPLY',
    3: 'EXCEPTION',
    4: 'ONEWAY',
  };

  return (
    <TreeNode
      label='Message'
      type={`${message.format.toUpperCase()}`}
      byteOffset={message.byteOffset}
      byteLength={message.byteLength}
      defaultExpanded={true}
    >
      <TreeNode
        label='Type'
        value={messageTypeNames[message.messageType] || message.messageType}
      />
      <TreeNode label='Name' value={message.messageName} />
      <TreeNode label='Sequence ID' value={message.sequenceId} />
      {message.body && (
        <TreeNode label='Body' defaultExpanded={true}>
          {renderStruct(message.body)}
        </TreeNode>
      )}
    </TreeNode>
  );
}

interface TreeViewProps {
  data: any;
  buffer?: Uint8Array | null;
}

export function TreeView({ data, buffer }: TreeViewProps) {
  if (!data) {
    return null;
  }

  let content: React.ReactNode = null;

  if (data.type === 'message') {
    content = <div className='p-4'>{renderMessage(data as ParsedMessage)}</div>;
  } else if (data.type === 'struct') {
    content = <div className='p-4'>{renderStruct(data as ParsedStruct)}</div>;
  } else {
    content = (
      <div className='p-4'>
        <div className='text-sm text-gray-500'>Unsupported data type</div>
      </div>
    );
  }

  return (
    <TreeContext.Provider value={{ buffer: buffer ?? null }}>
      {content}
    </TreeContext.Provider>
  );
}

const textEncoder = new TextEncoder();

function bytesToHex(bytes: ArrayLike<number>): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function formatValueAsString(value: any): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function formatValueAsHex(value: any): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    return value.toString(16);
  }

  if (typeof value === 'bigint') {
    return value.toString(16);
  }

  if (typeof value === 'boolean') {
    return value ? '01' : '00';
  }

  if (typeof value === 'string') {
    return bytesToHex(textEncoder.encode(value));
  }

  if (value instanceof Uint8Array) {
    return bytesToHex(value);
  }

  try {
    return bytesToHex(textEncoder.encode(JSON.stringify(value)));
  } catch {
    return null;
  }
}

function copyText(text: string) {
  if (!navigator?.clipboard) {
    return;
  }

  navigator.clipboard.writeText(text).catch((error) => {
    console.error('Failed to copy text', error);
  });
}
