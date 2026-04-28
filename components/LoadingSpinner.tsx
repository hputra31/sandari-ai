import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'small' }) => {
  const isSmall = size === 'small';
  
  // Dimensions
  const containerSize = isSmall ? 'w-5 h-5' : 'w-16 h-16';
  const borderSize = isSmall ? 'border-2' : 'border-4';
  const coreSize = isSmall ? 'w-1.5 h-1.5' : 'w-4 h-4';
  
  // Colors
  const outerColor = 'border-t-pink-500 border-r-pink-500';
  const innerColor = 'border-b-purple-400 border-l-purple-400';

  return (
    <div className={`relative flex items-center justify-center ${containerSize} ${isSmall ? 'mr-2' : ''}`}>
       {/* Outer Ring - Fast Spin */}
      <div className={`absolute w-full h-full ${borderSize} border-transparent ${outerColor} rounded-full animate-spin shadow-[0_0_10px_rgba(236,72,153,0.3)]`}></div>
      
      {/* Inner Ring - Reverse Slow Spin */}
      <div className={`absolute w-3/4 h-3/4 ${borderSize} border-transparent ${innerColor} rounded-full animate-spin-reverse`}></div>
      
      {/* Core - Pulsing */}
      <div className={`absolute ${coreSize} bg-white rounded-full animate-ping`}></div>
      <div className={`absolute w-full h-full rounded-full bg-pink-500/5 animate-pulse`}></div>
    </div>
  );
};

export default LoadingSpinner;