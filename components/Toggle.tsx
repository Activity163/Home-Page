import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, icon, size = 'md' }) => {
  const track = size === 'sm'
    ? 'w-9 h-5 after:h-4 after:w-4'
    : 'w-11 h-6 after:h-5 after:w-5';

  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <div className="flex items-center gap-3 text-gray-700 dark:text-zinc-200">
        {icon}
        <span className={size === 'sm' ? 'text-sm' : ''}>{label}</span>
      </div>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600 ${track}`}></div>
      </div>
    </label>
  );
};
