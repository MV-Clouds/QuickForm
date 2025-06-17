import { useState, useEffect } from 'react';
import { X, SearchIcon, StarIcon, ArrowRightIcon, PlusIcon } from 'lucide-react';

const TemplatePicker = ({ onClose, onTemplateSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('Popular');

  // Sample template data
  const templates = [
    {
      id: 'blank',
      title: 'Start from Scratch',
      description: 'Build a custom form with drag-and-drop.',
      category: 'All',
      fields: 0,
      isPopular: false,
      isNew: true,
      usageCount: 0,
      completionRate: 0,
      hasPayment: false,
      hasConditionalLogic: false,
      isMobileFriendly: true,
    },
    {
      id: 'event-registration',
      title: 'Event Registration',
      description: 'Collect names, emails, and ticket choices.',
      category: 'Registrations',
      fields: 5,
      isPopular: true,
      isNew: false,
      usageCount: 1200,
      completionRate: 90,
      hasPayment: true,
      hasConditionalLogic: true,
      isMobileFriendly: true,
    },
    {
      id: 'customer-feedback',
      title: 'Customer Feedback',
      description: 'Gather product reviews and satisfaction ratings.',
      category: 'Surveys',
      fields: 7,
      isPopular: true,
      isNew: false,
      usageCount: 850,
      completionRate: 78,
      hasPayment: false,
      hasConditionalLogic: false,
      isMobileFriendly: true,
    },
    {
      id: 'contact-form',
      title: 'Contact Form',
      description: 'Basic form for website visitor inquiries.',
      category: 'Contact',
      fields: 4,
      isPopular: false,
      isNew: false,
      usageCount: 3200,
      completionRate: 95,
      hasPayment: false,
      hasConditionalLogic: false,
      isMobileFriendly: true,
    },
    {
      id: 'job-application',
      title: 'Job Application',
      description: 'Collect resumes and candidate information.',
      category: 'HR',
      fields: 8,
      isPopular: false,
      isNew: true,
      usageCount: 150,
      completionRate: 65,
      hasPayment: false,
      hasConditionalLogic: true,
      isMobileFriendly: true,
    },
    {
      id: 'course-enrollment',
      title: 'Course Enrollment',
      description: 'Register students for classes with payment.',
      category: 'Education',
      fields: 6,
      isPopular: false,
      isNew: false,
      usageCount: 420,
      completionRate: 88,
      hasPayment: true,
      hasConditionalLogic: false,
      isMobileFriendly: true,
    },
  ];

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Filter templates based on search, category, etc.
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || template.category === activeCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'Popular') return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0) || b.usageCount - a.usageCount;
    if (sortBy === 'Newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
    return a.title.localeCompare(b.title);
  });

  const categories = ['All', 'Surveys', 'Registrations', 'Contact', 'Payments', 'HR', 'Education'];

  const handleUseTemplate = (template) => {
    onTemplateSelect(template);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Darkened overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
      
      {/* Modal container */}
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          {/* Modal content */}
          <div className="bg-white px-8 py-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Start with a Template</h2>
                <p className="mt-1 text-sm text-gray-500">Choose a pre-built form or start blank</p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-gray-100 focus:outline-none transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            {/* Search and filters */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm transition-all"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                {/* Category tabs */}
                <div className="relative">
                  <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                          activeCategory === category
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Sort dropdown */}
                <div className="flex items-center">
                  <label htmlFor="sort" className="mr-2 text-sm text-gray-600">Sort by:</label>
                  <select
                    id="sort"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md transition-colors"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="Popular">Popular</option>
                    <option value="Newest">Newest</option>
                    <option value="A-Z">A-Z</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Template grid */}
            <div className="mt-8">
              {isLoading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm h-64 animate-pulse">
                      <div className="h-32 bg-gray-200"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-24 w-24 text-gray-400">
                    <SearchIcon className="w-full h-full" />
                  </div>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No matches found</h3>
                  <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter to find what you're looking for.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-100 hover:scale-[1.02] transition-all duration-200 cursor-pointer flex flex-col ${
                        selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      {template.id === 'blank' ? (
                        <div className="flex items-center justify-center h-32 bg-gray-50">
                          <PlusIcon className="h-12 w-12 text-blue-500" />
                        </div>
                      ) : (
                        <div className="h-32 bg-blue-50 flex items-center justify-center">
                          <div className="w-3/4 bg-white p-2 rounded shadow-xs">
                            <div className="h-3 bg-gray-200 mb-2 rounded w-full"></div>
                            <div className="h-3 bg-gray-200 mb-2 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 mb-2 rounded w-1/2"></div>
                            {template.hasPayment && (
                              <div className="mt-3 pt-2 border-t border-gray-100">
                                <div className="h-3 bg-green-200 rounded w-1/3"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="p-4 flex-grow flex flex-col">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-medium text-gray-900">{template.title}</h3>
                          {template.isPopular && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <StarIcon className="h-3 w-3 mr-1" />
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                        
                        <div className="mt-3 flex flex-wrap gap-2">
                          {template.fields > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {template.fields} fields
                            </span>
                          )}
                          {template.hasPayment && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Payment
                            </span>
                          )}
                          {template.hasConditionalLogic && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              Logic
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-auto pt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUseTemplate(template);
                            }}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            {template.id === 'blank' ? 'Start Blank' : 'Use Template'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Template preview side panel */}
      {selectedTemplate && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-lg transform transition-transform duration-300 ease-in-out translate-x-0">
          <div className="h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">{selectedTemplate.title}</h3>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-1 rounded-md hover:bg-gray-100 focus:outline-none transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-6">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <div className="bg-white p-4 rounded shadow-xs">
                  {selectedTemplate.id === 'blank' ? (
                    <div className="text-center py-8">
                      <PlusIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">Blank form</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-3 bg-gray-200 mb-3 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 mb-3 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 mb-3 rounded w-1/2"></div>
                      {selectedTemplate.fields > 3 && (
                        <>
                          <div className="h-3 bg-gray-200 mb-3 rounded w-2/3"></div>
                          <div className="h-3 bg-gray-200 mb-3 rounded w-1/4"></div>
                        </>
                      )}
                      {selectedTemplate.hasPayment && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <div className="h-3 bg-green-200 rounded w-1/3 mb-2"></div>
                          <div className="h-8 bg-green-100 rounded"></div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Fields in this template</h4>
                <ul className="space-y-2">
                  {selectedTemplate.id === 'blank' ? (
                    <li className="text-sm text-gray-500">No predefined fields</li>
                  ) : (
                    Array.from({ length: selectedTemplate.fields }, (_, i) => (
                      <li key={i} className="flex items-center text-sm text-gray-600">
                        <ArrowRightIcon className="h-4 w-4 text-gray-400 mr-2" />
                        Field {i + 1} ({['Text', 'Email', 'Dropdown', 'Checkbox'][i % 4]})
                      </li>
                    ))
                  )}
                </ul>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Used</p>
                  <p className="font-medium">
                    {selectedTemplate.usageCount > 1000
                      ? `${(selectedTemplate.usageCount / 1000).toFixed(1)}k`
                      : selectedTemplate.usageCount}{' '}
                    times
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Completion rate</p>
                  <p className="font-medium">{selectedTemplate.completionRate}%</p>
                </div>
              </div>
              
              {selectedTemplate.hasPayment && (
                <div className="bg-blue-50 p-3 rounded mb-6">
                  <p className="text-sm font-medium text-blue-800">Includes payment integration</p>
                  <p className="text-xs text-blue-600 mt-1">Stripe or PayPal ready</p>
                </div>
              )}
              
              {selectedTemplate.hasConditionalLogic && (
                <div className="bg-purple-50 p-3 rounded mb-6">
                  <p className="text-sm font-medium text-purple-800">Includes conditional logic</p>
                  <p className="text-xs text-purple-600 mt-1">Show/hide fields based on answers</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onTemplateSelect(selectedTemplate);
                    onClose();
                  }}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Use Template
                </button>
                <button
                  onClick={() => {
                    onTemplateSelect(selectedTemplate);
                    onClose();
                    // In a real app, you would navigate to the editor with customization mode
                  }}
                  className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Customize First
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatePicker;