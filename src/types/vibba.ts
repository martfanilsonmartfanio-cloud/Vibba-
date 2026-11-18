export type AppTab =
  | 'feed'
  | 'friends'
  | 'watch'
  | 'groups'
  | 'marketplace'
  | 'messenger'
  | 'events'
  | 'pages'
  | 'saved'
  | 'ranking'
  | 'profile'
  | 'owner';

export type ReactionType =
  | 'like'
  | 'love'
  | 'care'
  | 'haha'
  | 'wow'
  | 'sad'
  | 'angry';

export type PostPrivacy = 'public' | 'friends' | 'only_me';

export type PostBackground =
  | 'none'
  | 'royal'
  | 'sunset'
  | 'ocean'
  | 'emerald'
  | 'crimson';

export type FriendshipStatus =
  | 'none'
  | 'friends'
  | 'incoming_request'
  | 'outgoing_request';

export interface ActivityLevelInfo {
  level: number;
  title: string;
  medalName?: string;
  points: number;
  currentLevelMinPoints: number;
  nextLevelMinPoints: number | null;
  nextLevelTitle: string | null;
  progressPercent: number;
}

export interface VibbaPointsBreakdown {
  reactions: number;
  comments: number;
  shares: number;
  posts: number;
  received: number;
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  email: string;
  bio: string;
  location: string;
  hometown: string;
  work: string;
  education: string;
  relationship: string;
  website: string;
  avatarUrl: string;
  coverUrl: string;
  friendsCount: number;
  friendIds: string[];
  incomingRequestIds: string[];
  outgoingRequestIds: string[];
  followerIds?: string[];
  followersCount: number;
  followingCount: number;
  followingIds: string[];
  postsCount: number;
  vibbaPoints: number;
  activityLevel: ActivityLevelInfo;
  pointsBreakdown?: VibbaPointsBreakdown;
  phone?: string;
  birthDate?: string;
  age?: number | null;
  isAdult?: boolean;
  professionalMode?: boolean;
  professionalCategory?: string;
  isOwner?: boolean;
  isVerified?: boolean;
  hasRecoveryQuestion?: boolean;
  recoveryQuestion?: string;
  createdAt: number;
}

export interface CommunityMember {
  id: string;
  name: string;
  handle: string;
  bio: string;
  location: string;
  hometown: string;
  work: string;
  education: string;
  relationship: string;
  website: string;
  avatarUrl: string;
  coverUrl?: string;
  friendsCount: number;
  mutualFriendsCount: number;
  followersCount: number;
  postsCount: number;
  vibbaPoints: number;
  activityLevel: ActivityLevelInfo;
  isFollowing: boolean;
  friendshipStatus: FriendshipStatus;
  isOnline: boolean;
  isOwner?: boolean;
  isVerified?: boolean;
  isAdult?: boolean;
  professionalMode?: boolean;
  professionalCategory?: string;
  isMe: boolean;
}

export interface MusicTrackInfo {
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

export interface VibbaStory {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  musicTrack?: MusicTrackInfo | null;
  bgVariant: 'royal' | 'gold' | 'plum';
  viewedByMe: boolean;
  viewsCount: number;
  createdAt: number;
  createdAtLabel: string;
  expiresAt: number;
}

export interface VibbaNotification {
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
  createdAtLabel: string;
}

export interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  text: string;
  audioUrl?: string;
  audioDurationSec?: number;
  createdAt: number;
  createdAtLabel: string;
}

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  text: string;
  audioUrl?: string;
  audioDurationSec?: number;
  likesCount: number;
  likedByMe: boolean;
  replies: CommentReply[];
  createdAt: number;
  createdAtLabel: string;
}

export interface PollOption {
  id: string;
  text: string;
  votesCount: number;
  votedByMe: boolean;
}

export interface PostPoll {
  options: PollOption[];
  totalVotes: number;
}

export interface SharedPostSnapshot {
  originalPostId: string;
  authorName: string;
  authorHandle: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  musicTrack?: MusicTrackInfo | null;
}

export interface VibbaPost {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  authorLevel?: { level: number; title: string; medalName?: string };
  isOwnPost: boolean;
  location: string;
  privacy: PostPrivacy;
  feeling?: string;
  bgStyle: PostBackground;
  editedAt?: number | null;
  groupId?: string | null;
  groupName?: string | null;
  pageId?: string | null;
  pageName?: string | null;
  createdAt: number;
  createdAtLabel: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  musicTrack?: MusicTrackInfo | null;
  poll?: PostPoll | null;
  likes: number;
  likedByMe: boolean;
  myReaction: ReactionType | null;
  reactionCounts: Record<ReactionType, number>;
  savedByMe: boolean;
  sharedPost: SharedPostSnapshot | null;
  commentsCount: number;
  comments: PostComment[];
}

export interface MessengerMessage {
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
  createdAtLabel: string;
}

export interface MessengerConversation {
  peer: CommunityMember;
  lastMessage: MessengerMessage | null;
  unreadCount: number;
}

export interface VibbaGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  privacy: 'public' | 'private';
  coverUrl?: string;
  creatorId: string;
  creatorName: string;
  membersCount: number;
  postsCount: number;
  isMember: boolean;
  createdAt: number;
}

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerHandle: string;
  sellerAvatar: string;
  sellerIsOnline: boolean;
  title: string;
  priceKz: number;
  category: string;
  condition: 'Novo' | 'Como novo' | 'Usado';
  location: string;
  description: string;
  imageUrl?: string;
  status: 'available' | 'sold';
  isOwnListing: boolean;
  createdAt: number;
  createdAtLabel: string;
}

export interface VibbaEvent {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  location: string;
  dateIso: string;
  coverUrl?: string;
  goingCount: number;
  interestedCount: number;
  myRsvp: 'going' | 'interested' | null;
  isOwnEvent: boolean;
  createdAt: number;
}

export interface VibbaPage {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  category: string;
  bio: string;
  avatarUrl?: string;
  coverUrl?: string;
  followersCount: number;
  postsCount: number;
  isFollowing: boolean;
  isOwnPage: boolean;
  createdAt: number;
}

export interface GlobalSearchResults {
  users: CommunityMember[];
  posts: VibbaPost[];
  groups: VibbaGroup[];
  pages: VibbaPage[];
  listings: MarketplaceListing[];
}

export interface OwnerUserSummary {
  id: string;
  name: string;
  handle: string;
  email: string;
  location: string;
  bio: string;
  avatarUrl: string;
  isOnline: boolean;
  isOwner: boolean;
  isVerified: boolean;
  suspended: boolean;
  friendsCount: number;
  followersCount?: number;
  postsCount: number;
  commentsCount: number;
  messagesCount: number;
  vibbaPoints: number;
  activityLevel: ActivityLevelInfo;
  phone?: string;
  age?: number | null;
  isAdult?: boolean;
  professionalMode?: boolean;
  professionalCategory?: string;
  createdAt: number;
  createdAtLabel: string;
}

export interface OwnerOverview {
  refreshedAt: number;
  appVersion: string;
  ownerEmail: string;
  stats: {
    totalUsers: number;
    onlineUsers: number;
    suspendedUsers: number;
    newUsersLast24h: number;
    totalPosts: number;
    videoPosts: number;
    audioPosts: number;
    photoPosts: number;
    totalComments: number;
    activeStories: number;
    totalMessages: number;
    totalGroups: number;
    totalListings: number;
    totalEvents: number;
    totalPages: number;
    pendingReports?: number;
  };
  users: OwnerUserSummary[];
  recentPosts: VibbaPost[];
  groups: VibbaGroup[];
  listings: MarketplaceListing[];
  pages: VibbaPage[];
  events: VibbaEvent[];
  reports?: OwnerPostReport[];
}

export type PostReportReason = 'copyright' | 'harassment' | 'scam' | 'nsfw';

export interface OwnerPostReport {
  id: string;
  postId: string;
  postAuthorId: string;
  postAuthorName: string;
  postAuthorHandle: string;
  postContent: string;
  postAudioUrl?: string;
  postAudioDurationSec?: number;
  postImageUrl?: string;
  postVideoUrl?: string;
  reporterId: string;
  reporterName: string;
  reporterHandle: string;
  reason: PostReportReason;
  details: string;
  status: 'open' | 'resolved';
  createdAt: number;
  createdAtLabel: string;
}

export interface LeaderboardEntry {
  rank: number;
  isTop10: boolean;
  member: CommunityMember;
}

export interface LeaderboardResponse {
  top10: LeaderboardEntry[];
  entries: LeaderboardEntry[];
  totalEligible: number;
  myRank: number | null;
}


