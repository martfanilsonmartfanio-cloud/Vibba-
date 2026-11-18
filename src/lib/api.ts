import {
  CommunityMember,
  GlobalSearchResults,
  LeaderboardResponse,
  MarketplaceListing,
  MessengerConversation,
  MessengerMessage,
  MusicTrackInfo,
  OwnerOverview,
  PostBackground,
  PostPrivacy,
  PostReportReason,
  ReactionType,
  UserProfile,
  VibbaEvent,
  VibbaGroup,
  VibbaNotification,
  VibbaPage,
  VibbaPost,
  VibbaStory,
} from '../types/vibba';

const TOKEN_STORAGE_KEY = 'vibba_auth_token_v1';
const SNAPSHOT_STORAGE_KEY = 'vibba_device_snapshot_v1';

export interface DeviceRecoverySnapshot {
  user: UserProfile;
  ownPosts: VibbaPost[];
  savedAt: number;
}

export interface AppLinksInfo {
  publicUrl: string;
  shortUrl: string;
  customDomain: string;
  activeShareUrl: string;
}

export interface ApkStatusInfo {
  apkAvailable: boolean;
  canAutoBuildApk: boolean;
  isPreviewAuthGated: boolean;
  targetOrigin: string;
  apkSizeBytes: number;
}

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage issues
  }
}

const LEGACY_COIN_FIELD_KEYS = [
  'coins',
  'vibbaCoins',
  'wallet',
  'balance',
  'coinsBalance',
  'earnings',
  'isFounder',
];

function stripLegacyCoinFromUser(user: UserProfile): UserProfile {
  const rec = { ...(user as unknown as Record<string, unknown>) };
  for (const key of LEGACY_COIN_FIELD_KEYS) {
    delete rec[key];
  }
  return rec as unknown as UserProfile;
}

export function purgeLegacyClientState(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (
        k &&
        k !== TOKEN_STORAGE_KEY &&
        k !== SNAPSHOT_STORAGE_KEY &&
        /coin|wallet|paypay|balance|withdraw|founder/i.test(k)
      ) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }

    const rawSnap = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (rawSnap) {
      const parsed = JSON.parse(rawSnap) as Record<string, unknown>;
      let dirty = false;
      for (const k of LEGACY_COIN_FIELD_KEYS) {
        if (k in parsed) {
          delete parsed[k];
          dirty = true;
        }
      }
      if (parsed.user && typeof parsed.user === 'object') {
        const userObj = parsed.user as Record<string, unknown>;
        for (const k of LEGACY_COIN_FIELD_KEYS) {
          if (k in userObj) {
            delete userObj[k];
            dirty = true;
          }
        }
      }
      if (dirty) {
        window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(parsed));
      }
    }
  } catch {
    // Ignore localStorage access restrictions
  }

  try {
    if ('caches' in window) {
      void window.caches.keys().then((cacheNames) => {
        for (const name of cacheNames) {
          if (
            !name.includes('vibba-v8-clean') &&
            !name.includes('google-fonts') &&
            !name.includes('gstatic-fonts')
          ) {
            void window.caches.delete(name);
          }
        }
      });
    }
  } catch {
    // Ignore CacheStorage access issues
  }
}

export function getStoredSnapshot(): DeviceRecoverySnapshot | null {
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeviceRecoverySnapshot;
    if (!parsed?.user?.email) return null;
    return {
      ...parsed,
      user: stripLegacyCoinFromUser(parsed.user),
    };
  } catch {
    return null;
  }
}

export function saveDeviceSnapshot(snapshot: DeviceRecoverySnapshot): void {
  const cleanSnapshot: DeviceRecoverySnapshot = {
    ...snapshot,
    user: stripLegacyCoinFromUser(snapshot.user),
  };
  try {
    window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(cleanSnapshot));
  } catch {
    try {
      const compact: DeviceRecoverySnapshot = {
        ...cleanSnapshot,
        user: {
          ...cleanSnapshot.user,
          avatarUrl:
            cleanSnapshot.user.avatarUrl.length < 120_000
              ? cleanSnapshot.user.avatarUrl
              : '',
          coverUrl:
            cleanSnapshot.user.coverUrl.length < 120_000
              ? cleanSnapshot.user.coverUrl
              : '',
        },
        ownPosts: cleanSnapshot.ownPosts.slice(0, 30).map((p) => ({
          ...p,
          imageUrl:
            p.imageUrl && p.imageUrl.length < 80_000 ? p.imageUrl : undefined,
          audioUrl:
            p.audioUrl && p.audioUrl.length < 80_000 ? p.audioUrl : undefined,
        })),
      };
      window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // Ignore storage failure
    }
  }
}

export function clearDeviceSnapshot(): void {
  try {
    window.localStorage.removeItem(SNAPSHOT_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const authToken = token !== undefined ? token : getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError(
      'Sem ligação ao servidor neste momento. A tentar manter os teus dados locais.',
      0,
      'NETWORK_ERROR'
    );
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  };

  if (!res.ok) {
    const code =
      data.code || (res.status >= 500 ? 'SERVER_UNAVAILABLE' : undefined);
    throw new ApiError(
      data.error || 'Ocorreu um erro ao comunicar com o servidor.',
      res.status,
      code
    );
  }

  return data as T;
}

export const vibbaApi = {
  getHealth(): Promise<{
    ok: boolean;
    version?: string;
    registeredUsers: number;
    totalPosts: number;
  }> {
    return request('/api/health');
  },

  sendPhoneCode(payload: {
    phone: string;
    email?: string;
    handle?: string;
  }): Promise<{
    ok: boolean;
    phone: string;
    maskedPhone: string;
    expiresAt: number;
    expiresInSeconds: number;
    deliveryMode: 'sms' | 'device_notification';
    smsNotification?: {
      sender: string;
      recipient: string;
      body: string;
      expiresAt: number;
    };
  }> {
    return request('/api/auth/send-phone-code', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  register(payload: {
    name: string;
    handle: string;
    email?: string;
    phone?: string;
    birthDate?: string;
    phoneCode?: string;
    ageGroup?: 'teen' | 'adult';
    acceptedRules: boolean;
    password: string;
    location: string;
    bio?: string;
    recoveryQuestion?: string;
    recoveryAnswer?: string;
  }): Promise<{ token: string; user: UserProfile }> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login(payload: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: UserProfile }> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  forgotPassword(identifier: string): Promise<{
    ok: boolean;
    maskedEmail: string;
    mode: 'security_question' | 'identity_verify';
    recoveryQuestion: string;
    hasActiveCode: boolean;
  }> {
    return request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  resetPassword(payload: {
    identifier: string;
    recoveryAnswer?: string;
    handleCheck?: string;
    nameCheck?: string;
    resetCode?: string;
    newPassword: string;
    newRecoveryQuestion?: string;
    newRecoveryAnswer?: string;
  }): Promise<{ token: string; user: UserProfile }> {
    return request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ ok: boolean }> {
    return request('/api/auth/password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updateRecoveryQuestion(payload: {
    recoveryQuestion: string;
    recoveryAnswer: string;
  }): Promise<{ user: UserProfile }> {
    return request('/api/auth/recovery', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getMe(token?: string): Promise<{ user: UserProfile }> {
    return request('/api/auth/me', {}, token);
  },

  restoreSession(
    token: string,
    snapshot: DeviceRecoverySnapshot
  ): Promise<{ token: string; user: UserProfile }> {
    return request(
      '/api/auth/restore-session',
      {
        method: 'POST',
        body: JSON.stringify(snapshot),
      },
      token
    );
  },

  updateProfile(payload: {
    name?: string;
    bio?: string;
    location?: string;
    hometown?: string;
    work?: string;
    education?: string;
    relationship?: string;
    website?: string;
    avatarUrl?: string;
    coverUrl?: string;
    professionalCategory?: string;
  }): Promise<{ user: UserProfile }> {
    return request('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  toggleProfessionalMode(payload: {
    enabled: boolean;
    category?: string;
  }): Promise<{ user: UserProfile; convertedFriendsCount?: number }> {
    return request('/api/profile/professional-mode', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getLeaderboard(limit = 200): Promise<LeaderboardResponse> {
    return request(`/api/leaderboard?limit=${encodeURIComponent(String(limit))}`);
  },

  getUsers(query = ''): Promise<{ users: CommunityMember[] }> {
    const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
    return request(`/api/users${qs}`);
  },

  followUser(userId: string): Promise<{ following: boolean; user: UserProfile }> {
    return request(`/api/users/${userId}/follow`, { method: 'POST' });
  },

  sendFriendRequest(userId: string): Promise<{
    status: 'outgoing_request' | 'none' | 'friends';
    user: UserProfile;
  }> {
    return request(`/api/friends/request/${userId}`, { method: 'POST' });
  },

  respondFriendRequest(
    userId: string,
    action: 'accept' | 'decline'
  ): Promise<{ accepted: boolean; user: UserProfile }> {
    return request(`/api/friends/respond/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  removeFriend(userId: string): Promise<{ user: UserProfile }> {
    return request(`/api/friends/${userId}`, { method: 'DELETE' });
  },

  getMusicStore(): Promise<{ tracks: MusicTrackInfo[] }> {
    return request('/api/music-store');
  },

  getStories(): Promise<{ stories: VibbaStory[] }> {
    return request('/api/stories');
  },

  createStory(payload: {
    text: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    audioDurationSec?: number;
    musicTrackId?: string;
    bgVariant: 'royal' | 'gold' | 'plum';
  }): Promise<{ storyId: string }> {
    return request('/api/stories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  viewStory(storyId: string): Promise<{ ok: boolean }> {
    return request(`/api/stories/${storyId}/view`, { method: 'POST' });
  },

  deleteStory(storyId: string): Promise<{ ok: boolean }> {
    return request(`/api/stories/${storyId}`, { method: 'DELETE' });
  },

  getNotifications(): Promise<{
    notifications: VibbaNotification[];
    unreadCount: number;
  }> {
    return request('/api/notifications');
  },

  markNotificationsRead(): Promise<{ ok: boolean }> {
    return request('/api/notifications/read-all', { method: 'POST' });
  },

  getPosts(opts?: {
    groupId?: string;
    pageId?: string;
  }): Promise<{ posts: VibbaPost[] }> {
    const params = new URLSearchParams();
    if (opts?.groupId) params.set('groupId', opts.groupId);
    if (opts?.pageId) params.set('pageId', opts.pageId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/posts${qs}`);
  },

  async uploadMediaFile(
    file: File | Blob,
    extHint = ''
  ): Promise<{ url: string }> {
    const token = getStoredToken();
    const ext =
      extHint ||
      (file instanceof File && file.name.includes('.')
        ? file.name.split('.').pop()?.toLowerCase() || ''
        : '');
    const qs = ext ? `?ext=${encodeURIComponent(ext)}` : '';
    const headers: Record<string, string> = {
      'Content-Type': file.type || 'application/octet-stream',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api/media/upload${qs}`, {
      method: 'POST',
      headers,
      body: file,
    });
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (!res.ok || !data.url) {
      throw new ApiError(
        data.error || 'Falha ao carregar o ficheiro de média.',
        res.status
      );
    }
    return { url: data.url };
  },

  async createPost(payload: {
    content: string;
    location: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    audioDurationSec?: number;
    musicTrackId?: string;
    privacy?: PostPrivacy;
    feeling?: string;
    bgStyle?: PostBackground;
    pollOptions?: string[];
    groupId?: string;
    pageId?: string;
  }): Promise<{ post: VibbaPost; vibbaPointsDelta?: number; user?: UserProfile }> {
    const res = await request<{
      post: VibbaPost;
      vibbaPointsDelta?: number;
      user?: UserProfile;
    }>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.user) {
      window.dispatchEvent(
        new CustomEvent('vibba:points-updated', {
          detail: {
            user: res.user,
            delta: res.vibbaPointsDelta || 0,
            reason: 'Nova publicação',
          },
        })
      );
    }
    return res;
  },

  editPost(
    postId: string,
    payload: {
      content: string;
      privacy?: PostPrivacy;
      feeling?: string;
      location?: string;
    }
  ): Promise<{ post: VibbaPost }> {
    return request(`/api/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deletePost(postId: string): Promise<{ ok: boolean }> {
    return request(`/api/posts/${postId}`, { method: 'DELETE' });
  },

  reportPost(
    postId: string,
    payload: { reason: PostReportReason; details?: string }
  ): Promise<{ ok: boolean; alreadyReported?: boolean }> {
    return request(`/api/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async reactPost(
    postId: string,
    reaction: ReactionType
  ): Promise<{ post: VibbaPost; vibbaPointsDelta?: number; user?: UserProfile }> {
    const res = await request<{
      post: VibbaPost;
      vibbaPointsDelta?: number;
      user?: UserProfile;
    }>(`/api/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction }),
    });
    if (res.user) {
      window.dispatchEvent(
        new CustomEvent('vibba:points-updated', {
          detail: {
            user: res.user,
            delta: res.vibbaPointsDelta || 0,
            reason: 'Reacção em publicação',
          },
        })
      );
    }
    return res;
  },

  votePoll(postId: string, optionId: string): Promise<{ post: VibbaPost }> {
    return request(`/api/posts/${postId}/poll/${optionId}`, { method: 'POST' });
  },

  savePost(postId: string): Promise<{ post: VibbaPost }> {
    return request(`/api/posts/${postId}/save`, { method: 'POST' });
  },

  async sharePost(
    postId: string,
    note = ''
  ): Promise<{ post: VibbaPost; vibbaPointsDelta?: number; user?: UserProfile }> {
    const res = await request<{
      post: VibbaPost;
      vibbaPointsDelta?: number;
      user?: UserProfile;
    }>(`/api/posts/${postId}/share`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
    if (res.user) {
      window.dispatchEvent(
        new CustomEvent('vibba:points-updated', {
          detail: {
            user: res.user,
            delta: res.vibbaPointsDelta || 0,
            reason: 'Partilha de publicação',
          },
        })
      );
    }
    return res;
  },

  async addComment(
    postId: string,
    payload: {
      text?: string;
      audioUrl?: string;
      audioDurationSec?: number;
      parentCommentId?: string;
    }
  ): Promise<{ post: VibbaPost; vibbaPointsDelta?: number; user?: UserProfile }> {
    const res = await request<{
      post: VibbaPost;
      vibbaPointsDelta?: number;
      user?: UserProfile;
    }>(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.user) {
      window.dispatchEvent(
        new CustomEvent('vibba:points-updated', {
          detail: {
            user: res.user,
            delta: res.vibbaPointsDelta || 0,
            reason: 'Comentário',
          },
        })
      );
    }
    return res;
  },

  async toggleCommentLike(
    postId: string,
    commentId: string
  ): Promise<{ post: VibbaPost; vibbaPointsDelta?: number; user?: UserProfile }> {
    const res = await request<{
      post: VibbaPost;
      vibbaPointsDelta?: number;
      user?: UserProfile;
    }>(`/api/posts/${postId}/comments/${commentId}/like`, {
      method: 'POST',
    });
    if (res.user) {
      window.dispatchEvent(
        new CustomEvent('vibba:points-updated', {
          detail: {
            user: res.user,
            delta: res.vibbaPointsDelta || 0,
            reason: 'Curtida em comentário',
          },
        })
      );
    }
    return res;
  },

  // Messenger
  getConversations(): Promise<{
    conversations: MessengerConversation[];
    totalUnread: number;
  }> {
    return request('/api/messages/conversations');
  },

  getMessages(peerId: string): Promise<{
    peer: CommunityMember;
    messages: MessengerMessage[];
  }> {
    return request(`/api/messages/${peerId}`);
  },

  sendMessage(
    peerId: string,
    payload: {
      text?: string;
      imageUrl?: string;
      audioUrl?: string;
      audioDurationSec?: number;
      listingTitle?: string;
    }
  ): Promise<{ message: MessengerMessage }> {
    return request(`/api/messages/${peerId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  markConversationRead(peerId: string): Promise<{ ok: boolean }> {
    return request(`/api/messages/${peerId}/read`, { method: 'POST' });
  },

  // Groups
  getGroups(): Promise<{ groups: VibbaGroup[] }> {
    return request('/api/groups');
  },

  createGroup(payload: {
    name: string;
    description: string;
    category: string;
    privacy: 'public' | 'private';
    coverUrl?: string;
  }): Promise<{ group: VibbaGroup }> {
    return request('/api/groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  toggleJoinGroup(groupId: string): Promise<{ group: VibbaGroup }> {
    return request(`/api/groups/${groupId}/join`, { method: 'POST' });
  },

  // Marketplace
  getListings(query = '', category = ''): Promise<{ listings: MarketplaceListing[] }> {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category.trim()) params.set('category', category.trim());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/marketplace${qs}`);
  },

  createListing(payload: {
    title: string;
    priceKz: number;
    category: string;
    condition: 'Novo' | 'Como novo' | 'Usado';
    location: string;
    description: string;
    imageUrl?: string;
  }): Promise<{ listing: MarketplaceListing }> {
    return request('/api/marketplace', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  toggleListingSold(listingId: string): Promise<{ listing: MarketplaceListing }> {
    return request(`/api/marketplace/${listingId}`, { method: 'PATCH' });
  },

  deleteListing(listingId: string): Promise<{ ok: boolean }> {
    return request(`/api/marketplace/${listingId}`, { method: 'DELETE' });
  },

  // Events
  getEvents(): Promise<{ events: VibbaEvent[] }> {
    return request('/api/events');
  },

  createEvent(payload: {
    title: string;
    description: string;
    location: string;
    dateIso: string;
    coverUrl?: string;
  }): Promise<{ event: VibbaEvent }> {
    return request('/api/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  rsvpEvent(
    eventId: string,
    status: 'going' | 'interested'
  ): Promise<{ event: VibbaEvent }> {
    return request(`/api/events/${eventId}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  // Pages
  getPages(): Promise<{ pages: VibbaPage[] }> {
    return request('/api/pages');
  },

  createPage(payload: {
    name: string;
    category: string;
    bio: string;
    avatarUrl?: string;
    coverUrl?: string;
  }): Promise<{ page: VibbaPage }> {
    return request('/api/pages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  toggleFollowPage(pageId: string): Promise<{ page: VibbaPage }> {
    return request(`/api/pages/${pageId}/follow`, { method: 'POST' });
  },

  // Global search
  globalSearch(q: string): Promise<GlobalSearchResults> {
    return request(`/api/search?q=${encodeURIComponent(q.trim())}`);
  },

  deleteGroup(groupId: string): Promise<{ ok: boolean }> {
    return request(`/api/groups/${groupId}`, { method: 'DELETE' });
  },

  deletePage(pageId: string): Promise<{ ok: boolean }> {
    return request(`/api/pages/${pageId}`, { method: 'DELETE' });
  },

  deleteEvent(eventId: string): Promise<{ ok: boolean }> {
    return request(`/api/events/${eventId}`, { method: 'DELETE' });
  },

  deleteComment(postId: string, commentId: string): Promise<{ post: VibbaPost }> {
    return request(`/api/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
  },

  // Owner Control Center (martfanilsonmartfanio@gmail.com)
  getOwnerOverview(): Promise<OwnerOverview> {
    return request('/api/owner/overview');
  },

  updateOwnerUser(
    userId: string,
    payload: { verified?: boolean; suspended?: boolean }
  ): Promise<{ ok: boolean; verified: boolean; suspended: boolean }> {
    return request(`/api/owner/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteOwnerUser(userId: string): Promise<{ ok: boolean }> {
    return request(`/api/owner/users/${userId}`, { method: 'DELETE' });
  },

  generateOwnerResetCode(userId: string): Promise<{
    code: string;
    expiresAt: number;
    userName: string;
    email: string;
  }> {
    return request(`/api/owner/users/${userId}/reset-code`, {
      method: 'POST',
    });
  },

  resolveOwnerReport(
    reportId: string,
    status: 'open' | 'resolved'
  ): Promise<{ ok: boolean }> {
    return request(`/api/owner/reports/${reportId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  getAppLinks(): Promise<AppLinksInfo> {
    return request('/api/app-links');
  },

  getApkStatus(): Promise<ApkStatusInfo> {
    return request('/api/apk-status');
  },

  async uploadOwnerApk(file: File): Promise<{ ok: boolean; apkSizeBytes: number }> {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/vnd.android.package-archive',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('/api/owner/apk', {
      method: 'POST',
      headers,
      body: file,
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      apkSizeBytes?: number;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      throw new ApiError(
        data.error || 'Não foi possível carregar o ficheiro .APK.',
        res.status
      );
    }
    return { ok: true, apkSizeBytes: data.apkSizeBytes || 0 };
  },

  generateOwnerShortLink(alias?: string): Promise<AppLinksInfo> {
    return request('/api/owner/short-link', {
      method: 'POST',
      body: JSON.stringify({ alias: alias || '' }),
    });
  },

  saveOwnerCustomDomain(customDomain: string): Promise<AppLinksInfo> {
    return request('/api/owner/custom-domain', {
      method: 'POST',
      body: JSON.stringify({ customDomain }),
    });
  },
};

export async function compressImageFile(file: File, maxDim = 960): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecciona um ficheiro de imagem válido (JPG, PNG ou WebP).');
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('A imagem é demasiado grande (máximo 25 MB).');
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Formato de imagem não suportado neste aparelho. Usa JPG ou PNG.'));
    };

    img.onload = () => {
      try {
        const maxSide = Math.max(img.width || 1, img.height || 1);
        const scale = Math.min(1, maxDim / maxSide);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let result = canvas.toDataURL('image/jpeg', 0.8);
        if (result.length > 1_400_000) {
          result = canvas.toDataURL('image/jpeg', 0.62);
        }
        if (result.length > 1_400_000) {
          result = canvas.toDataURL('image/jpeg', 0.45);
        }
        resolve(result);
      } catch {
        reject(new Error('Erro ao comprimir a imagem. Tenta outra foto.'));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.src = objectUrl;
  });
}

export async function readAudioBlobAsDataUrl(blob: Blob): Promise<string> {
  if (blob.size > 3_600_000) {
    throw new Error('O áudio é demasiado grande (máximo ~3.5 MB). Grava um áudio mais curto.');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao processar o áudio gravado.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      if (!result.startsWith('data:audio/') && !result.startsWith('data:video/')) {
        reject(new Error('Formato de áudio inválido.'));
        return;
      }
      resolve(result);
    };
    reader.readAsDataURL(blob);
  });
}
