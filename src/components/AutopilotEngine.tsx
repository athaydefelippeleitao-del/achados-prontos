import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Play, 
  Pause, 
  Zap, 
  Clock, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Settings2, 
  Sparkles, 
  RefreshCw, 
  ExternalLink, 
  Sliders, 
  SlidersHorizontal,
  Flame, 
  Check, 
  Copy, 
  Image as ImageIcon, 
  Volume2, 
  VolumeX, 
  Smartphone,
  Globe,
  Radio,
  Tag,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Search
} from 'lucide-react';
import { ProductDeal, MessageTemplate, AffiliateSettings, AutopilotConfig, AutopilotLogItem } from '../types';
import { formatMessage, formatCurrencyBRL } from '../utils/formatter';
import { POPULAR_CURATED_DEALS } from '../data/mockDeals';
import { getProductFallbackImage } from '../utils/imageHelpers';
import { WhatsAppGroupSenderModal } from './WhatsAppGroupSenderModal';

interface AutopilotEngineProps {
  templates: MessageTemplate[];
  selectedTemplateId: string;
  affiliateSettings: AffiliateSettings;
  onSelectDealForEditor: (deal: ProductDeal) => void;
}

const CATEGORIES = [
  { id: 'bota', label: '👢 Botas Texanas & DGO', query: 'bota texana country dgo' },
  { id: 'calca', label: '👖 Calças Country & King Farm', query: 'calca king farm muladeira carpinteira' },
  { id: 'camisa', label: '👔 Camisas Xadrez Barretos', query: 'camisa xadrez country barretos' },
  { id: 'chapeu', label: '🤠 Chapéus Pralana & Karandá', query: 'chapeu pralana country aba larga' },
  { id: 'cinto', label: '⭐ Cintos de Couro & Fivelas', query: 'cinto country couro fivela pampas' },
  { id: 'cupons', label: '🎟️ Só com Cupom OFERTASEMPRE', query: 'cupom desconto country' },
  { id: 'country', label: '🌾 Moda Country & Agro Geral', query: 'chapeu bota texana calca country' },
  { id: 'all', label: '🔥 Todas as Ofertas', query: 'ofertas relampago' },
];

const INTERVAL_OPTIONS = [
  { value: 0.5, label: '⚡ 30 segundos (Demonstração Rápida)' },
  { value: 1, label: '⏱️ 1 minuto' },
  { value: 3, label: '⏱️ 3 minutos' },
  { value: 5, label: '⏱️ 5 minutos (Recomendado para Grupos VIP)' },
  { value: 10, label: '⏱️ 10 minutos' },
  { value: 15, label: '⏱️ 15 minutos' },
  { value: 30, label: '⏱️ 30 minutos' },
  { value: 60, label: '⏱️ 1 hora' },
];

export const AutopilotEngine: React.FC<AutopilotEngineProps> = ({
  templates,
  selectedTemplateId,
  affiliateSettings,
  onSelectDealForEditor,
}) => {
  // Autopilot Configuration State
  const [config, setConfig] = useState<AutopilotConfig>(() => {
    try {
      const stored = localStorage.getItem('achados_autopilot_config');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      isEnabled: false,
      intervalMinutes: 1,
      category: 'country',
      minDiscount: 15,
      onlyFreeShipping: true,
      onlyWithCoupon: false,
      templateId: selectedTemplateId || 'felipao-ofertas',
      dispatchMethod: 'browser',
      webhookUrl: localStorage.getItem('achados_whatsapp_webhook') || '',
      webhookSecret: localStorage.getItem('achados_whatsapp_secret') || '',
      targetPhone: '',
      soundAlert: true,
    };
  });

  const [isRunning, setIsRunning] = useState(config.isEnabled);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(Math.round(config.intervalMinutes * 60));
  const [searchKeyword, setSearchKeyword] = useState('');
  const [logs, setLogs] = useState<AutopilotLogItem[]>(() => {
    try {
      const stored = localStorage.getItem('achados_autopilot_logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Remove outdated simulated IDs with old wrong prices
          return parsed.filter((item: AutopilotLogItem) => !item.deal?.id?.includes('2039481920'));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [isScanning, setIsScanning] = useState(false);
  const [lastDispatchedDeal, setLastDispatchedDeal] = useState<ProductDeal | null>(null);
  const [stats, setStats] = useState({
    scanned: 0,
    dispatched: 0,
    errors: 0,
  });

  // Modal for quick manual sending if triggered
  const [modalDeal, setModalDeal] = useState<{ deal: ProductDeal; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Save config when changed
  useEffect(() => {
    localStorage.setItem('achados_autopilot_config', JSON.stringify(config));
  }, [config]);

  // Save logs when updated
  useEffect(() => {
    localStorage.setItem('achados_autopilot_logs', JSON.stringify(logs.slice(0, 50)));
  }, [logs]);

  // Initial trigger if autopilot is active on mount
  useEffect(() => {
    if (isRunning && logs.length === 0) {
      performCycle();
    }
  }, []);

  const playNotificationSound = () => {
    if (!config.soundAlert) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio feedback error:', e);
    }
  };

  // Perform single scan and dispatch cycle
  const performCycle = async (forced = false, overrideCategory?: string, overrideQuery?: string) => {
    if (isScanning) return;
    setIsScanning(true);

    try {
      const activeCat = overrideCategory || config.category || 'country';
      const activeQ = overrideQuery !== undefined ? overrideQuery : searchKeyword;

      // 1. Fetch deal from server scanner
      const params = new URLSearchParams({
        category: activeCat,
        minDiscount: config.minDiscount.toString(),
        onlyFreeShipping: config.onlyFreeShipping.toString(),
        onlyWithCoupon: config.onlyWithCoupon.toString(),
      });
      if (activeQ && activeQ.trim()) {
        params.set('q', activeQ.trim());
      }

      const response = await fetch(`/api/autopilot/scan?${params.toString()}`);
      let deal: ProductDeal;

      if (response.ok) {
        const data = await response.json();
        deal = data.deal || POPULAR_CURATED_DEALS[Math.floor(Math.random() * POPULAR_CURATED_DEALS.length)];
      } else {
        deal = POPULAR_CURATED_DEALS[Math.floor(Math.random() * POPULAR_CURATED_DEALS.length)];
      }

      // 2. Format message with selected template
      const currentTemplate = templates.find((t) => t.id === config.templateId) || templates[0];
      const formattedMessage = formatMessage(deal, currentTemplate.content, affiliateSettings);

      setLastDispatchedDeal(deal);
      setStats((prev) => ({ ...prev, scanned: prev.scanned + 1 }));

      let status: AutopilotLogItem['status'] = 'queued';
      let statusDetails = '';

      // 3. Dispatch according to method
      if (config.dispatchMethod === 'webhook' && config.webhookUrl) {
        try {
          const webhookRes = await fetch('/api/whatsapp/send-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              webhookUrl: config.webhookUrl,
              secretKey: config.webhookSecret,
              message: formattedMessage,
              imageUrl: deal.fullImage || deal.thumbnail,
              title: deal.title,
              link: deal.permalink,
              targetPhone: config.targetPhone || undefined,
            }),
          });

          if (webhookRes.ok) {
            status = 'sent';
            statusDetails = 'Enviado com sucesso via Webhook';
            setStats((prev) => ({ ...prev, dispatched: prev.dispatched + 1 }));
          } else {
            status = 'error';
            const errData = await webhookRes.json().catch(() => ({}));
            statusDetails = errData.error || 'Erro no webhook';
            setStats((prev) => ({ ...prev, errors: prev.errors + 1 }));
          }
        } catch (err: any) {
          status = 'error';
          statusDetails = err.message || 'Falha na conexão do webhook';
          setStats((prev) => ({ ...prev, errors: prev.errors + 1 }));
        }
      } else if (config.dispatchMethod === 'browser') {
        // Browser queue mode
        status = 'opened';
        statusDetails = 'Pronto para disparo (Disponível na Fila / Notificado)';
        setStats((prev) => ({ ...prev, dispatched: prev.dispatched + 1 }));
      } else {
        // Simulation mode
        status = 'sent';
        statusDetails = 'Simulação concluída com sucesso';
        setStats((prev) => ({ ...prev, dispatched: prev.dispatched + 1 }));
      }

      playNotificationSound();

      // Add to Log
      const newLogItem: AutopilotLogItem = {
        id: 'log-' + Date.now(),
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        deal,
        formattedMessage,
        status,
        statusDetails,
      };

      setLogs((prev) => [newLogItem, ...prev]);
    } catch (err) {
      console.error('Autopilot cycle error:', err);
    } finally {
      setIsScanning(false);
      setSecondsRemaining(Math.round(config.intervalMinutes * 60));
    }
  };

  // Start / Stop Automation
  const toggleAutopilot = () => {
    const nextState = !isRunning;
    setIsRunning(nextState);
    setConfig((prev) => ({ ...prev, isEnabled: nextState }));

    if (nextState) {
      setSecondsRemaining(Math.round(config.intervalMinutes * 60));
      // Perform first cycle immediately
      performCycle();
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (!isRunning) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    countdownRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          performCycle();
          return Math.round(config.intervalMinutes * 60);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isRunning, config.intervalMinutes, config.category, config.templateId, config.dispatchMethod, config.webhookUrl]);

  const handleCopyLogMessage = async (msg: string, id: string) => {
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('Failed to copy log message:', e);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    localStorage.removeItem('achados_autopilot_logs');
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Autopilot Control Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                isRunning 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                <Radio className="w-3.5 h-3.5" />
                <span>{isRunning ? 'Piloto Automático Ativo' : 'Robô Pausado'}</span>
              </span>

              <span className="text-[11px] font-bold bg-yellow-400 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3 fill-slate-950" />
                100% Automático
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Robô de Ofertas do WhatsApp <span className="text-yellow-400">(Autopilot)</span>
            </h1>

            <p className="text-sm text-slate-300">
              O robô varre o Mercado Livre buscando as melhores oportunidades com desconto real, formata a mensagem com sua tag de afiliado e envia automaticamente para o seu grupo de promoções no intervalo que você definir.
            </p>
          </div>

          {/* Master Start / Stop Button & Timer */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-3 w-full lg:w-auto shrink-0">
            <button
              id="btn-toggle-autopilot-master"
              type="button"
              onClick={toggleAutopilot}
              className={`w-full sm:w-auto lg:w-64 py-4 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-2xl transition-all cursor-pointer ${
                isRunning
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-rose-600/30'
                  : 'bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba59] hover:to-[#0f7a6e] text-slate-950 shadow-[#25D366]/30'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-white" />
                  <span>Pausar Piloto Automático</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-slate-950" />
                  <span>Ligar Piloto Automático</span>
                </>
              )}
            </button>

            {/* Next Trigger Status Pill */}
            <div className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-yellow-400" />
                Próximo Envio:
              </span>
              <span className={`font-mono font-bold ${isRunning ? 'text-emerald-400' : 'text-slate-500'}`}>
                {isRunning ? formatTimer(secondsRemaining) : '--:--'}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">Ofertas Varredas</span>
            <span className="text-xl font-extrabold text-white mt-1 block">{stats.scanned}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">Disparos Concluídos</span>
            <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{stats.dispatched}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">Intervalo Atual</span>
            <span className="text-xl font-extrabold text-yellow-400 mt-1 block">{config.intervalMinutes} min</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">Status do Scanner</span>
            <span className="text-xs font-bold text-slate-200 mt-2 flex items-center gap-1.5">
              {isScanning ? (
                <>
                  <RefreshCw className="w-3 h-3 text-yellow-400 animate-spin" />
                  <span className="text-yellow-400">Varrendo Mercado Livre...</span>
                </>
              ) : isRunning ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-emerald-400">Aguardando timer</span>
                </>
              ) : (
                <span className="text-slate-400">Em espera</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Category Selection & Custom Search Banner for Autopilot */}
      <div className="bg-slate-900 border border-yellow-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Escolha o Nicho / Categoria de Ofertas</span>
                <span className="text-[10px] font-extrabold bg-yellow-400 text-slate-950 px-2 py-0.5 rounded-full">
                  1 Clique
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Selecione qual categoria o robô deve vasculhar ou pesquise produtos específicos abaixo.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Nicho ativo: <strong className="text-yellow-400 font-bold">{CATEGORIES.find((c) => c.id === config.category)?.label || '🤠 Country & Rodeio'}</strong>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setConfig((prev) => ({ ...prev, category: cat.id }));
                performCycle(true, cat.id, '');
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer flex items-center gap-1.5 ${
                config.category === cat.id
                  ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-lg shadow-yellow-500/20 font-extrabold scale-[1.02]'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Custom Search Box for Autopilot */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchKeyword.trim()) {
              performCycle(true, config.category, searchKeyword.trim());
            }
          }}
          className="flex flex-col sm:flex-row gap-2 pt-1"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Pesquisar termo específico: Chapéu Pralana, Bota Texana Goyazes, Cinto Country..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={isScanning}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-950" />
            <span>{isScanning ? 'Varrendo Mercado Livre...' : 'Buscar & Disparar Agora'}</span>
          </button>
        </form>

        {/* Country Quick Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-400 pt-0.5">
          <span className="font-semibold text-slate-300 shrink-0">Categorias Rápidas:</span>
          {[
            '👢 Botas Texanas',
            '👖 Calças King Farm',
            '👔 Camisas Xadrez',
            '🤠 Chapéus Pralana',
            '⭐ Cintos com Fivela',
            '🎟️ Cupom OFERTASEMPRE',
          ].map((tag, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                const query = tag.replace(/^[^\s]+\s/, '');
                setSearchKeyword(query);
                performCycle(true, 'country', query);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-yellow-400/10 text-slate-300 hover:text-yellow-300 border border-slate-800 text-[11px] whitespace-nowrap transition-colors cursor-pointer font-medium"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Settings & Right Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Autopilot Settings & Rules (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-yellow-400" />
                <span>Configurações do Robô</span>
              </h2>
              <button
                type="button"
                onClick={() => performCycle(true)}
                disabled={isScanning}
                className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Disparar 1 Oferta Agora</span>
              </button>
            </div>

            {/* 1. Intervalo de Disparo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Intervalo entre Postagens:</span>
                <span className="text-yellow-400 font-mono">{config.intervalMinutes} min</span>
              </label>
              <select
                value={config.intervalMinutes}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setConfig((prev) => ({ ...prev, intervalMinutes: val }));
                  setSecondsRemaining(Math.round(val * 60));
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Categoria / Nicho */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Nicho / Categoria Alvo:
              </label>
              <select
                value={config.category}
                onChange={(e) => setConfig((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Modelo de Mensagem */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Modelo de Texto para Gerar a Copy:
              </label>
              <select
                value={config.templateId}
                onChange={(e) => setConfig((prev) => ({ ...prev, templateId: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.category})
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Método de Disparo */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Método de Disparo para o WhatsApp:</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, dispatchMethod: 'browser' }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    config.dispatchMethod === 'browser'
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold block text-emerald-400">📱 Navegador / 1-Clique</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Fila ao vivo com alerta de nova oferta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, dispatchMethod: 'webhook' }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    config.dispatchMethod === 'webhook'
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold block text-yellow-400">🤖 Webhook / Bot API</span>
                  <span className="text-[10px] text-slate-400 block mt-1">100% Automático via Evolution / Z-API</span>
                </button>
              </div>

              {config.dispatchMethod === 'webhook' && (
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5 mt-2 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-300">URL do Webhook / Evolution API:</span>
                    <input
                      type="url"
                      value={config.webhookUrl || ''}
                      onChange={(e) => setConfig((prev) => ({ ...prev, webhookUrl: e.target.value }))}
                      placeholder="https://sua-api.com/message/sendText"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-300">Chave de API / Secret Token:</span>
                    <input
                      type="password"
                      value={config.webhookSecret || ''}
                      onChange={(e) => setConfig((prev) => ({ ...prev, webhookSecret: e.target.value }))}
                      placeholder="Bearer token ou apikey"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Filtros de Qualidade */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-300 block">Filtros de Qualidade das Ofertas:</span>

              <div className="space-y-2 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.onlyFreeShipping}
                    onChange={(e) => setConfig((prev) => ({ ...prev, onlyFreeShipping: e.target.checked }))}
                    className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 bg-slate-950"
                  />
                  <span>Apenas produtos com <strong>Frete Grátis</strong></span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.soundAlert}
                    onChange={(e) => setConfig((prev) => ({ ...prev, soundAlert: e.target.checked }))}
                    className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 bg-slate-950"
                  />
                  <span>Tocar <strong>aviso sonoro</strong> a cada nova oferta disparada</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Live Log & Recent Dispatches (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Feed de Disparos em Tempo Real</h2>
                  <p className="text-[11px] text-slate-400">Registro ao vivo de todas as promoções encontradas e enviadas</p>
                </div>
              </div>

              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Limpar Histórico
                </button>
              )}
            </div>

            {/* Empty State */}
            {logs.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                <Bot className="w-10 h-10 text-slate-600 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-slate-300">O robô está pronto para começar</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Clique no botão <strong>"Ligar Piloto Automático"</strong> acima ou em <strong>"Disparar 1 Oferta Agora"</strong> para ver as ofertas sendo geradas e enviadas em tempo real.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => performCycle(true)}
                  disabled={isScanning}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Disparar Primeira Oferta de Teste</span>
                </button>
              </div>
            ) : (
              /* Live Log List */
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {logs.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-850 hover:border-slate-750 transition-all space-y-3 shadow-md"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.deal.thumbnail || item.deal.fullImage || getProductFallbackImage(item.deal.title)}
                          alt={item.deal.title}
                          className="w-12 h-12 object-contain bg-white rounded-xl p-1 shrink-0 border border-slate-800"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-400">{item.timestamp}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                              item.status === 'sent'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : item.status === 'opened'
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {item.status === 'sent' ? '✅ Disparado' : item.status === 'opened' ? '📱 Pronto na Fila' : '⚠️ Erro'}
                            </span>
                          </div>
                          <h3 className="text-xs font-bold text-white line-clamp-1 mt-0.5">{item.deal.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-black text-yellow-400">{formatCurrencyBRL(item.deal.price)}</span>
                            {item.deal.originalPrice && item.deal.originalPrice > item.deal.price && (
                              <span className="text-[10px] text-slate-500 line-through">
                                {formatCurrencyBRL(item.deal.originalPrice)}
                              </span>
                            )}
                            {item.deal.discountPercentage ? (
                              <span className="text-[10px] bg-red-500/20 text-red-400 font-bold px-1.5 py-0.2 rounded">
                                -{item.deal.discountPercentage}% OFF
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setModalDeal({ deal: item.deal, message: item.formattedMessage })}
                          className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#25D366]/20 transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Enviar no Grupo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyLogMessage(item.formattedMessage, item.id)}
                          title="Copiar mensagem formatada"
                          className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition-colors cursor-pointer"
                        >
                          {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectDealForEditor(item.deal)}
                          title="Abrir no Editor de Mensagens"
                          className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-yellow-400 border border-slate-800 text-xs transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Action Bar inside each deal */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px]">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Tag className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="truncate max-w-[200px] sm:max-w-[300px]">Link: {item.deal.permalink}</span>
                      </div>

                      <a
                        href={item.deal.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-yellow-400 hover:text-yellow-300 font-bold flex items-center gap-1 hover:underline shrink-0"
                      >
                        <span>Ver no Mercado Livre</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Formatted Message Bubble Preview */}
                    <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto">
                      {item.formattedMessage}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Modal for specific deal dispatch */}
      {modalDeal && (
        <WhatsAppGroupSenderModal
          isOpen={true}
          onClose={() => setModalDeal(null)}
          rawMessage={modalDeal.message}
          imageUrl={modalDeal.deal.fullImage || modalDeal.deal.thumbnail || ''}
          productTitle={modalDeal.deal.title}
          productLink={modalDeal.deal.permalink}
        />
      )}
    </div>
  );
};
