
import React from 'react';

export const GageLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 180 50" // Adjusted viewBox to suit the aspect ratio of "GAGE" text
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Gage Logo"
    {...props} // Allows className to control size, etc.
  >
    <title>Gage Logo</title>
    <text
      x="50%" // Horizontally center
      y="50%" // Vertically center
      dominantBaseline="central" // More precise vertical centering for text
      textAnchor="middle" // Anchor text from its horizontal center
      fontSize="40" // Font size to fill the viewBox height well
      fontFamily="sans-serif" // Use the project's default sans-serif font stack (via Tailwind)
      fontWeight="bold"
      fill="#ff1818" // Specific brand color changed
      letterSpacing="0.5" // Optional: slight adjustment for visual appeal if needed
    >
      GAGE
    </text>
  </svg>
);
