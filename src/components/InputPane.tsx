import { FileCode, Trash2 } from 'lucide-react';
import { InputFormat } from '../utils/inputDecoder';
import { IdlLoader, IdlPayload } from './IdlLoader';

interface InputPaneProps {
  value: string;
  onChange: (value: string) => void;
  format: InputFormat;
  onFormatChange: (format: InputFormat) => void;
  onIdlLoad: (payload: IdlPayload) => void;
  onIdlClear: () => void;
  idlFileName?: string | null;
  idlError?: string | null;
}

const SAMPLE_DATA = {
  hex: '0c00010c00020b000100000013313937383130373139323335363537343135360b000200000006e299a5efb88f000000',
  base64: 'DAABDAACCwABAAAAEzE5NzgxMDcxOTIzNTY1NzQxNTYLAAIAAAAG4pml77iPAAAA',
};

export function InputPane({
  value,
  onChange,
  format,
  onFormatChange,
  onIdlLoad,
  onIdlClear,
  idlFileName,
  idlError,
}: InputPaneProps) {
  const handleLoadSample = () => {
    onChange(SAMPLE_DATA[format]);
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className='flex flex-col h-full bg-white border-r border-gray-200'>
      <div className='flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50'>
        <div className='flex items-center gap-2'>
          <FileCode className='w-5 h-5 text-gray-600' />
          <h2 className='text-lg font-semibold text-gray-800'>Input</h2>
        </div>
        <button
          onClick={handleClear}
          className='p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors'
          title='Clear input'
        >
          <Trash2 className='w-4 h-4' />
        </button>
      </div>

      <div className='flex items-center gap-4 p-4 border-b border-gray-200'>
        <div className='flex items-center gap-2'>
          <label className='text-sm font-medium text-gray-700'>Format:</label>
          <div className='flex bg-gray-100 rounded-lg p-1'>
            <button
              onClick={() => onFormatChange('hex')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                format === 'hex'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Hex
            </button>
            <button
              onClick={() => onFormatChange('base64')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                format === 'base64'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Base64
            </button>
          </div>
        </div>
        <button
          onClick={handleLoadSample}
          className='text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors'
        >
          Load Sample
        </button>
      </div>

      <div className='flex-1 p-4'>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${
            format === 'hex' ? 'hexadecimal' : 'base64'
          } encoded Thrift binary data...`}
          className='w-full h-full p-3 font-mono text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          spellCheck={false}
        />
      </div>

      <div className='p-4 border-t border-gray-200 bg-gray-50'>
        <IdlLoader
          fileName={idlFileName}
          error={idlError}
          onLoad={onIdlLoad}
          onClear={onIdlClear}
        />
      </div>
    </div>
  );
}
