import { useState } from 'react';
import { Binary } from 'lucide-react';
import { InputPane } from './components/InputPane';
import { OutputPane } from './components/OutputPane';
import { decodeInput } from './utils/inputDecoder';
import { ThriftParser } from './thrift/parser';
import { ParseResult } from './thrift/types';
import { useHashSyncedInput } from './hooks/useHashSyncedInput';

function App() {
  const { inputValue, setInputValue, inputFormat, setInputFormat } =
    useHashSyncedInput('hex');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);

  const handleParse = () => {
    const decodeResult = decodeInput(inputValue, inputFormat);

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
  };

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

      <div className='flex-1 flex overflow-hidden'>
        <div className='w-1/2'>
          <InputPane
            value={inputValue}
            onChange={setInputValue}
            format={inputFormat}
            onFormatChange={setInputFormat}
            onParse={handleParse}
          />
        </div>
        <div className='w-1/2'>
          <OutputPane result={parseResult} buffer={buffer} />
        </div>
      </div>
    </div>
  );
}

export default App;
