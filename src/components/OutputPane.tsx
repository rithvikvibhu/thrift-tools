import { useState } from 'react';
import { Eye, Code2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ParseResult } from '../thrift/types';
import { TreeView } from './TreeView';
import { HexDump } from './HexDump';

interface OutputPaneProps {
  result: ParseResult | null;
  buffer: Uint8Array | null;
}

type ViewMode = 'tree' | 'hex';

export function OutputPane({ result, buffer }: OutputPaneProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');

  if (!result) {
    return (
      <div className='flex flex-col h-full bg-gray-50'>
        <div className='flex items-center justify-between p-4 border-b border-gray-200 bg-white'>
          <div className='flex items-center gap-2'>
            <Eye className='w-5 h-5 text-gray-600' />
            <h2 className='text-lg font-semibold text-gray-800'>Output</h2>
          </div>
        </div>
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

  return (
    <div className='flex flex-col h-full bg-white'>
      <div className='flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50'>
        <div className='flex items-center gap-2'>
          <Eye className='w-5 h-5 text-gray-600' />
          <h2 className='text-lg font-semibold text-gray-800'>Output</h2>
        </div>
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
      </div>

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
              <TreeView data={result.data} />
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
