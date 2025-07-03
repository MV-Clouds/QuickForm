import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, 
  Layout, 
  Download, 
  Code, 
  RotateCcw, 
  Maximize, 
  Minimize, 
  Plus, 
  Trash2, 
  Move, 
  Type, 
  Image as ImageIcon,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  Upload,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Star,
  Sparkles,
  Heart
} from 'lucide-react';

const ModernPageBuilder = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSourceCode, setShowSourceCode] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  const [pageData, setPageData] = useState({
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    elements: [
      {
        id: 'hero-heading',
        type: 'heading',
        content: '🎉 Thank You!',
        position: { x: 400, y: 120 },
        style: {
          fontSize: '72px',
          fontWeight: '800',
          color: '#ffffff',
          textAlign: 'center',
          textShadow: '0 4px 20px rgba(0,0,0,0.3)',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.02em'
        }
      },
      {
        id: 'hero-subheading',
        type: 'subheading',
        content: 'Your submission has been received successfully',
        position: { x: 350, y: 220 },
        style: {
          fontSize: '28px',
          fontWeight: '500',
          color: '#ffffff',
          textAlign: 'center',
          textShadow: '0 2px 10px rgba(0,0,0,0.2)',
          opacity: '0.9'
        }
      },
      {
        id: 'hero-description',
        type: 'description',
        content: 'We appreciate your time and will get back to you within 24 hours. Check your email for confirmation.',
        position: { x: 300, y: 280 },
        style: {
          fontSize: '18px',
          fontWeight: '400',
          color: '#ffffff',
          textAlign: 'center',
          textShadow: '0 2px 8px rgba(0,0,0,0.2)',
          opacity: '0.8',
          lineHeight: '1.6',
          maxWidth: '600px'
        }
      },
      {
        id: 'cta-button',
        type: 'button',
        content: '✨ Back to Homepage',
        position: { x: 500, y: 380 },
        style: {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          padding: '16px 32px',
          borderRadius: '50px',
          fontSize: '18px',
          fontWeight: '600',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }
      },
      {
        id: 'secondary-button',
        type: 'button',
        content: '📧 Contact Support',
        position: { x: 500, y: 450 },
        style: {
          backgroundColor: 'transparent',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '25px',
          fontSize: '16px',
          fontWeight: '500',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }
      },
      {
        id: 'decorative-element',
        type: 'icon',
        content: '⭐',
        position: { x: 200, y: 200 },
        style: {
          fontSize: '48px',
          animation: 'float 3s ease-in-out infinite'
        }
      },
      {
        id: 'decorative-element-2',
        type: 'icon',
        content: '✨',
        position: { x: 1000, y: 300 },
        style: {
          fontSize: '36px',
          animation: 'float 3s ease-in-out infinite 1s'
        }
      }
    ],
    socialButtons: [
      {
        id: 'social-twitter',
        type: 'social',
        platform: 'twitter',
        url: 'https://twitter.com',
        position: { x: 520, y: 550 }
      },
      {
        id: 'social-facebook',
        type: 'social',
        platform: 'facebook',
        url: 'https://facebook.com',
        position: { x: 580, y: 550 }
      },
      {
        id: 'social-instagram',
        type: 'social',
        platform: 'instagram',
        url: 'https://instagram.com',
        position: { x: 640, y: 550 }
      }
    ]
  });

  const themes = [
    {
      name: 'Cosmic Purple',
      backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      textColor: '#ffffff',
      accent: '#ffffff'
    },
    {
      name: 'Ocean Breeze',
      backgroundColor: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
      textColor: '#ffffff',
      accent: '#ffffff'
    },
    {
      name: 'Sunset Glow',
      backgroundColor: 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)',
      textColor: '#ffffff',
      accent: '#ffffff'
    },
    {
      name: 'Forest Dream',
      backgroundColor: 'linear-gradient(135deg, #55a3ff 0%, #003d82 100%)',
      textColor: '#ffffff',
      accent: '#ffffff'
    },
    {
      name: 'Midnight Dark',
      backgroundColor: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
      textColor: '#ffffff',
      accent: '#ffffff'
    }
  ];

  const socialIcons = {
    facebook: Facebook,
    twitter: Twitter,
    instagram: Instagram,
    linkedin: Linkedin,
    youtube: Youtube,
    github: Github
  };

  const handleMouseDown = (e, elementId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const element = pageData.elements.find(el => el.id === elementId) || 
                   pageData.socialButtons.find(btn => btn.id === elementId);
    
    if (!element) return;

    setSelectedElement(elementId);
    setIsDragging(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    setDragOffset({
      x: e.clientX - (canvasRect.left + element.position.x),
      y: e.clientY - (canvasRect.top + element.position.y)
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !selectedElement) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - canvasRect.left - dragOffset.x;
    const newY = e.clientY - canvasRect.top - dragOffset.y;
    
    const boundedX = Math.max(0, Math.min(newX, canvasSize.width - 100));
    const boundedY = Math.max(0, Math.min(newY, canvasSize.height - 50));
    
    updateElement(selectedElement, {
      position: { x: boundedX, y: boundedY }
    });
  }, [isDragging, selectedElement, dragOffset, canvasSize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const updateElement = (elementId, updates) => {
    setPageData(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === elementId ? { ...el, ...updates } : el
      ),
      socialButtons: prev.socialButtons.map(btn => 
        btn.id === elementId ? { ...btn, ...updates } : btn
      )
    }));
  };

  const deleteElement = (elementId) => {
    setPageData(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== elementId),
      socialButtons: prev.socialButtons.filter(btn => btn.id !== elementId)
    }));
    setSelectedElement(null);
  };

  const addElement = (type) => {
    const newElement = {
      id: `${type}-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      position: { x: 400, y: 300 },
      style: getDefaultStyle(type)
    };

    setPageData(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }));
  };

  const getDefaultContent = (type) => {
    switch (type) {
      case 'heading': return '✨ New Heading';
      case 'subheading': return 'New Subheading';
      case 'description': return 'New description text goes here';
      case 'button': return '🚀 Click Me';
      case 'icon': return '⭐';
      default: return 'New Element';
    }
  };

  const getDefaultStyle = (type) => {
    switch (type) {
      case 'heading':
        return {
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#ffffff',
          textAlign: 'center',
          textShadow: '0 4px 20px rgba(0,0,0,0.3)'
        };
      case 'subheading':
        return {
          fontSize: '24px',
          fontWeight: '500',
          color: '#ffffff',
          textAlign: 'center',
          textShadow: '0 2px 10px rgba(0,0,0,0.2)'
        };
      case 'description':
        return {
          fontSize: '16px',
          fontWeight: 'normal',
          color: '#ffffff',
          textAlign: 'center',
          opacity: '0.9'
        };
      case 'button':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '25px',
          fontSize: '16px',
          fontWeight: '500',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(10px)',
          cursor: 'pointer'
        };
      case 'icon':
        return {
          fontSize: '32px'
        };
      default:
        return {};
    }
  };

  const applyTheme = (theme) => {
    setPageData(prev => ({
      ...prev,
      backgroundColor: theme.backgroundColor,
      elements: prev.elements.map(el => ({
        ...el,
        style: {
          ...el.style,
          color: theme.textColor
        }
      }))
    }));
  };

  const generateSourceCode = () => {
    const elementsHtml = pageData.elements.map(el => {
      const styles = Object.entries(el.style).map(([key, value]) => 
        `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`
      ).join('; ');

      const tag = el.type === 'heading' ? 'h1' : 
                 el.type === 'subheading' ? 'h2' : 
                 el.type === 'button' ? 'button' : 
                 el.type === 'icon' ? 'div' : 'p';

      return `    <${tag} style="position: absolute; left: ${el.position.x}px; top: ${el.position.y}px; ${styles}">${el.content}</${tag}>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern Thank You Page</title>
    <style>
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', sans-serif;
            background: ${pageData.backgroundColor};
            ${pageData.backgroundImage ? `background-image: url(${pageData.backgroundImage});` : ''}
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
        }
        
        .container {
            width: ${canvasSize.width}px;
            height: ${canvasSize.height}px;
            position: relative;
            margin: 0 auto;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 40px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <div class="container">
${elementsHtml}
    </div>
</body>
</html>`;
  };

  const ElementRenderer = ({ element }) => {
    const isSelected = selectedElement === element.id;
    
    const elementStyle = {
      position: 'absolute',
      left: element.position.x,
      top: element.position.y,
      ...element.style,
      cursor: isDragging && isSelected ? 'grabbing' : 'grab',
      border: isSelected ? '2px solid #3b82f6' : 'none',
      borderRadius: element.type === 'button' ? element.style.borderRadius : '4px',
      zIndex: isSelected ? 1000 : 1,
      userSelect: 'none'
    };

    const handleClick = (e) => {
      e.stopPropagation();
      if (!isDragging) {
        setSelectedElement(element.id);
      }
    };

    const content = (
      <motion.div
        style={elementStyle}
        onClick={handleClick}
        onMouseDown={(e) => handleMouseDown(e, element.id)}
        className={`transition-all duration-200 ${
          element.type === 'button' ? 'hover:scale-105 hover:shadow-lg' : 'hover:shadow-md'
        }`}
        whileHover={{ scale: element.type === 'button' ? 1.05 : 1.02 }}
        whileTap={{ scale: 0.98 }}
        animate={isSelected ? { scale: 1.02 } : { scale: 1 }}
      >
        {element.content}
        {isSelected && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => {
              e.stopPropagation();
              deleteElement(element.id);
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
          >
            <X size={12} />
          </motion.button>
        )}
      </motion.div>
    );

    switch (element.type) {
      case 'heading':
        return <h1 key={element.id}>{content}</h1>;
      case 'subheading':
        return <h2 key={element.id}>{content}</h2>;
      case 'description':
        return <p key={element.id}>{content}</p>;
      case 'button':
        return <button key={element.id}>{content}</button>;
      case 'icon':
        return <div key={element.id}>{content}</div>;
      default:
        return <div key={element.id}>{content}</div>;
    }
  };

  const SocialButtonRenderer = ({ button }) => {
    const IconComponent = socialIcons[button.platform];
    const isSelected = selectedElement === button.id;
    
    return (
      <motion.div
        key={button.id}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDragging) {
            setSelectedElement(button.id);
          }
        }}
        onMouseDown={(e) => handleMouseDown(e, button.id)}
        style={{
          position: 'absolute',
          left: button.position.x,
          top: button.position.y,
          border: isSelected ? '2px solid #3b82f6' : 'none',
          borderRadius: '50%',
          cursor: isDragging && isSelected ? 'grabbing' : 'grab',
          zIndex: isSelected ? 1000 : 1
        }}
        className="w-12 h-12 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={isSelected ? { scale: 1.1 } : { scale: 1 }}
      >
        <IconComponent size={20} className="text-white" />
        {isSelected && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => {
              e.stopPropagation();
              deleteElement(button.id);
            }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
          >
            <X size={10} />
          </motion.button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Floating Action Menu */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-4 left-4 z-50 bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10"
      >
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="text-purple-400" size={20} />
          <span className="font-semibold">Page Builder</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          {['heading', 'subheading', 'description', 'button', 'icon'].map((type) => (
            <motion.button
              key={type}
              onClick={() => addElement(type)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 text-xs font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={12} className="mx-auto mb-1" />
              {type}
            </motion.button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-300 mb-2">Themes</div>
          <div className="grid grid-cols-1 gap-1">
            {themes.map((theme) => (
              <motion.button
                key={theme.name}
                onClick={() => applyTheme(theme)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 text-xs text-left"
                whileHover={{ scale: 1.02 }}
              >
                <div 
                  className="w-4 h-4 rounded mb-1" 
                  style={{ background: theme.backgroundColor }}
                />
                {theme.name}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex space-x-2 mt-4">
          <motion.button
            onClick={() => setShowSourceCode(true)}
            className="flex-1 flex items-center justify-center space-x-1 p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-all duration-200 text-xs"
            whileHover={{ scale: 1.05 }}
          >
            <Code size={12} />
            <span>Code</span>
          </motion.button>
          <motion.button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
            whileHover={{ scale: 1.05 }}
          >
            {isFullscreen ? <Minimize size={12} /> : <Maximize size={12} />}
          </motion.button>
        </div>
      </motion.div>

      {/* Property Panel */}
      <AnimatePresence>
        {selectedElement && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-4 right-4 z-50 w-80 bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Element Properties</h3>
              <button
                onClick={() => setSelectedElement(null)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X size={16} />
              </button>
            </div>
            
            {(() => {
              const element = pageData.elements.find(el => el.id === selectedElement) || 
                           pageData.socialButtons.find(btn => btn.id === selectedElement);
              
              if (!element) return null;

              return (
                <div className="space-y-3">
                  {element.content !== undefined && (
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Content</label>
                      <input
                        type="text"
                        value={element.content}
                        onChange={(e) => updateElement(selectedElement, { content: e.target.value })}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                      />
                    </div>
                  )}
                  
                  {element.style && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">Font Size</label>
                          <input
                            type="text"
                            value={element.style.fontSize || '16px'}
                            onChange={(e) => updateElement(selectedElement, { 
                              style: { ...element.style, fontSize: e.target.value }
                            })}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">Color</label>
                          <input
                            type="color"
                            value={element.style.color || '#ffffff'}
                            onChange={(e) => updateElement(selectedElement, { 
                              style: { ...element.style, color: e.target.value }
                            })}
                            className="w-full h-10 bg-white/10 border border-white/20 rounded-lg"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Canvas */}
      <div className={`${isFullscreen ? 'fixed inset-0 z-40' : 'pt-20'} flex items-center justify-center min-h-screen`}>
        <motion.div
          ref={canvasRef}
          className="relative border border-white/20 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            background: pageData.backgroundColor,
            backgroundImage: pageData.backgroundImage ? `url(${pageData.backgroundImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          onClick={() => setSelectedElement(null)}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Background Overlay */}
          <div className="absolute inset-0 bg-black/20" />
          
          {/* Floating Animation Keyframes */}
          <style jsx>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-20px); }
            }
          `}</style>
          
          {/* Elements */}
          {pageData.elements.map((element) => (
            <ElementRenderer key={element.id} element={element} />
          ))}
          
          {/* Social Buttons */}
          {pageData.socialButtons.map((button) => (
            <SocialButtonRenderer key={button.id} button={button} />
          ))}
        </motion.div>
      </div>

      {/* Source Code Modal */}
      <AnimatePresence>
        {showSourceCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-auto border border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Generated Source Code</h3>
                <button
                  onClick={() => setShowSourceCode(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <pre className="bg-gray-800 p-4 rounded-lg overflow-auto text-sm">
                <code className="text-gray-300">{generateSourceCode()}</code>
              </pre>
              <div className="flex justify-end mt-4">
                <motion.button
                  onClick={() => navigator.clipboard.writeText(generateSourceCode())}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Copy size={16} />
                  <span>Copy Code</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModernPageBuilder;