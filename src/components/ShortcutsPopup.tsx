import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ShortcutsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? '⌥' : 'Alt';

const shortcuts = [
  { keys: `${modKey} + ,`, description: 'Previous tab' },
  { keys: `${modKey} + .`, description: 'Next tab' },
  { keys: `${modKey} + W`, description: 'Close tab' },
  { keys: `${modKey} + T`, description: 'New tab' },
  { keys: `${modKey} + I`, description: 'Import' },
  { keys: '?', description: 'Show shortcuts' },
];

export function ShortcutsPopup({ isOpen, onClose }: ShortcutsPopupProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
      onClick={onClose}
    >
      <div
        className='bg-white rounded-lg shadow-xl p-6 min-w-80 max-w-md'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-gray-800'>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className='p-1 hover:bg-gray-100 rounded transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>
        <div className='space-y-2'>
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.keys}
              className='flex items-center justify-between py-2 border-b border-gray-100 last:border-0'
            >
              <span className='text-gray-600'>{shortcut.description}</span>
              <kbd className='px-2 py-1 bg-gray-100 rounded text-sm font-mono text-gray-700'>
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
