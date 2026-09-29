
import React, { useState, useEffect, useMemo } from 'react';
import { TranslationType } from '../translations';
import { Language } from '../types';
import { Solar } from 'lunar-typescript';

interface ClockProps {
  name?: string;
  t: TranslationType;
  hasCustomWallpaper: boolean;
  language: Language;
  showLunar: boolean;
  showSeconds: boolean;
}

export const Clock: React.FC<ClockProps> = ({ name, t, hasCustomWallpaper, language, showLunar, showSeconds }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();

    const westernDate = date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    const lunarDate = language === 'zh' ? `${lunar.getYearInGanZhi()}年（${lunar.getYearShengXiao()}年）${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}` : '';

    return {
      westernDate,
      lunarDate
    };
  };

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 5) return t.goodEvening;
    if (hour < 12) return t.goodMorning;
    if (hour < 18) return t.goodAfternoon;
    return t.goodEvening;
  };

  const titleClass = hasCustomWallpaper
    ? "text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
    : "text-gray-800 dark:text-zinc-50";

  const textClass = hasCustomWallpaper
    ? "text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
    : "text-gray-500 dark:text-zinc-400";

  const { westernDate, lunarDate } = useMemo(
    () => formatDate(time),
    // Recalculate only when the day or language changes, not every second
    [time.getFullYear(), time.getMonth(), time.getDate(), language]
  );

  return (
    <div className="flex flex-col items-center mb-8 anim-fade-down select-none">
      <h2 className={`text-7xl md:text-8xl font-[200] tracking-tighter mb-2 tabular-nums transition-colors duration-500 ${titleClass}`}>
        {formatTime(time)}
      </h2>
      
      <div className={`flex flex-col items-center gap-1 transition-colors duration-500 ${textClass}`}>
        <p className="text-lg md:text-xl font-light tracking-wide opacity-95">
          {westernDate}
        </p>
        {showLunar && lunarDate && (
          <p className="text-sm font-light tracking-wide opacity-80">
            {lunarDate}
          </p>
        )}
        
        <p className="text-base font-normal opacity-80 mt-1">
           {getGreeting()}{name ? `, ${name}` : ''}
        </p>
      </div>
    </div>
  );
};
