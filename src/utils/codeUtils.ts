// Este es un archivo stub para codeUtils
// Proporciona implementaciones simuladas de las funciones necesarias

export const registerLanguages = () => {
  // Implementación vacía
  console.log("registerLanguages llamado (stub)");
};

export const getLanguageFromExtension = (extension: string): string => {
  // Devuelve un idioma predeterminado para cualquier extensión
  return "javascript";
};

export const getSyntaxHighlighter = (language: string = "javascript") => {
  // Devuelve un objeto simulado que representa un resaltador de sintaxis
  return {
    language,
    code: "",
    tokens: [],
    getLineProps: () => ({}),
    getTokenProps: () => ({}),
  };
};

export const getLanguageName = (language: string): string => {
  // Devuelve el nombre legible del idioma
  const languageMap = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    html: "HTML",
    css: "CSS",
  };
  
  return languageMap[language] || "Código";
};

export const getLanguageFromFilename = (filename: string): string => {
  // Extrae la extensión y devuelve el idioma
  const extension = filename.split(".").pop() || "";
  return getLanguageFromExtension(extension);
};

// Funciones adicionales que podrían ser importadas
export const detectLanguage = (code: string): string => {
  return "javascript";
};

export const loadLanguage = async (language: string) => {
  console.log(`loadLanguage llamado con: ${language} (stub)`);
  return Promise.resolve();
};

export const preloadCommonLanguages = async () => {
  console.log("preloadCommonLanguages llamado (stub)");
  return Promise.resolve();
};

// Constantes
export const MAX_CODE_LENGTH = 100000;
export const MAX_COMMENT_LENGTH = 20000;
export const MAX_POST_LENGTH = 50000;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Funciones de validación
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
  return null;
};

// Funciones de formato
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

// Agrega cualquier otra función que pueda ser importada de este módulo
