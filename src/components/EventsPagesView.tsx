import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Flag,
  MapPin,
  PlaySquare,
  Plus,
  Star,
  X,
} from 'lucide-react';
import { UserProfile, VibbaEvent, VibbaPage, VibbaPost } from '../types/vibba';
import { vibbaApi } from '../lib/api';
import { PostCard } from './PostCard';
import { PostComposer } from './PostComposer';

export const WatchView: React.FC<{
  posts: VibbaPost[];
  onPostUpdated: (p: VibbaPost) => void;
  onPostDeleted: (id: string) => void;
  onOpenUserProfile: (userId: string) => void;
}> = ({ posts, onPostUpdated, onPostDeleted, onOpenUserProfile }) => {
  const mediaPosts = posts.filter((p) => p.videoUrl || p.audioUrl || p.imageUrl);

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-5 space-y-4">
      <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-5">
        <h1 className="text-xl font-display font-bold text-[#E4E6EB] flex items-center gap-2">
          <PlaySquare size={21} className="text-[#1877F2]" />
          <span>Watch · Vídeos, Áudios & Fotos</span>
        </h1>
        <p className="text-xs text-[#B0B3B8] mt-0.5">
          Todos os vídeos, notas de voz, músicas e fotografias publicados no Vibba.
        </p>
      </div>

      {mediaPosts.length === 0 ? (
        <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
          Ainda não há vídeos, áudios ou fotos no Watch.
        </div>
      ) : (
        mediaPosts.map((p) => (
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
  );
};

export const SavedView: React.FC<{
  posts: VibbaPost[];
  onPostUpdated: (p: VibbaPost) => void;
  onPostDeleted: (id: string) => void;
  onOpenUserProfile: (userId: string) => void;
}> = ({ posts, onPostUpdated, onPostDeleted, onOpenUserProfile }) => {
  const saved = posts.filter((p) => p.savedByMe);

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-5 space-y-4">
      <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-5">
        <h1 className="text-xl font-display font-bold text-[#E4E6EB] flex items-center gap-2">
          <Bookmark size={21} className="text-[#1877F2]" />
          <span>Guardados</span>
        </h1>
        <p className="text-xs text-[#B0B3B8] mt-0.5 tabular-nums">
          {saved.length}{' '}
          {saved.length === 1 ? 'publicação guardada' : 'publicações guardadas'}
        </p>
      </div>

      {saved.length === 0 ? (
        <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
          Clica no ícone de marcador numa publicação para a guardar aqui.
        </div>
      ) : (
        saved.map((p) => (
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
  );
};

export const EventsView: React.FC = () => {
  const [events, setEvents] = useState<VibbaEvent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('Luanda');
  const [dateIso, setDateIso] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void vibbaApi.getEvents().then((r) => setEvents(r.events)).catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateIso || creating) return;
    setCreating(true);
    try {
      const res = await vibbaApi.createEvent({
        title: title.trim(),
        location: location.trim() || 'Angola',
        dateIso,
        description: description.trim(),
      });
      setEvents((prev) => [res.event, ...prev]);
      setTitle('');
      setDescription('');
      setDateIso('');
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  const handleRsvp = async (eventId: string, status: 'going' | 'interested') => {
    const res = await vibbaApi.rsvpEvent(eventId, status);
    setEvents((prev) => prev.map((ev) => (ev.id === eventId ? res.event : ev)));
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 space-y-5">
      <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#E4E6EB] flex items-center gap-2">
            <Calendar size={22} className="text-[#F3425F]" />
            <span>Eventos</span>
          </h1>
          <p className="text-xs text-[#B0B3B8] mt-0.5">
            Descobre e confirma presença em encontros, festas e conferências.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="min-h-[40px] px-4 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          {showCreate ? <X size={15} /> : <Plus size={15} />}
          <span>{showCreate ? 'Fechar' : 'Criar Evento'}</span>
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl bg-[#242526] border border-[#3E4042] p-5 space-y-3"
        >
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome do evento"
            className="w-full h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white placeholder:text-[#B0B3B8]"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="datetime-local"
              required
              value={dateIso}
              onChange={(e) => setDateIso(e.target.value)}
              className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Local do evento"
              className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
            />
          </div>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes do evento..."
            className="w-full rounded-lg bg-[#3A3B3C] px-3.5 py-2.5 text-sm text-white"
          />
          <button
            type="submit"
            disabled={creating}
            className="min-h-[40px] px-5 rounded-lg bg-[#1877F2] text-white text-xs font-bold"
          >
            {creating ? 'A criar...' : 'Publicar evento'}
          </button>
        </form>
      )}

      {events.length === 0 ? (
        <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
          Sem eventos agendados. Cria o primeiro evento da comunidade!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 space-y-3"
            >
              <div className="text-xs font-semibold text-[#4599FF]">
                {new Date(ev.dateIso).toLocaleString('pt-PT', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </div>
              <h3 className="text-base font-bold text-[#E4E6EB]">{ev.title}</h3>
              <div className="text-xs text-[#B0B3B8] inline-flex items-center gap-1">
                <MapPin size={12} /> {ev.location}
              </div>
              {ev.description && (
                <p className="text-xs text-[#B0B3B8]">{ev.description}</p>
              )}
              <div className="text-xs text-[#B0B3B8] tabular-nums">
                {ev.goingCount} vão · {ev.interestedCount} interessados
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void handleRsvp(ev.id, 'going')}
                  className={`flex-1 min-h-[36px] rounded-lg text-xs font-bold ${
                    ev.myRsvp === 'going'
                      ? 'bg-[#1877F2] text-white'
                      : 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50]'
                  }`}
                >
                  Vou
                </button>
                <button
                  type="button"
                  onClick={() => void handleRsvp(ev.id, 'interested')}
                  className={`flex-1 min-h-[36px] rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1 ${
                    ev.myRsvp === 'interested'
                      ? 'bg-[#42B72A] text-white'
                      : 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50]'
                  }`}
                >
                  <Star size={13} /> Tenho interesse
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const PagesView: React.FC<{
  currentUser: UserProfile;
  onOpenUserProfile: (userId: string) => void;
}> = ({ currentUser, onOpenUserProfile }) => {
  const [pages, setPages] = useState<VibbaPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<VibbaPage | null>(null);
  const [pagePosts, setPagePosts] = useState<VibbaPost[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Criador Digital');
  const [bio, setBio] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void vibbaApi.getPages().then((r) => setPages(r.pages)).catch(() => {});
  }, []);

  const openPage = async (page: VibbaPage) => {
    setSelectedPage(page);
    const res = await vibbaApi.getPosts({ pageId: page.id });
    setPagePosts(res.posts);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const res = await vibbaApi.createPage({
        name: name.trim(),
        category: category.trim() || 'Negócio Local',
        bio: bio.trim(),
      });
      setPages((prev) => [res.page, ...prev]);
      setName('');
      setBio('');
      setShowCreate(false);
      void openPage(res.page);
    } finally {
      setCreating(false);
    }
  };

  const handleFollowPage = async (pageId: string) => {
    const res = await vibbaApi.toggleFollowPage(pageId);
    setPages((prev) => prev.map((p) => (p.id === pageId ? res.page : p)));
    if (selectedPage?.id === pageId) setSelectedPage(res.page);
  };

  if (selectedPage) {
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-5 space-y-4">
        <button
          type="button"
          onClick={() => setSelectedPage(null)}
          className="inline-flex items-center gap-2 min-h-[38px] px-3.5 rounded-lg bg-[#242526] border border-[#3E4042] text-xs font-semibold text-[#E4E6EB]"
        >
          <ArrowLeft size={15} /> Todas as páginas
        </button>
        <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-display font-bold text-[#E4E6EB]">
              {selectedPage.name}
            </h1>
            <p className="text-xs text-[#B0B3B8] mt-0.5 tabular-nums">
              {selectedPage.category} · {selectedPage.followersCount} seguidores
            </p>
            {selectedPage.bio && (
              <p className="text-sm text-[#E4E6EB] mt-2">{selectedPage.bio}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleFollowPage(selectedPage.id)}
            className={`min-h-[38px] px-4 rounded-lg text-xs font-bold ${
              selectedPage.isFollowing
                ? 'bg-[#3A3B3C] text-[#E4E6EB]'
                : 'bg-[#1877F2] text-white'
            }`}
          >
            {selectedPage.isFollowing ? 'A seguir ✓' : 'Seguir página'}
          </button>
        </div>

        {selectedPage.isOwnPage && (
          <PostComposer
            currentUser={currentUser}
            pageId={selectedPage.id}
            placeholder={`Publicar como ${selectedPage.name}...`}
            onPostCreated={(post) => setPagePosts((prev) => [post, ...prev])}
          />
        )}

        {pagePosts.length === 0 ? (
          <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
            Esta página ainda não tem publicações.
          </div>
        ) : (
          pagePosts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onPostUpdated={(u) =>
                setPagePosts((prev) => prev.map((x) => (x.id === u.id ? u : x)))
              }
              onPostDeleted={(id) =>
                setPagePosts((prev) => prev.filter((x) => x.id !== id))
              }
              onOpenUserProfile={onOpenUserProfile}
            />
          ))
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 space-y-5">
      <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#E4E6EB] flex items-center gap-2">
            <Flag size={22} className="text-[#F7B928]" />
            <span>Páginas</span>
          </h1>
          <p className="text-xs text-[#B0B3B8] mt-0.5">
            Cria páginas para o teu negócio, marca, rádio ou projecto artístico.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="min-h-[40px] px-4 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          {showCreate ? <X size={15} /> : <Plus size={15} />}
          <span>{showCreate ? 'Fechar' : 'Criar Página'}</span>
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl bg-[#242526] border border-[#3E4042] p-5 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da página"
              className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoria (ex: Loja, Artista, Notícias)"
              className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
            />
          </div>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Sobre a página..."
            className="w-full rounded-lg bg-[#3A3B3C] px-3.5 py-2.5 text-sm text-white"
          />
          <button
            type="submit"
            disabled={creating}
            className="min-h-[40px] px-5 rounded-lg bg-[#1877F2] text-white text-xs font-bold"
          >
            {creating ? 'A criar...' : 'Criar Página'}
          </button>
        </form>
      )}

      {pages.length === 0 ? (
        <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
          Ainda não existem páginas. Cria a tua primeira página no Vibba!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pages.map((p) => (
            <div
              key={p.id}
              className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 space-y-3 flex flex-col justify-between"
            >
              <div onClick={() => void openPage(p)} className="cursor-pointer space-y-1">
                <h3 className="text-base font-bold text-[#E4E6EB] hover:underline">
                  {p.name}
                </h3>
                <div className="text-xs text-[#B0B3B8] tabular-nums">
                  {p.category} · {p.followersCount} seguidores
                </div>
                {p.bio && (
                  <p className="text-xs text-[#B0B3B8] line-clamp-2">{p.bio}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#3E4042]">
                <button
                  type="button"
                  onClick={() => void openPage(p)}
                  className="flex-1 min-h-[36px] rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-white text-xs font-semibold"
                >
                  Abrir página
                </button>
                <button
                  type="button"
                  onClick={() => void handleFollowPage(p.id)}
                  className={`min-h-[36px] px-4 rounded-lg text-xs font-bold ${
                    p.isFollowing
                      ? 'bg-[#3A3B3C] text-[#E4E6EB]'
                      : 'bg-[#1877F2] text-white'
                  }`}
                >
                  {p.isFollowing ? 'A seguir' : 'Seguir'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
