import { useCallback, useEffect, useState } from 'react';
import { Binary } from 'lucide-react';
import { InputPane } from './components/InputPane';
import { OutputPane } from './components/OutputPane';
import { decodeInput, detectFormat } from './utils/inputDecoder';
import { ThriftParser } from './thrift/parser';
import { ParseResult } from './thrift/types';
import { useHashSyncedInput } from './hooks/useHashSyncedInput';
import { useHorizontalSplit } from './hooks/useHorizontalSplit';

function App() {
  const { inputValue, setInputValue, inputFormat, setInputFormat } =
    useHashSyncedInput('hex');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const {
    containerRef,
    splitRatio,
    leftWidth,
    rightWidth,
    isDragging,
    startDragging,
  } = useHorizontalSplit();

  const parseInput = useCallback(
    (value: string) => {
      if (!value.trim()) {
        setParseResult(null);
        setBuffer(null);
        return;
      }

      const detectedFormat = detectFormat(value);
      if (detectedFormat !== inputFormat) {
        setInputFormat(detectedFormat);
      }

      const decodeResult = decodeInput(value, detectedFormat);

      if (!decodeResult.success) {
        setParseResult({
          success: false,
          error: decodeResult.error || 'Failed to decode input',
          totalBytes: 0,
        });
        setBuffer(null);
        return;
      }

      const parsedBuffer = decodeResult.buffer!;
      setBuffer(parsedBuffer);

      const parser = new ThriftParser(parsedBuffer);
      const result = parser.parse();
      setParseResult(result);
    },
    [inputFormat, setInputFormat]
  );

  const handleInputChange = (value: string) => {
    setInputValue(value);
    parseInput(value);
  };

  const handleParse = () => {
    parseInput(inputValue);
  };

  useEffect(() => {
    parseInput(inputValue);
  }, [inputValue, parseInput]);

  return (
    <div className='flex flex-col h-screen bg-gray-100'>
      <header className='bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg'>
        <div className='px-6 py-4 flex items-center gap-3'>
          <Binary className='w-8 h-8' />
          <div>
            <h1 className='text-2xl font-bold'>Thrift Binary Viewer</h1>
            <p className='text-sm text-gray-300'>
              Schema-less Thrift protocol inspector
            </p>
          </div>
        </div>
      </header>

      <div
        ref={containerRef}
        className={`flex-1 flex overflow-hidden ${
          isDragging ? 'cursor-col-resize select-none' : ''
        }`}
      >
        <div className='h-full' style={{ width: leftWidth }}>
          <InputPane
            value={inputValue}
            onChange={handleInputChange}
            format={inputFormat}
            onFormatChange={setInputFormat}
            onParse={handleParse}
          />
        </div>
        <div
          className='w-1 bg-gray-300 cursor-col-resize hover:bg-gray-400 transition-colors'
          onPointerDown={startDragging}
          role='separator'
          aria-label='Resize panes'
          aria-valuenow={Math.round(splitRatio * 100)}
          aria-valuemin={20}
          aria-valuemax={80}
          tabIndex={0}
        />
        <div className='h-full' style={{ width: rightWidth }}>
          <OutputPane result={parseResult} buffer={buffer} />
        </div>
      </div>
    </div>
  );
}

export default App;
