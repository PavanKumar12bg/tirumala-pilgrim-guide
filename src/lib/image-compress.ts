/**
 * Resize to max 1200px and encode as WebP, aiming for ~100–250 KB (≤300 KB when practical).
 * Every attempt re-encodes from the original decoded bitmap — never from a previous output.
 */
export async function compressToWebp(file: File, maxDim = 1200) {
  const bitmap = await createImageBitmap(file);
  const encode = (scale: number, quality: number) => {
    const ratio = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height)) * scale;
    const w = Math.round(bitmap.width * ratio);
    const h = Math.round(bitmap.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    return new Promise<{ blob: Blob; width: number; height: number }>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve({ blob: b, width: w, height: h }) : reject(new Error("encode failed"))), "image/webp", quality),
    );
  };

  const TARGET = 250 * 1024;
  const HARD = 300 * 1024;
  let best = await encode(1, 0.82);
  for (const [scale, q] of [[1, 0.72], [1, 0.62], [0.85, 0.65], [0.72, 0.62]] as const) {
    if (best.blob.size <= TARGET) break;
    const next = await encode(scale, q);
    if (next.blob.size < best.blob.size) best = next;
    if (best.blob.size <= HARD && scale < 1) break;
  }
  bitmap.close();
  if (best.blob.type !== "image/webp") throw new Error("This browser cannot create WebP images");
  return best;
}
