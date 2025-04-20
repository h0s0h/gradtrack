// /components/common/LanguageSelector.tsx

'use client';

export default function LanguageSelector({
  selectedLanguage,
  onLanguageChange
}: {
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
}) {
  return (
    <select
      value={selectedLanguage}
      onChange={(e) => onLanguageChange(e.target.value)}
      className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium text-gray-700"
      aria-label="اختر لغة البرمجة"
    >
      <option value="typescript">TypeScript</option>
      <option value="javascript">JavaScript</option>
      <option value="python">Python</option>
      <option value="java">Java</option>
      <option value="csharp">C#</option>
      <option value="cpp">C++</option>
      <option value="php">PHP</option>
      <option value="ruby">Ruby</option>
      <option value="swift">Swift</option>
      <option value="kotlin">Kotlin</option>
      <option value="go">Go</option>
      <option value="rust">Rust</option>
      <option value="sql">SQL</option>
      <option value="html">HTML</option>
      <option value="css">CSS</option>
      <option value="shell">Shell Script</option>
      <option value="yaml">YAML</option>
      <option value="json">JSON</option>
      <option value="markdown">Markdown</option>
      <option value="plaintext">نص عادي</option>
    </select>
  );
}
