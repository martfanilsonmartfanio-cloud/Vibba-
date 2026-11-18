import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { MarketplaceListing, UserProfile } from '../types/vibba';
import { MARKETPLACE_CATEGORIES } from '../data/initialData';
import { compressImageFile, vibbaApi } from '../lib/api';

interface MarketplaceViewProps {
  currentUser: UserProfile;
  onContactSeller: (sellerId: string, listingTitle: string) => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  currentUser,
  onContactSeller,
}) => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [priceKz, setPriceKz] = useState('');
  const [category, setCategory] = useState<string>(MARKETPLACE_CATEGORIES[0]);
  const [condition, setCondition] = useState<'Novo' | 'Como novo' | 'Usado'>('Novo');
  const [location, setLocation] = useState(currentUser.location || 'Luanda');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadListings = async (q = query, cat = categoryFilter) => {
    try {
      const res = await vibbaApi.getListings(q, cat);
      setListings(res.listings);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    void loadListings(query, categoryFilter);
  }, [query, categoryFilter]);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 960);
      setImageUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar imagem.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await vibbaApi.createListing({
        title: title.trim(),
        priceKz: Number(priceKz) || 0,
        category,
        condition,
        location: location.trim() || 'Angola',
        description: description.trim(),
        imageUrl: imageUrl || undefined,
      });
      setListings((prev) => [res.listing, ...prev]);
      setTitle('');
      setPriceKz('');
      setDescription('');
      setImageUrl('');
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar anúncio.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleSold = async (id: string) => {
    const res = await vibbaApi.toggleListingSold(id);
    setListings((prev) => prev.map((l) => (l.id === id ? res.listing : l)));
  };

  const handleDelete = async (id: string) => {
    await vibbaApi.deleteListing(id);
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 space-y-5">
      <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-[#E4E6EB] flex items-center gap-2">
              <ShoppingBag size={22} className="text-[#45BD62]" />
              <span>Marketplace</span>
            </h1>
            <p className="text-xs text-[#B0B3B8] mt-0.5">
              Compra e vende produtos e serviços em Kwanzas (Kz) perto de ti.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="min-h-[40px] px-4 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            {showCreate ? <X size={15} /> : <Plus size={15} />}
            <span>{showCreate ? 'Fechar' : 'Vender artigo'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B3B8]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar no Marketplace"
              className="w-full h-10 rounded-full bg-[#3A3B3C] pl-9 pr-3 text-sm text-[#E4E6EB] placeholder:text-[#B0B3B8] focus:outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-lg bg-[#3A3B3C] px-3 text-xs text-[#E4E6EB]"
          >
            <option value="">Todas as categorias</option>
            {MARKETPLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl bg-[#242526] border border-[#3E4042] p-5 space-y-3"
        >
          <h2 className="text-base font-bold text-[#E4E6EB]">
            Novo anúncio no Marketplace
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que estás a vender?"
              className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white placeholder:text-[#B0B3B8]"
            />
            <input
              type="number"
              min={0}
              required
              value={priceKz}
              onChange={(e) => setPriceKz(e.target.value)}
              placeholder="Preço em Kwanzas (Kz)"
              className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white placeholder:text-[#B0B3B8]"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
            >
              {MARKETPLACE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={condition}
              onChange={(e) =>
                setCondition(e.target.value as 'Novo' | 'Como novo' | 'Usado')
              }
              className="h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white"
            >
              <option value="Novo">Estado: Novo</option>
              <option value="Como novo">Estado: Como novo</option>
              <option value="Usado">Estado: Usado</option>
            </select>
          </div>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Localização (ex: Maianga, Luanda)"
            className="w-full h-11 rounded-lg bg-[#3A3B3C] px-3.5 text-sm text-white placeholder:text-[#B0B3B8]"
          />
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes do produto..."
            className="w-full rounded-lg bg-[#3A3B3C] px-3.5 py-2.5 text-sm text-white placeholder:text-[#B0B3B8]"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 min-h-[40px] px-4 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-xs font-semibold text-[#45BD62] cursor-pointer">
              <ImageIcon size={16} />
              <span>{imageUrl ? 'Foto carregada ✓' : 'Adicionar foto'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                className="hidden"
              />
            </label>
            <button
              type="submit"
              disabled={creating}
              className="min-h-[40px] px-5 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold"
            >
              {creating ? 'A publicar...' : 'Publicar anúncio'}
            </button>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </form>
      )}

      {listings.length === 0 ? (
        <div className="rounded-xl bg-[#242526] border border-[#3E4042] p-8 text-center text-sm text-[#B0B3B8]">
          Nenhum anúncio encontrado. Publica o primeiro artigo para venda!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-[#242526] border border-[#3E4042] overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative h-48 bg-[#18191A] flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShoppingBag size={36} className="text-[#4E4F50]" />
                  )}
                  {item.status === 'sold' && (
                    <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                      <span className="px-3 py-1 rounded-lg bg-rose-500 text-white text-xs font-bold uppercase tracking-wider">
                        Vendido
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-1.5">
                  <div className="text-lg font-display font-bold text-[#E4E6EB] tabular-nums">
                    {item.priceKz.toLocaleString('pt-PT')} Kz
                  </div>
                  <h3 className="text-sm font-bold text-[#E4E6EB] line-clamp-1">
                    {item.title}
                  </h3>
                  <div className="text-xs text-[#B0B3B8] flex flex-wrap items-center gap-1.5">
                    <span>{item.condition}</span>
                    <span>· {item.category}</span>
                  </div>
                  <div className="text-xs text-[#B0B3B8] inline-flex items-center gap-1">
                    <MapPin size={12} /> {item.location}
                  </div>
                  {item.description && (
                    <p className="text-xs text-[#B0B3B8] line-clamp-2 pt-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-4 pb-4 pt-2 border-t border-[#3E4042] flex items-center gap-2">
                {item.isOwnListing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleToggleSold(item.id)}
                      className="flex-1 min-h-[38px] px-3 rounded-lg bg-[#3A3B3C] hover:bg-[#4E4F50] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      {item.status === 'sold' ? 'Marcar disponível' : 'Marcar vendido'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      aria-label="Eliminar anúncio"
                      className="w-9 h-9 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 flex items-center justify-center"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onContactSeller(item.sellerId, item.title)}
                    className="flex-1 min-h-[38px] px-3 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle size={14} /> Enviar mensagem
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
