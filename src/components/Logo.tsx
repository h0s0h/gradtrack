import React from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <div
        className="bg-gradient-to-r from-blue-600 to-indigo-700
                   text-white px-3 py-1 rounded-lg mr-2 shadow-md"
      >
        G
      </div>
      <h1
        className="text-2xl font-bold
                   bg-gradient-to-r from-blue-600 to-indigo-700
                   bg-clip-text text-transparent"
      >
        GradTrack
      </h1>
    </div>
  );
}
