import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, open, rename, unlink, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import type { IncomingMessage } from 'node:http';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

function storageRoot() {
  const configuredDirectory = process.env.UPLOADS_DIR?.trim();
  return resolve(configuredDirectory || join(process.cwd(), 'private-uploads'));
}

function stagingRoot() {
  return join(storageRoot(), '.staging');
}

function hasExpectedSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === 'application/pdf') {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  if (mimeType === 'image/jpeg') {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }
  if (mimeType === 'image/png') {
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
    return (
      buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp'
    );
  }
  if (mimeType === 'video/webm') {
    return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }
  return false;
}

export function createPrivateUploadStorage() {
  return {
    _handleFile(
      _request: IncomingMessage,
      file: { stream: Readable },
      callback: (
        error?: Error | null,
        info?: { destination: string; filename: string; path: string; size: number },
      ) => void,
    ) {
      const directory = stagingRoot();
      const filename = `${randomUUID()}.upload`;
      const path = join(directory, filename);
      void mkdir(directory, { recursive: true, mode: 0o700 })
        .then(async () => {
          const output = createWriteStream(path, {
            flags: 'wx',
            mode: 0o600,
          });
          await pipeline(file.stream, output);
          return output.bytesWritten;
        })
        .then((size) =>
          callback(null, {
            destination: directory,
            filename,
            path,
            size,
          }),
        )
        .catch(async (error: unknown) => {
          const uploadError =
            error instanceof Error
              ? error
              : new Error('Unable to store the uploaded file.');
          try {
            await unlink(path);
          } catch (cleanupError) {
            if (
              typeof cleanupError !== 'object' ||
              cleanupError === null ||
              !('code' in cleanupError) ||
              cleanupError.code !== 'ENOENT'
            ) {
              const normalizedCleanupError =
                cleanupError instanceof Error
                  ? cleanupError
                  : new Error('Unable to remove the incomplete upload.');
              callback(
                new AggregateError(
                  [uploadError, normalizedCleanupError],
                  'The upload failed and its temporary file could not be removed.',
                ),
              );
              return;
            }
          }
          callback(uploadError);
        });
    },
    _removeFile(
      _request: IncomingMessage,
      file: { path: string },
      callback: (error?: Error | null) => void,
    ) {
      void unlink(file.path).then(
        () => callback(null),
        (error: unknown) => {
          if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ENOENT'
          ) {
            callback(null);
            return;
          }
          callback(
            error instanceof Error
              ? error
              : new Error('Unable to remove the temporary upload.'),
          );
        },
      );
    },
  };
}

export async function storePrivateFileFromPath(
  sourcePath: string,
  mimeType: string,
  allowedMimeTypes: readonly string[],
) {
  const extension = MIME_EXTENSIONS[mimeType];
  if (!extension || !allowedMimeTypes.includes(mimeType)) {
    throw new BadRequestException(
      'The uploaded file type or content is not supported.',
    );
  }

  const handle = await open(sourcePath, 'r');
  let signature: Buffer;
  try {
    signature = Buffer.alloc(12);
    const { bytesRead } = await handle.read(signature, 0, signature.length, 0);
    signature = signature.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
  if (!hasExpectedSignature(signature, mimeType)) {
    throw new BadRequestException(
      'The uploaded file type or content is not supported.',
    );
  }

  const storageKey = `${randomUUID()}${extension}`;
  const root = storageRoot();
  await mkdir(root, { recursive: true });
  const destination = join(root, storageKey);
  await rename(sourcePath, destination);
  await chmod(destination, 0o600);
  return storageKey;
}

export function getPrivateUploadPath(filename: string) {
  if (!/^[0-9a-f-]{36}\.upload$/.test(filename)) {
    throw new NotFoundException('Temporary upload not found.');
  }
  return join(stagingRoot(), filename);
}

export async function deleteTemporaryUpload(filename: string) {
  try {
    await unlink(getPrivateUploadPath(filename));
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return;
    }
    throw error;
  }
}

export async function storePrivateFile(
  buffer: Buffer,
  mimeType: string,
  allowedMimeTypes: readonly string[],
) {
  const extension = MIME_EXTENSIONS[mimeType];
  if (
    !extension ||
    !allowedMimeTypes.includes(mimeType) ||
    !hasExpectedSignature(buffer, mimeType)
  ) {
    throw new BadRequestException(
      'The uploaded file type or content is not supported.',
    );
  }

  const storageKey = `${randomUUID()}${extension}`;
  const root = storageRoot();
  await mkdir(root, { recursive: true });
  await writeFile(join(root, storageKey), buffer, { flag: 'wx', mode: 0o600 });
  return storageKey;
}

export function getPrivateFilePath(storageKey: string) {
  if (!/^[0-9a-f-]{36}\.(pdf|jpg|png|mp4|webm|mov)$/.test(storageKey)) {
    throw new NotFoundException('File not found.');
  }
  return join(storageRoot(), storageKey);
}

export async function deletePrivateFile(storageKey: string) {
  try {
    await unlink(getPrivateFilePath(storageKey));
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return;
    }
    throw error;
  }
}

export function getSafeOriginalName(originalName: string) {
  const name = originalName
    .replace(/[\\/]/g, '_')
    .replace(/[^\w .()-]/g, '_')
    .trim()
    .slice(0, 180);
  return name || `file${extname(originalName)}`;
}
