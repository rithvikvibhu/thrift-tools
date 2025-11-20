import { useEffect, useRef, useState } from 'react';
import { InputFormat } from '../utils/inputDecoder';

interface HashSyncedInputState {
  inputValue: string;
  setInputValue: (value: string) => void;
  inputFormat: InputFormat;
  setInputFormat: (format: InputFormat) => void;
}

export function useHashSyncedInput(
  initialFormat: InputFormat = 'hex'
): HashSyncedInputState {
  const [inputValue, setInputValue] = useState('');
  const [inputFormat, setInputFormat] = useState<InputFormat>(initialFormat);
  const hashUpdateRef = useRef(false);

  useEffect(() => {
    const applyHashState = () => {
      if (hashUpdateRef.current) {
        hashUpdateRef.current = false;
        return;
      }

      const hash = window.location.hash.slice(1);
      if (!hash) {
        return;
      }

      const params = new URLSearchParams(hash);
      const formatParam = params.get('format');
      const valueParam = params.get('value');

      if (formatParam === 'hex' || formatParam === 'base64') {
        setInputFormat(formatParam);
      }

      if (typeof valueParam === 'string') {
        setInputValue(valueParam);
      }
    };

    applyHashState();
    window.addEventListener('hashchange', applyHashState);
    return () => window.removeEventListener('hashchange', applyHashState);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('format', inputFormat);
    if (inputValue.trim()) {
      params.set('value', inputValue);
    }
    const newHash = params.toString();
    const formattedHash = newHash ? `#${newHash}` : '';
    if (window.location.hash !== formattedHash) {
      hashUpdateRef.current = true;
      window.location.hash = formattedHash;
    }
  }, [inputFormat, inputValue]);

  return {
    inputValue,
    setInputValue,
    inputFormat,
    setInputFormat,
  };
}
