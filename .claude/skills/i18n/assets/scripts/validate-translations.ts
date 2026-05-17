/**
 * Script de validação de traduções
 *
 * Compara estrutura entre idiomas e reporta:
 * - Chaves presentes em PT mas faltando em outros idiomas
 * - Chaves extras em outros idiomas que não existem em PT
 * - Placeholders inconsistentes
 *
 * Uso:
 *   npx tsx scripts/validate-translations.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const LOCALES_DIR = 'src/locales';
const SOURCE_LANG = 'pt';

type TranslationFile = {
  lang: string;
  feature: string;
  path: string;
  content: any;
};

function getKeys(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? getKeys(value, fullKey)
      : [fullKey];
  });
}

function getValue(obj: any, key: string): any {
  return key.split('.').reduce((acc, k) => acc?.[k], obj);
}

function loadAllTranslations(): TranslationFile[] {
  const langs = fs.readdirSync(LOCALES_DIR).filter((d) => {
    return fs.statSync(path.join(LOCALES_DIR, d)).isDirectory();
  });

  const files: TranslationFile[] = [];
  for (const lang of langs) {
    const langDir = path.join(LOCALES_DIR, lang);
    const jsonFiles = fs.readdirSync(langDir).filter((f) => f.endsWith('.json'));

    for (const file of jsonFiles) {
      const filePath = path.join(langDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      files.push({
        lang,
        feature: file.replace('.json', ''),
        path: filePath,
        content,
      });
    }
  }

  return files;
}

function validate(files: TranslationFile[]) {
  const features = [...new Set(files.map((f) => f.feature))];
  const langs = [...new Set(files.map((f) => f.lang))].filter((l) => l !== SOURCE_LANG);

  let totalIssues = 0;

  for (const feature of features) {
    const sourceFile = files.find((f) => f.lang === SOURCE_LANG && f.feature === feature);
    if (!sourceFile) {
      console.warn(`[${feature}] Arquivo em ${SOURCE_LANG} não encontrado, pulando`);
      continue;
    }

    const sourceKeys = getKeys(sourceFile.content);

    for (const lang of langs) {
      const targetFile = files.find((f) => f.lang === lang && f.feature === feature);
      if (!targetFile) {
        console.error(`[${feature}/${lang}] Arquivo faltando inteiro`);
        totalIssues++;
        continue;
      }

      const targetKeys = getKeys(targetFile.content);
      const missing = sourceKeys.filter((k) => !targetKeys.includes(k));
      const extra = targetKeys.filter((k) => !sourceKeys.includes(k));

      if (missing.length > 0) {
        console.error(`[${feature}/${lang}] Chaves faltando:`);
        missing.forEach((k) => console.error(`  - ${k}`));
        totalIssues += missing.length;
      }

      if (extra.length > 0) {
        console.warn(`[${feature}/${lang}] Chaves extras (não existem em ${SOURCE_LANG}):`);
        extra.forEach((k) => console.warn(`  - ${k}`));
        totalIssues += extra.length;
      }

      // Validar placeholders
      for (const key of sourceKeys) {
        const sourceValue = getValue(sourceFile.content, key);
        const targetValue = getValue(targetFile.content, key);

        if (typeof sourceValue !== 'string' || typeof targetValue !== 'string') continue;

        const sourcePlaceholders = (sourceValue.match(/\{\{[^}]+\}\}/g) || []).sort();
        const targetPlaceholders = (targetValue.match(/\{\{[^}]+\}\}/g) || []).sort();

        if (JSON.stringify(sourcePlaceholders) !== JSON.stringify(targetPlaceholders)) {
          console.error(
            `[${feature}/${lang}] Placeholders divergem em "${key}": ${SOURCE_LANG}=[${sourcePlaceholders.join(', ')}] vs ${lang}=[${targetPlaceholders.join(', ')}]`
          );
          totalIssues++;
        }
      }

      // Avisar sobre comprimento muito longo
      for (const key of sourceKeys) {
        const sourceValue = getValue(sourceFile.content, key);
        const targetValue = getValue(targetFile.content, key);

        if (typeof sourceValue !== 'string' || typeof targetValue !== 'string') continue;

        if (sourceValue.length > 0 && targetValue.length / sourceValue.length > 1.5) {
          console.warn(
            `[${feature}/${lang}] Tradução muito mais longa em "${key}" (${targetValue.length} vs ${sourceValue.length} chars)`
          );
        }
      }
    }
  }

  console.log(`\nValidação concluída. Total de problemas: ${totalIssues}`);
  if (totalIssues > 0) {
    process.exit(1);
  }
}

const files = loadAllTranslations();
console.log(`Validando ${files.length} arquivos de tradução...\n`);
validate(files);
