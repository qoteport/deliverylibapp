import React from 'react';

export interface KekehIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Kekeh (Tricycle / Auto-Rickshaw / Tuk-Tuk) Icon
 * Designed in the Lucide icon aesthetic (24x24 grid, 2px stroke, round caps/joins)
 * to authentically represent Monrovia's iconic 3-wheeled passenger Kekehs.
 */
export const KekehIcon: React.FC<KekehIconProps> = ({ className = 'w-5 h-5', ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Front & Rear Wheels */}
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      {/* Chassis / Floorboard */}
      <path d="M7.5 18h8" />
      {/* Front Wheel Fork & Handlebar */}
      <path d="M5 15.5L7 11" />
      <path d="M5.5 11h2.5" />
      {/* Kekeh Cabin: Windshield, Canopy Roof & Rear Body */}
      <path d="M7 11L9.5 4h9a1.5 1.5 0 0 1 1.5 1.5V15.5h-4.5" />
      {/* Passenger Door / Window Arch */}
      <path d="M11 8.5h5a1 1 0 0 1 1 1v5.5h-6V9.5a1 1 0 0 1 1-1z" />
    </svg>
  );
};

export default KekehIcon;
