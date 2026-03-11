import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Sparkles } from 'lucide-react';
import { login } from '../lib/auth';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const ok = await login(password);
      if (ok) {
        navigate('/calculator');
      } else {
        setError('Mật khẩu không đúng. Vui lòng thử lại.');
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #0f0a1a 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            <Sparkles size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Hệ Thống Tính Giá</h1>
          <p className="text-sm" style={{ color: '#71717a' }}>Nước hoa chính hãng</p>
        </div>

        {/* Form */}
        <div
          className="rounded-2xl p-6 border"
          style={{ background: '#111111', borderColor: '#1f1f1f' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                Mật khẩu
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#52525b' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  autoFocus
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm text-white placeholder-zinc-600 border focus:outline-none focus:ring-1 transition-colors"
                  style={{
                    background: '#1a1a1a',
                    borderColor: error ? '#ef4444' : '#2a2a2a',
                    boxShadow: error ? '0 0 0 1px #ef4444' : undefined,
                  }}
                  onFocus={(e) => {
                    if (!error) e.target.style.borderColor = '#7c3aed';
                    e.target.style.boxShadow = !error ? '0 0 0 1px #7c3aed' : undefined!;
                  }}
                  onBlur={(e) => {
                    if (!error) {
                      e.target.style.borderColor = '#2a2a2a';
                      e.target.style.boxShadow = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#52525b' }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {error && <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-2.5 rounded-lg font-medium text-sm text-white transition-all"
              style={{
                background: loading || !password.trim()
                  ? '#3f3f46'
                  : 'linear-gradient(135deg, #7c3aed, #9333ea)',
                cursor: loading || !password.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Đang kiểm tra...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="text-center text-xs mt-4" style={{ color: '#3f3f46' }}>
            Mật khẩu mặc định: <span style={{ color: '#52525b' }}>admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
