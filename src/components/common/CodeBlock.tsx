// /components/common/CodeBlock.tsx

'use client';

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from 'sonner';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  initiallyExpanded?: boolean;
}

export function CodeBlock({
  code,
  language = 'typescript',
  showLineNumbers = true,
  maxHeight = '300px',
  initiallyExpanded = false,
}: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      toast.success('تم نسخ الكود بنجاح');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('خطأ في نسخ الكود:', error);
      toast.error('حدث خطأ أثناء نسخ الكود');
    }
  };

  return (
    <div className="relative rounded-md border border-gray-200 shadow-sm">
      <div className="bg-gray-800 text-white text-xs py-2 px-4 rounded-t-md flex justify-between items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm font-medium text-gray-200 hover:text-white transition-colors"
          aria-label={isExpanded ? 'إخفاء الكود' : 'اظهار الكود'}
        >
          {isExpanded ? 'إخفاء الكود' : 'اظهار الكود'}
        </button>
        <span className="font-medium">{language || 'code'}</span>
      </div>
      
      {isExpanded && (
        <div className="relative group overflow-hidden">
          {/* زر النسخ */}
          <button
            className="absolute top-2 right-2 z-10 bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1 rounded-md text-sm font-medium flex items-center transition-colors"
            onClick={handleCopy}
            aria-label={isCopied ? 'تم النسخ' : 'نسخ الكود'}
          >
            {isCopied ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-1.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                تم النسخ
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-1.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                  />
                </svg>
                نسخ
              </>
            )}
          </button>

          {/* عرض الكود */}
          <div className="overflow-auto" style={{ maxHeight }}>
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              showLineNumbers={showLineNumbers}
              wrapLines
              wrapLongLines
              customStyle={{
                margin: 0,
                padding: '1.5rem 1rem 1rem',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                borderRadius: '0 0 0.375rem 0.375rem',
              }}
              lineNumberStyle={{
                minWidth: '2.5em',
                paddingRight: '1em',
                color: '#606060',
                textAlign: 'right',
                userSelect: 'none',
              }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        </div>
      )}
    </div>
  );
}
