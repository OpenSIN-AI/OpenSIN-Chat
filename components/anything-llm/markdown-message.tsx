'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import { cn } from '@/lib/utils'

interface MarkdownMessageProps {
  content: string
  className?: string
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none',
        // Base text
        'prose-p:leading-relaxed prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0',
        // Headings
        'prose-headings:text-foreground prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4',
        'prose-h1:text-lg prose-h2:text-base prose-h3:text-sm',
        // Inline code
        'prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.82em] prose-code:font-mono prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none',
        // Code blocks
        'prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-pre:bg-transparent prose-pre:p-0 prose-pre:my-3',
        'prose-pre:prose-code:bg-transparent prose-pre:prose-code:p-0 prose-pre:prose-code:rounded-none',
        // Lists
        'prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
        'prose-ul:pl-5 prose-ol:pl-5',
        // Blockquote
        'prose-blockquote:border-l-2 prose-blockquote:border-primary prose-blockquote:pl-3 prose-blockquote:text-muted-foreground prose-blockquote:not-italic',
        // Table
        'prose-table:text-xs prose-th:bg-muted/60 prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5 prose-td:border-border prose-th:border-border',
        // Links
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        // HR
        'prose-hr:border-border',
        // Bold & strong
        'prose-strong:text-foreground prose-strong:font-semibold',
        // Colors forced to theme tokens
        'text-foreground',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Wrap code blocks to preserve highlight.js styles but honour theme
          pre: ({ children, ...props }) => (
            <pre
              {...props}
              className="overflow-x-auto rounded-lg border border-border bg-[hsl(var(--card))] text-[0.82em] leading-relaxed"
            >
              {children}
            </pre>
          ),
          // Inline code — strip highlight.js class so it doesn't get block-styled
          code: ({ className: cls, children, ...props }) => {
            const isBlock = cls?.startsWith('language-')
            if (isBlock) {
              return (
                <code className={cls} {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code
                className="rounded bg-muted px-1 py-0.5 font-mono text-[0.82em] text-foreground"
                {...props}
              >
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
