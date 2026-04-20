-- Dados de demonstracao para testes
-- ATENCAO: Nao rodar em producao

DO $$
DECLARE
    _company_id UUID;
    _profile_id UUID;
    _stage_new UUID;
    _stage_qualifying UUID;
    _stage_open UUID;
    _source_whatsapp UUID;
BEGIN
    SELECT id INTO _company_id FROM companies LIMIT 1;

    IF _company_id IS NULL THEN
        RAISE NOTICE 'Crie uma empresa primeiro via onboarding';
        RETURN;
    END IF;

    SELECT id INTO _profile_id FROM profiles WHERE company_id = _company_id LIMIT 1;
    SELECT id INTO _stage_new FROM pipeline_stages WHERE company_id = _company_id AND slug = 'novo-lead';
    SELECT id INTO _stage_qualifying FROM pipeline_stages WHERE company_id = _company_id AND slug = 'qualificando';
    SELECT id INTO _stage_open FROM pipeline_stages WHERE company_id = _company_id AND slug = 'em-negociacao';
    SELECT id INTO _source_whatsapp FROM lead_sources WHERE company_id = _company_id AND slug = 'whatsapp';

    INSERT INTO leads (company_id, name, phone, stage_id, source_id, status, temperature, ai_score, deal_value, assigned_to) VALUES
        (_company_id, 'Mariana Silva',       '+5511987654321', _stage_new,        _source_whatsapp, 'new',        'warm', 65, 3500,  _profile_id),
        (_company_id, 'Carlos Rodrigues',    '+5511987654322', _stage_qualifying, _source_whatsapp, 'qualifying', 'hot',  82, 8900,  _profile_id),
        (_company_id, 'Juliana Costa',       '+5511987654323', _stage_open,       _source_whatsapp, 'open',       'fire', 94, 15000, _profile_id),
        (_company_id, 'Pedro Almeida',       '+5511987654324', _stage_new,        _source_whatsapp, 'new',        'cold', 32, 2000,  _profile_id),
        (_company_id, 'Fernanda Lima',       '+5511987654325', _stage_qualifying, _source_whatsapp, 'qualifying', 'warm', 58, 4500,  _profile_id),
        (_company_id, 'Roberto Santos',      '+5511987654326', _stage_open,       _source_whatsapp, 'open',       'hot',  75, 12000, _profile_id),
        (_company_id, 'Larissa Pereira',     '+5511987654327', _stage_qualifying, _source_whatsapp, 'qualifying', 'fire', 89, 18500, _profile_id),
        (_company_id, 'Gustavo Martins',     '+5511987654328', _stage_new,        _source_whatsapp, 'new',        'warm', 45, 3200,  _profile_id),
        (_company_id, 'Bianca Oliveira',     '+5511987654329', _stage_open,       _source_whatsapp, 'open',       'hot',  78, 9800,  _profile_id),
        (_company_id, 'Rafael Souza',        '+5511987654330', _stage_new,        _source_whatsapp, 'new',        'cold', 28, 1800,  _profile_id);

    RAISE NOTICE 'Seed concluido: 10 leads criados para empresa %', _company_id;
END $$;
