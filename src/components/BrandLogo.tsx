interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export function BrandLogo({ size = 'md', showSubtitle = false }: BrandLogoProps) {
  const iconSize = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-xl' : 'w-9 h-9 text-base';
  const titleSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className="flex items-center gap-3 select-none">
      {/* Sleek geometric K monogram */}
      <div
        className={`${iconSize} rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-900 flex items-center justify-center font-black tracking-wider text-white shadow-lg shadow-blue-900/40 ring-1 ring-white/15 shrink-0`}
      >
        K
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`${titleSize} font-extrabold tracking-wider text-white font-sans`}>
            KZYRO
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-400/90 ml-0.5">
            Community
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[11px] font-medium text-slate-400 mt-1">
            Rede interna exclusiva
          </span>
        )}
      </div>
    </div>
  );
}
