'use client';

import { Label } from '@/components/ui/label';

export default function Campo({ label, required = false, children, hint, htmlFor }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-[#FFC107] ml-1">*</span>}
      </Label>
      {children}
      {hint && (
        <span className="text-xs text-gray-500 mt-0.5">{hint}</span>
      )}
    </div>
  );
}
