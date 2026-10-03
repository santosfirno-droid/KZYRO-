import React, { useState, useRef, useEffect } from 'react';
import { User, Post } from '../types';
import { ApiService } from '../services/api';
import { PostCard } from './PostCard';
import {
  ArrowLeft,
  Camera,
  Check,
  Heart,
  MessageSquare,
  Shield,
  Upload,
  User as UserIcon,
  MessageCircle,
  Database,
} from 'lucide-react';

interface ProfileViewProps {
  memberId: string;
  currentUser: User;
  onBack: () => void;
  onPostUpdated: () => void;
  onViewMemberProfile: (userId: string) => void;
  onOpenImage: (imageUrl: string) => void;
  onStartChatWithMember?: (memberId: string) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=240&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&auto=format&fit=crop&q=80',
];

export function ProfileView({
  memberId,
  currentUser,
  onBack,
  onPostUpdated,
  onViewMemberProfile,
  onOpenImage,
  onStartChatWithMember,
}: ProfileViewProps) {
  const [member, setMember] = useState<User>(() =>
    memberId === currentUser.id ? currentUser : { ...currentUser, id: memberId }
  );
  const [memberPosts, setMemberPosts] = useState<Post[]>([]);
  const isMe = memberId === currentUser.id;

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [roleInput, setRoleInput] = useState(currentUser.role);
  const [bioInput, setBioInput] = useState(currentUser.bio);
  const [avatarInput, setAvatarInput] = useState(currentUser.avatar);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = async () => {
    try {
      const [u, allPosts] = await Promise.all([
        ApiService.getUser(memberId),
        ApiService.getPosts(),
      ]);
      if (u) {
        setMember(u);
        if (isMe) {
          setNameInput(u.name);
          setRoleInput(u.role);
          setBioInput(u.bio);
          setAvatarInput(u.avatar);
        }
      }
      setMemberPosts(allPosts.filter((p) => p.authorId === memberId));
    } catch {
      // noop
    }
  };

  useEffect(() => {
    loadProfile();
  }, [memberId]);

  const totalLikesReceived = memberPosts.reduce(
    (acc: number, p: Post) => acc + p.likes.length,
    0
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || isSaving) return;

    setIsSaving(true);
    const updated = await ApiService.updateProfile(currentUser.id, {
      name: nameInput.trim(),
      role: roleInput.trim(),
      avatar: avatarInput.trim(),
      bio: bioInput.trim(),
    });

    if (updated) {
      setMember(updated);
      setIsEditing(false);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 3500);
      onPostUpdated();
    }
    setIsSaving(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        setAvatarInput(uploadEvent.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Top navigation back */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar ao feed</span>
      </button>

      {/* Profile Card Banner */}
      <div className="bg-[#0b1222] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {/* Cover ambient gradient */}
        <div className="h-28 bg-gradient-to-r from-blue-900/40 via-indigo-950/60 to-slate-900 border-b border-slate-800/60 relative">
          <div className="absolute top-3 right-3 text-[11px] font-semibold text-blue-400 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-blue-500/20 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>KZYRO Team</span>
          </div>

          <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 flex items-center gap-1 bg-[#0b1222]/80 px-2 py-0.5 rounded-md border border-slate-800">
            <Database className="w-3 h-3 text-emerald-400" />
            <span>Sincronizado na Nuvem</span>
          </div>
        </div>

        <div className="px-5 sm:px-6 pb-6 pt-0 relative">
          {/* Avatar and Main Action */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex items-end gap-4">
              <div className="relative group">
                <img
                  src={isEditing ? avatarInput : member.avatar}
                  alt={member.name}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-[#0b1222] shadow-xl bg-slate-800"
                />

                {isMe && isEditing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white text-[10px] font-medium border-4 border-[#0b1222] cursor-pointer"
                  >
                    <Camera className="w-5 h-5 mb-1 text-blue-400" />
                    <span>Trocar foto</span>
                  </button>
                )}
              </div>

              <div className="pb-1">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  {member.name}
                  {isMe && (
                    <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      Você
                    </span>
                  )}
                </h1>
                <div className="text-xs font-semibold text-blue-400 mt-0.5">
                  {member.role} &middot; KZYRO
                </div>
                <div className="text-[11px] text-slate-500">{member.email}</div>
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="flex items-center gap-2">
              {isMe ? (
                !isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer border border-slate-700"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Editar perfil e foto</span>
                  </button>
                ) : null
              ) : (
                <button
                  type="button"
                  onClick={() => onStartChatWithMember && onStartChatWithMember(member.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-blue-600/20"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Conversa Privada</span>
                </button>
              )}
            </div>
          </div>

          {/* Success Notice */}
          {saveSuccessNotice && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Perfil e foto atualizados com sucesso no servidor e Supabase!</span>
            </div>
          )}

          {/* Editable Form */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="mt-4 p-4 rounded-xl bg-[#070b14] border border-slate-800 space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome de usuário
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  placeholder="Seu nome"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Função / Cargo
                </label>
                <input
                  type="text"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  placeholder="ex: Desenvolvimento, Prospecção..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Foto de perfil
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-medium text-slate-200 flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    Enviar foto do dispositivo
                  </button>
                  <span className="text-[11px] text-slate-500">ou escolha abaixo:</span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarInput(preset)}
                      className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-transform hover:scale-105 cursor-pointer ${
                        avatarInput === preset ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-800'
                      }`}
                    >
                      <img src={preset} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descrição (Bio)
                </label>
                <textarea
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0b1222] border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="Escreva sua função e foco na KZYRO..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !nameInput.trim()}
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-3">
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
                {member.bio || 'Membro da equipe KZYRO.'}
              </p>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Publicações</span>
              </div>
              <div className="text-lg font-bold text-white">{memberPosts.length}</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Curtidas recebidas</span>
              </div>
              <div className="text-lg font-bold text-white">{totalLikesReceived}</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Membro desde</span>
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1">
                {member.joinedDate}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Member's Publications Feed */}
      <div>
        <h2 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
          <span>Publicações de {member.name} ({memberPosts.length})</span>
        </h2>

        {memberPosts.length === 0 ? (
          <div className="text-center py-12 px-4 bg-[#0b1222] border border-slate-800 rounded-2xl text-slate-400 text-xs">
            {member.name} ainda não publicou nada no feed.
          </div>
        ) : (
          <div className="space-y-4">
            {memberPosts.map((post: Post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onPostUpdated={() => {
                  loadProfile();
                  onPostUpdated();
                }}
                onViewMemberProfile={onViewMemberProfile}
                onOpenImage={onOpenImage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
