'use client';

export default function CollapsibleSection({ title, isOpen, onToggle, required, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {title}
          {required && <span className="text-xs text-red-500 font-normal">(Obligatorio)</span>}
        </h2>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && <div className="px-6 pb-6 pt-2 border-t border-gray-100">{children}</div>}
    </div>
  );
}
