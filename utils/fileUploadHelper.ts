import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { env } from './env';

/**
 * Upload fixtures (Test Data sheet: valid.pdf/jpg/png, invalid.exe/txt, under-limit.pdf, over-limit.pdf).
 * Files are generated into a temp folder at run time so large files never live in the repo.
 */
const dir = path.join(os.tmpdir(), 'insurance-qa-uploads');

function ensureDir(): void {
  fs.mkdirSync(dir, { recursive: true });
}

// Smallest valid 1x1 PNG
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const MINIMAL_PDF = `%PDF-1.1
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj
trailer<</Root 1 0 R>>
%%EOF
`;

export interface UploadFile {
  path: string;
  name: string;
  mimeType: string;
  buffer: Buffer;
}

function write(name: string, buffer: Buffer, mimeType: string): UploadFile {
  ensureDir();
  const file = path.join(dir, name);
  fs.writeFileSync(file, buffer);
  return { path: file, name, mimeType, buffer };
}

export const validPdf = (name = 'valid.pdf'): UploadFile => write(name, Buffer.from(MINIMAL_PDF), 'application/pdf');
export const validPng = (name = 'valid.png'): UploadFile => write(name, Buffer.from(PNG_BASE64, 'base64'), 'image/png');
export const validJpg = (name = 'valid.jpg'): UploadFile =>
  write(
    name,
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9]),
    'image/jpeg',
  );
export const invalidExe = (name = 'invalid.exe'): UploadFile =>
  write(name, Buffer.from('MZ-this-is-not-a-real-executable'), 'application/x-msdownload');
export const invalidTxt = (name = 'invalid.txt'): UploadFile => write(name, Buffer.from('plain text'), 'text/plain');

/** PDF of exactly `bytes` bytes (padded). */
export function pdfOfSize(bytes: number, name: string): UploadFile {
  const body = Buffer.alloc(bytes, 0x20);
  Buffer.from(MINIMAL_PDF).copy(body, 0, 0, Math.min(MINIMAL_PDF.length, bytes));
  return write(name, body, 'application/pdf');
}

export const maxUploadBytes = (): number => Math.round(env.maxUploadMb * 1024 * 1024);
export const underLimitPdf = (): UploadFile => pdfOfSize(maxUploadBytes() - 1, 'under-limit.pdf');
export const overLimitPdf = (): UploadFile => pdfOfSize(maxUploadBytes() + 1, 'over-limit.pdf');

/** Convenience for callers that only need a path. */
export const createValidPdf = (): string => validPdf().path;
