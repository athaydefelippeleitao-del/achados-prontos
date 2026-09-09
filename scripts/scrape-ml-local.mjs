import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const USER_DATA_DIR = path.resolve(process.cwd(), '.ml_browser_session');

export async function runLocalScraper(options = {}) {
  const { 
    queries = [
      'calca jeans country masculina carpinteira',
      'calca king farm masculina original',
      'chapeu pralana original aba 10',
      'bota texana country masculina feminina couro',
      'cinto country couro fivela',
      'camisa country manga longa bordada'
    ],
    headless = false 
  } = options;

  console.log('🚀 Iniciando Chrome com perfil local persistente...');
  console.log(`📁 Perfil salvo em: ${USER_DATA_DIR}`);

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chrome',
    headless,
    viewport: { width: 1366, height: 868 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized'
    ],
  });

  const page = context.pages()[0] || await context.newPage();
  const allDeals = [];

  try {
    console.log('🎟️ Verificando acesso à Central de Cupons: https://www.mercadolivre.com.br/cupons ...');
    await page.goto('https://www.mercadolivre.com.br/cupons', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // Se redirecionou para tela de identificação / login
    if (page.url().includes('/login/') || page.url().includes('identification')) {
      console.log('\n======================================================');
      console.log('⚠️ CONTA NÃO CONECTADA AINDA!');
      console.log('👉 Por favor, faça login com sua conta do Mercado Livre na janela do Chrome aberta na sua tela.');
      console.log('⏳ Aguardando você se conectar (sua sessão ficará salva permanentemente)...');
      console.log('======================================================\n');

      let loggedIn = false;
      for (let i = 0; i < 5; i++) { // aguarda 10 segundos
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        if (!currentUrl.includes('/login/') && !currentUrl.includes('identification')) {
          console.log('🎉 Login detectado com sucesso! Sessão salva permanentemente.');
          loggedIn = true;
          break;
        }
      }

      if (!loggedIn) {
        console.log('⚠️ Prosseguindo com varredura de ofertas...');
      }
    } else {
      console.log('✅ Sessão ativa e conectada ao Mercado Livre!');
    }

    // Se estiver na página de cupons, extrai cupons disponíveis
    const activeCoupons = [];
    if (page.url().includes('/cupons')) {
      const coupons = await page.evaluate(() => {
        const list = [];
        const cards = Array.from(document.querySelectorAll('[class*="coupon"], .andes-card'));
        for (const c of cards) {
          const text = c.innerText || '';
          const codeMatch = text.match(/([A-Z0-9]{4,15})/);
          if (codeMatch && (text.includes('%') || text.toLowerCase().includes('off'))) {
            list.push(codeMatch[1]);
          }
        }
        return Array.from(new Set(list));
      });
      console.log(`🎟️ Cupons encontrados na sua conta: ${coupons.length}`);
      activeCoupons.push(...coupons);
    }

    // Varre as categorias Country
    for (const query of queries) {
      const searchUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(query)}_OrderId_PRICE_DISCOUNT`;
      console.log(`🔍 Buscando: ${query} ...`);
      
      try {
        await page.goto(searchUrl, { waitUntil: 'load', timeout: 30000 });
        await page.waitForSelector('.poly-card, .ui-search-layout__item', { timeout: 10000 });
        await page.waitForTimeout(2000);

        const items = await page.evaluate(() => {
          const results = [];
          const cards = Array.from(document.querySelectorAll('.poly-card, .ui-search-layout__item'));
          
          for (const card of cards) {
            try {
              const linkEl = card.querySelector('a.poly-component__title, a.ui-search-link, a');
              let permalink = linkEl?.href || '';
              if (!permalink) continue;

              // Extrai ID limpo do MLB e cria URL direta do produto
              let cleanId = '';
              const mlbMatch = permalink.match(/MLB[-_]?([0-9]+)/i);
              if (mlbMatch) {
                cleanId = 'MLB-' + mlbMatch[1];
                permalink = 'https://produto.mercadolivre.com.br/MLB-' + mlbMatch[1];
              } else {
                continue;
              }

              const titleEl = card.querySelector('.poly-component__title, .ui-search-item__title, h2');
              const title = titleEl?.textContent?.trim() || '';
              if (!title || title.length < 5) continue;

              const cardText = card.innerText || '';
              const freeShipping = /frete\s*gr[áa]tis/i.test(cardText);
              const discountMatch = cardText.match(/(\d+)%\s*OFF/i);
              let discountPercentage = discountMatch ? parseInt(discountMatch[1], 10) : 0;

              // Extrai valores em R$
              const cleanText = cardText.replace(/[\r\n]+/g, ' ').replace(/\s*,\s*/g, ',');
              const prices = Array.from(cleanText.matchAll(/R\$\s*(\d+)(?:,(\d{2}))?/g)).map(m => {
                return parseFloat(m[1] + '.' + (m[2] || '00'));
              });

              let price = prices[0] || 0;
              let originalPrice = null;

              if (discountPercentage > 0 && prices.length >= 2) {
                originalPrice = Math.max(prices[0], prices[1]);
                price = Math.min(prices[0], prices[1]);
              } else if (discountPercentage > 0 && prices.length >= 1) {
                price = prices[0];
                originalPrice = Math.round((price / (1 - discountPercentage/100)) * 100) / 100;
              } else if (prices.length >= 1) {
                price = prices[0];
              }

              if (price <= 0) continue;

              const imgEl = card.querySelector('img');
              let thumbnail = imgEl?.src || imgEl?.getAttribute('data-src') || '';
              if (thumbnail.startsWith('data:')) thumbnail = '';

              const couponEl = card.querySelector('.poly-component__coupons, .poly-coupon, [class*="coupon"], [class*="pill"]');
              let coupon = undefined;
              if (couponEl) {
                const cMatch = couponEl.textContent.match(/cupom\s*([A-Z0-9]+)/i);
                if (cMatch) coupon = cMatch[1];
              }

              results.push({
                id: cleanId,
                title,
                price,
                originalPrice: originalPrice || (discountPercentage > 0 ? Math.round(price / (1 - discountPercentage/100)) : null),
                discountPercentage,
                permalink,
                thumbnail,
                freeShipping,
                coupon,
                categoryName: 'Moda Country & Agro'
              });
            } catch (err) {}
          }
          return results;
        });

        console.log(`  ↳ Encontrados ${items.length} produtos em ${query}`);
        allDeals.push(...items);
      } catch (err) {
        console.warn(`  ⚠️ Erro ao buscar ${query}:`, err.message);
      }
    }

    // Se temos cupons ativos da conta, aplica nos produtos sem cupom
    if (activeCoupons.length > 0) {
      let couponIndex = 0;
      for (const d of allDeals) {
        if (!d.coupon) {
          d.coupon = activeCoupons[couponIndex % activeCoupons.length];
          couponIndex++;
        }
      }
    }

    // Carrega produtos existentes para não perder nada
    const outputPath = path.resolve(process.cwd(), 'src/data/liveScrapedCountryDeals.json');
    let existingDeals = [];
    if (fs.existsSync(outputPath)) {
      try {
        existingDeals = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      } catch {}
    }

    // Remove duplicados por ID, priorizando os novos
    const uniqueMap = new Map();
    for (const d of allDeals) {
      if (d.thumbnail && d.thumbnail.startsWith('http')) {
        uniqueMap.set(d.id, d);
      }
    }
    for (const d of existingDeals) {
      if (!uniqueMap.has(d.id) && d.thumbnail && d.thumbnail.startsWith('http')) {
        uniqueMap.set(d.id, d);
      }
    }
    const finalDeals = Array.from(uniqueMap.values());

    console.log(`\n🎯 Total de promoções reais capturadas e combinadas: ${finalDeals.length}`);

    fs.writeFileSync(outputPath, JSON.stringify(finalDeals, null, 2), 'utf-8');
    console.log(`💾 Salvo com sucesso em: ${outputPath}`);

    await context.close();
    return finalDeals;
  } catch (error) {
    console.error('❌ Erro no scraper:', error);
    try { await context.close(); } catch {}
    return [];
  }
}

if (process.argv[1]?.includes('scrape-ml-local')) {
  runLocalScraper().then(deals => {
    console.log(`🏁 Finalizado com ${deals.length} promoções reais!`);
  });
}
