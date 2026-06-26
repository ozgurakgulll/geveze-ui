# 03 — Mevcut Workspace Akışı Analizi

## Özet

Mevcut uygulamada "workspace" kavramı **yoktur**. Sidebar'da görünen proje kartı tek bir  
hardcoded alanı temsil etmektedir: `companyName` Settings API'dan gelir, alt başlık  
`"Ajans iş takibi"` ise statik olarak kodlanmıştır.

---

## Mevcut "Workspace" Benzeri Yapı

### Sidebar'daki Proje Kartı

```tsx
// Sidebar.tsx ~satır 264-278
<div className="... bg-white rounded-lg border border-gray-200">
  <div className="flex items-center gap-3">
    <div className="... bg-[#6161FF]">
      <Star className="h-5 w-5" />      {/* Hardcoded ikon */}
    </div>
    <div>
      <h3>{companyName}</h3>             {/* Settings API'dan: key="companyName" */}
      <p>Ajans iş takibi</p>            {/* Tamamen hardcoded */}
    </div>
  </div>
</div>
```

### companyName Kaynağı

```
MongoDB
  └── settings collection
        └── { key: "companyName", value: "Geveze" }
              ↓ GET /api/settings
            App.tsx (appSettings state)
              ↓ prop
            Sidebar (companyName prop)
              ↓
            Proje kartı
```

`companyName` dışında workspace'e ait **hiçbir veri** settings'te saklanmıyor.  
`color`, `logo`, `description`, `slug`, `createdAt`, `memberCount` — hiçbiri mevcut değil.

---

## Mevcut Veri İzolasyonu

Tüm veriler **globaldır** — workspace ayrımı yoktur:

| Veri Tipi | Workspace Bağlantısı |
|-----------|---------------------|
| Tasks | YOK — tüm task'lar tek havuzda |
| Users | YOK — tüm kullanıcılar global |
| Portfolio | YOK — tüm şirketler görünür |
| Tags | YOK — global tag listesi |
| ServiceTypes | YOK — global liste |
| Settings | KISMÎ — sadece `companyName` |

Örnek: Backend'de `Task.workspaceId` alanı yoktur. Birden fazla workspace olsa bile  
tüm task'lar aynı `GET /api/tasks` sonucunda döner.

---

## Kullanıcı Rollerinin Mevcut Çalışması

```
AppRole = 'admin' | 'manager' | 'member'
```

Bu rol **global** — workspace seviyesinde değil, uygulama seviyesinde:

```typescript
// App.tsx — authUser.role doğrudan kullanılıyor
const isManager = appRole === 'admin' || appRole === 'manager';
```

Workspace bazında farklı rol ataması mümkün değil.  
Örnek: Kullanıcı A, Workspace 1'de `admin`, Workspace 2'de `member` olamaz.

---

## Auth Akışı ve Workspace İlişkisi

```
Login → { token, user } (token payload'da workspaceId YOK)
  ↓
AuthContext → useAuth()
  ↓
App.tsx → authUser (id, name, role)
  ↓
Tüm API çağrıları: JWT token ile auth, workspaceId parametresi YOK
```

JWT payload'ı:
```typescript
{ sub: userId, email, role }
// workspaceId alanı YOK
```

---

## Monday.com Workspace Modeli ile Karşılaştırma

| Özellik | Monday.com | Geveze (Mevcut) |
|---------|-----------|-----------------|
| Birden fazla workspace | ✅ | ❌ |
| Workspace'e özel üyeler | ✅ | ❌ (global kullanıcılar) |
| Workspace bazında roller | ✅ | ❌ (global role) |
| Workspace URL izolasyonu | ✅ | ❌ |
| Workspace avatar/renk | ✅ | Sadece `#6161FF` hardcoded |
| Workspace daveti | ✅ | ❌ |
| Workspace ayarları | ✅ | Sadece `companyName` |
| Board'lar (Workspace içinde) | ✅ | ❌ |

---

## Mevcut "Board" Kavramı

Mevcut uygulamada `BoardView`, Kanban'ı (sütun bazlı task yönetimi) temsil ediyor.  
Monday.com'da "Board" ise bir workspace içindeki bağımsız veri tablosuna karşılık gelir.

**Bu kritik bir fark:**
- Monday.com: `Workspace > Board > Item (görev)`  
- Geveze (mevcut): `[tek workspace] > [tek board] > Task`

---

## Proje Alt Menüsü (Sidebar)

```
Proje Bölümü (Sidebar ~satır 250-294)
├── [Star] Geveze Ajans (workspace kartı)
│    └── "Ajans iş takibi" (hardcoded)
└── projectItems:
    ├── Genel Bakış → dashboard view
    ├── Analitik → analytics view (manager only)
    └── Portföy → portfolio view
```

Bu "projectItems" workspace'in alt board'larını simüle edebilir ama şu an sadece  
`ViewType` değiştirme işlemi yapıyor — gerçek bir veri ayrışımı sağlamıyor.

---

## Mevcut Workspace Kayıt/Oluşturma Akışı

**Mevcut durum:** Workspace oluşturma akışı **hiç yoktur**.

Uygulama her zaman tek bir "workspace" üzerinde çalışır.  
Kayıt sayfası yok. Workspace seçim ekranı yok.

---

## Tasarım Kararları Gerektiren Noktalar

1. **Single-tenant mi, multi-tenant mi?**  
   Mevcut yapı tamamen single-tenant (tek şirket). Multi-tenant'a geçiş  
   backend'de `workspaceId` eklenmesini gerektirir.

2. **Workspace = Organization mı?**  
   Monday.com'da Organization > Workspace hiyerarşisi var.  
   Geveze için tek katman (sadece Workspace) daha sade olabilir.

3. **Board soyutlaması gerekli mi?**  
   Workspace içinde farklı "board"lar (Table, Board, Timeline) mi olacak  
   yoksa tüm view'lar aynı task havuzuna mı bakacak?

4. **Settings API yeterli mi?**  
   `companyName` şu an settings'ten geliyor. Workspace metadata (renk, logo,  
   slug, description) aynı koleksiyon içinde genişletilebilir mi yoksa  
   ayrı bir `workspaces` koleksiyonu mu gerekir?

→ Bkz. `11-open-questions.md`

---

## Sonuç

Mevcut durum, dönüşüm öncesi tablodur. Workspace kavramı hem backend'de hem de  
frontend'de **sıfırdan** inşa edilecek. En büyük zorluk:

1. Backend'e `workspaceId` eklenmesi (Task, Portfolio, Tag, ServiceType)
2. Frontend URL routing (react-router-dom)
3. Multi-workspace UI (seçim ekranı, sidebar workspace switcher)
4. JWT payload'a `workspaceId` eklenmesi veya her request'te query param ile geçmesi
