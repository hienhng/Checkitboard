import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj instanceof Date && !isNaN(dateObj.getTime())
      ? new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).format(dateObj)
      : 'N/A';
  } catch {
    return 'N/A';
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj instanceof Date && !isNaN(dateObj.getTime())
      ? new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        }).format(dateObj)
      : 'N/A';
  } catch {
    return 'N/A';
  }
}

export function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'text-gray-500';
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

export function getScoreBgColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'bg-gray-100 text-gray-500';
  if (score >= 90) return 'bg-green-100 text-green-800';
  if (score >= 70) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

// Extract highlighted words from a passage with highlights using <mark> tags
export function extractHighlightedWords(html: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const marks = doc.querySelectorAll('mark');
  return Array.from(marks).map(mark => mark.textContent || '').filter(Boolean);
}

// Format a passage with highlighted words and wrap all words in clickable spans
export function formatPassageWithHighlights(passage: string, words: string[]): string {
  // Sort words by length (descending) to prevent partial word matching issues
  const sortedWords = [...words].sort((a, b) => b.length - a.length);
  
  // First, highlight the selected words
  let formattedPassage = passage;
  sortedWords.forEach(word => {
    // Use word boundary to avoid partial matches
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    formattedPassage = formattedPassage.replace(regex, `<mark>${word}</mark>`);
  });
  
  // Now wrap each regular word (non-mark) in a span for click interaction
  // Split the passage by spaces but keep the HTML intact
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = formattedPassage;
  
  // Process each text node in the div
  const textNodes: Node[] = [];
  
  // Find all text nodes in the document
  const findTextNodes = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Only add text nodes that have content and aren't already inside mark elements
      if (node.textContent && node.textContent.trim() && 
          node.parentElement && node.parentElement.nodeName !== 'MARK') {
        textNodes.push(node);
      }
    } else {
      // Recursively process child nodes
      node.childNodes.forEach(child => findTextNodes(child));
    }
  };
  
  // Process all nodes to find text nodes
  findTextNodes(tempDiv);
  
  // For each text node, wrap words in spans
  textNodes.forEach(textNode => {
    if (!textNode.textContent || textNode.parentNode?.nodeName === 'MARK') return;
    
    const words = textNode.textContent.split(/\s+/);
    const fragment = document.createDocumentFragment();
    
    words.forEach((word, i) => {
      if (!word) return; // Skip empty strings
      
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = word;
      
      fragment.appendChild(span);
      
      // Add space after each word except the last one
      if (i < words.length - 1) {
        fragment.appendChild(document.createTextNode(' '));
      }
    });
    
    textNode.parentNode?.replaceChild(fragment, textNode);
  });
  
  return tempDiv.innerHTML;
}

// Function to safely set innerHTML content
export function createMarkup(html: string) {
  return { __html: html };
}

// Format due date with relative time
export function formatDueDate(date: Date | string | null | undefined): string {
  if (!date) return 'No due date';
  
  try {
    const dueDate = typeof date === 'string' ? new Date(date) : date;
    if (!(dueDate instanceof Date) || isNaN(dueDate.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Past due';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 7) return `Due in ${diffDays} days`;
    
    return `Due on ${formatDate(dueDate)}`;
  } catch {
    return 'Invalid date';
  }
}
