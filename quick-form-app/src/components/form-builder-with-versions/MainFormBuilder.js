import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaRegStar } from "react-icons/fa";
import { BsStack } from "react-icons/bs";
import { IoIosUndo } from "react-icons/io";
import { Tooltip, Whisper } from "rsuite";
import useUndo from "use-undo";
import FormBuilder from "./FormBuilder";
import Sidebar from "./Sidebar";
import MainMenuBar from "./MainMenuBar";
import FieldEditor from "./FieldEditor";
import "rsuite/dist/rsuite.min.css";
import { encrypt } from "./crypto";
import MappingFields from "../form-mapping/MappingFields";
import formbuilder from "./formbuilder.css";
import { useSalesforceData } from "../Context/MetadataContext";
import ThankYouPageBuilder from "../Thankyou/TY6";
import NotificationPage from "../NotificationSettings/NotificationSettingsModal.js";
import Conditions from "../conditions/Conditions"; // Or your actual path
import { v4 as uuidv4 } from "uuid";
import AnimatedTooltip from '../create-form-wizard/AnimatedTooltip';
import SharePage from '../share-page/SharePage.js'
import Prefill from '../form-prefill/Prefill.js';
import { enhancedFormPaymentProcessor } from "./payment-fields/EnhancedFormPaymentProcessor";
import { setUserContext } from "./payment-fields/paypal/api/paypalApi";
import Submissions from "./Submissions";
import PreviewForm from "./PreviewForm";
import VersionList from "./VersionList.js";
import { motion, AnimatePresence } from "framer-motion";
import { displayName } from "react-quill";
import Loader from "../Loader.js";
const themes = [
  {
    name: "Remove Theme",
  },
  {
    name: "Classic Blue",
    color: "bg-blue-600",
    preview: "bg-gradient-to-r from-blue-500 to-blue-700",
    textColor: "text-white",
    inputBg: "bg-white",
    inputText: "text-blue-900",
    buttonBg: "bg-gradient-to-r from-blue-500 to-blue-900",
    buttonText: "text-white",
  },
  {
    name: "Sunset Pink",
    color: "bg-pink-500",
    preview: "bg-gradient-to-r from-pink-400 to-pink-600",
    textColor: "text-white",
    inputBg: "bg-pink-100",
    inputText: "text-white",
    buttonBg: "bg-gradient-to-r from-pink-400 to-pink-600",
    buttonText: "text-white",
  },
  {
    name: "Midnight Black",
    color: "bg-gray-900",
    preview: "bg-gradient-to-r from-gray-800 to-black",
    textColor: "text-white",
    inputBg: "bg-gray-800",
    inputText: "text-white",
    buttonBg: "bg-gradient-to-r from-gray-700 to-gray-800",
    buttonText: "text-white",
  },
  {
    name: "Royal Purple",
    color: "bg-purple-600",
    preview: "bg-gradient-to-r from-purple-500 to-purple-700",
    textColor: "text-white",
    inputBg: "bg-white",
    inputText: "text-purple-900",
    buttonBg: "bg-gradient-to-r from-purple-500 to-purple-700",
    buttonText: "text-white",
  },
  {
    name: "Crimson Red",
    color: "bg-red-600",
    preview: "bg-gradient-to-r from-red-500 to-red-700",
    textColor: "text-white",
    inputBg: "bg-white",
    inputText: "text-red-900",
    buttonBg: "bg-gradient-to-r from-red-500 to-red-700",
    buttonText: "text-white",
  },
  {
    name: "Sky Indigo",
    color: "bg-indigo-600",
    preview: "bg-gradient-to-r from-indigo-500 to-indigo-700",
    textColor: "text-white",
    inputBg: "bg-white",
    inputText: "text-indigo-900",
    buttonBg: "bg-gradient-to-r from-indigo-500 to-indigo-700",
    buttonText: "text-white",
  },
];

function MainFormBuilder({
  showMapping,
  showThankYou,
  showNotification,
  showCondition,
  showShare,
  showPrefill,
  showSubmission
}) {
  // const { formVersionId } = useParams();
  const location = useLocation();
  const { formVersionId: urlFormVersionId } = useParams();
  const formVersionId =
    urlFormVersionId || location.state?.formVersionId || null;
  const { refreshData, formRecords: sfFormRecords, Fieldset: fieldsets, googleData } = useSalesforceData();
  const [formId, setFormId] = useState(null);
  const [selectedVersionId, setSelectedVersionId] = useState(formVersionId);
  const [isEditable, setIsEditable] = useState(true);
  const [isFirstSave, setIsFirstSave] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [formVersions, setFormVersions] = useState([]);
  const [isNewVersion, setIsNewVersion] = useState(false);
  const [fetchFormError, setFetchFormError] = useState(null);
  const [currentFormVersion, setCurrentFormVersion] = useState(null);
  const navigate = useNavigate();
  const [showFormNamePopup, setShowFormNamePopup] = useState(!formVersionId);
  // const [formName, setFormName] = useState('');
  const [formName, setFormName] = useState(currentFormVersion?.Name || "");
  const [formNameError, setFormNameError] = useState(null);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(themes[0]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const [formRecords, setFormRecords] = useState([]);
  const [publishLink, setPublishLink] = useState('');
  const [submissionStats, setSubmissionStats] = useState({
    totalSubmissions: 0,
    recentSubmissions: 0,
    lastSubmissionDate: null,
  });

  const [showPreview, setShowPreview] = useState(false);
  const [previewFormData, setPreviewFormData] = useState({ formVersion: null, formFields: [] });
  const [previewStep, setPreviewStep] = useState(0); // 0: builder, 1: fade mainmenubar, 2: fade sidebar, 3: show preview
  const [formConditions, setFormConditions] = useState([]);
  const [prefills, setPrefills] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingVersionId, setPendingVersionId] = useState(null);

  const [fieldsState, { set: setFields, undo, redo, canUndo, canRedo }] =
    useUndo([]);


  const [thankYouPayload, setThankYouPayload] = useState({
    Form_Version__c: formVersionId,
    Heading__c: '',
    Sub_Heading__c: '',
    Image_Url__c: '',
    Actions__c: '',
    Description__c: '',
    Body__c: '',
  });
  const [thankYouRecordId, setThankYouRecordId] = useState(null);


  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 25 }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.15 }
    }
  };

  const [saveMappingCallback, setSaveMappingCallback] = useState(null);

  // Function to register the save callback
  const registerSaveCallback = useCallback((callback) => {
    console.log("Save callback registered");
    setSaveMappingCallback(() => callback);
  }, []);

  // Save Workflow button handler
  const handleSaveWorkflow = () => {
    console.log("Save Workflow clicked, callback:", saveMappingCallback);
    if (saveMappingCallback && typeof saveMappingCallback === 'function') {
      saveMappingCallback();
    } else {
      console.error("Save callback not registered or not a function");
      alert("Save functionality not ready yet. Please try again in a moment.");
    }
  };

  // Clean up callback when component unmounts or showMapping changes
  useEffect(() => {
    if (!showMapping) {
      setSaveMappingCallback(null);
    }
  }, [showMapping]);

  const [theme, setTheme] = useState({
    backgroundColor: "#ffffff",
    primaryColor: "#028ab0",
    secondaryColor: "#ffbb1b",
    textColor: "#0b0a0a",
    secondaryTextColor: "#5f6165",
  });

  const [showSidebar, setShowSidebar] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [selectedSectionSide, setSelectedSectionSide] = useState(null);
  const [selectedFooter, setSelectedFooter] = useState(null);
  const [clipboard, setClipboard] = useState({ field: null, operation: null });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loadingText, setLoadingText] = useState('');
  const fields = fieldsState.present;

  const [footerConfigs, setFooterConfigs] = useState({});


  const fetchAccessToken = async (userId, instanceUrl) => {
    try {
      const response = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          instanceUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch access token");
      }
      return data.access_token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      return null;
    }
  };

  const handlePreview = () => {
    setPreviewStep(1);
    setTimeout(() => {
      const { formVersion, formFields } = prepareFormData();
      setPreviewFormData({ formVersion, formFields });
      setShowPreview(true);
      setPreviewStep(3);
    }, 600);
  };

  const handleBackToBuilder = () => {
    // Find first draft version
    const draftVersion = formVersions.find(v => v.Stage__c === "Draft");
    if (draftVersion) {
      setSelectedVersionId(draftVersion.Id);
      navigate(`/form-builder/${draftVersion.Id}`);
      fetchFormData(
        sessionStorage.getItem("userId"),
        sessionStorage.getItem("instanceUrl"),
        draftVersion.Id
      );
      setShowPreview(false);
      setPreviewStep(2);
      setTimeout(() => setPreviewStep(1), 400);
      setTimeout(() => setPreviewStep(0), 800);
    } else {
      // fallback to current logic if no draft version
      setShowPreview(false);
      setPreviewStep(2);
      setTimeout(() => setPreviewStep(1), 400);
      setTimeout(() => setPreviewStep(0), 800);
    }
  };

  const handlePublish = async () => {
    try {
      setIsLoadingForm(true);
      setLoadingText('Publishing Form');
      setHasChanges(false);
      const userId = sessionStorage.getItem("userId");
      const instanceUrl = sessionStorage.getItem("instanceUrl");
      const token = await fetchAccessToken(userId, instanceUrl);
      const rawString = `${userId}$${formId}`;
      const encryptedLinkId = encrypt(rawString);
      const publishLink = `https://d2bri1qui9cr5s.cloudfront.net/public-form/${encryptedLinkId}`;

      const { formVersion, formFields } = prepareFormData(false);
      formVersion.Stage__c = "Publish";
      formVersion.Id = selectedVersionId;
      formVersion.Form__c = formId;
      const formUpdate = {
        Id: formId,
        Publish_Link__c: publishLink,
      };
      const response = await fetch(process.env.REACT_APP_SAVE_FORM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          instanceUrl,
          formData: { formVersion, formFields },
          formUpdate,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to publish form");
      }

      await fetchFormData(userId, instanceUrl);
    } catch (error) {
      console.error("Error publishing form:", error);
      setFetchFormError(error.message || "Failed to publish form");
    } finally {
      setIsLoadingForm(false);
    }
  };

  function updatePayloadFromContentElements(content, elements) {
    // Compose JSON strings for relevant fields:
    const headingObj = elements.find(e => e.id === 'title') || {};
    const heading = JSON.stringify({ ...headingObj, text: content.title });

    const subHeadingObj = elements.find(e => e.id === 'subtitle') || {};
    const subHeading = JSON.stringify({ ...subHeadingObj, text: content.subtitle });

    const actionObj = elements.find(e => e.id === 'button') || {};
    const action = JSON.stringify({ ...actionObj, buttonText: content.buttonText, buttonLink: content.buttonUrl });

    const imagesObj = elements.find(e => e.id === 'image') || {};
    const images = content.images.length > 0 ? content.images : [{ id: 'default', url: '', name: '' }];
    const imagePayload = JSON.stringify({ ...imagesObj, images });

    // Compose Body with layout referencing current elements and content parts
    const body = JSON.stringify({
      layout: elements,
      socialLinks: content.socialLinks,
      customTexts: content.customTexts,
    });
    const updatedPayload = {
      // preserve relevant ids & meta if you keep them, else map as needed
      Heading__c: heading,
      Sub_Heading__c: subHeading,
      Actions__c: action,
      Image_Url__c: imagePayload,
      Body__c: body,
      Description__c: content.description || '',
      Form_Version__c: formVersionId
    };
    console.log('body', updatedPayload)

    setThankYouPayload(updatedPayload);
  }

  // Provide a function to receive payload update from ThankYou editor
  const onThankYouPayloadChange = (payload) => {
    setThankYouPayload(payload);
  };
  async function handleThankYouSave({
    instanceUrl,
    userId,
    ThankYouData,
    token,
  }) {
    if (!showThankYou) {
      // Don't send if flag is false
      console.log("skipping...");
      return { skip: true, message: "showThankYou is false, no request sent." };
    }
    if (!ThankYouData) {
      console.log(thankYouPayload)
      return { skip: false, message: "thankyou data is false, no request sent." };
    }
    setIsLoadingForm(true)
    const invokeUrl =
      "https://l8rbccfzz8.execute-api.us-east-1.amazonaws.com/savedata/";
    const isPatch = !!thankYouRecordId;
    // If PATCH, add Id to payload
    const payload = {
      instanceUrl,
      userId,
      ThankYouData: {
        ...ThankYouData,
        ...(isPatch && { Id: thankYouRecordId }),
      },
    };
    console.log("ty paylaod", payload);
    try {
      const response = await fetch(invokeUrl, {
        method: isPatch ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Responsefrom TY", data);
      setThankYouRecordId(data?.Id)
      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Unknown error from API"
        );
      }

      return {
        success: true,
        action: isPatch ? "PATCH" : "POST",
        data,
      };
    } catch (error) {
      // Proper error handling/logging
      console.log("error");
      return {
        success: false,
        error: error.message || error,
      };
    } finally {
      setIsLoadingForm(false);
    }
  }

  const sendNotificationData = async (payload) => {
    console.log(payload, "payload");
    try {
      const userId = sessionStorage.getItem("userId");
      const instanceUrl = sessionStorage.getItem("instanceUrl");
      if (!userId || !instanceUrl)
        throw new Error("Missing userId or instanceUrl.");
      const token = await fetchAccessToken(userId, instanceUrl);
      if (!token) throw new Error("Failed to obtain access token.");
      const response = await fetch(
        "https://kf17mvi36k.execute-api.us-east-1.amazonaws.com/notify",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notificationData: { Form__c: formId, ...payload },
            instanceUrl,
            userId,
          }),
        }
      );
      const res = await response.json();
      console.log("Response from lambda ==> ", res);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      refreshData();
    } catch (error) {
      console.error("There was a problem with the fetch operation:", error);
    }
  };
  const fetchFormData = async (userId, instanceUrl) => {
    try {
      setIsLoadingForm(true);
      setLoadingText('Loading Form Data');
      setFetchFormError(null);

      const cleanedInstanceUrl = instanceUrl.replace(/https?:\/\//, "");
      const response = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          instanceUrl: cleanedInstanceUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch metadata");
      }

      let formRecords = [];
      if (data.FormRecords) {
        try {
          formRecords = JSON.parse(data.FormRecords);
          setFormRecords(formRecords);
        } catch (e) {
          console.warn("Failed to parse FormRecords:", e);
        }
      }

      let formVersion = null;
      for (const form of formRecords) {
        formVersion = form.FormVersions.find(
          (version) =>
            version.Source === "Form_Version__c" && version.Id === formVersionId
        );
        if (formVersion) {
          formVersion.Form__c = form.Id;
          setFormVersions(form.FormVersions);
          setFormId(form.Id);
          setFormName(formVersion.Name);
          setPublishLink(form.Publish_Link__c);
          break;
        }
      }

      if (!formVersion) {
        throw new Error(`Form version with Id ${formVersionId} not found`);
      }

      setIsEditable(formVersion.Stage__c === "Draft");
      setCurrentFormVersion(formVersion);
      const formFields = formVersion.Fields || [];

      // Process footer fields into footerConfigs
      const footerConfigsFromDB = {};

      formFields.forEach((field) => {
        if (field.Field_Type__c === "footer") {
          try {
            const properties = JSON.parse(field.Properties__c || "{}");
            if (properties.pageIndex !== undefined) {
              footerConfigsFromDB[properties.pageIndex] = properties.subFields || {};
            }
          } catch (e) {
            console.warn(`Failed to parse footer properties for field ${field.Unique_Key__c}:`, e);
          }
        }
      });

      setFooterConfigs(footerConfigsFromDB);

      const pages = {};
      formFields.forEach((field) => {
        if (field.Field_Type__c === "footer") return;

        const pageNumber = field.Page_Number__c || 1;
        if (!pages[pageNumber]) {
          pages[pageNumber] = [];
        }
        let properties;
        try {
          properties = JSON.parse(field.Properties__c || "{}");
        } catch (e) {
          console.warn(
            `Failed to parse Properties__c for field ${field.Unique_Key__c}:`,
            e
          );
          properties = {};
        }
        pages[pageNumber].push({
          ...properties,
          id: field.Unique_Key__c,
          validation:
            properties.validation || getDefaultValidation(field.Field_Type__c),
          subFields:
            properties.subFields || getDefaultSubFields(field.Field_Type__c),
          isHidden: field?.isHidden__c || false,
          defaultValue: field?.Default_Value__c || null,
          sectionSide: properties?.sectionSide || null
        });
      });

      Object.keys(pages).forEach((pageNum) => {
        pages[pageNum].sort(
          (a, b) => (a.Order_Number__c || 0) - (b.Order_Number__c || 0)
        );
      });

      const reconstructedFields = [];
      Object.keys(pages)
        .sort((a, b) => a - b)
        .forEach((pageNum, index) => {
          const fieldsInPage = pages[pageNum];
          reconstructedFields.push(...fieldsInPage);
          if (index < Object.keys(pages).length - 1) {
            reconstructedFields.push({
              id: `pagebreak-${pageNum}`,
              type: "pagebreak",
            });
          }
        });

      setFields(reconstructedFields);
    } catch (error) {
      console.error("Error fetching form data:", error);
      setFetchFormError(error.message || "Failed to load form data");
      navigate("/home");
    } finally {
      setIsLoadingForm(false);
    }
  };

  // Add a helper function to check if the current version is editable
  const isEditableVersion = () => {
    return currentFormVersion?.Stage__c === "Draft";
  };

  // Modify the handleVersionChange function
  const handleVersionChange = (e) => {
    const newVersionId = e.target.value;
    const selectedVersion = formVersions.find(v => v.Id === newVersionId);
    setSelectedVersionId(newVersionId);

    const userId = sessionStorage.getItem("userId");
    const instanceUrl = sessionStorage.getItem("instanceUrl");

    if (userId && instanceUrl && selectedVersion) {
      navigate(`/form-builder/${newVersionId}`);
      fetchFormData(userId, instanceUrl, newVersionId);
    }
  };


  useEffect(() => {
    const userId = sessionStorage.getItem("userId");
    const instanceUrl = sessionStorage.getItem("instanceUrl");
    if (!userId || !instanceUrl) {
      setFetchFormError("Missing userId or instanceUrl. Please log in.");
      return;
    }
    if (formVersionId) {
      setSelectedVersionId(formVersionId);
      fetchFormData(userId, instanceUrl, formVersionId);
    } else {
      setFields([]);
    }
  }, [formVersionId]);

  useEffect(() => {
    if (currentFormVersion) {
      const originalFields = currentFormVersion.Fields || [];
      const currentFields = prepareFormData().formFields;
      const hasFieldChanges =
        JSON.stringify(originalFields) !== JSON.stringify(currentFields);
      setHasChanges(hasFieldChanges);
    }
  }, [fields]);


  useEffect(() => {
    console.log('currentFormVersion changed', currentFormVersion);

    if (currentFormVersion && currentFormVersion.Conditions) {
      // Parse conditions if needed
      const parsedConditions = currentFormVersion.Conditions.map(c =>
        c.Condition_Data__c
          ? (typeof c.Condition_Data__c === 'string'
            ? JSON.parse(c.Condition_Data__c)
            : c.Condition_Data__c)
          : c
      );
      setFormConditions(parsedConditions);
    }
    if (currentFormVersion && currentFormVersion.Prefills) {
      // Parse Prefill array from currentFormVersion Prefills if available
      if (currentFormVersion.Prefills && Array.isArray(currentFormVersion.Prefills)) {
        const parsedPrefills = currentFormVersion.Prefills.map(p => {
          let parsedData = {};
          try {
            parsedData = typeof p.Prefill_Data__c === 'string'
              ? JSON.parse(p.Prefill_Data__c)
              : p.Prefill_Data__c || {};
          } catch (e) {
            console.warn('Invalid Prefill_Data__c JSON', e);
          }
          return {
            Id: p.Id,
            Order__c: p.Order__c || 0,
            ...parsedData
          };
        });
        setPrefills(parsedPrefills);
      }
    }
  }, [currentFormVersion]);

  const updateSubmissionStats = (submissions) => {
    if (!submissions || submissions.length === 0) {
      setSubmissionStats({
        totalSubmissions: 0,
        recentSubmissions: 0,
        lastSubmissionDate: null,
      });
      return;
    }

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentSubmissions = submissions.filter(
      (sub) => new Date(sub.submissionDate) >= last24Hours
    ).length;

    const lastSubmissionDate =
      submissions.length > 0
        ? new Date(
          Math.max(...submissions.map((sub) => new Date(sub.submissionDate)))
        )
        : null;

    setSubmissionStats({
      totalSubmissions: submissions.length,
      recentSubmissions,
      lastSubmissionDate,
    });
  };

  const prepareFormData = (isNewForm = false) => {
    const pages = [];
    let currentPage = [];
    let pageNumber = 1;
    fields.forEach((field) => {
      if (field.type === "pagebreak") {
        pages.push({ fields: currentPage, pageNumber });
        pageNumber++;
        currentPage = [];
      } else {
        currentPage.push(field);
      }
    });
    if (currentPage.length > 0 || pages.length === 0) {
      pages.push({ fields: currentPage, pageNumber });
    }

    // Create footer fields from footerConfigs
    const footerFields = Object.entries(footerConfigs).map(([pageIndexStr, config]) => {
      const pageIndex = parseInt(pageIndexStr);
      const pageNumber = pageIndex + 1; // Convert 0-indexed to 1-indexed

      const footerId = `footer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const footerProperties = {
        id: footerId,
        type: "footer",
        label: "Footer",
        alignment: "center",
        pageIndex: pageIndex,
        subFields: config,
        isHidden: false
      };

      return {
        Name: "Footer",
        Field_Type__c: "footer",
        Page_Number__c: pageNumber,
        Order_Number__c: 999, // Place at the end of the page
        Properties__c: JSON.stringify(footerProperties),
        Unique_Key__c: footerId,
        isHidden__c: false,
        Default_Value__c: null
      };
    });

    const formVersion = {
      Name: currentFormVersion?.Name || formName || "Contact Form",
      Description__c: "",
      Stage__c: "Draft",
      Publish_Link__c: "",
    };

    if (!isNewForm && currentFormVersion?.Form__c) {
      formVersion.Form__c = currentFormVersion.Form__c;
    }
    if (isNewForm) {
      formVersion.Version__c = "1";
    } else if (isFirstSave && formVersionId) {
      formVersion.Id = formVersionId;
      formVersion.Version__c = "1";
    } else if (
      formVersionId &&
      currentFormVersion &&
      hasChanges &&
      !formVersion.Stage__c === "Draft"
    ) {
      const currentVersionNum = parseFloat(currentFormVersion.Version__c) || 1;
      formVersion.Version__c = (currentVersionNum + 1).toFixed(0);
    } else if (formVersionId) {
      formVersion.Id = formVersionId;
      formVersion.Version__c = currentFormVersion?.Version__c || "1";
    } else {
      formVersion.Version__c = "1";
    }
    const formFields = pages.flatMap((page) =>
      page.fields.map((field, index) => {
        // Handle section fields
        if (field.type === "section") {
          const sectionProperties = {
            ...field,
            subFields: {
              leftField: field.subFields?.leftField
                ? {
                  ...field.subFields.leftField,
                  label:
                    field.subFields.leftField.label ||
                    field.subFields.leftField.type?.charAt(0).toUpperCase() +
                    field.subFields.leftField.type?.slice(1) ||
                    "Left Field",
                }
                : null,
              rightField: field.subFields?.rightField
                ? {
                  ...field.subFields.rightField,
                  label:
                    field.subFields.rightField.label ||
                    field.subFields.rightField.type?.charAt(0).toUpperCase() +
                    field.subFields.rightField.type?.slice(1) ||
                    "Right Field",
                }
                : null,
            },
          };

          return {
            Name: field.label || "Section",
            Field_Type__c: "section",
            Page_Number__c: page.pageNumber,
            Order_Number__c: index + 1,
            Properties__c: JSON.stringify(sectionProperties),
            Unique_Key__c: field.id,
            isHidden__c: field.isHidden,
            Default_Value__c: field.defaultValue
          };
        }

        // Clean subFields to ensure no double-stringification
        const cleanSubFields =
          field.subFields || getDefaultSubFields(field.type) || {};

        // For payment fields, ensure nested objects are properly handled
        if (
          field.type === "paypal_payment" &&
          cleanSubFields.subscriptionConfig
        ) {
          // Ensure subscriptionConfig is an object, not a string
          if (typeof cleanSubFields.subscriptionConfig === "string") {
            try {
              cleanSubFields.subscriptionConfig = JSON.parse(
                cleanSubFields.subscriptionConfig
              );
            } catch (e) {
              console.warn("Failed to parse subscriptionConfig:", e);
            }
          }
        }

        // Handle regular fields
        const properties = {
          ...field,
          label:
            field.label ||
            field.type?.charAt(0).toUpperCase() + field.type?.slice(1) ||
            "Field",
          subFields: field.subFields || getDefaultSubFields(field.type) || {},
          isHidden: field.isHidden || false, //  isHidden
          defaultValue: field.defaultValue || null, //  defaultValue
        };

        console.log(JSON.stringify(properties, null, 2), "properties");

        return {
          Name: properties.label,
          Field_Type__c: field.type,
          Page_Number__c: page.pageNumber,
          Order_Number__c: index + 1,
          Properties__c: JSON.stringify(properties),
          Unique_Key__c: field.id,
          isHidden__c: field.isHidden
        };
      })
    );


    return { formVersion, formFields: [...formFields, ...footerFields] };
  };

  const saveFormToSalesforce = async () => {
    const userId = sessionStorage.getItem("userId");
    const instanceUrl = sessionStorage.getItem("instanceUrl");
    setIsLoadingForm(true);
    !showThankYou ? setLoadingText('Saving Form') : setLoadingText('Saving Thank You');
    const token = await fetchAccessToken(userId, instanceUrl);
    const result = await handleThankYouSave({
      instanceUrl,
      userId,
      ThankYouData: thankYouPayload,
      token,
    });
    if (result.success) {
      console.log("Saved to Salesforce & DynamoDB!", result.data);
      return;
    }
    if (!isEditable) return;
    setIsSaving(true);
    setSaveError(null);
    try {

      // Step 1: Mock validation (set to true by default for now)
      const mockValidation = true;
      // Step 2: Validate payment fields using enhanced processor
      console.log("🔍 Validating payment fields with enhanced processor...");
      const paymentValidation =
        await enhancedFormPaymentProcessor.validateFormPayments(fields, formId);

      if (!paymentValidation.isValid) {
        setIsLoadingForm(false);
        const errorMessage = `Payment validation failed:\n${paymentValidation.errors.join(
          "\n"
        )}`;
        throw new Error(errorMessage);
      }

      if (paymentValidation.warnings.length > 0) {
        setIsLoadingForm(false);
        const warningMessage = `Payment warnings:\n${paymentValidation.warnings.join(
          "\n"
        )}\n\nDo you want to continue?`;
        if (!window.confirm(warningMessage)) {
          return;
        }
      }

      // Step 3: Process payment fields (create/update subscriptions) using enhanced processor
      console.log("💳 Processing payment fields with enhanced processor...");
      const paymentProcessing =
        await enhancedFormPaymentProcessor.processFormPayments(
          fields,
          formId,
          selectedVersionId
        );

      if (!paymentProcessing.success) {
        setIsLoadingForm(false);
        const errorMessage = `Payment processing failed:\n${paymentProcessing.errors
          .map((e) => `Field ${e.fieldId}: ${e.error}`)
          .join("\n")}`;
        throw new Error(errorMessage);
      }

      // Log payment processing results
      if (paymentProcessing.processedFields.length > 0) {
        console.log(
          "✅ Enhanced payment processing results:",
          paymentProcessing.processedFields
        );
      }

      // Clear previousMerchantId from fields after successful processing
      const updatedFields = fields.map((field) => {
        if (
          field.type === "paypal_payment" &&
          field.subFields?.previousMerchantId
        ) {
          return {
            ...field,
            subFields: {
              ...field.subFields,
              previousMerchantId: undefined,
            },
          };
        }
        return field;
      });

      if (JSON.stringify(updatedFields) !== JSON.stringify(fields)) {
        console.log("🧹 Clearing previousMerchantId from processed fields");
        setFields(updatedFields);
      }

      // Step 4: Continue with normal form save process
      const { formVersion, formFields } = prepareFormData();

      const response = await fetch(process.env.REACT_APP_SAVE_FORM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          instanceUrl: instanceUrl.replace(/https?:\/\//, ""),
          formData: { formVersion, formFields },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(JSON.stringify(data) || "Failed to save form.");
      }
      // Success message with payment processing info
      let successMessage = "Form saved successfully!";
      setIsLoadingForm(false);
      if (paymentProcessing.processedFields.length > 0) {
        const processedCount = paymentProcessing.processedFields.length;
        successMessage += `\n\n${processedCount} payment field(s) processed:`;
        paymentProcessing.processedFields.forEach((field) => {
          successMessage += `\n- ${field.action} for field ${field.fieldId}`;
        });
      }

      await refreshData();
      if (hasChanges || !formVersion.Id) {
        const newFormVersionId = data.formVersionId;
        setCurrentFormVersion({
          ...formVersion,
          Id: newFormVersionId,
          Fields: formFields,
        });
        setSelectedVersionId(newFormVersionId);
        navigate(`/form-builder/${newFormVersionId}`);
        setHasChanges(false);
      } else {
        setCurrentFormVersion({
          ...formVersion,
          Id: formVersionId,
          Fields: formFields,
        });
      }
      setIsFirstSave(false);
    } catch (error) {
      console.error("Error saving form:", error);
      setSaveError(error.message || "Failed to save form.");
    } finally {
      setIsSaving(false);
    }
  };

  const getDefaultValidation = (fieldType) => {
    const field = fieldType.toLowerCase().replace(/\s+/g, "");
    const validations = {
      fullname: {
        pattern: "^[a-zA-Z\\s'-]+$",
        description: "Only letters, spaces, hyphens, and apostrophes allowed.",
      },
      phonenumber: {
        pattern: "^\\+?[0-9]{7,15}$",
        description:
          "Must be a valid phone number (7-15 digits, optional '+').",
      },
      email: {
        pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
        description: "Must be a valid email (e.g., user@example.com).",
      },
      address: {
        pattern: "^[\\w\\s\\-\\.,#]+$",
        description:
          "Alphanumeric, spaces, hyphens, commas, and periods allowed.",
      },
      fileupload: {
        pattern: ".*\\.(jpg|jpeg|png|gif|pdf|doc|docx)$",
        description: "Only JPG, PNG, GIF, PDF, DOC, or DOCX files allowed.",
      },
      signature: {
        pattern: "^[\\w\\s\\-\\.,#]+$",
        description: "Must be a valid signature input.",
      },
      termsofservice: {
        pattern: "^true$",
        description: "Must be accepted (checked).",
      },
      link: {
        pattern: "^(https?:\\/\\/)?[\\w.-]+\\.[a-z]{2,}(\\/\\S*)?$",
        description: "Must be a valid URL (e.g., https://example.com).",
      },
      date: {
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description: "Must be in YYYY-MM-DD format.",
      },
      datetime: {
        pattern: "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$",
        description: "Must be in YYYY-MM-DD HH:MM format.",
      },
      time: {
        pattern: "^\\d{2}:\\d{2}$",
        description: "Must be in HH:MM format.",
      },
      emojirating: {
        pattern: "^[1-5]$",
        description: "Rating must be between 1 and 5.",
      },
      starrating: {
        pattern: "^[1-5]$",
        description: "Rating must be between 1 and 5.",
      },
      scalerating: {
        pattern: "^[0-5]$",
        description: "Must be a rating between 0 and 5.",
      },
      shorttext: {
        pattern: "^.{1,255}$",
        description: "Maximum 255 characters allowed.",
      },
      longtext: {
        pattern: "^.{1,1000}$",
        description: "Maximum 1000 characters allowed.",
      },
      number: {
        pattern: "^[0-9]+$",
        description: "Only numbers allowed.",
      },
      checkbox: {
        pattern: "^true|false$",
        description: "Must be checked (true) or unchecked (false).",
      },
      displaytext: {
        pattern: ".*",
        description: "Display-only text (no validation needed).",
      },
      price: {
        pattern: "^\\d+(\\.\\d{1,2})?$",
        description: "Must be a valid price (e.g., 10 or 10.99).",
      },
      radiobutton: {
        pattern: ".*",
        description: "Must select one of the available options.",
      },
      togglebutton: {
        pattern: "^true|false$",
        description: "Must be toggled (true) or untoggled (false).",
      },
      dropdownelements: {
        pattern: ".*",
        description: "Must select one of the available options.",
      },
      imageuploader: {
        pattern: ".*\\.(jpg|jpeg|png|gif|pdf|doc|docx)$",
        description:
          "Only images (JPG, PNG, GIF), PDF, or Word documents allowed.",
      },
      section: {
        pattern: ".*",
        description: "Display-only section (no validation needed).",
      },
      paypal_payment: {
        pattern: ".*",
        description: "PayPal payment field validation.",
      },
      default: {
        pattern: ".*",
        description: "No specific validation rules.",
      },
    };
    return validations[field] || validations["default"];
  };

  const getDefaultSubFields = (fieldType) => {
    const field = fieldType.toLowerCase().replace(/\s+/g, "");
    const subFields = {
      fullname: {
        salutation: {
          enabled: false,
          options: ["Mr.", "Mrs.", "Ms.", "Dr."],
          value: "",
          placeholder: "Select Salutation",
          label: "Salutation",
        },
        firstName: {
          value: "",
          placeholder: "First Name",
          label: "First Name",
        },
        lastName: {
          value: "",
          placeholder: "Last Name",
          label: "Last Name",
        },
      },
      address: {
        street: {
          visiblesubFields: true,
          label: "Street Address",
          value: "",
          placeholder: "Enter street",
        },
        city: {
          visible: true,
          label: "City",
          value: "",
          placeholder: "Enter city",
        },
        state: {
          visible: true,
          label: "State",
          value: "",
          placeholder: "Enter state",
        },
        country: {
          visible: true,
          label: "Country",
          value: "",
          placeholder: "Enter country",
        },
        postal: {
          visible: true,
          label: "Postal Code",
          value: "",
          placeholder: "Enter postal code",
        },
      },
      section: {
        leftField: null,
        rightField: null,
      },
      phone: {
        countryCode: {
          enabled: true,
          value: "US",
          options: [],
          label: "Country Code",
        },
        phoneNumber: {
          value: "",
          placeholder: "Enter phone number",
          phoneMask: "(999) 999-9999",
          label: "Phone Number",
        },
      },
      paypal_payment: {
        fieldLabel: "Payment Information",
        gateway: "paypal",
        merchantId: null,
        paymentType: "one_time",
        amount: {
          type: "fixed",
          value: 0,
          currency: "USD",
          minAmount: null,
          maxAmount: null,
          suggestions: [],
          allowCustomAmount: true,
          products: [],
        },
        paymentMethods: {
          paypal: true,
          cards: true,
          venmo: false,
          googlePay: false,
          payLater: false,
        },
        behavior: {
          required: true,
          collectBillingAddress: false,
          collectShippingAddress: false,
        },
      },
      default: {},
    };
    return subFields[field] || subFields["default"];
  };

  const handleDrop = (
    fieldType,
    pageIndex,
    dropIndex,
    fieldId = null,
    sectionId = null,
    sectionSide = null,
    newField = null
  ) => {
    // Check if trying to add a payment field when one already exists
    if (fieldType === "paypal_payment") {
      const hasPaymentField = fields.some(
        (field) => field.type === "paypal_payment"
      );
      if (hasPaymentField) {
        alert(
          "Only one payment field is allowed per form. Please remove the existing payment field first."
        );
        return;
      }
    }
    setHasChanges(true);
    let updatedFields = [...fields];

    const pages = [];
    let currentPageFields = [];
    updatedFields.forEach((field) => {
      if (field.type === "pagebreak") {
        pages.push({ fields: currentPageFields });
        currentPageFields = [];
      } else {
        currentPageFields.push(field);
      }
    });
    pages.push({ fields: currentPageFields });

    if (pageIndex >= pages.length) {
      pages.push({ fields: [] });
    }

    const targetPage = pages[pageIndex];

    const insertIndex =
      dropIndex !== null && dropIndex !== undefined
        ? dropIndex + 1
        : targetPage.fields.length;

    if (newField && fieldId) {
      pages.forEach((page) => {
        page.fields = page.fields.filter((f) => f.id !== fieldId);
      });
      targetPage.fields.splice(insertIndex, 0, { ...newField, isCut: false });
    } else if (newField && !fieldId) {
      targetPage.fields.splice(insertIndex, 0, ...newField);
    } else if (fieldType) {
      const newFieldId = `field-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const defaultValidation = getDefaultValidation(fieldType);
      const defaultSubFields = getDefaultSubFields(fieldType);
      // Add default options for dropdown
      const defaultOptions =
        fieldType === "dropdown"
          ? ["Option 1", "Option 2", "Option 3"]
          : undefined;
      const newFieldObj = {
        id: newFieldId,
        type: fieldType,
        sectionId: sectionId || null,
        sectionSide: sectionSide || null,
        validation: defaultValidation,
        subFields: defaultSubFields,
        options: defaultOptions, // Add default options for dropdown
      };

      targetPage.fields.splice(insertIndex, 0, newFieldObj);
    }

    const flattenedFields = [];
    pages.forEach((page, idx) => {
      flattenedFields.push(...page.fields);
      if (idx < pages.length - 1) {
        flattenedFields.push({ id: `pagebreak-${idx}`, type: "pagebreak" });
      }
    });

    setFields(flattenedFields);
    setSelectedFieldId(null)
    setSelectedSectionSide(null);
  };

  const handleAddFieldsFromFieldset = (newFields) => {
    setFields([...fields, ...newFields]);
  };

  const handleReorder = (fromIndex, toIndex, pageIndex) => {
    setHasChanges(true);
    const pages = [];
    let currentPage = [];
    fields.forEach((field) => {
      if (field.type === "pagebreak") {
        pages.push({ fields: currentPage });
        currentPage = [];
      } else {
        currentPage.push(field);
      }
    });
    if (currentPage.length > 0 || pages.length === 0) {
      pages.push({ fields: currentPage });
    }

    const targetPageFields = [...pages[pageIndex].fields];
    const [movedField] = targetPageFields.splice(fromIndex, 1);
    targetPageFields.splice(toIndex, 0, movedField);
    pages[pageIndex].fields = targetPageFields;

    const flattenedFields = pages.flatMap((page, idx) => [
      ...page.fields,
      ...(idx < pages.length - 1
        ? [{ id: `pagebreak-${idx}`, type: "pagebreak" }]
        : []),
    ]);

    setFields(flattenedFields);
  };

  const handleUpdateField = (fieldId, updates) => {
    setHasChanges(true);
    const updatedFields = fields.map((field) => {
      if (field.id === fieldId) {
        return { ...field, ...updates };
      }
      if (field.type === "section") {
        // Updated to check subFields instead of direct leftField/rightField
        const updatedSubFields = { ...field.subFields };
        let hasUpdate = false;

        if (field.subFields?.leftField?.id === fieldId) {
          updatedSubFields.leftField = {
            ...field.subFields.leftField,
            ...updates,
          };
          hasUpdate = true;
        }
        if (field.subFields?.rightField?.id === fieldId) {
          updatedSubFields.rightField = {
            ...field.subFields.rightField,
            ...updates,
          };
          hasUpdate = true;
        }

        if (hasUpdate) {
          return { ...field, subFields: updatedSubFields };
        }
      }
      return field;
    });
    setFields(updatedFields);
  };

  const handleDeleteField = (fieldId, showSidebarAfter = true) => {
    setHasChanges(true);
    const updatedFields = fields
      .map((field) => {
        if (field.type === "section") {
          const updatedSubFields = { ...field.subFields };
          if (updatedSubFields.leftField?.id === fieldId) {
            updatedSubFields.leftField = null;
            return { ...field, subFields: updatedSubFields };
          }
          if (updatedSubFields.rightField?.id === fieldId) {
            updatedSubFields.rightField = null;
            return { ...field, subFields: updatedSubFields };
          }
        }
        return field;
      })
      .filter((field) => field.id !== fieldId);
    setFields(updatedFields);
    if (showSidebarAfter) {
      setSelectedFieldId(null);
      setSelectedSectionSide(null);
      setSelectedFooter(null);
      setShowSidebar(true);
    }
  };

  const handleDeletePage = (pageIndex) => {
    setHasChanges(true);
    const pages = [];
    let currentPage = [];

    fields.forEach((field) => {
      if (field.type === "pagebreak") {
        pages.push({ fields: currentPage });
        currentPage = [];
      } else {
        currentPage.push(field);
      }
    });
    // Push last page (even if empty)
    pages.push({ fields: currentPage });

    if (pages.length <= 1) return;

    pages.splice(pageIndex, 1);
    const flattenedFields = pages.flatMap((page, idx) => [
      ...page.fields,
      ...(idx < pages.length - 1
        ? [{ id: `pagebreak-${idx}`, type: "pagebreak" }]
        : []),
    ]);

    // Step 5: Set updated fields
    setFields(flattenedFields);
  };

  const handleAddPage = (afterPageIndex = null) => {
    setHasChanges(true);

    // Break existing fields into pages
    const pages = [];
    let currentPage = [];
    fields.forEach((field) => {
      if (field?.type === "pagebreak") {
        pages.push({ fields: currentPage });
        currentPage = [];
      } else {
        currentPage.push(field);
      }
    });
    if (currentPage.length > 0 || pages.length === 0) {
      pages.push({ fields: currentPage });
    }

    // Determine where to insert the new page
    const insertAfterIndex =
      afterPageIndex !== null ? afterPageIndex : pages.length - 1;
    const newPageIndex = insertAfterIndex + 1;

    // Create the new pagebreak field
    const newField = { id: `pagebreak-${Date.now()}`, type: "pagebreak" };

    // If adding after the last page, just append
    if (insertAfterIndex >= pages.length - 1) {
      const updatedFields = [...fields, newField];
      setFields(updatedFields);
      // Just highlight the new page without scrolling
      setCurrentPageIndex(pages.length);
    } else {
      // Insert pagebreak at the correct position
      // Find the position in fields array where we need to insert
      let fieldsBeforeNewPage = [];
      let fieldsAfterNewPage = [];
      let pageCount = 0;

      for (let i = 0; i < fields.length; i++) {
        if (pageCount <= insertAfterIndex) {
          fieldsBeforeNewPage.push(fields[i]);
          if (fields[i].type === "pagebreak") {
            pageCount++;
          }
        } else {
          fieldsAfterNewPage.push(fields[i]);
        }
      }

      const updatedFields = [
        ...fieldsBeforeNewPage,
        newField,
        ...fieldsAfterNewPage,
      ];
      setFields(updatedFields);
      // Just highlight the new page without scrolling
      setCurrentPageIndex(newPageIndex);
    }
  };

  const handleMovePageUp = (pageIndex) => {
    if (pageIndex <= 0) return;
    setHasChanges(true);

    // Split fields into pages, preserving empty pages
    const pages = [];
    let currentPage = [];
    fields.forEach((field) => {
      if (field?.type === "pagebreak") {
        pages.push({ fields: currentPage });
        currentPage = [];
      } else {
        currentPage.push(field);
      }
    });
    // Always push the last page (even if empty)
    pages.push({ fields: currentPage });

    // Swap pages
    [pages[pageIndex - 1], pages[pageIndex]] = [
      pages[pageIndex],
      pages[pageIndex - 1],
    ];

    // Flatten back to fields with pagebreaks
    const flattenedFields = pages.flatMap((page, idx) => [
      ...page.fields,
      ...(idx < pages.length - 1
        ? [{ id: `pagebreak-${idx}`, type: "pagebreak" }]
        : []),
    ]);

    setFields(flattenedFields);
  };

  const handleMovePageDown = (pageIndex) => {
    setHasChanges(true);

    // Split fields into pages, preserving empty pages
    const pages = [];
    let currentPage = [];
    fields.forEach((field) => {
      if (field?.type === "pagebreak") {
        pages.push({ fields: currentPage });
        currentPage = [];
      } else {
        currentPage.push(field);
      }
    });
    // Always push the last page (even if empty)
    pages.push({ fields: currentPage });

    if (pageIndex >= pages.length - 1) return;

    // Swap pages
    [pages[pageIndex], pages[pageIndex + 1]] = [
      pages[pageIndex + 1],
      pages[pageIndex],
    ];

    // Flatten back to fields with pagebreaks
    const flattenedFields = pages.flatMap((page, idx) => [
      ...page.fields,
      ...(idx < pages.length - 1
        ? [{ id: `pagebreak-${idx}`, type: "pagebreak" }]
        : []),
    ]);

    setFields(flattenedFields);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getSelectedField = () => {
    if (!selectedFieldId) return null;
    for (const field of fields) {
      // Top-level field check
      if (field.id === selectedFieldId && field.type !== "section") {
        return field;
      }
      // Section field check - updated to use subFields
      if (field.type === "section") {
        const leftField = field.subFields?.leftField;
        const rightField = field.subFields?.rightField;

        if (
          leftField?.id === selectedFieldId &&
          leftField?.sectionSide === selectedSectionSide
        ) {
          return leftField;
        }
        if (
          rightField?.id === selectedFieldId &&
          rightField?.sectionSide === selectedSectionSide
        ) {
          return rightField;
        }
      }
    }

    console.warn(
      `No field found for selectedFieldId: ${selectedFieldId}, selectedSectionSide: ${selectedSectionSide}`
    );
    return null;
  };

  const selectedField = getSelectedField();

  return (
    <div className="flex h-screen">
      <div className={previewStep > 1 ? "slide-out-right" : "slide-in-right"}>
        <MainMenuBar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          formRecords={formRecords}
          selectedVersionId={selectedVersionId}
          publishLink={publishLink}
        />
      </div>
      <div
        className={`flex-1 flex flex-col relative h-screen transition-all duration-300 ${!showPreview && isSidebarOpen ? "ml-64" : !showPreview ? "ml-16" : ""
          }`}
      >
        <div className="inset-x-1 h-screen flex flex-col">
          <div className="text-white p-5 w-full flex justify-between items-center header-main">
            <div className="flex items-center">
              <span
                className="w-10 h-10 flex items-center justify-center cursor-pointer"
                onClick={() => {
                  if (showPreview) {
                    handleBackToBuilder();
                  } else {
                    navigate("/home");
                  }
                }}
              >
                <IoIosUndo className="text-[#f2f6f7] text-3xl" />
              </span>
              <AnimatedTooltip content={currentFormVersion?.Description__c || 'Define the form structure'}>
                <span className="flex items-center gap-2 cursor-pointer">
                  <span className="text-2xl font-semibold text-white">
                    {currentFormVersion?.Name || 'Contact Form'}
                  </span>
                  {!showPreview && (
                    <FaRegStar className="text-white text-base" />
                  )}
                </span>
              </AnimatedTooltip>
            </div>
            <div className="flex items-center gap-4" style={{ position: "relative" }}>
              <button
                className="flex items-center justify-center my-version-btn"
                onClick={() => setShowVersionDropdown((v) => !v)}
                title="Change Version"
                style={{ position: "relative" }}
              >
                <BsStack className="text-white text-xl" />
              </button>
              <VersionList
                visible={showVersionDropdown}
                versions={formVersions}
                selectedVersionId={selectedVersionId}
                onChange={(val) => {
                  setShowVersionDropdown(false);
                  setPendingVersionId(val);
                  setShowConfirmation(true);
                }}
                onClose={() => setShowVersionDropdown(false)}
              />

              {showMapping ? (
                // Show only Save Workflow button when showMapping is true
                <button
                  className="publish-btn flex items-center gap-2"
                  title="Save Workflow"
                  onClick={handleSaveWorkflow}
                >
                  <span className="flex items-center">
                    <svg
                      width="25"
                      height="24"
                      viewBox="0 0 25 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4.82031 7.2C4.82031 5.43269 6.253 4 8.02031 4H12.8203H15.0262C15.6627 4 16.2732 4.25286 16.7233 4.70294L20.1174 8.09706C20.5675 8.54714 20.8203 9.15759 20.8203 9.79411V12V16.8C20.8203 18.5673 19.3876 20 17.6203 20H8.02031C6.253 20 4.82031 18.5673 4.82031 16.8V7.2Z"
                        stroke="white"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M8.02026 14.4008C8.02026 13.5171 8.73661 12.8008 9.62026 12.8008H16.0203C16.9039 12.8008 17.6203 13.5171 17.6203 14.4008V20.0008H8.02026V14.4008Z"
                        stroke="white"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M9.62036 4V7.2C9.62036 7.64183 9.97853 8 10.4204 8H15.2204C15.6622 8 16.0204 7.64183 16.0204 7.2V4"
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </span>
                  Save Workflow
                </button>
              ) : (
                <>
                  <button
                    className="preview-btn flex items-center gap-2"
                    title="Preview"
                    onClick={handlePreview}
                  >
                    <span className="flex items-center">
                      <svg
                        width="18"
                        height="14"
                        viewBox="0 0 18 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="8.8202"
                          cy="6.99891"
                          r="2.80556"
                          stroke="white"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M16.0986 6.05205C16.4436 6.47096 16.6161 6.68041 16.6161 6.99935C16.6161 7.31829 16.4436 7.52774 16.0986 7.94665C14.8363 9.47923 12.0521 12.3327 8.82031 12.3327C5.58855 12.3327 2.80437 9.47923 1.54206 7.94665C1.19703 7.52774 1.02451 7.31829 1.02451 6.99935C1.02451 6.68041 1.19703 6.47096 1.54206 6.05205C2.80437 4.51947 5.58855 1.66602 8.82031 1.66602C12.0521 1.66602 14.8363 4.51947 16.0986 6.05205Z"
                          stroke="white"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </span>
                    Preview
                  </button>

                  {isEditable && currentFormVersion?.Stage__c == "Draft" && (
                    <button
                      onClick={saveFormToSalesforce}
                      disabled={isSaving || currentFormVersion?.Stage__c !== "Draft"}
                      className={`save-btn flex items-center gap-2 ${isSaving
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-white/10"
                        }`}
                      title="Save Form"
                    >
                      <span className="flex items-center">
                        <svg
                          width="25"
                          height="24"
                          viewBox="0 0 25 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M4.82031 7.2C4.82031 5.43269 6.253 4 8.02031 4H12.8203H15.0262C15.6627 4 16.2732 4.25286 16.7233 4.70294L20.1174 8.09706C20.5675 8.54714 20.8203 9.15759 20.8203 9.79411V12V16.8C20.8203 18.5673 19.3876 20 17.6203 20H8.02031C6.253 20 4.82031 18.5673 4.82031 16.8V7.2Z"
                            stroke="white"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M8.02026 14.4008C8.02026 13.5171 8.73661 12.8008 9.62026 12.8008H16.0203C16.9039 12.8008 17.6203 13.5171 17.6203 14.4008V20.0008H8.02026V14.4008Z"
                            stroke="white"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M9.62036 4V7.2C9.62036 7.64183 9.97853 8 10.4204 8H15.2204C15.6622 8 16.0204 7.64183 16.0204 7.2V4"
                            stroke="white"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </span>
                      Save
                    </button>
                  )}
                </>
              )}
              {(currentFormVersion?.Stage__c === "Draft" ||
                currentFormVersion?.Stage__c === "Locked") && (
                  <button
                    onClick={handlePublish}
                    disabled={
                      isLoadingForm || currentFormVersion?.Stage__c === "Publish"
                    }
                    className="publish-btn flex items-center gap-2"
                  >
                    <span className="flex items-center">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M4.35031 7.64885L5.76031 8.11885C6.69231 8.42885 7.15731 8.58485 7.49131 8.91885C7.82531 9.25285 7.98131 9.71885 8.29131 10.6489L8.76131 12.0589C9.54531 14.4129 9.93731 15.5889 10.6583 15.5889C11.3783 15.5889 11.7713 14.4129 12.5553 12.0589L15.3933 3.54685C15.9453 1.89085 16.2213 1.06285 15.7843 0.625853C15.3473 0.188853 14.5193 0.464853 12.8643 1.01585L4.34931 3.85585C1.99831 4.63885 0.820312 5.03085 0.820312 5.75185C0.820312 6.47285 1.99731 6.86485 4.35031 7.64885Z"
                          fill="white"
                        />
                        <path
                          d="M6.1841 9.59379L4.1221 8.90679C3.97781 8.85869 3.82445 8.84414 3.67369 8.86424C3.52293 8.88434 3.37874 8.93857 3.2521 9.02279L2.1621 9.74879C2.03307 9.83476 1.9318 9.95636 1.87061 10.0988C1.80941 10.2413 1.79094 10.3985 1.81742 10.5512C1.84391 10.704 1.91421 10.8458 2.01979 10.9593C2.12537 11.0729 2.26166 11.1533 2.4121 11.1908L4.3671 11.6788C4.45508 11.7008 4.53542 11.7462 4.59954 11.8103C4.66366 11.8745 4.70914 11.9548 4.7311 12.0428L5.2191 13.9978C5.25661 14.1482 5.33703 14.2845 5.45058 14.3901C5.56413 14.4957 5.7059 14.566 5.85867 14.5925C6.01144 14.619 6.16861 14.6005 6.31107 14.5393C6.45353 14.4781 6.57513 14.3768 6.6611 14.2478L7.3871 13.1578C7.47132 13.0311 7.52555 12.887 7.54565 12.7362C7.56575 12.5854 7.5512 12.4321 7.5031 12.2878L6.8161 10.2258C6.76699 10.0786 6.68433 9.94494 6.57464 9.83525C6.46495 9.72556 6.33124 9.6429 6.1841 9.59379Z"
                          fill="white"
                        />
                      </svg>
                    </span>
                    Publish
                  </button>
                )}

            </div>
          </div>
          {saveError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mt-2">
              {saveError}
            </div>
          )}
          {fetchFormError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mt-2">
              {fetchFormError}
            </div>
          )}
          {showThankYou ? (
            <ThankYouPageBuilder
              formVersionId={formVersionId}
              onContentElementsChange={updatePayloadFromContentElements} // pass setter function
              theme={theme}
              setTheme={setTheme}
              isLoadingForm={isLoadingForm} formloadingtext={loadingText}
              setThankYouRecordId={setThankYouRecordId}
              isEditable={isEditableVersion()}
            />
          ) : showCondition ? (
            <Conditions formVersionId={formVersionId} isEditable={isEditableVersion()} />
          ) : showShare ? (
            <SharePage publishLink={publishLink} noPublishLink={!publishLink} onPublish={handlePublish} isLoadingForm={isLoadingForm} loadingText={loadingText} />
          ) : showSubmission ? (
            <Submissions
              isSidebarOpen={isSidebarOpen}
              formVersionId={formVersionId}
              onStatsUpdate={updateSubmissionStats}
              formId={formId}
            />
          )
            : showPrefill ? <Prefill isEditable={isEditableVersion()} /> : showNotification ? (
              <NotificationPage
                currentFields={formVersions[0]?.Fields}
                sendNotificationData={sendNotificationData}
                GoogleData={googleData}
                formRecords={sfFormRecords}
                isEditable={isEditableVersion()}
              />
            ) : showMapping ? (
              <MappingFields onSaveCallback={registerSaveCallback} isEditable={isEditableVersion()} />
            ) : (
              <div className="flex w-full h-screen builder-start" style={{ position: "relative" }}>
                {isLoadingForm && (
                  loadingText === "Publishing Form" || loadingText === 'Saving Form' ? (
                    <Loader text={loadingText} fullScreen={true} />
                  ) : (<Loader text={loadingText} fullScreen={false} />))}

                {/* Builder fades out when preview is active */}
                <div className={`w-3/4 inner-builder-container ${showPreview ? "fade-out" : "fade-in"}`} style={{ position: "relative" }}>
                  {!showPreview && (
                    <FormBuilder
                      fields={fields}
                      onDrop={isEditableVersion() ? handleDrop : undefined}
                      onReorder={isEditableVersion() ? handleReorder : () => { }}
                      onUpdateField={isEditableVersion() ? handleUpdateField : () => { }}
                      onDeleteField={isEditableVersion() ? handleDeleteField : () => { }}
                      onDeletePage={isEditableVersion() ? handleDeletePage : () => { }}
                      showSidebar={showSidebar}
                      setShowSidebar={setShowSidebar}
                      setSelectedFieldId={setSelectedFieldId}
                      setSelectedSectionSide={setSelectedSectionSide}
                      setSelectedFooter={setSelectedFooter}
                      selectedFieldId={selectedFieldId}
                      selectedSectionSide={selectedSectionSide}
                      setClipboard={isEditableVersion() ? setClipboard : () => { }} // And this line
                      clipboard={clipboard}
                      selectedTheme={selectedTheme}
                      currentPageIndex={currentPageIndex}
                      setCurrentPageIndex={setCurrentPageIndex}
                      onAddPage={isEditableVersion() ? handleAddPage : () => { }}
                      onMovePageUp={isEditableVersion() ? handleMovePageUp : () => { }}
                      onMovePageDown={isEditableVersion() ? handleMovePageDown : () => { }}
                      canUndo={canUndo}
                      canRedo={canRedo}
                      onUndo={isEditableVersion() ? undo : () => { }}
                      onRedo={isEditableVersion() ? redo : () => { }}
                      isSidebarOpen={isSidebarOpen}
                      footerConfigs={footerConfigs}
                      setFooterConfigs={isEditableVersion() ? setFooterConfigs : () => { }} // And this line
                      isEditable={isEditableVersion()}
                    />
                  )}
                </div>
                {/* Sidebar only visible when not in preview */}
                <div className={`w-1/4 pl-2 ${previewStep > 1 ? "slide-out-right" : "slide-in-right"}`}>
                  {showSidebar && !selectedFieldId && !selectedFooter ? (
                    <Sidebar
                      selectedTheme={selectedTheme}
                      onThemeSelect={isEditableVersion() ? setSelectedTheme : undefined}
                      themes={themes}
                      isEditable={isEditableVersion()} // Pass editability status
                    />
                  ) : (
                    <div className="bg-white dark:bg-gray-800 h-full rounded-lg">
                      {(selectedFieldId || selectedFooter) && (
                        <FieldEditor
                          selectedField={selectedField}
                          selectedFooter={selectedFooter}
                          onUpdateField={isEditableVersion() ? handleUpdateField : () => { }} // Change this
                          onDeleteField={isEditableVersion() ? handleDeleteField : () => { }} // And this
                          onClose={() => {
                            setSelectedFieldId(null);
                            setSelectedSectionSide(null);
                            setSelectedFooter(null);
                            setShowSidebar(true);
                          }}
                          fields={fields}
                          fieldsets={fieldsets}
                          onAddFieldsFromFieldset={isEditableVersion() ? handleAddFieldsFromFieldset : () => { }} // And this
                          footerConfigs={footerConfigs}
                          setFooterConfigs={isEditableVersion() ? setFooterConfigs : () => { }} // And this
                          isEditable={isEditableVersion()}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* PreviewForm covers full width below header */}
                {showPreview && (
                  <div className="absolute top-10 left-0 w-full h-full flex items-start justify-center fade-in preview-div">
                    <div className="bg-white rounded-lg shadow-lg border p-8" style={{ minWidth: 700 }}>
                      <PreviewForm
                        formVersion={previewFormData.formVersion}
                        formFields={previewFormData.formFields}
                        formConditions={formConditions}
                        prefills={prefills}
                        isEditable={true}
                      />
                    </div>
                  </div>
                )}
                {/* Confirmation Modal */}
                <AnimatePresence>
                  {showConfirmation && (
                    <div style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(0, 0, 0, 0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 2000
                    }}>
                      <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        style={{
                          background: "white",
                          borderRadius: 10,
                          padding: "16px",
                          maxWidth: 400,
                          width: "100%",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.18)"
                        }}
                      >
                        {/* Get the selected version to check its stage */}
                        {pendingVersionId && (() => {
                          const selectedVersion = formVersions.find(v => v.Id === pendingVersionId);
                          const isDraft = selectedVersion?.Stage__c === "Draft";

                          return (
                            <>
                              {!isDraft && (
                                <div className="flex gap-1">
                                  <svg width="25" height="25" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M83.5712 91.6669H16.4285C14.218 91.6664 12.0466 91.0843 10.1323 89.9789C8.21807 88.8735 6.62846 87.2838 5.52318 85.3695C4.41789 83.4551 3.83586 81.2837 3.83557 79.0732C3.83528 76.8627 4.41673 74.6911 5.52151 72.7765L39.0928 14.6303C40.1983 12.7158 41.7882 11.126 43.7028 10.0207C45.6173 8.91539 47.7891 8.3335 49.9998 8.3335C52.2106 8.3335 54.3824 8.91539 56.2969 10.0207C58.2115 11.126 59.8014 12.7158 60.9068 14.6303L94.4782 72.7765C95.583 74.6911 96.1644 76.8627 96.1641 79.0732C96.1638 81.2837 95.5818 83.4551 94.4765 85.3695C93.3712 87.2838 91.7816 88.8735 89.8674 89.9789C87.9531 91.0843 85.7817 91.6664 83.5712 91.6669Z" fill="#FFB92E" />
                                    <path d="M50 74.9998C52.3012 74.9998 54.1667 73.1344 54.1667 70.8332C54.1667 68.532 52.3012 66.6665 50 66.6665C47.6989 66.6665 45.8334 68.532 45.8334 70.8332C45.8334 73.1344 47.6989 74.9998 50 74.9998Z" fill="white" />
                                    <path d="M50 58.3335C48.895 58.3335 47.8352 57.8945 47.0538 57.1131C46.2724 56.3317 45.8334 55.2719 45.8334 54.1668V37.5002C45.8334 36.3951 46.2724 35.3353 47.0538 34.5539C47.8352 33.7725 48.895 33.3335 50 33.3335C51.1051 33.3335 52.1649 33.7725 52.9463 34.5539C53.7277 35.3353 54.1667 36.3951 54.1667 37.5002V54.1668C54.1667 55.2719 53.7277 56.3317 52.9463 57.1131C52.1649 57.8945 51.1051 58.3335 50 58.3335Z" fill="white" />
                                  </svg>

                                  <p style={{
                                    fontSize: 14,
                                    paddingBottom: 5,
                                    paddingTop: 5,
                                    color: "#666",
                                    fontStyle: "italic",
                                    margin: 0,
                                  }}>
                                    {selectedVersion?.Stage__c} version cannot be edited, only previewed.
                                  </p>
                                </div>
                              )}
                              <p style={{
                                fontSize: 16,
                                paddingBottom: 20,
                                paddingTop: 10,
                                fontWeight: 500,
                                color: "black",
                                lineHeight: 1.5,
                                margin: 0
                              }}>
                                Are you sure you want to switch versions?
                              </p>
                            </>
                          );
                        })()}

                        <div style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 10
                        }}>
                          <button
                            onClick={() => {
                              setShowConfirmation(false);
                              setPendingVersionId(null);
                            }}
                            style={{
                              padding: "7px 14px",
                              borderRadius: 5,
                              border: "1px solid #d9d9d9",
                              background: "#fff",
                              color: "#666",
                              fontWeight: 500,
                              cursor: "pointer"
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              setShowConfirmation(false);
                              if (pendingVersionId) {
                                handleVersionChange({ target: { value: pendingVersionId } });
                                setPendingVersionId(null);
                              }
                            }}
                            style={{
                              padding: "7px 14px",
                              borderRadius: 5,
                              border: "none",
                              background: "#028AB0",
                              color: "#fff",
                              fontWeight: 500,
                              cursor: "pointer"
                            }}
                          >
                            Confirm
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

            )}
        </div>
      </div>
    </div>

  );
}

export default MainFormBuilder;