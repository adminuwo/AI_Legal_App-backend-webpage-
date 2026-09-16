import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);

        // Check if error is due to a stale dynamic chunk after a new deployment
        const errMsg = error?.message || error?.toString() || '';
        const isChunkError = 
          errMsg.includes('Failed to fetch dynamically imported module') ||
          errMsg.includes('Importing a module script failed') ||
          errMsg.includes('dynamically imported module') ||
          error?.name === 'ChunkLoadError';

        if (isChunkError) {
          const reloadAttempted = sessionStorage.getItem('chunk_reload_attempted');
          if (!reloadAttempted) {
            sessionStorage.setItem('chunk_reload_attempted', 'true');
            console.warn('[ErrorBoundary] Stale chunk detected after deployment. Auto-reloading with new assets...');
            window.location.reload();
          }
        }
    }

    handleReload = () => {
      sessionStorage.removeItem('chunk_reload_attempted');
      window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            const errMsg = this.state.error?.message || this.state.error?.toString() || '';
            const isChunkError = 
              errMsg.includes('Failed to fetch dynamically imported module') ||
              errMsg.includes('Importing a module script failed') ||
              errMsg.includes('dynamically imported module') ||
              this.state.error?.name === 'ChunkLoadError';

            if (isChunkError) {
              return (
                <div className="min-h-screen flex items-center justify-center bg-[#070A12] p-6 text-white text-center font-sans">
                  <div className="bg-[#0F172A] p-8 sm:p-10 rounded-3xl shadow-2xl max-w-lg w-full border border-slate-800 space-y-5">
                    <div className="w-14 h-14 rounded-2xl bg-[#B88B2A]/15 text-[#B88B2A] flex items-center justify-center mx-auto border border-[#B88B2A]/30 text-2xl font-bold">
                      ⚖️
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                        New Version Available
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                        A new update was deployed to AI LEGAL™. Please reload to get the latest court models and workspaces.
                      </p>
                    </div>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={this.handleReload}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 text-[#111111] font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-[#B88B2A]/30 cursor-pointer"
                      >
                        Reload Application
                      </button>
                      <button
                        onClick={() => { window.location.href = '/dashboard'; }}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Dashboard
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
                    <div className="bg-white p-8 rounded-xl shadow-xl max-w-4xl w-full border border-red-200">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h1>
                        <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono text-gray-800">
                            <p className="font-bold mb-2">{this.state.error && this.state.error.toString()}</p>
                            <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

