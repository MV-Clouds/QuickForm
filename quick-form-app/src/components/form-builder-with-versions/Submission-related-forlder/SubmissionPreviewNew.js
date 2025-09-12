import React, { useState, useEffect, useMemo, useRef } from "react";
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
import html2canvas from "html2canvas";

const SubmissionPreviewNew = ({
  submission,
  allFields,
  fieldsByVersion,
  formVersions = [],
  onStatusUpdate,
  onClose,
  onArchive,
  onDelete,
  onRefresh,
  onImageClick,
  onShowFiles,
}) => {
  const [openMenu, setOpenMenu] = useState(null); // 'downloads' | 'templates' | null
  const [isLoading, setIsLoading] = useState(false);
  const printableRef = useRef(null);

  // Prebuilt PDF templates (colors and sizing). Default is applied initially.
  const TEMPLATES = useMemo(
    () => ({
      default: {
        key: "default",
        name: "Default",
        page: { background: "#ffffff", padding: 16 },
        header: { background: "#0b295e", color: "#ffffff" },
        section: {
          background: "#ffffff",
          borderColor: "#e5e7eb",
          titleColor: "#111827",
        },
        text: { color: "#111827", muted: "#6b7280" },
        accent: { borderRadius: 12 },
        // meta layout: positions of meta tiles (date/id/version)
        metaLayout: "row",
      },
      ocean: {
        key: "ocean",
        name: "Ocean",
        page: { background: "#f0f7ff", padding: 16 },
        header: { background: "#0ea5e9", color: "#ffffff" },
        section: {
          background: "#ffffff",
          borderColor: "#bae6fd",
          titleColor: "#0c4a6e",
        },
        text: { color: "#0f172a", muted: "#334155" },
        accent: { borderRadius: 12 },
        metaLayout: "tiles", // meta shown as tiles on right
      },
      sunset: {
        key: "sunset",
        name: "Sunset",
        page: { background: "#fff7ed", padding: 16 },
        header: { background: "#f97316", color: "#ffffff" },
        section: {
          background: "#ffffff",
          borderColor: "#fed7aa",
          titleColor: "#7c2d12",
        },
        text: { color: "#111827", muted: "#92400e" },
        accent: { borderRadius: 12 },
        metaLayout: "stacked",
      },
      slate: {
        key: "slate",
        name: "Slate",
        page: { background: "#f8fafc", padding: 16 },
        header: { background: "#334155", color: "#ffffff" },
        section: {
          background: "#ffffff",
          borderColor: "#cbd5e1",
          titleColor: "#0f172a",
        },
        text: { color: "#0f172a", muted: "#475569" },
        accent: { borderRadius: 10 },
        metaLayout: "row",
      },
      minimal: {
        key: "minimal",
        name: "Minimal",
        page: { background: "#ffffff", padding: 16 },
        header: { background: "#ffffff", color: "#111827" },
        section: {
          background: "#ffffff",
          borderColor: "#e5e7eb",
          titleColor: "#111827",
        },
        text: { color: "#111827", muted: "#6b7280" },
        accent: { borderRadius: 6 },
        metaLayout: "inline",
      },
    }),
    []
  );

  const [templateKey, setTemplateKey] = useState("default");
  const template = TEMPLATES[templateKey] || TEMPLATES.default;

  // Resolve form version display as "v{number} (Name)" when available
  const getVersionDisplay = () => {
    const fv = formVersions.find((v) => v.id === submission?.formVersionId);
    if (fv) {
      const ver =
        fv.version !== undefined && fv.version !== null ? `v${fv.version}` : "";
      const nm = fv.name || fv.label || fv.versionName || "";
      if (ver && nm) return `${ver} (${nm})`;
      if (ver) return ver;
      if (nm) return nm;
    }
    return submission?.formVersionId || "-";
  };

  // Resolve form title from submission or formVersions list
  const getFormTitle = () => {
    const fv = formVersions.find((v) => v.id === submission?.formVersionId);
    return (
      submission?.formTitle ||
      submission?.formName ||
      fv?.formName ||
      fv?.name ||
      fv?.label ||
      ""
    );
  };

  // Update status to "Read" when component mounts
  useEffect(() => {
    if (submission && submission.status === "Unread" && onStatusUpdate) {
      onStatusUpdate(submission.id, "Read");
    }
  }, [submission]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const fieldType = (fieldInfo.type || "text").toLowerCase();
      const fieldValue = submissionData[fieldId];

      if (fieldType === "heading") {
        // Start a new section (and use heading label as section title)
        if (currentSection && currentSection.fields.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          title: fieldInfo.label || "",
          fields: [],
        };
        return;
      }

      if (fieldType === "divider") {
        // End current section with a visual divider marker
        if (currentSection && currentSection.fields.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          title: currentSection?.title || "",
          fields: [
            ...(currentSection?.fields || []),
            {
              id: `${fieldId}__divider`,
              label: "",
              value: "__DIVIDER__",
              type: "divider",
              info: fieldInfo,
            },
          ],
        };
        // push and reset to avoid stacking
        sections.push(currentSection);
        currentSection = null;
        return;
      }

      // Include all other fields (including displaytext/pagebreak) regardless of empty value
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

  // Pretty-print subfield key (e.g., firstName -> First Name)
  const prettyLabel = (k) =>
    String(k)
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (m) => m.toUpperCase());

  // Render field value based on type
  const renderFieldValue = (field) => {
    const { value, type } = field;

    // Composite subfields: when base value is empty but there are keys like `${id}_firstName`
    const renderCompositeIfAny = () => {
      const d = submission?.data || {};
      const prefix = `${field.id}_`;
      const entries = Object.entries(d)
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, v]) => ({ subKey: k.slice(prefix.length), v }))
        .sort((a, b) => a.subKey.localeCompare(b.subKey));
      if (entries.length === 0) return null;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {entries.map(({ subKey, v }) => (
            <div
              key={subKey}
              className="flex items-center justify-between bg-gray-50 border rounded p-2"
            >
              <span className="text-gray-600 text-sm">
                {prettyLabel(subKey)}
              </span>
              <span className="text-gray-800 text-sm font-medium break-all">
                {v === undefined || v === null || v === "" ? "—" : String(v)}
              </span>
            </div>
          ))}
        </div>
      );
    };

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

      case "displaytext":
        return (
          <div className="bg-gray-50 p-3 rounded border text-gray-700">
            {value && typeof value === "string"
              ? value
              : field.info?.label || ""}
          </div>
        );

      case "pagebreak":
        return <div className="my-2 border-t border-dashed border-gray-300" />;

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

        // If base is empty, try composite subfields
        if (value === undefined || value === null || value === "") {
          const composite = renderCompositeIfAny();
          if (composite) return composite;
        }

        return (
          <span className="text-gray-800 font-medium">
            {value === undefined || value === null || value === ""
              ? "—"
              : String(value)}
          </span>
        );
    }

    // Fallback with composite handling
    if (value === undefined || value === null || value === "") {
      const composite = renderCompositeIfAny();
      if (composite) return composite;
      return <span className="text-gray-500">—</span>;
    }
    return <span className="text-gray-800 font-medium">{String(value)}</span>;
  };

  // Download functions
  const downloadAsPDF = async () => {
    setIsLoading(true);
    try {
      const node = printableRef.current;
      if (!node) throw new Error("Printable area not found");

      // Temporarily ensure node has desired background for capture
      const prevBg = node.style.background;
      node.style.background = template.page.background;

      const canvas = await html2canvas(node, {
        backgroundColor: template.page.background,
        useCORS: true,
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/png");

      // A4 portrait (mm)
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // mm
      const pdfWidth = pageWidth - margin * 2;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = margin;

      pdf.addImage(
        imgData,
        "PNG",
        margin,
        position,
        pdfWidth,
        pdfHeight,
        undefined,
        "FAST"
      );
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight + margin;
        pdf.addPage();
        pdf.addImage(
          imgData,
          "PNG",
          margin,
          position,
          pdfWidth,
          pdfHeight,
          undefined,
          "FAST"
        );
        heightLeft -= pageHeight;
      }

      // restore
      node.style.background = prevBg;

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
      `Submission ID: ${submission.id}`,
      `Form Version: ${getVersionDisplay()}`,
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
        formVersionLabel: getVersionDisplay(),
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
      `    <formVersionLabel>${escapeXML(
        getVersionDisplay()
      )}</formVersionLabel>`,
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
                <p className="text-xs text-gray-500 mt-1">
                  Form: {getFormTitle() || "-"} • Version: {getVersionDisplay()}
                </p>
              </div>
            </div>

            {/* Right Side: Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Template selector cards */}
              <div className="relative">
                <button
                  className="p-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  onClick={() =>
                    setOpenMenu((v) => (v === "templates" ? null : "templates"))
                  }
                  title="Choose Template"
                >
                  Templates
                </button>
                {openMenu === "templates" && (
                  <div className="absolute right-0 mt-2 w-[520px] bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-3">
                    <div className="grid grid-cols-2 gap-3">
                      {Object.values(TEMPLATES).map((t) => (
                        <button
                          key={t.key}
                          onClick={() => {
                            setTemplateKey(t.key);
                            setOpenMenu(null);
                          }}
                          className={`text-left rounded-lg border p-2 hover:border-blue-400 ${
                            templateKey === t.key
                              ? "border-blue-500"
                              : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-sm">{t.name}</div>
                            {templateKey === t.key && (
                              <span className="text-xs text-blue-600">
                                Selected
                              </span>
                            )}
                          </div>
                          {/* tiny preview card */}
                          <div
                            className="rounded-md overflow-hidden"
                            style={{
                              border: `1px solid ${t.section.borderColor}`,
                            }}
                          >
                            <div
                              style={{
                                background: t.header.background,
                                color: t.header.color,
                                height: 18,
                              }}
                            />
                            <div
                              style={{
                                background: t.page.background,
                                padding: 6,
                              }}
                            >
                              <div
                                className="h-3 w-3/4 mb-1"
                                style={{
                                  background: t.section.background,
                                  border: `1px solid ${t.section.borderColor}`,
                                }}
                              />
                              <div
                                className="h-3 w-2/3"
                                style={{
                                  background: t.section.background,
                                  border: `1px solid ${t.section.borderColor}`,
                                }}
                              />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Download Dropdown */}
              <div className="relative">
                <button
                  onClick={() =>
                    setOpenMenu((v) => (v === "downloads" ? null : "downloads"))
                  }
                  disabled={isLoading}
                  aria-label="Download"
                  className="p-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                </button>
                {openMenu === "downloads" && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          downloadAsPDF();
                          setOpenMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Download as PDF</span>
                      </button>
                      <button
                        onClick={() => {
                          downloadAsText();
                          setOpenMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Download as Text</span>
                      </button>
                      <button
                        onClick={() => {
                          downloadAsJSON();
                          setOpenMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Download as JSON</span>
                      </button>
                      <button
                        onClick={() => {
                          downloadAsXML();
                          setOpenMenu(null);
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
            {/* Visible Preview Content (neutral styling, no template) */}
            <div className="space-y-6 preview-modal-inner-body overflow-y-auto h-full relative pr-1">
              {/* Payment Details Section (if present) */}
              {(() => {
                const d = submission?.data || {};
                // Primary sources: payment_<fieldId> objects or root paymentData
                const payments = [];
                // Collect payment_<fieldId>
                Object.keys(d).forEach((k) => {
                  if (
                    k.startsWith("payment_") &&
                    typeof d[k] === "object" &&
                    d[k]
                  ) {
                    payments.push(d[k]);
                  }
                });
                if (d.paymentData && typeof d.paymentData === "object") {
                  payments.push(d.paymentData);
                }
                if (payments.length === 0) return null;

                // De-duplicate by transactionId+orderId+fieldId to avoid double rendering
                const seen = new Set();
                const uniquePayments = payments.filter((p) => {
                  const key = `${p.transactionId || ""}|${p.orderId || ""}|${
                    p.fieldId || ""
                  }`;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });

                // Render combined Payment Details
                return (
                  <div className="rounded-xl shadow-sm p-6 bg-white border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-100">
                      Payment Details
                    </h2>
                    <div className="space-y-4">
                      {uniquePayments.map((p, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg p-4 bg-green-50 border border-green-200"
                        >
                          <div className="flex flex-wrap gap-4 text-sm">
                            {p.amount !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Amount:</span>
                                <span className="font-semibold">
                                  {p.currency ? `${p.currency} ` : ""}
                                  {p.amount}
                                </span>
                              </div>
                            )}
                            {p.paymentMethod && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Method:</span>
                                <span className="font-medium capitalize">
                                  {p.paymentMethod}
                                </span>
                              </div>
                            )}
                            {p.metadata?.provider && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Provider:</span>
                                <span className="font-medium">
                                  {p.metadata.provider}
                                </span>
                              </div>
                            )}
                            {p.paymentType && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Type:</span>
                                <span className="font-medium">
                                  {p.paymentType}
                                </span>
                              </div>
                            )}
                            {p.status && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Status:</span>
                                <span
                                  className={`font-semibold ${
                                    p.status === "completed"
                                      ? "text-green-700"
                                      : p.status === "failed"
                                      ? "text-red-700"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700">
                            {p.transactionId && (
                              <div className="flex items-center justify-between bg-white border rounded p-2">
                                <span className="text-gray-600">
                                  Transaction ID
                                </span>
                                <span className="font-mono ml-3 break-all">
                                  {p.transactionId}
                                </span>
                              </div>
                            )}
                            {p.orderId && (
                              <div className="flex items-center justify-between bg-white border rounded p-2">
                                <span className="text-gray-600">Order ID</span>
                                <span className="font-mono ml-3 break-all">
                                  {p.orderId}
                                </span>
                              </div>
                            )}
                            {p.merchantId && (
                              <div className="flex items-center justify-between bg-white border rounded p-2">
                                <span className="text-gray-600">Merchant</span>
                                <span className="font-mono ml-3 break-all">
                                  {p.merchantId}
                                </span>
                              </div>
                            )}
                            {(p.completedAt || p.processedAt) && (
                              <div className="flex items-center justify-between bg-white border rounded p-2">
                                <span className="text-gray-600">Completed</span>
                                <span className="ml-3">
                                  {p.completedAt
                                    ? new Date(p.completedAt).toLocaleString()
                                    : p.processedAt
                                    ? new Date(p.processedAt).toLocaleString()
                                    : ""}
                                </span>
                              </div>
                            )}
                          </div>
                          {p.billingAddress && (
                            <div className="mt-3 bg-white border rounded p-3">
                              <div className="text-xs font-semibold text-gray-700 mb-2">
                                Billing Address
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-800">
                                {p.billingAddress.address_line_1 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">
                                      Address Line 1
                                    </span>
                                    <span className="ml-3 break-all">
                                      {p.billingAddress.address_line_1}
                                    </span>
                                  </div>
                                )}
                                {p.billingAddress.address_line_2 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">
                                      Address Line 2
                                    </span>
                                    <span className="ml-3 break-all">
                                      {p.billingAddress.address_line_2}
                                    </span>
                                  </div>
                                )}
                                {p.billingAddress.admin_area_2 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">City</span>
                                    <span className="ml-3 break-all">
                                      {p.billingAddress.admin_area_2}
                                    </span>
                                  </div>
                                )}
                                {p.billingAddress.admin_area_1 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">
                                      State/Region
                                    </span>
                                    <span className="ml-3 break-all">
                                      {p.billingAddress.admin_area_1}
                                    </span>
                                  </div>
                                )}
                                {p.billingAddress.postal_code && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">
                                      Postal Code
                                    </span>
                                    <span className="ml-3 break-all">
                                      {p.billingAddress.postal_code}
                                    </span>
                                  </div>
                                )}
                                {p.billingAddress.country_code && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">
                                      Country
                                    </span>
                                    <span className="ml-3 break-all">
                                      {p.billingAddress.country_code}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {sections.map((section, index) => (
                <div
                  key={index}
                  className="rounded-xl shadow-sm p-6 bg-white border border-gray-200"
                >
                  <h2 className="text-lg font-semibold mb-6 pb-2 border-b border-gray-200 text-gray-900">
                    {section.title}
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {section.fields.map((field) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 sm:grid-cols-[200px,1fr] gap-4 items-start"
                      >
                        <div className="font-medium text-sm text-gray-600">
                          {field.label}
                        </div>
                        <div className="text-gray-900">
                          {renderFieldValue(field)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {fieldsWithoutSection.length > 0 && (
                <div className="rounded-xl shadow-sm p-6 bg-white border border-gray-200">
                  <h2 className="text-lg font-semibold mb-6 pb-2 border-b border-gray-200 text-gray-900">
                    Additional Information
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {fieldsWithoutSection.map((field) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 sm:grid-cols-[200px,1fr] gap-4 items-start"
                      >
                        <div className="font-medium text-sm text-gray-600">
                          {field.label}
                        </div>
                        <div className="text-gray-900">
                          {renderFieldValue(field)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hidden templated printable area for PDF capture only */}
            <div
              ref={printableRef}
              className="space-y-6 absolute -left-[10000px] -top-[10000px] w-[210mm] pr-1"
              style={{
                background: template.page.background,
                padding: template.page.padding,
              }}
            >
              {/* Header banner with template styles */}
              <div
                className="rounded-lg mb-4"
                style={{
                  background: template.header.background,
                  color: template.header.color,
                  padding: 12,
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="font-semibold">
                    {submission.name || `Response ${submission.index || 1}`}
                  </div>
                  {/* Template-driven meta layout */}
                  {(() => {
                    const tiles = (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white/10 rounded px-2 py-1">
                          <span className="opacity-90">Submitted:</span>
                          <div className="font-medium">
                            {formatSubmissionDate(submission.submissionDate)}
                          </div>
                        </div>
                        <div className="bg-white/10 rounded px-2 py-1">
                          <span className="opacity-90">Submission ID:</span>
                          <div className="font-mono break-all">
                            {submission.id}
                          </div>
                        </div>
                        <div className="bg-white/10 rounded px-2 py-1">
                          <span className="opacity-90">Form Version:</span>
                          <div className="font-medium">
                            {getVersionDisplay()}
                          </div>
                        </div>
                      </div>
                    );
                    const inline = (
                      <div className="text-xs opacity-90 flex flex-wrap gap-3 items-center">
                        <span>
                          Submitted{" "}
                          {formatSubmissionDate(submission.submissionDate)}
                        </span>
                        <span>•</span>
                        <span>
                          ID: <span className="font-mono">{submission.id}</span>
                        </span>
                        <span>•</span>
                        <span>Version: {getVersionDisplay()}</span>
                      </div>
                    );
                    if (template.metaLayout === "tiles") return tiles;
                    if (template.metaLayout === "stacked")
                      return (
                        <div className="flex flex-col gap-1 text-xs opacity-90 text-right">
                          <span>
                            Submitted{" "}
                            {formatSubmissionDate(submission.submissionDate)}
                          </span>
                          <span>
                            ID:{" "}
                            <span className="font-mono">{submission.id}</span>
                          </span>
                          <span>Version: {getVersionDisplay()}</span>
                        </div>
                      );
                    return inline;
                  })()}
                </div>
              </div>

              {(() => {
                const d = submission?.data || {};
                const payments = [];
                Object.keys(d).forEach((k) => {
                  if (
                    k.startsWith("payment_") &&
                    typeof d[k] === "object" &&
                    d[k]
                  )
                    payments.push(d[k]);
                });
                if (d.paymentData && typeof d.paymentData === "object")
                  payments.push(d.paymentData);
                if (payments.length === 0) return null;
                const seen = new Set();
                const uniquePayments = payments.filter((p) => {
                  const key = `${p.transactionId || ""}|${p.orderId || ""}|${
                    p.fieldId || ""
                  }`;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });
                return (
                  <div
                    className="rounded-xl shadow-sm p-6"
                    style={{
                      background: template.section.background,
                      border: `1px solid ${template.section.borderColor}`,
                      borderRadius: template.accent.borderRadius,
                      color: template.text.color,
                    }}
                  >
                    <h2
                      className="text-lg font-semibold mb-6 pb-2 border-b"
                      style={{
                        color: template.section.titleColor,
                        borderColor: template.section.borderColor,
                      }}
                    >
                      Payment Details
                    </h2>
                    <div className="space-y-4">
                      {uniquePayments.map((p, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg p-4"
                          style={{
                            background: "#ecfdf5",
                            border: "1px solid #86efac",
                          }}
                        >
                          <div className="flex flex-wrap gap-4 text-sm">
                            {p.amount !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Amount:</span>
                                <span className="font-semibold">
                                  {p.currency ? `${p.currency} ` : ""}
                                  {p.amount}
                                </span>
                              </div>
                            )}
                            {p.paymentMethod && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Method:</span>
                                <span className="font-medium capitalize">
                                  {p.paymentMethod}
                                </span>
                              </div>
                            )}
                            {p.metadata?.provider && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Provider:</span>
                                <span className="font-medium">
                                  {p.metadata.provider}
                                </span>
                              </div>
                            )}
                            {p.paymentType && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Type:</span>
                                <span className="font-medium">
                                  {p.paymentType}
                                </span>
                              </div>
                            )}
                            {p.status && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Status:</span>
                                <span
                                  className={`font-semibold ${
                                    p.status === "completed"
                                      ? "text-green-700"
                                      : p.status === "failed"
                                      ? "text-red-700"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700">
                            {p.transactionId && (
                              <div className="flex items-center justify-between bg-white border rounded p-2">
                                <span className="text-gray-600">
                                  Transaction ID
                                </span>
                                <span className="font-mono ml-3 break-all">
                                  {p.transactionId}
                                </span>
                              </div>
                            )}
                            {p.orderId && (
                              <div className="flex items-center justify-between bg-white border rounded p-2">
                                <span className="text-gray-600">Order ID</span>
                                <span className="font-mono ml-3 break-all">
                                  {p.orderId}
                                </span>
                              </div>
                            )}
                            {p.merchantId && (
                              <div className="flex items-center justify-between bg-white border rounded p-2">
                                <span className="text-gray-600">Merchant</span>
                                <span className="font-mono ml-3 break-all">
                                  {p.merchantId}
                                </span>
                              </div>
                            )}
                            {(p.completedAt || p.processedAt) && (
                              <div className="flex items-center justify-between bg-white border rounded p-2">
                                <span className="text-gray-600">Completed</span>
                                <span className="ml-3">
                                  {p.completedAt
                                    ? new Date(p.completedAt).toLocaleString()
                                    : p.processedAt
                                    ? new Date(p.processedAt).toLocaleString()
                                    : ""}
                                </span>
                              </div>
                            )}
                          </div>
                          {p.billingAddress && (
                            <div className="mt-3 bg-white border rounded p-3">
                              <div className="text-xs font-semibold text-gray-700 mb-2">
                                Billing Address
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-800">
                                {p.billingAddress.address_line_1 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">
                                      Address Line 1
                                    </span>
                                    <span className="ml-3 break-all">
                                      {p.billingAddress.address_line_1}
                                    </span>
                                  </div>
                                )}
                                {p.billingAddress.address_line_2 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">
                                      Address Line 2
                                    </span>
                                    <span className="ml-3 break-all">
                                      {p.billingAddress.address_line_2}
                                    </span>
                                  </div>
                                )}
                                {p.billingAddress.admin_area_2 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">City</span>
                                    <span className="ml-3 break-all">
                                      {p.billingAddress.admin_area_2}
                                    </span>
                                  </div>
                                )}
                                {p.billingAddress.admin_area_1 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">
                                      State/Region
                                    </span>
                                    <span className="ml-3 break-all">
                                      {p.billingAddress.admin_area_1}
                                    </span>
                                  </div>
                                )}
                                {p.billingAddress.postal_code && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">
                                      Postal Code
                                    </span>
                                    <span className="ml-3 break-all">
                                      {p.billingAddress.postal_code}
                                    </span>
                                  </div>
                                )}
                                {p.billingAddress.country_code && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">
                                      Country
                                    </span>
                                    <span className="ml-3 break-all">
                                      {p.billingAddress.country_code}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {sections.map((section, index) => (
                <div
                  key={index}
                  className="rounded-xl shadow-sm p-6"
                  style={{
                    background: template.section.background,
                    border: `1px solid ${template.section.borderColor}`,
                    borderRadius: template.accent.borderRadius,
                    color: template.text.color,
                  }}
                >
                  <h2
                    className="text-lg font-semibold mb-6 pb-2 border-b"
                    style={{
                      color: template.section.titleColor,
                      borderColor: template.section.borderColor,
                    }}
                  >
                    {section.title}
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {section.fields.map((field) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 sm:grid-cols-[200px,1fr] gap-4 items-start"
                      >
                        <div
                          className="font-medium text-sm"
                          style={{ color: template.text.muted }}
                        >
                          {field.label}
                        </div>
                        <div style={{ color: template.text.color }}>
                          {renderFieldValue(field)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {fieldsWithoutSection.length > 0 && (
                <div
                  className="rounded-xl shadow-sm p-6"
                  style={{
                    background: template.section.background,
                    border: `1px solid ${template.section.borderColor}`,
                    borderRadius: template.accent.borderRadius,
                    color: template.text.color,
                  }}
                >
                  <h2
                    className="text-lg font-semibold mb-6 pb-2 border-b"
                    style={{
                      color: template.section.titleColor,
                      borderColor: template.section.borderColor,
                    }}
                  >
                    Additional Information
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {fieldsWithoutSection.map((field) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 sm:grid-cols-[200px,1fr] gap-4 items-start"
                      >
                        <div
                          className="font-medium text-sm"
                          style={{ color: template.text.muted }}
                        >
                          {field.label}
                        </div>
                        <div style={{ color: template.text.color }}>
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
      {openMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  );
};

export default SubmissionPreviewNew;
