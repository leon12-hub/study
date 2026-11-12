import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, stat, truncate, writeFile } from 'node:fs/promises';
import type { IncomingMessage } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import {
  createPrivateUploadStorage,
  deletePrivateFile,
  getPrivateFilePath,
  storePrivateFile,
  storePrivateFileFromPath,
} from './private-file-storage.js';

describe('private file storage', () => {
  let directory: string;
  const originalUploadsDir = process.env.UPLOADS_DIR;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'biology-upload-test-'));
    process.env.UPLOADS_DIR = directory;
  });

  afterEach(async () => {
    if (originalUploadsDir === undefined) {
      delete process.env.UPLOADS_DIR;
    } else {
      process.env.UPLOADS_DIR = originalUploadsDir;
    }
    await rm(directory, { recursive: true, force: true });
  });

  it('stores supported PDF files under generated private keys', async () => {
    const content = Buffer.from('%PDF-1.7\nexample');
    const key = await storePrivateFile(content, 'application/pdf', [
      'application/pdf',
    ]);

    expect(key).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(await readFile(getPrivateFilePath(key))).toEqual(content);
    await deletePrivateFile(key);
  });

  it('creates the staging directory before streaming an upload to disk', async () => {
    const storage = createPrivateUploadStorage();
    const content = Buffer.from('%PDF-1.7\nexample');
    const uploaded = await new Promise<{
      filename: string;
      path: string;
      size: number;
    }>((resolve, reject) => {
      storage._handleFile(
        {} as IncomingMessage,
        { stream: Readable.from([content]) },
        (error, info) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(info!);
        },
      );
    });

    expect(await readFile(uploaded.path)).toEqual(content);
    expect(uploaded.size).toBe(content.length);
    await rm(uploaded.path);
  });

  it('stores uploads larger than 100 MB without buffering the file in memory', async () => {
    const stagingDirectory = join(directory, '.staging');
    await mkdir(stagingDirectory, { recursive: true });
    const filename = `${randomUUID()}.upload`;
    const sourcePath = join(stagingDirectory, filename);
    const size = 101 * 1024 * 1024;
    await writeFile(sourcePath, Buffer.from('%PDF-1.7\n'));
    await truncate(sourcePath, size);

    const key = await storePrivateFileFromPath(sourcePath, 'application/pdf', [
      'application/pdf',
    ]);

    expect((await stat(getPrivateFilePath(key))).size).toBe(size);
    await deletePrivateFile(key);
  });

  it('rejects a MIME type that does not match the file signature', async () => {
    await expect(
      storePrivateFile(Buffer.from('not a PDF'), 'application/pdf', [
        'application/pdf',
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not resolve arbitrary file paths', () => {
    expect(() => getPrivateFilePath('..\\secrets.pdf')).toThrow(
      NotFoundException,
    );
  });
});
