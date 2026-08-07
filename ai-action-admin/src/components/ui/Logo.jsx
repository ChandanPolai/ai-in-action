import React from 'react';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`;

export const Logo = ({ size = 'md', showText = true, subtitle = 'Admin Panel' }) => {
  const sizes = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36'
  };

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <img
        src={LOGO_SRC}
        alt="AI in Action"
        className={`${sizes[size] || sizes.md} rounded-xl object-cover shrink-0 shadow-md ring-1 ring-slate-200/80`}
      />
      {showText && (
        <div className="min-w-0">
          <p className="font-extrabold text-slate-800 leading-tight truncate">AI in Action</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-600">{subtitle}</p>
        </div>
      )}
    </div>
  );
};

export default Logo;
