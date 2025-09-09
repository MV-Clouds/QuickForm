import React, { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import FileUpload from "../file-upload/file-upload";
import "./ThankYouPageEditor.css";
import Loader from "../Loader";
// Prebuilt themes
const prebuiltThemes = [
    {
        name: "Ocean Blue",
        backgroundColor: "#f0f8ff",
        primaryColor: "#0077b6",
        secondaryColor: "#00b4d8",
        textColor: "#0b0a0a",
        secondaryTextColor: "#5f6165",
    },
    {
        name: "Forest Green",
        backgroundColor: "#f0fff0",
        primaryColor: "#2e8b57",
        secondaryColor: "#3cb371",
        textColor: "#0b0a0a",
        secondaryTextColor: "#5f6165",
    },
    {
        name: "Sunset Orange",
        backgroundColor: "#fff5ee",
        primaryColor: "#ff7f50",
        secondaryColor: "#ff6347",
        textColor: "#0b0a0a",
        secondaryTextColor: "#5f6165",
    },
];

// Icons as React components
const ChevronRight = () => <span className="icon-chevron-right">›</span>;
const SearchIcon = () => <span className="icon-search">🔍</span>;
const InstagramIcon = () => <span className="icon-instagram">📷</span>;
const FacebookIcon = () => <span className="icon-facebook">f</span>;
const LinkedinIcon = () => <span className="icon-linkedin">in</span>;
const MessageSquareIcon = () => <span className="icon-message">💬</span>;
const ImageIcon = () => <span className="icon-image">🖼️</span>;
const CloseIcon = () => <span className="icon-close">×</span>;
const AlignLeftIcon = () => <span className="icon-align-left">≡</span>;
const AlignCenterIcon = () => <span className="icon-align-center">≡</span>;
const AlignRightIcon = () => <span className="icon-align-right">≡</span>;
const PlusIcon = () => <span className="icon-plus">+</span>;
const MinusIcon = () => <span className="icon-minus">-</span>;

export default function ThankYouPageEditor({
    formVersionId,
    theme,
    setTheme,
    isLoadingForm,
    formloadingtext,
    onContentElementsChange,
    setThankYouRecordId
}) {
    // State management
    const [url, setUrl] = useState({});
    const [activeTab, setActiveTab] = useState("layout");
    const [selectedElement, setSelectedElement] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [scale, setScale] = useState(1);
    const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 700 });
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [gridSize, setGridSize] = useState(10);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [elements, setElements] = useState([]);
    const [content, setContent] = useState({
        title: "",
        subtitle: "",
        buttonText: "",
        buttonUrl: "",          // added button url
        images: [],
        socialLinks: {},
        customTexts: [],
        description: ""
    });
    const dragRef = useRef({ startX: 0, startY: 0 });
    const resizeInfoRef = useRef(null);
    const canvasContainerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingText, setLoadingText] = useState();
    const [token, setToken] = useState();

   
    /**
     * Maps a Salesforce Thank_You__c record to your content and elements state shapes.
     * @param {object} sfRecord - The Thank_You__c record from Salesforce
     * @returns {{content: object, elements: array}}
     */
    function mapSalesforceThankYouToUI(sfRecord) {
        // Parse Salesforce JSON fields
        const bodyParsed = sfRecord.Body__c ? JSON.parse(sfRecord.Body__c) : {};
        const imageParsed = sfRecord.Image_Url__c
            ? JSON.parse(sfRecord.Image_Url__c)
            : {};
        const headingParsed = sfRecord.Heading__c
            ? JSON.parse(sfRecord.Heading__c)
            : {};
        const subHeadingParsed = sfRecord.Sub_Heading__c
            ? JSON.parse(sfRecord.Sub_Heading__c)
            : {};
        const actionsParsed = sfRecord.Actions__c
            ? JSON.parse(sfRecord.Actions__c)
            : {};

        // Build content
        const content = {
            title: headingParsed.text || "",
            subtitle: subHeadingParsed.text || "",
            buttonText: actionsParsed.buttonText || "",
            images:
                Array.isArray(imageParsed.images) && imageParsed.images.length > 0
                    ? imageParsed.images
                    : [
                        {
                            id: uuidv4(),
                            url: "images/quickform-only-logo.png",
                            name: "Main Image",
                        },
                    ],
            socialLinks: bodyParsed.socialLinks || {},
            customTexts: bodyParsed.customTexts || [],
            description: sfRecord.Description__c || "",
        };

        // Build elements (layout) - from Body__c layout if present; fallback to construct from individual configs if needed
        const elements = Array.isArray(bodyParsed.layout)
            ? bodyParsed.layout
            : [
                imageParsed && { ...imageParsed, id: "image", type: "image" },
                headingParsed && { ...headingParsed, id: "title", type: "title" },
                subHeadingParsed && {
                    ...subHeadingParsed,
                    id: "subtitle",
                    type: "subtitle",
                },
                actionsParsed && { ...actionsParsed, id: "button", type: "button" },
            ].filter(Boolean);

        return { content, elements };
    }
    useEffect(() => {
        setIsLoading(true);
        setLoadingText('Please wait while loading')
        const fetchData = async () => {
            try {
                const userId = sessionStorage.getItem('userId');
                const instanceUrl = sessionStorage.getItem('instanceUrl');
                if (!userId || !instanceUrl) throw new Error('Missing userId or instanceUrl.');

                // Fetch access token
                const response = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, instanceUrl }),
                });
                const tokenData = await response.json();
                if (!response.ok) throw new Error(tokenData.error || 'Failed to fetch access token');
                setToken(tokenData.access_token);

                // Fetch metadata
                const metadataResponse = await fetch(process.env.REACT_APP_FETCH_METADATA_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${tokenData.access_token}`,
                    },
                    body: JSON.stringify({
                        userId,
                        instanceUrl: instanceUrl.replace(/https?:\/\//, ''),
                    }),
                });

                const data = await metadataResponse.json();
                if (!metadataResponse.ok) throw new Error(data.error || 'Failed to fetch metadata');

                const sfFormRecords = JSON.parse(data.FormRecords || '[]');
                console.log("formRecords =>", sfFormRecords);
                let formVersion = null;
                for (const form of sfFormRecords) {
                    formVersion = form.FormVersions.find((v) => v.Id === formVersionId);
                    if (formVersion) break;
                }
                console.log("formversion ", formVersion);
                let thankyouRecord;
                thankyouRecord = formVersion?.ThankYou;
                console.log("ty record", thankyouRecord);
                let hasContent =
                    thankyouRecord &&
                    (
                        (typeof thankyouRecord === "object" && Object.keys(thankyouRecord)?.length > 0) ||
                        (Array.isArray(thankyouRecord) && thankyouRecord?.length > 0) ||
                        (typeof thankyouRecord === "string" && thankyouRecord?.length > 0)
                    );
                if (hasContent) {
                    const { content: loadedContent, elements: loadedElements } =
                        mapSalesforceThankYouToUI(thankyouRecord);
                    setContent(loadedContent || content);
                    setElements(
                        Array.isArray(loadedElements) && loadedElements.length > 0
                            ? loadedElements
                            : elements
                    );
                    setThankYouRecordId(thankyouRecord.Id)
                }else {
                    // Set default content and elements here
                    const defaultImage = {
                      id: uuidv4(),
                      url: "/images/quickform-only-logo.png",
                      name: "Default Image",
                    };
            
                    setTheme({
                      backgroundColor: "#ffffff",
                      primaryColor: "#028ab0",
                      secondaryColor: "#ffbb1b",
                      textColor: "#0b0a0a",
                      secondaryTextColor: "#5f6165",
                    });
            
                    setContent({
                      title: "Thank You for Your Submission!",
                      subtitle: "We have received your message and will get back to you shortly.",
                      buttonText: "Explore More",
                      buttonUrl: "https://example.com",      // default redirect url
                      images: [defaultImage],
                      socialLinks: {
                        facebook: { enabled: true, url: "https://facebook.com" },
                        instagram: { enabled: true, url: "https://instagram.com" },
                        linkedin: { enabled: true, url: "https://linkedin.com" },
                        message: { enabled: true, url: "mailto:contact@example.com" },
                      },
                      customTexts: [],
                      description: ""
                    });
            
                    setElements([
                      {
                        id: "image",
                        type: "image",
                        x: 100,
                        y: 30,
                        width: 800,
                        height: 320,
                        zIndex: 1,
                        alignment: "center",
                        imageId: defaultImage.id,
                      },
                      {
                        id: "title",
                        type: "title",
                        x: 100,
                        y: 370,
                        width: 800,
                        height: 60,
                        zIndex: 2,
                        alignment: "center",
                      },
                      {
                        id: "subtitle",
                        type: "subtitle",
                        x: 100,
                        y: 450,
                        width: 800,
                        height: 40,
                        zIndex: 2,
                        alignment: "center",
                      },
                      {
                        id: "button",
                        type: "button",
                        x: 400,
                        y: 510,
                        width: 200,
                        height: 50,
                        zIndex: 2,
                        alignment: "center",
                      },
                      {
                        id: "social",
                        type: "social",
                        x: 400,
                        y: 580,
                        width: 200,
                        height: 60,
                        zIndex: 2,
                        alignment: "center",
                      },
                    ]);
                  }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData()
    }, [formVersionId]);

    // Save state to history for undo/redo
    const saveToHistory = () => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({
            elements: JSON.parse(JSON.stringify(elements)),
            content: JSON.parse(JSON.stringify(content)),
            theme: JSON.parse(JSON.stringify(theme))
        });

        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    // Undo functionality
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const previousState = history[historyIndex - 1];
            setElements(previousState.elements);
            setContent(previousState.content);
            setTheme(previousState.theme);
            setHistoryIndex(historyIndex - 1);
        }
    },[history,historyIndex,setTheme])

    // Redo functionality
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setElements(nextState.elements);
            setContent(nextState.content);
            setTheme(nextState.theme);
            setHistoryIndex(historyIndex + 1);
        }
    },[history,historyIndex,setTheme])

    // Calculate canvas scale based on container size
    useEffect(() => {
        const calculateScale = () => {
            if (!canvasContainerRef.current) return;

            // const containerWidth = canvasContainerRef.current.clientWidth;
            // const containerHeight = canvasContainerRef.current.clientHeight;

            // // Calculate scale based on container size and design dimensions
            // const widthScale = containerWidth / canvasSize.width;
            // const heightScale = containerHeight / canvasSize.height;

            // // Use the smaller scale to ensure everything fits
            // const newScale = Math.min(widthScale, heightScale);
            const containerWidth = canvasContainerRef.current.clientWidth;

            // Calculate scale based on container width, but don't upscale
            const newScale = Math.min(containerWidth / canvasSize.width, 1);


            setScale(newScale);
        };

        // Initial calculation
        calculateScale();

        // Add event listener for window resize
        window.addEventListener('resize', calculateScale);

        // Cleanup
        return () => {
            window.removeEventListener('resize', calculateScale);
        };
    }, [canvasSize]);

    // Save elements to backend on change
    const saveToBackend = async () => {
        try {
            // In a real app, you would call your API here
            console.log("Saving elements to backend:", elements);
        } catch (error) {
            console.error("Error saving elements:", error);
        }
    };

    // Auto-save when elements change
    useEffect(() => {
        saveToBackend();
        saveToHistory();
        if (onContentElementsChange) {
            onContentElementsChange(content, elements);
          }
    }, [elements, content, theme]);

    useEffect(() => {
        if (url?.backgroundImage) {
            const newImage = {
                id: uuidv4(),
                url: url.backgroundImage,
                name: `Image ${content.images.length + 1}`,
            };

            setContent((prev) => ({
                ...prev,
                images: [...prev.images, newImage],
            }));

            // Add an image element to canvas only if needed
            setElements((prev) => [
                ...prev,
                {
                    id: `image-${uuidv4()}`,
                    type: "image",
                    x: 100 + prev?.length * 30,
                    y: 100 + prev?.length * 30,
                    width: 300,
                    height: 180,
                    zIndex: 1,
                    alignment: "center",
                    imageId: newImage.id,
                },
            ]);
        }
    }, [url]);

    // Handle image upload
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const newImage = {
                    id: uuidv4(),
                    url: event.target.result,
                    name: file.name,
                };
                setContent({
                    ...content,
                    images: [...content.images, newImage],
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const addNewImage = (imgObj) => {
        const newImage = {
            id: uuidv4(),
            url: imgObj.backgroundImage,
            name: `Image ${content.images.length + 1}`,
        };

        // Add image data
        setContent((prev) => ({
            ...prev,
            images: [...prev.images, newImage],
        }));

        // Add image element to canvas at default position
        setElements((prev) => [
            ...prev,
            {
                id: `image-${uuidv4()}`,
                type: "image",
                x: 100 + prev.length * 30,
                y: 100 + prev.length * 30,
                width: 300,
                height: 180,
                zIndex: 1,
                alignment: "center",
                imageId: newImage.id,
            },
        ]);
    };

    // Drag start - use canvas scaling to get accurate positions
    const handleDragStart = (e, id) => {
        setIsDragging(true);
        setSelectedElement(id);

        const element = elements.find((el) => el.id === id);
        const container = canvasContainerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        // Calculate offset accounting for scale
        const offsetX = (e.clientX - rect.left) / scale - element.x;
        const offsetY = (e.clientY - rect.top) / scale - element.y;

        dragRef.current = { offsetX, offsetY };
        e.stopPropagation();
    };

    const handleDrag = (e) => {
        if (!isDragging || !selectedElement) return;

        const container = canvasContainerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const element = elements.find((el) => el.id === selectedElement);
        const { offsetX, offsetY } = dragRef.current;

        // New position, accounting for scaling
        let newX = (e.clientX - rect.left) / scale - offsetX;
        let newY = (e.clientY - rect.top) / scale - offsetY;

        // Snap to grid if enabled
        if (snapToGrid) {
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
        }

        // Boundary conditions - prevent leaving canvas
        newX = Math.max(0, Math.min(newX, canvasSize.width - element.width));
        newY = Math.max(0, Math.min(newY, canvasSize.height - element.height));

        setElements(
            elements.map((el) =>
                el.id === selectedElement ? { ...el, x: newX, y: newY } : el
            )
        );
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    // Handle resizing with boundary checks
    const handleResizing = (e) => {
        if (!isResizing || !resizeInfoRef.current) return;

        const {
            id,
            direction,
            startX,
            startY,
            startWidth,
            startHeight,
            startLeft,
            startTop,
        } = resizeInfoRef.current;
        let deltaX = e.clientX - startX;
        let deltaY = e.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newX = startLeft;
        let newY = startTop;

        const minW = 40;
        const minH = 20;

        if (direction.includes("right")) {
            newWidth = Math.max(
                minW,
                Math.min(startWidth + deltaX, canvasSize.width - newX)
            );
        }
        if (direction.includes("left")) {
            newWidth = Math.max(minW, startWidth - deltaX);
            if (newWidth !== minW) {
                newX = Math.max(
                    0,
                    Math.min(startLeft + deltaX, startLeft + startWidth - minW)
                );
                newWidth = startWidth - (newX - startLeft);
            }
        }
        if (direction.includes("bottom")) {
            newHeight = Math.max(
                minH,
                Math.min(startHeight + deltaY, canvasSize.height - newY)
            );
        }
        if (direction.includes("top")) {
            newHeight = Math.max(minH, startHeight - deltaY);
            if (newHeight !== minH) {
                newY = Math.max(
                    0,
                    Math.min(startTop + deltaY, startTop + startHeight - minH)
                );
                newHeight = startHeight - (newY - startTop);
            }
        }

        // Snap to grid if enabled
        if (snapToGrid) {
            newWidth = Math.round(newWidth / gridSize) * gridSize;
            newHeight = Math.round(newHeight / gridSize) * gridSize;
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
        }

        setElements((el) =>
            el.map((o) =>
                o.id === id
                    ? { ...o, width: newWidth, height: newHeight, x: newX, y: newY }
                    : o
            )
        );
    };

    const handleResizeEnd = () => {
        setIsResizing(false);
        resizeInfoRef.current = null;
    };

    useEffect(() => {
        if (!isResizing) return;
        const handleMove = (e) => handleResizing(e);
        const handleUp = () => handleResizeEnd();
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    }, [isResizing]);

    // Handle resize start
    const handleResizeStart = (e, id, direction) => {
        setIsResizing(true);
        setSelectedElement(id);
        const element = elements.find((el) => el.id === id);
        resizeInfoRef.current = {
            id,
            direction,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: element.width,
            startHeight: element.height,
            startLeft: element.x,
            startTop: element.y,
        };
        e.stopPropagation();
    };

    // Handle alignment change
    const handleAlignmentChange = (id, alignment) => {
        setElements(
            elements.map((el) => (el.id === id ? { ...el, alignment } : el))
        );
    };

    // Handle theme and content changes
    const handleThemeChange = (property, value) => {
        setTheme({ ...theme, [property]: value });
    };

    const handleContentChange = (property, value) => {
        setContent({ ...content, [property]: value });
    };

    // Apply prebuilt theme
    const applyPrebuiltTheme = (theme) => {
        setTheme({
            backgroundColor: theme.backgroundColor,
            primaryColor: theme.primaryColor,
            secondaryColor: theme.secondaryColor,
            textColor: theme.textColor,
            secondaryTextColor: theme.secondaryTextColor,
        });
    };

    // Add new text element
    const addTextElement = () => {
        const newText = {
            id: `text-${uuidv4()}`,
            text: "New Text",
            color: theme.textColor,
            fontSize: 16,
            fontFamily: "Arial, sans-serif",
            fontWeight: "normal",
        };

        const newElement = {
            id: `custom-text-${uuidv4()}`,
            type: "custom-text",
            textId: newText.id,
            x: 100,
            y: 100,
            width: 200,
            height: 40,
            zIndex: 3,
            alignment: "left",
        };

        setContent({
            ...content,
            customTexts: [...content.customTexts, newText],
        });

        setElements([...elements, newElement]);
        setSelectedElement(newElement.id);
    };

    // Remove image safely
    const removeImage = (imageId) => {
        setContent((prev) => ({
            ...prev,
            images: prev.images.filter((img) => img?.id !== imageId),
        }));

        setElements((prev) =>
            prev.filter((el) => !(el.type === "image" && el.imageId === imageId))
        );

        // If selectedElement was pointing to a removed image, reset it
        setSelectedElement(null);
    };

    // Update custom text
    const updateCustomText = (id, text) => {
        setContent({
            ...content,
            customTexts: content.customTexts.map((t) =>
                t.id === id ? { ...t, text } : t
            ),
        });
    };

    // Update custom text color
    const updateCustomTextColor = (id, color) => {
        setContent({
            ...content,
            customTexts: content.customTexts.map((t) =>
                t.id === id ? { ...t, color } : t
            ),
        });
    };

    // Update custom text font size
    const updateCustomTextFontSize = (id, fontSize) => {
        setContent({
            ...content,
            customTexts: content.customTexts.map((t) =>
                t.id === id ? { ...t, fontSize: parseInt(fontSize) } : t
            ),
        });
    };

    // Update custom text font family
    const updateCustomTextFontFamily = (id, fontFamily) => {
        setContent({
            ...content,
            customTexts: content.customTexts.map((t) =>
                t.id === id ? { ...t, fontFamily } : t
            ),
        });
    };

    // Update custom text font weight
    const updateCustomTextFontWeight = (id, fontWeight) => {
        setContent({
            ...content,
            customTexts: content.customTexts.map((t) =>
                t.id === id ? { ...t, fontWeight } : t
            ),
        });
    };

    // Update social link URL
    const updateSocialLinkUrl = (platform, url) => {
        setContent({
            ...content,
            socialLinks: {
                ...content.socialLinks,
                [platform]: {
                    ...content.socialLinks[platform],
                    url,
                },
            },
        });
    };

    // Toggle social link
    const toggleSocialLink = (platform) => {
        setContent({
            ...content,
            socialLinks: {
                ...content.socialLinks,
                [platform]: {
                    ...content.socialLinks[platform],
                    enabled: !content.socialLinks[platform].enabled,
                },
            },
        });
    };

    // Set image for image element
    const setImageForElement = (elementId, imageId) => {
        setElements((prev) =>
            prev.map((el) => (el.id === elementId ? { ...el, imageId } : el))
        );
    };

    // Duplicate element
    const duplicateElement = (id) => {
        const element = elements.find(el => el.id === id);
        if (!element) return;

        const newElement = {
            ...JSON.parse(JSON.stringify(element)),
            id: `${element.type}-${uuidv4()}`,
            x: element.x + 20,
            y: element.y + 20
        };

        // If it's a custom text element, duplicate the text content too
        if (element.type === "custom-text") {
            const originalText = content.customTexts.find(t => t.id === element.textId);
            if (originalText) {
                const newText = {
                    ...JSON.parse(JSON.stringify(originalText)),
                    id: `text-${uuidv4()}`
                };

                newElement.textId = newText.id;

                setContent(prev => ({
                    ...prev,
                    customTexts: [...prev.customTexts, newText]
                }));
            }
        }

        setElements(prev => [...prev, newElement]);
        setSelectedElement(newElement.id);
    };

    // Delete element
    const deleteElement = useCallback((id) => {
        const element = elements.find(el => el.id === id);
        if (!element) return;

        // If it's a custom text element, remove the text content too
        if (element.type === "custom-text") {
            setContent(prev => ({
                ...prev,
                customTexts: prev.customTexts.filter(t => t.id !== element.textId)
            }));
        }

        setElements(prev => prev.filter(el => el.id !== id));
        setSelectedElement(null);
    } , [elements]);
    useEffect(() => {
        function handleKeyDown(e) {
          const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
          const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      
          if (ctrlKey && e.key === 'z' && !e.shiftKey) {
            // Undo
            e.preventDefault();
            if (history.length > 0 && historyIndex > 0) undo();
          } else if ((ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey)))) {
            // Redo
            e.preventDefault();
            if (history.length > 0 && historyIndex < history.length -1) redo();
          } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
            // Delete
            e.preventDefault();
            deleteElement(selectedElement);
          }
          // Add other shortcuts below if needed (copy, paste)
        }
      
        window.addEventListener('keydown', handleKeyDown);
      
        return () => {
          window.removeEventListener('keydown', handleKeyDown);
        };
      }, [history, historyIndex, selectedElement, deleteElement, undo, redo]);
      
    // Change element z-index (bring forward)
    const bringForward = (id) => {
        const elementIndex = elements.findIndex(el => el.id === id);
        if (elementIndex === -1 || elementIndex === elements.length - 1) return;

        const newElements = [...elements];
        const element = newElements[elementIndex];
        newElements[elementIndex] = newElements[elementIndex + 1];
        newElements[elementIndex + 1] = element;

        setElements(newElements);
    };

    // Change element z-index (send backward)
    const sendBackward = (id) => {
        const elementIndex = elements.findIndex(el => el.id === id);
        if (elementIndex === -1 || elementIndex === 0) return;

        const newElements = [...elements];
        const element = newElements[elementIndex];
        newElements[elementIndex] = newElements[elementIndex - 1];
        newElements[elementIndex - 1] = element;

        setElements(newElements);
    };

    // Reset to default layout
    const resetAll = () => {
        const defaultImage = {
          id: uuidv4(),
          url: "/images/quickform-only-logo.png",
          name: "Default Image",
        };
      
        const canvasW = canvasSize.width;
        const canvasH = canvasSize.height;
      
        // Define element sizes (width, height)
        const imageW = 800;
        const imageH = 320;
        const titleW = 600;
        const titleH = 60;
        const subtitleW = 600;
        const subtitleH = 40;
        const buttonW = 200;
        const buttonH = 50;
        const socialW = 300;
        const socialH = 60;
      
        // Vertical spacing between each element
        const verticalSpace = 10;
      
        // Calculate total height of all stacked elements + spacing
        const totalContentHeight =
          imageH +
          verticalSpace +
          titleH +
          verticalSpace +
          subtitleH +
          verticalSpace +
          buttonH +
          verticalSpace +
          socialH;
      
        // Start y to vertically center the whole group on canvas
        let startY = (canvasH - totalContentHeight) / 2;
      
        setTheme({
          backgroundColor: "#ffffff",
          primaryColor: "#028ab0",
          secondaryColor: "#ffbb1b",
          textColor: "#0a0a0a",
          secondaryTextColor: "#555555",
        });
      
        setContent({
          title: "Thank you for your submission!",
          subtitle: "We appreciate your time.",
          buttonText: "Explore More",
          buttonUrl: "https://example.com",      // default redirect url
          images: [defaultImage],
          socialLinks: {
            facebook: { enabled: true, url: "https://facebook.com" },
            instagram: { enabled: true, url: "https://instagram.com" },
            linkedin: { enabled: true, url: "https://linkedin.com" },
            message: { enabled: true, url: "mailto:contact@example.com" },
          },
          customTexts: [],
          description: "",
        });
      
        setElements([
          {
            id: "image",
            type: "image",
            x: (canvasW - imageW) / 2,
            y: startY,
            width: imageW,
            height: imageH,
            zIndex: 1,
            alignment: "center",
            imageId: defaultImage.id,
          },
          {
            id: "title",
            type: "title",
            x: (canvasW - titleW) / 2,
            y: startY + imageH + verticalSpace,
            width: titleW,
            height: titleH,
            zIndex: 2,
            alignment: "center",
          },
          {
            id: "subtitle",
            type: "subtitle",
            x: (canvasW - subtitleW) / 2,
            y: startY + imageH + verticalSpace + titleH + verticalSpace,
            width: subtitleW,
            height: subtitleH,
            zIndex: 2,
            alignment: "center",
          },
          {
            id: "button",
            type: "button",
            x: (canvasW - buttonW) / 2,
            y: startY + imageH + verticalSpace + titleH + verticalSpace + subtitleH + verticalSpace,
            width: buttonW,
            height: buttonH,
            zIndex: 2,
            alignment: "center",
          },
          {
            id: "social",
            type: "social",
            x: (canvasW - socialW) / 2,
            y: startY + imageH + verticalSpace + titleH + verticalSpace + subtitleH + verticalSpace + buttonH + verticalSpace,
            width: socialW,
            height: socialH,
            zIndex: 2,
            alignment: "center",
          },
        ]);
      
        // Reset zoom scale to 1 for clarity
        setScale(1);
      };
      

    return (
        <div
            className="thankyou-page-editor"
            onMouseMove={handleDrag}
            onMouseUp={handleDragEnd}
        >
            {(isLoading || isLoadingForm) && (
                <Loader text={isLoadingForm ? loadingText : formloadingtext} fullScreen={false} />
            )}
            {/* Main Canvas Area */}
            <div className="editor-canvas-area">
                {/* Canvas Container with fixed aspect ratio */}
                <div
                    ref={canvasContainerRef}
                    className="canvas-container"
                    style={{
                        maxWidth: `${canvasSize.width}px`,
                        // paddingTop: `${(canvasSize.height / canvasSize.width) * 100}%`,
                    }}
                >
                    {/* Canvas with dynamic scaling */}
                    <div
                        className="canvas"
                        style={{
                            backgroundColor: theme.backgroundColor,
                            transform: `scale(${scale})`,
                            backgroundImage: showGrid ?
                                `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)` :
                                'none',
                            backgroundSize: `${gridSize}px ${gridSize}px`,
                        }}
                    >
                        {elements.map((element) => {
                            const elementStyle = {
                                left: `${element.x}px`,
                                top: `${element.y}px`,
                                width: `${element.width}px`,
                                height: `${element.height}px`,
                                zIndex: element.zIndex,
                                display: "flex",
                                justifyContent: element.alignment,
                                alignItems: "center",
                                position: 'absolute',
                            };

                            return (
                                <div
                                    key={element.id}
                                    className={`canvas-element ${selectedElement === element.id ? 'selected' : ''}`}
                                    style={elementStyle}
                                    onMouseDown={(e) => handleDragStart(e, element.id)}
                                    onClick={() => setSelectedElement(element.id)}
                                >
                                    {element.type === "image" && (
                                        <div className="image-element">
                                            <img
                                                src={
                                                    content.images.find((img) => img?.id === element.imageId)?.url || ""
                                                }
                                                alt="Thank you page background"
                                                className="image-content"
                                            />
                                            <div className="image-overlay">
                                                <button className="image-button">
                                                    <ImageIcon />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {element.type === "title" && (
                                        <h1
                                            className="title-element"
                                            style={{
                                                color: theme.textColor,
                                                textAlign: element.alignment,
                                            }}
                                        >
                                            {content.title}
                                        </h1>
                                    )}
                                    {element.type === "subtitle" && (
                                        <p
                                            className="subtitle-element"
                                            style={{
                                                color: theme.secondaryTextColor,
                                                textAlign: element.alignment,
                                            }}
                                        >
                                            {content.subtitle}
                                        </p>
                                    )}
                                    {element.type === "button" && (
                                    <a href={content.buttonUrl || "#"} target="_blank" rel="noopener noreferrer">
                                        <button
                                        className="button-element"
                                        style={{
                                            backgroundColor: theme.primaryColor,
                                            color: "white",
                                            cursor: content.buttonUrl ? "pointer" : "default"
                                        }}
                                        onClick={(e) => {
                                            if (!content.buttonUrl) e.preventDefault();
                                        }}
                                        >
                                        {content.buttonText}
                                        </button>
                                    </a>
                                    )}
                                    {element.type === "social" && (
                                        <div className="social-element">
                                            {content.socialLinks.facebook.enabled && (
                                                <a
                                                    href={content.socialLinks.facebook.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="social-link facebook"
                                                    style={{ backgroundColor: theme.secondaryColor }}
                                                >
                                                    <FacebookIcon />
                                                </a>
                                            )}
                                            {content.socialLinks.instagram.enabled && (
                                                <a
                                                    href={content.socialLinks.instagram.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="social-link instagram"
                                                    style={{ backgroundColor: theme.secondaryColor }}
                                                >
                                                    <InstagramIcon />
                                                </a>
                                            )}
                                            {content.socialLinks.linkedin.enabled && (
                                                <a
                                                    href={content.socialLinks.linkedin.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="social-link linkedin"
                                                    style={{ backgroundColor: theme.secondaryColor }}
                                                >
                                                    <LinkedinIcon />
                                                </a>
                                            )}
                                            {content.socialLinks.message.enabled && (
                                                <a
                                                    href={content.socialLinks.message.url}
                                                    className="social-link message"
                                                    style={{ backgroundColor: theme.secondaryColor }}
                                                >
                                                    <MessageSquareIcon />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    {element.type === "custom-text" && (
                                        <div className="custom-text-element">
                                            <p
                                                className="custom-text-content"
                                                style={{
                                                    color: content.customTexts.find((t) => t.id === element.textId)?.color || theme.textColor,
                                                    textAlign: element.alignment,
                                                    fontSize: `${content.customTexts.find((t) => t.id === element.textId)?.fontSize || 16}px`,
                                                    fontFamily: content.customTexts.find((t) => t.id === element.textId)?.fontFamily || "Arial, sans-serif",
                                                    fontWeight: content.customTexts.find((t) => t.id === element.textId)?.fontWeight || "normal",
                                                    lineHeight: "1.5",
                                                }}
                                            >
                                                {content.customTexts.find((t) => t.id === element.textId)?.text || ""}
                                            </p>
                                        </div>
                                    )}
                                    {selectedElement === element.id && (
                                        <>
                                            {[
                                                {
                                                    dir: "top-left",
                                                    styles: "resize-handle-top-left",
                                                    cursor: "nwse-resize",
                                                },
                                                {
                                                    dir: "top",
                                                    styles: "resize-handle-top",
                                                    cursor: "ns-resize",
                                                },
                                                {
                                                    dir: "top-right",
                                                    styles: "resize-handle-top-right",
                                                    cursor: "nesw-resize",
                                                },
                                                {
                                                    dir: "right",
                                                    styles: "resize-handle-right",
                                                    cursor: "ew-resize",
                                                },
                                                {
                                                    dir: "bottom-right",
                                                    styles: "resize-handle-bottom-right",
                                                    cursor: "nwse-resize",
                                                },
                                                {
                                                    dir: "bottom",
                                                    styles: "resize-handle-bottom",
                                                    cursor: "ns-resize",
                                                },
                                                {
                                                    dir: "bottom-left",
                                                    styles: "resize-handle-bottom-left",
                                                    cursor: "nesw-resize",
                                                },
                                                {
                                                    dir: "left",
                                                    styles: "resize-handle-left",
                                                    cursor: "ew-resize",
                                                },
                                            ].map((h) => (
                                                <div
                                                    key={h.dir}
                                                    className={`resize-handle ${h.styles}`}
                                                    style={{ cursor: h.cursor }}
                                                    onMouseDown={(e) =>
                                                        handleResizeStart(e, element.id, h.dir)
                                                    }
                                                />
                                            ))}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Editor Controls */}
                <div className="editor-controls">
                    <button
                        className="control-button"
                        onClick={() => setShowGrid(!showGrid)}
                        title="Toggle Grid"
                    >
                        {showGrid ? "Hide Grid" : "Show Grid"}
                    </button>
                    <button
                        className="control-button"
                        onClick={() => setSnapToGrid(!snapToGrid)}
                        title="Toggle Snap to Grid"
                    >
                        {snapToGrid ? "Disable Snap" : "Enable Snap"}
                    </button>
                    <button
                        className="control-button"
                        onClick={undo}
                        disabled={historyIndex <= 0}
                        title="Undo"
                    >
                        Undo
                    </button>
                    <button
                        className="control-button"
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                        title="Redo"
                    >
                        Redo
                    </button>
                    {selectedElement && (
                        <>
                            <button
                                className="control-button"
                                onClick={() => duplicateElement(selectedElement)}
                                title="Duplicate Element"
                            >
                                Duplicate
                            </button>
                            <button
                                className="control-button"
                                onClick={() => deleteElement(selectedElement)}
                                title="Delete Element"
                            >
                                Delete
                            </button>
                            {/* <button
                                className="control-button"
                                onClick={() => bringForward(selectedElement)}
                                title="Bring Forward"
                            >
                                Forward
                            </button>
                            <button
                                className="control-button"
                                onClick={() => sendBackward(selectedElement)}
                                title="Send Backward"
                            >
                                Backward
                            </button> */}
                        </>
                    )}
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="editor-sidebar">
                <div className="sidebar-header">
                    <div className="header-title">
                        <ChevronRight />
                        <h2>Customize</h2>
                    </div>
                    <button
                        className="reset-button"
                        onClick={resetAll}
                    >
                        Reset All
                    </button>
                </div>

                {/* Tabs */}
                <div className="sidebar-tabs">
                    <button
                        className={`tab-buttons ${activeTab === "layout" ? "active" : ""}`}
                        onClick={() => setActiveTab("layout")}
                    >
                        Layout
                    </button>
                    <button
                        className={`tab-buttons ${activeTab === "themes" ? "active" : ""}`}
                        onClick={() => setActiveTab("themes")}
                    >
                        Themes
                    </button>
                    <button
                        className={`tab-buttons ${activeTab === "settings" ? "active" : ""}`}
                        onClick={() => setActiveTab("settings")}
                    >
                        Settings
                    </button>
                </div>

                {/* Search */}
                <div className="search-container">
                    <SearchIcon />
                    <input
                        type="text"
                        placeholder="Search elements..."
                        className="search-input"
                    />
                </div>

                {activeTab === "layout" ? (
                    <div className="layout-tab">
                        {/* Add Text Button */}
                        <button
                            onClick={addTextElement}
                            className="add-text-button"
                        >
                            <AlignLeftIcon />
                            Add Text Box
                        </button>

                        {/* Image Section */}
                        <div className="section-container">
                            <div className="section-header">
                                <span>Manage Media</span>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={elements.some((el) => el.type === "image")}
                                        onChange={() => {
                                            if (elements.some((el) => el.type === "image")) {
                                                setElements(elements.filter((el) => el.type !== "image"));
                                            } else {
                                                let firstImage = content.images[0];
                                                if (!firstImage) {
                                                    firstImage = {
                                                        id: uuidv4(),
                                                        url: "/images/quickform-only-logo.png",
                                                        name: "Default Image",
                                                    };
                                                    setContent((prev) => ({
                                                        ...prev,
                                                        images: [firstImage],
                                                    }));
                                                }
                                                setElements([
                                                    ...elements,
                                                    {
                                                        id: `image-${firstImage.id}`,
                                                        type: "image",
                                                        x: 0,
                                                        y: 0,
                                                        width: 800,
                                                        height: 320,
                                                        zIndex: 1,
                                                        alignment: "center",
                                                        imageId: firstImage.id,
                                                    },
                                                ]);
                                            }
                                        }}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            {elements.some((el) => el.type === "image") && (
                                <>
                                    <div className="image-list">
                                        {content.images.map((image) => (
                                            <div
                                                key={image?.id}
                                                className="image-item"
                                            >
                                                <span className="image-name">
                                                    {image?.name}
                                                </span>
                                                <div className="image-actions">
                                                    {selectedElement &&
                                                        elements.find((el) => el.id === selectedElement)
                                                            ?.type === "image" && (
                                                            <button
                                                                onClick={() =>
                                                                    setImageForElement(selectedElement, image.id)
                                                                }
                                                                className="action-button use-button"
                                                            >
                                                                Use
                                                            </button>
                                                        )}
                                                    <button
                                                        onClick={() => removeImage(image.id)}
                                                        className="action-button delete-button"
                                                    >
                                                        <CloseIcon />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {content.images.length < 4 && (
                                        <FileUpload
                                            acceptedFileTypes={".png,.jpg,.jpeg"}
                                            setDesign={(imgObj) => {
                                                if (content.images.length >= 4) return;
                                                const newImage = {
                                                    id: uuidv4(),
                                                    url: imgObj.backgroundImage,
                                                    name: `Image ${content.images.length + 1}`,
                                                };
                                                setContent((prev) => ({
                                                    ...prev,
                                                    images: [...prev.images, newImage],
                                                }));
                                                setElements((prev) => [
                                                    ...prev,
                                                    {
                                                        id: `image-${newImage.id}`,
                                                        type: "image",
                                                        x: 50 + prev.length * 40,
                                                        y: 50 + prev.length * 40,
                                                        width: 300,
                                                        height: 180,
                                                        zIndex: 1,
                                                        alignment: "center",
                                                        imageId: newImage.id,
                                                    },
                                                ]);
                                            }}
                                        />
                                    )}
                                    {/* {selectedElement &&
                                        elements.find((el) => el.id === selectedElement)?.type ===
                                        "image" && (
                                            <select
                                                value={
                                                    elements.find((el) => el.id === selectedElement)?.imageId || ""
                                                }
                                                onChange={(e) => setImageForElement(selectedElement, e.target.value)}
                                                className="image-select"
                                            >
                                                {content.images.map((img) =>
                                                    img?.id ? (
                                                        <option key={img.id} value={img.id}>
                                                            {img.name}
                                                        </option>
                                                    ) : null
                                                )}
                                            </select>
                                        )} */}
                                </>
                            )}
                        </div>

                        {/* Title Section */}
                        <div className="section-container">
                            <div className="section-header">
                                <span>Title</span>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={elements.some((el) => el.id === "title")}
                                        onChange={() => {
                                            if (elements.some((el) => el.id === "title")) {
                                                setElements(elements.filter((el) => el.id !== "title"));
                                            } else {
                                                setElements([
                                                    ...elements,
                                                    {
                                                        id: "title",
                                                        type: "title",
                                                        x: 0,
                                                        y: 340,
                                                        width: 800,
                                                        height: 60,
                                                        zIndex: 2,
                                                        alignment: "center",
                                                    },
                                                ]);
                                            }
                                        }}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            {elements.some((el) => el.id === "title") && (
                                <>
                                    <input
                                        type="text"
                                        value={content.title}
                                        onChange={(e) =>
                                            handleContentChange("title", e.target.value)
                                        }
                                        className="text-input"
                                        placeholder="Enter title text"
                                    />
                                    <div className="color-picker">
                                        <label>Text Color</label>
                                        <div className="color-input-group">
                                            <input
                                                type="color"
                                                value={theme.textColor}
                                                onChange={(e) =>
                                                    handleThemeChange("textColor", e.target.value)
                                                }
                                                className="color-input"
                                            />
                                            <input
                                                type="text"
                                                value={theme.textColor}
                                                onChange={(e) =>
                                                    handleThemeChange("textColor", e.target.value)
                                                }
                                                className="color-text-input"
                                            />
                                        </div>
                                    </div>
                                    {selectedElement === "title" && (
                                        <div className="alignment-buttons">
                                            <button
                                                onClick={() => handleAlignmentChange("title", "left")}
                                                className={`align-button ${elements.find((el) => el.id === "title").alignment === "left" ? "active" : ""}`}
                                            >
                                                <AlignLeftIcon />
                                            </button>
                                            <button
                                                onClick={() => handleAlignmentChange("title", "center")}
                                                className={`align-button ${elements.find((el) => el.id === "title").alignment === "center" ? "active" : ""}`}
                                            >
                                                <AlignCenterIcon />
                                            </button>
                                            <button
                                                onClick={() => handleAlignmentChange("title", "right")}
                                                className={`align-button ${elements.find((el) => el.id === "title").alignment === "right" ? "active" : ""}`}
                                            >
                                                <AlignRightIcon />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Subtitle Section */}
                        <div className="section-container">
                            <div className="section-header">
                                <span>Subtitle</span>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={elements.some((el) => el.id === "subtitle")}
                                        onChange={() => {
                                            if (elements.some((el) => el.id === "subtitle")) {
                                                setElements(elements.filter((el) => el.id !== "subtitle"));
                                            } else {
                                                setElements([
                                                    ...elements,
                                                    {
                                                        id: "subtitle",
                                                        type: "subtitle",
                                                        x: 0,
                                                        y: 420,
                                                        width: 800,
                                                        height: 40,
                                                        zIndex: 2,
                                                        alignment: "center",
                                                    },
                                                ]);
                                            }
                                        }}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            {elements.some((el) => el.id === "subtitle") && (
                                <>
                                    <input
                                        type="text"
                                        value={content.subtitle}
                                        onChange={(e) =>
                                            handleContentChange("subtitle", e.target.value)
                                        }
                                        className="text-input"
                                        placeholder="Enter subtitle text"
                                    />
                                    <div className="color-picker">
                                        <label>Text Color</label>
                                        <div className="color-input-group">
                                            <input
                                                type="color"
                                                value={theme.secondaryTextColor}
                                                onChange={(e) =>
                                                    handleThemeChange("secondaryTextColor", e.target.value)
                                                }
                                                className="color-input"
                                            />
                                            <input
                                                type="text"
                                                value={theme.secondaryTextColor}
                                                onChange={(e) =>
                                                    handleThemeChange("secondaryTextColor", e.target.value)
                                                }
                                                className="color-text-input"
                                            />
                                        </div>
                                    </div>
                                    {selectedElement === "subtitle" && (
                                        <div className="alignment-buttons">
                                            <button
                                                onClick={() => handleAlignmentChange("subtitle", "left")}
                                                className={`align-button ${elements.find((el) => el.id === "subtitle").alignment === "left" ? "active" : ""}`}
                                            >
                                                <AlignLeftIcon />
                                            </button>
                                            <button
                                                onClick={() => handleAlignmentChange("subtitle", "center")}
                                                className={`align-button ${elements.find((el) => el.id === "subtitle").alignment === "center" ? "active" : ""}`}
                                            >
                                                <AlignCenterIcon />
                                            </button>
                                            <button
                                                onClick={() => handleAlignmentChange("subtitle", "right")}
                                                className={`align-button ${elements.find((el) => el.id === "subtitle").alignment === "right" ? "active" : ""}`}
                                            >
                                                <AlignRightIcon />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Button Section */}
                        <div className="section-container">
                            <div className="section-header">
                                <span>Button</span>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={elements.some((el) => el.id === "button")}
                                        onChange={() => {
                                            if (elements.some((el) => el.id === "button")) {
                                                setElements(elements.filter((el) => el.id !== "button"));
                                            } else {
                                                setElements([
                                                    ...elements,
                                                    {
                                                        id: "button",
                                                        type: "button",
                                                        x: 300,
                                                        y: 480,
                                                        width: 200,
                                                        height: 50,
                                                        zIndex: 2,
                                                        alignment: "center",
                                                    },
                                                ]);
                                            }
                                        }}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            {elements.some((el) => el.id === "button") && (
                                <>
                                    <input
                                        type="text"
                                        value={content.buttonText}
                                        onChange={(e) =>
                                            handleContentChange("buttonText", e.target.value)
                                        }
                                        className="text-input"
                                        placeholder="Enter button text"
                                    />
                                    <input
                                    type="text"
                                    value={content.buttonUrl || ""}
                                    placeholder="Button Redirect URL"
                                    onChange={(e) => setContent(prev => ({ ...prev, buttonUrl: e.target.value }))}
                                    className="text-input"
                                    />

                                    {selectedElement === "button" && (
                                        <div className="alignment-buttons">
                                            <button
                                                onClick={() => handleAlignmentChange("button", "left")}
                                                className={`align-button ${elements.find((el) => el.id === "button").alignment === "left" ? "active" : ""}`}
                                            >
                                                <AlignLeftIcon />
                                            </button>
                                            <button
                                                onClick={() => handleAlignmentChange("button", "center")}
                                                className={`align-button ${elements.find((el) => el.id === "button").alignment === "center" ? "active" : ""}`}
                                            >
                                                <AlignCenterIcon />
                                            </button>
                                            <button
                                                onClick={() => handleAlignmentChange("button", "right")}
                                                className={`align-button ${elements.find((el) => el.id === "button").alignment === "right" ? "active" : ""}`}
                                            >
                                                <AlignRightIcon />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Social Links Section */}
                        <div className="section-container">
                            <div className="section-header">
                                <span>Social Links</span>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={elements.some((el) => el.id === "social")}
                                        onChange={() => {
                                            if (elements.some((el) => el.id === "social")) {
                                                const updated = elements.filter((el) => el.id !== "social");
                                                setElements(updated);
                                            } else {
                                                setElements([
                                                    ...elements,
                                                    {
                                                        id: "social",
                                                        type: "social",
                                                        x: 300,
                                                        y: 550,
                                                        width: 200,
                                                        height: 60,
                                                        zIndex: 2,
                                                        alignment: "center",
                                                    },
                                                ]);
                                            }
                                        }}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            {elements.some((el) => el.id === "social") && (
                                <div className="social-links-container">
                                    <div className="social-link-item">
                                        <div className="social-link-info">
                                            <FacebookIcon />
                                            <span>Facebook</span>
                                        </div>
                                        <div className="social-link-controls">
                                            <input
                                                type="text"
                                                value={content.socialLinks.facebook.url}
                                                onChange={(e) =>
                                                    updateSocialLinkUrl("facebook", e.target.value)
                                                }
                                                className="url-input"
                                                placeholder="URL"
                                            />
                                            <label className="toggle-switch small">
                                                <input
                                                    type="checkbox"
                                                    checked={content.socialLinks.facebook.enabled}
                                                    onChange={() => toggleSocialLink("facebook")}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="social-link-item">
                                        <div className="social-link-info">
                                            <InstagramIcon />
                                            <span>Instagram</span>
                                        </div>
                                        <div className="social-link-controls">
                                            <input
                                                type="text"
                                                value={content.socialLinks.instagram.url}
                                                onChange={(e) =>
                                                    updateSocialLinkUrl("instagram", e.target.value)
                                                }
                                                className="url-input"
                                                placeholder="URL"
                                            />
                                            <label className="toggle-switch small">
                                                <input
                                                    type="checkbox"
                                                    checked={content.socialLinks.instagram.enabled}
                                                    onChange={() => toggleSocialLink("instagram")}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="social-link-item">
                                        <div className="social-link-info">
                                            <LinkedinIcon />
                                            <span>LinkedIn</span>
                                        </div>
                                        <div className="social-link-controls">
                                            <input
                                                type="text"
                                                value={content.socialLinks.linkedin.url}
                                                onChange={(e) =>
                                                    updateSocialLinkUrl("linkedin", e.target.value)
                                                }
                                                className="url-input"
                                                placeholder="URL"
                                            />
                                            <label className="toggle-switch small">
                                                <input
                                                    type="checkbox"
                                                    checked={content.socialLinks.linkedin.enabled}
                                                    onChange={() => toggleSocialLink("linkedin")}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="social-link-item">
                                        <div className="social-link-info">
                                            <MessageSquareIcon />
                                            <span>Message</span>
                                        </div>
                                        <div className="social-link-controls">
                                            <input
                                                type="text"
                                                value={content.socialLinks.message.url}
                                                onChange={(e) =>
                                                    updateSocialLinkUrl("message", e.target.value)
                                                }
                                                className="url-input"
                                                placeholder="mailto:email@example.com"
                                            />
                                            <label className="toggle-switch small">
                                                <input
                                                    type="checkbox"
                                                    checked={content.socialLinks.message.enabled}
                                                    onChange={() => toggleSocialLink("message")}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    {selectedElement === "social" && (
                                        <div className="alignment-buttons">
                                            <button
                                                onClick={() => handleAlignmentChange("social", "left")}
                                                className={`align-button ${elements.find((el) => el.id === "social").alignment === "left" ? "active" : ""}`}
                                            >
                                                <AlignLeftIcon />
                                            </button>
                                            <button
                                                onClick={() => handleAlignmentChange("social", "center")}
                                                className={`align-button ${elements.find((el) => el.id === "social").alignment === "center" ? "active" : ""}`}
                                            >
                                                <AlignCenterIcon />
                                            </button>
                                            <button
                                                onClick={() => handleAlignmentChange("social", "right")}
                                                className={`align-button ${elements.find((el) => el.id === "social").alignment === "right" ? "active" : ""}`}
                                            >
                                                <AlignRightIcon />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Custom Text Elements */}
                        {content.customTexts.length > 0 && (
                            <div className="section-container">
                                <h3 className="section-title">Custom Text Elements</h3>
                                <div className="custom-texts-list">
                                    {content.customTexts.map((text) => {
                                        const element = elements.find(
                                            (el) => el.type === "custom-text" && el.textId === text.id
                                        );
                                        if (!element) return null;

                                        return (
                                            <div
                                                key={text.id}
                                                className="custom-text-item"
                                            >
                                                <div className="custom-text-header">
                                                    <span>Text Element</span>
                                                    <button
                                                        onClick={() => {
                                                            setElements(
                                                                elements.filter((el) => el.id !== element.id)
                                                            );
                                                            setContent({
                                                                ...content,
                                                                customTexts: content.customTexts.filter(
                                                                    (t) => t.id !== text.id
                                                                ),
                                                            });
                                                        }}
                                                        className="delete-text-button"
                                                    >
                                                        <CloseIcon />
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={text.text}
                                                    onChange={(e) =>
                                                        updateCustomText(text.id, e.target.value)
                                                    }
                                                    className="text-input"
                                                    placeholder="Enter text"
                                                />
                                                <div className="text-style-controls">
                                                    <div className="text-style-group">
                                                        <label>Color</label>
                                                        <input
                                                            type="color"
                                                            value={text.color}
                                                            onChange={(e) =>
                                                                updateCustomTextColor(text.id, e.target.value)
                                                            }
                                                            className="color-input small"
                                                        />
                                                    </div>
                                                    <div className="text-style-group">
                                                        <label>Size</label>
                                                        <input
                                                            type="number"
                                                            value={text.fontSize}
                                                            onChange={(e) =>
                                                                updateCustomTextFontSize(text.id, e.target.value)
                                                            }
                                                            className="size-input"
                                                            min="8"
                                                            max="72"
                                                        />
                                                    </div>
                                                    <div className="text-style-group">
                                                        <label>Font</label>
                                                        <select
                                                            value={text.fontFamily}
                                                            onChange={(e) =>
                                                                updateCustomTextFontFamily(text.id, e.target.value)
                                                            }
                                                            className="font-select"
                                                        >
                                                            <option value="Arial, sans-serif">Arial</option>
                                                            <option value="Helvetica, sans-serif">Helvetica</option>
                                                            <option value="Times New Roman, serif">Times New Roman</option>
                                                            <option value="Georgia, serif">Georgia</option>
                                                            <option value="Courier New, monospace">Courier New</option>
                                                            <option value="Verdana, sans-serif">Verdana</option>
                                                        </select>
                                                    </div>
                                                    <div className="text-style-group">
                                                        <label>Weight</label>
                                                        <select
                                                            value={text.fontWeight}
                                                            onChange={(e) =>
                                                                updateCustomTextFontWeight(text.id, e.target.value)
                                                            }
                                                            className="weight-select"
                                                        >
                                                            <option value="normal">Normal</option>
                                                            <option value="bold">Bold</option>
                                                            <option value="lighter">Light</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                {selectedElement === element.id && (
                                                    <div className="alignment-buttons">
                                                        <button
                                                            onClick={() =>
                                                                handleAlignmentChange(element.id, "left")
                                                            }
                                                            className={`align-button small ${element.alignment === "left" ? "active" : ""}`}
                                                        >
                                                            <AlignLeftIcon />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleAlignmentChange(element.id, "center")
                                                            }
                                                            className={`align-button small ${element.alignment === "center" ? "active" : ""}`}
                                                        >
                                                            <AlignCenterIcon />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleAlignmentChange(element.id, "right")
                                                            }
                                                            className={`align-button small ${element.alignment === "right" ? "active" : ""}`}
                                                        >
                                                            <AlignRightIcon />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : activeTab === "themes" ? (
                    <div className="themes-tab">
                        {/* Prebuilt Themes */}
                        <div className="section-container">
                            <h3 className="section-title">Prebuilt Themes</h3>
                            <div className="themes-grid">
                                {prebuiltThemes.map((themeOption, index) => (
                                    <div
                                        key={index}
                                        className="theme-option"
                                        onClick={() => applyPrebuiltTheme(themeOption)}
                                    >
                                        <div className="theme-preview">
                                            <div
                                                className="theme-preview-color"
                                                style={{ backgroundColor: themeOption.backgroundColor }}
                                            ></div>
                                            <div
                                                className="theme-preview-color"
                                                style={{ backgroundColor: themeOption.primaryColor }}
                                            ></div>
                                            <div
                                                className="theme-preview-color"
                                                style={{ backgroundColor: themeOption.secondaryColor }}
                                            ></div>
                                        </div>
                                        <div className="theme-name">{themeOption.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Theme Settings */}
                        <div className="section-container">
                            <h3 className="section-title">Custom Theme</h3>
                            <div className="theme-settings">
                                <div className="theme-setting">
                                    <label>Background Color</label>
                                    <div className="color-input-group">
                                        <input
                                            type="color"
                                            value={theme.backgroundColor}
                                            onChange={(e) =>
                                                handleThemeChange("backgroundColor", e.target.value)
                                            }
                                            className="color-input"
                                        />
                                        <input
                                            type="text"
                                            value={theme.backgroundColor}
                                            onChange={(e) =>
                                                handleThemeChange("backgroundColor", e.target.value)
                                            }
                                            className="color-text-input"
                                        />
                                    </div>
                                </div>
                                <div className="theme-setting">
                                    <label>Primary Color</label>
                                    <div className="color-input-group">
                                        <input
                                            type="color"
                                            value={theme.primaryColor}
                                            onChange={(e) =>
                                                handleThemeChange("primaryColor", e.target.value)
                                            }
                                            className="color-input"
                                        />
                                        <input
                                            type="text"
                                            value={theme.primaryColor}
                                            onChange={(e) =>
                                                handleThemeChange("primaryColor", e.target.value)
                                            }
                                            className="color-text-input"
                                        />
                                    </div>
                                </div>
                                <div className="theme-setting">
                                    <label>Secondary Color</label>
                                    <div className="color-input-group">
                                        <input
                                            type="color"
                                            value={theme.secondaryColor}
                                            onChange={(e) =>
                                                handleThemeChange("secondaryColor", e.target.value)
                                            }
                                            className="color-input"
                                        />
                                        <input
                                            type="text"
                                            value={theme.secondaryColor}
                                            onChange={(e) =>
                                                handleThemeChange("secondaryColor", e.target.value)
                                            }
                                            className="color-text-input"
                                        />
                                    </div>
                                </div>
                                <div className="theme-setting">
                                    <label>Text Color</label>
                                    <div className="color-input-group">
                                        <input
                                            type="color"
                                            value={theme.textColor}
                                            onChange={(e) =>
                                                handleThemeChange("textColor", e.target.value)
                                            }
                                            className="color-input"
                                        />
                                        <input
                                            type="text"
                                            value={theme.textColor}
                                            onChange={(e) =>
                                                handleThemeChange("textColor", e.target.value)
                                            }
                                            className="color-text-input"
                                        />
                                    </div>
                                </div>
                                <div className="theme-setting">
                                    <label>Secondary Text Color</label>
                                    <div className="color-input-group">
                                        <input
                                            type="color"
                                            value={theme.secondaryTextColor}
                                            onChange={(e) =>
                                                handleThemeChange("secondaryTextColor", e.target.value)
                                            }
                                            className="color-input"
                                        />
                                        <input
                                            type="text"
                                            value={theme.secondaryTextColor}
                                            onChange={(e) =>
                                                handleThemeChange("secondaryTextColor", e.target.value)
                                            }
                                            className="color-text-input"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="settings-tab">
                        <div className="section-container">
                            <h3 className="section-title">Editor Settings</h3>
                            <div className="settings-list">
                                <div className="setting-item">
                                    <label>Show Grid</label>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={showGrid}
                                            onChange={() => setShowGrid(!showGrid)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="setting-item">
                                    <label>Snap to Grid</label>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={snapToGrid}
                                            onChange={() => setSnapToGrid(!snapToGrid)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="setting-item">
                                    <label>Grid Size</label>
                                    <input
                                        type="range"
                                        min="5"
                                        max="20"
                                        value={gridSize}
                                        onChange={(e) => setGridSize(parseInt(e.target.value))}
                                        className="grid-size-slider"
                                    />
                                    <span>{gridSize}px</span>
                                </div>
                                <div className="setting-item">
                                    <label>Canvas Width</label>
                                    <input
                                        type="number"
                                        value={canvasSize.width}
                                        onChange={(e) => setCanvasSize(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                                        className="size-input"
                                        min="400"
                                        max="2000"
                                    />
                                </div>
                                <div className="setting-item">
                                    <label>Canvas Height</label>
                                    <input
                                        type="number"
                                        value={canvasSize.height}
                                        onChange={(e) => setCanvasSize(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                                        className="size-input"
                                        min="300"
                                        max="2000"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}