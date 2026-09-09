import React from 'react';
import { 
  Zap, 
  Search, 
  PenTool, 
  FileText, 
  Settings, 
  BookmarkCheck, 
  Sparkles,
  Link2,
  Tag,
  Bot
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'editor' | 'explorer' | 'templates' | 'history' | 'autopilot';
  setActiveTab: (tab: 'editor' | 'explorer' | 'templates' | 'history' | 'autopilot') => void;
  openAffiliateModal: () => void;
  savedCount: number;
  onQuickPasteClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openAffiliateModal,
  savedCount,
  onQuickPasteClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('editor')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black shadow-lg shadow-yellow-500/20">
              <Zap className="w-6 h-6 fill-slate-950 stroke-slate-950" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">Achados<span className="text-yellow-400">Pronto</span></span>
                <span className="text-[10px] font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  ML Brasil
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Gerador de Mensagens & Fotos para Grupos de Promoção</p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              id="tab-editor-btn"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'editor'
                  ? 'bg-yellow-400 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>Gerador</span>
            </button>

            <button
              id="tab-autopilot-btn"
              onClick={() => setActiveTab('autopilot')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'autopilot'
                  ? 'bg-gradient-to-r from-[#25D366] to-[#128C7E] text-slate-950 font-black shadow-lg shadow-[#25D366]/20'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Piloto Automático</span>
              <span className="hidden lg:inline-flex bg-emerald-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                ROBÔ
              </span>
            </button>

            <button
              id="tab-explorer-btn"
              onClick={() => setActiveTab('explorer')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'explorer'
                  ? 'bg-yellow-400 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Radar de Ofertas</span>
              <span className="sm:hidden">Radar</span>
              <span className="hidden md:inline-flex bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-500/30">
                LIVE
              </span>
            </button>

            <button
              id="tab-templates-btn"
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'templates'
                  ? 'bg-yellow-400 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Modelos</span>
            </button>

            <button
              id="tab-history-btn"
              onClick={() => setActiveTab('history')}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-yellow-400 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Salvos</span>
              {savedCount > 0 && (
                <span className="ml-1 bg-yellow-400 text-slate-950 text-xs font-bold px-1.5 py-0.2 rounded-full">
                  {savedCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            <button
              id="quick-paste-navbar-btn"
              onClick={onQuickPasteClick}
              title="Colar link do Mercado Livre"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-yellow-400/30 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Colar Link ML</span>
            </button>

            <button
              id="open-settings-btn"
              onClick={openAffiliateModal}
              title="Configurações de Afiliado & Tags"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
