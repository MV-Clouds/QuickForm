import React from "react";
import {
  X,
  Download,
  FileText,
  Image,
  File,
  Music,
  Video,
  Archive,
  
} from "lucide-react";

// Normalize different file shapes (string URL or object)
const getFileUrl = (file) => {
  if (!file) return null;
  if (typeof file === "string") return file;
  return (
    file.url ||
    file.fileUrl ||
    file.path ||
    file.location ||
    file.s3Url ||
    file.downloadUrl ||
    null
  );
};

// Extract filename from URL
const getFilenameFromUrl = (url) => {
  if (typeof url !== "string") return "file";
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop());
  } catch (e) {
    return url.split("/").pop() || "file";
  }
};

const getFilenameFromFile = (fileOrUrl) => {
  if (!fileOrUrl) return "file";
  if (typeof fileOrUrl === "string") return getFilenameFromUrl(fileOrUrl);
  return (
    fileOrUrl.name ||
    fileOrUrl.filename ||
    fileOrUrl.title ||
    getFilenameFromUrl(getFileUrl(fileOrUrl) || "")
  );
};

const isImageFile = (file) => {
  const url = getFileUrl(file);
  if (!url) return false;
  if (typeof url === "string" && url.startsWith("data:image")) return true;
  return /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(url);
};

const getExtension = (file) => {
  const name = getFilenameFromFile(file) || "";
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
};

const getIconForFile = (file) => {
  const ext = getExtension(file);
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return <Image className="w-6 h-6 text-gray-500 flex-shrink-0" />;
  if (["zip", "rar", "7z"].includes(ext))
    return <Archive className="w-6 h-6 text-gray-500 flex-shrink-0" />;
  if (["mp3", "wav", "ogg"].includes(ext))
    return <Music className="w-6 h-6 text-gray-500 flex-shrink-0" />;
  if (["mp4", "mov", "avi", "mkv"].includes(ext))
    return <Video className="w-6 h-6 text-gray-500 flex-shrink-0" />;
  if (["txt", "csv", "md", "json", "xml" ].includes(ext))
    return <FileText className="w-6 h-6 text-gray-500 flex-shrink-0" />;
  return <File className="w-6 h-6 text-gray-500 flex-shrink-0" />;
};

const FileUploadModal = ({
  isOpen,
  onClose,
  files = [],
  fieldLabel,
  onImageClick,
}) => {
  if (!isOpen) return null;

  // Attempt to download a file by fetching it and forcing a blob download.
  // If fetch fails (for example due to CORS), fall back to opening the file in a new tab.
  const downloadFile = async (urlOrFile) => {
    try {
      const url =
        typeof urlOrFile === "string" ? urlOrFile : getFileUrl(urlOrFile);
      if (!url) throw new Error("Invalid file URL");
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const filename =
        getFilenameFromFile(urlOrFile) || getFilenameFromUrl(url) || "download";
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      // Append to body to make click work in all browsers
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Fallback: many file hosts block cross-origin fetches (CORS).
      // Inform the user and open in a new tab so they can manually save.
      console.warn(
        "Could not fetch file for download (CORS or network). Falling back to opening in new tab.",
        err
      );
      try {
        const url =
          typeof urlOrFile === "string" ? urlOrFile : getFileUrl(urlOrFile);
        const a = document.createElement("a");
        a.href = url || "";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.download = getFilenameFromFile(urlOrFile);
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        const fallbackUrl =
          typeof urlOrFile === "string" ? urlOrFile : getFileUrl(urlOrFile);
        if (fallbackUrl) window.open(fallbackUrl, "_blank", "noopener");
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "640px", width: "100%", maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="text-lg font-semibold text-gray-800">
            {fieldLabel || "Uploaded Files"}
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              className="p-2 rounded bg-white border text-gray-600 hover:bg-gray-50"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {files.length > 0 ? (
            <ul className="space-y-3">
              {files.map((file, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded-md border"
                >
                  <div
                    className="flex items-center gap-3 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isImageFile(file) ? (
                      <img
                        src={getFileUrl(file)}
                        alt={getFilenameFromFile(file)}
                        className="w-14 h-14 object-cover rounded-md cursor-pointer"
                        onClick={() =>
                          onImageClick && onImageClick(getFileUrl(file))
                        }
                      />
                    ) : (
                      getIconForFile(file)
                    )}
                    <span
                      className="text-sm text-gray-700 truncate"
                      title={getFilenameFromFile(file)}
                    >
                      {getFilenameFromFile(file)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(file);
                      }}
                      className="p-2 rounded bg-white border text-gray-600 hover:bg-gray-50"
                      title={`Download ${getFilenameFromFile(file)}`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500">No files uploaded.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;