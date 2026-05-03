# Auditoria: Pagina de Aparencia
**Data:** 2026-05-03
**Area:** /admin?tab=aparencia + ThemeToggle sidebar + useThemeConfig

## Sumario Executivo

| Dimensao | Gaps | Semaforo |
|----------|------|---------|
| 1. Funcional | 2 | 🟡 |
| 2. Dados | 1 | 🟡 |
| 3. Integracao | 0 | 🟢 |
| 4. UX/Visual | 1 | 🟢 |
| 5. Comercial | 0 | 🟢 |

**Status geral:** 🟡 Amarelo — funciona, mas preview de cor e persistencia de estilos tem gaps que o cliente notaria.

---

## Inventario

### Telas
- `/admin?tab=aparencia` — ThemeCustomizer component
- Sidebar footer — ThemeToggle icon

### Arquivos
- `src/components/company/theme-customizer.tsx` — UI principal
- `src/hooks/use-theme-config.ts` — hook central de tema
- `src/components/layout/theme-toggle.tsx` — icone sidebar
- `src/components/layout/theme-initializer.tsx` — init no App.tsx
- `src/styles/globals.css` — CSS variables dos 3 temas

### Fluxos
1. Selecionar modo (Claro/Escuro/Areia)
2. Selecionar cor preset ou custom
3. Selecionar estilo de card e sidebar
4. Salvar tema
5. Ciclar tema pelo icone da sidebar

---

## Achados por Dimensao

### 1. Funcional

#### 🟠 F1 — `applyPreview` nao atualiza `--accent-foreground`
**Arquivo:** `theme-customizer.tsx:106-113`
**Impacto:** Durante o preview (antes de salvar), os hovers de botoes outline/ghost continuam com a cor anterior. So corrige apos salvar e recarregar.
**Acao:** Adicionar derivacao de accent/accent-foreground no `applyPreview`, reutilizando a logica de `deriveAccentColors`.

#### 🟡 F2 — Card/Sidebar style nao lidos do banco ao abrir
**Arquivo:** `theme-customizer.tsx:102-103`
**Impacto:** `useState('glass')` e `useState('solid')` sao defaults hardcoded. Se o usuario salvou "Elevado", ao reabrir a pagina mostra "Glass" ativo.
**Acao:** Ler `system_settings` com key `theme_config` ao montar e popular os states.

### 2. Dados

#### 🟡 D1 — Arredondamento hex na conversao HSL→HEX
**Arquivo:** `theme-customizer.tsx:65-91`
**Impacto:** `hslToHex(hexToHsl('#3b82f6'))` retorna `#3c83f6`. O hex exibido apos salvar/reload difere levemente do preset original.
**Acao:** Ao selecionar um swatch, persistir o hex original do swatch em vez de reconverter.

### 3. Integracao
Nenhum gap.

### 4. UX/Visual

#### 🟢 V1 — Sem preview visual nos botoes de Card/Sidebar Style
**Impacto:** Os botoes "Plano", "Elevado", "Glass" nao mostram preview de como fica. E apenas texto.
**Acao:** Opcional — adicionar mini-preview de cada estilo. Baixa prioridade.

### 5. Comercial
Nenhum gap. A pagina e demonstravel e o efeito de trocar cores e instantaneo — bom "wow factor" em demo.

---

## O que esta OK

- [x] Sincronizacao tema sidebar <-> pagina (corrigido nesta sessao)
- [x] 14 presets cobrindo espectro completo
- [x] Checkmark e ring de selecao no swatch ativo
- [x] Input hex e color picker nativos funcionando
- [x] Modo do tema (Claro/Escuro/Areia) funciona e persiste
- [x] Cor primaria salva no banco e aplica apos reload
- [x] `--accent-foreground` derivado corretamente apos reload
- [x] Build sem erros, sem warnings de tipo

---

## Plano de Ataque (priorizado)

1. **F1** 🟠 — Corrigir `applyPreview` para atualizar accent-foreground (rapido, alto impacto visual)
2. **F2** 🟡 — Ler card/sidebar style do banco ao montar (medio esforco)
3. **D1** 🟡 — Usar hex original do swatch em vez de reconverter (rapido)
4. **V1** 🟢 — Preview visual nos botoes de estilo (backlog)
