import React, { useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Download,
  Eye,
  EyeOff,
  Film,
  KeyRound,
  LogIn,
  MessageCircle,
  Mic,
  Scale,
  Share2,
  ShieldCheck,
  ShoppingBag,
  UserPlus,
} from 'lucide-react';
import { UserProfile } from '../types/vibba';
import { vibbaApi, setStoredToken } from '../lib/api';
import { APP_VERSION } from '../data/initialData';
import { LegalRulesModal } from './LegalRulesModal';

interface AuthViewProps {
  onAuthenticated: (user: UserProfile, token: string) => void;
  onOpenShareModal: () => void;
  onDownloadApp: () => void;
  isInstalledPwa?: boolean;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onAuthenticated,
  onOpenShareModal,
  onDownloadApp,
  isInstalledPwa = false,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [ageGroup, setAgeGroup] = useState<'teen' | 'adult' | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('Luanda, Angola');
  const [bio, setBio] = useState('');
  const [regRecoveryQuestion, setRegRecoveryQuestion] = useState(
    'Qual é a tua palavra secreta de recuperação?'
  );
  const [regRecoveryAnswer, setRegRecoveryAnswer] = useState('');
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'rules' | 'legal' | null>(null);

  // Recovery flow state
  const [recoverStep, setRecoverStep] = useState<'lookup' | 'verify'>('lookup');
  const [recoverIdentifier, setRecoverIdentifier] = useState('');
  const [recoverInfo, setRecoverInfo] = useState<{
    maskedEmail: string;
    mode: 'security_question' | 'identity_verify';
    recoveryQuestion: string;
    hasActiveCode: boolean;
  } | null>(null);
  const [useResetCode, setUseResetCode] = useState(false);
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState('');
  const [handleCheck, setHandleCheck] = useState('');
  const [nameCheck, setNameCheck] = useState('');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newRecoveryQuestion, setNewRecoveryQuestion] = useState('');
  const [newRecoveryAnswer, setNewRecoveryAnswer] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openRecovery = () => {
    setMode('recover');
    setRecoverStep('lookup');
    setRecoverInfo(null);
    setRecoverIdentifier(email.trim());
    setUseResetCode(false);
    setRecoveryAnswerInput('');
    setHandleCheck('');
    setNameCheck('');
    setResetCodeInput('');
    setNewPassword('');
    setConfirmNewPassword('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (mode === 'register') {
      if (!ageGroup) {
        setError('Selecciona a tua faixa etária (13–17 anos ou +18 anos).');
        return;
      }
      if (!acceptedRules) {
        setError(
          'Tens de aceitar as Regras do Vibba e o Aviso Legal antes de criar conta.'
        );
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await vibbaApi.login({ email: email.trim(), password });
        setStoredToken(res.token);
        onAuthenticated(res.user, res.token);
      } else if (mode === 'register') {
        const res = await vibbaApi.register({
          name: name.trim(),
          handle: handle.trim(),
          ageGroup: ageGroup as 'teen' | 'adult',
          acceptedRules,
          email: email.trim() || undefined,
          password,
          location: location.trim() || 'Angola',
          bio: bio.trim(),
          recoveryQuestion: regRecoveryAnswer.trim()
            ? regRecoveryQuestion.trim()
            : undefined,
          recoveryAnswer: regRecoveryAnswer.trim() || undefined,
        });
        setStoredToken(res.token);
        onAuthenticated(res.user, res.token);
      } else if (recoverStep === 'lookup') {
        const info = await vibbaApi.forgotPassword(recoverIdentifier.trim());
        setRecoverInfo(info);
        setUseResetCode(info.hasActiveCode);
        setRecoverStep('verify');
      } else {
        if (newPassword.length < 6) {
          throw new Error('A nova palavra-passe deve ter pelo menos 6 caracteres.');
        }
        if (newPassword !== confirmNewPassword) {
          throw new Error('As duas novas palavras-passe não coincidem.');
        }
        const res = await vibbaApi.resetPassword({
          identifier: recoverIdentifier.trim(),
          recoveryAnswer: useResetCode ? undefined : recoveryAnswerInput.trim(),
          handleCheck: useResetCode ? undefined : handleCheck.trim(),
          nameCheck: useResetCode ? undefined : nameCheck.trim(),
          resetCode: useResetCode ? resetCodeInput.trim() : undefined,
          newPassword,
          newRecoveryQuestion: newRecoveryAnswer.trim()
            ? newRecoveryQuestion.trim() || 'Palavra secreta de recuperação'
            : undefined,
          newRecoveryAnswer: newRecoveryAnswer.trim() || undefined,
        });
        setStoredToken(res.token);
        onAuthenticated(res.user, res.token);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível concluir o acesso.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#18191A] text-[#E4E6EB] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Facebook-style brand pitch */}
        <div className="lg:col-span-6 space-y-5">
          <div className="flex items-center gap-3.5">
            <img
              src="/vibba-icon.png"
              alt="Vibba"
              className="w-16 h-16 rounded-2xl object-contain shadow-lg shrink-0"
            />
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight bg-gradient-to-r from-[#7C3AED] via-[#C026D3] to-[#EC4899] bg-clip-text text-transparent">
                Vibba
              </h1>
              <p className="text-xs text-[#B0B3B8]">
                Rede Social de Voz &amp; Comunidade · v{APP_VERSION}
              </p>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-display font-bold leading-tight text-white">
            A tua voz em primeiro lugar: partilha áudios, freestyle, histórias e
            liga-te à comunidade em Angola sem precisar de expor dados pessoais.
          </h2>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-3.5 space-y-1">
              <Mic size={18} className="text-[#F7B928]" />
              <div className="text-sm font-semibold text-white">Áudio &amp; Voz</div>
              <p className="text-xs text-[#B0B3B8]">
                Freestyle, desabafos e histórias só com a tua voz
              </p>
            </div>
            <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-3.5 space-y-1">
              <ShieldCheck size={18} className="text-[#45BD62]" />
              <div className="text-sm font-semibold text-white">Privacidade Total</div>
              <p className="text-xs text-[#B0B3B8]">
                Entra só com apelido e @utilizador, sem número nem data exata
              </p>
            </div>
            <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-3.5 space-y-1">
              <MessageCircle size={18} className="text-[#4599FF]" />
              <div className="text-sm font-semibold text-white">Messenger Ao Vivo</div>
              <p className="text-xs text-[#B0B3B8]">Chat instantâneo em tempo real</p>
            </div>
            <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-3.5 space-y-1">
              <Film size={18} className="text-[#F3425F]" />
              <div className="text-sm font-semibold text-white">100% Gratuito</div>
              <p className="text-xs text-[#B0B3B8]">
                Sem moedas pagas nem dinheiro real. Diversão justa
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isInstalledPwa && (
              <button
                type="button"
                onClick={onDownloadApp}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 rounded-xl bg-[#31A24C] hover:bg-[#2B9243] text-xs font-bold text-white shadow-sm"
              >
                <Download size={15} /> Baixar App (Fora do Chrome)
              </button>
            )}
            <button
              type="button"
              onClick={onOpenShareModal}
              className="inline-flex items-center gap-2 min-h-[42px] px-4 rounded-xl bg-[#242526] hover:bg-[#3A3B3C] border border-[#3E4042] text-xs font-semibold text-[#4599FF]"
            >
              <Share2 size={15} /> Partilhar Link com Amigos
            </button>
            <button
              type="button"
              onClick={() => setLegalModalTab('rules')}
              className="inline-flex items-center gap-2 min-h-[42px] px-4 rounded-xl bg-[#242526] hover:bg-[#3A3B3C] border border-[#3E4042] text-xs font-semibold text-[#E4E6EB]"
            >
              <Scale size={15} className="text-amber-400" /> Regras &amp; Aviso Legal
            </button>
          </div>
        </div>

        {/* Right: Auth Card */}
        <div className="lg:col-span-6">
          <div className="rounded-2xl bg-[#242526] border border-[#3E4042] p-6 sm:p-8 shadow-2xl space-y-5">
            {mode !== 'recover' ? (
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#18191A] border border-[#3E4042]">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`min-h-[42px] rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                    mode === 'login'
                      ? 'bg-[#1877F2] text-white'
                      : 'text-[#B0B3B8] hover:text-white'
                  }`}
                >
                  <LogIn size={16} /> Iniciar sessão
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`min-h-[42px] rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                    mode === 'register'
                      ? 'bg-[#42B72A] text-white'
                      : 'text-[#B0B3B8] hover:text-white'
                  }`}
                >
                  <UserPlus size={16} /> Criar Conta
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#3E4042]">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-[#4599FF]" />
                  <h3 className="text-base font-bold text-white">
                    Recuperar Palavra-passe
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-xs font-semibold text-[#4599FF] hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <>
                  <div className="rounded-xl bg-[#31A24C]/12 border border-[#31A24C]/35 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-[#E4E6EB]">
                    <ShieldCheck size={16} className="text-[#45BD62] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Modo Anónimo Seguro:</strong> Não precisas de pôr o teu nome real, telefone nem data de nascimento exata.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#B0B3B8] mb-1">
                        Apelido público
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Mano_Voz99 (evita nome real)"
                        className="w-full h-11 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3.5 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#B0B3B8] mb-1">
                        @utilizador
                      </label>
                      <input
                        type="text"
                        required
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        placeholder="ex: manovoz99"
                        className="w-full h-11 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3.5 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                      />
                    </div>
                  </div>

                  {/* Age Group Selector (No exact birthDate saved) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#B0B3B8]">
                      Faixa etária (sem guardar data de nascimento)
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setAgeGroup('teen')}
                        className={`min-h-[42px] px-3 rounded-lg border text-xs font-semibold transition-colors ${
                          ageGroup === 'teen'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-[#3A3B3C] border-[#4E4F50] text-[#E4E6EB] hover:bg-[#4E4F50]'
                        }`}
                      >
                        13 a 17 anos
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgeGroup('adult')}
                        className={`min-h-[42px] px-3 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                          ageGroup === 'adult'
                            ? 'bg-[#1877F2]/25 border-[#1877F2] text-[#8BC0FF]'
                            : 'bg-[#3A3B3C] border-[#4E4F50] text-[#E4E6EB] hover:bg-[#4E4F50]'
                        }`}
                      >
                        <Briefcase size={13} /> Maior de 18 anos (+18)
                      </button>
                    </div>
                    {ageGroup && (
                      <p className="text-[11px] text-[#B0B3B8]">
                        {ageGroup === 'adult'
                          ? 'Conta +18: poderás ativar o Modo Profissional no teu perfil.'
                          : 'Conta jovem (13–17): segura para publicar áudios e histórias.'}
                      </p>
                    )}
                  </div>
                </>
              )}

              {mode !== 'recover' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#B0B3B8] mb-1">
                      {mode === 'login'
                        ? '@utilizador ou e-mail'
                        : 'E-mail (opcional — só se quiseres)'}
                    </label>
                    <input
                      type={mode === 'login' ? 'text' : 'email'}
                      required={mode === 'login'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        mode === 'login'
                          ? '@utilizador ou teu@email.com'
                          : 'Opcional — deixa vazio para 100% anónimo'
                      }
                      className="w-full h-11 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3.5 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[#B0B3B8]">
                        Palavra-passe
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={openRecovery}
                          className="text-xs font-semibold text-[#4599FF] hover:underline"
                        >
                          Esqueceu-se da palavra-passe?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full h-11 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] pl-3.5 pr-11 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword
                            ? 'Ocultar palavra-passe'
                            : 'Ver palavra-passe'
                        }
                        title={
                          showPassword
                            ? 'Ocultar palavra-passe'
                            : 'Ver palavra-passe'
                        }
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md text-[#B0B3B8] hover:text-white hover:bg-[#4E4F50]/60 flex items-center justify-center transition-colors"
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#B0B3B8] mb-1">
                      Cidade / Província
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Luanda, Angola"
                      className="w-full h-11 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3.5 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#B0B3B8] mb-1">
                      Bio (opcional)
                    </label>
                    <input
                      type="text"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Conta um pouco sobre ti..."
                      className="w-full h-11 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3.5 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                    />
                  </div>
                  <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E4E6EB]">
                      <ShieldCheck size={14} className="text-[#45BD62]" />
                      Pergunta de recuperação (recomendada para contas anónimas)
                    </div>
                    <input
                      type="text"
                      value={regRecoveryQuestion}
                      onChange={(e) => setRegRecoveryQuestion(e.target.value)}
                      placeholder="Pergunta secreta (ex: Nome do primeiro amigo)"
                      className="w-full h-10 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3 text-xs text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                    />
                    <input
                      type="text"
                      value={regRecoveryAnswer}
                      onChange={(e) => setRegRecoveryAnswer(e.target.value)}
                      placeholder="Palavra ou resposta secreta para recuperar a conta"
                      className="w-full h-10 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3 text-xs text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 rounded-xl bg-[#18191A] border border-[#3E4042] p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedRules}
                      onChange={(e) => setAcceptedRules(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-[#42B72A] shrink-0"
                    />
                    <span className="text-xs text-[#E4E6EB] leading-snug">
                      Li e aceito as{' '}
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.preventDefault();
                          setLegalModalTab('rules');
                        }}
                        className="text-[#4599FF] font-semibold hover:underline"
                      >
                        Regras do Vibba
                      </button>{' '}
                      e o{' '}
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.preventDefault();
                          setLegalModalTab('legal');
                        }}
                        className="text-[#4599FF] font-semibold hover:underline"
                      >
                        Aviso Legal (versão de teste, sem dinheiro real)
                      </button>
                      .
                    </span>
                  </label>
                </>
              )}

              {mode === 'recover' && recoverStep === 'lookup' && (
                <div className="space-y-3">
                  <p className="text-xs text-[#B0B3B8] leading-relaxed">
                    Indica o teu e-mail ou <span className="text-white">@utilizador</span> para localizar a tua conta e definir uma nova palavra-passe.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-[#B0B3B8] mb-1">
                      E-mail ou @utilizador
                    </label>
                    <input
                      type="text"
                      required
                      value={recoverIdentifier}
                      onChange={(e) => setRecoverIdentifier(e.target.value)}
                      placeholder="teu@email.com ou @utilizador"
                      className="w-full h-11 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3.5 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                    />
                  </div>
                </div>
              )}

              {mode === 'recover' && recoverStep === 'verify' && recoverInfo && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3 text-xs space-y-1">
                    <div className="text-[#B0B3B8]">
                      Conta encontrada:{' '}
                      <span className="font-semibold text-white">
                        {recoverInfo.maskedEmail}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[#4599FF] font-semibold">
                        {useResetCode
                          ? 'Modo: Código de 6 dígitos'
                          : recoverInfo.mode === 'security_question'
                          ? 'Modo: Pergunta secreta'
                          : 'Modo: Confirmação de identidade'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setUseResetCode((prev) => !prev)}
                        className="text-[11px] font-semibold text-[#B0B3B8] hover:text-white underline"
                      >
                        {useResetCode
                          ? 'Verificar com dados da conta'
                          : 'Usar código de 6 dígitos'}
                      </button>
                    </div>
                  </div>

                  {useResetCode ? (
                    <div>
                      <label className="block text-xs font-medium text-[#B0B3B8] mb-1">
                        Código de recuperação (6 dígitos)
                      </label>
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={6}
                        value={resetCodeInput}
                        onChange={(e) => setResetCodeInput(e.target.value)}
                        placeholder="Ex: 482910"
                        className="w-full h-11 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3.5 text-sm tracking-widest text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                      />
                    </div>
                  ) : recoverInfo.mode === 'security_question' ? (
                    <div>
                      <label className="block text-xs font-medium text-[#B0B3B8] mb-1">
                        {recoverInfo.recoveryQuestion}
                      </label>
                      <input
                        type="text"
                        required
                        value={recoveryAnswerInput}
                        onChange={(e) => setRecoveryAnswerInput(e.target.value)}
                        placeholder="Escreve a tua resposta secreta"
                        className="w-full h-11 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3.5 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#B0B3B8] mb-1">
                          Confirma o teu @utilizador
                        </label>
                        <input
                          type="text"
                          required
                          value={handleCheck}
                          onChange={(e) => setHandleCheck(e.target.value)}
                          placeholder="ex: @teunome"
                          className="w-full h-11 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3.5 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#B0B3B8] mb-1">
                          Nome completo da conta
                        </label>
                        <input
                          type="text"
                          required
                          value={nameCheck}
                          onChange={(e) => setNameCheck(e.target.value)}
                          placeholder="Como está no teu perfil"
                          className="w-full h-11 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3.5 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#B0B3B8] mb-1">
                        Nova palavra-passe
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full h-11 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] pl-3.5 pr-11 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          aria-label={
                            showNewPassword
                              ? 'Ocultar nova palavra-passe'
                              : 'Ver nova palavra-passe'
                          }
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md text-[#B0B3B8] hover:text-white hover:bg-[#4E4F50]/60 flex items-center justify-center transition-colors"
                        >
                          {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#B0B3B8] mb-1">
                        Confirmar nova palavra-passe
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmNewPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Repete a palavra-passe"
                          className="w-full h-11 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] pl-3.5 pr-11 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                          aria-label={
                            showConfirmNewPassword
                              ? 'Ocultar confirmação'
                              : 'Ver confirmação'
                          }
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md text-[#B0B3B8] hover:text-white hover:bg-[#4E4F50]/60 flex items-center justify-center transition-colors"
                        >
                          {showConfirmNewPassword ? (
                            <EyeOff size={17} />
                          ) : (
                            <Eye size={17} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {recoverInfo.mode === 'identity_verify' && (
                    <div className="rounded-xl bg-[#18191A] border border-[#3E4042] p-3 space-y-2">
                      <div className="text-[11px] font-semibold text-[#B0B3B8]">
                        Definir pergunta secreta para futuras recuperações (opcional)
                      </div>
                      <input
                        type="text"
                        value={newRecoveryQuestion}
                        onChange={(e) => setNewRecoveryQuestion(e.target.value)}
                        placeholder="Pergunta secreta"
                        className="w-full h-9 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3 text-xs text-white placeholder:text-[#B0B3B8]"
                      />
                      <input
                        type="text"
                        value={newRecoveryAnswer}
                        onChange={(e) => setNewRecoveryAnswer(e.target.value)}
                        placeholder="Resposta secreta"
                        className="w-full h-9 rounded-lg bg-[#3A3B3C] border border-[#4E4F50] px-3 text-xs text-white placeholder:text-[#B0B3B8]"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setRecoverStep('lookup');
                      setError(null);
                    }}
                    className="text-xs text-[#B0B3B8] hover:text-white underline"
                  >
                    Procurar outra conta
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-rose-500/15 border border-rose-500/40 px-3.5 py-2.5 text-xs text-rose-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full min-h-[46px] rounded-lg text-white font-bold text-sm transition-colors ${
                  mode === 'register'
                    ? 'bg-[#42B72A] hover:bg-[#36A420]'
                    : 'bg-[#1877F2] hover:bg-[#166FE5]'
                } disabled:opacity-60`}
              >
                {loading
                  ? 'A processar...'
                  : mode === 'login'
                  ? 'Iniciar sessão'
                  : mode === 'register'
                  ? 'Criar Conta Anónima'
                  : recoverStep === 'lookup'
                  ? 'Procurar Conta'
                  : 'Redefinir Palavra-passe e Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {legalModalTab && (
        <LegalRulesModal
          initialTab={legalModalTab}
          onClose={() => setLegalModalTab(null)}
        />
      )}
    </div>
  );
};


