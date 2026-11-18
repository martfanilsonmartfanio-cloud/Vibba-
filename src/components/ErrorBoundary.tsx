import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Erro inesperado na aplicação.',
    };
  }

  override componentDidCatch(_error: Error) {
    // Handled via fallback UI
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0714] text-[#F7F5FF] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#140E24] border border-[#2F2352] p-7 text-center space-y-4">
            <h1 className="font-display text-xl font-bold text-white">
              O Vibba precisou de recuperar
            </h1>
            <p className="text-sm text-[#B4A9D1]">
              Ocorreu uma falha momentânea no ecrã. Os teus dados locais continuam protegidos.
            </p>
            {this.state.message && (
              <p className="text-xs text-rose-300/90 bg-[#0D0818] border border-rose-400/30 rounded-xl p-3 break-words">
                {this.state.message}
              </p>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#140D24] font-bold text-sm inline-flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              <span>Recarregar Vibba</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
