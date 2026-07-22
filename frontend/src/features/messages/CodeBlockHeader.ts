// SPDX-License-Identifier: MIT

export function normalizeCodeLanguage(language?: string): string {
  if (!language) return "Code";

  const value = language.toLowerCase();

  const labels: Record<string, string> = {
    js: "JavaScript",
    javascript: "JavaScript",
    jsx: "JSX",
    ts: "TypeScript",
    typescript: "TypeScript",
    tsx: "TSX",
    py: "Python",
    python: "Python",
    sh: "Shell",
    bash: "Bash",
    shell: "Shell",
    json: "JSON",
    css: "CSS",
    html: "HTML",
    sql: "SQL",
    diff: "Diff",
    yaml: "YAML",
    yml: "YAML",
  };

  return labels[value] || language;
}
