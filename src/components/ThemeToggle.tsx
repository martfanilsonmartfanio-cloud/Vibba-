import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { VibbaTheme } from '../hooks/useTheme';

interface ThemeToggleProps {
  theme: VibbaTheme;
  onToggle: () => void;
  variant?: 'sidebar' | 'drawer' | 'popover';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  variant = 'sidebar',
}) => {
  const isLight = theme === 'light';

  if (variant === 'drawer') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isLight}
        aria-label={isLight ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
        onClick={onToggle}
        className="w-full px-3.5 py-3 rounded-xl flex items-center justify-between gap-3 text-sm font-medium bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] transition-colors"
      >
        <span className="flex items-center gap-3 min-w-0">
          {isLight ? (
            <Sun size={18} className="text-[#F7B928] shrink-0" />
          ) : (
            <Moon size={18} className="text-[#4599FF] shrink-0" />
          )}
          <span className="truncate">
            {isLight ? 'Tema Claro' : 'Tema Escuro'}
          </span>
        </span>
        <span
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            isLight ? 'bg-[#1877F2]' : 'bg-[#65676B]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isLight ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </span>
      </button>
    );
  }

  if (variant === 'popover') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isLight}
        aria-label={isLight ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
        onClick={onToggle}
        className="w-full px-3 py-2.5 rounded-xl hover:bg-[#3A3B3C] text-xs font-semibold text-[#E4E6EB] flex items-center justify-between gap-2.5 transition-colors"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {isLight ? (
            <Sun size={16} className="text-[#F7B928] shrink-0" />
          ) : (
            <Moon size={16} className="text-[#B0B3B8] shrink-0" />
          )}
          <span className="truncate">
            {isLight ? 'Modo Claro' : 'Modo Escuro'}
          </span>
        </span>
        <span
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            isLight ? 'bg-[#1877F2]' : 'bg-[#65676B]'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              isLight ? 'translate-x-4.5' : 'translate-x-1'
            }`}
          />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label={isLight ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
      onClick={onToggle}
      className="w-full px-2.5 py-2.5 rounded-xl hover:bg-[#3A3B3C] flex items-center justify-between gap-2.5 text-sm font-medium text-[#E4E6EB] transition-colors"
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className="w-8 h-8 rounded-full bg-[#242526] border border-[#3E4042] flex items-center justify-center shrink-0">
          {isLight ? (
            <Sun size={17} className="text-[#F7B928]" />
          ) : (
            <Moon size={17} className="text-[#4599FF]" />
          )}
        </span>
        <span className="truncate">
          {isLight ? 'Modo Claro' : 'Modo Escuro'}
        </span>
      </span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          isLight ? 'bg-[#1877F2]' : 'bg-[#65676B]'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            isLight ? 'translate-x-4.5' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  );
};
