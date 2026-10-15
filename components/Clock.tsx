import React, { useEffect, useMemo, useState } from 'react';
import { useLocale } from '../contexts/locale-context';
import { getLunarLabels, needsLunar } from '../lib/lunar';

interface ClockProps {
  name?: string;
  hasCustomWallpaper: boolean;
  showLunar: boolean;
  showSeconds: boolean;
}

/**
 * Delay until the next wall-clock boundary, so the clock stays accurate
 * without ticking once per second.
 */
const msUntilNextMinute = (now: Date): number => {
  const next = new Date(now);
  next.setSeconds(60, 0);
  return Math.max(250, next.getTime() - now.getTime());
};

export const Clock: React.FC<ClockProps> = ({ name, hasCustomWallpaper, showLunar, showSeconds }) => {
  const { t, language } = useLocale();
  const [time, setTime] = useState(() => new Date());
  const [lunarDate, setLunarDate] = useState('');

  // Tick on the boundary. Previously this ran every second regardless of the
  // `showSeconds` setting, so the component re-rendered 59 times a minute
  // while displaying nothing new.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timer = setTimeout(
        () => {
          setTime(new Date());
          schedule();
        },
        showSeconds ? 1000 : msUntilNextMinute(new Date()),
      );
    };

    schedule();
    return () => clearTimeout(timer);
  }, [showSeconds]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: false,
    });

  const westernDate = useMemo(
    () =>
      time.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }),
    // Only the calendar day and the locale affect this value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [time.getFullYear(), time.getMonth(), time.getDate(), language],
  );

  // Load the lunar library only when the line will actually be shown.
  useEffect(() => {
    if (!needsLunar(language, showLunar)) {
      setLunarDate('');
      return;
    }

    let cancelled = false;
    getLunarLabels(time)
      .then((labels) => {
        if (!cancelled) setLunarDate(labels.lunarDate);
      })
      .catch(() => {
        if (!cancelled) setLunarDate('');
      });

    return () => {
      cancelled = true;
    };
    // Recompute once per day, not per tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time.getFullYear(), time.getMonth(), time.getDate(), language, showLunar]);

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 5) return t.goodEvening;
    if (hour < 12) return t.goodMorning;
    if (hour < 18) return t.goodAfternoon;
    return t.goodEvening;
  };

  const titleClass = hasCustomWallpaper
    ? 'text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]'
    : 'text-gray-800 dark:text-zinc-50';

  const textClass = hasCustomWallpaper
    ? 'text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
    : 'text-gray-600 dark:text-zinc-400';

  return (
    <div className="flex flex-col items-center mb-8 anim-fade-down select-none">
      <h2
        className={`text-7xl md:text-8xl font-[200] tracking-tighter mb-2 tabular-nums transition-colors duration-500 ${titleClass}`}
      >
        {formatTime(time)}
      </h2>

      <div className={`flex flex-col items-center gap-1 transition-colors duration-500 ${textClass}`}>
        <p className="text-lg md:text-xl font-light tracking-wide opacity-95">{westernDate}</p>
        {lunarDate && <p className="text-sm font-light tracking-wide opacity-80">{lunarDate}</p>}

        <p className="text-base font-normal opacity-80 mt-1">
          {getGreeting()}
          {name ? `, ${name}` : ''}
        </p>
      </div>
    </div>
  );
};
