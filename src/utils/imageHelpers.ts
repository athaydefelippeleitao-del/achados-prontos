// Image helpers and verified high-definition product image fallbacks

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'Moda & Agro': 'https://images.unsplash.com/photo-1533827432537-70133748f5c8?w=800&auto=format&fit=crop&q=80',
  'Celulares & Tech': 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80',
  'Casa & Cozinha': 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&auto=format&fit=crop&q=80',
  'Gamer & PC': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
  'Áudio & Música': 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
  'Ferramentas': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
  'Perfumaria & Beleza': 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=80',
  'Calçados & Roupas': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
  'Geral': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
};

export const QUICK_IMAGE_PRESETS = [
  {
    name: 'Chapéu Country / Agro',
    url: 'https://images.unsplash.com/photo-1533827432537-70133748f5c8?w=800&auto=format&fit=crop&q=80',
    icon: '🤠',
  },
  {
    name: 'Bota Texana Couro',
    url: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&auto=format&fit=crop&q=80',
    icon: '👢',
  },
  {
    name: 'Airfryer / Fritadeira',
    url: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&auto=format&fit=crop&q=80',
    icon: '🍟',
  },
  {
    name: 'JBL / Caixa de Som',
    url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
    icon: '🔊',
  },
  {
    name: 'Smartphone / Celular',
    url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80',
    icon: '📱',
  },
  {
    name: 'Headset Gamer',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    icon: '🎧',
  },
  {
    name: 'Tênis Esportivo',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
    icon: '👟',
  },
  {
    name: 'Furadeira / Ferramentas',
    url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
    icon: '🛠️',
  },
  {
    name: 'Perfume / Cosméticos',
    url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=80',
    icon: '✨',
  },
  {
    name: 'Cafeteira Espresso',
    url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&auto=format&fit=crop&q=80',
    icon: '☕',
  },
];

export function getProductFallbackImage(title?: string, category?: string): string {
  if (category && CATEGORY_FALLBACK_IMAGES[category]) {
    return CATEGORY_FALLBACK_IMAGES[category];
  }
  const text = (title || '').toLowerCase();
  if (text.includes('chapéu') || text.includes('pralana') || text.includes('texan') || text.includes('agro')) {
    return CATEGORY_FALLBACK_IMAGES['Moda & Agro'];
  }
  if (text.includes('bota') || text.includes('goyazes') || text.includes('couro')) {
    return CATEGORY_FALLBACK_IMAGES['Moda & Agro'];
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
  return CATEGORY_FALLBACK_IMAGES['Geral'];
}
