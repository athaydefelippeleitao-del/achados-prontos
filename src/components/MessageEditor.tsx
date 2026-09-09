import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Tag, 
  Percent, 
  Truck, 
  CreditCard, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  FileText, 
  RotateCcw, 
  Plus, 
  Check, 
  Loader2, 
  AlertTriangle,
  Upload,
  Layers,
  Wand2,
  HelpCircle,
  ExternalLink,
  Copy,
  Clipboard,
  Globe,
  CheckCheck
} from 'lucide-react';
import { ProductDeal, MessageTemplate, AffiliateSettings, AICopySuggestion } from '../types';
import { compileTemplate, buildAffiliateUrl } from '../utils/formatter';
import { QUICK_IMAGE_PRESETS, getProductFallbackImage } from '../utils/imageHelpers';
import { WhatsAppPreviewCard } from './WhatsAppPreviewCard';

interface MessageEditorProps {
  product: ProductDeal;
  setProduct: React.Dispatch<React.SetStateAction<ProductDeal>>;
  templates: MessageTemplate[];
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  affiliateSettings: AffiliateSettings;
  onOpenTemplateModal: () => void;
  onOpenCardModal: () => void;
  onSaveToHistory: (formattedMsg: string) => void;
  onAddToQueue?: (deal: ProductDeal, formattedMsg: string, imageUrl: string) => void;
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
  product,
  setProduct,
  templates,
  selectedTemplateId,
  setSelectedTemplateId,
  affiliateSettings,
  onOpenTemplateModal,
  onOpenCardModal,
  onSaveToHistory,
  onAddToQueue,
}) => {
  const [headline, setHeadline] = useState(product.headline || 'PRALANA PRA FINALIZAR SUA NOITE 🤠🌾🐎');
  const [title, setTitle] = useState(product.title);
  const [price, setPrice] = useState(product.price);
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(product.originalPrice || undefined);
  const [coupon, setCoupon] = useState(product.coupon || '');
  const [hasCouponAlert, setHasCouponAlert] = useState(Boolean(product.coupon));
  const [freeShipping, setFreeShipping] = useState(product.freeShipping);
  const [imageUrl, setImageUrl] = useState(product.fullImage || product.thumbnail);
  const [productLink, setProductLink] = useState(product.permalink);
  const [installmentsQty, setInstallmentsQty] = useState(product.installments?.quantity || 10);
  const [installmentsAmount, setInstallmentsAmount] = useState(
    product.installments?.amount || Number((product.price / 10).toFixed(2))
  );

  // AI Generation state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AICopySuggestion[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync with product props when switching deal
  useEffect(() => {
    setTitle(product.title);
    setPrice(product.price);
    setOriginalPrice(product.originalPrice || undefined);
    setCoupon(product.coupon || '');
    setHasCouponAlert(Boolean(product.coupon));
    setFreeShipping(product.freeShipping);
    setImageUrl(product.fullImage || product.thumbnail);
    setProductLink(product.permalink || 'https://meli.la/2QGwovg');
    if (product.headline) {
      setHeadline(product.headline);
    }
    if (product.installments) {
      setInstallmentsQty(product.installments.quantity);
      setInstallmentsAmount(product.installments.amount);
    } else {
      setInstallmentsQty(10);
      setInstallmentsAmount(Number((product.price / 10).toFixed(2)));
    }
  }, [product]);

  // Current active template
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Calculate final affiliate link
  const finalAffiliateLink = buildAffiliateUrl(productLink || product.permalink || '', affiliateSettings);

  // Link updater
  const handleUpdateLink = (newLink: string) => {
    setProductLink(newLink);
    setProduct((prev) => ({
      ...prev,
      permalink: newLink,
    }));
  };

  const handleCopyLinkOnly = async () => {
    const linkToCopy = finalAffiliateLink || productLink;
    if (!linkToCopy) return;
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handlePasteLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleUpdateLink(text.trim());
      }
    } catch (err) {
      console.warn('Failed to read clipboard:', err);
    }
  };

  // Calculate discount
  const discountPercentage =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  // Compile raw message formatted for WhatsApp
  const rawMessage = compileTemplate(activeTemplate, {
    headline,
    title,
    price,
    originalPrice,
    discountPercentage,
    coupon: hasCouponAlert && coupon ? coupon : undefined,
    link: finalAffiliateLink,
    freeShipping,
    installments: { quantity: installmentsQty, amount: installmentsAmount },
    channelName: affiliateSettings.channelName || 'Grupo de Promoções',
    customFooter: affiliateSettings.customFooter,
  });

  // Call Gemini AI for creative niche copy
  const handleGenerateAICopy = async () => {
    setIsGeneratingAI(true);
    setShowAiSuggestions(true);
    try {
      const response = await fetch('/api/ai/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          price,
          originalPrice,
          coupon: coupon || undefined,
          category: product.categoryName || 'Geral',
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar sugestões com IA.');
      }

      const data = await response.json();
      if (data.suggestions && data.suggestions.length > 0) {
        setAiSuggestions(data.suggestions);
        // Automatically select the first high-converting headline
        setHeadline(data.suggestions[0].headline);
      }
    } catch (err) {
      console.error('Error generating AI copy:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleApplySuggestion = (sug: AICopySuggestion) => {
    setHeadline(sug.headline);
    if (sug.suggestedCupomCallout && !coupon) {
      const extracted = sug.suggestedCupomCallout.match(/[A-Z0-9]{4,}/);
      if (extracted) {
        setCoupon(extracted[0]);
        setHasCouponAlert(true);
      }
    }
  };

  const handleUpdateImage = (newUrl: string) => {
    setImageUrl(newUrl);
    setProduct((prev) => ({
      ...prev,
      fullImage: newUrl,
      thumbnail: newUrl,
    }));
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          handleUpdateImage(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveFavorite = () => {
    onSaveToHistory(rawMessage);
  };

  return (
    <div id="message-editor-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Form & Configuration (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Template Selector Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-yellow-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Modelo de Texto da Mensagem
              </h2>
            </div>
            <button
              onClick={onOpenTemplateModal}
              className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 underline decoration-dashed transition-colors"
            >
              Gerenciar / Criar Modelos
            </button>
          </div>

          {/* Template pills */}
          <div className="flex flex-wrap gap-2">
            {templates.map((tpl) => {
              const isSelected = tpl.id === selectedTemplateId;
              return (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-md font-bold'
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {tpl.name}
                </button>
              );
            })}
          </div>

          <p className="mt-2.5 text-xs text-slate-400 italic">
            💡 {activeTemplate.description}
          </p>
        </div>

        {/* Product Details Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-5">
          {/* Headline / Chamada com IA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>Chamada com Emojis (Headline)</span>
                <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.2 rounded border border-yellow-400/20">
                  Alta Conversão
                </span>
              </label>

              <button
                type="button"
                onClick={handleGenerateAICopy}
                disabled={isGeneratingAI}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-500/20 to-yellow-500/20 hover:from-purple-500/30 hover:to-yellow-500/30 text-yellow-300 border border-yellow-400/40 text-xs font-bold transition-all cursor-pointer"
              >
                {isGeneratingAI ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5 text-yellow-400" />
                )}
                <span>{isGeneratingAI ? 'Criando Cópias...' : '✨ Sugerir com IA'}</span>
              </button>
            </div>

            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Ex: PRALANA PRA FINALIZAR SUA NOITE 🤠🌾🐎"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />

            {/* AI Generated Suggestions Box */}
            {showAiSuggestions && aiSuggestions.length > 0 && (
              <div className="bg-slate-950 border border-yellow-400/30 rounded-xl p-3 space-y-2 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-[11px] text-yellow-400 font-bold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Sugestões Geradas pelo Gemini:
                  </span>
                  <button
                    onClick={() => setShowAiSuggestions(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    Fechar
                  </button>
                </div>
                <div className="space-y-1.5">
                  {aiSuggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplySuggestion(sug)}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 border ${
                        headline === sug.headline
                          ? 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <span className="font-semibold truncate">{sug.headline}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 bg-slate-800 px-1.5 py-0.5 rounded">
                        Usar
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Título do Produto
            </label>
            <textarea
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Chapéu Pralana Bangora Farmer Aba10 Palha Importada Original"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Price De & Por */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1">
                <span>Preço "De" (R$)</span>
                <span className="text-[10px] text-slate-400">(Original)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={originalPrice || ''}
                  onChange={(e) => setOriginalPrice(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="391.98"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1 text-yellow-400">
                  <span>Preço "Por" (R$)</span>
                  <span className="text-[10px] text-emerald-400 font-bold">*Obrigatório</span>
                </label>
                {discountPercentage > 0 && (
                  <span className="text-[11px] font-extrabold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {discountPercentage}% OFF
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-yellow-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                  placeholder="341.98"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>
          </div>

          {/* Coupon Section */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>Cupom de Desconto</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={hasCouponAlert}
                  onChange={(e) => setHasCouponAlert(e.target.checked)}
                  className="w-4 h-4 rounded text-yellow-400 focus:ring-yellow-400 bg-slate-800 border-slate-600"
                />
                <span>Incluir linha de alerta (⚠️ cupom: ...)</span>
              </label>
            </div>

            <div className="relative">
              <input
                type="text"
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value.toUpperCase());
                  if (e.target.value) setHasCouponAlert(true);
                }}
                placeholder="Ex: SALVEIESSA, COMPRAML ou OFERTASEMPRE"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-yellow-300 font-mono font-bold tracking-wider placeholder-slate-600 uppercase focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            {/* Quick 9.9 Coupon Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2">
              <span className="text-[11px] text-slate-400 font-medium">Cupons 9.9 de Hoje:</span>
              {[
                { code: 'SALVEIESSA', discount: 25 },
                { code: 'AGORAVAI', discount: 25 },
                { code: 'COMPRAML', discount: 22 },
                { code: 'OFERTASEMPRE', discount: 22 },
                { code: 'VALEMAIS', discount: 10 },
              ].map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCoupon(c.code);
                    setHasCouponAlert(true);
                    const base = (originalPrice && originalPrice > 0) ? originalPrice : (price > 0 ? Math.round(price * 1.25 * 100) / 100 : 0);
                    if (base > 0) {
                      if (!originalPrice || originalPrice <= price) {
                        setOriginalPrice(base);
                      }
                      const newPrice = Math.round(base * (1 - c.discount / 100) * 100) / 100;
                      setPrice(newPrice);
                      setDiscountPercentage(c.discount);
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                    coupon === c.code
                      ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-sm font-black'
                      : 'bg-slate-800 hover:bg-slate-700 text-yellow-300 border-slate-700'
                  }`}
                >
                  {c.code} (-{c.discount}%)
                </button>
              ))}
            </div>
          </div>

          {/* Shipping & Installments row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">Frete Grátis</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={freeShipping}
                  onChange={(e) => setFreeShipping(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                <span>Parcelamento</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={installmentsQty}
                  onChange={(e) => setInstallmentsQty(Number(e.target.value) || 1)}
                  className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-center font-bold"
                />
                <span className="text-slate-400">x de R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={installmentsAmount}
                  onChange={(e) => setInstallmentsAmount(Number(e.target.value) || 0)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold"
                />
              </div>
            </div>
          </div>

          {/* Product Link & Affiliate URL Management Box */}
          <div className="p-3.5 bg-slate-950 border border-yellow-500/30 rounded-xl space-y-2.5 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-yellow-400" />
                <span>Link do Produto (Mercado Livre)</span>
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePasteLink}
                  title="Colar link da área de transferência"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
                >
                  <Clipboard className="w-3 h-3 text-yellow-400" />
                  <span>Colar</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLinkOnly}
                  title="Copiar link formatado"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                    copiedLink
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-yellow-400" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>

                {(finalAffiliateLink || productLink) && (
                  <a
                    href={finalAffiliateLink || productLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    title="Abrir e testar o link no Mercado Livre"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-xs font-semibold transition-colors"
                  >
                    <span>Testar Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                id="product-link-input"
                type="text"
                value={productLink}
                onChange={(e) => handleUpdateLink(e.target.value)}
                placeholder="Ex: https://meli.la/2QGwovg ou https://produto.mercadolivre.com.br/..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            {/* Live Link Preview Info */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-1 pt-0.5 border-t border-slate-800/80">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[280px] sm:max-w-xs text-slate-300 font-mono">
                  {finalAffiliateLink || productLink}
                </span>
              </span>

              {affiliateSettings.affiliateTag && (
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  Tag: {affiliateSettings.affiliateTag}
                </span>
              )}
            </div>
          </div>

          {/* Image URL, Live Thumbnail & Upload */}
          <div className="space-y-3 p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>Foto do Produto</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
                  HD Ativa
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              {/* Live Image Preview Thumbnail */}
              <div className="relative w-16 h-16 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center group">
                <img
                  src={imageUrl || getProductFallbackImage(title, product.categoryName)}
                  alt={title}
                  className="w-full h-full object-contain p-1"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getProductFallbackImage(title, product.categoryName);
                  }}
                />
              </div>

              {/* URL and Upload Input */}
              <div className="flex-1 space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => handleUpdateImage(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-mono truncate"
                  />
                  <label className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-slate-800 to-slate-750 hover:from-slate-750 hover:to-slate-700 text-white border border-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm">
                    <Upload className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Quick Category Image Presets */}
            <div className="pt-1">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                Trocar por foto temática rápida:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {QUICK_IMAGE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleUpdateImage(preset.url)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 font-medium ${
                      imageUrl === preset.url
                        ? 'bg-yellow-400 text-slate-950 border-yellow-400 font-bold shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: WhatsApp Realistic Bubble Preview (5 cols) */}
      <div id="whatsapp-preview-container" className="lg:col-span-5 sticky top-20">
        <WhatsAppPreviewCard
          formattedMessage={rawMessage}
          rawMessage={rawMessage}
          imageUrl={imageUrl}
          productTitle={title}
          channelName={affiliateSettings.channelName || 'Felipão'}
          productLink={finalAffiliateLink || productLink}
          onOpenCardModal={onOpenCardModal}
          onSaveFavorite={handleSaveFavorite}
          onAddToQueue={onAddToQueue ? () => onAddToQueue(product, rawMessage, imageUrl) : undefined}
        />
      </div>
    </div>
  );
};
