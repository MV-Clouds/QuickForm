import React, { useState, useRef, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'prism-react-renderer';
import { 
  X, Maximize, Minimize, Copy, Plus, Trash2, 
  Type, Heading1, Heading2, Text, MousePointerClick,
  Image as ImageIcon, Sliders, Code, Palette, LayoutGrid,
  Move, Crop, Droplet, Bold, Italic, AlignLeft, 
  AlignCenter, AlignRight, ImagePlus
} from 'lucide-react';

const ThankYouPageBuilder = () => {
  const [activeTab, setActiveTab] = useState('layout');
  const [elements, setElements] = useState([
    { 
      id: '1', 
      type: 'heading', 
      content: 'Thank You!', 
      order: 0,
      position: { x: 50, y: 20 },
      fontSize: '2.5rem',
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: 'center',
      color: '#2d3748'
    },
    { 
      id: '2', 
      type: 'subheading', 
      content: 'We appreciate your submission', 
      order: 1,
      position: { x: 50, y: 30 },
      fontSize: '1.5rem',
      fontWeight: '600',
      fontStyle: 'normal',
      textAlign: 'center',
      color: '#4a5568'
    },
    { 
      id: '3', 
      type: 'description', 
      content: 'Your request has been received and our team will get back to you shortly.', 
      order: 2,
      position: { x: 50, y: 45 },
      fontSize: '1rem',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      color: '#718096',
      lineHeight: '1.5'
    },
    { 
      id: '4', 
      type: 'button', 
      content: 'Return Home', 
      order: 3,
      position: { x: 50, y: 65 },
      fontSize: '1rem',
      backgroundColor: '#4f46e5',
      textColor: '#ffffff',
      borderRadius: '0.375rem',
      padding: '0.5rem 1.5rem',
      textAlign: 'center'
    },
  ]);
  
  const [design, setDesign] = useState({
    backgroundColor: '#ffffff',
    backgroundImage: null,
    backgroundOpacity: 1,
    backgroundBlur: 0,
    containerPadding: '2rem',
    containerMaxWidth: '42rem',
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editingSource, setEditingSource] = useState(false);
  const [sourceCode, setSourceCode] = useState('');
  const [editedSourceCode, setEditedSourceCode] = useState('');
  const [deviceSize, setDeviceSize] = useState('desktop');
  const [editingElement, setEditingElement] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const themes = [
    {
      name: 'Elegant',
      values: {
        backgroundColor: '#f8f5f2',
        elements: [
          { id: '1', color: '#2c3e50', fontSize: '2.75rem', fontWeight: 'bold' },
          { id: '2', color: '#7f8c8d', fontSize: '1.75rem' },
          { id: '3', color: '#95a5a6', lineHeight: '1.6' },
          { id: '4', backgroundColor: '#3498db', textColor: '#ffffff' }
        ]
      }
    },
    {
      name: 'Modern',
      values: {
        backgroundColor: '#f0f4f8',
        elements: [
          { id: '1', color: '#1a365d', fontSize: '3rem', fontWeight: '800' },
          { id: '2', color: '#2d3748', fontSize: '1.5rem' },
          { id: '3', color: '#4a5568' },
          { id: '4', backgroundColor: '#3182ce', textColor: '#ffffff' }
        ]
      }
    },
    {
      name: 'Vibrant',
      values: {
        backgroundColor: '#ffffff',
        elements: [
          { id: '1', color: '#d53f8c', fontSize: '3rem', fontWeight: 'bold' },
          { id: '2', color: '#805ad5' },
          { id: '3', color: '#718096' },
          { id: '4', backgroundColor: '#38a169', textColor: '#ffffff' }
        ]
      }
    }
  ];

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleDesignChange = (key, value) => {
    setDesign(prev => ({ ...prev, [key]: value }));
  };

  const handleElementChange = (id, key, value) => {
    setElements(prev => 
      prev.map(el => el.id === id ? { ...el, [key]: value } : el)
    );
  };

  const handleElementPositionChange = (id, x, y) => {
    setElements(prev => 
      prev.map(el => el.id === id ? { ...el, position: { x, y } } : el)
    );
  };

  const moveElement = (dragIndex, hoverIndex) => {
    setElements(prev => {
      const draggedItem = prev.find(item => item.order === dragIndex);
      const hoverItem = prev.find(item => item.order === hoverIndex);
      
      return prev.map(item => {
        if (item.id === draggedItem.id) return { ...item, order: hoverIndex };
        if (item.id === hoverItem.id) return { ...item, order: dragIndex };
        return item;
      });
    });
  };

  const applyTheme = (theme) => {
    setDesign(prev => ({ ...prev, backgroundColor: theme.values.backgroundColor }));
    
    theme.values.elements.forEach(elementTheme => {
      const element = elements.find(el => el.id === elementTheme.id);
      if (element) {
        const updates = { ...elementTheme };
        delete updates.id;
        handleElementChange(element.id, updates);
      }
    });
  };

  const resetDesign = () => {
    setDesign({
      backgroundColor: '#ffffff',
      backgroundImage: null,
      backgroundOpacity: 1,
      backgroundBlur: 0,
      containerPadding: '2rem',
      containerMaxWidth: '42rem',
    });

    setElements([
      { 
        id: '1', 
        type: 'heading', 
        content: 'Thank You!', 
        order: 0,
        position: { x: 50, y: 20 },
        fontSize: '2.5rem',
        fontWeight: 'bold',
        fontStyle: 'normal',
        textAlign: 'center',
        color: '#2d3748'
      },
      { 
        id: '2', 
        type: 'subheading', 
        content: 'We appreciate your submission', 
        order: 1,
        position: { x: 50, y: 30 },
        fontSize: '1.5rem',
        fontWeight: '600',
        fontStyle: 'normal',
        textAlign: 'center',
        color: '#4a5568'
      },
      { 
        id: '3', 
        type: 'description', 
        content: 'Your request has been received and our team will get back to you shortly.', 
        order: 2,
        position: { x: 50, y: 45 },
        fontSize: '1rem',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'center',
        color: '#718096',
        lineHeight: '1.5'
      },
      { 
        id: '4', 
        type: 'button', 
        content: 'Return Home', 
        order: 3,
        position: { x: 50, y: 65 },
        fontSize: '1rem',
        backgroundColor: '#4f46e5',
        textColor: '#ffffff',
        borderRadius: '0.375rem',
        padding: '0.5rem 1.5rem',
        textAlign: 'center'
      },
    ]);
  };

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (type === 'background') {
          handleDesignChange('backgroundImage', event.target.result);
        } else {
          // For element images if needed
        }
      };
      reader.readAsDataURL(file);
    }
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
    const thankYouPage = document.getElementById('thank-you-page');
    if (!thankYouPage) return '';
    
    const html = thankYouPage.outerHTML;
    const formatted = html
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\s/g, '&nbsp;');
    
    return html;
  };

  const showSourceModalOpen = () => {
    const code = generateSourceCode();
    setSourceCode(code);
    setEditedSourceCode(code);
    setShowSourceModal(true);
    setEditingSource(false);
  };

  const copySourceCode = () => {
    navigator.clipboard.writeText(editedSourceCode);
  };

  const applySourceCodeChanges = () => {
    // This would need a proper HTML parser in a real application
    // For demo purposes, we'll just update the source code
    setSourceCode(editedSourceCode);
    setEditingSource(false);
    // In a real app, you would parse the HTML and update the state accordingly
  };

  const addElement = (type) => {
    const newId = Date.now().toString();
    let content = '';
    let position = { x: 50, y: elements.length * 15 + 20 };
    
    switch (type) {
      case 'heading': 
        content = 'New Heading';
        position = { x: 50, y: 20 };
        break;
      case 'subheading': 
        content = 'New Subheading';
        position = { x: 50, y: 30 };
        break;
      case 'description': 
        content = 'New description text';
        position = { x: 50, y: 45 };
        break;
      case 'button': 
        content = 'New Button';
        position = { x: 50, y: 65 };
        break;
      default: content = 'New Element';
    }
    
    const newElement = {
      id: newId,
      type,
      content,
      order: elements.length,
      position,
      fontSize: type === 'heading' ? '2.5rem' : 
               type === 'subheading' ? '1.5rem' : '1rem',
      fontWeight: type === 'heading' ? 'bold' : 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      color: type === 'heading' ? '#2d3748' : 
            type === 'subheading' ? '#4a5568' : '#718096',
    };

    if (type === 'button') {
      newElement.backgroundColor = '#4f46e5';
      newElement.textColor = '#ffffff';
      newElement.borderRadius = '0.375rem';
      newElement.padding = '0.5rem 1.5rem';
    }

    setElements(prev => [...prev, newElement]);
    setEditingElement(newId);
  };

  const removeElement = (id) => {
    setElements(prev => prev.filter(el => el.id !== id));
  };

  const getDeviceWidth = () => {
    switch (deviceSize) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return design.containerMaxWidth;
      default: return design.containerMaxWidth;
    }
  };

  const handleDoubleClick = (element) => {
    setEditingElement(element.id);
    setActiveTool(null);
  };

  const handleCanvasClick = (e) => {
    if (e.target === containerRef.current) {
      setEditingElement(null);
      setActiveTool(null);
    }
  };

  const handlePositionChange = (id, e) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    handleElementPositionChange(id, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-50">
        {/* Main Canvas Area */}
        <div 
          ref={canvasRef}
          className={`flex-1 p-4 overflow-auto transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}`}
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <button 
                onClick={() => setDeviceSize('mobile')}
                className={`px-3 py-1 rounded-md flex items-center space-x-1 ${deviceSize === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                <span>Mobile</span>
              </button>
              <button 
                onClick={() => setDeviceSize('tablet')}
                className={`px-3 py-1 rounded-md flex items-center space-x-1 ${deviceSize === 'tablet' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                <span>Tablet</span>
              </button>
              <button 
                onClick={() => setDeviceSize('desktop')}
                className={`px-3 py-1 rounded-md flex items-center space-x-1 ${deviceSize === 'desktop' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                <span>Desktop</span>
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
                onClick={showSourceModalOpen}
                className="px-3 py-1 flex items-center space-x-1 bg-gray-800 text-white rounded-md hover:bg-gray-700"
              >
                <Code size={16} />
                <span>Source Code</span>
              </button>
            </div>
          </div>
          
          <div className="flex justify-center">
            <motion.div 
              ref={containerRef}
              id="thank-you-page"
              className="relative rounded-lg shadow-lg transition-all duration-300"
              style={{
                backgroundColor: design.backgroundColor,
                padding: design.containerPadding,
                maxWidth: getDeviceWidth(),
                width: '100%',
                minHeight: '500px',
                backgroundImage: design.backgroundImage ? `url(${design.backgroundImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              onClick={handleCanvasClick}
            >
              {design.backgroundImage && (
                <div 
                  className="absolute inset-0 rounded-lg"
                  style={{
                    backgroundColor: `rgba(255, 255, 255, ${1 - design.backgroundOpacity})`,
                    backdropFilter: `blur(${design.backgroundBlur}px)`,
                  }}
                />
              )}
              
              <AnimatePresence>
                {elements.sort((a, b) => a.order - b.order).map((element) => (
                  <DraggableElement
                    key={element.id}
                    element={element}
                    design={design}
                    isEditing={editingElement === element.id}
                    onDoubleClick={() => handleDoubleClick(element)}
                    onChange={(key, value) => handleElementChange(element.id, key, value)}
                    onPositionChange={(e) => handlePositionChange(element.id, e)}
                    onRemove={() => removeElement(element.id)}
                    activeTool={activeTool}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
        
        {/* Design Sidebar */}
        <motion.div 
          className="w-96 bg-white border-l border-gray-200 overflow-y-auto"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Palette size={20} className="mr-2" />
              Design Options
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
            <button
              className={`flex-1 py-3 flex items-center justify-center space-x-1 ${activeTab === 'elements' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-600'}`}
              onClick={() => setActiveTab('elements')}
            >
              <Type size={16} />
              <span>Elements</span>
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto h-[calc(100vh-120px)]">
            <button 
              onClick={resetDesign}
              className="w-full mb-4 px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 flex items-center justify-center space-x-2"
            >
              <Trash2 size={16} />
              <span>Reset All</span>
            </button>
            
            {activeTab === 'layout' ? (
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-700 flex items-center">
                    <Droplet size={16} className="mr-2" />
                    Background
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={design.backgroundColor}
                        onChange={(e) => handleDesignChange('backgroundColor', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={design.backgroundColor}
                        onChange={(e) => handleDesignChange('backgroundColor', e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Background Image</label>
                    <label className="flex flex-col items-center px-4 py-3 bg-white rounded-md border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-500">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'background')}
                        className="hidden"
                      />
                      <div className="flex items-center space-x-2">
                        <ImagePlus size={16} />
                        <span className="text-sm">Upload Image</span>
                      </div>
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
                          onChange={(e) => handleDesignChange('backgroundOpacity', parseFloat(e.target.value))}
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
                          onChange={(e) => handleDesignChange('backgroundBlur', parseInt(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>0px</span>
                          <span>{design.backgroundBlur}px</span>
                          <span>10px</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDesignChange('backgroundImage', null)}
                        className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 flex items-center justify-center space-x-2"
                      >
                        <Trash2 size={16} />
                        <span>Remove Image</span>
                      </button>
                    </>
                  )}
                </div>
                
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-700 flex items-center">
                    <LayoutGrid size={16} className="mr-2" />
                    Container
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Padding</label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={parseFloat(design.containerPadding)}
                      onChange={(e) => handleDesignChange('containerPadding', `${parseFloat(e.target.value)}rem`)}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0</span>
                      <span>{design.containerPadding}</span>
                      <span>5rem</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Width</label>
                    <select
                      value={design.containerMaxWidth}
                      onChange={(e) => handleDesignChange('containerMaxWidth', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="20rem">Small (20rem)</option>
                      <option value="30rem">Medium (30rem)</option>
                      <option value="42rem">Large (42rem)</option>
                      <option value="56rem">Extra Large (56rem)</option>
                      <option value="100%">Full Width</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'theme' ? (
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="font-medium text-gray-700">Prebuilt Themes</h3>
                <div className="grid grid-cols-2 gap-4">
                  {themes.map(theme => (
                    <motion.button
                      key={theme.name}
                      onClick={() => applyTheme(theme)}
                      className="p-4 border rounded-md hover:border-blue-500 transition-colors flex flex-col items-center"
                      style={{
                        backgroundColor: theme.values.backgroundColor,
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="font-medium" style={{ color: theme.values.elements[0]?.color || '#000' }}>
                        {theme.name}
                      </span>
                      <div className="mt-2 w-full space-y-1">
                        <div 
                          className="h-1 rounded-full" 
                          style={{ backgroundColor: theme.values.elements[0]?.color || '#000' }}
                        />
                        <div 
                          className="h-1 rounded-full" 
                          style={{ backgroundColor: theme.values.elements[1]?.color || '#000' }}
                        />
                        <div 
                          className="h-1 rounded-full" 
                          style={{ backgroundColor: theme.values.elements[2]?.color || '#000' }}
                        />
                        <div 
                          className="h-1 rounded-full" 
                          style={{ 
                            backgroundColor: theme.values.elements[3]?.backgroundColor || '#000',
                            width: '70%',
                            marginLeft: '15%'
                          }}
                        />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="font-medium text-gray-700">Add Elements</h3>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    onClick={() => addElement('heading')}
                    className="p-3 border rounded-md hover:border-blue-500 hover:bg-blue-50 flex flex-col items-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Heading1 size={20} className="text-blue-500" />
                    <span className="text-sm mt-1">Heading</span>
                  </motion.button>
                  <motion.button
                    onClick={() => addElement('subheading')}
                    className="p-3 border rounded-md hover:border-blue-500 hover:bg-blue-50 flex flex-col items-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Heading2 size={20} className="text-blue-500" />
                    <span className="text-sm mt-1">Subheading</span>
                  </motion.button>
                  <motion.button
                    onClick={() => addElement('description')}
                    className="p-3 border rounded-md hover:border-blue-500 hover:bg-blue-50 flex flex-col items-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Text size={20} className="text-blue-500" />
                    <span className="text-sm mt-1">Description</span>
                  </motion.button>
                  <motion.button
                    onClick={() => addElement('button')}
                    className="p-3 border rounded-md hover:border-blue-500 hover:bg-blue-50 flex flex-col items-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <MousePointerClick size={20} className="text-blue-500" />
                    <span className="text-sm mt-1">Button</span>
                  </motion.button>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-700 mb-3">Current Elements</h3>
                  <div className="space-y-2">
                    {elements.sort((a, b) => a.order - b.order).map(element => (
                      <motion.div 
                        key={element.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="flex items-center space-x-2">
                          {element.type === 'heading' && <Heading1 size={16} />}
                          {element.type === 'subheading' && <Heading2 size={16} />}
                          {element.type === 'description' && <Text size={16} />}
                          {element.type === 'button' && <MousePointerClick size={16} />}
                          <span className="text-sm capitalize">{element.type}</span>
                        </div>
                        <button 
                          onClick={() => removeElement(element.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
        
        {/* Element Editor Panel (appears when editing an element) */}
        {editingElement && (
          <motion.div 
            className="w-80 bg-white border-l border-gray-200 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                {elements.find(el => el.id === editingElement)?.type === 'heading' && <Heading1 size={20} className="mr-2" />}
                {elements.find(el => el.id === editingElement)?.type === 'subheading' && <Heading2 size={20} className="mr-2" />}
                {elements.find(el => el.id === editingElement)?.type === 'description' && <Text size={20} className="mr-2" />}
                {elements.find(el => el.id === editingElement)?.type === 'button' && <MousePointerClick size={20} className="mr-2" />}
                {elements.find(el => el.id === editingElement)?.type} Editor
              </h2>
              <button 
                onClick={() => setEditingElement(null)}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                {elements.find(el => el.id === editingElement)?.type === 'description' ? (
                  <textarea
                    value={elements.find(el => el.id === editingElement)?.content || ''}
                    onChange={(e) => handleElementChange(editingElement, 'content', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    rows="3"
                  />
                ) : (
                  <input
                    type="text"
                    value={elements.find(el => el.id === editingElement)?.content || ''}
                    onChange={(e) => handleElementChange(editingElement, 'content', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  />
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={parseFloat(elements.find(el => el.id === editingElement)?.fontSize || '1rem').toString().replace('rem', '')}
                  onChange={(e) => handleElementChange(editingElement, 'fontSize', `${e.target.value}rem`)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0.5rem</span>
                  <span>{elements.find(el => el.id === editingElement)?.fontSize}</span>
                  <span>5rem</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  value={elements.find(el => el.id === editingElement)?.color || '#000000'}
                  onChange={(e) => handleElementChange(editingElement, 'color', e.target.value)}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
              
              {elements.find(el => el.id === editingElement)?.type === 'button' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Button Color</label>
                    <input
                      type="color"
                      value={elements.find(el => el.id === editingElement)?.backgroundColor || '#4f46e5'}
                      onChange={(e) => handleElementChange(editingElement, 'backgroundColor', e.target.value)}
                      className="w-full h-10 rounded cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                    <input
                      type="color"
                      value={elements.find(el => el.id === editingElement)?.textColor || '#ffffff'}
                      onChange={(e) => handleElementChange(editingElement, 'textColor', e.target.value)}
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
                      value={parseFloat(elements.find(el => el.id === editingElement)?.borderRadius || '0.375rem').toString().replace('rem', '')}
                      onChange={(e) => handleElementChange(editingElement, 'borderRadius', `${e.target.value}rem`)}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0rem</span>
                      <span>{elements.find(el => el.id === editingElement)?.borderRadius}</span>
                      <span>2rem</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alignment</label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleElementChange(editingElement, 'textAlign', 'left')}
                        className={`p-2 border rounded-md ${elements.find(el => el.id === editingElement)?.textAlign === 'left' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                      >
                        <AlignLeft size={16} />
                      </button>
                      <button
                        onClick={() => handleElementChange(editingElement, 'textAlign', 'center')}
                        className={`p-2 border rounded-md ${elements.find(el => el.id === editingElement)?.textAlign === 'center' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                      >
                        <AlignCenter size={16} />
                      </button>
                      <button
                        onClick={() => handleElementChange(editingElement, 'textAlign', 'right')}
                        className={`p-2 border rounded-md ${elements.find(el => el.id === editingElement)?.textAlign === 'right' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                      >
                        <AlignRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
              
              {elements.find(el => el.id === editingElement)?.type !== 'button' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alignment</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleElementChange(editingElement, 'textAlign', 'left')}
                      className={`p-2 border rounded-md ${elements.find(el => el.id === editingElement)?.textAlign === 'left' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                    >
                      <AlignLeft size={16} />
                    </button>
                    <button
                      onClick={() => handleElementChange(editingElement, 'textAlign', 'center')}
                      className={`p-2 border rounded-md ${elements.find(el => el.id === editingElement)?.textAlign === 'center' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                    >
                      <AlignCenter size={16} />
                    </button>
                    <button
                      onClick={() => handleElementChange(editingElement, 'textAlign', 'right')}
                      className={`p-2 border rounded-md ${elements.find(el => el.id === editingElement)?.textAlign === 'right' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                    >
                      <AlignRight size={16} />
                    </button>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Font Weight</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleElementChange(editingElement, 'fontWeight', 'normal')}
                    className={`p-2 border rounded-md ${elements.find(el => el.id === editingElement)?.fontWeight === 'normal' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                  >
                    <span className="text-sm">Normal</span>
                  </button>
                  <button
                    onClick={() => handleElementChange(editingElement, 'fontWeight', 'bold')}
                    className={`p-2 border rounded-md ${elements.find(el => el.id === editingElement)?.fontWeight === 'bold' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                  >
                    <Bold size={16} />
                  </button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-700 mb-2">Position</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Double click and drag the element on canvas to reposition
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">X Position</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={elements.find(el => el.id === editingElement)?.position.x || 50}
                        onChange={(e) => handleElementChange(editingElement, 'position', {
                          ...elements.find(el => el.id === editingElement)?.position,
                          x: parseInt(e.target.value)
                        })}
                        className="flex-1"
                      />
                      <span className="text-sm w-10 text-center">
                        {elements.find(el => el.id === editingElement)?.position.x || 50}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Y Position</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={elements.find(el => el.id === editingElement)?.position.y || 50}
                        onChange={(e) => handleElementChange(editingElement, 'position', {
                          ...elements.find(el => el.id === editingElement)?.position,
                          y: parseInt(e.target.value)
                        })}
                        className="flex-1"
                      />
                      <span className="text-sm w-10 text-center">
                        {elements.find(el => el.id === editingElement)?.position.y || 50}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
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
                    {editingSource ? (
                      <>
                        <button 
                          onClick={applySourceCodeChanges}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Apply Changes
                        </button>
                        <button 
                          onClick={() => setEditingSource(false)}
                          className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => setEditingSource(true)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Edit
                        </button>
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
                      </>
                    )}
                  </div>
                </div>
                
                <div className="overflow-auto p-4 bg-gray-800 flex-1">
                  {editingSource ? (
                    <textarea
                      value={editedSourceCode}
                      onChange={(e) => setEditedSourceCode(e.target.value)}
                      className="w-full h-full p-4 font-mono text-white bg-gray-900 rounded"
                      style={{ minHeight: '400px' }}
                    />
                  ) : (
                    <SyntaxHighlighter language="html" style={null} className="text-sm">
                      {sourceCode}
                    </SyntaxHighlighter>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DndProvider>
  );
};

const DraggableElement = ({ 
  element, 
  design, 
  isEditing, 
  onDoubleClick, 
  onChange, 
  onPositionChange, 
  onRemove,
  activeTool
}) => {
  const ref = useRef(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'element',
    item: { id: element.id, index: element.order },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const [, drop] = useDrop({
    accept: 'element',
    hover: (item, monitor) => {
      if (!ref.current) return;
      // Handle drop logic if needed
    },
  });
  
  drag(drop(ref));
  
  const handleMouseDown = (e) => {
    if (e.detail === 2) { // Double click
      onDoubleClick();
      return;
    }
    
    if (isEditing) {
      const startX = e.clientX;
      const startY = e.clientY;
      const startPos = { ...element.position };
      
      const handleMouseMove = (moveEvent) => {
        const container = ref.current?.parentElement;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
        const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;
        
        const newX = Math.max(0, Math.min(100, startPos.x + deltaX));
        const newY = Math.max(0, Math.min(100, startPos.y + deltaY));
        
        onPositionChange({
          ...moveEvent,
          clientX: newX,
          clientY: newY
        });
      };
      
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };
  
  const renderElement = () => {
    const style = {
      position: 'absolute',
      left: `${element.position.x}%`,
      top: `${element.position.y}%`,
      transform: 'translate(-50%, -50%)',
      fontSize: element.fontSize,
      fontWeight: element.fontWeight,
      fontStyle: element.fontStyle,
      color: element.color,
      textAlign: element.textAlign,
      lineHeight: element.lineHeight,
      opacity: isDragging ? 0.5 : 1,
      cursor: isEditing ? 'move' : 'pointer',
      zIndex: isEditing ? 10 : 1,
      transition: 'all 0.2s ease',
    };
    
    if (element.type === 'button') {
      Object.assign(style, {
        backgroundColor: element.backgroundColor,
        color: element.textColor,
        borderRadius: element.borderRadius,
        padding: element.padding,
        textAlign: element.textAlign,
      });
    }

    switch (element.type) {
      case 'heading':
        return (
          <motion.h1
            ref={ref}
            style={style}
            className="whitespace-nowrap"
            onMouseDown={handleMouseDown}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={isEditing ? { scale: 1.05 } : {}}
          >
            {element.content}
          </motion.h1>
        );
      case 'subheading':
        return (
          <motion.h2
            ref={ref}
            style={style}
            className="whitespace-nowrap"
            onMouseDown={handleMouseDown}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={isEditing ? { scale: 1.05 } : {}}
          >
            {element.content}
          </motion.h2>
        );
      case 'description':
        return (
          <motion.p
            ref={ref}
            style={{
              ...style,
              whiteSpace: 'pre-wrap',
              width: '80%',
              maxWidth: '100%',
            }}
            onMouseDown={handleMouseDown}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={isEditing ? { scale: 1.02 } : {}}
          >
            {element.content}
          </motion.p>
        );
      case 'button':
        return (
          <motion.button
            ref={ref}
            style={style}
            onMouseDown={handleMouseDown}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={isEditing ? { scale: 1.05 } : { opacity: 0.9 }}
          >
            {element.content}
          </motion.button>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="relative">
      {renderElement()}
      {isEditing && (
        <button
          onClick={() => onRemove(element.id)}
          className="absolute -right-2 -top-2 p-1 bg-red-500 text-white rounded-full shadow-md z-20"
          style={{
            transform: 'translate(0, 0)',
            left: 'auto',
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default ThankYouPageBuilder;