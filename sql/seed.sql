-- Minimal seed data for local/dev testing
INSERT INTO public.app_user (nome, tel, email) VALUES ('Cliente Teste','+5511999999999','teste@example.com');
INSERT INTO public.fatura (id_user, situ, valor, forma, vencimento) VALUES (1,0,49.90,'mensalidade','2026-03-10');
INSERT INTO public.acesso (id_user, dados) VALUES (1, '<b>usuario:</b> user123 <br/> <b>senha:</b> pass123');
