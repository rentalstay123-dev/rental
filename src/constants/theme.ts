/**
 * Luvora - Official Warm Ivory & Coffee Brown Color Theme
 * Minimal, elegant, premium, clean, and professional design system.
 */

export const Palette = {
  // Brand Colors
  primary: '#8B5E34', // Coffee Brown (Primary buttons, active navigation, highlights)
  secondary: '#C1976B', // Caramel (Secondary buttons, accents, charts, progress indicators)
  background: '#FAF6F1', // Warm Ivory (Main application background)
  surface: '#FFFFFF', // Pure White (Cards, modals, containers)
  border: '#E8DED5', // Soft Beige (Borders and dividers)
  text: '#2E2722', // Dark Coffee (Headings and primary text)
  textSecondary: '#786E63', // Secondary Text (Descriptions and labels)
  textMuted: '#9B9085', // Placeholder / lighter label

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
      bg: '#EEE9E2',
      text: '#62594F',
    },
  },
} as const;

export default Palette;
