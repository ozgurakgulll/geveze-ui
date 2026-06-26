# 04 — Workspace Ürün Gereksinimleri

## Ürün Vizyonu

Geveze CRM'i, birden fazla ajans ekibinin veya projenin ayrı ayrı yönetilebildiği  
bir **çoklu workspace** sistemine dönüştürmek. Her workspace izole bir çalışma  
ortamı sunar: kendine özgü üyeler, görevler, portföy şirketleri ve ayarlar.

**Benchmark:** Monday.com'un Workspace/Board mantığından ilham alınmış, daha sade.

---

## Temel Gereksinimler (Zorunlu)

### GR-01 — Workspace Oluşturma

- Kayıtlı kullanıcı bir veya daha fazla workspace oluşturabilir
- Her workspace için: `isim`, `renk/ikon`, opsiyonel `açıklama`
- Oluşturan kullanıcı otomatik olarak `workspace_admin` rolünü alır
- Her workspace benzersiz bir URL slug'ına sahiptir (ör. `/workspaces/geveze-ajans`)

### GR-02 — Workspace Üyeliği

- Workspace admin'i, kullanıcıları workspace'e davet edebilir / ekleyebilir
- Üyelik workspace bazında tanımlanır (global kullanıcı listesi ≠ workspace üyeleri)
- Workspace'ten çıkarılan kullanıcı global hesabını kaybetmez
- Kullanıcı birden fazla workspace'in üyesi olabilir

### GR-03 — Workspace Bazlı Roller

Mevcut global `AppRole` genişletilir ve workspace düzeyinde çalışır:

| Rol | Tanım |
|-----|-------|
| `workspace_admin` | Tam yetki: üye yönetimi, workspace ayarları, tüm CRUD |
| `workspace_manager` | Görev atama, portföy yönetimi, raporlar |
| `workspace_member` | Kendi görevleri + izin verilen alanlar |
| `workspace_viewer` | Salt okunur erişim |

### GR-04 — Veri İzolasyonu

- Her workspace'in görevleri, portföy şirketleri, tag'leri, servis türleri birbirinden bağımsız
- Kullanıcı A'nın Workspace 1'deki görevi Workspace 2'de görünmez
- API her endpoint'te `workspaceId` doğrulaması yapar

### GR-05 — Workspace Switcher (UI)

- Sol sidebar'da workspace seçim/listeleme bölümü
- Mevcut workspace'in adı ve rengi gösterilir
- Tıklandığında diğer workspace'lere geçiş yapılabilir
- "Yeni Workspace" butonu

### GR-06 — Workspace Ayarları

- İsim, renk/ikon, açıklama güncellenebilir
- Üye listesi yönetilebilir (davet, rol değişikliği, çıkarma)
- Workspace silinebilir (admin only, onay gerektirir)

---

## İkincil Gereksinimler (Önerilen)

### GR-07 — Board Soyutlaması

Workspace içinde birden fazla "board" oluşturulabilir:

```
Workspace: Geveze Ajans
  ├── Board: Sosyal Medya Projeleri     (Table/Kanban view)
  ├── Board: Web Geliştirme             (Timeline view)
  └── Board: Müşteri Takip              (Portfolio view)
```

Her board kendi görev havuzuna sahip olur.  
`Task.boardId` alanı eklenir.

> **Not:** Bu gereksinim mevcut `ViewType` mimarisini derinden değiştirir.  
> Scope'a dahil edilip edilmeyeceği `11-open-questions.md`'de tartışılmıştır.

### GR-08 — Workspace Daveti (E-posta)

- Admin, e-posta ile kullanıcı davet edebilir
- Davet linki ile kullanıcı kayıt olursa doğrudan workspace'e eklenir
- Davet 7 gün geçerli

> **Not:** Backend'de mail servis entegrasyonu gerektirir.  
> Şu an için kapsam dışı bırakılabilir.

### GR-09 — Workspace Aktivite Logu

- Workspace düzeyinde aktivite akışı (kim ne zaman ne yaptı)
- `Task.activityLog` mevcut; workspace seviyesinde özet görünüm

### GR-10 — Workspace Arama

- Workspace içinde global arama (görevler, portföy şirketleri, kullanıcılar)
- Şu an Header'da `searchQuery` state var ama server-side search yok

---

## Kapsam Dışı (Bu Versiyon)

| Özellik | Gerekçe |
|---------|---------|
| E-posta bildirimleri | Mail servis gerektirir |
| Workspace şablonları | Karmaşık, ikinci iterasyon |
| Çoklu organizasyon | Üst hiyerarşi, şu an gereksiz |
| OAuth sosyal giriş | Auth kapsamı dışında |
| Public workspace | Güvenlik riski, şu an single-org |
| API anahtarları | Gelişmiş integrasyon |
| Mobil uygulama | Ayrı platform |
| Real-time (WebSocket) | Altyapı değişikliği gerektirir |

---

## Kullanıcı Hikayeleri

### Admin

```
OLARAK bir workspace admin olarak,
yeni üyeleri workspace'ime ekleyebilmek İSTİYORUM,
ÇÜNKÜ ekibimi genişletmek istiyorum.
Kabul kriteri: Kullanıcı listesinden mevcut kullanıcıyı seçebilmeliyim.
```

```
OLARAK bir workspace admin olarak,
workspace'imin adını ve rengini değiştirebilmek İSTİYORUM,
ÇÜNKÜ markamı yansıtmak istiyorum.
Kabul kriteri: Ayarlar sayfasından ad/renk güncellenebilmeli.
```

### Manager

```
OLARAK bir workspace manager olarak,
member'ların hangi view'lara erişebileceğini kontrol edebilmek İSTİYORUM,
ÇÜNKÜ bazı bilgiler hassas.
Kabul kriteri: İzin panelinden canViewAnalytics, canViewArchive vb. toggle'lanabilmeli.
```

### Member

```
OLARAK bir workspace member olarak,
farklı workspace'ler arasında kolayca geçiş yapabilmek İSTİYORUM,
ÇÜNKÜ birden fazla müşteriyle çalışıyorum.
Kabul kriteri: Sidebar'da workspace switcher ile tek tıkla geçiş.
```

```
OLARAK bir workspace member olarak,
hangi workspace'te olduğumu net görmek İSTİYORUM,
ÇÜNKÜ karışıklık yaşıyorum.
Kabul kriteri: Header/Sidebar'da aktif workspace adı ve rengi görünür.
```

---

## Öncelik Matrisi

| Gereksinim | Öncelik | Efor | Etki |
|-----------|---------|------|------|
| GR-04 Veri izolasyonu | P0 | Yüksek | Kritik |
| GR-01 Workspace oluşturma | P0 | Orta | Kritik |
| GR-02 Üyelik | P0 | Orta | Yüksek |
| GR-03 Rol sistemi | P0 | Orta | Yüksek |
| GR-05 Workspace switcher | P1 | Düşük | Yüksek |
| GR-06 Ayarlar | P1 | Düşük | Orta |
| GR-07 Board soyutlaması | P2 | Çok Yüksek | Orta |
| GR-08 E-posta daveti | P2 | Orta | Düşük |
| GR-09 Aktivite logu | P2 | Düşük | Düşük |
| GR-10 Arama | P2 | Orta | Düşük |

---

## Tasarım İlkeleri

1. **Geriye uyumluluk:** Mevcut tek workspace yapısı "default workspace" olarak korunur.  
   Mevcut kullanıcılar yeni üyeler olarak bu workspace'e migrated edilir.

2. **Sadelik önceliği:** Monday.com'un tüm özelliklerini kopyalamak değil,  
   Geveze'nin kendi iş akışına uyan minimum workspace konsepti.

3. **Kademeli geçiş:** Tek seferde büyük bang değil, fazlı yaklaşım.  
   Önce backend izolasyonu, sonra UI, sonra gelişmiş özellikler.

4. **Mevcut kodu kırma:** App.tsx'in mevcut state management mimarisi korunur,  
   genişletilir. Component'ler birer birer refactor edilmez.
