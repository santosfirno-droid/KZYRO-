import React, { useState, useRef } from 'react';
import { User } from '../types';
import { ApiService } from '../services/api';
import { X, Image as ImageIcon, Sparkles, Upload, Check } from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onPostCreated: () => void;
}

const INSPIRATION_SUGGESTIONS = [
  'Fechamos uma reunião com um possível cliente.',
  'Olha essa ideia nova para a KZYRO.',
  'Primeiro cliente chegando?',
  'Acabei de terminar um protótipo.',
  'Ajustes finais implementados com sucesso!',
];

const PRESET_IMAGES = [
  {
    name: 'Protótipo UI',
    url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=1000&auto=format&fit=crop&q=80',
  },
  {
    name: 'Reunião & Negociação',
    url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1000&auto=format&fit=crop&q=80',
  },
  {
    name: 'Código & Arquitetura',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1000&auto=format&fit=crop&q=80',
  },
  {
    name: 'Resultados & Métricas',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000&auto=format&fit=crop&q=80',
  },
];

export function CreatePostModal({
  isOpen,
  onClose,
  currentUser,
  onPostCreated,
}: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    await ApiService.createPost(currentUser.id, content, imageUrl);
    setContent('');
    setImageUrl('');
    setShowImageOptions(false);
    setIsSubmitting(false);
    onPostCreated();
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        setImageUrl(uploadEvent.target.result as string);
        setShowImageOptions(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-lg bg-[#0b1222] border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover border border-slate-700"
            />
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                {currentUser.name}
                <span className="text-[11px] font-normal text-slate-400">
                  ({currentUser.role})
                </span>
              </div>
              <div className="text-[11px] text-blue-400">Publicando no Feed Único da KZYRO</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {/* Textarea */}
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="O que está acontecendo na KZYRO hoje? Compartilhe um avanço, validação ou ideia com toda a equipe..."
              rows={4}
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none resize-none leading-relaxed"
            />

            {/* Inspiration quick tags */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Sugestões rápidas de publicação:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INSPIRATION_SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setContent(suggestion)}
                    className="text-[11px] py-1 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    &ldquo;{suggestion}&rdquo;
                  </button>
                ))}
              </div>
            </div>

            {/* Image Preview if present */}
            {imageUrl && (
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <img
                  src={imageUrl}
                  alt="Pré-visualização"
                  className="w-full max-h-56 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Image Picker Dropdown / Selector */}
            {showImageOptions && (
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Anexar foto ou imagem
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowImageOptions(false)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Fechar
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    Enviar do dispositivo
                  </button>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5">
                    Ou escolha uma imagem KZYRO pronta:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setImageUrl(preset.url);
                          setShowImageOptions(false);
                        }}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer group"
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-10 h-10 rounded-md object-cover"
                        />
                        <span className="text-[11px] font-medium text-slate-300 group-hover:text-white truncate">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowImageOptions(!showImageOptions)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                imageUrl
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-blue-400" />
              <span>{imageUrl ? 'Imagem anexada' : 'Adicionar imagem'}</span>
              {imageUrl && <Check className="w-3.5 h-3.5 text-blue-400 ml-1" />}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
