import type { IncomingMessage } from 'node:http';
import type { Readable } from 'node:stream';
export declare function createPrivateUploadStorage(): {
    _handleFile(_request: IncomingMessage, file: {
        stream: Readable;
    }, callback: (error?: Error | null, info?: {
        destination: string;
        filename: string;
        path: string;
        size: number;
    }) => void): void;
    _removeFile(_request: IncomingMessage, file: {
        path: string;
    }, callback: (error?: Error | null) => void): void;
};
export declare function storePrivateFileFromPath(sourcePath: string, mimeType: string, allowedMimeTypes: readonly string[]): Promise<string>;
export declare function getPrivateUploadPath(filename: string): string;
export declare function deleteTemporaryUpload(filename: string): Promise<void>;
export declare function storePrivateFile(buffer: Buffer, mimeType: string, allowedMimeTypes: readonly string[]): Promise<string>;
export declare function getPrivateFilePath(storageKey: string): string;
export declare function deletePrivateFile(storageKey: string): Promise<void>;
export declare function getSafeOriginalName(originalName: string): string;
