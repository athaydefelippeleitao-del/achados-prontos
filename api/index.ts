/**
 * api/index.ts — Vercel Serverless Function
 *
 * This file wraps the entire Express app as a single Vercel serverless function.
 * All /api/* requests are routed here via vercel.json rewrites.
 *
 * Dev server (server.ts) continues to work unchanged for local development.
 */

import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { POPULAR_CURATED_DEALS, INITIAL_USER_EXAMPLE_DEAL } from "../src/data/mockDeals";

dotenv.config();

const app = express();
app.use(express.json());

// ─── Gemini AI ───────────────────────────────────────────────────────────────

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { "User-Agent": "aistudio-build" } },
});

async function safeGenerateAI(prompt: string, options: { json?: boolean } = {}): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  const models = ["gemini-2.5-flash", "gemini-3.7-flash", "gemini-2.5-pro"];
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: options.json ? { responseMimeType: "application/json" } : undefined,
        });
        if (response && response.text) return response.text;
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
      }
    }
  }
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateFallbackCopy(title: string, price: number, originalPrice?: number | null, coupon?: string | null, category?: string) {
  const t = (title || "").toLowerCase();
  let emoji = "🔥⚡💥";
  let niche = "ACHADINHO";

  if (t.includes("chapeu") || t.includes("bota") || t.includes("pralana") || t.includes("agro") || t.includes("couro") || t.includes("country")) {
    emoji = "🤠🌾🐎"; niche = "MODA COUNTRY & AGRO";
  } else if (t.includes("air fryer") || t.includes("fritadeira") || t.includes("panela") || t.includes("cafeteira") || t.includes("cozinha")) {
    emoji = "🍳🔥👨‍🍳"; niche = "CASA & COZINHA";
  } else if (t.includes("celular") || t.includes("iphone") || t.includes("samsung") || t.includes("fone") || t.includes("jbl") || t.includes("xiaomi")) {
    emoji = "📱⚡🔊"; niche = "TECH & ELETRÔNICOS";
  } else if (t.includes("furadeira") || t.includes("parafusadeira") || t.includes("bosch") || t.includes("makita") || t.includes("ferramenta")) {
    emoji = "🛠️🔩⚡"; niche = "FERRAMENTAS";
  } else if (t.includes("perfume") || t.includes("malbec") || t.includes("boticario") || t.includes("natura") || t.includes("beleza")) {
    emoji = "💄✨🌸"; niche = "PERFUMARIA & BELEZA";
  }

  const shortTitle = title.split("-")[0].split(",")[0].trim().toUpperCase().slice(0, 38);
  const couponText = coupon ? `⚠️ use o cupom: ${coupon}` : "⚡ Estoque promocional limitado";

  return [
    { headline: `${shortTitle} COM PREÇO SURREAL ${emoji}`, emojiTheme: emoji, shortHook: "Achadinho exclusivo no menor valor histórico no Mercado Livre!", suggestedCupomCallout: couponText },
    { headline: `🔥 DESCONTO QUENTE: ${shortTitle}`, emojiTheme: "🔥⚡", shortHook: "Corre antes que acabe o lote com preço promocional!", suggestedCupomCallout: couponText },
    { headline: `🚨 MENOR PREÇO HISTÓRICO: ${shortTitle} 💥`, emojiTheme: "🚨💥", shortHook: "Excelente oportunidade com frete grátis e envio rápido!", suggestedCupomCallout: couponText },
    { headline: `${emoji} ESPECIAL ${niche}: ${shortTitle}`, emojiTheme: emoji, shortHook: "Ótima avaliação dos compradores e custo-benefício imbatível!", suggestedCupomCallout: couponText },
  ];
}

function upgradeMLImage(url?: string): string {
  if (!url) return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80";
  return url.replace(/-I\.(jpg|jpeg|png|webp)/i, "-O.$1").replace(/-V\.(jpg|jpeg|png|webp)/i, "-O.$1");
}

function extractMLBId(input: string): string | null {
  const clean = input.trim();
  const directMatch = clean.match(/MLB-?(\d{8,12})/i);
  if (directMatch) return `MLB${directMatch[1]}`;
  return null;
}

async function scrapeMercadoLivreHtml(searchQuery: string): Promise<any[]> {
  if (!searchQuery) return [];
  try {
    const slug = encodeURIComponent(searchQuery.trim().replace(/\s+/g, "-").toLowerCase());
    const targetUrl = `https://lista.mercadolivre.com.br/${slug}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
      },
    });
    clearTimeout(timeoutId);
    if (!response.ok) return [];
    const html = await response.text();
    const results: any[] = [];
    const cardRegex = /<(?:li|div)[^>]*class="[^"]*(?:ui-search-layout__item|poly-card)[^"]*"[^>]*>([\s\S]*?)<\/(?:li|div)>/gi;
    let cardMatch;
    while ((cardMatch = cardRegex.exec(html)) !== null && results.length < 16) {
      const cardHtml = cardMatch[1];
      const linkMatch = cardHtml.match(/href="([^"]*(?:produto\.mercadolivre\.com\.br|mercadolivre\.com\.br\/MLB|articulo\.mercadolibre\.com)[^"]*)"/i) || cardHtml.match(/href="(https:\/\/[^"]*mercadolivre\.com\.br\/[^"]*)"/i);
      const titleMatch = cardHtml.match(/<h2[^>]*class="[^"]*ui-search-item__title[^"]*"[^>]*>([^<]+)<\/h2>/i) || cardHtml.match(/<a[^>]*class="[^"]*poly-component__title[^"]*"[^>]*>([^<]+)<\/a>/i) || cardHtml.match(/aria-label="([^"]+)"/i);
      const fractionMatch = cardHtml.match(/<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\d\.]+)<\/span>/i);
      const centsMatch = cardHtml.match(/<span[^>]*class="[^"]*andes-money-amount__cents[^"]*"[^>]*>(\d+)<\/span>/i);
      const prevPriceMatch = cardHtml.match(/<s[^>]*class="[^"]*andes-money-amount--previous[^"]*"[\s\S]*?<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\d\.]+)<\/span>/i);
      const imgMatch = cardHtml.match(/data-src="([^"]+)"/i) || cardHtml.match(/src="([^"]+http2\.mlstatic\.com[^"]+)"/i);
      const isFreeShipping = cardHtml.includes("Frete grátis") || cardHtml.includes("Envio grátis");
      if (linkMatch && (titleMatch || fractionMatch)) {
        const rawLink = linkMatch[1].split("?")[0];
        const cleanTitle = (titleMatch ? titleMatch[1] : searchQuery).replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();
        let price = 99.9;
        if (fractionMatch) {
          const rawNum = fractionMatch[1].replace(/\./g, "");
          const cents = centsMatch ? centsMatch[1] : "00";
          price = parseFloat(`${rawNum}.${cents}`);
        }
        let originalPrice: number | null = null;
        if (prevPriceMatch) originalPrice = parseFloat(prevPriceMatch[1].replace(/\./g, ""));
        let discountPercentage = 0;
        if (originalPrice && originalPrice > price) discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
        const rawImg = imgMatch ? imgMatch[1] : "";
        const image = rawImg.startsWith("http") ? upgradeMLImage(rawImg) : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80";
        results.push({ id: extractMLBId(rawLink) || `MLB_SCRAPED_${Date.now()}_${results.length}`, title: cleanTitle, headline: `🔥 OFERTA REAL: ${cleanTitle.toUpperCase().slice(0, 38)}`, price, originalPrice, discountPercentage, currency_id: "BRL", permalink: rawLink, thumbnail: image, fullImage: image, freeShipping: isFreeShipping, sellerName: "Mercado Livre", ratings: 4.8, reviewsCount: 280, categoryName: searchQuery });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function searchRealMLWithGrounding(searchQuery: string): Promise<any[]> {
  if (!process.env.GEMINI_API_KEY || !searchQuery) return [];
  try {
    const prompt = `Faça uma pesquisa no Google por 6 anúncios REAIS e ATIVOS atualmente à venda no site do Mercado Livre Brasil (mercadolivre.com.br) para a busca: "${searchQuery}". Retorne APENAS um array JSON de objetos com: "title", "price", "originalPrice", "discountPercentage", "permalink", "thumbnail", "freeShipping", "sellerName".`;
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" } });
    if (response && response.text) {
      const data = JSON.parse(response.text);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item, idx) => {
          const title = item.title || searchQuery;
          const slug = encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 45));
          const validLink = item.permalink && item.permalink.includes("mercadolivre.com.br") ? item.permalink : `https://lista.mercadolivre.com.br/${slug}`;
          const price = Number(item.price) || 129.90;
          const origPrice = item.originalPrice ? Number(item.originalPrice) : null;
          let disc = item.discountPercentage || 0;
          if (origPrice && origPrice > price && !disc) disc = Math.round(((origPrice - price) / origPrice) * 100);
          const img = item.thumbnail || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80";
          return { id: `MLB_REAL_${Date.now()}_${idx}`, title, headline: `🔥 OFERTA REAL: ${title.toUpperCase().slice(0, 38)}`, price, originalPrice: origPrice, discountPercentage: disc, currency_id: "BRL", permalink: validLink, thumbnail: img, fullImage: upgradeMLImage(img), freeShipping: item.freeShipping ?? true, sellerName: item.sellerName || "Mercado Livre", ratings: 4.8, reviewsCount: 320, categoryName: searchQuery };
        });
      }
    }
  } catch { /* fallback */ }
  return [];
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// 1. Health
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "AchadosPronto", time: new Date().toISOString() });
});

// 2. Search ML offers
app.get("/api/ml/search", async (req, res) => {
  const { q, category, sort, limit = "24", offset = "0" } = req.query;
  const searchQuery = ((q as string) || "").trim();
  if (searchQuery) {
    const liveScraped = await scrapeMercadoLivreHtml(searchQuery);
    if (liveScraped.length > 0) return res.json({ results: liveScraped, paging: { total: liveScraped.length, offset: 0, limit: 24 }, query: searchQuery, source: "mercadolivre_live_html" });
    const groundedDeals = await searchRealMLWithGrounding(searchQuery);
    if (groundedDeals.length > 0) return res.json({ results: groundedDeals, paging: { total: groundedDeals.length, offset: 0, limit: 24 }, query: searchQuery, source: "google_search_grounding" });
  }
  try {
    const params = new URLSearchParams({ q: searchQuery || "ofertas relampago", limit: String(limit), offset: String(offset), site_id: "MLB" });
    if (category) params.append("category", String(category));
    if (sort) params.append("sort", String(sort));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(`https://api.mercadolibre.com/sites/MLB/search?${params}`, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const results = data.results.map((item: any) => {
          const price = Number(item.price) || 0;
          const originalPrice = item.original_price ? Number(item.original_price) : null;
          let discountPercentage = 0;
          if (originalPrice && originalPrice > price) discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
          return { id: item.id, title: item.title, headline: `🔥 OFERTA REAL: ${item.title.toUpperCase().slice(0, 38)}`, price, originalPrice, discountPercentage, currency_id: item.currency_id || "BRL", permalink: item.permalink, thumbnail: item.thumbnail, fullImage: upgradeMLImage(item.thumbnail), installments: item.installments ? { quantity: item.installments.quantity, amount: item.installments.amount, rate: item.installments.rate } : null, freeShipping: item.shipping?.free_shipping || false, condition: item.condition, sellerName: item.seller?.nickname || "Mercado Livre", ratings: 4.8, reviewsCount: 140 };
        });
        return res.json({ results, paging: data.paging || { total: results.length, offset: 0, limit: 24 }, query: searchQuery, source: "mercadolivre_api" });
      }
    }
  } catch { /* fallback */ }
  const searchTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
  let matchedDeals = searchTerms.length > 0 ? POPULAR_CURATED_DEALS.filter((d) => { const t = d.title.toLowerCase(); return searchTerms.some((s) => t.includes(s)); }) : POPULAR_CURATED_DEALS;
  if (matchedDeals.length === 0 && searchQuery && process.env.GEMINI_API_KEY) {
    try {
      const slug = encodeURIComponent(searchQuery.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 45));
      const aiText = await safeGenerateAI(`Gere 6 ofertas de produtos com desconto para "${searchQuery}" no Mercado Livre Brasil. Retorne array JSON com: id, title, headline, price, originalPrice, discountPercentage, currency_id, permalink, thumbnail, fullImage, freeShipping, coupon, sellerName, ratings, reviewsCount, categoryName, installments(quantity,amount). Use permalink: "https://lista.mercadolivre.com.br/${slug}"`, { json: true });
      if (aiText) {
        const generated = JSON.parse(aiText);
        if (Array.isArray(generated) && generated.length > 0) return res.json({ results: generated, paging: { total: generated.length, offset: 0, limit: 24 }, query: searchQuery, source: "gemini_smart_catalog" });
      }
    } catch { /* fallback */ }
  }
  const results = matchedDeals.length > 0 ? matchedDeals : POPULAR_CURATED_DEALS;
  return res.json({ results, paging: { total: results.length, offset: 0, limit: 24 }, query: searchQuery, source: "curated_catalog" });
});

// 3. Get item by ID
app.get("/api/ml/item/:id", async (req, res) => {
  try {
    const cleanId = extractMLBId(req.params.id) || req.params.id;
    const curated = POPULAR_CURATED_DEALS.find((d) => d.id === cleanId || d.id === req.params.id);
    if (curated) return res.json(curated);
    const [itemRes, descRes] = await Promise.all([
      fetch(`https://api.mercadolibre.com/items/${cleanId}`, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } }),
      fetch(`https://api.mercadolibre.com/items/${cleanId}/description`, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } }).catch(() => null),
    ]);
    if (itemRes.ok) {
      const item = await itemRes.json();
      let description = "";
      if (descRes && descRes.ok) { const d = await descRes.json(); description = d.plain_text || d.text || ""; }
      const pictures = (item.pictures || []).map((p: any) => p.secure_url || p.url);
      const price = Number(item.price) || 0;
      const originalPrice = item.original_price ? Number(item.original_price) : null;
      let discountPercentage = 0;
      if (originalPrice && originalPrice > price) discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
      return res.json({ id: item.id, title: item.title, price, originalPrice, discountPercentage, currency_id: item.currency_id || "BRL", permalink: item.permalink, thumbnail: item.thumbnail, fullImage: upgradeMLImage(pictures[0] || item.thumbnail), pictures: pictures.map(upgradeMLImage), freeShipping: item.shipping?.free_shipping || false, installments: item.installments ? { quantity: item.installments.quantity, amount: item.installments.amount, rate: item.installments.rate } : null, condition: item.condition, description: description.slice(0, 500) });
    }
  } catch (err) { console.warn("Item fetch error:", err); }
  return res.json(INITIAL_USER_EXAMPLE_DEAL);
});

// 4. Parse ML link or raw text
app.post("/api/ml/parse", async (req, res) => {
  try {
    const { url, rawText } = req.body;
    const targetString = (url || rawText || "").trim();
    if (!targetString) return res.status(400).json({ error: "Nenhum link ou texto fornecido." });
    let mlbId = extractMLBId(targetString);
    let scrapedTitle = "", scrapedImage = "";
    let scrapedPrice: number | null = null;
    let finalUrl = targetString;
    const isUrl = targetString.startsWith("http://") || targetString.startsWith("https://") || targetString.includes("mercadolivre.com") || targetString.includes("meli.la");
    if (!isUrl && !mlbId) {
      const liveAds = await scrapeMercadoLivreHtml(targetString);
      if (liveAds.length > 0) return res.json(liveAds[0]);
      const grounded = await searchRealMLWithGrounding(targetString);
      if (grounded.length > 0) return res.json(grounded[0]);
      const lowerQuery = targetString.toLowerCase();
      const words = lowerQuery.split(/\s+/).filter(Boolean);
      const matched = POPULAR_CURATED_DEALS.find((d) => { const t = d.title.toLowerCase(); return words.every((w) => t.includes(w)) || words.some((w) => t.includes(w)); });
      if (matched) return res.json(matched);
      if (process.env.GEMINI_API_KEY) {
        try {
          const encodedTerm = encodeURIComponent(targetString.replace(/\s+/g, "-").toLowerCase());
          const realSearchUrl = `https://lista.mercadolivre.com.br/${encodedTerm}`;
          const aiText = await safeGenerateAI(`Gere uma oferta promocional para "${targetString}" no Mercado Livre Brasil. Retorne JSON com: id, title, price, originalPrice, discountPercentage, coupon, headline, permalink("${realSearchUrl}"), thumbnail, fullImage, freeShipping, sellerName.`, { json: true });
          if (aiText) {
            const dealData = JSON.parse(aiText);
            if (dealData && dealData.title) {
              const productSlug = encodeURIComponent(dealData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40));
              return res.json({ id: dealData.id || "MLB-" + Date.now(), title: dealData.title, price: Number(dealData.price) || 199.90, originalPrice: dealData.originalPrice ? Number(dealData.originalPrice) : null, discountPercentage: dealData.discountPercentage || 25, currency_id: "BRL", permalink: `https://lista.mercadolivre.com.br/${productSlug}`, thumbnail: dealData.thumbnail || INITIAL_USER_EXAMPLE_DEAL.fullImage, fullImage: dealData.fullImage || dealData.thumbnail || INITIAL_USER_EXAMPLE_DEAL.fullImage, freeShipping: dealData.freeShipping ?? true, coupon: dealData.coupon || undefined, headline: dealData.headline || `SUPER OFERTA: ${dealData.title.toUpperCase()} 🔥` });
            }
          }
        } catch { /* fallback */ }
      }
    }
    if (isUrl) {
      try {
        const resolved = await fetch(targetString, { method: "GET", redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", Accept: "text/html,*/*" } });
        finalUrl = resolved.url;
        if (!mlbId) mlbId = extractMLBId(finalUrl);
        const html = await resolved.text();
        const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) || html.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) scrapedTitle = titleMatch[1].replace(/\|\s*Mercado\s*Livre.*/i, "").trim();
        const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
        if (imageMatch && imageMatch[1]) scrapedImage = upgradeMLImage(imageMatch[1]);
        const priceMatch = html.match(/"price":\s*"?([\d\.]+)"?/i);
        if (priceMatch && priceMatch[1]) scrapedPrice = parseFloat(priceMatch[1]);
      } catch { /* ignore */ }
    }
    if (mlbId) {
      try {
        const itemRes = await fetch(`https://api.mercadolibre.com/items/${mlbId}`, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
        if (itemRes.ok) {
          const item = await itemRes.json();
          const price = Number(item.price) || scrapedPrice || 0;
          const originalPrice = item.original_price ? Number(item.original_price) : null;
          let discountPercentage = 0;
          if (originalPrice && originalPrice > price) discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
          const pictures = (item.pictures || []).map((p: any) => p.secure_url || p.url);
          const fullImage = upgradeMLImage(pictures[0] || item.thumbnail || scrapedImage);
          return res.json({ id: item.id, title: item.title || scrapedTitle || "Produto Mercado Livre", price, originalPrice, discountPercentage, currency_id: item.currency_id || "BRL", permalink: item.permalink || finalUrl, thumbnail: item.thumbnail || fullImage, fullImage, freeShipping: item.shipping?.free_shipping ?? true, installments: item.installments ? { quantity: item.installments.quantity, amount: item.installments.amount, rate: item.installments.rate } : null, sellerName: "Mercado Livre" });
        }
      } catch { /* fallback */ }
    }
    if (process.env.GEMINI_API_KEY) {
      const aiText = await safeGenerateAI(`Analise o texto/link/metadados abaixo de um produto do Mercado Livre e extraia JSON com: title, price, originalPrice, coupon, link, headline, freeShipping, imageUrl.\nEntrada: "${targetString}"\nTítulo: "${scrapedTitle}"\nImagem: "${scrapedImage}"\nPreço: "${scrapedPrice || ""}"`, { json: true });
      if (aiText) {
        try {
          const parsed = JSON.parse(aiText);
          const defaultImg = scrapedImage || parsed.imageUrl || INITIAL_USER_EXAMPLE_DEAL.fullImage;
          const price = Number(parsed.price) || scrapedPrice || 199.90;
          const origPrice = parsed.originalPrice ? Number(parsed.originalPrice) : null;
          let discount = 0;
          if (origPrice && origPrice > price) discount = Math.round(((origPrice - price) / origPrice) * 100);
          return res.json({ id: mlbId || "PARSED_" + Date.now(), title: parsed.title || scrapedTitle || "Produto Mercado Livre", price, originalPrice: origPrice, discountPercentage: discount, currency_id: "BRL", permalink: parsed.link || finalUrl || targetString, thumbnail: defaultImg, fullImage: defaultImg, freeShipping: parsed.freeShipping ?? true, coupon: parsed.coupon || undefined, headline: parsed.headline || undefined });
        } catch { /* fallback */ }
      }
    }
    if (scrapedTitle) return res.json({ id: mlbId || "PARSED_" + Date.now(), title: scrapedTitle, price: scrapedPrice || 199.90, originalPrice: null, discountPercentage: 0, currency_id: "BRL", permalink: finalUrl, thumbnail: scrapedImage || INITIAL_USER_EXAMPLE_DEAL.fullImage, fullImage: scrapedImage || INITIAL_USER_EXAMPLE_DEAL.fullImage, freeShipping: true });
    return res.status(400).json({ error: "Não foi possível identificar o produto pelo link/texto." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao analisar link do Mercado Livre." });
  }
});

// 5. Generate AI Copy
app.post("/api/ai/generate-copy", async (req, res) => {
  try {
    const { title, price, originalPrice, coupon, category, customTheme } = req.body;
    const fallbackSuggestions = generateFallbackCopy(title || "Produto", price || 99.9, originalPrice, coupon, category || customTheme);
    if (!process.env.GEMINI_API_KEY) return res.json({ suggestions: fallbackSuggestions, source: "algorithmic_fallback" });
    const prompt = `Você é um copywriter especialista em grupos de promoções e achadinhos do WhatsApp e Telegram no Brasil.
Gere 4 opções de chamadas (headlines) irresistíveis com emojis temáticos para:
- Produto: ${title}
- Preço Atual: R$ ${price}
- Preço Original: ${originalPrice ? `R$ ${originalPrice}` : "Não informado"}
- Cupom: ${coupon || "Nenhum"}
- Categoria: ${category || customTheme || "Geral"}
Retorne APENAS um array JSON de 4 sugestões com: headline, emojiTheme, shortHook, suggestedCupomCallout.`;
    const aiText = await safeGenerateAI(prompt, { json: true });
    if (aiText) {
      try {
        const suggestions = JSON.parse(aiText);
        if (Array.isArray(suggestions) && suggestions.length > 0) return res.json({ suggestions, source: "gemini" });
      } catch { /* fallback */ }
    }
    return res.json({ suggestions: fallbackSuggestions, source: "smart_fallback" });
  } catch (error: any) {
    const { title, price, originalPrice, coupon, category, customTheme } = req.body;
    res.json({ suggestions: generateFallbackCopy(title || "Produto", price || 99.9, originalPrice, coupon, category || customTheme), source: "emergency_fallback" });
  }
});

// 6. WhatsApp Webhook
app.post("/api/whatsapp/send-webhook", async (req, res) => {
  try {
    const { webhookUrl, secretKey, message, imageUrl, title, link, targetPhone } = req.body;
    if (!webhookUrl || typeof webhookUrl !== "string") return res.status(400).json({ error: "URL do Webhook é obrigatória." });
    const payload = { event: "SEND_OFFER", title: title || "Oferta Mercado Livre", message: message || "", imageUrl: imageUrl || "", link: link || "", phone: targetPhone || "", timestamp: new Date().toISOString() };
    const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "AchadosPronto-WhatsApp-Dispatcher/1.0" };
    if (secretKey) { headers["Authorization"] = secretKey.startsWith("Bearer ") ? secretKey : `Bearer ${secretKey}`; headers["apikey"] = secretKey; }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(webhookUrl, { method: "POST", headers, body: JSON.stringify(payload), signal: controller.signal });
    clearTimeout(timeoutId);
    const responseText = await response.text();
    let responseData = {};
    try { responseData = JSON.parse(responseText); } catch { responseData = { raw: responseText }; }
    if (!response.ok) return res.status(response.status).json({ error: `Webhook retornou status HTTP ${response.status}`, details: responseData });
    return res.json({ success: true, status: response.status, data: responseData });
  } catch (err: any) {
    return res.status(500).json({ error: err.name === "AbortError" ? "Tempo limite excedido (Timeout 10s)." : err.message || "Erro ao disparar webhook." });
  }
});

// 7. Autopilot Scan
app.get("/api/autopilot/scan", async (req, res) => {
  try {
    const category = (req.query.category as string) || "all";
    const minDiscount = Number(req.query.minDiscount) || 0;
    const onlyFreeShipping = req.query.onlyFreeShipping === "true";
    const onlyWithCoupon = req.query.onlyWithCoupon === "true";
    const CATEGORY_SEARCH_MAP: Record<string, string> = { all: "ofertas relampago mercado livre", tech: "smartphone celular fone bluetooth jbl", agro: "chapeu pralana bota texana goyazes couro", casa: "air fryer walita cafeteira robo aspirador", ferramentas: "parafusadeira furadeira bosch", beleza: "perfume malbec boticario importado", cupons: "ofertas com desconto frete gratis" };
    const searchQuery = CATEGORY_SEARCH_MAP[category] || category || "ofertas relampago";
    let liveCandidates: any[] = [];
    try { const scraped = await scrapeMercadoLivreHtml(searchQuery); if (scraped.length > 0) liveCandidates = scraped; } catch { /* fallback */ }
    if (liveCandidates.length === 0) { try { const grounded = await searchRealMLWithGrounding(searchQuery); if (grounded.length > 0) liveCandidates = grounded; } catch { /* fallback */ } }
    if (liveCandidates.length === 0) { liveCandidates = POPULAR_CURATED_DEALS.filter((d) => category === "all" || (d.categoryName || "").toLowerCase().includes(category.toLowerCase()) || d.title.toLowerCase().includes(category.toLowerCase())); if (liveCandidates.length === 0) liveCandidates = POPULAR_CURATED_DEALS; }
    let filtered = liveCandidates.filter((d) => { if (minDiscount > 0 && (d.discountPercentage || 0) < minDiscount) return false; if (onlyFreeShipping && !d.freeShipping) return false; if (onlyWithCoupon && !d.coupon) return false; return true; });
    if (filtered.length === 0) filtered = liveCandidates;
    const selectedDeal = filtered[Math.floor(Math.random() * filtered.length)];
    return res.json({ deal: selectedDeal, totalCandidates: filtered.length, source: selectedDeal.id.startsWith("MLB_SCRAPED") ? "mercadolivre_live" : "curated_deals", timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro no scanner do piloto automático." });
  }
});

// 8. Image Proxy (CORS bypass for Canvas card generation)
app.get("/api/ml/proxy-image", async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) return res.status(400).send("Missing url parameter");
    if (imageUrl.startsWith("data:image/")) {
      const parts = imageUrl.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
      const buffer = Buffer.from(parts[1] || "", "base64");
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(buffer);
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const imageRes = await fetch(imageUrl, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8", Referer: "https://www.mercadolivre.com.br/" } });
      clearTimeout(timeoutId);
      if (imageRes.ok) {
        const contentType = imageRes.headers.get("content-type") || "image/jpeg";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.send(Buffer.from(await imageRes.arrayBuffer()));
      }
    } catch { /* fallback */ }
    const fallbackRes = await fetch("https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80");
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(Buffer.from(await fallbackRes.arrayBuffer()));
  } catch (error: any) {
    res.status(500).send("Image proxy error");
  }
});

// ─── Export for Vercel ────────────────────────────────────────────────────────
export default app;
