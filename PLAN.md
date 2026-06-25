# Geveze — Monorepo + Backend Dönüşüm Planı

## Özet

Mevcut saf-frontend React uygulaması (localStorage tabanlı), tam çalışan bir
**Turborepo monorepo**'ya dönüştürülecek. İki uygulama olacak:

| Paket | Açıklama |
|-------|----------|
| `apps/ui` | Mevcut React + Vite uygulaması (tasarım korunur) |
| `apps/api` | Yeni NestJS + MongoDB REST API |
| `packages/shared` | Ortak TypeScript tipleri (her iki tarafta kullanılır) |

Tüm state localStorage yerine REST API üzerinden yönetilecek.

---

## Faz Sırası

| Faz | Dosya | Durum |
|-----|-------|-------|
| 0 | [PHASE-0-MONOREPO-SETUP.md](docs/PHASE-0-MONOREPO-SETUP.md) | Bekliyor |
| 1 | [PHASE-1-BACKEND-ENTITIES.md](docs/PHASE-1-BACKEND-ENTITIES.md) | Bekliyor |
| 2 | [PHASE-2-REST-API.md](docs/PHASE-2-REST-API.md) | Bekliyor |
| 3 | [PHASE-3-FRONTEND-INTEGRATION.md](docs/PHASE-3-FRONTEND-INTEGRATION.md) | Bekliyor |
| 4 | [PHASE-4-AUTH.md](docs/PHASE-4-AUTH.md) | Bekliyor |

Her fazı tamamladıktan sonra ilgili satırdaki "Bekliyor"u "Tamamlandı ✅" ile değiştir.

---

## Teknoloji Kararları

### Backend
- **Runtime:** Node.js (v24 — zaten yüklü)
- **Framework:** NestJS (kurumsal yapı, decorator tabanlı, TypeScript native)
- **ODM:** Mongoose (`@nestjs/mongoose`)
- **DB:** MongoDB (dev'de yerel veya Atlas free tier)
- **Monorepo Aracı:** Turborepo (task pipeline ve cache)

### Frontend değişmeyecekler
- React 19 + Vite + TypeScript
- TailwindCSS + Radix UI
- Tüm mevcut tasarım ve bileşenler **aynen korunur**
- localStorage → API çağrıları (sadece veri katmanı değişir)

### Paylaşılan Tipler
- `packages/shared/src/types.ts` — mevcut `src/types/index.ts` buraya taşınır
- Her iki uygulama bu paketi import eder

---

## Mevcut Durum Analizi

### Varlıklar (Entity'ler)
| Varlık | Frontend tipi | MongoDB koleksiyonu |
|--------|--------------|---------------------|
| Task | `Task` (types/index.ts) | `tasks` |
| User | `User` | `users` |
| PortfolioCompany | `PortfolioCompany` | `portfolio_companies` |
| Tag | string[] | `tags` |
| ServiceType | string[] | `service_types` |
| Settings | — | `settings` |

### State Kaynakları (localStorage → API)
| localStorage key | API endpoint |
|-----------------|-------------|
| `geveze.tasks` | `GET/POST/PUT/DELETE /api/tasks` |
| `geveze.portfolio` | `GET/POST/PUT/DELETE /api/portfolio-companies` |
| `geveze.serviceTypes` | `GET/POST/DELETE /api/service-types` |
| `geveze.tags` | `GET/POST/DELETE /api/tags` |
| `geveze.tagServiceMap` | `GET/PUT /api/settings/tag-service-map` |
| `geveze.tableSchema` | `GET/PUT /api/settings/table-schema` |
| `geveze.currentView` | Client-side kalır |
