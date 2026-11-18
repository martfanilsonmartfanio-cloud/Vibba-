import React, { useState } from 'react';
import {
  AlertTriangle,
  Copyright,
  EyeOff,
  Scale,
  ShieldCheck,
  Volume2,
  X,
} from 'lucide-react';

interface LegalRulesModalProps {
  initialTab?: 'rules' | 'legal';
  onClose: () => void;
}

export const LegalRulesModal: React.FC<LegalRulesModalProps> = ({
  initialTab = 'rules',
  onClose,
}) => {
  const [tab, setTab] = useState<'rules' | 'legal'>(initialTab);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Regras do Vibba e Aviso Legal"
    >
      <div className="w-full max-w-2xl max-h-[88vh] rounded-2xl bg-[#242526] border border-[#3E4042] shadow-2xl flex flex-col overflow-hidden text-[#E4E6EB]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#3E4042] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#1877F2]/20 text-[#4599FF] flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-display font-bold text-white truncate">
                Regras da Comunidade &amp; Aviso Legal
              </h2>
              <p className="text-[11px] text-[#B0B3B8]">
                Vibba Angola · Projeto seguro, justo e sem dinheiro real
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] flex items-center justify-center shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 pb-2 border-b border-[#3E4042] flex gap-2">
          <button
            type="button"
            onClick={() => setTab('rules')}
            className={`min-h-[38px] px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
              tab === 'rules'
                ? 'bg-[#1877F2] text-white'
                : 'bg-[#18191A] text-[#B0B3B8] hover:text-white border border-[#3E4042]'
            }`}
          >
            <Volume2 size={14} /> Regras do Vibba
          </button>
          <button
            type="button"
            onClick={() => setTab('legal')}
            className={`min-h-[38px] px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
              tab === 'legal'
                ? 'bg-[#1877F2] text-white'
                : 'bg-[#18191A] text-[#B0B3B8] hover:text-white border border-[#3E4042]'
            }`}
          >
            <Scale size={14} /> Aviso Legal (Versão de Teste)
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-3.5 text-xs sm:text-sm leading-relaxed">
          {tab === 'rules' ? (
            <>
              <div className="rounded-xl bg-[#1877F2]/12 border border-[#1877F2]/35 p-3.5 text-xs text-[#E4E6EB]">
                O Vibba foi feito para a juventude angolana partilhar a sua{' '}
                <strong>própria voz</strong>, histórias, freestyle e boa energia com segurança.
              </div>

              <div className="space-y-2.5">
                <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5 flex items-start gap-3">
                  <Copyright size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white text-xs sm:text-sm">
                      1. Só a tua própria voz — Zero MP3 comercial de terceiros
                    </h3>
                    <p className="text-xs text-[#B0B3B8] mt-0.5">
                      Publica apenas áudios gravados por ti, beats livres ou conteúdos originais. É proibido publicar músicas comerciais completas ou faixas protegidas por direitos de autor de outros artistas.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white text-xs sm:text-sm">
                      2. Respeito obrigatório — Zero bullying ou ameaças
                    </h3>
                    <p className="text-xs text-[#B0B3B8] mt-0.5">
                      Não são permitidos insultos graves, humilhações, discurso de ódio ou ameaças a nenhum membro da comunidade.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5 flex items-start gap-3">
                  <EyeOff size={18} className="text-[#45BD62] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white text-xs sm:text-sm">
                      3. Protege a privacidade — Nunca exponhas dados reais
                    </h3>
                    <p className="text-xs text-[#B0B3B8] mt-0.5">
                      É proibido divulgar nomes reais, moradas, números de telefone, áudios ou imagens privadas de outras pessoas sem autorização.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5 flex items-start gap-3">
                  <ShieldCheck size={18} className="text-[#4599FF] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white text-xs sm:text-sm">
                      4. Zero burlas, dinheiro real ou promessas de prémios
                    </h3>
                    <p className="text-xs text-[#B0B3B8] mt-0.5">
                      O Vibba não tem moedas pagas, não paga Kwanzas e não permite vendas ou esquemas enganosos. Quem tentar enganar utilizadores pedindo transferências será suspenso.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5 flex items-start gap-3">
                  <Scale size={18} className="text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white text-xs sm:text-sm">
                      5. Sem conteúdo +18 e jogo limpo no Ranking
                    </h3>
                    <p className="text-xs text-[#B0B3B8] mt-0.5">
                      É proibido conteúdo sexual explícito ou violência extrema. Além disso, o ranking tem limite diário justo de pontos para impedir spam e manter a competição saudável.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3 text-xs text-[#E4E6EB]">
              <div className="rounded-xl bg-amber-500/12 border border-amber-500/35 p-3.5 space-y-1">
                <div className="font-bold text-amber-200">
                  Projeto Experimental (Versão de Teste)
                </div>
                <p className="text-[#E4E6EB]/90">
                  O Vibba é uma rede social comunitária gratuita em desenvolvimento. Funcionalidades podem ser atualizadas ou ajustadas a qualquer momento para melhorar a segurança e a estabilidade.
                </p>
              </div>

              <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5 space-y-1.5">
                <h3 className="font-bold text-white">
                  1. Sem dinheiro real, sem Coins e sem saques
                </h3>
                <p className="text-[#B0B3B8]">
                  Os <strong>Vibba Points</strong>, Níveis (1 a 150) e Medalhas servem apenas para diversão e reconhecimento comunitário dentro da app. Não têm valor monetário, não dão direito a pagamentos em Kwanzas e não podem ser comprados ou levantados.
                </p>
              </div>

              <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5 space-y-1.5">
                <h3 className="font-bold text-white">
                  2. Responsabilidade pelo conteúdo publicado
                </h3>
                <p className="text-[#B0B3B8]">
                  Cada utilizador é integralmente responsável pelos áudios, textos, fotos, vídeos e comentários que publica. A moderação atua mediante denúncias através do botão <strong>Denunciar</strong> presente em cada publicação.
                </p>
              </div>

              <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5 space-y-1.5">
                <h3 className="font-bold text-white">
                  3. Direitos de Autor &amp; Remoção Rápida
                </h3>
                <p className="text-[#B0B3B8]">
                  Se identificares qualquer áudio ou vídeo que viole direitos de autor de terceiros, usa o ícone de bandeira (<strong>Denunciar</strong>) na publicação para notificar a moderação e permitir a remoção imediata.
                </p>
              </div>

              <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3.5 space-y-1.5">
                <h3 className="font-bold text-white">
                  4. Privacidade e Anonimato
                </h3>
                <p className="text-[#B0B3B8]">
                  No Modo Anónimo Seguro, o Vibba não exige o teu nome real, número de telefone nem data de nascimento exata. Escolhe um apelido e guarda a tua Pergunta Secreta para recuperares a tua conta caso esqueças a palavra-passe.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#3E4042] bg-[#18191A] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
