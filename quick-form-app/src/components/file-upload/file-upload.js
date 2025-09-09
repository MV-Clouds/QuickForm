import React, { useState } from "react";
import JSZip from "jszip";
import { motion } from "framer-motion";

const FileUpload = ({ acceptedFileTypes, setDesign }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [responseData, setResponseData] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage("");
      setResponseData(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setMessage("Uploading...");

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64String = reader.result.split(",")[1];
      try {
        const apiUrl = `https://gqmyfq34x5.execute-api.us-east-1.amazonaws.com/image?fileName=${encodeURIComponent(
          file.name
        )}&fileType=${encodeURIComponent(file.type)}`;

        const response = await fetch(apiUrl, {
          method: "POST",
          body: base64String,
          headers: {
            "Content-Type": "application/octet-stream",
          },
        });

        const data = await response.json();
        setResponseData(data);
        setDesign({ backgroundImage: data.fileUrl });

        setMessage(
          response.ok ? "Upload successful!" : `Upload failed: ${data.message}`
        );
      } catch (error) {
        console.error("Error:", error);
        setMessage("An error occurred during upload.");
      } finally {
        setUploading(false);
      }
    };
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4 bg-white rounded-lg border border-gray-200 flex flex-col gap-4">
      {/* Dropzone */}
      <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition">
        <input
          type="file"
          accept={acceptedFileTypes || "image/*"}
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <svg
          className="w-10 h-10 text-gray-400 mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M7 16a4 4 0 01-4-4v-1a4 4 0 014-4h4l1.5-3a2 2 0 011.8-1H21a2 2 0 012 2v10a2 2 0 01-2 2H7z"
          />
        </svg>
        <span className="text-sm text-gray-600">
          {file ? `Selected: ${file.name}` : "Click to select or drag an image"}
        </span>
      </label>

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        <motion.button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          whileTap={{ scale: 0.97 }}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-md font-medium text-white ${
            !file || uploading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {uploading ? "Uploading..." : "Upload"}
        </motion.button>
        {message && (
          <span
            className={`text-sm px-3 py-1 rounded-md ${
              message.toLowerCase().includes("success")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </span>
        )}
      </div>

      {/* Preview */}
      {responseData?.fileUrl && (
        <div className="w-full mt-2">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Uploaded Image:
          </p>
          <img
            src={responseData.fileUrl}
            alt="Uploaded preview"
            className="w-full max-h-64 object-contain rounded-md border border-gray-200"
          />
        </div>
      )}
    </div>
  );
};

export default FileUpload;
