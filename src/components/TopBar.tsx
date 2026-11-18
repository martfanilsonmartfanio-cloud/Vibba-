import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Bookmark,
  Calendar,
  ChevronDown,
  Download,
  Flag,
  Home,
  LayoutGrid,
  LogOut,
  MessageCircle,
  PlaySquare,
  Scale,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trophy,
  User,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { AppTab, UserProfile, VibbaNotification } from '../types/vibba';
import { VibbaAvatar } from './VibbaBrand';
import { GlowingMedalIcon } from './ActivityMedals';
import { ThemeToggle } from './ThemeToggle';
import { VibbaTheme } from '../hooks/useTheme';

interface TopBarProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  currentUser: UserProfile;
  notifications: VibbaNotification[];
  unreadNotifications: number;
  unreadMessages: number;
  friendRequestsCount: number;
  onMarkNotificationsRead: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenMobileMenu: () => void;
  onOpenShareModal: () => void;
  onDownloadApp: () => void;
  onLogout?: () => void;
  isInstalledPwa?: boolean;
  theme?: VibbaTheme;
  onToggleTheme?: () => void;
  onOpenLegalModal?: (tab: 'rules' | 'legal') => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onChangeTab,
  currentUser,
  notifications,
  unreadNotifications,
  unreadMessages,
  friendRequestsCount,
  onMarkNotificationsRead,
  searchQuery,
  onSearchChange,
  onOpenShareModal,
  onDownloadApp,
  onLogout,
  isInstalledPwa = false,
  theme = 'dark',
  onToggleTheme,
  onOpenLegalModal,
}) => {
  const [openPopover, setOpenPopover] = useState<
    'none' | 'menu' | 'notifs' | 'account'
  >('none');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleOutside = (ev: MouseEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(ev.target as Node)
      ) {
        setOpenPopover('none');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const centerNavItems: Array<{
    id: AppTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    { id: 'feed', label: 'Início', icon: <Home size={22} /> },
    {
      id: 'friends',
      label: currentUser.isOwner || currentUser.professionalMode ? 'Pessoas' : 'Amigos',
      icon: <Users size={22} />,
      badge: currentUser.isOwner || currentUser.professionalMode ? 0 : friendRequestsCount,
    },
    { id: 'watch', label: 'Watch', icon: <PlaySquare size={22} /> },
    { id: 'marketplace', label: 'Marketplace', icon: <ShoppingBag size={22} /> },
    { id: 'groups', label: 'Grupos', icon: <UsersRound size={22} /> },
  ];

  const navigate = (tab: AppTab) => {
    onSearchChange('');
    onChangeTab(tab);
    setOpenPopover('none');
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-[#3E4042] bg-[#242526]"
    >
      <div className="max-w-[1440px] mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Facebook-style Circular Brand + Rounded Search */}
        <div className="flex items-center gap-2 min-w-0 md:w-72">
          <button
            type="button"
            onClick={() => navigate('feed')}
            className="flex items-center gap-2 shrink-0 focus:outline-none"
            aria-label="Vibba Início"
          >
            <img
              src="/vibba-icon.png"
              alt="Vibba"
              className="w-10 h-10 rounded-full object-contain shrink-0 shadow-sm"
            />
            <span className="md:hidden font-display font-extrabold text-[22px] tracking-tight text-[#1877F2]">
              Vibba
            </span>
          </button>

          {/* Desktop Search Pill */}
          <div className="hidden md:block relative flex-1 min-w-0 max-w-[240px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B3B8]"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar no Vibba"
              className="w-full h-10 rounded-full bg-[#3A3B3C] pl-9 pr-8 text-sm text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Limpar pesquisa"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#B0B3B8] hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Center: Facebook 5 Icon Tabs (Desktop) */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center justify-center gap-1 flex-1 max-w-[560px] h-full"
        >
          {centerNavItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`relative flex-1 max-w-[112px] h-full flex items-center justify-center transition-colors border-b-[3px] ${
                  active
                    ? 'text-[#1877F2] border-[#1877F2]'
                    : 'text-[#B0B3B8] border-transparent hover:bg-[#3A3B3C] rounded-lg my-1'
                }`}
              >
                {item.icon}
                {item.badge && item.badge > 0 ? (
                  <span className="absolute top-2 right-5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E41E3F] text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Right: Facebook Circular Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Toggle */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="Pesquisar no Vibba"
            className="md:hidden w-9 h-9 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] flex items-center justify-center"
          >
            <Search size={18} />
          </button>

          {!isInstalledPwa && (
            <button
              type="button"
              onClick={onDownloadApp}
              aria-label="Baixar Fora do Chrome"
              title="Baixar App fora do Chrome"
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-full bg-[#31A24C] hover:bg-[#2B9243] text-white flex items-center gap-1.5 text-xs font-bold transition-colors shrink-0"
            >
              <Download size={15} />
              <span className="hidden xl:inline">Baixar App</span>
            </button>
          )}

          {/* Desktop Facebook Menu Grid Button */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() =>
                setOpenPopover((p) => (p === 'menu' ? 'none' : 'menu'))
              }
              aria-label="Menu"
              title="Menu"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                openPopover === 'menu'
                  ? 'bg-[#263951] text-[#1877F2]'
                  : 'bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB]'
              }`}
            >
              <LayoutGrid size={19} />
            </button>

            {openPopover === 'menu' && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#242526] border border-[#3E4042] shadow-2xl p-3 space-y-2 z-50">
                <div className="px-2 py-1 text-base font-bold text-[#E4E6EB]">
                  Menu
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'ranking', label: 'Top 10 & 200', icon: <Trophy size={16} className="text-[#F7B928]" /> },
                      { id: 'pages', label: 'Páginas', icon: <Flag size={16} className="text-[#F7B928]" /> },
                      { id: 'events', label: 'Eventos', icon: <Calendar size={16} className="text-[#F3425F]" /> },
                      { id: 'saved', label: 'Guardados', icon: <Bookmark size={16} className="text-[#B86BFF]" /> },
                      { id: 'groups', label: 'Grupos', icon: <UsersRound size={16} className="text-[#1877F2]" /> },
                      { id: 'marketplace', label: 'Marketplace', icon: <ShoppingBag size={16} className="text-[#45BD62]" /> },
                      { id: 'watch', label: 'Watch', icon: <PlaySquare size={16} className="text-[#4599FF]" /> },
                    ] as Array<{ id: AppTab; label: string; icon: React.ReactNode }>
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.id)}
                      className={`px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-left transition-colors ${
                        activeTab === item.id
                          ? 'bg-[#263951] text-[#4599FF]'
                          : 'bg-[#18191A] hover:bg-[#3A3B3C] text-[#E4E6EB]'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#3E4042] space-y-1">
                  {currentUser.isOwner && (
                    <button
                      type="button"
                      onClick={() => navigate('owner')}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#263951] hover:bg-[#314A68] text-[#4599FF] text-xs font-bold flex items-center gap-2.5"
                    >
                      <ShieldCheck size={16} />
                      <span>Painel do Proprietário</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpenPopover('none');
                      onOpenShareModal();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#18191A] hover:bg-[#3A3B3C] text-[#E4E6EB] text-xs font-semibold flex items-center gap-2.5"
                  >
                    <Share2 size={16} className="text-[#4599FF]" />
                    <span>Partilhar Link do Vibba</span>
                  </button>
                  {onOpenLegalModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenPopover('none');
                        onOpenLegalModal('rules');
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#18191A] hover:bg-[#3A3B3C] text-[#E4E6EB] text-xs font-semibold flex items-center gap-2.5"
                    >
                      <Scale size={16} className="text-amber-400" />
                      <span>Regras &amp; Aviso Legal</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Messenger Circle */}
          <button
            type="button"
            onClick={() => navigate('messenger')}
            aria-label="Messenger"
            title="Messenger"
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors ${
              activeTab === 'messenger'
                ? 'bg-[#263951] text-[#1877F2]'
                : 'bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB]'
            }`}
          >
            <MessageCircle size={19} />
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E41E3F] text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </button>

          {/* Notifications Circle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const next = openPopover === 'notifs' ? 'none' : 'notifs';
                setOpenPopover(next);
                if (next === 'notifs' && unreadNotifications > 0) {
                  onMarkNotificationsRead();
                }
              }}
              aria-label="Notificações"
              title="Notificações"
              className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors ${
                openPopover === 'notifs'
                  ? 'bg-[#263951] text-[#1877F2]'
                  : 'bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB]'
              }`}
            >
              <Bell size={19} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E41E3F] text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>

            {openPopover === 'notifs' && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-y-auto rounded-2xl bg-[#242526] border border-[#3E4042] shadow-2xl p-3 space-y-2 z-50">
                <div className="flex items-center justify-between px-1 pb-2 border-b border-[#3E4042]">
                  <h3 className="text-sm font-bold text-[#E4E6EB]">Notificações</h3>
                  <button
                    type="button"
                    onClick={() => setOpenPopover('none')}
                    className="text-xs text-[#B0B3B8] hover:text-white"
                  >
                    Fechar
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#B0B3B8] text-center py-6">
                    Sem notificações de momento.
                  </p>
                ) : (
                  notifications.slice(0, 20).map((n) =>
                    n.type === 'level_up' ? (
                      <div
                        key={n.id}
                        className="rounded-xl px-3 py-2.5 text-xs flex items-start gap-2.5 bg-gradient-to-r from-[#7C3AED]/25 via-[#C026D3]/15 to-[#EC4899]/20 border border-[#EC4899]/45"
                      >
                        <GlowingMedalIcon
                          level={n.level || 2}
                          size="xs"
                          unlocked
                        />
                        <div className="flex-1 min-w-0">
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-fuchsia-500/25 text-fuchsia-200 text-[10px] font-extrabold uppercase tracking-wide mb-1">
                            <Sparkles size={10} /> Notificação Plus · Nível {n.level || ''}
                          </div>
                          <p className="text-[#E4E6EB] leading-snug font-medium">
                            {n.message}
                          </p>
                          <span className="text-[11px] text-[#B0B3B8]">
                            {n.createdAtLabel}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={n.id}
                        className={`rounded-xl px-3 py-2.5 text-xs flex items-start gap-2.5 ${
                          n.read ? 'bg-[#18191A]' : 'bg-[#263951]'
                        }`}
                      >
                        <VibbaAvatar
                          src={n.actorAvatar || ''}
                          alt={n.actorName}
                          sizeClass="w-8 h-8"
                          initials={n.actorName.slice(0, 2).toUpperCase()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[#E4E6EB] leading-snug">
                            <strong className="text-white">{n.actorName}</strong>{' '}
                            {n.message}
                          </p>
                          <span className="text-[11px] text-[#B0B3B8]">
                            {n.createdAtLabel}
                          </span>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            )}
          </div>

          {/* Desktop Facebook Account Avatar + Popover */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() =>
                setOpenPopover((p) => (p === 'account' ? 'none' : 'account'))
              }
              title="Conta e perfil"
              aria-label="Conta e perfil"
              className="relative rounded-full focus:outline-none ring-offset-2 ring-offset-[#242526] hover:brightness-110 transition"
            >
              <VibbaAvatar
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                sizeClass="w-10 h-10"
                initials={currentUser.name.slice(0, 2).toUpperCase()}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#3A3B3C] border-2 border-[#242526] text-white flex items-center justify-center">
                <ChevronDown size={10} />
              </span>
            </button>

            {openPopover === 'account' && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#242526] border border-[#3E4042] shadow-2xl p-3 space-y-2 z-50">
                <button
                  type="button"
                  onClick={() => navigate('profile')}
                  className="w-full p-2.5 rounded-xl bg-[#18191A] hover:bg-[#3A3B3C] flex items-center gap-3 text-left transition-colors"
                >
                  <VibbaAvatar
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    sizeClass="w-10 h-10"
                    initials={currentUser.name.slice(0, 2).toUpperCase()}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-[#4599FF] font-semibold">
                      Ver o teu perfil
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('profile')}
                  className="w-full px-3 py-2.5 rounded-xl hover:bg-[#3A3B3C] text-xs font-semibold text-[#E4E6EB] flex items-center gap-2.5"
                >
                  <User size={16} className="text-[#B0B3B8]" />
                  <span>O teu Perfil</span>
                </button>

                {currentUser.isOwner && (
                  <button
                    type="button"
                    onClick={() => navigate('owner')}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#263951] hover:bg-[#314A68] text-xs font-bold text-[#4599FF] flex items-center gap-2.5"
                  >
                    <ShieldCheck size={16} />
                    <span>Painel do Proprietário</span>
                  </button>
                )}

                {onToggleTheme && (
                  <ThemeToggle
                    theme={theme}
                    onToggle={onToggleTheme}
                    variant="popover"
                  />
                )}

                <button
                  type="button"
                  onClick={() => {
                    setOpenPopover('none');
                    onOpenShareModal();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl hover:bg-[#3A3B3C] text-xs font-semibold text-[#E4E6EB] flex items-center gap-2.5"
                >
                  <Share2 size={16} className="text-[#B0B3B8]" />
                  <span>Partilhar Link</span>
                </button>

                {onOpenLegalModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenPopover('none');
                      onOpenLegalModal('rules');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl hover:bg-[#3A3B3C] text-xs font-semibold text-[#E4E6EB] flex items-center gap-2.5"
                  >
                    <Scale size={16} className="text-amber-400" />
                    <span>Regras &amp; Aviso Legal</span>
                  </button>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenPopover('none');
                      onLogout();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl hover:bg-rose-500/15 text-xs font-semibold text-rose-400 flex items-center gap-2.5"
                  >
                    <LogOut size={16} />
                    <span>Terminar sessão</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Mobile Search Bar */}
      {mobileSearchOpen && (
        <div className="md:hidden px-3 pb-2.5 pt-1 border-t border-[#3E4042] bg-[#242526]">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B3B8]"
            />
            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar pessoas, grupos ou publicações..."
              className="w-full h-10 rounded-full bg-[#3A3B3C] pl-9 pr-9 text-sm text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                setMobileSearchOpen(false);
              }}
              aria-label="Fechar pesquisa"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#B0B3B8] hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
