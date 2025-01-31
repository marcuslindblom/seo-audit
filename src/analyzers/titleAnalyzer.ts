import { TITLE_SEPARATORS } from '../constants';

export interface TitleAnalysis {
  hasSeparator: boolean;
  segments: string[];
  separator: string | null;
}

export function analyzeTitleFormat(title: string): TitleAnalysis {
  const usedSeparator = TITLE_SEPARATORS.find(sep => title.includes(sep));

  if (!usedSeparator) {
    return {
      hasSeparator: false,
      segments: [title],
      separator: null
    };
  }

  const segments = title.split(usedSeparator).map(s => s.trim());
  return {
    hasSeparator: true,
    segments,
    separator: usedSeparator
  };
}