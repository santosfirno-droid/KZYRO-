import { X } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ImageLightbox({ imageUrl, onClose }: ImageLightboxProps) {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white bg-slate-800/80 rounded-full transition-colors cursor-pointer"
        aria-label="Fechar imagem"
      >
        <X className="w-6 h-6" />
      </button>
      <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-slate-700/50 shadow-2xl">
        <img
          src={imageUrl}
          alt="Publicação em alta resolução"
          className="w-full h-full object-contain max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
