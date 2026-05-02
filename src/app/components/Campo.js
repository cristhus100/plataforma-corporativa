'use client';

export default function Campo({ label, required = false, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-[#FFC107] ml-1">*</span>}
      </label>
      {children}
      {hint && (
        <span className="text-xs text-gray-500 mt-0.5">{hint}</span>
      )}
    </div>
  );
}
