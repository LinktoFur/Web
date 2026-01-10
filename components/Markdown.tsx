import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { getAssetUrl } from '../services/api';

interface MarkdownProps {
  content: string;
  className?: string;
  basePath?: string; // e.g. "joinus/" for fixing relative links
  onInternalNav?: (type: 'charter' | 'disclaimer') => void;
}

const Markdown: React.FC<MarkdownProps> = ({ content, className = "", basePath = "", onInternalNav }) => {
  // Pre-processing
  const processContent = (text: string) => {
    if (!text) return '';
    
    // 1. Handle <center> tags with markdown inside
    // Replace markdown links inside center tags manually to ensure they are rendered as links
    let processed = text.replace(/<center>([\s\S]*?)<\/center>/gi, (match, inner) => {
        let innerProcessed = inner;
        // Handle bold **text**
        innerProcessed = innerProcessed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Handle italic *text*
        innerProcessed = innerProcessed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Handle markdown links [text](url) -> <a href="url" target="_blank">text</a>
        innerProcessed = innerProcessed.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (m, text, url) => {
             // We can't easily hook into React state here for custom nav in raw HTML replacement, 
             // but we can try to keep it simple or let the main markdown parser handle links if not inside center.
             // For center tags, we assume external or standard links usually.
             const finalUrl = transformLink(url);
             return `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        });
        
        return `<div class="text-center">${innerProcessed}</div>`;
    });

    return processed;
  };

  const transformLink = (href: string) => {
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return href;
    
    if (href.startsWith('./')) {
        return getAssetUrl(`${basePath}${href.slice(2)}`);
    }
    if (href.startsWith('../')) {
        return getAssetUrl(href.slice(3));
    }
    return getAssetUrl(`${basePath}${href}`);
  };

  const processedContent = processContent(content);

  return (
    // [&>*:first-child]:mt-0 removes top margin from the first element
    // [&>*:last-child]:mb-0 removes bottom margin from the last element
    <div className={`prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
            a: ({node, ...props}) => {
                const rawHref = props.href || '';
                // Check for internal navigation targets
                // Matches /disclaimer, /charter, disclaimer, charter, etc.
                const isDisclaimer = rawHref.toLowerCase().includes('disclaimer');
                const isCharter = rawHref.toLowerCase().includes('charter');

                if (onInternalNav && (isDisclaimer || isCharter)) {
                    return (
                        <a 
                            {...props} 
                            href={rawHref}
                            className="text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                            onClick={(e) => {
                                e.preventDefault();
                                if (isDisclaimer) onInternalNav('disclaimer');
                                else if (isCharter) onInternalNav('charter');
                            }}
                        >
                            {props.children}
                        </a>
                    );
                }

                const href = rawHref ? transformLink(rawHref) : '#';
                return <a {...props} href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline cursor-pointer" />
            },
            img: ({node, ...props}) => {
                const srcValue = props.src;
                const src = (typeof srcValue === 'string') ? transformLink(srcValue) : '';
                return <img {...props} src={src} className="max-w-full h-auto rounded-lg shadow-sm my-4 inline-block" loading="lazy" />
            },
            h1: ({node, ...props}) => <h1 {...props} className="text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-white" />,
            h2: ({node, ...props}) => <h2 {...props} className="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-white border-b border-gray-200 dark:border-zinc-700 pb-2" />,
            h3: ({node, ...props}) => <h3 {...props} className="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-white" />,
            
            p: ({node, ...props}) => <p {...props} className="my-2 leading-relaxed" />,
            ul: ({node, ...props}) => <ul {...props} className="list-disc list-outside ml-5 my-4 space-y-1" />,
            ol: ({node, ...props}) => <ol {...props} className="list-decimal list-outside ml-5 my-4 space-y-1" />,
            li: ({node, children, ...props}) => {
                return <li {...props} className="marker:text-gray-500 dark:marker:text-gray-400 pl-1">{children}</li>
            },

            blockquote: ({node, ...props}) => <blockquote {...props} className="border-l-4 border-brand-200 dark:border-brand-800 pl-4 italic my-4 text-gray-600 dark:text-gray-400" />,
            code: ({node, ...props}) => <code {...props} className="bg-gray-100 dark:bg-zinc-800 rounded px-1 py-0.5 text-sm font-mono text-brand-700 dark:text-brand-300" />,
            
            table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table {...props} className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700 border border-gray-200 dark:border-zinc-700 rounded-lg" /></div>,
            thead: ({node, ...props}) => <thead {...props} className="bg-gray-50 dark:bg-zinc-800" />,
            tbody: ({node, ...props}) => <tbody {...props} className="divide-y divide-gray-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900" />,
            tr: ({node, ...props}) => <tr {...props} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors" />,
            th: ({node, ...props}) => <th {...props} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-zinc-700" />,
            td: ({node, ...props}) => <td {...props} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-normal border-b border-gray-200 dark:border-zinc-700" />,
            
            div: ({node, className, ...props}) => {
                if (className === 'text-center') {
                    return <div {...props} className="text-center my-4 space-y-2" />;
                }
                return <div {...props} className={className} />;
            }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;