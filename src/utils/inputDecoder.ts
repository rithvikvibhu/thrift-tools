export type InputFormat = 'hex' | 'base64';

export interface DecodeResult {
  success: boolean;
  buffer?: Uint8Array;
  error?: string;
}

export function decodeHex(input: string): DecodeResult {
  try {
    const cleaned = input.replace(/[\s\n\r]/g, '');

    if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
      return {
        success: false,
        error: 'Invalid hex input: contains non-hexadecimal characters',
      };
    }

    if (cleaned.length % 2 !== 0) {
      return {
        success: false,
        error: 'Invalid hex input: odd number of characters',
      };
    }

    const bytes = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < cleaned.length; i += 2) {
      bytes[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
    }

    return {
      success: true,
      buffer: bytes,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to decode hex',
    };
  }
}

export function decodeBase64(input: string): DecodeResult {
  try {
    const cleaned = input.replace(/[\s\n\r]/g, '');

    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
      return {
        success: false,
        error: 'Invalid base64 input: contains invalid characters',
      };
    }

    const binaryString = atob(cleaned);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return {
      success: true,
      buffer: bytes,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to decode base64',
    };
  }
}

export function detectFormat(input: string): InputFormat {
  const cleaned = input.replace(/[\s\n\r]/g, '');

  if (cleaned.length === 0) {
    return 'hex';
  }

  const hasBase64Chars = /[A-Za-z+/=]/.test(cleaned);
  const isValidHex = /^[0-9a-fA-F]+$/.test(cleaned);

  if (isValidHex && !hasBase64Chars) {
    return 'hex';
  }

  return 'base64';
}

export function decodeInput(input: string, format: InputFormat): DecodeResult {
  if (format === 'hex') {
    return decodeHex(input);
  } else {
    return decodeBase64(input);
  }
}
