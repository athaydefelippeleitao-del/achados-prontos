import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Download, 
  Share2, 
  Sparkles, 
  ExternalLink, 
  Heart, 
  Send,
  Smartphone,
  Layers,
  CheckCheck,
  ChevronDown,
  Users,
  Zap,
  Globe
} from 'lucide-react';
import { renderWhatsAppMarkdown } from '../utils/formatter';
import { getProductFallbackImage } from '../utils/imageHelpers';
import { WhatsAppGroupSenderModal } from './WhatsAppGroupSenderModal';

interface WhatsAppPreviewCardProps {
  formattedMessage: string;
  rawMessage: string;
  imageUrl: string;
  productTitle: string;
  channelName?: string;
  productLink?: string;
  onOpenCardModal: () => void;
  onSaveFavorite?: () => void;
  isSaved?: boolean;
}

export const WhatsAppPreviewCard: React.FC<WhatsAppPreviewCardProps> = ({
  formattedMessage,
  rawMessage,
  imageUrl,
  productTitle,
  channelName = 'Felipão',
  productLink,
  onOpenCardModal,
  onSaveFavorite,
  isSaved = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLinkOnly, setCopiedLinkOnly] = useState(false);
  const [copyImageSuccess, setCopyImageSuccess] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Extract link from rawMessage if not passed directly
  const extractedLink = productLink || (rawMessage.match(/https?:\/\/[^\s]+/)?.[0] || '');

  const handleCopyLink = async () => {
    if (!extractedLink) return;
    try {
      await navigator.clipboard.writeText(extractedLink);
      setCopiedLinkOnly(true);
      setTimeout(() => setCopiedLinkOnly(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(rawMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownloadImage = async () => {
    if (!imageUrl) return;
    try {
      setDownloadingImg(true);
      // Fetch via image proxy to avoid CORS blocking download
      const proxyUrl = `/api/ml/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oferta-${productTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback direct link
      window.open(imageUrl, '_blank');
    } finally {
      setDownloadingImg(false);
    }
  };

  const handleCopyImageToClipboard = async () => {
    if (!imageUrl) return;
    try {
      setCopyImageSuccess(true);
      const proxyUrl = `/api/ml/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      const response = await fetch(proxyUrl);
      const blob = await response.blob();

      // Convert to png if needed for clipboard API
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = proxyUrl;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(async (pngBlob) => {
            if (pngBlob && navigator.clipboard && (window as any).ClipboardItem) {
              try {
                await navigator.clipboard.write([
                  new (window as any).ClipboardItem({ 'image/png': pngBlob }),
                ]);
                setTimeout(() => setCopyImageSuccess(false), 2500);
              } catch (e) {
                console.warn('ClipboardItem error:', e);
                setCopyImageSuccess(false);
              }
            }
          }, 'image/png');
        }
      };
    } catch (err) {
      setCopyImageSuccess(false);
    }
  };

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(rawMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleShareTelegram = () => {
    const encoded = encodeURIComponent(rawMessage);
    window.open(`https://t.me/share/url?url=${encoded}`, '_blank');
  };

  // Get formatted current time HH:MM
  const currentTime = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header bar of preview */}
      <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Prévia Realista no WhatsApp
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onSaveFavorite && (
            <button
              onClick={onSaveFavorite}
              title={isSaved ? 'Salvo nos favoritos' : 'Salvar oferta'}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                isSaved
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-400' : ''}`} />
            </button>
          )}

          <button
            onClick={onOpenCardModal}
            title="Criar banner com selo de desconto"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-xs font-semibold transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Gerar Banner Card</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Chat Background Wallpaper */}
      <div 
        className="flex-1 p-4 sm:p-6 overflow-y-auto flex items-start justify-center"
        style={{
          backgroundColor: '#0b141a',
          backgroundImage: `radial-gradient(#1f2c34 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      >
        {/* WhatsApp Message Bubble (Right aligned or single) */}
        <div className="w-full max-w-sm bg-[#202c33] rounded-2xl overflow-hidden shadow-2xl border border-[#2a3942] text-[#e9edef] transition-all">
          {/* Group Sender Header */}
          <div className="px-3.5 pt-2.5 pb-1 flex items-center justify-between text-[13px] border-b border-[#2a3942]/60">
            <span className="font-semibold text-[#53bdeb] flex items-center gap-1 truncate">
              {channelName}
              <ChevronDown className="w-3.5 h-3.5 text-[#8696a0]" />
            </span>
            <span className="text-[10px] text-[#8696a0]">Grupo de Ofertas</span>
          </div>

          {/* Product Image on Top */}
          {imageUrl && (
            <div className="relative w-full aspect-square bg-[#111b21] overflow-hidden flex items-center justify-center border-b border-[#2a3942]/40">
              <img
                src={imageUrl}
                alt={productTitle}
                className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getProductFallbackImage(productTitle);
                }}
              />
              <div className="absolute top-2 right-2 bg-[#111b21]/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-semibold text-yellow-400 border border-yellow-400/30">
                Mercado Livre
              </div>
            </div>
          )}

          {/* Message Text Content */}
          <div className="p-3.5 text-[14px] leading-relaxed text-[#d1d7db] font-sans break-words whitespace-pre-wrap select-text">
            <div
              dangerouslySetInnerHTML={{
                __html: renderWhatsAppMarkdown(rawMessage),
              }}
            />

            {/* Interactive WhatsApp Link Attachment Preview */}
            {extractedLink && (
              <div className="mt-3 p-2.5 bg-[#182229] border border-[#2a3942] rounded-xl flex items-center justify-between gap-2 hover:bg-[#1f2c34] transition-colors">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-yellow-400/20 text-yellow-400 flex items-center justify-center shrink-0 border border-yellow-400/30">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden text-left">
                    <div className="text-[11px] font-bold text-yellow-400 flex items-center gap-1 truncate">
                      <span>Mercado Livre</span>
                      <span className="text-[9px] text-[#8696a0]">🔗 Oferta</span>
                    </div>
                    <div className="text-[11px] text-[#8696a0] font-mono truncate max-w-[200px]">
                      {extractedLink}
                    </div>
                  </div>
                </div>

                <a
                  href={extractedLink}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-[#53bdeb] bg-[#53bdeb]/10 hover:bg-[#53bdeb]/20 border border-[#53bdeb]/30 rounded-lg transition-colors"
                >
                  Abrir Link
                </a>
              </div>
            )}

            {/* Bubble Timestamp & Status */}
            <div className="flex items-center justify-end gap-1 mt-2 text-[11px] text-[#8696a0]">
              <span>{currentTime}</span>
              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Controls Bar */}
      <div className="bg-slate-850 p-4 border-t border-slate-800 space-y-2.5">
        {/* Main WhatsApp Direct Group Send Button */}
        <button
          id="btn-send-to-whatsapp-group"
          type="button"
          onClick={() => setIsGroupModalOpen(true)}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba59] hover:to-[#0f7a6e] text-slate-950 font-black text-sm shadow-xl shadow-[#25D366]/20 transition-all flex items-center justify-center gap-2 cursor-pointer group"
        >
          <div className="p-1 rounded-lg bg-slate-950/20 text-slate-950 group-hover:scale-110 transition-transform">
            <Send className="w-4 h-4 fill-slate-950" />
          </div>
          <span>Mandar pro Meu Grupo do WhatsApp</span>
          <span className="text-[11px] bg-slate-950 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
            1 Clique
          </span>
        </button>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            id="btn-copy-formatted-msg"
            onClick={handleCopyText}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
              copied
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 shadow-yellow-500/20'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Tudo</span>
              </>
            )}
          </button>

          <button
            id="btn-copy-product-link"
            onClick={handleCopyLink}
            title="Copiar apenas o link de afiliado do produto"
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
              copiedLinkOnly
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 font-bold'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 hover:border-slate-600'
            }`}
          >
            {copiedLinkOnly ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Link Copiado!</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 text-yellow-400" />
                <span>Copiar Link</span>
              </>
            )}
          </button>

          <button
            id="btn-download-photo"
            onClick={handleDownloadImage}
            disabled={downloadingImg || !imageUrl}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-yellow-400" />
            <span>{downloadingImg ? 'Baixando...' : 'Baixar Foto'}</span>
          </button>
        </div>

        {/* Secondary Sharing Actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(rawMessage)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Abrir WhatsApp</span>
          </a>

          <button
            onClick={handleShareTelegram}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram</span>
          </button>

          <button
            onClick={handleCopyImageToClipboard}
            title="Copiar imagem para colar no WhatsApp Web"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors"
          >
            {copyImageSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-yellow-400" />
            )}
            <span className="hidden md:inline">Copiar Imagem</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Group Sender Modal */}
      <WhatsAppGroupSenderModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        rawMessage={rawMessage}
        imageUrl={imageUrl}
        productTitle={productTitle}
        productLink={extractedLink}
      />
    </div>
  );
};
