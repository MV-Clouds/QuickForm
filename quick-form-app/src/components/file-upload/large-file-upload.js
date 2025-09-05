import React, { useState } from "react";

const API_BASE = "https://a8sh8cnas4.execute-api.us-east-1.amazonaws.com/dev";

export default function MultipartUploader() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setProgress(0);
    setMessage("");
  };

  const uploadFile = async () => {
    if (!file) {
      alert("Pick a file first!");
      return;
    }

    try {
      // Step 1: Initiate multipart upload
      const initiateRes = await fetch(`${API_BASE}/multipart/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: `uploads/${Date.now()}-${file.name}`,
          contentType: file.type,
        }),
      });
      const { uploadId, key } = await initiateRes.json();

      // Step 2: Split file into 5MB chunks
      const chunkSize = 5 * 1024 * 1024; // 5MB
      const totalParts = Math.ceil(file.size / chunkSize);

      // Step 3: Get presigned URLs for each part
      const presignRes = await fetch(`${API_BASE}/multipart/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          uploadId,
          partNumbers: Array.from({ length: totalParts }, (_, i) => i + 1),
        }),
      });
      const { parts } = await presignRes.json();

      // Step 4: Upload each part
      const uploadedParts = [];
      for (let i = 0; i < totalParts; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const blob = file.slice(start, end);

        const url = parts.find((p) => p.partNumber === i + 1).url;

        const uploadRes = await fetch(url, {
          method: "PUT",
          body: blob,
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload part ${i + 1}`);
        }

        const etag = uploadRes.headers.get("ETag");
        uploadedParts.push({ ETag: etag, PartNumber: i + 1 });

        setProgress(Math.round(((i + 1) / totalParts) * 100));
      }

      // Step 5: Complete multipart upload
      const completeRes = await fetch(`${API_BASE}/multipart/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, uploadId, parts: uploadedParts }),
      });
      const finalResult = await completeRes.json();

      setMessage(`✅ Upload complete: ${finalResult.Location}`);
    } catch (err) {
      console.error(err);
      setMessage(`❌ Upload failed: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Multipart Upload Test</h2>
      <input type="file" onChange={handleFileChange} />
      <button
        onClick={uploadFile}
        disabled={!file}
        style={{ marginLeft: "10px" }}
      >
        Upload
      </button>
      {progress > 0 && <p>Progress: {progress}%</p>}
      {message && <p>{message}</p>}
    </div>
  );
}
