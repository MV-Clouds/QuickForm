import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, Maximize, Minimize, Code, Copy, X,
  Type, Heading1, Heading2, Text, MousePointerClick, Share2,
  Image as ImageIcon, Sliders, Palette, LayoutGrid, Move,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, ImagePlus,
  Facebook, Twitter, Instagram, Linkedin, Youtube, Plus, Trash2,
  Save
} from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { monokaiSublime } from "react-syntax-highlighter/dist/esm/styles/hljs";
// import html from 'react-syntax-highlighter/dist/esm/languages/hljs/xml'; // hljs uses 'xml' for HTML
import FileUpload from '../file-upload/file-upload';
const ThankYouPageBuilder = ({ formVersionId }) => {
  const [token, setToken] = useState();
  const [loading, setLoading] = useState(false);
  const userId = sessionStorage.getItem('userId');
  const instanceUrl = sessionStorage.getItem('instanceUrl');
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('https://76vlfwtmig.execute-api.us-east-1.amazonaws.com/getAccessToken/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            instanceUrl,
          }),
        });
        const tokenData = await response.json();
        setToken(tokenData.access_token);
        if (!response.ok || tokenData.error) {
          throw new Error(tokenData.error || 'Failed to fetch access token');
        }
        console.log('tokenData', tokenData);

      } catch {
        console.error('Error fetching access token');
      }
    }
    fetchData();
  }, [userId, instanceUrl]);
  const [elements, setElements] = useState([
    {
      id: '1',
      type: 'heading',
      content: 'Thank You!',
      position: { x: 50, y: 15 },
      fontSize: '3rem',
      fontWeight: '800',
      color: '#1a365d',
      textAlign: 'center',
      lineHeight: '1.2'
    },
    {
      id: '2',
      type: 'subheading',
      content: 'Your submission has been received',
      position: { x: 50, y: 30 },
      fontSize: '1.75rem',
      fontWeight: '600',
      color: '#2d3748',
      textAlign: 'center',
      lineHeight: '1.3'
    },
    {
      id: '3',
      type: 'description',
      content: 'We appreciate your time and will get back to you within 24 hours. Please check your email for confirmation.',
      position: { x: 50, y: 50 },
      fontSize: '1.1rem',
      color: '#4a5568',
      textAlign: 'center',
      lineHeight: '1.6',
      width: '80%'
    },
    {
      id: '4',
      type: 'button',
      content: 'Return Home',
      position: { x: 50, y: 70 },
      fontSize: '1rem',
      backgroundColor: '#3182ce',
      textColor: '#ffffff',
      borderRadius: '0.5rem',
      padding: '0.75rem 2rem',
      hoverEffect: 'scale(1.05)'
    },
    {
      id: '5',
      type: 'social',
      position: { x: 50, y: 85 },
      buttons: [
        { platform: 'facebook', url: '#', visible: true },
        { platform: 'twitter', url: '#', visible: true },
        { platform: 'instagram', url: '#', visible: true },
        { platform: 'linkedin', url: '#', visible: false },
        { platform: 'youtube', url: '#', visible: false }
      ],
      size: '2rem',
      spacing: '1rem'
    }
  ]);
  // Default design settings
  // This can be customized further based on user preferences
  const [design, setDesign] = useState({
    backgroundColor: '#f8fafc',
    backgroundImage: null,
    backgroundOpacity: 1,
    backgroundBlur: 0,
    containerPadding: '3rem',
    containerMaxWidth: '42rem',
    fontFamily: 'sans-serif'
  });
  const setThankYouPageData = () => {
    // Map elements to data fields
    const heading = elements.find(el => el.type === 'heading');
    const subheading = elements.find(el => el.type === 'subheading');
    const description = elements.find(el => el.type === 'description');
    const actions = elements.filter(el => el.type === 'button' || el.type === 'social');

    const result = {
      Heading__c: heading ? heading.content : '',
      Sub_Heading__c: subheading ? subheading.content : '',
      Description__c: description ? description.content : '',
      Form_Version__c: formVersionId || '',
      Image_Url__c: design.backgroundImage || '',
      Body__c: JSON.stringify({
        heading: heading ? { ...heading } : null,
        subheading: subheading ? { ...subheading } : null,
        description: description ? { ...description } : null,
        background: design ? { ...design } : null
      }),
      Actions__c: JSON.stringify(actions.map(a => ({ ...a }))),
    };
    // You can now use 'result' as needed (e.g., send to API, etc.)
    return result;
  }
  // Function to handle the creation of the Thank You page 
  const handleThankYouCreate = async () => {
    setLoading(true);
    if (!token) {
      console.error('Access token is not available');
      return;
    }

    const thankYouData = setThankYouPageData();
    try {
      const response = await fetch('https://l8rbccfzz8.execute-api.us-east-1.amazonaws.com/savedata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          {
            instanceUrl: instanceUrl, userId: userId, ThankYouData: JSON.stringify( { ...thankYouData })
          }
        ),
      });
      console.log('response data' , response);
      
      const data = await response.json();
      console.log('response text ' , data)
      if (response.ok) {
        if(data.newAccessToken){
          setToken(data.newAccessToken);
        }
        setLoading(false)
        console.log('Thank You page created successfully:', data);
      } else {
        setLoading(false);
        console.error('Error creating Thank You page:', data);
      }
    } catch (error) {
      setLoading(false)
      console.error('Network error:', error);
    }
  }

  // Log the thank you page data whenever elements or design changes
  useEffect(() => {
    console.log('setThankYouPageData ====>', setThankYouPageData());
  }, [elements, design]);
  const [activeTab, setActiveTab] = useState('layout');
  const [activeSection, setActiveSection] = useState('heading');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourceCode, setSourceCode] = useState('');
  const [deviceSize, setDeviceSize] = useState('desktop');
  const [editingElement, setEditingElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [elementStartPos, setElementStartPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Improved drag and drop with proper percentage-based positioning
  const handleMouseDown = (e, element) => {
    if (e.button !== 0) return; // Only left mouse button

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    console.log('Container Rect:', rect);
    const containerTop = rect.top;
    const containerHeight = rect.height;

    // Calculate initial position in percentage relative to container
    const clickY = e.clientY - containerTop;
    const initialYPercent = (clickY / containerHeight) * 100;

    // Only start dragging if click is near the element's position
    // if (Math.abs(initialYPercent - element.position.y) > 10) return;

    setEditingElement(element.id);
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setElementStartPos(element.position);

    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !editingElement) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const containerTop = rect.top;
    const containerHeight = rect.height;

    // Calculate new position in percentage
    const moveY = e.clientY - containerTop;
    const newYPercent = (moveY / containerHeight) * 100;

    // Constrain to container bounds
    const constrainedY = Math.max(5, Math.min(95, newYPercent));

    setElements(prev =>
      prev.map(el =>
        el.id === editingElement
          ? { ...el, position: { ...el.position, y: constrainedY } }
          : el
      )
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStartPos, elementStartPos]);

  const handleElementChange = (id, key, value) => {
    setElements(prev =>
      prev.map(el => el.id === id ? { ...el, [key]: value } : el)
    );
  };

  const handleSocialButtonChange = (id, platform, key, value) => {
    setElements(prev =>
      prev.map(el =>
        el.id === id
          ? {
            ...el,
            buttons: el.buttons.map(btn =>
              btn.platform === platform ? { ...btn, [key]: value } : btn
            )
          }
          : el
      )
    );
  };

  const addElement = (type) => {
    const newId = Date.now().toString();
    let newElement;

    switch (type) {
      case 'heading':
        newElement = {
          id: newId,
          type,
          content: 'New Heading',
          position: { x: 50, y: 15 },
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#1a365d',
          textAlign: 'center',
          lineHeight: '1.2'
        };
        break;
      case 'subheading':
        newElement = {
          id: newId,
          type,
          content: 'New Subheading',
          position: { x: 50, y: 30 },
          fontSize: '1.75rem',
          fontWeight: '600',
          color: '#2d3748',
          textAlign: 'center',
          lineHeight: '1.3'
        };
        break;
      case 'description':
        newElement = {
          id: newId,
          type,
          content: 'New description text',
          position: { x: 50, y: 50 },
          fontSize: '1.1rem',
          color: '#4a5568',
          textAlign: 'center',
          lineHeight: '1.6',
          width: '80%'
        };
        break;
      case 'button':
        newElement = {
          id: newId,
          type,
          content: 'New Button',
          position: { x: 50, y: 70 },
          fontSize: '1rem',
          backgroundColor: '#3182ce',
          textColor: '#ffffff',
          borderRadius: '0.5rem',
          padding: '0.75rem 2rem',
          hoverEffect: 'scale(1.05)'
        };
        break;
      case 'social':
        newElement = {
          id: newId,
          type,
          position: { x: 50, y: 85 },
          buttons: [
            { platform: 'facebook', url: '#', visible: true },
            { platform: 'twitter', url: '#', visible: true },
            { platform: 'instagram', url: '#', visible: true },
            { platform: 'linkedin', url: '#', visible: false },
            { platform: 'youtube', url: '#', visible: false }
          ],
          size: '2rem',
          spacing: '1rem'
        };
        break;
      default:
        return;
    }

    setElements(prev => [...prev, newElement]);
    setEditingElement(newId);
    setActiveSection(type);
  };

  const removeElement = (id) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (editingElement === id) setEditingElement(null);
  };

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        await canvasRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const generateSourceCode = () => {
    const element = document.getElementById('thank-you-page');
    return element ? element.outerHTML.toString() : '';
  };

  const showSourceModalOpen = () => {
    setSourceCode(generateSourceCode());
    setShowSourceModal(true);
  };

  const copySourceCode = () => {
    navigator.clipboard.writeText(sourceCode);
  };

  const getDeviceWidth = () => {
    switch (deviceSize) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return design.containerMaxWidth;
      default: return design.containerMaxWidth;
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setDesign(prev => ({ ...prev, backgroundImage: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const applyTheme = (theme) => {
    setDesign(prev => ({ ...prev, ...theme.design }));
    setElements(theme.elements);
  };

  // Prebuilt attractive themes
  const themes = [
    {
      name: 'Modern Blue',
      design: {
        backgroundColor: '#f0f4f8',
        fontFamily: 'sans-serif'
      },
      elements: [
        {
          id: '1',
          type: 'heading',
          content: 'Thank You!',
          position: { x: 50, y: 15 },
          fontSize: '3rem',
          fontWeight: '800',
          color: '#1a365d',
          textAlign: 'center',
          lineHeight: '1.2'
        },
        {
          id: '2',
          type: 'subheading',
          content: 'Your submission has been received',
          position: { x: 50, y: 30 },
          fontSize: '1.75rem',
          fontWeight: '600',
          color: '#2d3748',
          textAlign: 'center',
          lineHeight: '1.3'
        },
        {
          id: '3',
          type: 'description',
          content: 'We appreciate your time and will get back to you within 24 hours.',
          position: { x: 50, y: 50 },
          fontSize: '1.1rem',
          color: '#4a5568',
          textAlign: 'center',
          lineHeight: '1.6',
          width: '80%'
        },
        {
          id: '4',
          type: 'button',
          content: 'Return Home',
          position: { x: 50, y: 70 },
          fontSize: '1rem',
          backgroundColor: '#3182ce',
          textColor: '#ffffff',
          borderRadius: '0.5rem',
          padding: '0.75rem 2rem',
          hoverEffect: 'scale(1.05)'
        },
        {
          id: '5',
          type: 'social',
          position: { x: 50, y: 85 },
          buttons: [
            { platform: 'facebook', url: '#', visible: true },
            { platform: 'twitter', url: '#', visible: true },
            { platform: 'instagram', url: '#', visible: true }
          ],
          size: '2rem',
          spacing: '1rem'
        }
      ]
    },
    {
      name: 'Elegant Dark',
      design: {
        backgroundColor: '#1a1a1a',
        fontFamily: 'Georgia, serif'
      },
      elements: [
        {
          id: '1',
          type: 'heading',
          content: 'Thank You!',
          position: { x: 50, y: 15 },
          fontSize: '3rem',
          fontWeight: 'bold',
          color: '#ffffff',
          textAlign: 'center',
          lineHeight: '1.2'
        },
        {
          id: '2',
          type: 'subheading',
          content: 'Your submission has been received',
          position: { x: 50, y: 30 },
          fontSize: '1.75rem',
          fontWeight: 'normal',
          color: '#e2e8f0',
          textAlign: 'center',
          lineHeight: '1.3'
        },
        {
          id: '3',
          type: 'description',
          content: 'We appreciate your time and will get back to you within 24 hours.',
          position: { x: 50, y: 50 },
          fontSize: '1.1rem',
          color: '#a0aec0',
          textAlign: 'center',
          lineHeight: '1.6',
          width: '80%'
        },
        {
          id: '4',
          type: 'button',
          content: 'Return Home',
          position: { x: 50, y: 70 },
          fontSize: '1rem',
          backgroundColor: '#4fd1c5',
          textColor: '#1a202c',
          borderRadius: '0.5rem',
          padding: '0.75rem 2rem',
          hoverEffect: 'scale(1.05)'
        },
        {
          id: '5',
          type: 'social',
          position: { x: 50, y: 85 },
          buttons: [
            { platform: 'facebook', url: '#', visible: true },
            { platform: 'twitter', url: '#', visible: true },
            { platform: 'instagram', url: '#', visible: true }
          ],
          size: '2rem',
          spacing: '1rem'
        }
      ]
    },
    {
      name: 'Vibrant Gradient',
      design: {
        backgroundColor: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        fontFamily: 'Arial, sans-serif'
      },
      elements: [
        {
          id: '1',
          type: 'heading',
          content: 'Thank You!',
          position: { x: 50, y: 15 },
          fontSize: '3rem',
          fontWeight: '800',
          color: '#6b46c1',
          textAlign: 'center',
          lineHeight: '1.2'
        },
        {
          id: '2',
          type: 'subheading',
          content: 'Your submission has been received',
          position: { x: 50, y: 30 },
          fontSize: '1.75rem',
          fontWeight: '600',
          color: '#805ad5',
          textAlign: 'center',
          lineHeight: '1.3'
        },
        {
          id: '3',
          type: 'description',
          content: 'We appreciate your time and will get back to you within 24 hours.',
          position: { x: 50, y: 50 },
          fontSize: '1.1rem',
          color: '#718096',
          textAlign: 'center',
          lineHeight: '1.6',
          width: '80%'
        },
        {
          id: '4',
          type: 'button',
          content: 'Return Home',
          position: { x: 50, y: 70 },
          fontSize: '1rem',
          backgroundColor: '#d53f8c',
          textColor: '#ffffff',
          borderRadius: '0.5rem',
          padding: '0.75rem 2rem',
          hoverEffect: 'scale(1.05)'
        },
        {
          id: '5',
          type: 'social',
          position: { x: 50, y: 85 },
          buttons: [
            { platform: 'facebook', url: '#', visible: true },
            { platform: 'twitter', url: '#', visible: true },
            { platform: 'instagram', url: '#', visible: true }
          ],
          size: '2rem',
          spacing: '1rem'
        }
      ]
    }
  ];

  return (
    <div
      className="flex h-screen bg-gray-100"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Sidebar with all configurations */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Palette size={20} className="mr-2" />
            Page Builder
          </h2>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-3 flex items-center justify-center space-x-1 ${activeTab === 'layout' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-600'}`}
            onClick={() => setActiveTab('layout')}
          >
            <LayoutGrid size={16} />
            <span>Layout</span>
          </button>
          <button
            className={`flex-1 py-3 flex items-center justify-center space-x-1 ${activeTab === 'theme' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-600'}`}
            onClick={() => setActiveTab('theme')}
          >
            <Sliders size={16} />
            <span>Theme</span>
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100vh-120px)]">
          {activeTab === 'layout' ? (
            <div className="space-y-4">
              {/* Layout Sections with Accordion */}
              <div className="space-y-2">
                <button
                  className="w-full flex justify-between items-center p-2 bg-gray-50 rounded-md"
                  onClick={() => setActiveSection(activeSection === 'heading' ? null : 'heading')}
                >
                  <div className="flex items-center space-x-2">
                    <Heading1 size={16} />
                    <span>Heading</span>
                  </div>
                  {activeSection === 'heading' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {activeSection === 'heading' && (
                  <div className="pl-8 pr-2 space-y-4">
                    {elements.filter(el => el.type === 'heading').map(heading => (
                      <ElementEditor
                        key={heading.id}
                        element={heading}
                        onChange={handleElementChange}
                        onRemove={removeElement}
                      />
                    ))}
                    <button
                      onClick={() => addElement('heading')}
                      className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center justify-center space-x-2"
                    >
                      <Plus size={16} />
                      <span>Add Heading</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  className="w-full flex justify-between items-center p-2 bg-gray-50 rounded-md"
                  onClick={() => setActiveSection(activeSection === 'subheading' ? null : 'subheading')}
                >
                  <div className="flex items-center space-x-2">
                    <Heading2 size={16} />
                    <span>Subheading</span>
                  </div>
                  {activeSection === 'subheading' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {activeSection === 'subheading' && (
                  <div className="pl-8 pr-2 space-y-4">
                    {elements.filter(el => el.type === 'subheading').map(subheading => (
                      <ElementEditor
                        key={subheading.id}
                        element={subheading}
                        onChange={handleElementChange}
                        onRemove={removeElement}
                      />
                    ))}
                    <button
                      onClick={() => addElement('subheading')}
                      className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center justify-center space-x-2"
                    >
                      <Plus size={16} />
                      <span>Add Subheading</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  className="w-full flex justify-between items-center p-2 bg-gray-50 rounded-md"
                  onClick={() => setActiveSection(activeSection === 'description' ? null : 'description')}
                >
                  <div className="flex items-center space-x-2">
                    <Text size={16} />
                    <span>Description</span>
                  </div>
                  {activeSection === 'description' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {activeSection === 'description' && (
                  <div className="pl-8 pr-2 space-y-4">
                    {elements.filter(el => el.type === 'description').map(description => (
                      <ElementEditor
                        key={description.id}
                        element={description}
                        onChange={handleElementChange}
                        onRemove={removeElement}
                      />
                    ))}
                    <button
                      onClick={() => addElement('description')}
                      className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center justify-center space-x-2"
                    >
                      <Plus size={16} />
                      <span>Add Description</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  className="w-full flex justify-between items-center p-2 bg-gray-50 rounded-md"
                  onClick={() => setActiveSection(activeSection === 'button' ? null : 'button')}
                >
                  <div className="flex items-center space-x-2">
                    <MousePointerClick size={16} />
                    <span>Button</span>
                  </div>
                  {activeSection === 'button' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {activeSection === 'button' && (
                  <div className="pl-8 pr-2 space-y-4">
                    {elements.filter(el => el.type === 'button').map(button => (
                      <ElementEditor
                        key={button.id}
                        element={button}
                        onChange={handleElementChange}
                        onRemove={removeElement}
                      />
                    ))}
                    <button
                      onClick={() => addElement('button')}
                      className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center justify-center space-x-2"
                    >
                      <Plus size={16} />
                      <span>Add Button</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  className="w-full flex justify-between items-center p-2 bg-gray-50 rounded-md"
                  onClick={() => setActiveSection(activeSection === 'background' ? null : 'background')}
                >
                  <div className="flex items-center space-x-2">
                    <ImageIcon size={16} />
                    <span>Background</span>
                  </div>
                  {activeSection === 'background' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {activeSection === 'background' && (
                  <div className="pl-8 pr-2 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                      <input
                        type="color"
                        value={design.backgroundColor}
                        onChange={(e) => setDesign(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Background Image</label>
                      <label className="flex flex-col items-center px-4 py-3 bg-white rounded-md border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-500">
                        {/* <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        /> */}
                        <FileUpload acceptedFileTypes={"image/*"} setDesign={setDesign} />
                        {/* <div className="flex items-center space-x-2">
                          <ImagePlus size={16} />
                          <span className="text-sm">Upload Image</span>
                        </div> */}
                      </label>
                    </div>

                    {design.backgroundImage && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Image Opacity</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={design.backgroundOpacity}
                            onChange={(e) => setDesign(prev => ({ ...prev, backgroundOpacity: parseFloat(e.target.value) }))}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>0%</span>
                            <span>{Math.round(design.backgroundOpacity * 100)}%</span>
                            <span>100%</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Image Blur</label>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="1"
                            value={design.backgroundBlur}
                            onChange={(e) => setDesign(prev => ({ ...prev, backgroundBlur: parseInt(e.target.value) }))}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>0px</span>
                            <span>{design.backgroundBlur}px</span>
                            <span>10px</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setDesign(prev => ({ ...prev, backgroundImage: null }))}
                          className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 flex items-center justify-center space-x-2"
                        >
                          <Trash2 size={16} />
                          <span>Remove Image</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  className="w-full flex justify-between items-center p-2 bg-gray-50 rounded-md"
                  onClick={() => setActiveSection(activeSection === 'social' ? null : 'social')}
                >
                  <div className="flex items-center space-x-2">
                    <Share2 size={16} />
                    <span>Social Media</span>
                  </div>
                  {activeSection === 'social' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {activeSection === 'social' && (
                  <div className="pl-8 pr-2 space-y-4">
                    {elements.filter(el => el.type === 'social').map(social => (
                      <div key={social.id} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Icon Size</label>
                          <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.1"
                            value={parseFloat(social.size)}
                            onChange={(e) => handleElementChange(social.id, 'size', `${e.target.value}rem`)}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>1rem</span>
                            <span>{social.size}</span>
                            <span>3rem</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Spacing</label>
                          <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={parseFloat(social.spacing)}
                            onChange={(e) => handleElementChange(social.id, 'spacing', `${e.target.value}rem`)}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>0.5rem</span>
                            <span>{social.spacing}</span>
                            <span>2rem</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Social Platforms</label>
                          <div className="space-y-2">
                            {social.buttons.map(button => (
                              <div key={button.platform} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {button.platform === 'facebook' && <Facebook size={18} className="text-blue-600" />}
                                  {button.platform === 'twitter' && <Twitter size={18} className="text-blue-400" />}
                                  {button.platform === 'instagram' && <Instagram size={18} className="text-pink-600" />}
                                  {button.platform === 'linkedin' && <Linkedin size={18} className="text-blue-700" />}
                                  {button.platform === 'youtube' && <Youtube size={18} className="text-red-600" />}
                                  <span className="capitalize">{button.platform}</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={button.visible}
                                    onChange={(e) => handleSocialButtonChange(
                                      social.id,
                                      button.platform,
                                      'visible',
                                      e.target.checked
                                    )}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => removeElement(social.id)}
                          className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 flex items-center justify-center space-x-2"
                        >
                          <Trash2 size={16} />
                          <span>Remove Social Links</span>
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => addElement('social')}
                      className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center justify-center space-x-2"
                    >
                      <Plus size={16} />
                      <span>Add Social Media</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Prebuilt Themes</h3>
              <div className="grid grid-cols-1 gap-4">
                {themes.map(theme => (
                  <motion.button
                    key={theme.name}
                    onClick={() => applyTheme(theme)}
                    className="p-4 border rounded-lg hover:border-blue-500 transition-colors flex flex-col items-center"
                    style={{
                      background: theme.design.backgroundColor.includes('gradient')
                        ? theme.design.backgroundColor
                        : theme.design.backgroundColor,
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="font-medium" style={{
                      color: theme.elements[0].color,
                      fontFamily: theme.design.fontFamily
                    }}>
                      {theme.name}
                    </span>
                    <div className="mt-3 w-full space-y-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          backgroundColor: theme.elements[0].color,
                          width: '100%'
                        }}
                      />
                      <div
                        className="h-2 rounded-full"
                        style={{
                          backgroundColor: theme.elements[1].color,
                          width: '80%',
                          marginLeft: '10%'
                        }}
                      />
                      <div
                        className="h-2 rounded-full"
                        style={{
                          backgroundColor: theme.elements[2].color,
                          width: '60%',
                          marginLeft: '20%'
                        }}
                      />
                      <div
                        className="h-4 rounded-full mt-2"
                        style={{
                          backgroundColor: theme.elements[3].backgroundColor,
                          width: '40%',
                          marginLeft: '30%'
                        }}
                      />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={canvasRef}
        className={`flex-1 p-4 overflow-auto transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}`}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setDeviceSize('mobile')}
              className={`px-3 py-1 rounded-md ${deviceSize === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Mobile
            </button>
            <button
              onClick={() => setDeviceSize('tablet')}
              className={`px-3 py-1 rounded-md ${deviceSize === 'tablet' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Tablet
            </button>
            <button
              onClick={() => setDeviceSize('desktop')}
              className={`px-3 py-1 rounded-md ${deviceSize === 'desktop' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Desktop
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1 flex items-center space-x-1 bg-gray-800 text-white rounded-md hover:bg-gray-700"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
            </button>
            <button
              onClick={() => showSourceModalOpen()}
              className="px-3 py-1 flex items-center space-x-1 bg-gray-800 text-white rounded-md hover:bg-gray-700"
            >
              <Code size={16} />
              <span>Source Code</span>
            </button>
            <button
              onClick={() => handleThankYouCreate()}
              className="px-3 py-1 flex items-center space-x-1 bg-green-500 text-white rounded-md hover:bg-green-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Save className='w-5 h-5 mr-1' />
                  Save
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <motion.div
            ref={containerRef}
            id="thank-you-page"
            className="relative rounded-xl shadow-lg transition-all duration-300 overflow-hidden"
            style={{
              background: design.backgroundColor.includes('gradient')
                ? design.backgroundColor
                : design.backgroundColor,
              padding: design.containerPadding,
              maxWidth: getDeviceWidth(),
              width: '100%',
              minHeight: '500px',
              backgroundImage: design.backgroundImage ? `url(${design.backgroundImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              fontFamily: design.fontFamily
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {design.backgroundImage && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: `rgba(255, 255, 255, ${1 - design.backgroundOpacity})`,
                  backdropFilter: `blur(${design.backgroundBlur}px)`,
                }}
              />
            )}

            <AnimatePresence>
              {elements.map((element) => (
                <Element
                  key={element.id}
                  element={element}
                  isEditing={editingElement === element.id}
                  isDragging={isDragging && editingElement === element.id}
                  onMouseDown={(e) => handleMouseDown(e, element)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Source Code Modal */}
      <AnimatePresence>
        {showSourceModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSourceModal(false)}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-medium">Source Code</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={copySourceCode}
                    className="p-2 text-gray-700 hover:text-blue-600"
                    title="Copy to clipboard"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={() => setShowSourceModal(false)}
                    className="p-2 text-gray-700 hover:text-red-600"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="overflow-auto p-4 bg-gray-800 flex-1">
                {sourceCode && (
                  <SyntaxHighlighter language="xml" style={monokaiSublime}>
                    {sourceCode}
                  </SyntaxHighlighter>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Element = ({ element, isEditing, isDragging, onMouseDown }) => {
  const getElementStyle = () => {
    const baseStyle = {
      position: 'absolute',
      left: `${element.position.x}%`,
      top: `${element.position.y}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: isEditing ? 10 : element.zIndex || 1,
      cursor: isEditing ? 'grab' : 'pointer',
      transition: isDragging ? 'none' : 'all 0.2s ease',
    };

    switch (element.type) {
      case 'heading':
        return {
          ...baseStyle,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          color: element.color,
          textAlign: element.textAlign,
          lineHeight: element.lineHeight,
          opacity: isDragging ? 0.8 : 1,
        };
      case 'subheading':
        return {
          ...baseStyle,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          color: element.color,
          textAlign: element.textAlign,
          lineHeight: element.lineHeight,
          opacity: isDragging ? 0.8 : 1,
        };
      case 'description':
        return {
          ...baseStyle,
          fontSize: element.fontSize,
          color: element.color,
          textAlign: element.textAlign,
          lineHeight: element.lineHeight,
          width: element.width || 'auto',
          opacity: isDragging ? 0.8 : 1,
        };
      case 'button':
        return {
          ...baseStyle,
          fontSize: element.fontSize,
          backgroundColor: element.backgroundColor,
          color: element.textColor,
          borderRadius: element.borderRadius,
          padding: element.padding,
          textAlign: element.textAlign,
          opacity: isDragging ? 0.8 : 1,
          transform: 'translate(-50%, -50%)',
          transition: 'all 0.2s ease',
        };
      case 'social':
        return {
          ...baseStyle,
          display: 'flex',
          gap: element.spacing,
          opacity: isDragging ? 0.8 : 1,
        };
      default:
        return baseStyle;
    }
  };

  const renderElement = () => {
    const style = getElementStyle();

    switch (element.type) {
      case 'heading':
        return (
          <motion.h1
            style={style}
            className={`${isEditing ? 'outline-dashed outline-2 outline-blue-500' : ''}`}
            onMouseDown={(e) => onMouseDown(e)}
            whileHover={isEditing ? { scale: 1.02 } : {}}
          >
            {element.content}
          </motion.h1>
        );
      case 'subheading':
        return (
          <motion.h2
            style={style}
            className={`${isEditing ? 'outline-dashed outline-2 outline-blue-500' : ''}`}
            onMouseDown={(e) => onMouseDown(e)}
            whileHover={isEditing ? { scale: 1.02 } : {}}
          >
            {element.content}
          </motion.h2>
        );
      case 'description':
        return (
          <motion.p
            style={style}
            className={`${isEditing ? 'outline-dashed outline-2 outline-blue-500' : ''}`}
            onMouseDown={(e) => onMouseDown(e)}
            whileHover={isEditing ? { scale: 1.02 } : {}}
          >
            {element.content}
          </motion.p>
        );
      case 'button':
        return (
          <motion.button
            style={style}
            className={`${isEditing ? 'outline-dashed outline-2 outline-blue-500' : 'hover:scale-105'} transition-transform`}
            onMouseDown={(e) => onMouseDown(e)}
            whileHover={isEditing ? { scale: 1.05 } : { scale: 1.05 }}
          >
            {element.content}
          </motion.button>
        );
      case 'social':
        return (
          <motion.div
            style={style}
            className={`${isEditing ? 'outline-dashed outline-2 outline-blue-500 p-2' : ''}`}
            onMouseDown={(e) => onMouseDown(e)}
          >
            {element.buttons.filter(btn => btn.visible).map(button => (
              <motion.a
                key={button.platform}
                href={button.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center"
                style={{ width: element.size, height: element.size }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {button.platform === 'facebook' && <Facebook size="100%" className="text-blue-600" />}
                {button.platform === 'twitter' && <Twitter size="100%" className="text-blue-400" />}
                {button.platform === 'instagram' && <Instagram size="100%" className="text-pink-600" />}
                {button.platform === 'linkedin' && <Linkedin size="100%" className="text-blue-700" />}
                {button.platform === 'youtube' && <Youtube size="100%" className="text-red-600" />}
              </motion.a>
            ))}
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {renderElement()}
      {isEditing && (
        <motion.div
          className="absolute z-20 bg-red-500 text-white rounded-full p-1 shadow-lg flex items-center justify-center"
          style={{
            left: `calc(${element.position.x}% + 20px)`,
            top: `calc(${element.position.y}% - 20px)`,
            transform: 'translate(-50%, -50%)',
            width: '24px',
            height: '24px'
          }}
          whileHover={{ scale: 1.1 }}
        >
          <X size={14} />
        </motion.div>
      )}
    </>
  );
};

const ElementEditor = ({ element, onChange, onRemove }) => {
  const [localElement, setLocalElement] = useState(element);

  useEffect(() => {
    setLocalElement(element);
  }, [element]);

  const handleChange = (key, value) => {
    setLocalElement(prev => ({ ...prev, [key]: value }));
    onChange(element.id, key, value);
  };

  const handlePositionChange = (axis, value) => {
    const newPosition = { ...localElement.position, [axis]: parseInt(value) };
    setLocalElement(prev => ({ ...prev, position: newPosition }));
    onChange(element.id, 'position', newPosition);
  };

  if (!element) return null;

  return (
    <div className="space-y-4 p-3 bg-gray-50 rounded-lg">
      {element.type !== 'social' && element.type !== 'image' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          {element.type === 'description' ? (
            <textarea
              value={localElement.content}
              onChange={(e) => handleChange('content', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              rows="3"
            />
          ) : (
            <input
              type="text"
              value={localElement.content}
              onChange={(e) => handleChange('content', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            />
          )}
        </div>
      )}

      {element.type !== 'social' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={parseFloat(localElement.fontSize)}
              onChange={(e) => handleChange('fontSize', `${e.target.value}rem`)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0.5rem</span>
              <span>{localElement.fontSize}</span>
              <span>5rem</span>
            </div>
          </div>

          {element.type !== 'button' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={localElement.color || '#000000'}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
          )}
        </>
      )}

      {element.type === 'button' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Button Color</label>
            <input
              type="color"
              value={localElement.backgroundColor}
              onChange={(e) => handleChange('backgroundColor', e.target.value)}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
            <input
              type="color"
              value={localElement.textColor}
              onChange={(e) => handleChange('textColor', e.target.value)}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Border Radius</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={parseFloat(localElement.borderRadius)}
              onChange={(e) => handleChange('borderRadius', `${e.target.value}rem`)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0rem</span>
              <span>{localElement.borderRadius}</span>
              <span>2rem</span>
            </div>
          </div>
        </>
      )}

      {element.type !== 'social' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alignment</label>
          <div className="flex space-x-2">
            <button
              onClick={() => handleChange('textAlign', 'left')}
              className={`p-2 border rounded-md ${localElement.textAlign === 'left' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => handleChange('textAlign', 'center')}
              className={`p-2 border rounded-md ${localElement.textAlign === 'center' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
            >
              <AlignCenter size={16} />
            </button>
            <button
              onClick={() => handleChange('textAlign', 'right')}
              className={`p-2 border rounded-md ${localElement.textAlign === 'right' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
            >
              <AlignRight size={16} />
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">X: {localElement.position.x}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={localElement.position.x}
              onChange={(e) => handlePositionChange('x', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Y: {localElement.position.y}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={localElement.position.y}
              onChange={(e) => handlePositionChange('y', e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => onRemove(element.id)}
        className="w-full mt-2 px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 flex items-center justify-center space-x-2"
      >
        <Trash2 size={16} />
        <span>Remove</span>
      </button>
    </div>
  );
};

export default ThankYouPageBuilder;