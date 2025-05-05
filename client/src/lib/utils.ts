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

// Format a passage with highlighted words
export function formatPassageWithHighlights(passage: string, words: string[]): string {
  let formattedPassage = passage;
  
  // Sort words by length (descending) to prevent partial word matching issues
  const sortedWords = [...words].sort((a, b) => b.length - a.length);
  
  // Replace each word with a highlighted version
  sortedWords.forEach(word => {
    // Use word boundary to avoid partial matches
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    formattedPassage = formattedPassage.replace(regex, `<mark>${word}</mark>`);
  });
  
  return formattedPassage;
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
