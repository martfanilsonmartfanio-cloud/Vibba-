import React, { useState } from 'react';
import {
  Briefcase,
  Check,
  GraduationCap,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Rss,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { CommunityMember, UserProfile, VibbaPost } from '../types/vibba';
import { vibbaApi } from '../lib/api';
import { VibbaAvatar } from './VibbaBrand';
import { ActivityLevelBadge, VibbaPointsCard } from './ActivityLevelBadge';
import {
  ProfileMedalsHeaderStrip,
  ProfileMedalsShowcase,
  formatVibbaPoints,
} from './ActivityMedals';
import { PostCard } from './PostCard';

interface MemberProfileModalProps {
  currentUser?: UserProfile;
  member: CommunityMember;
  posts: VibbaPost[];
  onClose: () => void;
  onUserProfileUpdated: (user: UserProfile) => void;
  onUsersRefresh: () => Promise<void>;
  onPostUpdated: (post: VibbaPost) => void;
  onPostDeleted: (postId: string) => void;
  onOpenChat: (member: CommunityMember) => void;
  onOpenUserProfile: (userId: string) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  currentUser,
  member,
  posts,
  onClose,
  onUserProfileUpdated,
  onUsersRefresh,
  onPostUpdated,
  onPostDeleted,
  onOpenChat,
  onOpenUserProfile,
}) => {
  const memberFollowersOnly = Boolean(member.isOwner || member.professionalMode);
  const viewerFollowersOnly = Boolean(currentUser?.isOwner || currentUser?.professionalMode);
  const [busy, setBusy] = useState(false);

  const memberPosts = posts.filter((p) => p.authorId === member.id);

  const handleFriendAction = async () => {
    setBusy(true);
    try {
      if (member.friendshipStatus === 'friends') {
        const res = await vibbaApi.removeFriend(member.id);
        onUserProfileUpdated(res.user);
      } else if (member.friendshipStatus === 'incoming_request') {
        const res = await vibbaApi.respondFriendRequest(member.id, 'accept');
        onUserProfileUpdated(res.user);
      } else {
        const res = await vibbaApi.sendFriendRequest(member.id);
        onUserProfileUpdated(res.user);
      }
      await onUsersRefresh();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleFollow = async () => {
    setBusy(true);
    try {
      const res = await vibbaApi.followUser(member.id);
      onUserProfileUpdated(res.user);
      await onUsersRefresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#18191A] border border-[#3E4042] shadow-2xl">
        <div className="relative h-36 sm:h-44 bg-gradient-to-r from-[#1877F2] to-[#0A3A82]">
          {member.coverUrl && (
            <img
              src={member.coverUrl}
              alt="Capa"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar perfil"
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <VibbaAvatar
              src={member.avatarUrl}
              alt={member.name}
              sizeClass="w-24 h-24"
              isOnline={member.isOnline}
              initials={member.name.slice(0, 2).toUpperCase()}
            />

            {!member.isMe && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {!memberFollowersOnly && !viewerFollowersOnly && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleFriendAction()}
                    className={`min-h-[38px] px-4 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                      member.friendshipStatus === 'friends'
                        ? 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-rose-500/20 hover:text-rose-300'
                        : member.friendshipStatus === 'incoming_request'
                        ? 'bg-[#42B72A] text-white'
                        : member.friendshipStatus === 'outgoing_request'
                        ? 'bg-[#3A3B3C] text-[#4599FF]'
                        : 'bg-[#1877F2] hover:bg-[#166FE5] text-white'
                    }`}
                  >
                    {member.friendshipStatus === 'friends' ? (
                      <>
                        <UserMinus size={14} /> Amigos
                      </>
                    ) : member.friendshipStatus === 'incoming_request' ? (
                      <>
                        <Check size={14} /> Confirmar pedido
                      </>
                    ) : member.friendshipStatus === 'outgoing_request' ? (
                      <>
                        <UserCheck size={14} /> Pedido enviado
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} /> Adicionar amigo
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleToggleFollow()}
                  className={`min-h-[38px] px-4 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                    member.isFollowing
                      ? 'bg-[#263951] text-[#4599FF] hover:bg-[#314A68]'
                      : member.isOwner
                      ? 'bg-[#1877F2] hover:bg-[#166FE5] text-white'
                      : 'bg-gradient-to-r from-[#7C3AED] to-[#C026D3] text-white'
                  }`}
                >
                  <Rss size={14} />
                  {member.isFollowing ? 'A seguir' : 'Seguir'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenChat(member);
                  }}
                  className="min-h-[38px] px-4 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <MessageCircle size={14} /> Mensagem
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-display font-bold text-[#E4E6EB]">
                {member.name}
              </h2>
              {member.isOwner && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#1877F2]/20 text-[#4599FF] text-[11px] font-bold">
                  Proprietário Oficial
                </span>
              )}
              {member.professionalMode && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#7C3AED]/25 border border-[#7C3AED]/45 text-purple-200 text-[11px] font-bold inline-flex items-center gap-1">
                  <Briefcase size={11} /> Modo Profissional ·{' '}
                  {member.professionalCategory || 'Criador Digital'}
                </span>
              )}
              <ActivityLevelBadge
                level={member.activityLevel?.level || 1}
                title={member.activityLevel?.title || 'Iniciante'}
              />
            </div>
            <p className="text-xs text-[#B0B3B8] tabular-nums">
              {member.handle.startsWith('@') ? member.handle : `@${member.handle}`} ·{' '}
              <span className="text-white font-semibold">
                {member.followersCount || 0} seguidores
              </span>{' '}
              · {!memberFollowersOnly && <>{member.friendsCount} amigos · </>}
              {member.postsCount} publicações ·{' '}
              {formatVibbaPoints(member.vibbaPoints || 0)} Vibba Points
            </p>
            {member.bio && (
              <p className="text-sm text-[#E4E6EB] mt-2">{member.bio}</p>
            )}
            <ProfileMedalsHeaderStrip
              currentLevel={member.activityLevel?.level || 1}
              vibbaPoints={member.vibbaPoints || 0}
              isOwner={Boolean(member.isOwner || (member.activityLevel?.level || 1) >= 200)}
            />
          </div>

          <VibbaPointsCard
            compact
            activityLevel={member.activityLevel}
            vibbaPoints={member.vibbaPoints}
          />

          <ProfileMedalsShowcase
            compact
            currentLevel={member.activityLevel?.level || 1}
            vibbaPoints={member.vibbaPoints || 0}
            isOwner={(member.activityLevel?.level || 1) >= 200}
          />

          <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[#B0B3B8]">
            {member.work && (
              <div className="flex items-center gap-2">
                <Briefcase size={14} className="text-[#4599FF] shrink-0" />
                <span>{member.work}</span>
              </div>
            )}
            {member.education && (
              <div className="flex items-center gap-2">
                <GraduationCap size={14} className="text-[#4599FF] shrink-0" />
                <span>{member.education}</span>
              </div>
            )}
            {member.location && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[#45BD62] shrink-0" />
                <span>Mora em {member.location}</span>
              </div>
            )}
            {member.hometown && (
              <div className="flex items-center gap-2">
                <Home size={14} className="text-[#B0B3B8] shrink-0" />
                <span>Natural de {member.hometown}</span>
              </div>
            )}
            {member.relationship && (
              <div className="flex items-center gap-2">
                <Heart size={14} className="text-[#F3425F] shrink-0" />
                <span>{member.relationship}</span>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-[#E4E6EB]">Publicações</h3>
            {memberPosts.length === 0 ? (
              <p className="text-xs text-[#B0B3B8] py-4 text-center">
                Este utilizador ainda não tem publicações visíveis.
              </p>
            ) : (
              memberPosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  onPostUpdated={onPostUpdated}
                  onPostDeleted={onPostDeleted}
                  onOpenUserProfile={onOpenUserProfile}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
