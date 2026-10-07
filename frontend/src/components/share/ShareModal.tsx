import { useState } from "react";
import {
  X,
  Send,
  Copy,
  Check,
  Share2,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import type { Job } from "../types/job";

interface ShareModalProps {
  job: Job;
  sourceUrl?: string;
  onClose: () => void;
}

export function ShareModal({ job, sourceUrl, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = sourceUrl || window.location.href;
  const shareText = `💼 ${job.title}\n🏢 ${job.company}\n📍 ${job.location}\n💰 ${job.salary || "Negotiable"}\n\nVerified vacancy on 4KILLO:`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleTelegramShare = () => {
    const encodedText = encodeURIComponent(`${shareText}\n${shareUrl}`);
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(tgUrl);
    } else {
      window.open(tgUrl, "_blank", "noopener,noreferrer");
    }
    onClose();
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${job.title} - ${job.company}`,
          text: shareText,
          url: shareUrl,
        });
        onClose();
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Heavy frosted blur backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
      />

      {/* Glassmorphic Sheet/Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-t-[32px] sm:rounded-3xl border border-white/20 bg-white/85 p-6 shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 animate-in slide-in-from-bottom-8 duration-300">
        {/* Top Handle / Close */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 backdrop-blur-sm">
              <Share2 size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Share Position</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X size={17} />
          </button>
        </div>

        {/* Job Mini-Card Preview */}
        <div className="mt-4 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white/90 to-slate-50/70 p-4 shadow-xs backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                {job.category}
              </p>
              <h4 className="mt-0.5 text-sm font-bold text-slate-950 leading-snug">
                {job.title}
              </h4>
              <p className="text-xs font-medium text-slate-600 mt-0.5">
                {job.company} • 📍 {job.location}
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
              {job.salary || "Negotiable"}
            </span>
          </div>
        </div>

        {/* Share Channels Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {/* Telegram */}
          <button
            type="button"
            onClick={handleTelegramShare}
            className="flex items-center justify-center gap-2.5 rounded-2xl border border-sky-200/70 bg-gradient-to-r from-sky-50 to-sky-100/70 p-3.5 text-sky-800 shadow-xs backdrop-blur-sm transition active:scale-95 hover:border-sky-300"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/25">
              <Send size={18} className="-ml-0.5 mt-0.5" />
            </div>
            <span className="text-xs font-bold">Share to Telegram</span>
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-2.5 rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50 to-emerald-100/70 p-3.5 text-emerald-800 shadow-xs backdrop-blur-sm transition active:scale-95 hover:border-emerald-300"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
              <MessageCircle size={18} />
            </div>
            <span className="text-xs font-bold">Share to WhatsApp</span>
          </button>
        </div>

        {/* Copy Link Row */}
        <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2 pl-3.5 backdrop-blur-sm">
          <span className="truncate text-xs text-slate-500 font-mono">
            {shareUrl}
          </span>

          <button
            type="button"
            onClick={handleCopyLink}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs ${
              copied
                ? "bg-emerald-600 text-white"
                : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
            }`}
          >
            {copied ? (
              <>
                <Check size={14} /> Copied!
              </>
            ) : (
              <>
                <Copy size={14} /> Copy Link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
