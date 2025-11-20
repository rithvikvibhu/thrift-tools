interface HexDumpProps {
  buffer: Uint8Array;
}

export function HexDump({ buffer }: HexDumpProps) {
  const bytesPerRow = 16;
  const rows: Array<{ offset: number; hex: string[]; ascii: string }> = [];

  for (let i = 0; i < buffer.length; i += bytesPerRow) {
    const rowBytes = Array.from(buffer.slice(i, i + bytesPerRow));
    const hex = rowBytes.map((b) => b.toString(16).padStart(2, '0'));
    const ascii = rowBytes
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');

    rows.push({
      offset: i,
      hex,
      ascii,
    });
  }

  return (
    <div className='font-mono text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto'>
      <div className='space-y-1'>
        {rows.map((row) => (
          <div key={row.offset} className='flex gap-4'>
            <span className='text-gray-500 select-none w-16'>
              {row.offset.toString(16).padStart(8, '0')}
            </span>
            <div className='flex gap-2 flex-1'>
              <div className='flex gap-1'>
                {row.hex.map((byte, idx) => (
                  <span
                    key={idx}
                    className='text-blue-400 hover:bg-blue-900 hover:text-blue-200 px-0.5 rounded cursor-default transition-colors'
                  >
                    {byte}
                  </span>
                ))}
                {Array.from({ length: bytesPerRow - row.hex.length }).map(
                  (_, idx) => (
                    <span
                      key={`empty-${idx}`}
                      className='text-transparent select-none'
                    >
                      00
                    </span>
                  )
                )}
              </div>
              <span className='text-gray-600 select-none'>|</span>
              <span className='text-green-400'>{row.ascii}</span>
            </div>
          </div>
        ))}
      </div>

      <div className='mt-4 pt-4 border-t border-gray-700 text-gray-400'>
        <div className='flex items-center justify-between'>
          <span>Total bytes: {buffer.length}</span>
          <span>{buffer.length.toString(16).padStart(4, '0')} (hex)</span>
        </div>
      </div>
    </div>
  );
}
