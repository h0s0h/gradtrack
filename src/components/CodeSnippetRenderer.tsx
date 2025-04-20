'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase/firebaseConfig';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markup';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';

interface CodeSnippetRendererProps {
  codeSnippetId: string;
  language: string;
}

export default function CodeSnippetRenderer({ codeSnippetId, language }: CodeSnippetRendererProps) {
  const [code, setCode] = useState<string>('// جار تحميل الكود...');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const codeElementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const loadCode = async () => {
      try {
        setIsLoading(true);
        const codeRef = ref(database, `codes/${codeSnippetId}`);
        const snapshot = await get(codeRef);
        
        if (snapshot.exists()) {
          const codeData = snapshot.val();
          setCode(codeData.content || '// لا يوجد محتوى');
        } else {
          setCode('// لم يتم العثور على الكود');
          setError('لم يتم العثور على الكود');
        }
      } catch (error) {
        console.error("Error loading code:", error);
        setCode('// حدث خطأ أثناء تحميل الكود');
        setError('حدث خطأ أثناء تحميل الكود');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCode();
  }, [codeSnippetId]);

  useEffect(() => {
    if (codeElementRef.current && !isLoading) {
      Prism.highlightElement(codeElementRef.current);
    }
  }, [code, isLoading]);

  return (
    <div className="code-snippet-container">
      <pre className={`line-numbers ${isLoading ? 'opacity-70' : ''}`} style={{ 
        margin: 0,
        padding: '0.75rem',
        fontSize: '0.875rem',
        borderRadius: '0.375rem',
        maxHeight: '300px',
        overflow: 'auto'
      }}>
        <code 
          ref={codeElementRef}
          className={`language-${language}`}
        >
          {code}
        </code>
      </pre>
    </div>
  );
} 