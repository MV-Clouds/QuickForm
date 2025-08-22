import React, { useState } from "react";
import JSZip from "jszip";
import { motion } from "framer-motion";

const FileUpload = ({ acceptedFileTypes, setDesign }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [responseData, setResponseData] = useState(null);
  const [base64String, setBase64String] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage(`File selected: ${selectedFile.name}`);
      setResponseData(null); // Clear previous response
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      setMessage("Please select a file to upload.");
      return;
    }

    // Set uploading state to true before starting the file reader
    setUploading(true);
    setMessage("Reading file...");

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64String = reader.result.split(",")[1];

      setBase64String(base64String); // Store the base64 string for later use
      setMessage("Uploading...");

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
        // Set the design with the file URL
        setDesign({ backgroundImage: data.fileUrl });
        if (response.ok) {
          setMessage("File uploaded successfully!");
        } else {
          // Use the error message from the backend if available
          setMessage(`Upload failed: ${data.message || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Error during upload:", error);
        setMessage("An error occurred during upload.");
        setResponseData(null);
      } finally {
        // Set uploading state to false inside the async callback's finally block
        setUploading(false);
      }
    };

    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      setMessage("Error reading file.");
      setUploading(false); // Also handle error case here
    };
  };

  // Framer Motion variants for animations
  const dropzoneVariants = {
    initial: { scale: 1, borderColor: "#e5e7eb" },
    hover: { scale: 1.02, borderColor: "#60a5fa" },
    active: { scale: 0.98, borderColor: "#1d4ed8" },
  };

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  return (
    <motion.div
      className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow-2xl flex flex-col items-center space-y-6 font-sans"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 10 }}
    >
      <h2 className="text-2xl font-bold text-gray-800">Image Uploader</h2>

      <motion.label
        className="w-full h-40 flex flex-col items-center justify-center border-4 border-dashed rounded-xl cursor-pointer transition-colors duration-200"
        variants={dropzoneVariants}
        initial="initial"
        whileHover="hover"
        whileTap="active"
      >
        <input
          accept={acceptedFileTypes || "image/*"}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <svg
          className="w-12 h-12 mb-3 text-gray-400"
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
        <span className="text-base text-center text-gray-500">
          {file
            ? `Selected: ${file.name}`
            : "Drag & drop an image or click to select"}
        </span>
      </motion.label>

      <div className="flex w-full justify-center">
        <motion.button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`login-button py-2 px-8 rounded-lg font-semibold text-white transition-colors duration-200 ease-in-out ${
            !file || uploading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          {uploading ? (
            <div className="flex items-center">
              <motion.svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                ></path>
              </motion.svg>
              <span>{message || "Uploading..."}</span>
            </div>
          ) : (
            "Upload"
          )}
        </motion.button>
      </div>

      {message && !uploading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`w-full text-center py-3 px-4 rounded-lg font-medium ${
            message.includes("success")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Motion-based image preview */}
      {responseData?.fileUrl && (
        <motion.div
          className="w-full p-4 rounded-lg bg-gray-100 text-gray-800 break-words"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.p className="font-semibold text-center mb-2">
            Uploaded Image:
          </motion.p>
          <motion.img
            src={responseData.fileUrl}
            alt="Uploaded content"
            className="max-w-full h-auto rounded-lg mx-auto border border-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          />
        </motion.div>
      )}
    </motion.div>
  );
};

export default FileUpload;
