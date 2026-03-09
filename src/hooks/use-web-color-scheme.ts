import { useTheme } from '@/context/ThemeContext';

export function useWebColorScheme() {
  const { webTheme } = useTheme();
  return webTheme;
}