import React, { useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Mobile-style bottom sheet. Tap the backdrop or press Escape to close.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative w-full max-w-md bg-surface-container-lowest rounded-t-[28px] shadow-modal px-5 pt-3 pb-safe max-h-[88vh] overflow-y-auto animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-outline-variant" />
        {title && (
          <div className="flex items-center justify-between mb-4">
            <div className="font-headline font-extrabold text-lg text-on-surface">{title}</div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container"
            >
              ✕
            </button>
          </div>
        )}
        <div className="pb-4">{children}</div>
      </div>
    </div>
  );
};
