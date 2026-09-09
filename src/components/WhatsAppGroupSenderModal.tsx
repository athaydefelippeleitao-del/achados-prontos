import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  Smartphone, 
  Globe, 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  ExternalLink,
  Zap,
  Users,
  CheckCheck,
  Bot,
  Link2,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { renderWhatsAppMarkdown } from '../utils/formatter';

interface WhatsAppGroupSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawMessage: string;
  imageUrl: string;
  productTitle: string;
  productLink?: string;
}

interface SavedGroup {
  id: string;
  name: string;
  phoneOrLink?: string;
  notes?: string;
}

export const WhatsAppGroupSenderModal: React.FC<WhatsAppGroupSenderModalProps> = ({
  isOpen,
  onClose,
  rawMessage,
  imageUrl,
  productTitle,
  productLink,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedCombo, setCopiedCombo] = useState(false);
  const [targetPhone, setTargetPhone] = useState('');
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('achados_whatsapp_webhook') || '');
  const [webhookSecret, setWebhookSecret] = useState(() => localStorage.getItem('achados_whatsapp_secret') || '');
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [webhookSuccess, setWebhookSuccess] = useState<string | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);

  // Saved Groups List
  const [savedGroups, setSavedGroups] = useState<SavedGroup[]>(() => {
    try {
      const stored = localStorage.getItem('achados_saved_groups');
      return stored ? JSON.parse(stored) : [
        { id: '1', name: '🔥 Grupo VIP Ofertas 01', phoneOrLink: '' },
        { id: '2', name: '⚡ Achadinhos Mercado Livre', phoneOrLink: '' },
      ];
    } catch {
      return [];
    }
  });
  const [newGroupName, setNewGroupName] = useState('');

  if (!isOpen) return null;

  const encodedMessage = encodeURIComponent(rawMessage);
  const directWhatsAppUrl = targetPhone.trim() 
    ? `https://api.whatsapp.com/send?phone=${targetPhone.replace(/\D/g, '')}&text=${encodedMessage}`
    : `https://api.whatsapp.com/send?text=${encodedMessage}`;

  const webWhatsAppUrl = targetPhone.trim()
    ? `https://web.whatsapp.com/send?phone=${targetPhone.replace(/\D/g, '')}&text=${encodedMessage}`
    : `https://web.whatsapp.com/send?text=${encodedMessage}`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(rawMessage);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleCopyImage = async () => {
    if (!imageUrl) return;
    try {
      setCopiedImage(true);
      const proxyUrl = `/api/ml/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      const response = await fetch(proxyUrl);
      const blob = await response.blob();

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = proxyUrl;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(async (pngBlob) => {
            if (pngBlob && navigator.clipboard && (window as any).ClipboardItem) {
              try {
                await navigator.clipboard.write([
                  new (window as any).ClipboardItem({ 'image/png': pngBlob }),
                ]);
                setTimeout(() => setCopiedImage(false), 2500);
              } catch (e) {
                console.warn('ClipboardItem error:', e);
                setCopiedImage(false);
              }
            }
          }, 'image/png');
        }
      };
    } catch (err) {
      console.error('Error copying image:', err);
      setCopiedImage(false);
    }
  };

  // Combo 1-Click: Copy text + Copy image + Open WhatsApp Web
  const handleComboCopyAndOpen = async (isWebOnly = false) => {
    setCopiedCombo(true);
    await handleCopyText();
    if (imageUrl) {
      await handleCopyImage();
    }
    
    setTimeout(() => {
      setCopiedCombo(false);
      window.open(isWebOnly ? webWhatsAppUrl : directWhatsAppUrl, '_blank');
    }, 400);
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: SavedGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
    };
    const updated = [...savedGroups, newGroup];
    setSavedGroups(updated);
    localStorage.setItem('achados_saved_groups', JSON.stringify(updated));
    setNewGroupName('');
  };

  const handleDeleteGroup = (id: string) => {
    const updated = savedGroups.filter(g => g.id !== id);
    setSavedGroups(updated);
    localStorage.setItem('achados_saved_groups', JSON.stringify(updated));
  };

  const handleSendWebhook = async () => {
    if (!webhookUrl.trim()) {
      setWebhookError('Por favor informe a URL do Webhook ou da Evolution/Z-API.');
      return;
    }

    setIsSendingWebhook(true);
    setWebhookError(null);
    setWebhookSuccess(null);

    try {
      // Save webhook config
      localStorage.setItem('achados_whatsapp_webhook', webhookUrl.trim());
      localStorage.setItem('achados_whatsapp_secret', webhookSecret.trim());

      const res = await fetch('/api/whatsapp/send-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim(),
          secretKey: webhookSecret.trim(),
          message: rawMessage,
          imageUrl: imageUrl,
          title: productTitle,
          link: productLink,
          targetPhone: targetPhone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao disparar webhook.');
      }

      setWebhookSuccess('Oferta enviada com sucesso para o webhook do WhatsApp!');
      setTimeout(() => setWebhookSuccess(null), 4000);
    } catch (err: any) {
      setWebhookError(err.message || 'Erro ao conectar com o webhook.');
    } finally {
      setIsSendingWebhook(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#25D366] text-slate-950 font-black shadow-lg shadow-[#25D366]/20">
              <Send className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Mandar Oferta para o WhatsApp
                </h2>
                <span className="text-[10px] font-bold bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 px-2 py-0.5 rounded-full">
                  Pronto para Envio
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Envie com 1 clique para seus grupos, canais ou contatos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-200">
          {/* Quick 1-Click Primary Actions */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-850 to-slate-900 border border-[#25D366]/30 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#25D366] fill-[#25D366]" />
                Envio Imediato com 1 Toque
              </span>
              <span className="text-[11px] text-slate-400">
                Abre o WhatsApp com o texto preenchido
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Button: Open WhatsApp (General / App) */}
              <a
                href={directWhatsAppUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-extrabold text-sm shadow-lg shadow-[#25D366]/25 transition-all text-center group cursor-pointer"
              >
                <Smartphone className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Abrir no WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              {/* Button: Open WhatsApp Web (Direct in Browser) */}
              <a
                href={webWhatsAppUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-sm border border-slate-700 hover:border-[#25D366]/50 transition-all text-center group cursor-pointer"
              >
                <Globe className="w-4 h-4 text-[#25D366]" />
                <span>Abrir WhatsApp Web</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>

            {/* Smart Combo: Copiar Foto + Copiar Texto e Abrir WhatsApp */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleComboCopyAndOpen(false)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-yellow-500/30 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-yellow-400/10 text-yellow-400 group-hover:bg-yellow-400/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Modo Afiliado PRO: Copiar Foto + Mensagem e Abrir</span>
                      {copiedCombo && (
                        <span className="text-[10px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded font-bold">
                          Copiado!
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Copia o texto e a foto; abra o WhatsApp e aperte <strong>Ctrl+V</strong> no grupo para enviar imagem + legenda juntas.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-yellow-400 group-hover:translate-x-1 transition-transform">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>

          {/* Quick Copy Individual Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handleCopyText}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                copiedText
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-yellow-400" />}
              <span>{copiedText ? 'Mensagem Copiada!' : 'Copiar Mensagem (Texto)'}</span>
            </button>

            <button
              onClick={handleCopyImage}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                copiedImage
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              {copiedImage ? <Check className="w-4 h-4 text-emerald-400" /> : <ImageIcon className="w-4 h-4 text-yellow-400" />}
              <span>{copiedImage ? 'Foto Copiada!' : 'Copiar Foto (Imagem)'}</span>
            </button>
          </div>

          {/* Specific Phone / Group Direct Input */}
          <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-yellow-400" />
                <span>Enviar para Número ou Contato Específico (Opcional)</span>
              </label>
              <span className="text-[10px] text-slate-400">Com DDD (Ex: 5511999998888)</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                placeholder="Ex: 5511999998888 ou deixe em branco para escolher o grupo"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              />
              {targetPhone.trim() && (
                <a
                  href={directWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-4 py-2.5 rounded-xl bg-[#25D366] text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-[#20ba59] transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar para este número</span>
                </a>
              )}
            </div>
          </div>

          {/* Saved Groups Quick List */}
          <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-yellow-400" />
                Meus Grupos Cadastrados
              </span>
              <span className="text-[11px] text-slate-400">
                Atalhos rápidos para organizar seus canais
              </span>
            </div>

            {/* Group Badges */}
            <div className="flex flex-wrap gap-2">
              {savedGroups.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 group"
                >
                  <span className="font-medium">{g.name}</span>
                  <a
                    href={directWhatsAppUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={`Abrir WhatsApp e mandar para ${g.name}`}
                    className="p-1 rounded bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366] hover:text-slate-950 transition-colors ml-1"
                  >
                    <Send className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(g.id)}
                    title="Remover grupo da lista"
                    className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Group Form */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Nome do seu grupo (ex: Grupo VIP Promoções 02)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                type="button"
                onClick={handleAddGroup}
                disabled={!newGroupName.trim()}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-yellow-400 border border-slate-700 text-xs font-bold flex items-center gap-1 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Salvar Grupo</span>
              </button>
            </div>
          </div>

          {/* Webhook & Evolution API Automatic Dispatch Toggle */}
          <div className="border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={() => setShowWebhookConfig(!showWebhookConfig)}
              className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Bot className="w-4 h-4 text-yellow-400" />
                Disparo Automático por API / Webhook (Evolution API, Z-API, N8N, Zapier)
              </span>
              <span className="text-[11px] text-yellow-400 underline">
                {showWebhookConfig ? 'Ocultar' : 'Configurar'}
              </span>
            </button>

            {showWebhookConfig && (
              <div className="mt-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 animate-in fade-in duration-150">
                <p className="text-[11px] text-slate-400">
                  Envie automaticamente sem intervenção manual conectando a URL do seu Webhook ou servidor da Evolution API / Z-API.
                </p>

                <div className="space-y-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="URL do Webhook (Ex: https://api.meuservidor.com/webhook ou Evolution API)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />

                  <input
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="Chave de Autenticação / Bearer Token / API Key (se houver)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {webhookSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                    <CheckCheck className="w-4 h-4 shrink-0" />
                    <span>{webhookSuccess}</span>
                  </div>
                )}

                {webhookError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{webhookError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSendWebhook}
                  disabled={isSendingWebhook || !webhookUrl.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Bot className="w-4 h-4" />
                  <span>{isSendingWebhook ? 'Disparando Webhook...' : 'Disparar Oferta via Webhook Agora'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5 text-[#25D366]" />
            <span>Formatado com emojis e link de afiliado</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
