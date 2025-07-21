import { useState, useEffect } from 'react';
import { X, SearchIcon, StarIcon, ArrowRightIcon, PlusIcon, GitMergeIcon, SmartphoneIcon, CreditCardIcon, ListIcon, FolderIcon, UsersIcon, SparklesIcon, SquareIcon, UploadIcon, CircleIcon, CheckSquareIcon, ChevronDownIcon, PhoneIcon, MailIcon, UserIcon, BookTemplateIcon } from 'lucide-react';
import { GetFormTemplate, useForms } from './getFormTemplate'
import './style.css'
const TemplatePicker = ({ onClose, onTemplateSelect , loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('Newest');
  const [templates, settemplates] = useState([]);
  const formsData = useForms();
  useEffect(() => {
    const templates = GetFormTemplate();
    console.log('Temp Data', templates);

    const cleanData = formsData?.records?.map((form) => ({
      id: form.Id || form.formname?.toLowerCase().replace(/\s+/g, '-'),
      title: form.formname || '',
      description: form.Description__c || '',
      category: form.Category__c || 'Other',
      fields: form.Form_Field__c ? Number(form.Form_Field__c) : 0,
      isPopular: !!form.Usage_Count__c && form.Usage_Count__c > 1000,
      isNew: false,
      usageCount: form.Usage_Count__c || 0,
      completionRate: form.Complete_Rate__c || 0,
      hasPayment: !!form.hasPayment__c,
      hasConditionalLogic: !!form.hasConditionalLogic__c,
      isMobileFriendly: true,
    }));
    settemplates(templates);
    console.log(templates);
    console.log('Form from salesforce ', cleanData);
    //  show loading for at least 1 second
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    // If data loads after 1s, clear loading
    if (templates || cleanData) {
      setTimeout(() => setIsLoading(false), 1000);
    }

    return () => clearTimeout(timer);
  }, [formsData])


  // Filter templates based on search, category, etc.
  const filteredTemplates = templates?.filter(template => {
    const matchesSearch = template.formname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.Description__c.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || template.category === activeCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'Popular') return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0) || b.usageCount - a.usageCount;
    if (sortBy === 'Newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
    return a.formname.localeCompare(b.formname);
  });

  // Extract unique categories from templates for the category filter
  const categories = [
    'All',
    ...Array.from(
      new Set(
        templates
          .map((t) => t.category)
          .filter((c) => !!c)
      )
    ),
  ];

  const handleUseTemplate = (template) => {
    if (!loading) {
      onTemplateSelect(template);
    }    // onClose();
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
                        className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${activeCategory === category
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
                    <option value="Newest">Newest</option>
                    <option value="Popular">Popular</option>
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
                        <div className="flex gap-2 mt-4">
                          <div className="h-4 w-16 bg-gray-200 rounded"></div>
                          <div className="h-4 w-12 bg-gray-200 rounded"></div>
                        </div>
                        <div className="mt-6">
                          <div className="h-8 bg-blue-100 rounded w-full"></div>
                        </div>
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
                      onClick={() => setSelectedTemplate(template)} // Opens the side panel i.e Details of form
                      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full"
                    >
                      {/* Form Preview Section with Auto-scroll */}
                      <div className="relative group h-48 bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden p-4">
                        <div className="bg-white rounded-lg shadow-xs border border-gray-200 w-full h-full overflow-hidden">
                          <div className="group-hover:animate-scrollUp p-4 space-y-4">
                            {/* Form Header */}
                            <div className="text-center pb-2 border-b border-gray-100">
                              <h3 className="text-lg font-medium text-gray-800">{template.formname}</h3>
                              {template.Description__c && (
                                <p className="text-xs text-gray-500 mt-1">{template.Description__c}</p>
                              )}
                            </div>

                            {/* Form Fields */}
                            {template.formFields && template.formFields.length > 0 ? (
                              <div className="space-y-4">
                                {template.formFields.map((field, idx) => (
                                  <div key={`${template.id}-${idx}`} className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                      {field.Name}
                                      {field.Properties__c?.Properties__c?.required && (
                                        <span className="text-red-500 ml-1">*</span>
                                      )}
                                    </label>

                                    {field.Field_Type__c === 'fullname' && (
                                      <input
                                        type="text"
                                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="John Doe"
                                      />
                                    )}

                                    {field.Field_Type__c === 'email' && (
                                      <input
                                        type="email"
                                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="your@email.com"
                                      />
                                    )}

                                    {field.Field_Type__c === 'dropdown' && (
                                      <select className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                        {field.Properties__c?.options?.map((option, i) => (
                                          <option key={i}>{option}</option>
                                        ))}
                                      </select>
                                    )}

                                    {field.Field_Type__c === 'checkbox' && (
                                      <div className="space-y-2">
                                        {field.Properties__c?.options?.map((option, i) => (
                                          <div key={i} className="flex items-center">
                                            <input
                                              type="checkbox"
                                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label className="ml-2 block text-sm text-gray-700">{option}</label>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {field.Field_Type__c === 'radio' && (
                                      <div className="space-y-2">
                                        {field.Properties__c?.options?.map((option, i) => (
                                          <div key={i} className="flex items-center">
                                            <input
                                              type="radio"
                                              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label className="ml-2 block text-sm text-gray-700">{option}</label>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {field.Field_Type__c === 'longtext' && (
                                      <textarea
                                        rows={3}
                                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder={field.Properties__c?.placeholder?.main || ''}
                                      />
                                    )}
                                  </div>
                                ))}

                                {/* Form Submit Button */}
                                <div className="pt-4 border-t border-gray-100">
                                  <button
                                    type="button"
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                  >
                                    Submit
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-sm text-gray-500">No fields configured</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Details Section */}
                      <div className="p-4 flex-grow flex flex-col">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-semibold text-gray-900">{template.formname}</h3>

                          {/* Badges */}
                          <div className="flex space-x-1">
                            {template.isPopular && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <StarIcon className="h-3 w-3 mr-1" />
                              </span>
                            )}
                            {template.isNew && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                New
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{template.Description__c}</p>

                        {/* Features */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {template.formFields?.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {template.formFields.length} fields
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

                         {/* Use Template Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUseTemplate(template);
                          }}
                          className={`mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors ${
                            loading ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                              </svg>
                              Loading...
                            </>
                          ) : (
                            template.id === 'blank' ? 'Start Blank' : 'Use Template'
                          )}
                        </button>

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
              <h3 className="text-lg font-medium text-gray-900">{selectedTemplate.formname}</h3>
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
                    selectedTemplate.formFields.map((t, i) => {
                      return (
                        <li
                          key={i}
                          className="flex items-center gap-4 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-50 via-white to-blue-50 shadow-md hover:shadow-lg hover:scale-[1.03] transition-all border border-blue-200"
                        >
                          <span className="flex-shrink-0 flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 text-white font-bold text-base shadow-lg border-2 border-white">
                            {`${i + 1}`}
                          </span>
                          <div className="flex flex-col flex-grow">
                            <span className="font-semibold text-gray-900 text-base leading-tight">
                              {t.formname || `Field ${i + 1}`}
                            </span>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 tracking-wide shadow">
                              {t.Field_Type__c || "Field"}
                            </span>
                            {t.Properties__c?.description && (
                              <span className="block mt-1 text-xs text-gray-500 italic">{t.Properties__c.description}</span>
                            )}
                          </div>
                          {t.Properties__c?.required && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold shadow">
                              Required
                            </span>
                          )}
                        </li>
                      )
                    })
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
                  <p className="font-medium">{selectedTemplate.completionRate}</p>
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
                    if (!loading) onTemplateSelect(selectedTemplate);
                  }}
                  className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                    loading ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    'Use Template'
                  )}
                </button>
                <button
                  onClick={() => {
                    onClose();
                  }}
                  className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                 Close
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