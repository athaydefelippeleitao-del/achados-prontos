// Image helpers and verified high-definition product image fallbacks

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'Moda & Agro': 'https://http2.mlstatic.com/D_Q_NP_2X_735583-MLB110634453978_052026-E-chapeu-pralana-30x-farmer-calgary-aba-11-12951-3315.webp',
  'Botas': 'https://http2.mlstatic.com/D_Q_NP_2X_804636-MLB86082899598_062025-E-bota-country-trisse-masculina-texana-couro-4country.webp',
  'Calças': 'https://http2.mlstatic.com/D_Q_NP_2X_857677-MLB84370784478_052025-E-calca-jeans-king-farm-black-carpinteira-country-5539.webp',
  'Camisas': 'https://http2.mlstatic.com/D_Q_NP_2X_842960-MLB87010746255_062025-E-camisa-masculina-radade-bordada-vermelha-barretos-erva.webp',
  'Chapéus': 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
  'Cintos': 'https://http2.mlstatic.com/D_Q_NP_2X_748154-MLB113338560227_062026-E-cinto-country-couro-ariat-fivela-grande-removivel-rodeio.webp',
  'Celulares & Tech': 'https://http2.mlstatic.com/D_Q_NP_2X_914580-MLA96684742299_102025-E.webp',
  'Casa & Cozinha': 'https://http2.mlstatic.com/D_Q_NP_2X_750953-MLB84333917467_052025-E.webp',
  'Gamer & PC': 'https://http2.mlstatic.com/D_Q_NP_2X_616335-MLA75317789772_032024-E.webp',
  'Áudio & Música': 'https://http2.mlstatic.com/D_Q_NP_2X_686121-MLB78310022216_082024-E.webp',
  'Ferramentas': 'https://http2.mlstatic.com/D_Q_NP_2X_885409-MLB71754020950_092023-E.webp',
  'Perfumaria & Beleza': 'https://http2.mlstatic.com/D_Q_NP_2X_838840-MLA53198889988_012023-E.webp',
  'Calçados & Roupas': 'https://http2.mlstatic.com/D_Q_NP_2X_804636-MLB86082899598_062025-E-bota-country-trisse-masculina-texana-couro-4country.webp',
  'Geral': 'https://http2.mlstatic.com/D_Q_NP_2X_735583-MLB110634453978_052026-E-chapeu-pralana-30x-farmer-calgary-aba-11-12951-3315.webp',
};

export const QUICK_IMAGE_PRESETS = [
  {
    name: 'Chapéu Country / Agro',
    url: 'https://http2.mlstatic.com/D_Q_NP_2X_702244-MLB31580586596_072019-E-chapeu-casual-alabama-pralana-original-cafe-aba8-frete-pago.webp',
    icon: '🤠',
  },
  {
    name: 'Bota Texana Couro',
    url: 'https://http2.mlstatic.com/D_Q_NP_2X_804636-MLB86082899598_062025-E-bota-country-trisse-masculina-texana-couro-4country.webp',
    icon: '👢',
  },
  {
    name: 'Calça King Farm Country',
    url: 'https://http2.mlstatic.com/D_Q_NP_2X_857677-MLB84370784478_052025-E-calca-jeans-king-farm-black-carpinteira-country-5539.webp',
    icon: '👖',
  },
  {
    name: 'Camisa Xadrez Barretos',
    url: 'https://http2.mlstatic.com/D_Q_NP_2X_842960-MLB87010746255_062025-E-camisa-masculina-radade-bordada-vermelha-barretos-erva.webp',
    icon: '👔',
  },
  {
    name: 'Cinto de Couro com Fivela',
    url: 'https://http2.mlstatic.com/D_Q_NP_2X_748154-MLB113338560227_062026-E-cinto-country-couro-ariat-fivela-grande-removivel-rodeio.webp',
    icon: '⭐',
  },
  {
    name: 'Airfryer / Fritadeira',
    url: 'https://http2.mlstatic.com/D_Q_NP_2X_750953-MLB84333917467_052025-E.webp',
    icon: '🍟',
  },
  {
    name: 'JBL / Caixa de Som',
    url: 'https://http2.mlstatic.com/D_Q_NP_2X_686121-MLB78310022216_082024-E.webp',
    icon: '🔊',
  },
  {
    name: 'Smartphone / Celular',
    url: 'https://http2.mlstatic.com/D_Q_NP_2X_914580-MLA96684742299_102025-E.webp',
    icon: '📱',
  },
  {
    name: 'Headset Gamer',
    url: 'https://http2.mlstatic.com/D_Q_NP_2X_616335-MLA75317789772_032024-E.webp',
    icon: '🎧',
  },
  {
    name: 'Cafeteira Espresso',
    url: 'https://http2.mlstatic.com/D_Q_NP_2X_758778-MLA80429446820_112024-E.webp',
    icon: '☕',
  },
];

export function getProductFallbackImage(title?: string, category?: string): string {
  if (category && CATEGORY_FALLBACK_IMAGES[category]) {
    return CATEGORY_FALLBACK_IMAGES[category];
  }
  const text = (title || '').toLowerCase();
  if (text.includes('calça') || text.includes('calca') || text.includes('king farm') || text.includes('muladeira') || text.includes('carpinteira')) {
    return CATEGORY_FALLBACK_IMAGES['Calças'];
  }
  if (text.includes('bota') || text.includes('texana') || text.includes('botina') || text.includes('goyazes') || text.includes('dgo')) {
    return CATEGORY_FALLBACK_IMAGES['Botas'];
  }
  if (text.includes('camisa') || text.includes('xadrez') || text.includes('polo')) {
    return CATEGORY_FALLBACK_IMAGES['Camisas'];
  }
  if (text.includes('chapéu') || text.includes('chapeu') || text.includes('pralana') || text.includes('karandá') || text.includes('karanda')) {
    return CATEGORY_FALLBACK_IMAGES['Chapéus'];
  }
  if (text.includes('cinto') || text.includes('fivela')) {
    return CATEGORY_FALLBACK_IMAGES['Cintos'];
  }
  if (text.includes('airfryer') || text.includes('fritadeira') || text.includes('panela') || text.includes('cozinha')) {
    return CATEGORY_FALLBACK_IMAGES['Casa & Cozinha'];
  }
  if (text.includes('jbl') || text.includes('som') || text.includes('caixa') || text.includes('boombox')) {
    return CATEGORY_FALLBACK_IMAGES['Áudio & Música'];
  }
  if (text.includes('celular') || text.includes('iphone') || text.includes('galaxy') || text.includes('smartphone')) {
    return CATEGORY_FALLBACK_IMAGES['Celulares & Tech'];
  }
  if (text.includes('gamer') || text.includes('headset') || text.includes('mouse') || text.includes('teclado')) {
    return CATEGORY_FALLBACK_IMAGES['Gamer & PC'];
  }
  if (text.includes('tenis') || text.includes('tênis') || text.includes('nike') || text.includes('sapato')) {
    return CATEGORY_FALLBACK_IMAGES['Calçados & Roupas'];
  }
  if (text.includes('furadeira') || text.includes('parafusadeira') || text.includes('bosch') || text.includes('ferramenta')) {
    return CATEGORY_FALLBACK_IMAGES['Ferramentas'];
  }
  if (text.includes('perfume') || text.includes('malbec') || text.includes('boticario') || text.includes('batom')) {
    return CATEGORY_FALLBACK_IMAGES['Perfumaria & Beleza'];
  }
  return CATEGORY_FALLBACK_IMAGES['Moda & Agro'];
}
