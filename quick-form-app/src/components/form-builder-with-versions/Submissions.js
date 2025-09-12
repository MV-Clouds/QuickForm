import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useParams, useLocation } from "react-router-dom";
import { DateRangePicker, CheckPicker, SelectPicker } from "rsuite";
import {
  Search,
  Filter,
  Grid3X3,
  Trash2,
  Eye,
  X,
  RefreshCw,
  Download,
  ChevronDown,
} from "lucide-react";
import "rsuite/dist/rsuite.min.css";
import "./Submissions.css";
import SubmissionPreviewNew from "./Submission-related-forlder/SubmissionPreviewNew";
// import SubmissionPreviewContent from "./SubmissionPreviewContent";
import AdvancedFilters from "./Submission-related-forlder/AdvancedFilters";
import FileUploadModal from "./Submission-related-forlder/FileUploadModal";

// Comprehensive ResizeObserver error suppression for RSuite components
const suppressResizeObserverErrors = () => {
  if (typeof window === "undefined") return;

  // Method 1: Intercept and suppress console errors
  const originalError = console.error;
  console.error = (...args) => {
    if (
      args.length > 0 &&
      typeof args[0] === "string" &&
      (args[0].includes("ResizeObserver loop completed") ||
        args[0].includes("ResizeObserver loop limit exceeded") ||
        args[0].includes(
          "ResizeObserver loop completed with undelivered notifications"
        ))
    ) {
      // Silently suppress these specific errors
      return;
    }
    originalError.apply(console, args);
  };

  // Method 2: Global error handler with immediate suppression
  const handleGlobalError = (event) => {
    if (
      event.message &&
      (event.message.includes("ResizeObserver loop completed") ||
        event.message.includes("ResizeObserver loop limit exceeded"))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  };

  // Method 3: Unhandled rejection handler
  const handleUnhandledRejection = (event) => {
    if (
      event.reason &&
      typeof event.reason === "string" &&
      event.reason.includes("ResizeObserver")
    ) {
      event.preventDefault();
      return false;
    }
  };

  // Method 4: Hide webpack dev server error overlay for ResizeObserver errors
  const hideWebpackOverlay = () => {
    const overlay = document.getElementById(
      "webpack-dev-server-client-overlay"
    );
    const overlayDiv = document.getElementById(
      "webpack-dev-server-client-overlay-div"
    );

    if (overlay) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "childList" ||
            mutation.type === "characterData"
          ) {
            const content = overlay.textContent || "";
            if (content.includes("ResizeObserver loop completed")) {
              overlay.style.display = "none";
              setTimeout(() => {
                if (overlay.parentNode) {
                  overlay.parentNode.removeChild(overlay);
                }
              }, 100);
            }
          }
        });
      });

      observer.observe(overlay, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    if (overlayDiv) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "childList" ||
            mutation.type === "characterData"
          ) {
            const content = overlayDiv.textContent || "";
            if (content.includes("ResizeObserver loop completed")) {
              overlayDiv.style.display = "none";
              setTimeout(() => {
                if (overlayDiv.parentNode) {
                  overlayDiv.parentNode.removeChild(overlayDiv);
                }
              }, 100);
            }
          }
        });
      });

      observer.observe(overlayDiv, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  };

  // Method 5: Patch ResizeObserver to use requestAnimationFrame
  if (window.ResizeObserver) {
    const OriginalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback) {
        const wrappedCallback = (entries) => {
          window.requestAnimationFrame(() => {
            try {
              callback(entries);
            } catch (error) {
              if (!error.message?.includes("ResizeObserver")) {
                console.error("ResizeObserver callback error:", error);
              }
            }
          });
        };
        super(wrappedCallback);
      }
    };
  }

  // Add event listeners
  window.addEventListener("error", handleGlobalError, true);
  window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

  // Check for webpack overlay periodically
  const checkOverlay = () => {
    hideWebpackOverlay();
    setTimeout(checkOverlay, 1000);
  };

  // Start checking after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkOverlay);
  } else {
    checkOverlay();
  }
};

// Initialize comprehensive error suppression
suppressResizeObserverErrors();

const Submissions = ({
  isSidebarOpen,
  formVersionId: propFormVersionId,
  formId: propFormId,
  onStatsUpdate,
}) => {
  const { formVersionId: urlFormVersionId } = useParams();
  const location = useLocation();
  const formVersionId =
    propFormVersionId || urlFormVersionId || location.state?.formVersionId;
  const formId = propFormId || location.state?.formId;

  console.log("✨✨ form id ", formId);

  // Validation: we need either formId or formVersionId

  const [submissions, setSubmissions] = useState([]);
  const [fields, setFields] = useState({});
  const [allFields, setAllFields] = useState({});
  const [fieldsByVersion, setFieldsByVersion] = useState({}); // New state for version-specific fields
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formVersions, setFormVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState("current");
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [currentFormVersionId, setCurrentFormVersionId] = useState(null);

  // Feature states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [visibleFields, setVisibleFields] = useState([]);
  const [originalFieldOrder, setOriginalFieldOrder] = useState([]); // Track original field order
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);
  const [columnWidths, setColumnWidths] = useState({});
  const tableRef = useRef(null);
  const tableScrollRef = useRef(null);
  const [tableScrolled, setTableScrolled] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "submissionDate",
    direction: "accending",
  });
  const [fileModal, setFileModal] = useState({
    isOpen: false,
    files: [],
    fieldLabel: "",
  });
  // imageModal: { isOpen, src, objectUrl, originalSrc }
  const [imageModal, setImageModal] = useState({
    isOpen: false,
    src: null,
    objectUrl: null,
    originalSrc: null,
  });
  const [downloadModal, setDownloadModal] = useState({
    isOpen: false,
    type: null,
    content: null,
    filename: null,
  });

  // Filter states
  // Status filter moved into AdvancedFilters modal
  // Status is handled via Advanced Filters modal now
  const [statusFilter, setStatusFilter] = useState("");
  const [archiveFilter, setArchiveFilter] = useState("active"); // "active", "archived", "all"
  const [advancedFilters, setAdvancedFilters] = useState([]);

  // Access token caching to prevent rapid API calls
  const [cachedAccessToken, setCachedAccessToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);

  // ## ADD THIS NEW CODE ##
  const [openMenu, setOpenMenu] = useState(null); // Manages which menu is open
  const headerMenuRef = useRef(null);
  const selectionBarMenuRef = useRef(null);

  // Modal and UI states
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    submission: null,
  });
  const [filtersModal, setFiltersModal] = useState(false);
  const [hoverSortConfig, setHoverSortConfig] = useState(null);

  // Helper to humanize sub-field keys (e.g., firstName -> First Name, country_code -> Country Code)
  const humanize = useCallback((str) => {
    if (!str) return "";
    const spaced = String(str)
      // insert space before capital letters in camelCase
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      // replace underscores and dashes with spaces
      .replace(/[._-]+/g, " ")
      .trim();
    return spaced
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }, []);

  useEffect(() => {
    // Compute and set CSS variables for sticky column left offsets so they
    // remain consistent during horizontal scrolling and resizing.
    const computeStickyOffsets = () => {
      try {
        const table = tableRef.current;
        if (!table) return;
        const ths = table.querySelectorAll("th");
        // We'll compute cumulative left offsets for the first three sticky columns
        // (checkbox/eye, preview/date, and next sticky) and store them as CSS vars
        let cumLeft = 0;
        for (let i = 0; i < 3; i++) {
          const th = ths[i];
          if (!th) break;
          // Use bounding client rect width as computed width
          const w = th.getBoundingClientRect().width || th.offsetWidth || 0;
          // set var for this index (start with 0 for first)
          table.style.setProperty(`--sticky-left-${i}`, `${cumLeft}px`);
          cumLeft += w;
        }
      } catch (e) {
        // ignore
      }
    };

    // Expose computeStickyOffsets on the ref so other effects can call it when UI changes
    tableRef.current &&
      (tableRef.current.computeStickyOffsets = computeStickyOffsets);

    computeStickyOffsets();
    window.addEventListener("resize", computeStickyOffsets);
    // Also recompute after a short delay to allow fonts/images to load
    const t = setTimeout(computeStickyOffsets, 300);

    return () => {
      window.removeEventListener("resize", computeStickyOffsets);
      clearTimeout(t);
    };
  }, [visibleFields, columnWidths, previewModal.isOpen]);

  // Track horizontal scroll on the table-scroll container to show a separator
  useEffect(() => {
    const scroller = tableScrollRef.current;
    if (!scroller) return;
    const onScroll = () => {
      const left = scroller.scrollLeft || 0;
      setTableScrolled(left > 0);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    // initial state
    onScroll();
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [visibleFields]);

  // When the preview modal opens or closes, recompute sticky offsets to keep sticky columns aligned
  useEffect(() => {
    const fn = tableRef.current && tableRef.current.computeStickyOffsets;
    if (typeof fn === "function") {
      // run after microtask to allow layout to settle
      setTimeout(fn, 50);
    }
  }, [previewModal.isOpen]);

  // Workaround: sometimes after opening/closing the preview modal the card's box-shadow
  // appears visually lost (likely due to stacking context / repaint issues). Force a
  // tiny inline toggle to prompt browser to repaint the shadow when the preview closes.
  useEffect(() => {
    if (previewModal.isOpen) return;
    // run after a short delay to ensure DOM updated
    const t = setTimeout(() => {
      try {
        const card = document.querySelector(".submissions-card");
        if (!card) return;
        const prev = card.style.boxShadow;
        // toggle off then back on to force repaint
        card.style.boxShadow = "none";
        // next frame restore
        requestAnimationFrame(() => {
          card.style.boxShadow = prev || "";
        });
      } catch (e) {
        // ignore
      }
    }, 80);

    return () => clearTimeout(t);
  }, [previewModal.isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close header menu if click is outside
      if (
        openMenu === "header" &&
        headerMenuRef.current &&
        !headerMenuRef.current.contains(event.target)
      ) {
        setOpenMenu(null);
      }
      // Close selection bar menu if click is outside
      if (
        openMenu === "selectionBar" &&
        selectionBarMenuRef.current &&
        !selectionBarMenuRef.current.contains(event.target)
      ) {
        setOpenMenu(null);
      }
    };

    // Only add the event listener when a menu is open
    if (openMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup the event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenu]);

  const fetchAccessToken = useCallback(
    async (userId, instanceUrl, retries = 2) => {
      // Check if we have a valid cached token
      if (cachedAccessToken && tokenExpiry && new Date() < tokenExpiry) {
        console.log("🔄 Using cached access token");
        return cachedAccessToken;
      }

      console.log("🔑 Fetching new access token...");
      try {
        const url =
          process.env.REACT_APP_GET_ACCESS_TOKEN_URL ||
          "https://76vlfwtmig.execute-api.us-east-1.amazonaws.com/prod/getAccessToken";
        if (!url) throw new Error("Access token URL is not defined.");
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, instanceUrl }),
        });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 401 && retries > 0)
            return await fetchAccessToken(userId, instanceUrl, retries - 1);
          throw new Error(
            data.error || `Failed to fetch access token: ${response.status}`
          );
        }
        if (!data.access_token)
          throw new Error("No access token returned in response");

        // Cache the token for 50 minutes (Salesforce tokens expire in 1 hour)
        const token = data.access_token;
        const expiry = new Date(Date.now() + 50 * 60 * 1000);
        setCachedAccessToken(token);
        setTokenExpiry(expiry);
        console.log(
          "✅ New access token cached until:",
          expiry.toLocaleTimeString()
        );

        return token;
      } catch (error) {
        console.error(
          `❌ Failed to fetch access token: ${error.message}. Please verify your Salesforce credentials or contact support.`
        );
        return null;
      }
    },
    [cachedAccessToken, tokenExpiry]
  );

  // Centralize data fetching logic in a useCallback hook
  const fetchAllData = useCallback(async () => {
    if (!formId && !formVersionId) {
      setError("Form ID or Form Version ID is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userId = sessionStorage.getItem("userId");
      const instanceUrl = sessionStorage.getItem("instanceUrl");
      if (!userId || !instanceUrl) {
        throw new Error("Missing authentication details");
      }

      const accessToken = await fetchAccessToken(userId, instanceUrl, 3);
      if (!accessToken) {
        throw new Error("Failed to obtain access token");
      }

      const lambdaUrl =
        "https://gy4k2psfp6.execute-api.us-east-1.amazonaws.com/Stage1";

      // Use formId if available, otherwise use formVersionId
      const requestBody = {
        userId,
        instanceUrl,
        accessToken,
      };

      if (formId) {
        requestBody.formId = formId;
      } else {
        requestBody.formVersionId = formVersionId;
      }

      const response = await fetch(lambdaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch submissions: ${response.statusText}`);
      }

      const data = await response.json();

      console.log("📥✨ Fetched submissions data:", data);

      console.log(
        "📥 Fetched submissions data:",
        data.submissions.length,
        "submissions,",
        Object.keys(data.fields || {}).length,
        "fields"
      );

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch submissions");
      }

      // Only update state if component is still mounted
      const submissionsData = data.submissions || [];
      const formVersionsData = data.formVersions || [];
      const fieldsByVersionData = data.fieldsByVersion || {};

      // Store all submissions
      setAllSubmissions(submissionsData);

      // Set form versions (filter out draft versions for display)
      const publishedVersions = formVersionsData.filter(
        (v) => v.stage !== "Draft"
      );
      setFormVersions(publishedVersions);
      // Find the active version from the response
      const activeVersion = formVersionsData.find((v) => v.isActive);
      const activeVersionId =
        activeVersion?.id || data.metadata?.activeVersionId;

      // Set current form version (use active version from Form object)
      let currentVersionId = activeVersionId || formVersionId;

      // If no active version found or active version is draft, use latest published
      if (
        !currentVersionId ||
        !publishedVersions.find((v) => v.id === currentVersionId)
      ) {
        if (publishedVersions.length > 0) {
          currentVersionId = publishedVersions[0].id; // Latest published version
        } else if (formVersionsData.length > 0) {
          currentVersionId = formVersionsData[0].id; // Fallback to any version
        }
      }

      setCurrentFormVersionId(currentVersionId);
      setSelectedVersion(currentVersionId); // Set as default selected version

      // Set fields data
      const fieldIds = Object.keys(data.fields || {});
      setFields(data.fields || {});
      setOriginalFieldOrder(fieldIds);
      setVisibleFields(fieldIds);

      // Set all fields and version-specific field mappings
      if (data.allFields) {
        setAllFields(data.allFields);
      }

      if (fieldsByVersionData) {
        setFieldsByVersion(fieldsByVersionData);
        console.log(
          `Loaded field mappings for ${
            Object.keys(fieldsByVersionData).length
          } versions`
        );
      }

      // Only log once per fetch
      if (submissionsData.length > 0) {
        console.log(
          `Loaded ${submissionsData.length} submissions with ${fieldIds.length} fields`
        );
      }
    } catch (err) {
      console.error("Failed to fetch submissions data:", err);
      setError("Failed to load submissions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [formId, formVersionId, fetchAccessToken]); // Ensure all dependencies are included

  useEffect(() => {
    console.log(" 🔄 Fetching all data for submissions");
    fetchAllData();
  }, [fetchAllData]);

  // Filter submissions by selected version and update fields accordingly
  useEffect(() => {
    console.log(
      " 🔄 Filtering submissions for selected version:",
      selectedVersion
    );

    let filteredSubmissions = [];
    let fieldsToUse = {};
    let fieldIdsToUse = [];

    const staticFieldTypes = [
      "heading",
      "displaytext",
      "divider",
      "pagebreak",
      "formcalculation",
      "section",
      "html",
      "text",
      "paragraph",
      "spacer",
      "image",
      "video",
      "header",
    ];

    if (selectedVersion === "all") {
      filteredSubmissions = allSubmissions;

      // For "All Versions", create a combined field mapping from all versions
      // Use a Map to avoid duplicate field labels and prioritize active version
      const combinedFields = new Map();
      const fieldLabelsSeen = new Set();

      console.log(
        `Creating combined fields for All Versions. Available versions:`,
        Object.keys(fieldsByVersion)
      );

      // First, add fields from active version (priority)
      if (currentFormVersionId && fieldsByVersion[currentFormVersionId]) {
        console.log(
          `Adding fields from active version ${currentFormVersionId}`
        );
        Object.entries(fieldsByVersion[currentFormVersionId]).forEach(
          ([fieldId, fieldInfo]) => {
            const isStaticField =
              fieldInfo.type &&
              staticFieldTypes.includes(fieldInfo.type.toLowerCase());
            if (!isStaticField) {
              combinedFields.set(fieldId, fieldInfo.label);
              fieldLabelsSeen.add(fieldInfo.label);
            }
          }
        );
      }

      // Then add unique fields from other versions
      Object.entries(fieldsByVersion).forEach(([versionId, versionFields]) => {
        if (versionId !== currentFormVersionId) {
          console.log(`Adding unique fields from version ${versionId}`);
          Object.entries(versionFields).forEach(([fieldId, fieldInfo]) => {
            const isStaticField =
              fieldInfo.type &&
              staticFieldTypes.includes(fieldInfo.type.toLowerCase());
            if (!isStaticField && !fieldLabelsSeen.has(fieldInfo.label)) {
              combinedFields.set(fieldId, fieldInfo.label);
              fieldLabelsSeen.add(fieldInfo.label);
            }
          });
        }
      });

      fieldsToUse = Object.fromEntries(combinedFields);
      fieldIdsToUse = Array.from(combinedFields.keys());

      console.log(`Combined fields for All Versions:`, fieldsToUse);
      console.log(`Field IDs to use:`, fieldIdsToUse);

      // Debug: Show sample submission data structure
      if (filteredSubmissions.length > 0) {
        console.log(`Sample submission data structure:`, {
          submissionId: filteredSubmissions[0].id,
          formVersionId: filteredSubmissions[0].formVersionId,
          dataKeys: Object.keys(filteredSubmissions[0].data),
          sampleData: filteredSubmissions[0].data,
        });
      }

      // Debug: Check for empty field mappings
      if (fieldIdsToUse.length === 0) {
        console.warn("⚠️ No fields found for display. This might indicate:");
        console.warn("1. All fields are static (headings, dividers, etc.)");
        console.warn("2. Field mapping issue between versions");
        console.warn("3. Form has no data fields");
        console.warn("Available version fields:", fieldsByVersion);
      }
    } else if (selectedVersion === "current" && currentFormVersionId) {
      filteredSubmissions = allSubmissions.filter(
        (sub) => sub.formVersionId === currentFormVersionId
      );

      if (fieldsByVersion[currentFormVersionId]) {
        Object.entries(fieldsByVersion[currentFormVersionId]).forEach(
          ([fieldId, fieldInfo]) => {
            const isStaticField =
              fieldInfo.type &&
              staticFieldTypes.includes(fieldInfo.type.toLowerCase());

            if (!isStaticField) {
              fieldsToUse[fieldId] = fieldInfo.label;
              fieldIdsToUse.push(fieldId);
            }
          }
        );
      }
    } else {
      filteredSubmissions = allSubmissions.filter(
        (sub) => sub.formVersionId === selectedVersion
      );

      if (fieldsByVersion[selectedVersion]) {
        Object.entries(fieldsByVersion[selectedVersion]).forEach(
          ([fieldId, fieldInfo]) => {
            const isStaticField =
              fieldInfo.type &&
              staticFieldTypes.includes(fieldInfo.type.toLowerCase());

            if (!isStaticField) {
              fieldsToUse[fieldId] = fieldInfo.label;
              fieldIdsToUse.push(fieldId);
            }
          }
        );
      }
    }

    // Dynamically add sub-field columns for keys like <baseId>_<suffix>
    // and hide the base column when subfields exist
    const existing = new Set(fieldIdsToUse);
    const basesWithSubfields = new Set();
    filteredSubmissions.forEach((sub) => {
      const data = sub?.data || {};
      Object.keys(data).forEach((k) => {
        const idx = k.indexOf("_");
        if (idx > 0) {
          const baseId = k.slice(0, idx);
          const suffix = k.slice(idx + 1);
          // Only consider if the base field is in our current view
          if (fieldsToUse[baseId]) {
            const syntheticId = `${baseId}__sub__${suffix}`;
            basesWithSubfields.add(baseId);
            if (!existing.has(syntheticId)) {
              existing.add(syntheticId);
              // Label: humanized suffix (e.g., First Name)
              fieldsToUse[syntheticId] = humanize(suffix);
              fieldIdsToUse.push(syntheticId);
            }
          }
        }
      });
    });

    // Remove the base field columns that have subfields
    if (basesWithSubfields.size > 0) {
      basesWithSubfields.forEach((baseId) => {
        if (fieldsToUse[baseId]) {
          delete fieldsToUse[baseId];
        }
      });
      // Filter out base ids from the ordered list
      fieldIdsToUse = fieldIdsToUse.filter(
        (fid) => !basesWithSubfields.has(fid)
      );
    }

    setSubmissions(filteredSubmissions);
    setFields(fieldsToUse);

    // Maintain original field order when updating visible fields
    setOriginalFieldOrder(fieldIdsToUse);
    setVisibleFields(fieldIdsToUse);

    console.log(
      `Updated for ${selectedVersion}: ${filteredSubmissions.length} submissions, ${fieldIdsToUse.length} fields`
    );
  }, [
    selectedVersion,
    allSubmissions,
    currentFormVersionId,
    fieldsByVersion,
    humanize,
  ]);

  // Separate effect for stats update to prevent infinite re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    console.log("🔄 Updating stats with total submissions:");
    if (onStatsUpdate && typeof onStatsUpdate === "function" && !loading) {
      // Provide the parent component with the total submissions (all versions)
      onStatsUpdate(allSubmissions);
    }
  }, [allSubmissions, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    console.log("🔄 Updating pagination and filters");
    setCurrentPage(1);
  }, [searchTerm, dateRange, rowsPerPage, visibleFields]);

  const handleRowSelect = (submissionId) => {
    setSelectedRows((prev) => {
      const newSelection = prev.includes(submissionId)
        ? prev.filter((id) => id !== submissionId)
        : [...prev, submissionId];
      return newSelection;
    });
  };

  const toggleSelectAll = () => {
    const newSelection =
      selectedRows.length === paginatedSubmissions.length
        ? []
        : paginatedSubmissions.map((sub) => sub.id);
    setSelectedRows(newSelection);
  };

  // handleExport removed - download handled via downloadModal in header and bottom bar

  const generateCSV = (data) => {
    if (data.length === 0) return "";

    // Helper to resolve potential payment object for a field in a submission
    const resolveFieldValueForCSV = (sub, fieldId) => {
      let fieldValue;
      if (fieldId.includes("__sub__")) {
        const [baseId, suffix] = fieldId.split("__sub__");
        fieldValue = sub?.data?.[`${baseId}_${suffix}`];
      } else {
        fieldValue = sub.data[fieldId];

        if (
          selectedVersion === "all" &&
          (fieldValue === null || fieldValue === undefined || fieldValue === "")
        ) {
          const targetLabel = fields[fieldId];
          if (
            targetLabel &&
            sub.formVersionId &&
            fieldsByVersion[sub.formVersionId]
          ) {
            const versionFields = fieldsByVersion[sub.formVersionId];
            for (const [versionFieldId, versionFieldInfo] of Object.entries(
              versionFields
            )) {
              if (
                versionFieldInfo.label === targetLabel &&
                sub.data[versionFieldId] !== undefined
              ) {
                fieldValue = sub.data[versionFieldId];
                break;
              }
            }
          }
        }

        const paymentKey = `payment_${fieldId}`;
        const paymentFromKey = sub.data?.[paymentKey];
        const paymentFromRoot =
          sub.data?.paymentData?.fieldId === fieldId
            ? sub.data.paymentData
            : null;
        const paymentObj = paymentFromKey || paymentFromRoot;
        if (
          (fieldValue === null ||
            fieldValue === undefined ||
            fieldValue === "") &&
          paymentObj
        ) {
          fieldValue = paymentObj;
        }

        if (
          fieldValue === null ||
          fieldValue === undefined ||
          fieldValue === ""
        ) {
          const prefix = `${fieldId}_`;
          const subEntries = Object.entries(sub.data || {})
            .filter(([k, v]) => k.startsWith(prefix))
            .map(([k, v]) => ({ key: k.slice(prefix.length), value: v }))
            .filter(
              (e) => e.value !== undefined && e.value !== null && e.value !== ""
            );
          if (subEntries.length > 0) {
            const priority = [
              "fullName",
              "firstName",
              "street",
              "email",
              "phone",
              "city",
              "state",
              "postal",
              "zip",
              "country",
            ];
            const notMeta = subEntries.filter(
              (e) => e.key.toLowerCase() !== "countrycode"
            );
            const pickFrom = notMeta.length > 0 ? notMeta : subEntries;
            let picked = pickFrom.find((e) => priority.includes(e.key));
            if (!picked) picked = pickFrom[0];
            fieldValue = picked?.value;
          }
        }
      }
      return fieldValue;
    };

    // Determine which visible fields have payment objects with billingAddress to add extra columns
    const fieldsWithBillingAddress = new Set();
    for (const fieldId of visibleFields) {
      for (const sub of data) {
        const fv = resolveFieldValueForCSV(sub, fieldId);
        if (fv && typeof fv === "object" && fv.billingAddress) {
          fieldsWithBillingAddress.add(fieldId);
          break; // no need to check more submissions for this field
        }
      }
    }

    // For headers, use the combined fields mapping, and append billing address columns when needed
    const headers = ["Date"];
    visibleFields.forEach((fieldId) => {
      const baseLabel = fields[fieldId] || fieldId;
      headers.push(baseLabel);
      if (fieldsWithBillingAddress.has(fieldId)) {
        headers.push(
          `${baseLabel} - Billing Address Line 1`,
          `${baseLabel} - Billing Address Line 2`,
          `${baseLabel} - Billing City`,
          `${baseLabel} - Billing State/Region`,
          `${baseLabel} - Billing Postal Code`,
          `${baseLabel} - Billing Country`
        );
      }
    });
    const csvRows = [headers.join(",")];

    data.forEach((sub) => {
      const rowCells = [];
      const quoteCsv = (v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`;

      rowCells.push(quoteCsv(formatDate(sub.submissionDate)));

      visibleFields.forEach((fieldId) => {
        const fieldValue = resolveFieldValueForCSV(sub, fieldId);

        // Base cell
        let csvValue = "";
        if (Array.isArray(fieldValue)) {
          csvValue = fieldValue.join("; ");
        } else if (typeof fieldValue === "boolean") {
          csvValue = fieldValue ? "Yes" : "No";
        } else if (
          fieldValue &&
          typeof fieldValue === "object" &&
          (fieldValue.amount || fieldValue.paymentMethod || fieldValue.status)
        ) {
          const parts = [];
          if (fieldValue.amount)
            parts.push(
              `${fieldValue.currency ? fieldValue.currency + " " : ""}${
                fieldValue.amount
              }`
            );
          if (fieldValue.paymentMethod) parts.push(fieldValue.paymentMethod);
          if (fieldValue.status) parts.push(`(${fieldValue.status})`);
          csvValue = parts.join(" ");
        } else {
          csvValue = (fieldValue || "").toString();
        }
        rowCells.push(quoteCsv(csvValue));

        // Optional billing address expanded columns
        if (fieldsWithBillingAddress.has(fieldId)) {
          const addr =
            fieldValue && typeof fieldValue === "object"
              ? fieldValue.billingAddress || {}
              : {};
          rowCells.push(
            quoteCsv(addr.address_line_1 || ""),
            quoteCsv(addr.address_line_2 || ""),
            quoteCsv(addr.admin_area_2 || ""),
            quoteCsv(addr.admin_area_1 || ""),
            quoteCsv(addr.postal_code || ""),
            quoteCsv(addr.country_code || "")
          );
        }
      });

      csvRows.push(rowCells.join(","));
    });

    return csvRows.join("\n");
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const performDownloadFromModal = () => {
    if (!downloadModal || !downloadModal.isOpen) return;
    const { type, content, filename } = downloadModal;
    if (!content) return;

    if (type === "csv") {
      downloadCSV(content, filename);
    } else if (type === "json") {
      const blob = new Blob([content], { type: "application/json" });
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = filename || "data.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } else if (type === "xml") {
      const blob = new Blob([content], { type: "application/xml" });
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = filename || "data.xml";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    // close modal after download
    setDownloadModal({
      isOpen: false,
      type: null,
      content: null,
      filename: null,
    });
  };

  const handleDelete = async () => {
    if (selectedRows.length === 0) {
      alert("Please select submissions to delete");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedRows.length} submission(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const userId = sessionStorage.getItem("userId");
      const instanceUrl = sessionStorage.getItem("instanceUrl");
      const accessToken = await fetchAccessToken(userId, instanceUrl, 3);

      const lambdaUrl =
        "https://gy4k2psfp6.execute-api.us-east-1.amazonaws.com/Stage1";
      const response = await fetch(lambdaUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          instanceUrl,
          formVersionId,
          submissionIds: selectedRows,
          accessToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete submissions: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to delete submissions");
      }

      setSubmissions((prev) =>
        prev.filter((sub) => !selectedRows.includes(sub.id))
      );
      setSelectedRows([]);

      const { summary } = data;
      if (summary.failed > 0) {
        alert(
          `Deleted ${summary.successful} of ${summary.total} submission(s). ${summary.failed} failed to delete.`
        );
      } else {
        alert(`Successfully deleted ${summary.successful} submission(s)`);
      }

      console.log("Delete results:", data.results);
    } catch (err) {
      console.error("Delete error:", err);
      alert(`Error deleting submissions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  // Handler functions for modals and actions
  const handlePreviewSubmission = (submission) => {
    setPreviewModal({ isOpen: true, submission });
  };

  // Refresh function to fetch fresh data from Lambda
  const handleRefreshData = async () => {
    // Point this handler to the new centralized function
    await fetchAllData();
  };

  const handleStatusUpdate = async (submissionId, newStatus) => {
    try {
      // Optimistically update the UI first
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId ? { ...sub, status: newStatus } : sub
        )
      );

      setAllSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId ? { ...sub, status: newStatus } : sub
        )
      );

      // Make API call to update status in Salesforce
      const userId = sessionStorage.getItem("userId");
      const instanceUrl = sessionStorage.getItem("instanceUrl");

      if (!userId || !instanceUrl) {
        throw new Error("Missing authentication details");
      }

      const accessToken = await fetchAccessToken(userId, instanceUrl, 3);
      if (!accessToken) {
        throw new Error("Failed to obtain access token");
      }

      const lambdaUrl =
        "https://gy4k2psfp6.execute-api.us-east-1.amazonaws.com/Stage1";

      const response = await fetch(lambdaUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          instanceUrl,
          accessToken,
          submissionId,
          formId,
          formVersionId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to update status");
      }

      console.log(
        `Successfully updated submission ${submissionId} status to ${newStatus}`
      );
    } catch (error) {
      console.error("Error updating submission status:", error);

      // Revert the optimistic update on error
      const originalSubmission = allSubmissions.find(
        (sub) => sub.id === submissionId
      );
      const originalStatus = originalSubmission
        ? originalSubmission.status
        : "Unread";

      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId ? { ...sub, status: originalStatus } : sub
        )
      );

      setAllSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId ? { ...sub, status: originalStatus } : sub
        )
      );
    }
  };

  const handleArchiveSubmission = async (submissionId) => {
    try {
      // Optimistically update the UI first
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId ? { ...sub, archived: true } : sub
        )
      );

      setAllSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId ? { ...sub, archived: true } : sub
        )
      );

      // Make API call to update archive status in Salesforce
      const userId = sessionStorage.getItem("userId");
      const instanceUrl = sessionStorage.getItem("instanceUrl");

      if (!userId || !instanceUrl) {
        throw new Error("Missing authentication details");
      }

      const accessToken = await fetchAccessToken(userId, instanceUrl, 3);
      if (!accessToken) {
        throw new Error("Failed to obtain access token");
      }

      const lambdaUrl =
        "https://gy4k2psfp6.execute-api.us-east-1.amazonaws.com/Stage1";

      const response = await fetch(lambdaUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          instanceUrl,
          accessToken,
          submissionId,
          formId,
          formVersionId,
          archived: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to archive submission: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to archive submission");
      }

      console.log(`Successfully archived submission ${submissionId}`);
      alert("Submission archived successfully!");
    } catch (error) {
      console.error("Error archiving submission:", error);

      // Revert the optimistic update on error
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId ? { ...sub, archived: false } : sub
        )
      );

      setAllSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId ? { ...sub, archived: false } : sub
        )
      );

      alert(`Failed to archive submission: ${error.message}`);
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this submission? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const userId = sessionStorage.getItem("userId");
      const instanceUrl = sessionStorage.getItem("instanceUrl");
      const accessToken = await fetchAccessToken(userId, instanceUrl, 3);

      const lambdaUrl =
        "https://gy4k2psfp6.execute-api.us-east-1.amazonaws.com/Stage1";
      const response = await fetch(lambdaUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          instanceUrl,
          submissionIds: [submissionId],
          formId: formId,
          formVersionId: formVersionId,
          accessToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete submission: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to delete submission");
      }

      // Remove from UI
      setSubmissions((prev) => prev.filter((sub) => sub.id !== submissionId));
      setAllSubmissions((prev) =>
        prev.filter((sub) => sub.id !== submissionId)
      );

      // Close the preview modal
      setPreviewModal({ isOpen: false, submission: null });

      alert("Submission deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      alert(`Error deleting submission: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSubmissions = async () => {
    // Also point this handler to the new centralized function
    await fetchAllData();
  };

  // Helper to detect image URLs or file objects that reference images
  const isImageUrl = (fileOrUrl) => {
    if (!fileOrUrl) return false;
    if (typeof fileOrUrl === "string") {
      return (
        fileOrUrl.startsWith("data:image") ||
        /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(fileOrUrl)
      );
    }
    // file objects may have url/fileUrl/path/s3Url
    const url =
      fileOrUrl.url ||
      fileOrUrl.fileUrl ||
      fileOrUrl.path ||
      fileOrUrl.s3Url ||
      fileOrUrl.downloadUrl ||
      fileOrUrl.dataUrl ||
      null;
    if (!url) return false;
    return (
      typeof url === "string" &&
      (url.startsWith("data:image") ||
        /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(url))
    );
  };

  // Helper to download a file via fetch+blob (with fallback to opening in new tab)
  const downloadFile = async (url) => {
    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) throw new Error("Network response not ok");
      const blob = await response.blob();
      const filename = (() => {
        try {
          return (
            decodeURIComponent(new URL(url).pathname.split("/").pop()) ||
            "download"
          );
        } catch (e) {
          return url.split("/").pop() || "download";
        }
      })();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // fallback
      window.open(url, "_blank", "noopener");
    }
  };

  const handleShowFiles = (files, fieldLabel) => {
    const fileArray = Array.isArray(files) ? files : [files];
    // If there is exactly one file and it's an image, open the large image modal
    if (fileArray.length === 1 && isImageUrl(fileArray[0])) {
      openImageModal(fileArray[0]);
      return;
    }
    // Otherwise show file list modal
    setFileModal({ isOpen: true, files: fileArray, fieldLabel });
  };

  // Load an image as a blob and return an object URL; throws if fetch fails
  const loadImageAsObjectUrl = async (url) => {
    const resp = await fetch(url, { mode: "cors" });
    if (!resp.ok) throw new Error("Failed to fetch image");
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  };

  // Open image modal: try to fetch image as blob and show object URL
  const openImageModal = async (url) => {
    try {
      console.log("url : ", url);
      const objUrl = await loadImageAsObjectUrl(url);
      // revoke any previous object URL
      if (imageModal.objectUrl) URL.revokeObjectURL(imageModal.objectUrl);
      setImageModal({
        isOpen: true,
        src: objUrl,
        objectUrl: objUrl,
        originalSrc: url,
      });
    } catch (err) {
      // Couldn't fetch blob (CORS etc) - fallback to original URL
      console.warn(
        "Could not load image as blob, falling back to original URL:",
        err
      );
      setImageModal({
        isOpen: true,
        src: url,
        objectUrl: null,
        originalSrc: url,
      });
    }
  };

  const closeImageModal = () => {
    if (imageModal.objectUrl) {
      try {
        URL.revokeObjectURL(imageModal.objectUrl);
      } catch (e) {}
    }
    setImageModal({
      isOpen: false,
      src: null,
      objectUrl: null,
      originalSrc: null,
    });
  };

  // Robust image download helper used by the image modal download button.
  // Tries to fetch the original URL and create a blob to force-download (preferred).
  // If that fails (CORS or network), fall back to using any existing objectUrl, then finally open in a new tab.
  const downloadImageFromModal = async () => {
    try {
      if (!imageModal || (!imageModal.originalSrc && !imageModal.objectUrl))
        return;

      const filename = (() => {
        try {
          return (
            decodeURIComponent(
              new URL(imageModal.originalSrc).pathname.split("/").pop()
            ) || "image.jpg"
          );
        } catch (e) {
          return (
            (imageModal.originalSrc || imageModal.objectUrl || "image.jpg")
              .split("/")
              .pop() || "image.jpg"
          );
        }
      })();

      // Try to fetch the original URL to create a blob (best for proper download)
      if (imageModal.originalSrc) {
        try {
          const resp = await fetch(imageModal.originalSrc, { mode: "cors" });
          if (resp && resp.ok) {
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
            return;
          }
        } catch (e) {
          // ignore and fallback to other strategies
          console.warn(
            "downloadImageFromModal: could not fetch originalSrc, falling back",
            e
          );
        }
      }

      // If we have an objectUrl (created earlier for preview), use it as a fallback download source
      if (imageModal.objectUrl) {
        try {
          const a = document.createElement("a");
          a.href = imageModal.objectUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          return;
        } catch (e) {
          console.warn("downloadImageFromModal: objectUrl download failed", e);
        }
      }

      // Final fallback: use the generic downloadFile helper which attempts fetch->blob and then opens the URL
      if (imageModal.originalSrc) {
        await downloadFile(imageModal.originalSrc);
      }
    } catch (err) {
      console.error("downloadImageFromModal error:", err);
      if (imageModal && (imageModal.originalSrc || imageModal.objectUrl)) {
        window.open(
          imageModal.originalSrc || imageModal.objectUrl,
          "_blank",
          "noopener"
        );
      }
    }
  };

  const handleApplyAdvancedFilters = (filters, status) => {
    setAdvancedFilters(filters);
    setStatusFilter(status || "");
    setCurrentPage(1);
  };

  // Custom handler to maintain field order when toggling visibility
  const handleFieldVisibilityChange = (selectedFieldIds) => {
    // Maintain the original order by filtering the original order array
    const orderedSelectedFields = originalFieldOrder.filter((fieldId) =>
      selectedFieldIds.includes(fieldId)
    );
    setVisibleFields(orderedSelectedFields);
  };

  // Helper function to get field info for a specific submission
  const getFieldInfoForSubmission = (fieldId, submission) => {
    // For "All Versions" view, we need to get field info from the submission's specific version
    if (
      selectedVersion === "all" &&
      submission.formVersionId &&
      fieldsByVersion[submission.formVersionId]
    ) {
      const fieldInfo = fieldsByVersion[submission.formVersionId][fieldId];
      if (fieldInfo) {
        return fieldInfo;
      }

      // If field not found in submission's version, try to find it in other versions
      for (const versionFields of Object.values(fieldsByVersion)) {
        if (versionFields[fieldId]) {
          return versionFields[fieldId];
        }
      }
    }

    // For specific version views, use the fields mapping
    if (fields[fieldId]) {
      return { label: fields[fieldId] };
    }

    // Fallback: try to find field info in allFields
    if (allFields[fieldId]) {
      return allFields[fieldId];
    }

    // Last resort: return a basic field info
    return { label: fieldId, type: "text" };
  };

  // Format date like 30/08/2025 9:00 AM
  const formatDate = (dateStr) => {
    return new Date(dateStr)
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", "");
  };

  // Safely stringify primitive or object values for titles and CSVs
  const stringifySafe = (val) => {
    try {
      if (val === null || val === undefined || val === "") return "-";
      if (Array.isArray(val)) return val.join(", ");
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    } catch (e) {
      return String(val);
    }
  };

  // Render a table cell value safely (returns string or JSX)
  const renderCellValue = (fieldValue, fieldInfo, fieldId) => {
    if (fieldValue === null || fieldValue === undefined || fieldValue === "")
      return "-";

    // Arrays -> badges (limit 3)
    if (Array.isArray(fieldValue)) {
      return (
        <div className="flex flex-wrap gap-1">
          {fieldValue.slice(0, 3).map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {String(item)}
            </span>
          ))}
          {fieldValue.length > 3 && (
            <span className="text-xs text-gray-500">
              +{fieldValue.length - 3} more
            </span>
          )}
        </div>
      );
    }

    // Booleans
    if (typeof fieldValue === "boolean") {
      return (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            fieldValue
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {fieldValue ? "Yes" : "No"}
        </span>
      );
    }

    // Objects -> detect known shapes first (e.g., payment), else pretty JSON
    if (typeof fieldValue === "object") {
      // Special rendering for payment field
      const isPaymentField =
        (fieldInfo &&
          typeof fieldInfo.type === "string" &&
          fieldInfo.type.toLowerCase() === "payment") ||
        (fieldValue &&
          ("amount" in fieldValue || "paymentMethod" in fieldValue) &&
          ("status" in fieldValue || "transactionId" in fieldValue));

      if (isPaymentField) {
        const amount = fieldValue.amount;
        const currency = fieldValue.currency || "";
        const method = fieldValue.paymentMethod || fieldValue.method;
        const provider = fieldValue.metadata?.provider;
        const status = fieldValue.status;

        return (
          <div className="inline-flex items-center gap-2">
            {amount !== undefined && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                {currency ? `${currency} ` : ""}
                {amount}
              </span>
            )}
            {method && (
              <span className="text-xs text-gray-700 font-medium capitalize">
                {method}
              </span>
            )}
            {provider && (
              <span className="text-[11px] text-gray-500">({provider})</span>
            )}
            {status && (
              <span
                className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                  status === "completed"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : status === "failed"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-gray-50 text-gray-700 border border-gray-200"
                }`}
              >
                {status}
              </span>
            )}
          </div>
        );
      }

      try {
        return (
          <pre className="text-sm bg-gray-50 p-2 rounded-lg border text-gray-800 font-mono whitespace-pre-wrap">
            {JSON.stringify(fieldValue, null, 2)}
          </pre>
        );
      } catch (e) {
        return String(fieldValue);
      }
    }

    // Strings: detect images, files, links
    if (typeof fieldValue === "string") {
      const s = fieldValue.trim();
      const isImage = s.match(/\.(jpeg|jpg|gif|png|webp)$/i);
      if (isImage) {
        return (
          <button
            onClick={() =>
              handleShowFiles([s], fieldInfo ? fieldInfo.label : fieldId)
            }
            className="relative group"
          >
            <div className="table-thumb-wrapper w-12 h-12 rounded border overflow-hidden flex items-center justify-center bg-gray-50">
              <img
                src={s}
                alt="Uploaded file"
                className="w-full h-full object-contain object-center transition"
              />
            </div>
          </button>
        );
      }

      if (s.startsWith("http") && s.includes(".")) {
        // file URL
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleShowFiles([s], fieldInfo ? fieldInfo.label : fieldId);
            }}
            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
            View File
          </button>
        );
      }

      // Plain string
      return String(fieldValue);
    }

    // Fallback
    return String(fieldValue);
  };

  // Apply advanced filter logic
  const applyAdvancedFilter = useCallback(
    (submission, filter) => {
      // Use the same logic as table rendering to find the correct field value
      let fieldValue;

      // Handle synthetic sub-fields formatted as <baseId>__sub__<suffix>
      if (filter.field && String(filter.field).includes("__sub__")) {
        const [baseId, suffix] = String(filter.field).split("__sub__");
        fieldValue = submission?.data?.[`${baseId}_${suffix}`];
      } else {
        fieldValue = submission.data[filter.field];
      }

      // For "All Versions", search for field with same label if not found
      if (
        selectedVersion === "all" &&
        (fieldValue === null || fieldValue === undefined || fieldValue === "")
      ) {
        const targetLabel = fields[filter.field];
        if (
          targetLabel &&
          submission.formVersionId &&
          fieldsByVersion[submission.formVersionId]
        ) {
          const versionFields = fieldsByVersion[submission.formVersionId];
          for (const [versionFieldId, versionFieldInfo] of Object.entries(
            versionFields
          )) {
            if (
              versionFieldInfo.label === targetLabel &&
              submission.data[versionFieldId] !== undefined
            ) {
              fieldValue = submission.data[versionFieldId];
              break;
            }
          }
        }
      }

      const filterValue = filter.value?.toLowerCase();
      const submissionValue = String(fieldValue || "").toLowerCase();

      let result = true;
      switch (filter.operator) {
        case "includes":
          result = submissionValue.includes(filterValue);
          break;
        case "equals":
          result = submissionValue === filterValue;
          break;
        case "not_equals":
          result = submissionValue !== filterValue;
          break;
        case "starts_with":
          result = submissionValue.startsWith(filterValue);
          break;
        case "ends_with":
          result = submissionValue.endsWith(filterValue);
          break;
        case "before": {
          try {
            const sv = new Date(fieldValue);
            const fv = new Date(filter.value);
            result = sv < fv;
          } catch (e) {
            result = false;
          }
          break;
        }
        case "on": {
          try {
            const sv = new Date(fieldValue);
            const fv = new Date(filter.value);
            result = sv.toDateString() === fv.toDateString();
          } catch (e) {
            result = false;
          }
          break;
        }
        case "after": {
          try {
            const sv = new Date(fieldValue);
            const fv = new Date(filter.value);
            result = sv > fv;
          } catch (e) {
            result = false;
          }
          break;
        }
        case "is_true":
          result =
            fieldValue === true || String(fieldValue).toLowerCase() === "true";
          break;
        case "is_false":
          result =
            fieldValue === false ||
            String(fieldValue).toLowerCase() === "false";
          break;
        case "contains": {
          if (Array.isArray(fieldValue)) {
            result = fieldValue.some((it) =>
              String(it || "")
                .toLowerCase()
                .includes(filterValue)
            );
          } else {
            result = String(fieldValue || "")
              .toLowerCase()
              .includes(filterValue);
          }
          break;
        }
        case "has_file": {
          if (Array.isArray(fieldValue)) result = fieldValue.length > 0;
          else result = !!fieldValue;
          break;
        }
        case "no_file": {
          if (Array.isArray(fieldValue)) result = fieldValue.length === 0;
          else result = !fieldValue;
          break;
        }
        case "filename_contains": {
          if (Array.isArray(fieldValue)) {
            result = fieldValue.some((item) => {
              if (!item) return false;
              if (typeof item === "string")
                return item.toLowerCase().includes(filterValue);
              if (typeof item === "object") {
                const name =
                  item.name ||
                  item.filename ||
                  item.title ||
                  item.url ||
                  item.fileUrl ||
                  "";
                return String(name).toLowerCase().includes(filterValue);
              }
              return false;
            });
          } else {
            result = String(fieldValue || "")
              .toLowerCase()
              .includes(filterValue);
          }
          break;
        }
        case "is_empty":
          result = !fieldValue || fieldValue === "";
          break;
        case "is_not_empty":
          result = fieldValue && fieldValue !== "";
          break;
        case "greater_than":
          result = parseFloat(submissionValue) > parseFloat(filterValue);
          break;
        case "less_than":
          result = parseFloat(submissionValue) < parseFloat(filterValue);
          break;
        default:
          result = true;
      }
      // apply negate (Except) if requested
      if (filter && filter.negate) result = !result;
      return result;
    },
    [selectedVersion, fields, fieldsByVersion]
  );

  // Filtered and paginated data
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Date filter
      const subDate = new Date(sub.submissionDate);
      const matchesDate =
        !dateRange ||
        ((!dateRange[0] || subDate >= dateRange[0]) &&
          (!dateRange[1] || subDate <= dateRange[1]));

      // Status filter
      const matchesStatus = !statusFilter || sub.status === statusFilter;

      // Archive filter
      const matchesArchive =
        archiveFilter === "all" ||
        (archiveFilter === "archived" && sub.archived) ||
        (archiveFilter === "active" && !sub.archived);

      // Search filter
      const matchesSearch =
        !searchTerm ||
        sub.submissionDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visibleFields.some((fieldId) => {
          // Use the same logic as table rendering to find the correct field value
          let fieldValue;

          if (fieldId.includes("__sub__")) {
            const [baseId, suffix] = fieldId.split("__sub__");
            fieldValue = sub?.data?.[`${baseId}_${suffix}`];
          } else {
            fieldValue = sub.data[fieldId];
          }

          // For "All Versions", search for field with same label if not found
          if (
            selectedVersion === "all" &&
            (fieldValue === null ||
              fieldValue === undefined ||
              fieldValue === "")
          ) {
            const targetLabel = fields[fieldId];
            if (
              targetLabel &&
              sub.formVersionId &&
              fieldsByVersion[sub.formVersionId]
            ) {
              const versionFields = fieldsByVersion[sub.formVersionId];
              for (const [versionFieldId, versionFieldInfo] of Object.entries(
                versionFields
              )) {
                if (
                  versionFieldInfo.label === targetLabel &&
                  sub.data[versionFieldId] !== undefined
                ) {
                  fieldValue = sub.data[versionFieldId];
                  break;
                }
              }
            }
          }

          return (fieldValue || "")
            .toString()
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        });

      // Advanced filters
      const matchesAdvanced =
        advancedFilters.length === 0 ||
        advancedFilters.every((filter) => applyAdvancedFilter(sub, filter));

      return (
        matchesDate &&
        matchesStatus &&
        matchesArchive &&
        matchesSearch &&
        matchesAdvanced
      );
    });
  }, [
    submissions,
    searchTerm,
    dateRange,
    statusFilter,
    archiveFilter,
    advancedFilters,
    visibleFields,
    applyAdvancedFilter,
    fields,
    fieldsByVersion,
    selectedVersion,
  ]);

  const handleColumnResize = (fieldId, newWidth) => {
    setColumnWidths((prev) => ({ ...prev, [fieldId]: newWidth }));
  };

  const requestSort = (key) => {
    let direction = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedSubmissions = useMemo(() => {
    // Helper to extract a sortable value for a given submission and key
    const getSortValue = (submission, key) => {
      if (!submission) return "";

      // Date sorting
      if (key === "submissionDate") {
        const t = new Date(submission.submissionDate).getTime();
        return isNaN(t) ? 0 : t;
      }

      // Field sorting: handle synthetic subfields and top-level data
      let val;
      if (key && String(key).includes("__sub__")) {
        const [baseId, suffix] = String(key).split("__sub__");
        val = submission.data
          ? submission.data[`${baseId}_${suffix}`]
          : undefined;
      } else {
        val = submission.data ? submission.data[key] : undefined;
      }

      // If in "all" mode and val is missing, try to find a field in this submission
      // which has the same label as the column's label (fields[key])
      if (
        (val === null || val === undefined || val === "") &&
        selectedVersion === "all" &&
        fields[key]
      ) {
        const targetLabel = fields[key];
        if (
          submission.formVersionId &&
          fieldsByVersion[submission.formVersionId]
        ) {
          const versionFields = fieldsByVersion[submission.formVersionId];
          for (const [versionFieldId, versionFieldInfo] of Object.entries(
            versionFields
          )) {
            if (
              versionFieldInfo.label === targetLabel &&
              submission.data[versionFieldId] !== undefined
            ) {
              val = submission.data[versionFieldId];
              break;
            }
          }
        }
      }

      // Normalize values for comparison
      if (val === null || val === undefined) return "";
      if (typeof val === "boolean") return val ? 1 : 0;
      if (typeof val === "number") return val;
      // Try to parse numbers
      const num = parseFloat(val);
      if (!isNaN(num) && String(val).trim() !== "") return num;
      // Try to parse date
      const dt = new Date(val);
      if (!isNaN(dt.getTime())) return dt.getTime();
      // Fallback to lowercase string
      return String(val).toLowerCase();
    };

    const items = [...filteredSubmissions];
    if (sortConfig && sortConfig.key) {
      items.sort((a, b) => {
        const va = getSortValue(a, sortConfig.key);
        const vb = getSortValue(b, sortConfig.key);

        if (va < vb) return sortConfig.direction === "ascending" ? -1 : 1;
        if (va > vb) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [
    filteredSubmissions,
    sortConfig,
    fields,
    fieldsByVersion,
    selectedVersion,
  ]);

  const totalPages = Math.ceil(sortedSubmissions.length / rowsPerPage);
  const paginatedSubmissions = sortedSubmissions.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Field options for CheckPicker
  const fieldOptions = Object.entries(fields).map(([id, label]) => ({
    value: id,
    label,
  }));

  if (!formId && !formVersionId) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">
            Missing Form Information
          </div>
          <div className="text-gray-600">
            No form ID or form version ID provided.
          </div>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!formVersionId)
    return (
      <div className="p-4 text-center text-gray-600">
        No form version selected.
      </div>
    );

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-blue-600 font-medium">Loading submissions...</div>
        <div className="text-gray-500 text-sm mt-2">
          This may take a few moments
        </div>
      </div>
    );

  if (error)
    return (
      <div className="p-4 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-red-600 font-semibold mb-2">
            Error Loading Submissions
          </div>
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );

  // Now using the new modal-based preview system

  return (
    <div
      className="main-container"
      style={{
        width: isSidebarOpen ? "calc(100vw - 16rem)" : "calc(100vw - 4rem)",
      }}
    >
      {/* Preview modal displayed as a card over the table (like image 2) */}
      {previewModal.isOpen && previewModal.submission && (
        <div className="submission-modal-container">
          <div
            className="submission-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-body">
              <SubmissionPreviewNew
                submission={previewModal.submission}
                allFields={allFields}
                fieldsByVersion={fieldsByVersion}
                formVersions={formVersions}
                onStatusUpdate={handleStatusUpdate}
                onClose={() =>
                  setPreviewModal({ isOpen: false, submission: null })
                }
                onArchive={handleArchiveSubmission}
                onDelete={handleDeleteSubmission}
                onRefresh={handleRefreshSubmissions}
                onImageClick={(src) => openImageModal(src)}
                onShowFiles={handleShowFiles}
              />
            </div>
          </div>
        </div>
      )}

      {!(previewModal.isOpen && previewModal.submission) && (
        <div
          className={`relative overflow-hidden flex flex-col  ${
            selectedRows.length > 0 ? "selected-mode" : ""
          }`}
        >
          {/* Header tab section  */}
          <div className="flex-shrink-0">
            <div className="pb-1 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between top-tab-bar">
                  <div className="flex items-center gap-4">
                    <div className="left-tab-stack">
                      <button
                        className={`tab ${
                          archiveFilter === "active" ? "active" : ""
                        }`}
                        onClick={() => setArchiveFilter("active")}
                      >
                        Active
                      </button>
                      <button
                        className={`tab ${
                          archiveFilter === "archived" ? "active" : ""
                        }`}
                        onClick={() => setArchiveFilter("archived")}
                      >
                        Archived
                      </button>
                      <button
                        className={`tab ${
                          archiveFilter === "analytics" ? "active" : ""
                        }`}
                        onClick={() => setArchiveFilter("analytics")}
                      >
                        Analytics
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="p-4 relative main-content-area">
            <div className="flex-1 overflow-hidden bg-white border border-gray-200 rounded-lg content-area">
              {/* table related action  */}
              <div className="table-realted-actions">
                <div className="left-actions">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <div className="relative search-box">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search in"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                        title="Search submissions"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setFiltersModal(true)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    title="Filters"
                  >
                    <Filter className="w-4 h-4" />
                  </button>

                  <CheckPicker
                    data={fieldOptions}
                    value={visibleFields}
                    onChange={handleFieldVisibilityChange}
                    placeholder="Fields"
                    searchable={false}
                    className="w-40"
                    container={() => document.body}
                    renderMenuItem={(label) => (
                      <div className="flex items-center gap-2">
                        <Grid3X3 className="w-4 h-4" />
                        {label}
                      </div>
                    )}
                  />

                  {formVersions.length > 0 && (
                    <SelectPicker
                      data={[
                        { label: "All", value: "all" },
                        ...formVersions.map((v) => ({
                          value: v.id,
                          label: `v${v.version}`,
                          _meta: v,
                        })),
                      ]}
                      value={selectedVersion}
                      onChange={setSelectedVersion}
                      placeholder="v1"
                      className="w-20"
                      cleanable={false}
                      container={() => document.body}
                      renderMenuItem={(label, item) => {
                        const v = item && item._meta;
                        return (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                            }}
                          >
                            <div>{label}</div>
                            {v && v.isActive && (
                              <div
                                style={{
                                  background: "#e6ffed",
                                  color: "#166534",
                                  padding: "2px 6px",
                                  borderRadius: 6,
                                  fontSize: 12,
                                }}
                              >
                                Published
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                  )}
                </div>

                <div className="right-actions">
                  <button
                    onClick={handleRefreshData}
                    disabled={loading}
                    className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>

                  <div
                    className="relative submission-actions"
                    ref={headerMenuRef}
                  >
                    <button
                      className="p-2 bg-white border border-gray-200 rounded hover:bg-gray-50"
                      onClick={() =>
                        setOpenMenu(openMenu === "header" ? null : "header")
                      }
                      title="Download options"
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                    </button>

                    {openMenu === "header" && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50 py-1">
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            const csv = generateCSV(submissions);
                            setDownloadModal({
                              isOpen: true,
                              type: "csv",
                              content: csv,
                              filename: `submissions_${
                                new Date().toISOString().split("T")[0]
                              }.csv`,
                            });
                            setOpenMenu(null);
                          }}
                        >
                          Download CSV
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            const json = JSON.stringify(submissions, null, 2);
                            setDownloadModal({
                              isOpen: true,
                              type: "json",
                              content: json,
                              filename: `submissions_${
                                new Date().toISOString().split("T")[0]
                              }.json`,
                            });
                            setOpenMenu(null);
                          }}
                        >
                          Download JSON
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<submissions>\n${submissions
                              .map(
                                (s) =>
                                  `  <submission id="${
                                    s.id
                                  }">\n${Object.entries(s.data || {})
                                    .map(
                                      ([k, v]) =>
                                        `    <field name="${k}">${String(v)
                                          .replace(/&/g, "&amp;")
                                          .replace(/</g, "&lt;")}</field>\n`
                                    )
                                    .join("")}  </submission>`
                              )
                              .join("\n")}\n</submissions>`;
                            setDownloadModal({
                              isOpen: true,
                              type: "xml",
                              content: xml,
                              filename: `submissions_${
                                new Date().toISOString().split("T")[0]
                              }.xml`,
                            });
                            setOpenMenu(null);
                          }}
                        >
                          Download XML
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <DateRangePicker
                      value={dateRange}
                      onChange={setDateRange}
                      format="MM/dd/yyyy"
                      placeholder="07/20/2025 - 07/20/2026"
                      className="w-64"
                      cleanable={true}
                      placement="bottomEnd"
                      container={() => document.body}
                      preventOverflow={false}
                    />
                  </div>
                </div>
              </div>
              {/* table wrapper  */}
              <div className="table-wrapper">
                <div
                  ref={tableScrollRef}
                  className={`table-scroll ${
                    tableScrolled ? "is-scrolled" : ""
                  }`}
                >
                  <table
                    ref={tableRef}
                    className="w-full table-fixed submissions-table"
                    style={{
                      // allow smaller tables so columns can fit content better
                      minWidth: `${Math.max(
                        600,
                        visibleFields.length * 160 + 200
                      )}px`,
                    }}
                  >
                    <thead className="bg-blue-50 border-b border-blue-200 sticky top-0 z-20">
                      <tr>
                        <th
                          className="w-16 px-4 py-2 sticky z-30 border-r border-blue-200 eye-checkbox-col"
                          style={{ left: "var(--sticky-left-0)" }}
                        >
                          <input
                            type="checkbox"
                            checked={
                              selectedRows.length ===
                                paginatedSubmissions.length &&
                              paginatedSubmissions.length > 0
                            }
                            onChange={toggleSelectAll}
                            className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            title="Select all visible"
                          />
                        </th>
                        {(() => {
                          const dateColWidth = columnWidths["submissionDate"];
                          const isSortedDate =
                            sortConfig && sortConfig.key === "submissionDate";
                          return (
                            <th
                              key="submissionDate"
                              className={`text-left px-4 py-2 z-30 font-medium text-gray-700 text-sm border-r border-blue-200 relative group cursor-pointer submission-date-col ${
                                isSortedDate ? "sorted-col" : ""
                              }`}
                              style={{
                                width: dateColWidth
                                  ? `${dateColWidth}px`
                                  : undefined,
                                minWidth: dateColWidth
                                  ? `${Math.min(dateColWidth, 150)}px`
                                  : "140px",
                                maxWidth: dateColWidth
                                  ? `${Math.max(dateColWidth, 300)}px`
                                  : "300px",
                                position: "sticky",
                                left: "var(--sticky-left-1)",
                              }}
                            >
                              <div
                                className="truncate pr-4 "
                                onClick={() => requestSort("submissionDate")}
                              >
                                <div className="flex items-center justify-between">
                                  <span>DATE</span>
                                  <span className="sort-indicator text-xs ml-2">
                                    {isSortedDate
                                      ? sortConfig.direction === "ascending"
                                        ? "▲"
                                        : "▼"
                                      : ""}
                                  </span>
                                  {!isSortedDate && (
                                    <span className="sort-hover text-xs ml-2">
                                      ▲
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* resize handle for date column */}
                              <div
                                className="absolute right-0 top-0 bottom-0 w-2 bg-transparent hover:bg-blue-400 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  const startX = e.clientX;
                                  const th =
                                    e.currentTarget.closest("th") ||
                                    e.target.closest("th");
                                  const startWidth = th ? th.offsetWidth : 200;

                                  const handleMouseMove = (ev) => {
                                    const newWidth = Math.max(
                                      120,
                                      Math.min(
                                        800,
                                        startWidth + (ev.clientX - startX)
                                      )
                                    );
                                    if (th) th.style.width = `${newWidth}px`;
                                    handleColumnResize(
                                      "submissionDate",
                                      newWidth
                                    );
                                  };

                                  const handleMouseUp = () => {
                                    document.removeEventListener(
                                      "mousemove",
                                      handleMouseMove
                                    );
                                    document.removeEventListener(
                                      "mouseup",
                                      handleMouseUp
                                    );
                                  };

                                  document.addEventListener(
                                    "mousemove",
                                    handleMouseMove
                                  );
                                  document.addEventListener(
                                    "mouseup",
                                    handleMouseUp
                                  );
                                }}
                              />
                            </th>
                          );
                        })()}
                        {visibleFields.length > 0 ? (
                          visibleFields.map((fieldId, index) => {
                            const colWidth = columnWidths[fieldId];
                            return (
                              <th
                                key={fieldId}
                                className="text-left px-4 py-2 font-medium text-gray-700 text-sm border-r border-blue-200 relative group cursor-pointer"
                                style={{
                                  width: colWidth ? `${colWidth}px` : undefined,
                                  minWidth: colWidth
                                    ? `${Math.min(colWidth, 150)}px`
                                    : "150px",
                                  maxWidth: colWidth
                                    ? `${Math.max(colWidth, 300)}px`
                                    : "300px",
                                }}
                              >
                                <div
                                  className="truncate pr-4 "
                                  title={fields[fieldId]}
                                  onClick={() => requestSort(fieldId)}
                                  onMouseEnter={() => {
                                    console.log("✨✨");
                                    setHoverSortConfig(fieldId);
                                  }}
                                  onMouseLeave={() => {
                                    console.log(sortConfig);
                                    console.log(hoverSortConfig);
                                    setHoverSortConfig(null);
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{fields[fieldId]}</span>
                                    {sortConfig &&
                                      sortConfig.key === fieldId && (
                                        <span className="text-xs ml-2">
                                          {sortConfig.direction === "ascending"
                                            ? "▲"
                                            : "▼"}
                                        </span>
                                      )}
                                    {sortConfig.key !== fieldId &&
                                      hoverSortConfig === fieldId && (
                                        <span className="text-xs ml-2 text-gray-400">
                                          {"▲"}
                                        </span>
                                      )}
                                  </div>
                                </div>
                                {/* Column resize handle */}
                                <div
                                  className="absolute right-0 top-0 bottom-0 w-2 bg-transparent hover:bg-blue-400 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                  onMouseDown={(e) => {
                                    // prevent the header click (sort) from firing when starting a drag
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const startX = e.clientX;
                                    const th =
                                      e.currentTarget.closest("th") ||
                                      e.target.closest("th");
                                    const startWidth = th
                                      ? th.offsetWidth
                                      : 200;

                                    const handleMouseMove = (ev) => {
                                      const newWidth = Math.max(
                                        120,
                                        Math.min(
                                          800,
                                          startWidth + (ev.clientX - startX)
                                        )
                                      );
                                      if (th) th.style.width = `${newWidth}px`;
                                      // apply to state so TDs can pick it up
                                      handleColumnResize(fieldId, newWidth);
                                    };

                                    const handleMouseUp = () => {
                                      document.removeEventListener(
                                        "mousemove",
                                        handleMouseMove
                                      );
                                      document.removeEventListener(
                                        "mouseup",
                                        handleMouseUp
                                      );
                                    };

                                    document.addEventListener(
                                      "mousemove",
                                      handleMouseMove
                                    );
                                    document.addEventListener(
                                      "mouseup",
                                      handleMouseUp
                                    );
                                  }}
                                />
                              </th>
                            );
                          })
                        ) : (
                          <th className="text-left p-4 font-medium text-gray-700 text-sm border-r border-blue-200">
                            SUBMISSION DATA
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedSubmissions.length === 0 ? (
                        <tr>
                          <td
                            colSpan={visibleFields.length + 2}
                            className="p-12 text-center"
                          >
                            <div className="flex flex-col items-center">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Grid3X3 className="w-8 h-8 text-gray-400" />
                              </div>
                              <div className="text-gray-500 font-medium mb-2">
                                {submissions.length === 0
                                  ? "No submissions yet"
                                  : "No submissions match your filters"}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {submissions.length === 0
                                  ? "Submissions will appear here once your form is published and filled out"
                                  : "Try adjusting your search or date range filters"}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedSubmissions.map((sub) => (
                          <tr
                            key={sub.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td
                              className="p-2 sticky bg-white z-10 border-r border-gray-200 eye-checkbox-cell"
                              style={{ left: "var(--sticky-left-0)" }}
                            >
                              <div className="flex items-center justify-evenly gap-4">
                                <input
                                  type="checkbox"
                                  checked={selectedRows.includes(sub.id)}
                                  onChange={() => handleRowSelect(sub.id)}
                                  className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-opacity row-checkbox"
                                />
                                <button
                                  onClick={() =>
                                    setPreviewModal({
                                      isOpen: true,
                                      submission: sub,
                                    })
                                  }
                                  className="text-gray-400 hover:text-gray-600 transition eye-col"
                                  title="Preview"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                            <td
                              className="p-4 text-sm text-gray-900 font-medium min-w-[140px] sticky bg-white z-10 border-r border-gray-200 submission-date-cell"
                              style={{ left: "var(--sticky-left-1)" }}
                            >
                              {formatDate(sub.submissionDate)}
                            </td>
                            {visibleFields.length > 0 ? (
                              visibleFields.map((fieldId) => {
                                // For "All Versions", we need to find the actual field value
                                // by looking for the field in the submission's version-specific data
                                let fieldValue;
                                let fieldInfo;

                                // Handle synthetic sub-field IDs formatted as <baseId>__sub__<suffix>
                                if (fieldId.includes("__sub__")) {
                                  const [baseId, suffix] =
                                    fieldId.split("__sub__");
                                  fieldValue =
                                    sub?.data?.[`${baseId}_${suffix}`];
                                  fieldInfo = getFieldInfoForSubmission(
                                    baseId,
                                    sub
                                  );
                                } else {
                                  fieldValue = sub.data[fieldId];
                                  fieldInfo = getFieldInfoForSubmission(
                                    fieldId,
                                    sub
                                  );
                                }

                                // If we're in "All Versions" mode and don't find the field value,
                                // search for a field with the same label in the submission's version
                                if (
                                  selectedVersion === "all" &&
                                  !fieldId.includes("__sub__") &&
                                  (fieldValue === null ||
                                    fieldValue === undefined ||
                                    fieldValue === "")
                                ) {
                                  const targetLabel = fields[fieldId]; // The label we're looking for
                                  if (
                                    targetLabel &&
                                    sub.formVersionId &&
                                    fieldsByVersion[sub.formVersionId]
                                  ) {
                                    // Find a field in this submission's version that has the same label
                                    const versionFields =
                                      fieldsByVersion[sub.formVersionId];
                                    for (const [
                                      versionFieldId,
                                      versionFieldInfo,
                                    ] of Object.entries(versionFields)) {
                                      if (
                                        versionFieldInfo.label ===
                                          targetLabel &&
                                        sub.data[versionFieldId] !== undefined
                                      ) {
                                        fieldValue = sub.data[versionFieldId];
                                        fieldInfo = versionFieldInfo;
                                        break;
                                      }
                                    }
                                  }
                                }

                                // Map to payment object if present under known keys,
                                // even if the field's type metadata is missing
                                {
                                  const paymentKey = `payment_${fieldId}`;
                                  const paymentFromKey = sub.data?.[paymentKey];
                                  const paymentFromRoot =
                                    sub.data?.paymentData?.fieldId === fieldId
                                      ? sub.data.paymentData
                                      : null;
                                  const paymentObj =
                                    paymentFromKey || paymentFromRoot;
                                  if (
                                    (fieldValue === null ||
                                      fieldValue === undefined ||
                                      fieldValue === "") &&
                                    paymentObj
                                  ) {
                                    fieldValue = paymentObj;
                                  }
                                }

                                // If still empty, check for composite subfields like `${fieldId}_firstName` and show a meaningful one
                                if (
                                  fieldValue === null ||
                                  fieldValue === undefined ||
                                  fieldValue === ""
                                ) {
                                  const prefix = `${fieldId}_`;
                                  const subEntries = Object.entries(
                                    sub.data || {}
                                  )
                                    .filter(([k, v]) => k.startsWith(prefix))
                                    .map(([k, v]) => ({
                                      key: k.slice(prefix.length),
                                      value: v,
                                    }))
                                    .filter(
                                      (e) =>
                                        e.value !== undefined &&
                                        e.value !== null &&
                                        e.value !== ""
                                    );
                                  if (subEntries.length > 0) {
                                    // Prefer common subfields
                                    const priority = [
                                      "fullName",
                                      "firstName",
                                      "street",
                                      "email",
                                      "phone",
                                      "city",
                                      "state",
                                      "postal",
                                      "zip",
                                      "country",
                                    ];
                                    const notMeta = subEntries.filter(
                                      (e) =>
                                        e.key.toLowerCase() !== "countrycode"
                                    );
                                    const pickFrom =
                                      notMeta.length > 0 ? notMeta : subEntries;
                                    let picked = pickFrom.find((e) =>
                                      priority.includes(e.key)
                                    );
                                    if (!picked) picked = pickFrom[0];
                                    fieldValue = picked?.value;
                                  }
                                }

                                // Handle different field types
                                if (
                                  fieldValue !== null &&
                                  fieldValue !== undefined &&
                                  fieldValue !== ""
                                ) {
                                  // Array values (checkbox groups, multi-select)
                                  if (Array.isArray(fieldValue)) {
                                    return (
                                      <td
                                        key={fieldId}
                                        className="p-4 min-w-[120px]"
                                      >
                                        <div className="flex flex-wrap gap-1">
                                          {fieldValue
                                            .slice(0, 3)
                                            .map((item, index) => (
                                              <span
                                                key={index}
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                              >
                                                {String(item)}
                                              </span>
                                            ))}
                                          {fieldValue.length > 3 && (
                                            <span className="text-xs text-gray-500">
                                              +{fieldValue.length - 3} more
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  }

                                  // Boolean/checkbox values
                                  if (typeof fieldValue === "boolean") {
                                    return (
                                      <td
                                        key={fieldId}
                                        className="p-4 min-w-[80px]"
                                      >
                                        <span
                                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            fieldValue
                                              ? "bg-green-100 text-green-800"
                                              : "bg-red-100 text-red-800"
                                          }`}
                                        >
                                          {fieldValue ? "Yes" : "No"}
                                        </span>
                                      </td>
                                    );
                                  }

                                  // String values
                                  if (typeof fieldValue === "string") {
                                    // Check for boolean-like strings
                                    if (
                                      fieldValue.toLowerCase() === "true" ||
                                      fieldValue.toLowerCase() === "false"
                                    ) {
                                      const boolValue =
                                        fieldValue.toLowerCase() === "true";
                                      return (
                                        <td
                                          key={fieldId}
                                          className="p-4 min-w-[80px]"
                                        >
                                          <span
                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                              boolValue
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                            }`}
                                          >
                                            {boolValue ? "Yes" : "No"}
                                          </span>
                                        </td>
                                      );
                                    }

                                    // Check if it's an image URL
                                    if (
                                      fieldValue.match(
                                        /\.(jpeg|jpg|gif|png|webp)$/i
                                      )
                                    ) {
                                      return (
                                        <td
                                          key={fieldId}
                                          className="p-4 min-w-[80px]"
                                        >
                                          <button
                                            onClick={() =>
                                              handleShowFiles(
                                                [fieldValue],
                                                fields[fieldId]
                                              )
                                            }
                                            className="relative group"
                                          >
                                            <img
                                              src={fieldValue}
                                              alt="Uploaded file"
                                              className="w-12 h-12 object-cover rounded border hover:opacity-80 transition"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all flex items-center justify-center">
                                              <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition" />
                                            </div>
                                          </button>
                                        </td>
                                      );
                                    }

                                    // Check if it's a file URL
                                    else if (
                                      fieldValue.startsWith("http") &&
                                      fieldValue.includes(".")
                                    ) {
                                      return (
                                        <td
                                          key={fieldId}
                                          className="p-4 min-w-[100px]"
                                        >
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleShowFiles(
                                                [fieldValue],
                                                fields[fieldId]
                                              );
                                            }}
                                            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                          >
                                            <svg
                                              className="w-4 h-4"
                                              fill="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                            </svg>
                                            View File
                                          </button>
                                        </td>
                                      );
                                    }

                                    // Check if it's a regular URL (link field)
                                    else if (fieldValue.startsWith("http")) {
                                      return (
                                        <td
                                          key={fieldId}
                                          className="p-4 min-w-[100px]"
                                        >
                                          <a
                                            href={fieldValue}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                          >
                                            <svg
                                              className="w-4 h-4"
                                              fill="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path d="M10,6V8H5V19H16V14H18V20A1,1 0 0,1 17,21H4A1,1 0 0,1 3,20V7A1,1 0 0,1 4,6H10M21,3V12L17.5,8.5L13.09,12.91L11.68,11.5L16.09,7.09L12.5,3.5L21,3Z" />
                                            </svg>
                                            Visit Link
                                          </a>
                                        </td>
                                      );
                                    }
                                  }
                                }

                                const colWidth = columnWidths[fieldId];
                                return (
                                  <td
                                    key={fieldId}
                                    className="p-4 text-sm text-gray-700 min-w-[120px]"
                                    style={
                                      colWidth ? { width: `${colWidth}px` } : {}
                                    }
                                  >
                                    <div
                                      className="truncate max-w-[200px]"
                                      title={
                                        (fieldInfo && fieldInfo.label
                                          ? fieldInfo.label + ": "
                                          : "") + stringifySafe(fieldValue)
                                      }
                                    >
                                      {renderCellValue(
                                        fieldValue,
                                        fieldInfo,
                                        fieldId
                                      )}
                                    </div>
                                  </td>
                                );
                              })
                            ) : (
                              <td className="p-4 text-sm text-gray-700 min-w-[200px]">
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-500">
                                    {Object.keys(sub.data || {}).length}{" "}
                                    field(s)
                                  </span>
                                  <button
                                    onClick={() => handlePreviewSubmission(sub)}
                                    className="text-blue-600 hover:text-blue-800 text-xs underline"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Footer with Pagination */}
              <div className="table-footer">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Rows per page:</span>
                  <SelectPicker
                    data={[
                      { value: 10, label: "10" },
                      { value: 25, label: "25" },
                      { value: 50, label: "50" },
                      { value: 100, label: "100" },
                    ]}
                    value={rowsPerPage}
                    onChange={handleRowsPerPageChange}
                    searchable={false}
                    className="w-20"
                    cleanable={false}
                    container={() => document.body}
                  />
                </div>

                {/* Pagination */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200 rounded"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  {(() => {
                    const pages = [];
                    const showEllipsis = totalPages > 7;

                    if (!showEllipsis) {
                      // Show all pages if 7 or fewer
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Complex pagination logic
                      if (currentPage <= 4) {
                        // Show: 1, 2, 3, 4, 5, ..., last
                        pages.push(1, 2, 3, 4, 5);
                        if (totalPages > 6) {
                          pages.push("ellipsis1");
                          pages.push(totalPages);
                        }
                      } else if (currentPage >= totalPages - 3) {
                        // Show: 1, ..., last-4, last-3, last-2, last-1, last
                        pages.push(1);
                        if (totalPages > 6) {
                          pages.push("ellipsis1");
                        }
                        for (let i = totalPages - 4; i <= totalPages; i++) {
                          if (i > 1) pages.push(i);
                        }
                      } else {
                        // Show: 1, ..., current-1, current, current+1, ..., last
                        pages.push(1);
                        pages.push("ellipsis1");
                        pages.push(
                          currentPage - 1,
                          currentPage,
                          currentPage + 1
                        );
                        pages.push("ellipsis2");
                        pages.push(totalPages);
                      }
                    }

                    return pages.map((page, index) => {
                      if (page === "ellipsis1" || page === "ellipsis2") {
                        return (
                          <span
                            key={`ellipsis-${index}`}
                            className="px-2 py-1 text-gray-400"
                          >
                            ...
                          </span>
                        );
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`w-8 h-8 flex items-center justify-center text-sm rounded transition-colors ${
                            currentPage === page
                              ? "bg-blue-100 text-blue-600 font-medium border border-blue-200"
                              : "text-gray-600 hover:bg-gray-50 border border-gray-200"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    });
                  })()}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200 rounded"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Modals */}
          {/* Advanced Filters modal */}
          <AdvancedFilters
            isOpen={filtersModal}
            onClose={() => setFiltersModal(false)}
            fields={allFields}
            onApplyFilters={handleApplyAdvancedFilters}
            currentFilters={advancedFilters}
            currentStatus={statusFilter}
          />

          <AdvancedFilters
            isOpen={filtersModal}
            onClose={() => setFiltersModal(false)}
            fields={fields}
            onApplyFilters={handleApplyAdvancedFilters}
            currentFilters={advancedFilters}
          />

          {/* Download confirmation modal - reuse the preview modal pattern */}
          {downloadModal.isOpen && (
            <div
              className="modal-overlay"
              style={{ zIndex: 10010, alignItems: "center" }}
              onClick={() =>
                setDownloadModal({
                  isOpen: false,
                  type: null,
                  content: null,
                  filename: null,
                })
              }
            >
              <div
                className="modal-content"
                style={{ maxWidth: "720px", width: "90%" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div>
                    <div className="preview-title">Download Submissions</div>
                    <div className="preview-submitted text-sm text-gray-500">
                      You are about to download{" "}
                      {selectedRows.length > 0
                        ? `${selectedRows.length} selected submissions`
                        : `${submissions.length} submissions`}{" "}
                      as {downloadModal.type?.toUpperCase()}.
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() =>
                        setDownloadModal({
                          isOpen: false,
                          type: null,
                          content: null,
                          filename: null,
                        })
                      }
                      className="p-2 rounded text-gray-600 hover:bg-gray-100"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="modal-body" style={{ padding: 20 }}>
                  <div className="mb-4 text-sm text-gray-700">
                    Confirm to start the download. Use the preview below to
                    inspect the file content.
                  </div>

                  <div className="bg-gray-50 border rounded p-3 mb-4 max-h-56 overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap">
                      {downloadModal.content}
                    </pre>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() =>
                        setDownloadModal({
                          isOpen: false,
                          type: null,
                          content: null,
                          filename: null,
                        })
                      }
                      className="px-3 py-1 bg-white border rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => performDownloadFromModal()}
                      className="px-3 py-1 bg-blue-600 text-white rounded"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Global styles for z-index fixes */}
          <style jsx global>{`
            /* RSuite dropdown z-index fixes */
            .rs-picker-menu,
            .rs-picker-dropdown-menu,
            .rs-daterange-picker-menu,
            .rs-check-picker-menu,
            .rs-picker-select-menu,
            .rs-picker-search-bar,
            .rs-calendar,
            .rs-calendar-table,
            .rs-daterange-picker-calendar {
              z-index: 99999 !important;
            }

            .rs-picker-toggle-wrapper,
            .rs-picker-toggle {
              z-index: 1 !important;
            }

            .rs-modal-wrapper,
            .rs-modal-backdrop {
              z-index: 10001 !important;
            }

            .rs-picker-container,
            .rs-overlay-wrapper,
            .rs-picker-overlay {
              z-index: 99999 !important;
            }

            /* Date picker specific fixes */
            .rs-daterange-picker .rs-picker-menu {
              z-index: 99999 !important;
              position: fixed !important;
            }

            /* Ensure dropdowns appear above everything */
            .rs-picker-has-value .rs-picker-menu,
            .rs-picker-focused .rs-picker-menu {
              z-index: 99999 !important;
            }

            /* Fix for nested modals */
            .rs-modal .rs-picker-menu {
              z-index: 100000 !important;
            }

            /* Prevent table resize issues */
            .submissions-table {
              contain: layout style paint;
            }
          `}</style>
        </div>
      )}

      {/* Selection Actions Bar */}
      {selectedRows.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 text-white px-5 py-2 rounded-lg shadow-lg flex items-center gap-3 z-[9996] absolute bottom-6"
          style={{
            background:
              "linear-gradient(270deg, rgba(11, 41, 94, 0.85) 4.81%, rgba(29, 109, 158, 0.85) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.9)",
            boxShadow:
              "0px 2px 25px rgba(0, 0, 0, 0.25), 0px 4px 8px -1px rgba(0, 0, 0, 0.08)",
            backdropFilter: "blur(5px)",
            width: "373px",
            height: "40px",
            boxSizing: "border-box",
          }}
        >
          <button
            onClick={() => setSelectedRows([])}
            className="text-white hover:text-gray-200 transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-white/30"></div>

          <span className="font-medium text-sm">
            {selectedRows.length} Selected
          </span>

          <div className="flex items-center gap-3 ml-auto">
            <div className="relative" ref={selectionBarMenuRef}>
              <button
                className="flex items-center gap-1 text-white hover:text-gray-200 transition text-sm font-medium"
                onClick={() =>
                  setOpenMenu(
                    openMenu === "selectionBar" ? null : "selectionBar"
                  )
                }
              >
                <Download className="w-4 h-4" />
                Download
                <ChevronDown className="w-4 h-4" />
              </button>

              {openMenu === "selectionBar" && (
                <div className="absolute right-0 bottom-full mb-2 w-48 bg-white text-black rounded-md shadow-lg border border-gray-200 z-50 py-1">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      const selectedSubs = submissions.filter((s) =>
                        selectedRows.includes(s.id)
                      );
                      const csv = generateCSV(selectedSubs);
                      setDownloadModal({
                        isOpen: true,
                        type: "csv",
                        content: csv,
                        filename: `selected_submissions_${
                          new Date().toISOString().split("T")[0]
                        }.csv`,
                      });
                      setOpenMenu(null);
                    }}
                  >
                    Download CSV
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      const selectedSubs = submissions.filter((s) =>
                        selectedRows.includes(s.id)
                      );
                      const json = JSON.stringify(selectedSubs, null, 2);
                      setDownloadModal({
                        isOpen: true,
                        type: "json",
                        content: json,
                        filename: `selected_submissions_${
                          new Date().toISOString().split("T")[0]
                        }.json`,
                      });
                      setOpenMenu(null);
                    }}
                  >
                    Download JSON
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      const selectedSubs = submissions.filter((s) =>
                        selectedRows.includes(s.id)
                      );
                      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<submissions>\n${selectedSubs
                        .map(
                          (s) =>
                            `  <submission id="${s.id}">\n${Object.entries(
                              s.data || {}
                            )
                              .map(
                                ([k, v]) =>
                                  `    <field name="${k}">${String(v)
                                    .replace(/&/g, "&amp;")
                                    .replace(/</g, "&lt;")}</field>\n`
                              )
                              .join("")}  </submission>`
                        )
                        .join("\n")}\n</submissions>`;
                      setDownloadModal({
                        isOpen: true,
                        type: "xml",
                        content: xml,
                        filename: `selected_submissions_${
                          new Date().toISOString().split("T")[0]
                        }.xml`,
                      });
                      setOpenMenu(null);
                    }}
                  >
                    Download XML
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleDelete}
              className="flex items-center gap-2 text-white hover:text-gray-200 transition text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Full-screen image modal (for previewed images) for viewing image and global for access by all */}
      {imageModal.isOpen && (
        <div className="modal-overlay" onClick={() => closeImageModal()}>
          <div
            className="modal-content"
            style={{ maxWidth: "880px", width: "90%", maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => closeImageModal()}
                  className="p-2 rounded bg-white border text-gray-600 hover:bg-gray-50"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={downloadImageFromModal}
                  className="p-2 rounded bg-white border text-gray-600 hover:bg-gray-50"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div
              className="modal-body"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}
            >
              <div
                className="bg-white rounded-lg p-6 flex items-center justify-center"
                style={{ minWidth: 320, minHeight: 220 }}
              >
                <img
                  src={imageModal.src}
                  alt="Preview"
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                  style={{ background: "#f8fafc", padding: 8 }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File upload modal for viewing files and global for access by all */}
      <FileUploadModal
        isOpen={fileModal.isOpen}
        onClose={() =>
          setFileModal({ isOpen: false, files: [], fieldLabel: "" })
        }
        files={fileModal.files}
        fieldLabel={fileModal.fieldLabel}
        readOnly={true}
        onImageClick={(src) => openImageModal(src)}
      />
    </div>
  );
};

export default Submissions;
