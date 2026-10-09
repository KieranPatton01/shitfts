import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({ isOpen, onClose }) => {
  const { couple, createSpace, joinSpace } = useAuth();
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const inviteCode = couple?.inviteCode || 'SHFT-SYNC';
  const inviteLink = `${window.location.origin}/join/${inviteCode.replace('SHFT-', '')}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCodeInput.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await joinSpace(partnerCodeInput);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to join space. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      await createSpace();
    } catch (err: any) {
      setError(err.message || 'Failed to create new space.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-sm bg-surface-container-lowest rounded-3xl p-6 shadow-modal border border-surface-container flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">
              group_add
            </span>
            <div className="flex flex-col">
              <h3 className="font-headline font-extrabold text-base text-on-surface">
                Shared Space Link
              </h3>
              <span className="text-[11px] text-on-surface-variant">
                Sync schedules in real-time
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container px-3 py-2 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Section 1: My Invite Code & Link */}
        <div className="flex flex-col gap-2.5 bg-surface-container-low p-4 rounded-2xl border border-surface-container">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">
              Your Shareable Code:
            </span>
            <span className="font-headline font-extrabold text-sm text-primary tracking-wider font-mono">
              {inviteCode}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full h-11 rounded-xl bg-surface-container-lowest border border-surface-container hover:bg-surface-container text-xs font-bold text-on-surface flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Partner Invite Link'}</span>
          </button>
        </div>

        {/* Section 2: Enter Partner's Code */}
        <form onSubmit={handleJoin} className="flex flex-col gap-2.5">
          <label className="text-xs font-bold text-on-surface-variant">
            Or Enter Partner's 6-Char Code:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={partnerCodeInput}
              onChange={(e) => setPartnerCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. 7X2P or SHFT-7X2P"
              maxLength={10}
              className="flex-1 h-11 px-3.5 bg-surface-container-low border border-surface-container rounded-xl text-xs font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={loading || !partnerCodeInput.trim()}
              className="h-11 px-4 bg-primary text-on-primary font-headline font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 hover:bg-primary-container active:scale-95 transition-all"
            >
              {loading ? 'Joining...' : 'Link'}
            </button>
          </div>
        </form>

        {/* Generate New Space Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            className="text-[11px] font-bold text-on-surface-variant hover:text-primary transition-colors underline"
          >
            Create a fresh shared space
          </button>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-center text-outline leading-tight">
          Once paired, your shifts will sync asynchronously and compute mutual Golden Windows instantly.
        </p>
      </div>
    </div>
  );
};
