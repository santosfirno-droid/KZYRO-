import React, { useState, useRef } from 'react';
import { BrandLogo } from './BrandLogo';
import { User } from '../types';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import {
  Lock,
  Mail,
  User as UserIcon,
  Briefcase,
  ArrowRight,
  Database,
  Upload,
  Camera,
  Check,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&auto=format&fit=crop&q=80',
];

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0]);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await ApiService.login(email, password);
      if (res.error || !res.user) {
        setError(res.error || 'Credenciais inválidas. Verifique os dados ou crie sua conta.');
        setIsLoading(false);
        return;
      }

      StorageService.registerUser(res.user);
      setIsLoading(false);
      onLoginSuccess(res.user);
    } catch {
      setError('Erro ao autenticar. Tente novamente.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }
    if (!role.trim()) {
      setError('Por favor, informe sua função na KZYRO (ex: Desenvolvimento, Prospecção, Conversão...).');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await ApiService.register({
        name,
        role,
        email,
        password,
        avatar,
      });

      if (res.error || !res.user) {
        setError(res.error || 'Falha no cadastro. Verifique os dados.');
        setIsLoading(false);
        return;
      }

      StorageService.registerUser(res.user);
      setIsLoading(false);
      onLoginSuccess(res.user);
    } catch {
      setError('Erro de conexão ao criar conta. Tente novamente.');
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        setAvatar(uploadEvent.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <BrandLogo size="lg" />
          <p className="text-slate-400 text-xs sm:text-sm mt-3 max-w-xs">
            Comunidade privada da KZYRO. Cada membro acessa com sua própria conta.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0b1222]/90 border border-slate-800/80 rounded-2xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl shadow-black/50">
          {/* Header Switcher Tabs: Entrar vs Criar Conta */}
          <div className="flex items-center justify-between p-1 bg-slate-900/90 border border-slate-800 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Conta
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-white tracking-tight">
              {authMode === 'login' ? 'Acessar sua conta' : 'Criar sua conta KZYRO'}
            </h1>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              <Database className="w-3 h-3" />
              <span>Nuvem KZYRO</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
              <span className="shrink-0 font-bold">!</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@kzyro.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full pl-10 pr-3 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Conectando...</span>
                ) : (
                  <>
                    <span>Entrar na Comunidade</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Foto de Perfil
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={avatar}
                      alt="Pré-visualização do perfil"
                      className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 p-1 bg-slate-800 hover:bg-slate-700 text-white rounded-full border border-slate-700 cursor-pointer"
                      title="Enviar foto do aparelho"
                    >
                      <Camera className="w-3 h-3 text-blue-400" />
                    </button>
                  </div>

                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-400" />
                      <span>Upload do aparelho</span>
                    </button>
                    <div className="flex items-center gap-1.5 mt-2">
                      {PRESET_AVATARS.slice(0, 5).map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatar(preset)}
                          className={`w-6 h-6 rounded-full overflow-hidden border transition-all cursor-pointer ${
                            avatar === preset ? 'ring-2 ring-blue-500 scale-110' : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={preset} alt="preset" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full pl-10 pr-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Função / Cargo na KZYRO
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="ex: Desenvolvimento, Prospecção, Conversão..."
                    className="w-full pl-10 pr-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@kzyro.com"
                    className="w-full pl-10 pr-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Senha (mínimo 6 dígitos)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Criando conta...</span>
                ) : (
                  <>
                    <span>Criar Minha Conta</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
            {authMode === 'login' ? (
              <span>
                Novo na equipe?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="text-blue-400 hover:underline font-medium cursor-pointer"
                >
                  Crie sua conta aqui
                </button>
              </span>
            ) : (
              <span>
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-blue-400 hover:underline font-medium cursor-pointer"
                >
                  Faça login
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          KZYRO Community &middot; Nuvem e Supabase Sincronizados
        </div>
      </div>
    </div>
  );
}
