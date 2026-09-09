export interface ProductDeal {
  id: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  discountPercentage?: number;
  currency_id: string;
  permalink: string;
  thumbnail: string;
  fullImage?: string;
  installments?: {
    quantity: number;
    amount: number;
    rate: number;
  } | null;
  freeShipping: boolean;
  condition?: string;
  sellerName?: string;
  ratings?: number;
  reviewsCount?: number;
  categoryName?: string;
  coupon?: string;
  headline?: string;
  inStock?: boolean;
}

export interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  category: 'padrao' | 'urgencia' | 'cupom' | 'minimalista' | 'detalhado' | 'personalizado';
  content: string;
  isCustom?: boolean;
}

export interface AffiliateSettings {
  affiliateTag: string; // e.g. "matt_tool=12345" or affiliate code
  customDomain?: string;
  addCallToAction: boolean;
  customFooter?: string;
  channelName?: string;
}

export interface AICopySuggestion {
  headline: string;
  emojiTheme: string;
  shortHook: string;
  suggestedCupomCallout?: string;
}

export interface SavedOffer {
  id: string;
  title: string;
  headline: string;
  price: number;
  originalPrice?: number | null;
  coupon?: string;
  link: string;
  imageUrl: string;
  formattedMessage: string;
  createdAt: string;
  favorite?: boolean;
}

export interface AutopilotConfig {
  isEnabled: boolean;
  intervalMinutes: number; // e.g. 0.5 (30s), 1, 3, 5, 10, 15, 30, 60
  category: string;
  minDiscount: number;
  onlyFreeShipping: boolean;
  onlyWithCoupon: boolean;
  templateId: string;
  dispatchMethod: 'webhook' | 'browser' | 'simulation';
  webhookUrl?: string;
  webhookSecret?: string;
  targetPhone?: string;
  soundAlert: boolean;
}

export interface AutopilotLogItem {
  id: string;
  timestamp: string;
  deal: ProductDeal;
  formattedMessage: string;
  status: 'sent' | 'queued' | 'error' | 'opened';
  statusDetails?: string;
}
