import { useState, useEffect } from 'react';
import FieldsetTab from './FieldsetTab';
import PaymentSidebar from "./payment-fields/PaymentSidebar";


const fieldTypes = [
  // Recommended
  { type: 'heading', label: 'Heading' },
  { type: 'shorttext', label: 'Short Text' },
  { type: 'number', label: 'Number' },
  { type: 'displaytext', label: 'Display Text' },

  // Essentials
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'divider', label: 'Divider' },
  { type: 'longtext', label: 'Long Text' },
  { type: 'price', label: 'Price' },
  { type: 'radio', label: 'Radio Button' },
  { type: 'toggle', label: 'Toggle Button' },
  { type: 'dropdown', label: 'Dropdown Element' },
  { type: 'imageuploader', label: 'Image Uploader' },
  { type: 'section', label: 'Section' },

  // Contact Details
  { type: 'fullname', label: 'Full Name' },
  { type: 'phone', label: 'Phone' },
  { type: 'email', label: 'Email' },
  { type: 'address', label: 'Address' },

  // Upload And Consent
  { type: 'fileupload', label: 'File Upload' },
  { type: 'pagebreak', label: 'Page Break' },
  { type: 'link', label: 'Link' },

  // Date & Time
  { type: 'date', label: 'Date' },
  { type: 'datetime', label: 'Date and Time' },
  { type: 'time', label: 'Time' },

  // Rating
  { type: 'rating', label: 'Rating' },
  { type: 'scalerating', label: 'Scale Rating' },

  // Others
  { type: 'formcalculation', label: 'Form Calculation' },
  { type: 'signature', label: 'Signature' },
  { type: 'terms', label: 'Terms of Service' },
];

const getFieldIcon = (type) => {
  const iconProps = { className: "w-5 h-5 text-gray-600", fill: "none", stroke: "currentColor", strokeWidth: "1.5" };

  switch (type) {
    case 'heading':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9M7.5 15.75h9M7.5 12h9" />
        </svg>
      );
    case 'shorttext':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      );
    case 'longtext':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      );
    case 'displaytext':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case 'number':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
        </svg>
      );
    case 'price':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'checkbox':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      );
    case 'radio':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );
    case 'dropdown':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      );
    case 'date':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      );
    case 'time':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'datetime':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'email':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
      );
    case 'address':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      );
    case 'fullname':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      );
    case 'fileupload':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      );
    case 'imageuploader':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      );
    case 'rating':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      );
    case 'scalerating':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      );
    case 'toggle':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
        </svg>
      );
    case 'divider':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
      );
    case 'section':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      );
    case 'signature':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
      );
    case 'link':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      );
    case 'pagebreak':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m0 0V21m0-3.75h3.75M21 14.25v3.75m0 0V21m0-3.75h-3.75" />
        </svg>
      );
    case 'formcalculation':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
        </svg>
      );
    case 'terms':
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
  }
};

function Sidebar({ selectedTheme, onThemeSelect, themes, fieldsets, onAddFieldsFromFieldset, fields = [], isEditable = true }) {
  const [activeMainTab, setActiveMainTab] = useState('Form');
  const [activeSubTab, setActiveSubTab] = useState('Fields');
  const [searchTerm, setSearchTerm] = useState('');

  // Add CSS for drag effects
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .drag-preview {
        opacity: 0.4 !important;
        border-radius: 8px !important;
        transform: rotate(2deg) !important;
      }
      
      .field-item:active {
        opacity: 0.8;
        transform: scale(0.98);
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('fieldType', type);
    e.dataTransfer.setData('fieldId', '');

    // Add visual feedback to the source element
    e.currentTarget.style.opacity = '0.5';
    e.currentTarget.style.transform = 'scale(0.95)';

    // Create custom drag image with reduced opacity and subtle effects
    const dragElement = e.currentTarget.cloneNode(true);
    dragElement.style.position = 'absolute';
    dragElement.style.top = '-1000px';
    dragElement.style.left = '-1000px';
    dragElement.style.width = e.currentTarget.offsetWidth + 'px';
    dragElement.style.height = e.currentTarget.offsetHeight + 'px';
    dragElement.style.opacity = '0.7';
    dragElement.style.background = 'rgba(255, 255, 255,0.7)';
    dragElement.style.borderRadius = '8px';
    // Make text slightly faded
    const textElements = dragElement.querySelectorAll('*');
    textElements.forEach(el => {
      el.style.opacity = '0.8';
    });

    document.body.appendChild(dragElement);
    e.dataTransfer.setDragImage(dragElement, e.nativeEvent.offsetX, e.nativeEvent.offsetY);

    // Clean up after drag
    setTimeout(() => {
      if (document.body.contains(dragElement)) {
        document.body.removeChild(dragElement);
      }
    }, 0);
  };
  const handleFieldsetDrop = (fieldset) => {
    if (fieldset && fieldset.Fieldset_Fields__c) {
      const newFields = fieldset.Fieldset_Fields__c.map((fieldsetField) => {
        const properties = JSON.parse(fieldsetField.Properties__c || "{}");
        return {
          ...properties,
          id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
        };
      });
      onAddFieldsFromFieldset(newFields);
    }
  };
  const handleDragEnd = (e) => {
    // Reset visual feedback
    e.currentTarget.style.opacity = '';
    e.currentTarget.style.transform = '';
  };

  const filteredFields = fieldTypes.filter(field =>
    field.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="custom-builder-card">
      {/* Header */}
      <div className="p-4 pb-2">
        <h1 className="text-lg font-semibold text-gray-900">Form Builder</h1>
      </div>

      {/* Main Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-lg mx-4 my-2">
        <button
          className={`flex-1 py-2 px-4 text-center font-medium rounded-md transition-all text-sm text-gray-600 hover:bg-gray-50 ${activeMainTab === 'Form'
            ? 'bg-white shadow-sm border border-gray-200'
            : ''
            }`}
          onClick={() => setActiveMainTab('Form')}
        >
          Form
        </button>
        <button
          className={`flex-1 py-2 px-4 text-center font-medium rounded-md transition-all text-sm text-gray-600 hover:bg-gray-50 ${activeMainTab === 'Theme'
            ? 'bg-white shadow-sm border border-gray-200'
            : ''
            }`}
          onClick={() => setActiveMainTab('Theme')}
        >
          Theme
        </button>
      </div>

      {/* Sub Tabs for Form */}
      {activeMainTab === 'Form' && (
        <div className="flex border-b border-gray-200 px-4">
          <div className="relative flex justify-center w-full">
            <button
              className={`flex-1 py-2 text-sm text-center font-medium transition-colors ${activeSubTab === 'Fields'
                ? 'text-gray-900 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
              onClick={() => setActiveSubTab('Fields')}
            >
              Fields
            </button>
            {activeSubTab === 'Fields' && (
              <div className="gradient-border"></div>
            )}
          </div>

          <div className="relative flex justify-center w-full">
            <button
              className={`flex-1 py-2 text-sm text-center font-medium transition-colors ${activeSubTab === 'Payments'
                ? 'text-gray-900 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
              onClick={() => setActiveSubTab('Payments')}
            >
              Payments
            </button>
            {activeSubTab === 'Payments' && (
              <div className="gradient-border"></div>
            )}
          </div>

          <div className="relative flex justify-center w-full">
            <button
              className={`flex-1 py-2 text-sm text-center font-medium transition-colors ${activeSubTab === 'Fieldsets'
                ? 'text-gray-900 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
              onClick={() => setActiveSubTab('Fieldsets')}
            >
              Fieldsets
            </button>
            {activeSubTab === 'Fieldsets' && (
              <div className="gradient-border"></div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto builder-content-card">
        {activeMainTab === 'Form' && activeSubTab === 'Fields' && (
          <div className="inner-card">
            {/* Search Bar */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search for an entry"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Fields List */}
            <div className="space-y-2">
              {filteredFields.map(({ type, label }) => (
                <div
                  key={type}
                  draggable={isEditable}
                  onDragStart={(e) => isEditable && handleDragStart(e, type)}
                  onDragEnd={isEditable ? handleDragEnd : undefined}
                  className={`field-item flex items-center justify-between p-2 border border-gray-200 rounded-lg transition-all duration-150 group
    ${isEditable ? "hover:bg-blue-50 cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-60"}`}
                >
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(240, 240, 240, 1)' }}>
                      {getFieldIcon(type)}
                    </div>
                    <span className="text-gray-700 text-sm font-medium">{label}</span>
                  </div>
                  <div className='pr-1'>
                    <svg width="9" height="14" viewBox="0 0 9 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M3 1.55556C3 2.41465 2.32841 3.11111 1.5 3.11111C0.671587 3.11111 0 2.41465 0 1.55556C0 0.696446 0.671587 0 1.5 0C2.32841 0 3 0.696446 3 1.55556ZM1.5 8.55556C2.32841 8.55556 3 7.85909 3 7C3 6.14091 2.32841 5.44444 1.5 5.44444C0.671587 5.44444 0 6.14091 0 7C0 7.85909 0.671587 8.55556 1.5 8.55556ZM1.5 14C2.32841 14 3 13.3035 3 12.4444C3 11.5854 2.32841 10.8889 1.5 10.8889C0.671587 10.8889 0 11.5854 0 12.4444C0 13.3035 0.671587 14 1.5 14Z" fill="#5F6165" />
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M9 1.55556C9 2.41465 8.32841 3.11111 7.5 3.11111C6.67159 3.11111 6 2.41465 6 1.55556C6 0.696446 6.67159 0 7.5 0C8.32841 0 9 0.696446 9 1.55556ZM7.5 8.55556C8.32841 8.55556 9 7.85909 9 7C9 6.14091 8.32841 5.44444 7.5 5.44444C6.67159 5.44444 6 6.14091 6 7C6 7.85909 6.67159 8.55556 7.5 8.55556ZM7.5 14C8.32841 14 9 13.3035 9 12.4444C9 11.5854 8.32841 10.8889 7.5 10.8889C6.67159 10.8889 6 11.5854 6 12.4444C6 13.3035 6.67159 14 7.5 14Z" fill="#5F6165" />
                    </svg>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMainTab === 'Form' && activeSubTab === 'Fieldsets' && (
          <div className="p-2">
            <FieldsetTab
              fieldsets={fieldsets}
              onDropFieldset={handleFieldsetDrop}
              isEditable={isEditable}
            />
          </div>
        )}

        {activeMainTab === 'Form' && activeSubTab === 'Payments' && (
          <PaymentSidebar
            fields={fields}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            isEditable={isEditable}
          />
        )}

        {activeMainTab === 'Theme' && (
          <div className="p-4">
            <div className="space-y-4">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  disabled={!isEditable}
                  onClick={() => onThemeSelect(theme)}
                  className={`w-full flex items-center gap-3 border p-3 rounded-lg text-sm transition-all
            ${selectedTheme?.id === theme.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"}
            ${!isEditable ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <div className={`w-8 h-8 rounded-full ${theme.color} border-2 border-white shadow`} />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{theme.name}</div>
                    <div className="text-xs text-gray-500">Preview</div>
                  </div>
                  {selectedTheme?.id === theme.id && (
                    <span className="ml-2 px-2 py-1 bg-white text-blue-600 text-xs rounded shadow">
                      Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );

}

export default Sidebar;