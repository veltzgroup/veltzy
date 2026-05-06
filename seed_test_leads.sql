-- Seed 20 leads de teste para Veltz Group
-- company_id: d20f7d62-974b-40c4-8f0b-bb8207513554
-- assigned_to: 4047e350-dbd7-44f3-9c20-4521f555e4e1
-- pipeline_id: 06eb35b5-c526-4bf9-bd80-3384b26bc4a8

DO $$
DECLARE
  v_company_id uuid := 'd20f7d62-974b-40c4-8f0b-bb8207513554';
  v_assigned_to uuid := '4047e350-dbd7-44f3-9c20-4521f555e4e1';
  v_pipeline_id uuid := '06eb35b5-c526-4bf9-bd80-3384b26bc4a8';
  -- Stages
  s_novo uuid := '9bccc17a-ed02-4c6f-9777-7b192f46df61';
  s_qualificando uuid := '8d4216be-e054-4f34-987f-f92551717405';
  s_proposta uuid := '60edafd3-7994-4f97-b611-1a3fb4cca9a1';
  s_negociacao uuid := '819de625-a3fd-4ece-8308-054ceae72f2c';
  s_fechado uuid := '72f7e656-f5dd-4a49-8e9a-6a36aadd3973';
  s_perdido uuid := '6613dbc1-5dbf-4805-a883-e46c68a8a748';
  -- Sources
  src_instagram uuid := '5619014f-7187-42f7-ab2c-a49f0f6bceab';
  src_manual uuid := 'b93fe77a-4aeb-48dd-9324-67c0b54fb8a0';
  src_whatsapp uuid := '33760e6b-eb5c-411a-aafd-66bda48e0bfb';
  -- Lead IDs
  lid uuid;
BEGIN

-- Lead 1: Novo / cold
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Rafael Oliveira', '11987654321', 'rafael.oliveira@gmail.com', src_whatsapp, s_novo, 'new', 'cold', 25, v_assigned_to, false, false, 'unread', ARRAY['interessado'], 3500, v_pipeline_id, now() - interval '58 days', now() - interval '58 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Oi, vi o anúncio de vocês e gostaria de saber mais sobre os planos disponíveis.', 'lead', 'text', 'whatsapp', false, true, now() - interval '58 days'),
(gen_random_uuid(), lid, v_company_id, 'Olá Rafael! Tudo bem? Temos alguns planos que podem te atender. Qual é o tamanho da sua empresa?', 'human', 'text', 'whatsapp', false, true, now() - interval '57 days'),
(gen_random_uuid(), lid, v_company_id, 'Somos uma equipe de 8 pessoas. Preciso de algo simples pra começar.', 'lead', 'text', 'whatsapp', false, false, now() - interval '56 days');

-- Lead 2: Novo / warm
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Camila Santos', '11991234567', 'camila.santos@hotmail.com', src_instagram, s_novo, 'new', 'warm', 45, v_assigned_to, false, false, 'read', ARRAY['indicação'], 5200, v_pipeline_id, now() - interval '55 days', now() - interval '55 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Boa tarde! Um amigo indicou a ferramenta de vocês. Tem teste grátis?', 'lead', 'text', 'whatsapp', false, true, now() - interval '55 days'),
(gen_random_uuid(), lid, v_company_id, 'Oi Camila! Sim, temos 14 dias de teste gratuito. Quer que eu ative pra você?', 'human', 'text', 'whatsapp', false, true, now() - interval '54 days');

-- Lead 3: Novo / cold
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Marcos Pereira', '11998765432', 'marcos.pereira@outlook.com', src_manual, s_novo, 'new', 'cold', 20, v_assigned_to, false, false, 'unread', ARRAY['retomar'], 1500, v_pipeline_id, now() - interval '50 days', now() - interval '50 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Olá, estou pesquisando soluções de CRM. Podem me enviar mais informações?', 'lead', 'text', 'whatsapp', false, true, now() - interval '50 days'),
(gen_random_uuid(), lid, v_company_id, 'Claro, Marcos! Vou te enviar um material completo. Qual o segmento da sua empresa?', 'human', 'text', 'whatsapp', false, true, now() - interval '49 days'),
(gen_random_uuid(), lid, v_company_id, 'Trabalho com consultoria de marketing digital.', 'lead', 'text', 'whatsapp', false, false, now() - interval '48 days');

-- Lead 4: Novo / warm
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Juliana Costa', '11993456789', 'juliana.costa@gmail.com', src_whatsapp, s_novo, 'new', 'warm', 52, v_assigned_to, false, false, 'replied', ARRAY['interessado'], 7800, v_pipeline_id, now() - interval '45 days', now() - interval '45 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Oi! Vi no Instagram de vocês que tem integração com WhatsApp. Como funciona?', 'lead', 'text', 'whatsapp', false, true, now() - interval '45 days'),
(gen_random_uuid(), lid, v_company_id, 'Oi Juliana! A integração permite que todas as conversas do WhatsApp fiquem centralizadas no CRM. Quer uma demonstração?', 'human', 'text', 'whatsapp', false, true, now() - interval '44 days');

-- Lead 5: Qualificando / warm
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Fernando Almeida', '11994567890', 'fernando.almeida@gmail.com', src_instagram, s_qualificando, 'qualifying', 'warm', 58, v_assigned_to, false, false, 'waiting_client', ARRAY['interessado'], 12000, v_pipeline_id, now() - interval '42 days', now() - interval '42 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Bom dia! Quero entender melhor o plano Pro. Quantos usuários posso ter?', 'lead', 'text', 'whatsapp', false, true, now() - interval '42 days'),
(gen_random_uuid(), lid, v_company_id, 'Bom dia Fernando! No plano Pro você pode ter até 25 usuários. Sua equipe é grande?', 'human', 'text', 'whatsapp', false, true, now() - interval '41 days'),
(gen_random_uuid(), lid, v_company_id, 'Temos 15 vendedores. Vou conversar com meu sócio e te retorno.', 'lead', 'text', 'whatsapp', false, false, now() - interval '40 days');

-- Lead 6: Qualificando / hot
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Ana Beatriz Lima', '11996789012', 'anabeatriz.lima@gmail.com', src_whatsapp, s_qualificando, 'qualifying', 'hot', 72, v_assigned_to, false, false, 'replied', ARRAY['vip'], 25000, v_pipeline_id, now() - interval '38 days', now() - interval '38 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Preciso de um CRM urgente. Minha empresa está crescendo rápido e estamos perdendo controle dos leads.', 'lead', 'text', 'whatsapp', false, true, now() - interval '38 days'),
(gen_random_uuid(), lid, v_company_id, 'Ana, entendo a urgência! Vamos agendar uma call pra amanhã? Posso te mostrar como resolver isso rapidamente.', 'human', 'text', 'whatsapp', false, true, now() - interval '37 days');

-- Lead 7: Qualificando / warm
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Pedro Henrique Souza', '11997890123', 'pedro.souza@empresa.com.br', src_manual, s_qualificando, 'qualifying', 'warm', 48, v_assigned_to, false, false, 'read', ARRAY['retomar'], 8500, v_pipeline_id, now() - interval '35 days', now() - interval '35 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Boa tarde. Estou avaliando CRMs para minha imobiliária. Vocês atendem esse segmento?', 'lead', 'text', 'whatsapp', false, true, now() - interval '35 days'),
(gen_random_uuid(), lid, v_company_id, 'Oi Pedro! Sim, temos vários clientes no ramo imobiliário. O pipeline de vendas se adapta muito bem. Quer ver um caso de uso?', 'human', 'text', 'whatsapp', false, true, now() - interval '34 days'),
(gen_random_uuid(), lid, v_company_id, 'Seria ótimo! Pode me mandar por email?', 'lead', 'text', 'whatsapp', false, false, now() - interval '33 days');

-- Lead 8: Qualificando / cold
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Larissa Ferreira', '11998901234', 'larissa.ferreira@yahoo.com', src_instagram, s_qualificando, 'qualifying', 'cold', 30, v_assigned_to, false, false, 'unread', ARRAY['retomar'], 4200, v_pipeline_id, now() - interval '30 days', now() - interval '30 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Vi o story de vocês. Quanto custa o plano mais barato?', 'lead', 'text', 'whatsapp', false, true, now() - interval '30 days'),
(gen_random_uuid(), lid, v_company_id, 'Oi Larissa! O plano Starter começa em R$97/mês. Posso te explicar o que inclui?', 'human', 'text', 'whatsapp', false, true, now() - interval '29 days');

-- Lead 9: Proposta / hot
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Thiago Mendes', '11990123456', 'thiago.mendes@techcorp.com.br', src_whatsapp, s_proposta, 'open', 'hot', 82, v_assigned_to, false, false, 'waiting_client', ARRAY['vip'], 45000, v_pipeline_id, now() - interval '28 days', now() - interval '28 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Recebi a proposta. Estou analisando com o financeiro. Tem como fazer um desconto no anual?', 'lead', 'text', 'whatsapp', false, true, now() - interval '28 days'),
(gen_random_uuid(), lid, v_company_id, 'Thiago, no plano anual conseguimos 20% de desconto. Fica R$3.750/mês ao invés de R$4.500. O que acha?', 'human', 'text', 'whatsapp', false, true, now() - interval '27 days'),
(gen_random_uuid(), lid, v_company_id, 'Interessante. Vou apresentar pro diretor na reunião de segunda.', 'lead', 'text', 'whatsapp', false, false, now() - interval '26 days');

-- Lead 10: Proposta / hot
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Mariana Rodrigues', '11991234560', 'mariana.rodrigues@agencia.com', src_instagram, s_proposta, 'open', 'hot', 78, v_assigned_to, false, false, 'replied', ARRAY['urgente'], 32000, v_pipeline_id, now() - interval '25 days', now() - interval '25 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'A proposta ficou boa, mas preciso incluir mais 5 usuários. Consegue ajustar?', 'lead', 'text', 'whatsapp', false, true, now() - interval '25 days'),
(gen_random_uuid(), lid, v_company_id, 'Claro, Mariana! Ajustei a proposta com 15 usuários. Enviei por email agora.', 'human', 'text', 'whatsapp', false, true, now() - interval '24 days');

-- Lead 11: Proposta / fire
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Lucas Gabriel Silva', '11992345678', 'lucas.silva@construtora.com.br', src_whatsapp, s_proposta, 'open', 'fire', 90, v_assigned_to, false, false, 'replied', ARRAY['vip', 'urgente'], 85000, v_pipeline_id, now() - interval '20 days', now() - interval '20 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Preciso fechar essa semana. Meu time de 30 vendedores precisa começar a usar segunda-feira.', 'lead', 'text', 'whatsapp', false, true, now() - interval '20 days'),
(gen_random_uuid(), lid, v_company_id, 'Lucas, perfeito! Já preparei tudo. Assim que confirmar o pagamento, libero o acesso no mesmo dia.', 'human', 'text', 'whatsapp', false, true, now() - interval '19 days'),
(gen_random_uuid(), lid, v_company_id, 'Ótimo! Vou pedir pro financeiro fazer a transferência amanhã cedo.', 'lead', 'text', 'whatsapp', false, false, now() - interval '18 days');

-- Lead 12: Proposta / warm
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Beatriz Nakamura', '11993456780', 'beatriz.nakamura@gmail.com', src_manual, s_proposta, 'open', 'warm', 55, v_assigned_to, false, false, 'waiting_client', ARRAY['indicação'], 15000, v_pipeline_id, now() - interval '18 days', now() - interval '18 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Recebi a proposta, obrigada! Vou comparar com outras opções e te aviso.', 'lead', 'text', 'whatsapp', false, true, now() - interval '18 days'),
(gen_random_uuid(), lid, v_company_id, 'Sem problemas, Beatriz! Fico à disposição pra qualquer dúvida. Posso ligar na quinta pra alinharmos?', 'human', 'text', 'whatsapp', false, true, now() - interval '17 days');

-- Lead 13: Negociação / fire
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Roberto Carlos Dias', '11994567891', 'roberto.dias@grupord.com.br', src_whatsapp, s_negociacao, 'deal', 'fire', 95, v_assigned_to, false, false, 'replied', ARRAY['vip', 'urgente'], 72000, v_pipeline_id, now() - interval '15 days', now() - interval '15 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Fechamos! Só preciso ajustar o contrato pra incluir suporte premium. Manda a versão final.', 'lead', 'text', 'whatsapp', false, true, now() - interval '15 days'),
(gen_random_uuid(), lid, v_company_id, 'Excelente, Roberto! Contrato atualizado enviado por email com suporte premium incluso. Prazo de assinatura até sexta.', 'human', 'text', 'whatsapp', false, true, now() - interval '14 days'),
(gen_random_uuid(), lid, v_company_id, 'Perfeito, vou assinar amanhã. Obrigado pelo atendimento!', 'lead', 'text', 'whatsapp', false, false, now() - interval '13 days');

-- Lead 14: Negociação / hot
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Patrícia Monteiro', '11995678902', 'patricia.monteiro@escritorio.adv.br', src_instagram, s_negociacao, 'deal', 'hot', 75, v_assigned_to, false, false, 'waiting_client', ARRAY['urgente'], 28000, v_pipeline_id, now() - interval '12 days', now() - interval '12 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Gostei da proposta. Preciso validar com o jurídico antes de assinar. Pode enviar os termos de uso?', 'lead', 'text', 'whatsapp', false, true, now() - interval '12 days'),
(gen_random_uuid(), lid, v_company_id, 'Patrícia, acabei de enviar os termos por email. Qualquer cláusula que precisar ajustar, é só falar!', 'human', 'text', 'whatsapp', false, true, now() - interval '11 days');

-- Lead 15: Negociação / warm
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Gabriel Teixeira', '11996789013', 'gabriel.teixeira@startup.io', src_whatsapp, s_negociacao, 'deal', 'warm', 62, v_assigned_to, false, false, 'read', ARRAY['interessado'], 18500, v_pipeline_id, now() - interval '10 days', now() - interval '10 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Estamos quase fechando. Só falta a aprovação do board. Deve sair até quarta.', 'lead', 'text', 'whatsapp', false, true, now() - interval '10 days'),
(gen_random_uuid(), lid, v_company_id, 'Fico no aguardo, Gabriel! Se precisar de algum material extra pra apresentação, me avisa.', 'human', 'text', 'whatsapp', false, true, now() - interval '9 days'),
(gen_random_uuid(), lid, v_company_id, 'Pode preparar um comparativo com concorrentes? Vai ajudar na decisão.', 'lead', 'text', 'whatsapp', false, false, now() - interval '8 days');

-- Lead 16: Negociação / fire
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Carolina Barbosa', '11997890124', 'carolina.barbosa@varejo.com.br', src_manual, s_negociacao, 'deal', 'fire', 88, v_assigned_to, false, false, 'replied', ARRAY['vip'], 55000, v_pipeline_id, now() - interval '7 days', now() - interval '7 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Fechamos no plano Enterprise. Preciso do onboarding pra 40 pessoas na semana que vem.', 'lead', 'text', 'whatsapp', false, true, now() - interval '7 days'),
(gen_random_uuid(), lid, v_company_id, 'Maravilha, Carolina! Já estou preparando o cronograma de onboarding. Envio até amanhã!', 'human', 'text', 'whatsapp', false, true, now() - interval '6 days');

-- Lead 17: Fechado / hot
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Diego Araújo', '11998901235', 'diego.araujo@logistica.com', src_whatsapp, s_fechado, 'deal', 'hot', 85, v_assigned_to, false, false, 'replied', ARRAY['vip', 'indicação'], 38000, v_pipeline_id, now() - interval '5 days', now() - interval '5 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Pagamento realizado! Quando consigo acessar a plataforma?', 'lead', 'text', 'whatsapp', false, true, now() - interval '5 days'),
(gen_random_uuid(), lid, v_company_id, 'Diego, acesso liberado! Enviei o login por email. Amanhã faremos o onboarding às 10h. Tudo certo?', 'human', 'text', 'whatsapp', false, true, now() - interval '4 days'),
(gen_random_uuid(), lid, v_company_id, 'Perfeito, já consegui entrar. Amanhã às 10h estou disponível!', 'lead', 'text', 'whatsapp', false, false, now() - interval '3 days');

-- Lead 18: Fechado / warm
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Isabela Ramos', '11990123457', 'isabela.ramos@clinica.med.br', src_instagram, s_fechado, 'deal', 'warm', 70, v_assigned_to, false, false, 'replied', ARRAY['indicação'], 22000, v_pipeline_id, now() - interval '3 days', now() - interval '3 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Contrato assinado! Estou ansiosa pra começar a usar.', 'lead', 'text', 'whatsapp', false, true, now() - interval '3 days'),
(gen_random_uuid(), lid, v_company_id, 'Isabela, que ótimo! Seja bem-vinda à Veltzy! Seu acesso já está ativo. Vamos agendar o treinamento?', 'human', 'text', 'whatsapp', false, true, now() - interval '2 days');

-- Lead 19: Perdido / cold
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Vinícius Cardoso', '11991234568', 'vinicius.cardoso@gmail.com', src_manual, s_perdido, 'lost', 'cold', 22, v_assigned_to, false, false, 'read', ARRAY['retomar'], 6000, v_pipeline_id, now() - interval '40 days', now() - interval '40 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Infelizmente vou ter que pausar. O orçamento apertou esse trimestre.', 'lead', 'text', 'whatsapp', false, true, now() - interval '40 days'),
(gen_random_uuid(), lid, v_company_id, 'Entendo, Vinícius. Quando quiser retomar, estamos aqui. Vou te contatar no próximo trimestre, tudo bem?', 'human', 'text', 'whatsapp', false, true, now() - interval '39 days'),
(gen_random_uuid(), lid, v_company_id, 'Pode sim, agradeço a compreensão.', 'lead', 'text', 'whatsapp', false, false, now() - interval '38 days');

-- Lead 20: Perdido / cold
INSERT INTO veltzy.leads (id, company_id, name, phone, email, source_id, stage_id, status, temperature, ai_score, assigned_to, is_ai_active, is_queued, conversation_status, tags, deal_value, pipeline_id, created_at, updated_at)
VALUES (gen_random_uuid(), v_company_id, 'Amanda Lopes', '11992345679', 'amanda.lopes@educacao.org', src_whatsapp, s_perdido, 'lost', 'cold', 28, v_assigned_to, false, false, 'read', ARRAY['retomar'], 3800, v_pipeline_id, now() - interval '22 days', now() - interval '22 days')
RETURNING id INTO lid;
INSERT INTO veltzy.messages (id, lead_id, company_id, content, sender_type, message_type, source, is_scheduled, is_read, created_at) VALUES
(gen_random_uuid(), lid, v_company_id, 'Decidimos ir com outra solução por enquanto. Mas gostei muito do atendimento de vocês.', 'lead', 'text', 'whatsapp', false, true, now() - interval '22 days'),
(gen_random_uuid(), lid, v_company_id, 'Amanda, agradeço o feedback! Se mudar de ideia, pode contar com a gente. Sucesso!', 'human', 'text', 'whatsapp', false, true, now() - interval '21 days');

END $$;
