import React, { useState , useCallback , useRef , useEffect } from "react";
import { motion } from "framer-motion";

const API_BASE = "https://a8sh8cnas4.execute-api.us-east-1.amazonaws.com/dev";

export default function MultipartUploader({ multiple = false, onChange , initialUrls , onRemove }) {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const uploadCompleted = useRef(false);
  const uploadRefs = useRef({}); // Track per-file completion
  const [urls, setUrls] = useState([]);
  // helper to compare arrays by value
  const arraysEqual = (a = [], b = []) => a.length === b.length && a.every((v, i) => v === b[i]);
  // flag: we're applying a change that came from props (don't echo back to parent)
  const syncingFromProps = useRef(false);
  const handleFileChange = useCallback((e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles.map(f => ({ file: f, progress: 0, message: "" }))]);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  },[]);

  // useEffect(() => {
  //   const incoming = initialUrls || [];
  
  //   // Only update if content is different
  //   if (!arraysEqual(incoming, urls)) {
  //     syncingFromProps.current = true;
  //     setUrls(incoming);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);
  

   // Notify parent only for internal changes (uploads/removes)
   useEffect(() => {
    console.log('here')
     if (syncingFromProps.current) {
       syncingFromProps.current = false;
       return; // skip echo to parent when change originated from props
     }
     for(let x of urls){
      initialUrls.push(x);
    }
    onChange?.([...initialUrls ]);
   }, [urls]);
   // 3. Debounce progress update example
  const lastProgressUpdate = useRef(0);
  const updateProgress = (value) => {
      if (uploadCompleted.current && value < 100) {
          // Ignore any updates less than 100 after completion
          return;
        }
      const now = Date.now();
      if (now - lastProgressUpdate.current > 200) {
          setProgress(value);
          lastProgressUpdate.current = now;
      }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles.map(f => ({ file: f, progress: 0, message: "" }))]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const updateFileState = (index, updates , urls) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };
//   async function uploadPartsWithConcurrency(parts, file, chunkSize, concurrency = 3, setProgress) {
//     const uploadedParts = [];
//     let completed = 0;
  
//     // Worker function to process one part
//     const worker = async (part) => {
//       const start = (part.partNumber - 1) * chunkSize;
//       const end = Math.min(start + chunkSize, file.size);
//       const blob = file.slice(start, end);
  
//       const res = await fetch(part.url, {
//         method: "PUT",
//         body: blob,
//       });
  
//       if (!res.ok) {
//         throw new Error(`Failed to upload part ${part.partNumber}`);
//       }
  
//       const etag = res.headers.get("ETag");
  
//       completed++;
//       updateProgress(Math.round((completed / parts.length) * 100));
  
//       uploadedParts.push({ ETag: etag, PartNumber: part.partNumber });
//     };
  
//     // Run workers in a pool
//     const queue = [...parts];
//     const pool = Array.from({ length: concurrency }).map(async () => {
//       while (queue.length) {
//         const part = queue.shift();
//         if (part) {
//           await worker(part);
//         }
//       }
//     });
  
//     await Promise.all(pool);
//     return uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);
//   }

   // Core upload function
   const uploadFile = async (fileObj, index) => {
    const time = Date.now();
    const file = fileObj.file;
    uploadRefs.current[file.name] = false;
    
    try {
      updateFileState(index, { message: "Starting upload...", progress: 0 });

      // ✅ Small file (<15 MB) → Single PUT presign
      if (file.size < 15 * 1024 * 1024) {
        updateFileState(index, { message: "Requesting single upload URL..." });

        const singleRes = await fetch(`${API_BASE}/single/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: `uploads/${Date.now()}-${file.name}`,
            contentType: file.type,
          }),
        });

        const { url, key } = await singleRes.json();

        updateFileState(index, { message: "Uploading file..." });
        const uploadRes = await fetch(url, {
          method: "PUT",
          body: file,
        });

        if (!uploadRes.ok) throw new Error("Single upload failed");

        updateFileState(index, { message: "✅ Upload complete!", progress: 100 });
        uploadRefs.current[file.name] = true;
        console.log("Single uploaded:", key);
        const elapsed = Date.now() - time;
        const ms = elapsed % 1000;
        const totalSeconds = Math.floor(elapsed / 1000);
        const s = totalSeconds % 60;
        const totalMinutes = Math.floor(totalSeconds / 60);
        const min = totalMinutes % 60;
        const hr = Math.floor(totalMinutes / 60);
        let formatted = '';
        if (hr > 0) formatted += `${hr}hr `;
        if (min > 0) formatted += `${min}min `;
        if (s > 0) formatted += `${s}s `;
        formatted += `${ms}ms`;
        console.log('Total time', formatted.trim());
        setUrls((prev) => [...prev, key]); // parent will be notified by the guarded effect
        return;
      }

      // ✅ Large file → Multipart
      updateFileState(index, { message: "Initializing multipart upload..." });
      const initiateRes = await fetch(`${API_BASE}/multipart/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: `uploads/${Date.now()}-${file.name}`,
          contentType: file.type,
        }),
      });
      const { uploadId, key } = await initiateRes.json();

      const chunkSize = 8 * 1024 * 1024;
      const totalParts = Math.ceil(file.size / chunkSize);

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

      let completed = 0;
      const uploadedParts = await Promise.all(
        parts.map(async (p) => {
          const start = (p.partNumber - 1) * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const blob = file.slice(start, end);

          const uploadRes = await fetch(p.url, { method: "PUT", body: blob });
          if (!uploadRes.ok) throw new Error(`Part ${p.partNumber} failed`);

          const etag = uploadRes.headers.get("ETag");

          completed++;
          updateFileState(index, {
            progress: Math.round((completed / totalParts) * 100),
            message: `Uploading... ${Math.round((completed / totalParts) * 100)}%`,
          });

          return { ETag: etag, PartNumber: p.partNumber };
        })
      );

      const completeRes = await fetch(`${API_BASE}/multipart/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, uploadId, parts: uploadedParts }),
      });
      const result = await completeRes.json();

      updateFileState(index, { message: "✅ Upload complete!", progress: 100 });
      uploadRefs.current[file.name] = true;
      console.log("Multipart uploaded:", key);
      setUrls((prev) => [...prev, key]); // parent will be notified by the guarded effect
      const elapsed = Date.now() - time;
        const ms = elapsed % 1000;
        const totalSeconds = Math.floor(elapsed / 1000);
        const s = totalSeconds % 60;
        const totalMinutes = Math.floor(totalSeconds / 60);
        const min = totalMinutes % 60;
        const hr = Math.floor(totalMinutes / 60);
        let formatted = '';
        if (hr > 0) formatted += `${hr}hr `;
        if (min > 0) formatted += `${min}min `;
        if (s > 0) formatted += `${s}s `;
        formatted += `${ms}ms`;
        console.log('Total time', formatted.trim());
    } catch (err) {
      console.error(err);
      updateFileState(index, { message: `❌ Failed: ${err.message}` });
    }
  };

  const startUploadAll = () => {
    files.forEach((f, i) => {
      uploadFile(f, i);
    })
  };

  return (
    <div style={{  margin: "5px auto" }}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          border: "2px dashed #CBD5E0",
          borderRadius: "12px",
          padding: "1.5rem 2rem",
          textAlign: "center",
          backgroundColor: "#F7FAFC",
          cursor: "pointer",
        }}
        onClick={() => document.getElementById("file-input").click()}
      >
        <input
          id="file-input"
          type="file"
          multiple = {multiple}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <p>📁 Drag & drop files here or click to browse</p>
      </div>

    <div>
      {/* File list */}
      {files.map((f, i) => (
        <div
          key={i}
          style={{
            marginBottom: "1rem",
            background: "#fff",
            padding: "1rem",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontWeight: "600" }}>{f.file.name}</p>
              <p style={{ fontSize: "0.8rem", color: "#666" }}>
                {(f.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={() => removeFile(i)}
              style={{ border: "none", background: "none", cursor: "pointer" }}
            >
              ❌
            </button>
          </div>

          <div style={{ marginTop: "0.5rem" }}>
            <div
              style={{
                height: "8px",
                background: "#eee",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${f.progress}%`,
                  height: "8px",
                  background: "#4299E1",
                  transition: "width 0.3s",
                }}
              />
            </div>
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
              {f.message}
            </p>
          </div>
        </div>
      ))}
      
       {/* {urls.map((url, index) => (
        <div
          key={url}
          style={{
            marginBottom: "1rem",
            background: "#fff",
            padding: "1rem",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: "600", color: "#4299E1", textDecoration: "none" }}>
            {url.split('/').pop()} 
          </a>
          <button
            onClick={() => {
                setUrls((prev) => prev.filter((_, i) => i !== index));
                onRemove?.(index);
              }}  
            style={{ border: "none", background: "none", cursor: "pointer", color: "#E53E3E" }}
          >
            ❌
          </button>
        </div>
      ))} */}

      {files.length > 0 && (
        <button
          onClick={startUploadAll}
          style={{
            width: "100%",
            padding: "0.5rem",
            background: "#4299E1",
            color: "#fff",
            fontWeight: "600",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
          type = 'button'
        >
          Upload 
        </button>
      )}
      </div>
    </div>
  );
}