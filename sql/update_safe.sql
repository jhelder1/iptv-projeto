-- Safe update snippet: mark invoice as paid (idempotent, transactional)
-- Replace ? with the id_user value or use a prepared statement
SET @id_user = ?;
START TRANSACTION;

UPDATE fatura
SET situ = 1
WHERE id_user = @id_user AND situ = 0;

-- check how many rows were affected; if 0 -> already processed or not found
SELECT ROW_COUNT() AS affected_rows;

-- Commit only if desired; you may inspect affected_rows in application logic before committing
COMMIT;

-- Example application flow (pseudocode):
-- 1) START TRANSACTION
-- 2) UPDATE ... WHERE situ=0
-- 3) if affected_rows > 0 then SELECT dados FROM acesso ... and proceed to send WhatsApp and INSERT log
-- 4) COMMIT
-- 5) else ROLLBACK or COMMIT depending on desired semantics