/** Kullanıcıya gösterilen tüm Türkçe metinler tek yerde toplanır. */
export const messages = {
  errors: {
    unsupportedFormat: 'Bu dosya formatını desteklemiyoruz.',
    heicUnsupported:
      'Bu fotoğraf formatı şu anda desteklenmiyor. Lütfen fotoğrafı JPG olarak tekrar deneyin.',
    tooLarge: 'Bu fotoğraf çok büyük.',
    uploadFailed: 'Fotoğraf yüklenemedi. Tekrar deneyebilirsin.',
    network: 'İnternet bağlantısı kesildi. Bağlantını kontrol edip tekrar deneyebilirsin.',
    expired: 'Fotoğraf yükleme süresi sona erdi.',
    server: 'Bir sorun oluştu. Lütfen tekrar deneyin.',
    rateLimited: 'Çok fazla yükleme yapıldı. Lütfen biraz sonra tekrar deneyin.',
    sessionLimit: 'Bu etkinlik için yükleme sınırına ulaştın. Teşekkür ederiz!',
    batchLimit: (max: number) => `Tek seferde en fazla ${max} fotoğraf gönderebilirsin.`,
    compressionFailed: 'Bu fotoğraf hazırlanamadı. Lütfen başka bir fotoğraf deneyin.',
    notFound: 'Aradığınız sayfa bulunamadı.',
    invalidCredentials: 'Kullanıcı adı veya şifre hatalı.',
  },
  upload: {
    cta: 'Fotoğraf Yükle',
    ctaMore: 'Başka Fotoğraf Ekle',
    send: 'Fotoğrafları Gönder',
    sending: 'Gönderiliyor…',
    preparing: 'Fotoğraflar hazırlanıyor…',
    retryFailed: 'Başarısızları Tekrar Dene',
    selected: (count: number) => `${count} fotoğraf seçildi`,
    progress: (done: number, total: number) => `${done} / ${total} fotoğraf yüklendi`,
    noAccount: 'Kayıt olmanıza gerek yok. Fotoğraflarınızı seçin ve gönderin.',
    retention: 'Fotoğraflar geçici olarak saklanır.',
    privacy: 'Yüklediğiniz fotoğraflar yalnızca etkinlik sahipleri tarafından görüntülenebilir.',
  },
  success: {
    title: 'Teşekkürler',
    body: (couple: string) => `Fotoğrafların ${couple} çiftine ulaştı.`,
    sub: 'Bu güzel günün anılarına katkı sağladığın için teşekkür ederiz.',
    again: 'Başka Fotoğraf Yükle',
  },
  expiredEvent: {
    title: 'Fotoğraf yükleme süresi sona erdi.',
    body: 'Bu etkinlik artık yeni fotoğraf kabul etmiyor.',
  },
} as const
