import { useState, useRef, useEffect } from 'react';
import {
    Eye, Save, ChevronRight, Search, Instagram, Facebook, Linkedin,
    MessageSquare, Image as ImageIcon, Palette, SlidersHorizontal, X,
    Move, Maximize2, ImagePlus, AlignLeft, AlignCenter, AlignRight,
    Plus, Minus, Link as LinkIcon
} from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, useTexture, Text3D, Float, useCursor } from '@react-three/drei';
import * as THREE from 'three';

// Mock API for backend storage simulation
const mockApi = {
    saveElements: async (elements) => {
        return { success: true };
    },
    fetchElements: async () => {
        return [];
    }
};

// Prebuilt themes
const prebuiltThemes = [
    {
        name: "Ocean Blue",
        backgroundColor: '#f0f8ff',
        primaryColor: '#0077b6',
        secondaryColor: '#00b4d8',
        textColor: '#0b0a0a',
        secondaryTextColor: '#5f6165'
    },
    {
        name: "Forest Green",
        backgroundColor: '#f0fff0',
        primaryColor: '#2e8b57',
        secondaryColor: '#3cb371',
        textColor: '#0b0a0a',
        secondaryTextColor: '#5f6165'
    },
    {
        name: "Sunset Orange",
        backgroundColor: '#fff5ee',
        primaryColor: '#ff7f50',
        secondaryColor: '#ff6347',
        textColor: '#0b0a0a',
        secondaryTextColor: '#5f6165'
    }
];

// Three.js Background Component
function ThreeDBackground({ theme }) {
  const meshRef = useRef();
  const particlesRef = useRef();
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.05;
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.03;
    }
    
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.001;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color={theme.secondaryColor} />
      
      {/* Main floating shape */}
      <mesh ref={meshRef} position={[0, 0, -15]}>
        <icosahedronGeometry args={[4, 1]} />
        <meshStandardMaterial 
          color={theme.primaryColor} 
          wireframe 
          transparent 
          opacity={0.1} 
          wireframeLinewidth={2}
        />
      </mesh>
      
      {/* Floating box */}
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <mesh position={[5, 3, -12]}>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial 
            color={theme.secondaryColor} 
            transparent 
            opacity={0.3} 
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
      </Float>
      
      {/* Floating torus */}
      <Float speed={3} rotationIntensity={0.5} floatIntensity={1}>
        <mesh position={[-4, -2, -8]}>
          <torusGeometry args={[1.2, 0.4, 16, 32]} />
          <meshStandardMaterial 
            color={theme.primaryColor} 
            transparent 
            opacity={0.2}
            roughness={0.7}
          />
        </mesh>
      </Float>
      
      {/* Particles */}
      <points ref={particlesRef}>
        <bufferGeometry attach="geometry">
          <bufferAttribute
            attach="attributes-position"
            count={200}
            array={new Float32Array(
              Array(200 * 3)
                .fill()
                .map(() => (Math.random() - 0.5) * 20)
            )}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          attach="material"
          size={0.1}
          sizeAttenuation
          color={theme.secondaryColor}
          transparent
          opacity={0.8}
        />
      </points>
    </>
  );
}

// Animated Button Component
function AnimatedButton({ content, theme, position, scale, isSelected }) {
  const buttonRef = useRef();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  
  useFrame(({ clock }) => {
    if (buttonRef.current) {
      // Subtle pulsing animation
      const pulseIntensity = isSelected ? 0.1 : 0.05;
      const hoverEffect = hovered ? 1.1 : 1;
      buttonRef.current.scale.x = (1 + Math.sin(clock.getElapsedTime() * 2) * pulseIntensity) * hoverEffect;
      buttonRef.current.scale.y = (1 + Math.cos(clock.getElapsedTime() * 2) * pulseIntensity) * hoverEffect;
    }
  });

  return (
    <group 
      ref={buttonRef} 
      position={position} 
      scale={scale}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh>
        <boxGeometry args={[2, 0.5, 0.2]} />
        <meshStandardMaterial 
          color={hovered ? theme.primaryColor : theme.secondaryColor} 
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      <Text3D
        font="/fonts/helvetiker_regular.typeface.json"
        size={0.2}
        height={0.05}
        position={[-0.9, -0.1, 0.11]}
        rotation={[0, 0, 0]}
      >
        {content.buttonText}
        <meshStandardMaterial color="#ffffff" />
      </Text3D>
    </group>
  );
}

// Animated Text Component
function AnimatedText({ text, color, position, scale, isTitle = false }) {
  const textRef = useRef();
  
  useFrame(({ clock }) => {
    if (textRef.current) {
      // Subtle floating animation
      textRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 0.5) * 0.03;
    }
  });

  return (
    <Text3D
      ref={textRef}
      font="/fonts/helvetiker_regular.typeface.json"
      size={isTitle ? 0.4 : 0.25}
      height={0.05}
      position={position}
      scale={scale}
      curveSegments={12}
      bevelEnabled
      bevelThickness={0.02}
      bevelSize={0.02}
      bevelOffset={0}
      bevelSegments={5}
    >
      {text}
      <meshStandardMaterial 
        color={color} 
        roughness={0.3}
        metalness={0.1}
      />
    </Text3D>
  );
}

export default function ThankYouPageEditor() {
    // State management
    const [url, setUrl] = useState({});
    const [activeTab, setActiveTab] = useState('layout');
    const [theme, setTheme] = useState({
        backgroundColor: '#ffffff',
        primaryColor: '#028ab0',
        secondaryColor: '#ffbb1b',
        textColor: '#0b0a0a',
        secondaryTextColor: '#5f6165'
    });
    const [content, setContent] = useState({
        title: "Thank You for Your Submission!",
        subtitle: "We have received your message and will get back to you shortly.",
        buttonText: "Explore More",
        images: [{ id: uuidv4(), url: "/placeholder.svg", name: "Main Image" }],
        socialLinks: {
            facebook: { enabled: true, url: "https://facebook.com" },
            instagram: { enabled: true, url: "https://instagram.com" },
            linkedin: { enabled: true, url: "https://linkedin.com" },
            message: { enabled: true, url: "mailto:contact@example.com" }
        },
        customTexts: []
    });
    const [elements, setElements] = useState([
        { id: 'image', type: 'image', x: 150, y: 0, width: 800, height: 320, zIndex: 1, alignment: 'center', imageId: content.images[0].id },
        { id: 'title', type: 'title', x: 150, y: 340, width: 800, height: 60, zIndex: 2, alignment: 'center' },
        { id: 'subtitle', type: 'subtitle', x: 150, y: 420, width: 800, height: 40, zIndex: 2, alignment: 'center' },
        { id: 'button', type: 'button', x:450, y: 480, width: 200, height: 50, zIndex: 2, alignment: 'center' },
        { id: 'social', type: 'social', x: 450, y: 550, width: 200, height: 60, zIndex: 2, alignment: 'center' }
    ]);
    const [selectedElement, setSelectedElement] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [scale, setScale] = useState(1);
    const [enable3D, setEnable3D] = useState(true);
    const dragRef = useRef({ startX: 0, startY: 0 });
    const resizeInfoRef = useRef(null);
    const canvasRef = useRef(null);

    // Save elements to backend on change
    useEffect(() => {
        const saveToBackend = async () => {
            try {
                await mockApi.saveElements(elements);
            } catch (error) {
                console.error('Error saving elements:', error);
            }
        };
        saveToBackend();
    }, [elements]);

    // Handle image upload
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const newImage = {
                    id: uuidv4(),
                    url: event.target.result,
                    name: file.name
                };
                setContent({
                    ...content,
                    images: [...content.images, newImage]
                });
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle drag start
    const handleDragStart = (e, id) => {
        setIsDragging(true);
        setSelectedElement(id);
        dragRef.current = {
            startX: e.clientX - elements.find(el => el.id === id).x,
            startY: e.clientY - elements.find(el => el.id === id).y 
        };
        e.stopPropagation();
    };

    // Handle drag with boundary checks
    const handleDrag = (e) => {
        if (!isDragging || !selectedElement) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        const canvasLeft = canvasRect.left;
        const canvasTop = canvasRect.top;
        const canvasWidth = canvasRect.width;
        const canvasHeight = canvasRect.height;
        
        const element = elements.find(el => el.id === selectedElement);
        let newX = e.clientX - dragRef.current.startX + canvasLeft ;
        let newY = e.clientY - dragRef.current.startY + canvasTop ;
        
        // Boundary checks
        newX = Math.max(0, Math.min(newX, canvasWidth - element.width));
        newY = Math.max(0, Math.min(newY, canvasHeight - element.height));
        
        setElements(elements.map(el =>
            el.id === selectedElement ? { ...el, x: newX, y: newY } : el
        ));
    };

    // Handle drag end
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
        
        const { id, direction, startX, startY, startWidth, startHeight, startLeft, startTop } = resizeInfoRef.current;
        let deltaX = e.clientX - startX;
        let deltaY = e.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newX = startLeft;
        let newY = startTop;

        const minW = 40;
        const minH = 20;

        if (direction.includes('right')) {
            newWidth = Math.max(minW, Math.min(startWidth + deltaX, canvasWidth - newX));
        }
        if (direction.includes('left')) {
            newWidth = Math.max(minW, startWidth - deltaX);
            if (newWidth !== minW) {
                newX = Math.max(0, Math.min(startLeft + deltaX, startLeft + startWidth - minW));
                newWidth = startWidth - (newX - startLeft);
            }
        }
        if (direction.includes('bottom')) {
            newHeight = Math.max(minH, Math.min(startHeight + deltaY, canvasHeight - newY));
        }
        if (direction.includes('top')) {
            newHeight = Math.max(minH, startHeight - deltaY);
            if (newHeight !== minH) {
                newY = Math.max(0, Math.min(startTop + deltaY, startTop + startHeight - minH));
                newHeight = startHeight - (newY - startTop);
            }
        }

        setElements(el =>
            el.map(o =>
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
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [isResizing]);

    // Handle resize start
    const handleResizeStart = (e, id, direction) => {
        setIsResizing(true);
        setSelectedElement(id);
        const element = elements.find(el => el.id === id);
        resizeInfoRef.current = {
            id,
            direction,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: element.width,
            startHeight: element.height,
            startLeft: element.x,
            startTop: element.y
        };
        e.stopPropagation();
    };

    // Handle alignment change
    const handleAlignmentChange = (id, alignment) => {
        setElements(elements.map(el =>
            el.id === id ? { ...el, alignment } : el
        ));
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
            secondaryTextColor: theme.secondaryTextColor
        });
    };

    // Add new text element
    const addTextElement = () => {
        const newText = {
            id: `text-${uuidv4()}`,
            text: "New Text",
            color: theme.textColor
        };
        
        const newElement = {
            id: `custom-text-${uuidv4()}`,
            type: 'custom-text',
            textId: newText.id,
            x: 100,
            y: 100,
            width: 200,
            height: 40,
            zIndex: 3,
            alignment: 'left'
        };
        
        setContent({
            ...content,
            customTexts: [...content.customTexts, newText]
        });
        
        setElements([...elements, newElement]);
        setSelectedElement(newElement.id);
    };

    // Remove image
    const removeImage = (id) => {
        // Remove any elements using this image
        const updatedElements = elements.filter(el => 
            !(el.type === 'image' && el.imageId === id)
        );
        
        setElements(updatedElements);
        setContent({
            ...content,
            images: content.images.filter(img => img.id !== id)
        });
    };

    // Update custom text
    const updateCustomText = (id, text) => {
        setContent({
            ...content,
            customTexts: content.customTexts.map(t => 
                t.id === id ? { ...t, text } : t
            )
        });
    };

    // Update custom text color
    const updateCustomTextColor = (id, color) => {
        setContent({
            ...content,
            customTexts: content.customTexts.map(t => 
                t.id === id ? { ...t, color } : t
            )
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
                    url
                }
            }
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
                    enabled: !content.socialLinks[platform].enabled
                }
            }
        });
    };

    // Zoom in/out
    const handleZoom = (direction) => {
        setScale(prev => {
            const newScale = direction === 'in' ? prev * 1.1 : prev / 1.1;
            return Math.min(Math.max(newScale, 0.5), 2); // Limit zoom between 0.5x and 2x
        });
    };

    // Set image for image element
    const setImageForElement = (elementId, imageId) => {
        setElements(elements.map(el => 
            el.id === elementId ? { ...el, imageId } : el
        ));
    };

    // Transition styles for smooth animations
    const transitionStyles = {
        transition: 'all 0.3s ease-out',
        willChange: 'transform, opacity'
    };

    return (
        <div className="min-h-[80%] bg-gray-100 flex" onMouseMove={handleDrag} onMouseUp={handleDragEnd}>
            {/* Main Canvas Area */}
            <div className="flex-1 p-8 overflow-auto relative">
                <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white p-2 rounded-lg shadow">
                    <button 
                        onClick={() => setEnable3D(!enable3D)}
                        className={`p-1 rounded ${enable3D ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                        title="Toggle 3D"
                    >
                        {enable3D ? '3D On' : '3D Off'}
                    </button>
                    <button 
                        onClick={() => handleZoom('in')} 
                        className="login-button p-1 hover:bg-gray-100 rounded"
                        title="Zoom In"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-sm flex items-center px-2">
                        {Math.round(scale * 100)}%
                    </span>
                    <button 
                        onClick={() => handleZoom('out')} 
                        className="login-button p-1 hover:bg-gray-100 rounded"
                        title="Zoom Out"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                </div>
                
                <div
                    className="mx-auto relative border border-gray-200 mt-10 bg-white rounded-lg shadow-lg"
                    style={{
                        width: '90%',
                        height: '700px',
                        backgroundColor: theme.backgroundColor,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        overflow: 'hidden'
                    }}
                    ref={canvasRef}
                >
                    {/* Three.js Canvas */}
                    {enable3D && (
                        <Canvas
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                zIndex: 0,
                                pointerEvents: 'none'
                            }}
                            camera={{ position: [0, 0, 15], fov: 35 }}
                        >
                            <ThreeDBackground theme={theme} />
                        </Canvas>
                    )}
                    
                    {/* 2D Elements */}
                    {elements.map((element) => {
                        const elementStyle = {
                            left: `${element.x}px`,
                            top: `${element.y}px`,
                            width: `${element.width}px`,
                            height: `${element.height}px`,
                            zIndex: element.zIndex,
                            display: 'flex',
                            justifyContent: element.alignment,
                            alignItems: 'center',
                            transform: `scale(${1/scale})`,
                            transformOrigin: 'top left',
                            ...transitionStyles
                        };

                        // Render 3D button if enabled
                        if (element.type === 'button' && enable3D) {
                            return (
                                <div
                                    key={element.id}
                                    className={`absolute ${selectedElement === element.id ? 'border-blue-500' : 'border-transparent'}`}
                                    style={elementStyle}
                                    onMouseDown={(e) => handleDragStart(e, element.id)}
                                    onClick={() => setSelectedElement(element.id)}
                                >
                                    <Canvas
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            pointerEvents: 'none'
                                        }}
                                        camera={{ position: [0, 0, 5], fov: 50 }}
                                    >
                                        <ambientLight intensity={0.5} />
                                        <pointLight position={[10, 10, 10]} />
                                        <AnimatedButton 
                                            content={content}
                                            theme={theme}
                                            position={[0, 0, 0]}
                                            scale={[element.width / 100, element.height / 50, 1]}
                                            isSelected={selectedElement === element.id}
                                        />
                                    </Canvas>
                                </div>
                            );
                        }

                        // Render 3D text if enabled
                        if ((element.type === 'title' || element.type === 'subtitle') && enable3D) {
                            return (
                                <div
                                    key={element.id}
                                    className={`absolute ${selectedElement === element.id ? 'border-blue-500' : 'border-transparent'}`}
                                    style={elementStyle}
                                    onMouseDown={(e) => handleDragStart(e, element.id)}
                                    onClick={() => setSelectedElement(element.id)}
                                >
                                    <Canvas
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            pointerEvents: 'none'
                                        }}
                                        camera={{ position: [0, 0, 10], fov: 50 }}
                                    >
                                        <ambientLight intensity={0.7} />
                                        <pointLight position={[10, 10, 10]} />
                                        <AnimatedText
                                            text={element.type === 'title' ? content.title : content.subtitle}
                                            color={element.type === 'title' ? theme.textColor : theme.secondaryTextColor}
                                            position={[0, 0, 0]}
                                            scale={[1, 1, 1]}
                                            isTitle={element.type === 'title'}
                                        />
                                    </Canvas>
                                </div>
                            );
                        }

                        // Default 2D rendering for other elements
                        return (
                            <div
                                key={element.id}
                                className={`absolute border-2 ${selectedElement === element.id ? 'border-blue-500' : 'border-transparent'} cursor-move`}
                                style={elementStyle}
                                onMouseDown={(e) => handleDragStart(e, element.id)}
                                onClick={() => setSelectedElement(element.id)}
                            >
                                {element.type === 'image' && (
                                    <div className="w-full h-full relative">
                                        <img
                                            src={content.images.find(img => img.id === element.imageId)?.url || ''}
                                            alt="Thank you page background"
                                            className="w-full h-full object-cover rounded"
                                            style={transitionStyles}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition">
                                            <button className="p-2 bg-white/90 rounded-full">
                                                <ImageIcon className="w-5 h-5 text-gray-700" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {element.type === 'title' && !enable3D && (
                                    <h1
                                        className="text-4xl font-bold w-full"
                                        style={{ 
                                            color: theme.textColor, 
                                            textAlign: element.alignment,
                                            ...transitionStyles
                                        }}
                                    >
                                        {content.title}
                                    </h1>
                                )}
                                {element.type === 'subtitle' && !enable3D && (
                                    <p
                                        className="text-lg w-full"
                                        style={{ 
                                            color: theme.secondaryTextColor, 
                                            textAlign: element.alignment,
                                            ...transitionStyles
                                        }}
                                    >
                                        {content.subtitle}
                                    </p>
                                )}
                                {element.type === 'button' && !enable3D && (
                                    <button
                                        className="px-8 py-3 text-lg rounded-md w-full h-full hover:scale-105 transition-transform"
                                        style={{
                                            backgroundColor: theme.primaryColor,
                                            color: 'white',
                                            ...transitionStyles
                                        }}
                                    >
                                        {content.buttonText}
                                    </button>
                                )}
                                {element.type === 'social' && (
                                    <div className="flex justify-center gap-4 w-full h-full items-center" style={transitionStyles}>
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
                                {element.type === 'custom-text' && (
                                    <div className="w-full h-full flex items-center p-2" style={transitionStyles}>
                                        <p
                                            className="w-full"
                                            style={{
                                                color: content.customTexts.find(t => t.id === element.textId)?.color || theme.textColor,
                                                textAlign: element.alignment,
                                                fontSize: '16px',
                                                lineHeight: '1.5'
                                            }}
                                        >
                                            {content.customTexts.find(t => t.id === element.textId)?.text || ''}
                                        </p>
                                    </div>
                                )}
                                {selectedElement === element.id && (
                                    <>
                                        {[
                                            { dir: 'top-left', styles: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
                                            { dir: 'top', styles: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'ns-resize' },
                                            { dir: 'top-right', styles: 'top-0 right-0 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
                                            { dir: 'right', styles: 'top-1/2 right-0 -translate-y-1/2 translate-x-1/2', cursor: 'ew-resize' },
                                            { dir: 'bottom-right', styles: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize' },
                                            { dir: 'bottom', styles: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2', cursor: 'ns-resize' },
                                            { dir: 'bottom-left', styles: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize' },
                                            { dir: 'left', styles: 'top-1/2 left-0 -translate-y-1/2 -translate-x-1/2', cursor: 'ew-resize' },
                                        ].map(h => (
                                            <div
                                                key={h.dir}
                                                className={`absolute w-3 h-3 border-2 border-blue-500 bg-white rounded-full shadow ${h.cursor} z-10 ${h.styles}`}
                                                onMouseDown={(e) => handleResizeStart(e, element.id, h.dir)}
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
                        className="text-sm text-blue-600 hover:text-blue-700 transition"
                        onClick={() => {
                            setTheme({
                                backgroundColor: '#ffffff',
                                primaryColor: '#028ab0',
                                secondaryColor: '#ffbb1b',
                                textColor: '#0b0a0a',
                                secondaryTextColor: '#5f6165'
                            });
                            setContent({
                                title: "Thank You for Your Submission!",
                                subtitle: "We have received your message and will get back to you shortly.",
                                buttonText: "Explore More",
                                images: [{ id: uuidv4(), url: "/placeholder.svg", name: "Main Image" }],
                                socialLinks: {
                                    facebook: { enabled: true, url: "https://facebook.com" },
                                    instagram: { enabled: true, url: "https://instagram.com" },
                                    linkedin: { enabled: true, url: "https://linkedin.com" },
                                    message: { enabled: true, url: "mailto:contact@example.com" }
                                },
                                customTexts: []
                            });
                            setElements([
                                { id: 'image', type: 'image', x: 150, y: 0, width: 800, height: 320, zIndex: 1, alignment: 'center', imageId: content.images[0].id },
                                { id: 'title', type: 'title', x: 150, y: 340, width: 800, height: 60, zIndex: 2, alignment: 'center' },
                                { id: 'subtitle', type: 'subtitle', x: 150, y: 420, width: 800, height: 40, zIndex: 2, alignment: 'center' },
                                { id: 'button', type: 'button', x:450, y: 480, width: 200, height: 50, zIndex: 2, alignment: 'center' },
                                { id: 'social', type: 'social', x: 450, y: 550, width: 200, height: 60, zIndex: 2, alignment: 'center' }
                            ]);
                            setScale(1);
                            setEnable3D(true);
                        }}
                    >
                        Reset All
                    </button>
                </div>

                {/* 3D Toggle */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">3D Effects</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enable3D}
                                onChange={() => setEnable3D(!enable3D)}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                </div>

                {/* Rest of the sidebar code remains the same... */}
                {/* Tabs, Search, and all the configuration sections */}
            </div>
        </div>
    );
}