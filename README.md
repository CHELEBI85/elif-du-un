# Elif & Yunus Emre — Düğün Fotoğraf Paylaşım Platformu

Düğün misafirlerinin **hesap açmadan**, QR kod okutarak telefonlarındaki fotoğrafları
çiftle paylaşmasını sağlayan üretime hazır bir uygulama.

Misafir akışı yalnızca birkaç dokunuştan oluşur:

```
QR okut → sayfa açılır → "Fotoğraf Yükle" → fotoğrafları seç → gönder → teşekkür ekranı
```

Fotoğraflar Cloudinary'de **geçici** olarak saklanır ve saklama süresi (varsayılan **7 gün**)
dolduğunda otomatik olarak silinir.

- **Gelin:** Elif Aydın
- **Damat:** Yunus Emre Kapukaya
- **Herkese açık isim:** Elif & Yunus Emre
- **Misafir adresi:** `/w/elif-aydin-yunus-emre-kapukaya`

---

## İçindekiler

1. [Teknoloji yığını](#1-teknoloji-yığını)
2. [Kurulum](#2-kurulum)
3. [Ortam değişkenleri](#3-ortam-değişkenleri)
4. [Veritabanı kurulumu](#4-veritabanı-kurulumu)
5. [Cloudinary yapılandırması](#5-cloudinary-yapılandırması)
6. [Yönetici hesabı oluşturma](#6-yönetici-hesabı-oluşturma)
7. [Yerel geliştirme](#7-yerel-geliştirme)
8. [Vercel'e dağıtım](#8-vercele-dağıtım)
9. [Cron yapılandırması](#9-cron-yapılandırması)
10. [Cloudinary klasör stratejisi](#10-cloudinary-klasör-stratejisi)
11. [Fotoğraf temizliği ve saklama](#11-fotoğraf-temizliği-ve-saklama)
12. [Güvenlik notları](#12-güvenlik-notları)
13. [Tek etkinlik modu](#13-tek-etkinlik-modu)
14. [Mimari](#14-mimari)
15. [Bilinen sınırlar](#15-bilinen-sınırlar)

---

## 1. Teknoloji yığını

| Katman | Teknoloji |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Dil | TypeScript (strict) |
| Arayüz | Tailwind CSS v4, Radix UI primitifleri |
| Veritabanı | PostgreSQL + Prisma ORM |
| Görsel depolama | Cloudinary (imzalı yükleme) |
| Doğrulama | Zod |
| Kimlik doğrulama | `jose` (HS256 JWT) + `bcryptjs`, httpOnly çerez |
| QR | `qrcode` |
| Sıkıştırma | `browser-image-compression`, `heic2any` (HEIC → JPEG) |

Tipografi: **Cormorant Garamond** (başlıklar) + **Inter** (arayüz),
`next/font` ile optimize edilmiş şekilde yüklenir.

---

## 2. Kurulum

Gereksinim: **Node.js 20+** (18.18+ çalışır, 20 LTS önerilir).

```bash
npm install
```

`postinstall` adımı `prisma generate` komutunu otomatik çalıştırır.

---

## 3. Ortam değişkenleri

`.env.example` dosyasını kopyalayın:

```bash
cp .env.example .env
```

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | PostgreSQL bağlantı adresi (Neon / Supabase / yerel) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary hesap adı |
| `CLOUDINARY_API_KEY` | Cloudinary API anahtarı |
| `CLOUDINARY_API_SECRET` | **Gizli.** Yalnızca sunucuda kullanılır, istemciye asla gönderilmez |
| `AUTH_SECRET` | Yönetici oturum belirtecini imzalar |
| `CRON_SECRET` | `/api/cron/cleanup` uç noktasını korur |
| `NEXT_PUBLIC_APP_URL` | QR kodlarının işaret ettiği herkese açık adres |
| `SEED_ADMIN_USERNAME` | Panel giriş kullanıcı adı (3-32 karakter); yalnızca seed için |
| `SEED_ADMIN_PASSWORD` | Yalnızca seed için; en az 10 karakter |

Gizli anahtarları üretmek için:

```bash
openssl rand -base64 32
```

> `NEXT_PUBLIC_` ön ekli değişkenler tarayıcıya gönderilir. Cloudinary API
> secret'ını **asla** bu ön ekle tanımlamayın.

---

## 4. Veritabanı kurulumu

Prisma istemcisini üretin:

```bash
npx prisma generate
```

Geliştirme ortamında geçiş (migration) oluşturup uygulayın:

```bash
npx prisma migrate dev
```

Üretim ortamında yalnızca uygulayın:

```bash
npx prisma migrate deploy
```

Veriyi görsel olarak incelemek için:

```bash
npx prisma studio
```

Prisma yapılandırması `prisma.config.ts` dosyasındadır (Prisma 7 uyumlu).
Bu dosya `.env` yüklemesini `dotenv/config` ile açıkça yapar.

---

## 5. Cloudinary yapılandırması

1. [cloudinary.com](https://cloudinary.com) üzerinde ücretsiz hesap açın.
2. Dashboard'dan **Cloud name**, **API Key** ve **API Secret** değerlerini `.env` dosyasına yazın.
3. Ek bir ayar gerekmez — uygulama **imzalı yükleme** kullanır, yani
   "unsigned upload preset" tanımlamanıza gerek yoktur ve tanımlamamalısınız.

---

## 6. Yönetici hesabı oluşturma

`.env` içine `SEED_ADMIN_USERNAME` ve `SEED_ADMIN_PASSWORD` yazın, sonra:

```bash
npm run db:seed
```

Bu komut şunları yapar (tekrar çalıştırılabilir / idempotent):

- Yönetici kullanıcısını oluşturur veya şifresini günceller (bcrypt, 12 tur).
  Giriş **kullanıcı adı** ile yapılır, e-posta ile değil.
- `Elif & Yunus Emre` etkinliğini `elif-aydin-yunus-emre-kapukaya` slug'ıyla oluşturur.
- Saklama süresini 7 gün olarak ayarlar.

> **Düğün tarihi bilinçli olarak boş bırakılır.** Tarih girilene kadar saklama
> süresi etkinliğin oluşturulma tarihinden sayılır. Tarihi yönetim panelindeki
> **Ayarlar** ekranından girebilirsiniz.

Seed sonrası `SEED_ADMIN_*` değişkenlerini `.env` dosyasından silebilirsiniz.

---

## 7. Yerel geliştirme

```bash
npm run dev
```

| Adres | Açıklama |
|---|---|
| `http://localhost:3100` | Aktif düğün sayfasına yönlendirir |
| `http://localhost:3100/w/elif-aydin-yunus-emre-kapukaya` | Misafir yükleme sayfası |
| `http://localhost:3100/admin/login` | Yönetici girişi |

Diğer komutlar:

```bash
npm run build       # üretim derlemesi
npm run start       # üretim sunucusu
npm run lint        # ESLint
npm run typecheck   # TypeScript denetimi
```

---

## 8. Vercel'e dağıtım

1. Depoyu Vercel'e bağlayın.
2. **Settings → Environment Variables** altında `.env` içindeki tüm değişkenleri tanımlayın
   (`SEED_ADMIN_*` hariç).
3. `NEXT_PUBLIC_APP_URL` değerini gerçek alan adınız yapın (ör. `https://dugun.example.com`).
   QR kodları bu adresi kullanır.
4. Build komutu `prisma generate && next build` olarak zaten ayarlıdır.
5. İlk dağıtımdan sonra geçişleri uygulayın:

```bash
npx prisma migrate deploy
```

Veritabanı olarak **Neon** veya **Supabase** önerilir. Sunucusuz ortamda bağlantı
havuzu için Neon'un pooled connection string'ini kullanın.

---

## 9. Cron yapılandırması

`vercel.json` dosyası temizlik işini her gün **03:00 UTC**'de çalıştırır:

```json
{
  "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }]
}
```

Vercel Cron istekleri otomatik olarak `Authorization: Bearer $CRON_SECRET`
başlığı taşımaz; bu yüzden `CRON_SECRET` değerini Vercel ortam değişkenlerine
eklemeniz ve cron'u aşağıdaki gibi elle tetikleyebilmeniz gerekir:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<alan-adiniz>/api/cron/cleanup
```

Uç nokta `?secret=` sorgu parametresini de kabul eder (Vercel Cron için pratiktir).

Başka bir zamanlayıcı (GitHub Actions, cron-job.org) da kullanabilirsiniz.

---

## 10. Cloudinary klasör stratejisi

```
weddings/{eventId}/photos/{uuid}      ← misafir fotoğrafları (GEÇİCİ, otomatik silinir)
wedding-assets/{eventId}/...          ← kapak görseli (KALICI, temizlik dokunmaz)
```

Bu ayrım bilinçlidir: otomatik temizlik işi yalnızca veritabanındaki `Photo`
kayıtlarını hedefler, dolayısıyla düğün kapak fotoğrafı kazara silinmez.

**Veritabanı her zaman tek doğruluk kaynağıdır.** Cloudinary klasör isimlerine
göre iş yapılmaz; her fotoğraf için `publicId`, `secureUrl`, `thumbnailUrl`,
boyut, genişlik/yükseklik ve yüklenme zamanı veritabanında tutulur.

---

## 11. Fotoğraf temizliği ve saklama

`expiresAt = (düğün tarihi ?? oluşturulma tarihi, gün sonu) + retentionDays`

Süre dolduğunda:

- Misafir sayfası **yüklenmeye devam eder**, ancak yükleme kapanır ve
  "Fotoğraf yükleme süresi sona erdi." mesajı gösterilir.
- Günlük cron işi fotoğrafları önce Cloudinary'den, sonra veritabanından siler.

Temizlik işinin garantileri:

- **Idempotent** — iki kez çalıştırmak hiçbir şeyi bozmaz. Cloudinary'de
  bulunamayan kaynak hata sayılmaz, "zaten silinmiş" kabul edilir.
- **Güvenli sıra** — Cloudinary silme başarısız olursa veritabanı kaydı korunur,
  böylece dosya kaybolmaz ve ertesi gün tekrar denenir.
- **Parçalı** — tek çalıştırmada en fazla 600 fotoğraf işlenir (sunucusuz süre
  limiti için); kalanlar ertesi gün alınır. Yanıttaki `truncated` alanı bunu bildirir.
- Her çalışma `CleanupLog` tablosuna kaydedilir ve panelde görünür.

Saklama süresini yönetim panelindeki **Ayarlar** ekranından değiştirebilirsiniz.
Süreyi uzatmak, süresi dolmuş bir etkinliği tekrar aktif hâle getirir.

---

## 12. Güvenlik notları

**Yükleme mimarisi** — istemci Cloudinary'ye doğrudan yükler, ama serbestçe değil:

```
Tarayıcı → POST /api/cloudinary/sign → sunucu etkinliği doğrular
         → her dosya için tek kullanımlık public_id + kısa ömürlü imza üretir
         → izinler veritabanına yazılır (UploadTicket)
Tarayıcı → Cloudinary'ye yükler (imza ile)
Tarayıcı → POST /api/photos → sunucu izni doğrular ve tüketir → kayıt oluşur
```

Bu tasarımın sağladıkları:

- `CLOUDINARY_API_SECRET` istemciye **asla** gitmez; yalnızca imza üretiminde kullanılır.
- Her imza sunucunun belirlediği **tek bir** `public_id`'ye bağlıdır → yeniden kullanılamaz,
  istemci hedef klasörü değiştiremez.
- `/api/photos` yalnızca veritabanında kayıtlı ve tüketilmemiş bir izin kabul eder →
  istemci rastgele bir Cloudinary kaydını veritabanına ekleyemez.
- İzin tüketimi atomiktir (`updateMany` + transaction) → eşzamanlı çift kayıt olmaz.

**Tutarlılık** — Cloudinary yüklemesi başarılı olup veritabanı kaydı başarısız olursa,
yüklenen dosya Cloudinary'den silinir. Sahipsiz (orphan) kaynak bırakılmaz.

**Sınırlar**

| Sınır | Değer |
|---|---|
| Toplu seçimde en fazla fotoğraf | 20 |
| Sıkıştırma öncesi en büyük dosya | 15 MB |
| Sunucunun kabul ettiği en büyük dosya | 12 MB |
| Oturum başına toplam fotoğraf | 100 |
| Eşzamanlı yükleme | 3 |
| İmza isteği | 12 / dakika / IP |
| Giriş denemesi | 8 / 5 dakika / IP |

Oturum başına sınır **veritabanından** okunur (kesin sınır); IP tabanlı hız
sınırlayıcı bellek içidir ve ilk savunma hattıdır.

**Diğer**

- Tüm `/admin/*` rotaları `src/proxy.ts` ile Edge katmanında korunur, ayrıca her
  sunucu bileşeni ve API rotası oturumu yeniden doğrular.
- Şifreler bcrypt (12 tur) ile saklanır; kullanıcı bulunamasa bile bcrypt
  çalıştırılarak zamanlama sızıntısı azaltılır.
- Oturum belirteci httpOnly + SameSite=Lax çerezde, üretimde Secure.
- Misafirlerden **hiçbir kişisel veri** toplanmaz — yalnızca anonim bir
  `uploaderSessionId` (localStorage) kötüye kullanım koruması için kullanılır.
- Loglara sır yazılmaz (`src/lib/logger.ts` bilinen alan adlarını maskeler).
- Güvenlik başlıkları `next.config.ts` içinde tanımlıdır.

---

## 13. Tek etkinlik modu

Bu kurulum **tek bir düğün** için yapılandırılmıştır: yönetim panelinde etkinlik
oluşturma ekranı yoktur ve `/admin/events/new` rotası bulunmaz.

Veri modeli çoklu etkinliği desteklemeye devam eder (`Event` tablosu, slug bazlı
yönlendirme, etkinliğe göre ayrılmış Cloudinary klasörleri). İkinci bir düğün
gerekirse yalnızca oluşturma arayüzünü geri eklemek yeterlidir.

Etkinliği oluşturmak veya yeniden oluşturmak için:

```bash
npm run db:seed
```

> Ayarlar ekranındaki **Etkinliği sil** işlemi, oluşturma arayüzü olmadığı için
> geri alınamaz; sonrasında etkinliği yalnızca seed komutuyla geri getirebilirsiniz.
> Sadece fotoğrafları silmek istiyorsanız galeriyi kullanın.

---

## 14. Mimari

```
src/
├── app/
│   ├── page.tsx                     aktif düğüne yönlendirir
│   ├── w/[slug]/                    misafir yükleme sayfası
│   ├── admin/
│   │   ├── login/                   giriş (sidebar yok)
│   │   └── (panel)/                 korumalı panel (sidebar'lı)
│   │       ├── page.tsx             genel bakış
│   │       └── events/[id]/         detay, galeri, QR, ayarlar
│   └── api/
│       ├── cloudinary/sign/         imzalı yükleme izni
│       ├── photos/                  kayıt, silme, toplu silme
│       ├── events/[id]/             fotoğraflar, istatistik, QR, indirme
│       └── cron/cleanup/            otomatik temizlik
├── components/
│   ├── ui/                          Button, Card, Dialog, Input, Switch…
│   ├── wedding/                     Hero, UploadExperience, Success, Ornament…
│   └── admin/                       Shell, StatCard, PhotoGallery, Lightbox…
├── lib/
│   ├── client/                      tarayıcı: sıkıştırma, oturum, yükleme
│   ├── cloudinary.ts                imza, silme, arşiv (sunucu)
│   ├── auth.ts                      giriş/çıkış (Node)
│   ├── session-token.ts             JWT (Edge uyumlu)
│   ├── events.ts, photos.ts         alan mantığı
│   └── constants.ts, messages.ts    limitler ve Türkçe metinler
└── proxy.ts                         /admin/* koruması (Edge)
```

**Görsel boyutları**

| Kullanım | Dönüşüm |
|---|---|
| Galeri ızgarası | `c_fill,g_auto,w_480,h_480,q_auto:good,f_auto` |
| Lightbox | `c_limit,w_1600,q_auto:good,f_auto` |
| İndirme | `fl_attachment` ile orijinal |

Galeri hiçbir zaman orijinal dosyaları yüklemez; sonsuz kaydırma ile 48'erli
sayfalar hâlinde çeker.

---

## 15. Bilinen sınırlar

**Cloudinary arşiv (ZIP) indirme**
"Tüm Fotoğrafları İndir" arşivi **Cloudinary tarafında** oluşturur; Vercel
fonksiyonu hiçbir görüntüyü belleğe almaz. Sınırlar:

- Tek arşivde en fazla 1000 kaynak → uygulama 900'erli parçalara böler ve
  birden fazla indirme bağlantısı sunar.
- Arşiv oluşturma, Cloudinary ücretsiz planında işlem kotasından düşer.
- Üretilen bağlantı 30 dakika geçerlidir.

**HEIC dönüşümü**
iPhone'ların ürettiği HEIC/HEIF dosyaları tarayıcıda `heic2any` ile JPEG'e
çevrilir. Bazı türevler (ör. HEIC sequence) çözülemeyebilir; bu durumda yalnızca
o fotoğraf atlanır ve kullanıcıya "Lütfen fotoğrafı JPG olarak tekrar deneyin."
mesajı gösterilir — toplu yükleme durmaz.

**Hız sınırlayıcı**
Bellek içidir; çok örnekli sunucusuz dağıtımda her örneğin kendi sayacı olur.
Kesin sınır veritabanındaki oturum başına fotoğraf sayısıdır. Daha katı bir
sınır gerekirse `src/lib/rate-limit.ts` dosyasını Upstash Redis'e taşımak yeterlidir.

**Herkese açık galeri**
Bilinçli olarak yapılmamıştır. Misafirler birbirlerinin fotoğraflarını göremez;
bu gizliliği artırır, bant genişliğini ve moderasyon yükünü düşürür. Mimari
ileride eklenmesine engel değildir.

---

## Lisans

Özel kullanım. Elif Aydın & Yunus Emre Kapukaya için hazırlanmıştır.
