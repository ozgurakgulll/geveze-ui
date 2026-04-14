# Twenty Temel Yapısı Entegrasyonu

Bu kılavuz, app projesine Twenty CRM'nin temel yapısının nasıl entegre edildiğini anlatır.

## Eklenen Özellikler

### 1. **i18n (Lingui) - Çoklu Dil Desteği**
- **Kurulum**: `@lingui/core`, `@lingui/react`, `@lingui/cli` eklendi
- **Konfigürasyon**: `lingui.config.ts`
- **Dil Dosyaları**:
  - `src/locales/en.po` - English
  - `src/locales/tr-TR.po` - Türkçe
- **Yazı Oluşturma**:
  ```bash
  yarn lingui extract  # Çeviriler için string'leri belirle
  yarn lingui compile   # .po dosyalarını derle
  ```
- **Kullanım**:
  ```tsx
  import { useLingui } from '@lingui/react/macro';

  export function MyComponent() {
    const { t } = useLingui();
    return <h1>{t`Dashboard`}</h1>;
  }
  ```

### 2. **State Management (Recoil)**
- **Kurulum**: `recoil` eklendi
- **File**: `src/recoil/atoms.ts`
- **Atoms**:
  - `currentUserState` - Giriş yapan kullanıcı
  - `currentWorkspaceState` - Aktif çalışma alanı
  - `currentWorkspaceMemberState` - Kullanıcının workspace'deki rolü
  - `localeState` - Seçilen dil
  - `isAuthenticatedState` - Kimlik doğrulama durumu
- **Kullanım**:
  ```tsx
  import { useRecoilState } from 'recoil';
  import { currentUserState } from '@/recoil/atoms';

  export function MyComponent() {
    const [user, setUser] = useRecoilState(currentUserState);
    return <div>{user?.firstName}</div>;
  }
  ```

### 3. **Veritabanı Modelleri (TypeORM Entities)**
- **Kurulum**: TypeORM entities oluşturuldu (production için NestJS backend gerekli)
- **File**: `src/database/entities.ts`
- **Modeller**:
  - **User** - Sistem kullanıcıları
  - **Workspace** - Çalışma alanları (multi-tenant desteği)
  - **WorkspaceMember** - Kullanıcı-workspace ilişkisi
  - **Task** - Görevler
  - **Person** - Kişiler/Kontaklar
  - **Company** - Şirket bilgileri

### 4. **Recoil Wrapper**
- **Eklendi**: `main.tsx` güncellendi
- `RecoilRoot` App'i sarabilir (global state desteği)

## Kurulum Adımları

### 1. Bağımlılıkları Yükle
```bash
cd /Users/kazimgun/Downloads/app
yarn install
```

### 2. Lingui Çevirilerini Derle
```bash
yarn lingui extract      # .po dosyalarından çeviriler
yarn lingui compile      # Derlenmiş .ts dosyaları oluştur
```

### 3. Backend Kurulumu (Production)
TypeORM entities'i kullanmak için bir NestJS backend gerekiyorsa:
```bash
npm install @nestjs/core @nestjs/common typeorm pg
```

PostgreSQL veritabanı bağlantısı ayarları:
```typescript
// ormconfig.json veya twenty-server tarzı setup
{
  "type": "postgres",
  "host": "localhost",
  "port": 5432,
  "username": "postgres",
  "password": "postgres",
  "database": "myapp",
  "entities": ["src/database/entities.ts"],
  "migrations": ["src/database/migrations/**/*.ts"],
  "synchronize": false
}
```

## Sonraki Adımlar

1. **GraphQL Integration** (isteğe bağlı)
   - `@apollo/client` zaten package.json'a alındı
   - Backend GraphQL şeması gerekli

2. **Authentication**
   - JWT veya OAuth2 implement et
   - `currentUserState` ve `isAuthenticatedState` kullan

3. **Backend Oluştur**
   - Twenty gibi NestJS projesi oluştur
   - Entities'i veritabanına eşle

4. **UI Bileşenleri**
   - Shadcn/ui iyi başlamış (zaten kurulu)
   - Twenty UI bileşenlerini referans al

## Dosya Yapısı

```
src/
├── recoil/
│   └── atoms.ts              # Recoil state atomları
├── database/
│   └── entities.ts           # TypeORM entities
├── locales/
│   ├── en.po                 # English çeviriler
│   ├── tr-TR.po             # Türkçe çeviriler
│   └── generated/            # Derlenmiş çeviriler (lingui compile sonrası)
├── utils/
│   └── i18n.ts              # i18n initialization
└── main.tsx                  # RecoilRoot wrapper
```

## Önemli Notlar

✅ **Yapılmış**: i18n altyapısı, Recoil state, veritabanı şeması
⏳ **Yapılacak**: Backend (NestJS), GraphQL, Authentication
🔄 **Referans**: Twenty'nin `/packages/twenty-server`, `/packages/twenty-front` yapısı incelenebilir

## İletişim ve Sorular

Herhangi bir ek özellik veya entegrasyon için Twenty'nin resmi repo'suna bakabilirsin:
- https://github.com/twentyhq/twenty
- Docs: https://docs.twenty.com
