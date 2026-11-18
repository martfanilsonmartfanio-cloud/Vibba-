import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { WebSocket, WebSocketServer } from 'ws';

dotenv.config();

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const APK_DIR = path.join(DATA_DIR, 'apk');
const APK_FILE_PATH = path.join(APK_DIR, 'Vibba-v8.1.0.apk');
const DB_PATH = path.join(DATA_DIR, 'vibba-db.json');
const SECRET_PATH = path.join(DATA_DIR, '.vibba-secret');
const OWNER_EMAIL = 'martfanilsonmartfanio@gmail.com';
const RAW_APP_URL =
  process.env.APP_URL ||
  'https://ais-pre-e26llcpt2qnnr6bgusbykt-386755117841.europe-west2.run.app';
const OFFICIAL_PUBLIC_URL = RAW_APP_URL.replace('://ais-dev-', '://ais-pre-');

function isOwnerEmail(email?: string): boolean {
  return (email || '').trim().toLowerCase() === OWNER_EMAIL;
}

interface MusicTrackCatalogItem {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  durationSec: number;
  mood: string;
  license: string;
  accentColor: string;
}

const GLOBAL_MUSIC_CATALOG: MusicTrackCatalogItem[] = [
  {
    id: 'vibba-afrobeat-luanda',
    title: 'Brisa da Marginal',
    artist: 'Vibba Studio',
    genre: 'Afro-Beat',
    bpm: 104,
    durationSec: 12,
    mood: 'Vibrante',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#1877F2',
  },
  {
    id: 'vibba-kuduro-rua',
    title: 'Batida Kuduro Talatona',
    artist: 'Vibba Studio',
    genre: 'Kuduro',
    bpm: 132,
    durationSec: 10,
    mood: 'Energia',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#F3425F',
  },
  {
    id: 'vibba-trap-freestyle',
    title: 'Freestyle 808 Luanda',
    artist: 'Vibba Beats',
    genre: 'Trap / Rap',
    bpm: 120,
    durationSec: 12,
    mood: 'Freestyle',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#7C3AED',
  },
  {
    id: 'vibba-kizomba-noite',
    title: 'Noite Suave (Kizomba)',
    artist: 'Vibba Studio',
    genre: 'Kizomba',
    bpm: 92,
    durationSec: 12,
    mood: 'Romântico',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#EC4899',
  },
  {
    id: 'vibba-semba-raiz',
    title: 'Alegria do Semba',
    artist: 'Vibba Studio',
    genre: 'Semba',
    bpm: 112,
    durationSec: 12,
    mood: 'Alegre',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#F7B928',
  },
  {
    id: 'vibba-amapiano-sul',
    title: 'Log-Drum Groove',
    artist: 'Vibba Beats',
    genre: 'Amapiano',
    bpm: 114,
    durationSec: 12,
    mood: 'Groove',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#10B981',
  },
  {
    id: 'vibba-lofi-desabafo',
    title: 'Rádio de Bairro Lo-Fi',
    artist: 'Vibba Studio',
    genre: 'Lo-Fi Chill',
    bpm: 84,
    durationSec: 14,
    mood: 'Calmo',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#06B6D4',
  },
  {
    id: 'vibba-gospel-luz',
    title: 'Amanhecer Acústico',
    artist: 'Vibba Studio',
    genre: 'Acústico',
    bpm: 88,
    durationSec: 14,
    mood: 'Inspirador',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#F59E0B',
  },
];

function findMusicTrackById(trackId?: string | null): MusicTrackCatalogItem | null {
  if (!trackId) return null;
  const clean = String(trackId).trim();
  return GLOBAL_MUSIC_CATALOG.find((t) => t.id === clean) || null;
}

type ReactionType =
  | 'like'
  | 'love'
  | 'care'
  | 'haha'
  | 'wow'
  | 'sad'
  | 'angry';

type PostPrivacy = 'public' | 'friends' | 'only_me';
type PostBackground =
  | 'none'
  | 'royal'
  | 'sunset'
  | 'ocean'
  | 'emerald'
  | 'crimson';

interface DbUser {
  id: string;
  name: string;
  handle: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  bio: string;
  location: string;
  hometown?: string;
  work?: string;
  education?: string;
  relationship?: string;
  website?: string;
  avatarUrl: string;
  coverUrl?: string;
  followingIds?: string[];
  friendIds?: string[];
  incomingRequestIds?: string[];
  outgoingRequestIds?: string[];
  verified?: boolean;
  suspended?: boolean;
  recoveryQuestion?: string;
  recoverySalt?: string;
  recoveryAnswerHash?: string;
  resetCodeHash?: string;
  resetCodeExpiresAt?: number;
  vibbaPoints?: number;
  vibbaPointsBreakdown?: {
    reactions: number;
    comments: number;
    shares: number;
    posts: number;
    received: number;
  };
  dailyPointsTracker?: {
    date: string;
    total: number;
    posts: number;
    comments: number;
    reactions: number;
    shares: number;
    received: number;
  };
  phone?: string;
  birthDate?: string;
  isAdultVerified?: boolean;
  professionalMode?: boolean;
  professionalCategory?: string;
  professionalModeActivatedAt?: number;
  createdAt: number;
}

interface DbCommentReply {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  text: string;
  audioUrl?: string;
  audioDurationSec?: number;
  createdAt: number;
}

interface DbComment {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  text: string;
  audioUrl?: string;
  audioDurationSec?: number;
  likedByIds?: string[];
  replies?: DbCommentReply[];
  createdAt: number;
}

interface DbPollOption {
  id: string;
  text: string;
  voterIds: string[];
}

interface DbSharedPostSnapshot {
  originalPostId: string;
  authorName: string;
  authorHandle: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  musicTrackId?: string;
  musicTrack?: MusicTrackCatalogItem | null;
}

interface DbPost {
  id: string;
  authorId: string;
  location: string;
  privacy?: PostPrivacy;
  feeling?: string;
  bgStyle?: PostBackground;
  editedAt?: number | null;
  groupId?: string | null;
  pageId?: string | null;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  musicTrackId?: string;
  poll?: { options: DbPollOption[] } | null;
  likedByIds: string[];
  reactions?: Record<string, ReactionType>;
  savedByIds?: string[];
  sharedPost?: DbSharedPostSnapshot;
  comments: DbComment[];
  createdAt: number;
}

interface DbStory {
  id: string;
  authorId: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  musicTrackId?: string;
  bgVariant: 'royal' | 'gold' | 'plum';
  viewerIds: string[];
  createdAt: number;
  expiresAt: number;
}

interface DbNotification {
  id: string;
  userId: string;
  actorId: string;
  actorName: string;
  actorHandle: string;
  actorAvatar?: string;
  type:
    | 'reaction'
    | 'comment'
    | 'reply'
    | 'follow'
    | 'friend_request'
    | 'friend_accept'
    | 'message'
    | 'group'
    | 'event'
    | 'level_up'
    | 'report';
  message: string;
  level?: number;
  medalName?: string;
  read: boolean;
  createdAt: number;
}

type PostReportReason = 'copyright' | 'harassment' | 'scam' | 'nsfw';

interface DbReport {
  id: string;
  postId: string;
  reporterId: string;
  reason: PostReportReason;
  details: string;
  status: 'open' | 'resolved';
  createdAt: number;
}

interface DbMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  listingTitle?: string;
  readAt: number | null;
  createdAt: number;
}

interface DbGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  privacy: 'public' | 'private';
  coverUrl?: string;
  creatorId: string;
  memberIds: string[];
  createdAt: number;
}

interface DbListing {
  id: string;
  sellerId: string;
  title: string;
  priceKz: number;
  category: string;
  condition: 'Novo' | 'Como novo' | 'Usado';
  location: string;
  description: string;
  imageUrl?: string;
  status: 'available' | 'sold';
  createdAt: number;
}

interface DbEvent {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  location: string;
  dateIso: string;
  coverUrl?: string;
  goingIds: string[];
  interestedIds: string[];
  createdAt: number;
}

interface DbPage {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  bio: string;
  avatarUrl?: string;
  coverUrl?: string;
  followerIds: string[];
  createdAt: number;
}

interface DbAppConfig {
  shortUrl?: string;
  customDomain?: string;
  accountsResetAt?: number;
  updatedAt?: number;
}

interface VibbaDatabase {
  users: DbUser[];
  posts: DbPost[];
  stories: DbStory[];
  notifications: DbNotification[];
  messages: DbMessage[];
  groups: DbGroup[];
  listings: DbListing[];
  events: DbEvent[];
  pages: DbPage[];
  reports?: DbReport[];
  appConfig?: DbAppConfig;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function getAuthSecret(): string {
  if (process.env.VIBBA_AUTH_SECRET && process.env.VIBBA_AUTH_SECRET.trim()) {
    return process.env.VIBBA_AUTH_SECRET.trim();
  }
  if (fs.existsSync(SECRET_PATH)) {
    const existing = fs.readFileSync(SECRET_PATH, 'utf8').trim();
    if (existing) return existing;
  }
  const generated = crypto
    .createHash('sha256')
    .update('vibba-social-network-session-key')
    .digest('hex');
  try {
    ensureDataDir();
    fs.writeFileSync(SECRET_PATH, generated, 'utf8');
  } catch {
    // Ignore read-only fs errors
  }
  return generated;
}

const AUTH_SECRET = getAuthSecret();

function createEmptyDb(): VibbaDatabase {
  return {
    users: [],
    posts: [],
    stories: [],
    notifications: [],
    messages: [],
    groups: [],
    listings: [],
    events: [],
    pages: [],
    reports: [],
  };
}

const LEGACY_COIN_DB_KEYS = [
  'transactions',
  'coinPurchases',
  'creatorWithdrawals',
  'coins',
  'vibbaCoins',
  'wallet',
  'wallets',
  'payouts',
];

const LEGACY_COIN_USER_KEYS = [
  'coins',
  'vibbaCoins',
  'wallet',
  'balance',
  'coinsBalance',
  'earnings',
  'isFounder',
];

function stripLegacyCoinFieldsFromUser(rawUser: Record<string, unknown>): DbUser {
  const cleaned: Record<string, unknown> = { ...rawUser };
  for (const key of LEGACY_COIN_USER_KEYS) {
    delete cleaned[key];
  }
  return cleaned as unknown as DbUser;
}

function readDb(): VibbaDatabase {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    const empty = createEmptyDb();
    writeDb(empty);
    return empty;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    if (!raw.trim()) return createEmptyDb();
    const parsed = JSON.parse(raw) as Partial<VibbaDatabase> & Record<string, unknown>;
    const rawUsers = Array.isArray(parsed.users) ? parsed.users : [];
    const hadLegacyTopKeys = LEGACY_COIN_DB_KEYS.some((k) => k in parsed);
    const hadLegacyUserKeys = rawUsers.some((u) => {
      if (!u || typeof u !== 'object') return false;
      const rec = u as unknown as Record<string, unknown>;
      return LEGACY_COIN_USER_KEYS.some((k) => k in rec);
    });

    let ownerPointsUpgraded = false;
    const cleanDb: VibbaDatabase = {
      users: rawUsers.map((u) => {
        const cleaned = stripLegacyCoinFieldsFromUser(
          u as unknown as Record<string, unknown>
        );
        if (
          isOwnerEmail(cleaned.email) &&
          (typeof cleaned.vibbaPoints !== 'number' ||
            cleaned.vibbaPoints < OWNER_DEFAULT_POINTS)
        ) {
          cleaned.vibbaPoints = OWNER_DEFAULT_POINTS;
          ownerPointsUpgraded = true;
        }
        return cleaned;
      }),
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      stories: Array.isArray(parsed.stories) ? parsed.stories : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
      listings: Array.isArray(parsed.listings) ? parsed.listings : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      pages: Array.isArray(parsed.pages) ? parsed.pages : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      appConfig:
        parsed.appConfig && typeof parsed.appConfig === 'object'
          ? (parsed.appConfig as DbAppConfig)
          : undefined,
    };

    const ownerFollowersSynced = syncOwnerAutoFollowers(cleanDb);

    if (
      hadLegacyTopKeys ||
      hadLegacyUserKeys ||
      ownerPointsUpgraded ||
      ownerFollowersSynced
    ) {
      writeDb(cleanDb);
    }
    return cleanDb;
  } catch {
    return createEmptyDb();
  }
}

function syncOwnerAutoFollowers(db: VibbaDatabase): boolean {
  const owner = db.users.find((u) => isOwnerEmail(u.email));
  if (!owner) return false;
  let changed = false;

  // Owner account uses followers only (no friends or friend requests),
  // and following the owner is strictly optional per user choice.
  if ((owner.friendIds || []).length > 0) {
    owner.friendIds = [];
    changed = true;
  }
  if ((owner.incomingRequestIds || []).length > 0) {
    owner.incomingRequestIds = [];
    changed = true;
  }
  if ((owner.outgoingRequestIds || []).length > 0) {
    owner.outgoingRequestIds = [];
    changed = true;
  }

  for (const u of db.users) {
    if (u.id === owner.id) continue;
    if (!Array.isArray(u.followingIds)) {
      u.followingIds = [];
      changed = true;
    }
    if (u.friendIds?.includes(owner.id)) {
      u.friendIds = u.friendIds.filter((id) => id !== owner.id);
      changed = true;
    }
    if (u.incomingRequestIds?.includes(owner.id)) {
      u.incomingRequestIds = u.incomingRequestIds.filter((id) => id !== owner.id);
      changed = true;
    }
    if (u.outgoingRequestIds?.includes(owner.id)) {
      u.outgoingRequestIds = u.outgoingRequestIds.filter((id) => id !== owner.id);
      changed = true;
    }
  }
  return changed;
}

function writeDb(db: VibbaDatabase) {
  ensureDataDir();
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

const PHONE_OTP_TTL_MS = 5 * 60 * 1000;
const PROFESSIONAL_CATEGORIES = [
  'Criador Digital',
  'Artista / Músico',
  'Empreendedor',
  'Educador',
  'Comércio Local',
  'Desporto',
  'Humor & Entretenimento',
  'Figura Pública',
  'Produtor de Vídeo',
] as const;

interface PendingPhoneOtp {
  phone: string;
  codeHash: string;
  salt: string;
  expiresAt: number;
  createdAt: number;
  attempts: number;
}

const pendingPhoneOtps = new Map<string, PendingPhoneOtp>();

function normalizePhoneNumber(raw: string): string {
  const stripped = (raw || '').replace(/[\s().-]/g, '').trim();
  if (!stripped) return '';
  let withPlus = stripped;
  if (withPlus.startsWith('00')) {
    withPlus = `+${withPlus.slice(2)}`;
  }
  const digits = withPlus.replace(/\D/g, '');
  if (!digits) return '';
  if (!withPlus.startsWith('+') && digits.length === 9 && digits.startsWith('9')) {
    return `+244${digits}`;
  }
  return `+${digits}`;
}

function isValidNormalizedPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function maskPhoneNumber(phone: string): string {
  if (phone.length <= 6) return phone;
  return `${phone.slice(0, 4)} *** ${phone.slice(-3)}`;
}

function isTrivialOtpCode(code: string): boolean {
  if (!/^\d{6}$/.test(code)) return true;
  if (/^(\d)\1{5}$/.test(code)) return true;
  const sequential = [
    '012345',
    '123456',
    '234567',
    '345678',
    '456789',
    '987654',
    '876543',
    '765432',
    '654321',
    '543210',
    '121212',
    '123123',
    '112233',
    '445566',
    '111222',
    '000111',
  ];
  if (sequential.includes(code)) return true;
  const uniqueDigits = new Set(code.split(''));
  return uniqueDigits.size < 3;
}

function generateSecureOtpCode(): string {
  for (let i = 0; i < 64; i++) {
    const candidate = String(crypto.randomInt(100000, 1000000));
    if (!isTrivialOtpCode(candidate)) {
      return candidate;
    }
  }
  return String(crypto.randomInt(203948, 987651));
}

function calculateAgeFromBirthDate(birthDate?: string): {
  valid: boolean;
  age: number | null;
  normalized: string;
} {
  const raw = (birthDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { valid: false, age: null, normalized: '' };
  }
  const [yStr, mStr, dStr] = raw.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return { valid: false, age: null, normalized: '' };
  }
  const now = new Date();
  let age = now.getUTCFullYear() - year;
  const monthDiff = now.getUTCMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < day)) {
    age--;
  }
  if (age < 13 || age > 120) {
    return { valid: false, age, normalized: raw };
  }
  return { valid: true, age, normalized: raw };
}

function isUserAdult(user: DbUser): boolean {
  if (isOwnerEmail(user.email)) return true;
  if (user.isAdultVerified) return true;
  const ageInfo = calculateAgeFromBirthDate(user.birthDate);
  return Boolean(ageInfo.valid && ageInfo.age !== null && ageInfo.age >= 18);
}

async function deliverVibbaSmsVerification(
  phone: string,
  code: string
): Promise<{ deliveryMode: 'sms' | 'device_notification'; body: string }> {
  const body = `Vibba: O teu código de verificação é ${code}. Válido por 5 minutos. Não partilhes este código.`;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  const twilioFrom = process.env.TWILIO_FROM_NUMBER?.trim() || 'Vibba';

  if (twilioSid && twilioToken && (twilioServiceSid || process.env.TWILIO_FROM_NUMBER)) {
    try {
      const form = new URLSearchParams();
      form.set('To', phone);
      form.set('Body', body);
      if (twilioServiceSid) form.set('MessagingServiceSid', twilioServiceSid);
      else form.set('From', twilioFrom);

      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilioSid)}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form.toString(),
        }
      );
      if (resp.ok) {
        return { deliveryMode: 'sms', body };
      }
    } catch {
      // Fallback below
    }
  }

  const webhookUrl = process.env.VIBBA_SMS_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'Vibba',
          to: phone,
          message: body,
          code,
          expiresInSeconds: 300,
        }),
      });
      if (resp.ok) {
        return { deliveryMode: 'sms', body };
      }
    } catch {
      // Fallback below
    }
  }

  return { deliveryMode: 'device_notification', body };
}

function signToken(userId: string, email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, email: email.toLowerCase(), iat: Date.now() })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): { uid: string; email: string; iat: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: string;
      email?: string;
      iat?: number;
    };
    if (!parsed.uid || !parsed.email) return null;
    return { uid: parsed.uid, email: parsed.email, iat: parsed.iat || 0 };
  } catch {
    return null;
  }
}

interface AuthenticatedRequest extends Request {
  authUser?: DbUser;
}

// Live WebSocket presence registry
const onlineClients = new Map<string, Set<WebSocket>>();

function isUserOnline(userId: string): boolean {
  const set = onlineClients.get(userId);
  return Boolean(set && set.size > 0);
}

function sendToUser(userId: string, event: string, payload: unknown) {
  const sockets = onlineClients.get(userId);
  if (!sockets) return;
  const data = JSON.stringify({ event, payload });
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function broadcastPresence(userId: string, online: boolean) {
  const data = JSON.stringify({ event: 'presence:update', payload: { userId, online } });
  for (const sockets of onlineClients.values()) {
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }
}

const MAX_USER_LEVEL = 150;
const MAX_USER_LEVEL_POINTS = 1_000_000;
const OWNER_ACTIVITY_LEVEL = 200;
const OWNER_MIN_POINTS = 200_000_000;
const OWNER_DEFAULT_POINTS = 200_500_000;

function getMinPointsForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 50;
  if (level === 3) return 150;
  if (level === 4) return 350;
  if (level === 5) return 700;
  if (level === 6) return 1_500;
  if (level >= OWNER_ACTIVITY_LEVEL) return OWNER_MIN_POINTS;
  if (level >= MAX_USER_LEVEL) return MAX_USER_LEVEL_POINTS;
  const t = (level - 6) / (MAX_USER_LEVEL - 6);
  return Math.round(
    1_500 + (MAX_USER_LEVEL_POINTS - 1_500) * (0.12 * t + 0.88 * t * t)
  );
}

function getRankMetadataForLevel(level: number): {
  title: string;
  medalName: string;
} {
  if (level >= OWNER_ACTIVITY_LEVEL) {
    return { title: 'Fundador Supremo', medalName: 'Coroa Suprema 200' };
  }
  if (level >= 150) {
    return { title: 'Lenda 150', medalName: 'Lenda 150' };
  }
  if (level >= 125) {
    return { title: 'Grão-Mestre', medalName: 'Grão-Mestre' };
  }
  if (level >= 100) {
    return { title: 'Embaixador', medalName: 'Embaixador' };
  }
  if (level >= 75) {
    return { title: 'Titã Vibba', medalName: 'Titã Vibba' };
  }
  if (level >= 50) {
    return { title: 'Estrela Vibba', medalName: 'Estrela Vibba' };
  }
  if (level >= 25) {
    return { title: 'Vibba Master', medalName: 'Vibba Master' };
  }
  if (level >= 10) {
    return { title: 'Influenciador', medalName: 'Influenciador' };
  }
  if (level >= 5) {
    return { title: 'Conector', medalName: 'Conector' };
  }
  if (level >= 2) {
    return { title: 'Explorador', medalName: 'Explorador' };
  }
  return { title: 'Iniciante', medalName: 'Novato' };
}

function computeActivityLevel(rawPoints?: number, isOwner = false) {
  if (isOwner) {
    const ownerPoints = Math.max(
      OWNER_DEFAULT_POINTS,
      Math.floor(rawPoints || 0)
    );
    const rank = getRankMetadataForLevel(OWNER_ACTIVITY_LEVEL);
    return {
      level: OWNER_ACTIVITY_LEVEL,
      title: rank.title,
      medalName: rank.medalName,
      points: ownerPoints,
      currentLevelMinPoints: OWNER_MIN_POINTS,
      nextLevelMinPoints: null,
      nextLevelTitle: null,
      progressPercent: 100,
    };
  }

  const points = Math.max(0, Math.floor(rawPoints || 0));
  let level = 1;
  for (let l = MAX_USER_LEVEL; l >= 1; l--) {
    if (points >= getMinPointsForLevel(l)) {
      level = l;
      break;
    }
  }

  const currentRank = getRankMetadataForLevel(level);
  const currentLevelMinPoints = getMinPointsForLevel(level);
  const nextLevel = level < MAX_USER_LEVEL ? level + 1 : null;
  const nextLevelMinPoints =
    nextLevel !== null ? getMinPointsForLevel(nextLevel) : null;
  const nextLevelTitle =
    nextLevel !== null ? getRankMetadataForLevel(nextLevel).medalName : null;

  const progressPercent =
    nextLevelMinPoints !== null && nextLevelMinPoints > currentLevelMinPoints
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((points - currentLevelMinPoints) /
                (nextLevelMinPoints - currentLevelMinPoints)) *
                100
            )
          )
        )
      : 100;

  return {
    level,
    title: currentRank.title,
    medalName: currentRank.medalName,
    points,
    currentLevelMinPoints,
    nextLevelMinPoints,
    nextLevelTitle,
    progressPercent,
  };
}

function pushLevelUpNotification(
  db: VibbaDatabase,
  target: DbUser,
  prevLevel: number,
  nextInfo: ReturnType<typeof computeActivityLevel>
) {
  const message = `Notificação Plus: Subiste do Nível ${prevLevel} para o Nível ${nextInfo.level} (${nextInfo.medalName}) com ${nextInfo.points.toLocaleString('pt-PT')} Vibba Points!`;
  const item: DbNotification = {
    id: `ntf_${crypto.randomUUID()}`,
    userId: target.id,
    actorId: target.id,
    actorName: 'Vibba Plus',
    actorHandle: '@vibbaplus',
    actorAvatar: target.avatarUrl || '',
    type: 'level_up',
    message,
    level: nextInfo.level,
    medalName: nextInfo.medalName,
    read: false,
    createdAt: Date.now(),
  };
  db.notifications.unshift(item);
  if (db.notifications.length > 500) {
    db.notifications = db.notifications.slice(0, 500);
  }
  sendToUser(target.id, 'notification:new', {
    ...item,
    createdAtLabel: 'Agora',
  });
  sendToUser(target.id, 'level:up', {
    previousLevel: prevLevel,
    level: nextInfo.level,
    title: nextInfo.title,
    medalName: nextInfo.medalName,
    points: nextInfo.points,
    message,
  });
}

const DAILY_VIBBA_CAPS: Record<
  'reactions' | 'comments' | 'shares' | 'posts' | 'received' | 'total',
  number
> = {
  posts: 50,
  comments: 60,
  reactions: 40,
  shares: 45,
  received: 120,
  total: 220,
};

function awardVibbaPoints(
  db: VibbaDatabase,
  userId: string,
  delta: number,
  category: 'reactions' | 'comments' | 'shares' | 'posts' | 'received'
): number {
  const target = db.users.find((u) => u.id === userId);
  if (!target || !delta) return 0;
  const targetIsOwner = isOwnerEmail(target.email);
  const todayKey = new Date().toISOString().slice(0, 10);

  let effectiveDelta = delta;
  if (!targetIsOwner) {
    if (
      !target.dailyPointsTracker ||
      target.dailyPointsTracker.date !== todayKey
    ) {
      target.dailyPointsTracker = {
        date: todayKey,
        total: 0,
        posts: 0,
        comments: 0,
        reactions: 0,
        shares: 0,
        received: 0,
      };
    }

    if (delta > 0) {
      const remainingCategory = Math.max(
        0,
        DAILY_VIBBA_CAPS[category] - (target.dailyPointsTracker[category] || 0)
      );
      const remainingTotal = Math.max(
        0,
        DAILY_VIBBA_CAPS.total - (target.dailyPointsTracker.total || 0)
      );
      effectiveDelta = Math.min(delta, remainingCategory, remainingTotal);
      if (effectiveDelta <= 0) {
        return 0;
      }
      target.dailyPointsTracker[category] =
        (target.dailyPointsTracker[category] || 0) + effectiveDelta;
      target.dailyPointsTracker.total =
        (target.dailyPointsTracker.total || 0) + effectiveDelta;
    } else {
      target.dailyPointsTracker[category] = Math.max(
        0,
        (target.dailyPointsTracker[category] || 0) + delta
      );
      target.dailyPointsTracker.total = Math.max(
        0,
        (target.dailyPointsTracker.total || 0) + delta
      );
    }
  }

  const prevPoints = Math.max(
    targetIsOwner ? OWNER_DEFAULT_POINTS : 0,
    Math.floor(target.vibbaPoints || 0)
  );
  const prevLevel = computeActivityLevel(prevPoints, targetIsOwner).level;
  const nextPoints = Math.max(
    targetIsOwner ? OWNER_DEFAULT_POINTS : 0,
    prevPoints + effectiveDelta
  );
  target.vibbaPoints = nextPoints;
  target.vibbaPointsBreakdown = {
    reactions: target.vibbaPointsBreakdown?.reactions || 0,
    comments: target.vibbaPointsBreakdown?.comments || 0,
    shares: target.vibbaPointsBreakdown?.shares || 0,
    posts: target.vibbaPointsBreakdown?.posts || 0,
    received: target.vibbaPointsBreakdown?.received || 0,
  };
  target.vibbaPointsBreakdown[category] = Math.max(
    0,
    target.vibbaPointsBreakdown[category] + effectiveDelta
  );

  if (effectiveDelta > 0 && !targetIsOwner) {
    const nextInfo = computeActivityLevel(nextPoints, false);
    if (nextInfo.level > prevLevel) {
      pushLevelUpNotification(db, target, prevLevel, nextInfo);
    }
  }

  return nextPoints - prevPoints;
}

function sanitizeUser(user: DbUser, db: VibbaDatabase) {
  const ownPostsCount = db.posts.filter((p) => p.authorId === user.id).length;
  const followerIds = db.users
    .filter((u) => (u.followingIds || []).includes(user.id))
    .map((u) => u.id);
  const followersCount = followerIds.length;
  const followingIds = user.followingIds || [];
  const isOwner = isOwnerEmail(user.email);
  const friendIds = isOwner ? [] : user.friendIds || [];
  const incomingRequestIds = isOwner ? [] : user.incomingRequestIds || [];
  const outgoingRequestIds = isOwner ? [] : user.outgoingRequestIds || [];
  const vibbaPoints = Math.max(
    isOwner ? OWNER_DEFAULT_POINTS : 0,
    Math.floor(user.vibbaPoints || 0)
  );
  const activityLevel = computeActivityLevel(vibbaPoints, isOwner);
  const pointsBreakdown = {
    reactions: user.vibbaPointsBreakdown?.reactions || 0,
    comments: user.vibbaPointsBreakdown?.comments || 0,
    shares: user.vibbaPointsBreakdown?.shares || 0,
    posts: user.vibbaPointsBreakdown?.posts || 0,
    received: user.vibbaPointsBreakdown?.received || 0,
  };

  const ageInfo = calculateAgeFromBirthDate(user.birthDate);
  const age = ageInfo.valid ? ageInfo.age : null;
  const isAdult = isUserAdult(user);

  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    email: user.email,
    phone: user.phone || '',
    birthDate: user.birthDate || '',
    age,
    isAdult,
    professionalMode: Boolean(user.professionalMode && isAdult),
    professionalCategory: user.professionalCategory || 'Criador Digital',
    bio: user.bio,
    location: user.location,
    hometown: user.hometown || '',
    work: user.work || '',
    education: user.education || '',
    relationship: user.relationship || '',
    website: user.website || '',
    avatarUrl: user.avatarUrl,
    coverUrl: user.coverUrl || '',
    friendsCount: friendIds.length,
    friendIds,
    incomingRequestIds,
    outgoingRequestIds,
    followerIds,
    followersCount,
    followingCount: followingIds.length,
    followingIds,
    postsCount: ownPostsCount,
    vibbaPoints,
    activityLevel,
    pointsBreakdown,
    isOwner,
    isVerified: Boolean(user.verified || isOwner),
    hasRecoveryQuestion: Boolean(user.recoveryAnswerHash),
    recoveryQuestion: user.recoveryQuestion || '',
    createdAt: user.createdAt,
  };
}

function serializeMember(u: DbUser, me: DbUser, db: VibbaDatabase) {
  const followingIds = me.followingIds || [];
  const myFriends = isOwnerEmail(me.email) ? [] : me.friendIds || [];
  const targetIsOwner = isOwnerEmail(u.email);
  const targetFriends = targetIsOwner ? [] : u.friendIds || [];
  const mutualFriendsCount = myFriends.filter((fid) =>
    targetFriends.includes(fid)
  ).length;

  let friendshipStatus:
    | 'none'
    | 'friends'
    | 'incoming_request'
    | 'outgoing_request' = 'none';
  if (!targetIsOwner && !isOwnerEmail(me.email)) {
    if (myFriends.includes(u.id)) {
      friendshipStatus = 'friends';
    } else if ((me.incomingRequestIds || []).includes(u.id)) {
      friendshipStatus = 'incoming_request';
    } else if ((me.outgoingRequestIds || []).includes(u.id)) {
      friendshipStatus = 'outgoing_request';
    }
  }

  const vibbaPoints = Math.max(
    targetIsOwner ? OWNER_DEFAULT_POINTS : 0,
    Math.floor(u.vibbaPoints || 0)
  );
  const targetIsAdult = isUserAdult(u);

  return {
    id: u.id,
    name: u.name,
    handle: u.handle,
    bio: u.bio,
    location: u.location,
    hometown: u.hometown || '',
    work: u.work || '',
    education: u.education || '',
    relationship: u.relationship || '',
    website: u.website || '',
    avatarUrl: u.avatarUrl,
    coverUrl: u.coverUrl || '',
    friendsCount: targetFriends.length,
    mutualFriendsCount,
    followersCount: db.users.filter((other) =>
      (other.followingIds || []).includes(u.id)
    ).length,
    postsCount: db.posts.filter((p) => p.authorId === u.id).length,
    vibbaPoints,
    activityLevel: computeActivityLevel(vibbaPoints, targetIsOwner),
    isFollowing: followingIds.includes(u.id),
    friendshipStatus,
    isOnline: isUserOnline(u.id),
    isOwner: targetIsOwner,
    isVerified: Boolean(u.verified || targetIsOwner),
    isAdult: targetIsAdult,
    professionalMode: Boolean(u.professionalMode && targetIsAdult),
    professionalCategory: u.professionalCategory || 'Criador Digital',
    isMe: u.id === me.id,
  };
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Agora';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `há ${diffHr} h`;
  const diffDays = Math.floor(diffHr / 24);
  return `há ${diffDays} d`;
}

function serializePost(post: DbPost, currentUserId: string, db: VibbaDatabase) {
  const author = db.users.find((u) => u.id === post.authorId);
  const group = post.groupId
    ? db.groups.find((g) => g.id === post.groupId)
    : undefined;
  const page = post.pageId
    ? db.pages.find((pg) => pg.id === post.pageId)
    : undefined;

  const reactionsMap: Record<string, ReactionType> = { ...(post.reactions || {}) };
  for (const uid of post.likedByIds || []) {
    if (!reactionsMap[uid]) reactionsMap[uid] = 'like';
  }
  const reactionCounts: Record<ReactionType, number> = {
    like: 0,
    love: 0,
    care: 0,
    haha: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  };
  for (const type of Object.values(reactionsMap)) {
    if (type in reactionCounts) {
      reactionCounts[type] = (reactionCounts[type] || 0) + 1;
    } else {
      reactionCounts.like += 1;
    }
  }
  const totalReactions = Object.keys(reactionsMap).length;
  const myReaction = reactionsMap[currentUserId] || null;
  const savedByIds = post.savedByIds || [];
  const commentsList = Array.isArray(post.comments) ? post.comments : [];

  const serializedPoll = post.poll?.options?.length
    ? {
        options: post.poll.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          votesCount: opt.voterIds.length,
          votedByMe: opt.voterIds.includes(currentUserId),
        })),
        totalVotes: post.poll.options.reduce(
          (sum, opt) => sum + opt.voterIds.length,
          0
        ),
      }
    : null;

  const authorLevelInfo = author
    ? computeActivityLevel(author.vibbaPoints, isOwnerEmail(author.email))
    : null;

  return {
    id: post.id,
    authorId: post.authorId,
    authorName: page ? page.name : author?.name || 'Utilizador Vibba',
    authorHandle: page ? `@pagina · ${author?.name || ''}` : author?.handle || '@vibba',
    authorAvatar: page?.avatarUrl || author?.avatarUrl || '',
    authorLevel:
      !page && authorLevelInfo
        ? {
            level: authorLevelInfo.level,
            title: authorLevelInfo.title,
            medalName: authorLevelInfo.medalName,
          }
        : undefined,
    isOwnPost: post.authorId === currentUserId,
    location: post.location || 'Angola',
    privacy: post.privacy || 'public',
    feeling: post.feeling || '',
    bgStyle: post.bgStyle || 'none',
    editedAt: post.editedAt || null,
    groupId: post.groupId || null,
    groupName: group?.name || null,
    pageId: post.pageId || null,
    pageName: page?.name || null,
    createdAt: post.createdAt,
    createdAtLabel: formatRelativeTime(post.createdAt),
    content: post.content || '',
    imageUrl: post.imageUrl,
    videoUrl: post.videoUrl,
    audioUrl: post.audioUrl,
    audioDurationSec: post.audioDurationSec,
    musicTrack: findMusicTrackById(post.musicTrackId),
    poll: serializedPoll,
    likes: totalReactions,
    likedByMe: Boolean(myReaction),
    myReaction,
    reactionCounts,
    savedByMe: savedByIds.includes(currentUserId),
    sharedPost: post.sharedPost
      ? {
          ...post.sharedPost,
          musicTrack:
            post.sharedPost.musicTrack ||
            findMusicTrackById(post.sharedPost.musicTrackId),
        }
      : null,
    commentsCount: commentsList.reduce(
      (sum, c) => sum + 1 + (Array.isArray(c.replies) ? c.replies.length : 0),
      0
    ),
    comments: commentsList.map((c) => {
      const commentAuthor = db.users.find((u) => u.id === c.authorId);
      const likedByIds = Array.isArray(c.likedByIds) ? c.likedByIds : [];
      const replies = Array.isArray(c.replies) ? c.replies : [];
      return {
        id: c.id,
        authorId: c.authorId,
        authorName: commentAuthor?.name || c.authorName,
        authorHandle: commentAuthor?.handle || c.authorHandle,
        authorAvatar: commentAuthor?.avatarUrl || '',
        text: c.text || '',
        audioUrl: c.audioUrl,
        audioDurationSec: c.audioDurationSec,
        likesCount: likedByIds.length,
        likedByMe: likedByIds.includes(currentUserId),
        replies: replies.map((r) => {
          const replyAuthor = db.users.find((u) => u.id === r.authorId);
          return {
            id: r.id,
            authorId: r.authorId,
            authorName: replyAuthor?.name || r.authorName,
            authorHandle: replyAuthor?.handle || r.authorHandle,
            authorAvatar: replyAuthor?.avatarUrl || '',
            text: r.text || '',
            audioUrl: r.audioUrl,
            audioDurationSec: r.audioDurationSec,
            createdAt: r.createdAt,
            createdAtLabel: formatRelativeTime(r.createdAt),
          };
        }),
        createdAt: c.createdAt,
        createdAtLabel: formatRelativeTime(c.createdAt),
      };
    }),
  };
}

function serializeMessage(m: DbMessage) {
  return {
    id: m.id,
    senderId: m.senderId,
    receiverId: m.receiverId,
    text: m.text,
    imageUrl: m.imageUrl,
    audioUrl: m.audioUrl,
    audioDurationSec: m.audioDurationSec,
    listingTitle: m.listingTitle,
    readAt: m.readAt,
    createdAt: m.createdAt,
    createdAtLabel: formatRelativeTime(m.createdAt),
  };
}

function serializeGroup(g: DbGroup, currentUserId: string, db: VibbaDatabase) {
  const creator = db.users.find((u) => u.id === g.creatorId);
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    category: g.category,
    privacy: g.privacy,
    coverUrl: g.coverUrl || '',
    creatorId: g.creatorId,
    creatorName: creator?.name || 'Membro Vibba',
    membersCount: g.memberIds.length,
    postsCount: db.posts.filter((p) => p.groupId === g.id).length,
    isMember: g.memberIds.includes(currentUserId),
    createdAt: g.createdAt,
  };
}

function serializeListing(l: DbListing, currentUserId: string, db: VibbaDatabase) {
  const seller = db.users.find((u) => u.id === l.sellerId);
  return {
    id: l.id,
    sellerId: l.sellerId,
    sellerName: seller?.name || 'Utilizador Vibba',
    sellerHandle: seller?.handle || '@vibba',
    sellerAvatar: seller?.avatarUrl || '',
    sellerIsOnline: seller ? isUserOnline(seller.id) : false,
    title: l.title,
    priceKz: l.priceKz,
    category: l.category,
    condition: l.condition,
    location: l.location,
    description: l.description,
    imageUrl: l.imageUrl,
    status: l.status,
    isOwnListing: l.sellerId === currentUserId,
    createdAt: l.createdAt,
    createdAtLabel: formatRelativeTime(l.createdAt),
  };
}

function serializeEvent(ev: DbEvent, currentUserId: string, db: VibbaDatabase) {
  const creator = db.users.find((u) => u.id === ev.creatorId);
  let myRsvp: 'going' | 'interested' | null = null;
  if (ev.goingIds.includes(currentUserId)) myRsvp = 'going';
  else if (ev.interestedIds.includes(currentUserId)) myRsvp = 'interested';

  return {
    id: ev.id,
    creatorId: ev.creatorId,
    creatorName: creator?.name || 'Utilizador Vibba',
    title: ev.title,
    description: ev.description,
    location: ev.location,
    dateIso: ev.dateIso,
    coverUrl: ev.coverUrl || '',
    goingCount: ev.goingIds.length,
    interestedCount: ev.interestedIds.length,
    myRsvp,
    isOwnEvent: ev.creatorId === currentUserId,
    createdAt: ev.createdAt,
  };
}

function serializePage(pg: DbPage, currentUserId: string, db: VibbaDatabase) {
  const owner = db.users.find((u) => u.id === pg.ownerId);
  return {
    id: pg.id,
    ownerId: pg.ownerId,
    ownerName: owner?.name || 'Utilizador Vibba',
    name: pg.name,
    category: pg.category,
    bio: pg.bio,
    avatarUrl: pg.avatarUrl || '',
    coverUrl: pg.coverUrl || '',
    followersCount: pg.followerIds.length,
    postsCount: db.posts.filter((p) => p.pageId === pg.id).length,
    isFollowing: pg.followerIds.includes(currentUserId),
    isOwnPage: pg.ownerId === currentUserId,
    createdAt: pg.createdAt,
  };
}

function pushNotification(
  db: VibbaDatabase,
  payload: {
    userId: string;
    actor: DbUser;
    type: DbNotification['type'];
    message: string;
  }
) {
  if (payload.userId === payload.actor.id) return;
  const item: DbNotification = {
    id: `ntf_${crypto.randomUUID()}`,
    userId: payload.userId,
    actorId: payload.actor.id,
    actorName: payload.actor.name,
    actorHandle: payload.actor.handle,
    actorAvatar: payload.actor.avatarUrl || '',
    type: payload.type,
    message: payload.message,
    read: false,
    createdAt: Date.now(),
  };
  db.notifications.unshift(item);
  if (db.notifications.length > 500) {
    db.notifications = db.notifications.slice(0, 500);
  }
  sendToUser(payload.userId, 'notification:new', {
    ...item,
    createdAtLabel: 'Agora',
  });
}

function canViewPost(post: DbPost, viewer: DbUser, db?: VibbaDatabase): boolean {
  if (isOwnerEmail(viewer.email)) return true;
  if (post.authorId === viewer.id) return true;
  const privacy = post.privacy || 'public';
  if (privacy === 'only_me') return false;
  if (privacy === 'friends') {
    if ((viewer.friendIds || []).includes(post.authorId)) return true;
    const author = db?.users.find((u) => u.id === post.authorId);
    if (author && (author.professionalMode || isOwnerEmail(author.email))) {
      return (viewer.followingIds || []).includes(post.authorId);
    }
    return false;
  }
  return true;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({
      error: 'Sessão não iniciada. Faz login para continuar.',
      code: 'NO_TOKEN',
    });
    return;
  }
  const verified = verifyToken(token);
  if (!verified) {
    res.status(401).json({
      error: 'Sessão inválida ou expirada.',
      code: 'INVALID_TOKEN',
    });
    return;
  }
  const db = readDb();
  if (
    db.appConfig?.accountsResetAt &&
    verified.iat < db.appConfig.accountsResetAt
  ) {
    res.status(401).json({
      error: 'As contas anteriores foram apagadas. Cria uma nova conta para entrar.',
      code: 'ACCOUNTS_WIPED',
    });
    return;
  }
  const user = db.users.find((u) => u.id === verified.uid);
  if (!user) {
    res.status(401).json({
      error: 'Conta não encontrada no servidor actual.',
      code: 'ACCOUNT_NOT_FOUND',
    });
    return;
  }
  if (user.suspended && !isOwnerEmail(user.email)) {
    res.status(403).json({
      error: 'Esta conta foi suspensa pela administração do Vibba.',
      code: 'ACCOUNT_SUSPENDED',
    });
    return;
  }
  req.authUser = user;
  next();
}

function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.authUser || !isOwnerEmail(req.authUser.email)) {
    res.status(403).json({
      error: 'Acesso restrito ao proprietário oficial do Vibba.',
    });
    return;
  }
  next();
}

async function startServer() {
  ensureDataDir();
  // Purge any legacy Vibba Coins fields from database on startup
  readDb();
  const app = express();
  const server = http.createServer(app);

  // Serve uploaded video/audio/image files with byte-range support
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

  // Binary upload endpoint for videos/audio (up to 45 MB)
  app.post(
    '/api/media/upload',
    requireAuth,
    express.raw({ type: '*/*', limit: '45mb' }),
    (req: AuthenticatedRequest, res) => {
      const buf = req.body as Buffer;
      if (!Buffer.isBuffer(buf) || buf.length === 0) {
        res.status(400).json({ error: 'Ficheiro vazio.' });
        return;
      }
      const rawContentType = String(req.headers['content-type'] || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      const rawExt = String(req.query.ext || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      const mimeToExt: Record<string, string> = {
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/quicktime': 'mov',
        'video/x-m4v': 'm4v',
        'audio/webm': 'webm',
        'audio/mp4': 'm4a',
        'audio/aac': 'aac',
        'audio/ogg': 'ogg',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      };
      const allowedExts = new Set([
        'mp4',
        'webm',
        'mov',
        'm4v',
        'm4a',
        'aac',
        'ogg',
        'wav',
        'jpg',
        'jpeg',
        'png',
        'webp',
      ]);

      const ext =
        mimeToExt[rawContentType] ||
        (allowedExts.has(rawExt) ? rawExt : '');

      if (!ext) {
        res.status(400).json({
          error:
            'Formato não suportado. Usa vídeo MP4/WebM/MOV, foto ou nota de voz gravada no Vibba.',
        });
        return;
      }

      const fileName = `med_${crypto.randomUUID()}.${ext}`;
      const targetPath = path.join(UPLOADS_DIR, fileName);
      fs.writeFileSync(targetPath, buf);
      res.status(201).json({ url: `/uploads/${fileName}` });
    }
  );

  app.use(express.json({ limit: '10mb' }));

  // WebSocket Server for Messenger, Online Presence, and Live Notifications
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (request, socket, head) => {
    const reqUrl = new URL(request.url || '/', 'http://localhost');
    if (reqUrl.pathname !== '/ws') {
      socket.destroy();
      return;
    }
    const token = reqUrl.searchParams.get('token') || '';
    const verified = verifyToken(token);
    if (!verified) {
      socket.destroy();
      return;
    }
    const db = readDb();
    const user = db.users.find((u) => u.id === verified.uid);
    if (!user) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, user.id);
    });
  });

  wss.on('connection', (ws: WebSocket, userId: string) => {
    let set = onlineClients.get(userId);
    const wasOffline = !set || set.size === 0;
    if (!set) {
      set = new Set();
      onlineClients.set(userId, set);
    }
    set.add(ws);

    if (wasOffline) {
      broadcastPresence(userId, true);
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as {
          event?: string;
          payload?: { peerId?: string; typing?: boolean };
        };
        if (msg.event === 'typing' && msg.payload?.peerId) {
          sendToUser(msg.payload.peerId, 'typing', {
            userId,
            typing: Boolean(msg.payload.typing),
          });
        }
      } catch {
        // Ignore invalid WS messages
      }
    });

    ws.on('close', () => {
      const current = onlineClients.get(userId);
      if (current) {
        current.delete(ws);
        if (current.size === 0) {
          onlineClients.delete(userId);
          broadcastPresence(userId, false);
        }
      }
    });
  });

  // Public health endpoint (zero fake data)
  app.get('/api/health', (_req, res) => {
    const db = readDb();
    res.json({
      ok: true,
      version: '8.1.0',
      registeredUsers: db.users.length,
      totalPosts: db.posts.length,
    });
  });

  // Global Music Store (100% copyright-free licensed tracks)
  app.get('/api/music-store', (_req, res) => {
    res.json({ tracks: GLOBAL_MUSIC_CATALOG });
  });

  // Send SMS Verification Code to Phone (5 minutes validity, non-trivial cryptographic 6 digits)
  app.post('/api/auth/send-phone-code', async (req, res) => {
    const body = req.body as {
      phone?: string;
      email?: string;
      handle?: string;
    };
    const phone = normalizePhoneNumber(body.phone || '');
    if (!phone || !isValidNormalizedPhone(phone)) {
      res.status(400).json({
        error: 'Indica um número de telefone válido (ex: +244 923 456 789).',
      });
      return;
    }

    const db = readDb();
    if (db.users.some((u) => u.phone && normalizePhoneNumber(u.phone) === phone)) {
      res.status(409).json({
        error: 'Este número de telefone já está associado a uma conta Vibba.',
      });
      return;
    }
    const email = (body.email || '').trim().toLowerCase();
    if (email && db.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({
        error: 'Já existe uma conta registada com este e-mail.',
      });
      return;
    }
    const rawHandle = (body.handle || '').trim().toLowerCase().replace(/^@+/, '');
    if (rawHandle && db.users.some((u) => u.handle.toLowerCase() === `@${rawHandle}`)) {
      res.status(409).json({ error: 'Este @utilizador já está em uso.' });
      return;
    }

    const now = Date.now();
    for (const [k, v] of pendingPhoneOtps.entries()) {
      if (v.expiresAt <= now) pendingPhoneOtps.delete(k);
    }

    const existing = pendingPhoneOtps.get(phone);
    if (existing && now - existing.createdAt < 15_000 && existing.expiresAt > now) {
      const waitSec = Math.ceil((15_000 - (now - existing.createdAt)) / 1000);
      res.status(429).json({
        error: `Aguarda ${waitSec}s antes de pedir um novo código para este número.`,
      });
      return;
    }

    const code = generateSecureOtpCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const expiresAt = now + PHONE_OTP_TTL_MS;

    pendingPhoneOtps.set(phone, {
      phone,
      codeHash: hashPassword(code, salt),
      salt,
      expiresAt,
      createdAt: now,
      attempts: 0,
    });

    const delivery = await deliverVibbaSmsVerification(phone, code);

    res.json({
      ok: true,
      phone,
      maskedPhone: maskPhoneNumber(phone),
      expiresAt,
      expiresInSeconds: 300,
      deliveryMode: delivery.deliveryMode,
      smsNotification:
        delivery.deliveryMode === 'device_notification'
          ? {
              sender: 'Vibba',
              recipient: phone,
              body: delivery.body,
              expiresAt,
            }
          : undefined,
    });
  });

  // Register a real user account (supports Privacy-First Safe Anonymous Mode + optional e-mail/phone)
  app.post('/api/auth/register', (req, res) => {
    const body = req.body as {
      name?: string;
      handle?: string;
      email?: string;
      phone?: string;
      birthDate?: string;
      phoneCode?: string;
      ageGroup?: 'teen' | 'adult';
      acceptedRules?: boolean;
      password?: string;
      location?: string;
      bio?: string;
      recoveryQuestion?: string;
      recoveryAnswer?: string;
    };

    const name = (body.name || '').trim();
    const rawHandle = (body.handle || '').trim().toLowerCase().replace(/^@+/, '');
    const suppliedEmail = (body.email || '').trim().toLowerCase();
    const suppliedPhone = (body.phone || '').trim();
    const phone = suppliedPhone ? normalizePhoneNumber(suppliedPhone) : '';
    const suppliedBirthDate = (body.birthDate || '').trim();
    const birthDateCheck = suppliedBirthDate
      ? calculateAgeFromBirthDate(suppliedBirthDate)
      : { valid: false, age: null, normalized: '' };
    const phoneCode = (body.phoneCode || '').trim().replace(/\s+/g, '');
    const ageGroup = body.ageGroup;
    const acceptedRules = body.acceptedRules === true;
    const password = body.password || '';
    const location = (body.location || '').trim() || 'Angola';
    const bio = (body.bio || '').trim();
    const recoveryQuestion = (body.recoveryQuestion || '').trim().slice(0, 120);
    const recoveryAnswer = (body.recoveryAnswer || '').trim().toLowerCase();

    if (!acceptedRules) {
      res.status(400).json({
        error:
          'Tens de aceitar as Regras do Vibba e o Aviso Legal antes de criar conta.',
      });
      return;
    }
    if (name.length < 2 || name.length > 60) {
      res
        .status(400)
        .json({ error: 'Indica o teu apelido ou nome público (2 a 60 caracteres).' });
      return;
    }
    if (!/^[a-z0-9._]{3,30}$/.test(rawHandle)) {
      res.status(400).json({
        error:
          'O @utilizador deve ter entre 3 e 30 caracteres (letras, números, ponto ou _).',
      });
      return;
    }
    if (suppliedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suppliedEmail)) {
      res.status(400).json({ error: 'Indica um endereço de e-mail válido.' });
      return;
    }

    const hasValidBirthDate = birthDateCheck.valid && birthDateCheck.age !== null;
    const hasValidAgeGroup = ageGroup === 'teen' || ageGroup === 'adult';
    if (!hasValidBirthDate && !hasValidAgeGroup) {
      res.status(400).json({
        error:
          'Selecciona a tua faixa etária (13–17 anos ou maior de 18 anos) para continuar.',
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        error: 'A palavra-passe deve ter pelo menos 6 caracteres.',
      });
      return;
    }

    // Validate phone + OTP only when user explicitly provides a phone number & code
    if (suppliedPhone && phoneCode) {
      if (!isValidNormalizedPhone(phone)) {
        res.status(400).json({
          error: 'Indica um número de telefone válido (ex: +244 923 456 789).',
        });
        return;
      }
      if (!/^\d{6}$/.test(phoneCode) || isTrivialOtpCode(phoneCode)) {
        res.status(400).json({
          error:
            'Código de verificação inválido. Usa o código de 6 dígitos enviado pelo Vibba.',
        });
        return;
      }
      const otpRecord = pendingPhoneOtps.get(phone);
      if (!otpRecord) {
        res.status(400).json({
          error:
            'Solicita primeiro o código de verificação por SMS para o teu número de telefone.',
        });
        return;
      }
      if (otpRecord.expiresAt <= Date.now()) {
        pendingPhoneOtps.delete(phone);
        res.status(400).json({
          error:
            'O código de verificação expirou (validade de 5 minutos). Pede um novo código.',
        });
        return;
      }
      if (otpRecord.attempts >= 5) {
        pendingPhoneOtps.delete(phone);
        res.status(429).json({
          error:
            'Demasiadas tentativas erradas. Pede um novo código de verificação.',
        });
        return;
      }
      if (!verifyPassword(phoneCode, otpRecord.salt, otpRecord.codeHash)) {
        otpRecord.attempts += 1;
        res.status(400).json({
          error: `Código de verificação incorreto (${5 - otpRecord.attempts} tentativas restantes).`,
        });
        return;
      }
    }

    const db = readDb();
    const finalEmail = suppliedEmail || `${rawHandle}@anon.vibba.local`;
    if (db.users.some((u) => u.email.toLowerCase() === finalEmail)) {
      res.status(409).json({ error: 'Já existe uma conta registada com este e-mail.' });
      return;
    }
    if (
      phone &&
      phoneCode &&
      db.users.some((u) => u.phone && normalizePhoneNumber(u.phone) === phone)
    ) {
      res.status(409).json({
        error: 'Já existe uma conta registada com este número de telefone.',
      });
      return;
    }
    const handle = `@${rawHandle}`;
    if (db.users.some((u) => u.handle.toLowerCase() === handle)) {
      res.status(409).json({ error: 'Este @utilizador já está em uso.' });
      return;
    }

    if (phone && phoneCode) {
      pendingPhoneOtps.delete(phone);
    }

    const isAdultVerified =
      isOwnerEmail(finalEmail) ||
      ageGroup === 'adult' ||
      Boolean(birthDateCheck.valid && (birthDateCheck.age || 0) >= 18);

    const salt = crypto.randomBytes(16).toString('hex');
    const recoverySalt = recoveryAnswer ? crypto.randomBytes(16).toString('hex') : undefined;
    const newUser: DbUser = {
      id: `usr_${crypto.randomUUID()}`,
      name,
      handle,
      email: finalEmail,
      phone: phone && phoneCode ? phone : '',
      birthDate: hasValidBirthDate ? birthDateCheck.normalized : '',
      isAdultVerified,
      professionalMode: false,
      professionalCategory: 'Criador Digital',
      passwordSalt: salt,
      passwordHash: hashPassword(password, salt),
      bio,
      location,
      hometown: '',
      work: '',
      education: '',
      relationship: '',
      website: '',
      avatarUrl: '',
      coverUrl: '',
      followingIds: [],
      friendIds: [],
      incomingRequestIds: [],
      outgoingRequestIds: [],
      recoveryQuestion: recoveryAnswer
        ? recoveryQuestion || 'Palavra secreta de recuperação'
        : undefined,
      recoverySalt,
      recoveryAnswerHash:
        recoveryAnswer && recoverySalt
          ? hashPassword(recoveryAnswer, recoverySalt)
          : undefined,
      vibbaPoints: isOwnerEmail(finalEmail) ? OWNER_DEFAULT_POINTS : 0,
      createdAt: Date.now(),
    };

    db.users.push(newUser);
    syncOwnerAutoFollowers(db);
    writeDb(db);

    const token = signToken(newUser.id, newUser.email);
    res.status(201).json({
      token,
      user: sanitizeUser(newUser, db),
    });
  });

  // Login (accepts e-mail, phone number, or @handle)
  app.post('/api/auth/login', (req, res) => {
    const body = req.body as { email?: string; password?: string };
    const identifier = (body.email || '').trim().toLowerCase();
    const normalizedPhone = normalizePhoneNumber(body.email || '');
    const normalizedHandle = identifier.startsWith('@')
      ? identifier
      : `@${identifier}`;
    const password = body.password || '';

    const db = readDb();
    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === identifier ||
        u.handle.toLowerCase() === normalizedHandle ||
        (Boolean(normalizedPhone) &&
          Boolean(u.phone) &&
          normalizePhoneNumber(u.phone!) === normalizedPhone)
    );
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      res.status(401).json({ error: 'E-mail/telefone ou palavra-passe incorrectos.' });
      return;
    }
    if (user.suspended && !isOwnerEmail(user.email)) {
      res.status(403).json({ error: 'Esta conta foi suspensa pela administração do Vibba.' });
      return;
    }

    const token = signToken(user.id, user.email);
    res.json({
      token,
      user: sanitizeUser(user, db),
    });
  });

  // Password recovery Step 1: find account & recovery mode
  app.post('/api/auth/forgot-password', (req, res) => {
    const rawIdentifier = String(
      (req.body as { identifier?: string }).identifier || ''
    )
      .trim()
      .toLowerCase();
    if (!rawIdentifier) {
      res.status(400).json({
        error: 'Indica o teu e-mail ou @utilizador para recuperar a conta.',
      });
      return;
    }

    const db = readDb();
    const normalizedHandle = rawIdentifier.startsWith('@')
      ? rawIdentifier
      : `@${rawIdentifier}`;
    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === rawIdentifier ||
        u.handle.toLowerCase() === normalizedHandle
    );

    if (!user) {
      res.status(404).json({
        error: 'Não encontramos nenhuma conta registada com esse e-mail ou @utilizador.',
      });
      return;
    }

    const parts = user.email.split('@');
    const namePart = parts[0] || '';
    const domainPart = parts[1] || '';
    const maskedEmail = user.email.endsWith('@anon.vibba.local')
      ? `${user.handle} (Modo Anónimo)`
      : namePart.length <= 2
      ? `${namePart[0] || '*'}*@${domainPart}`
      : `${namePart.slice(0, 2)}${'*'.repeat(Math.min(6, namePart.length - 2))}@${domainPart}`;

    const hasActiveCode = Boolean(
      user.resetCodeHash &&
        user.resetCodeExpiresAt &&
        user.resetCodeExpiresAt > Date.now()
    );

    res.json({
      ok: true,
      maskedEmail,
      mode: user.recoveryAnswerHash ? 'security_question' : 'identity_verify',
      recoveryQuestion:
        user.recoveryQuestion || 'Palavra secreta de recuperação',
      hasActiveCode,
    });
  });

  // Password recovery Step 2: verify identity / recovery phrase / owner code & reset password
  app.post('/api/auth/reset-password', (req, res) => {
    const body = req.body as {
      identifier?: string;
      recoveryAnswer?: string;
      handleCheck?: string;
      nameCheck?: string;
      resetCode?: string;
      newPassword?: string;
      newRecoveryQuestion?: string;
      newRecoveryAnswer?: string;
    };

    const rawIdentifier = String(body.identifier || '').trim().toLowerCase();
    const newPassword = String(body.newPassword || '');
    if (!rawIdentifier) {
      res.status(400).json({ error: 'Indica o e-mail ou @utilizador da conta.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({
        error: 'A nova palavra-passe deve ter pelo menos 6 caracteres.',
      });
      return;
    }

    const db = readDb();
    const normalizedHandle = rawIdentifier.startsWith('@')
      ? rawIdentifier
      : `@${rawIdentifier}`;
    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === rawIdentifier ||
        u.handle.toLowerCase() === normalizedHandle
    );

    if (!user) {
      res.status(404).json({ error: 'Conta não encontrada.' });
      return;
    }

    let verified = false;
    const providedCode = String(body.resetCode || '').trim();
    if (
      providedCode &&
      user.resetCodeHash &&
      user.resetCodeExpiresAt &&
      user.resetCodeExpiresAt > Date.now()
    ) {
      const candidateHash = crypto
        .createHash('sha256')
        .update(`${user.id}:${providedCode}`)
        .digest('hex');
      if (candidateHash === user.resetCodeHash) {
        verified = true;
      }
    }

    if (!verified && user.recoveryAnswerHash && user.recoverySalt) {
      const providedAnswer = String(body.recoveryAnswer || '')
        .trim()
        .toLowerCase();
      if (
        providedAnswer &&
        verifyPassword(providedAnswer, user.recoverySalt, user.recoveryAnswerHash)
      ) {
        verified = true;
      }
    }

    if (!verified && !user.recoveryAnswerHash) {
      const handleInput = String(body.handleCheck || '')
        .trim()
        .toLowerCase()
        .replace(/^@+/, '');
      const nameInput = String(body.nameCheck || '').trim().toLowerCase();
      if (
        handleInput &&
        nameInput &&
        user.handle.toLowerCase() === `@${handleInput}` &&
        user.name.trim().toLowerCase() === nameInput
      ) {
        verified = true;
      }
    }

    if (!verified) {
      res.status(401).json({
        error:
          'Verificação incorrecta. Confirma os dados da conta, a palavra de recuperação ou usa um código de 6 dígitos.',
      });
      return;
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    user.passwordSalt = newSalt;
    user.passwordHash = hashPassword(newPassword, newSalt);
    user.resetCodeHash = undefined;
    user.resetCodeExpiresAt = undefined;

    const nextRecAnswer = String(body.newRecoveryAnswer || '').trim().toLowerCase();
    if (nextRecAnswer) {
      const recSalt = crypto.randomBytes(16).toString('hex');
      user.recoverySalt = recSalt;
      user.recoveryAnswerHash = hashPassword(nextRecAnswer, recSalt);
      user.recoveryQuestion =
        String(body.newRecoveryQuestion || '').trim().slice(0, 120) ||
        'Palavra secreta de recuperação';
    }

    writeDb(db);
    const token = signToken(user.id, user.email);
    res.json({
      token,
      user: sanitizeUser(user, db),
    });
  });

  // Change password for logged-in user
  app.patch('/api/auth/password', requireAuth, (req: AuthenticatedRequest, res) => {
    const body = req.body as { currentPassword?: string; newPassword?: string };
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    if (newPassword.length < 6) {
      res.status(400).json({
        error: 'A nova palavra-passe deve ter pelo menos 6 caracteres.',
      });
      return;
    }
    const db = readDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    if (!user) {
      res.status(404).json({ error: 'Conta não encontrada.' });
      return;
    }
    if (!verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
      res.status(401).json({ error: 'A palavra-passe actual está incorrecta.' });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    user.passwordSalt = salt;
    user.passwordHash = hashPassword(newPassword, salt);
    writeDb(db);
    res.json({ ok: true });
  });

  // Update security/recovery question for logged-in user
  app.patch('/api/auth/recovery', requireAuth, (req: AuthenticatedRequest, res) => {
    const body = req.body as {
      recoveryQuestion?: string;
      recoveryAnswer?: string;
    };
    const question =
      String(body.recoveryQuestion || '').trim().slice(0, 120) ||
      'Palavra secreta de recuperação';
    const answer = String(body.recoveryAnswer || '').trim().toLowerCase();
    if (answer.length < 2) {
      res.status(400).json({
        error: 'Indica uma palavra ou resposta de recuperação (mínimo 2 caracteres).',
      });
      return;
    }
    const db = readDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    if (!user) {
      res.status(404).json({ error: 'Conta não encontrada.' });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    user.recoveryQuestion = question;
    user.recoverySalt = salt;
    user.recoveryAnswerHash = hashPassword(answer, salt);
    writeDb(db);
    res.json({ user: sanitizeUser(user, db) });
  });

  // Current user
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const freshUser = db.users.find((u) => u.id === req.authUser!.id);
    if (!freshUser) {
      res.status(401).json({
        error: 'Conta não encontrada.',
        code: 'ACCOUNT_NOT_FOUND',
      });
      return;
    }
    res.json({ user: sanitizeUser(freshUser, db) });
  });

  // Automatic local session restore after container update
  app.post('/api/auth/restore-session', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const verified = token ? verifyToken(token) : null;
    if (!verified) {
      res.status(401).json({ error: 'Token inválido para restauro automático.' });
      return;
    }

    const preCheckDb = readDb();
    if (
      preCheckDb.appConfig?.accountsResetAt &&
      verified.iat < preCheckDb.appConfig.accountsResetAt
    ) {
      res.status(401).json({
        error: 'As contas anteriores foram apagadas.',
        code: 'ACCOUNTS_WIPED',
      });
      return;
    }

    const body = req.body as {
      user?: Partial<DbUser>;
      ownPosts?: DbPost[];
    };

    const snapUser = body.user;
    if (
      !snapUser ||
      !snapUser.email ||
      snapUser.email.trim().toLowerCase() !== verified.email.toLowerCase()
    ) {
      res.status(400).json({ error: 'Dados da conta não correspondem à sessão.' });
      return;
    }

    const db = readDb();
    let user = db.users.find(
      (u) =>
        u.id === verified.uid ||
        u.email.toLowerCase() === verified.email.toLowerCase()
    );

    if (!user) {
      const salt = crypto.randomBytes(16).toString('hex');
      const fallbackPass = crypto.randomBytes(24).toString('hex');
      const rawHandle = (snapUser.handle || verified.email.split('@')[0] || 'vibba')
        .replace(/^@+/, '')
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, '');
      let candidateHandle = `@${rawHandle || 'vibba'}`;
      if (db.users.some((u) => u.handle.toLowerCase() === candidateHandle)) {
        candidateHandle = `@${rawHandle || 'vibba'}_${verified.uid.slice(-4)}`;
      }

      user = {
        id: verified.uid,
        name: (snapUser.name || 'Utilizador Vibba').trim().slice(0, 60),
        handle: candidateHandle,
        email: verified.email.toLowerCase(),
        passwordSalt: salt,
        passwordHash: hashPassword(fallbackPass, salt),
        bio: (snapUser.bio || '').slice(0, 240),
        location: (snapUser.location || 'Angola').slice(0, 60),
        hometown: (snapUser.hometown || '').slice(0, 80),
        work: (snapUser.work || '').slice(0, 80),
        education: (snapUser.education || '').slice(0, 80),
        relationship: (snapUser.relationship || '').slice(0, 40),
        website: (snapUser.website || '').slice(0, 120),
        avatarUrl: snapUser.avatarUrl || '',
        coverUrl: snapUser.coverUrl || '',
        followingIds: Array.isArray(snapUser.followingIds)
          ? snapUser.followingIds
          : [],
        friendIds: Array.isArray(snapUser.friendIds) ? snapUser.friendIds : [],
        incomingRequestIds: [],
        outgoingRequestIds: [],
        createdAt: snapUser.createdAt || Date.now(),
      };
      db.users.push(user);
    }

    if (Array.isArray(body.ownPosts)) {
      for (const p of body.ownPosts) {
        if (!p || !p.id || db.posts.some((existing) => existing.id === p.id)) {
          continue;
        }
        db.posts.push({
          id: p.id,
          authorId: user.id,
          location: p.location || user.location || 'Angola',
          privacy: p.privacy || 'public',
          feeling: p.feeling || '',
          bgStyle: p.bgStyle || 'none',
          content: (p.content || '').slice(0, 500),
          imageUrl: p.imageUrl,
          audioUrl: p.audioUrl,
          audioDurationSec: p.audioDurationSec,
          likedByIds: [],
          reactions: {},
          savedByIds: [],
          comments: [],
          createdAt: p.createdAt || Date.now(),
        });
      }
    }

    writeDb(db);
    const freshToken = signToken(user.id, user.email);
    res.json({
      token: freshToken,
      user: sanitizeUser(user, db),
    });
  });

  // Portable JSON backup export
  app.get('/api/backup/my', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    if (!user) {
      res.status(404).json({ error: 'Conta não encontrada.' });
      return;
    }
    const backup = {
      format: 'vibba-backup-v1',
      version: '8.1.0',
      exportedAt: Date.now(),
      user: sanitizeUser(user, db),
      ownPosts: db.posts.filter((p) => p.authorId === user.id),
    };
    res.json(backup);
  });

  // Portable JSON backup import
  app.post('/api/backup/import', (req, res) => {
    const body = req.body as {
      format?: string;
      user?: Partial<DbUser>;
      ownPosts?: DbPost[];
    };

    if (body.format !== 'vibba-backup-v1' || !body.user?.email) {
      res.status(400).json({ error: 'Ficheiro de cópia de segurança inválido.' });
      return;
    }

    const email = body.user.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'E-mail inválido no ficheiro de backup.' });
      return;
    }

    const db = readDb();
    let user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      const salt = crypto.randomBytes(16).toString('hex');
      const randomPass = crypto.randomBytes(24).toString('hex');
      const cleanHandle = (body.user.handle || email.split('@')[0] || 'vibba')
        .replace(/^@+/, '')
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, '');
      let finalHandle = `@${cleanHandle || 'vibba'}`;
      if (db.users.some((u) => u.handle.toLowerCase() === finalHandle)) {
        finalHandle = `@${cleanHandle || 'vibba'}_${Date.now().toString().slice(-4)}`;
      }
      user = {
        id: body.user.id || `usr_${crypto.randomUUID()}`,
        name: (body.user.name || 'Utilizador Vibba').slice(0, 60),
        handle: finalHandle,
        email,
        passwordSalt: salt,
        passwordHash: hashPassword(randomPass, salt),
        bio: (body.user.bio || '').slice(0, 240),
        location: (body.user.location || 'Angola').slice(0, 60),
        hometown: (body.user.hometown || '').slice(0, 80),
        work: (body.user.work || '').slice(0, 80),
        education: (body.user.education || '').slice(0, 80),
        relationship: (body.user.relationship || '').slice(0, 40),
        website: (body.user.website || '').slice(0, 120),
        avatarUrl: body.user.avatarUrl || '',
        coverUrl: body.user.coverUrl || '',
        followingIds: [],
        friendIds: [],
        incomingRequestIds: [],
        outgoingRequestIds: [],
        createdAt: body.user.createdAt || Date.now(),
      };
      db.users.push(user);
    }

    if (Array.isArray(body.ownPosts)) {
      for (const p of body.ownPosts) {
        if (!p || !p.id || db.posts.some((ex) => ex.id === p.id)) continue;
        db.posts.push({
          ...p,
          authorId: user.id,
          likedByIds: Array.isArray(p.likedByIds) ? p.likedByIds : [],
          comments: Array.isArray(p.comments) ? p.comments : [],
        });
      }
    }

    writeDb(db);
    const token = signToken(user.id, user.email);
    res.json({
      token,
      user: sanitizeUser(user, db),
    });
  });

  // Update profile & Facebook About details
  app.patch('/api/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const body = req.body as {
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
    };

    const db = readDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    if (!user) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim();
      if (trimmed.length < 2 || trimmed.length > 60) {
        res.status(400).json({ error: 'Nome deve ter entre 2 e 60 caracteres.' });
        return;
      }
      user.name = trimmed;
    }
    if (typeof body.bio === 'string') user.bio = body.bio.trim().slice(0, 240);
    if (typeof body.location === 'string') {
      user.location = body.location.trim().slice(0, 60) || 'Angola';
    }
    if (typeof body.hometown === 'string') {
      user.hometown = body.hometown.trim().slice(0, 80);
    }
    if (typeof body.work === 'string') {
      user.work = body.work.trim().slice(0, 80);
    }
    if (typeof body.education === 'string') {
      user.education = body.education.trim().slice(0, 80);
    }
    if (typeof body.relationship === 'string') {
      user.relationship = body.relationship.trim().slice(0, 40);
    }
    if (typeof body.website === 'string') {
      user.website = body.website.trim().slice(0, 120);
    }
    if (typeof body.professionalCategory === 'string') {
      const cat = body.professionalCategory.trim().slice(0, 50);
      if (cat && (PROFESSIONAL_CATEGORIES as readonly string[]).includes(cat)) {
        user.professionalCategory = cat;
      }
    }
    if (typeof body.avatarUrl === 'string') {
      if (body.avatarUrl.length > 2_000_000) {
        res.status(400).json({ error: 'A foto de perfil é demasiado grande.' });
        return;
      }
      user.avatarUrl = body.avatarUrl;
    }
    if (typeof body.coverUrl === 'string') {
      if (body.coverUrl.length > 2_500_000) {
        res.status(400).json({ error: 'A foto de capa é demasiado grande.' });
        return;
      }
      user.coverUrl = body.coverUrl;
    }

    writeDb(db);
    res.json({ user: sanitizeUser(user, db) });
  });

  // Activate or deactivate Facebook-style Professional Mode (18+ years old only)
  // When activated, all current friends & pending requests automatically become followers (followers-only mode)
  app.post(
    '/api/profile/professional-mode',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const body = req.body as { enabled?: boolean; category?: string };
      const enabled = Boolean(body.enabled);
      const db = readDb();
      const user = db.users.find((u) => u.id === req.authUser!.id);
      if (!user) {
        res.status(404).json({ error: 'Utilizador não encontrado.' });
        return;
      }

      let convertedFriendsCount = 0;

      if (enabled) {
        if (!isUserAdult(user)) {
          res.status(403).json({
            error:
              'O Modo Profissional está disponível apenas para utilizadores maiores de 18 anos.',
          });
          return;
        }
        const requestedCategory = (body.category || '').trim();
        const validCategory = (
          PROFESSIONAL_CATEGORIES as readonly string[]
        ).includes(requestedCategory)
          ? requestedCategory
          : user.professionalCategory || 'Criador Digital';
        user.professionalMode = true;
        user.professionalCategory = validCategory;
        user.professionalModeActivatedAt =
          user.professionalModeActivatedAt || Date.now();

        // Automatically convert all friends & pending requests into followers
        const friendSet = new Set<string>(user.friendIds || []);
        const incomingSet = new Set<string>(user.incomingRequestIds || []);
        for (const other of db.users) {
          if (other.id === user.id) continue;
          const wasFriend =
            friendSet.has(other.id) || (other.friendIds || []).includes(user.id);
          const wasPending =
            incomingSet.has(other.id) ||
            (other.outgoingRequestIds || []).includes(user.id);

          if (wasFriend || wasPending) {
            other.followingIds = other.followingIds || [];
            if (!other.followingIds.includes(user.id)) {
              other.followingIds.push(user.id);
            }
            if (wasFriend) convertedFriendsCount++;
          }
          other.friendIds = (other.friendIds || []).filter((id) => id !== user.id);
          other.incomingRequestIds = (other.incomingRequestIds || []).filter(
            (id) => id !== user.id
          );
          other.outgoingRequestIds = (other.outgoingRequestIds || []).filter(
            (id) => id !== user.id
          );
        }
        user.friendIds = [];
        user.incomingRequestIds = [];
        user.outgoingRequestIds = [];
      } else {
        user.professionalMode = false;
      }

      writeDb(db);
      res.json({ user: sanitizeUser(user, db), convertedFriendsCount });
    }
  );

  // Directory of real users
  app.get('/api/users', requireAuth, (req: AuthenticatedRequest, res) => {
    const q = String(req.query.q || '')
      .trim()
      .toLowerCase();
    const db = readDb();
    const me = db.users.find((u) => u.id === req.authUser!.id);
    if (!me) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }

    const users = db.users
      .filter((u) => {
        if (!q) return true;
        return (
          u.name.toLowerCase().includes(q) ||
          u.handle.toLowerCase().includes(q) ||
          u.location.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((u) => serializeMember(u, me, db));

    res.json({ users });
  });

  // Public Leaderboard: Top 10 ("Sociedade dos 10 Melhores") and up to Top 200 (Owner strictly excluded)
  app.get('/api/leaderboard', requireAuth, (req: AuthenticatedRequest, res) => {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(200, Math.max(1, Math.floor(rawLimit)))
      : 200;
    const db = readDb();
    const me = db.users.find((u) => u.id === req.authUser!.id);
    if (!me) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }

    const eligible = db.users
      .filter((u) => !isOwnerEmail(u.email) && !u.suspended)
      .map((u) => ({
        user: u,
        points: Math.max(0, Math.floor(u.vibbaPoints || 0)),
        postsCount: db.posts.filter((p) => p.authorId === u.id).length,
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.postsCount !== a.postsCount) return b.postsCount - a.postsCount;
        return a.user.createdAt - b.user.createdAt;
      });

    const ranked = eligible.map((entry, idx) => ({
      rank: idx + 1,
      isTop10: idx < 10,
      member: serializeMember(entry.user, me, db),
    }));

    const myEntry = ranked.find((r) => r.member.id === me.id);

    res.json({
      top10: ranked.slice(0, 10),
      entries: ranked.slice(0, limit),
      totalEligible: ranked.length,
      myRank: myEntry ? myEntry.rank : null,
    });
  });

  // Follow / Unfollow
  app.post('/api/users/:id/follow', requireAuth, (req: AuthenticatedRequest, res) => {
    const targetId = req.params.id;
    if (targetId === req.authUser!.id) {
      res.status(400).json({ error: 'Não podes seguir-te a ti próprio.' });
      return;
    }
    const db = readDb();
    const me = db.users.find((u) => u.id === req.authUser!.id);
    const target = db.users.find((u) => u.id === targetId);
    if (!me || !target) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }
    me.followingIds = me.followingIds || [];
    const idx = me.followingIds.indexOf(targetId);
    let following = false;
    if (idx >= 0) {
      me.followingIds.splice(idx, 1);
      following = false;
    } else {
      me.followingIds.push(targetId);
      following = true;
      pushNotification(db, {
        userId: target.id,
        actor: me,
        type: 'follow',
        message: `${me.name} começou a seguir-te no Vibba.`,
      });
    }
    writeDb(db);
    res.json({ following, user: sanitizeUser(me, db) });
  });

  // Facebook Friend Request (send or cancel)
  app.post('/api/friends/request/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const targetId = req.params.id;
    if (targetId === req.authUser!.id) {
      res.status(400).json({ error: 'Não podes enviar pedido a ti próprio.' });
      return;
    }
    const db = readDb();
    const me = db.users.find((u) => u.id === req.authUser!.id);
    const target = db.users.find((u) => u.id === targetId);
    if (!me || !target) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }

    me.friendIds = me.friendIds || [];
    me.outgoingRequestIds = me.outgoingRequestIds || [];
    me.incomingRequestIds = me.incomingRequestIds || [];
    target.friendIds = target.friendIds || [];
    target.incomingRequestIds = target.incomingRequestIds || [];
    target.outgoingRequestIds = target.outgoingRequestIds || [];

    if (isOwnerEmail(me.email) || isOwnerEmail(target.email)) {
      res.status(400).json({
        error: 'A conta oficial do proprietário funciona apenas com seguidores.',
      });
      return;
    }

    if (me.professionalMode || target.professionalMode) {
      res.status(400).json({
        error: 'Perfis em Modo Profissional funcionam apenas com seguidores. Usa o botão Seguir.',
      });
      return;
    }

    if (me.friendIds.includes(target.id)) {
      res.json({ status: 'friends', user: sanitizeUser(me, db) });
      return;
    }

    // If target already sent us a request, auto-accept
    if (me.incomingRequestIds.includes(target.id)) {
      me.incomingRequestIds = me.incomingRequestIds.filter((id) => id !== target.id);
      target.outgoingRequestIds = target.outgoingRequestIds.filter((id) => id !== me.id);
      me.friendIds.push(target.id);
      if (!target.friendIds.includes(me.id)) target.friendIds.push(me.id);
      pushNotification(db, {
        userId: target.id,
        actor: me,
        type: 'friend_accept',
        message: `${me.name} aceitou o teu pedido de amizade.`,
      });
      writeDb(db);
      res.json({ status: 'friends', user: sanitizeUser(me, db) });
      return;
    }

    // Toggle outgoing friend request
    if (me.outgoingRequestIds.includes(target.id)) {
      me.outgoingRequestIds = me.outgoingRequestIds.filter((id) => id !== target.id);
      target.incomingRequestIds = target.incomingRequestIds.filter((id) => id !== me.id);
      writeDb(db);
      res.json({ status: 'none', user: sanitizeUser(me, db) });
      return;
    }

    me.outgoingRequestIds.push(target.id);
    if (!target.incomingRequestIds.includes(me.id)) {
      target.incomingRequestIds.push(me.id);
    }
    pushNotification(db, {
      userId: target.id,
      actor: me,
      type: 'friend_request',
      message: `${me.name} enviou-te um pedido de amizade.`,
    });
    writeDb(db);
    res.json({ status: 'outgoing_request', user: sanitizeUser(me, db) });
  });

  // Accept or decline incoming Friend Request
  app.post('/api/friends/respond/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const targetId = req.params.id;
    const action = (req.body as { action?: string }).action;
    if (action !== 'accept' && action !== 'decline') {
      res.status(400).json({ error: 'Acção inválida.' });
      return;
    }
    const db = readDb();
    const me = db.users.find((u) => u.id === req.authUser!.id);
    const target = db.users.find((u) => u.id === targetId);
    if (!me || !target) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }
    if (isOwnerEmail(me.email) || isOwnerEmail(target.email)) {
      res.status(400).json({
        error: 'A conta oficial do proprietário funciona apenas com seguidores.',
      });
      return;
    }

    me.incomingRequestIds = (me.incomingRequestIds || []).filter((id) => id !== target.id);
    target.outgoingRequestIds = (target.outgoingRequestIds || []).filter(
      (id) => id !== me.id
    );

    if (action === 'accept') {
      me.friendIds = me.friendIds || [];
      target.friendIds = target.friendIds || [];
      if (!me.friendIds.includes(target.id)) me.friendIds.push(target.id);
      if (!target.friendIds.includes(me.id)) target.friendIds.push(me.id);

      // Mutual follow when becoming Facebook friends
      me.followingIds = me.followingIds || [];
      target.followingIds = target.followingIds || [];
      if (!me.followingIds.includes(target.id)) me.followingIds.push(target.id);
      if (!target.followingIds.includes(me.id)) target.followingIds.push(me.id);

      pushNotification(db, {
        userId: target.id,
        actor: me,
        type: 'friend_accept',
        message: `${me.name} aceitou o teu pedido de amizade.`,
      });
    }

    writeDb(db);
    res.json({ accepted: action === 'accept', user: sanitizeUser(me, db) });
  });

  // Unfriend
  app.delete('/api/friends/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const targetId = req.params.id;
    const db = readDb();
    const me = db.users.find((u) => u.id === req.authUser!.id);
    const target = db.users.find((u) => u.id === targetId);
    if (!me) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }
    me.friendIds = (me.friendIds || []).filter((id) => id !== targetId);
    if (target) {
      target.friendIds = (target.friendIds || []).filter((id) => id !== me.id);
    }
    writeDb(db);
    res.json({ user: sanitizeUser(me, db) });
  });

  // Stories (Momentos 24h: Texto, Foto, Vídeo, Áudio + Música Global)
  app.get('/api/stories', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const now = Date.now();
    const active = db.stories
      .filter((s) => s.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((s) => {
        const author = db.users.find((u) => u.id === s.authorId);
        return {
          id: s.id,
          authorId: s.authorId,
          authorName: author?.name || 'Utilizador Vibba',
          authorHandle: author?.handle || '@vibba',
          authorAvatar: author?.avatarUrl || '',
          text: s.text,
          imageUrl: s.imageUrl,
          videoUrl: s.videoUrl,
          audioUrl: s.audioUrl,
          audioDurationSec: s.audioDurationSec,
          musicTrack: findMusicTrackById(s.musicTrackId),
          bgVariant: s.bgVariant,
          viewedByMe: s.viewerIds.includes(req.authUser!.id),
          viewsCount: s.viewerIds.length,
          createdAt: s.createdAt,
          createdAtLabel: formatRelativeTime(s.createdAt),
          expiresAt: s.expiresAt,
        };
      });
    res.json({ stories: active });
  });

  app.post('/api/stories', requireAuth, (req: AuthenticatedRequest, res) => {
    const body = req.body as {
      text?: string;
      imageUrl?: string;
      videoUrl?: string;
      audioUrl?: string;
      audioDurationSec?: number;
      musicTrackId?: string;
      bgVariant?: 'royal' | 'gold' | 'plum';
    };
    const text = (body.text || '').trim().slice(0, 180);
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';
    const audioUrl = typeof body.audioUrl === 'string' ? body.audioUrl.trim() : '';
    const audioDurationSec =
      typeof body.audioDurationSec === 'number' &&
      Number.isFinite(body.audioDurationSec) &&
      body.audioDurationSec >= 0
        ? Math.min(Math.round(body.audioDurationSec), 180)
        : undefined;
    const selectedTrack = body.musicTrackId
      ? findMusicTrackById(body.musicTrackId)
      : null;

    if (body.musicTrackId && !selectedTrack) {
      res.status(400).json({ error: 'Música seleccionada não encontrada na Store de Músicas.' });
      return;
    }

    const bgVariant =
      body.bgVariant === 'gold' || body.bgVariant === 'plum'
        ? body.bgVariant
        : 'royal';

    if (!text && !imageUrl && !videoUrl && !audioUrl && !selectedTrack) {
      res.status(400).json({
        error: 'Adiciona texto, foto, vídeo, áudio ou escolhe uma música para a história.',
      });
      return;
    }
    if (imageUrl.length > 2_500_000) {
      res.status(400).json({ error: 'A imagem da história é demasiado grande.' });
      return;
    }
    if (videoUrl) {
      const isUploadedPath = videoUrl.startsWith('/uploads/');
      const isDataVideo = videoUrl.startsWith('data:video/') && videoUrl.length <= 7_000_000;
      if (!isUploadedPath && !isDataVideo) {
        res.status(400).json({ error: 'Formato ou tamanho de vídeo inválido.' });
        return;
      }
    }
    if (audioUrl) {
      const isUploadedAudio = audioUrl.startsWith('/uploads/');
      if (
        !isUploadedAudio &&
        !audioUrl.startsWith('data:audio/') &&
        !audioUrl.startsWith('data:video/')
      ) {
        res.status(400).json({ error: 'Formato de áudio inválido.' });
        return;
      }
      if (!isUploadedAudio && audioUrl.length > 5_200_000) {
        res.status(400).json({
          error: 'O áudio da história é demasiado grande (máximo ~3.5 MB).',
        });
        return;
      }
    }

    const db = readDb();
    const now = Date.now();
    const story: DbStory = {
      id: `str_${crypto.randomUUID()}`,
      authorId: req.authUser!.id,
      text,
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      audioUrl: audioUrl || undefined,
      audioDurationSec: audioUrl ? audioDurationSec : undefined,
      musicTrackId: selectedTrack ? selectedTrack.id : undefined,
      bgVariant,
      viewerIds: [req.authUser!.id],
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    };
    db.stories.unshift(story);
    writeDb(db);
    res.status(201).json({ storyId: story.id });
  });

  app.post('/api/stories/:id/view', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const story = db.stories.find((s) => s.id === req.params.id);
    if (!story) {
      res.status(404).json({ error: 'Momento não encontrado.' });
      return;
    }
    if (!story.viewerIds.includes(req.authUser!.id)) {
      story.viewerIds.push(req.authUser!.id);
      writeDb(db);
    }
    res.json({ ok: true });
  });

  app.delete('/api/stories/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const idx = db.stories.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Momento não encontrado.' });
      return;
    }
    if (
      db.stories[idx].authorId !== req.authUser!.id &&
      !isOwnerEmail(req.authUser!.email)
    ) {
      res.status(403).json({ error: 'Só podes apagar os teus próprios Momentos.' });
      return;
    }
    db.stories.splice(idx, 1);
    writeDb(db);
    res.json({ ok: true });
  });

  // Notifications
  app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const items = db.notifications
      .filter((n) => n.userId === req.authUser!.id)
      .slice(0, 40)
      .map((n) => ({
        ...n,
        createdAtLabel: formatRelativeTime(n.createdAt),
      }));
    const unreadCount = items.filter((n) => !n.read).length;
    res.json({ notifications: items, unreadCount });
  });

  app.post('/api/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    for (const n of db.notifications) {
      if (n.userId === req.authUser!.id) {
        n.read = true;
      }
    }
    writeDb(db);
    res.json({ ok: true });
  });

  // Posts (Feed, Group wall, Page wall)
  app.get('/api/posts', requireAuth, (req: AuthenticatedRequest, res) => {
    const groupId = String(req.query.groupId || '').trim();
    const pageId = String(req.query.pageId || '').trim();
    const db = readDb();
    const viewer = db.users.find((u) => u.id === req.authUser!.id) || req.authUser!;

    const filtered = db.posts
      .filter((p) => {
        if (groupId) return p.groupId === groupId;
        if (pageId) return p.pageId === pageId;
        return !p.groupId && canViewPost(p, viewer, db);
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((p) => serializePost(p, viewer.id, db));

    res.json({ posts: filtered });
  });

  app.post('/api/posts', requireAuth, (req: AuthenticatedRequest, res) => {
    const body = req.body as {
      content?: string;
      location?: string;
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
    };

    const content = (body.content || '').trim();
    const location = (body.location || '').trim() || req.authUser!.location || 'Angola';
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';
    const audioUrl = typeof body.audioUrl === 'string' ? body.audioUrl.trim() : '';
    const selectedTrack = body.musicTrackId
      ? findMusicTrackById(body.musicTrackId)
      : null;

    if (body.musicTrackId && !selectedTrack) {
      res.status(400).json({ error: 'Música seleccionada não encontrada na Store de Músicas.' });
      return;
    }

    const audioDurationSec =
      typeof body.audioDurationSec === 'number' &&
      Number.isFinite(body.audioDurationSec) &&
      body.audioDurationSec >= 0
        ? Math.min(Math.round(body.audioDurationSec), 600)
        : undefined;

    const privacy: PostPrivacy =
      body.privacy === 'friends' || body.privacy === 'only_me'
        ? body.privacy
        : 'public';
    const feeling = (body.feeling || '').trim().slice(0, 40);
    const validBg: PostBackground[] = [
      'none',
      'royal',
      'sunset',
      'ocean',
      'emerald',
      'crimson',
    ];
    const bgStyle: PostBackground =
      body.bgStyle && validBg.includes(body.bgStyle) ? body.bgStyle : 'none';

    const cleanPollOptions = Array.isArray(body.pollOptions)
      ? body.pollOptions
          .map((o) => String(o || '').trim().slice(0, 80))
          .filter(Boolean)
          .slice(0, 4)
      : [];

    if (
      !content &&
      !imageUrl &&
      !videoUrl &&
      !audioUrl &&
      !selectedTrack &&
      cleanPollOptions.length < 2
    ) {
      res.status(400).json({
        error:
          'Escreve algo, adiciona foto/vídeo, grava um áudio, escolhe uma música ou cria uma sondagem para publicar.',
      });
      return;
    }
    if (content.length > 500) {
      res.status(400).json({ error: 'A publicação pode ter no máximo 500 caracteres.' });
      return;
    }
    if (imageUrl.length > 2_500_000) {
      res.status(400).json({ error: 'A imagem é demasiado grande (máximo ~1.8 MB).' });
      return;
    }
    if (videoUrl) {
      const isUploadedPath = videoUrl.startsWith('/uploads/');
      const isDataVideo = videoUrl.startsWith('data:video/') && videoUrl.length <= 7_000_000;
      if (!isUploadedPath && !isDataVideo) {
        res.status(400).json({ error: 'Formato ou tamanho de vídeo inválido.' });
        return;
      }
    }
    if (audioUrl) {
      const isUploadedAudio = audioUrl.startsWith('/uploads/');
      if (
        !isUploadedAudio &&
        !audioUrl.startsWith('data:audio/') &&
        !audioUrl.startsWith('data:video/')
      ) {
        res.status(400).json({ error: 'Formato de áudio inválido.' });
        return;
      }
      if (!isUploadedAudio && audioUrl.length > 5_200_000) {
        res.status(400).json({
          error: 'O áudio é demasiado grande (máximo ~3.5 MB). Grava um áudio mais curto.',
        });
        return;
      }
    }

    const db = readDb();
    let groupId: string | null = null;
    if (body.groupId) {
      const grp = db.groups.find((g) => g.id === body.groupId);
      if (!grp) {
        res.status(404).json({ error: 'Grupo não encontrado.' });
        return;
      }
      if (!grp.memberIds.includes(req.authUser!.id)) {
        res.status(403).json({ error: 'Entra no grupo antes de publicar nele.' });
        return;
      }
      groupId = grp.id;
    }

    let pageId: string | null = null;
    if (body.pageId) {
      const pg = db.pages.find((p) => p.id === body.pageId);
      if (!pg) {
        res.status(404).json({ error: 'Página não encontrada.' });
        return;
      }
      if (pg.ownerId !== req.authUser!.id) {
        res.status(403).json({ error: 'Só o criador da página pode publicar como página.' });
        return;
      }
      pageId = pg.id;
    }

    const post: DbPost = {
      id: `pst_${crypto.randomUUID()}`,
      authorId: req.authUser!.id,
      location,
      privacy,
      feeling: feeling || undefined,
      bgStyle:
        !imageUrl && !videoUrl && !audioUrl && cleanPollOptions.length < 2
          ? bgStyle
          : 'none',
      editedAt: null,
      groupId,
      pageId,
      content,
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      audioUrl: audioUrl || undefined,
      audioDurationSec: audioUrl ? audioDurationSec : undefined,
      musicTrackId: selectedTrack ? selectedTrack.id : undefined,
      poll:
        cleanPollOptions.length >= 2
          ? {
              options: cleanPollOptions.map((text) => ({
                id: `opt_${crypto.randomUUID().slice(0, 8)}`,
                text,
                voterIds: [],
              })),
            }
          : null,
      likedByIds: [],
      reactions: {},
      savedByIds: [],
      comments: [],
      createdAt: Date.now(),
    };

    db.posts.unshift(post);
    const vibbaPointsDelta = awardVibbaPoints(db, req.authUser!.id, 10, 'posts');
    const updatedActor = db.users.find((u) => u.id === req.authUser!.id);
    writeDb(db);
    res.status(201).json({
      post: serializePost(post, req.authUser!.id, db),
      vibbaPointsDelta,
      user: updatedActor ? sanitizeUser(updatedActor, db) : undefined,
    });
  });

  // Edit own post
  app.patch('/api/posts/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    if (post.authorId !== req.authUser!.id) {
      res.status(403).json({ error: 'Só podes editar as tuas próprias publicações.' });
      return;
    }
    const body = req.body as {
      content?: string;
      privacy?: PostPrivacy;
      feeling?: string;
      location?: string;
    };
    if (typeof body.content === 'string') {
      const next = body.content.trim().slice(0, 500);
      if (!next && !post.imageUrl && !post.videoUrl && !post.audioUrl && !post.poll) {
        res.status(400).json({ error: 'A publicação não pode ficar vazia.' });
        return;
      }
      post.content = next;
    }
    if (
      body.privacy === 'public' ||
      body.privacy === 'friends' ||
      body.privacy === 'only_me'
    ) {
      post.privacy = body.privacy;
    }
    if (typeof body.feeling === 'string') {
      post.feeling = body.feeling.trim().slice(0, 40) || undefined;
    }
    if (typeof body.location === 'string') {
      post.location = body.location.trim().slice(0, 60) || post.location;
    }
    post.editedAt = Date.now();
    writeDb(db);
    res.json({ post: serializePost(post, req.authUser!.id, db) });
  });

  // Delete own post (or owner moderation)
  app.delete('/api/posts/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const idx = db.posts.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    if (
      db.posts[idx].authorId !== req.authUser!.id &&
      !isOwnerEmail(req.authUser!.email)
    ) {
      res.status(403).json({ error: 'Só podes apagar as tuas próprias publicações.' });
      return;
    }
    const removedPostId = db.posts[idx].id;
    db.posts.splice(idx, 1);
    for (const r of db.reports || []) {
      if (r.postId === removedPostId) r.status = 'resolved';
    }
    writeDb(db);
    res.json({ ok: true });
  });

  // Delete comment (author, post author, or owner)
  app.delete(
    '/api/posts/:id/comments/:commentId',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const db = readDb();
      const post = db.posts.find((p) => p.id === req.params.id);
      if (!post) {
        res.status(404).json({ error: 'Publicação não encontrada.' });
        return;
      }
      const cIdx = post.comments.findIndex((c) => c.id === req.params.commentId);
      if (cIdx === -1) {
        res.status(404).json({ error: 'Comentário não encontrado.' });
        return;
      }
      const cmt = post.comments[cIdx];
      if (
        cmt.authorId !== req.authUser!.id &&
        post.authorId !== req.authUser!.id &&
        !isOwnerEmail(req.authUser!.email)
      ) {
        res.status(403).json({ error: 'Sem permissão para apagar este comentário.' });
        return;
      }
      post.comments.splice(cIdx, 1);
      writeDb(db);
      res.json({ post: serializePost(post, req.authUser!.id, db) });
    }
  );

  // Expressive Facebook Reaction (7 types)
  app.post('/api/posts/:id/react', requireAuth, (req: AuthenticatedRequest, res) => {
    const reaction = (req.body as { reaction?: ReactionType }).reaction;
    const valid: ReactionType[] = [
      'like',
      'love',
      'care',
      'haha',
      'wow',
      'sad',
      'angry',
    ];
    if (!reaction || !valid.includes(reaction)) {
      res.status(400).json({ error: 'Reacção inválida.' });
      return;
    }
    const db = readDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    const uid = req.authUser!.id;
    post.reactions = post.reactions || {};
    const hadReactionBefore = Boolean(post.reactions[uid]);
    let vibbaPointsDelta = 0;

    if (post.reactions[uid] === reaction) {
      delete post.reactions[uid];
      post.likedByIds = post.likedByIds.filter((id) => id !== uid);
      if (post.authorId !== uid) {
        vibbaPointsDelta = awardVibbaPoints(db, uid, -5, 'reactions');
        awardVibbaPoints(db, post.authorId, -2, 'received');
      }
    } else {
      post.reactions[uid] = reaction;
      if (!post.likedByIds.includes(uid)) post.likedByIds.push(uid);
      if (!hadReactionBefore && post.authorId !== uid) {
        vibbaPointsDelta = awardVibbaPoints(db, uid, 5, 'reactions');
        awardVibbaPoints(db, post.authorId, 2, 'received');
      }
      pushNotification(db, {
        userId: post.authorId,
        actor: req.authUser!,
        type: 'reaction',
        message: `${req.authUser!.name} reagiu à tua publicação.`,
      });
    }
    const updatedActor = db.users.find((u) => u.id === uid);
    writeDb(db);
    res.json({
      post: serializePost(post, uid, db),
      vibbaPointsDelta,
      user: updatedActor ? sanitizeUser(updatedActor, db) : undefined,
    });
  });

  // Vote on Poll
  app.post('/api/posts/:id/poll/:optionId', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post || !post.poll) {
      res.status(404).json({ error: 'Sondagem não encontrada.' });
      return;
    }
    const option = post.poll.options.find((o) => o.id === req.params.optionId);
    if (!option) {
      res.status(404).json({ error: 'Opção inválida.' });
      return;
    }
    const uid = req.authUser!.id;
    const alreadyVotedThis = option.voterIds.includes(uid);
    for (const opt of post.poll.options) {
      opt.voterIds = opt.voterIds.filter((id) => id !== uid);
    }
    if (!alreadyVotedThis) {
      option.voterIds.push(uid);
    }
    writeDb(db);
    res.json({ post: serializePost(post, uid, db) });
  });

  // Save / Bookmark post
  app.post('/api/posts/:id/save', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    post.savedByIds = post.savedByIds || [];
    const uid = req.authUser!.id;
    const idx = post.savedByIds.indexOf(uid);
    if (idx >= 0) {
      post.savedByIds.splice(idx, 1);
    } else {
      post.savedByIds.push(uid);
    }
    writeDb(db);
    res.json({ post: serializePost(post, uid, db) });
  });

  // Share / Repost to Feed
  app.post('/api/posts/:id/share', requireAuth, (req: AuthenticatedRequest, res) => {
    const note = ((req.body as { note?: string }).note || '').trim().slice(0, 240);
    const db = readDb();
    const target = db.posts.find((p) => p.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    const targetAuthor = db.users.find((u) => u.id === target.authorId);
    const newPost: DbPost = {
      id: `pst_${crypto.randomUUID()}`,
      authorId: req.authUser!.id,
      location: req.authUser!.location || 'Angola',
      privacy: 'public',
      content: note,
      likedByIds: [],
      reactions: {},
      savedByIds: [],
      sharedPost: {
        originalPostId: target.id,
        authorName: targetAuthor?.name || 'Utilizador Vibba',
        authorHandle: targetAuthor?.handle || '@vibba',
        content: target.content,
        imageUrl: target.imageUrl,
        videoUrl: target.videoUrl,
        audioUrl: target.audioUrl,
        audioDurationSec: target.audioDurationSec,
        musicTrackId: target.musicTrackId,
      },
      comments: [],
      createdAt: Date.now(),
    };
    db.posts.unshift(newPost);
    let vibbaPointsDelta = 0;
    if (target.authorId !== req.authUser!.id) {
      vibbaPointsDelta = awardVibbaPoints(db, req.authUser!.id, 15, 'shares');
      awardVibbaPoints(db, target.authorId, 5, 'received');
    }
    const updatedActor = db.users.find((u) => u.id === req.authUser!.id);
    writeDb(db);
    res.status(201).json({
      post: serializePost(newPost, req.authUser!.id, db),
      vibbaPointsDelta,
      user: updatedActor ? sanitizeUser(updatedActor, db) : undefined,
    });
  });

  // Add Comment or Reply to Comment (supports text and/or audio)
  app.post('/api/posts/:id/comments', requireAuth, (req: AuthenticatedRequest, res) => {
    const body = req.body as {
      text?: string;
      audioUrl?: string;
      audioDurationSec?: number;
      parentCommentId?: string;
    };
    const text = (body.text || '').trim();
    const audioUrl = typeof body.audioUrl === 'string' ? body.audioUrl.trim() : '';
    const audioDurationSec =
      typeof body.audioDurationSec === 'number' &&
      Number.isFinite(body.audioDurationSec) &&
      body.audioDurationSec >= 0
        ? Math.min(Math.round(body.audioDurationSec), 300)
        : undefined;

    if (!text && !audioUrl) {
      res.status(400).json({ error: 'Escreve um comentário ou grava um áudio.' });
      return;
    }
    if (text.length > 280) {
      res.status(400).json({ error: 'O comentário deve ter no máximo 280 caracteres.' });
      return;
    }
    if (audioUrl) {
      const isUploadedAudio = audioUrl.startsWith('/uploads/');
      if (
        !isUploadedAudio &&
        !audioUrl.startsWith('data:audio/') &&
        !audioUrl.startsWith('data:video/')
      ) {
        res.status(400).json({ error: 'Formato de áudio do comentário inválido.' });
        return;
      }
      if (!isUploadedAudio && audioUrl.length > 5_200_000) {
        res.status(400).json({ error: 'O áudio do comentário é demasiado grande.' });
        return;
      }
    }

    const db = readDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }

    if (body.parentCommentId) {
      const parent = post.comments.find((c) => c.id === body.parentCommentId);
      if (!parent) {
        res.status(404).json({ error: 'Comentário original não encontrado.' });
        return;
      }
      parent.replies = parent.replies || [];
      parent.replies.push({
        id: `rpl_${crypto.randomUUID()}`,
        authorId: req.authUser!.id,
        authorName: req.authUser!.name,
        authorHandle: req.authUser!.handle,
        text,
        audioUrl: audioUrl || undefined,
        audioDurationSec: audioUrl ? audioDurationSec : undefined,
        createdAt: Date.now(),
      });
      pushNotification(db, {
        userId: parent.authorId,
        actor: req.authUser!,
        type: 'reply',
        message: text
          ? `${req.authUser!.name} respondeu ao teu comentário: "${text.slice(0, 50)}"`
          : `${req.authUser!.name} respondeu com um áudio ao teu comentário.`,
      });
    } else {
      post.comments.push({
        id: `cmt_${crypto.randomUUID()}`,
        authorId: req.authUser!.id,
        authorName: req.authUser!.name,
        authorHandle: req.authUser!.handle,
        text,
        audioUrl: audioUrl || undefined,
        audioDurationSec: audioUrl ? audioDurationSec : undefined,
        likedByIds: [],
        replies: [],
        createdAt: Date.now(),
      });
      pushNotification(db, {
        userId: post.authorId,
        actor: req.authUser!,
        type: 'comment',
        message: text
          ? `${req.authUser!.name} comentou: "${text.slice(0, 60)}"`
          : `${req.authUser!.name} comentou com uma nota de voz.`,
      });
    }

    let vibbaPointsDelta = 0;
    if (post.authorId !== req.authUser!.id) {
      vibbaPointsDelta = awardVibbaPoints(db, req.authUser!.id, 10, 'comments');
      awardVibbaPoints(db, post.authorId, 3, 'received');
    }
    const updatedActor = db.users.find((u) => u.id === req.authUser!.id);

    writeDb(db);
    res.status(201).json({
      post: serializePost(post, req.authUser!.id, db),
      vibbaPointsDelta,
      user: updatedActor ? sanitizeUser(updatedActor, db) : undefined,
    });
  });

  // Like / Unlike a Comment
  app.post(
    '/api/posts/:id/comments/:commentId/like',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const db = readDb();
      const post = db.posts.find((p) => p.id === req.params.id);
      if (!post) {
        res.status(404).json({ error: 'Publicação não encontrada.' });
        return;
      }
      const comment = post.comments.find((c) => c.id === req.params.commentId);
      if (!comment) {
        res.status(404).json({ error: 'Comentário não encontrado.' });
        return;
      }
      comment.likedByIds = comment.likedByIds || [];
      const uid = req.authUser!.id;
      const idx = comment.likedByIds.indexOf(uid);
      let vibbaPointsDelta = 0;
      if (idx >= 0) {
        comment.likedByIds.splice(idx, 1);
        if (comment.authorId !== uid) {
          vibbaPointsDelta = awardVibbaPoints(db, uid, -3, 'reactions');
        }
      } else {
        comment.likedByIds.push(uid);
        if (comment.authorId !== uid) {
          vibbaPointsDelta = awardVibbaPoints(db, uid, 3, 'reactions');
          awardVibbaPoints(db, comment.authorId, 1, 'received');
        }
      }
      const updatedActor = db.users.find((u) => u.id === uid);
      writeDb(db);
      res.json({
        post: serializePost(post, uid, db),
        vibbaPointsDelta,
        user: updatedActor ? sanitizeUser(updatedActor, db) : undefined,
      });
    }
  );

  const REPORT_REASON_LABELS: Record<PostReportReason, string> = {
    copyright: 'Direitos de autor / MP3 comercial',
    harassment: 'Ofensa, bullying ou exposição privada',
    scam: 'Burla ou pedido de dinheiro',
    nsfw: 'Conteúdo +18 ou violência',
  };

  // Report a post for moderation (copyright, harassment, scam, nsfw)
  app.post('/api/posts/:id/report', requireAuth, (req: AuthenticatedRequest, res) => {
    const body = req.body as { reason?: PostReportReason; details?: string };
    const reason = body.reason;
    const validReasons: PostReportReason[] = [
      'copyright',
      'harassment',
      'scam',
      'nsfw',
    ];
    if (!reason || !validReasons.includes(reason)) {
      res.status(400).json({ error: 'Selecciona um motivo válido para a denúncia.' });
      return;
    }

    const db = readDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    if (post.authorId === req.authUser!.id) {
      res.status(400).json({ error: 'Não podes denunciar a tua própria publicação.' });
      return;
    }

    db.reports = db.reports || [];
    const existing = db.reports.find(
      (r) =>
        r.postId === post.id &&
        r.reporterId === req.authUser!.id &&
        r.status === 'open'
    );
    if (existing) {
      res.json({ ok: true, alreadyReported: true });
      return;
    }

    const details = (body.details || '').trim().slice(0, 240);
    const report: DbReport = {
      id: `rep_${crypto.randomUUID()}`,
      postId: post.id,
      reporterId: req.authUser!.id,
      reason,
      details,
      status: 'open',
      createdAt: Date.now(),
    };
    db.reports.unshift(report);
    if (db.reports.length > 500) {
      db.reports = db.reports.slice(0, 500);
    }

    const owner = db.users.find((u) => isOwnerEmail(u.email));
    if (owner) {
      pushNotification(db, {
        userId: owner.id,
        actor: req.authUser!,
        type: 'report',
        message: `denunciou uma publicação (${REPORT_REASON_LABELS[reason]}).`,
      });
    }

    writeDb(db);
    res.status(201).json({ ok: true });
  });

  // MESSENGER: List conversations
  app.get('/api/messages/conversations', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const me = db.users.find((u) => u.id === req.authUser!.id);
    if (!me) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }

    const peerMap = new Map<string, DbMessage[]>();
    for (const m of db.messages) {
      if (m.senderId === me.id) {
        const list = peerMap.get(m.receiverId) || [];
        list.push(m);
        peerMap.set(m.receiverId, list);
      } else if (m.receiverId === me.id) {
        const list = peerMap.get(m.senderId) || [];
        list.push(m);
        peerMap.set(m.senderId, list);
      }
    }

    let totalUnread = 0;
    const conversations = [];

    for (const [peerId, msgs] of peerMap.entries()) {
      const peer = db.users.find((u) => u.id === peerId);
      if (!peer) continue;
      msgs.sort((a, b) => b.createdAt - a.createdAt);
      const unreadCount = msgs.filter(
        (m) => m.receiverId === me.id && m.readAt === null
      ).length;
      totalUnread += unreadCount;
      conversations.push({
        peer: serializeMember(peer, me, db),
        lastMessage: msgs[0] ? serializeMessage(msgs[0]) : null,
        unreadCount,
      });
    }

    conversations.sort(
      (a, b) => (b.lastMessage?.createdAt || 0) - (a.lastMessage?.createdAt || 0)
    );

    res.json({ conversations, totalUnread });
  });

  // MESSENGER: Get thread with a specific user
  app.get('/api/messages/:peerId', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const me = db.users.find((u) => u.id === req.authUser!.id);
    const peer = db.users.find((u) => u.id === req.params.peerId);
    if (!me || !peer) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }

    let updated = false;
    const now = Date.now();
    const thread = db.messages
      .filter(
        (m) =>
          (m.senderId === me.id && m.receiverId === peer.id) ||
          (m.senderId === peer.id && m.receiverId === me.id)
      )
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const m of thread) {
      if (m.receiverId === me.id && m.readAt === null) {
        m.readAt = now;
        updated = true;
      }
    }
    if (updated) {
      writeDb(db);
      sendToUser(peer.id, 'message:read', { byUserId: me.id, readAt: now });
    }

    res.json({
      peer: serializeMember(peer, me, db),
      messages: thread.map(serializeMessage),
    });
  });

  // MESSENGER: Send message (text, image, and/or voice note)
  app.post('/api/messages/:peerId', requireAuth, (req: AuthenticatedRequest, res) => {
    const peerId = req.params.peerId;
    if (peerId === req.authUser!.id) {
      res.status(400).json({ error: 'Não podes enviar mensagens para ti próprio.' });
      return;
    }
    const body = req.body as {
      text?: string;
      imageUrl?: string;
      audioUrl?: string;
      audioDurationSec?: number;
      listingTitle?: string;
    };
    const text = (body.text || '').trim().slice(0, 1000);
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const audioUrl = typeof body.audioUrl === 'string' ? body.audioUrl.trim() : '';
    const listingTitle = (body.listingTitle || '').trim().slice(0, 100);
    const audioDurationSec =
      typeof body.audioDurationSec === 'number' && Number.isFinite(body.audioDurationSec)
        ? Math.min(Math.round(body.audioDurationSec), 600)
        : undefined;

    if (!text && !imageUrl && !audioUrl) {
      res.status(400).json({ error: 'Escreve uma mensagem, envia foto ou grava áudio.' });
      return;
    }
    if (imageUrl.length > 2_500_000 || audioUrl.length > 5_200_000) {
      res.status(400).json({ error: 'O ficheiro anexado é demasiado grande.' });
      return;
    }

    const db = readDb();
    const peer = db.users.find((u) => u.id === peerId);
    if (!peer) {
      res.status(404).json({ error: 'Destinatário não encontrado.' });
      return;
    }

    const msg: DbMessage = {
      id: `msg_${crypto.randomUUID()}`,
      senderId: req.authUser!.id,
      receiverId: peer.id,
      text,
      imageUrl: imageUrl || undefined,
      audioUrl: audioUrl || undefined,
      audioDurationSec: audioUrl ? audioDurationSec : undefined,
      listingTitle: listingTitle || undefined,
      readAt: null,
      createdAt: Date.now(),
    };

    db.messages.push(msg);
    writeDb(db);

    const serialized = serializeMessage(msg);
    sendToUser(peer.id, 'message:new', {
      message: serialized,
      senderName: req.authUser!.name,
    });
    sendToUser(req.authUser!.id, 'message:new', {
      message: serialized,
      senderName: req.authUser!.name,
    });

    res.status(201).json({ message: serialized });
  });

  app.post('/api/messages/:peerId/read', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const now = Date.now();
    let changed = false;
    for (const m of db.messages) {
      if (
        m.senderId === req.params.peerId &&
        m.receiverId === req.authUser!.id &&
        m.readAt === null
      ) {
        m.readAt = now;
        changed = true;
      }
    }
    if (changed) {
      writeDb(db);
      sendToUser(req.params.peerId, 'message:read', {
        byUserId: req.authUser!.id,
        readAt: now,
      });
    }
    res.json({ ok: true });
  });

  // GROUPS
  app.get('/api/groups', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const groups = [...db.groups]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((g) => serializeGroup(g, req.authUser!.id, db));
    res.json({ groups });
  });

  app.post('/api/groups', requireAuth, (req: AuthenticatedRequest, res) => {
    const body = req.body as {
      name?: string;
      description?: string;
      category?: string;
      privacy?: 'public' | 'private';
      coverUrl?: string;
    };
    const name = (body.name || '').trim();
    const description = (body.description || '').trim().slice(0, 300);
    const category = (body.category || '').trim() || 'Comunidade';
    const privacy = body.privacy === 'private' ? 'private' : 'public';
    const coverUrl = typeof body.coverUrl === 'string' ? body.coverUrl.trim() : '';

    if (name.length < 3 || name.length > 60) {
      res.status(400).json({ error: 'O nome do grupo deve ter entre 3 e 60 caracteres.' });
      return;
    }
    if (coverUrl.length > 2_500_000) {
      res.status(400).json({ error: 'Imagem de capa do grupo demasiado grande.' });
      return;
    }

    const db = readDb();
    const group: DbGroup = {
      id: `grp_${crypto.randomUUID()}`,
      name,
      description,
      category,
      privacy,
      coverUrl: coverUrl || undefined,
      creatorId: req.authUser!.id,
      memberIds: [req.authUser!.id],
      createdAt: Date.now(),
    };
    db.groups.unshift(group);
    writeDb(db);
    res.status(201).json({ group: serializeGroup(group, req.authUser!.id, db) });
  });

  app.post('/api/groups/:id/join', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const group = db.groups.find((g) => g.id === req.params.id);
    if (!group) {
      res.status(404).json({ error: 'Grupo não encontrado.' });
      return;
    }
    const uid = req.authUser!.id;
    const idx = group.memberIds.indexOf(uid);
    if (idx >= 0) {
      group.memberIds.splice(idx, 1);
    } else {
      group.memberIds.push(uid);
      pushNotification(db, {
        userId: group.creatorId,
        actor: req.authUser!,
        type: 'group',
        message: `${req.authUser!.name} entrou no teu grupo "${group.name}".`,
      });
    }
    writeDb(db);
    res.json({ group: serializeGroup(group, uid, db) });
  });

  // MARKETPLACE
  app.get('/api/marketplace', requireAuth, (req: AuthenticatedRequest, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const cat = String(req.query.category || '').trim();
    const db = readDb();
    const listings = db.listings
      .filter((l) => {
        if (cat && cat !== 'Todas' && l.category !== cat) return false;
        if (!q) return true;
        return (
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((l) => serializeListing(l, req.authUser!.id, db));
    res.json({ listings });
  });

  app.post('/api/marketplace', requireAuth, (req: AuthenticatedRequest, res) => {
    const body = req.body as {
      title?: string;
      priceKz?: number;
      category?: string;
      condition?: 'Novo' | 'Como novo' | 'Usado';
      location?: string;
      description?: string;
      imageUrl?: string;
    };
    const title = (body.title || '').trim();
    const priceKz = Math.round(Number(body.priceKz));
    const category = (body.category || '').trim() || 'Outros';
    const condition: 'Novo' | 'Como novo' | 'Usado' =
      body.condition === 'Novo' || body.condition === 'Como novo'
        ? body.condition
        : 'Usado';
    const location = (body.location || '').trim() || req.authUser!.location || 'Angola';
    const description = (body.description || '').trim().slice(0, 500);
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';

    if (title.length < 3 || title.length > 80) {
      res.status(400).json({ error: 'Indica um título para o artigo (3 a 80 caracteres).' });
      return;
    }
    if (!Number.isFinite(priceKz) || priceKz < 0) {
      res.status(400).json({ error: 'Indica um preço válido em Kz (0 se for grátis).' });
      return;
    }
    if (imageUrl.length > 2_500_000) {
      res.status(400).json({ error: 'Foto do artigo demasiado grande.' });
      return;
    }

    const db = readDb();
    const listing: DbListing = {
      id: `mkt_${crypto.randomUUID()}`,
      sellerId: req.authUser!.id,
      title,
      priceKz,
      category,
      condition,
      location,
      description,
      imageUrl: imageUrl || undefined,
      status: 'available',
      createdAt: Date.now(),
    };
    db.listings.unshift(listing);
    writeDb(db);
    res.status(201).json({ listing: serializeListing(listing, req.authUser!.id, db) });
  });

  app.patch('/api/marketplace/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const listing = db.listings.find((l) => l.id === req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Anúncio não encontrado.' });
      return;
    }
    if (listing.sellerId !== req.authUser!.id) {
      res.status(403).json({ error: 'Só podes gerir os teus próprios anúncios.' });
      return;
    }
    listing.status = listing.status === 'available' ? 'sold' : 'available';
    writeDb(db);
    res.json({ listing: serializeListing(listing, req.authUser!.id, db) });
  });

  app.delete('/api/marketplace/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const idx = db.listings.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Anúncio não encontrado.' });
      return;
    }
    if (
      db.listings[idx].sellerId !== req.authUser!.id &&
      !isOwnerEmail(req.authUser!.email)
    ) {
      res.status(403).json({ error: 'Só podes apagar os teus próprios anúncios.' });
      return;
    }
    db.listings.splice(idx, 1);
    writeDb(db);
    res.json({ ok: true });
  });

  // EVENTS
  app.get('/api/events', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const events = [...db.events]
      .sort((a, b) => a.dateIso.localeCompare(b.dateIso))
      .map((ev) => serializeEvent(ev, req.authUser!.id, db));
    res.json({ events });
  });

  app.post('/api/events', requireAuth, (req: AuthenticatedRequest, res) => {
    const body = req.body as {
      title?: string;
      description?: string;
      location?: string;
      dateIso?: string;
      coverUrl?: string;
    };
    const title = (body.title || '').trim();
    const description = (body.description || '').trim().slice(0, 400);
    const location = (body.location || '').trim() || 'Luanda, Angola';
    const dateIso = (body.dateIso || '').trim();
    const coverUrl = typeof body.coverUrl === 'string' ? body.coverUrl.trim() : '';

    if (title.length < 3 || title.length > 80) {
      res.status(400).json({ error: 'Indica o nome do evento (3 a 80 caracteres).' });
      return;
    }
    if (!dateIso) {
      res.status(400).json({ error: 'Escolhe a data e hora do evento.' });
      return;
    }
    if (coverUrl.length > 2_500_000) {
      res.status(400).json({ error: 'Imagem de capa do evento demasiado grande.' });
      return;
    }

    const db = readDb();
    const ev: DbEvent = {
      id: `evt_${crypto.randomUUID()}`,
      creatorId: req.authUser!.id,
      title,
      description,
      location,
      dateIso,
      coverUrl: coverUrl || undefined,
      goingIds: [req.authUser!.id],
      interestedIds: [],
      createdAt: Date.now(),
    };
    db.events.unshift(ev);
    writeDb(db);
    res.status(201).json({ event: serializeEvent(ev, req.authUser!.id, db) });
  });

  app.post('/api/events/:id/rsvp', requireAuth, (req: AuthenticatedRequest, res) => {
    const status = (req.body as { status?: string }).status;
    if (status !== 'going' && status !== 'interested') {
      res.status(400).json({ error: 'Estado inválido.' });
      return;
    }
    const db = readDb();
    const ev = db.events.find((e) => e.id === req.params.id);
    if (!ev) {
      res.status(404).json({ error: 'Evento não encontrado.' });
      return;
    }
    const uid = req.authUser!.id;
    const wasGoing = ev.goingIds.includes(uid);
    const wasInterested = ev.interestedIds.includes(uid);

    ev.goingIds = ev.goingIds.filter((id) => id !== uid);
    ev.interestedIds = ev.interestedIds.filter((id) => id !== uid);

    if (status === 'going' && !wasGoing) {
      ev.goingIds.push(uid);
    } else if (status === 'interested' && !wasInterested) {
      ev.interestedIds.push(uid);
    }

    writeDb(db);
    res.json({ event: serializeEvent(ev, uid, db) });
  });

  // PAGES
  app.get('/api/pages', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const pages = [...db.pages]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((pg) => serializePage(pg, req.authUser!.id, db));
    res.json({ pages });
  });

  app.post('/api/pages', requireAuth, (req: AuthenticatedRequest, res) => {
    const body = req.body as {
      name?: string;
      category?: string;
      bio?: string;
      avatarUrl?: string;
      coverUrl?: string;
    };
    const name = (body.name || '').trim();
    const category = (body.category || '').trim() || 'Criador / Marca';
    const bio = (body.bio || '').trim().slice(0, 260);
    const avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : '';
    const coverUrl = typeof body.coverUrl === 'string' ? body.coverUrl.trim() : '';

    if (name.length < 2 || name.length > 60) {
      res.status(400).json({ error: 'O nome da página deve ter entre 2 e 60 caracteres.' });
      return;
    }

    const db = readDb();
    const page: DbPage = {
      id: `pag_${crypto.randomUUID()}`,
      ownerId: req.authUser!.id,
      name,
      category,
      bio,
      avatarUrl: avatarUrl || undefined,
      coverUrl: coverUrl || undefined,
      followerIds: [req.authUser!.id],
      createdAt: Date.now(),
    };
    db.pages.unshift(page);
    writeDb(db);
    res.status(201).json({ page: serializePage(page, req.authUser!.id, db) });
  });

  app.post('/api/pages/:id/follow', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const pg = db.pages.find((p) => p.id === req.params.id);
    if (!pg) {
      res.status(404).json({ error: 'Página não encontrada.' });
      return;
    }
    const uid = req.authUser!.id;
    const idx = pg.followerIds.indexOf(uid);
    if (idx >= 0) pg.followerIds.splice(idx, 1);
    else pg.followerIds.push(uid);
    writeDb(db);
    res.json({ page: serializePage(pg, uid, db) });
  });

  // GLOBAL SEARCH (People, Posts, Groups, Pages, Marketplace)
  app.get('/api/search', requireAuth, (req: AuthenticatedRequest, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const db = readDb();
    const me = db.users.find((u) => u.id === req.authUser!.id);
    if (!me || !q) {
      res.json({ users: [], posts: [], groups: [], pages: [], listings: [] });
      return;
    }

    const users = db.users
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.handle.toLowerCase().includes(q) ||
          u.location.toLowerCase().includes(q)
      )
      .slice(0, 10)
      .map((u) => serializeMember(u, me, db));

    const posts = db.posts
      .filter((p) => canViewPost(p, me, db) && p.content.toLowerCase().includes(q))
      .slice(0, 15)
      .map((p) => serializePost(p, me.id, db));

    const groups = db.groups
      .filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q)
      )
      .slice(0, 8)
      .map((g) => serializeGroup(g, me.id, db));

    const pages = db.pages
      .filter(
        (pg) =>
          pg.name.toLowerCase().includes(q) ||
          pg.bio.toLowerCase().includes(q)
      )
      .slice(0, 8)
      .map((pg) => serializePage(pg, me.id, db));

    const listings = db.listings
      .filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      )
      .slice(0, 8)
      .map((l) => serializeListing(l, me.id, db));

    res.json({ users, posts, groups, pages, listings });
  });

  app.delete('/api/groups/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const idx = db.groups.findIndex((g) => g.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Grupo não encontrado.' });
      return;
    }
    if (
      db.groups[idx].creatorId !== req.authUser!.id &&
      !isOwnerEmail(req.authUser!.email)
    ) {
      res.status(403).json({ error: 'Sem permissão para apagar este grupo.' });
      return;
    }
    const gid = db.groups[idx].id;
    db.groups.splice(idx, 1);
    db.posts = db.posts.filter((p) => p.groupId !== gid);
    writeDb(db);
    res.json({ ok: true });
  });

  app.delete('/api/pages/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const idx = db.pages.findIndex((pg) => pg.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Página não encontrada.' });
      return;
    }
    if (
      db.pages[idx].ownerId !== req.authUser!.id &&
      !isOwnerEmail(req.authUser!.email)
    ) {
      res.status(403).json({ error: 'Sem permissão para apagar esta página.' });
      return;
    }
    const pid = db.pages[idx].id;
    db.pages.splice(idx, 1);
    db.posts = db.posts.filter((p) => p.pageId !== pid);
    writeDb(db);
    res.json({ ok: true });
  });

  app.delete('/api/events/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const idx = db.events.findIndex((ev) => ev.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Evento não encontrado.' });
      return;
    }
    if (
      db.events[idx].creatorId !== req.authUser!.id &&
      !isOwnerEmail(req.authUser!.email)
    ) {
      res.status(403).json({ error: 'Sem permissão para apagar este evento.' });
      return;
    }
    db.events.splice(idx, 1);
    writeDb(db);
    res.json({ ok: true });
  });

  // OWNER CONTROL CENTER (exclusivo para martfanilsonmartfanio@gmail.com)
  app.get(
    '/api/owner/overview',
    requireAuth,
    requireOwner,
    (req: AuthenticatedRequest, res) => {
      const db = readDb();
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const activeStories = db.stories.filter((s) => s.expiresAt > now).length;
      const totalComments = db.posts.reduce(
        (sum, p) =>
          sum +
          p.comments.reduce(
            (cSum, c) => cSum + 1 + (Array.isArray(c.replies) ? c.replies.length : 0),
            0
          ),
        0
      );

      const users = [...db.users]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((u) => ({
          id: u.id,
          name: u.name,
          handle: u.handle,
          email: u.email,
          location: u.location || 'Angola',
          bio: u.bio || '',
          avatarUrl: u.avatarUrl || '',
          isOnline: isUserOnline(u.id),
          isOwner: isOwnerEmail(u.email),
          isVerified: Boolean(u.verified || isOwnerEmail(u.email)),
          suspended: Boolean(u.suspended),
          friendsCount: isOwnerEmail(u.email) ? 0 : (u.friendIds || []).length,
          followersCount: db.users.filter((other) =>
            (other.followingIds || []).includes(u.id)
          ).length,
          postsCount: db.posts.filter((p) => p.authorId === u.id).length,
          commentsCount: db.posts.reduce(
            (sum, p) =>
              sum + p.comments.filter((c) => c.authorId === u.id).length,
            0
          ),
          messagesCount: db.messages.filter(
            (m) => m.senderId === u.id || m.receiverId === u.id
          ).length,
          vibbaPoints: Math.max(
            isOwnerEmail(u.email) ? OWNER_DEFAULT_POINTS : 0,
            Math.floor(u.vibbaPoints || 0)
          ),
          activityLevel: computeActivityLevel(u.vibbaPoints, isOwnerEmail(u.email)),
          phone: u.phone || '',
          age: isOwnerEmail(u.email)
            ? null
            : calculateAgeFromBirthDate(u.birthDate).age,
          isAdult: isUserAdult(u),
          professionalMode: Boolean(u.professionalMode && isUserAdult(u)),
          professionalCategory: u.professionalCategory || 'Criador Digital',
          createdAt: u.createdAt,
          createdAtLabel: formatRelativeTime(u.createdAt),
        }));

      const recentPosts = [...db.posts]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 100)
        .map((p) => serializePost(p, req.authUser!.id, db));

      const allReports = [...(db.reports || [])].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
        return b.createdAt - a.createdAt;
      });
      const reports = allReports.slice(0, 150).map((rep) => {
        const reportedPost = db.posts.find((p) => p.id === rep.postId);
        const postAuthor = reportedPost
          ? db.users.find((u) => u.id === reportedPost.authorId)
          : undefined;
        const reporter = db.users.find((u) => u.id === rep.reporterId);
        return {
          id: rep.id,
          postId: rep.postId,
          postAuthorId: postAuthor?.id || reportedPost?.authorId || '',
          postAuthorName: postAuthor?.name || 'Publicação removida',
          postAuthorHandle: postAuthor?.handle || '@removido',
          postContent: reportedPost?.content || '[Publicação já removida]',
          postAudioUrl: reportedPost?.audioUrl,
          postAudioDurationSec: reportedPost?.audioDurationSec,
          postImageUrl: reportedPost?.imageUrl,
          postVideoUrl: reportedPost?.videoUrl,
          reporterId: rep.reporterId,
          reporterName: reporter?.name || 'Utilizador',
          reporterHandle: reporter?.handle || '@vibba',
          reason: rep.reason,
          details: rep.details,
          status: rep.status,
          createdAt: rep.createdAt,
          createdAtLabel: formatRelativeTime(rep.createdAt),
        };
      });

      res.json({
        refreshedAt: now,
        appVersion: '8.1.0',
        ownerEmail: OWNER_EMAIL,
        stats: {
          totalUsers: db.users.length,
          onlineUsers: db.users.filter((u) => isUserOnline(u.id)).length,
          suspendedUsers: db.users.filter((u) => Boolean(u.suspended)).length,
          newUsersLast24h: db.users.filter((u) => u.createdAt >= dayAgo).length,
          totalPosts: db.posts.length,
          videoPosts: db.posts.filter((p) => Boolean(p.videoUrl)).length,
          audioPosts: db.posts.filter((p) => Boolean(p.audioUrl)).length,
          photoPosts: db.posts.filter((p) => Boolean(p.imageUrl)).length,
          totalComments,
          activeStories,
          totalMessages: db.messages.length,
          totalGroups: db.groups.length,
          totalListings: db.listings.length,
          totalEvents: db.events.length,
          totalPages: db.pages.length,
          pendingReports: (db.reports || []).filter((r) => r.status === 'open').length,
        },
        users,
        recentPosts,
        reports,
        groups: [...db.groups]
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((g) => serializeGroup(g, req.authUser!.id, db)),
        listings: [...db.listings]
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((l) => serializeListing(l, req.authUser!.id, db)),
        pages: [...db.pages]
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((pg) => serializePage(pg, req.authUser!.id, db)),
        events: [...db.events]
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((ev) => serializeEvent(ev, req.authUser!.id, db)),
      });
    }
  );

  app.post(
    '/api/owner/reports/:id/resolve',
    requireAuth,
    requireOwner,
    (req: AuthenticatedRequest, res) => {
      const status = (req.body as { status?: 'open' | 'resolved' }).status;
      const nextStatus: 'open' | 'resolved' =
        status === 'open' ? 'open' : 'resolved';
      const db = readDb();
      const rep = (db.reports || []).find((r) => r.id === req.params.id);
      if (!rep) {
        res.status(404).json({ error: 'Denúncia não encontrada.' });
        return;
      }
      rep.status = nextStatus;
      writeDb(db);
      res.json({ ok: true, status: rep.status });
    }
  );

  app.patch(
    '/api/owner/users/:id',
    requireAuth,
    requireOwner,
    (req: AuthenticatedRequest, res) => {
      const db = readDb();
      const target = db.users.find((u) => u.id === req.params.id);
      if (!target) {
        res.status(404).json({ error: 'Utilizador não encontrado.' });
        return;
      }
      const body = req.body as { verified?: boolean; suspended?: boolean };
      if (typeof body.verified === 'boolean') {
        target.verified = body.verified;
      }
      if (typeof body.suspended === 'boolean') {
        if (isOwnerEmail(target.email)) {
          res.status(400).json({ error: 'A conta do proprietário não pode ser suspensa.' });
          return;
        }
        target.suspended = body.suspended;
        if (target.suspended) {
          const sockets = onlineClients.get(target.id);
          if (sockets) {
            for (const ws of sockets) ws.close();
            onlineClients.delete(target.id);
          }
        }
      }
      writeDb(db);
      res.json({
        ok: true,
        verified: Boolean(target.verified || isOwnerEmail(target.email)),
        suspended: Boolean(target.suspended),
      });
    }
  );

  app.delete(
    '/api/owner/users/:id',
    requireAuth,
    requireOwner,
    (req: AuthenticatedRequest, res) => {
      const db = readDb();
      const idx = db.users.findIndex((u) => u.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Utilizador não encontrado.' });
        return;
      }
      const target = db.users[idx];
      if (isOwnerEmail(target.email)) {
        res.status(400).json({ error: 'Não é possível eliminar a conta do proprietário.' });
        return;
      }
      const uid = target.id;
      db.users.splice(idx, 1);
      for (const u of db.users) {
        u.friendIds = (u.friendIds || []).filter((id) => id !== uid);
        u.followingIds = (u.followingIds || []).filter((id) => id !== uid);
        u.incomingRequestIds = (u.incomingRequestIds || []).filter((id) => id !== uid);
        u.outgoingRequestIds = (u.outgoingRequestIds || []).filter((id) => id !== uid);
      }
      db.posts = db.posts.filter((p) => p.authorId !== uid);
      db.stories = db.stories.filter((s) => s.authorId !== uid);
      db.messages = db.messages.filter(
        (m) => m.senderId !== uid && m.receiverId !== uid
      );
      db.notifications = db.notifications.filter(
        (n) => n.userId !== uid && n.actorId !== uid
      );
      db.listings = db.listings.filter((l) => l.sellerId !== uid);
      for (const g of db.groups) {
        g.memberIds = g.memberIds.filter((id) => id !== uid);
      }
      const sockets = onlineClients.get(uid);
      if (sockets) {
        for (const ws of sockets) ws.close();
        onlineClients.delete(uid);
      }
      writeDb(db);
      res.json({ ok: true });
    }
  );

  app.post(
    '/api/owner/users/:id/reset-code',
    requireAuth,
    requireOwner,
    (req: AuthenticatedRequest, res) => {
      const db = readDb();
      const target = db.users.find((u) => u.id === req.params.id);
      if (!target) {
        res.status(404).json({ error: 'Utilizador não encontrado.' });
        return;
      }
      const code = String(crypto.randomInt(100000, 999999));
      const expiresAt = Date.now() + 30 * 60 * 1000;
      target.resetCodeHash = crypto
        .createHash('sha256')
        .update(`${target.id}:${code}`)
        .digest('hex');
      target.resetCodeExpiresAt = expiresAt;
      writeDb(db);
      res.json({ code, expiresAt, userName: target.name, email: target.email });
    }
  );

  let shortUrlPromise: Promise<string | null> | null = null;

  async function createShortUrl(targetUrl: string, customAlias?: string): Promise<string> {
    const cleanAlias = (customAlias || '')
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '');

    if (cleanAlias) {
      if (cleanAlias.length < 5 || cleanAlias.length > 30) {
        throw new Error(
          'O nome curto deve ter entre 5 e 30 caracteres (letras, números ou _).'
        );
      }
      const res = await fetch(
        `https://is.gd/create.php?format=json&url=${encodeURIComponent(
          targetUrl
        )}&shorturl=${encodeURIComponent(cleanAlias)}`
      );
      const data = (await res.json()) as { shorturl?: string; errormessage?: string };
      if (!data.shorturl) {
        throw new Error(
          data.errormessage?.includes('already exists')
            ? `O atalho "${cleanAlias}" já está ocupado. Escolhe outro nome (ex: ${cleanAlias}_ao).`
            : data.errormessage || 'Não foi possível criar este atalho curto.'
        );
      }
      return data.shorturl;
    }

    try {
      const res = await fetch(
        `https://is.gd/create.php?format=json&url=${encodeURIComponent(targetUrl)}`
      );
      const data = (await res.json()) as { shorturl?: string };
      if (data.shorturl) return data.shorturl;
    } catch {
      // Fallback to TinyURL below
    }

    const tinyRes = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(targetUrl)}`
    );
    const tinyText = (await tinyRes.text()).trim();
    if (!tinyRes.ok || !tinyText.startsWith('https://')) {
      throw new Error('Serviço de encurtamento temporariamente indisponível.');
    }
    return tinyText;
  }

  async function ensureDefaultShortUrl(): Promise<string | null> {
    const db = readDb();
    if (db.appConfig?.shortUrl) return db.appConfig.shortUrl;
    if (!shortUrlPromise) {
      shortUrlPromise = createShortUrl(OFFICIAL_PUBLIC_URL)
        .then((shortUrl) => {
          const latest = readDb();
          latest.appConfig = {
            ...(latest.appConfig || {}),
            shortUrl,
            updatedAt: Date.now(),
          };
          writeDb(latest);
          return shortUrl;
        })
        .catch(() => null)
        .finally(() => {
          shortUrlPromise = null;
        });
    }
    return shortUrlPromise;
  }

  app.get('/api/app-links', async (_req, res) => {
    const shortUrl = await ensureDefaultShortUrl();
    const db = readDb();
    const customDomain = db.appConfig?.customDomain || '';
    const activeShareUrl = customDomain || shortUrl || OFFICIAL_PUBLIC_URL;
    res.json({
      publicUrl: OFFICIAL_PUBLIC_URL,
      shortUrl: shortUrl || '',
      customDomain,
      activeShareUrl,
    });
  });

  app.post(
    '/api/owner/short-link',
    requireAuth,
    requireOwner,
    async (req: AuthenticatedRequest, res) => {
      try {
        const alias = String((req.body as { alias?: string }).alias || '').trim();
        const shortUrl = await createShortUrl(OFFICIAL_PUBLIC_URL, alias || undefined);
        const db = readDb();
        db.appConfig = {
          ...(db.appConfig || {}),
          shortUrl,
          updatedAt: Date.now(),
        };
        writeDb(db);
        res.json({
          publicUrl: OFFICIAL_PUBLIC_URL,
          shortUrl,
          customDomain: db.appConfig.customDomain || '',
          activeShareUrl: db.appConfig.customDomain || shortUrl,
        });
      } catch (err) {
        res.status(400).json({
          error:
            err instanceof Error
              ? err.message
              : 'Não foi possível gerar o link curto.',
        });
      }
    }
  );

  app.post(
    '/api/owner/custom-domain',
    requireAuth,
    requireOwner,
    async (req: AuthenticatedRequest, res) => {
      const rawDomain = String(
        (req.body as { customDomain?: string }).customDomain || ''
      ).trim();

      if (!rawDomain) {
        const db = readDb();
        db.appConfig = {
          ...(db.appConfig || {}),
          customDomain: '',
          updatedAt: Date.now(),
        };
        writeDb(db);
        res.json({
          publicUrl: OFFICIAL_PUBLIC_URL,
          shortUrl: db.appConfig.shortUrl || '',
          customDomain: '',
          activeShareUrl: db.appConfig.shortUrl || OFFICIAL_PUBLIC_URL,
        });
        return;
      }

      const normalized = rawDomain.startsWith('http')
        ? rawDomain.replace(/\/+$/, '')
        : `https://${rawDomain.replace(/\/+$/, '')}`;

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(normalized);
        if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.includes('.')) {
          throw new Error('invalid');
        }
      } catch {
        res.status(400).json({
          error: 'Indica um domínio HTTPS válido (ex: https://ais-vibba.co.ao).',
        });
        return;
      }

      try {
        await dns.lookup(parsedUrl.hostname);
      } catch {
        res.status(400).json({
          error: `O domínio "${parsedUrl.hostname}" ainda não está registado nem apontado no DNS. Primeiro regista-o (ex: em dns.ao) e aponta o DNS para este servidor; até lá, usa o Link Curto HTTPS abaixo que já funciona imediatamente.`,
        });
        return;
      }

      const db = readDb();
      db.appConfig = {
        ...(db.appConfig || {}),
        customDomain: parsedUrl.origin,
        updatedAt: Date.now(),
      };
      writeDb(db);
      res.json({
        publicUrl: OFFICIAL_PUBLIC_URL,
        shortUrl: db.appConfig.shortUrl || '',
        customDomain: parsedUrl.origin,
        activeShareUrl: parsedUrl.origin,
      });
    }
  );

  async function checkPublicManifestAccess(origin: string): Promise<{
    publiclyReachable: boolean;
    isPreviewAuthGated: boolean;
  }> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${origin}/manifest.json`, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      const ctype = (res.headers.get('content-type') || '').toLowerCase();
      if (res.status === 200 && ctype.includes('json')) {
        return { publiclyReachable: true, isPreviewAuthGated: false };
      }
      return { publiclyReachable: false, isPreviewAuthGated: true };
    } catch {
      return { publiclyReachable: false, isPreviewAuthGated: false };
    }
  }

  function resolveApkTargetOrigin(req: Request): string {
    const db = readDb();
    if (db.appConfig?.customDomain) {
      return db.appConfig.customDomain;
    }
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
      .split(',')[0]
      .trim();
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim();
    if (
      host &&
      !host.startsWith('localhost') &&
      !host.startsWith('127.0.0.1') &&
      !host.startsWith('0.0.0.0')
    ) {
      return `${proto === 'http' ? 'https' : proto}://${host.replace(/^ais-dev-/, 'ais-pre-')}`;
    }
    return OFFICIAL_PUBLIC_URL;
  }

  async function buildRealApkFromCloudApk(targetOrigin: string): Promise<string> {
    fs.mkdirSync(APK_DIR, { recursive: true });
    const jobRes = await fetch(
      'https://pwabuilder-cloudapk.azurewebsites.net/enqueuePackageJob',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: 'ao.co.vibba.app',
          name: 'Vibba',
          launcherName: 'Vibba',
          display: 'standalone',
          themeColor: '#18191A',
          navigationColor: '#18191A',
          navigationColorDark: '#18191A',
          navigationDividerColor: '#3E4042',
          navigationDividerColorDark: '#3E4042',
          backgroundColor: '#18191A',
          enableNotifications: false,
          splashScreenFadeOutDuration: 300,
          startUrl: '/',
          host: targetOrigin,
          webManifestUrl: `${targetOrigin}/manifest.json`,
          iconUrl: `${targetOrigin}/pwa-512x512.png`,
          maskableIconUrl: `${targetOrigin}/pwa-maskable-512x512.png`,
          appVersion: '8.1.0',
          appVersionCode: 9,
          signingMode: 'new',
          signing: {
            alias: 'vibba',
            fullName: 'Vibba App',
            organization: 'Vibba',
            organizationalUnit: 'Mobile',
            countryCode: 'AO',
          },
          fallbackType: 'customtabs',
          enableSiteSettingsShortcut: true,
          isChromeOSOnly: false,
          isMetaQuest: false,
          minSdkVersion: 21,
        }),
      }
    );

    if (!jobRes.ok) {
      const errText = await jobRes.text().catch(() => '');
      throw new Error(errText || 'Falha ao iniciar compilação do APK Android.');
    }

    const contentType = (jobRes.headers.get('content-type') || '').toLowerCase();
    let zipBuffer: Buffer;
    if (contentType.includes('application/zip') || contentType.includes('octet-stream')) {
      zipBuffer = Buffer.from(await jobRes.arrayBuffer());
    } else {
      const jobJson = (await jobRes.json().catch(() => ({}))) as {
        jobId?: string;
        id?: string;
        BlobUrl?: string;
        blobUrl?: string;
      };
      const directBlob = jobJson.BlobUrl || jobJson.blobUrl;
      const jobId = jobJson.jobId || jobJson.id;
      if (directBlob) {
        const dlRes = await fetch(directBlob);
        if (!dlRes.ok) throw new Error('Falha ao transferir pacote APK.');
        zipBuffer = Buffer.from(await dlRes.arrayBuffer());
      } else if (jobId) {
        let readyZip: Buffer | null = null;
        for (let i = 0; i < 25; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const statusRes = await fetch(
            `https://pwabuilder-cloudapk.azurewebsites.net/packageJobStatus?jobId=${encodeURIComponent(jobId)}`
          );
          if (!statusRes.ok) continue;
          const stCtype = (statusRes.headers.get('content-type') || '').toLowerCase();
          if (stCtype.includes('application/zip') || stCtype.includes('octet-stream')) {
            readyZip = Buffer.from(await statusRes.arrayBuffer());
            break;
          }
          const stJson = (await statusRes.json().catch(() => ({}))) as {
            status?: string;
            BlobUrl?: string;
            blobUrl?: string;
            error?: string;
          };
          if (stJson.error) throw new Error(stJson.error);
          if (stJson.BlobUrl || stJson.blobUrl) {
            const dlRes = await fetch(stJson.BlobUrl || stJson.blobUrl || '');
            if (dlRes.ok) {
              readyZip = Buffer.from(await dlRes.arrayBuffer());
              break;
            }
          }
        }
        if (!readyZip) throw new Error('Tempo limite excedido ao gerar o APK.');
        zipBuffer = readyZip;
      } else {
        throw new Error('Resposta inesperada do gerador de APK.');
      }
    }

    const tempZipPath = path.join(APK_DIR, 'vibba-package.zip');
    fs.writeFileSync(tempZipPath, zipBuffer);
    await execFileAsync('python3', [
      '-c',
      `import sys, zipfile, shutil
zpath, outpath = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(zpath, 'r') as zf:
    apks = [n for n in zf.namelist() if n.lower().endswith('.apk') and not n.lower().endswith('-unsigned.apk')]
    if not apks:
        apks = [n for n in zf.namelist() if n.lower().endswith('.apk')]
    if not apks:
        raise RuntimeError('Nenhum APK encontrado no pacote')
    with zf.open(apks[0]) as src, open(outpath, 'wb') as dst:
        shutil.copyfileobj(src, dst)
`,
      tempZipPath,
      APK_FILE_PATH,
    ]);
    try {
      fs.unlinkSync(tempZipPath);
    } catch {
      // Ignore cleanup error
    }
    return APK_FILE_PATH;
  }

  let activeApkBuildPromise: Promise<string> | null = null;

  app.get('/api/apk-status', async (req, res) => {
    const targetOrigin = resolveApkTargetOrigin(req);
    const hasCachedApk =
      fs.existsSync(APK_FILE_PATH) && fs.statSync(APK_FILE_PATH).size > 10000;
    if (hasCachedApk) {
      res.json({
        apkAvailable: true,
        canAutoBuildApk: true,
        isPreviewAuthGated: false,
        targetOrigin,
        apkSizeBytes: fs.statSync(APK_FILE_PATH).size,
      });
      return;
    }
    const probe = await checkPublicManifestAccess(targetOrigin);
    res.json({
      apkAvailable: false,
      canAutoBuildApk: probe.publiclyReachable,
      isPreviewAuthGated: probe.isPreviewAuthGated,
      targetOrigin,
      apkSizeBytes: 0,
    });
  });

  app.get('/api/download-apk', async (req, res) => {
    if (fs.existsSync(APK_FILE_PATH) && fs.statSync(APK_FILE_PATH).size > 10000) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="Vibba-v8.1.0.apk"');
      res.sendFile(APK_FILE_PATH);
      return;
    }

    const targetOrigin = resolveApkTargetOrigin(req);
    const probe = await checkPublicManifestAccess(targetOrigin);
    if (!probe.publiclyReachable) {
      res.status(409).json({
        error:
          'Este endereço de pré-visualização bloqueia o gerador automático de APK com verificação de cookies. Publica o projeto (Deploy público) ou carrega o .APK assinado no Painel do Proprietário.',
      });
      return;
    }

    try {
      if (!activeApkBuildPromise) {
        activeApkBuildPromise = buildRealApkFromCloudApk(targetOrigin).finally(() => {
          activeApkBuildPromise = null;
        });
      }
      const filePath = await activeApkBuildPromise;
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="Vibba-v8.1.0.apk"');
      res.sendFile(filePath);
    } catch (err) {
      res.status(502).json({
        error:
          err instanceof Error
            ? err.message
            : 'Não foi possível compilar o APK Android neste momento.',
      });
    }
  });

  app.post(
    '/api/owner/apk',
    requireAuth,
    requireOwner,
    express.raw({ type: '*/*', limit: '60mb' }),
    async (req: AuthenticatedRequest, res) => {
      const buf = req.body as Buffer;
      if (!Buffer.isBuffer(buf) || buf.length < 10240) {
        res.status(400).json({ error: 'Ficheiro .APK inválido ou vazio.' });
        return;
      }
      // Verify standard APK (ZIP PK\x03\x04) and AndroidManifest.xml inside
      if (buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
        res.status(400).json({ error: 'O ficheiro enviado não é um .APK Android válido.' });
        return;
      }
      fs.mkdirSync(APK_DIR, { recursive: true });
      const tmpApk = `${APK_FILE_PATH}.uploading`;
      fs.writeFileSync(tmpApk, buf);
      try {
        await execFileAsync('python3', [
          '-c',
          `import sys, zipfile
with zipfile.ZipFile(sys.argv[1], 'r') as zf:
    names = zf.namelist()
    if 'AndroidManifest.xml' not in names:
        raise RuntimeError('AndroidManifest.xml em falta')
`,
          tmpApk,
        ]);
        fs.renameSync(tmpApk, APK_FILE_PATH);
        res.json({
          ok: true,
          apkSizeBytes: fs.statSync(APK_FILE_PATH).size,
        });
      } catch {
        try {
          fs.unlinkSync(tmpApk);
        } catch {
          // ignore
        }
        res.status(400).json({
          error: 'O ficheiro não contém AndroidManifest.xml válido de uma app Android.',
        });
      }
    }
  );

  app.get('/.well-known/assetlinks.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'ao.co.vibba.app',
          sha256_cert_fingerprints: [],
        },
      },
    ]);
  });

  app.get(
    '/api/owner/export',
    requireAuth,
    requireOwner,
    (_req: AuthenticatedRequest, res) => {
      const db = readDb();
      res.json({
        exportedAt: new Date().toISOString(),
        app: 'Vibba',
        version: '8.1.0',
        ownerEmail: OWNER_EMAIL,
        users: db.users.map(({ passwordHash: _ph, passwordSalt: _ps, ...safe }) => safe),
        posts: db.posts,
        stories: db.stories,
        groups: db.groups,
        listings: db.listings,
        events: db.events,
        pages: db.pages,
      });
    }
  );

  // Vite dev middleware or production static serving
  const distDir = path.resolve(__dirname, 'dist');
  const distIndex = path.join(distDir, 'index.html');
  const isDevCommand = process.env.npm_lifecycle_event === 'dev';
  const useProdStatic =
    process.env.NODE_ENV === 'production' ||
    (!isDevCommand && fs.existsSync(distIndex));

  // Ensure /manifest.json and /manifest.webmanifest always return valid manifest JSON
  app.get(['/manifest.json', '/manifest.webmanifest'], (_req, res, next) => {
    const prodManifest = path.join(distDir, 'manifest.json');
    const pubManifest = path.resolve(__dirname, 'public', 'manifest.json');
    const target = useProdStatic && fs.existsSync(prodManifest) ? prodManifest : pubManifest;
    if (fs.existsSync(target)) {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(target);
      return;
    }
    next();
  });

  if (!useProdStatic) {
    app.get(['/sw.js', '/workbox-:hash.js'], (req, res, next) => {
      const fileName = path.basename(req.path);
      if (!/^(sw\.js|workbox-[a-zA-Z0-9_-]+\.js)$/.test(fileName)) {
        next();
        return;
      }
      const devFile = path.resolve(__dirname, 'dev-dist', fileName);
      if (fs.existsSync(devFile)) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(devFile);
        return;
      }
      next();
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(distDir, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('sw.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Service-Worker-Allowed', '/');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          } else if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          } else if (
            filePath.endsWith('manifest.json') ||
            filePath.endsWith('manifest.webmanifest')
          ) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(distIndex);
    });
  }

  // Return JSON for malformed bodies or unexpected Express errors
  app.use(
    (
      err: Error & { status?: number },
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      const status = err.status || 500;
      res.status(status).json({
        error:
          status === 413
            ? 'O ficheiro ou imagem enviada é demasiado grande.'
            : err.message || 'Erro interno no servidor Vibba.',
      });
    }
  );

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Vibba server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Vibba server:', err);
  process.exit(1);
});
