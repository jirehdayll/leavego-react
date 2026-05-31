import React from 'react';
import { AlertTriangle, CheckCircle2, Archive, X } from 'lucide-react';

/**
 * Confirmation Modal Component
 * Used for confirming actions like archive, decline, approve, etc.
 */
export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'warning' | 'danger' | 'info' | 'success'
  isLoading = false,
  showCommentInput = false
}) {
  const [comment, setComment] = React.useState('');

  if (!isOpen) return null;

  const typeConfig = {
    warning: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      icon: AlertTriangle,
      confirmBg: 'bg-amber-600 hover:bg-amber-700'
    },
    danger: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: AlertTriangle,
      confirmBg: 'bg-red-600 hover:bg-red-700'
    },
    info: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      icon: AlertTriangle,
      confirmBg: 'bg-blue-600 hover:bg-blue-700'
    },
    success: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      icon: CheckCircle2,
      confirmBg: 'bg-emerald-600 hover:bg-emerald-700'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        {/* Header with icon */}
        <div className={`${config.bg} px-7 py-6 flex items-center gap-4`}>
          <div className={`w-12 h-12 ${config.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${config.text}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-white/50 hover:bg-white rounded-full flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-7">
          <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
          
          {showCommentInput && (
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Add a Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="3"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all shadow-sm resize-none"
                placeholder="Enter your comment here..."
              />
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={() => onConfirm(showCommentInput ? { comment } : undefined)}
              disabled={isLoading}
              className={`flex-1 px-4 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50 ${config.confirmBg}`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}