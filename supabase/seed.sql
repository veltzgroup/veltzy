-- ============================================
-- SEED: Veltz Group (empresa de teste)
-- company_id: d20f7d62-974b-40c4-8f0b-bb8207513554
-- Rodar no SQL Editor do Supabase Dashboard
-- ATENCAO: Nao rodar em producao
-- ============================================

DO $$
DECLARE
  cid UUID := 'd20f7d62-974b-40c4-8f0b-bb8207513554';
  stage_novo UUID;
  stage_qualificando UUID;
  stage_proposta UUID;
  stage_negociacao UUID;
  stage_fechado UUID;
  stage_perdido UUID;
  existing_count INT;
BEGIN

-- ============================================
-- TAREFA 1: Pipeline Stages
-- ============================================

SELECT COUNT(*) INTO existing_count FROM veltzy.pipeline_stages WHERE company_id = cid;

IF existing_count > 0 THEN
  RAISE NOTICE 'Pipeline stages ja existem (%). Pulando insercao de stages.', existing_count;

  SELECT id INTO stage_novo FROM veltzy.pipeline_stages WHERE company_id = cid AND slug = 'novo';
  SELECT id INTO stage_qualificando FROM veltzy.pipeline_stages WHERE company_id = cid AND slug = 'qualificando';
  SELECT id INTO stage_proposta FROM veltzy.pipeline_stages WHERE company_id = cid AND slug = 'proposta';
  SELECT id INTO stage_negociacao FROM veltzy.pipeline_stages WHERE company_id = cid AND slug = 'negociacao';
  SELECT id INTO stage_fechado FROM veltzy.pipeline_stages WHERE company_id = cid AND slug = 'fechado';
  SELECT id INTO stage_perdido FROM veltzy.pipeline_stages WHERE company_id = cid AND slug = 'perdido';

  -- Fallback por position se slugs nao baterem
  IF stage_novo IS NULL THEN
    SELECT id INTO stage_novo FROM veltzy.pipeline_stages WHERE company_id = cid ORDER BY position LIMIT 1;
  END IF;
  IF stage_qualificando IS NULL THEN
    SELECT id INTO stage_qualificando FROM veltzy.pipeline_stages WHERE company_id = cid ORDER BY position LIMIT 1 OFFSET 1;
  END IF;
  IF stage_proposta IS NULL THEN
    SELECT id INTO stage_proposta FROM veltzy.pipeline_stages WHERE company_id = cid ORDER BY position LIMIT 1 OFFSET 2;
  END IF;
  IF stage_negociacao IS NULL THEN
    SELECT id INTO stage_negociacao FROM veltzy.pipeline_stages WHERE company_id = cid ORDER BY position LIMIT 1 OFFSET 3;
  END IF;
  IF stage_fechado IS NULL THEN
    SELECT id INTO stage_fechado FROM veltzy.pipeline_stages WHERE company_id = cid ORDER BY position LIMIT 1 OFFSET 4;
  END IF;
  IF stage_perdido IS NULL THEN
    SELECT id INTO stage_perdido FROM veltzy.pipeline_stages WHERE company_id = cid ORDER BY position LIMIT 1 OFFSET 5;
  END IF;

ELSE
  INSERT INTO veltzy.pipeline_stages (company_id, name, slug, color, position, is_final, is_positive)
  VALUES (cid, 'Novo',         'novo',         '#6366f1', 1, false, null)
  RETURNING id INTO stage_novo;

  INSERT INTO veltzy.pipeline_stages (company_id, name, slug, color, position, is_final, is_positive)
  VALUES (cid, 'Qualificando', 'qualificando', '#a855f7', 2, false, null)
  RETURNING id INTO stage_qualificando;

  INSERT INTO veltzy.pipeline_stages (company_id, name, slug, color, position, is_final, is_positive)
  VALUES (cid, 'Proposta',     'proposta',     '#f59e0b', 3, false, null)
  RETURNING id INTO stage_proposta;

  INSERT INTO veltzy.pipeline_stages (company_id, name, slug, color, position, is_final, is_positive)
  VALUES (cid, 'Negociacao',   'negociacao',   '#ef4444', 4, false, null)
  RETURNING id INTO stage_negociacao;

  INSERT INTO veltzy.pipeline_stages (company_id, name, slug, color, position, is_final, is_positive)
  VALUES (cid, 'Fechado',      'fechado',      '#10b981', 5, true,  true)
  RETURNING id INTO stage_fechado;

  INSERT INTO veltzy.pipeline_stages (company_id, name, slug, color, position, is_final, is_positive)
  VALUES (cid, 'Perdido',      'perdido',      '#6b7280', 6, true,  false)
  RETURNING id INTO stage_perdido;

  RAISE NOTICE '6 pipeline stages inseridos com sucesso.';
END IF;

-- ============================================
-- TAREFA 2: 20 Leads de Teste
-- ============================================

INSERT INTO veltzy.leads (
  company_id, name, email, phone, avatar_url, stage_id, temperature, ai_score,
  deal_value, status, conversation_status, tags, observations, created_at
) VALUES
-- Fase: Novo (4 leads)
(cid, 'Lucas Oliveira',    'lucas.oliveira@email.com',    '(11) 98721-3344', 'https://i.pravatar.cc/150?img=1',  stage_novo, 'cold', 25, 3500,  'new', 'unread',  '{"inbound"}',     'Chegou via campanha do Instagram',          now() - interval '2 days'),
(cid, 'Mariana Santos',    'mariana.santos@email.com',    '(11) 97654-8821', 'https://i.pravatar.cc/150?img=2',  stage_novo, 'warm', 40, 5000,  'new', 'unread',  '{"whatsapp"}',    'Perguntou sobre planos enterprise',         now() - interval '5 days'),
(cid, 'Rafael Costa',      'rafael.costa@email.com',      '(11) 99432-1100', 'https://i.pravatar.cc/150?img=3',  stage_novo, 'cold', 20, 2000,  'new', 'unread',  '{"organico"}',    'Lead frio, sem interacao ainda',             now() - interval '1 day'),
(cid, 'Camila Ferreira',   'camila.ferreira@email.com',   '(11) 98877-5533', 'https://i.pravatar.cc/150?img=4',  stage_novo, 'warm', 35, 8000,  'new', 'unread',  '{"indicacao"}',   'Indicada por cliente existente',             now() - interval '3 days'),

-- Fase: Qualificando (4 leads)
(cid, 'Bruno Almeida',     'bruno.almeida@email.com',     '(11) 96543-2211', 'https://i.pravatar.cc/150?img=5',  stage_qualificando, 'warm', 55, 12000, 'qualifying', 'replied',  '{"whatsapp"}',    'Respondeu bem ao primeiro contato',          now() - interval '7 days'),
(cid, 'Juliana Rocha',     'juliana.rocha@email.com',     '(11) 97788-9900', 'https://i.pravatar.cc/150?img=6',  stage_qualificando, 'hot',  70, 25000, 'qualifying', 'replied',  '{"instagram"}',   'Demonstrou interesse no plano premium',      now() - interval '10 days'),
(cid, 'Pedro Henrique',    'pedro.henrique@email.com',    '(11) 99111-4455', 'https://i.pravatar.cc/150?img=7',  stage_qualificando, 'warm', 48, 7500,  'qualifying', 'waiting_client', '{"manual"}', 'Aguardando retorno sobre orcamento',        now() - interval '6 days'),
(cid, 'Ana Clara Souza',   'anaclara.souza@email.com',    '(11) 98234-6677', 'https://i.pravatar.cc/150?img=8',  stage_qualificando, 'hot',  65, 18000, 'qualifying', 'replied',  '{"whatsapp"}',    'IA SDR qualificou como alta prioridade',     now() - interval '8 days'),

-- Fase: Proposta (4 leads)
(cid, 'Fernando Lima',     'fernando.lima@email.com',     '(11) 97321-8844', 'https://i.pravatar.cc/150?img=9',  stage_proposta, 'hot',  78, 35000, 'open', 'replied',  '{"whatsapp"}',    'Proposta enviada, aguardando aprovacao',     now() - interval '12 days'),
(cid, 'Gabriela Martins',  'gabriela.martins@email.com',  '(11) 96655-3322', 'https://i.pravatar.cc/150?img=10', stage_proposta, 'hot',  82, 42000, 'open', 'waiting_client', '{"instagram"}', 'Negociando prazo de implementacao',         now() - interval '14 days'),
(cid, 'Thiago Barbosa',    'thiago.barbosa@email.com',    '(11) 99876-1122', 'https://i.pravatar.cc/150?img=11', stage_proposta, 'warm', 60, 15000, 'open', 'replied',  '{"manual"}',      'Pediu desconto para pagamento anual',       now() - interval '11 days'),
(cid, 'Isabela Nunes',     'isabela.nunes@email.com',     '(11) 98543-7788', 'https://i.pravatar.cc/150?img=12', stage_proposta, 'fire', 90, 55000, 'open', 'replied',  '{"indicacao"}',   'CEO interessado, deal grande',               now() - interval '9 days'),

-- Fase: Negociacao (3 leads)
(cid, 'Diego Carvalho',    'diego.carvalho@email.com',    '(11) 97432-5566', 'https://i.pravatar.cc/150?img=13', stage_negociacao, 'fire', 88, 60000, 'open', 'replied',     '{"whatsapp"}', 'Negociando condicoes de contrato',          now() - interval '16 days'),
(cid, 'Patricia Gomes',    'patricia.gomes@email.com',    '(11) 96788-4433', 'https://i.pravatar.cc/150?img=14', stage_negociacao, 'hot',  75, 28000, 'open', 'waiting_internal', '{"instagram"}', 'Aguardando aprovacao do juridico',       now() - interval '18 days'),
(cid, 'Rodrigo Pereira',   'rodrigo.pereira@email.com',   '(11) 99234-8899', 'https://i.pravatar.cc/150?img=15', stage_negociacao, 'fire', 92, 80000, 'open', 'replied',     '{"whatsapp"}', 'Maior deal do mes, prioridade maxima',      now() - interval '20 days'),

-- Fase: Fechado (3 leads)
(cid, 'Amanda Ribeiro',    'amanda.ribeiro@email.com',    '(11) 98321-6655', 'https://i.pravatar.cc/150?img=16', stage_fechado, 'fire', 95, 45000, 'deal', 'resolved', '{"whatsapp"}',    'Contrato assinado, onboarding agendado',    now() - interval '22 days'),
(cid, 'Carlos Eduardo',    'carlos.eduardo@email.com',    '(11) 97654-2233', 'https://i.pravatar.cc/150?img=17', stage_fechado, 'fire', 88, 32000, 'deal', 'resolved', '{"instagram"}',   'Cliente satisfeito, potencial de upsell',   now() - interval '25 days'),
(cid, 'Leticia Mendes',    'leticia.mendes@email.com',    '(11) 96543-9911', 'https://i.pravatar.cc/150?img=18', stage_fechado, 'hot',  80, 22000, 'deal', 'resolved', '{"manual"}',      'Fechou apos demo personalizada',            now() - interval '28 days'),

-- Fase: Perdido (2 leads)
(cid, 'Marcos Vieira',     'marcos.vieira@email.com',     '(11) 99876-3344', 'https://i.pravatar.cc/150?img=19', stage_perdido, 'cold', 30, 10000, 'lost', 'resolved', '{"whatsapp"}',    'Optou pelo concorrente por preco',          now() - interval '15 days'),
(cid, 'Fernanda Dias',     'fernanda.dias@email.com',     '(11) 98765-1122', 'https://i.pravatar.cc/150?img=20', stage_perdido, 'warm', 45, 18000, 'lost', 'resolved', '{"instagram"}',   'Projeto cancelado internamente',            now() - interval '21 days');

RAISE NOTICE '20 leads inseridos com sucesso para Veltz Group.';

END;
$$;

-- Verificacao final: resumo por fase
SELECT
  ps.name AS fase,
  ps.position,
  COUNT(l.id) AS total_leads,
  COALESCE(SUM(l.deal_value), 0) AS valor_total
FROM veltzy.pipeline_stages ps
LEFT JOIN veltzy.leads l ON l.stage_id = ps.id
WHERE ps.company_id = 'd20f7d62-974b-40c4-8f0b-bb8207513554'
GROUP BY ps.name, ps.position
ORDER BY ps.position;
