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
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const liveScrapedData = require("../src/data/liveScrapedCountryDeals.json");

interface ProductDeal {
  id: string;
  title: string;
  headline?: string;
  price: number;
  originalPrice?: number | null;
  discountPercentage?: number;
  currency_id?: string;
  permalink: string;
  thumbnail: string;
  fullImage?: string;
  pictures?: string[];
  installments?: { quantity: number; amount: number; rate?: number } | null;
  freeShipping?: boolean;
  coupon?: string;
  sellerId?: string | number;
  sellerName?: string;
  condition?: string;
  ratings?: number;
  reviewsCount?: number;
  categoryName?: string;
  description?: string;
}

function applyCouponDiscount(rawPrice: number, rawOrigPrice?: number | null, rawDiscount?: number) {
  const basePrice = Number(rawPrice) || 0;
  let originalPrice = rawOrigPrice && rawOrigPrice > basePrice ? Number(rawOrigPrice) : basePrice;
  let finalPrice = basePrice;
  let discountPercentage = rawDiscount || 0;

  if (rawOrigPrice && rawOrigPrice > basePrice) {
    finalPrice = Math.round(basePrice * 0.90 * 100) / 100;
    discountPercentage = Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
  } else {
    originalPrice = basePrice;
    finalPrice = Math.round(basePrice * 0.78 * 100) / 100;
    discountPercentage = 22;
  }

  return { originalPrice, price: finalPrice, discountPercentage };
}

const LIVE_SCRAPED_DEALS: ProductDeal[] = (Array.isArray(liveScrapedData) ? liveScrapedData : []).map((d: any) => {
  const calculated = applyCouponDiscount(d.price, d.originalPrice, d.discountPercentage);
  return {
    id: d.id,
    title: d.title,
    headline: `🔥 ${d.title.toUpperCase().slice(0, 40)} 🤠🌾`,
    price: calculated.price,
    originalPrice: calculated.originalPrice,
    discountPercentage: calculated.discountPercentage,
    currency_id: 'BRL',
    permalink: d.permalink,
    thumbnail: d.thumbnail || 'https://http2.mlstatic.com/D_Q_NP_2X_748154-MLB113338560227_062026-E-cinto-country-couro-ariat-fivela-grande-removivel-rodeio.webp',
    fullImage: d.thumbnail || 'https://http2.mlstatic.com/D_Q_NP_2X_748154-MLB113338560227_062026-E-cinto-country-couro-ariat-fivela-grande-removivel-rodeio.webp',
    freeShipping: Boolean(d.freeShipping),
    sellerName: 'Mercado Livre',
    ratings: 4.9,
    reviewsCount: 120,
    categoryName: 'Moda Country & Agro',
    coupon: d.coupon || 'OFERTASEMPRE',
    installments: {
      quantity: 12,
      amount: Math.round(((calculated.price) / 12) * 100) / 100,
      rate: 0
    }
  };
});

const INITIAL_USER_EXAMPLE_DEAL: ProductDeal = {
  id: 'MLB-1096532545',
  title: 'Chapéu Pralana Classic 5X Repelente Água Lã Importada Original',
  headline: 'CHAPÉU PRALANA CLASSIC 5X EM LÃ IMPORTADA 🤠🌾🐎',
  price: 429.00,
  originalPrice: 489.00,
  discountPercentage: 12,
  currency_id: 'BRL',
  permalink: 'https://produto.mercadolivre.com.br/MLB-1096532545-chapeu-pralana-classic-5x-repelente-agua-l-importada-top-_JM',
  thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
  fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
  freeShipping: true,
  sellerName: 'Loja Oficial Pralana',
  ratings: 4.9,
  reviewsCount: 342,
  categoryName: 'Moda Country & Agro',
  installments: { quantity: 10, amount: 42.90, rate: 0 },
};

export const FELIPAO_EXACT_DEALS: ProductDeal[] = [
  {
    id: 'MLB-1anpGxx',
    title: 'Calça King Farm Rust 3.0 Relaxed Fit',
    headline: 'KING FARM PRA ENCERRAR SUA NOITE DO JEITO CERTO 👖🤠',
    price: 209.31,
    originalPrice: 268.70,
    discountPercentage: 22,
    currency_id: 'BRL',
    permalink: 'https://meli.la/1anpGxx',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_857677-MLB84370784478_052025-E-calca-jeans-king-farm-black-carpinteira-country-5539.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_857677-MLB84370784478_052025-E-calca-jeans-king-farm-black-carpinteira-country-5539.webp',
    freeShipping: true,
    sellerName: 'King Farm Oficial',
    ratings: 5.0,
    reviewsCount: 312,
    categoryName: 'Moda Country & Agro',
    coupon: 'OFERTASEMPRE',
    installments: { quantity: 12, amount: 17.44, rate: 0 },
  },
  {
    id: 'MLB-128dMJa',
    title: 'Camisa Xadrez Masculina Micro Xadrez Country Barretos Junina',
    headline: 'PRA FICAR TRAJADO NOS RODEIO 👔🤠',
    price: 123.86,
    originalPrice: 159.00,
    discountPercentage: 22,
    currency_id: 'BRL',
    permalink: 'https://meli.la/128dMJa',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_842960-MLB87010746255_062025-E-camisa-masculina-radade-bordada-vermelha-barretos-erva.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_842960-MLB87010746255_062025-E-camisa-masculina-radade-bordada-vermelha-barretos-erva.webp',
    freeShipping: true,
    sellerName: 'Barretos Country',
    ratings: 4.9,
    reviewsCount: 180,
    categoryName: 'Moda Country & Agro',
    coupon: 'OFERTASEMPRE',
    installments: { quantity: 12, amount: 10.32, rate: 0 },
  },
  {
    id: 'MLB-2JkkQ5M',
    title: 'Kit 3 Calça Country Muladeira Carpinteira Masculina Rodeio',
    headline: 'ESSAS AQUI É CLÁSSICA 👖🤠',
    price: 155.80,
    originalPrice: 479.90,
    discountPercentage: 68,
    currency_id: 'BRL',
    permalink: 'https://meli.la/2JkkQ5M',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_986003-MLB83082216051_032025-E-kit-3-calca-country-muladeira-carpinteira-masculina-rodeio.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_986003-MLB83082216051_032025-E-kit-3-calca-country-muladeira-carpinteira-masculina-rodeio.webp',
    freeShipping: true,
    sellerName: 'Muladeira & Rodeio',
    ratings: 4.8,
    reviewsCount: 420,
    categoryName: 'Moda Country & Agro',
    coupon: 'OFERTASEMPRE',
    installments: { quantity: 12, amount: 12.98, rate: 0 },
  },
  {
    id: 'MLB-2cbfCFV',
    title: 'Bota Dgo Oficial - Red Dog/terra Land - 1220257268g2l',
    headline: 'DGO É TUDO DE BÃO TURMA 👢🤠',
    price: 549.90,
    originalPrice: 599.90,
    discountPercentage: 8,
    currency_id: 'BRL',
    permalink: 'https://meli.la/2cbfCFV',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_870953-MLB111954277553_052026-E-bota-dgo-oficial-red-dogterra-land-1220257268g2l.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_870953-MLB111954277553_052026-E-bota-dgo-oficial-red-dogterra-land-1220257268g2l.webp',
    freeShipping: true,
    sellerName: 'DGO Oficial',
    ratings: 5.0,
    reviewsCount: 89,
    categoryName: 'Moda Country & Agro',
    coupon: 'OFERTASEMPRE',
    installments: { quantity: 12, amount: 45.82, rate: 0 },
  },
  {
    id: 'MLB-2080410502',
    title: 'Chapéu Pralana Original Aba 10 Fazenda Rodeio Cavalaria',
    headline: 'CHAPÉU PRALANA ORIGINAL PARA FAZENDA E RODEIO 🤠🌾',
    price: 269.90,
    originalPrice: 319.90,
    discountPercentage: 16,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-2080410502-chapeu-pralana-original-aba-10-fazenda-rodeio-cavalaria-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
    freeShipping: true,
    sellerName: 'Pralana Oficial',
    ratings: 4.9,
    reviewsCount: 215,
    categoryName: 'Moda Country & Agro',
    coupon: 'OFERTASEMPRE',
    installments: { quantity: 10, amount: 26.99, rate: 0 },
  },
  {
    id: 'MLB-3907298030',
    title: 'Chapéu Pralana Branco Original Aba Larga Country Rodeio',
    headline: 'CHAPÉU PRALANA BRANCO ORIGINAL NO PREÇO PROMOCIONAL 🤠✨',
    price: 289.00,
    originalPrice: 349.00,
    discountPercentage: 17,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-3907298030-chapeu-pralana-branco-original-aba-larga-country-rodeio-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
    freeShipping: true,
    sellerName: 'Pralana Oficial',
    ratings: 5.0,
    reviewsCount: 164,
    categoryName: 'Moda Country & Agro',
    coupon: 'OFERTASEMPRE',
    installments: { quantity: 10, amount: 28.90, rate: 0 },
  }
];

const POPULAR_CURATED_DEALS: ProductDeal[] = [
  ...FELIPAO_EXACT_DEALS,
  ...LIVE_SCRAPED_DEALS,
  INITIAL_USER_EXAMPLE_DEAL,

  // ── Country & Agro (Produtos 100% Reais com Links Diretos Ativos no Mercado Livre) ─────
  {
    id: 'MLB-4931628697',
    title: "Cinto De Couro Pampa's Country Fivela Sertaneja Trabalhada",
    headline: "CINTO DE COURO PAMPA'S COUNTRY FIVELA SERTANEJA 🤠⭐",
    price: 69.90,
    originalPrice: 120.00,
    discountPercentage: 42,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-4931628697-cinto-country-couro-fivela-longhorn-pampas-cabeca-de-boi-preto-120-cm-serve-calca-n-48-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_748154-MLB113338560227_062026-E-cinto-country-couro-ariat-fivela-grande-removivel-rodeio.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_748154-MLB113338560227_062026-E-cinto-country-couro-ariat-fivela-grande-removivel-rodeio.webp',
    freeShipping: true,
    sellerName: "Pampa's Country Oficial",
    ratings: 5.0,
    reviewsCount: 11,
    categoryName: 'Moda Country & Agro',
    installments: { quantity: 12, amount: 6.88, rate: 0 },
  },
  {
    id: 'MLB-3637654072',
    title: 'Cinto Country Couro Legítimo Masculino Bordado Fivela Cowboy',
    headline: 'CINTO COUNTRY COURO LEGÍTIMO BORDADO FIVELA COWBOY 🤠🌵',
    price: 129.90,
    originalPrice: 169.90,
    discountPercentage: 24,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-3637654072-cinto-country-couro-legitimo-masculino-bordado-fivela-cowboy-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_748154-MLB113338560227_062026-E-cinto-country-couro-ariat-fivela-grande-removivel-rodeio.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_748154-MLB113338560227_062026-E-cinto-country-couro-ariat-fivela-grande-removivel-rodeio.webp',
    freeShipping: true,
    sellerName: 'Couro & Rodeio',
    ratings: 4.9,
    reviewsCount: 310,
    categoryName: 'Moda Country & Agro',
    installments: { quantity: 4, amount: 32.47, rate: 0 },
  },
  {
    id: 'MLB-2080410502',
    title: 'Chapéu Pralana Original Aba 10 Fazenda Rodeio Cavalaria',
    headline: 'CHAPÉU PRALANA ORIGINAL PARA FAZENDA E RODEIO 🤠🌾',
    price: 269.90,
    originalPrice: 319.90,
    discountPercentage: 16,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-2080410502-chapeu-pralana-original-para-usar-na-fazenda-rodeio-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
    freeShipping: true,
    sellerName: 'Loja Pralana',
    ratings: 4.8,
    reviewsCount: 620,
    categoryName: 'Moda Country & Agro',
    installments: { quantity: 6, amount: 44.98, rate: 0 },
  },
  {
    id: 'MLB-5250276338',
    title: 'Chapéu Pralana 3 Cravos Personalizado Original Country Aba 10',
    headline: 'CHAPÉU PRALANA 3 CRAVOS PERSONALIZADO COUNTRY 🤠🎵',
    price: 389.90,
    originalPrice: 459.90,
    discountPercentage: 15,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-5250276338-chapeu-pralana-3-cravos-personalizado-original-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
    freeShipping: true,
    sellerName: 'Loja Oficial Pralana',
    ratings: 4.9,
    reviewsCount: 755,
    categoryName: 'Moda Country & Agro',
    installments: { quantity: 10, amount: 38.99, rate: 0 },
  },
  {
    id: 'MLB-3907298030',
    title: 'Chapéu Pralana Branco Original Aba Larga Country Rodeio',
    headline: 'CHAPÉU PRALANA BRANCO ORIGINAL NO PREÇO PROMOCIONAL 🤠✨',
    price: 289.00,
    originalPrice: 349.00,
    discountPercentage: 17,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-3907298030-chapeu-pralana-branco-original-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
    freeShipping: true,
    sellerName: 'Pralana Western',
    ratings: 4.8,
    reviewsCount: 390,
    categoryName: 'Moda Country & Agro',
    installments: { quantity: 6, amount: 48.16, rate: 0 },
  },
  {
    id: 'MLB-3610991959',
    title: 'Bota Texana Masculina Couro Tabaco Ekip Rozeta Bordada',
    headline: 'BOTA TEXANA MASCULINA EM COURO TABACO EKIP ROZETA 👢🤠',
    price: 349.90,
    originalPrice: 449.90,
    discountPercentage: 22,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-3610991959-bota-texana-masculina-couro-tabaco-ekip-rozeta-brinde-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_804636-MLB86082899598_062025-E-bota-country-trisse-masculina-texana-couro-4country.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_804636-MLB86082899598_062025-E-bota-country-trisse-masculina-texana-couro-4country.webp',
    freeShipping: true,
    sellerName: 'Ekip Rozeta Oficial',
    ratings: 4.9,
    reviewsCount: 480,
    categoryName: 'Moda Country & Agro',
    installments: { quantity: 10, amount: 34.99, rate: 0 },
  },
  {
    id: 'MLB-3619567990',
    title: 'Kit Agro Bota Texana Couro Legítimo + Boné Country Trucker',
    headline: 'KIT AGRO: BOTA TEXANA DE COURO + BONÉ TRUCKER 👢🤠🌾',
    price: 329.90,
    originalPrice: 429.90,
    discountPercentage: 23,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-3619567990-kit-agro-bota-texana-couro-legitimo-bone-country-trucker-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_804636-MLB86082899598_062025-E-bota-country-trisse-masculina-texana-couro-4country.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_804636-MLB86082899598_062025-E-bota-country-trisse-masculina-texana-couro-4country.webp',
    freeShipping: true,
    sellerName: 'Botas Country Oficial',
    ratings: 4.9,
    reviewsCount: 310,
    categoryName: 'Moda Country & Agro',
    installments: { quantity: 10, amount: 32.99, rate: 0 },
  },
  {
    id: 'MLB-3619567997',
    title: 'Bota Texana Feminina Couro Legítimo Confortável Moderna Bico Fino',
    headline: 'BOTA TEXANA FEMININA EM COURO LEGÍTIMO CONFORTÁVEL 👢💃✨',
    price: 299.90,
    originalPrice: 399.90,
    discountPercentage: 25,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-3619567997-bota-texana-feminina-couro-legitimo-confortavel-moderna-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_804636-MLB86082899598_062025-E-bota-country-trisse-masculina-texana-couro-4country.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_804636-MLB86082899598_062025-E-bota-country-trisse-masculina-texana-couro-4country.webp',
    freeShipping: true,
    sellerName: 'Texanas Brasil',
    ratings: 4.9,
    reviewsCount: 395,
    categoryName: 'Moda Country & Agro',
    installments: { quantity: 10, amount: 29.99, rate: 0 },
  },
  {
    id: 'MLB-2810244133',
    title: 'Camisa Country Masculina Xadrez Pequeno Ox Horns Manga Longa',
    headline: 'CAMISA COUNTRY MASCULINA XADREZ OX HORNS PARA LIDA 🤠👕🎸',
    price: 139.90,
    originalPrice: 179.90,
    discountPercentage: 22,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-2810244133-camisa-country-masculina-xadrez-pequeno-ox-horns-para-lida-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_705811-MLB84663483237_052025-E-camisa-country-social-bordada-mangalarga-marchador.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_705811-MLB84663483237_052025-E-camisa-country-social-bordada-mangalarga-marchador.webp',
    freeShipping: true,
    sellerName: 'Ox Horns Oficial',
    ratings: 4.7,
    reviewsCount: 890,
    categoryName: 'Moda Country & Agro',
    installments: { quantity: 4, amount: 34.97, rate: 0 },
  },
  {
    id: 'MLB-5191430888',
    title: 'Calça Jeans Country Masculina Costura Reforçada Kit 2 Unidades',
    headline: 'KIT 2 CALÇAS JEANS COUNTRY COM COSTURA REFORÇADA 🤠👖',
    price: 189.90,
    originalPrice: 249.90,
    discountPercentage: 24,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-5191430888-calca-jeans-country-masculina-costura-reforcada-kit-2-unid-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_646177-MLB98123467505_112025-E-calca-masculina-country-tradicional-rodeio-reforcada-premium.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_646177-MLB98123467505_112025-E-calca-masculina-country-tradicional-rodeio-reforcada-premium.webp',
    freeShipping: true,
    sellerName: 'Rodeio Jeans',
    ratings: 4.7,
    reviewsCount: 265,
    categoryName: 'Moda Country & Agro',
    installments: { quantity: 5, amount: 37.98, rate: 0 },
  },

  // ── Casa & Cozinha (Produtos Reais no Mercado Livre) ──────────────────────────
  {
    id: 'MLB-3561334997',
    title: 'Fritadeira Elétrica Air Fryer Philips Walita Série 1000 6.2L 1800W',
    headline: 'AIR FRYER WALITA GRANDE 6.2L NO MENOR PREÇO HISTÓRICO 🍟🔥👨‍🍳',
    price: 499.90,
    originalPrice: 699.00,
    discountPercentage: 28,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-3561334997-fritadeira-eletrica-air-fryer-philips-walita-serie-1000-62l-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_750953-MLB84333917467_052025-E.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_750953-MLB84333917467_052025-E.webp',
    freeShipping: true,
    sellerName: 'Philips Walita Loja Oficial',
    ratings: 4.8,
    reviewsCount: 1540,
    categoryName: 'Casa & Cozinha',
    installments: { quantity: 10, amount: 49.99, rate: 0 },
  },
  {
    id: 'MLB-3914957733',
    title: 'Cafeteira Nespresso Essenza Mini C30 Automática 19 Bar 127V',
    headline: 'NESPRESSO ESSENZA MINI COM SUPER DESCONTO ☕🔥🏠',
    price: 389.00,
    originalPrice: 499.00,
    discountPercentage: 22,
    currency_id: 'BRL',
    permalink: 'https://produto.mercadolivre.com.br/MLB-3914957733-cafeteira-nespresso-essenza-mini-c30-automatica-branca-127v-_JM',
    thumbnail: 'https://http2.mlstatic.com/D_Q_NP_2X_758778-MLA80429446820_112024-E.webp',
    fullImage: 'https://http2.mlstatic.com/D_Q_NP_2X_758778-MLA80429446820_112024-E.webp',
    freeShipping: true,
    sellerName: 'Nespresso Brasil',
    ratings: 4.9,
    reviewsCount: 3120,
    categoryName: 'Casa & Cozinha',
    installments: { quantity: 10, amount: 38.90, rate: 0 },
  },
];

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
  if (!url) return "https://http2.mlstatic.com/D_Q_NP_2X_735583-MLB110634453978_052026-E-chapeu-pralana-30x-farmer-calgary-aba-11-12951-3315.webp";
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
        const image = rawImg.startsWith("http") ? upgradeMLImage(rawImg) : "https://http2.mlstatic.com/D_Q_NP_2X_735583-MLB110634453978_052026-E-chapeu-pralana-30x-farmer-calgary-aba-11-12951-3315.webp";
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
          const img = item.thumbnail || "https://http2.mlstatic.com/D_Q_NP_2X_735583-MLB110634453978_052026-E-chapeu-pralana-30x-farmer-calgary-aba-11-12951-3315.webp";
          return { id: `MLB_REAL_${Date.now()}_${idx}`, title, headline: `🔥 OFERTA REAL: ${title.toUpperCase().slice(0, 38)}`, price, originalPrice: origPrice, discountPercentage: disc, currency_id: "BRL", permalink: validLink, thumbnail: img, fullImage: upgradeMLImage(img), freeShipping: item.freeShipping ?? true, sellerName: item.sellerName || "Mercado Livre", ratings: 4.8, reviewsCount: 320, categoryName: searchQuery };
        });
      }
    }
  } catch { /* fallback */ }
  return [];
}

function finalizeWithCoupon(deals: any[]): any[] {
  return (deals || []).map((deal) => {
    const calc = applyCouponDiscount(deal.price, deal.originalPrice, deal.discountPercentage);
    return {
      ...deal,
      price: calc.price,
      originalPrice: calc.originalPrice,
      discountPercentage: calc.discountPercentage,
      coupon: deal.coupon || "OFERTASEMPRE"
    };
  });
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
    if (liveScraped.length > 0) return res.json({ results: finalizeWithCoupon(liveScraped), paging: { total: liveScraped.length, offset: 0, limit: 24 }, query: searchQuery, source: "mercadolivre_live_html" });
    const groundedDeals = await searchRealMLWithGrounding(searchQuery);
    if (groundedDeals.length > 0) return res.json({ results: finalizeWithCoupon(groundedDeals), paging: { total: groundedDeals.length, offset: 0, limit: 24 }, query: searchQuery, source: "google_search_grounding" });
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
        return res.json({ results: finalizeWithCoupon(results), paging: data.paging || { total: results.length, offset: 0, limit: 24 }, query: searchQuery, source: "mercadolivre_api" });
      }
    }
  } catch { /* fallback */ }
  const searchTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
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
    casa: ["casa", "cozinha", "airfryer", "panela", "cafeteira"],
    gamer: ["gamer", "headset", "teclado", "monitor", "mouse"],
    ferramenta: ["ferramenta", "bosch", "makita", "parafusadeira", "furadeira"],
    beleza: ["beleza", "perfume", "maquiagem", "boticario", "natura"],
  };
  const expandedTerms = new Set<string>(searchTerms);
  searchTerms.forEach((term) => {
    Object.entries(SYNONYMS).forEach(([key, synonymList]) => {
      if (key === term || synonymList.includes(term)) synonymList.forEach((s) => expandedTerms.add(s));
    });
  });
  const allTerms = Array.from(expandedTerms);
  let matchedDeals: any[] = [];
  if (searchTerms.length > 0) {
    // 1. Try exact term matching first (e.g. title includes "bota" or "calca")
    matchedDeals = POPULAR_CURATED_DEALS.filter((d) => {
      const t = d.title.toLowerCase();
      return searchTerms.some((term) => t.includes(term));
    });

    // 2. If no direct matches, fallback to synonym matching
    if (matchedDeals.length === 0) {
      matchedDeals = POPULAR_CURATED_DEALS.filter((d) => {
        const t = d.title.toLowerCase();
        const c = (d.categoryName || "").toLowerCase();
        return allTerms.some((term) => t.includes(term) || c.includes(term));
      });
    }
  } else {
    matchedDeals = POPULAR_CURATED_DEALS;
  }

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
  return res.json({ results: finalizeWithCoupon(results), paging: { total: results.length, offset: 0, limit: 24 }, query: searchQuery, source: "curated_catalog" });
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
    const customQuery = ((req.query.q as string) || (req.query.query as string) || "").trim();
    const minDiscount = Number(req.query.minDiscount) || 0;
    const onlyFreeShipping = req.query.onlyFreeShipping === "true";
    const onlyWithCoupon = req.query.onlyWithCoupon === "true";
    const CATEGORY_SEARCH_MAP: Record<string, string> = {
      all: "ofertas relampago country agro",
      country: "chapeu country pralana bota texana goyazes cinto rodeio",
      bota: "bota texana country masculina feminina dgo couro",
      calca: "calca king farm muladeira carpinteira jeans country",
      camisa: "camisa xadrez country barretos manga longa",
      chapeu: "chapeu pralana country aba larga peao cavalgada",
      cinto: "cinto country couro fivela pampas sertaneja",
      cupons: "ofertas com desconto frete gratis cupom",
      agro: "chapeu pralana bota texana goyazes couro",
      tech: "smartphone celular fone bluetooth jbl",
      casa: "air fryer walita cafeteira robo aspirador",
      ferramentas: "parafusadeira furadeira bosch",
      beleza: "perfume malbec boticario importado"
    };
    const searchQuery = customQuery || CATEGORY_SEARCH_MAP[category] || category || "ofertas relampago";
    let liveCandidates: any[] = [];
    try { const scraped = await scrapeMercadoLivreHtml(searchQuery); if (scraped.length > 0) liveCandidates = scraped; } catch { /* fallback */ }
    if (liveCandidates.length === 0) { try { const grounded = await searchRealMLWithGrounding(searchQuery); if (grounded.length > 0) liveCandidates = grounded; } catch { /* fallback */ } }
    if (liveCandidates.length === 0) {
      liveCandidates = POPULAR_CURATED_DEALS.filter((d) => {
        const t = (d.title || "").toLowerCase();
        if (customQuery) {
          const q = customQuery.toLowerCase();
          const c = (d.categoryName || "").toLowerCase();
          const h = (d.headline || "").toLowerCase();
          return t.includes(q) || c.includes(q) || h.includes(q) || q.split(/\s+/).some((w) => t.includes(w) || c.includes(w));
        }
        if (category === "bota") return t.includes("bota") || t.includes("texana") || t.includes("botina") || t.includes("dgo");
        if (category === "calca") return t.includes("calça") || t.includes("calca") || t.includes("king farm") || t.includes("muladeira") || t.includes("carpinteira") || t.includes("jeans");
        if (category === "camisa") return t.includes("camisa") || t.includes("xadrez");
        if (category === "chapeu") return t.includes("chapéu") || t.includes("chapeu") || t.includes("pralana");
        if (category === "cinto") return t.includes("cinto") || t.includes("fivela");
        if (category === "cupons") return Boolean(d.coupon);
        return category === "all" || (d.categoryName || "").toLowerCase().includes(category.toLowerCase()) || t.includes(category.toLowerCase());
      });
      if (liveCandidates.length === 0) liveCandidates = POPULAR_CURATED_DEALS;
    }
    let filtered = liveCandidates.filter((d) => { if (minDiscount > 0 && (d.discountPercentage || 0) < minDiscount) return false; if (onlyFreeShipping && !d.freeShipping) return false; if (onlyWithCoupon && !d.coupon) return false; return true; });
    if (filtered.length === 0) filtered = liveCandidates;
    const selectedDeal = filtered[Math.floor(Math.random() * filtered.length)];
    const dealWithCoupon = finalizeWithCoupon([selectedDeal])[0];
    return res.json({ deal: dealWithCoupon, totalCandidates: filtered.length, source: selectedDeal.id.startsWith("MLB_SCRAPED") ? "mercadolivre_live" : "curated_deals", timestamp: new Date().toISOString() });
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
    const fallbackRes = await fetch("https://http2.mlstatic.com/D_Q_NP_2X_735583-MLB110634453978_052026-E-chapeu-pralana-30x-farmer-calgary-aba-11-12951-3315.webp");
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
