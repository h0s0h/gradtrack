'use client';

import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase/firebaseConfig';
import { toast } from 'sonner';
import { CodeBlock } from '@/components/common/CodeBlock';

interface CodeSnippetRendererWithCodeBlockProps {
  codeSnippetId: string;
  language?: string;
}

export default function CodeSnippetRendererWithCodeBlock({ 
  codeSnippetId,
  language = 'typescript'
}: CodeSnippetRendererWithCodeBlockProps) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCode = async () => {
      if (!codeSnippetId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const codeRef = ref(database, `codes/${codeSnippetId}`);
        const snapshot = await get(codeRef);
        
        if (snapshot.exists()) {
          const codeData = snapshot.val();
          setCode(codeData.content || '');
        } else {
          setError('لم يتم العثور على الكود');
        }
      } catch (err) {
        console.error('خطأ في جلب الكود:', err);
        setError('حدث خطأ أثناء جلب الكود');
      } finally {
        setLoading(false);
      }
    };

    fetchCode();
  }, [codeSnippetId]);

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        جاري تحميل الكود...
      </div>
    );
  }

  if (error || !code) {
    return (
      <div className="p-4 text-center text-red-500">
        {error || 'الكود غير متاح'}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* زر إظهار/إخفاء الكود */}
      <div className="bg-gray-800 text-white text-xs py-2 px-4 rounded-t-md flex justify-between items-center">
        <button
          onClick={() => document.getElementById(`code-${codeSnippetId}`)?.querySelector('button')?.click()}
          className="text-sm font-medium text-gray-200 hover:text-gray-300 transition-colors"
        >
          إظهار/إخفاء الكود
        </button>
        <span className="font-medium">{language || 'code'}</span>
      </div>
      <div id={`code-${codeSnippetId}`}>
        <CodeBlock 
          code={code} 
          language={language} 
          showLineNumbers={true}
        />
      </div>
    </div>
  );
} 