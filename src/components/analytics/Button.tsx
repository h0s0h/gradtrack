
// components/Button.tsx
import React, { useMemo } from 'react';
import Link from 'next/link';

interface ButtonProps {
  children: React.ReactNode;
  primary?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  [x: string]: any;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  primary = false, 
  href, 
  onClick, 
  className = '', 
  size = 'medium', 
  icon, 
  disabled = false,
  type = 'button',
  ...props 
}) => {
  const sizeClasses = useMemo(() => ({
    small: "px-3 py-1 text-sm",
    medium: "px-4 py-2",
    large: "px-6 py-3 text-lg"
  }), []);
  
  const buttonClasses = useMemo(() => {
    const baseClasses = "font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2";
    const colorClasses = primary 
      ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 shadow-md hover:shadow-lg" 
      : "text-gray-700 hover:bg-gray-100 border border-gray-200";
    const disabledClasses = disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : "";
    
    return `${baseClasses} ${colorClasses} ${sizeClasses[size]} ${disabledClasses} ${className}`;
  }, [primary, size, disabled, className, sizeClasses]);
  
  const content = (
    <>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </>
  );
  
  if (href && !disabled) {
    return (
      <Link href={href} className={buttonClasses} {...props}>
        {content}
      </Link>
    );
  }
  
  return (
    <button 
      className={buttonClasses} 
      onClick={disabled ? undefined : onClick} 
      type={type}
      disabled={disabled}
      {...props}
    >
      {content}
    </button>
  );
};

export default Button;