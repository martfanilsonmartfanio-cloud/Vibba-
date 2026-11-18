import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) return;
    }
    setShowGuide(true);
  };

  return (
    <>
      {variant === 'card' ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1D1533] hover:bg-[#281D46] border border-amber-400/40 text-amber-200 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Download size={16} className="text-amber-400 shrink-0" />
          <span>Baixar / Instalar App Vibba</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#1D1533] hover:bg-[#281D46] border border-amber-400/40 text-amber-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        >
          <Download size={15} className="text-amber-400 shrink-0" />
          <span>Instalar App</span>
        </button>
      )}

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-[#17102B] border border-[#352659] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/35 flex items-center justify-center">
                  <Smartphone size={18} className="text-amber-300" />
                </div>
                <h3
                  id="pwa-install-title"
                  className="font-display text-lg font-bold text-white"
                >
                  Instalar o App Vibba
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Fechar instruções"
                className="min-h-[40px] min-w-[40px] rounded-xl text-[#A598C7] hover:text-white hover:bg-[#23193F] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-2.5 text-sm text-[#CEC4E8] leading-relaxed">
                <p>No iPhone ou iPad (Safari):</p>
                <p>
                  1. Toca no botão <strong className="text-white inline-flex items-center gap-1"><Share size={14} /> Partilhar</strong> na barra inferior do Safari.
                </p>
                <p>
                  2. Desce e selecciona <strong className="text-white">Adicionar ao ecrã principal</strong> (Add to Home Screen).
                </p>
                <p>
                  3. Toca em <strong className="text-amber-300">Adicionar</strong> — o ícone do Vibba fica instalado no teu telemóvel!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 text-sm text-[#CEC4E8] leading-relaxed">
                <p>No Android (Chrome) ou computador:</p>
                <p>
                  1. Abre este link directamente no navegador (fora de pré-visualizações embutidas).
                </p>
                <p>
                  2. Toca no menu <strong className="text-white">⋮</strong> do Chrome e selecciona <strong className="text-white">Instalar aplicação</strong> ou <strong className="text-white">Adicionar ao ecrã principal</strong>.
                </p>
                <p>
                  3. O Vibba será instalado como aplicativo no teu dispositivo, grátis e sem precisar da Play Store.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-amber-400 hover:bg-amber-300 text-[#140D24] font-bold text-sm transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
