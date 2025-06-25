import { useState } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';

const categorizedFieldTypes = [
  // ...your categories as before...
  {
    category: 'Recommended',
    fields: [
      { type: 'header', label: 'Header' },
      { type: 'shorttext', label: 'Short Text' },
      { type: 'number', label: 'Number' },
      { type: 'displaytext', label: 'Display Text' },
    ],
  },
  {
    category: 'Essentials',
    fields: [
      { type: 'checkbox', label: 'Checkbox' },
      { type: 'divider', label: 'Divider' },
      { type: 'longtext', label: 'Long Text' },
      { type: 'price', label: 'Price' },
      { type: 'radio', label: 'Radio Button' },
      { type: 'toggle', label: 'Toggle Button' },
      { type: 'dropdown', label: 'Dropdown Element' },
      { type: 'imageuploader', label: 'Image Uploader' },
      { type: 'section', label: 'Section' },
    ],
  },
  {
    category: 'Contact Details',
    fields: [
      { type: 'fullname', label: 'Full Name' },
      { type: 'phone', label: 'Phone' },
      { type: 'email', label: 'Email' },
      { type: 'address', label: 'Address' },
    ],
  },
  {
    category: 'Upload And Consent',
    fields: [
      { type: 'fileupload', label: 'File Upload' },
      { type: 'pagebreak', label: 'Page Break' },
      { type: 'link', label: 'Link' },
    ],
  },
  {
    category: 'Date & Time',
    fields: [
      { type: 'date', label: 'Date' },
      { type: 'datetime', label: 'Date and Time' },
      { type: 'time', label: 'Time' },
    ],
  },
  {
    category: 'Rating',
    fields: [
      { type: 'rating', label: 'Rating' },
      { type: 'scalerating', label: 'Scale Rating' },
    ],
  },
  {
    category: 'Others',
    fields: [
      { type: 'formcalculation', label: 'Form Calculation' },
      { type: 'signature', label: 'Signature' },
      { type: 'terms', label: 'Terms of Service' },
    ],
  },
];

function Sidebar({ selectedTheme, onThemeSelect, themes }) {
  const [activeTab, setActiveTab] = useState('Fields');
  const [openSection, setOpenSection] = useState('Recommended');

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('fieldType', type);
  };

  const toggleSection = (category) => {
    setOpenSection(openSection === category ? null : category);
  };

  return (
    <div className="bg-white text-gray-800 p-4 mt-10 shadow-md rounded-lg min-w-[270px]">
      {/* Tabs */}
      <div className="flex mb-4 border-b border-gray-200">
        <button
          className={`flex-1 py-2 text-center font-semibold transition-colors rounded-t-md ${
            activeTab === 'Fields'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('Fields')}
        >
          Fields
        </button>
        <button
          className={`flex-1 py-2 text-center font-semibold transition-colors rounded-t-md ${
            activeTab === 'Design'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('Design')}
        >
          Design
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'Fields' && (
        <>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Fields</h2>
          {categorizedFieldTypes.map(({ category, fields }) => {
            const isOpen = openSection === category;
            return (
              <div key={category} className="mb-2">
                <button
                  onClick={() => toggleSection(category)}
                  className={`w-full flex items-center justify-between p-2 text-black hover:bg-gray-100 rounded transition-colors duration-150 ${
                    isOpen ? 'bg-blue-100' : ''
                  }`}
                >
                  <h3 className="text-lg font-medium">{category}</h3>
                  {isOpen ? (
                    <FaChevronDown className="w-4 h-4 text-gray-700" />
                  ) : (
                    <FaChevronRight className="w-4 h-4 text-gray-700" />
                  )}
                </button>
                {isOpen && (
                  <div className="space-y-2 p-3 mt-1">
                    {fields.map(({ type, label }) => (
                      <button
                        key={type}
                        draggable
                        onDragStart={(e) => handleDragStart(e, type)}
                        className="w-full p-2 flex items-center justify-start border border-gray-300 rounded hover:bg-blue-50 transition-colors duration-150"
                        type="button"
                      >
                        <span className="text-gray-800">{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {activeTab === 'Design' && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Themes</h2>
          <div className="space-y-4">
            {themes.map((theme) => (
              <div
                key={theme.name}
                className={`rounded-lg shadow border p-3 flex items-center gap-4 cursor-pointer hover:scale-105 hover:shadow-lg transition-transform duration-200 ${theme.preview} ${selectedTheme?.name === theme.name ? 'ring-4 ring-blue-400 border-blue-600' : 'border-gray-200'}`}
                onClick={() => onThemeSelect(theme)}
                style={{ opacity: selectedTheme?.name === theme.name ? 1 : 0.85 }}
              >
                <div className={`w-8 h-8 rounded-full ${theme.color} border-2 border-white shadow`} />
                <div>
                  <div className="font-medium text-white drop-shadow">{theme.name}</div>
                  <div className="text-xs text-white/80">Preview</div>
                </div>
                {selectedTheme?.name === theme.name && (
                  <span className="ml-2 px-2 py-1 bg-white text-blue-600 text-xs rounded shadow">Selected</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;