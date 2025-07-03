import React, { useState } from 'react';
import JSZip from 'jszip';

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [responseData, setResponseData] = useState(null);
    const [base64String, setBase64String] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setMessage('');
        setResponseData(null);
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!file) {
            setMessage('Please select a file to upload.');
            return;
        }

        setUploading(true);
        setMessage('Processing file...');

        try {
            let fileToUpload = file;
            let fileName = file.name;
            let fileType = file.type;

            // Check if file size is greater than 4MB (4 * 1024 * 1024 bytes)
            const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB in bytes
            if (file.size > MAX_FILE_SIZE) {
                setMessage('Zipping file...');
                const zip = new JSZip();
                zip.file(file.name, file);
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                fileToUpload = new File([zipBlob], `${file.name}.zip`, { type: 'application/zip' });
                fileName = `${file.name}.zip`;
                fileType = 'application/zip';
            }

            const reader = new FileReader();
            reader.readAsDataURL(fileToUpload);

            reader.onload = async () => {
                const base64String = reader.result.split(',')[1];
                setBase64String(base64String);
                setMessage('Uploading...');

                try {
                    const apiUrl = `https://gqmyfq34x5.execute-api.us-east-1.amazonaws.com/image?fileName=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(fileType)}`;

                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        body: base64String,
                        headers: {
                            'Content-Type': 'application/octet-stream',
                        },
                    });

                    const data = await response.json();
                    setResponseData(data);

                    if (response.ok) {
                        setMessage('File uploaded successfully!');
                    } else {
                        setMessage(`Upload failed: ${data.message || 'Unknown error'}`);
                    }
                } catch (error) {
                    console.error('Error during upload:', error);
                    setMessage('An error occurred during upload.');
                    setResponseData(null);
                } finally {
                    setUploading(false);
                }
            };

            reader.onerror = (error) => {
                console.error('Error reading file:', error);
                setMessage('Error reading file.');
                setUploading(false);
            };
        } catch (error) {
            console.error('Error processing file:', error);
            setMessage('Error processing file.');
            setUploading(false);
        }
    };

    return (
        <form
            onSubmit={handleUpload}
            className="max-w-md mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg flex flex-col items-center space-y-6"
        >
            <label className="w-full flex flex-col items-center px-4 py-6 bg-blue-50 text-blue-700 rounded-lg shadow-md tracking-wide uppercase border border-blue-200 cursor-pointer hover:bg-blue-100 transition">
                <svg className="w-8 h-8 mb-2 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-5 4v-4m0 0l-3 3m3-3l3 3" />
                </svg>
                <span className="text-base leading-normal">
                    {file ? file.name : "Select a file"}
                </span>
                <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                />
            </label>
            <button
                type="submit"
                disabled={!file || uploading}
                className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition ${
                    !file || uploading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
                {uploading ? (
                    <span>
                        <svg className="inline w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                        </svg>
                        {message || 'Uploading...'}
                    </span>
                ) : (
                    "Upload"
                )}
            </button>
            {message && !uploading && (
                <div
                    className={`w-full text-center py-2 px-4 rounded-lg ${
                        message.includes("success") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                >
                    {message}
                </div>
            )}
            {responseData && (
                <div className="w-full p-4 rounded-lg bg-gray-100 text-gray-800 break-words">
                    <p className="font-semibold text-center mb-2">Upload Result:</p>
                    {responseData.fileUrl ? (
                        <>
                            {fileType === 'application/zip' ? (
                                <p className="text-xs text-center mt-2">Zip File URL: <a href={responseData.fileUrl} target="_blank" rel="noopener noreferrer">{responseData.fileUrl}</a></p>
                            ) : (
                                <>
                                    <img src={responseData.fileUrl} alt="Uploaded content" className="max-w-full h-auto rounded-lg mx-auto" />
                                    <p className="text-xs text-center mt-2">File URL: {responseData.fileUrl}</p>
                                </>
                            )}
                        </>
                    ) : (
                        <p className="text-xs text-center mt-2">No file URL available.</p>
                    )}
                </div>
            )}
        </form>
    );
};

export default FileUpload;