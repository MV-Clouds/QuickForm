"use client"
import { ContentLayout } from "@/components/admin-panel/content-layout";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './ThankYouQF.css'
import Image from 'next/image';
const QuickForm = () => {
  const [formState, setFormState] = useState({
    text: '',
    url: '',
    richtext: '',
    label: 'THANK YOU PAGE',
    changeLabel: 'THANK YOU PAGE',
    currentThankYouId: '',
    thankYouType: 'None',
    picklist: 'none',
    imageUrl: '',
    textStyle: {
      fontSize: '16px',
      fontFamily: 'Roboto, sans-serif',
      fontWeight: '400',
      textAlign: 'center',
      color: '#1a202c'
    },
    imageStyle: {
      width: '400px',
      height: '200px',
      position: 'relative',
      left: '0px',
      top: '0px'
    },
    backgroundStyle: {
      backgroundColor: '#ffffff'
    }
    ,
    actionButtons: [],
        customHtml: ''
  });

  const [visibility, setVisibility] = useState({
    text: false,
    richtext: false,
    url: false,
    text_url: false,
    none: true
  });

  const [uiState, setUiState] = useState({
    isEditing: true,
    showLabelEditor: false,
    isLoading: false,
    errorMessage: '',
    isFullscreen: false,
    showTemplatePanel: false,
    showActionModal: false,
        showSourceCodeModal: false
  });

  const whitepen = '';
  const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
  const imageRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const actionOptions = [
    {
      id: 'visit_website',
      label: 'Visit Website',
      description: 'Redirects to your website.',
      action: () => window.open('https://example.com', '_blank')
    },
    {
      id: 'download_file',
      label: 'Download File',
      description: 'Triggers a file download.',
      action: () => {
        const link = document.createElement('a');
        link.href = 'https://example.com/sample.pdf';
        link.download = 'sample.pdf';
        link.click();
      }
    },
    {
      id: 'share_social',
      label: 'Share on Social',
      description: 'Opens social sharing options.',
      action: () => window.open('https://twitter.com/intent/tweet?text=Check%20this%20out!', '_blank')
    },
    {
      id: 'contact_us',
      label: 'Contact Us',
      description: 'Opens a contact form or email.',
      action: () => window.location.href = 'mailto:support@example.com'
    },
    {
      id: 'back_home',
      label: 'Back to Home',
      description: 'Redirects to the homepage.',
      action: () => window.location.href = '/'
    }
  ];
  const templates = [
    {
      id: 'modern',
      name: 'Modern',
      imageUrl: 'https://img.freepik.com/premium-vector/opened-envelope-document-with-green-check-mark-line-icon-official-confirmation-message-mail-sent-successfully-email-delivery-verification-email-flat-design-vector_662353-720.jpg',
      textStyle: { fontSize: '18px', fontFamily: 'Roboto, sans-serif', fontWeight: '500', textAlign: 'center', color: '#ffffff' },
      imageStyle: { width: '400px', height: '200px', position: 'relative', left: '0px', top: '0px' },
      backgroundStyle: { background: 'linear-gradient(135deg, #4c8bf5, #7f9cf5)', animation: 'fadeIn 1s ease-in' }
    },
    {
      id: 'minimal',
      name: 'Minimal',
      imageUrl: 'https://img.freepik.com/premium-vector/opened-envelope-document-with-green-check-mark-line-icon-official-confirmation-message-mail-sent-successfully-email-delivery-verification-email-flat-design-vector_662353-720.jpg',
      textStyle: {
        fontSize: '15px',
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontWeight: '300',
        textAlign: 'center',
        color: '#333' // softer than pure black
      },
      imageStyle: {
        width: '380px',
        height: 'auto',
        display: 'block',
        margin: '0 auto',
        position: 'static' // removes unnecessary positioning
      },
      backgroundStyle: {
        backgroundColor: '#f9f9f9', // subtle off-white
        border: '1px solid #ddd',   // lighter, minimal border
        padding: '20px',
        borderRadius: '8px',        // subtle rounding
        // maxWidth: '400px',
        margin: '0 auto'            // center horizontally
      }
    }
    ,
    {
      id: 'bold',
      name: 'Bold',
      imageUrl: 'https://i.pinimg.com/736x/a8/9c/89/a89c897219e83c44f0a116827e2b5248.jpg',
      textStyle: {
        fontSize: '22px',
        fontFamily: '"Montserrat", sans-serif',
        fontWeight: '800',
        textAlign: 'center',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      },
      imageStyle: {
        width: '100%',
        maxWidth: '500px',
        height: 'auto',
        display: 'block',
        margin: '0 auto',
        borderRadius: '12px',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)'
      },
      backgroundStyle: {
        background: 'linear-gradient(135deg, #e53e3e, #dd6b20)',
        animation: 'pulse 2s infinite',
        padding: '30px',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
        maxWidth: '600px',
        margin: '0 auto',
        transition: 'transform 0.3s ease-in-out',
        transform: 'scale(1)',
        ':hover': {
          transform: 'scale(1.02)'
        }
      }
    }
    ,
    {
      id: 'elegant',
      name: 'Elegant',
      imageUrl: 'https://i.pinimg.com/736x/d2/f5/09/d2f509368d2f8c7f2c3d6202d3d6cf38.jpg',
      textStyle: {
        fontSize: '18px',
        fontFamily: 'Georgia, serif',
        fontWeight: '400',
        textAlign: 'center',
        color: '#f0e7db' // elegant warm light tone
      },
      imageStyle: {
        width: '320px',
        height: 'auto',
        display: 'block',
        margin: '0 auto',
        borderRadius: '12px', // smooth rounded corners
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
      },
      backgroundStyle: {
        background: 'linear-gradient(135deg, #2d3748, #4a5568)',
        padding: '30px',
        borderRadius: '16px',
        maxWidth: '420px',
        margin: '0 auto',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
      }
    }
    ,
    {
      id: 'playful',
      name: 'Playful',
      imageUrl: 'https://i.pinimg.com/736x/5b/7f/27/5b7f27d5691eae3c9e64121e4ba02c41.jpg',
      textStyle: {
        fontSize: '18px',
        fontFamily: '"Comic Sans MS", "Comic Neue", cursive',
        fontWeight: '500',
        textAlign: 'center',
        color: '#ff5e57', // bright and lively
        textShadow: '1px 1px #fff' // playful contrast
      },
      imageStyle: {
        width: '300px',
        height: 'auto',
        display: 'block',
        margin: '10px auto',
        borderRadius: '20px',
        boxShadow: '0 6px 12px rgba(0, 0, 0, 0.2)',
        transform: 'rotate(-2deg)'
      },
      backgroundStyle: {
        background: 'linear-gradient(135deg, #fddb92, #d1fdff)',
        padding: '25px',
        borderRadius: '25px',
        maxWidth: '420px',
        margin: '0 auto',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
        animation: 'wiggle 1.5s infinite ease-in-out'
      }
    }
    ,
    {
      id: 'professional',
      name: 'Professional',
      imageUrl: 'https://i.pinimg.com/736x/56/c9/7c/56c97cf19815067ceae2a7a8cf5beece.jpg',
      textStyle: {
        fontSize: '30px',
        fontFamily: '"Segoe UI", Helvetica, sans-serif',
        fontWeight: '500',
        textAlign: 'center',
        color: '#f7fafc',
        lineHeight: '1.6'
      },
      imageStyle: {
        width: '100%',
        maxWidth: '420px',
        height: 'auto',
        display: 'block',
        margin: '0 auto 20px auto',
        borderRadius: '8px',
        boxShadow: '0 6px 12px rgba(0, 0, 0, 0.1)'
      },
      backgroundStyle: {
        backgroundColor: '#2c5282', // deeper blue for more authority
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '600px',
        margin: '0 auto',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
        border: '1px solid #1a365d'
      }
    }
    ,
    {
      id: 'festive',
      name: 'Festive',
      imageUrl: 'https://i.pinimg.com/736x/51/40/cc/5140cce2b466b34e4cc2fe8d5cf08d5a.jpg',
      textStyle: {
        fontSize: '20px',
        fontFamily: '"Roboto", sans-serif',
        fontWeight: '600',
        textAlign: 'center',
        color: '#fff5f5',
        textShadow: '1px 1px 4px rgba(0, 0, 0, 0.4)'
      },
      imageStyle: {
        width: '80%',
        maxWidth: '440px',
        paddingLeft: '100px',
        height: 'auto',
        display: 'block',
        borderRadius: '12px',
      },
      backgroundStyle: {
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(https://png.pngtree.com/thumb_back/fh260/background/20230927/pngtree-christmas-frame-template-image_13368951.jpg)',
        maxWidth: '640px'
      }
    }
    ,
    {
      id: 'futuristic',
      name: 'Futuristic',
      imageUrl: 'https://images.stockcake.com/public/5/4/c/54c7020a-d259-4128-863c-ae2cdb018f3f_large/futuristic-email-icon-stockcake.jpg',
      textStyle: {
        fontSize: '18px',
        fontFamily: '"Orbitron", sans-serif',
        fontWeight: '500',
        textAlign: 'center',
        color: '#63b3ed',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        textShadow: '0 0 8px #3182ce'
      },
      imageStyle: {
        width: '100%',
        maxWidth: '440px',
        height: 'auto',
        display: 'block',
        margin: '0 auto 20px auto',
        borderRadius: '10px',
        border: '1px solid #2d3748',
        boxShadow: '0 0 20px rgba(99, 179, 237, 0.2)'
      },
      backgroundStyle: {
        background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        padding: '40px 25px',
        borderRadius: '20px',
        maxWidth: '640px',
        margin: '0 auto',
        animation: 'glowBorder 3s ease-in-out infinite',
        border: '1px solid #4fd1c5',
        boxShadow: '0 0 30px rgba(79, 209, 197, 0.2), 0 0 60px rgba(79, 209, 197, 0.1)'
      }
    }
    ,
    {
      id: 'nature',
      name: 'Nature',
      imageUrl: '',
      textStyle: {
        fontSize: '17px',
        fontFamily: '"Roboto", sans-serif',
        fontWeight: '400',
        textAlign: 'center',
        color: '#2f4f4f', // rich earth tone
        lineHeight: '1.6'
      },
      imageStyle: {
        width: '100%',
        maxWidth: '440px',
        height: 'auto',
        display: 'block',
        margin: '0 auto 20px auto',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
      },
      backgroundStyle: {
        background: 'linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url()',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '40px 25px',
        borderRadius: '16px',
        maxWidth: '640px',
        margin: '0 auto',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e6fffa'
      }
    }
    ,
    {
      id: 'dark',
      name: 'Dark',
      imageUrl: 'https://i.pinimg.com/originals/80/b4/c8/80b4c8eca5291255732a9d4e3eeb8826.gif',
      textStyle: {
        fontSize: '18px',
        fontFamily: '"Roboto", sans-serif',
        fontWeight: '500',
        textAlign: 'center',
        color: '#e2e8f0',
        lineHeight: '1.6',
        textShadow: '0 0 6px rgba(255, 255, 255, 0.05)'
      },
      imageStyle: {
        width: '100%',
        maxWidth: '440px',
        height: 'auto',
        display: 'block',
        margin: '0 auto 20px auto',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
      },
      backgroundStyle: {
        backgroundColor: '#1a202c',
        padding: '40px 25px',
        borderRadius: '16px',
        maxWidth: '640px',
        margin: '0 auto',
        animation: 'fadeIn 1s ease-in',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
        border: '1px solid #2d3748'
      }
    }

  ];

  const getRecords = async () => ({
    Thankyou_Page_Type__c: 'None',
    ThankYou_Label__c: 'THANK YOU PAGE',
    Id: 'mock-id',
    Thankyou_Text__c: '',
    Thank_you_URL__c: ''
  });

  const saveRecords = async ({ picklist, label, text, url, currentThankYouId, imageUrl, actionButtons }) => ({
    Thankyou_Page_Type__c: picklist,
    ThankYou_Label__c: label,
    Id: currentThankYouId || 'new-mock-id',
    Thankyou_Text__c: text,
    Thank_you_URL__c: url,
    Image_URL__c: imageUrl,
    Action_Buttons__c: JSON.stringify(actionButtons)
  });

  const changeLabel = async () => ({});

  const toggleVisibility = useCallback((type) => {
    setVisibility({
      text: type === 'text',
      richtext: type === 'richtext',
      url: type === 'url',
      text_url: type === 'text_url',
      none: type === 'none'
    });
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setUiState(prev => ({ ...prev, isLoading: true }));
      try {
        if (uiState.showLabelEditor) {
          const result = await getRecords();
          setFormState(prev => ({
            ...prev,
            thankYouType: result.Thankyou_Page_Type__c,
            label: result.ThankYou_Label__c,
            changeLabel: result.ThankYou_Label__c,
            currentThankYouId: result.Id,
            text: result.Thankyou_Text__c,
            url: result.Thank_you_URL__c,
            richtext: result.Thankyou_Text__c,
            picklist: result.Thankyou_Page_Type__c.toLowerCase().replace(/\s/g, '_')
          }));
          toggleVisibility(result.Thankyou_Page_Type__c.toLowerCase().replace(/\s/g, '_'));
        } else if (formState.thankYouType === 'Show text, then redirect to web page') {
          setTimeout(() => window.open(formState.url), 3000);
        }
      } catch (e) {
        setUiState(prev => ({ ...prev, errorMessage: `Error: ${e.message}` }));
        alert(uiState.errorMessage);
      } finally {
        setUiState(prev => ({ ...prev, isLoading: false }));
      }
    };
    initialize();
  }, [uiState.showLabelEditor, formState.thankYouType, formState.url, toggleVisibility , uiState.errorMessage]);

  const generateCurrentHtml = () => {
    const actionButtonsHtml = formState.actionButtons.map((button, index) => `
      <div class="action-button-container">
        <button class="action-button" onclick="${button.action.toString().replace(/"/g, '&quot;')}">${button.label}</button>
        ${uiState.isEditing ? `<button class="remove-action-btn" onclick="this.parentElement.remove()">×</button>` : ''}
      </div>
    `).join('');

    return `
      <div class="preview-content" style="${Object.entries(formState.backgroundStyle).map(([k, v]) => `${k}: ${v}`).join(';')}">
        <div class="preview-image" style="${Object.entries(formState.imageStyle).map(([k, v]) => `${k}: ${v}`).join(';')}; max-width: 100%; max-height: 400px">
          <Image src="${formState.imageUrl}" alt="Thank You Logo" width={} style="width: ${formState.imageStyle.width}; height: ${formState.imageStyle.height}; object-fit: contain" />
        </div>
        ${(visibility.text || visibility.text_url || visibility.richtext) ? `
          <div class="preview-text" style="${Object.entries(formState.textStyle).map(([k, v]) => `${k}: ${v}`).join(';')}; margin-top: 1.5rem; padding: 0 1rem">
            ${formState.label}
          </div>
        ` : ''}
        ${(visibility.text || visibility.text_url) ? `
          <div class="preview-text" style="${Object.entries(formState.textStyle).map(([k, v]) => `${k}: ${v}`).join(';')}; margin-top: 1rem; padding: 0 1rem">
            ${formState.text}
          </div>
        ` : ''}
        ${visibility.richtext && !formState.customHtml ? `
          <div class="preview-text" style="${Object.entries(formState.textStyle).map(([k, v]) => `${k}: ${v}`).join(';')}; margin-top: 1rem; padding: 0 1rem">
            ${formState.richtext}
          </div>
        ` : ''}
        ${formState.actionButtons.length > 0 ? `
          <div class="action-buttons-container">
            ${actionButtonsHtml}
          </div>
        ` : ''}
      </div>
    `;
  };
  const handleToggle = (e) => {
    const value = e.target.value;
    setFormState(prev => ({ ...prev, picklist: value }));
    toggleVisibility(value);
  };
    const toggleSourceCodeModal = () => {
    setUiState(prev => ({ ...prev, showSourceCodeModal: !prev.showSourceCodeModal }));
  };
  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
const removeActionButton = (index) => {
    setFormState(prev => ({
      ...prev,
      actionButtons: prev.actionButtons.filter((_, i) => i !== index)
    }));
  };
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormState(prev => ({ ...prev, imageUrl: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    if (urlRegex.test(url)) {
      setFormState(prev => ({ ...prev, imageUrl: url }));
    } else {
      setFormState(prev => ({ ...prev, imageUrl: '' }));
      setUiState(prev => ({ ...prev, errorMessage: 'Invalid image URL' }));
    }
  };
  const toggleActionModal = () => {
    setUiState(prev => ({ ...prev, showActionModal: !prev.showActionModal }));
  };
  const handleTextStyleChange = (property, value) => {
    setFormState(prev => ({
      ...prev,
      textStyle: { ...prev.textStyle, [property]: value }
    }));
  };

  const handleImageResize = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      imageStyle: { ...prev.imageStyle, [name]: `${value}px` }
    }));
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - parseInt(formState.imageStyle.left || '0'),
      y: e.clientY - parseInt(formState.imageStyle.top || '0')
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setFormState(prev => ({
        ...prev,
        imageStyle: {
          ...prev.imageStyle,
          left: `${e.clientX - dragStart.x}px`,
          top: `${e.clientY - dragStart.y}px`
        }
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleFullscreen = () => {
    setUiState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  };

  const toggleTemplatePanel = () => {
    setUiState(prev => ({ ...prev, showTemplatePanel: !prev.showTemplatePanel }));
  };

  const applyTemplate = (template) => {
    setFormState(prev => ({
      ...prev,
      imageUrl: template.imageUrl,
      textStyle: template.textStyle,
      imageStyle: template.imageStyle,
      backgroundStyle: template.backgroundStyle,
            customHtml: ''
    }));
    setUiState(prev => ({ ...prev, showTemplatePanel: false }));
  };
const addActionButton = (action) => {
    setFormState(prev => ({
      ...prev,
      actionButtons: [...prev.actionButtons, { id: action.id, label: action.label, action: action.action }]
    }));
    setUiState(prev => ({ ...prev, showActionModal: false }));
  };
  const handleSave = async () => {
    setUiState(prev => ({ ...prev, isLoading: true }));
    try {
      if (visibility.url || visibility.text_url) {
        if (!urlRegex.test(formState.url)) {
          throw new Error('Invalid URL format');
        }
      }
      const result = await saveRecords({
        picklist: formState.picklist,
        label: formState.label,
        text: visibility.richtext ? formState.richtext : formState.text,
        url: formState.url,
        currentThankYouId: formState.currentThankYouId,
        imageUrl: formState.imageUrl,
        actionButtons: formState.actionButtons,
                customHtml: formState.customHtml

      });
      setFormState(prev => ({
        ...prev,
        thankYouType: result.Thankyou_Page_Type__c,
        label: result.ThankYou_Label__c,
        changeLabel: result.ThankYou_Label__c,
        currentThankYouId: result.Id,
        text: result.Thankyou_Text__c,
        url: result.Thank_you_URL__c,
        richtext: result.Thankyou_Text__c,
        imageUrl: result.Image_URL__c,
        actionButtons: JSON.parse(result.Action_Buttons__c || '[]'),
                customHtml: result.Custom_HTML__c || ''
      }));
      toggleVisibility(formState.picklist);
      console.log('Success: Saved successfully');
    } catch (e) {
      setUiState(prev => ({ ...prev, errorMessage: `Error: ${e.message}` }));
      alert(uiState.errorMessage);
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  };
const handleSourceCodeChange = (e) => {
    setFormState(prev => ({
      ...prev,
      customHtml: e.target.value
    }));
  };

  const handleSourceCodeSave = () => {
    setUiState(prev => ({ ...prev, showSourceCodeModal: false }));
  };
  const handleCancel = () => {
    setFormState(prev => ({
      ...prev,
      text: '',
      url: '',
      richtext: '',
      picklist: formState.thankYouType.toLowerCase().replace(/\s/g, '_'),
      imageUrl: '',
      backgroundStyle: { backgroundColor: '#ffffff' },
      actionButtons: []
    }));
    toggleVisibility(formState.thankYouType.toLowerCase().replace(/\s/g, '_'));
  };

  const handleLabelSave = async () => {
    try {
      setFormState(prev => ({ ...prev, label: formState.changeLabel }));
      await changeLabel();
      setUiState(prev => ({ ...prev, showLabelEditor: false }));
    } catch (e) {
      setUiState(prev => ({ ...prev, errorMessage: `Error: ${e.message}` }));
      alert(uiState.errorMessage);
    }
  };

  return (
    <ContentLayout title="Thank you">
    <div className={`quick-form-container `}>
      {uiState.isLoading && (
        <div className="spinner-overlay">
          <div className="spinner">
            <div></div>
            <div></div>
          </div>
        </div>
      )}

      <div className="form-sidebar">
        <div className="sidebar-header">THANK YOU PAGE</div>

        <div className="options-container">
          {[
            { id: 'None', value: 'none', label: 'None', tooltip: 'No thank you page will be shown after submission.' },
            { id: 'ThankYou_Text', value: 'text', label: 'Show Text', tooltip: 'Display custom text on the Thank You page.' },
            { id: 'ThankYou_URL', value: 'url', label: 'Redirect to a webpage', tooltip: 'Redirect users to a specified URL after submission.' },
            { id: 'Redirect_Text_And_URL', value: 'text_url', label: 'Show text, then redirect to web page', tooltip: 'Show text and then redirect to a URL.' },
            { id: 'ThankYou_RichText', value: 'richtext', label: 'Show HTML block', tooltip: 'Display HTML content on the Thank You page.' }
          ].map(option => (
            <div key={option.id} className="option-item">
              <div className="radio-container">
                <input
                  type="radio"
                  name="thankYouOption"
                  id={option.id}
                  value={option.value}
                  onChange={handleToggle}
                  checked={formState.picklist === option.value}
                />
                <div className="radio-content">
                  <label className="radio-label" htmlFor={option.id}>{option.label}</label>
                  <div className="radio-tooltip">{option.tooltip}</div>
                </div>
              </div>

              <div className={`option-content ${option.value}`} style={{ display: visibility[option.value] ? 'block' : 'none' }}>
                {(option.value === 'text' || option.value === 'text_url') && (
                  <textarea
                    className="form-textarea"
                    value={formState.text}
                    onChange={handleInput}
                    name="text"
                    // style={formState.textStyle}
                    placeholder="Enter your thank you message"
                  />
                )}
                {(option.value === 'url' || option.value === 'text_url') && (
                  <input
                    type="url"
                    value={formState.url}
                    name="url"
                    className="form-input"
                    placeholder="https://example.com"
                    onChange={handleInput}
                  />
                )}
                {option.value === 'richtext' && (
                  <textarea
                    className="form-textarea"
                    value={formState.richtext}
                    name="richtext"
                    placeholder="Enter HTML content"
                    onChange={handleInput}
                  // style={formState.textStyle}
                  />
                )}
              </div>
              <div className="divider" />
            </div>
          ))}
        </div>
      </div>

      <div className="preview-panel">
        <div className="controls-panel">
          <div className="control-group">
            <label>Font Size:</label>
            <select
              value={formState.textStyle.fontSize}
              onChange={(e) => handleTextStyleChange('fontSize', e.target.value)}
            >
              {['12px', '14px', '16px', '18px', '20px', '24px', '30px'].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Font Family:</label>
            <select
              value={formState.textStyle.fontFamily}
              onChange={(e) => handleTextStyleChange('fontFamily', e.target.value)}
            >
              {['Roboto, sans-serif', 'Arial, sans-serif', 'Times New Roman, serif', 'Courier New, monospace', 'Montserrat, sans-serif', 'Georgia, serif', 'Comic Sans MS, cursive', 'Helvetica, sans-serif', 'Orbitron, sans-serif'].map(family => (
                <option key={family} value={family}>{family.split(',')[0]}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Font Weight:</label>
            <select
              value={formState.textStyle.fontWeight}
              onChange={(e) => handleTextStyleChange('fontWeight', e.target.value)}
            >
              {['300', '400', '500', '600', '700'].map(weight => (
                <option key={weight} value={weight}>{weight}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Text Align:</label>
            <select
              value={formState.textStyle.textAlign}
              onChange={(e) => handleTextStyleChange('textAlign', e.target.value)}
            >
              {['left', 'center', 'right'].map(align => (
                <option key={align} value={align}>{align}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Text Color:</label>
            <input
              type="color"
              value={formState.textStyle.color}
              onChange={(e) => handleTextStyleChange('color', e.target.value)}
            />
          </div>

          <div className="control-group">
            <label>Image Upload:</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>

          <div className="control-group">
            <label>Image URL:</label>
            <input
              type="url"
              placeholder="Enter image URL"
              onChange={handleImageUrlChange}
            />
          </div>

          <div className="control-group">
            <label>Image Width:</label>
            <input
              type="range"
              min="100"
              max="600"
              value={parseInt(formState.imageStyle.width) || 400}
              name="width"
              onChange={handleImageResize}
            />
          </div>

          <div className="control-group">
            <label>Image Height:</label>
            <input
              type="range"
              min="100"
              max="400"
              value={parseInt(formState.imageStyle.height) || 200}
              name="height"
              onChange={handleImageResize}
            />
          </div>

          <button
            onClick={toggleFullscreen}
            className="fullscreen-btn"
          >
            {uiState.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button
            onClick={toggleTemplatePanel}
            className="templates-btn"
          >
            {uiState.showTemplatePanel ? 'Close Templates' : 'Templates'}
          </button>
          <button
            onClick={toggleActionModal}
            className="templates-btn"
          >
            Add Actions
          </button>
           <button
            onClick={toggleSourceCodeModal}
            className="templates-btn"
          >
            Source Code
          </button>

        </div>
        {uiState.showActionModal && (
          <div className="action-modal">
            <div className="action-modal-content">
              <div className="action-modal-header">Add Action Button</div>
              <div className="action-modal-body">
                {actionOptions.map(option => (
                  <div key={option.id} className="action-option" onClick={() => addActionButton(option)}>
                    <div className="action-option-label">{option.label}</div>
                    <div className="action-option-description">{option.description}</div>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={toggleActionModal}>Close</button>
              </div>
            </div>
          </div>
        )}
        {uiState.isEditing && (
          <>
            <div className="edit-label-btn">
              <button onClick={() => setUiState(prev => ({ ...prev, showLabelEditor: true }))}>
                <Image src={whitepen} alt="Edit" width={10}  height={10}/> Edit Label
              </button>
            </div>

            {uiState.showLabelEditor && (
              <div className="label-editor-modal">
                <div className="modal-content">
                  <div className="modal-header">Edit Label</div>
                  <div className="modal-body">
                    <textarea
                      value={formState.changeLabel}
                      onChange={e => setFormState(prev => ({ ...prev, changeLabel: e.target.value }))}
                      placeholder="Enter new label"
                    // style={formState.textStyle}
                    />
                  </div>
                  <div className="modal-footer">
                    <button className="cancel-btn" onClick={() => setUiState(prev => ({ ...prev, showLabelEditor: false }))}>Cancel</button>
                    <button className="save-btn" onClick={handleLabelSave}>Save</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
         {uiState.showSourceCodeModal && (
          <div className="source-code-modal">
            <div className="source-code-modal-content">
              <div className="source-code-modal-header">Edit Source Code</div>
              <div className="source-code-modal-body">
                <textarea
                  className="source-code-textarea"
                  value={formState.customHtml || generateCurrentHtml()}
                  onChange={handleSourceCodeChange}
                  placeholder="Paste your HTML code here"
                />
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={toggleSourceCodeModal}>Cancel</button>
                <button className="save-btn" onClick={handleSourceCodeSave}>Apply</button>
              </div>
            </div>
          </div>
        )}
         {formState.customHtml ? (
          <div dangerouslySetInnerHTML={{ __html: formState.customHtml }} />
        ) : (
        <div className={`preview-content ${uiState.isFullscreen ? 'fixed top-0 left-0 w-screen h-screen z-50' : ''}`} style={formState.backgroundStyle}>
          <div
            className="preview-image"
            ref={imageRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              ...formState.imageStyle,
              maxWidth: '100%',
              maxHeight: '400px'
            }}
          >
            <Image
              src={formState.imageUrl}
              alt="Thank You Logo"
              style={{
                width: formState.imageStyle.width,
                height: formState.imageStyle.height,
                objectFit: 'contain'
              }}
            />
          </div>

          {(visibility.text || visibility.text_url || visibility.richtext) && (
            <div className="preview-text" style={{
              ...formState.textStyle,
              marginTop: '1.5rem',
              padding: '0 1rem'
            }}>
              {formState.label}
            </div>
          )}

          {(visibility.text || visibility.text_url) && (
            <div className="preview-text" style={{
              ...formState.textStyle,
              marginTop: '1rem',
              padding: '0 1rem'
            }}>
              {formState.text}
            </div>
          )}

          {visibility.richtext && (
            <div
              className="preview-text"
              style={{
                ...formState.textStyle,
                marginTop: '1rem',
                padding: '0 1rem'
              }}
              dangerouslySetInnerHTML={{ __html: formState.richtext }}
            />
          )}
        {formState.actionButtons.length > 0 && (
            <div className="action-buttons-container">
              {formState.actionButtons.map((button, index) => (
                <div key={`${button.id}-${index}`} className="action-button-container">
                  <button
                    className="action-button"
                    onClick={button.action}
                  >
                    {button.label}
                     
                  </button>
                 {(uiState.isEditing && !uiState.isFullscreen) && (
                    <button
                      className="remove-action-btn"
                      onClick={() => removeActionButton(index)}
                    >
                      × 
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        )}
        {uiState.isEditing && (
          <div className="form-actions">
            <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
            <button className="save-btn" onClick={handleSave}>Save</button>
          </div>
        )}

        <div className={`template-panel ${uiState.showTemplatePanel ? 'open' : ''}`}>
          <div> <button
            onClick={toggleTemplatePanel}
            className="templates-btn">&times;</button></div>
          <div className="template-panel-header">Select Template</div>
          {templates.map(template => (
            <div key={template.id} className="template-item" onClick={() => applyTemplate(template)}>
              <div className={`template-preview template-${template.id}`} style={{ background: template.backgroundStyle.background }}>
                {template.name}
              </div>
              <div className="template-label">{template.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div></ContentLayout>
  );
};

export default QuickForm;