'use client'

export   const Pill = ({ value, onRemove, prefix = '' }) => (
  <div className="flex items-center gap-2 bg-gray-200 px-3 py-1 rounded-full text-gray-800">
    <span>{prefix}{value}</span>
    <button
      type="button"
      className="text-red-500 hover:text-red-600"
      onClick={onRemove}
    >
      ×
    </button>
  </div>
);
