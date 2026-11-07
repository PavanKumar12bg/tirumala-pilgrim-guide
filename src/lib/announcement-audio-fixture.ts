/** Small valid PCM clip for focused audio/storage tests. */
export function testWav(): ArrayBuffer {
  const bytes = new ArrayBuffer(2048);
  const view = new DataView(bytes);
  const put = (at: number, text: string) => [...text].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  put(0, "RIFF"); view.setUint32(4, 2040, true); put(8, "WAVE"); put(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  put(36, "data"); view.setUint32(40, 2004, true);
  for (let i = 44; i < 2048; i += 2) view.setInt16(i, Math.round(Math.sin(i / 20) * 1000), true);
  return bytes;
}