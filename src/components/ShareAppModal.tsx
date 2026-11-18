import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Share2,
  Smartphone,
  X,
} from 'lucide-react';
import { ApkStatusInfo, vibbaApi } from '../lib/api';

export const PUBLIC_APP_URL =
  'https://ais-pre-e26llcpt2qnnr6bgusbykt-386755117841.europe-west2.run.app';

function buildAndroidIntentUrl(targetUrl: string, browserPackage: string): string {
  try {
    const u = new URL(targetUrl);
    u.searchParams.set('instalar', '1');
    const pathAndQuery = `${u.pathname}${u.search}`;
    const fallback = encodeURIComponent(u.toString());
    return `intent://${u.host}${pathAndQuery}#Intent;scheme=https;package=${browserPackage};S.browser_fallback_url=${fallback};end`;
  } catch {
    return `${PUBLIC_APP_URL}/?instalar=1`;
  }
}

interface ShareAppModalProps {
  onClose: () => void;
  canInstallPwa: boolean;
  isInstalledPwa: boolean;
  isIOS?: boolean;
  isInIframe?: boolean;
  onInstallPwa: () => Promise<boolean>;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  onClose,
  canInstallPwa,
  isInstalledPwa,
  isIOS = false,
  isInIframe = false,
  onInstallPwa,
}) => {
  const [shortUrl, setShortUrl] = useState<string>('');
  const [activeShareUrl, setActiveShareUrl] = useState<string>(PUBLIC_APP_URL);
  const [apkStatus, setApkStatus] = useState<ApkStatusInfo | null>(null);
  const [loadingShort, setLoadingShort] = useState(true);
  const [copiedApp, setCopiedApp] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      vibbaApi.getAppLinks().catch(() => null),
      vibbaApi.getApkStatus().catch(() => null),
    ])
      .then(([linksInfo, apkInfo]) => {
        if (!active) return;
        if (linksInfo?.shortUrl) setShortUrl(linksInfo.shortUrl);
        if (linksInfo?.activeShareUrl) setActiveShareUrl(linksInfo.activeShareUrl);
        if (apkInfo) setApkStatus(apkInfo);
      })
      .finally(() => {
        if (active) setLoadingShort(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const installOriginUrl = apkStatus?.targetOrigin || PUBLIC_APP_URL;
  const samsungIntentHref = buildAndroidIntentUrl(
    installOriginUrl,
    'com.sec.android.app.sbrowser'
  );
  const edgeIntentHref = buildAndroidIntentUrl(
    installOriginUrl,
    'com.microsoft.emmx'
  );
  const chromeIntentHref = buildAndroidIntentUrl(
    installOriginUrl,
    'com.android.chrome'
  );

  const shareText = `Entra no Vibba! Vídeos, fotos, publicações e comentários por áudio, Messenger ao vivo, Grupos e Marketplace. Instala ou abre aqui: ${activeShareUrl}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleCopy = async (value: string, which: 'app' | 'full') => {
    try {
      await navigator.clipboard.writeText(value);
      if (which === 'app') {
        setCopiedApp(true);
        setTimeout(() => setCopiedApp(false), 2500);
      } else {
        setCopiedFull(true);
        setTimeout(() => setCopiedFull(false), 2500);
      }
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Vibba — Rede Social',
          text: 'Junta-te a mim no Vibba! Vídeos, fotos, áudio e Messenger ao vivo.',
          url: activeShareUrl,
        });
      } catch {
        // User cancelled share sheet
      }
    } else {
      await handleCopy(activeShareUrl, 'app');
    }
  };

  const handleInstallClick = async () => {
    setInstalling(true);
    setInstallFeedback(null);
    try {
      const ok = await onInstallPwa();
      if (ok) {
        setInstallFeedback('Vibba v8.0.0 instalado no ecrã inicial com sucesso!');
      } else if (isIOS) {
        setInstallFeedback(
          'No Safari (iPhone/iPad): toca no botão Partilhar (□↑) e escolhe "Adicionar ao ecrã inicial".'
        );
      } else if (isInIframe) {
        setInstallFeedback(
          'Estás dentro de uma pré-visualização. Usa um dos botões "Fora do Chrome" abaixo (Samsung Internet, Edge ou Chrome Nativo) para abrir e instalar no ecrã inicial.'
        );
      } else {
        setInstallFeedback(
          'Se o teu Chrome não mostrar "Instalar", toca no menu (⋮) e escolhe "Adicionar ao ecrã principal" — ou usa o botão Samsung Internet / Edge abaixo para instalar fora do Chrome.'
        );
      }
    } finally {
      setInstalling(false);
    }
  };

  const canDirectApkDownload = Boolean(
    apkStatus?.apkAvailable || apkStatus?.canAutoBuildApk
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#242526] border border-[#3E4042] shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-[#3E4042] flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-[#E4E6EB] flex items-center gap-2.5">
            <img
              src="/vibba-icon.png"
              alt="Vibba"
              className="w-8 h-8 rounded-lg object-contain shrink-0"
            />
            <span>Baixar Fora do Chrome & Partilhar</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 1. Baixar / Instalar Vibba Fora do Chrome */}
          <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[#45BD62]">
                1. Baixar Vibba Fora do Chrome
              </span>
              <span className="text-[11px] font-semibold text-[#B0B3B8]">
                v8.0.0 Standalone
              </span>
            </div>

            {isInstalledPwa ? (
              <div className="rounded-lg bg-[#31A24C]/20 border border-[#31A24C]/40 px-3.5 py-2.5 text-xs font-semibold text-[#45BD62] flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>
                  O Vibba está a correr em modo aplicativo independente (fora do Chrome)!
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {canDirectApkDownload && (
                  <a
                    href="/api/download-apk"
                    download="Vibba-v8.0.0.apk"
                    className="w-full min-h-[46px] px-4 rounded-xl bg-[#31A24C] hover:bg-[#2B9243] text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download size={18} />
                    <span>Baixar Ficheiro .APK Android (Fora do Chrome)</span>
                  </a>
                )}

                <button
                  type="button"
                  disabled={installing}
                  onClick={() => void handleInstallClick()}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
                >
                  <Smartphone size={18} />
                  <span>
                    {installing
                      ? 'A abrir instalador...'
                      : canInstallPwa
                      ? 'Instalar App no Telemóvel (Sem Barra do Chrome)'
                      : isIOS
                      ? 'Instalar no iPhone / iPad'
                      : 'Tentar Instalação Direta no Ecrã Inicial'}
                  </span>
                </button>
              </div>
            )}

            {installFeedback && (
              <p className="text-xs text-[#E4E6EB] bg-[#242526] border border-[#3E4042] rounded-lg px-3 py-2 leading-relaxed">
                {installFeedback}
              </p>
            )}

            {!isIOS && !isInstalledPwa && (
              <div className="pt-2.5 border-t border-[#3E4042]/70 space-y-2">
                <div className="text-[11px] font-bold text-[#E4E6EB] flex items-center gap-1.5">
                  <Compass size={14} className="text-[#4599FF]" />
                  <span>O teu Chrome não tem a opção &ldquo;Instalar&rdquo;? Abre fora do Chrome:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={samsungIntentHref}
                    className="min-h-[40px] px-3 rounded-lg bg-[#263951] hover:bg-[#314A68] border border-[#1877F2]/40 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 text-center"
                  >
                    <Download size={14} /> Samsung Internet
                  </a>
                  <a
                    href={edgeIntentHref}
                    className="min-h-[40px] px-3 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 text-center"
                  >
                    <Download size={14} /> Microsoft Edge
                  </a>
                </div>

                <a
                  href={chromeIntentHref}
                  className="w-full min-h-[38px] px-3 rounded-lg bg-[#242526] hover:bg-[#3A3B3C] border border-[#3E4042] text-[#E4E6EB] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={14} />
                  <span>Sair da janela interna → Abrir no navegador nativo</span>
                </a>

                <div className="rounded-lg bg-[#242526] border border-[#3E4042] p-2.5 text-[11px] text-[#B0B3B8] leading-relaxed space-y-1">
                  <p>
                    <strong className="text-white">Dica no telemóvel:</strong> Em muitos Android, quando não aparece &ldquo;Instalar&rdquo;, aparece como{' '}
                    <strong className="text-[#45BD62]">&ldquo;Adicionar ao ecrã principal&rdquo;</strong> no menu (<strong className="text-white">⋮</strong>) ou pelo ícone de descarga no <strong className="text-white">Samsung Internet</strong>.
                  </p>
                  {!canDirectApkDownload && (
                    <p className="text-[10px] text-[#B0B3B8]">
                      Sobre o <strong className="text-[#E4E6EB]">.APK direto</strong>: este link de pré-visualização (<span className="font-mono">ais-pre</span>) exige verificação do navegador, o que bloqueia geradores automáticos de APK. Ao publicar em domínio público (Deploy) ou quando o proprietário carregar o .APK oficial no Painel, o botão de descarga direta .APK aparece aqui automaticamente.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Share Short & Public HTTPS Links with Friends */}
          <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wide text-[#4599FF] inline-flex items-center gap-1.5">
                <Link2 size={14} />
                <span>2. Link curto HTTPS para enviar aos amigos</span>
              </div>
              {shortUrl && (
                <span className="px-2 py-0.5 rounded bg-[#31A24C]/20 text-[#45BD62] text-[10px] font-bold">
                  Ativo
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={loadingShort ? 'A preparar link curto...' : activeShareUrl}
                className="flex-1 h-10 rounded-lg bg-[#242526] border border-[#3E4042] px-3 text-xs font-mono font-semibold text-white focus:outline-none"
              />
              <button
                type="button"
                disabled={loadingShort}
                onClick={() => void handleCopy(activeShareUrl, 'app')}
                className="min-h-[40px] px-3.5 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 disabled:opacity-60"
              >
                {copiedApp ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedApp ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            {activeShareUrl !== PUBLIC_APP_URL && (
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#B0B3B8]">
                <span className="truncate">
                  Endereço completo: <span className="font-mono">{PUBLIC_APP_URL}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopy(PUBLIC_APP_URL, 'full')}
                  className="text-[#4599FF] hover:underline shrink-0 font-semibold"
                >
                  {copiedFull ? 'Copiado' : 'Copiar completo'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void handleNativeShare()}
                className="min-h-[40px] px-4 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] text-xs font-semibold inline-flex items-center justify-center gap-2"
              >
                <Share2 size={15} /> Partilhar agora
              </button>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] px-4 rounded-lg bg-[#31A24C] hover:bg-[#2B9243] text-white text-xs font-semibold inline-flex items-center justify-center gap-2"
              >
                <ExternalLink size={15} /> Enviar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
