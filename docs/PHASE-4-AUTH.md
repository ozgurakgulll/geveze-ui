# Faz 4 — Kimlik Doğrulama (NestJS JWT + React AuthContext)

## Hedef

Uygulamaya **JWT tabanlı kimlik doğrulama** ekle. Tüm tipler
`@geveze/shared`'dan gelir, hiçbir tip tekrar tanımlanmaz.

## Kapsam

- [x] Backend: `POST /api/auth/login` endpoint'i
- [x] Backend: JWT Guard (tüm `/api/*` route'larını koru)
- [x] Backend: `UserModel`'e `passwordHash` alanı (select: false)
- [x] Frontend: `LoginPage.tsx` bileşeni
- [x] Frontend: `AuthContext.tsx` + `useAuth` hook'u
- [x] Frontend: API istemcisine token ekleme
- [x] Frontend: Logout

## Kapsam Dışı

- Kullanıcı kaydı (seed ile ekleniyor)
- Şifre sıfırlama / e-posta doğrulama
- OAuth / sosyal giriş
- 2FA

---

## Backend — Auth Modülü

### Bağımlılıklar

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs -w apps/api
npm install -D @types/passport-jwt @types/bcryptjs -w apps/api
```

### apps/api/src/modules/auth/auth.module.ts

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

### apps/api/src/modules/auth/auth.service.ts

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UserModel, UserDocument } from '../users/schemas/user.schema';
import type { AuthResponse, LoginDto } from '@geveze/shared';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(UserModel.name)
    private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .select('+passwordHash')
      .lean()
      .exec();

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    }

    const payload = { sub: String(user._id), email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id:       String(user._id),
        name:     user.name,
        email:    user.email,
        color:    user.color,
        initials: user.initials,
      },
    };
  }

  /** Seed sırasında şifre hash'leme */
  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }
}
```

### apps/api/src/modules/auth/auth.controller.ts

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsEmail, IsString, MinLength } from 'class-validator';
import type { AuthResponse, LoginDto } from '@geveze/shared';

class LoginBodyDto implements LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginBodyDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }
}
```

### apps/api/src/modules/auth/jwt.strategy.ts

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserModel, UserDocument } from '../users/schemas/user.schema';
import type { User } from '@geveze/shared';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectModel(UserModel.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:    config.get<string>('JWT_SECRET') ?? 'dev-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userModel.findById(payload.sub).lean().exec();
    if (!user) throw new UnauthorizedException();
    return {
      id:       String(user._id),
      name:     user.name,
      email:    user.email,
      color:    user.color,
      initials: user.initials,
      title:    user.title,
    };
  }
}
```

### JWT Guard (Global)

```typescript
// apps/api/src/common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

`app.module.ts`'e ekle:
```typescript
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
]
```

`AuthController`'a `@Public()` dekoratörü ekle (login public olmalı):
```typescript
@Public()
@Controller('auth')
export class AuthController { ... }
```

---

## Frontend — Auth Katmanı

### apps/ui/src/contexts/AuthContext.tsx

```tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { apiClient } from '@/api/client';
import { toast } from 'sonner';
import type { AuthResponse, LoginDto, User } from '@geveze/shared';

interface AuthContextValue {
  currentUser: Pick<User, 'id' | 'name' | 'email' | 'color' | 'initials'> | null;
  login: (dto: LoginDto) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] =
    useState<AuthContextValue['currentUser']>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('geveze_token');
    const stored = localStorage.getItem('geveze_user');
    if (token && stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('geveze_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (dto: LoginDto) => {
    const data = await apiClient.post<AuthResponse>('/api/auth/login', dto);
    localStorage.setItem('geveze_token', data.token);
    localStorage.setItem('geveze_user', JSON.stringify(data.user));
    setCurrentUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('geveze_token');
    localStorage.removeItem('geveze_user');
    setCurrentUser(null);
    toast.success('Çıkış yapıldı');
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

### apps/ui/src/components/LoginPage.tsx

```tsx
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import gevezeLogo from '@/assets/geveze-logo.png';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('E-posta ve şifre gerekli');
      return;
    }
    setIsLoading(true);
    try {
      await login({ email, password });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Giriş başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50/50">
      <Card className="w-full max-w-sm shadow-md">
        <CardHeader className="items-center text-center gap-2">
          <img src={gevezeLogo} alt="Geveze" className="h-8" />
          <CardTitle className="text-xl">Geveze CRM</CardTitle>
          <CardDescription>Devam etmek için giriş yapın</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ad@geveze.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo: kazim@geveze.com · geveze2024
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### apps/ui/src/main.tsx Güncellemesi

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
```

### App.tsx Başına Eklenecek

```tsx
const { currentUser, isLoading: authLoading, logout } = useAuth();

if (authLoading) return <LoadingSpinner />;
if (!currentUser) return <LoginPage />;
// ... mevcut JSX devam eder
```

Sidebar'a logout butonu ekle:
```tsx
// Sidebar.tsx içinde
<button onClick={logout} className="...">
  Çıkış Yap
</button>
```

---

## Seed Güncellemesi

```typescript
// apps/api/src/seed/seed.ts içine ekle
import { AuthService } from '../modules/auth/auth.service';

const DEMO_PASSWORD = 'geveze2024';
const passwordHash = await AuthService.hashPassword(DEMO_PASSWORD);

// Kullanıcıları upsert ederken passwordHash ekle
await usersService.upsert({ ...user, passwordHash });
```

---

## .env Güncellemesi

`apps/api/.env`:
```
JWT_SECRET=super-gizli-en-az-32-karakter-uzunlugunda-bir-deger
```

---

## Demo Kullanıcılar

| E-posta | Şifre | Rol |
|---------|-------|-----|
| `kazim@geveze.com` | `geveze2024` | Video Editör |
| `nihat@geveze.com` | `geveze2024` | Grafik Tasarımcı |
| `selena@geveze.com` | `geveze2024` | Grafik Tasarımcı |
| `efecan@geveze.com` | `geveze2024` | Yönetici |

---

## Tamamlanma Kriteri

- [ ] `POST /api/auth/login` geçerli şifreyle `{ token, user }` dönüyor
- [ ] `POST /api/auth/login` geçersiz şifreyle 401 dönüyor
- [ ] Korunan endpoint'ler token olmadan 401 dönüyor
- [ ] Login sayfası mevcut tasarımla uyumlu açılıyor
- [ ] Giriş sonrası ana uygulama görünüyor
- [ ] Sidebar'daki "Çıkış Yap" butonuyla logout çalışıyor
- [ ] Sayfa yenilemede token geçerliyse yeniden giriş istenmiyor
- [ ] `passwordHash` hiçbir API yanıtında dönmüyor
- [ ] TypeScript hata yok

## Güvenlik Notları

- `JWT_SECRET` production'da güçlü ve rastgele olmalı (min 32 karakter).
- Token `localStorage`'da tutuluyor — XSS riski mevcut.
  Production'da `httpOnly` cookie ile değiştirilmesi önerilir (ilerleyen versiyon).
- `bcrypt` cost factor 12 — yeterli güvenlik, kabul edilebilir performans.
- `select: false` ile `passwordHash` asla sorgu sonuçlarına dahil edilmez.
