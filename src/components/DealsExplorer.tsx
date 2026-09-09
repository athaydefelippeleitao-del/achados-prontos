import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Flame, 
  Zap, 
  Tag, 
  Truck, 
  ExternalLink, 
  Sparkles, 
  Filter, 
  ArrowUpDown,
  ShoppingBag,
  Check,
  Star,
  Copy,
  Loader2
} from 'lucide-react';
import { ProductDeal } from '../types';
import { POPULAR_CURATED_DEALS } from '../data/mockDeals';
import { formatCurrencyBRL } from '../utils/formatter';
import { getProductFallbackImage } from '../utils/imageHelpers';

interface DealsExplorerProps {
  onSelectDeal: (deal: ProductDeal) => void;
}

const CATEGORY_CHIPS = [
  { id: 'all', label: '🔥 Todas as Ofertas', query: 'ofertas relampago country agro' },
  { id: 'botas', label: '👢 Botas Texanas', query: 'bota texana country masculina feminina couro dgo' },
  { id: 'calcas', label: '👖 Calças Country', query: 'calca king farm muladeira carpinteira jeans country' },
  { id: 'camisas', label: '👔 Camisas Xadrez', query: 'camisa xadrez country barretos manga longa' },
  { id: 'chapeus', label: '🤠 Chapéus Pralana', query: 'chapeu pralana country aba larga peao' },
  { id: 'cintos', label: '⭐ Cintos & Fivelas', query: 'cinto country couro fivela pampas' },
  { id: 'cupons', label: '🎟️ Só com Cupom OFERTASEMPRE', query: 'cupom desconto country' },
];

export const DealsExplorer: React.FC<DealsExplorerProps> = ({ onSelectDeal }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [deals, setDeals] = useState<ProductDeal[]>(POPULAR_CURATED_DEALS);
  const [loading, setLoading] = useState(false);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [onlyFreeShipping, setOnlyFreeShipping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDeals = async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ml/search?q=${encodeURIComponent(query)}&limit=36`);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setDeals(data.results);
        } else {
          setDeals(POPULAR_CURATED_DEALS);
        }
      } else {
        setDeals(POPULAR_CURATED_DEALS);
      }
    } catch (err) {
      console.warn('Fallback to popular deals on search error:', err);
      setDeals(POPULAR_CURATED_DEALS);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (cat: typeof CATEGORY_CHIPS[0]) => {
    setSelectedCategory(cat.id);
    setSearchQuery('');
    if (cat.id === 'all') {
      setDeals(POPULAR_CURATED_DEALS);
    } else {
      fetchDeals(cat.query);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchDeals(searchQuery.trim());
    }
  };

  // Filter deals by category, discount and free shipping
  const filteredDeals = deals.filter((d) => {
    const t = (d.title || '').toLowerCase();

    if (selectedCategory === 'botas') {
      if (!t.includes('bota') && !t.includes('texana') && !t.includes('botina') && !t.includes('dgo')) return false;
    } else if (selectedCategory === 'calcas') {
      if (!t.includes('calça') && !t.includes('calca') && !t.includes('king farm') && !t.includes('muladeira') && !t.includes('carpinteira') && !t.includes('jeans')) return false;
    } else if (selectedCategory === 'camisas') {
      if (!t.includes('camisa') && !t.includes('xadrez')) return false;
    } else if (selectedCategory === 'chapeus') {
      if (!t.includes('chapéu') && !t.includes('chapeu') && !t.includes('pralana') && !t.includes('karandá') && !t.includes('karanda')) return false;
    } else if (selectedCategory === 'cintos') {
      if (!t.includes('cinto') && !t.includes('fivela')) return false;
    } else if (selectedCategory === 'cupons') {
      if (!d.coupon) return false;
    }

    if (minDiscount > 0 && (d.discountPercentage || 0) < minDiscount) {
      return false;
    }
    if (onlyFreeShipping && !d.freeShipping) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-xs font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span>Radar de Achados Mercado Livre</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Encontre as melhores promoções e transforme em <span className="text-yellow-400">mensagens prontas</span> com foto!
          </h1>

          <p className="text-sm text-slate-300">
            Busque qualquer produto do Mercado Livre Brasil ou escolha uma das categorias abaixo para carregar ofertas reais com desconto, fotos em alta resolução e cupons.
          </p>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="search-ml-deals-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar ex: Chapéu Pralana, Air Fryer, iPhone 15, Parafusadeira Bosch..."
                className="w-full bg-slate-950/90 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner"
              />
            </div>
            <button
              id="btn-search-deals"
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-sm rounded-2xl shadow-lg shadow-yellow-500/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </form>
        </div>
      </div>

      {/* Category Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
        {CATEGORY_CHIPS.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategorySelect(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
              selectedCategory === cat.id && !searchQuery
                ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Filter Options Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-white">Filtros:</span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyFreeShipping}
              onChange={(e) => setOnlyFreeShipping(e.target.checked)}
              className="w-4 h-4 rounded text-yellow-400 focus:ring-yellow-400 bg-slate-950 border-slate-700"
            />
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              Apenas Frete Grátis
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Desconto mínimo:</span>
            <select
              value={minDiscount}
              onChange={(e) => setMinDiscount(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:ring-1 focus:ring-yellow-400"
            >
              <option value="0">Todos</option>
              <option value="10">10%+ OFF</option>
              <option value="20">20%+ OFF</option>
              <option value="30">30%+ OFF</option>
              <option value="50">50%+ OFF 🔥</option>
            </select>
          </div>
        </div>

        <div className="text-slate-400 font-medium">
          Mostrando <span className="text-white font-bold">{filteredDeals.length}</span> achados
        </div>
      </div>

      {/* Grid of Product Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
          <p className="text-sm font-medium">Buscando as melhores ofertas do Mercado Livre...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredDeals.map((deal) => {
            const hasDiscount = deal.discountPercentage && deal.discountPercentage > 0;
            return (
              <div
                key={deal.id}
                className="bg-slate-900 border border-slate-800 hover:border-yellow-400/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-yellow-500/5 transition-all duration-300 flex flex-col group"
              >
                {/* Image Box */}
                <div className="relative w-full aspect-square bg-slate-950 p-4 flex items-center justify-center overflow-hidden">
                  <img
                    src={deal.fullImage || deal.thumbnail || getProductFallbackImage(deal.title, deal.categoryName)}
                    alt={deal.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getProductFallbackImage(deal.title, deal.categoryName);
                    }}
                  />

                  {/* Discount badge */}
                  {hasDiscount && (
                    <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md flex items-center gap-0.5">
                      <span>-{deal.discountPercentage}%</span>
                    </div>
                  )}

                  {/* Free shipping pill */}
                  {deal.freeShipping && (
                    <div className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur-sm text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      <span>FULL</span>
                    </div>
                  )}

                  {deal.coupon && (
                    <div className="absolute bottom-2 left-3 right-3 bg-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow text-center truncate flex items-center justify-center gap-1">
                      <span>⚠️ Cupom:</span>
                      <span className="font-extrabold underline">{deal.coupon}</span>
                    </div>
                  )}
                </div>

                {/* Content Box */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {deal.categoryName && (
                      <span className="text-[10px] font-bold text-yellow-400/90 uppercase tracking-wider block mb-1">
                        {deal.categoryName}
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-yellow-300 transition-colors">
                      {deal.title}
                    </h3>
                  </div>

                  {/* Prices */}
                  <div className="pt-2 border-t border-slate-800">
                    {deal.originalPrice && deal.originalPrice > deal.price && (
                      <span className="text-xs text-slate-400 line-through block">
                        De: {formatCurrencyBRL(deal.originalPrice)}
                      </span>
                    )}
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-xs text-slate-400 font-bold">Por:</span>
                      <span className="text-lg font-extrabold text-yellow-400">
                        {formatCurrencyBRL(deal.price)}
                      </span>
                      {deal.coupon ? (
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-1.5 py-0.5 rounded">
                          com cupom {deal.coupon}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          no pix
                        </span>
                      )}
                    </div>

                    {deal.installments && (
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {deal.installments.quantity}x de {formatCurrencyBRL(deal.installments.amount)}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => onSelectDeal(deal)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs shadow-md shadow-yellow-500/10 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gerar Mensagem</span>
                    </button>

                    <a
                      href={deal.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver anúncio no Mercado Livre"
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
