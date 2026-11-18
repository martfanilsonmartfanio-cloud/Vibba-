import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Image as ImageIcon,
  MessageCircle,
  Mic,
  Search,
  Send,
  Square,
  X,
} from 'lucide-react';
import {
  CommunityMember,
  MessengerConversation,
  MessengerMessage,
  UserProfile,
} from '../types/vibba';
import {
  compressImageFile,
  readAudioBlobAsDataUrl,
  vibbaApi,
} from '../lib/api';
import { VibbaAvatar } from './VibbaBrand';
import { AudioPostPlayer } from './AudioPostPlayer';

interface MessengerViewProps {
  currentUser: UserProfile;
  users: CommunityMember[];
  initialPeerId: string | null;
  typingUserIds: Record<string, number>;
  onSendTyping: (receiverId: string) => void;
  onConversationsUnreadChange: (unreadTotal: number) => void;
  incomingWsMessage: MessengerMessage | null;
}

export const MessengerView: React.FC<MessengerViewProps> = ({
  currentUser,
  users,
  initialPeerId,
  typingUserIds,
  onSendTyping,
  onConversationsUnreadChange,
  incomingWsMessage,
}) => {
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [activePeer, setActivePeer] = useState<CommunityMember | null>(null);
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [search, setSearch] = useState('');

  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const loadConversations = async () => {
    try {
      const res = await vibbaApi.getConversations();
      setConversations(res.conversations);
      onConversationsUnreadChange(res.totalUnread);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    if (!initialPeerId) return;
    const found = users.find((u) => u.id === initialPeerId);
    if (found) {
      void openThread(found);
    }
  }, [initialPeerId, users]);

  useEffect(() => {
    if (!incomingWsMessage) return;
    const msg = incomingWsMessage;
    const isForActive =
      activePeer &&
      ((msg.senderId === activePeer.id && msg.receiverId === currentUser.id) ||
        (msg.senderId === currentUser.id && msg.receiverId === activePeer.id));

    if (isForActive) {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
      if (msg.senderId === activePeer?.id) {
        void vibbaApi.markConversationRead(activePeer.id);
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
    void loadConversations();
  }, [incomingWsMessage]);

  const openThread = async (peer: CommunityMember) => {
    setActivePeer(peer);
    setLoadingThread(true);
    setError(null);
    try {
      const res = await vibbaApi.getMessages(peer.id);
      setActivePeer(res.peer);
      setMessages(res.messages);
      await loadConversations();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao abrir conversa.');
    } finally {
      setLoadingThread(false);
    }
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 960);
      setImageUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar foto.');
    }
  };

  const handleVoiceNote = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      return;
    }
    if (!activePeer || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Microfone indisponível neste dispositivo.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      setRecordingSec(0);
      const startedAt = Date.now();

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsRecording(false);
        const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size < 400 || !activePeer) return;
        try {
          const audioUrl = await readAudioBlobAsDataUrl(blob);
          const res = await vibbaApi.sendMessage(activePeer.id, {
            audioUrl,
            audioDurationSec: duration,
          });
          setMessages((prev) => [...prev, res.message]);
          void loadConversations();
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao enviar áudio.');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingSec((s) => {
          if (s >= 119) {
            recorder.stop();
            return 120;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('Permissão do microfone negada.');
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePeer || sending) return;
    if (!text.trim() && !imageUrl) return;

    setSending(true);
    setError(null);
    try {
      const res = await vibbaApi.sendMessage(activePeer.id, {
        text: text.trim(),
        imageUrl: imageUrl || undefined,
      });
      setText('');
      setImageUrl('');
      setMessages((prev) =>
        prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]
      );
      void loadConversations();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  };

  const contactList = useMemo(() => {
    const convMap = new Map(conversations.map((c) => [c.peer.id, c]));
    const q = search.trim().toLowerCase();
    const otherUsers = users.filter((u) => !u.isMe);

    const combined: MessengerConversation[] = [
      ...conversations,
      ...otherUsers
        .filter((u) => !convMap.has(u.id))
        .map((u) => ({ peer: u, lastMessage: null, unreadCount: 0 })),
    ];

    if (!q) return combined;
    return combined.filter(
      (c) =>
        c.peer.name.toLowerCase().includes(q) ||
        c.peer.handle.toLowerCase().includes(q)
    );
  }, [conversations, users, search]);

  const isPeerTyping =
    activePeer &&
    typingUserIds[activePeer.id] &&
    Date.now() - typingUserIds[activePeer.id] < 3500;

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4">
      <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-96px)] rounded-xl bg-[#242526] border border-[#3E4042] overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-xl">
        {/* Left Sidebar */}
        <aside
          className={`md:col-span-4 border-r border-[#3E4042] flex flex-col min-h-0 ${
            activePeer ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-[#3E4042] space-y-3">
            <h1 className="text-lg font-display font-bold text-[#E4E6EB] flex items-center gap-2">
              <MessageCircle size={20} className="text-[#1877F2]" />
              <span>Messenger</span>
            </h1>
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B3B8]"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar no Messenger"
                className="w-full h-9 rounded-full bg-[#3A3B3C] pl-9 pr-3 text-xs text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#2F3031]">
            {contactList.length === 0 ? (
              <p className="p-6 text-center text-xs text-[#B0B3B8]">
                Ainda não há outros utilizadores para conversar.
              </p>
            ) : (
              contactList.map(({ peer, lastMessage, unreadCount }) => {
                const selected = activePeer?.id === peer.id;
                return (
                  <button
                    key={peer.id}
                    type="button"
                    onClick={() => void openThread(peer)}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                      selected ? 'bg-[#263951]' : 'hover:bg-[#3A3B3C]/60'
                    }`}
                  >
                    <VibbaAvatar
                      src={peer.avatarUrl}
                      alt={peer.name}
                      isOnline={peer.isOnline}
                      initials={peer.name.slice(0, 2).toUpperCase()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#E4E6EB] truncate">
                          {peer.name}
                        </span>
                        {lastMessage && (
                          <span className="text-[10px] text-[#B0B3B8] shrink-0">
                            {lastMessage.createdAtLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs text-[#B0B3B8] truncate">
                          {lastMessage
                            ? lastMessage.text ||
                              (lastMessage.audioUrl
                                ? '🎤 Mensagem de voz'
                                : '📷 Fotografia')
                            : `@${peer.handle} · Iniciar conversa`}
                        </span>
                        {unreadCount > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#1877F2] text-white text-[10px] font-bold tabular-nums flex items-center justify-center shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Panel */}
        <section
          className={`md:col-span-8 flex flex-col min-h-0 bg-[#18191A] ${
            activePeer ? 'flex' : 'hidden md:flex'
          }`}
        >
          {!activePeer ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-[#242526] border border-[#3E4042] flex items-center justify-center text-[#1877F2]">
                <MessageCircle size={30} />
              </div>
              <h2 className="text-lg font-display font-bold text-[#E4E6EB]">
                As tuas mensagens em tempo real
              </h2>
              <p className="text-sm text-[#B0B3B8] max-w-sm">
                Escolhe um amigo na lista à esquerda para enviar texto, fotos ou
                notas de voz instantaneamente.
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 bg-[#242526] border-b border-[#3E4042] flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActivePeer(null)}
                  aria-label="Voltar às conversas"
                  className="md:hidden w-9 h-9 rounded-full bg-[#3A3B3C] text-white flex items-center justify-center"
                >
                  <ArrowLeft size={18} />
                </button>
                <VibbaAvatar
                  src={activePeer.avatarUrl}
                  alt={activePeer.name}
                  sizeClass="w-10 h-10"
                  isOnline={activePeer.isOnline}
                  initials={activePeer.name.slice(0, 2).toUpperCase()}
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#E4E6EB] truncate">
                    {activePeer.name}
                  </div>
                  <div className="text-xs text-[#B0B3B8]">
                    {isPeerTyping ? (
                      <span className="text-[#4599FF] font-medium">A escrever...</span>
                    ) : activePeer.isOnline ? (
                      <span className="text-[#31A24C]">Online agora</span>
                    ) : (
                      `@${activePeer.handle}`
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingThread ? (
                  <p className="text-center text-xs text-[#B0B3B8] py-8">
                    A carregar mensagens...
                  </p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-[#B0B3B8] py-8">
                    Diz olá a {activePeer.name}!
                  </p>
                ) : (
                  messages.map((m) => {
                    const isMine = m.senderId === currentUser.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 space-y-1.5 ${
                            isMine
                              ? 'bg-[#0084FF] text-white rounded-br-sm'
                              : 'bg-[#3A3B3C] text-[#E4E6EB] rounded-bl-sm'
                          }`}
                        >
                          {m.listingTitle && (
                            <div className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-black/20 text-white">
                              Sobre: {m.listingTitle}
                            </div>
                          )}
                          {m.imageUrl && (
                            <img
                              src={m.imageUrl}
                              alt="Anexo"
                              referrerPolicy="no-referrer"
                              className="max-h-60 rounded-xl object-cover"
                            />
                          )}
                          {m.audioUrl && (
                            <AudioPostPlayer
                              src={m.audioUrl}
                              durationSec={m.audioDurationSec}
                              seed={m.id}
                              compact
                              label="Mensagem de voz"
                            />
                          )}
                          {m.text && (
                            <p className="text-sm whitespace-pre-line break-words">
                              {m.text}
                            </p>
                          )}
                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] ${
                              isMine ? 'text-white/80' : 'text-[#B0B3B8]'
                            }`}
                          >
                            <span>{m.createdAtLabel}</span>
                            {isMine &&
                              (m.readAt ? (
                                <CheckCheck size={12} />
                              ) : (
                                <Check size={12} />
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {error && (
                <div className="mx-4 mb-2 rounded-xl bg-rose-500/15 border border-rose-500/40 px-3 py-2 text-xs text-rose-200">
                  {error}
                </div>
              )}

              {imageUrl && (
                <div className="mx-4 mb-2 relative inline-block w-fit">
                  <img
                    src={imageUrl}
                    alt="Pré-visualização"
                    className="h-24 rounded-xl border border-[#3E4042] object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSendText}
                className="p-3 bg-[#242526] border-t border-[#3E4042] flex items-center gap-2"
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImagePick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  aria-label="Enviar foto"
                  className="w-10 h-10 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#45BD62] flex items-center justify-center shrink-0"
                >
                  <ImageIcon size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleVoiceNote()}
                  aria-label={isRecording ? 'Parar e enviar voz' : 'Gravar voz'}
                  className={`h-10 px-3 rounded-full flex items-center justify-center gap-1.5 shrink-0 text-xs font-semibold ${
                    isRecording
                      ? 'bg-rose-500 text-white'
                      : 'bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#F7B928]'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square size={14} className="fill-white" />
                      <span className="font-mono tabular-nums">{recordingSec}s</span>
                    </>
                  ) : (
                    <Mic size={18} />
                  )}
                </button>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    const now = Date.now();
                    if (activePeer && now - lastTypingSentRef.current > 1500) {
                      lastTypingSentRef.current = now;
                      onSendTyping(activePeer.id);
                    }
                  }}
                  placeholder={`Escreve para ${activePeer.name.split(' ')[0]}...`}
                  className="flex-1 h-10 rounded-full bg-[#3A3B3C] px-4 text-sm text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || isRecording || (!text.trim() && !imageUrl)}
                  aria-label="Enviar mensagem"
                  className="w-10 h-10 rounded-full bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-40 text-white flex items-center justify-center shrink-0"
                >
                  <Send size={17} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
