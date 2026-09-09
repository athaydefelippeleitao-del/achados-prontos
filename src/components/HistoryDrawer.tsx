import React from 'react';
import { 
  BookmarkCheck, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles,
  ArrowRight,
  Clock,
  Heart
} from 'lucide-react';
import { SavedOffer, ProductDeal } from '../types';
import { formatCurrencyBRL } from '../utils/formatter';
import { deleteOffer, clearAllOffers } from '../lib/storage';

interface HistoryDrawerProps {
  savedOffers: SavedOffer[];
  setSavedOffers: React.Dispatch<React.SetStateAction<SavedOffer[]>>;
  onLoadOffer: (offer: SavedOffer) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  savedOffers,
  setSavedOffers,
  onLoadOffer,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = async (offer: SavedOffer) => {
    try {
      await navigator.clipboard.writeText(offer.formattedMessage);
      setCopiedId(offer.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handleDelete = (id: string) => {
    const updated = savedOffers.filter((o) => o.id !== id);
    setSavedOffers(updated);
    deleteOffer(id, updated);
  };

  const handleClearAll = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de achados salvos?')) {
      setSavedOffers([]);
      clearAllOffers();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-yellow-400" />
            <span>Ofertas e Mensagens Salvas</span>
          </h2>
          <p className="text-xs text-slate-400">
            Acesse rapidamente as promoções geradas anteriormente para reenviar nos grupos
          </p>
        </div>

        {savedOffers.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Histórico</span>
          </button>
        )}
      </div>

      {savedOffers.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 text-yellow-400 mx-auto flex items-center justify-center">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhuma oferta salva ainda</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Quando você gerar uma mensagem no editor, clique no botão de coração (Salvar Oferta) para guardar neste painel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedOffers.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 hover:border-yellow-400/40 rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-all space-y-3"
            >
              <div className="flex items-start gap-3">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-16 h-16 rounded-xl object-contain bg-slate-950 p-1 border border-slate-800 shrink-0"
                  referrerPolicy="no-referrer"
                />

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-yellow-400 block truncate">
                    {item.headline || 'OFERTA MERCADO LIVRE'}
                  </span>
                  <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug">
                    {item.title}
                  </h4>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xs font-bold text-emerald-400">
                      {formatCurrencyBRL(item.price)}
                    </span>
                    {item.originalPrice && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatCurrencyBRL(item.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Message excerpt preview */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-[11px] font-mono text-slate-400 line-clamp-3 whitespace-pre-wrap">
                {item.formattedMessage}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={() => onLoadOffer(item)}
                  className="flex items-center gap-1 text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  <span>Abrir no Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(item)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                    title="Copiar Mensagem"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-yellow-400" />
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
