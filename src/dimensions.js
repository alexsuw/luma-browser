// Reject oversized common rasters before native decoders allocate the full image.
export function dimensions(buffer) {
  const a = new Uint8Array(buffer),
    v = new DataView(buffer);
  if (a[0] === 137 && a.length >= 24) return [v.getUint32(16), v.getUint32(20)];
  if (a[0] === 66 && a[1] === 77 && a.length >= 26) {
    if (v.getUint32(14, true) === 12)
      return [v.getUint16(18, true), v.getUint16(20, true)];
    return [Math.abs(v.getInt32(18, true)), Math.abs(v.getInt32(22, true))];
  }
  if (a[0] === 255 && a[1] === 216) {
    let i = 2;
    while (i + 4 < a.length) {
      if (a[i++] !== 255) break;
      while (a[i] === 255) i++;
      const marker = a[i++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const n = v.getUint16(i);
      if (n < 2 || i + n > a.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker) &&
        n >= 7
      )
        return [v.getUint16(i + 5), v.getUint16(i + 3)];
      i += n;
    }
  }
  return null;
}
