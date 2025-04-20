'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            جاري تحميل المحتوى
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            يرجى الانتظار للحظة، أو
            <button
              onClick={() => reset()}
              className="font-medium text-indigo-600 hover:text-indigo-500 mx-2"
            >
              حاول مرة أخرى
            </button>
          </p>
        </div>
      </div>
    </div>
  );
} 