import { MessageTemplate, ProductDeal, AffiliateSettings } from '../types';

export function formatCurrencyBRL(value?: number | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function buildAffiliateUrl(originalUrl: string, settings?: AffiliateSettings): string {
  if (!originalUrl) return '';
  const cleanUrl = originalUrl.trim();

  if (!settings?.affiliateTag || !settings.affiliateTag.trim()) {
    return cleanUrl;
  }

  const tag = settings.affiliateTag.trim();
  try {
    const urlObj = new URL(cleanUrl);
    if (tag.includes('=')) {
      const [key, val] = tag.split('=');
      urlObj.searchParams.set(key, val);
    } else {
      urlObj.searchParams.set('matt_tool', tag);
    }
    return urlObj.toString();
  } catch {
    // If it's a short URL like meli.la/xxx
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}${tag.includes('=') ? tag : `matt_tool=${tag}`}`;
  }
}

export function compileTemplate(
  template: MessageTemplate,
  data: {
    headline: string;
    title: string;
    price: number;
    originalPrice?: number | null;
    discountPercentage?: number;
    coupon?: string;
    link: string;
    freeShipping?: boolean;
    installments?: { quantity: number; amount: number } | null;
    channelName?: string;
    customFooter?: string;
  }
): string {
  let content = template.content;

  const precoDeFormatted = data.originalPrice
    ? formatCurrencyBRL(data.originalPrice)
    : formatCurrencyBRL(data.price * 1.2); // Fallback estimate if no old price
  const hasCents = (Math.round(data.price * 100) % 100) !== 0;
  const precoPorFormatted = hasCents ? `${formatCurrencyBRL(data.price)} no pix` : formatCurrencyBRL(data.price);

  const discount =
    data.discountPercentage ||
    (data.originalPrice && data.originalPrice > data.price
      ? Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100)
      : 0);

  const parcelasStr = data.installments
    ? `${data.installments.quantity}x de ${formatCurrencyBRL(data.installments.amount)}`
    : 'Consulte parcelamento no link';

  const freteStr = data.freeShipping ? 'Frete Grátis Full 🚚⚡' : 'Consulte o frete';

  // Coupon line formatting (matching user's screenshots: ⚠️ Cupom: OFERTASEMPRE)
  const effectiveCoupon = (data.coupon && data.coupon.trim()) || 'OFERTASEMPRE';
  const cupomLine = `⚠️ Cupom: ${effectiveCoupon.toUpperCase()}`;

  const effectiveLink = (data.link && data.link.trim()) || 'https://meli.la/2QGwovg';

  content = content.replace(/{chamada}/g, data.headline || '');
  content = content.replace(/{titulo}/g, data.title || '');
  content = content.replace(/{preco_de}/g, precoDeFormatted);
  content = content.replace(/{preco_por}/g, precoPorFormatted);
  content = content.replace(/{desconto}/g, String(discount));
  content = content.replace(/{parcelas_linha}/g, data.installments ? `💳 ${parcelasStr}` : '');
  content = content.replace(/{parcelas}/g, parcelasStr);
  content = content.replace(/{frete_linha}/g, data.freeShipping ? `🚚 Frete Grátis` : '');
  content = content.replace(/{frete}/g, freteStr);
  content = content.replace(/{cupom}/g, cupomLine);
  content = content.replace(/{cupom_codigo}/g, data.coupon?.trim().toUpperCase() || '');
  content = content.replace(/{link}/g, effectiveLink);
  content = content.replace(/{canal}/g, data.channelName || '');
  content = content.replace(/{rodape}/g, data.customFooter || '');

  // Clean multiple blank lines
  return content.replace(/\n{3,}/g, '\n\n').trim();
}

export function formatMessage(
  deal: ProductDeal,
  templateContentOrTemplate: string | MessageTemplate,
  affiliateSettings?: AffiliateSettings
): string {
  const content = typeof templateContentOrTemplate === 'string' 
    ? templateContentOrTemplate 
    : templateContentOrTemplate.content;

  const dummyTemplate: MessageTemplate = {
    id: 'temp',
    name: 'temp',
    description: '',
    category: 'padrao',
    content,
  };

  const linkWithTag = buildAffiliateUrl(deal.permalink, affiliateSettings);

  return compileTemplate(dummyTemplate, {
    headline: deal.headline || 'OFERTA MERCADO LIVRE 🔥',
    title: deal.title,
    price: deal.price,
    originalPrice: deal.originalPrice,
    discountPercentage: deal.discountPercentage,
    coupon: deal.coupon,
    link: linkWithTag,
    freeShipping: deal.freeShipping,
    installments: deal.installments,
    channelName: affiliateSettings?.channelName || '',
    customFooter: affiliateSettings?.customFooter || '',
  });
}

// Convert WhatsApp Markdown format to styled React/HTML nodes
export function renderWhatsAppMarkdown(text: string): string {
  if (!text) return '';
  // Basic safe markdown parser for preview
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // *bold*
  formatted = formatted.replace(/\*([^\*\n]+)\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
  // ~strikethrough~
  formatted = formatted.replace(/~([^~\n]+)~/g, '<del class="line-through text-slate-400">$1</del>');
  // _italic_
  formatted = formatted.replace(/_([^_\n]+)_/g, '<em class="italic">$1</em>');
  // ```code```
  formatted = formatted.replace(/```([^`]+)```/g, '<code class="bg-slate-100 px-1 rounded font-mono text-xs text-emerald-800">$1</code>');
  // URLs to clickable links
  formatted = formatted.replace(
    /(https?:\/\/[^\s]+)/g,
    '<span class="text-blue-600 underline font-medium hover:text-blue-800 break-all">$1</span>'
  );

  return formatted.replace(/\n/g, '<br />');
}
