import { useCallback, useEffect, useState } from 'react';
import { Binary } from 'lucide-react';
import { InputPane } from './components/InputPane';
import { OutputPane } from './components/OutputPane';
import { decodeInput, detectFormat } from './utils/inputDecoder';
import { ThriftParser } from './thrift/parser';
import { ParseResult, ParsedStruct, ParsedMessage } from './thrift/types';
import { useHashSyncedInput } from './hooks/useHashSyncedInput';
import { useHorizontalSplit } from './hooks/useHorizontalSplit';
import { IdlPayload } from './components/IdlLoader';
import {
  IdlSchema,
  parseIdlSchema,
  matchParseResultToSchema,
  IdlMatchResult,
  getAllStructMatches,
  StructMatchInfo,
} from './thrift/idlSchema';

const IDL_STORAGE_KEY = 'thrift-tools:idl';

function App() {
  const { inputValue, setInputValue, inputFormat, setInputFormat } =
    useHashSyncedInput('hex');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const [idlSource, setIdlSource] = useState<IdlPayload | null>(null);
  const [idlError, setIdlError] = useState<string | null>(null);
  const [idlSchema, setIdlSchema] = useState<IdlSchema | null>(null);
  const [useIdl, setUseIdl] = useState<boolean>(false);
  const [idlMatch, setIdlMatch] = useState<IdlMatchResult | null>(null);
  const [selectedStructOverride, setSelectedStructOverride] = useState<
    string | null
  >(null);
  const [structMatches, setStructMatches] = useState<StructMatchInfo[]>([]);
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

  const applyIdlPayload = useCallback((payload: IdlPayload | null) => {
    if (!payload) {
      setIdlSource(null);
      setIdlSchema(null);
      setUseIdl(false);
      setIdlMatch(null);
      setIdlError(null);
      setSelectedStructOverride(null);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(IDL_STORAGE_KEY);
        } catch (error) {
          console.warn('Failed to clear stored IDL', error);
        }
      }
      return;
    }

    setIdlSource(payload);
    const parsed = parseIdlSchema(payload.content);
    if (parsed.success) {
      setIdlSchema(parsed.schema);
      setUseIdl(true);
      setIdlError(null);
      setSelectedStructOverride(null);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(IDL_STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
          console.warn('Failed to persist IDL', error);
        }
      }
    } else {
      setIdlSchema(null);
      setUseIdl(false);
      setIdlMatch(null);
      setIdlError(parsed.error);
      setSelectedStructOverride(null);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(IDL_STORAGE_KEY);
        } catch (error) {
          console.warn('Failed to clear stored IDL', error);
        }
      }
    }
  }, []);

  const handleIdlLoad = useCallback(
    (payload: IdlPayload) => {
      applyIdlPayload(payload);
    },
    [applyIdlPayload]
  );

  const handleIdlClear = useCallback(() => {
    applyIdlPayload(null);
  }, [applyIdlPayload]);

  useEffect(() => {
    parseInput(inputValue);
  }, [inputValue, parseInput]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem(IDL_STORAGE_KEY);
    if (!stored) {
      return;
    }
    try {
      const payload = JSON.parse(stored) as IdlPayload;
      if (payload?.content) {
        applyIdlPayload(payload);
      }
    } catch (error) {
      console.warn('Failed to load stored IDL', error);
      window.localStorage.removeItem(IDL_STORAGE_KEY);
    }
  }, [applyIdlPayload]);

  useEffect(() => {
    if (
      !useIdl ||
      !idlSchema ||
      !parseResult ||
      !parseResult.success ||
      !parseResult.data
    ) {
      setIdlMatch(null);
      setStructMatches([]);
      return;
    }

    const data = parseResult.data as ParsedStruct | ParsedMessage | null;
    if (!data) {
      setIdlMatch(null);
      setStructMatches([]);
      return;
    }

    // Get the struct to match against (for messages, use the body)
    const structToMatch =
      data.type === 'message' ? data.body : (data as ParsedStruct);

    if (structToMatch) {
      // Get all struct matches for dropdown ordering
      const allMatches = getAllStructMatches(structToMatch, idlSchema);
      setStructMatches(allMatches);
    } else {
      setStructMatches([]);
    }

    // Get the actual match (using override if set)
    const match = matchParseResultToSchema(
      data,
      idlSchema,
      selectedStructOverride
    );
    setIdlMatch(match);
  }, [useIdl, idlSchema, parseResult, selectedStructOverride]);

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
            onIdlLoad={handleIdlLoad}
            onIdlClear={handleIdlClear}
            idlFileName={idlSource?.name}
            idlError={idlError}
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
          <OutputPane
            result={parseResult}
            buffer={buffer}
            idlAvailable={Boolean(idlSchema)}
            useIdl={useIdl && Boolean(idlSchema)}
            onToggleIdl={(value) => {
              if (!idlSchema) {
                setUseIdl(false);
                return;
              }
              setUseIdl(value);
            }}
            idlMatch={useIdl ? idlMatch : null}
            idlFileName={idlSource?.name}
            selectedStructOverride={selectedStructOverride}
            onStructOverrideChange={setSelectedStructOverride}
            structMatches={structMatches}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
