-- Seed 20 leads fictícios para pipeline "Pipe mockup" da Veltz Group
-- Todos com dados completos: avatar, email, telefone, instagram, linkedin, observations, tags

DO $$
DECLARE
  v_company_id uuid;
  v_pipeline_id uuid;
  v_assigned_to uuid;
  -- Stages (buscados dinamicamente por posição)
  s1 uuid; s2 uuid; s3 uuid; s4 uuid; s5 uuid; s6 uuid;
  -- Sources
  src_whatsapp uuid;
  src_instagram uuid;
  src_manual uuid;
  -- Lead ID temp
  lid uuid;
BEGIN

  -- Buscar company Veltz Group
  SELECT id INTO v_company_id FROM public.companies WHERE name ILIKE '%veltz%' LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company Veltz Group nao encontrada';
  END IF;

  -- Buscar pipeline "Pipe mockup"
  SELECT id INTO v_pipeline_id FROM veltzy.pipelines WHERE company_id = v_company_id AND name ILIKE '%pipe mockup%' LIMIT 1;
  IF v_pipeline_id IS NULL THEN
    RAISE EXCEPTION 'Pipeline "Pipe mockup" nao encontrada para company %', v_company_id;
  END IF;

  -- Buscar assigned_to (primeiro perfil da empresa)
  SELECT p.id INTO v_assigned_to FROM public.profiles p WHERE p.company_id = v_company_id LIMIT 1;

  -- Buscar stages da pipeline ordenados por posição
  SELECT id INTO s1 FROM veltzy.pipeline_stages WHERE pipeline_id = v_pipeline_id ORDER BY position ASC LIMIT 1 OFFSET 0;
  SELECT id INTO s2 FROM veltzy.pipeline_stages WHERE pipeline_id = v_pipeline_id ORDER BY position ASC LIMIT 1 OFFSET 1;
  SELECT id INTO s3 FROM veltzy.pipeline_stages WHERE pipeline_id = v_pipeline_id ORDER BY position ASC LIMIT 1 OFFSET 2;
  SELECT id INTO s4 FROM veltzy.pipeline_stages WHERE pipeline_id = v_pipeline_id ORDER BY position ASC LIMIT 1 OFFSET 3;
  SELECT id INTO s5 FROM veltzy.pipeline_stages WHERE pipeline_id = v_pipeline_id ORDER BY position ASC LIMIT 1 OFFSET 4;
  SELECT id INTO s6 FROM veltzy.pipeline_stages WHERE pipeline_id = v_pipeline_id ORDER BY position ASC LIMIT 1 OFFSET 5;

  -- Buscar sources
  SELECT id INTO src_whatsapp FROM veltzy.lead_sources WHERE company_id = v_company_id AND slug = 'whatsapp' LIMIT 1;
  SELECT id INTO src_instagram FROM veltzy.lead_sources WHERE company_id = v_company_id AND slug = 'instagram' LIMIT 1;
  SELECT id INTO src_manual FROM veltzy.lead_sources WHERE company_id = v_company_id AND slug = 'manual' LIMIT 1;

  RAISE NOTICE 'Company: %, Pipeline: %, Stages: % / % / % / % / % / %', v_company_id, v_pipeline_id, s1, s2, s3, s4, s5, s6;

  -- =============================================
  -- STAGE 1 (posição 0) - 4 leads
  -- =============================================

  -- Lead 1: Renata Vieira
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Renata Vieira', '11985001001', 'renata.vieira@techsolutions.com.br', 'https://i.pravatar.cc/150?img=1', src_whatsapp, s1, 'new', 'cold', 18, v_assigned_to, false, false, 'unread', ARRAY['interessado'], 4200, 'Dona de agência de marketing digital com 6 funcionários. Encontrou a Veltzy pelo Google. Ainda não respondeu última mensagem.', v_pipeline_id, '@renatavieira.mkt', 'linkedin.com/in/renatavieira', now() - interval '30 days', now() - interval '30 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Oi, encontrei vocês pelo Google. Estou procurando um CRM para minha agência de marketing digital.', 'lead', 'text', 'whatsapp', false, true, now() - interval '30 days'),
  (gen_random_uuid(), lid, v_company_id, 'Olá Renata! Seja bem-vinda. Quantas pessoas tem na sua equipe?', 'human', 'text', 'whatsapp', false, true, now() - interval '29 days');

  -- Lead 2: Eduardo Machado
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Eduardo Machado', '11985001002', 'eduardo.machado@alphaeng.com.br', 'https://i.pravatar.cc/150?img=3', src_instagram, s1, 'new', 'warm', 35, v_assigned_to, false, false, 'read', ARRAY['indicação', 'interessado'], 8900, 'Engenheiro, CEO da Alpha Engenharia. Indicado pelo Roberto Dias. Quer demo do plano corporativo. Agendar call quinta de manhã.', v_pipeline_id, '@eduardomachado.eng', 'linkedin.com/in/eduardomachado', now() - interval '28 days', now() - interval '28 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Boa tarde! O Roberto Dias me indicou. Quero saber sobre o plano corporativo.', 'lead', 'text', 'whatsapp', false, true, now() - interval '28 days'),
  (gen_random_uuid(), lid, v_company_id, 'Eduardo, que bom que o Roberto indicou! O plano corporativo atende até 50 usuarios. Quer agendar uma demo?', 'human', 'text', 'whatsapp', false, true, now() - interval '27 days'),
  (gen_random_uuid(), lid, v_company_id, 'Sim, pode ser na quinta de manhã?', 'lead', 'text', 'whatsapp', false, false, now() - interval '26 days');

  -- Lead 3: Priscila Duarte
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Priscila Duarte', '11985001003', 'priscila.duarte@contabilmax.com.br', 'https://i.pravatar.cc/150?img=5', src_manual, s1, 'new', 'cold', 12, v_assigned_to, false, false, 'unread', ARRAY['retomar'], 2800, 'Contadora, pegou cartão no evento TechConf 2026. Escritório pequeno, 3 sócios. Precisa follow-up.', v_pipeline_id, '@prisciladuarte.contabil', 'linkedin.com/in/prisciladuarte', now() - interval '25 days', now() - interval '25 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Peguei o cartão de vocês no evento de tecnologia. Podem me enviar mais informações?', 'lead', 'text', 'whatsapp', false, false, now() - interval '25 days');

  -- Lead 4: Henrique Bastos
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Henrique Bastos', '11985001004', 'henrique.bastos@novahorizonte.com', 'https://i.pravatar.cc/150?img=7', src_whatsapp, s1, 'new', 'warm', 42, v_assigned_to, false, false, 'replied', ARRAY['interessado'], 6500, 'Diretor comercial da Nova Horizonte Imóveis. 12 vendedores + 3 gerentes. Viu video no YouTube sobre automação. Interesse alto.', v_pipeline_id, '@henriquebastos.imoveis', 'linkedin.com/in/henriquebastos', now() - interval '22 days', now() - interval '22 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Vi o video de vocês no YouTube sobre automação de vendas. Quero implementar na minha empresa.', 'lead', 'text', 'whatsapp', false, true, now() - interval '22 days'),
  (gen_random_uuid(), lid, v_company_id, 'Henrique! Que legal que curtiu o conteúdo. A automação é um dos nossos diferenciais. Qual o tamanho do time comercial?', 'human', 'text', 'whatsapp', false, true, now() - interval '21 days'),
  (gen_random_uuid(), lid, v_company_id, 'Temos 12 vendedores e 3 gerentes.', 'lead', 'text', 'whatsapp', false, false, now() - interval '20 days');

  -- =============================================
  -- STAGE 2 (posição 1) - 4 leads
  -- =============================================

  -- Lead 5: Tatiana Moura
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Tatiana Moura', '11985001005', 'tatiana.moura@designstudio.art', 'https://i.pravatar.cc/150?img=9', src_instagram, s2, 'qualifying', 'warm', 55, v_assigned_to, false, false, 'waiting_client', ARRAY['interessado'], 11000, 'Dona de estúdio de design. 40 clientes recorrentes + 20 novos/mês. Usa planilha hoje. Boa oportunidade de upgrade.', v_pipeline_id, '@tatianamoura.design', 'linkedin.com/in/tatianamoura', now() - interval '20 days', now() - interval '20 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Boa noite! Meu estúdio de design precisa organizar os clientes. Usamos planilha hoje.', 'lead', 'text', 'whatsapp', false, true, now() - interval '20 days'),
  (gen_random_uuid(), lid, v_company_id, 'Tatiana, sair da planilha vai transformar sua operação! Quantos clientes ativos vocês tem?', 'human', 'text', 'whatsapp', false, true, now() - interval '19 days'),
  (gen_random_uuid(), lid, v_company_id, 'Uns 40 clientes recorrentes e mais uns 20 novos por mês.', 'lead', 'text', 'whatsapp', false, false, now() - interval '18 days');

  -- Lead 6: André Fonseca
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'André Fonseca', '11985001006', 'andre.fonseca@fonsecaadv.com.br', 'https://i.pravatar.cc/150?img=11', src_whatsapp, s2, 'qualifying', 'hot', 68, v_assigned_to, false, false, 'replied', ARRAY['vip', 'urgente'], 22000, 'Advogado, sócio do Fonseca & Associados. Perdendo prazos por falta de organização. Urgência real. Agendar call ASAP.', v_pipeline_id, '@andrefonseca.adv', 'linkedin.com/in/andrefonseca', now() - interval '18 days', now() - interval '18 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Preciso urgente de um CRM. Estamos perdendo prazos e clientes por falta de organização.', 'lead', 'text', 'whatsapp', false, true, now() - interval '18 days'),
  (gen_random_uuid(), lid, v_company_id, 'André, posso te ajudar! O Veltzy tem gestão de tarefas e lembretes automáticos. Vamos fazer uma call hoje?', 'human', 'text', 'whatsapp', false, true, now() - interval '17 days');

  -- Lead 7: Bianca Cavalcanti
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Bianca Cavalcanti', '11985001007', 'bianca.cavalcanti@petshopbela.com', 'https://i.pravatar.cc/150?img=16', src_manual, s2, 'qualifying', 'warm', 50, v_assigned_to, false, false, 'read', ARRAY['interessado'], 7500, 'Rede de 3 pet shops com 4 atendentes cada. Quer centralizar atendimento WhatsApp. Bom fit para módulo multicanal.', v_pipeline_id, '@biancacavalcanti.pet', 'linkedin.com/in/biancacavalcanti', now() - interval '16 days', now() - interval '16 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Oi! Tenho uma rede de pet shops e quero centralizar o atendimento ao cliente.', 'lead', 'text', 'whatsapp', false, true, now() - interval '16 days'),
  (gen_random_uuid(), lid, v_company_id, 'Bianca! Pet shops adoram nosso módulo de WhatsApp. Quantas unidades você tem?', 'human', 'text', 'whatsapp', false, true, now() - interval '15 days'),
  (gen_random_uuid(), lid, v_company_id, 'Três lojas, cada uma com 4 atendentes.', 'lead', 'text', 'whatsapp', false, false, now() - interval '14 days');

  -- Lead 8: Rodrigo Pinto
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Rodrigo Pinto', '11985001008', 'rodrigo.pinto@construpinto.com.br', 'https://i.pravatar.cc/150?img=12', src_instagram, s2, 'qualifying', 'cold', 32, v_assigned_to, false, false, 'unread', ARRAY['retomar'], 5000, 'Engenheiro civil, construtora de médio porte. Pesquisando CRMs para setor imobiliário. Não respondeu follow-up.', v_pipeline_id, '@rodrigopinto.eng', 'linkedin.com/in/rodrigopinto', now() - interval '14 days', now() - interval '14 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'To pesquisando CRMs pra construtora. Vocês atendem esse setor?', 'lead', 'text', 'whatsapp', false, true, now() - interval '14 days'),
  (gen_random_uuid(), lid, v_company_id, 'Rodrigo, sim! Temos clientes no setor de construção. O pipeline se adapta perfeitamente ao ciclo de venda de imóveis.', 'human', 'text', 'whatsapp', false, true, now() - interval '13 days');

  -- =============================================
  -- STAGE 3 (posição 2) - 4 leads
  -- =============================================

  -- Lead 9: Daniela Ribeiro
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Daniela Ribeiro', '11985001009', 'daniela.ribeiro@medcenter.com.br', 'https://i.pravatar.cc/150?img=20', src_whatsapp, s3, 'open', 'hot', 76, v_assigned_to, false, false, 'waiting_client', ARRAY['vip'], 35000, 'Diretora do MedCenter, clínica com 8 médicos. Proposta enviada, revisando com sócio. Ligar quarta à tarde para follow-up.', v_pipeline_id, '@danielaribeiro.med', 'linkedin.com/in/danielaribeiro', now() - interval '15 days', now() - interval '15 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Recebi a proposta. Parece bem completa. Vou revisar com meu sócio nesta semana.', 'lead', 'text', 'whatsapp', false, true, now() - interval '15 days'),
  (gen_random_uuid(), lid, v_company_id, 'Daniela, fico à disposição para tirar qualquer dúvida. Posso ligar na quarta pra alinharmos?', 'human', 'text', 'whatsapp', false, true, now() - interval '14 days'),
  (gen_random_uuid(), lid, v_company_id, 'Quarta à tarde seria perfeito!', 'lead', 'text', 'whatsapp', false, false, now() - interval '13 days');

  -- Lead 10: Felipe Nogueira
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Felipe Nogueira', '11985001010', 'felipe.nogueira@logflex.com.br', 'https://i.pravatar.cc/150?img=13', src_whatsapp, s3, 'open', 'hot', 80, v_assigned_to, false, false, 'replied', ARRAY['urgente', 'interessado'], 42000, 'CEO da LogFlex Logística. 20 funcionários. Pediu inclusão de relatórios avançados (já incluso no Pro). Proposta atualizada.', v_pipeline_id, '@felipenogueira.log', 'linkedin.com/in/felipenogueira', now() - interval '12 days', now() - interval '12 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'A proposta ta boa, mas preciso incluir módulo de relatórios avançados. Quanto fica?', 'lead', 'text', 'whatsapp', false, true, now() - interval '12 days'),
  (gen_random_uuid(), lid, v_company_id, 'Felipe, o módulo de relatórios avançados está incluso no plano Pro! Já atualizei a proposta.', 'human', 'text', 'whatsapp', false, true, now() - interval '11 days');

  -- Lead 11: Viviane Castro
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Viviane Castro', '11985001011', 'viviane.castro@educaplus.edu.br', 'https://i.pravatar.cc/150?img=23', src_instagram, s3, 'open', 'fire', 88, v_assigned_to, false, false, 'replied', ARRAY['vip', 'urgente'], 58000, 'Reitora da EducaPlus, rede com 3 unidades. Quer Enterprise para todas. Onboarding em 48h após assinatura. Enviar contrato HOJE.', v_pipeline_id, '@vivianecastro.edu', 'linkedin.com/in/vivianecastro', now() - interval '10 days', now() - interval '10 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Quero fechar o plano Enterprise para 3 unidades da escola. Quando começa o onboarding?', 'lead', 'text', 'whatsapp', false, true, now() - interval '10 days'),
  (gen_random_uuid(), lid, v_company_id, 'Viviane, excelente! O onboarding pode iniciar em 48h após a assinatura. Envio o contrato hoje!', 'human', 'text', 'whatsapp', false, true, now() - interval '9 days'),
  (gen_random_uuid(), lid, v_company_id, 'Ótimo, aguardo o contrato por email.', 'lead', 'text', 'whatsapp', false, false, now() - interval '8 days');

  -- Lead 12: Marcelo Azevedo
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Marcelo Azevedo', '11985001012', 'marcelo.azevedo@aztrading.com', 'https://i.pravatar.cc/150?img=14', src_manual, s3, 'open', 'warm', 60, v_assigned_to, false, false, 'waiting_client', ARRAY['indicação'], 19000, 'Trading company, 10 colaboradores. Comparando com Pipedrive atual. Preparar comparativo mostrando diferenciais (WhatsApp + IA).', v_pipeline_id, '@marceloazevedo.trade', 'linkedin.com/in/marceloazevedo', now() - interval '11 days', now() - interval '11 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Proposta recebida! Vou comparar com o Pipedrive que usamos hoje.', 'lead', 'text', 'whatsapp', false, true, now() - interval '11 days'),
  (gen_random_uuid(), lid, v_company_id, 'Marcelo, nosso diferencial é a integração nativa com WhatsApp e IA. Posso preparar um comparativo?', 'human', 'text', 'whatsapp', false, true, now() - interval '10 days');

  -- =============================================
  -- STAGE 4 (posição 3) - 4 leads
  -- =============================================

  -- Lead 13: Sandra Melo
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Sandra Melo', '11985001013', 'sandra.melo@gruposm.com.br', 'https://i.pravatar.cc/150?img=25', src_whatsapp, s4, 'open', 'fire', 92, v_assigned_to, false, false, 'replied', ARRAY['vip', 'urgente'], 68000, 'CEO do Grupo SM Varejo, 25 lojas. Contrato assinado, onboarding para 25 pessoas na próxima semana. Preparar cronograma.', v_pipeline_id, '@sandramelo.ceo', 'linkedin.com/in/sandramelo', now() - interval '8 days', now() - interval '8 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Fechamos! Contrato assinado. Preciso do onboarding pra 25 pessoas na próxima semana.', 'lead', 'text', 'whatsapp', false, true, now() - interval '8 days'),
  (gen_random_uuid(), lid, v_company_id, 'Sandra, parabéns pela decisão! Já estou montando o cronograma. Envio até amanhã de manhã.', 'human', 'text', 'whatsapp', false, true, now() - interval '7 days'),
  (gen_random_uuid(), lid, v_company_id, 'Perfeito! Meu time tá ansioso pra começar.', 'lead', 'text', 'whatsapp', false, false, now() - interval '6 days');

  -- Lead 14: Ricardo Neves
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Ricardo Neves', '11985001014', 'ricardo.neves@fintechpay.io', 'https://i.pravatar.cc/150?img=15', src_instagram, s4, 'open', 'hot', 78, v_assigned_to, false, false, 'waiting_client', ARRAY['vip'], 31000, 'CTO da FintechPay, 35 funcionários. Validando LGPD com compliance interno. Documento de privacidade enviado por email.', v_pipeline_id, '@ricardoneves.fin', 'linkedin.com/in/ricardoneves', now() - interval '7 days', now() - interval '7 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Preciso validar com compliance a questão de armazenamento de dados. Vocês tem LGPD?', 'lead', 'text', 'whatsapp', false, true, now() - interval '7 days'),
  (gen_random_uuid(), lid, v_company_id, 'Ricardo, sim! Somos 100% LGPD compliance. Enviei nosso documento de política de privacidade por email.', 'human', 'text', 'whatsapp', false, true, now() - interval '6 days');

  -- Lead 15: Letícia Amorim
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Letícia Amorim', '11985001015', 'leticia.amorim@beautycare.com.br', 'https://i.pravatar.cc/150?img=26', src_whatsapp, s4, 'open', 'warm', 65, v_assigned_to, false, false, 'read', ARRAY['interessado'], 14000, 'Sócia da BeautyCare, rede de clínicas estéticas. Aguardando aprovação da sócia que volta de viagem sexta. Fazer follow-up segunda.', v_pipeline_id, '@leticiaamorim.beauty', 'linkedin.com/in/leticiaamorim', now() - interval '6 days', now() - interval '6 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Estamos quase fechando. Só falta aprovação da minha sócia que volta de viagem sexta.', 'lead', 'text', 'whatsapp', false, true, now() - interval '6 days'),
  (gen_random_uuid(), lid, v_company_id, 'Letícia, sem problemas! Fico no aguardo. Se precisar de algo antes, estou à disposição.', 'human', 'text', 'whatsapp', false, true, now() - interval '5 days'),
  (gen_random_uuid(), lid, v_company_id, 'Obrigada pela paciência!', 'lead', 'text', 'whatsapp', false, false, now() - interval '4 days');

  -- Lead 16: Gustavo Carvalho
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Gustavo Carvalho', '11985001016', 'gustavo.carvalho@autotech.com.br', 'https://i.pravatar.cc/150?img=17', src_manual, s4, 'open', 'fire', 85, v_assigned_to, false, false, 'replied', ARRAY['vip', 'indicação'], 47000, 'Dono da AutoTech, 8 concessionárias. Proposta aprovada, pediu boleto para CNPJ. Faturamento enviado, prazo 3 dias úteis.', v_pipeline_id, '@gustavocarvalho.auto', 'linkedin.com/in/gustavocarvalho', now() - interval '5 days', now() - interval '5 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Proposta aprovada internamente. Vou precisar de faturamento para CNPJ. Envia o boleto?', 'lead', 'text', 'whatsapp', false, true, now() - interval '5 days'),
  (gen_random_uuid(), lid, v_company_id, 'Gustavo, boleto enviado por email! Prazo de 3 dias úteis. Assim que compensar, libero o acesso.', 'human', 'text', 'whatsapp', false, true, now() - interval '4 days');

  -- =============================================
  -- STAGE 5 (posição 4) - 2 leads (ganhos)
  -- =============================================

  -- Lead 17: Camila Rezende
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Camila Rezende', '11985001017', 'camila.rezende@inovatech.com.br', 'https://i.pravatar.cc/150?img=32', src_whatsapp, s5, 'deal', 'hot', 95, v_assigned_to, false, false, 'replied', ARRAY['vip', 'indicação'], 52000, 'CTO da InovaTech, empresa de SaaS B2B. 45 funcionários. Pagamento realizado, acesso liberado. Onboarding agendado para amanhã 14h.', v_pipeline_id, '@camilarezende.tech', 'linkedin.com/in/camilarezende', now() - interval '4 days', now() - interval '4 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Pagamento realizado! Estou super empolgada pra começar a usar.', 'lead', 'text', 'whatsapp', false, true, now() - interval '4 days'),
  (gen_random_uuid(), lid, v_company_id, 'Camila, seja bem-vinda! Acesso liberado e onboarding agendado pra amanhã às 14h. Te espero lá!', 'human', 'text', 'whatsapp', false, true, now() - interval '3 days'),
  (gen_random_uuid(), lid, v_company_id, 'Perfeito, estarei lá com toda a equipe!', 'lead', 'text', 'whatsapp', false, false, now() - interval '2 days');

  -- Lead 18: Bruno Siqueira
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Bruno Siqueira', '11985001018', 'bruno.siqueira@corretorabs.com.br', 'https://i.pravatar.cc/150?img=18', src_instagram, s5, 'deal', 'warm', 80, v_assigned_to, false, false, 'replied', ARRAY['indicação'], 28000, 'Corretor de seguros, dono da BS Corretora. 15 corretores na equipe. Contrato assinado, acesso ativo. Cliente satisfeito com atendimento.', v_pipeline_id, '@brunosiqueira.seg', 'linkedin.com/in/brunosiqueira', now() - interval '3 days', now() - interval '3 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Contrato assinado e pago. Obrigado pelo atendimento excelente!', 'lead', 'text', 'whatsapp', false, true, now() - interval '3 days'),
  (gen_random_uuid(), lid, v_company_id, 'Bruno, muito obrigado pela confiança! Acesso já está liberado. Qualquer dúvida, estou aqui!', 'human', 'text', 'whatsapp', false, true, now() - interval '2 days');

  -- =============================================
  -- STAGE 6 (posição 5) - 2 leads (perdidos)
  -- =============================================

  -- Lead 19: Fernanda Braga
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Fernanda Braga', '11985001019', 'fernanda.braga@agenciacriativa.com', 'https://i.pravatar.cc/150?img=28', src_manual, s6, 'lost', 'cold', 15, v_assigned_to, false, false, 'read', ARRAY['retomar'], 9500, 'Dona de agência criativa. Escolheu HubSpot pelo preço em dólar (plano gratuito). Retomar contato no próximo trimestre quando precisar escalar.', v_pipeline_id, '@fernandabraga.criativa', 'linkedin.com/in/fernandabraga', now() - interval '20 days', now() - interval '20 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Infelizmente vamos seguir com o HubSpot. O preço em dólar pesou na decisão.', 'lead', 'text', 'whatsapp', false, true, now() - interval '20 days'),
  (gen_random_uuid(), lid, v_company_id, 'Fernanda, entendo perfeitamente. Se mudar de ideia, estamos aqui. Sucesso com o projeto!', 'human', 'text', 'whatsapp', false, true, now() - interval '19 days'),
  (gen_random_uuid(), lid, v_company_id, 'Obrigada! Quem sabe no futuro.', 'lead', 'text', 'whatsapp', false, false, now() - interval '18 days');

  -- Lead 20: Paulo Henrique Martins
  INSERT INTO veltzy.leads (id, company_id, name, phone, email, avatar_url, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, observations, pipeline_id, instagram_id, linkedin_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_company_id, 'Paulo Henrique Martins', '11985001020', 'paulo.martins@startupxyz.io', 'https://i.pravatar.cc/150?img=19', src_whatsapp, s6, 'lost', 'cold', 20, v_assigned_to, false, false, 'read', ARRAY['retomar'], 7200, 'Founder da StartupXYZ, early stage. Sem budget para CRM no momento. Startup focada em produto, equipe de 5. Retomar quando captarem rodada seed.', v_pipeline_id, '@paulohmartins.startup', 'linkedin.com/in/paulohmartins', now() - interval '15 days', now() - interval '15 days')
  RETURNING id INTO lid;
  INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
  (gen_random_uuid(), lid, v_company_id, 'Por enquanto vamos ficar sem CRM. A startup ainda tá muito no início pra esse investimento.', 'lead', 'text', 'whatsapp', false, true, now() - interval '15 days'),
  (gen_random_uuid(), lid, v_company_id, 'Paulo, sem problemas! Quando a operação crescer, vai fazer toda diferença. Boa sorte com a startup!', 'human', 'text', 'whatsapp', false, true, now() - interval '14 days');

  RAISE NOTICE '✓ Seed concluído! 20 leads inseridos na pipeline Pipe mockup.';

END $$;
