import React from 'react';

export default function TailwindTest() {
  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">اختبار Tailwind CSS</h1>
      <p className="text-gray-700 mb-4">هذا النص لاختبار أن Tailwind CSS يعمل بشكل صحيح.</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-100 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-green-800">مربع أخضر</h2>
        </div>
        <div className="bg-blue-100 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-blue-800">مربع أزرق</h2>
        </div>
      </div>
      <button className="mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
        زر بتنسيق Tailwind
      </button>
    </div>
  );
} 