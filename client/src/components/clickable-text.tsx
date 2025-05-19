import React, { useCallback } from 'react';

interface ClickableTextProps {
  text: string | undefined;
  selectedWords: string[];
  onWordSelect: (word: string) => void;
}

export function ClickableText({ text, selectedWords, onWordSelect }: ClickableTextProps) {
  // Split text into words, preserving spaces and punctuation
  const processText = useCallback(() => {
    // Handle empty or undefined text
    if (!text) return [];
    
    // Split by spaces, but keep spaces and punctuation
    const words = (text || '').split(/(\s+)/);
    
    return words.map((segment, index) => {
      // Skip empty segments
      if (!segment.trim()) return { text: segment, type: 'space', index };
      
      // Check if it's just a space or punctuation
      if (/^\s+$/.test(segment)) {
        return { text: segment, type: 'space', index };
      }
      
      // Get the core word without punctuation for selection
      const coreWord = segment.trim().replace(/[.,;:!?"'()[\]{}]/g, '');
      const isSelected = selectedWords.includes(coreWord);
      
      return { 
        text: segment, 
        type: 'word', 
        coreWord,
        isSelected,
        index 
      };
    });
  }, [text, selectedWords]);

  const handleWordClick = (word: string | undefined) => {
    if (word && !selectedWords.includes(word)) {
      onWordSelect(word);
    }
  };

  const segments = processText();

  return (
    <div className="clickable-text-container">
      {segments.map((segment, idx) => {
        if (segment.type === 'space') {
          return <span key={`space-${idx}`}>{segment.text}</span>;
        }
        
        return (
          <span 
            key={`word-${idx}`}
            className={`
              cursor-pointer px-0.5 rounded 
              ${segment.isSelected ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-muted/50'}
            `}
            onClick={() => handleWordClick(segment.coreWord)}
          >
            {segment.text}
          </span>
        );
      })}
    </div>
  );
}