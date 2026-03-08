import React from 'react';

interface PouchIconProps extends React.SVGProps<SVGSVGElement> {
  strokeWidth?: number;
}

/**
 * Linkpouch brand icon — a drawstring pouch, matching the favicon design.
 * Use inside a coloured container; inherits stroke/fill from className/currentColor.
 */
export function PouchIcon({ strokeWidth = 2, ...props }: PouchIconProps) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      {/* Pouch body */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d="M5 13.5C5 19 8.134 21 12 21s7-2 7-7.5V11c0-1.657-3.134-3-7-3s-7 1.343-7 3v2.5z"
      />
      {/* Drawstring knot */}
      <circle cx="12" cy="5.5" r="1.5" strokeWidth={strokeWidth} />
      {/* Left tie */}
      <line x1="10.9" y1="4.4" x2="9" y2="2.5" strokeLinecap="round" strokeWidth={strokeWidth} />
      {/* Right tie */}
      <line x1="13.1" y1="4.4" x2="15" y2="2.5" strokeLinecap="round" strokeWidth={strokeWidth} />
    </svg>
  );
}
