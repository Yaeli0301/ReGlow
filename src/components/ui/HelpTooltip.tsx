"use client";

import { useId, useState } from "react";

interface HelpTooltipProps {
  title: string;
  body: string;
  action?: string;
  className?: string;
}

export function HelpTooltip({ title, body, action, className = "" }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={title}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-sm font-bold text-brand-600 transition hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
      >
        ?
      </button>
      {open && (
        <div
          id={id}
          role="tooltip"
          className="absolute start-0 top-full z-50 mt-2 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-xl border border-brand-200 bg-white p-3 text-start text-sm shadow-lg"
        >
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="mt-1 text-gray-600">{body}</p>
          {action && <p className="mt-2 font-medium text-brand-700">{action}</p>}
        </div>
      )}
    </span>
  );
}
