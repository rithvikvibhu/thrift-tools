import { useState, useRef, DragEvent } from 'react';
import { Upload, FileText } from 'lucide-react';

export interface IdlPayload {
  name: string;
  content: string;
}

interface IdlLoaderProps {
  fileName?: string | null;
  error?: string | null;
  onLoad: (payload: IdlPayload) => void;
  onClear?: () => void;
}

export function IdlLoader({
  fileName,
  error,
  onLoad,
  onClear,
}: IdlLoaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasFile = Boolean(fileName);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      onLoad({
        name: file.name,
        content,
      });
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const baseDropClasses = hasFile
    ? 'border rounded-md px-3 py-3 flex items-center justify-between text-sm'
    : 'border-2 border-dashed rounded-lg p-4 flex flex-col items-center gap-2 text-sm';

  const dropClasses = `${baseDropClasses} transition-colors cursor-pointer ${
    isDragging
      ? 'border-blue-400 bg-blue-50'
      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
  }`;

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2 text-sm font-medium text-gray-700'>
        <FileText className='w-4 h-4 text-gray-500' />
        Thrift IDL
      </div>
      <label
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={dropClasses}
      >
        <input
          ref={fileInputRef}
          type='file'
          accept='.thrift,.idl,.txt'
          className='hidden'
          onChange={(event) => handleFiles(event.target.files)}
        />
        {hasFile ? (
          <>
            <div className='flex items-center gap-3 text-gray-700'>
              <FileText className='w-5 h-5 text-blue-600' />
              <div className='flex flex-col leading-tight'>
                <span className='text-sm font-semibold'>{fileName}</span>
                <span className='text-xs text-gray-500'>
                  Drop a new file or click to replace
                </span>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={(event) => {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }}
                className='px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700'
              >
                Replace
              </button>
              {onClear && (
                <button
                  type='button'
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onClear();
                  }}
                  className='px-3 py-1 text-xs text-gray-500 hover:text-gray-700'
                >
                  Clear
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <Upload className='w-5 h-5 text-gray-500' />
            <span className='text-gray-700 text-center'>
              Drag & drop a .thrift file here or{' '}
              <span className='text-blue-600 underline'>browse</span>
            </span>
            <button
              type='button'
              onClick={(event) => {
                event.preventDefault();
                fileInputRef.current?.click();
              }}
              className='px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700'
            >
              Choose File
            </button>
            <span className='text-xs text-gray-400'>
              No IDL loaded. Optional but helps annotate output.
            </span>
          </>
        )}
      </label>
      {error && (
        <div className='text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2'>
          {error}
        </div>
      )}
    </div>
  );
}
