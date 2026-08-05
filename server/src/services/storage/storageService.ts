import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config, assertR2Config } from '../../config';

export interface StoredFile {
  storageKey: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
}

class StorageService {
  private r2Client: S3Client | null = null;

  private getR2Client(): S3Client {
    if (!this.r2Client) {
      assertR2Config();
      const { r2 } = config.storage;
      this.r2Client = new S3Client({
        region: 'auto',
        endpoint: r2.endpoint,
        credentials: {
          accessKeyId: r2.accessKeyId,
          secretAccessKey: r2.secretAccessKey,
        },
      });
    }
    return this.r2Client;
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  async upload(buffer: Buffer, fileName: string, mimeType: string, folder = 'files'): Promise<StoredFile> {
    const storageKey = `${folder}/${Date.now()}-${this.sanitizeFileName(fileName)}`;

    if (config.storage.type === 'local') {
      const fullPath = path.join(config.storage.localPath, storageKey);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, buffer);
      return { storageKey, mimeType, fileName, sizeBytes: buffer.length };
    }

    const { bucket } = config.storage.r2;
    await this.getR2Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    return { storageKey, mimeType, fileName, sizeBytes: buffer.length };
  }

  async download(storageKey: string): Promise<Buffer> {
    if (config.storage.type === 'local') {
      const fullPath = path.join(config.storage.localPath, storageKey);
      return fs.readFile(fullPath);
    }

    const response = await this.getR2Client().send(
      new GetObjectCommand({
        Bucket: config.storage.r2.bucket,
        Key: storageKey,
      })
    );
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) throw new Error('Empty file');
    return Buffer.from(bytes);
  }

  async delete(storageKey: string): Promise<void> {
    if (config.storage.type === 'local') {
      const fullPath = path.join(config.storage.localPath, storageKey);
      await fs.unlink(fullPath).catch(() => undefined);
      return;
    }

    await this.getR2Client().send(
      new DeleteObjectCommand({
        Bucket: config.storage.r2.bucket,
        Key: storageKey,
      })
    );
  }

  getDownloadUrl(storageKey: string): string {
    return `/api/files/${encodeURIComponent(storageKey)}`;
  }
}

export const storageService = new StorageService();
