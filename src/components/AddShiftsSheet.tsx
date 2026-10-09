import React, { useEffect, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { parseRotaText, ParsedShiftResult } from '../utils/rotaOcrParser';
import { DAY_NAMES } from '../utils/isoWeek';
import { SHIFT_META, formatHoursShort } from '../utils/shiftDisplay';
import { BottomSheet } from './BottomSheet';

interface AddShiftsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDetected: (shifts: ParsedShiftResult[]) => Promise<void>;
  onOpenPattern: () => void;
  /** Copies last week's shifts; resolves with number of days copied */
  onCopyLastWeek: () => Promise<number>;
}

type Mode = 'menu' | 'scanning' | 'review';

export const AddShiftsSheet: React.FC<AddShiftsSheetProps> = ({
  isOpen,
  onClose,
  onApplyDetected,
  onOpenPattern,
  onCopyLastWeek
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [scanStatus, setScanStatus] = useState('');
  const [detected, setDetected] = useState<ParsedShiftResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode('menu');
      setDetected([]);
      setMessage(null);
    }
  }, [isOpen]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Please choose an image (photo or screenshot).');
      return;
    }

    setMode('scanning');
    setMessage(null);
    const url = URL.createObjectURL(file);
    try {
      setScanStatus('Loading scanner…');
      const worker = await createWorker('eng');
      setScanStatus('Reading your rota…');
      const ret = await worker.recognize(url);
      await worker.terminate();

      const parsed = parseRotaText(ret.data.text || '');
      if (parsed.length === 0) {
        setMode('menu');
        setMessage("Couldn't find any days in that image. Try a clearer screenshot, or tap days on the main screen.");
      } else {
        setDetected(parsed);
        setMode('review');
      }
    } catch (err) {
      console.error('On-device OCR failed:', err);
      setMode('menu');
      setMessage('Scanning failed on this device. You can still tap days on the main screen.');
    } finally {
      URL.revokeObjectURL(url);
      setScanStatus('');
    }
  };

  const handleApply = async () => {
    setBusy(true);
    try {
      await onApplyDetected(detected);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const count = await onCopyLastWeek();
      if (count === 0) {
        setMessage('Nothing to copy — last week has no shifts.');
      } else {
        onClose();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'review' ? 'Check your shifts' : 'Add shifts';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {mode === 'menu' && (
        <div className="flex flex-col gap-2.5">
          {message && (
            <div className="bg-surface-container text-on-surface px-3 py-2.5 rounded-xl text-xs font-medium">{message}</div>
          )}

          <OptionCard
            emoji="📷"
            title="Scan rota screenshot"
            subtitle="Photo or screenshot of your rota."
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          />
          <OptionCard
            emoji="🔁"
            title="Repeat a weekly pattern"
            subtitle="E.g. Work Mon–Fri 9–5:30, every week automatically."
            onClick={onOpenPattern}
            disabled={busy}
          />
          <OptionCard
            emoji="📋"
            title="Copy last week"
            subtitle="Same shifts as last week. You can tweak days after."
            onClick={handleCopy}
            disabled={busy}
          />
        </div>
      )}

      {mode === 'scanning' && (
        <div className="py-10 flex flex-col items-center gap-3 text-center">
          <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-primary">{scanStatus}</span>
          <span className="text-xs text-outline">This can take a few seconds the first time.</span>
        </div>
      )}

      {mode === 'review' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-on-surface-variant -mt-2">
            Found {detected.length} day{detected.length === 1 ? '' : 's'}. Remove anything that looks wrong.
          </p>
          <div className="flex flex-col gap-1.5">
            {detected.map(s => {
              const meta = SHIFT_META[s.status];
              const hours = s.status === 'free' ? '' : formatHoursShort(s.hours);
              return (
                <div
                  key={s.dayKey}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-surface-container-low"
                >
                  <span className="text-sm font-bold text-on-surface w-24">{DAY_NAMES[s.dayKey]}</span>
                  <span className={`flex-1 text-xs font-bold px-2.5 py-1 rounded-full w-fit ${meta.pill}`}>
                    {meta.emoji} {meta.label}
                    {hours && <span className="font-medium opacity-80"> · {hours}</span>}
                  </span>
                  <button
                    onClick={() => setDetected(prev => prev.filter(p => p.dayKey !== s.dayKey))}
                    aria-label={`Remove ${DAY_NAMES[s.dayKey]}`}
                    className="w-8 h-8 rounded-full text-outline hover:text-error hover:bg-surface-container"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          <button
            onClick={handleApply}
            disabled={busy || detected.length === 0}
            className="w-full h-12 rounded-2xl bg-primary text-on-primary text-sm font-bold disabled:opacity-50 active:scale-[0.98]"
          >
            Add {detected.length} shift{detected.length === 1 ? '' : 's'} to my week
          </button>
          <button onClick={() => setMode('menu')} className="text-xs font-bold text-on-surface-variant">
            ‹ Back
          </button>
        </div>
      )}
    </BottomSheet>
  );
};

const OptionCard: React.FC<{
  emoji: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ emoji, title, subtitle, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-full text-left flex items-center gap-3.5 p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-surface-container transition-all active:scale-[0.98] disabled:opacity-50"
  >
    <span className="text-2xl w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center shrink-0">
      {emoji}
    </span>
    <span className="flex flex-col">
      <span className="font-headline font-bold text-sm text-on-surface">{title}</span>
      <span className="text-xs text-on-surface-variant">{subtitle}</span>
    </span>
  </button>
);
