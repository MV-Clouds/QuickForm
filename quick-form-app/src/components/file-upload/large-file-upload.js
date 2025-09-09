import React, { useState , useCallback , useRef } from "react";
import { motion } from "framer-motion";

const API_BASE = "https://a8sh8cnas4.execute-api.us-east-1.amazonaws.com/dev";

export default function MultipartUploader() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const uploadCompleted = useRef(false);

  const handleFileChange = useCallback((e) => {
    setFile(e.target.files[0]);
    setProgress(0);
    setMessage("");
  },[]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  },[]);

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
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setProgress(0);
      setMessage("");
    }
  };

  const removeFile = () => {
    setFile(null);
    setProgress(0);
    setMessage("");
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
  
  const uploadFile = async () => {
    uploadCompleted.current = false;
    if (!file) {
      setMessage("⚠️ Please select a file first!");
      return;
    }
    
    setIsUploading(true);
    setProgress(0);
    setMessage("Starting upload...");
    const time = Date.now();
    console.log('Time started..');
    try {
      // Step 1: Initiate multipart upload
      setMessage("Initializing upload...");
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
      const chunkSize = 8 * 1024 * 1024; // 5MB
      const totalParts = Math.ceil(file.size / chunkSize);

      // Step 3: Get presigned URLs for each part
      setMessage("Preparing upload...");
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
    //   const uploadedParts = [];
    //   for (let i = 0; i < totalParts; i++) {
    //     const start = i * chunkSize;
    //     const end = Math.min(start + chunkSize, file.size);
    //     const blob = file.slice(start, end);

    //     const url = parts.find((p) => p.partNumber === i + 1).url;

    //     const uploadRes = await fetch(url, {
    //       method: "PUT",
    //       body: blob,
    //     });

    //     if (!uploadRes.ok) {
    //       throw new Error(`Failed to upload part ${i + 1}`);
    //     }

    //     const etag = uploadRes.headers.get("ETag");
    //     uploadedParts.push({ ETag: etag, PartNumber: i + 1 });

    //     const partProgress = Math.round(((i + 1) / totalParts) * 100);
    //     setProgress(partProgress);
    //     setMessage(`Uploading... ${partProgress}%`);
    //   }
    let uploadedParts;
    // if(file.size < 20 * 1024 * 1024){
    //     // Step 4: Upload parts concurrently
    //     setMessage("Uploading parts...");
    //     uploadedParts = await uploadPartsWithConcurrency(
    //     parts,
    //     file,
    //     chunkSize,
    //     10, // small files = higher concurrency // concurrency level
    //     (progress) => {
    //       setProgress(progress);
    //       setMessage(`Uploading... ${progress}%`);
    //     }
    //   );
    // }
    // Small file (<15MB) → Single presign
    if (file.size < 15 * 1024 * 1024) {
        setMessage("Requesting upload URL...");
  
        const singleRes = await fetch(`${API_BASE}/single/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: `uploads/${Date.now()}-${file.name}`,
            contentType: file.type,
          }),
        });
        const { url, key } = await singleRes.json();
  
        setMessage("Uploading file...");
        const uploadRes = await fetch(url, {
          method: "PUT",
          body: file,
        });
  
        if (!uploadRes.ok) {
          throw new Error("Single upload failed");
        }
        uploadCompleted.current = true;
        updateProgress(100);
        setMessage("✅ Upload complete!");
        console.log("Final result", { key });
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
        return;
      }
    else{
        // Step 4: Upload each part in parallel
        setMessage("Uploading parts...");
        uploadedParts = await Promise.all(
        parts.map(async (p) => {
            const start = (p.partNumber - 1) * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const blob = file.slice(start, end);

            const uploadRes = await fetch(p.url, {
            method: "PUT",
            body: blob,
            });

            if (!uploadRes.ok) {
            throw new Error(`Failed to upload part ${p.partNumber}`);
            }

            const etag = uploadRes.headers.get("ETag");

            // progress tracking
            updateProgress((prev) => {
                const next = prev + Math.round(100 / totalParts);
                return next > 100 ? 100 : next;
              });
            return { ETag: etag, PartNumber: p.partNumber };
        })
        );
    }
    
      // Step 5: Complete multipart upload
      setMessage("Finalizing upload...");
      const completeRes = await fetch(`${API_BASE}/multipart/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, uploadId, parts: uploadedParts }),
      });
      const finalResult = await completeRes.json();
      console.log('Final result' , finalResult)
      uploadCompleted.current = true;
      setProgress(100);
      setMessage(`✅ Upload complete!`);
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
      setMessage(`❌ Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ 
        padding: '2rem', 
        maxWidth: '600px', 
        margin: '0 auto',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" 
      }}
    >
      
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          border: `2px dashed ${isDragging ? '#4299E1' : '#CBD5E0'}`,
          borderRadius: '12px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          backgroundColor: isDragging ? '#EBF4FF' : '#F7FAFC',
          cursor: 'pointer',
          marginBottom: '1.5rem',
          transition: 'all 0.3s ease'
        }}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <div style={{ fontSize: '3rem', color: '#4299E1', marginBottom: '1rem' }}>
          📁
        </div>
        <p style={{ color: '#4A5568', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
          {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
        </p>
        <p style={{ color: '#A0AEC0', fontSize: '0.9rem' }}>
          or click to browse files
        </p>
      </motion.div>

      {file && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#EBF4FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              color: '#4299E1'
            }}>
              📄
            </div>
            <div>
              <p style={{ fontWeight: 500, color: '#2D3748' }}>
                {file.name}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#718096' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={removeFile}
            style={{
              background: 'none',
              border: 'none',
              color: '#718096',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ×
          </button>
        </motion.div>
      )}

      <motion.button
        onClick={uploadFile}
        disabled={!file || isUploading}
        whileHover={{ scale: !file || isUploading ? 1 : 1.03 }}
        whileTap={{ scale: !file || isUploading ? 1 : 0.97 }}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: file && !isUploading ? '#4299E1' : '#CBD5E0',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: file && !isUploading ? 'pointer' : 'not-allowed',
          width: '100%',
          fontSize: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        {isUploading ? (
          <span>Uploading... {progress}%</span>
        ) : (
          <span>Start Upload</span>
        )}
      </motion.button>

      {progress > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '1rem' }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.5rem'
          }}>
            <span style={{ fontSize: '0.9rem', color: '#4A5568' }}>Upload Progress</span>
            <span style={{ fontSize: '0.9rem', color: '#4299E1', fontWeight: 600 }}>
              {progress}%
            </span>
          </div>
          <div style={{
            height: '8px',
            backgroundColor: '#E2E8F0',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              style={{
                height: '100%',
                backgroundColor: '#4299E1',
                borderRadius: '4px',
                boxShadow: '0 0 8px rgba(66, 153, 225, 0.5)'
              }}
            />
          </div>
        </motion.div>
      )}

      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: message.includes('✅') ? '#C6F6D5' : 
                            message.includes('❌') ? '#FED7D7' : '#EBF4FF',
            color: message.includes('✅') ? '#2F855A' : 
                  message.includes('❌') ? '#C53030' : '#2B6CB0',
            textAlign: 'center',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
}