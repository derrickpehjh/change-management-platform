import { Injectable, ServiceUnavailableException, Logger } from "@nestjs/common";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { extname } from "path";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadClient: S3Client | null;
  private readonly presignClient: S3Client | null;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "attachments";

    if (!process.env.S3_ENDPOINT) {
      this.logger.warn("S3_ENDPOINT not set — file attachments are disabled");
      this.uploadClient = null;
      this.presignClient = null;
      return;
    }

    const region = process.env.S3_REGION ?? "us-east-1";
    const credentials = {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    };

    this.uploadClient = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region,
      credentials,
      forcePathStyle: true,
    });

    // Presigned URLs must point to a host the browser can reach.
    // S3_PUBLIC_ENDPOINT overrides S3_ENDPOINT for presigning — set it to the
    // externally accessible MinIO/S3 URL when they differ (e.g. Kubernetes
    // ingress vs internal service DNS).
    this.presignClient = new S3Client({
      endpoint: process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT,
      region,
      credentials,
      forcePathStyle: true,
    });
  }

  async upload(file: Express.Multer.File): Promise<string> {
    if (!this.uploadClient) throw new ServiceUnavailableException("File storage is not configured");
    const key = `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname)}`;
    await this.uploadClient.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    return key;
  }

  presignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.presignClient) throw new ServiceUnavailableException("File storage is not configured");
    return getSignedUrl(
      this.presignClient,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }
}
