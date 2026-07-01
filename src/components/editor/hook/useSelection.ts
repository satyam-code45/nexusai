import { useState, useEffect, useCallback } from 'react';
import { Coordinates } from '../types/editor.types';


export const useSelection = (editorRef: React.RefObject<HTMLDivElement>) => {
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [isSelectionActive, setIsSelectionActive] = useState(false);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();

    // 1. Basic validation: ensure selection exists and is within our editor
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setIsSelectionActive(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const editorElement = editorRef.current;

    if (editorElement && !editorElement.contains(range.commonAncestorContainer)) {
      setIsSelectionActive(false);
      return;
    }

    // 2. Capture the bounding rectangle of the selection
    const rect = range.getBoundingClientRect();
    
    // Check if the selection is visible/valid
    if (rect.width > 0 && rect.height > 0) {
      setSelectionRect(rect);
      setIsSelectionActive(true);
    } else {
      setIsSelectionActive(false);
    }
  }, [editorRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    // Debounce resize handling could be added here
    window.addEventListener('resize', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('resize', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return { selectionRect, isSelectionActive };
};

/**
 * Helper to calculate absolute top/left coordinates 
 * relative to the viewport for the floating menu
 */
export const getMenuPosition = (rect: DOMRect | null, menuWidth: number = 200): Coordinates => {
  if (!rect) return { top: -9999, left: -9999 };

  // Center horizontally over the selection
  const left = rect.left + (rect.width / 2) - (menuWidth / 2);
  
  // Position "above" the selection with a small gap (10px)
  const top = rect.top - 10; 

  return { top: top + window.scrollY, left: left + window.scrollX };
};