import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Download,
  Archive,
  Trash2,
  FileText,
  Link as LinkIcon,
  Calendar,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import jsPDF from "jspdf";

const SubmissionPreviewNew = ({
  submission,
  allFields,
  fieldsByVersion,
  onStatusUpdate,
  onClose,
  onArchive,
  onDelete,
  onRefresh,
  onImageClick,
  onShowFiles,
}) => {
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Update status to "Read" when component mounts
  useEffect(() => {
    if (submission && submission.status === "Unread" && onStatusUpdate) {
      onStatusUpdate(submission.id, "Read");
    }
  }, [submission]);

  // Get organized field data for this submission
  const getOrganizedFieldData = () => {
    if (!submission || !fieldsByVersion || !submission.formVersionId) {
      return { sections: [], fieldsWithoutSection: [] };
    }

    const versionFields = fieldsByVersion[submission.formVersionId] || {};
    const submissionData = submission.data || {};

    const sections = [];
    const fieldsWithoutSection = [];
    let currentSection = null;

    // Sort fields by order number
    const sortedFields = Object.entries(versionFields).sort(([, a], [, b]) => {
      const orderA = a.orderNumber || 999;
      const orderB = b.orderNumber || 999;
      return orderA - orderB;
    });

    sortedFields.forEach(([fieldId, fieldInfo]) => {
      const fieldType = fieldInfo.type?.toLowerCase();
      const fieldValue = submissionData[fieldId];

      if (fieldType === "heading") {
        // Start a new section
        if (currentSection && currentSection.fields.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          title: fieldInfo.label,
          fields: [],
        };
      } else if (fieldType === "divider") {
        // End current section
        if (currentSection && currentSection.fields.length > 0) {
          sections.push(currentSection);
          currentSection = null;
        }
      } else if (!["displaytext", "pagebreak"].includes(fieldType)) {
        // Regular field with data
        if (
          fieldValue !== null &&
          fieldValue !== undefined &&
          fieldValue !== ""
        ) {
          const fieldData = {
            id: fieldId,
            label: fieldInfo.label,
            value: fieldValue,
            type: fieldType,
            info: fieldInfo,
          };

          if (currentSection) {
            currentSection.fields.push(fieldData);
          } else {
            fieldsWithoutSection.push(fieldData);
          }
        }
      }
    });

    // Add remaining section
    if (currentSection && currentSection.fields.length > 0) {
      sections.push(currentSection);
    }

    return { sections, fieldsWithoutSection };
  };

  const { sections, fieldsWithoutSection } = getOrganizedFieldData();

  // Format submission date
  const formatSubmissionDate = (dateString) => {
    if (!dateString) return "Unknown date";

    const date = new Date(dateString);
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    return date.toLocaleDateString("en-US", options);
  };

  // small helper to resolve different file/signature shapes to a usable URL or dataUrl
  const resolveToUrl = (val) => {
    if (!val) return null;
    // arrays -> first
    if (Array.isArray(val)) return resolveToUrl(val[0]);
    if (typeof val === "string") return val;
    // object shapes
    return (
      val?.dataUrl ||
      val?.url ||
      val?.fileUrl ||
      val?.path ||
      val?.s3Url ||
      val?.downloadUrl ||
      null
    );
  };

  // Strict image-string detector: checks data URLs and real image file extensions on the URL path
  const isImageString = (s) => {
    if (!s || typeof s !== "string") return false;
    if (s.startsWith("data:image")) return true;
    // Try to parse as URL and inspect pathname extension (safer than testing entire URL)
    try {
      const pathname = new URL(s).pathname || s;
      return /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(pathname);
    } catch (e) {
      // fallback: strip query/hash and test
      return /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(s.split(/[?#]/)[0]);
    }
  };

  // Render field value based on type
  const renderFieldValue = (field) => {
    const { value, type } = field;

    switch (type) {
      case "fileupload":
      case "imageuploader":
        const filesRaw = Array.isArray(value) ? value : [value].filter(Boolean);
        // normalize to usable URLs/dataURLs
        const files = filesRaw.map((f) => resolveToUrl(f)).filter(Boolean);
        if (files.length === 0)
          return <span className="text-gray-500">No file uploaded.</span>;

        const isSingleImage = files.length === 1 && isImageString(files[0]);

        if (isSingleImage) {
          // RENDER FOR A SINGLE IMAGE: Opens full-screen modal
          return (
            <div
              className="relative group inline-block"
              onClick={() => onImageClick && onImageClick(files[0])}
            >
              <img
                src={files[0]}
                alt="Uploaded file"
                className="w-32 h-32 object-contain object-center rounded-lg border border-gray-200 shadow-sm bg-gray-100 cursor-pointer"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
              </div>
            </div>
          );
        } else {
          // RENDER FOR MULTIPLE FILES / NON-IMAGE FILES: Opens list modal
          return (
            <button
              onClick={() => onShowFiles && onShowFiles(files, field.label)}
              className="flex w-full max-w-xs items-center space-x-3 text-left p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
            >
              <FileText className="w-6 h-6 text-gray-500 flex-shrink-0" />
              <div className="truncate">
                <span className="text-blue-600 font-medium">
                  {files.length} {files.length > 1 ? "files" : "file"}
                </span>
                <p className="text-xs text-gray-500">Click to view</p>
              </div>
            </button>
          );
        }
      case "link":
        if (typeof value === "string" && value.startsWith("http")) {
          return (
            <div className="flex items-center space-x-2">
              <LinkIcon className="w-4 h-4 text-blue-600" />
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium break-all"
              >
                {value}
              </a>
            </div>
          );
        }
        break;

      case "toggle":
        const boolValue = value === true || value === "true";
        return (
          <div className="flex items-center space-x-2">
            {boolValue ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span
              className={`font-medium ${
                boolValue ? "text-green-800" : "text-red-800"
              }`}
            >
              {boolValue ? "Yes" : "No"}
            </span>
          </div>
        );

      case "date":
        if (value) {
          return (
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-800 font-medium">
                {new Date(value).toLocaleDateString()}
              </span>
            </div>
          );
        }
        break;

      case "datetime":
        if (value) {
          return (
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-800 font-medium">
                {new Date(value).toLocaleString()}
              </span>
            </div>
          );
        }
        break;

      case "time":
        if (value) {
          return (
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-800 font-medium">{value}</span>
            </div>
          );
        }
        break;

      case "rating":
        if (typeof value === "number") {
          return (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < value
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-800 font-medium">({value}/5)</span>
            </div>
          );
        }
        break;

      case "textarea":
      case "richtext":
        return (
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="text-gray-800 whitespace-pre-wrap font-medium">
              {String(value)}
            </div>
          </div>
        );

      case "signature": {
        // signature may be array/string/object
        const sigUrl = resolveToUrl(value);
        if (sigUrl && typeof sigUrl === "string") {
          // show if data URL or http(s) URL or image extension
          const isImg = isImageString(sigUrl);
          if (isImg) {
            return (
              <div
                className="relative group inline-block"
                onClick={() => onImageClick && onImageClick(sigUrl)}
              >
                <img
                  src={sigUrl}
                  alt="Digital signature"
                  className="max-w-xs max-h-32 object-contain object-center"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
            );
          }
        }
        break;
      }

      case "checkbox":
      case "checkboxgroup":
      case "multiselect":
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-2">
              {value.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                >
                  {String(item)}
                </span>
              ))}
            </div>
          );
        } else if (typeof value === "boolean") {
          return (
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                value
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}
            >
              {value ? "Yes" : "No"}
            </span>
          );
        }
        break;

      case "radio":
      case "dropdown":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
            {String(value)}
          </span>
        );

      case "payment":
        if (typeof value === "object" && value !== null) {
          return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-800 font-semibold text-lg">
                  Payment Completed
                </span>
              </div>
              <div className="space-y-2 text-sm">
                {value.amount && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-lg">
                      ${value.amount}
                    </span>
                  </div>
                )}
                {value.transactionId && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {value.transactionId}
                    </span>
                  </div>
                )}
                {value.paymentMethod && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-semibold">{value.paymentMethod}</span>
                  </div>
                )}
                {value.status && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-semibold text-green-600">
                      {value.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        }
        break;

      default:
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-2">
              {value.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200"
                >
                  {String(item)}
                </span>
              ))}
            </div>
          );
        }

        if (typeof value === "object") {
          return (
            <pre className="text-sm bg-gray-50 p-3 rounded-lg border text-gray-800 font-mono overflow-x-auto">
              {JSON.stringify(value, null, 2)}
            </pre>
          );
        }

        return (
          <span className="text-gray-800 font-medium">{String(value)}</span>
        );
    }

    return <span className="text-gray-800 font-medium">{String(value)}</span>;
  };

  // Download functions
  const downloadAsPDF = async () => {
    setIsLoading(true);
    try {
      const pdf = new jsPDF();
      let yPosition = 20;

      // Title
      pdf.setFontSize(20);
      pdf.text(
        `${submission.name || `Response ${submission.index || 1}`}`,
        20,
        yPosition
      );
      yPosition += 10;

      // Date
      pdf.setFontSize(12);
      pdf.text(
        `Submitted on ${formatSubmissionDate(submission.submissionDate)}`,
        20,
        yPosition
      );
      yPosition += 20;

      // Helper function to fetch, resize, and prepare an image for the PDF
      async function addImageToPDF(imageUrl, maxW = 170, maxH = 120) {
        const isDataUrl = imageUrl.startsWith("data:image");
        const fetchUrl = isDataUrl
          ? imageUrl
          : imageUrl +
            (imageUrl.includes("?") ? "&" : "?") +
            "cors-fix=" +
            Date.now();

        try {
          const img = new Image();

          if (!isDataUrl) {
            const resp = await fetch(fetchUrl, {
              mode: "cors",
              credentials: "omit",
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            img.src = URL.createObjectURL(blob);
          } else {
            img.src = imageUrl;
          }

          await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (e) => reject(e);
          });

          let w = img.naturalWidth;
          let h = img.naturalHeight;

          // Only scale down if image is larger than maxW/maxH; do not scale up.
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);

          const dataUrl = canvas.toDataURL("image/png");

          if (!isDataUrl && img.src.startsWith("blob:")) {
            URL.revokeObjectURL(img.src);
          }

          return { dataUrl, width: w, height: h };
        } catch (e) {
          console.error("[addImageToPDF] error:", e);
          throw e;
        }
      }

      // Process sections
      for (const section of [
        ...sections,
        ...(fieldsWithoutSection.length > 0
          ? [{ title: "Additional Information", fields: fieldsWithoutSection }]
          : []),
      ]) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.text(section.title, 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        for (const field of section.fields) {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }

          if (field.type === "fileupload" || field.type === "imageuploader") {
            pdf.text(`${field.label}:`, 20, yPosition);
            yPosition += 7;

            const files = Array.isArray(field.value)
              ? field.value
              : [field.value];
            for (const file of files) {
              if (typeof file === "string" && file.startsWith("http")) {
                if (/\.jpe?g$|\.png$|\.gif$|\.webp$/i.test(file)) {
                  try {
                    const { dataUrl, width, height } = await addImageToPDF(
                      file
                    );
                    if (yPosition + height > 280) {
                      pdf.addPage();
                      yPosition = 20;
                    }
                    pdf.addImage(dataUrl, "PNG", 20, yPosition, width, height);
                    yPosition += height + 5;
                  } catch (error) {
                    console.error("Error adding image to PDF:", error);
                    pdf.text(`[Could not load image]`, 25, yPosition);
                    yPosition += 7;
                  }
                } else {
                  pdf.text(`File: ${file}`, 25, yPosition);
                  yPosition += 7;
                }
              }
            }
          } else if (
            field.type === "signature" &&
            typeof field.value === "string" &&
            field.value.startsWith("data:image")
          ) {
            pdf.text(`${field.label}:`, 20, yPosition);
            yPosition += 7;
            try {
              const { dataUrl, width, height } = await addImageToPDF(
                field.value,
                150,
                75
              );
              if (yPosition + height > 280) {
                pdf.addPage();
                yPosition = 20;
              }
              pdf.addImage(dataUrl, "PNG", 20, yPosition, width, height);
              yPosition += height + 5;
            } catch (error) {
              console.error("Error adding signature to PDF:", error);
              pdf.text(`[Could not load signature]`, 25, yPosition);
              yPosition += 7;
            }
          } else {
            const fieldText = `${field.label}: ${String(field.value)}`;
            const lines = pdf.splitTextToSize(fieldText, 170);
            pdf.text(lines, 20, yPosition);
            yPosition += lines.length * 7;
          }
          yPosition += 3;
        }
        yPosition += 10;
      }

      pdf.save(`${submission.name || "submission"}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAsText = () => {
    const content = [
      `${submission.name || `Response ${submission.index || 1}`}`,
      `Submitted on ${formatSubmissionDate(submission.submissionDate)}`,
      "",
      ...sections
        .map((section) => [
          section.title,
          "=".repeat(section.title.length),
          ...section.fields.map(
            (field) => `${field.label}: ${String(field.value)}`
          ),
          "",
        ])
        .flat(),
      ...(fieldsWithoutSection.length > 0
        ? [
            "Additional Information",
            "=".repeat("Additional Information".length),
            ...fieldsWithoutSection.map(
              (field) => `${field.label}: ${String(field.value)}`
            ),
            "",
          ]
        : []),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${submission.name || "submission"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsJSON = () => {
    const data = {
      submission: {
        id: submission.id,
        name: submission.name,
        submissionDate: submission.submissionDate,
        status: submission.status,
        formVersionId: submission.formVersionId,
      },
      sections: sections,
      additionalFields: fieldsWithoutSection,
      rawData: submission.data,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${submission.name || "submission"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsXML = () => {
    const escapeXML = (str) => {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    const formatFieldValue = (field) => {
      const { value, type } = field;

      if (type === "fileupload" || type === "imageuploader") {
        if (Array.isArray(value)) {
          return value
            .map(
              (file, index) =>
                `<file index="${index}">${escapeXML(file)}</file>`
            )
            .join("");
        } else {
          return `<file>${escapeXML(value)}</file>`;
        }
      } else if (type === "multiselect" || type === "checkboxgroup") {
        if (Array.isArray(value)) {
          return value
            .map(
              (item, index) =>
                `<option index="${index}">${escapeXML(item)}</option>`
            )
            .join("");
        }
      } else if (type === "payment" && typeof value === "object") {
        return [
          value.amount && `<amount>${escapeXML(value.amount)}</amount>`,
          value.transactionId &&
            `<transactionId>${escapeXML(value.transactionId)}</transactionId>`,
          value.paymentMethod &&
            `<paymentMethod>${escapeXML(value.paymentMethod)}</paymentMethod>`,
          value.status &&
            `<paymentStatus>${escapeXML(value.status)}</paymentStatus>`,
        ]
          .filter(Boolean)
          .join("");
      } else if (typeof value === "object") {
        return `<![CDATA[${JSON.stringify(value, null, 2)}]]>`;
      }

      return escapeXML(value);
    };

    const xmlContent = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<submission>",
      `  <metadata>`,
      `    <id>${escapeXML(submission.id)}</id>`,
      `    <name>${escapeXML(submission.name || "")}</name>`,
      `    <submissionDate>${escapeXML(
        submission.submissionDate
      )}</submissionDate>`,
      `    <status>${escapeXML(submission.status)}</status>`,
      `    <formVersionId>${escapeXML(
        submission.formVersionId
      )}</formVersionId>`,
      `    <archived>${submission.archived || false}</archived>`,
      `  </metadata>`,
      "  <data>",
      ...sections
        .map((section) => [
          `    <section title="${escapeXML(section.title)}">`,
          ...section.fields.map((field) => {
            const fieldValue = formatFieldValue(field);
            return `      <field id="${escapeXML(field.id)}" label="${escapeXML(
              field.label
            )}" type="${escapeXML(field.type)}">${fieldValue}</field>`;
          }),
          "    </section>",
        ])
        .flat(),
      ...(fieldsWithoutSection.length > 0
        ? [
            '    <section title="Additional Information">',
            ...fieldsWithoutSection.map((field) => {
              const fieldValue = formatFieldValue(field);
              return `      <field id="${escapeXML(
                field.id
              )}" label="${escapeXML(field.label)}" type="${escapeXML(
                field.type
              )}">${fieldValue}</field>`;
            }),
            "    </section>",
          ]
        : []),
      "  </data>",
      "</submission>",
    ].join("\n");

    const blob = new Blob([xmlContent], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${submission.name || "submission"}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!submission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No submission data available</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 font-['Inter',sans-serif] relative h-full">
      {/* Header (static) and content packed in a flex container */}
      <div className="preview-modal-inner flex flex-col h-full relative">
        <div className="preview-modal-header relative h-full bg-white px-4">
          <div className="header-container flex items-center justify-between ">
            {/* Left Side: Back Arrow & Title */}
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {submission.name || `Response ${submission.index || 1}`}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Submitted on {formatSubmissionDate(submission.submissionDate)}
                </p>
              </div>
            </div>

            {/* Right Side: Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Download Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsDownloadOpen(!isDownloadOpen)}
                  disabled={isLoading}
                  aria-label="Download"
                  className="p-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                </button>
                {isDownloadOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          downloadAsPDF();
                          setIsDownloadOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Download as PDF</span>
                      </button>
                      <button
                        onClick={() => {
                          downloadAsText();
                          setIsDownloadOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Download as Text</span>
                      </button>
                      <button
                        onClick={() => {
                          downloadAsJSON();
                          setIsDownloadOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Download as JSON</span>
                      </button>
                      <button
                        onClick={() => {
                          downloadAsXML();
                          setIsDownloadOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Download as XML</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Archive Button */}
              <button
                onClick={() => onArchive && onArchive(submission.id)}
                className="p-2 text-gray-600 hover:text-orange-600 bg-white hover:bg-orange-50 rounded-lg transition-colors border border-gray-300"
                title="Archive submission"
              >
                <Archive className="w-5 h-5" />
              </button>

              {/* Delete Button */}
              <button
                onClick={() => onDelete && onDelete(submission.id)}
                className="p-2 text-gray-600 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg transition-colors border border-gray-300"
                title="Delete submission"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="preview-modal-body flex-grow overflow-hidden w-full relative p-4 ">
            <div className="space-y-6 preview-modal-inner-body overflow-y-auto h-full relative pr-1">
              {sections.map((section, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <h2 className="text-lg font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-100">
                    {section.title}
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {section.fields.map((field) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 sm:grid-cols-[200px,1fr] gap-4 items-start"
                      >
                        <div className="text-blue-600 font-medium text-sm">
                          {field.label}
                        </div>
                        <div className="text-gray-800">
                          {renderFieldValue(field)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {fieldsWithoutSection.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-100">
                    Additional Information
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {fieldsWithoutSection.map((field) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 sm:grid-cols-[200px,1fr] gap-4 items-start"
                      >
                        <div className="text-blue-600 font-medium text-sm">
                          {field.label}
                        </div>
                        <div className="text-gray-800">
                          {renderFieldValue(field)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {isDownloadOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDownloadOpen(false)}
        />
      )}
    </div>
  );
};

export default SubmissionPreviewNew;