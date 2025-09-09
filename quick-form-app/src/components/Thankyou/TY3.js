import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  Search,
  Instagram,
  Facebook,
  Linkedin,
  MessageSquare,
  Image as ImageIcon,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Minus,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import FileUpload from "../file-upload/file-upload";

// Mock API for backend storage simulation
const mockApi = {
  saveElements: async (elements) => {
    return { success: true };
  },
  fetchElements: async () => {
    return [];
  },
};

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

export default function ThankYouPageEditor({
  formVersionId,
  elements,
  setElements,
  content,
  setContent,
  theme,
  setTheme,
}) {
  // State management
  const [url, setUrl] = useState({});
  const [activeTab, setActiveTab] = useState("layout");

  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [scale, setScale] = useState(1);
  const dragRef = useRef({ startX: 0, startY: 0 });
  const resizeInfoRef = useRef(null);
  const canvasRef = useRef(null);
  // Save elements to backend on change
  const saveToBackend = async () => {
    try {
      await mockApi.saveElements(elements);
    } catch (error) {
      console.error("Error saving elements:", error);
    }
  };
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
          x: 100 + prev.length * 30,
          y: 100 + prev.length * 30,
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
    // imgObj: { backgroundImage: url }
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

    // Add image element to canvas at default position (adjust as needed)
    setElements((prev) => [
      ...prev,
      {
        id: `image-${uuidv4()}`,
        type: "image",
        x: 100 + prev.length * 30, // staggered placement
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Calculate offset accounting for scale
    const offsetX = (e.clientX - rect.left) / scale - element.x;
    const offsetY = (e.clientY - rect.top) / scale - element.y;

    dragRef.current = { offsetX, offsetY };
    e.stopPropagation();
  };

  const handleDrag = (e) => {
    if (!isDragging || !selectedElement) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const element = elements.find((el) => el.id === selectedElement);
    const { offsetX, offsetY } = dragRef.current;

    // New position, accounting for desktop scaling
    let newX = (e.clientX - rect.left) / scale - offsetX;
    let newY = (e.clientY - rect.top) / scale - offsetY;

    // Boundary conditions - prevent leaving canvas
    newX = Math.max(0, Math.min(newX, rect.width / scale - element.width));
    newY = Math.max(0, Math.min(newY, rect.height / scale - element.height));

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

    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const canvasWidth = canvasRect.width;
    const canvasHeight = canvasRect.height;

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
        Math.min(startWidth + deltaX, canvasWidth - newX)
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
        Math.min(startHeight + deltaY, canvasHeight - newY)
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
  useEffect(()=>{
    console.log("Elements= >", elements , content)
  },[elements, content])
  // Remove image
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

  // Zoom in/out
  const handleZoom = (direction) => {
    setScale((prev) => {
      const newScale = direction === "in" ? prev * 1.1 : prev / 1.1;
      return Math.min(Math.max(newScale, 0.5), 2); // Limit zoom between 0.5x and 2x
    });
  };

  // Set image for image element
  const setImageForElement = (elementId, imageId) => {
    setElements((prev) =>
      prev.map((el) => (el.id === elementId ? { ...el, imageId } : el))
    );
  };

  return (
    <div
      className="min-h-[80%] bg-gray-100 flex"
      onMouseMove={handleDrag}
      onMouseUp={handleDragEnd}
    >
      {/* Main Canvas Area */}
      <div className="flex-1 overflow-auto relative">
        {/* <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white p-2 rounded-lg shadow">
          <button
            onClick={() => handleZoom("in")}
            disabled={scale >= 1.2}
            className="login-button p-1 hover:bg-gray-100 rounded"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <span className="text-sm flex items-center px-2">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => handleZoom("out")}
            className="login-button p-1 hover:bg-gray-100 rounded"
            title="Zoom Out"
            disabled={scale <= 0.7}
          >
            <Minus className="w-4 h-4" />
          </button>
        </div> */}

        <div
          className="absolute border border-gray-200 bg-white rounded-lg shadow-lg"
          style={{
            width: "min(95vw, 1000px)", // Responsive width
            height: "min(80vw, 700px)", // Responsive height (adjust 80vw as needed)
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) scale(${scale})`,
            backgroundColor: theme.backgroundColor,
            transformOrigin: "center center",
          }}
          ref={canvasRef}
        >
          {elements.map((element) => {
            const elementStyle = {
              left: `${element.x  * scale}px`,
              top: `${element.y  * scale}px`,
              width: `${element.width  * scale}px`,
              height: `${element.height  * scale}px`,
              zIndex: element.zIndex,
              display: "flex",
              justifyContent: element.alignment,
              alignItems: "center",
              // transform: `scale(${1 / scale})`, // Counteract parent scale for elements
              // transformOrigin: "top left",
            };

            return (
              <div
                key={element.id}
                className={`absolute border-2 ${
                  selectedElement === element.id
                    ? "border-blue-500"
                    : "border-transparent"
                } cursor-move`}
                style={elementStyle}
                onMouseDown={(e) => handleDragStart(e, element.id)}
                onClick={() => setSelectedElement(element.id)}
              >
                {element.type === "image" && (
                  <div className="w-full h-full relative">
                    <img
                      src={
                        content.images.find((img) => img?.id === element.imageId)?.url || ""
                      }
                      alt="Thank you page background"
                      className="w-full h-full object-cover rounded"
                    />

                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition">
                      <button className="p-2 bg-white/90 rounded-full">
                        <ImageIcon className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>
                  </div>
                )}
                {element.type === "title" && (
                  <h1
                    className="text-4xl font-bold w-full"
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
                    className="text-lg w-full"
                    style={{
                      color: theme.secondaryTextColor,
                      textAlign: element.alignment,
                    }}
                  >
                    {content.subtitle}
                  </p>
                )}
                {element.type === "button" && (
                  <button
                    className="px-8 py-3 text-lg rounded-md w-full h-full"
                    style={{
                      backgroundColor: theme.primaryColor,
                      color: "white",
                    }}
                  >
                    {content.buttonText}
                  </button>
                )}
                {element.type === "social" && (
                  <div className="flex justify-center gap-4 w-full h-full items-center">
                    {content.socialLinks.facebook.enabled && (
                      <a
                        href={content.socialLinks.facebook.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition"
                        style={{ backgroundColor: theme.secondaryColor }}
                      >
                        <Facebook className="w-6 h-6 text-white" />
                      </a>
                    )}
                    {content.socialLinks.instagram.enabled && (
                      <a
                        href={content.socialLinks.instagram.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition"
                        style={{ backgroundColor: theme.secondaryColor }}
                      >
                        <Instagram className="w-6 h-6 text-white" />
                      </a>
                    )}
                    {content.socialLinks.linkedin.enabled && (
                      <a
                        href={content.socialLinks.linkedin.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition"
                        style={{ backgroundColor: theme.secondaryColor }}
                      >
                        <Linkedin className="w-6 h-6 text-white" />
                      </a>
                    )}
                    {content.socialLinks.message.enabled && (
                      <a
                        href={content.socialLinks.message.url}
                        className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition"
                        style={{ backgroundColor: theme.secondaryColor }}
                      >
                        <MessageSquare className="w-6 h-6 text-white" />
                      </a>
                    )}
                  </div>
                )}
                {element.type === "custom-text" && (
                  <div className="w-full h-full flex items-center p-2">
                    <p
                      className="w-full"
                      style={{
                        color:
                          content.customTexts.find(
                            (t) => t.id === element.textId
                          )?.color || theme.textColor,
                        textAlign: element.alignment,
                        fontSize: "16px",
                        lineHeight: "1.5",
                      }}
                    >
                      {content.customTexts.find((t) => t.id === element.textId)
                        ?.text || ""}
                    </p>
                  </div>
                )}
                {selectedElement === element.id && (
                  <>
                    {[
                      {
                        dir: "top-left",
                        styles:
                          "top-0 left-0 -translate-x-1/2 -translate-y-1/2",
                        cursor: "nwse-resize",
                      },
                      {
                        dir: "top",
                        styles:
                          "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
                        cursor: "ns-resize",
                      },
                      {
                        dir: "top-right",
                        styles:
                          "top-0 right-0 translate-x-1/2 -translate-y-1/2",
                        cursor: "nesw-resize",
                      },
                      {
                        dir: "right",
                        styles:
                          "top-1/2 right-0 -translate-y-1/2 translate-x-1/2",
                        cursor: "ew-resize",
                      },
                      {
                        dir: "bottom-right",
                        styles:
                          "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
                        cursor: "nwse-resize",
                      },
                      {
                        dir: "bottom",
                        styles:
                          "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
                        cursor: "ns-resize",
                      },
                      {
                        dir: "bottom-left",
                        styles:
                          "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
                        cursor: "nesw-resize",
                      },
                      {
                        dir: "left",
                        styles:
                          "top-1/2 left-0 -translate-y-1/2 -translate-x-1/2",
                        cursor: "ew-resize",
                      },
                    ].map((h) => (
                      <div
                        key={h.dir}
                        className={`absolute w-3 h-3 border-2 border-blue-500 bg-white rounded-full shadow ${h.cursor} z-10 ${h.styles}`}
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

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Customize</h2>
          </div>
          <button
            className=" text-sm text-blue-600 hover:text-blue-700 transition"
            onClick={() => {
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
                subtitle:
                  "We have received your message and will get back to you shortly.",
                buttonText: "Explore More",
                images: [defaultImage],
                socialLinks: {
                  facebook: { enabled: true, url: "https://facebook.com" },
                  instagram: { enabled: true, url: "https://instagram.com" },
                  linkedin: { enabled: true, url: "https://linkedin.com" },
                  message: { enabled: true, url: "mailto:contact@example.com" },
                },
                customTexts: [],
              });
              setElements([
                {
                  id: "image",
                  type: "image",
                  x: 0,
                  y: 0,
                  width: 800,
                  height: 320,
                  zIndex: 1,
                  alignment: "center",
                  imageId: defaultImage.id,
                },
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
              setScale(1);
            }}
          >
            Reset All
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-gray-50 rounded-lg p-1">
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "layout"
                ? "bg-white shadow-sm text-blue-600"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("layout")}
          >
            Layout
          </button>
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "themes"
                ? "bg-white shadow-sm text-blue-600"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("themes")}
          >
            Themes
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search elements..."
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {activeTab === "layout" ? (
          <div className="space-y-6">
            {/* Add Text Button */}
            <button
              onClick={addTextElement}
              className="login-button w-full py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition"
            >
              <AlignLeft className="w-4 h-4" />
              Add Text Box
            </button>

            {/* Image Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Manage Media
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={elements.some((el) => el.type === "image")}
                    onChange={() => {
                      if (elements.some((el) => el.type === "image")) {
                        // Turning OFF
                        setElements(elements.filter((el) => el.type !== "image"));
                      } else {
                        // Turning ON
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
                    
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              {elements.some((el) => el.type === "image") && (
                <>
                  <div className="mb-3 space-y-2 max-h-40 overflow-y-auto">
                    {content.images.map((image) => (
                      <div
                        key={image?.id}
                        className="flex items-center justify-between p-2 bg-white rounded border"
                      >
                        <span className="text-sm truncate max-w-[120px]">
                          {image?.name}
                        </span>
                        <div className="flex gap-2">
                          {selectedElement &&
                            elements.find((el) => el.id === selectedElement)
                              ?.type === "image" && (
                              <button
                                onClick={() =>
                                  setImageForElement(selectedElement, image.id)
                                }
                                className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                              >
                                Use
                              </button>
                            )}
                          <button
                            onClick={() => removeImage(image.id)}
                            className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* <label className="login-button cursor-pointer px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"> */}
                  {/* <ImagePlus className="w-4 h-4" /> */}
                  {content.images.length < 4 && (
                  <FileUpload
                    acceptedFileTypes={".png,.jpg,.jpeg"}
                    setDesign={(imgObj) => {
                      if (content.images.length >= 4) return; // safety guard
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

                  {/* </label> */}
                  {selectedElement &&
                    elements.find((el) => el.id === selectedElement)?.type ===
                      "image" && (
                        <select
                        value={
                          elements.find((el) => el.id === selectedElement)?.imageId || ""
                        }
                        onChange={(e) => setImageForElement(selectedElement, e.target.value)}
                        className="text-xs px-2 py-1 border rounded w-32"
                      >
                        {content.images.map((img) =>
                          img?.id ? (
                            <option key={img.id} value={img.id}>
                              {img.name}
                            </option>
                          ) : null
                        )}
                      </select>
                      
                    )}
                </>
              )}
            </div>

            {/* Title Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Title</span>
                <label className="relative inline-flex items-center cursor-pointer">
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
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="Enter title text"
                  />
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.textColor}
                        onChange={(e) =>
                          handleThemeChange("textColor", e.target.value)
                        }
                        className="w-8 h-8 cursor-pointer rounded"
                      />
                      <input
                        type="text"
                        value={theme.textColor}
                        onChange={(e) =>
                          handleThemeChange("textColor", e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </div>
                  </div>
                  {selectedElement === "title" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleAlignmentChange("title", "left")}
                        className={`p-2 rounded ${
                          elements.find((el) => el.id === "title").alignment ===
                          "left"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        } hover:bg-blue-200 transition`}
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAlignmentChange("title", "center")}
                        className={`p-2 rounded ${
                          elements.find((el) => el.id === "title").alignment ===
                          "center"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        } hover:bg-blue-200 transition`}
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAlignmentChange("title", "right")}
                        className={`p-2 rounded ${
                          elements.find((el) => el.id === "title").alignment ===
                          "right"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        } hover:bg-blue-200 transition`}
                      >
                        <AlignRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Subtitle Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Subtitle
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={elements.some((el) => el.id === "subtitle")}
                    onChange={() => {
                      if (elements.some((el) => el.id === "subtitle")) {
                        setElements(
                          elements.filter((el) => el.id !== "subtitle")
                        );
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
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="Enter subtitle text"
                  />
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.secondaryTextColor}
                        onChange={(e) =>
                          handleThemeChange(
                            "secondaryTextColor",
                            e.target.value
                          )
                        }
                        className="w-8 h-8 cursor-pointer rounded"
                      />
                      <input
                        type="text"
                        value={theme.secondaryTextColor}
                        onChange={(e) =>
                          handleThemeChange(
                            "secondaryTextColor",
                            e.target.value
                          )
                        }
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </div>
                  </div>
                  {selectedElement === "subtitle" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() =>
                          handleAlignmentChange("subtitle", "left")
                        }
                        className={`p-2 rounded ${
                          elements.find((el) => el.id === "subtitle")
                            .alignment === "left"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        } hover:bg-blue-200 transition`}
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleAlignmentChange("subtitle", "center")
                        }
                        className={`p-2 rounded ${
                          elements.find((el) => el.id === "subtitle")
                            .alignment === "center"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        } hover:bg-blue-200 transition`}
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleAlignmentChange("subtitle", "right")
                        }
                        className={`p-2 rounded ${
                          elements.find((el) => el.id === "subtitle")
                            .alignment === "right"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        } hover:bg-blue-200 transition`}
                      >
                        <AlignRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Button Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Button
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={elements.some((el) => el.id === "button")}
                    onChange={() => {
                      if (elements.some((el) => el.id === "button")) {
                        setElements(
                          elements.filter((el) => el.id !== "button")
                        );
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
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="Enter button text"
                  />
                  {selectedElement === "button" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleAlignmentChange("button", "left")}
                        className={`p-2 rounded ${
                          elements.find((el) => el.id === "button")
                            .alignment === "left"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        } hover:bg-blue-200 transition`}
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleAlignmentChange("button", "center")
                        }
                        className={`p-2 rounded ${
                          elements.find((el) => el.id === "button")
                            .alignment === "center"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        } hover:bg-blue-200 transition`}
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAlignmentChange("button", "right")}
                        className={`p-2 rounded ${
                          elements.find((el) => el.id === "button")
                            .alignment === "right"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        } hover:bg-blue-200 transition`}
                      >
                        <AlignRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Social Links Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Social Links
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={elements.some((el) => el.id === "social")}
                    onChange={() => {
                      if (elements.some((el) => el.id === "social")) {
                        setElements(
                          elements.filter((el) => el.id !== "social")
                        );
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
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              {elements.some((el) => el.id === "social") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Facebook className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-600">Facebook</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={content.socialLinks.facebook.url}
                        onChange={(e) =>
                          updateSocialLinkUrl("facebook", e.target.value)
                        }
                        className="text-xs px-2 py-1 border rounded w-32"
                        placeholder="URL"
                      />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={content.socialLinks.facebook.enabled}
                          onChange={() => toggleSocialLink("facebook")}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-pink-600" />
                      <span className="text-sm text-gray-600">Instagram</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={content.socialLinks.instagram.url}
                        onChange={(e) =>
                          updateSocialLinkUrl("instagram", e.target.value)
                        }
                        className="text-xs px-2 py-1 border rounded w-32"
                        placeholder="URL"
                      />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={content.socialLinks.instagram.enabled}
                          onChange={() => toggleSocialLink("instagram")}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4 text-blue-700" />
                      <span className="text-sm text-gray-600">LinkedIn</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={content.socialLinks.linkedin.url}
                        onChange={(e) =>
                          updateSocialLinkUrl("linkedin", e.target.value)
                        }
                        className="text-xs px-2 py-1 border rounded w-32"
                        placeholder="URL"
                      />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={content.socialLinks.linkedin.enabled}
                          onChange={() => toggleSocialLink("linkedin")}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-600">Message</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={content.socialLinks.message.url}
                        onChange={(e) =>
                          updateSocialLinkUrl("message", e.target.value)
                        }
                        className="text-xs px-2 py-1 border rounded w-32"
                        placeholder="mailto:email@example.com"
                      />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={content.socialLinks.message.enabled}
                          onChange={() => toggleSocialLink("message")}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                  </div>
                  {selectedElement === "social" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleAlignmentChange("social", "left")}
                        className={`p-2 rounded ${
                          elements.find((el) => el.id === "social")
                            .alignment === "left"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        } hover:bg-blue-200 transition`}
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleAlignmentChange("social", "center")
                        }
                        className={`p-2 rounded ${
                          elements.find((el) => el.id === "social")
                            .alignment === "center"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        } hover:bg-blue-200 transition`}
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAlignmentChange("social", "right")}
                        className={`p-2 rounded ${
                          elements.find((el) => el.id === "social")
                            .alignment === "right"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        } hover:bg-blue-200 transition`}
                      >
                        <AlignRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Custom Text Elements */}
            {content.customTexts.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Custom Text Elements
                </h3>
                <div className="space-y-3">
                  {content.customTexts.map((text) => {
                    const element = elements.find(
                      (el) => el.type === "custom-text" && el.textId === text.id
                    );
                    if (!element) return null;

                    return (
                      <div
                        key={text.id}
                        className="bg-white p-3 rounded border"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium">
                            Text Element
                          </span>
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
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={text.text}
                          onChange={(e) =>
                            updateCustomText(text.id, e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border rounded mb-2"
                          placeholder="Enter text"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={text.color}
                            onChange={(e) =>
                              updateCustomTextColor(text.id, e.target.value)
                            }
                            className="w-6 h-6 cursor-pointer rounded"
                          />
                          <span className="text-xs text-gray-500">Color</span>
                        </div>
                        {selectedElement === element.id && (
                          <div className="mt-2 flex gap-1">
                            <button
                              onClick={() =>
                                handleAlignmentChange(element.id, "left")
                              }
                              className={`p-1 rounded ${
                                element.alignment === "left"
                                  ? "bg-blue-100"
                                  : "bg-gray-100"
                              } hover:bg-blue-200 transition`}
                            >
                              <AlignLeft className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() =>
                                handleAlignmentChange(element.id, "center")
                              }
                              className={`p-1 rounded ${
                                element.alignment === "center"
                                  ? "bg-blue-100"
                                  : "bg-gray-100"
                              } hover:bg-blue-200 transition`}
                            >
                              <AlignCenter className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() =>
                                handleAlignmentChange(element.id, "right")
                              }
                              className={`p-1 rounded ${
                                element.alignment === "right"
                                  ? "bg-blue-100"
                                  : "bg-gray-100"
                              } hover:bg-blue-200 transition`}
                            >
                              <AlignRight className="w-3 h-3" />
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
        ) : (
          <div className="space-y-6">
            {/* Prebuilt Themes */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Prebuilt Themes
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {prebuiltThemes.map((themeOption, index) => (
                  <div
                    key={index}
                    className="cursor-pointer rounded overflow-hidden border"
                    onClick={() => applyPrebuiltTheme(themeOption)}
                  >
                    <div
                      className="h-4"
                      style={{ backgroundColor: themeOption.backgroundColor }}
                    ></div>
                    <div
                      className="h-4"
                      style={{ backgroundColor: themeOption.primaryColor }}
                    ></div>
                    <div
                      className="h-4"
                      style={{ backgroundColor: themeOption.secondaryColor }}
                    ></div>
                    <div className="p-1 text-xs text-center truncate">
                      {themeOption.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Theme Settings */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Custom Theme
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.backgroundColor}
                      onChange={(e) =>
                        handleThemeChange("backgroundColor", e.target.value)
                      }
                      className="w-8 h-8 cursor-pointer rounded"
                    />
                    <input
                      type="text"
                      value={theme.backgroundColor}
                      onChange={(e) =>
                        handleThemeChange("backgroundColor", e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) =>
                        handleThemeChange("primaryColor", e.target.value)
                      }
                      className="w-8 h-8 cursor-pointer rounded"
                    />
                    <input
                      type="text"
                      value={theme.primaryColor}
                      onChange={(e) =>
                        handleThemeChange("primaryColor", e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.secondaryColor}
                      onChange={(e) =>
                        handleThemeChange("secondaryColor", e.target.value)
                      }
                      className="w-8 h-8 cursor-pointer rounded"
                    />
                    <input
                      type="text"
                      value={theme.secondaryColor}
                      onChange={(e) =>
                        handleThemeChange("secondaryColor", e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
