# Faz 8 — Zaman Takibi (Time Tracking)

## Amaç
Ajans ekibinin görevlere harcadığı zamanı Start/Stop zamanlayıcı ile kayıt altına alması.
Saat verileri: Analitik sayfasında, Kişi görünümünde, Portföy şirket kartında gösterilecek.

---

## Backend (✅ Tamamlandı)

### Dosyalar
- `apps/api/src/modules/time-entries/schemas/time-entry.schema.ts`
- `apps/api/src/modules/time-entries/time-entries.service.ts`
- `apps/api/src/modules/time-entries/time-entries.controller.ts`
- `apps/api/src/modules/time-entries/time-entries.module.ts`
- `apps/api/src/app.module.ts` — TimeEntriesModule eklendi

### Schema (MongoDB koleksiyon: `time_entries`)
```
taskId        String    (required, indexed)
taskTitle     String    (optional)
userId        String    (required, indexed)
workspaceId   String    (indexed)
portfolioCompanyId  String  (indexed, optional)
startedAt     Date      (required)
stoppedAt     Date      (null = aktif timer)
minutes       Number    (stoppedAt set edilince hesaplanır)
note          String    (optional)
createdAt/updatedAt  (timestamps: true)
```

### REST API Endpoints
| Method | Path | Açıklama |
|--------|------|----------|
| GET | /time-entries/active | Aktif timer'ı getir (null dönebilir) |
| POST | /time-entries/start | Timer başlat { taskId, taskTitle, workspaceId? } |
| PATCH | /time-entries/stop | Aktif timer'ı durdur { note? } |
| POST | /time-entries/manual | Manuel süre ekle { taskId, minutes, date, ... } |
| GET | /time-entries/task/:taskId | Görevin tüm süre kayıtları |
| GET | /time-entries/user/:userId | Kullanıcı süre kayıtları (?from, ?to, ?workspaceId) |
| GET | /time-entries/stats | Aggregated istatistikler (?workspaceId, ?userId, ...) |
| DELETE | /time-entries/:id | Kayıt sil |

### Kurallar
- Kullanıcı başına **tek aktif timer** — yeni başlatmak için önce durdurmak gerekir (409 ConflictException)
- `stoppedAt = null` → aktif, `stoppedAt != null` → tamamlanmış
- `minutes = max(1, round((stoppedAt - startedAt) / 60000))` — minimum 1 dakika
- Stats endpoint: byUser, byTask, byPortfolio, byDay aggregate sorguları

---

## Shared Types (✅ Tamamlandı)
Dosya: `packages/shared/src/index.ts`

```typescript
interface TimeEntry { id, taskId, taskTitle?, userId, workspaceId, portfolioCompanyId?, startedAt, stoppedAt?, minutes?, note?, createdAt }
interface ActiveTimer { entryId, taskId, taskTitle, startedAt }
interface TimeEntryStats { totalMinutes, byUser[], byTask[], byPortfolio[], byDay[] }
```

---

## Frontend (Kısmen Tamamlandı)

### ✅ Tamamlananlar
- `apps/ui/src/lib/api.ts` — Timer API fonksiyonları (`getActiveTimer`, `startTimer`, `stopTimer`, `getTaskTimeEntries`, `getUserTimeEntries`, `getTimeStats`, `deleteTimeEntry`)
- `apps/ui/src/contexts/TimerContext.tsx` — Global timer state, `useTimer()` hook, `formatElapsed()`, `minutesToDisplay()`
- `apps/ui/src/main.tsx` — `<TimerProvider>` eklendi
- `apps/ui/src/components/Header.tsx` — Aktif timer göstergesi (kırmızı pulse + MM:SS + durdur butonu)
- `apps/ui/src/components/TaskDetailDialog.tsx` — "Süre Takibi" bölümü + "Süreler" sekmesi
  - **Kural: Zamanlayıcı sadece görev "Devam Ediyor" (in-progress) durumundayken aktif olur**

### 🔲 Bekleyenler
- `PersonView` — aylık saat özeti + görev bazında süre listesi  
- `AnalyticsView` — kişi/müşteri bazında saat grafikleri (Recharts BarChart)
- `PortfolioView` şirket kartı — "Bu ay X saat harcandı" özeti

---

## Faz 8.1 — PersonView Zaman İstatistikleri

**Gösterilecek veriler:**
- Bu ay toplam harcanan saat
- Görev bazında kırılım (en çok saat harcanan görevler, top 5-10)
- Son 7 gün günlük harcama (sparkline veya bar)

**Veri kaynağı:** `GET /time-entries/stats?userId={id}&workspaceId={wsId}&from={ayBaşı}&to={bugün}`

**Bileşen konumu:** `apps/ui/src/views/PersonView.tsx` (veya mevcut PersonView bileşeni)

---

## Faz 8.2 — AnalyticsView Zaman Grafikleri

**Eklenecek sekmeler/bölümler:**
- Kişi bazında saat bar chart (byUser)
- Portföy/müşteri bazında saat bar chart (byPortfolio)
- Günlük harcama trend çizgisi (byDay, son 30 gün)

**Veri kaynağı:** `GET /time-entries/stats?workspaceId={wsId}&from=&to=`

---

## Faz 8.3 — Portfolio Şirket Kartı

**Gösterilecek:**
- Bu ay bu müşteriye harcanan toplam saat
- Badge formatında: "12s 30d"

**Veri kaynağı:** `GET /time-entries/stats?portfolioCompanyId={id}&workspaceId={wsId}&from={ayBaşı}`

---

## Sidebar Yeniden Yapılandırma (✅ Tamamlandı — Faz 8 ile birlikte)

Monday.com referansı alınarak ayrıştırıldı:
- **Sol bar** → Workspace switcher, Raporlar (Analitik, Portföy, Kişi), Ekip listesi, Yönetim (Kullanıcılar, Arşiv, Çöp, Ayarlar)
- **Header sekme barı** → Gösterge | Tablo | Tahta | Zaman Çizelgesi | Takvim (içerik görünümleri)

Duplikasyon tamamen giderildi.
