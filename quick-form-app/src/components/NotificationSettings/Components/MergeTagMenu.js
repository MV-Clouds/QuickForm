'use client'

export const MergeTagMenu = ({ isOpen, onClose, formFields }) => {
  return (
    <div
      className={`absolute right-8  bg-white border border-gray-200 rounded-xl shadow-2xl w-72 z-50 transition-all duration-300 ease-in-out ${
        isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <h4 className="text-base font-semibold text-gray-800 tracking-tight">Available Merge Tags</h4>
        <button
          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          onClick={onClose}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <ul className="max-h-64 overflow-y-auto p-3 space-y-1">
        {formFields.map(field => (
          <li key={field.id}>
            <button
              className="w-full text-left p-2.5 font-mono text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-2"
              onClick={onClose}
            >
              <span className="text-blue-500">{`{{${field.id}}}`}</span> - {field.label}
            </button>
          </li>
        ))}
        <li>
          <button
            className="w-full text-left p-2.5 font-mono text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-2"
            onClick={onClose}
          >
            {/* <span className="text-blue-500">{{formName}}</span> - Form Name */}
          </button>
        </li>
        <li>
          <button
            className="w-full text-left p-2.5 font-mono text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-2"
            onClick={onClose}
          >
            {/* <span className="text-blue-500">{{submissionDate}}</span> - Submission Date */}
          </button>
        </li>
      </ul>
    </div>
  );
};