/**
 * Luvora - Official Indigo & Lavender Design System
 * Clean white canvas with #4B0082 primary brand accents and #F3E8FA icon containers.
 */

import { Platform } from 'react-native';

export const Palette = {
  // Brand Colors
  primary: '#4B0082', // Deep Indigo (Headers, primary/logout buttons, icons, chevrons, active nav)
  onPrimary: '#F8F5FC', // High-contrast soft white/lavender button text & icons on primary fill
  accentText: '#4B0082', // Brand accent text on light/lavender surfaces
  secondary: '#8E54C7', // Soft Indigo-Purple for secondary chart segments
  iconBg: '#F3E8FA', // Lavender Mist (Icon backgrounds)
  tint: '#FAF6FE', // Ultra-light lavender surface for expanded panels & subtle banners
  background: '#F8F5FC', // Soft Lavender-White (Main application background)
  surface: '#F8F5FC', // Soft Lavender-White (Cards, modals, containers)
  border: '#E6DFEC', // Soft Lavender-Neutral (Borders and dividers)
  divider: '#ECE7F1', // Hairline row separator
  backdrop: 'rgba(23, 18, 29, 0.45)', // Modal overlay scrim matching primary text
  text: '#000000', // Pure Black (Primary text and headings)
  textSecondary: '#000000', // Black (Secondary text, descriptions, labels)
  textMuted: '#555555', // Muted helper text

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
      text: '#000000',
    },
  },
} as const;

export const Typography = {
  fontFamily: {
    serif: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }),
    sans: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }),
  },
  fontSize: {
    caption: 10, // Badges, helper chips, nav labels, micro copy
    xs: 10,      // Badges, tags, chips, small secondary text
    sm: 12,      // Form field labels, card subtext, secondary descriptions
    viewAll: 12, // "View All" action links and section header actions
    base: 14,    // Standard body copy, inputs, table cells, button text
    md: 15,     // Card titles, room numbers, prominent list rows
    lg: 19,      // Section titles, modal headers, subheaders
    xl: 20,      // Metric values, modal titles
    xxl: 24,     // Primary page titles (Rooms, Rent, Settings, etc.)
    hero: 28,    // Large metric numbers (e.g. ₹85,000), brand logo
  },
  iconSize: {
    sm: 15,
    base: 18,
    header: 18, // Header icons (back chevron, hamburger menu, notification bell)
    footer: 17, // Bottom navigation bar tab icons
    lg: 26,
  },
  lineHeight: {
    caption: 16,
    xs: 16,
    sm: 18,
    viewAll: 18,
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
  sm: 5,     // Form inputs, action buttons, alert boxes, chips
  md: 8,     // Cards, list containers, modals, bottom sheets
  pill: 999, // Pill buttons, filter chips, bottom nav bar & tabs, circular avatars & buttons
} as const;

export default Palette;
