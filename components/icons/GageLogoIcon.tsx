import React from 'react';

export const GageLogoIcon: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
  <img
    src="/gage-logo.svg"
    alt="Gage Logo"
    className="h-10 sm:h-12 w-auto"
    {...props}
  />
);