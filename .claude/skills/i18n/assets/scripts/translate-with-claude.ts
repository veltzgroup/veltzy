/**
 * Script de tradução assistida via Anthropic API
 *
 * Uso:
 *   npx tsx scripts/translate-with-claude.ts <arquivo-pt> <idiomas...>
 *
 * Exemplo:
 *   npx tsx scripts/translate-with-claude.ts src/locales/pt/auth.json en es
 *
 * Resultado: cria src/locales/en/auth.json e src/locales/es/auth.json
 *
 * Pré-requisitos:
 *   - ANTHROPIC_API_KEY configurada em .env.local
 *   - npm install @anthropic-ai/sdk dotenv
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Erro: ANTHROPIC_API_KEY não configurada em .env.local');
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English (US)',
  es: 'Español (España, formal usando "usted")',
  fr: 'Français (formal)',
  de: 'Deutsch (formal)',
  it: 'Italiano',
};

// Carregar contexto do produto se existir
function loadContext(): string {
  const contextPath = 'src/locales/.translation-context.md';
  if (fs.existsSync(contextPath)) {
    return fs.readFileSync(contextPath, 'utf-8');
  }
  return '';
}

async function translate(
  sourceJson: object,
  targetLang: string,
  context: string
): Promise<object> {
  const targetName = LANGUAGE_NAMES[targetLang] || targetLang;

  const systemPrompt = `Você é um tradutor profissional especializado em tradução de UI de produtos SaaS B2B.

Sua tarefa: traduzir o JSON fornecido de português brasileiro para ${targetName}.

REGRAS OBRIGATÓRIAS:
1. Mantenha a estrutura JSON EXATAMENTE igual à original (mesmas chaves, mesma hierarquia)
2. Preserve TODOS os placeholders no formato {{nome_variavel}} sem alterá-los
3. Mantenha as formas plurais consistentes (chaves _one, _other, _zero)
4. Adapte tom e formalidade ao público B2B (CEO de PME)
5. Para CTAs e copy de marketing, faça transcriação (recriar mensagem mantendo intenção), não tradução literal
6. Termos técnicos consagrados (SDR, IA, Lead, Pipeline, Dashboard) podem ficar em inglês
7. Nomes próprios e marcas NÃO devem ser traduzidos
8. Retorne APENAS o JSON traduzido, sem explicações, sem markdown, sem comentários

CONTEXTO DO PRODUTO:
${context || '(nenhum contexto adicional fornecido)'}`;

  const userMessage = `Traduza o JSON abaixo para ${targetName}. Retorne apenas o JSON traduzido.

\`\`\`json
${JSON.stringify(sourceJson, null, 2)}
\`\`\``;

  console.log(`  Traduzindo para ${targetLang}...`);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Extrair JSON da resposta (caso venha com markdown)
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error(`Não foi possível extrair JSON da resposta para ${targetLang}`);
  }

  return JSON.parse(jsonMatch[1] || jsonMatch[0]);
}

function validateStructure(source: any, translated: any, prefix = ''): string[] {
  const issues: string[] = [];
  const sourceKeys = Object.keys(source);
  const translatedKeys = Object.keys(translated);

  for (const key of sourceKeys) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (!translatedKeys.includes(key)) {
      issues.push(`Chave faltando: ${fullKey}`);
      continue;
    }

    if (typeof source[key] === 'object' && source[key] !== null) {
      issues.push(...validateStructure(source[key], translated[key], fullKey));
    } else if (typeof source[key] === 'string') {
      // Validar placeholders
      const sourcePlaceholders = (source[key].match(/\{\{[^}]+\}\}/g) || []).sort();
      const translatedPlaceholders = (translated[key]?.match(/\{\{[^}]+\}\}/g) || []).sort();

      if (JSON.stringify(sourcePlaceholders) !== JSON.stringify(translatedPlaceholders)) {
        issues.push(
          `Placeholders divergem em ${fullKey}: PT=${sourcePlaceholders.join(',')} vs traduzido=${translatedPlaceholders.join(',')}`
        );
      }
    }
  }

  return issues;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Uso: npx tsx scripts/translate-with-claude.ts <arquivo-pt> <idioma1> [idioma2...]');
    console.error('Exemplo: npx tsx scripts/translate-with-claude.ts src/locales/pt/auth.json en es');
    process.exit(1);
  }

  const [sourcePath, ...targetLangs] = args;

  if (!fs.existsSync(sourcePath)) {
    console.error(`Arquivo não encontrado: ${sourcePath}`);
    process.exit(1);
  }

  const sourceJson = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
  const context = loadContext();
  const fileName = path.basename(sourcePath);

  console.log(`\nTraduzindo ${fileName} para: ${targetLangs.join(', ')}\n`);

  for (const lang of targetLangs) {
    try {
      const translated = await translate(sourceJson, lang, context);

      // Validar
      const issues = validateStructure(sourceJson, translated);
      if (issues.length > 0) {
        console.warn(`  Avisos para ${lang}:`);
        issues.forEach((issue) => console.warn(`    - ${issue}`));
      }

      // Salvar
      const targetDir = sourcePath.replace('/pt/', `/${lang}/`).replace(fileName, '');
      const targetPath = path.join(targetDir, fileName);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.writeFileSync(targetPath, JSON.stringify(translated, null, 2) + '\n', 'utf-8');
      console.log(`  ✓ Salvo em ${targetPath}`);
    } catch (error) {
      console.error(`  ✗ Erro ao traduzir para ${lang}:`, error);
    }
  }

  console.log('\nTradução concluída. Recomendo revisar manualmente:');
  console.log('1. CTAs e copy de marketing (precisam de transcriação humana)');
  console.log('2. Termos do seu domínio específico');
  console.log('3. Tom de voz consistente com a marca\n');
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
