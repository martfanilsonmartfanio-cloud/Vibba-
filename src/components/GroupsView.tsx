import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Globe,
  Lock,
  Plus,
  UsersRound,
  X,
} from 'lucide-react';
import { UserProfile, VibbaGroup, VibbaPost } from '../types/vibba';
import { GROUP_CATEGORIES } from '../data/initialData';
import { vibbaApi } from '../lib/api';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';

interface GroupsViewProps {
  currentUser: UserProfile;
  onOpenUserProfile: (userId: string) => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  currentUser,
  onOpenUserProfile,
}) => {
  const [groups, setGroups] = useState<VibbaGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<VibbaGroup | null>(null);
  const [groupPosts, setGroupPosts] = useState<VibbaPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(GROUP_CATEGORIES[0]);
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = async () => {
    try {
      const res = await vibbaApi.getGroups();
      setGroups(res.groups);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    void loadGroups();
  }, []);

  const openGroup = async (group: VibbaGroup) => {
    setSelectedGroup(group);
    setLoadingPosts(true);
    try {
      const res = await vibbaApi.getPosts({ groupId: group.id });
      setGroupPosts(res.posts);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await vibbaApi.createGroup({
        name: name.trim(),
        description: description.trim(),
        category,
        privacy,
      });
      setGroups((prev) => [res.group, ...prev]);
      setName('');
      setDescription('');
      setShowCreate(false);
      void openGroup(res.group);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar grupo.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleJoin = async (groupId: string) => {
    const res = await vibbaApi.toggleJoinGroup(groupId);
    setGroups((prev) => prev.map((g) => (g.id === groupId ? res.group : g)));
    if (selectedGroup?.id === groupId) {
      setSelectedGroup(res.group);
    }
  };

  if (selectedGroup) {
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-5 space-y-4">
        <button
          type="button"
          onClick={() => setSelectedGroup(null)}
          className="inline-flex items-center gap-2 min-h-[38px] px-3.5 rounded-lg bg-[#242526] border border-[#3E4042] text-xs font-semibold text-[#E4E6EB] hover:bg-[#3A3B3C]"
        >
          <ArrowLeft size={15} /> Todos os grupos
        </button>

        <div className="rounded-xl bg-[#242526] border border-[#3E4042] overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-[#1877F2] to-[#0A3A82]" />
          <div className="p-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-[#E4E6EB]">
                {selectedGroup.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#B0B3B8] mt-1">
                <span className="inline-flex items-center gap-1">
                  {selectedGroup.privacy === 'public' ? (
                    <Globe size={13} />
                  ) : (
                    <Lock size={13} />
                  )}
                  {selectedGroup.privacy === 'public' ? 'Grupo Público' : 'Grupo Privado'}
                </span>
                <span>· {selectedGroup.category}</span>
                <span className="tabular-nums">· {selectedGroup.membersCount} membros</span>
              </div>
              {selectedGroup.description && (
                <p className="text-sm text-[#E4E6EB] mt-2">{selectedGroup.description}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void handleToggleJoin(selectedGroup.id)}
              className={`min-h-[40px] px-4 rounded-lg text-xs font-bold ${
                selectedGroup.isMember
                  ? 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-rose-500/20 hover:text-rose-300'
                  : 'bg-[#1877F2] hover:bg-[#166FE5] text-white'
              }`}
            >
              {selectedGroup.isMember ? 'Membro · Sair' : 'Entrar no grupo'}
            </button>
          </div>
        </div>

        {selectedGroup.isMember && (
          <PostComposer
            currentUser={currentUser}
            groupId={selectedGroup.id}
            placeholder={`Publicar no grupo ${selectedGroup.name}...`}
            onPostCreated={(post) => setGroupPosts((prev) => [post, ...prev])}
          />
        )}

        {loadingPosts ? (
          <p className="text-center text-sm text-[#B0B3B8] py-8">
            A carregar publicações do grupo...
          </p>
        ) : groupPosts.length === 0 ? (
          <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
            Ainda não existem publicações neste grupo. Sê o primeiro a publicar!
          </div>
        ) : (
          <div className="space-y-4">
            {groupPosts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onPostUpdated={(u) =>
                  setGroupPosts((prev) => prev.map((x) => (x.id === u.id ? u : x)))
                }
                onPostDeleted={(id) =>
                  setGroupPosts((prev) => prev.filter((x) => x.id !== id))
                }
                onOpenUserProfile={onOpenUserProfile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 space-y-5">
      <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#E4E6EB] flex items-center gap-2">
            <UsersRound size={22} className="text-[#1877F2]" />
            <span>Grupos</span>
          </h1>
          <p className="text-xs text-[#B0B3B8] mt-0.5">
            Cria comunidades temáticas e conversa com pessoas dos mesmos interesses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="min-h-[40px] px-4 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          {showCreate ? <X size={15} /> : <Plus size={15} />}
          <span>{showCreate ? 'Fechar' : 'Criar Grupo'}</span>
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreateGroup}
          className="rounded-xl bg-[#242526] border border-[#3E4042] p-5 space-y-3"
        >
          <h2 className="text-base font-bold text-[#E4E6EB]">Novo Grupo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do grupo (ex: Música de Luanda)"
              className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
            >
              {GROUP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição do grupo..."
            className="w-full rounded-lg bg-[#3A3B3C] px-3.5 py-2.5 text-sm text-white placeholder:text-[#B0B3B8] focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as 'public' | 'private')}
              className="h-10 rounded-lg bg-[#3A3B3C] px-3 text-xs text-white"
            >
              <option value="public">Grupo Público</option>
              <option value="private">Grupo Privado</option>
            </select>
            <button
              type="submit"
              disabled={creating}
              className="min-h-[40px] px-5 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold"
            >
              {creating ? 'A criar...' : 'Criar agora'}
            </button>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </form>
      )}

      {groups.length === 0 ? (
        <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
          Ainda não existem grupos criados. Clica em &ldquo;Criar Grupo&rdquo; para começar!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div
              key={g.id}
              className="rounded-xl bg-[#242526] border border-[#3E4042] overflow-hidden flex flex-col justify-between"
            >
              <div onClick={() => void openGroup(g)} className="cursor-pointer">
                <div className="h-20 bg-gradient-to-r from-[#1877F2] to-[#0A3A82]" />
                <div className="p-4 space-y-1.5">
                  <h3 className="text-base font-bold text-[#E4E6EB] hover:underline">
                    {g.name}
                  </h3>
                  <div className="text-xs text-[#B0B3B8] tabular-nums">
                    {g.category} · {g.membersCount} membros · {g.postsCount} publicações
                  </div>
                  {g.description && (
                    <p className="text-xs text-[#B0B3B8] line-clamp-2">
                      {g.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-4 pb-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void openGroup(g)}
                  className="flex-1 min-h-[38px] rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-white text-xs font-semibold"
                >
                  Abrir mural
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleJoin(g.id)}
                  className={`min-h-[38px] px-4 rounded-lg text-xs font-bold ${
                    g.isMember
                      ? 'bg-[#3A3B3C] text-[#E4E6EB]'
                      : 'bg-[#1877F2] hover:bg-[#166FE5] text-white'
                  }`}
                >
                  {g.isMember ? 'Membro' : 'Entrar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
