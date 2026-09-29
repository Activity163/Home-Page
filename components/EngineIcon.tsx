
import React from 'react';

interface EngineIconProps {
  icon: string;
  className?: string;
}

export const EngineIcon: React.FC<EngineIconProps> = ({ icon, className = '' }) => {
  const isUrl = icon.startsWith('http') || icon.startsWith('data:');
  const isSvg = icon.trim().startsWith('<svg');

  if (isUrl) {
    return <img src={icon} alt="" className={`object-contain ${className}`} />;
  }
  if (isSvg) {
    // Render as <img> via data URL: scripts inside user-supplied SVG cannot execute
    const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(icon)}`;
    return <img src={svgDataUrl} alt="" className={`object-contain ${className}`} />;
  }
  return <span className={className}>{icon}</span>;
};
