import { test, expect, type Page } from '@playwright/test'

// ============================================================================
// Helpers
// ============================================================================

const TEST_ADMIN_EMAIL = 'weveltzgroup@gmail.com'
const TEST_ADMIN_PASSWORD = 'Test@12345'

const AUTH_URL = '/auth'

/** Navega para /auth e garante que a pagina carregou */
const goToAuth = async (page: Page) => {
  await page.goto(AUTH_URL)
  await page.waitForLoadState('networkidle')
  // Garante que saiu do loading spinner
  await expect(page.locator('text=Veltzy')).toBeVisible({ timeout: 10_000 })
}

/** Preenche e submete o form de login */
const fillLogin = async (page: Page, email: string, password: string) => {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

/** Troca para a aba de cadastro */
const switchToRegisterTab = async (page: Page) => {
  await page.getByRole('tab', { name: 'Cadastro' }).click()
}

/** Injeta sessao fake no localStorage do Supabase para simular usuario logado */
const injectFakeSession = async (page: Page, user: Record<string, unknown> = {}) => {
  const defaultUser = {
    id: 'fake-user-001',
    email: 'fake@teste.com',
    app_metadata: { provider: 'email' },
    user_metadata: { name: 'Fake User' },
    aud: 'authenticated',
    role: 'authenticated',
    ...user,
  }
  const session = {
    access_token: 'fake-access-token-' + Date.now(),
    refresh_token: 'fake-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: defaultUser,
  }
  // Supabase localStorage key: sb-{project-ref}-auth-token
  await page.addInitScript((sessionData) => {
    localStorage.setItem(
      'sb-zxefzegggntfjlfsdgvw-auth-token',
      JSON.stringify(sessionData)
    )
  }, session)
}

// ============================================================================
// 1. Login com email/senha validos
// ============================================================================

test.describe('Login email/senha', () => {
  test('login com credenciais validas mostra toast de sucesso', async ({ page }) => {
    await goToAuth(page)

    // Mocka login para nao depender de credenciais reais
    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-access-token',
          refresh_token: 'fake-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'admin-001',
            email: TEST_ADMIN_EMAIL,
            app_metadata: { provider: 'email' },
            user_metadata: { name: 'Admin Teste' },
            aud: 'authenticated',
            role: 'authenticated',
          },
        }),
      })
    })

    await fillLogin(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)

    // Toast de sucesso
    await expect(page.getByText('Login realizado com sucesso')).toBeVisible({ timeout: 5_000 })
  })

  // --------------------------------------------------------------------------
  // 2. Login com email nao confirmado
  // --------------------------------------------------------------------------

  test('email nao confirmado mostra mensagem em portugues', async ({ page }) => {
    await goToAuth(page)

    // Intercepta Supabase Auth para simular email nao confirmado
    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Email not confirmed',
        }),
      })
    })

    await fillLogin(page, 'naoconfirmado@teste.com', 'Senha@123')

    await expect(
      page.getByText('Confirme seu email antes de entrar')
    ).toBeVisible({ timeout: 5_000 })
  })

  // --------------------------------------------------------------------------
  // 3. Login com credenciais invalidas
  // --------------------------------------------------------------------------

  test('credenciais invalidas mostra mensagem em portugues', async ({ page }) => {
    await goToAuth(page)

    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        }),
      })
    })

    await fillLogin(page, 'errado@teste.com', 'SenhaErrada1')

    await expect(
      page.getByText('Email ou senha incorretos')
    ).toBeVisible({ timeout: 5_000 })
  })
})

// ============================================================================
// 4. Login via Google (OAuth)
// ============================================================================

test.describe('Login Google OAuth', () => {
  test('botao "Entrar com Google" inicia fluxo OAuth', async ({ page }) => {
    await goToAuth(page)

    // Intercepta redirect para o provider OAuth do Supabase
    const [request] = await Promise.all([
      page.waitForRequest((req) =>
        req.url().includes('/auth/v1/authorize') && req.url().includes('provider=google')
      ),
      page.getByRole('button', { name: 'Entrar com Google' }).click(),
    ])

    expect(request.url()).toContain('provider=google')
  })
})

// ============================================================================
// 5. Cadastro novo usuario
// ============================================================================

test.describe('Cadastro', () => {
  test('cadastro com dados validos mostra mensagem de confirmacao de email', async ({ page }) => {
    await goToAuth(page)
    await switchToRegisterTab(page)

    // Mocka signup para nao criar usuario real
    await page.route('**/auth/v1/signup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'fake-uuid',
          email: 'novo@teste.com',
          confirmation_sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: { name: 'Novo Usuario' },
          aud: 'authenticated',
        }),
      })
    })

    await page.getByLabel('Nome').fill('Novo Usuario')
    await page.getByLabel('Email').fill('novo@teste.com')
    await page.getByLabel('Senha', { exact: true }).fill('Teste@123')
    await page.getByLabel('Confirmar Senha').fill('Teste@123')
    await page.getByRole('button', { name: 'Criar Conta' }).click()

    await expect(
      page.getByText('Verifique seu email para confirmar')
    ).toBeVisible({ timeout: 5_000 })
  })

  test('validacao de senha exige maiuscula, minuscula e numero', async ({ page }) => {
    await goToAuth(page)
    await switchToRegisterTab(page)

    await page.getByLabel('Nome').fill('Test')
    await page.getByLabel('Email').fill('test@test.com')
    // Senha com 8+ chars mas sem maiuscula e sem numero
    await page.getByLabel('Senha', { exact: true }).fill('somentemin')
    await page.getByLabel('Confirmar Senha').fill('somentemin')
    await page.getByRole('button', { name: 'Criar Conta' }).click()

    // Deve mostrar erros de validacao (min 8 satisfeito, mas faltam maiuscula e numero)
    await expect(page.getByText('Deve conter letra maiuscula')).toBeVisible()
    await expect(page.getByText('Deve conter numero')).toBeVisible()
  })

  test('senhas diferentes mostra erro', async ({ page }) => {
    await goToAuth(page)
    await switchToRegisterTab(page)

    await page.getByLabel('Nome').fill('Test')
    await page.getByLabel('Email').fill('test@test.com')
    await page.getByLabel('Senha', { exact: true }).fill('Teste@123')
    await page.getByLabel('Confirmar Senha').fill('Diferente@1')
    await page.getByRole('button', { name: 'Criar Conta' }).click()

    await expect(page.getByText('Senhas nao conferem')).toBeVisible()
  })
})

// ============================================================================
// 6. Fluxo de convite - novo usuario
// ============================================================================

test.describe('Convite - novo usuario', () => {
  const FAKE_TOKEN = 'test-invite-token-abc123'
  const FAKE_INVITE = {
    id: 'inv-001',
    token: FAKE_TOKEN,
    email: 'convidado@teste.com',
    role: 'seller',
    company_id: 'comp-001',
    invited_by: 'admin-001',
    status: 'pending',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    companies: { name: 'Empresa Teste' },
  }

  test('novo usuario ve formulario de registro com email pre-preenchido', async ({ page }) => {
    // Mocka query de validacao do token
    await page.route('**/rest/v1/invitations*', async (route) => {
      const url = route.request().url()
      if (url.includes(`token=eq.${FAKE_TOKEN}`)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(FAKE_INVITE),
          headers: {
            'content-range': '0-0/1',
          },
        })
      } else {
        await route.continue()
      }
    })

    // Mocka getSession para simular usuario nao logado
    await page.route('**/auth/v1/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { session: null } }),
      })
    })

    await page.goto(`/aceitar-convite?token=${FAKE_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // Deve mostrar formulario de registro
    await expect(page.getByText('Criar sua conta')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Empresa Teste')).toBeVisible()
    await expect(page.getByText('Vendedor')).toBeVisible()

    // Email deve estar pre-preenchido e desabilitado
    const emailInput = page.locator('input[disabled]').first()
    await expect(emailInput).toHaveValue('convidado@teste.com')
  })

  test('novo usuario cria conta via convite e e redirecionado ao dashboard', async ({ page }) => {
    // Mocka invitations query
    await page.route('**/rest/v1/invitations*', async (route) => {
      const method = route.request().method()
      const url = route.request().url()

      if (method === 'GET' && url.includes(`token=eq.${FAKE_TOKEN}`)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(FAKE_INVITE),
          headers: { 'content-range': '0-0/1' },
        })
      } else if (method === 'PATCH') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      } else {
        await route.continue()
      }
    })

    // Mocka session (nao logado)
    await page.route('**/auth/v1/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { session: null } }),
      })
    })

    // Mocka signup
    await page.route('**/auth/v1/signup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'new-user-001',
            email: 'convidado@teste.com',
            app_metadata: {},
            user_metadata: { name: 'Convidado' },
          },
          session: {
            access_token: 'fake-token',
            refresh_token: 'fake-refresh',
            user: { id: 'new-user-001', email: 'convidado@teste.com' },
          },
        }),
      })
    })

    // Mocka inserts (profiles, user_roles)
    await page.route('**/rest/v1/profiles*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
      } else {
        await route.continue()
      }
    })
    await page.route('**/rest/v1/user_roles*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
      } else {
        await route.continue()
      }
    })
    await page.route('**/rest/v1/audit_logs*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
      } else {
        await route.continue()
      }
    })

    await page.goto(`/aceitar-convite?token=${FAKE_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // Preenche formulario de registro
    await expect(page.getByText('Criar sua conta')).toBeVisible({ timeout: 10_000 })
    await page.getByLabel('Nome completo').fill('Convidado Teste')
    await page.getByLabel('Senha', { exact: true }).fill('Teste@123')
    await page.getByLabel('Confirmar senha').fill('Teste@123')
    await page.getByRole('button', { name: 'Criar conta e aceitar convite' }).click()

    // Deve mostrar toast de sucesso
    await expect(
      page.getByText('Conta criada e convite aceito')
    ).toBeVisible({ timeout: 10_000 })
  })
})

// ============================================================================
// 7. Convite - usuario ja existente (logado)
// ============================================================================

test.describe('Convite - usuario existente', () => {
  const FAKE_TOKEN = 'test-existing-user-token'
  const FAKE_INVITE = {
    id: 'inv-002',
    token: FAKE_TOKEN,
    email: 'existente@teste.com',
    role: 'manager',
    company_id: 'comp-002',
    invited_by: 'admin-001',
    status: 'pending',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    companies: { name: 'Outra Empresa' },
  }

  test('usuario logado ve botao "Aceitar convite" e aceita com sucesso', async ({ page }) => {
    // Injeta sessao fake no localStorage ANTES de navegar
    await injectFakeSession(page, {
      id: 'existing-user-001',
      email: 'existente@teste.com',
      user_metadata: { name: 'Usuario Existente' },
    })

    // Mocka getUser
    await page.route('**/auth/v1/user', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'existing-user-001',
            email: 'existente@teste.com',
            app_metadata: { provider: 'email' },
            user_metadata: { name: 'Usuario Existente' },
            aud: 'authenticated',
            role: 'authenticated',
          }),
        })
      } else {
        await route.continue()
      }
    })

    // Mocka invitations
    await page.route('**/rest/v1/invitations*', async (route) => {
      const method = route.request().method()
      const url = route.request().url()

      if (method === 'GET' && url.includes(`token=eq.${FAKE_TOKEN}`)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(FAKE_INVITE),
          headers: { 'content-range': '0-0/1' },
        })
      } else if (method === 'GET' && url.includes('id=eq.inv-002')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'pending' }),
          headers: { 'content-range': '0-0/1' },
        })
      } else if (method === 'PATCH') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      } else {
        await route.continue()
      }
    })

    // Mocka inserts e queries do auth store
    await page.route('**/rest/v1/user_roles*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ user_id: 'existing-user-001', company_id: 'comp-001', role: 'admin' }]),
        })
      }
    })
    await page.route('**/rest/v1/audit_logs*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
      } else {
        await route.continue()
      }
    })
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user_id: 'existing-user-001', name: 'Usuario Existente', email: 'existente@teste.com', company_id: 'comp-001' }),
      })
    })
    await page.route('**/rest/v1/companies*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'comp-001', name: 'Empresa Original', active: true }]),
      })
    })
    await page.route('**/rest/v1/role_permissions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.goto(`/aceitar-convite?token=${FAKE_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // Deve mostrar tela de aceitar convite (nao de registro)
    await expect(page.getByText('Aceitar convite')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Outra Empresa')).toBeVisible()
    await expect(page.getByText('Gestor')).toBeVisible()

    await page.getByRole('button', { name: 'Aceitar convite' }).click()

    await expect(
      page.getByText('Convite aceito com sucesso')
    ).toBeVisible({ timeout: 10_000 })
  })

  test('convite expirado mostra mensagem adequada', async ({ page }) => {
    await page.route('**/rest/v1/invitations*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...FAKE_INVITE,
          expires_at: new Date(Date.now() - 1000).toISOString(), // expirado
        }),
        headers: { 'content-range': '0-0/1' },
      })
    })

    await page.goto(`/aceitar-convite?token=${FAKE_TOKEN}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Convite expirado')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Solicite um novo convite')).toBeVisible()
  })

  test('token invalido mostra mensagem de erro', async ({ page }) => {
    await page.route('**/rest/v1/invitations*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
        headers: { 'content-range': '0-0/0' },
      })
    })

    await page.goto('/aceitar-convite?token=token-invalido')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Convite inválido')).toBeVisible({ timeout: 10_000 })
  })

  test('sem token na URL mostra convite invalido', async ({ page }) => {
    await page.goto('/aceitar-convite')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Convite inválido')).toBeVisible({ timeout: 10_000 })
  })
})

// ============================================================================
// 8. Recuperacao de senha
// ============================================================================

test.describe('Recuperacao de senha', () => {
  test('fluxo de "esqueceu a senha" envia email e mostra confirmacao', async ({ page }) => {
    await goToAuth(page)

    // Clica em "Esqueceu a senha?"
    await page.getByText('Esqueceu a senha?').click()

    // Deve mostrar formulario de reset
    await expect(page.getByText('Recuperar Senha')).toBeVisible()
    await expect(page.getByText('Digite seu email para receber o link')).toBeVisible()

    // Mocka reset password
    await page.route('**/auth/v1/recover', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      })
    })

    await page.getByLabel('Email').fill('admin@teste.com')
    await page.getByRole('button', { name: 'Enviar' }).click()

    await expect(
      page.getByText('Email de recuperacao enviado')
    ).toBeVisible({ timeout: 5_000 })
  })

  test('botao "Voltar" retorna ao login', async ({ page }) => {
    await goToAuth(page)
    await page.getByText('Esqueceu a senha?').click()

    await expect(page.getByText('Recuperar Senha')).toBeVisible()

    await page.getByRole('button', { name: 'Voltar' }).click()

    // Deve voltar para o form de login com tabs
    await expect(page.getByRole('tab', { name: 'Login' })).toBeVisible()
  })
})

// ============================================================================
// 9. Pagina de update-password (apos clicar no link do email)
// ============================================================================

test.describe('Atualizar senha', () => {
  /** Setup comum: injeta sessao + mocka APIs do auth store */
  const setupAuthenticatedPage = async (page: Page) => {
    await injectFakeSession(page, { id: 'user-001', email: 'test@test.com' })

    await page.route('**/auth/v1/user', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'user-001', email: 'test@test.com' }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-001',
            email: 'test@test.com',
            app_metadata: { provider: 'email' },
            user_metadata: { name: 'Test User' },
            aud: 'authenticated',
            role: 'authenticated',
          }),
        })
      }
    })
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user_id: 'user-001', name: 'Test User', email: 'test@test.com', company_id: 'comp-001' }),
      })
    })
    await page.route('**/rest/v1/user_roles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ user_id: 'user-001', company_id: 'comp-001', role: 'admin' }]),
      })
    })
    await page.route('**/rest/v1/companies*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'comp-001', name: 'Test Co', active: true }]),
      })
    })
    await page.route('**/rest/v1/role_permissions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
  }

  test('formulario de nova senha valida e atualiza', async ({ page }) => {
    await setupAuthenticatedPage(page)

    await page.goto('/update-password')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Nova Senha', { exact: true })).toBeVisible({ timeout: 15_000 })

    await page.getByLabel('Nova Senha', { exact: true }).fill('NovaSenha@1')
    await page.getByLabel('Confirmar Senha').fill('NovaSenha@1')
    await page.getByRole('button', { name: 'Atualizar Senha' }).click()

    await expect(
      page.getByText('Senha atualizada com sucesso')
    ).toBeVisible({ timeout: 5_000 })
  })

  test('senhas diferentes mostra erro de validacao', async ({ page }) => {
    await setupAuthenticatedPage(page)

    await page.goto('/update-password')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Nova Senha', { exact: true })).toBeVisible({ timeout: 15_000 })

    await page.getByLabel('Nova Senha', { exact: true }).fill('NovaSenha@1')
    await page.getByLabel('Confirmar Senha').fill('Diferente@2')
    await page.getByRole('button', { name: 'Atualizar Senha' }).click()

    await expect(page.getByText('Senhas nao conferem')).toBeVisible()
  })

  test('senha fraca mostra erros de validacao', async ({ page }) => {
    await setupAuthenticatedPage(page)

    await page.goto('/update-password')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Nova Senha', { exact: true })).toBeVisible({ timeout: 15_000 })

    await page.getByLabel('Nova Senha', { exact: true }).fill('fraca')
    await page.getByLabel('Confirmar Senha').fill('fraca')
    await page.getByRole('button', { name: 'Atualizar Senha' }).click()

    await expect(page.getByText('Minimo 8 caracteres')).toBeVisible()
  })
})
