/**
 * Sympleo App Design System Colors
 * Theme: Modern Glassmorphism (Dark & Light)
 */

const tintColorLight = '#004D40';
const tintColorDark = '#4ADE80';

export const Colors = {
  // Brand Colors
  primary: '#10B981', // Emerald 500 - Fresh Green
  deepRed: '#D4AF37', // REPLACED: Warm Gold (ehemals Deep Red)
  primaryDark: '#047857', // Emerald 700
  secondary: '#059669', // Emerald 600 - for gradients (More Green now)
  accent: '#34D399',    // Emerald 400 - for highlights
  
  // Gradients
  gradients: {
    primary: ['#10B981', '#065F46'], // Green to Deep Green (Deep Forest feel)
    secondary: ['#34D399', '#059669'], // Light Green to Dark Green
    glass: ['rgba(6, 78, 59, 0.6)', 'rgba(6, 78, 59, 0.3)'], // Deep Green Glass
    glassLight: ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.6)'],
  },

  // Dark Mode (Ultra Deep Green - Almost Black)
  dark: {
    text: '#ECFDF5',       // Mint Cream
    textSecondary: '#6EE7B7', // Soft Mint Green
    background: '#000a08', // Ultra Dark Green (Homogen)
    tint: tintColorDark,
    icon: '#34D399',
    tabIconDefault: '#065F46',
    tabIconSelected: tintColorDark,
    surface: '#000a08', // Consistent background
    border: 'rgba(52, 211, 153, 0.05)', // Even more subtle
    glassBorder: 'rgba(16, 185, 129, 0.05)',
    inputBackground: 'rgba(2, 44, 34, 0.2)',
    tabBarBackground: '#000a08', // Angepasst an Hintergrund
  },

  // Light Mode (Elegant Beige Theme)
  light: {
    text: '#2D2A26',       // Warm Dark Grey
    textSecondary: '#5D5A56', // Medium Warm Grey
    background: '#F9F8F6', // Global Beige Background
    tint: '#A48968',       // Elegant Bronze/Camel Accent
    icon: '#8C7B68',
    tabIconDefault: '#D4C5B0',
    tabIconSelected: '#A48968',
    surface: 'rgba(255, 255, 255, 0.8)',
    border: 'rgba(164, 137, 104, 0.2)', // Subtle Bronze Border
    glassBorder: 'rgba(255,255,255,0.9)',
    inputBackground: '#DEDBD3', // NOCH stärkeres Beige (User Request)
    inputPlaceholder: '#047857', // Dunkles Grün
    insightsBanner: 'rgba(2, 44, 34, 0.95)',
    gold: '#D4AF37', // Gold für Icons
    micRing: '#10B981', // Zurück zu Grün für Ring (User Request)
  },
  
  // Semantic
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  micPulseGreen: '#10B981', // Grüner Pulse Ring (User Request: Hell & Dunkel gleich)
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};