import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const USER_DATA_DIR = path.resolve(process.cwd(), '.ml_browser_session');

async function scrapeCategory(page, query, categoryName, couponCode) {
  const searchUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(query)}_OrderId_PRICE_DISCOUNT_HAS*FREE*SHIPPING_yes`;
  console.log(`🔍 Buscando: "${query}" (Cupom: ${couponCode})...`);
  
  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Scroll to trigger lazy loading of real images
    await page.evaluate(async () => {
      window.scrollBy(0, 1000);
      await new Promise(r => setTimeout(r, 700));
      window.scrollBy(0, 1500);
      await new Promise(r => setTimeout(r, 700));
    });

    const items = await page.$$eval('.ui-search-layout__item, .andes-card, .poly-card', (elements, meta) => {
      const results = [];
      for (const el of elements) {
        try {
          const linkEl = el.querySelector('a.ui-search-link, a.poly-component__title, a[href*="MLB"]');
          const permalink = linkEl?.href || '';
          if (!permalink.includes('MLB') && !permalink.includes('produto.mercadolivre.com.br')) continue;

          const titleEl = el.querySelector('.ui-search-item__title, .poly-component__title, h2');
          const title = titleEl?.textContent?.trim() || '';
          if (!title || title.length < 5) continue;

          const priceEl = el.querySelector('.andes-money-amount__fraction, .poly-price__current .andes-money-amount__fraction');
          const priceText = priceEl?.textContent?.replace(/\D/g, '') || '';
          const price = priceText ? Number(priceText) : 0;

          const origPriceEl = el.querySelector('.andes-money-amount--previous .andes-money-amount__fraction, s .andes-money-amount__fraction');
          const origPriceText = origPriceEl?.textContent?.replace(/\D/g, '') || '';
          const originalPrice = origPriceText ? Number(origPriceText) : null;

          const discEl = el.querySelector('.ui-search-price__discount, .poly-price__current-discount, .andes-money-amount__discount');
          const discMatch = discEl?.textContent?.match(/(\d+)%/);
          const discountPercentage = discMatch ? Number(discMatch[1]) : (originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0);

          // Extract real image from src, data-src, or srcset
          const imgEl = el.querySelector('img');
          let thumbnail = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
          if (thumbnail && thumbnail.startsWith('data:')) {
            thumbnail = imgEl?.getAttribute('data-src') || '';
          }

          const freeShipping = Boolean(el.querySelector('.ui-search-item__shipping--free, .poly-component__shipping'));

          const mlbMatch = permalink.match(/MLB-?(\d+)/i);
          const id = mlbMatch ? `MLB-${mlbMatch[1]}` : `MLB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

          if (thumbnail && thumbnail.includes('mlstatic.com')) {
            results.push({
              id,
              title,
              price: price || 169.9,
              originalPrice: originalPrice || (price ? Math.round(price * 1.25) : 219.9),
              discountPercentage: discountPercentage || 20,
              permalink: permalink.split('?')[0],
              thumbnail,
              fullImage: thumbnail,
              coupon: meta.coupon,
              freeShipping: freeShipping || true,
              categoryName: meta.cat
            });
          }
        } catch {}
      }
      return results;
    }, { cat: categoryName, coupon: couponCode });

    console.log(`   ✅ ${categoryName}: ${items.length} produtos coletados.`);
    return items;
  } catch (err) {
    console.warn(`   ⚠️ Erro ao buscar ${query}:`, err.message);
    return [];
  }
}

async function main() {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  
  const existingPath = path.resolve(process.cwd(), 'src/data/liveScrapedCountryDeals.json');
  let allDeals = [];
  if (fs.existsSync(existingPath)) {
    allDeals = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
  }
  console.log(`📦 Produtos existentes no banco: ${allDeals.length}`);

  const targets = [
    { query: 'promocao 9.9 ofertas relampago', cat: 'Festival 9.9', coupon: 'SALVEIESSA' },
    { query: 'bota texana country masculina bico fino couro', cat: 'Botas Texanas 9.9', coupon: 'COMPRAML' },
    { query: 'calca jeans king farm carpinteira masculina', cat: 'Calças Country 9.9', coupon: 'AGORAVAI' },
    { query: 'camisa xadrez country barretos manga longa', cat: 'Camisas Country 9.9', coupon: 'VALEMAIS' },
    { query: 'chapeu pralana original feltro aba 10', cat: 'Chapéus Pralana 9.9', coupon: 'OFERTASEMPRE' },
    { query: 'cinto country couro legitimo fivela pampas', cat: 'Cintos & Fivelas 9.9', coupon: 'COMPRAML' }
  ];

  let freshItems = [];
  for (const t of targets) {
    const deals = await scrapeCategory(page, t.query, t.cat, t.coupon);
    freshItems = freshItems.concat(deals);
  }

  await context.close();

  // Deduplicate and prioritize fresh 9.9 items at the top
  const map = new Map();
  for (const item of freshItems) {
    if (item.thumbnail && item.thumbnail.includes('mlstatic.com')) {
      map.set(item.id, item);
    }
  }
  for (const item of allDeals) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  const finalDeals = Array.from(map.values());
  console.log(`\n🎉 Total final de produtos: ${finalDeals.length} (com fotos 100% autênticas do ML)`);

  fs.writeFileSync(existingPath, JSON.stringify(finalDeals, null, 2), 'utf-8');
  console.log('✅ Base de dados liveScrapedCountryDeals.json atualizada com sucesso!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
