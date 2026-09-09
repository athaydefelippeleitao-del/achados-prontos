import { MessageTemplate } from '../types';

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'felipao_padrao',
    name: 'Padrão Grupos VIP (Igual ao Exemplo)',
    description: 'Estilo direto e de alta conversão com foto, chamada em caixa alta, De/Por e cupom.',
    category: 'padrao',
    content: `{chamada}

{titulo}

De: {preco_de}

Por: {preco_por}

{cupom}

Link: {link}`,
  },
  {
    id: 'mega_oferta_destaque',
    name: 'Mega Oferta com Markdown & Emojis',
    description: 'Com negrito do WhatsApp (*texto*), riscado (~de~) e porcentagem de desconto.',
    category: 'urgencia',
    content: `🔥 *{chamada}* 🔥

📦 *{titulo}*

❌ De: ~{preco_de}~
✅ Por: *{preco_por}* ({desconto}% OFF!)
{parcelas_linha}
{frete_linha}
{cupom}

🛒 *Garanta o seu aqui:*
🔗 {link}`,
  },
  {
    id: 'urgencia_relampago',
    name: '⚡ Oferta Relâmpago / Urgência',
    description: 'Foco em escassez e velocidade para acabar com estoque rápido.',
    category: 'urgencia',
    content: `⚡ *CORRE QUE VAI ACABAR RÁPIDO!* ⚡
{chamada}

*{titulo}*

💥 Caiu de {preco_de} para *{preco_por}*!
{cupom}
{frete_linha}

👉 *Compre no Mercado Livre:*
{link}`,
  },
  {
    id: 'foco_cupom',
    name: '🎟️ Super Cupom Secreto',
    description: 'Ideal para ofertas em que o cupom dá desconto agressivo.',
    category: 'cupom',
    content: `🚨 *CUPOM EXCLUSIVO NO MERCADO LIVRE!* 🚨
{chamada}

*{titulo}*

💵 De: ~{preco_de}~
🏷️ *Por: {preco_por}* aplicando o cupom:
{cupom}

🚚 {frete_linha}
🛍️ *Pegar Oferta:*
{link}`,
  },
  {
    id: 'minimalista_direto',
    name: 'Minimalista & Limpo',
    description: 'Pouco texto, direto ao ponto para grupos que preferem brevidade.',
    category: 'minimalista',
    content: `{titulo}

De {preco_de} por *{preco_por}*
{cupom}

{link}`,
  },
  {
    id: 'detalhado_completo',
    name: 'Detalhado com Parcelamento & Frete',
    description: 'Contém todas as informações de pagamento, frete e garantia.',
    category: 'detalhado',
    content: `✨ *ACHADO NO MERCADO LIVRE* ✨
{chamada}

📌 *Produto:* {titulo}
💰 *Preço:* {preco_por} *(De {preco_de})*
💳 *Pagamento:* {parcelas_linha}
📦 *Envio:* {frete_linha}
{cupom}

🛒 *Clique e garanta com segurança:*
🔗 {link}

{rodape}`,
  },
];
