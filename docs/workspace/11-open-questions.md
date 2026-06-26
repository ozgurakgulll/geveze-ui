# 11 — Açık Sorular

Bu doküman, workspace dönüşümü için net karar verilmesi gereken tasarım ve mimari  
sorularını listeler. Her soru için mevcut bilgi, seçenekler ve önerilen yaklaşım belirtilmiştir.

---

## Mimari Kararlar

### S1 — Board Soyutlaması İlk Versiyona Dahil Mi?

**Bağlam:**  
Monday.com'da `Workspace > Board > Item` hiyerarşisi var.  
Şu an Geveze'de `[tek workspace] > [tek task havuzu]` var.

**Seçenek A:** Board kavramı YOK (önerilen ilk versiyon)
- Workspace doğrudan task'ları içerir
- ViewType (table/board/timeline) sadece UI sunum biçimi
- `Task.boardId` yok

**Seçenek B:** Board soyutlaması var
- `Workspace > Board > Task`
- Task'lar belirli bir board'a ait
- Her board'un default view type'ı var
- Büyük efor, App.tsx ve tüm view'lar etkilenir

**Öneri:** Seçenek A. Board kavramı ikinci major versiyon için ertelenir.

---

### S2 — Global AppRole Korunacak Mı?

**Bağlam:**  
Mevcut `AppRole = 'admin' | 'manager' | 'member'` tüm uygulama için geçerli.  
Workspace dönüşümü ile `WorkspaceRole` geliyor.

**Seçenek A:** İkisi birlikte (önerilen)
- `AppRole.admin` = platform superadmin (tüm workspace'lere tam erişim)
- `WorkspaceRole` = workspace bazında normal kullanıcı rolleri
- Global admin, workspace member listesinde görünmek zorunda değil

**Seçenek B:** Sadece WorkspaceRole
- `AppRole` kaldırılır
- Her kullanıcının her workspace'te farklı rolü olabilir
- "Platform admin" kavramı olmaz
- Daha temiz ama mevcut auth yapısı tamamen değişir

**Öneri:** Seçenek A. `AppRole` korunur, `WorkspaceRole` eklenir.

---

### S3 — workspaceId JWT'de Mi Olmalı?

**Bağlam:**  
Şu an JWT payload: `{ sub: userId, email, role }`.  
Workspace bazlı işlemler için workspaceId gerekli.

**Seçenek A:** JWT'ye workspaceId ekleme (her request workspaceId içerir)
- Avantaj: Her request'te doğrulama kolay
- Dezavantaj: Token workspace değiştirince yenilenmeli (ya da çoklu workspace ID array)

**Seçenek B:** workspaceId her request'te path param olarak (önerilen)
- `GET /api/workspaces/:workspaceId/tasks`
- Backend WorkspaceGuard her request'te DB'den üyelik kontrol eder
- Dezavantaj: Her request DB sorgusu (cache ile azaltılabilir)

**Seçenek C:** workspaceId header'da
- `X-Workspace-ID: ws_abc123`
- Mevcut URL'ler değişmez
- RESTful değil, debugging zor

**Öneri:** Seçenek B. Path param. Performans için Redis cache eklenebilir.

---

### S4 — workspace_viewer Rolü İlk Versiyona Dahil Mi?

**Bağlam:**  
`workspace_admin | workspace_manager | workspace_member | workspace_viewer` önerildi.  
`workspace_viewer` salt okunur erişim için.

**Soru:** İlk versiyonda gerekli mi?

**Analiz:**
- Şu an "sadece gören" kullanıcı konsepti yok
- Müşterilere read-only erişim vermek için kullanılabilir
- Eklenmesi backend'de minimal efor

**Öneri:** Dahil et ama UI'da şimdilik gösterme. Enum'a eklemek sonradan kaldırmaktan kolay.

---

### S5 — Workspace Silme Cascade Stratejisi

**Bağlam:**  
Workspace silindiğinde task'lar, portföy şirketleri, tag'ler ne olur?

**Seçenek A:** Hard delete (tüm kayıtlar silinir)
- Basit
- Geri dönüşsüz

**Seçenek B:** Soft delete (workspace `deletedAt` set edilir, kayıtlar kalır)
- Veri kurtarma mümkün
- Depolama maliyeti artar

**Seçenek C:** Archive (workspace "arşivlendi" durumuna geçer)
- Üyeler erişemez ama kayıtlar korunur

**Öneri:** Seçenek B. `Workspace.deletedAt` soft delete. 30 gün sonra cron ile temizlenir.

---

### S6 — Tek Workspace Durumunda UI Değişikliği

**Bağlam:**  
Eğer kullanıcı sadece 1 workspace'e sahipse workspace switcher gösterilmeli mi?

**Seçenek A:** Switcher daima göster
- Tutarlı UI, yeni workspace oluşturma CTA var

**Seçenek B:** Switcher sadece 2+ workspace varsa göster
- Daha temiz, tek workspace'te gereksiz karmaşıklık yok

**Öneri:** Seçenek B. Tek workspace → Sidebar'da doğrudan workspace adı ve "+" butonu.

---

## UX / Ürün Kararları

### S7 — Mevcut "Proje" Bölümü Adı Değişecek Mi?

**Bağlam:**  
Sidebar'da `"Proje"` başlığı altında `[Genel Bakış | Analitik | Portföy]` var.  
Workspace dönüşümü sonrası bu bölümün adı ne olmalı?

**Seçenekler:** `"Workspace"` | `"Proje"` (aynı kalsın) | `"Ana Menü"` ile birleştir

**Karar gerekli:** Kullanıcı deneyimi açısından ne daha anlamlı?

---

### S8 — Workspace Oluşturma Hangi Kullanıcılar Yapabilir?

**Seçenek A:** Herkes yapabilir (her kullanıcı workspace oluşturabilir)
- Demokratik ama kontrolsüz

**Seçenek B:** Sadece global admin yapabilir
- Kontrollü ama katı

**Seçenek C:** Sadece `AppRole.admin` veya `AppRole.manager`
- Orta yol

**Öneri:** Seçenek C. Admin ve Manager yeni workspace oluşturabilir.

---

### S9 — Workspace Üye Ekleme Akışı

**Seçenek A:** Mevcut kullanıcılar listesinden seç
- Basit: sadece `userId` seçilir
- Global kullanıcı listesinden ekleme

**Seçenek B:** E-posta ile davet
- Yeni kullanıcı davet edilebilir
- Mail servis gerektirir

**Seçenek C:** Hem A hem B
- İdeal ama daha fazla efor

**Öneri:** Önce Seçenek A. E-posta daveti Faz 2 olarak eklenir.

---

## Teknik Kararlar

### S10 — WorkspaceMember Embed mi Yoksa Ayrı Koleksiyon mu?

**Bağlam:**  
Doküman `06-workspace-data-model.md`'de embed önerildi (< 100 üye varsayımı).

**Soru:** Ne zaman ayrı koleksiyona geçilmeli?

**Öneri:** Üye sayısı 200'ü geçtiğinde veya üye bazlı sorgu performansı düşünce.  
Şu an için embed.

---

### S11 — Settings API Workspace-Aware Yapılmalı Mı?

**Bağlam:**  
`GET /api/settings` global key-value store.  
`companyName` artık `workspace.name`'e taşınacak.

**Soru:** Settings endpoint'i workspace prefix almalı mı?  
`GET /api/workspaces/:id/settings` mı?

**Öneri:** Evet. Workspace-specific settings (`theme`, `timezone`, vb.) için  
`/api/workspaces/:id/settings` kullanılır. Global app settings ayrı kalır.

---

### S12 — URL Slug Çakışması

**Bağlam:**  
Her workspace benzersiz bir slug alır: `geveze-ajans`, `yeni-workspace` vb.

**Soru:** Slug otomatik mi üretilmeli yoksa kullanıcı mı belirlemeli?

**Öneri:** `name`'den otomatik üretilir (lowercase, slugify), kullanıcı değiştirebilir.  
Çakışma durumunda `-2`, `-3` suffix eklenir.

---

### S13 — Cache Stratejisi (Workspace Üyelik Kontrolü)

**Bağlam:**  
`WorkspaceGuard` her request'te `db.workspaces.findOne({ _id, 'members.userId': userId })` yapar.  
Yüksek trafikte darboğaz oluşabilir.

**Seçenekler:**
- Redis cache: workspace üyelikleri 5 dakika cache'lenir
- Mongoose lean(): zaten kullanılıyor
- Compound index: `{ _id: 1, 'members.userId': 1 }` — tek sorgu

**Öneri:** Şu an için index yeterli. Trafik artınca Redis cache planlanır.

---

## Karar Log

| Soru | Karar | Tarih |
|------|-------|-------|
| S1 Board soyutlaması | Faz 2'ye ertelendi | 2026-06-26 |
| S2 AppRole korunacak mı | Evet — AppRole + WorkspaceRole birlikte kullanılacak | 2026-06-26 |
| S3 workspaceId konumu | Path param: `/api/workspaces/:workspaceId` | 2026-06-26 |
| S4 workspace_viewer | Backend enum'a dahil edilecek, UI'da sonra aktif edilecek | 2026-06-26 |
| S5 Workspace silme | Soft delete; archive ayrı tutulacak | 2026-06-26 |
| S6 Tek workspace UI | Switcher her zaman gösterilecek | 2026-06-26 |
| S7 "Proje" bölümü adı | "Çalışma Alanı" olarak değiştirilecek | 2026-06-26 |
| S8 Kim workspace oluşturabilir | Her kullanıcı oluşturabilir | 2026-06-26 |
| S9 Üye ekleme akışı | İlk versiyon mevcut kullanıcı listesinden seçim | 2026-06-26 |
| S10 WorkspaceMember embed | İlk versiyon embed; 200+ üyede ayrı koleksiyona taşınır | 2026-06-26 |
| S11 Settings prefix | `/api/workspaces/:workspaceId/settings` | 2026-06-26 |
| S12 URL Slug | `name`'den otomatik üretilir, kullanıcı düzenleyebilir | 2026-06-26 |
| S13 Cache stratejisi | Şimdilik compound index yeterli | 2026-06-26 |
