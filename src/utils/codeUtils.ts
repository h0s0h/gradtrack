// /utils/codeUtils.ts - Version améliorée

// Fonction améliorée pour détecter le langage basée sur des heuristiques plus précises
export const detectLanguage = (code: string): string => {
  const trimmedCode = code.trim();
  
  // Détection basée sur les extensions de fichier courantes et les motifs de code
  
  // PHP
  if (trimmedCode.includes('<?php') || trimmedCode.match(/\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*\s*=/)) return 'php';
  
  // HTML
  if (trimmedCode.includes('<html') || trimmedCode.includes('<!DOCTYPE html') || 
      (trimmedCode.includes('<') && trimmedCode.includes('>') && 
       (trimmedCode.includes('<div') || trimmedCode.includes('<span') || trimmedCode.includes('<p')))) return 'html';
  
  // JSX/React
  if (trimmedCode.includes('import React') || trimmedCode.includes('from "react"') || 
      trimmedCode.includes('from \'react\'') || 
      (trimmedCode.includes('<') && trimmedCode.includes('/>')) ||
      (trimmedCode.includes('className=') && trimmedCode.includes('<'))) return 'jsx';
  
  // TypeScript
  if (trimmedCode.includes('interface ') || trimmedCode.includes(': string') || 
      trimmedCode.includes(': number') || trimmedCode.includes('<T>') ||
      trimmedCode.includes(': React.FC') || trimmedCode.includes('as const')) return 'typescript';
  
  // JavaScript
  if (trimmedCode.includes('function') || trimmedCode.includes('=>') || 
      trimmedCode.includes('const ') || trimmedCode.includes('let ') || 
      trimmedCode.includes('var ') || trimmedCode.includes('document.') ||
      trimmedCode.includes('window.')) return 'javascript';
  
  // SQL
  if (trimmedCode.match(/SELECT\s+[\w\*]+\s+FROM/i) || 
      trimmedCode.match(/INSERT\s+INTO/i) || 
      trimmedCode.match(/UPDATE\s+\w+\s+SET/i) ||
      trimmedCode.match(/DELETE\s+FROM/i) ||
      trimmedCode.match(/CREATE\s+TABLE/i)) return 'sql';
  
  // CSS
  if ((trimmedCode.includes('{') && trimmedCode.includes('}') && trimmedCode.includes(':')) || 
      trimmedCode.match(/\.[a-zA-Z][\w-]*\s*\{/) ||
      trimmedCode.match(/@media\s+/) ||
      trimmedCode.match(/^[.#]?[a-zA-Z][\w-]*\s*\{/)) return 'css';
  
  // Bash/Shell
  if (trimmedCode.includes('#!/bin/bash') || trimmedCode.includes('#!/bin/sh') ||
      trimmedCode.includes('apt-get') || trimmedCode.includes('sudo ') ||
      trimmedCode.match(/\$\([^)]+\)/) || trimmedCode.match(/export\s+\w+=/)) return 'bash';
  
  // JSON
  if ((trimmedCode.startsWith('{') && trimmedCode.endsWith('}') && 
       trimmedCode.includes('"') && trimmedCode.includes(':')) ||
      (trimmedCode.startsWith('[') && trimmedCode.endsWith(']') && 
       trimmedCode.includes('"') && trimmedCode.includes(':'))) return 'json';
  
  // Python
  if (trimmedCode.includes('def ') && trimmedCode.includes(':') && 
      !trimmedCode.includes('{') || trimmedCode.includes('import ') && 
      !trimmedCode.includes(';') || trimmedCode.includes('from ') && 
      trimmedCode.includes(' import ')) return 'python';
  
  // Java
  if (trimmedCode.includes('public class ') || trimmedCode.includes('private void ') ||
      trimmedCode.match(/public\s+static\s+void\s+main/) ||
      (trimmedCode.includes('@Override') && trimmedCode.includes('{'))) return 'java';
  
  // C#
  if (trimmedCode.includes('using System;') || trimmedCode.includes('namespace ') ||
      trimmedCode.match(/public\s+class\s+\w+/) && trimmedCode.includes(';') ||
      trimmedCode.includes('Console.WriteLine')) return 'csharp';
  
  // C/C++
  if (trimmedCode.includes('#include <') || 
      (trimmedCode.includes('int main') && trimmedCode.includes('return 0;')) ||
      trimmedCode.match(/std::\w+/) ||
      trimmedCode.match(/\w+::\w+/)) return 'cpp';
  
  // Ruby
  if (trimmedCode.includes('def ') && trimmedCode.includes('end') ||
      trimmedCode.match(/puts\s+["']/) ||
      trimmedCode.includes('require \'') ||
      trimmedCode.match(/\w+\.each\s+do\s+\|/)) return 'ruby';
  
  // Go
  if (trimmedCode.includes('package main') || 
      trimmedCode.includes('import (') ||
      trimmedCode.includes('func ') && trimmedCode.includes('() {') ||
      trimmedCode.match(/fmt\.Print/)) return 'go';
  
  // Rust
  if (trimmedCode.includes('fn main') || 
      trimmedCode.includes('let mut ') ||
      trimmedCode.match(/impl\s+\w+\s+for/) ||
      trimmedCode.includes('-> Result<')) return 'rust';
  
  // Swift
  if (trimmedCode.includes('import UIKit') || 
      trimmedCode.includes('var ') && trimmedCode.includes(': String') ||
      trimmedCode.match(/func\s+\w+\s*\(/) && !trimmedCode.includes(';')) return 'swift';
  
  // Kotlin
  if (trimmedCode.includes('fun main') || 
      trimmedCode.includes('val ') || trimmedCode.includes('var ') &&
      !trimmedCode.includes(';') && !trimmedCode.includes('->') ||
      trimmedCode.match(/class\s+\w+\s*\(/)) return 'kotlin';
  
  // Markdown
  if (trimmedCode.match(/^#\s+/) || 
      trimmedCode.match(/\*\*[^*]+\*\*/) ||
      trimmedCode.match(/\[.+\]\(.+\)/)) return 'markdown';
  
  // YAML
  if (trimmedCode.match(/^\s*[\w-]+:\s+.+$/m) && 
      !trimmedCode.includes('{') && !trimmedCode.includes('}')) return 'yaml';
  
  // XML
  if (trimmedCode.match(/<\?xml/) || 
      (trimmedCode.match(/<[^>]+>/) && trimmedCode.match(/<\/[^>]+>/) && 
       !trimmedCode.includes('<!DOCTYPE html'))) return 'xml';
  
  // Par défaut, retourner javascript
  return 'javascript';
};

// Fonction pour charger dynamiquement les langages supplémentaires
export const loadLanguage = async (language: string) => {
  try {
    // Chargement dynamique des langages supplémentaires
    switch (language) {
      case 'python':
        await import('prism-react-renderer/prism/components/prism-python');
        break;
      case 'java':
        await import('prism-react-renderer/prism/components/prism-java');
        break;
      case 'php':
        await import('prism-react-renderer/prism/components/prism-php');
        break;
      case 'csharp':
        await import('prism-react-renderer/prism/components/prism-csharp');
        break;
      case 'cpp':
        await import('prism-react-renderer/prism/components/prism-cpp');
        break;
      case 'ruby':
        await import('prism-react-renderer/prism/components/prism-ruby');
        break;
      case 'go':
        await import('prism-react-renderer/prism/components/prism-go');
        break;
      case 'rust':
        await import('prism-react-renderer/prism/components/prism-rust');
        break;
      case 'swift':
        await import('prism-react-renderer/prism/components/prism-swift');
        break;
      case 'kotlin':
        await import('prism-react-renderer/prism/components/prism-kotlin');
        break;
      case 'yaml':
        await import('prism-react-renderer/prism/components/prism-yaml');
        break;
      case 'xml':
        await import('prism-react-renderer/prism/components/prism-xml');
        break;
      case 'sql':
        await import('prism-react-renderer/prism/components/prism-sql');
        break;
      case 'bash':
        await import('prism-react-renderer/prism/components/prism-bash');
        break;
      case 'markdown':
        await import('prism-react-renderer/prism/components/prism-markdown');
        break;
    }
  } catch (error) {
    console.error(`Failed to load language: ${language}`, error);
  }
};

// Fonction pour précharger les langages les plus courants
export const preloadCommonLanguages = async () => {
  try {
    // Préchargement des langages les plus couramment utilisés
    await Promise.all([
      import('prism-react-renderer/prism/components/prism-javascript'),
      import('prism-react-renderer/prism/components/prism-typescript'),
      import('prism-react-renderer/prism/components/prism-jsx'),
      import('prism-react-renderer/prism/components/prism-css'),
      import('prism-react-renderer/prism/components/prism-html')
    ]);
  } catch (error) {
    console.error('Failed to preload common languages', error);
  }
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
