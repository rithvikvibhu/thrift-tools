import { useState } from 'react';
import {
  Eye,
  Code2,
  AlertCircle,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { ParseResult } from '../thrift/types';
import { TreeView } from './TreeView';
import { HexDump } from './HexDump';
import { IdlMatchResult } from '../thrift/idlSchema';

interface OutputPaneProps {
  result: ParseResult | null;
  buffer: Uint8Array | null;
  idlAvailable: boolean;
  useIdl: boolean;
  onToggleIdl: (value: boolean) => void;
  idlMatch: IdlMatchResult | null;
  idlFileName?: string | null;
}

type ViewMode = 'tree' | 'hex';

export function OutputPane({
  result,
  buffer,
  idlAvailable,
  useIdl,
  onToggleIdl,
  idlMatch,
  idlFileName,
}: OutputPaneProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');

  const header = (
    <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-4 border-b border-gray-200 bg-gray-50'>
      <div className='flex items-center gap-2'>
        <Eye className='w-5 h-5 text-gray-600' />
        <h2 className='text-lg font-semibold text-gray-800'>Output</h2>
      </div>
      <div className='flex flex-wrap items-center gap-2 justify-end'>
        <div className='flex bg-gray-100 rounded-lg p-1'>
          <button
            onClick={() => setViewMode('tree')}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              viewMode === 'tree'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tree View
          </button>
          <button
            onClick={() => setViewMode('hex')}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              viewMode === 'hex'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Hex Dump
          </button>
        </div>
        <button
          type='button'
          onClick={() => onToggleIdl(!useIdl)}
          disabled={!idlAvailable}
          aria-pressed={useIdl}
          className={`flex items-center gap-2 px-3 py-1 text-sm font-medium rounded border transition-colors ${
            useIdl
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
          } ${!idlAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {useIdl ? (
            <ToggleRight className='w-4 h-4' />
          ) : (
            <ToggleLeft className='w-4 h-4' />
          )}
          {useIdl ? 'Using IDL' : 'Use IDL'}
        </button>
      </div>
    </div>
  );

  if (!result) {
    return (
      <div className='flex flex-col h-full bg-gray-50'>
        {header}
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-center text-gray-400'>
            <Code2 className='w-16 h-16 mx-auto mb-4 opacity-50' />
            <p className='text-lg font-medium'>No data parsed yet</p>
            <p className='text-sm mt-2'>
              Enter Thrift binary data and click Parse
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderIdlStatus = () => {
    if (!idlAvailable) {
      return null;
    }

    if (!useIdl) {
      return (
        <div className='px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600'>
          {idlFileName ? `IDL loaded (${idlFileName}).` : 'IDL loaded.'} Toggle
          “Use IDL” to annotate fields.
        </div>
      );
    }

    if (!result.success) {
      return (
        <div className='px-4 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-700'>
          IDL annotations will appear once the binary parses successfully.
        </div>
      );
    }

    const structMatch = idlMatch?.structMatch;
    if (!structMatch) {
      return (
        <div className='px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-700'>
          No matching struct definition found in the loaded IDL.
        </div>
      );
    }

    const coverage = `${structMatch.matchedFields}/${structMatch.schemaFieldCount}`;

    return (
      <div className='px-4 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-800 flex flex-wrap items-center gap-2'>
        Matched struct{' '}
        <span className='font-semibold'>{structMatch.structName}</span>(
        {coverage} fields)
        {idlMatch?.context?.kind === 'message' && idlMatch.context.name && (
          <span className='text-blue-700'>
            from message “{idlMatch.context.name}”
          </span>
        )}
      </div>
    );
  };

  return (
    <div className='flex flex-col h-full bg-white'>
      {header}
      {renderIdlStatus()}
      {result.success ? (
        <>
          <div className='px-4 py-3 bg-green-50 border-b border-green-200 flex items-center gap-2'>
            <CheckCircle2 className='w-4 h-4 text-green-600' />
            <span className='text-sm text-green-800 font-medium'>
              Successfully parsed {result.totalBytes} bytes
            </span>
          </div>
          <div className='flex-1 overflow-auto'>
            {viewMode === 'tree' ? (
              <TreeView
                data={result.data}
                buffer={buffer}
                schemaMatch={useIdl ? idlMatch?.structMatch ?? null : null}
              />
            ) : (
              buffer && (
                <div className='p-4'>
                  <HexDump buffer={buffer} />
                </div>
              )
            )}
          </div>
        </>
      ) : (
        <>
          <div className='px-4 py-3 bg-red-50 border-b border-red-200 flex items-start gap-2'>
            <AlertCircle className='w-4 h-4 text-red-600 mt-0.5 flex-shrink-0' />
            <div className='flex-1'>
              <p className='text-sm text-red-800 font-medium'>Parse Error</p>
              <p className='text-sm text-red-700 mt-1'>{result.error}</p>
              {result.errorPosition !== undefined && (
                <p className='text-xs text-red-600 mt-1'>
                  Error at byte offset: {result.errorPosition} (0x
                  {result.errorPosition.toString(16).padStart(4, '0')})
                </p>
              )}
            </div>
          </div>
          {buffer && (
            <div className='flex-1 overflow-auto p-4'>
              <div className='mb-4'>
                <h3 className='text-sm font-semibold text-gray-700 mb-2'>
                  Hex Dump (up to error position)
                </h3>
                <p className='text-xs text-gray-500 mb-3'>
                  Showing raw bytes. Error occurred at offset{' '}
                  {result.errorPosition || 0}.
                </p>
              </div>
              <HexDump buffer={buffer} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
