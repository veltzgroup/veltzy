import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const generateTestCsv = (filename: string, content: string) => {
  const tmpDir = path.join(__dirname, '..', 'test-results')
  fs.mkdirSync(tmpDir, { recursive: true })
  const filePath = path.join(tmpDir, filename)
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
}

const skipIfNotAuthenticated = async (page: import('@playwright/test').Page) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const url = page.url()
  if (url.includes('/auth') || url.includes('/onboarding')) {
    test.skip(true, 'Requer autenticação - rodar com usuario logado')
  }
}

test.describe('Importação CSV', () => {
  test('botão de import visivel no pipeline para admin/manager', async ({ page }) => {
    await skipIfNotAuthenticated(page)

    await page.goto('/pipeline')
    await page.waitForLoadState('networkidle')

    const importButton = page.locator('button[title="Importar CSV"]')
    await expect(importButton).toBeVisible()
  })

  test('modal abre e mostra zona de upload', async ({ page }) => {
    await skipIfNotAuthenticated(page)

    await page.goto('/pipeline')
    await page.waitForLoadState('networkidle')

    await page.click('button[title="Importar CSV"]')

    await expect(page.getByRole('heading', { name: 'Importar leads via CSV' })).toBeVisible()
    await expect(page.getByText('Arraste um arquivo CSV ou clique para selecionar')).toBeVisible()
    await expect(page.getByText('Tamanho maximo: 10MB')).toBeVisible()
  })

  test('upload de CSV mostra info do arquivo e avança para mapeamento', async ({ page }) => {
    await skipIfNotAuthenticated(page)

    const csvContent = 'Nome,Telefone,Email\nJoão Silva,11999887766,joao@test.com\nMaria Santos,11888776655,maria@test.com\n'
    const csvPath = generateTestCsv('test-import.csv', csvContent)

    await page.goto('/pipeline')
    await page.waitForLoadState('networkidle')
    await page.click('button[title="Importar CSV"]')

    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(csvPath)

    // Info do arquivo
    await expect(page.getByText('test-import.csv')).toBeVisible()
    await expect(page.getByText(/2 linhas/)).toBeVisible()
    await expect(page.getByText(/3 colunas/)).toBeVisible()

    // Avança para mapeamento
    await page.getByRole('button', { name: 'Proximo' }).click()
    await expect(page.getByRole('heading', { name: 'Mapear colunas' })).toBeVisible()

    // Auto-map deve ter detectado as colunas
    await expect(page.getByText('Fase padrao')).toBeVisible()
  })

  test('step de preview mostra dados mapeados', async ({ page }) => {
    await skipIfNotAuthenticated(page)

    const csvContent = 'Nome,Telefone,Email\nJoão Silva,11999887766,joao@test.com\n'
    const csvPath = generateTestCsv('test-preview.csv', csvContent)

    await page.goto('/pipeline')
    await page.waitForLoadState('networkidle')
    await page.click('button[title="Importar CSV"]')

    // Upload
    await page.locator('input[type="file"][accept=".csv"]').setInputFiles(csvPath)
    await page.getByRole('button', { name: 'Proximo' }).click()

    // Mapeamento - avança com defaults
    await page.getByRole('button', { name: 'Proximo' }).click()

    // Preview
    await expect(page.getByRole('heading', { name: /Confirmar importação/ })).toBeVisible()
    await expect(page.getByText('João Silva')).toBeVisible()
    await expect(page.getByText(/1 leads? ser/)).toBeVisible()
  })

  test('modal fecha e reseta estado', async ({ page }) => {
    await skipIfNotAuthenticated(page)

    await page.goto('/pipeline')
    await page.waitForLoadState('networkidle')
    await page.click('button[title="Importar CSV"]')

    await expect(page.getByRole('heading', { name: 'Importar leads via CSV' })).toBeVisible()

    // Fecha via ESC
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
