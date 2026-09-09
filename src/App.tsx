/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LinkParserBar } from './components/LinkParserBar';
import { MessageEditor } from './components/MessageEditor';
import { DealsExplorer } from './components/DealsExplorer';
import { TemplateManagerModal } from './components/TemplateManagerModal';
import { AffiliateSettingsModal } from './components/AffiliateSettingsModal';
import { CardGeneratorModal } from './components/CardGeneratorModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ScheduledQueueManager } from './components/ScheduledQueueManager';
import { ProductDeal, MessageTemplate, AffiliateSettings, SavedOffer, QueuedPromotion } from './types';
import { DEFAULT_TEMPLATES } from './data/defaultTemplates';
import { INITIAL_USER_EXAMPLE_DEAL } from './data/mockDeals';
import { formatMessage } from './utils/formatter';
import { 
  Zap, 
  Sparkles, 
  Flame, 
  Check, 
  Share2, 
  ShieldCheck,
  TrendingUp,
  FileText,
  Sliders,
  Bot,
  Clock
} from 'lucide-react';
import { AutopilotEngine } from './components/AutopilotEngine';
import {
  loadTemplates,
  saveTemplates,
  loadSavedOffers,
  upsertOffer,
  deleteOffer,
  loadAffiliateSettings,
  saveAffiliateSettings,
  loadQueuedPromotions,
  addPromotionToQueue,
} from './lib/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'explorer' | 'templates' | 'history' | 'autopilot' | 'queue'>('editor');
  const [product, setProduct] = useState<ProductDeal>(INITIAL_USER_EXAMPLE_DEAL);
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('felipao_padrao');
  const [queue, setQueue] = useState<QueuedPromotion[]>(() => loadQueuedPromotions());

  const [affiliateSettings, setAffiliateSettings] = useState<AffiliateSettings>({
    affiliateTag: '',
    channelName: 'Felipão',
    addCallToAction: true,
    customFooter: '',
  });

  const [savedOffers, setSavedOffers] = useState<SavedOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Load persisted data from Supabase (with localStorage fallback) ──────────
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const [tpls, offers, affiliate] = await Promise.all([
          loadTemplates(),
          loadSavedOffers(),
          loadAffiliateSettings(),
        ]);
        if (!cancelled) {
          setTemplates(tpls);
          setSavedOffers(offers);
          setAffiliateSettings(affiliate);
        }
      } catch (err) {
        console.warn('[App] bootstrap error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []);

  // Modal Visibility States
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleProductLoaded = (deal: Partial<ProductDeal>) => {
    setProduct((prev) => ({
      ...prev,
      ...deal,
      id: deal.id || 'MLB-' + Date.now(),
      title: deal.title || prev.title,
      price: deal.price !== undefined ? deal.price : prev.price,
      originalPrice: deal.originalPrice !== undefined ? deal.originalPrice : prev.originalPrice,
      discountPercentage: deal.discountPercentage !== undefined ? deal.discountPercentage : prev.discountPercentage,
      permalink: deal.permalink || prev.permalink,
      thumbnail: deal.thumbnail || prev.thumbnail,
      fullImage: deal.fullImage || deal.thumbnail || prev.fullImage,
      coupon: deal.coupon !== undefined ? deal.coupon : prev.coupon,
      headline: deal.headline || prev.headline,
      freeShipping: deal.freeShipping !== undefined ? deal.freeShipping : prev.freeShipping,
    }));
    setActiveTab('editor');
    showToast('Oferta carregada com sucesso!');
  };

  const handleSelectDealFromExplorer = (deal: ProductDeal) => {
    setProduct(deal);
    setActiveTab('editor');
    showToast(`Oferta "${deal.title.slice(0, 24)}..." selecionada!`);
  };

  const handleSaveToHistory = async (formattedMsg: string) => {
    const newOffer: SavedOffer = {
      id: 'saved_' + Date.now(),
      title: product.title,
      headline: product.headline || 'OFERTA MERCADO LIVRE',
      price: product.price,
      originalPrice: product.originalPrice,
      coupon: product.coupon,
      link: product.permalink,
      imageUrl: product.fullImage || product.thumbnail,
      formattedMessage: formattedMsg,
      createdAt: new Date().toISOString(),
      favorite: true,
    };
    const updated = [newOffer, ...savedOffers.filter((o) => o.title !== product.title)];
    setSavedOffers(updated);
    await upsertOffer(newOffer, updated);
    showToast('Oferta favoritada e salva no histórico!');
  };

  const handleAddToQueue = (deal: ProductDeal, formattedMsg: string, imageUrl: string) => {
    const newPromo = addPromotionToQueue({
      deal,
      formattedMessage: formattedMsg,
      imageUrl,
      coupon: deal.coupon,
    });
    setQueue((prev) => [...prev, newPromo]);
    showToast(`⏰ "${deal.title.slice(0, 24)}..." adicionado à Fila de Envios!`);
  };

  const handleAddDealToQueueFromExplorer = (deal: ProductDeal) => {
    const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    const formattedMsg = formatMessage(deal, currentTemplate.content, affiliateSettings);
    const newPromo = addPromotionToQueue({
      deal,
      formattedMessage: formattedMsg,
      imageUrl: deal.fullImage || deal.thumbnail,
      coupon: deal.coupon,
    });
    setQueue((prev) => [...prev, newPromo]);
    showToast(`⏰ "${deal.title.slice(0, 24)}..." guardado na Fila de Envios!`);
  };

  const handleLoadSavedOffer = (offer: SavedOffer) => {
    setProduct({
      id: offer.id,
      title: offer.title,
      headline: offer.headline,
      price: offer.price,
      originalPrice: offer.originalPrice,
      currency_id: 'BRL',
      permalink: offer.link,
      thumbnail: offer.imageUrl,
      fullImage: offer.imageUrl,
      freeShipping: true,
      coupon: offer.coupon,
    });
    setActiveTab('editor');
    showToast('Oferta carregada no editor!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Carregando dados...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-yellow-400 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-300">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openAffiliateModal={() => setIsAffiliateModalOpen(true)}
        savedCount={savedOffers.length}
        queueCount={queue.filter((i) => i.status === 'pending').length}
        onQuickPasteClick={() => {
          setActiveTab('editor');
          const input = document.getElementById('ml-link-input');
          if (input) input.focus();
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Link Parser Bar (Always visible in Editor or Explorer for quick parsing) */}
        {activeTab === 'editor' && (
          <LinkParserBar 
            onProductLoaded={handleProductLoaded} 
            onOpenExplorer={() => setActiveTab('explorer')}
            onOpenAutopilot={() => setActiveTab('autopilot')}
          />
        )}

        {/* View Tabs */}
        {activeTab === 'editor' && (
          <MessageEditor
            product={product}
            setProduct={setProduct}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            setSelectedTemplateId={setSelectedTemplateId}
            affiliateSettings={affiliateSettings}
            onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
            onOpenCardModal={() => setIsCardModalOpen(true)}
            onSaveToHistory={handleSaveToHistory}
            onAddToQueue={handleAddToQueue}
          />
        )}

        {activeTab === 'queue' && (
          <ScheduledQueueManager
            queue={queue}
            setQueue={setQueue}
            templates={templates}
            affiliateSettings={affiliateSettings}
            onOpenExplorer={() => setActiveTab('explorer')}
            onSelectDealForEditor={handleSelectDealFromExplorer}
          />
        )}

        {activeTab === 'autopilot' && (
          <AutopilotEngine
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            affiliateSettings={affiliateSettings}
            onSelectDealForEditor={handleSelectDealFromExplorer}
          />
        )}

        {activeTab === 'explorer' && (
          <DealsExplorer 
            onSelectDeal={handleSelectDealFromExplorer} 
            onAddToQueue={handleAddDealToQueueFromExplorer}
          />
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
                  <FileText className="w-6 h-6 text-yellow-400" />
                  <span>Modelos de Texto Personalizados</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Configure e organize múltiplos formatos de mensagens para cada canal, nicho ou tipo de oferta (como no modelo do Felipão, estilo Relâmpago ou Foco em Cupom).
                </p>
              </div>

              <button
                onClick={() => setIsTemplateModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs shadow-lg shadow-yellow-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                <span>Abrir Gerenciador de Modelos</span>
              </button>
            </div>

            {/* Render Template Manager inside full tab */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    tpl.id === selectedTemplateId
                      ? 'bg-slate-900 border-yellow-400 shadow-lg shadow-yellow-500/5'
                      : 'bg-slate-900/60 border-slate-850 hover:border-slate-750'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {tpl.name}
                        {tpl.id === selectedTemplateId && (
                          <span className="text-[10px] bg-yellow-400 text-slate-950 font-extrabold px-1.5 py-0.2 rounded">
                            Ativo
                          </span>
                        )}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded uppercase">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{tpl.description}</p>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {tpl.content}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        setActiveTab('editor');
                        showToast(`Modelo "${tpl.name}" selecionado!`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Usar no Gerador
                    </button>

                    <button
                      onClick={() => setIsTemplateModalOpen(true)}
                      className="text-xs text-slate-400 hover:text-white underline"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryDrawer
            savedOffers={savedOffers}
            setSavedOffers={setSavedOffers}
            onLoadOffer={handleLoadSavedOffer}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white">Achados<span className="text-yellow-400">Pronto</span></span>
            <span>• Otimizado para WhatsApp, Telegram & Mercado Livre Brasil</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Modelos Customizados</span>
            <span>•</span>
            <span>IA Gemini 3.7 Flash</span>
            <span>•</span>
            <span>Tags de Afiliado Automáticas</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TemplateManagerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        setTemplates={setTemplates}
        selectedTemplateId={selectedTemplateId}
        setSelectedTemplateId={setSelectedTemplateId}
      />

      <AffiliateSettingsModal
        isOpen={isAffiliateModalOpen}
        onClose={() => setIsAffiliateModalOpen(false)}
        settings={affiliateSettings}
        setSettings={setAffiliateSettings}
      />

      <CardGeneratorModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        product={product}
        headline={product.headline || 'OFERTA MERCADO LIVRE'}
        coupon={product.coupon}
      />
    </div>
  );
}
