import type { Language } from '../types';

export interface LunarLabels {
  lunarDate: string;
}

/**
 * Chinese lunar calendar formatting, kept in its own module so `lunar-typescript`
 * (~1.3 MB unpacked, the single largest dependency) can be loaded on demand.
 *
 * Only Chinese needs the lunar line, and only when the setting is on, so
 * English users and users who disabled it never download it at all.
 */
export const getLunarLabels = async (date: Date): Promise<LunarLabels> => {
  const { Solar } = await import('lunar-typescript');
  const lunar = Solar.fromDate(date).getLunar();
  return {
    lunarDate: `${lunar.getYearInGanZhi()}年（${lunar.getYearShengXiao()}年）${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
  };
};

export const needsLunar = (language: Language, showLunar: boolean): boolean =>
  showLunar && language === 'zh';
