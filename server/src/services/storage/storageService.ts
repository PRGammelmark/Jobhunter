import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Types } from 'mongoose';
import { config, assertR2Config } from '../../config';
import { StoredFile } from '../../models';

export interface UploadedFile {
  fileId: string;
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

  private buildStorageKey(tenantId: string, documentType: string, fileName: string): string {
    const safeType = documentType.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${tenantId}/${safeType}/${randomUUID()}-${this.sanitizeFileName(fileName)}`;
  }

  async upload(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    options: { tenantId: string | Types.ObjectId; documentType?: string }
  ): Promise<UploadedFile> {
    const tenantId = options.tenantId.toString();
    const storageKey = this.buildStorageKey(tenantId, options.documentType || 'files', fileName);

    if (config.storage.type === 'local') {
      const fullPath = path.join(config.storage.localPath, storageKey);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, buffer);
    } else {
      const { bucket } = config.storage.r2;
      await this.getR2Client().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          Body: buffer,
          ContentType: mimeType,
        })
      );
    }

    const doc = await StoredFile.create({
      tenantId: new Types.ObjectId(tenantId),
      storageKey,
      originalName: fileName,
      mimeType,
      sizeBytes: buffer.length,
    });

    return {
      fileId: doc._id.toString(),
      storageKey,
      mimeType,
      fileName,
      sizeBytes: buffer.length,
    };
  }

  async downloadByKey(storageKey: string): Promise<Buffer> {
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

  async downloadForTenant(fileId: string, tenantId: string | Types.ObjectId): Promise<{
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  }> {
    const doc = await StoredFile.findOne({
      _id: fileId,
      tenantId: new Types.ObjectId(tenantId.toString()),
    });
    if (!doc) throw new Error('Fil ikke fundet');
    const buffer = await this.downloadByKey(doc.storageKey);
    return { buffer, mimeType: doc.mimeType, fileName: doc.originalName };
  }

  async deleteByKey(storageKey: string): Promise<void> {
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

  async deleteForTenant(fileId: string, tenantId: string | Types.ObjectId): Promise<void> {
    const doc = await StoredFile.findOneAndDelete({
      _id: fileId,
      tenantId: new Types.ObjectId(tenantId.toString()),
    });
    if (doc) {
      await this.deleteByKey(doc.storageKey);
    }
  }

  getDownloadUrl(fileId: string): string {
    return `/api/files/${fileId}`;
  }
}

export const storageService = new StorageService();
