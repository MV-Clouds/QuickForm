import { X } from "lucide-react";

export  const Pill = ({ value, onRemove, prefix = '' }) => (
  <div className="flex items-center gap-2 text-blue-500 bg-blue-100 px-3 py-2 border border-blue-500 rounded-xl text-gray-800">
    <span>{prefix}{value} |</span>
    <button
      type="button"
      className="text-blue-500 hover:text-blue-900"
      onClick={onRemove}
    >
      <X className="w-4 h-4"
       />
    </button>
  </div>
);
