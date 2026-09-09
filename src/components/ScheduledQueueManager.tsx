import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
  Send, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Settings, 
  RefreshCw, 
  Plus, 
  ExternalLink, 
  Eye, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  Bot,
  Zap,
  Tag,
  Check,
  Smartphone,
  Flame,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { QueuedPromotion, QueueScheduleConfig, ProductDeal, MessageTemplate, AffiliateSettings } from '../types';
import { 
  loadQueuedPromotions, 
  saveQueuedPromotions, 
  loadQueueConfig, 
  saveQueueConfig, 
  clearSentPromotionsFromQueue 
} from '../lib/storage';
import { formatCurrencyBRL } from '../utils/formatter';
import { getProductFallbackImage } from '../utils/imageHelpers';
import { POPULAR_CURATED_DEALS, CAMPAIGN_99_COUPONS } from '../data/mockDeals';

interface ScheduledQueueManagerProps {
  queue: QueuedPromotion[];
  setQueue: React.Dispatch<React.SetStateAction<QueuedPromotion[]>>;
  templates: MessageTemplate[];
  affiliateSettings: AffiliateSettings;
  onOpenExplorer: () => void;
  onSelectDealForEditor: (deal: ProductDeal) => void;
}

const INTERVAL_PRESETS = [
  { value: 0.5, label: '⚡ 30 segundos (Demonstração Rápida)' },
  { value: 1, label: '⏱️ 1 minuto' },
  { value: 3, label: '⏱️ 3 minutos' },
  { value: 5, label: '⏱️ 5 minutos' },
  { value: 10, label: '⏱️ 10 minutos' },
  { value: 15, label: '⏱️ 15 minutos (Recomendado para Grupos VIP)' },
  { value: 30, label: '⏱️ 30 minutos' },
  { value: 60, label: '⏱️ 1 hora' },
  { value: 120, label: '⏱️ 2 horas' },
];

export const ScheduledQueueManager: React.FC<ScheduledQueueManagerProps> = ({
  queue,
  setQueue,
  templates,
  affiliateSettings,
  onOpenExplorer,
  onSelectDealForEditor,
}) => {
  const [config, setConfig] = useState<QueueScheduleConfig>(() => loadQueueConfig());
  const [timeRemaining, setTimeRemaining] = useState<number>(() => Math.round(config.intervalMinutes * 60));
  const [isDispatching, setIsDispatching] = useState(false);
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Persist config whenever changed
  useEffect(() => {
    saveQueueConfig(config);
  }, [config]);

  // Sync queue to storage whenever changed
  useEffect(() => {
    saveQueuedPromotions(queue);
  }, [queue]);

  // Audio feedback synthesizer
  const playChime = () => {
    if (!config.soundAlert) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch (e) {
      console.warn('Audio chime failed:', e);
    }
  };

  // Dispatch a specific promotion item
  const dispatchItem = async (item: QueuedPromotion): Promise<boolean> => {
    setIsDispatching(true);

    try {
      if (config.dispatchMethod === 'webhook' && config.webhookUrl) {
        // Webhook dispatch (Evolution API, Z-API, Baileys, n8n)
        const response = await fetch('/api/whatsapp/send-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl: config.webhookUrl,
            secretKey: config.webhookSecret,
            message: item.formattedMessage,
            imageUrl: item.imageUrl,
            title: item.deal.title,
            link: item.deal.permalink,
            targetPhone: config.targetPhone || item.targetPhoneOrGroup || undefined,
          }),
        });

        if (response.ok) {
          playChime();
          const sentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: 'sent', sentAt: sentTime } : q
            )
          );
          showToast(`✅ "${item.deal.title.slice(0, 28)}..." disparado com sucesso via Webhook!`);
          return true;
        } else {
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: 'failed' } : q))
          );
          showToast(`❌ Erro no webhook ao disparar "${item.deal.title.slice(0, 24)}..."`);
          return false;
        }
      } else {
        // WhatsApp Web / Direct Mode
        playChime();
        const encoded = encodeURIComponent(item.formattedMessage);
        const url = config.targetPhone
          ? `https://web.whatsapp.com/send?phone=${config.targetPhone.replace(/\D/g, '')}&text=${encoded}`
          : `https://web.whatsapp.com/send?text=${encoded}`;
        
        window.open(url, '_blank');
        const sentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'sent', sentAt: sentTime } : q
          )
        );
        showToast(`📲 "${item.deal.title.slice(0, 28)}..." aberto no WhatsApp Web!`);
        return true;
      }
    } catch (err: any) {
      console.error('Dispatch error:', err);
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'failed' } : q))
      );
      showToast(`⚠️ Falha ao conectar: ${err.message}`);
      return false;
    } finally {
      setIsDispatching(false);
    }
  };

  // Trigger next pending promotion in the queue
  const triggerNextInQueue = async () => {
    const nextItem = queue.find((item) => item.status === 'pending');
    if (!nextItem) {
      if (config.autoLoop && queue.length > 0) {
        // Reset all sent items to pending to loop through them again
        setQueue((prev) => prev.map((q) => ({ ...q, status: 'pending', sentAt: undefined })));
        showToast('🔁 Todos os itens foram enviados! Reiniciando fila em loop...');
      } else {
        setConfig((prev) => ({ ...prev, isRunning: false }));
        showToast('🏁 Todas as promoções da fila foram enviadas com sucesso!');
      }
      return;
    }

    await dispatchItem(nextItem);
    setTimeRemaining(Math.round(config.intervalMinutes * 60));
  };

  // Main Countdown Timer Effect
  useEffect(() => {
    if (!config.isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          triggerNextInQueue();
          return Math.round(config.intervalMinutes * 60);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [config.isRunning, config.intervalMinutes, queue, config.autoLoop]);

  // Format seconds into mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Queue manipulation actions
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= queue.length) return;

    const newQueue = [...queue];
    const [moved] = newQueue.splice(index, 1);
    newQueue.splice(targetIdx, 0, moved);
    setQueue(newQueue);
  };

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearSent = () => {
    const remaining = clearSentPromotionsFromQueue();
    setQueue(remaining);
    showToast('🧹 Itens já enviados foram removidos da fila.');
  };

  const handleResetAllToPending = () => {
    setQueue((prev) => prev.map((item) => ({ ...item, status: 'pending', sentAt: undefined })));
    setTimeRemaining(Math.round(config.intervalMinutes * 60));
    showToast('🔄 Todas as promoções voltaram para o status "Pendente".');
  };

  const handleSeedFestival99 = () => {
    // Pick 5 top authentic 9.9 deals with coupons
    const selection = POPULAR_CURATED_DEALS.slice(0, 5).map((deal, idx) => {
      const couponCode = CAMPAIGN_99_COUPONS[idx % CAMPAIGN_99_COUPONS.length].code;
      const finalPrice = Math.round(deal.price * (1 - (couponCode === 'SALVEIESSA' ? 0.25 : 0.22)) * 100) / 100;
      const message = `🔥 *${deal.title.toUpperCase().slice(0, 45)}* 🤠🌾\n\n⚠️ Cupom: *${couponCode}*\n💰 De: ~${formatCurrencyBRL(deal.originalPrice || deal.price * 1.25)}~\n🔥 Por: *${formatCurrencyBRL(finalPrice)} no pix*\n🚚 Frete Grátis Full 🚚⚡\n\n🛒 Compre aqui 👉 ${deal.permalink}`;
      
      return {
        id: 'seed-' + Date.now() + '-' + idx,
        createdAt: Date.now() + idx,
        deal: { ...deal, coupon: couponCode, price: finalPrice },
        formattedMessage: message,
        imageUrl: deal.fullImage || deal.thumbnail,
        coupon: couponCode,
        status: 'pending' as const,
      };
    });

    setQueue((prev) => [...prev, ...selection]);
    showToast('🎉 5 promoções do Festival 9.9 foram adicionadas à sua fila!');
  };

  const pendingCount = queue.filter((i) => i.status === 'pending').length;
  const sentCount = queue.filter((i) => i.status === 'sent').length;

  return (
    <div className="space-y-6">
      {/* Toast feedback notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border-2 border-yellow-400 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Main Banner & Scheduler Dashboard */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fila & Agendador de Envios no WhatsApp</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Armazene suas promoções e envie no <span className="text-emerald-400">tempo que você quiser</span>!
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Guarde ofertas com fotos oficiais e cupons do Festival 9.9. Escolha a frequência de disparo e deixe o sistema enviar automaticamente para seus grupos ou contatos do WhatsApp.
            </p>
          </div>

          {/* Quick Stat Pill Cards */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center min-w-[100px]">
              <span className="text-xs text-slate-400 block font-medium">Na Fila</span>
              <span className="text-2xl font-black text-yellow-400">{pendingCount}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center min-w-[100px]">
              <span className="text-xs text-slate-400 block font-medium">Já Enviados</span>
              <span className="text-2xl font-black text-emerald-400">{sentCount}</span>
            </div>

            <div className={`p-3.5 rounded-2xl border text-center min-w-[140px] transition-all ${
              config.isRunning
                ? 'bg-emerald-950/50 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-950/80 border-slate-800'
            }`}>
              <span className="text-xs text-slate-400 block font-medium">
                {config.isRunning ? 'Próximo Envio' : 'Fila Pausada'}
              </span>
              <span className={`text-2xl font-mono font-black ${
                config.isRunning ? 'text-emerald-300 animate-pulse' : 'text-slate-500'
              }`}>
                {config.isRunning ? formatTime(timeRemaining) : '--:--'}
              </span>
            </div>
          </div>
        </div>

        {/* Master Controls Toolbar */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Start / Pause Button */}
            <button
              onClick={() => {
                const nextRunning = !config.isRunning;
                setConfig((prev) => ({ ...prev, isRunning: nextRunning }));
                if (nextRunning) {
                  setTimeRemaining(Math.round(config.intervalMinutes * 60));
                  showToast('▶️ Fila iniciada! O cronômetro de envios está ativo.');
                } else {
                  showToast('⏸️ Fila pausada.');
                }
              }}
              disabled={queue.length === 0}
              className={`px-6 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer ${
                config.isRunning
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {config.isRunning ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
              <span>{config.isRunning ? 'Pausar Fila Automática' : 'Iniciar Fila Automática'}</span>
            </button>

            {/* Interval Selector */}
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl px-3 py-2">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-400 font-bold shrink-0 hidden sm:inline">Enviar a cada:</span>
              <select
                value={config.intervalMinutes}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setConfig((prev) => ({ ...prev, intervalMinutes: val }));
                  setTimeRemaining(Math.round(val * 60));
                  showToast(`⏱️ Intervalo atualizado para ${e.target.selectedOptions[0].text}`);
                }}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {INTERVAL_PRESETS.map((p) => (
                  <option key={p.value} value={p.value} className="bg-slate-900 text-white">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Trigger Next Now Button */}
            <button
              onClick={triggerNextInQueue}
              disabled={isDispatching || pendingCount === 0}
              className="px-4 py-3 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs shadow-md shadow-yellow-500/10 flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Disparar a próxima promoção da fila agora sem esperar o relógio"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Disparar Próxima Agora</span>
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {/* Sound Toggle */}
            <button
              onClick={() => setConfig((prev) => ({ ...prev, soundAlert: !prev.soundAlert }))}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                config.soundAlert
                  ? 'bg-slate-800 text-emerald-400 border-slate-700'
                  : 'bg-slate-950 text-slate-500 border-slate-850'
              }`}
              title={config.soundAlert ? 'Som ao disparar: Ativado' : 'Som ao disparar: Mudo'}
            >
              {config.soundAlert ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Settings Modal Button */}
            <button
              onClick={() => setShowConfigModal(true)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Configurar Webhook e Destino WhatsApp"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Queue Items Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-yellow-400" />
            <h2 className="text-base font-extrabold text-white">
              Promoções Armazenadas ({queue.length})
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {sentCount > 0 && (
              <>
                <button
                  onClick={handleClearSent}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Enviados ({sentCount})</span>
                </button>

                <button
                  onClick={handleResetAllToPending}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-yellow-400 border border-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reenviar Todos</span>
                </button>
              </>
            )}

            <button
              onClick={onOpenExplorer}
              className="px-4 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs shadow-md shadow-yellow-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buscar Mais Produtos</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {queue.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-yellow-400">
              <Clock className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-bold text-white">Sua fila de promoções está vazia</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Navegue pelo Radar de Ofertas ou gere mensagens personalizadas e clique no botão 
                <span className="text-yellow-400 font-bold"> "Guardar na Fila"</span> para programar seus envios!
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              <button
                onClick={handleSeedFestival99}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-yellow-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Flame className="w-4 h-4" />
                <span>Carregar 5 Sugestões do Festival 9.9</span>
              </button>

              <button
                onClick={onOpenExplorer}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                Explorar Ofertas
              </button>
            </div>
          </div>
        ) : (
          /* Cards List */
          <div className="space-y-3">
            {queue.map((item, index) => {
              const isPending = item.status === 'pending';
              const isSent = item.status === 'sent';
              const isFailed = item.status === 'failed';
              const isExpanded = expandedPreviewId === item.id;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all p-4 flex flex-col gap-3 ${
                    isSent
                      ? 'bg-slate-950/40 border-slate-850 opacity-80'
                      : isFailed
                      ? 'bg-red-950/20 border-red-800/40'
                      : 'bg-slate-950/90 border-slate-800 hover:border-yellow-500/40 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    {/* Left: Thumbnail & Info */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 p-1 shrink-0 overflow-hidden relative flex items-center justify-center">
                        <img
                          src={item.imageUrl || item.deal.thumbnail || getProductFallbackImage(item.deal.title)}
                          alt={item.deal.title}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getProductFallbackImage(item.deal.title);
                          }}
                        />
                        {item.coupon && (
                          <div className="absolute bottom-0 inset-x-0 bg-yellow-400 text-slate-950 text-[9px] font-black text-center truncate px-0.5">
                            {item.coupon}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            #{index + 1}
                          </span>

                          {isPending && (
                            <span className="text-[10px] font-bold text-yellow-300 bg-yellow-950/60 border border-yellow-700/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              Na Fila (Próximo)
                            </span>
                          )}

                          {isSent && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Enviado {item.sentAt ? `às ${item.sentAt}` : ''}
                            </span>
                          )}

                          {isFailed && (
                            <span className="text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-700/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertCircle className="w-2.5 h-2.5" />
                              Falha no Disparo
                            </span>
                          )}

                          {item.deal.freeShipping && (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                              FULL ⚡
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                          {item.deal.title}
                        </h4>

                        <div className="flex items-baseline gap-2 text-xs">
                          <span className="text-yellow-400 font-extrabold">
                            {formatCurrencyBRL(item.deal.price)}
                          </span>
                          {item.deal.originalPrice && item.deal.originalPrice > item.deal.price && (
                            <span className="text-slate-500 line-through text-[11px]">
                              {formatCurrencyBRL(item.deal.originalPrice)}
                            </span>
                          )}
                          {item.coupon && (
                            <span className="text-[10px] text-emerald-400 font-medium">
                              com cupom {item.coupon}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Move Up / Down */}
                      <div className="flex items-center border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
                        <button
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                          title="Subir posição na fila"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === queue.length - 1}
                          className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                          title="Descer posição na fila"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Preview Toggle */}
                      <button
                        onClick={() => setExpandedPreviewId(isExpanded ? null : item.id)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          isExpanded
                            ? 'bg-yellow-400 text-slate-950 border-yellow-400'
                            : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
                        }`}
                        title="Ver texto da mensagem"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Dispatch Now Button */}
                      <button
                        onClick={() => dispatchItem(item)}
                        disabled={isDispatching}
                        className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/10 transition-all cursor-pointer disabled:opacity-50"
                        title="Enviar para o WhatsApp agora"
                      >
                        <Send className="w-3 h-3" />
                        <span className="hidden sm:inline">Disparar</span>
                      </button>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors cursor-pointer"
                        title="Remover da fila"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Message Preview Box */}
                  {isExpanded && (
                    <div className="mt-2 pt-3 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold text-white flex items-center gap-1">
                          <Smartphone className="w-3 h-3 text-emerald-400" />
                          Mensagem Pronta do WhatsApp:
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.formattedMessage);
                            showToast('📋 Texto copiado para a área de transferência!');
                          }}
                          className="text-[11px] text-yellow-400 hover:underline cursor-pointer"
                        >
                          Copiar Texto
                        </button>
                      </div>

                      <pre className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {item.formattedMessage}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings Modal (Webhook & Dispatch Config) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-bold text-white">Configurações de Disparo no WhatsApp</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Dispatch Method */}
              <div>
                <label className="block font-bold text-slate-200 mb-1.5">
                  Método de Envio para os Grupos:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, dispatchMethod: 'webhook' }))}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      config.dispatchMethod === 'webhook'
                        ? 'bg-yellow-400/10 border-yellow-400 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Webhook / API (100% Automático)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Evolution API, Z-API, Baileys ou n8n
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, dispatchMethod: 'whatsapp_web' }))}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      config.dispatchMethod === 'whatsapp_web'
                        ? 'bg-emerald-400/10 border-emerald-400 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp Web / Desktop</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Abre a aba pronta para enviar em 1 clique
                    </span>
                  </button>
                </div>
              </div>

              {/* Webhook URL input */}
              {config.dispatchMethod === 'webhook' && (
                <div className="space-y-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      URL do Webhook:
                    </label>
                    <input
                      type="text"
                      value={config.webhookUrl || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig((prev) => ({ ...prev, webhookUrl: val }));
                        localStorage.setItem('achados_whatsapp_webhook', val);
                      }}
                      placeholder="https://sua-api.com/message/sendText/grupo"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Chave / Token Secreto (Opcional):
                    </label>
                    <input
                      type="password"
                      value={config.webhookSecret || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig((prev) => ({ ...prev, webhookSecret: val }));
                        localStorage.setItem('achados_whatsapp_secret', val);
                      }}
                      placeholder="Ex: apikey_123456"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                  </div>
                </div>
              )}

              {/* Target Phone or Group ID */}
              <div>
                <label className="block font-bold text-slate-200 mb-1">
                  ID do Grupo ou Número de Telefone (Opcional):
                </label>
                <input
                  type="text"
                  value={config.targetPhone || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, targetPhone: e.target.value }))}
                  placeholder="Ex: 5511999999999 ou 12036302484920492@g.us"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                />
                <span className="text-[11px] text-slate-500 block mt-1">
                  Se vazio, o WhatsApp abrirá para você selecionar o grupo na hora.
                </span>
              </div>

              {/* Auto Loop Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={config.autoLoop}
                  onChange={(e) => setConfig((prev) => ({ ...prev, autoLoop: e.target.checked }))}
                  className="w-4 h-4 rounded text-emerald-400 focus:ring-emerald-400 bg-slate-950 border-slate-700"
                />
                <span className="text-slate-300 font-medium">
                  Repetir Fila em Loop (ao terminar todos os envios, recomeçar do primeiro)
                </span>
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  showToast('💾 Configurações salvas!');
                }}
                className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-yellow-500/20"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
