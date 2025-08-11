import { useState, useRef, useEffect } from 'react';
import {
    Eye, Save, ChevronRight, Search, Instagram, Facebook, Linkedin,
    MessageSquare, Image as ImageIcon, Palette, SlidersHorizontal, X,
    Move, Maximize2, ImagePlus, AlignLeft, AlignCenter, AlignRight
} from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import FileUpload from '../file-upload/file-upload';
// import axios from 'axios';

// Mock API for backend storage simulation
const mockApi = {
    saveElements: async (elements) => {
        console.log('Saving elements to backend:', elements);
        return { success: true };
    },
    fetchElements: async () => {
        return [];
    }
};

export default function ThankYouPageEditor() {
    // State management
    const [url,setUrl]= useState({})
    useEffect(()=>{
        console.log('url',url);
        
    },[url])
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
        imageUrl: "/placeholder.svg",
        socialLinks: { facebook: true, instagram: true, linkedin: true, message: true }
    });
    const [elements, setElements] = useState([
        { id: 'image', type: 'image', x: 0, y: 0, width: 800, height: 320, zIndex: 1, alignment: 'center' },
        { id: 'title', type: 'title', x: 0, y: 340, width: 800, height: 60, zIndex: 2, alignment: 'center' },
        { id: 'subtitle', type: 'subtitle', x: 0, y: 420, width: 800, height: 40, zIndex: 2, alignment: 'center' },
        { id: 'button', type: 'button', x: 300, y: 480, width: 200, height: 50, zIndex: 2, alignment: 'center' },
        { id: 'social', type: 'social', x: 300, y: 550, width: 200, height: 60, zIndex: 2, alignment: 'center' }
    ]);
    const [selectedElement, setSelectedElement] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragRef = useRef({ startX: 0, startY: 0 });
    const resizeInfoRef = useRef(null);

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
                setContent({ ...content, imageUrl: event.target.result });
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

    // Handle drag
    const handleDrag = (e) => {
        if (!isDragging || !selectedElement) return;
        const newX = e.clientX - dragRef.current.startX;
        const newY = e.clientY - dragRef.current.startY;
        setElements(elements.map(el =>
            el.id === selectedElement ? { ...el, x: newX, y: newY } : el
        ));
    };

    // Handle drag end
    const handleDragEnd = () => {
        setIsDragging(false);
    };
    const handleResizing = (e) => {
        if (!isResizing || !resizeInfoRef.current) return;
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
            newWidth = Math.max(minW, startWidth + deltaX);
        }
        if (direction.includes('left')) {
            newWidth = Math.max(minW, startWidth - deltaX);
            if (newWidth !== minW) newX = startLeft + deltaX;
        }
        if (direction.includes('bottom')) {
            newHeight = Math.max(minH, startHeight + deltaY);
        }
        if (direction.includes('top')) {
            newHeight = Math.max(minH, startHeight - deltaY);
            if (newHeight !== minH) newY = startTop + deltaY;
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

    // Handle resize
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

    return (
        <div className="min-h-screen bg-gray-100 flex" onMouseMove={handleDrag} onMouseUp={handleDragEnd}>
            {/* Main Canvas Area */}
            <div className="flex-1 p-8 overflow-auto">
                <div
                    className="bg-white rounded-lg shadow-lg mx-auto relative border border-gray-200"
                    style={{
                        width: '800px',
                        height: '700px',
                        backgroundColor: theme.backgroundColor
                    }}
                >
                    {elements.map((element) => (
                        <div
                            key={element.id}
                            className={`absolute border-2 ${selectedElement === element.id ? 'border-blue-500' : 'border-transparent'} cursor-move`}
                            style={{
                                left: `${element.x}px`,
                                top: `${element.y}px`,
                                width: `${element.width}px`,
                                height: `${element.height}px`,
                                zIndex: element.zIndex,
                                display: 'flex',
                                justifyContent: element.alignment,
                                alignItems: 'center'
                            }}
                            onMouseDown={(e) => handleDragStart(e, element.id)}
                            onClick={() => setSelectedElement(element.id)}
                        >
                            {element.type === 'image' && (
                                <div className="w-full h-full relative">
                                    <img
                                        src={content.imageUrl}
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
                            {element.type === 'title' && (
                                <h1
                                    className="text-4xl font-bold w-full"
                                    style={{ color: theme.textColor, textAlign: element.alignment }}
                                >
                                    {content.title}
                                </h1>
                            )}
                            {element.type === 'subtitle' && (
                                <p
                                    className="text-lg w-full"
                                    style={{ color: theme.secondaryTextColor, textAlign: element.alignment }}
                                >
                                    {content.subtitle}
                                </p>
                            )}
                            {element.type === 'button' && (
                                <button
                                    className="px-8 py-3 text-lg rounded-md w-full h-full"
                                    style={{
                                        backgroundColor: theme.primaryColor,
                                        color: 'white'
                                    }}
                                >
                                    {content.buttonText}
                                </button>
                            )}
                            {element.type === 'social' && (
                                <div className="flex justify-center gap-4 w-full h-full items-center">
                                    {content.socialLinks.facebook && (
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition"
                                            style={{ backgroundColor: theme.secondaryColor }}
                                        >
                                            <Facebook className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                    {content.socialLinks.instagram && (
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition"
                                            style={{ backgroundColor: theme.secondaryColor }}
                                        >
                                            <Instagram className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                    {content.socialLinks.linkedin && (
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition"
                                            style={{ backgroundColor: theme.secondaryColor }}
                                        >
                                            <Linkedin className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                    {content.socialLinks.message && (
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition"
                                            style={{ backgroundColor: theme.secondaryColor }}
                                        >
                                            <MessageSquare className="w-6 h-6 text-white" />
                                        </div>
                                    )}
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
                                            className={`absolute w-2 h-2 border-[2px] border-blue-500 bg-white rounded-full shadow ${h.cursor} z-10 ${h.styles}`}
                                            onMouseDown={(e) => handleResizeStart(e, element.id, h.dir)}
                                        />
                                    ))}
                                </>
                            )}


                        </div>
                    ))}
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
                                imageUrl: "/placeholder.svg",
                                socialLinks: { facebook: true, instagram: true, linkedin: true, message: true }
                            });
                            setElements([
                                { id: 'image', type: 'image', x: 0, y: 0, width: 800, height: 320, zIndex: 1, alignment: 'center' },
                                { id: 'title', type: 'title', x: 0, y: 340, width: 800, height: 60, zIndex: 2, alignment: 'center' },
                                { id: 'subtitle', type: 'subtitle', x: 0, y: 420, width: 800, height: 40, zIndex: 2, alignment: 'center' },
                                { id: 'button', type: 'button', x: 300, y: 480, width: 200, height: 50, zIndex: 2, alignment: 'center' },
                                { id: 'social', type: 'social', x: 300, y: 550, width: 200, height: 60, zIndex: 2, alignment: 'center' }
                            ]);
                        }}
                    >
                        Reset All
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex mb-6 bg-gray-50 rounded-lg p-1">
                    <button
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'layout' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                        onClick={() => setActiveTab('layout')}
                    >
                        Layout
                    </button>
                    <button
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'themes' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                        onClick={() => setActiveTab('themes')}
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

                {activeTab === 'layout' ? (
                    <div className="space-y-6">
                        {/* Element toggles and inputs */}
                        <div className="space-y-4">
                            {/* Image Section */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-gray-700">Manage Media</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={elements.some(el => el.id === 'image')}
                                            onChange={() => {
                                                if (elements.some(el => el.id === 'image')) {
                                                    setElements(elements.filter(el => el.id !== 'image'));
                                                } else {
                                                    setElements([...elements, {
                                                        id: 'image',
                                                        type: 'image',
                                                        x: 0,
                                                        y: 0,
                                                        width: 800,
                                                        height: 320,
                                                        zIndex: 1,
                                                        alignment: 'center'
                                                    }]);
                                                }
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                                {elements.some(el => el.id === 'image') && (
                                    <>
                                        <div className="mb-3">
                                            <img src={content.imageUrl} alt="Preview" className="w-full h-24 object-cover rounded" />
                                        </div>
                                        <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                            />
                                            Upload Image
                                        </label>
                                        {selectedElement === 'image' && (
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => handleAlignmentChange('image', 'left')}
                                                    className={`p-2 rounded ${elements.find(el => el.id === 'image').alignment === 'left' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
                                                >
                                                    <AlignLeft className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAlignmentChange('image', 'center')}
                                                    className={`p-2 rounded ${elements.find(el => el.id === 'image').alignment === 'center' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
                                                >
                                                    <AlignCenter className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAlignmentChange('image', 'right')}
                                                    className={`p-2 rounded ${elements.find(el => el.id === 'image').alignment === 'right' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
                                                >
                                                    <AlignRight className="w-4 h-4" />
                                                </button>
                                            </div>
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
                                            checked={elements.some(el => el.id === 'title')}
                                            onChange={() => {
                                                if (elements.some(el => el.id === 'title')) {
                                                    setElements(elements.filter(el => el.id !== 'title'));
                                                } else {
                                                    setElements([...elements, {
                                                        id: 'title',
                                                        type: 'title',
                                                        x: 0,
                                                        y: 340,
                                                        width: 800,
                                                        height: 60,
                                                        zIndex: 2,
                                                        alignment: 'center'
                                                    }]);
                                                }
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                                {elements.some(el => el.id === 'title') && (
                                    <>
                                        <input
                                            type="text"
                                            value={content.title}
                                            onChange={(e) => handleContentChange('title', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                            placeholder="Enter title text"
                                        />
                                        {selectedElement === 'title' && (
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => handleAlignmentChange('title', 'left')}
                                                    className={`p-2 rounded ${elements.find(el => el.id === 'title').alignment === 'left' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
                                                >
                                                    <AlignLeft className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAlignmentChange('title', 'center')}
                                                    className={`p-2 rounded ${elements.find(el => el.id === 'title').alignment === 'center' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
                                                >
                                                    <AlignCenter className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAlignmentChange('title', 'right')}
                                                    className={`p-2 rounded ${elements.find(el => el.id === 'title').alignment === 'right' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
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
                                    <span className="text-sm font-medium text-gray-700">Subtitle</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={elements.some(el => el.id === 'subtitle')}
                                            onChange={() => {
                                                if (elements.some(el => el.id === 'subtitle')) {
                                                    setElements(elements.filter(el => el.id !== 'subtitle'));
                                                } else {
                                                    setElements([...elements, {
                                                        id: 'subtitle',
                                                        type: 'subtitle',
                                                        x: 0,
                                                        y: 420,
                                                        width: 800,
                                                        height: 40,
                                                        zIndex: 2,
                                                        alignment: 'center'
                                                    }]);
                                                }
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                                {elements.some(el => el.id === 'subtitle') && (
                                    <>
                                        <input
                                            type="text"
                                            value={content.subtitle}
                                            onChange={(e) => handleContentChange('subtitle', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                            placeholder="Enter subtitle text"
                                        />
                                        {selectedElement === 'subtitle' && (
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => handleAlignmentChange('subtitle', 'left')}
                                                    className={`p-2 rounded ${elements.find(el => el.id === 'subtitle').alignment === 'left' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
                                                >
                                                    <AlignLeft className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAlignmentChange('subtitle', 'center')}
                                                    className={`p-2 rounded ${elements.find(el => el.id === 'subtitle').alignment === 'center' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
                                                >
                                                    <AlignCenter className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAlignmentChange('subtitle', 'right')}
                                                    className={`p-2 rounded ${elements.find(el => el.id === 'subtitle').alignment === 'right' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
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
                                    <span className="text-sm font-medium text-gray-700">Button</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={elements.some(el => el.id === 'button')}
                                            onChange={() => {
                                                if (elements.some(el => el.id === 'button')) {
                                                    setElements(elements.filter(el => el.id !== 'button'));
                                                } else {
                                                    setElements([...elements, {
                                                        id: 'button',
                                                        type: 'button',
                                                        x: 300,
                                                        y: 480,
                                                        width: 200,
                                                        height: 50,
                                                        zIndex: 2,
                                                        alignment: 'center'
                                                    }]);
                                                }
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                                {elements.some(el => el.id === 'button') && (
                                    <>
                                        <input
                                            type="text"
                                            value={content.buttonText}
                                            onChange={(e) => handleContentChange('buttonText', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                            placeholder="Enter button text"
                                        />
                                        {selectedElement === 'button' && (
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => handleAlignmentChange('button', 'left')}
                                                    className={`p-2 rounded ${elements.find(el => el.id === 'button').alignment === 'left' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
                                                >
                                                    <AlignLeft className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAlignmentChange('button', 'center')}
                                                    className={`p-2 rounded ${elements.find(el => el.id === 'button').alignment === 'center' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
                                                >
                                                    <AlignCenter className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAlignmentChange('button', 'right')}
                                                    className={`p-2 rounded ${elements.find(el => el.id === 'button').alignment === 'right' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
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
                                    <span className="text-sm font-medium text-gray-700">Social Links</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={elements.some(el => el.id === 'social')}
                                            onChange={() => {
                                                if (elements.some(el => el.id === 'social')) {
                                                    setElements(elements.filter(el => el.id !== 'social'));
                                                } else {
                                                    setElements([...elements, {
                                                        id: 'social',
                                                        type: 'social',
                                                        x: 300,
                                                        y: 550,
                                                        width: 200,
                                                        height: 60,
                                                        zIndex: 2,
                                                        alignment: 'center'
                                                    }]);
                                                }
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                                {elements.some(el => el.id === 'social') && selectedElement === 'social' && (
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => handleAlignmentChange('social', 'left')}
                                            className={`p-2 rounded ${elements.find(el => el.id === 'social').alignment === 'left' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
                                        >
                                            <AlignLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleAlignmentChange('social', 'center')}
                                            className={`p-2 rounded ${elements.find(el => el.id === 'social').alignment === 'center' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
                                        >
                                            <AlignCenter className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleAlignmentChange('social', 'right')}
                                            className={`p-2 rounded ${elements.find(el => el.id === 'social').alignment === 'right' ? 'bg-blue-100' : 'bg-gray-100'} hover:bg-blue-200 transition`}
                                        >
                                            <AlignRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Theme Settings */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Theme Colors</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Background Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={theme.backgroundColor}
                                            onChange={(e) => handleThemeChange('backgroundColor', e.target.value)}
                                            className="w-8 h-8 cursor-pointer rounded"
                                        />
                                        <input
                                            type="text"
                                            value={theme.backgroundColor}
                                            onChange={(e) => handleThemeChange('backgroundColor', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Primary Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={theme.primaryColor}
                                            onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
                                            className="w-8 h-8 cursor-pointer rounded"
                                        />
                                        <input
                                            type="text"
                                            value={theme.primaryColor}
                                            onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Secondary Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={theme.secondaryColor}
                                            onChange={(e) => handleThemeChange('secondaryColor', e.target.value)}
                                            className="w-8 h-8 cursor-pointer rounded"
                                        />
                                        <input
                                            type="text"
                                            value={theme.secondaryColor}
                                            onChange={(e) => handleThemeChange('secondaryColor', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Text Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={theme.textColor}
                                            onChange={(e) => handleThemeChange('textColor', e.target.value)}
                                            className="w-8 h-8 cursor-pointer rounded"
                                        />
                                        <input
                                            type="text"
                                            value={theme.textColor}
                                            onChange={(e) => handleThemeChange('textColor', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Secondary Text Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={theme.secondaryTextColor}
                                            onChange={(e) => handleThemeChange('secondaryTextColor', e.target.value)}
                                            className="w-8 h-8 cursor-pointer rounded"
                                        />
                                        <input
                                            type="text"
                                            value={theme.secondaryTextColor}
                                            onChange={(e) => handleThemeChange('secondaryTextColor', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Social Media Links */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Social Media Links</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Facebook</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={content.socialLinks.facebook}
                                            onChange={() => handleContentChange('socialLinks', {
                                                ...content.socialLinks,
                                                facebook: !content.socialLinks.facebook
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Instagram</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={content.socialLinks.instagram}
                                            onChange={() => handleContentChange('socialLinks', {
                                                ...content.socialLinks,
                                                instagram: !content.socialLinks.instagram
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">LinkedIn</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={content.socialLinks.linkedin}
                                            onChange={() => handleContentChange('socialLinks', {
                                                ...content.socialLinks,
                                                linkedin: !content.socialLinks.linkedin
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Message</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={content.socialLinks.message}
                                            onChange={() => handleContentChange('socialLinks', {
                                                ...content.socialLinks,
                                                message: !content.socialLinks.message
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}