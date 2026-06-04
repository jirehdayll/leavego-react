import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[LeaveGo ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc] via-white to-slate-50 p-6 font-sans">
          <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-100">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Application Crashed</h1>
            <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">
              LeaveGo encountered an unexpected error on this page. We've captured the technical trace below.
            </p>

            {/* Error Message */}
            <div className="mt-6 text-left bg-slate-50 rounded-2xl p-5 border border-slate-100 overflow-x-auto max-h-60 max-w-full">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Error Log</p>
              <p className="text-sm font-semibold text-slate-700 font-mono break-words leading-relaxed">
                {this.state.error?.toString() || 'Unknown runtime error'}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[10px] text-slate-500 font-mono mt-3 leading-relaxed whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            {/* Navigation Actions */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/10"
              >
                <Home className="w-4 h-4" />
                Go to Home
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
