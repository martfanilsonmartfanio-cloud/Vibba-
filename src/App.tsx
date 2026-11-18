import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Calendar,
  Download,
  Flag,
  Headphones,
  Home,
  Loader2,
  LogOut,
  Menu,
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
import {
  AppTab,
  CommunityMember,
  GlobalSearchResults,
  MessengerMessage,
  UserProfile,
  VibbaNotification,
  VibbaPost,
  VibbaStory,
} from './types/vibba';
import {
  ApiError,
  clearDeviceSnapshot,
  getStoredSnapshot,
  getStoredToken,
  saveDeviceSnapshot,
  setStoredToken,
  vibbaApi,
} from './lib/api';
import { AuthView } from './components/AuthView';
import { GlowingMedalIcon, getActivityMedalTier } from './components/ActivityMedals';
import { TopBar } from './components/TopBar';
import { FeedView } from './components/FeedView';
import { FriendsView } from './components/FriendsView';
import { MessengerView } from './components/MessengerView';
import { GroupsView } from './components/GroupsView';
import { MarketplaceView } from './components/MarketplaceView';
import {
  EventsView,
  PagesView,
  SavedView,
  WatchView,
} from './components/EventsPagesView';
import { ProfileView } from './components/ProfileView';
import { MemberProfileModal } from './components/MemberProfileModal';
import { VibbaAvatar } from './components/VibbaBrand';
import { PostCard } from './components/PostCard';
import { ShareAppModal } from './components/ShareAppModal';
import { OwnerDashboardView } from './components/OwnerDashboardView';
import { LeaderboardView } from './components/LeaderboardView';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';
import { useTheme } from './hooks/useTheme';
import { ThemeToggle } from './components/ThemeToggle';
import { LegalRulesModal } from './components/LegalRulesModal';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [booting, setBooting] = useState(true);

  const [activeTab, setActiveTab] = useState<AppTab>('feed');
  const [posts, setPosts] = useState<VibbaPost[]>([]);
  const [stories, setStories] = useState<VibbaStory[]>([]);
  const [users, setUsers] = useState<CommunityMember[]>([]);
  const [notifications, setNotifications] = useState<VibbaNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [chatPeerId, setChatPeerId] = useState<string | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<Record<string, number>>({});
  const [incomingWsMessage, setIncomingWsMessage] =
    useState<MessengerMessage | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResults | null>(
    null
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Share / Download App modal & PWA install hooks
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'rules' | 'legal' | null>(null);
  const {
    isInstallable,
    isInstalled: isInstalledPwa,
    isIOS,
    isInIframe,
    install: handleInstallPwa,
  } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const { theme, toggleTheme } = useTheme();

  const wsRef = useRef<WebSocket | null>(null);
  const previousLevelRef = useRef<number | null>(null);
  const [pointsToast, setPointsToast] = useState<{
    delta: number;
    reason: string;
    level: number;
    title: string;
  } | null>(null);
  const pointsToastTimerRef = useRef<number | null>(null);
  const [levelUpPlusNotice, setLevelUpPlusNotice] = useState<{
    previousLevel: number;
    level: number;
    title: string;
    medalName: string;
    points: number;
  } | null>(null);
  const levelUpTimerRef = useRef<number | null>(null);

  const showLevelUpPlus = useCallback(
    (payload: {
      previousLevel: number;
      level: number;
      title: string;
      medalName: string;
      points: number;
    }) => {
      setLevelUpPlusNotice(payload);
      if (levelUpTimerRef.current) {
        window.clearTimeout(levelUpTimerRef.current);
      }
      levelUpTimerRef.current = window.setTimeout(() => {
        setLevelUpPlusNotice(null);
      }, 6500);
    },
    []
  );

  useEffect(() => {
    const onPointsUpdated = (ev: Event) => {
      const detail = (
        ev as CustomEvent<{
          user?: UserProfile;
          delta?: number;
          reason?: string;
        }>
      ).detail;
      if (!detail?.user) return;
      const updatedUser = detail.user;
      const nextLevel = updatedUser.activityLevel?.level || 1;
      const prevLevel = previousLevelRef.current;
      previousLevelRef.current = nextLevel;

      setCurrentUser(updatedUser);
      setPosts((prev) =>
        prev.map((p) =>
          p.authorId === updatedUser.id && !p.pageId
            ? {
                ...p,
                authorLevel: {
                  level: updatedUser.activityLevel.level,
                  title: updatedUser.activityLevel.title,
                  medalName: updatedUser.activityLevel.medalName,
                },
              }
            : p
        )
      );

      if (
        prevLevel !== null &&
        nextLevel > prevLevel &&
        !updatedUser.isOwner
      ) {
        showLevelUpPlus({
          previousLevel: prevLevel,
          level: nextLevel,
          title: updatedUser.activityLevel.title,
          medalName:
            updatedUser.activityLevel.medalName ||
            getActivityMedalTier(nextLevel).medalName,
          points: updatedUser.vibbaPoints || 0,
        });
        void vibbaApi
          .getNotifications()
          .then((res) => {
            setNotifications(res.notifications);
            setUnreadNotifications(res.unreadCount);
          })
          .catch(() => {});
      }

      if (detail.delta && detail.delta > 0) {
        setPointsToast({
          delta: detail.delta,
          reason: detail.reason || 'Atividade',
          level: updatedUser.activityLevel.level,
          title: updatedUser.activityLevel.title,
        });
        if (pointsToastTimerRef.current) {
          window.clearTimeout(pointsToastTimerRef.current);
        }
        pointsToastTimerRef.current = window.setTimeout(() => {
          setPointsToast(null);
        }, 2800);
      }
    };
    window.addEventListener('vibba:points-updated', onPointsUpdated);
    return () => {
      window.removeEventListener('vibba:points-updated', onPointsUpdated);
      if (pointsToastTimerRef.current) {
        window.clearTimeout(pointsToastTimerRef.current);
      }
      if (levelUpTimerRef.current) {
        window.clearTimeout(levelUpTimerRef.current);
      }
    };
  }, [showLevelUpPlus]);

  const handleDownloadApp = useCallback(async () => {
    if (isInstallable || window.__vibbaDeferredInstallPrompt) {
      const accepted = await handleInstallPwa();
      if (accepted) return;
    }
    setShareModalOpen(true);
  }, [isInstallable, handleInstallPwa]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('instalar') || params.has('install')) {
      setShareModalOpen(true);
      params.delete('instalar');
      params.delete('install');
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    const [postsRes, storiesRes, usersRes, notifsRes, convRes] = await Promise.all([
      vibbaApi.getPosts(),
      vibbaApi.getStories(),
      vibbaApi.getUsers(),
      vibbaApi.getNotifications(),
      vibbaApi.getConversations(),
    ]);
    setPosts(postsRes.posts);
    setStories(storiesRes.stories);
    setUsers(usersRes.users);
    setNotifications(notifsRes.notifications);
    setUnreadNotifications(notifsRes.unreadCount);
    setUnreadMessages(convRes.totalUnread);
  }, []);

  // Boot auth session with visible connection screen
  useEffect(() => {
    let active = true;
    const minSplash = new Promise<void>((resolve) => {
      window.setTimeout(resolve, 1100);
    });
    const boot = async () => {
      const token = getStoredToken();
      if (!token) {
        await minSplash;
        if (active) setBooting(false);
        return;
      }
      try {
        const [res] = await Promise.all([vibbaApi.getMe(token), minSplash]);
        if (!active) return;
        previousLevelRef.current = res.user.activityLevel?.level || 1;
        setCurrentUser(res.user);
        await refreshAllData();
      } catch (err) {
        await minSplash;
        if (err instanceof ApiError && err.code === 'ACCOUNTS_WIPED') {
          setStoredToken(null);
          clearDeviceSnapshot();
          return;
        }
        const snap = getStoredSnapshot();
        if (
          snap &&
          err instanceof ApiError &&
          (err.status === 401 || err.code === 'SESSION_RESTORE_REQUIRED')
        ) {
          try {
            const restored = await vibbaApi.restoreSession(token, snap);
            if (!active) return;
            previousLevelRef.current = restored.user.activityLevel?.level || 1;
            setStoredToken(restored.token);
            setCurrentUser(restored.user);
            await refreshAllData();
          } catch (restoreErr) {
            setStoredToken(null);
            if (
              restoreErr instanceof ApiError &&
              restoreErr.code === 'ACCOUNTS_WIPED'
            ) {
              clearDeviceSnapshot();
            }
          }
        } else if (err instanceof ApiError && err.status === 401) {
          setStoredToken(null);
        }
      } finally {
        if (active) setBooting(false);
      }
    };
    void boot();
    return () => {
      active = false;
    };
  }, [refreshAllData]);

  // Keep local recovery snapshot updated
  useEffect(() => {
    if (!currentUser) return;
    const ownPosts = posts.filter((p) => p.authorId === currentUser.id);
    saveDeviceSnapshot({
      user: currentUser,
      ownPosts,
      savedAt: Date.now(),
    });
  }, [currentUser, posts]);

  // Real-time WebSocket connection (/ws?token=...)
  useEffect(() => {
    if (!currentUser) return;
    const token = getStoredToken();
    if (!token) return;

    let closedByUser = false;
    let reconnectTimer: number | null = null;

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(
        `${proto}//${window.location.host}/ws?token=${encodeURIComponent(token)}`
      );
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data || '{}')) as {
            event?: string;
            payload?: {
              userId?: string;
              online?: boolean;
              message?: MessengerMessage;
              typing?: boolean;
            } & Partial<VibbaNotification>;
          };

          if (msg.event === 'presence:update' && msg.payload?.userId) {
            const targetId = msg.payload.userId;
            const isOnline = Boolean(msg.payload.online);
            setUsers((prev) =>
              prev.map((u) => (u.id === targetId ? { ...u, isOnline } : u))
            );
          } else if (msg.event === 'message:new' && msg.payload?.message) {
            setIncomingWsMessage(msg.payload.message);
            if (msg.payload.message.receiverId === currentUser.id) {
              setUnreadMessages((c) => c + 1);
            }
          } else if (msg.event === 'typing' && msg.payload?.userId) {
            setTypingUserIds((prev) => ({
              ...prev,
              [msg.payload!.userId!]: Date.now(),
            }));
          } else if (msg.event === 'notification:new' && msg.payload?.id) {
            const notif = msg.payload as VibbaNotification;
            setNotifications((prev) =>
              prev.some((existing) => existing.id === notif.id)
                ? prev
                : [notif, ...prev]
            );
            setUnreadNotifications((c) => c + 1);
          } else if (msg.event === 'level:up' && msg.payload?.level) {
            const lvlPayload = msg.payload as unknown as {
              previousLevel: number;
              level: number;
              title: string;
              medalName: string;
              points: number;
            };
            const prevRecorded = previousLevelRef.current ?? lvlPayload.previousLevel;
            if (lvlPayload.level > prevRecorded) {
              previousLevelRef.current = lvlPayload.level;
              showLevelUpPlus(lvlPayload);
            }
            void vibbaApi
              .getMe()
              .then((r) => setCurrentUser(r.user))
              .catch(() => {});
          }
        } catch {
          // Ignore malformed ws event
        }
      };

      ws.onclose = () => {
        if (!closedByUser) {
          reconnectTimer = window.setTimeout(connect, 3500);
        }
      };
    };

    connect();
    return () => {
      closedByUser = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [currentUser?.id]);

  // Global search debounce
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || !currentUser) {
      setSearchResults(null);
      return;
    }
    const t = window.setTimeout(() => {
      void vibbaApi
        .globalSearch(q)
        .then((res) => setSearchResults(res))
        .catch(() => {});
    }, 240);
    return () => window.clearTimeout(t);
  }, [searchQuery, currentUser]);

  const sendTypingWs = (receiverId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'typing',
          payload: { peerId: receiverId, typing: true },
        })
      );
    }
  };

  const handleOpenChat = (peer: CommunityMember) => {
    setChatPeerId(peer.id);
    setActiveTab('messenger');
    setSearchQuery('');
  };

  const handleContactSeller = async (sellerId: string, listingTitle: string) => {
    try {
      await vibbaApi.sendMessage(sellerId, {
        text: `Olá! Este artigo ainda está disponível: "${listingTitle}"?`,
        listingTitle,
      });
    } catch {
      // Still open thread
    }
    setChatPeerId(sellerId);
    setActiveTab('messenger');
  };

  const selectedMember = useMemo(
    () =>
      selectedUserId
        ? users.find((u) => u.id === selectedUserId) || null
        : null,
    [selectedUserId, users]
  );

  const handleLogout = useCallback(() => {
    setStoredToken(null);
    previousLevelRef.current = null;
    setLevelUpPlusNotice(null);
    setCurrentUser(null);
    setPosts([]);
    setUsers([]);
    setStories([]);
    setActiveTab('feed');
    setMobileMenuOpen(false);
  }, []);

  if (booting) {
    return (
      <div className="min-h-screen bg-[#18191A] flex flex-col items-center justify-center gap-4 px-6 text-[#E4E6EB]">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full bg-[#1877F2]/25 animate-ping" />
          <img
            src="/vibba-icon.png"
            alt="Vibba"
            className="relative w-20 h-20 rounded-full object-contain shadow-2xl border border-[#3E4042]"
          />
        </div>
        <div className="text-center space-y-1.5">
          <h1 className="text-xl font-display font-extrabold text-white tracking-tight">
            A conectar-se ao Vibba...
          </h1>
          <div className="inline-flex items-center gap-2 text-xs text-[#B0B3B8]">
            <Loader2 size={14} className="animate-spin text-[#1877F2]" />
            <span>A estabelecer ligação segura...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AuthView
          onAuthenticated={(user) => {
            previousLevelRef.current = user.activityLevel?.level || 1;
            setCurrentUser(user);
            void refreshAllData();
          }}
          onOpenShareModal={() => setShareModalOpen(true)}
          onDownloadApp={() => void handleDownloadApp()}
          isInstalledPwa={isInstalledPwa}
        />
        {shareModalOpen && (
          <ShareAppModal
            onClose={() => setShareModalOpen(false)}
            canInstallPwa={isInstallable}
            isInstalledPwa={isInstalledPwa}
            isIOS={isIOS}
            isInIframe={isInIframe}
            onInstallPwa={handleInstallPwa}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#18191A] text-[#E4E6EB] pb-20 md:pb-8">
      <TopBar
        activeTab={activeTab}
        onChangeTab={(t) => {
          setActiveTab(t);
          setMobileMenuOpen(false);
        }}
        currentUser={currentUser}
        notifications={notifications}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
        friendRequestsCount={currentUser.incomingRequestIds.length}
        onMarkNotificationsRead={() => {
          setUnreadNotifications(0);
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          void vibbaApi.markNotificationsRead();
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        onOpenShareModal={() => setShareModalOpen(true)}
        onDownloadApp={() => void handleDownloadApp()}
        onLogout={handleLogout}
        isInstalledPwa={isInstalledPwa}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenLegalModal={(tab) => setLegalModalTab(tab)}
      />

      {/* Global Search Results Overlay */}
      {searchQuery.trim() && searchResults ? (
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-[#E4E6EB] flex items-center gap-2">
              <Search size={18} className="text-[#1877F2]" />
              <span>Resultados para &ldquo;{searchQuery.trim()}&rdquo;</span>
            </h2>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#B0B3B8] hover:text-white inline-flex items-center gap-1"
            >
              <X size={14} /> Fechar pesquisa
            </button>
          </div>

          {searchResults.users.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-[#B0B3B8]">Pessoas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {searchResults.users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className="rounded-xl bg-[#242526] border border-[#3E4042] p-3 flex items-center gap-3 cursor-pointer hover:border-[#1877F2]"
                  >
                    <VibbaAvatar
                      src={u.avatarUrl}
                      alt={u.name}
                      isOnline={u.isOnline}
                      initials={u.name.slice(0, 2).toUpperCase()}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#E4E6EB] truncate">
                        {u.name}
                      </div>
                      <div className="text-xs text-[#B0B3B8] truncate">
                        @{u.handle}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {searchResults.groups.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-[#B0B3B8]">Grupos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {searchResults.groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveTab('groups');
                    }}
                    className="rounded-xl bg-[#242526] border border-[#3E4042] p-3.5 text-left hover:border-[#1877F2]"
                  >
                    <div className="text-sm font-bold text-[#E4E6EB]">{g.name}</div>
                    <div className="text-xs text-[#B0B3B8]">
                      {g.category} · {g.membersCount} membros
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {searchResults.listings.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-[#B0B3B8]">
                Marketplace
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {searchResults.listings.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveTab('marketplace');
                    }}
                    className="rounded-xl bg-[#242526] border border-[#3E4042] p-3.5 text-left hover:border-[#1877F2]"
                  >
                    <div className="text-sm font-bold text-[#4599FF]">
                      {l.priceKz.toLocaleString('pt-PT')} Kz
                    </div>
                    <div className="text-sm font-semibold text-[#E4E6EB]">{l.title}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {searchResults.posts.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-[#B0B3B8]">
                Publicações
              </h3>
              {searchResults.posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  onPostUpdated={(u) =>
                    setPosts((prev) => prev.map((x) => (x.id === u.id ? u : x)))
                  }
                  onPostDeleted={(id) =>
                    setPosts((prev) => prev.filter((x) => x.id !== id))
                  }
                  onOpenUserProfile={(id) => setSelectedUserId(id)}
                />
              ))}
            </section>
          )}

          {searchResults.users.length === 0 &&
            searchResults.groups.length === 0 &&
            searchResults.pages.length === 0 &&
            searchResults.listings.length === 0 &&
            searchResults.posts.length === 0 && (
              <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
                Nenhum resultado encontrado para &ldquo;{searchQuery.trim()}&rdquo;.
              </div>
            )}
        </div>
      ) : (
        <>
          {activeTab === 'feed' && (
            <FeedView
              currentUser={currentUser}
              posts={posts}
              stories={stories}
              users={users}
              onPostCreated={(p) => setPosts((prev) => [p, ...prev])}
              onPostUpdated={(u) =>
                setPosts((prev) => prev.map((x) => (x.id === u.id ? u : x)))
              }
              onPostDeleted={(id) =>
                setPosts((prev) => prev.filter((x) => x.id !== id))
              }
              onStoriesRefresh={async () => {
                const res = await vibbaApi.getStories();
                setStories(res.stories);
              }}
              onUsersRefresh={async () => {
                const res = await vibbaApi.getUsers();
                setUsers(res.users);
              }}
              onUserProfileUpdated={setCurrentUser}
              onNavigateTab={setActiveTab}
              onOpenUserProfile={(id) =>
                id === currentUser.id
                  ? setActiveTab('profile')
                  : setSelectedUserId(id)
              }
              onOpenChat={handleOpenChat}
              onOpenShareModal={() => setShareModalOpen(true)}
              onDownloadApp={() => void handleDownloadApp()}
              isInstalledPwa={isInstalledPwa}
              theme={theme}
              onToggleTheme={toggleTheme}
              onOpenLegalModal={(tab) => setLegalModalTab(tab)}
            />
          )}

          {activeTab === 'friends' && (
            <FriendsView
              currentUser={currentUser}
              users={users}
              onUsersUpdated={async () => {
                const res = await vibbaApi.getUsers();
                setUsers(res.users);
              }}
              onUserProfileUpdated={setCurrentUser}
              onOpenUserProfile={(id) => setSelectedUserId(id)}
              onOpenChat={handleOpenChat}
            />
          )}

          {activeTab === 'watch' && (
            <WatchView
              posts={posts}
              onPostUpdated={(u) =>
                setPosts((prev) => prev.map((x) => (x.id === u.id ? u : x)))
              }
              onPostDeleted={(id) =>
                setPosts((prev) => prev.filter((x) => x.id !== id))
              }
              onOpenUserProfile={(id) =>
                id === currentUser.id
                  ? setActiveTab('profile')
                  : setSelectedUserId(id)
              }
            />
          )}

          {activeTab === 'groups' && (
            <GroupsView
              currentUser={currentUser}
              onOpenUserProfile={(id) =>
                id === currentUser.id
                  ? setActiveTab('profile')
                  : setSelectedUserId(id)
              }
            />
          )}

          {activeTab === 'marketplace' && (
            <MarketplaceView
              currentUser={currentUser}
              onContactSeller={(sellerId, title) =>
                void handleContactSeller(sellerId, title)
              }
            />
          )}

          {activeTab === 'messenger' && (
            <MessengerView
              currentUser={currentUser}
              users={users}
              initialPeerId={chatPeerId}
              typingUserIds={typingUserIds}
              onSendTyping={sendTypingWs}
              onConversationsUnreadChange={setUnreadMessages}
              incomingWsMessage={incomingWsMessage}
            />
          )}

          {activeTab === 'events' && <EventsView />}

          {activeTab === 'pages' && (
            <PagesView
              currentUser={currentUser}
              onOpenUserProfile={(id) =>
                id === currentUser.id
                  ? setActiveTab('profile')
                  : setSelectedUserId(id)
              }
            />
          )}

          {activeTab === 'saved' && (
            <SavedView
              posts={posts}
              onPostUpdated={(u) =>
                setPosts((prev) => prev.map((x) => (x.id === u.id ? u : x)))
              }
              onPostDeleted={(id) =>
                setPosts((prev) => prev.filter((x) => x.id !== id))
              }
              onOpenUserProfile={(id) =>
                id === currentUser.id
                  ? setActiveTab('profile')
                  : setSelectedUserId(id)
              }
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              users={users}
              posts={posts}
              onProfileUpdated={setCurrentUser}
              onPostCreated={(p) => setPosts((prev) => [p, ...prev])}
              onPostUpdated={(u) =>
                setPosts((prev) => prev.map((x) => (x.id === u.id ? u : x)))
              }
              onPostDeleted={(id) =>
                setPosts((prev) => prev.filter((x) => x.id !== id))
              }
              onLogout={handleLogout}
              onOpenUserProfile={(id) => setSelectedUserId(id)}
              onOpenChat={handleOpenChat}
              onOpenOwnerPanel={() => setActiveTab('owner')}
            />
          )}

          {activeTab === 'ranking' && (
            <LeaderboardView
              currentUser={currentUser}
              onOpenUserProfile={(id) =>
                id === currentUser.id
                  ? setActiveTab('profile')
                  : setSelectedUserId(id)
              }
            />
          )}

          {activeTab === 'owner' && currentUser.isOwner && (
            <OwnerDashboardView
              currentUser={currentUser}
              onOpenUserProfile={(id) =>
                id === currentUser.id
                  ? setActiveTab('profile')
                  : setSelectedUserId(id)
              }
              onOpenChat={(userId) => {
                setChatPeerId(userId);
                setActiveTab('messenger');
              }}
              onGlobalDataChanged={refreshAllData}
            />
          )}
        </>
      )}

      {/* Member Profile Modal */}
      {selectedMember && (
        <MemberProfileModal
          currentUser={currentUser}
          member={selectedMember}
          posts={posts}
          onClose={() => setSelectedUserId(null)}
          onUserProfileUpdated={setCurrentUser}
          onUsersRefresh={async () => {
            const res = await vibbaApi.getUsers();
            setUsers(res.users);
          }}
          onPostUpdated={(u) =>
            setPosts((prev) => prev.map((x) => (x.id === u.id ? u : x)))
          }
          onPostDeleted={(id) =>
            setPosts((prev) => prev.filter((x) => x.id !== id))
          }
          onOpenChat={handleOpenChat}
          onOpenUserProfile={(id) => setSelectedUserId(id)}
        />
      )}

      {/* Share / Download App Modal */}
      {shareModalOpen && (
        <ShareAppModal
          onClose={() => setShareModalOpen(false)}
          canInstallPwa={isInstallable}
          isInstalledPwa={isInstalledPwa}
          isIOS={isIOS}
          isInIframe={isInIframe}
          onInstallPwa={handleInstallPwa}
        />
      )}

      {/* Community Rules & Legal Disclaimer Modal */}
      {legalModalTab && (
        <LegalRulesModal
          initialTab={legalModalTab}
          onClose={() => setLegalModalTab(null)}
        />
      )}

      {/* Offline Mode Indicator */}
      {!isOnline && (
        <div className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          <span>Sem ligação à internet.</span>
        </div>
      )}

      {/* Notificação Plus (Level-Up Celebration Banner) */}
      {levelUpPlusNotice && (
        <div className="fixed top-16 right-4 left-4 sm:left-auto sm:w-96 z-50 rounded-2xl bg-gradient-to-r from-[#2B174D] via-[#411B5D] to-[#581C56] border border-[#EC4899]/60 p-4 shadow-2xl flex items-start gap-3">
          <GlowingMedalIcon level={levelUpPlusNotice.level} size="md" unlocked />
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EC4899]/25 text-fuchsia-200 text-[10px] font-extrabold uppercase tracking-wider mb-1">
              <Sparkles size={11} /> Notificação Plus
            </div>
            <h4 className="text-sm font-display font-extrabold text-white">
              Subiste para o Nível {levelUpPlusNotice.level}!
            </h4>
            <p className="text-xs text-purple-100 mt-0.5 leading-snug">
              Evoluíste do Nível {levelUpPlusNotice.previousLevel} para{' '}
              <strong>{levelUpPlusNotice.medalName}</strong> ({levelUpPlusNotice.points.toLocaleString('pt-PT')} Vibba Points).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLevelUpPlusNotice(null)}
            aria-label="Fechar Notificação Plus"
            className="text-purple-200 hover:text-white shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Vibba Points Live Activity Toast */}
      {pointsToast && !levelUpPlusNotice && (
        <div className="fixed bottom-16 md:bottom-5 right-4 z-50 flex items-center gap-2.5 rounded-xl bg-[#242526] border border-[#7C3AED]/60 px-3.5 py-2.5 text-xs shadow-2xl">
          <GlowingMedalIcon level={pointsToast.level} size="sm" unlocked />
          <div>
            <div className="font-bold text-white tabular-nums">
              +{pointsToast.delta} Vibba Points
            </div>
            <div className="text-[11px] text-[#B0B3B8]">
              {pointsToast.reason} · Medalha {getActivityMedalTier(pointsToast.level).medalName}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Full Menu Sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end md:hidden">
          <div className="w-72 bg-[#242526] border-l border-[#3E4042] h-full p-4 space-y-2.5 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#3E4042]">
                <div className="flex items-center gap-2">
                <img
                  src="/vibba-icon.png"
                  alt="Vibba"
                  className="w-7 h-7 rounded-full object-contain shrink-0"
                />
                <span className="font-display font-bold text-[#E4E6EB]">
                  Menu
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-[#3A3B3C] text-white flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <ThemeToggle
              theme={theme}
              onToggle={toggleTheme}
              variant="drawer"
            />

            {!isInstalledPwa && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void handleDownloadApp();
                }}
                className="w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-sm font-bold bg-[#31A24C] text-white"
              >
                <Download size={18} />
                <span>Baixar Fora do Chrome</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setShareModalOpen(true);
              }}
              className="w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-sm font-bold bg-[#1877F2] text-white"
            >
              <Share2 size={18} />
              <span>Partilhar App</span>
            </button>

            {currentUser.isOwner && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('owner');
                  setMobileMenuOpen(false);
                }}
                className="w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-sm font-bold bg-[#263951] border border-[#1877F2] text-[#4599FF]"
              >
                <ShieldCheck size={18} />
                <span>Painel do Proprietário</span>
              </button>
            )}

            {(
              [
                { id: 'profile', label: 'O teu Perfil', icon: <User size={18} /> },
                { id: 'ranking', label: 'Top 10 & Ranking (200)', icon: <Trophy size={18} className="text-[#F7B928]" /> },
                { id: 'messenger', label: 'Messenger', icon: <MessageCircle size={18} /> },
                {
                  id: 'friends',
                  label: currentUser.isOwner || currentUser.professionalMode ? 'Pessoas & Seguidores' : 'Amigos',
                  icon: <Users size={18} />,
                },
                { id: 'groups', label: 'Grupos', icon: <UsersRound size={18} /> },
                { id: 'marketplace', label: 'Marketplace', icon: <ShoppingBag size={18} /> },
                { id: 'watch', label: 'Watch (Vídeos & Áudio)', icon: <Headphones size={18} /> },
                { id: 'events', label: 'Eventos', icon: <Calendar size={18} /> },
                { id: 'pages', label: 'Páginas', icon: <Flag size={18} /> },
                { id: 'saved', label: 'Guardados', icon: <Bookmark size={18} /> },
              ] as Array<{ id: AppTab; label: string; icon: React.ReactNode }>
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-sm font-medium ${
                  activeTab === item.id
                    ? 'bg-[#263951] text-[#4599FF] font-bold'
                    : 'bg-[#3A3B3C] text-[#E4E6EB]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setLegalModalTab('rules');
              }}
              className="w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-sm font-medium bg-[#3A3B3C] text-[#E4E6EB]"
            >
              <Scale size={18} className="text-amber-400" />
              <span>Regras &amp; Aviso Legal</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-sm font-bold bg-rose-500/15 text-rose-400"
            >
              <LogOut size={18} />
              <span>Terminar sessão</span>
            </button>
          </div>
        </div>
      )}

      {/* Facebook-style Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Barra móvel"
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#242526]/95 backdrop-blur-md border-t border-[#3E4042] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-14">
          {(
            [
              { id: 'feed', label: 'Início', icon: <Home size={20} /> },
              {
                id: 'friends',
                label: currentUser.isOwner || currentUser.professionalMode ? 'Pessoas' : 'Amigos',
                icon: <Users size={20} />,
                badge: currentUser.isOwner || currentUser.professionalMode ? 0 : currentUser.incomingRequestIds.length,
              },
              { id: 'watch', label: 'Watch', icon: <PlaySquare size={20} /> },
              { id: 'profile', label: 'Perfil', icon: <User size={20} /> },
            ] as Array<{
              id: AppTab;
              label: string;
              icon: React.ReactNode;
              badge?: number;
            }>
          ).map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab(item.id);
                }}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors border-t-2 ${
                  active
                    ? 'text-[#1877F2] border-[#1877F2]'
                    : 'text-[#B0B3B8] border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="absolute top-1.5 right-4 min-w-[16px] h-4 px-1 rounded-full bg-[#E41E3F] text-white text-[9px] font-bold tabular-nums flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold border-t-2 ${
              mobileMenuOpen
                ? 'text-[#1877F2] border-[#1877F2]'
                : 'text-[#B0B3B8] border-transparent'
            }`}
          >
            <Menu size={20} />
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
