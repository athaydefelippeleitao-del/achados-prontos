/**
 * storage.ts — Persistent data layer for AchadosPronto.
 *
 * Each function tries Supabase first. If Supabase is not configured or the
 * request fails, it silently falls back to localStorage so the app keeps
 * working offline / without credentials.
 */

import { MessageTemplate, AffiliateSettings, SavedOffer, QueuedPromotion, QueueScheduleConfig } from '../types';
import { supabase, isSupabaseConfigured, getSessionId } from './supabase';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Ensures that this browser's session row exists in Supabase. */
async function ensureSession(): Promise<string> {
  const sessionId = getSessionId();
  if (!supabase) return sessionId;

  const { error } = await supabase
    .from('user_sessions')
    .upsert({ id: sessionId }, { onConflict: 'id', ignoreDuplicates: true });

  if (error) console.warn('[storage] ensureSession error:', error.message);
  return sessionId;
}

// ─── Templates ───────────────────────────────────────────────────────────────

const LS_TEMPLATES = 'achadospronto_templates';

export async function loadTemplates(): Promise<MessageTemplate[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const sessionId = await ensureSession();
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description ?? '',
          category: row.category as MessageTemplate['category'],
          content: row.content,
          isCustom: row.is_custom ?? false,
        }));
      }

      // First run with Supabase — seed with defaults
      await saveTemplates(DEFAULT_TEMPLATES);
      return DEFAULT_TEMPLATES;
    } catch (err: any) {
      console.warn('[storage] loadTemplates fallback to localStorage:', err?.message);
    }
  }

  // localStorage fallback
  try {
    const raw = localStorage.getItem(LS_TEMPLATES);
    return raw ? JSON.parse(raw) : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export async function saveTemplates(templates: MessageTemplate[]): Promise<void> {
  // Always keep localStorage in sync (fast reads on next refresh)
  localStorage.setItem(LS_TEMPLATES, JSON.stringify(templates));

  if (!isSupabaseConfigured || !supabase) return;

  try {
    const sessionId = await ensureSession();

    const rows = templates.map((t) => ({
      id: t.id,
      session_id: sessionId,
      name: t.name,
      description: t.description,
      category: t.category,
      content: t.content,
      is_custom: t.isCustom ?? false,
      updated_at: new Date().toISOString(),
    }));

    // Upsert all current templates
    const { error: upsertError } = await supabase
      .from('templates')
      .upsert(rows, { onConflict: 'id' });

    if (upsertError) throw upsertError;

    // Remove templates that were deleted (present in DB but not in current list)
    const currentIds = templates.map((t) => t.id);
    const { error: deleteError } = await supabase
      .from('templates')
      .delete()
      .eq('session_id', sessionId)
      .not('id', 'in', `(${currentIds.map((id) => `"${id}"`).join(',')})`);

    if (deleteError) console.warn('[storage] saveTemplates delete error:', deleteError.message);
  } catch (err: any) {
    console.warn('[storage] saveTemplates error:', err?.message);
  }
}

// ─── Saved Offers (History) ───────────────────────────────────────────────────

const LS_OFFERS = 'achadospronto_saved_offers';

export async function loadSavedOffers(): Promise<SavedOffer[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const sessionId = await ensureSession();
      const { data, error } = await supabase
        .from('saved_offers')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        return data.map((row) => ({
          id: row.id,
          title: row.title,
          headline: row.headline ?? '',
          price: row.price,
          originalPrice: row.original_price ?? null,
          coupon: row.coupon ?? undefined,
          link: row.link,
          imageUrl: row.image_url,
          formattedMessage: row.formatted_message,
          createdAt: row.created_at,
          favorite: row.favorite ?? false,
        }));
      }
    } catch (err: any) {
      console.warn('[storage] loadSavedOffers fallback to localStorage:', err?.message);
    }
  }

  try {
    const raw = localStorage.getItem(LS_OFFERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function upsertOffer(offer: SavedOffer, allOffers: SavedOffer[]): Promise<void> {
  localStorage.setItem(LS_OFFERS, JSON.stringify(allOffers));

  if (!isSupabaseConfigured || !supabase) return;

  try {
    const sessionId = await ensureSession();
    const { error } = await supabase.from('saved_offers').upsert(
      {
        id: offer.id,
        session_id: sessionId,
        title: offer.title,
        headline: offer.headline,
        price: offer.price,
        original_price: offer.originalPrice ?? null,
        coupon: offer.coupon ?? null,
        link: offer.link,
        image_url: offer.imageUrl,
        formatted_message: offer.formattedMessage,
        favorite: offer.favorite ?? false,
        created_at: offer.createdAt,
      },
      { onConflict: 'id' }
    );
    if (error) throw error;
  } catch (err: any) {
    console.warn('[storage] upsertOffer error:', err?.message);
  }
}

export async function deleteOffer(offerId: string, remaining: SavedOffer[]): Promise<void> {
  localStorage.setItem(LS_OFFERS, JSON.stringify(remaining));

  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { error } = await supabase.from('saved_offers').delete().eq('id', offerId);
    if (error) throw error;
  } catch (err: any) {
    console.warn('[storage] deleteOffer error:', err?.message);
  }
}

export async function clearAllOffers(): Promise<void> {
  localStorage.removeItem(LS_OFFERS);

  if (!isSupabaseConfigured || !supabase) return;

  try {
    const sessionId = getSessionId();
    const { error } = await supabase
      .from('saved_offers')
      .delete()
      .eq('session_id', sessionId);
    if (error) throw error;
  } catch (err: any) {
    console.warn('[storage] clearAllOffers error:', err?.message);
  }
}

// ─── Affiliate Settings ───────────────────────────────────────────────────────

const LS_AFFILIATE = 'achadospronto_affiliate_settings';

const DEFAULT_AFFILIATE: AffiliateSettings = {
  affiliateTag: '',
  channelName: 'Felipão',
  addCallToAction: true,
  customFooter: '',
};

export async function loadAffiliateSettings(): Promise<AffiliateSettings> {
  if (isSupabaseConfigured && supabase) {
    try {
      const sessionId = await ensureSession();
      const { data, error } = await supabase
        .from('affiliate_settings')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return {
          affiliateTag: data.affiliate_tag ?? '',
          customDomain: data.custom_domain ?? undefined,
          addCallToAction: data.add_call_to_action ?? true,
          customFooter: data.custom_footer ?? '',
          channelName: data.channel_name ?? 'Felipão',
        };
      }
    } catch (err: any) {
      console.warn('[storage] loadAffiliateSettings fallback:', err?.message);
    }
  }

  try {
    const raw = localStorage.getItem(LS_AFFILIATE);
    return raw ? JSON.parse(raw) : DEFAULT_AFFILIATE;
  } catch {
    return DEFAULT_AFFILIATE;
  }
}

export async function saveAffiliateSettings(settings: AffiliateSettings): Promise<void> {
  localStorage.setItem(LS_AFFILIATE, JSON.stringify(settings));

  if (!isSupabaseConfigured || !supabase) return;

  try {
    const sessionId = await ensureSession();
    const { error } = await supabase.from('affiliate_settings').upsert(
      {
        session_id: sessionId,
        affiliate_tag: settings.affiliateTag,
        custom_domain: settings.customDomain ?? null,
        add_call_to_action: settings.addCallToAction,
        custom_footer: settings.customFooter ?? null,
        channel_name: settings.channelName ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    );
    if (error) throw error;
  } catch (err: any) {
    console.warn('[storage] saveAffiliateSettings error:', err?.message);
  }
}

// ─── Queued Scheduled Promotions ─────────────────────────────────────────────

const LS_QUEUE = 'achados_scheduled_queue';
const LS_QUEUE_CONFIG = 'achados_queue_config';

export const DEFAULT_QUEUE_CONFIG: QueueScheduleConfig = {
  isRunning: false,
  intervalMinutes: 15,
  dispatchMethod: 'webhook',
  webhookUrl: localStorage.getItem('achados_whatsapp_webhook') || '',
  webhookSecret: localStorage.getItem('achados_whatsapp_secret') || '',
  soundAlert: true,
  autoLoop: false,
};

export function loadQueuedPromotions(): QueuedPromotion[] {
  try {
    const raw = localStorage.getItem(LS_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQueuedPromotions(queue: QueuedPromotion[]): void {
  try {
    localStorage.setItem(LS_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save queue to localStorage:', e);
  }
}

export function addPromotionToQueue(
  item: Omit<QueuedPromotion, 'id' | 'createdAt' | 'status'>
): QueuedPromotion {
  const current = loadQueuedPromotions();
  const newPromotion: QueuedPromotion = {
    ...item,
    id: 'queue-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    createdAt: Date.now(),
    status: 'pending',
  };
  current.push(newPromotion);
  saveQueuedPromotions(current);
  return newPromotion;
}

export function removePromotionFromQueue(id: string): QueuedPromotion[] {
  const current = loadQueuedPromotions();
  const updated = current.filter((item) => item.id !== id);
  saveQueuedPromotions(updated);
  return updated;
}

export function clearSentPromotionsFromQueue(): QueuedPromotion[] {
  const current = loadQueuedPromotions();
  const updated = current.filter((item) => item.status !== 'sent');
  saveQueuedPromotions(updated);
  return updated;
}

export function updateQueuedPromotion(id: string, partial: Partial<QueuedPromotion>): QueuedPromotion[] {
  const current = loadQueuedPromotions();
  const updated = current.map((item) => (item.id === id ? { ...item, ...partial } : item));
  saveQueuedPromotions(updated);
  return updated;
}

export function loadQueueConfig(): QueueScheduleConfig {
  try {
    const raw = localStorage.getItem(LS_QUEUE_CONFIG);
    if (!raw) return DEFAULT_QUEUE_CONFIG;
    return { ...DEFAULT_QUEUE_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_QUEUE_CONFIG;
  }
}

export function saveQueueConfig(config: QueueScheduleConfig): void {
  try {
    localStorage.setItem(LS_QUEUE_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save queue config to localStorage:', e);
  }
}

