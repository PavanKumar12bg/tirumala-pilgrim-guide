/** Validate complete PCM WAVs and supported compressed-audio containers, not just MIME/size. */
export function validateAudioFile(bytes: ArrayBuffer, contentType: string): void {
  const data = new Uint8Array(bytes);
  const byte = (offset: number) => data[offset] ?? 0;
  const tag = (offset: number, length: number) => String.fromCharCode(...data.subarray(offset, offset + length));
  if (data.length < 1000) throw new Error("Stored audio is missing or empty");
  if (/^audio\/(wav|x-wav)(;|$)/i.test(contentType)) {
    if (tag(0, 4) !== "RIFF" || tag(8, 4) !== "WAVE") throw new Error("Invalid WAV audio");
    const view = new DataView(bytes);
    if (view.getUint32(4, true) + 8 !== data.length) throw new Error("Truncated WAV audio");
    let format = false, samples = false, block = 0;
    for (let offset = 12; offset + 8 <= data.length;) {
      const size = view.getUint32(offset + 4, true);
      const start = offset + 8;
      if (start + size > data.length) throw new Error("Truncated WAV audio");
      if (tag(offset, 4) === "fmt ") {
        if (size < 16) throw new Error("Invalid WAV format");
        const encoding = view.getUint16(start, true), channels = view.getUint16(start + 2, true);
        const rate = view.getUint32(start + 4, true), bits = view.getUint16(start + 14, true);
        block = view.getUint16(start + 12, true);
        format = [1, 3].includes(encoding) && channels > 0 && rate > 0 && [8, 16, 24, 32, 64].includes(bits) && block === channels * bits / 8;
      }
      if (tag(offset, 4) === "data") samples = size > 0 && block > 0 && size % block === 0;
      offset = start + size + (size % 2);
    }
    if (!format || !samples) throw new Error("WAV audio has no playable samples");
    return;
  }
  if (/^audio\/ogg(;|$)/i.test(contentType) && tag(0, 4) === "OggS" && data[4] === 0 && (tag(28, 8) === "OpusHead" || tag(29, 6) === "vorbis")) return;
  if (/^audio\/mpeg(;|$)/i.test(contentType)) {
    let offset = 0;
    if (tag(0, 3) === "ID3") offset = 10 + ((byte(6) & 127) << 21 | (byte(7) & 127) << 14 | (byte(8) & 127) << 7 | byte(9) & 127);
    if (offset + 4 < data.length && byte(offset) === 255 && (byte(offset + 1) & 224) === 224 && (byte(offset + 1) & 6) !== 0 && (byte(offset + 2) & 240) !== 0 && (byte(offset + 2) & 240) !== 240) return;
  }
  throw new Error("Invalid or unsupported stored audio");
}