import React, { useMemo, useState } from 'react';
import {
  Check,
  MapPin,
  MessageCircle,
  Rss,
  Search,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { CommunityMember, UserProfile } from '../types/vibba';
import { vibbaApi } from '../lib/api';
import { VibbaAvatar } from './VibbaBrand';

interface FriendsViewProps {
  currentUser: UserProfile;
  users: CommunityMember[];
  onUsersUpdated: () => Promise<void>;
  onUserProfileUpdated: (user: UserProfile) => void;
  onOpenUserProfile: (userId: string) => void;
  onOpenChat: (peer: CommunityMember) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentUser,
  users,
  onUsersUpdated,
  onUserProfileUpdated,
  onOpenUserProfile,
  onOpenChat,
}) => {
  const viewerFollowersOnly = Boolean(currentUser.isOwner || currentUser.professionalMode);
  const [subTab, setSubTab] = useState<'all' | 'requests' | 'friends'>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const others = useMemo(() => users.filter((u) => !u.isMe), [users]);
  const incomingRequests = useMemo(
    () =>
      viewerFollowersOnly
        ? []
        : others.filter(
            (u) => !u.isOwner && !u.professionalMode && u.friendshipStatus === 'incoming_request'
          ),
    [others, viewerFollowersOnly]
  );
  const friendsList = useMemo(
    () =>
      viewerFollowersOnly
        ? []
        : others.filter((u) => !u.isOwner && u.friendshipStatus === 'friends'),
    [others, viewerFollowersOnly]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base =
      subTab === 'requests'
        ? incomingRequests
        : subTab === 'friends'
        ? friendsList
        : others;
    if (!q) return base;
    return base.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.handle.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q)
    );
  }, [others, incomingRequests, friendsList, subTab, search]);

  const handleSendFriendRequest = async (userId: string) => {
    setBusyId(userId);
    try {
      const res = await vibbaApi.sendFriendRequest(userId);
      onUserProfileUpdated(res.user);
      await onUsersUpdated();
    } finally {
      setBusyId(null);
    }
  };

  const handleRespondRequest = async (
    userId: string,
    action: 'accept' | 'decline'
  ) => {
    setBusyId(userId);
    try {
      const res = await vibbaApi.respondFriendRequest(userId, action);
      onUserProfileUpdated(res.user);
      await onUsersUpdated();
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveFriend = async (userId: string) => {
    setBusyId(userId);
    try {
      const res = await vibbaApi.removeFriend(userId);
      onUserProfileUpdated(res.user);
      await onUsersUpdated();
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleFollow = async (userId: string) => {
    setBusyId(userId);
    try {
      const res = await vibbaApi.followUser(userId);
      onUserProfileUpdated(res.user);
      await onUsersUpdated();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 space-y-5">
      <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-[#E4E6EB] flex items-center gap-2">
              <Users size={22} className="text-[#1877F2]" />
              <span>{viewerFollowersOnly ? 'Pessoas & Seguidores' : 'Amigos & Pessoas'}</span>
            </h1>
            <p className="text-xs text-[#B0B3B8] mt-0.5 tabular-nums">
              {viewerFollowersOnly
                ? `${currentUser.followersCount || 0} seguidores · Modo apenas seguidores`
                : `${friendsList.length} amigos · ${incomingRequests.length} pedidos`}{' '}
              · {others.length} pessoas registadas
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B3B8]"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar pessoas..."
              className="w-full h-10 rounded-full bg-[#3A3B3C] pl-9 pr-3 text-sm text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubTab('all')}
            className={`min-h-[36px] px-4 rounded-full text-xs font-semibold transition-colors ${
              subTab === 'all'
                ? 'bg-[#1877F2] text-white'
                : 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50]'
            }`}
          >
            Descobrir ({others.length})
          </button>
          {!viewerFollowersOnly && (
            <>
              <button
                type="button"
                onClick={() => setSubTab('requests')}
                className={`min-h-[36px] px-4 rounded-full text-xs font-semibold transition-colors ${
                  subTab === 'requests'
                    ? 'bg-[#1877F2] text-white'
                    : 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50]'
                }`}
              >
                Pedidos ({incomingRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setSubTab('friends')}
                className={`min-h-[36px] px-4 rounded-full text-xs font-semibold transition-colors ${
                  subTab === 'friends'
                    ? 'bg-[#1877F2] text-white'
                    : 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50]'
                }`}
              >
                Os teus amigos ({friendsList.length})
              </button>
            </>
          )}
        </div>
      </div>

      {subTab === 'all' && incomingRequests.length > 0 && !search && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#4599FF] uppercase tracking-wide px-1">
            Pedidos de amizade pendentes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {incomingRequests.map((person) => (
              <div
                key={person.id}
                className="rounded-xl bg-[#242526] border border-[#1877F2]/50 p-4 flex items-center justify-between gap-3"
              >
                <div
                  onClick={() => onOpenUserProfile(person.id)}
                  className="flex items-center gap-3 min-w-0 cursor-pointer"
                >
                  <VibbaAvatar
                    src={person.avatarUrl}
                    alt={person.name}
                    isOnline={person.isOnline}
                    initials={person.name.slice(0, 2).toUpperCase()}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#E4E6EB] truncate">
                      {person.name}
                    </div>
                    <div className="text-xs text-[#B0B3B8] truncate">
                      @{person.handle} · {person.mutualFriendsCount} amigos em comum
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === person.id}
                    onClick={() => void handleRespondRequest(person.id, 'accept')}
                    className="min-h-[36px] px-3 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Check size={14} /> Confirmar
                  </button>
                  <button
                    type="button"
                    disabled={busyId === person.id}
                    onClick={() => void handleRespondRequest(person.id, 'decline')}
                    className="min-h-[36px] px-2.5 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] text-xs"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
          {subTab === 'requests'
            ? 'Não tens pedidos de amizade pendentes.'
            : subTab === 'friends'
            ? 'Ainda não tens amigos adicionados. Envia pedidos na aba Descobrir.'
            : 'Nenhuma pessoa encontrada com esse nome.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((member) => {
            const memberFollowersOnly = Boolean(member.isOwner || member.professionalMode);
            const hideFriendButtons = memberFollowersOnly || viewerFollowersOnly;
            return (
              <div
                key={member.id}
                className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenUserProfile(member.id)}
                    className="shrink-0"
                  >
                    <VibbaAvatar
                      src={member.avatarUrl}
                      alt={member.name}
                      sizeClass="w-14 h-14"
                      isOnline={member.isOnline}
                      initials={member.name.slice(0, 2).toUpperCase()}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenUserProfile(member.id)}
                        className="text-base font-semibold text-[#E4E6EB] hover:underline truncate text-left"
                      >
                        {member.name}
                      </button>
                      {member.isOwner && (
                        <span className="px-2 py-0.5 rounded bg-[#1877F2]/20 text-[#4599FF] text-[10px] font-bold">
                          Proprietário
                        </span>
                      )}
                      {member.professionalMode && (
                        <span className="px-2 py-0.5 rounded bg-[#7C3AED]/20 text-purple-200 text-[10px] font-bold">
                          Modo Profissional
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#B0B3B8] truncate">
                      @{member.handle}
                      {member.isOnline && (
                        <span className="text-[#31A24C]"> · Online</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#B0B3B8] mt-1">
                      <span className="inline-flex items-center gap-1 text-[#E4E6EB] font-medium tabular-nums">
                        <Rss size={11} className="text-[#4599FF]" />
                        {member.followersCount || 0} seguidores
                      </span>
                      {member.location && (
                        <span className="inline-flex items-center gap-1">
                          · <MapPin size={12} /> {member.location}
                        </span>
                      )}
                      {!hideFriendButtons && member.mutualFriendsCount > 0 && (
                        <span className="tabular-nums">
                          · {member.mutualFriendsCount} amigos em comum
                        </span>
                      )}
                    </div>
                    {member.bio && (
                      <p className="text-xs text-[#B0B3B8] mt-1.5 line-clamp-2">
                        {member.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#3E4042]">
                  {member.isOwner ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => void handleToggleFollow(member.id)}
                        className={`flex-1 min-h-[38px] px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 ${
                          member.isFollowing
                            ? 'bg-[#263951] text-[#4599FF] hover:bg-[#314A68]'
                            : 'bg-[#1877F2] hover:bg-[#166FE5] text-white'
                        }`}
                      >
                        <Rss size={14} />
                        {member.isFollowing ? 'A seguir' : 'Seguir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenChat(member)}
                        className="min-h-[38px] px-3 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] text-xs font-medium inline-flex items-center gap-1.5"
                      >
                        <MessageCircle size={14} /> Mensagem
                      </button>
                    </>
                  ) : hideFriendButtons ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => void handleToggleFollow(member.id)}
                        className={`flex-1 min-h-[38px] px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 ${
                          member.isFollowing
                            ? 'bg-[#263951] text-[#4599FF] hover:bg-[#314A68]'
                            : 'bg-gradient-to-r from-[#7C3AED] to-[#C026D3] text-white'
                        }`}
                      >
                        <Rss size={14} />
                        {member.isFollowing ? 'A seguir' : 'Seguir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenChat(member)}
                        className="min-h-[38px] px-3 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] text-xs font-medium inline-flex items-center gap-1.5"
                      >
                        <MessageCircle size={14} /> Mensagem
                      </button>
                    </>
                  ) : member.friendshipStatus === 'friends' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenChat(member)}
                        className="flex-1 min-h-[38px] px-3 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle size={14} /> Mensagem
                      </button>
                      <button
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => void handleToggleFollow(member.id)}
                        className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${
                          member.isFollowing
                            ? 'bg-[#263951] text-[#4599FF]'
                            : 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50]'
                        }`}
                      >
                        <Rss size={13} />
                        {member.isFollowing ? 'A seguir' : 'Seguir'}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => void handleRemoveFriend(member.id)}
                        className="min-h-[38px] px-3 rounded-lg bg-[#3A3B3C] hover:bg-rose-500/20 hover:text-rose-300 text-[#E4E6EB] text-xs font-medium inline-flex items-center gap-1"
                      >
                        <UserMinus size={14} /> Remover
                      </button>
                    </>
                  ) : member.friendshipStatus === 'incoming_request' ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => void handleRespondRequest(member.id, 'accept')}
                        className="flex-1 min-h-[38px] px-3 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold inline-flex items-center justify-center gap-1"
                      >
                        <Check size={14} /> Confirmar
                      </button>
                      <button
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => void handleRespondRequest(member.id, 'decline')}
                        className="min-h-[38px] px-3 rounded-lg bg-[#3A3B3C] text-[#E4E6EB] text-xs font-medium"
                      >
                        Eliminar
                      </button>
                    </>
                  ) : member.friendshipStatus === 'outgoing_request' ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => void handleSendFriendRequest(member.id)}
                        className="flex-1 min-h-[38px] px-3 rounded-lg bg-[#3A3B3C] text-[#4599FF] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        <UserCheck size={14} /> Pedido enviado
                      </button>
                      <button
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => void handleToggleFollow(member.id)}
                        className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${
                          member.isFollowing
                            ? 'bg-[#263951] text-[#4599FF]'
                            : 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50]'
                        }`}
                      >
                        <Rss size={13} />
                        {member.isFollowing ? 'A seguir' : 'Seguir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenChat(member)}
                        className="min-h-[38px] px-3 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] text-xs font-medium inline-flex items-center gap-1"
                      >
                        <MessageCircle size={14} /> Chat
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => void handleSendFriendRequest(member.id)}
                        className="flex-1 min-h-[38px] px-3 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                      >
                        <UserPlus size={14} /> Adicionar amigo
                      </button>
                      <button
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => void handleToggleFollow(member.id)}
                        className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${
                          member.isFollowing
                            ? 'bg-[#263951] text-[#4599FF]'
                            : 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50]'
                        }`}
                      >
                        <Rss size={13} />
                        {member.isFollowing ? 'A seguir' : 'Seguir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenChat(member)}
                        className="min-h-[38px] px-3 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] text-xs font-medium inline-flex items-center gap-1.5"
                      >
                        <MessageCircle size={14} /> Mensagem
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
