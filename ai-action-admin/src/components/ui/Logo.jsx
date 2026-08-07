import React from 'react';

export const Logo = ({ size = 'md', showText = true }) => {
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg' };

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`${sizes[size]} rounded-xl bg-brand-500 text-white font-extrabold flex items-center justify-center shadow-lg shadow-brand-500/30 shrink-0`}>
        AI
      </div>
      {showText && (
        <div className="min-w-0">
          <p className="font-extrabold text-slate-800 leading-tight truncate">AI in Action</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-600">Admin Panel</p>
        </div>
      )}
    </div>
  );
};

export default Logo;
