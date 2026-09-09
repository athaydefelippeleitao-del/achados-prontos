import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  RotateCcw, 
  Copy, 
  Sparkles,
  HelpCircle,
  X,
  Code
} from 'lucide-react';
import { MessageTemplate } from '../types';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates';
import { compileTemplate } from '../utils/formatter';
import { saveTemplates } from '../lib/storage';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: MessageTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<MessageTemplate[]>>;
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
}

const TEMPLATE_VARIABLES = [
  { tag: '{chamada}', label: 'Chamada c/ Emojis', desc: 'Ex: PRALANA PRA FINALIZAR SUA NOITE 🤠🌾🐎' },
  { tag: '{titulo}', label: 'Título do Produto', desc: 'Nome completo do anúncio' },
  { tag: '{preco_de}', label: 'Preço Original (De)', desc: 'Ex: R$ 391,98' },
  { tag: '{preco_por}', label: 'Preço Atual (Por)', desc: 'Ex: R$ 341,98' },
  { tag: '{desconto}', label: '% Desconto', desc: 'Ex: 13' },
  { tag: '{cupom}', label: 'Linha Alerta Cupom', desc: 'Ex: ⚠️ cupom: MODAPRAVC' },
  { tag: '{cupom_codigo}', label: 'Apenas Código Cupom', desc: 'Ex: MODAPRAVC' },
  { tag: '{parcelas_linha}', label: 'Linha Parcelas', desc: 'Ex: 💳 10x de R$ 34,19' },
  { tag: '{frete_linha}', label: 'Linha Frete Grátis', desc: 'Ex: 🚚 Frete Grátis' },
  { tag: '{link}', label: 'Link do Produto / Afiliado', desc: 'https://meli.la/2QGwovg' },
  { tag: '{canal}', label: 'Nome do Canal/Grupo', desc: 'Ex: Felipão Ofertas' },
];

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  templates,
  setTemplates,
  selectedTemplateId,
  setSelectedTemplateId,
}) => {
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MessageTemplate['category']>('personalizado');
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingTemplate({
      id: 'custom_' + Date.now(),
      name: 'Novo Modelo de Oferta',
      description: 'Modelo personalizado para grupos.',
      category: 'personalizado',
      content: `{chamada}\n\n{titulo}\n\nDe: {preco_de}\nPor: {preco_por}\n\n{cupom}\n\nLink: {link}`,
      isCustom: true,
    });
    setName('Novo Modelo de Oferta');
    setDescription('Modelo personalizado para grupos de promoções.');
    setCategory('personalizado');
    setContent(`{chamada}\n\n{titulo}\n\nDe: {preco_de}\nPor: {preco_por}\n\n{cupom}\n\nLink: {link}`);
  };

  const handleStartEdit = (tpl: MessageTemplate) => {
    setEditingTemplate(tpl);
    setName(tpl.name);
    setDescription(tpl.description);
    setCategory(tpl.category);
    setContent(tpl.content);
  };

  const handleSave = () => {
    if (!name.trim() || !content.trim() || !editingTemplate) return;

    const updated: MessageTemplate = {
      ...editingTemplate,
      name: name.trim(),
      description: description.trim() || 'Modelo de mensagem para promoções',
      category,
      content: content.trim(),
      isCustom: true,
    };

    const exists = templates.some((t) => t.id === updated.id);
    let newTemplates: MessageTemplate[];
    if (exists) {
      newTemplates = templates.map((t) => (t.id === updated.id ? updated : t));
    } else {
      newTemplates = [...templates, updated];
    }

    setTemplates(newTemplates);
    saveTemplates(newTemplates);
    setSelectedTemplateId(updated.id);
    setEditingTemplate(null);
  };

  const handleDelete = (id: string) => {
    if (templates.length <= 1) return;
    const filtered = templates.filter((t) => t.id !== id);
    setTemplates(filtered);
    saveTemplates(filtered);
    if (selectedTemplateId === id) {
      setSelectedTemplateId(filtered[0].id);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Deseja restaurar todos os modelos originais de fábrica?')) {
      setTemplates(DEFAULT_TEMPLATES);
      saveTemplates(DEFAULT_TEMPLATES);
      setSelectedTemplateId(DEFAULT_TEMPLATES[0].id);
      setEditingTemplate(null);
    }
  };

  const insertVariable = (tag: string) => {
    setContent((prev) => prev + (prev.endsWith('\n') || prev === '' ? '' : ' ') + tag);
  };

  // Live compilation preview of template
  const previewSample = editingTemplate
    ? compileTemplate(
        { id: 'preview', name, description, category, content },
        {
          headline: 'PRALANA PRA FINALIZAR SUA NOITE 🤠🌾🐎',
          title: 'Chapéu Pralana Bangora Farmer Aba10 Palha Importada Original',
          price: 341.98,
          originalPrice: 391.98,
          discountPercentage: 13,
          coupon: 'MODAPRAVC',
          link: 'https://meli.la/2QGwovg',
          freeShipping: true,
          installments: { quantity: 10, amount: 34.19 },
          channelName: 'Grupo VIP de Ofertas',
        }
      )
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Configurar Modelos de Texto Personalizados</h2>
              <p className="text-xs text-slate-400">
                Crie e edite padrões de mensagem específicos para cada tipo de promoção (Relâmpago, Cupons, Moda, etc.)
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {editingTemplate ? (
            /* Editing / Creating Screen */
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Editando Modelo: {name || 'Sem nome'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Cancelar Edição
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Nome do Modelo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Padrão Urgência Relâmpago"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Categoria do Modelo
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="padrao">Padrão / Grupos VIP</option>
                    <option value="urgencia">Urgência / Relâmpago</option>
                    <option value="cupom">Foco em Cupom</option>
                    <option value="minimalista">Minimalista</option>
                    <option value="detalhado">Detalhado com Parcelas</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Descrição Curta
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Formato ideal para postagens rápidas à noite"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              {/* Variable Quick Inserters */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Clique nas variáveis para inserir no texto:</span>
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => insertVariable(v.tag)}
                      title={v.desc}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-yellow-400 hover:text-slate-950 text-yellow-300 font-mono text-xs border border-yellow-400/30 transition-colors"
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea for Template Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Estrutura do Texto (com Markdown do WhatsApp: *negrito*, ~riscado~)
                </label>
                <textarea
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm font-mono text-white placeholder-slate-600 focus:ring-2 focus:ring-yellow-400 whitespace-pre-wrap leading-relaxed"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider">
                  Prévia de Compilação:
                </span>
                <pre className="text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                  {previewSample}
                </pre>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-lg shadow-yellow-500/20 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Salvar Modelo
                </button>
              </div>
            </div>
          ) : (
            /* Template List Screen */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Modelos Disponíveis ({templates.length})
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar Padrões
                  </button>

                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Modelo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((tpl) => {
                  const isSelected = tpl.id === selectedTemplateId;
                  return (
                    <div
                      key={tpl.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-slate-850 border-yellow-400/60 shadow-lg shadow-yellow-500/5'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            {tpl.name}
                            {isSelected && (
                              <span className="text-[10px] bg-yellow-400 text-slate-950 font-extrabold px-1.5 py-0.2 rounded">
                                Em Uso
                              </span>
                            )}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded uppercase">
                            {tpl.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">{tpl.description}</p>
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap max-h-24 overflow-hidden relative">
                          {tpl.content}
                          <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(tpl.id);
                            onClose();
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
                          }`}
                        >
                          {isSelected ? '✓ Selecionado' : 'Usar este modelo'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(tpl)}
                            title="Editar Modelo"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {templates.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDelete(tpl.id)}
                              title="Excluir Modelo"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
