import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Binary } from 'lucide-react';
import { InputPane } from './components/InputPane';
import { OutputPane } from './components/OutputPane';
import { TabBar } from './components/TabBar';
import { decodeInput, detectFormat } from './utils/inputDecoder';
import { ThriftParser } from './thrift/parser';
import { useHorizontalSplit } from './hooks/useHorizontalSplit';
import { createTab, TabState, updateTabList } from './state/tabs';
import { IdlPayload } from './components/IdlLoader';
import {
  IdlSchema,
  parseIdlSchema,
  matchParseResultToSchema,
  IdlMatchResult,
  getAllStructMatches,
  StructMatchInfo,
} from './thrift/idlSchema';
import { ParsedMessage, ParsedStruct } from './thrift/types';

const IDL_STORAGE_KEY = 'thrift-tools:idl';

function App() {
  const tabIdCounter = useRef(1);
  const [tabs, setTabs] = useState<TabState[]>(() => {
    const firstId = `tab-${tabIdCounter.current++}`;
    return [createTab(firstId, 'Tab 1')];
  });
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [idlSource, setIdlSource] = useState<IdlPayload | null>(null);
  const [idlError, setIdlError] = useState<string | null>(null);
  const [idlSchema, setIdlSchema] = useState<IdlSchema | null>(null);
  const {
    containerRef,
    splitRatio,
    leftWidth,
    rightWidth,
    isDragging,
    startDragging,
  } = useHorizontalSplit();

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) || tabs[0],
    [activeTabId, tabs]
  );

  const updateTabById = useCallback(
    (tabId: string, updater: (tab: TabState) => TabState) => {
      setTabs((prevTabs) => updateTabList(prevTabs, tabId, updater));
    },
    []
  );

  const computeIdlForTab = useCallback(
    (tab: TabState, schema: IdlSchema | null) => {
      if (
        !schema ||
        !tab.parseResult ||
        !tab.parseResult.success ||
        !tab.parseResult.data
      ) {
        return {
          structMatches: [] as StructMatchInfo[],
          idlMatch: null as IdlMatchResult | null,
        };
      }

      const data = tab.parseResult.data as ParsedStruct | ParsedMessage | null;
      if (!data) {
        return { structMatches: [], idlMatch: null };
      }

      const structToMatch =
        data.type === 'message' ? data.body : (data as ParsedStruct);

      const structMatches = structToMatch
        ? getAllStructMatches(structToMatch, schema)
        : [];

      const idlMatch = matchParseResultToSchema(
        data,
        schema,
        tab.selectedStructOverride
      );

      return { structMatches, idlMatch };
    },
    []
  );

  const parseInput = useCallback(
    (tabId: string, value: string, explicitFormat?: 'hex' | 'base64') => {
      updateTabById(tabId, (tab) => {
        if (!value.trim()) {
          return {
            ...tab,
            inputValue: value,
            inputFormat: explicitFormat ?? tab.inputFormat,
            parseResult: null,
            buffer: null,
            structMatches: [],
            idlMatch: null,
          };
        }

        const detectedFormat = detectFormat(value);
        const nextFormat =
          explicitFormat ??
          (detectedFormat !== tab.inputFormat
            ? detectedFormat
            : tab.inputFormat);

        const decodeResult = decodeInput(value, nextFormat);
        if (!decodeResult.success) {
          return {
            ...tab,
            inputValue: value,
            inputFormat: nextFormat,
            parseResult: {
              success: false,
              error: decodeResult.error || 'Failed to decode input',
              totalBytes: 0,
            },
            buffer: null,
            structMatches: [],
            idlMatch: null,
          };
        }

        const parsedBuffer = decodeResult.buffer!;
        const parser = new ThriftParser(parsedBuffer);
        const result = parser.parse();

        const recomputed = computeIdlForTab(
          {
            ...tab,
            inputValue: value,
            inputFormat: nextFormat,
            parseResult: result,
            buffer: parsedBuffer,
          },
          idlSchema
        );

        return {
          ...tab,
          inputValue: value,
          inputFormat: nextFormat,
          parseResult: result,
          buffer: parsedBuffer,
          ...recomputed,
        };
      });
    },
    [computeIdlForTab, idlSchema, updateTabById]
  );

  const handleInputChange = (value: string) => {
    if (!activeTab) return;
    parseInput(activeTab.id, value);
  };

  const applyIdlPayload = useCallback(
    (payload: IdlPayload | null) => {
      if (!payload) {
        setIdlSource(null);
        setIdlSchema(null);
        setIdlError(null);
        setTabs((prevTabs) =>
          prevTabs.map((tab) => ({
            ...tab,
            useIdl: false,
            structMatches: [],
            idlMatch: null,
          }))
        );
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
        setIdlError(null);
        setTabs((prevTabs) =>
          prevTabs.map((tab) => {
            const updatedTab = { ...tab, useIdl: true };
            const recomputed = computeIdlForTab(updatedTab, parsed.schema);
            return { ...updatedTab, ...recomputed };
          })
        );
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(
              IDL_STORAGE_KEY,
              JSON.stringify(payload)
            );
          } catch (error) {
            console.warn('Failed to persist IDL', error);
          }
        }
      } else {
        setIdlSchema(null);
        setIdlError(parsed.error);
        setTabs((prevTabs) =>
          prevTabs.map((tab) => ({
            ...tab,
            useIdl: false,
            structMatches: [],
            idlMatch: null,
          }))
        );
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem(IDL_STORAGE_KEY);
          } catch (error) {
            console.warn('Failed to clear stored IDL', error);
          }
        }
      }
    },
    [computeIdlForTab]
  );

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
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (!idlSchema) {
          return { ...tab, structMatches: [], idlMatch: null };
        }
        const recomputed = computeIdlForTab(tab, idlSchema);
        return { ...tab, ...recomputed };
      })
    );
  }, [computeIdlForTab, idlSchema]);

  const handleStructOverrideChange = (structName: string | null) => {
    if (!activeTab) return;
    updateTabById(activeTab.id, (tab) => {
      const updatedTab = { ...tab, selectedStructOverride: structName };
      const recomputed = computeIdlForTab(updatedTab, idlSchema);
      return { ...updatedTab, ...recomputed };
    });
  };

  const handleToggleIdl = (value: boolean) => {
    if (!activeTab || !idlSchema) return;
    updateTabById(activeTab.id, (tab) => {
      const updatedTab = { ...tab, useIdl: value };
      const recomputed = computeIdlForTab(updatedTab, idlSchema);
      return { ...updatedTab, ...recomputed };
    });
  };

  const addTab = () => {
    const nextId = `tab-${tabIdCounter.current++}`;
    const newTab = createTab(nextId, `Tab ${tabIdCounter.current - 1}`);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(nextId);
  };

  const removeTab = useCallback(
    (tabId: string) => {
      setTabs((prevTabs) => {
        if (prevTabs.length === 1) {
          return prevTabs;
        }
        const filtered = prevTabs.filter((tab) => tab.id !== tabId);
        if (activeTabId === tabId) {
          const nextActive = filtered[filtered.length - 1];
          setActiveTabId(nextActive.id);
        }
        return filtered;
      });
    },
    [activeTabId]
  );

  const renameTab = (tabId: string, name: string) => {
    updateTabById(tabId, (tab) => ({ ...tab, name }));
  };

  const handleTabFormatChange = (tabId: string, format: 'hex' | 'base64') => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    parseInput(tabId, tab.inputValue, format);
  };

  const handleTabSelect = (tabId: string, withRename: boolean) => {
    setActiveTabId(tabId);
    setRenamingTabId(withRename ? tabId : null);
  };

  const switchToNextTab = useCallback(() => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    const nextIndex = (currentIndex + 1) % tabs.length;
    setActiveTabId(tabs[nextIndex].id);
  }, [tabs, activeTabId]);

  const switchToPreviousTab = useCallback(() => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    const previousIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    setActiveTabId(tabs[previousIndex].id);
  }, [tabs, activeTabId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when renaming a tab
      if (renamingTabId) return;

      // Ignore shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Check for Alt key combinations
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        if (event.key === 't' || event.key === 'T') {
          event.preventDefault();
          addTab();
        } else if (event.key === 'w' || event.key === 'W') {
          event.preventDefault();
          if (tabs.length > 1) {
            removeTab(activeTabId);
          }
        } else if (event.key === ',') {
          event.preventDefault();
          switchToPreviousTab();
        } else if (event.key === '.') {
          event.preventDefault();
          switchToNextTab();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    renamingTabId,
    tabs,
    activeTabId,
    removeTab,
    switchToPreviousTab,
    switchToNextTab,
  ]);

  return (
    <div className='flex flex-col h-screen bg-gray-100'>
      <header className='bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg'>
        <div className='px-6 py-4 flex items-center gap-3'>
          <Binary className='w-8 h-8' />
          <div className='flex items-baseline gap-4'>
            <h1 className='text-2xl font-bold'>Thrift Binary Viewer</h1>
            <p className='text-sm text-gray-300'>
              Schema-less Thrift protocol inspector
            </p>
          </div>
        </div>
      </header>

      <TabBar
        tabs={tabs}
        activeTabId={activeTab?.id ?? tabs[0].id}
        renamingTabId={renamingTabId}
        onSelect={handleTabSelect}
        onRename={renameTab}
        onClose={removeTab}
        onAdd={addTab}
      />

      <div
        ref={containerRef}
        className={`flex-1 flex overflow-hidden ${
          isDragging ? 'cursor-col-resize select-none' : ''
        }`}
      >
        <div className='h-full' style={{ width: leftWidth }}>
          <InputPane
            value={activeTab?.inputValue ?? ''}
            onChange={handleInputChange}
            format={activeTab?.inputFormat ?? 'hex'}
            onFormatChange={(format) =>
              activeTab && handleTabFormatChange(activeTab.id, format)
            }
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
            result={activeTab?.parseResult ?? null}
            buffer={activeTab?.buffer ?? null}
            idlAvailable={Boolean(idlSchema)}
            useIdl={Boolean(idlSchema) && Boolean(activeTab?.useIdl)}
            onToggleIdl={handleToggleIdl}
            idlMatch={activeTab && activeTab.useIdl ? activeTab.idlMatch : null}
            idlFileName={idlSource?.name}
            selectedStructOverride={activeTab?.selectedStructOverride ?? null}
            onStructOverrideChange={handleStructOverrideChange}
            structMatches={activeTab?.structMatches ?? []}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
