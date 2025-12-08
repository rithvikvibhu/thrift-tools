import { useEffect, useRef } from 'react';
import type { TabState } from '../state/tabs';

type TabBarProps = {
  tabs: TabState[];
  activeTabId: string;
  renamingTabId: string | null;
  onSelect: (tabId: string, withRename: boolean) => void;
  onRename: (tabId: string, name: string) => void;
  onClose: (tabId: string) => void;
  onAdd: () => void;
};

export function TabBar({
  tabs,
  activeTabId,
  renamingTabId,
  onSelect,
  onRename,
  onClose,
  onAdd,
}: TabBarProps) {
  const renameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
    </div>
  );
}
