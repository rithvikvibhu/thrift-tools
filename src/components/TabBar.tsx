import { useEffect, useRef, useState } from 'react';
import type { TabState } from '../state/tabs';

type TabBarProps = {
  tabs: TabState[];
  activeTabId: string;
  renamingTabId: string | null;
  onSelect: (tabId: string, withRename: boolean) => void;
  onRename: (tabId: string, name: string) => void;
  onClose: (tabId: string) => void;
  onAdd: () => void;
  onImport: (blobs: string[]) => void;
};

function cleanBlob(s: string): string {
  return s.replace(/^[\s,'"]+|[\s,'"]+$/g, '');
}

function parseImportInput(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // Try JSON array of strings
  try {
    const parsed = JSON.parse(trimmed);
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === 'string')
    ) {
      return parsed.map(cleanBlob).filter(Boolean);
    }
  } catch {
    // Not valid JSON, continue
  }

  // Try comma-separated (single line, no newlines)
  if (!trimmed.includes('\n') && trimmed.includes(',')) {
    const parts = trimmed.split(',').map(cleanBlob).filter(Boolean);
    if (parts.length > 1) {
      return parts;
    }
  }

  // Default: newline-separated
  return trimmed.split('\n').map(cleanBlob).filter(Boolean);
}

export function TabBar({
  tabs,
  activeTabId,
  renamingTabId,
  onSelect,
  onRename,
  onClose,
  onAdd,
  onImport,
}: TabBarProps) {
  const renameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  // Detect platform for showing appropriate modifier key
  const isMac =
    typeof navigator !== 'undefined' &&
    (navigator.platform.includes('Mac') || navigator.userAgent.includes('Mac'));
  const modifierKey = isMac ? '⌥' : 'Alt';

  useEffect(() => {
    if (renamingTabId) {
      const ref = renameInputRefs.current[renamingTabId];
      ref?.focus();
      ref?.select();
    }
  }, [renamingTabId]);

  return (
    <div className='flex items-center gap-2 border-b border-gray-200 bg-white'>
      <div className='flex items-center overflow-x-auto'>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isRenaming = renamingTabId === tab.id;
          return (
            <div
              key={tab.id}
              onClick={(event) => onSelect(tab.id, event.shiftKey)}
              className={`flex items-center gap-2 px-3 py-2 border cursor-pointer ${
                isActive
                  ? 'bg-white border-blue-300 text-blue-800'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {isRenaming ? (
                <input
                  ref={(el) => {
                    renameInputRefs.current[tab.id] = el;
                  }}
                  value={tab.name}
                  onChange={(e) => onRename(tab.id, e.target.value)}
                  onBlur={() => onSelect(tab.id, false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      onSelect(tab.id, false);
                    }
                  }}
                  className={`bg-transparent text-sm font-medium outline-none w-24 ${
                    isActive ? 'text-blue-900' : 'text-gray-800'
                  }`}
                />
              ) : (
                <span
                  className={`text-sm font-medium min-w-20 text-center ${
                    isActive ? 'text-blue-900' : 'text-gray-800'
                  }`}
                >
                  {tab.name}
                </span>
              )}
              {tabs.length > 1 && (
                <button
                  type='button'
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose(tab.id);
                  }}
                  className='text-lg leading-none text-gray-500 hover:text-red-600 hover:bg-gray-200 rounded px-2 py-0.5 transition-colors'
                  aria-label={`Close ${tab.name}`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        type='button'
        onClick={onAdd}
        className='px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 rounded bg-blue-50'
      >
        + New Tab ({modifierKey}+T)
      </button>
      <button
        type='button'
        onClick={() => setShowImportModal(true)}
        className='px-3 py-1 text-sm font-medium text-green-600 hover:text-green-700 border border-green-200 rounded bg-green-50'
      >
        Import
      </button>

      {showImportModal && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg shadow-xl p-6 w-[500px] max-w-[90vw]'>
            <h2 className='text-lg font-semibold mb-2'>
              Import Multiple Blobs
            </h2>
            <p className='text-sm text-gray-600 mb-4'>
              Paste your data below. Supported formats:
            </p>
            <ul className='text-sm text-gray-600 mb-4 list-disc list-inside'>
              <li>
                JSON array of strings:{' '}
                <code className='bg-gray-100 px-1'>["blob1", "blob2"]</code>
              </li>
              <li>
                Comma-separated values:{' '}
                <code className='bg-gray-100 px-1'>blob1, blob2, blob3</code>
              </li>
              <li>One blob per line (default)</li>
            </ul>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='Paste blobs here...'
              className='w-full h-48 p-3 border border-gray-300 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
              autoFocus
            />
            <div className='flex justify-end gap-2 mt-4'>
              <button
                type='button'
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                }}
                className='px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={() => {
                  const blobs = parseImportInput(importText);
                  if (blobs.length > 0) {
                    onImport(blobs);
                  }
                  setShowImportModal(false);
                  setImportText('');
                }}
                className='px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded'
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
