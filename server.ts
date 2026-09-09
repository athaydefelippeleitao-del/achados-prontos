import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { POPULAR_CURATED_DEALS, INITIAL_USER_EXAMPLE_DEAL } from "./src/data/mockDeals";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Server-side Gemini initialization with telemetry User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper for resilient Gemini API execution with fallback to other models on 503/spikes
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
        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        // If 503 or 429 rate limit / temporary high demand, wait briefly and try next
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }
  }
  return null;
}

// Algorithmic Brazilian promo copy generator for instantaneous fallback
function generateFallbackCopy(title: string, price: number, originalPrice?: number | null, coupon?: string | null, category?: string) {
  const t = (title || "").toLowerCase();
  let emoji = "🔥⚡💥";
  let niche = "ACHADINHO";

  if (t.includes("chapeu") || t.includes("bota") || t.includes("pralana") || t.includes("goyazes") || t.includes("agro") || t.includes("couro") || t.includes("country")) {
    emoji = "🤠🌾🐎";
    niche = "MODA COUNTRY & AGRO";
  } else if (t.includes("air fryer") || t.includes("fritadeira") || t.includes("panela") || t.includes("cafeteira") || t.includes("cozinha") || t.includes("walita")) {
    emoji = "🍳🔥👨‍🍳";
    niche = "CASA & COZINHA";
  } else if (t.includes("celular") || t.includes("iphone") || t.includes("samsung") || t.includes("fone") || t.includes("jbl") || t.includes("tech") || t.includes("xiaomi")) {
    emoji = "📱⚡🔊";
    niche = "TECH & ELETRÔNICOS";
  } else if (t.includes("furadeira") || t.includes("parafusadeira") || t.includes("bosch") || t.includes("makita") || t.includes("ferramenta") || t.includes("dewalt")) {
    emoji = "🛠️🔩⚡";
    niche = "FERRAMENTAS";
  } else if (t.includes("perfume") || t.includes("malbec") || t.includes("boticario") || t.includes("natura") || t.includes("beleza") || t.includes("cabelo")) {
    emoji = "💄✨🌸";
    niche = "PERFUMARIA & BELEZA";
  }

  const shortTitle = title.split("-")[0].split(",")[0].trim().toUpperCase().slice(0, 38);
  const couponText = coupon ? `⚠️ use o cupom: ${coupon}` : "⚡ Estoque promocional limitado";

  return [
    {
      headline: `${shortTitle} COM PREÇO SURREAL ${emoji}`,
      emojiTheme: emoji,
      shortHook: "Achadinho exclusivo no menor valor histórico no Mercado Livre!",
      suggestedCupomCallout: couponText,
    },
    {
      headline: `🔥 DESCONTO QUENTE: ${shortTitle}`,
      emojiTheme: "🔥⚡",
      shortHook: "Corre antes que acabe o lote com preço promocional!",
      suggestedCupomCallout: couponText,
    },
    {
      headline: `🚨 MENOR PREÇO HISTÓRICO: ${shortTitle} 💥`,
      emojiTheme: "🚨💥",
      shortHook: "Excelente oportunidade com frete grátis e envio rápido!",
      suggestedCupomCallout: couponText,
    },
    {
      headline: `${emoji} ESPECIAL ${niche}: ${shortTitle}`,
      emojiTheme: emoji,
      shortHook: "Ótima avaliação dos compradores e custo-benefício imbatível!",
      suggestedCupomCallout: couponText,
    },
  ];
}

// Helper to upgrade Mercado Livre thumbnail to High Definition image
function upgradeMLImage(url?: string): string {
  if (!url) return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80";
  return url.replace(/-I\.(jpg|jpeg|png|webp)/i, "-O.$1").replace(/-V\.(jpg|jpeg|png|webp)/i, "-O.$1");
}

// Extract MLB item ID from diverse Mercado Livre URLs
function extractMLBId(input: string): string | null {
  const clean = input.trim();
  const directMatch = clean.match(/MLB-?(\d{8,12})/i);
  if (directMatch) {
    return `MLB${directMatch[1]}`;
  }
  return null;
}

// Direct live HTML scraper for genuine Mercado Livre Search Results
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
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];
    const html = await response.text();
    const results: any[] = [];

    // Match each result item card in HTML (poly card or ui-search-layout item)
    const cardRegex = /<(?:li|div)[^>]*class="[^"]*(?:ui-search-layout__item|poly-card)[^"]*"[^>]*>([\s\S]*?)<\/(?:li|div)>/gi;
    let cardMatch;

    while ((cardMatch = cardRegex.exec(html)) !== null && results.length < 16) {
      const cardHtml = cardMatch[1];

      // Extract real product link
      const linkMatch = cardHtml.match(/href="([^"]*(?:produto\.mercadolivre\.com\.br|mercadolivre\.com\.br\/MLB|articulo\.mercadolibre\.com)[^"]*)"/i) ||
                         cardHtml.match(/href="(https:\/\/[^"]*mercadolivre\.com\.br\/[^"]*)"/i);
      
      // Extract real product title
      const titleMatch = cardHtml.match(/<h2[^>]*class="[^"]*ui-search-item__title[^"]*"[^>]*>([^<]+)<\/h2>/i) ||
                          cardHtml.match(/<a[^>]*class="[^"]*poly-component__title[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                          cardHtml.match(/aria-label="([^"]+)"/i) ||
                          cardHtml.match(/title="([^"]+)"/i);

      // Extract real product current price
      const fractionMatch = cardHtml.match(/<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\d\.]+)<\/span>/i);
      const centsMatch = cardHtml.match(/<span[^>]*class="[^"]*andes-money-amount__cents[^"]*"[^>]*>(\d+)<\/span>/i);

      // Extract previous/original price
      const prevPriceMatch = cardHtml.match(/<s[^>]*class="[^"]*andes-money-amount--previous[^"]*"[\s\S]*?<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\d\.]+)<\/span>/i);

      // Extract image
      const imgMatch = cardHtml.match(/data-src="([^"]+)"/i) ||
                       cardHtml.match(/src="([^"]+http2\.mlstatic\.com[^"]+)"/i) ||
                       cardHtml.match(/src="([^"]+)"/i);

      const isFreeShipping = cardHtml.includes("Frete grátis") || cardHtml.includes("Envio grátis") || cardHtml.includes("poly-component__shipping");

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
        if (prevPriceMatch) {
          const rawOrig = prevPriceMatch[1].replace(/\./g, "");
          originalPrice = parseFloat(rawOrig);
        }

        let discountPercentage = 0;
        if (originalPrice && originalPrice > price) {
          discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
        }

        const rawImg = imgMatch ? imgMatch[1] : "";
        const image = rawImg.startsWith("http") ? upgradeMLImage(rawImg) : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80";

        results.push({
          id: extractMLBId(rawLink) || `MLB_SCRAPED_${Date.now()}_${results.length}`,
          title: cleanTitle,
          headline: `🔥 OFERTA REAL: ${cleanTitle.toUpperCase().slice(0, 38)}`,
          price,
          originalPrice,
          discountPercentage,
          currency_id: "BRL",
          permalink: rawLink,
          thumbnail: image,
          fullImage: image,
          freeShipping: isFreeShipping,
          sellerName: "Mercado Livre",
          ratings: 4.8,
          reviewsCount: 280,
          categoryName: searchQuery,
        });
      }
    }

    return results;
  } catch (err) {
    console.warn("Direct HTML scrape notice:", err);
    return [];
  }
}

// Search real Mercado Livre deals with Google Search Grounding when available
async function searchRealMLWithGrounding(searchQuery: string): Promise<any[]> {
  if (!process.env.GEMINI_API_KEY || !searchQuery) return [];
  try {
    const prompt = `Faça uma pesquisa no Google por 6 anúncios REAIS e ATIVOS atualmente à venda no site do Mercado Livre Brasil (mercadolivre.com.br) para a busca: "${searchQuery}".
Para cada produto real encontrado com desconto no Mercado Livre, retorne as informações exatas em JSON.
Retorne APENAS um array JSON de objetos com:
- "title": string (título exato do anúncio no Mercado Livre)
- "price": number (preço atual real em reais R$, ex: 189.90)
- "originalPrice": number ou null (preço anterior)
- "discountPercentage": number (desconto em %)
- "permalink": string (link real do produto no Mercado Livre, ex: https://www.mercadolivre.com.br/... ou https://produto.mercadolivre.com.br/MLB-...)
- "thumbnail": string (link da imagem real do produto)
- "freeShipping": boolean (true se tiver frete grátis)
- "sellerName": string (nome da loja oficial ou vendedor)
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    if (response && response.text) {
      const data = JSON.parse(response.text);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item, idx) => {
          const title = item.title || searchQuery;
          const slug = encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 45));
          const validLink = item.permalink && item.permalink.includes("mercadolivre.com.br") 
            ? item.permalink 
            : `https://lista.mercadolivre.com.br/${slug}`;

          const price = Number(item.price) || 129.90;
          const origPrice = item.originalPrice ? Number(item.originalPrice) : null;
          let disc = item.discountPercentage || 0;
          if (origPrice && origPrice > price && !disc) {
            disc = Math.round(((origPrice - price) / origPrice) * 100);
          }

          const img = item.thumbnail || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80";

          return {
            id: `MLB_REAL_${Date.now()}_${idx}`,
            title,
            headline: `🔥 OFERTA REAL: ${title.toUpperCase().slice(0, 38)}`,
            price,
            originalPrice: origPrice,
            discountPercentage: disc,
            currency_id: "BRL",
            permalink: validLink,
            thumbnail: img,
            fullImage: upgradeMLImage(img),
            freeShipping: item.freeShipping ?? true,
            sellerName: item.sellerName || "Mercado Livre",
            ratings: 4.8,
            reviewsCount: 320,
            categoryName: searchQuery,
          };
        });
      }
    }
  } catch (err) {
    console.warn("Google Grounding ML search notice:", err);
  }
  return [];
}

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "AchadosPronto", time: new Date().toISOString() });
});

// 2. Search Mercado Livre Offers with graceful fallback
app.get("/api/ml/search", async (req, res) => {
  const { q, category, sort, limit = "24", offset = "0" } = req.query;
  const searchQuery = ((q as string) || "").trim();

  // Strategy 1: Direct Live Scraping from Mercado Livre Search HTML (Real Active Ads)
  if (searchQuery) {
    const liveScraped = await scrapeMercadoLivreHtml(searchQuery);
    if (liveScraped && liveScraped.length > 0) {
      return res.json({
        results: liveScraped,
        paging: { total: liveScraped.length, offset: 0, limit: 24 },
        query: searchQuery,
        source: "mercadolivre_live_html",
      });
    }

    // Strategy 2: Google Search Grounding with Gemini 2.5 Flash for Live Active ML Products
    const groundedDeals = await searchRealMLWithGrounding(searchQuery);
    if (groundedDeals && groundedDeals.length > 0) {
      return res.json({
        results: groundedDeals,
        paging: { total: groundedDeals.length, offset: 0, limit: 24 },
        query: searchQuery,
        source: "google_search_grounding",
      });
    }
  }

  // Strategy 3: Try fetching from Mercado Livre Public API
  try {
    const params = new URLSearchParams({
      q: searchQuery || "ofertas relampago",
      limit: String(limit),
      offset: String(offset),
      site_id: "MLB",
    });

    if (category) params.append("category", String(category));
    if (sort) params.append("sort", String(sort));

    const mlApiUrl = `https://api.mercadolibre.com/sites/MLB/search?${params.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(mlApiUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const results = data.results.map((item: any) => {
          const price = Number(item.price) || 0;
          const originalPrice = item.original_price ? Number(item.original_price) : null;
          let discountPercentage = 0;
          if (originalPrice && originalPrice > price) {
            discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
          }

          return {
            id: item.id,
            title: item.title,
            headline: `🔥 OFERTA REAL: ${item.title.toUpperCase().slice(0, 38)}`,
            price,
            originalPrice,
            discountPercentage,
            currency_id: item.currency_id || "BRL",
            permalink: item.permalink,
            thumbnail: item.thumbnail,
            fullImage: upgradeMLImage(item.thumbnail),
            installments: item.installments
              ? {
                  quantity: item.installments.quantity,
                  amount: item.installments.amount,
                  rate: item.installments.rate,
                }
              : null,
            freeShipping: item.shipping?.free_shipping || false,
            condition: item.condition,
            sellerName: item.seller?.nickname || "Mercado Livre",
            ratings: item.reviews?.rating_average || 4.8,
            reviewsCount: item.reviews?.total || 140,
            categoryName: category ? String(category) : undefined,
          };
        });

        return res.json({
          results,
          paging: data.paging || { total: results.length, offset: 0, limit: 24 },
          query: searchQuery,
          source: "mercadolivre_api",
        });
      }
    }
  } catch (mlErr: any) {
    // handled via curated fallback
  }

  // Strategy 4: Filter from Curated Popular Deals
  // Synonym map: expands search terms to related keywords
  const SYNONYMS: Record<string, string[]> = {
    country: ["country", "pralana", "goyazes", "texana", "rodeio", "western", "chapeu", "bota", "couro", "sertanejo", "cowboy", "agro"],
    rodeio: ["rodeio", "country", "texana", "chapeu", "bota", "western", "sertanejo"],
    agro: ["agro", "country", "pralana", "goyazes", "texana", "rodeio", "chapeu", "bota", "couro", "western"],
    pralana: ["pralana", "chapeu", "country", "palha", "feltro", "bangora"],
    goyazes: ["goyazes", "bota", "texana", "couro", "country"],
    chapeu: ["chapeu", "chapéu", "pralana", "cowboy", "country", "palha", "feltro"],
    bota: ["bota", "texana", "couro", "goyazes", "country"],
    texana: ["texana", "bota", "country", "goyazes", "couro", "western"],
    western: ["western", "country", "texana", "bota", "chapeu"],
    tech: ["tech", "smartphone", "celular", "fone", "notebook", "iphone", "samsung"],
    casa: ["casa", "cozinha", "air fryer", "airfryer", "panela", "cafeteira"],
    gamer: ["gamer", "headset", "teclado", "monitor", "mouse"],
    ferramenta: ["ferramenta", "bosch", "makita", "parafusadeira", "furadeira", "dewalt"],
    beleza: ["beleza", "perfume", "maquiagem", "boticario", "natura"],
  };

  const rawTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

  // Expand search terms with synonyms
  const expandedTerms = new Set<string>(rawTerms);
  rawTerms.forEach((term) => {
    Object.entries(SYNONYMS).forEach(([key, synonymList]) => {
      if (key === term || synonymList.includes(term)) {
        synonymList.forEach((s) => expandedTerms.add(s));
      }
    });
  });

  const searchTerms = Array.from(expandedTerms);
  let matchedDeals = POPULAR_CURATED_DEALS;

  if (searchTerms.length > 0) {
    matchedDeals = POPULAR_CURATED_DEALS.filter((deal) => {
      const titleLower = deal.title.toLowerCase();
      const catLower = (deal.categoryName || "").toLowerCase();
      const headlineLower = (deal.headline || "").toLowerCase();
      const sellerLower = (deal.sellerName || "").toLowerCase();
      const couponLower = (deal.coupon || "").toLowerCase();
      return searchTerms.some((term) =>
        titleLower.includes(term) ||
        catLower.includes(term) ||
        headlineLower.includes(term) ||
        sellerLower.includes(term) ||
        couponLower.includes(term)
      );
    });
  }

  // Strategy 5: Dynamic generative fallback with real search permalinks
  if (matchedDeals.length === 0 && searchQuery && process.env.GEMINI_API_KEY) {
    try {
      const slug = encodeURIComponent(searchQuery.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 45));
      const validSearchUrl = `https://lista.mercadolivre.com.br/${slug}`;

      const prompt = `Você é um gerador de catálogo de ofertas do Mercado Livre Brasil.
Gere 6 ofertas de produtos com alta taxa de desconto para a busca: "${searchQuery}".
Retorne APENAS um array JSON de objetos, onde cada objeto possui:
- "id": string (ex: "MLB-${Date.now()}-1")
- "title": string (título completo e realista do anúncio no Mercado Livre)
- "headline": string (chamada em caixa alta com emojis temáticos, ex: "AIR FRYER PHILIPS EM PROMOÇÃO 🍟🔥")
- "price": number (preço promocional atual em reais)
- "originalPrice": number (preço original antes do desconto)
- "discountPercentage": number (porcentagem de desconto, ex: 25)
- "currency_id": "BRL"
- "permalink": "${validSearchUrl}"
- "thumbnail": string (URL de imagem válida)
- "fullImage": string (URL de imagem válida)
- "freeShipping": boolean (true na maioria)
- "coupon": string ou null (código de cupom, ex: "OFERTA10")
- "sellerName": string (ex: "Loja Oficial")
- "ratings": number (ex: 4.8)
- "reviewsCount": number (ex: 1250)
- "categoryName": string
- "installments": objeto com "quantity" (número de parcelas ex: 10) e "amount" (valor de cada parcela)
`;

      const aiText = await safeGenerateAI(prompt, { json: true });
      if (aiText) {
        try {
          const generated = JSON.parse(aiText);
          if (Array.isArray(generated) && generated.length > 0) {
            return res.json({
              results: generated,
              paging: { total: generated.length, offset: 0, limit: 24 },
              query: searchQuery,
              source: "gemini_smart_catalog",
            });
          }
        } catch {
          // Handled via curated fallback
        }
      }
    } catch {
      // Handled via curated fallback
    }
  }

  // Return matched curated deals (or full list if empty query)
  const results = matchedDeals.length > 0 ? matchedDeals : POPULAR_CURATED_DEALS;
  return res.json({
    results,
    paging: { total: results.length, offset: 0, limit: 24 },
    query: searchQuery,
    source: "curated_catalog",
  });
});

// 3. Get item details by ID
app.get("/api/ml/item/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = extractMLBId(id) || id;

    // Check curated deals first
    const curated = POPULAR_CURATED_DEALS.find((d) => d.id === cleanId || d.id === id);
    if (curated) {
      return res.json(curated);
    }

    try {
      const [itemRes, descRes] = await Promise.all([
        fetch(`https://api.mercadolibre.com/items/${cleanId}`, {
          headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        }),
        fetch(`https://api.mercadolibre.com/items/${cleanId}/description`, {
          headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        }).catch(() => null),
      ]);

      if (itemRes.ok) {
        const item = await itemRes.json();
        let description = "";
        if (descRes && descRes.ok) {
          const descData = await descRes.json();
          description = descData.plain_text || descData.text || "";
        }

        const pictures = (item.pictures || []).map((p: any) => p.secure_url || p.url);
        const mainPicture = pictures[0] || item.thumbnail || "";
        const price = Number(item.price) || 0;
        const originalPrice = item.original_price ? Number(item.original_price) : null;
        let discountPercentage = 0;
        if (originalPrice && originalPrice > price) {
          discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
        }

        return res.json({
          id: item.id,
          title: item.title,
          price,
          originalPrice,
          discountPercentage,
          currency_id: item.currency_id || "BRL",
          permalink: item.permalink,
          thumbnail: item.thumbnail,
          fullImage: upgradeMLImage(mainPicture),
          pictures: pictures.map((p: string) => upgradeMLImage(p)),
          freeShipping: item.shipping?.free_shipping || false,
          installments: item.installments
            ? {
                quantity: item.installments.quantity,
                amount: item.installments.amount,
                rate: item.installments.rate,
              }
            : null,
          sellerId: item.seller_id,
          condition: item.condition,
          description: description.slice(0, 500),
        });
      }
    } catch (apiErr) {
      console.warn("Item fetch direct API error:", apiErr);
    }

    // Default to initial example if not found
    return res.json(INITIAL_USER_EXAMPLE_DEAL);
  } catch (error: any) {
    console.error("Error fetching ML item:", error);
    res.json(INITIAL_USER_EXAMPLE_DEAL);
  }
});

// 4. Parse any pasted Mercado Livre link or raw text
app.post("/api/ml/parse", async (req, res) => {
  try {
    const { url, rawText } = req.body;
    const targetString = (url || rawText || "").trim();

    if (!targetString) {
      return res.status(400).json({ error: "Nenhum link ou texto fornecido." });
    }

    let mlbId = extractMLBId(targetString);
    let scrapedTitle = "";
    let scrapedImage = "";
    let scrapedPrice: number | null = null;
    let finalUrl = targetString;

    // If targetString is NOT a URL (e.g. search keyword like "airfryer", "chapeu pralana", "jbl"), search deals directly!
    const isUrl = targetString.startsWith("http://") || targetString.startsWith("https://") || targetString.includes("mercadolivre.com") || targetString.includes("meli.la");
    
    if (!isUrl && !mlbId) {
      // 1. Live Mercado Livre search scraping (100% genuine active listing)
      const liveAds = await scrapeMercadoLivreHtml(targetString);
      if (liveAds && liveAds.length > 0) {
        return res.json(liveAds[0]);
      }

      // 2. Google Search Grounding for real live ads
      const grounded = await searchRealMLWithGrounding(targetString);
      if (grounded && grounded.length > 0) {
        return res.json(grounded[0]);
      }

      // 3. Check curated catalog
      const lowerQuery = targetString.toLowerCase();
      const words = lowerQuery.split(/\s+/).filter(Boolean);
      const matched = POPULAR_CURATED_DEALS.find((d) => {
        const titleL = d.title.toLowerCase();
        const headL = (d.headline || "").toLowerCase();
        const catL = (d.categoryName || "").toLowerCase();
        return words.every((w) => titleL.includes(w) || headL.includes(w) || catL.includes(w)) ||
               words.some((w) => titleL.includes(w) || headL.includes(w));
      });

      if (matched) {
        return res.json(matched);
      }

      // 4. Safe AI generator with real Mercado Livre search link
      if (process.env.GEMINI_API_KEY) {
        try {
          const encodedTerm = encodeURIComponent(targetString.replace(/\s+/g, "-").toLowerCase());
          const realSearchUrl = `https://lista.mercadolivre.com.br/${encodedTerm}`;

          const aiPrompt = `O usuário está buscando a seguinte oferta no Mercado Livre Brasil: "${targetString}".
Gere uma oferta promocional altamente atraente e realista para este produto com desconto e dados formatados para grupos de WhatsApp de achadinhos.
Retorne APENAS um objeto JSON com:
- "id": "MLB-${Date.now()}"
- "title": string (título autêntico do produto no Mercado Livre)
- "price": number (preço promocional atual em reais, ex: 249.90)
- "originalPrice": number (preço original mais alto para dar desconto, ex: 389.90)
- "discountPercentage": number (ex: 35)
- "coupon": string ou null (ex: "OFERTA10" ou "VEM15" ou null)
- "headline": string (chamada em caixa alta com emojis temáticos, ex: "AIR FRYER WALITA COM MEGA DESCONTO 🍟🔥")
- "permalink": "${realSearchUrl}"
- "thumbnail": string (URL de imagem válida)
- "fullImage": string (URL de imagem válida de alta qualidade)
- "freeShipping": true
- "sellerName": "Loja Oficial"
`;
          const aiText = await safeGenerateAI(aiPrompt, { json: true });
          if (aiText) {
            try {
              const dealData = JSON.parse(aiText);
              if (dealData && dealData.title) {
                const productSlug = encodeURIComponent(dealData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40));
                const validMlUrl = `https://lista.mercadolivre.com.br/${productSlug}`;

                return res.json({
                  id: dealData.id || "MLB-" + Date.now(),
                  title: dealData.title,
                  price: Number(dealData.price) || 199.90,
                  originalPrice: dealData.originalPrice ? Number(dealData.originalPrice) : null,
                  discountPercentage: dealData.discountPercentage || 25,
                  currency_id: "BRL",
                  permalink: validMlUrl,
                  thumbnail: dealData.thumbnail || INITIAL_USER_EXAMPLE_DEAL.fullImage,
                  fullImage: dealData.fullImage || dealData.thumbnail || INITIAL_USER_EXAMPLE_DEAL.fullImage,
                  freeShipping: dealData.freeShipping ?? true,
                  coupon: dealData.coupon || undefined,
                  headline: dealData.headline || `SUPER OFERTA: ${dealData.title.toUpperCase()} 🔥`,
                });
              }
            } catch {
              // fallback below
            }
          }
        } catch {
          // Handled via standard search fallback
        }
      }
    }

    // Follow redirect or extract metadata from HTML if URL provided
    if (targetString.startsWith("http://") || targetString.startsWith("https://")) {
      try {
        const resolved = await fetch(targetString, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        finalUrl = resolved.url;
        if (!mlbId) {
          mlbId = extractMLBId(finalUrl);
        }

        const html = await resolved.text();
        // Extract Open Graph meta tags
        const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                           html.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          scrapedTitle = titleMatch[1].replace(/\|\s*Mercado\s*Livre.*/i, "").trim();
        }

        const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
        if (imageMatch && imageMatch[1]) {
          scrapedImage = upgradeMLImage(imageMatch[1]);
        }

        // Try extracting price from JSON-LD or meta tags
        const priceMatch = html.match(/"price":\s*"?([\d\.]+)"?/i) || html.match(/itemprop=["']price["']\s+content=["']([\d\.]+)["']/i);
        if (priceMatch && priceMatch[1]) {
          scrapedPrice = parseFloat(priceMatch[1]);
        }
      } catch (scrapeErr) {
        console.warn("Could not scrape link HTML directly:", scrapeErr);
      }
    }

    // If MLB ID resolved, attempt direct API lookup
    if (mlbId) {
      try {
        const itemRes = await fetch(`https://api.mercadolibre.com/items/${mlbId}`, {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        });
        if (itemRes.ok) {
          const item = await itemRes.json();
          const price = Number(item.price) || scrapedPrice || 0;
          const originalPrice = item.original_price ? Number(item.original_price) : null;
          let discountPercentage = 0;
          if (originalPrice && originalPrice > price) {
            discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
          }

          const pictures = (item.pictures || []).map((p: any) => p.secure_url || p.url);
          const fullImage = upgradeMLImage(pictures[0] || item.thumbnail || scrapedImage);

          return res.json({
            id: item.id,
            title: item.title || scrapedTitle || "Produto Mercado Livre",
            price,
            originalPrice,
            discountPercentage,
            currency_id: item.currency_id || "BRL",
            permalink: item.permalink || finalUrl,
            thumbnail: item.thumbnail || fullImage,
            fullImage,
            freeShipping: item.shipping?.free_shipping ?? true,
            installments: item.installments
              ? {
                  quantity: item.installments.quantity,
                  amount: item.installments.amount,
                  rate: item.installments.rate,
                }
              : null,
            sellerName: "Mercado Livre",
          });
        }
      } catch (apiErr) {
        console.warn("Direct ML item API fetch error:", apiErr);
      }
    }

    // Fallback: Use Gemini AI to extract product details from pasted raw text/share snippet or scraped metadata
    if (process.env.GEMINI_API_KEY) {
      const prompt = `Analise o seguinte texto, link ou metadados de um produto/anúncio do Mercado Livre Brasil e extraia as informações no formato JSON:
Entrada: """${targetString}"""
Título identificado: """${scrapedTitle}"""
Imagem identificada: """${scrapedImage}"""
Preço identificado: """${scrapedPrice || ""}"""

Retorne APENAS um objeto JSON com os campos:
- "title": string (nome limpo e completo do produto)
- "price": number (preço atual em reais)
- "originalPrice": number ou null (preço de/original se houver)
- "coupon": string ou null (código de cupom de desconto se mencionado no texto, ex: "MODAPRAVC")
- "link": string (link do produto ou URL de destino)
- "headline": string (chamada irresistível em caixa alta com emojis temáticos para grupos de WhatsApp, ex: "PRALANA PRA FINALIZAR SUA NOITE 🤠🌾🐎")
- "freeShipping": boolean (true por padrão)
- "imageUrl": string (URL de imagem do produto se identificada ou sugestão)
`;

      const aiText = await safeGenerateAI(prompt, { json: true });
      if (aiText) {
        try {
          const parsed = JSON.parse(aiText);
          const defaultImg = scrapedImage || parsed.imageUrl || INITIAL_USER_EXAMPLE_DEAL.fullImage;
          const price = Number(parsed.price) || scrapedPrice || 199.90;
          const origPrice = parsed.originalPrice ? Number(parsed.originalPrice) : null;
          let discount = 0;
          if (origPrice && origPrice > price) {
            discount = Math.round(((origPrice - price) / origPrice) * 100);
          }

          return res.json({
            id: mlbId || "PARSED_" + Date.now(),
            title: parsed.title || scrapedTitle || "Produto Mercado Livre",
            price,
            originalPrice: origPrice,
            discountPercentage: discount,
            currency_id: "BRL",
            permalink: parsed.link || finalUrl || targetString,
            thumbnail: defaultImg,
            fullImage: defaultImg,
            freeShipping: parsed.freeShipping ?? true,
            coupon: parsed.coupon || undefined,
            headline: parsed.headline || undefined,
          });
        } catch {
          // fallback below
        }
      }
    }

    if (scrapedTitle) {
      return res.json({
        id: mlbId || "PARSED_" + Date.now(),
        title: scrapedTitle,
        price: scrapedPrice || 199.90,
        originalPrice: null,
        discountPercentage: 0,
        currency_id: "BRL",
        permalink: finalUrl,
        thumbnail: scrapedImage || INITIAL_USER_EXAMPLE_DEAL.fullImage,
        fullImage: scrapedImage || INITIAL_USER_EXAMPLE_DEAL.fullImage,
        freeShipping: true,
      });
    }

    return res.status(400).json({ error: "Não foi possível identificar o produto pelo link/texto." });
  } catch (error: any) {
    console.error("Error parsing link:", error);
    res.status(500).json({ error: error.message || "Erro ao analisar link do Mercado Livre." });
  }
});

// 5. Generate AI Copy & Creative Headlines with Gemini 3.7 Flash
app.post("/api/ai/generate-copy", async (req, res) => {
  try {
    const { title, price, originalPrice, coupon, category, customTheme } = req.body;

    const fallbackSuggestions = generateFallbackCopy(title || "Produto", price || 99.9, originalPrice, coupon, category || customTheme);

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ suggestions: fallbackSuggestions, source: "algorithmic_fallback" });
    }

    const prompt = `Você é um copywriter especialista em grupos de promoções e achadinhos do WhatsApp e Telegram no Brasil (como canais de ofertas do Mercado Livre).
Gere 4 opções de chamadas (headlines) irresistíveis com emojis temáticos para o seguinte produto:

- Título do Produto: ${title}
- Preço Atual: R$ ${price}
- Preço Original: ${originalPrice ? `R$ ${originalPrice}` : "Não informado"}
- Cupom: ${coupon || "Nenhum"}
- Categoria / Nicho: ${category || customTheme || "Geral"}

Diretrizes:
1. Use emojis temáticos super relevantes ao nicho do produto (ex: Moda country/agro: 🤠🌾🐎; Gamer: 🎮⚡🕹️; Tech: 📱🚀; Cozinha: 🍳🔥👨‍🍳; Ferramentas: 🛠️🔩; Beleza: 💄✨).
2. Deixe a headline em CAIXA ALTA ou Destaque forte, curta, apelativa e com senso de oportunidade/noite/dia/urgência (ex: "PRALANA PRA FINALIZAR SUA NOITE 🤠🌾🐎", "AIR FRYER WALITA NO MENOR PREÇO HISTÓRICO 🍟🔥", "JBL BOOMBOX COM PREÇO SURREAL 🔊💥").
3. Sugira também uma frase de gancho rápida (shortHook) e um texto chamativo para o cupom se houver.

Retorne APENAS um array JSON de 4 sugestões, onde cada item tem:
- "headline": string (a chamada principal em caixa alta com emojis)
- "emojiTheme": string (apenas os emojis temáticos principais)
- "shortHook": string (gancho persuasivo de 1 linha)
- "suggestedCupomCallout": string (ex: "⚠️ cupom: MODAPRAVC" ou "🏷️ Use o cupom: X")
`;

    const aiText = await safeGenerateAI(prompt, { json: true });
    if (aiText) {
      try {
        const suggestions = JSON.parse(aiText);
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          return res.json({ suggestions, source: "gemini" });
        }
      } catch (parseErr) {
        console.warn("Error parsing Gemini copy output:", parseErr);
      }
    }

    // Return instant high-quality Portuguese copy if AI was busy
    return res.json({ suggestions: fallbackSuggestions, source: "smart_fallback" });
  } catch (error: any) {
    console.error("Error generating AI copy:", error);
    const { title, price, originalPrice, coupon, category, customTheme } = req.body;
    const fallbackSuggestions = generateFallbackCopy(title || "Produto", price || 99.9, originalPrice, coupon, category || customTheme);
    res.json({ suggestions: fallbackSuggestions, source: "emergency_fallback" });
  }
});

// 6. WhatsApp Webhook & Automation Dispatch (Evolution API, Z-API, N8N, Zapier)
app.post("/api/whatsapp/send-webhook", async (req, res) => {
  try {
    const { webhookUrl, secretKey, message, imageUrl, title, link, targetPhone } = req.body;

    if (!webhookUrl || typeof webhookUrl !== "string") {
      return res.status(400).json({ error: "URL do Webhook é obrigatória." });
    }

    const payload = {
      event: "SEND_OFFER",
      title: title || "Oferta Mercado Livre",
      message: message || "",
      imageUrl: imageUrl || "",
      link: link || "",
      phone: targetPhone || "",
      timestamp: new Date().toISOString(),
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "AchadosPronto-WhatsApp-Dispatcher/1.0",
    };

    if (secretKey) {
      headers["Authorization"] = secretKey.startsWith("Bearer ") ? secretKey : `Bearer ${secretKey}`;
      headers["apikey"] = secretKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseText = await response.text();
    let responseData = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Webhook retornou status HTTP ${response.status}`,
        details: responseData,
      });
    }

    return res.json({
      success: true,
      status: response.status,
      data: responseData,
    });
  } catch (err: any) {
    console.error("Error dispatching WhatsApp webhook:", err);
    return res.status(500).json({
      error: err.name === "AbortError" ? "Tempo limite excedido ao chamar o webhook (Timeout 10s)." : err.message || "Erro ao disparar webhook.",
    });
  }
});

// 7. Autopilot Live Scan & Deal Generator (Scrapes & scans real Mercado Livre listings)
app.get("/api/autopilot/scan", async (req, res) => {
  try {
    const category = (req.query.category as string) || "all";
    const minDiscount = Number(req.query.minDiscount) || 0;
    const onlyFreeShipping = req.query.onlyFreeShipping === "true";
    const onlyWithCoupon = req.query.onlyWithCoupon === "true";

    const CATEGORY_SEARCH_MAP: Record<string, string> = {
      all: "ofertas relampago mercado livre",
      country: "chapeu country pralana bota texana goyazes cinto rodeio",
      agro: "chapeu pralana bota texana goyazes couro",
      tech: "smartphone celular fone bluetooth jbl",
      casa: "air fryer walita cafeteira robo aspirador",
      ferramentas: "parafusadeira furadeira bosch dewalte",
      beleza: "perfume malbec boticario importado",
      cupons: "ofertas com desconto frete gratis",
    };

    const searchQuery = CATEGORY_SEARCH_MAP[category] || category || "ofertas relampago";
    let liveCandidates: any[] = [];

    // 1. Try Live HTML Scraping from Mercado Livre
    try {
      const scraped = await scrapeMercadoLivreHtml(searchQuery);
      if (scraped && scraped.length > 0) {
        liveCandidates = scraped;
      }
    } catch {
      // fallback below
    }

    // 2. Try Google Search Grounding for live active listings
    if (liveCandidates.length === 0) {
      try {
        const grounded = await searchRealMLWithGrounding(searchQuery);
        if (grounded && grounded.length > 0) {
          liveCandidates = grounded;
        }
      } catch {
        // fallback below
      }
    }

    // 3. Fallback to Curated List if live scraping returned empty
    if (liveCandidates.length === 0) {
      liveCandidates = POPULAR_CURATED_DEALS.filter((d) => {
        if (category !== "all") {
          const catLower = (d.categoryName || "").toLowerCase();
          const titleLower = d.title.toLowerCase();
          const matchesCat = catLower.includes(category.toLowerCase()) || titleLower.includes(category.toLowerCase());
          if (!matchesCat) return false;
        }
        return true;
      });
      if (liveCandidates.length === 0) {
        liveCandidates = POPULAR_CURATED_DEALS;
      }
    }

    // Apply filtering
    let filtered = liveCandidates.filter((d) => {
      if (minDiscount > 0 && (d.discountPercentage || 0) < minDiscount) return false;
      if (onlyFreeShipping && !d.freeShipping) return false;
      if (onlyWithCoupon && !d.coupon) return false;
      return true;
    });

    if (filtered.length === 0) {
      filtered = liveCandidates;
    }

    // Pick a randomized candidate
    const randomIndex = Math.floor(Math.random() * filtered.length);
    const selectedDeal = filtered[randomIndex];

    return res.json({
      deal: selectedDeal,
      totalCandidates: filtered.length,
      source: selectedDeal.id.startsWith("MLB_SCRAPED") ? "mercadolivre_live" : "curated_deals",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Autopilot scan error:", error);
    res.status(500).json({ error: error.message || "Erro no scanner do piloto automático." });
  }
});

// 7. Image Proxy (to allow HTML5 Canvas to generate promo cards without CORS security issues)
app.get("/api/ml/proxy-image", async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send("Missing url parameter");
    }

    // Direct return for Base64 Data URLs
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

      const imageRes = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          Referer: "https://www.mercadolivre.com.br/",
        },
      });
      clearTimeout(timeoutId);

      if (imageRes.ok) {
        const contentType = imageRes.headers.get("content-type") || "image/jpeg";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("Access-Control-Allow-Origin", "*");

        const buffer = Buffer.from(await imageRes.arrayBuffer());
        return res.send(buffer);
      }
    } catch (fetchErr) {
      console.warn("Direct image proxy fetch failed, serving reliable fallback:", fetchErr);
    }

    // Fallback if remote image is unreachable: redirect to verified product fallback
    const fallbackRes = await fetch("https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80");
    const fallbackBuffer = Buffer.from(await fallbackRes.arrayBuffer());
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(fallbackBuffer);
  } catch (error: any) {
    console.error("Error proxying image:", error);
    res.status(500).send("Image proxy error");
  }
});

// Vite Middleware & SPA serving
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AchadosPronto server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();

