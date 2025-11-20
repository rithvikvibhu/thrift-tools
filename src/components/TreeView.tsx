import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import {
  ParsedStruct,
  ParsedList,
  ParsedSet,
  ParsedMap,
  ParsedMessage,
  getTypeName,
} from '../thrift/types';

interface TreeNodeProps {
  label: string;
  value?: any;
  children?: React.ReactNode;
  type?: string;
  byteOffset?: number;
  byteLength?: number;
  defaultExpanded?: boolean;
}

function TreeNode({
  label,
  value,
  children,
  type,
  byteOffset,
  byteLength,
  defaultExpanded = false,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = children !== undefined && children !== null;

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

  return (
    <div className='select-none'>
      <div
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
      </div>
      {hasChildren && expanded && (
        <div className='ml-6 border-l border-gray-200 pl-2'>{children}</div>
      )}
    </div>
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
}

export function TreeView({ data }: TreeViewProps) {
  if (!data) {
    return null;
  }

  if (data.type === 'message') {
    return <div className='p-4'>{renderMessage(data as ParsedMessage)}</div>;
  }

  if (data.type === 'struct') {
    return <div className='p-4'>{renderStruct(data as ParsedStruct)}</div>;
  }

  return (
    <div className='p-4'>
      <div className='text-sm text-gray-500'>Unsupported data type</div>
    </div>
  );
}
