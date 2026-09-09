import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Loader2, 
  ArrowRight, 
  AlertCircle, 
  Flame, 
  Link as LinkIcon,
  CheckCircle2,
  Zap,
  Bot
} from 'lucide-react';
import { ProductDeal } from '../types';

interface LinkParserBarProps {
  onProductLoaded: (deal: Partial<ProductDeal>) => void;
  onOpenExplorer?: () => void;
  onOpenAutopilot?: () => void;
  autoFocus?: boolean;
}

const QUICK_SEARCH_SUGGESTIONS = [
  { label: '🤠 Chapéu Pralana', query: 'Chapéu Pralana Bangora' },
  { label: '👢 Bota Goyazes', query: 'Bota Goyazes Texana Couro' },
  { label: '🍟 Air Fryer Walita', query: 'Fritadeira Air Fryer Philips Walita' },
  { label: '🔊 JBL Boombox 3', query: 'Caixa de Som JBL Boombox 3' },
  { label: '📱 Galaxy S24 Ultra', query: 'Smartphone Samsung Galaxy S24' },
  { label: '👟 Tênis Nike Revolution', query: 'Tenis Nike Revolution 7' },
  { label: '🛠️ Furadeira Bosch', query: 'Furadeira Parafusadeira Bosch 12V' },
  { label: '🍷 Perfume Malbec', query: 'Perfume Malbec O Boticario' },
  { label: '☕ Cafeteira Nespresso', query: 'Cafeteira Nespresso Essenza Mini' },
  { label: '🤖 Robô Aspirador WAP', query: 'Aspirador Robo WAP Robot W300' },
];

export const LinkParserBar: React.FC<LinkParserBarProps> = ({ onProductLoaded, onOpenExplorer, onOpenAutopilot, autoFocus }) => {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successDealTitle, setSuccessDealTitle] = useState<string | null>(null);

  const executeSearchOrParse = async (queryOrUrl: string) => {
    const clean = queryOrUrl.trim();
    if (!clean) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessDealTitle(null);

    try {
      const response = await fetch('/api/ml/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: clean, rawText: clean }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Não foi possível encontrar ou extrair esta oferta.');
      }

      const product: ProductDeal = await response.json();
      onProductLoaded(product);
      setSuccessDealTitle(product.title);
      setInputValue('');

      // Scroll smoothly to WhatsApp preview card if available
      setTimeout(() => {
        const previewEl = document.getElementById('whatsapp-preview-container') || document.getElementById('message-editor-container');
        if (previewEl) {
          previewEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar oferta. Tente pesquisar outro termo ou cole o link direto.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearchOrParse(inputValue);
  };

  const handleQuickPasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputValue(text.trim());
        executeSearchOrParse(text.trim());
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  const handleSuggestionClick = (query: string) => {
    setInputValue(query);
    executeSearchOrParse(query);
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-yellow-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">
                Buscar Oferta & Gerar Mensagem Pronta
              </h2>
              <span className="text-[10px] font-bold bg-yellow-400 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3 fill-slate-950" />
                1 Clique
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Digite o nome do produto desejado ou cole o link do anúncio do Mercado Livre.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {onOpenAutopilot && (
            <button
              type="button"
              onClick={onOpenAutopilot}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#25D366]/20 to-[#128C7E]/20 hover:from-[#25D366]/30 hover:to-[#128C7E]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Ligar Robô Automático</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleQuickPasteClipboard}
            className="text-xs text-slate-300 hover:text-yellow-400 underline decoration-dashed flex items-center gap-1 font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            Colar link copiado
          </button>
        </div>
      </div>

      {/* Main Search / Link Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="ml-link-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ex: Chapéu Pralana, Air Fryer Walita, Fone JBL, Parafusadeira Bosch ou cole o link..."
            autoFocus={autoFocus}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-16 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all shadow-inner"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => setInputValue('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>

        <button
          id="btn-search-and-generate"
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 font-bold text-sm shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Buscando & Gerando...</span>
            </>
          ) : (
            <>
              <Flame className="w-4 h-4 fill-slate-950" />
              <span>Buscar Oferta Pronta</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Instant 1-Click Search Chips */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-yellow-400" />
            Ofertas Rápidas para Gerar Agora:
          </span>
          {onOpenExplorer && (
            <button
              type="button"
              onClick={onOpenExplorer}
              className="text-yellow-400 hover:underline flex items-center gap-1 font-medium"
            >
              Ver Radar Completo (24+ Ofertas)
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
          {QUICK_SEARCH_SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(item.query)}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-yellow-400/10 text-slate-300 hover:text-yellow-300 border border-slate-800 hover:border-yellow-400/30 text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Success Notification */}
      {successDealTitle && !loading && (
        <div className="flex items-center justify-between gap-2 text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2.5 rounded-xl">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">
              <strong>Oferta pronta:</strong> {successDealTitle} — A mensagem e a foto estão prontas para envio abaixo!
            </span>
          </div>
          <span className="text-[10px] bg-emerald-400 text-slate-950 font-bold px-2 py-0.5 rounded shrink-0">
            Pronta para Envio
          </span>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
