# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Convite - usuario existente >> usuario logado ve botao "Aceitar convite" e aceita com sucesso
- Location: e2e/auth.spec.ts:404:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
=========================== logs ===========================
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
  "commit" event fired
  "domcontentloaded" event fired
  "load" event fired
============================================================
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - img [ref=e4]
```

# Test source

```ts
  400 |     created_at: new Date().toISOString(),
  401 |     companies: { name: 'Outra Empresa' },
  402 |   }
  403 | 
  404 |   test('usuario logado ve botao "Aceitar convite" e aceita com sucesso', async ({ page }) => {
  405 |     // Injeta sessao fake no localStorage ANTES de navegar
  406 |     await injectFakeSession(page, {
  407 |       id: 'existing-user-001',
  408 |       email: 'existente@teste.com',
  409 |       user_metadata: { name: 'Usuario Existente' },
  410 |     })
  411 | 
  412 |     // Mocka getUser
  413 |     await page.route('**/auth/v1/user', async (route) => {
  414 |       if (route.request().method() === 'GET') {
  415 |         await route.fulfill({
  416 |           status: 200,
  417 |           contentType: 'application/json',
  418 |           body: JSON.stringify({
  419 |             id: 'existing-user-001',
  420 |             email: 'existente@teste.com',
  421 |             app_metadata: { provider: 'email' },
  422 |             user_metadata: { name: 'Usuario Existente' },
  423 |             aud: 'authenticated',
  424 |             role: 'authenticated',
  425 |           }),
  426 |         })
  427 |       } else {
  428 |         await route.continue()
  429 |       }
  430 |     })
  431 | 
  432 |     // Mocka invitations
  433 |     await page.route('**/rest/v1/invitations*', async (route) => {
  434 |       const method = route.request().method()
  435 |       const url = route.request().url()
  436 | 
  437 |       if (method === 'GET' && url.includes(`token=eq.${FAKE_TOKEN}`)) {
  438 |         await route.fulfill({
  439 |           status: 200,
  440 |           contentType: 'application/json',
  441 |           body: JSON.stringify(FAKE_INVITE),
  442 |           headers: { 'content-range': '0-0/1' },
  443 |         })
  444 |       } else if (method === 'GET' && url.includes('id=eq.inv-002')) {
  445 |         await route.fulfill({
  446 |           status: 200,
  447 |           contentType: 'application/json',
  448 |           body: JSON.stringify({ status: 'pending' }),
  449 |           headers: { 'content-range': '0-0/1' },
  450 |         })
  451 |       } else if (method === 'PATCH') {
  452 |         await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  453 |       } else {
  454 |         await route.continue()
  455 |       }
  456 |     })
  457 | 
  458 |     // Mocka inserts e queries do auth store
  459 |     await page.route('**/rest/v1/user_roles*', async (route) => {
  460 |       if (route.request().method() === 'POST') {
  461 |         await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
  462 |       } else {
  463 |         await route.fulfill({
  464 |           status: 200,
  465 |           contentType: 'application/json',
  466 |           body: JSON.stringify([{ user_id: 'existing-user-001', company_id: 'comp-001', role: 'admin' }]),
  467 |         })
  468 |       }
  469 |     })
  470 |     await page.route('**/rest/v1/audit_logs*', async (route) => {
  471 |       if (route.request().method() === 'POST') {
  472 |         await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
  473 |       } else {
  474 |         await route.continue()
  475 |       }
  476 |     })
  477 |     await page.route('**/rest/v1/profiles*', async (route) => {
  478 |       await route.fulfill({
  479 |         status: 200,
  480 |         contentType: 'application/json',
  481 |         body: JSON.stringify({ user_id: 'existing-user-001', name: 'Usuario Existente', email: 'existente@teste.com', company_id: 'comp-001' }),
  482 |       })
  483 |     })
  484 |     await page.route('**/rest/v1/companies*', async (route) => {
  485 |       await route.fulfill({
  486 |         status: 200,
  487 |         contentType: 'application/json',
  488 |         body: JSON.stringify([{ id: 'comp-001', name: 'Empresa Original', active: true }]),
  489 |       })
  490 |     })
  491 |     await page.route('**/rest/v1/role_permissions*', async (route) => {
  492 |       await route.fulfill({
  493 |         status: 200,
  494 |         contentType: 'application/json',
  495 |         body: JSON.stringify([]),
  496 |       })
  497 |     })
  498 | 
  499 |     await page.goto(`/aceitar-convite?token=${FAKE_TOKEN}`)
> 500 |     await page.waitForLoadState('networkidle')
      |                ^ Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
  501 | 
  502 |     // Deve mostrar tela de aceitar convite (nao de registro)
  503 |     await expect(page.getByText('Aceitar convite')).toBeVisible({ timeout: 15_000 })
  504 |     await expect(page.getByText('Outra Empresa')).toBeVisible()
  505 |     await expect(page.getByText('Gestor')).toBeVisible()
  506 | 
  507 |     await page.getByRole('button', { name: 'Aceitar convite' }).click()
  508 | 
  509 |     await expect(
  510 |       page.getByText('Convite aceito com sucesso')
  511 |     ).toBeVisible({ timeout: 10_000 })
  512 |   })
  513 | 
  514 |   test('convite expirado mostra mensagem adequada', async ({ page }) => {
  515 |     await page.route('**/rest/v1/invitations*', async (route) => {
  516 |       await route.fulfill({
  517 |         status: 200,
  518 |         contentType: 'application/json',
  519 |         body: JSON.stringify({
  520 |           ...FAKE_INVITE,
  521 |           expires_at: new Date(Date.now() - 1000).toISOString(), // expirado
  522 |         }),
  523 |         headers: { 'content-range': '0-0/1' },
  524 |       })
  525 |     })
  526 | 
  527 |     await page.goto(`/aceitar-convite?token=${FAKE_TOKEN}`)
  528 |     await page.waitForLoadState('networkidle')
  529 | 
  530 |     await expect(page.getByText('Convite expirado')).toBeVisible({ timeout: 10_000 })
  531 |     await expect(page.getByText('Solicite um novo convite')).toBeVisible()
  532 |   })
  533 | 
  534 |   test('token invalido mostra mensagem de erro', async ({ page }) => {
  535 |     await page.route('**/rest/v1/invitations*', async (route) => {
  536 |       await route.fulfill({
  537 |         status: 200,
  538 |         contentType: 'application/json',
  539 |         body: JSON.stringify(null),
  540 |         headers: { 'content-range': '0-0/0' },
  541 |       })
  542 |     })
  543 | 
  544 |     await page.goto('/aceitar-convite?token=token-invalido')
  545 |     await page.waitForLoadState('networkidle')
  546 | 
  547 |     await expect(page.getByText('Convite inválido')).toBeVisible({ timeout: 10_000 })
  548 |   })
  549 | 
  550 |   test('sem token na URL mostra convite invalido', async ({ page }) => {
  551 |     await page.goto('/aceitar-convite')
  552 |     await page.waitForLoadState('networkidle')
  553 | 
  554 |     await expect(page.getByText('Convite inválido')).toBeVisible({ timeout: 10_000 })
  555 |   })
  556 | })
  557 | 
  558 | // ============================================================================
  559 | // 8. Recuperacao de senha
  560 | // ============================================================================
  561 | 
  562 | test.describe('Recuperacao de senha', () => {
  563 |   test('fluxo de "esqueceu a senha" envia email e mostra confirmacao', async ({ page }) => {
  564 |     await goToAuth(page)
  565 | 
  566 |     // Clica em "Esqueceu a senha?"
  567 |     await page.getByText('Esqueceu a senha?').click()
  568 | 
  569 |     // Deve mostrar formulario de reset
  570 |     await expect(page.getByText('Recuperar Senha')).toBeVisible()
  571 |     await expect(page.getByText('Digite seu email para receber o link')).toBeVisible()
  572 | 
  573 |     // Mocka reset password
  574 |     await page.route('**/auth/v1/recover', async (route) => {
  575 |       await route.fulfill({
  576 |         status: 200,
  577 |         contentType: 'application/json',
  578 |         body: '{}',
  579 |       })
  580 |     })
  581 | 
  582 |     await page.getByLabel('Email').fill('admin@teste.com')
  583 |     await page.getByRole('button', { name: 'Enviar' }).click()
  584 | 
  585 |     await expect(
  586 |       page.getByText('Email de recuperacao enviado')
  587 |     ).toBeVisible({ timeout: 5_000 })
  588 |   })
  589 | 
  590 |   test('botao "Voltar" retorna ao login', async ({ page }) => {
  591 |     await goToAuth(page)
  592 |     await page.getByText('Esqueceu a senha?').click()
  593 | 
  594 |     await expect(page.getByText('Recuperar Senha')).toBeVisible()
  595 | 
  596 |     await page.getByRole('button', { name: 'Voltar' }).click()
  597 | 
  598 |     // Deve voltar para o form de login com tabs
  599 |     await expect(page.getByRole('tab', { name: 'Login' })).toBeVisible()
  600 |   })
```