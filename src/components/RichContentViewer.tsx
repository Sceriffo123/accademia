import { useState, useEffect } from 'react';
import { FileText, Image, Download, ExternalLink } from 'lucide-react';

interface RichContentViewerProps {
  content: string;
  onScrollProgress?: (progress: number) => void;
  className?: string;
}

interface ContentBlock {
  type: 'text' | 'heading' | 'image' | 'link' | 'list' | 'code' | 'quote';
  content: string;
  metadata?: {
    level?: number;
    src?: string;
    alt?: string;
    href?: string;
    language?: string;
  };
}

export default function RichContentViewer({ content, onScrollProgress, className = '' }: RichContentViewerProps) {
  const [parsedContent, setParsedContent] = useState<ContentBlock[]>([]);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Parse content into structured blocks
  const parseContent = (rawContent: string): ContentBlock[] => {
    const lines = rawContent.split('\n');
    const blocks: ContentBlock[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;
      
      // Headings
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, '');
        blocks.push({
          type: 'heading',
          content: text,
          metadata: { level }
        });
      }
      // Images
      else if (line.startsWith('![')) {
        const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (match) {
          blocks.push({
            type: 'image',
            content: match[1] || 'Immagine',
            metadata: { src: match[2], alt: match[1] }
          });
        }
      }
      // Links
      else if (line.includes('[') && line.includes('](')) {
        const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (match) {
          blocks.push({
            type: 'link',
            content: match[1],
            metadata: { href: match[2] }
          });
        } else {
          blocks.push({ type: 'text', content: line });
        }
      }
      // Lists
      else if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
        blocks.push({
          type: 'list',
          content: line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '')
        });
      }
      // Code blocks
      else if (line.startsWith('```')) {
        const language = line.replace('```', '');
        let codeContent = '';
        i++; // Skip opening ```
        
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeContent += lines[i] + '\n';
          i++;
        }
        
        blocks.push({
          type: 'code',
          content: codeContent.trim(),
          metadata: { language }
        });
      }
      // Quotes
      else if (line.startsWith('>')) {
        blocks.push({
          type: 'quote',
          content: line.replace(/^>\s*/, '')
        });
      }
      // Regular text
      else {
        blocks.push({ type: 'text', content: line });
      }
    }
    
    return blocks;
  };

  useEffect(() => {
    setParsedContent(parseContent(content));
  }, [content]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.target as HTMLDivElement;
    const scrollPercent = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
    const progress = Math.min(Math.max(scrollPercent, 0), 100);
    
    setScrollProgress(progress);
    if (onScrollProgress) {
      onScrollProgress(progress);
    }
  };

  const renderBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'heading':
        const HeadingTag = `h${Math.min(block.metadata?.level || 1, 6)}` as keyof JSX.IntrinsicElements;
        const headingClasses = {
          1: 'text-2xl font-bold text-gray-900 mb-4 mt-6',
          2: 'text-xl font-semibold text-gray-800 mb-3 mt-5',
          3: 'text-lg font-medium text-gray-800 mb-2 mt-4',
          4: 'text-base font-medium text-gray-700 mb-2 mt-3',
          5: 'text-sm font-medium text-gray-700 mb-1 mt-2',
          6: 'text-sm font-medium text-gray-600 mb-1 mt-2'
        };
        return (
          <HeadingTag key={index} className={headingClasses[block.metadata?.level as keyof typeof headingClasses] || headingClasses[1]}>
            {block.content}
          </HeadingTag>
        );

      case 'image':
        return (
          <div key={index} className="my-4">
            <img
              src={block.metadata?.src}
              alt={block.metadata?.alt || block.content}
              className="max-w-full h-auto rounded-lg shadow-sm border"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Immagine non disponibile</p>
              <p className="text-xs text-gray-400 mt-1">{block.metadata?.src}</p>
            </div>
            {block.content && (
              <p className="text-sm text-gray-600 mt-2 italic text-center">{block.content}</p>
            )}
          </div>
        );

      case 'link':
        return (
          <div key={index} className="my-2">
            <a
              href={block.metadata?.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 underline"
            >
              <ExternalLink className="h-4 w-4" />
              <span>{block.content}</span>
            </a>
          </div>
        );

      case 'list':
        return (
          <div key={index} className="flex items-start space-x-2 my-1">
            <span className="text-blue-600 mt-1">•</span>
            <span className="text-gray-700">{block.content}</span>
          </div>
        );

      case 'code':
        return (
          <div key={index} className="my-4">
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="bg-gray-800 px-4 py-2 text-xs text-gray-300 flex items-center justify-between">
                <span>{block.metadata?.language || 'Code'}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(block.content)}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  Copia
                </button>
              </div>
              <pre className="p-4 text-sm text-gray-100 overflow-x-auto">
                <code>{block.content}</code>
              </pre>
            </div>
          </div>
        );

      case 'quote':
        return (
          <div key={index} className="my-3">
            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 text-gray-700 italic">
              {block.content}
            </blockquote>
          </div>
        );

      case 'text':
      default:
        return (
          <p key={index} className="text-gray-700 leading-relaxed my-2">
            {block.content}
          </p>
        );
    }
  };

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Content Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-900">Contenuto della Lezione</span>
        </div>
        <div className="text-xs text-gray-500">
          Progresso lettura: {Math.round(scrollProgress)}%
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        className="max-h-[600px] overflow-y-auto p-6"
        onScroll={handleScroll}
      >
        <div className="prose max-w-none">
          {parsedContent.length > 0 ? (
            parsedContent.map((block, index) => renderBlock(block, index))
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nessun contenuto disponibile</p>
              <p className="text-sm text-gray-400 mt-1">
                Il contenuto della lezione non è stato ancora configurato.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-3 border-t bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Progresso lettura</span>
          <span>{Math.round(scrollProgress)}% completato</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${scrollProgress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
