/**
 * Utility functions for handling code snippets
 */

/**
 * Simple language detection function that always returns a default language
 * @param code The code to detect language for (unused, kept for compatibility)
 * @returns Always returns 'javascript' as the default language
 */
export const detectLanguage = (code: string): string => {
  // Always return 'javascript' as a safe default
  return 'javascript';
};

/**
 * Formats code for display
 * @param code The code to format
 * @param language The programming language of the code
 */
export const formatCode = (code: string, language: string = 'javascript'): string => {
  return code.trim();
};

/**
 * Highlights specific lines in code
 * @param code The code to highlight
 * @param lineNumbers Array of line numbers to highlight
 */
export const highlightLines = (code: string, lineNumbers: number[] = []): string => {
  if (lineNumbers.length === 0) return code;
  
  const lines = code.split('\n');
  const highlightedLines = lines.map((line, index) => {
    if (lineNumbers.includes(index + 1)) {
      return `<mark>${line}</mark>`;
    }
    return line;
  });
  
  return highlightedLines.join('\n');
};

/**
 * Gets the language from a file extension
 * @param filename The filename with extension
 */
export const getLanguageFromFilename = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const extensionMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rb': 'ruby',
    'php': 'php',
  };
  
  return extensionMap[extension] || 'plaintext';
};

export const MAX_CODE_LENGTH = 10000;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_POST_LENGTH = 5000;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const validateCodeInput = (code: string) => {
  if (!code.trim()) {
    return 'يجب إدخال الكود';
  }
  return null;
};

export const validateCommentInput = (content: string) => {
  if (!content.trim()) {
    return 'يجب إدخال محتوى التعليق';
  }
  return null;
};

export const validatePostInput = (content: string) => {
  if (!content.trim()) {
    return 'يجب إدخال محتوى المنشور';
  }
  return null;
};

export const validateImageFile = (file: File) => {
  if (!file) {
    return 'يجب اختيار صورة';
  }
  
  // التحقق من نوع الملف
  const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    return 'يجب أن تكون الصورة بتنسيق JPG أو PNG أو GIF';
  }

  // التحقق من حجم الملف
  if (file.size > MAX_IMAGE_SIZE) {
    return 'يجب أن لا يتجاوز حجم الصورة 5 ميجابايت';
  }

  return null;
};

export const getCharacterCount = (text: string) => {
  return text.length;
};

export const getRemainingCharacters = (text: string, maxLength: number) => {
  return maxLength - text.length;
};

export const formatCharacterCount = (current: number, max: number) => {
  return `${current}/${max} حرف`;
};

export const formatRemainingCharacters = (remaining: number) => {
  if (remaining < 0) {
    return `تجاوزت الحد الأقصى بـ ${Math.abs(remaining)} حرف`;
  }
  return `متبقي ${remaining} حرف`;
};

export default {
  formatCode,
  highlightLines,
  getLanguageFromFilename,
  validateCodeInput,
  validateCommentInput,
  validatePostInput,
  validateImageFile
};
