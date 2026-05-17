# Contexto de tradução

Este arquivo serve como input para o script `translate-with-claude.ts`. Ele orienta a IA sobre o produto, tom e termos específicos.

Salve uma cópia deste arquivo em `src/locales/.translation-context.md` e personalize.

---

## Sobre o produto

<Descreva o produto em uma a três frases. Inclua:>
<- O que é (categoria do produto)>
<- Para quem é (público-alvo)>
<- Qual problema resolve>

Exemplo para Veltzy:
> Veltzy é uma plataforma SaaS B2B de SDR com IA, voltada para PMEs brasileiras que querem escalar prospecção e qualificação de leads sem aumentar a equipe comercial. O produto resolve o gargalo de qualificação manual de leads.

## Tom de voz

<Descreva o tom desejado:>
- Formalidade: <formal / casual / intermediário>
- Pessoa: <segunda pessoa "você" / terceira pessoa>
- Personalidade: <amigável / profissional / técnico / direto>
- Densidade: <conciso / detalhado>

Exemplo para Veltzy:
> Tom profissional mas próximo, segunda pessoa "você" em PT, "you" em EN, "usted" em ES. Mensagem direta, sem rodeios. Evitar jargão excessivo.

## Termos que NÃO devem ser traduzidos

<Liste nomes de marca, produtos, e termos consagrados:>

- Nomes da marca: Veltzy, Veltz, Tag Contabilidade
- Termos consagrados em inglês: SDR, IA, Lead, Pipeline, Dashboard, Webhook, API, Workflow
- Tecnologias: Supabase, Vercel, GitHub, Stripe, Resend, WhatsApp

## Glossário (traduções fixas)

<Lista de termos e como devem ser traduzidos consistentemente:>

| PT | EN | ES |
|---|---|---|
| Empresa | Company | Empresa |
| Equipe | Team | Equipo |
| Negócio | Business | Negocio |
| Vendas | Sales | Ventas |
| Funil | Funnel | Embudo |
| Receita | Revenue | Ingresos |

## CTAs e copy de marketing

<CTAs comerciais não devem ser traduzidos literalmente. Use transcriação.>

Exemplos:

| PT | EN (transcriação) | ES (transcriação) |
|---|---|---|
| "Comece agora" | "Get started" | "Empieza ya" |
| "Fale com vendas" | "Talk to sales" | "Habla con ventas" |
| "Veja em ação" | "See it live" | "Pruébalo en vivo" |

## Regras de pluralização

<Idiomas têm regras diferentes. Considere:>
- EN: singular (1) e plural (2+)
- ES: singular (1) e plural (2+)
- PT: singular (1) e plural (0, 2+)

## Datas e números

<Formato esperado para cada idioma:>
- PT: 25/04/2026, R$ 1.234,56
- EN: 04/25/2026, $1,234.56
- ES: 25/04/2026, 1.234,56 €

## Casos especiais

<Coloque aqui qualquer regra particular:>

Exemplo:
- "Você" deve ser sempre traduzido como "you" em EN, "usted" em ES (formal B2B)
- Mensagens de erro devem ser claras e diretas, sem floreios
- Mensagens de sucesso podem ser mais calorosas
- Nunca usar gírias ou regionalismos

---

*Este arquivo é lido pelo script `translate-with-claude.ts` para gerar traduções de qualidade. Mantenha-o atualizado.*
