interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className = '' }: ErrorMessageProps) {
  return (
    <div 
      className={`flex items-center p-3 mt-2 bg-red-50 border border-red-200 rounded-md ${className}`}
      role="alert"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5 text-red-500 ml-2 flex-shrink-0" 
        viewBox="0 0 20 20" 
        fill="currentColor"
      >
        <path 
          fillRule="evenodd" 
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
          clipRule="evenodd" 
        />
      </svg>
      <p className="text-sm text-red-700 font-medium">{message}</p>
    </div>
  );
}

interface ValidationErrorProps {
  message: string;
  remainingCharacters: number;
  className?: string;
}

export function ValidationError({ message, remainingCharacters, className = '' }: ValidationErrorProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center text-sm text-red-600">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4 ml-1" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
            clipRule="evenodd" 
          />
        </svg>
        <span>{message}</span>
      </div>
      <p className="text-xs text-red-500 mt-1">
        تجاوزت الحد الأقصى بـ {Math.abs(remainingCharacters)} حرف
      </p>
    </div>
  );
}

interface SuccessMessageProps {
  message: string;
  className?: string;
}

export function SuccessMessage({ message, className = '' }: SuccessMessageProps) {
  return (
    <div 
      className={`flex items-center p-3 mt-2 bg-green-50 border border-green-200 rounded-md ${className}`}
      role="status"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5 text-green-500 ml-2 flex-shrink-0" 
        viewBox="0 0 20 20" 
        fill="currentColor"
      >
        <path 
          fillRule="evenodd" 
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
          clipRule="evenodd" 
        />
      </svg>
      <p className="text-sm text-green-700 font-medium">{message}</p>
    </div>
  );
}