import React from 'react';

export const GageLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 180 50"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Gage Logo"
    fill="currentColor"
    {...props}
  >
    <title>Gage Logo</title>
    <g>
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="fill-[#ff1818] font-bold"
      >
        GAGE
      </text>
    </g>
  </svg>
);
