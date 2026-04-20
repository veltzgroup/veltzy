# DESIGN_SYSTEM - Veltzy CRM

> Design System V2 — Inspirado no estilo **Ticto**: dark, sofisticado, com efeitos de **ambient glow**. Base neutra que permite que cores de destaque customizáveis (white-label) brilhem.

---

## 1. FILOSOFIA VISUAL

- **Tom:** Sofisticado, premium, imersivo
- **Densidade:** Equilibrada — espaço negativo generoso em áreas de leitura, densidade controlada em dashboards
- **Profundidade:** Camadas com glassmorphism, blur, gradientes radiais e ambient glow
- **White-label:** Base neutra que se adapta às cores primária/secundária definidas por cada empresa
- **Acessibilidade:** Contraste preservado em light, dark e sand modes

---

## 2. TEMAS DISPONÍVEIS

O sistema possui **3 temas** alternáveis pelo usuário:

| Tema | Classe CSS | Inspiração |
|---|---|---|
| Light | `:root` (default) | Clean e minimalista |
| Dark | `.dark` | Profundo e imersivo (Ticto-style) |
| Sand | `.sand` | Tons quentes bege (Claude-style) |

Inicialização via `ThemeInitializer` e alternância via `ThemeToggleButton`. Persistência por usuário através de `useThemeConfig`.

---

## 3. TOKENS DE COR (HSL)

### Tema Light (`:root`)

| Token | Valor HSL | Uso |
|---|---|---|
| `--background` | `0 0% 98%` | Fundo principal |
| `--foreground` | `240 10% 10%` | Texto principal |
| `--card` | `0 0% 100%` | Fundo de cards |
| `--card-foreground` | `240 10% 10%` | Texto em cards |
| `--popover` | `0 0% 100%` | Fundo de popovers |
| `--primary` | `158 64% 42%` | Cor de destaque (verde Veltzy) |
| `--primary-foreground` | `0 0% 100%` | Texto sobre primary |
| `--secondary` | `240 5% 92%` | Botões secundários |
| `--secondary-foreground` | `240 10% 20%` | Texto secundário |
| `--muted` | `240 5% 96%` | Fundos sutis |
| `--muted-foreground` | `240 4% 46%` | Texto muted |
| `--accent` | `158 40% 94%` | Acento suave |
| `--accent-foreground` | `158 64% 32%` | Texto sobre accent |
| `--destructive` | `0 72% 51%` | Erros e ações destrutivas |
| `--destructive-foreground` | `0 0% 100%` | Texto sobre destructive |
| `--border` | `240 6% 90%` | Bordas |
| `--input` | `240 6% 90%` | Bordas de inputs |
| `--ring` | `158 64% 42%` | Focus ring |
| `--radius` | `0.75rem` | Raio padrão de bordas |

### Tema Dark (`.dark`)

| Token | Valor HSL |
|---|---|
| `--background` | `240 15% 4%` |
| `--foreground` | `0 0% 95%` |
| `--card` | `240 12% 8%` |
| `--popover` | `240 12% 8%` |
| `--primary` | `158 72% 46%` |
| `--primary-foreground` | `240 15% 4%` |
| `--secondary` | `240 10% 14%` |
| `--secondary-foreground` | `0 0% 90%` |
| `--muted` | `240 10% 12%` |
| `--muted-foreground` | `240 5% 55%` |
| `--accent` | `240 8% 16%` |
| `--accent-foreground` | `158 72% 58%` |
| `--destructive` | `0 62% 48%` |
| `--border` / `--input` | `240 8% 16%` |
| `--ring` | `158 72% 46%` |

### Tema Sand (`.sand`)

| Token | Valor HSL |
|---|---|
| `--background` | `36 30% 96%` |
| `--foreground` | `30 12% 18%` |
| `--card` | `36 28% 94%` |
| `--primary` | `158 64% 42%` |
| `--secondary` | `35 20% 90%` |
| `--muted` | `35 18% 92%` |
| `--accent` | `35 22% 88%` |
| `--border` / `--input` | `35 16% 88%` |

---

## 4. SIDEBAR (TOKENS DEDICADOS)

A sidebar possui paleta própria para permitir contraste independente do conteúdo.

| Token | Light | Dark | Sand |
|---|---|---|---|
| `--sidebar-background` | `0 0% 100%` | `240 15% 5%` | `36 26% 93%` |
| `--sidebar-foreground` | `240 10% 30%` | `0 0% 80%` | `30 10% 28%` |
| `--sidebar-primary` | `158 64% 42%` | `158 72% 46%` | `158 64% 42%` |
| `--sidebar-accent` | `240 5% 96%` | `240 10% 12%` | `35 20% 90%` |
| `--sidebar-border` | `240 6% 92%` | `240 8% 14%` | `35 16% 88%` |

---

## 5. CORES DE STATUS (PIPELINE)

Mapeadas para os `lead_status` do banco de dados.

| Status | Token | Light | Dark |
|---|---|---|---|
| Novo | `--status-new` | `217 91% 60%` | `217 85% 65%` |
| Qualificando | `--status-qualifying` | `43 96% 56%` | `43 90% 58%` |
| Aberto | `--status-open` | `271 81% 56%` | `271 75% 62%` |
| Negócio | `--status-deal` | `158 64% 42%` | `158 72% 46%` |
| Perdido | `--status-lost` | `0 72% 51%` | `0 58% 56%` |

Aplicados via classes utilitárias: `.status-new`, `.status-qualifying`, `.status-open`, `.status-deal`, `.status-lost`.

---

## 6. AMBIENT GLOW (EFEITOS DE LUZ)

Tokens de glow para criar atmosfera imersiva no fundo das páginas.

| Token | Light | Dark | Sand |
|---|---|---|---|
| `--glow-primary` | `158 64% 42%` | `158 72% 46%` | `158 64% 42%` |
| `--glow-secondary` | `280 70% 50%` | `280 70% 50%` | `30 40% 60%` |
| `--glow-tertiary` | `30 90% 55%` | `30 90% 55%` | `35 50% 55%` |

### Classes de aplicação

- **`.ambient-bg`** — Fundo com 2 orbs radiais (secondary + tertiary) com blur 60-80px
- **`.glow-orb-primary`** — Orb individual de primary, posicionável
- **`.glow-primary`** — `box-shadow: 0 0 30px -5px hsl(var(--primary) / 0.3)`
- **`.glow-primary-intense`** — Glow duplo de primary (20px + 60px)
- **`.glow-success`** — Glow verde para confirmações de negócio fechado

---

## 7. GLASSMORPHISM

Cards com efeito glass (vidro fosco) — assinatura visual do Veltzy.

### `.glass-card`
```css
bg-card/80 + backdrop-blur-xl + border-border/50
+ shadow externo + inset highlight
```

### `.glass-card` em dark mode
Opacidade reduzida (`bg-card/60`) e shadow mais intensa para profundidade.

### `.glass-premium`
Versão reforçada com tint de primary nas bordas e shadow — usado em elementos de destaque (modais importantes, dashboards).

---

## 8. COMPONENTES VISUAIS CUSTOMIZADOS

### Mensagens de Chat

| Classe | Aparência | Uso |
|---|---|---|
| `.message-bubble-lead` | `bg-secondary` + `rounded-bl-md` | Mensagens recebidas do lead |
| `.message-bubble-human` | `bg-primary` + `rounded-br-md` | Mensagens enviadas pelo vendedor |
| `.message-bubble-ai` | `bg-accent` + borda primary/20 | Mensagens da IA SDR |

### Kanban (Pipeline)

| Classe | Descrição |
|---|---|
| `.kanban-column` | Coluna com `bg-muted/30`, `rounded-xl`, `min-h-[500px]` |
| `.kanban-card` | Card com hover elevado (shadow + border primary/30) |

### AI Score Indicator
```
.score-indicator         → barra de progresso h-1.5
.score-indicator-fill    → preenchimento animado (500ms ease-out)
```

### Inputs
```
.input-clean → bg-secondary/50, foco transita para bg-background
```

### Botões com Glow
```
.btn-glow → pseudo-elemento ::before com gradient blur,
            opacity 0 → 1 no hover
```

---

## 9. UTILITÁRIOS DE TIPOGRAFIA

| Classe | Efeito |
|---|---|
| `.text-gradient-primary` | Gradiente horizontal `primary → accent-foreground` |
| `.text-gradient-shine` | Gradiente vertical sutil sobre `foreground` (efeito brilho) |

Tipografia usa stack default do sistema com `font-feature-settings: "rlig" 1, "calt" 1` (ligaduras e alternativas contextuais habilitadas).

---

## 10. ANIMAÇÕES

### Transições
- **`.transition-smooth`** — `transition-all duration-200 ease-out` (padrão da casa)

### Keyframes Globais

| Animação | Duração | Uso |
|---|---|---|
| `.animate-fade-in` | 0.3s ease-out | Entrada de elementos (translateY 8px → 0) |
| `.animate-float` | 20s infinito | Movimento sutil de orbs ambientes |
| `.animate-pulse-glow` | 4s infinito | Pulsação de glow (opacity + blur) |
| `accordion-down/up` | 0.2s ease-out | Radix Accordion (do tailwindcss-animate) |

### Bypass de animações
Classe `.no-animations` no root desabilita todas as animações e transições (preferência de usuário/acessibilidade).

---

## 11. SCROLLBARS

Scrollbars premium customizadas:
- Largura 6px
- Track transparente
- Thumb `bg-muted-foreground/20` → `40` no hover
- Bordas arredondadas

Variante `.scrollbar-minimal` esconde o thumb até hover (útil em painéis densos).

---

## 12. RAIO DE BORDAS

Sistema baseado em `--radius: 0.75rem`:

| Token Tailwind | Cálculo | Valor |
|---|---|---|
| `rounded-lg` | `var(--radius)` | 12px |
| `rounded-md` | `calc(var(--radius) - 2px)` | 10px |
| `rounded-sm` | `calc(var(--radius) - 4px)` | 8px |

Bubbles de chat usam `rounded-2xl` (16px) com cantos assimétricos.

---

## 13. CONTAINER E BREAKPOINTS

```ts
container: {
  center: true,
  padding: "2rem",
  screens: { "2xl": "1400px" }
}
```

Breakpoints padrão do Tailwind: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1400px customizado).

---

## 14. WHITE-LABEL POR EMPRESA

Cada `company` no banco possui:
- `primary_color` — sobrescreve `--primary` em runtime
- `secondary_color` — sobrescreve `--secondary` em runtime
- `logo_url` — logo customizado na sidebar e auth

Aplicação dinâmica via hook `useThemeConfig` que injeta variáveis CSS no `:root` ao carregar a empresa do usuário.

Configurações salvas em `system_settings.theme_config`:
- Cores primária/secundária
- Estilo de card (glass, flat, elevated)
- Estilo de sidebar (compact, expanded)

---

## 15. STACK DE COMPONENTES

- **Base:** Radix UI (acessibilidade nativa, keyboard navigation)
- **Wrappers:** shadcn/ui customizados em `src/components/ui/`
- **Ícones:** Lucide Icons (consistência visual)
- **Animações complexas:** framer-motion (`PageTransition`, micro-interações)
- **Toasts:** sonner

---

## 16. REGRAS DE OURO

✅ **Sempre use tokens semânticos** (`bg-primary`, `text-foreground`)
❌ **Nunca use cores diretas** (`bg-blue-500`, `text-white`) em componentes
✅ **Todas as cores em HSL** — facilita transformações (opacity, lightness)
✅ **Variantes via `cva`** — não condicionais inline de classes
✅ **Glow e glass com moderação** — apenas em elementos de destaque
✅ **Contraste validado** nos 3 temas (light/dark/sand)

---

## 17. ARQUIVOS DE REFERÊNCIA

| Arquivo | Conteúdo |
|---|---|
| `src/index.css` | Tokens CSS, classes utilitárias, animações |
| `tailwind.config.ts` | Mapeamento de tokens para classes Tailwind |
| `src/components/ui/*` | Componentes shadcn customizados |
| `src/components/ThemeInitializer.tsx` | Carrega tema na inicialização |
| `src/components/ThemeToggleButton.tsx` | Alternância light/dark/sand |
| `src/hooks/useThemeConfig.ts` | Persistência e aplicação de tema por empresa |
