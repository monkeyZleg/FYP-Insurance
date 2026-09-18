export async function sha256File(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return bufferToHex(hashBuffer);
}

export async function sha256Files(files: File[]): Promise<string> {
  const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
  const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const b of buffers) {
    combined.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  }
  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  return bufferToHex(hashBuffer);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return (
    "0x" +
    Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function truncateHash(hash: string, chars = 8): string {
  if (!hash) return "";
  return `${hash.slice(0, chars + 2)}...${hash.slice(-6)}`;
}
