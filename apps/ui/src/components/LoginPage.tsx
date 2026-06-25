import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import logo from '@/assets/geveze-logo.png';
import * as api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function LoginPage() {
  const { setAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const result = await api.login(email.trim().toLowerCase(), password);
      setAuth(result.token, result.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Giriş başarısız';
      toast.error('Giriş yapılamadı', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-center mb-8">
            <img src={logo} alt="Geveze" className="h-10 object-contain" />
          </div>

          <h1 className="text-xl font-semibold text-gray-900 text-center mb-1">Hoş geldiniz</h1>
          <p className="text-sm text-gray-500 text-center mb-8">Devam etmek için giriş yapın</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                E-posta
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ad@geveze.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Şifre
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Giriş yapılıyor…
                </>
              ) : (
                'Giriş Yap'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            Varsayılan şifre: <span className="font-mono text-gray-600">geveze123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
