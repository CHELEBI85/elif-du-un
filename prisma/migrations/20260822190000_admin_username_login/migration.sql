-- Yönetici girişi artık e-posta yerine kullanıcı adı kullanıyor.
--
-- Sütun DROP + ADD yerine YENİDEN ADLANDIRILIYOR; böylece mevcut yönetici
-- kaydı ve şifre özeti korunur. Prisma'nın otomatik ürettiği geçiş sütunu
-- silip yeniden oluşturacağı için veri kaybına yol açardı.
ALTER TABLE "users" RENAME COLUMN "email" TO "username";
ALTER INDEX "users_email_key" RENAME TO "users_username_key";

-- Daha önce e-posta olarak kaydedilmiş değerleri kullanıcı adına dönüştür:
--   "elif@gmail.com" -> "elif"
-- Dönüşüm iki kaydı aynı kullanıcı adına düşürürse benzersizlik kısıtı
-- devreye girer, geçiş hata verip geri alınır (sessiz veri bozulması olmaz).
UPDATE "users"
SET "username" = lower(split_part("username", '@', 1))
WHERE "username" LIKE '%@%';
