import React, { useRef, useEffect, useState } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  X, 
  Palette, 
  Layers, 
  Sparkles,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { ProductDeal } from '../types';
import { formatCurrencyBRL } from '../utils/formatter';
import { getProductFallbackImage } from '../utils/imageHelpers';

interface CardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductDeal;
  headline: string;
  coupon?: string;
}

export const CardGeneratorModal: React.FC<CardGeneratorModalProps> = ({
  isOpen,
  onClose,
  product,
  headline,
  coupon,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [themeColor, setThemeColor] = useState<'ml-yellow' | 'dark-slate' | 'emerald-vip' | 'crimson-fire'>('ml-yellow');
  const [cardFormat, setCardFormat] = useState<'square' | 'story'>('square'); // 1:1 or 9:16
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loadingImage, setLoadingImage] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    renderCanvas();
  }, [isOpen, product, headline, coupon, themeColor, cardFormat]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setLoadingImage(true);

    const width = 1080;
    const height = cardFormat === 'square' ? 1080 : 1920;
    canvas.width = width;
    canvas.height = height;

    // 1. Draw Background
    if (themeColor === 'ml-yellow') {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#FFE600');
      grad.addColorStop(0.3, '#FFF159');
      grad.addColorStop(1, '#F5F5F5');
      ctx.fillStyle = grad;
    } else if (themeColor === 'dark-slate') {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0F172A');
      grad.addColorStop(1, '#1E293B');
      ctx.fillStyle = grad;
    } else if (themeColor === 'emerald-vip') {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#064E3B');
      grad.addColorStop(1, '#022C22');
      ctx.fillStyle = grad;
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#991B1B');
      grad.addColorStop(1, '#450A0A');
      ctx.fillStyle = grad;
    }
    ctx.fillRect(0, 0, width, height);

    // 2. Top Header / Brand
    ctx.fillStyle = themeColor === 'ml-yellow' ? '#2D3277' : '#FFE600';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ MERCADO LIVRE • OFERTA VIP', width / 2, 70);

    // 3. Headline Text
    ctx.fillStyle = themeColor === 'ml-yellow' ? '#1E293B' : '#FFFFFF';
    ctx.font = 'bold 44px sans-serif';
    const displayHeadline = (headline || product.title).toUpperCase().slice(0, 48);
    ctx.fillText(displayHeadline, width / 2, 135);

    // 4. White Photo Container Box
    const boxX = 80;
    const boxY = 170;
    const boxWidth = width - 160;
    const boxHeight = cardFormat === 'square' ? 530 : 900;
    const radius = 32;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, boxX, boxY, boxWidth, boxHeight, radius);
    ctx.fill();
    ctx.restore();

    // 5. Draw Product Image via image proxy with automatic fallback
    const rawImgUrl = product.fullImage || product.thumbnail || getProductFallbackImage(product.title, product.categoryName);
    const fallbackImgUrl = getProductFallbackImage(product.title, product.categoryName);

    const drawRestOfCanvas = (imageElement?: HTMLImageElement) => {
      if (imageElement && imageElement.naturalWidth > 0) {
        const padding = 40;
        const drawAreaW = boxWidth - padding * 2;
        const drawAreaH = boxHeight - padding * 2;

        const scale = Math.min(drawAreaW / imageElement.naturalWidth, drawAreaH / imageElement.naturalHeight);
        const imgW = imageElement.naturalWidth * scale;
        const imgH = imageElement.naturalHeight * scale;
        const imgX = boxX + padding + (drawAreaW - imgW) / 2;
        const imgY = boxY + padding + (drawAreaH - imgH) / 2;

        ctx.drawImage(imageElement, imgX, imgY, imgW, imgH);
      }

      // Draw Discount Badge inside photo box top-left
      if (product.discountPercentage && product.discountPercentage > 0) {
        ctx.save();
        ctx.fillStyle = '#E11D48';
        roundRect(ctx, boxX + 24, boxY + 24, 190, 70, 16);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`-${product.discountPercentage}% OFF`, boxX + 24 + 95, boxY + 24 + 48);
        ctx.restore();
      }

      // Draw Free Shipping badge top-right
      if (product.freeShipping) {
        ctx.save();
        ctx.fillStyle = '#059669';
        roundRect(ctx, boxX + boxWidth - 220, boxY + 24, 196, 60, 16);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚚 FRETE GRÁTIS', boxX + boxWidth - 220 + 98, boxY + 24 + 40);
        ctx.restore();
      }

      // Draw Footer Pricing & Info Section
      const bottomAreaY = boxY + boxHeight + 40;

      // Product Short Title
      ctx.fillStyle = themeColor === 'ml-yellow' ? '#1E293B' : '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      const shortTitle = product.title.length > 55 ? product.title.slice(0, 52) + '...' : product.title;
      ctx.fillText(shortTitle, width / 2, bottomAreaY + 10);

      // Price De & Por
      const precoDe = product.originalPrice ? formatCurrencyBRL(product.originalPrice) : '';
      const precoPor = formatCurrencyBRL(product.price);

      if (precoDe) {
        ctx.fillStyle = themeColor === 'ml-yellow' ? '#64748B' : '#94A3B8';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(`De: ${precoDe}`, width / 2, bottomAreaY + 70);
      }

      // Big "POR: R$ 341,98"
      ctx.fillStyle = themeColor === 'ml-yellow' ? '#00A650' : '#4ADE80';
      ctx.font = '900 68px sans-serif';
      ctx.fillText(`POR: ${precoPor}`, width / 2, bottomAreaY + (precoDe ? 145 : 100));

      // Optional Coupon Banner
      if (coupon && coupon.trim()) {
        const couponY = bottomAreaY + (precoDe ? 190 : 150);
        ctx.save();
        ctx.fillStyle = '#FEF08A';
        roundRect(ctx, boxX + 60, couponY, boxWidth - 120, 64, 16);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#CA8A04';
        ctx.stroke();

        ctx.fillStyle = '#854D0E';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚠️ CUPOM: ${coupon.toUpperCase().trim()}`, width / 2, couponY + 44);
        ctx.restore();
      }

      setLoadingImage(false);
    };

    const proxyUrl = `/api/ml/proxy-image?url=${encodeURIComponent(rawImgUrl)}`;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      drawRestOfCanvas(img);
    };

    img.onerror = () => {
      // Try fallback image directly
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.onload = () => {
        drawRestOfCanvas(fallbackImg);
      };
      fallbackImg.onerror = () => {
        drawRestOfCanvas();
      };
      fallbackImg.src = `/api/ml/proxy-image?url=${encodeURIComponent(fallbackImgUrl)}`;
    };

    img.src = proxyUrl;
  };

  // Helper for rounded rectangle in canvas
  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `card-oferta-${product.title.slice(0, 20).replace(/[^a-z0-9]/gi, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (blob && navigator.clipboard && (window as any).ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch (e) {
          console.warn('Could not copy canvas image:', e);
        }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Gerador de Banner Promocional com Preço & Cupom</h2>
              <p className="text-xs text-slate-400">
                Gere uma foto profissional com selo de desconto para postar nos grupos ou status
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Controls (5 cols) */}
          <div className="md:col-span-5 space-y-5">
            {/* Theme Colors */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-yellow-400" />
                <span>Estilo Visual do Card</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setThemeColor('ml-yellow')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    themeColor === 'ml-yellow'
                      ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  🟡 Mercado Livre
                </button>

                <button
                  type="button"
                  onClick={() => setThemeColor('dark-slate')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    themeColor === 'dark-slate'
                      ? 'bg-slate-800 text-yellow-300 border-yellow-400 shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ⚫ Dark Premium
                </button>

                <button
                  type="button"
                  onClick={() => setThemeColor('emerald-vip')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    themeColor === 'emerald-vip'
                      ? 'bg-emerald-800 text-emerald-200 border-emerald-400 shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  🟢 Grupo VIP
                </button>

                <button
                  type="button"
                  onClick={() => setThemeColor('crimson-fire')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    themeColor === 'crimson-fire'
                      ? 'bg-rose-900 text-rose-200 border-rose-400 shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  🔴 Mega Oferta
                </button>
              </div>
            </div>

            {/* Format: 1:1 or 9:16 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Proporção do Card
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCardFormat('square')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    cardFormat === 'square'
                      ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-sm'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  Quadrado (1:1 Feed/Chat)
                </button>
                <button
                  type="button"
                  onClick={() => setCardFormat('story')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    cardFormat === 'story'
                      ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-sm'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  Vertical (9:16 Status)
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={loadingImage || downloading}
                className="w-full py-3.5 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-sm shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Baixar Imagem PNG (HD)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCard}
                disabled={loadingImage}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Banner Copiado para Área de Transferência!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-yellow-400" />
                    <span>Copiar Banner para colar no WhatsApp</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Canvas Preview Area (7 cols) */}
          <div className="md:col-span-7 flex flex-col items-center justify-center bg-slate-950 p-4 rounded-2xl border border-slate-800 relative">
            {loadingImage && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center gap-2 text-yellow-400 text-xs font-bold z-10">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Renderizando foto do Mercado Livre...</span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[500px] object-contain rounded-xl shadow-2xl border border-slate-800"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
