import React, { useState } from 'react';
import { 
  Settings, 
  Tag, 
  X, 
  Check, 
  HelpCircle, 
  Link2, 
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { AffiliateSettings } from '../types';
import { saveAffiliateSettings } from '../lib/storage';

interface AffiliateSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AffiliateSettings;
  setSettings: React.Dispatch<React.SetStateAction<AffiliateSettings>>;
}

export const AffiliateSettingsModal: React.FC<AffiliateSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings,
}) => {
  const [affiliateTag, setAffiliateTag] = useState(settings.affiliateTag || '');
  const [channelName, setChannelName] = useState(settings.channelName || 'Felipão');
  const [customFooter, setCustomFooter] = useState(settings.customFooter || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: AffiliateSettings = {
      ...settings,
      affiliateTag: affiliateTag.trim(),
      channelName: channelName.trim() || 'Grupo VIP',
      customFooter: customFooter.trim(),
    };
    setSettings(updated);
    saveAffiliateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Configurações de Afiliado & Canal</h2>
              <p className="text-xs text-slate-400">Personalize sua tag do Mercado Livre e nome do grupo</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Tag Afiliado */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-yellow-400" />
                Tag / Código de Afiliado do Mercado Livre
              </span>
            </label>
            <input
              type="text"
              value={affiliateTag}
              onChange={(e) => setAffiliateTag(e.target.value)}
              placeholder="Ex: matt_tool=12345678 ou seu código"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-yellow-300 font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <p className="text-[11px] text-slate-400">
              Será injetado automaticamente em todos os links do Mercado Livre gerados no app.
            </p>
          </div>

          {/* Nome do Remetente / Canal */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>Nome do seu Grupo ou Perfil (Ex: Felipão)</span>
            </label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Ex: Felipão ou Achados VIP"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <p className="text-[11px] text-slate-400">
              Aparece no topo da prévia da mensagem no balão do WhatsApp.
            </p>
          </div>

          {/* Rodapé / Assinatura personalizada */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Assinatura / Rodapé Padrão (Opcional)
            </label>
            <textarea
              rows={2}
              value={customFooter}
              onChange={(e) => setCustomFooter(e.target.value)}
              placeholder="Ex: Entre no nosso grupo VIP de ofertas no link da bio!"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-lg shadow-yellow-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-950" />
                  <span>Salvo!</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Salvar Configurações</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
