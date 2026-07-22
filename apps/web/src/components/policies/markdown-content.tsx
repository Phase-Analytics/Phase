import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

type MarkdownContentProps = {
  content: string;
  className?: string;
};

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-8 mb-4 font-semibold text-3xl tracking-tight first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 font-semibold text-2xl tracking-tight">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2 font-semibold text-xl tracking-tight">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-4 mb-2 font-semibold text-lg">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="my-3 text-base text-foreground/90 leading-7">{children}</p>
  ),
  a: ({ href, children }) => (
    <a
      className="text-primary underline underline-offset-2 hover:opacity-80"
      href={href}
      rel="noopener noreferrer"
      target={href?.startsWith('http') ? '_blank' : undefined}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-base text-foreground/90 leading-7">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-muted-foreground/30 border-l-2 pl-4 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 text-[0.875em]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-md bg-muted p-4 text-sm">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-8 border-border" />,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b px-3 py-2 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-border/60 border-b px-3 py-2">{children}</td>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn('policy-markdown', className)}>
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
