import { ECO_GOOGLE } from "./google-config";
async function gateway(service: "google_drive" | "google_sheets", path: string, init: RequestInit = {}) {
  const key = service === "google_drive" ? process.env['GOOGLE_DRIVE_API_KEY'] : process.env['GOOGLE_SHEETS_API_KEY'];
  const auth = process.env['LOVABLE_API_KEY'];
  if (!key || !auth) throw new Error("Google connection unavailable; submission retained for retry");
  const headers = new Headers(init.headers); headers.set("Authorization", `Bearer ${auth}`); headers.set("X-Connection-Api-Key", key);
  const response = await fetch(`https://connector-gateway.lovable.dev/${service}${path}`, { ...init, headers, signal: AbortSignal.timeout(25000) });
  if (!response.ok) { const body = await response.text(); console.error(`Eco Google failure [${response.status}]: ${body}`); throw new Error(`Google operation failed (${response.status}); retry from Admin`); }
  return response;
}
export async function uploadDrive(bytes: Blob, stableName: string) {
  const q = new URLSearchParams({ q: `'${ECO_GOOGLE.folderId}' in parents and name = '${stableName}' and trashed = false`, fields: "files(id)", pageSize: "2" });
  const existing = await (await gateway("google_drive", `/drive/v3/files?${q}`)).json() as { files?: { id: string }[] };
  if (existing.files?.[0]) return existing.files[0].id;
  const boundary = `eco_${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: stableName, parents: [ECO_GOOGLE.folderId] });
  const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${bytes.type}\r\n\r\n`, bytes, `\r\n--${boundary}--`], { type: `multipart/related; boundary=${boundary}` });
  const result = await (await gateway("google_drive", "/upload/drive/v3/files?uploadType=multipart&fields=id", { method: "POST", body, headers: { "Content-Type": body.type } })).json() as { id?: string };
  if (!result.id) throw new Error("Google Drive did not confirm the uploaded image");
  return result.id;
}
export async function driveImage(id: string) { if (!/^[\w-]{10,200}$/.test(id)) throw new Error("Invalid image ID"); return gateway("google_drive", `/drive/v3/files/${id}?alt=media`); }
export async function sheetRows() { const result = await (await gateway("google_sheets", `/v4/spreadsheets/${ECO_GOOGLE.spreadsheetId}/values/Activities!A2:S10001`)).json() as { values?: string[][] }; return result.values ?? []; }
export async function writeActivityRow(id: string, values: (string | number)[]) {
  const rows = await sheetRows(); const index = rows.findIndex(row => row[3] === id);
  const path = index >= 0 ? `/v4/spreadsheets/${ECO_GOOGLE.spreadsheetId}/values/Activities!A${index + 2}:S${index + 2}?valueInputOption=RAW` : `/v4/spreadsheets/${ECO_GOOGLE.spreadsheetId}/values/Activities!A:S:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  await gateway("google_sheets", path, { method: index >= 0 ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: [values] }) });
  const confirmed = (await sheetRows()).find(row => row[3] === id);
  if (!confirmed || String(confirmed[15]) !== String(values[15])) throw new Error("Google Sheets write not confirmed; retry safely");
}