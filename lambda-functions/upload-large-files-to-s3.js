// index.mjs
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.BUCKET || "quickform-images";

const s3 = new S3Client({ region: REGION });

export const handler = async (event) => {
  try {
    const path = event.path || "/";
    const method = event.httpMethod || "GET";
    const body = event.body ? JSON.parse(event.body) : {};

    // ✅ Single PUT upload presign (for <15 MB files)
    if (path.endsWith("/single/presign") && method === "POST") {
      console.log('Single file', body);
      const { key, contentType, expiresInSeconds = 900 } = body;
      const cmd = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
        ACL: "public-read", // make object public
      });
      const url = await getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
      console.log('URL', url);
      const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
      return response(200, { url, key, publicUrl });
    }

    // ✅ multiple-file presign (all <15 MB)
    if (path.endsWith("/multiple/presign") && method === "POST") {
      const { files = [], expiresInSeconds = 900 } = body;
      const results = await Promise.all(
        files.map(async ({ key, contentType }) => {
          const cmd = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: contentType,
            ACL: "public-read",
          });
          const url = await getSignedUrl(s3, cmd, {
            expiresIn: expiresInSeconds,
          });
          const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
          return { key, url,publicUrl };
        })
      );
      return response(200, { urls: results });
    }

    if (path.endsWith("/multipart/initiate") && method === "POST") {
      const { key, contentType } = body;
      const cmd = new CreateMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
        ACL: "public-read", // make final object public
      });
    
      const result = await s3.send(cmd);
    
      // Construct the public URL
      const publicUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
      return response(200, {
        uploadId: result.UploadId,
        key: result.Key,
        publicUrl: publicUrl, // return the public URL
      });
    }    

    if (path.endsWith("/multipart/presign") && method === "POST") {
      const { key, uploadId, partNumbers = [], expiresInSeconds = 900 } = body;
      const promises = partNumbers.map(async (partNumber) => {
        const cmd = new UploadPartCommand({
          Bucket: BUCKET,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
        });
        const url = await getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
        return { partNumber, url };
      });
      const parts = await Promise.all(promises);
      return response(200, { parts });
    }

    if (path.endsWith("/multipart/complete") && method === "POST") {
      const { key, uploadId, parts = [] } = body;
      const cmd = new CompleteMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      });
      const result = await s3.send(cmd);
      const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

      return response(200, result, publicUrl);
    }

    if (path.endsWith("/multipart/abort") && method === "POST") {
      const { key, uploadId } = body;
      await s3.send(
        new AbortMultipartUploadCommand({
          Bucket: BUCKET,
          Key: key,
          UploadId: uploadId,
        })
      );
      return response(200, { ok: true });
    }

    // ✅ Multipart multiple (initiate multiple at once)
    if (path.endsWith("/multiple/initiate") && method === "POST") {
      const { files = [] } = body;
      const results = await Promise.all(
        files.map(async ({ key, contentType }) => {
          const cmd = new CreateMultipartUploadCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: contentType,
            ACL: "public-read",
          });
          const result = await s3.send(cmd);
          return { key: result.Key, uploadId: result.UploadId };
        })
      );
      return response(200, { uploads: results });
    }

    if (path.endsWith("/multiple/presign") && method === "POST") {
      const { uploads = [], expiresInSeconds = 900 } = body;
      const results = await Promise.all(
        uploads.map(async ({ key, uploadId, partNumbers }) => {
          const urls = await Promise.all(
            partNumbers.map(async (partNumber) => {
              const cmd = new UploadPartCommand({
                Bucket: BUCKET,
                Key: key,
                UploadId: uploadId,
                PartNumber: partNumber,
              });
              const url = await getSignedUrl(s3, cmd, {
                expiresIn: expiresInSeconds,
              });
              return { partNumber, url };
            })
          );
          return { key, uploadId, parts: urls };
        })
      );
      return response(200, { presigned: results });
    }

    if (path.endsWith("/multiple/complete") && method === "POST") {
      const { uploads = [] } = body;
      const results = await Promise.all(
        uploads.map(async ({ key, uploadId, parts }) => {
          const cmd = new CompleteMultipartUploadCommand({
            Bucket: BUCKET,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: { Parts: parts },
          });
          const result = await s3.send(cmd);
          const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
          return { key, result, publicUrl };
        })
      );
      return response(200, { completed: results });
    }

    if (path.endsWith("/multiple/abort") && method === "POST") {
      const { uploads = [] } = body;
      await Promise.all(
        uploads.map(async ({ key, uploadId }) => {
          await s3.send(
            new AbortMultipartUploadCommand({
              Bucket: BUCKET,
              Key: key,
              UploadId: uploadId,
            })
          );
        })
      );
      return response(200, { aborted: true });
    }

    return response(404, { error: "Not found" });
  } catch (err) {
    console.error(err);
    return response(500, { error: err.message || "Internal error" });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*", // allow CORS
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(body),
  };
}
