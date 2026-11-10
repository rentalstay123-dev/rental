/**
 * Luvora - Official Indigo & Lavender Design System
 * Clean white canvas with #4B0082 primary brand accents and #F3E8FA icon containers.
 */

import { Platform } from 'react-native';

export const Palette = {
  // Brand Colors
  primary: '#4B0082', // Deep Indigo (Headers, primary/logout buttons, icons, chevrons, active nav)
  onPrimary: '#FFFFFF', // High-contrast white button text & icons on primary fill
  accentText: '#4B0082', // Brand accent text on light/lavender surfaces
  secondary: '#8E54C7', // Soft Indigo-Purple for secondary chart segments
  iconBg: '#F3E8FA', // Lavender Mist (Icon backgrounds)
  tint: '#FAF6FE', // Ultra-light lavender surface for expanded panels & subtle banners
  background: '#FFFFFF', // Pure White (Main application background)
  surface: '#FFFFFF', // Pure White (Cards, modals, containers)
  border: '#E6DFEC', // Soft Lavender-Neutral (Borders and dividers)
  divider: '#ECE7F1', // Hairline row separator
  backdrop: 'rgba(23, 18, 29, 0.45)', // Modal overlay scrim matching primary text
  text: '#17121D', // Deep Plum-Black (Primary text and headings)
  textSecondary: '#68616F', // Muted Slate-Plum (Secondary text and descriptions)
  textMuted: '#8D8695', // Placeholder / muted helper text

  // Status Colors (Dedicated functional palette)
  status: {
    paid: {
      bg: '#E5F0DF',
      text: '#315B32',
    },
    completed: {
      bg: '#E5F0DF',
      text: '#315B32',
    },
    active: {
      bg: '#E5F0DF',
      text: '#315B32',
    },
    occupied: {
      bg: '#E5F0DF',
      text: '#315B32',
    },
    pending: {
      bg: '#FCE9C9',
      text: '#80500D',
    },
    due: {
      bg: '#FCE9C9',
      text: '#80500D',
    },
    overdue: {
      bg: '#F9DEDC',
      text: '#A52A25',
    },
    vacant: {
      bg: '#F3EFF7',
      text: '#68616F',
    },
  },
} as const;

export const Typography = {
  fontFamily: {
    serif: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia, serif',
    }),
    sans: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }),
  },
  fontSize: {
    caption: 12, // Badges, helper chips, nav labels, micro copy
    xs: 12,      // Badges, tags, chips, small secondary text
    sm: 13,      // Form field labels, card subtext, secondary descriptions
    base: 14,    // Standard body copy, inputs, table cells, button text
    md: 16,      // Card titles, room numbers, prominent list rows
    lg: 20,      // Section titles, modal headers, subheaders
    xl: 26,      // Metric values, modal titles
    xxl: 26,     // Primary page titles (Rooms, Rent, Settings, etc.)
    hero: 34,    // Large metric numbers (e.g. ₹85,000), brand logo
  },
  iconSize: {
    sm: 16,
    base: 20,
    lg: 26,
  },
  lineHeight: {
    caption: 16,
    xs: 16,
    sm: 18,
    base: 20,
    md: 22,
    lg: 26,
    xl: 32,
    xxl: 32,
    hero: 40,
  },
} as const;

export const Radius = {
  xs: 4,     // Progress bars, handles, small chart bars
  sm: 10,    // Form inputs, action buttons, alert boxes, chips
  md: 16,    // Cards, list containers, modals, bottom sheets
  pill: 999, // Pill buttons, filter chips, bottom nav bar & tabs, circular avatars & buttons
} as const;

export default Palette;
