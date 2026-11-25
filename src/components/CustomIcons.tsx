import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { Palette, Typography } from '../constants/theme';

export function RoomsBedIcon({
  size = 20,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0.5 3.5 22.5 19" fill="none">
      {/* Headboard */}
      <Path
        d="M3.4 14V9.2a1.8 1.8 0 0 1 1.8-1.8h7.4a1.8 1.8 0 0 1 1.8 1.8V14"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left Pillow */}
      <Rect
        x="5.2"
        y="11.2"
        width="3.2"
        height="2.8"
        rx="0.9"
        stroke={color}
        strokeWidth={1.3}
      />
      {/* Right Pillow */}
      <Rect
        x="9.6"
        y="11.2"
        width="3.2"
        height="2.8"
        rx="0.9"
        stroke={color}
        strokeWidth={1.3}
      />
      {/* Mattress / bed body */}
      <Rect
        x="1.5"
        y="14"
        width="15"
        height="5.2"
        rx="1.6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {/* Bed legs */}
      <Path
        d="M2.8 19.2v2M15.2 19.2v2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Lamp shade */}
      <Path
        d="M18.6 4.8h2.8l1.2 4.8h-5.2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {/* Lamp pole */}
      <Path
        d="M20 9.6v11.6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Lamp base */}
      <Path
        d="M18 21.2h4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ReportsBarIcon({
  size = Typography.iconSize.footer,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x="2.5" y="12" width="3.2" height="6.5" rx="1.6" fill={color} />
      <Rect x="8.4" y="6.5" width="3.2" height="12" rx="1.6" fill={color} />
      <Rect x="14.3" y="1.5" width="3.2" height="17" rx="1.6" fill={color} />
    </Svg>
  );
}

export function AccountsWalletIcon({
  size = Typography.iconSize.footer,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Top flap */}
      <Path
        d="M6.5 6.5L15.3 2.6c0.9-0.4 2 0.1 2.3 1 .1.3.1.6.1.9v2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Wallet Body */}
      <Rect
        x="2"
        y="6.5"
        width="20"
        height="15"
        rx="3.5"
        stroke={color}
        strokeWidth={1.8}
      />
      {/* Top and bottom subtle stitching lines */}
      <Path
        d="M5.5 9.2h10"
        stroke={color}
        strokeWidth={0.9}
        strokeDasharray="1.5,1.5"
        opacity={0.65}
      />
      <Path
        d="M5.5 18.8h13"
        stroke={color}
        strokeWidth={0.9}
        strokeDasharray="1.5,1.5"
        opacity={0.65}
      />
      {/* Clasp / Latch */}
      <Path
        d="M22 10.5h-5a2.5 2.5 0 0 0-2.5 2.5v0a2.5 2.5 0 0 0 2.5 2.5H22"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Clasp snap dot */}
      <Circle cx="17.2" cy="13" r="1.1" fill={color} />
    </Svg>
  );
}

export function PaySalaryIcon({
  size = 18,
  color = Palette.onPrimary,
  cutoutColor = Palette.primary,
}: {
  size?: number;
  color?: string;
  cutoutColor?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 25 24" fill="none">
      {/* Left person */}
      <Circle cx="4.8" cy="4.8" r="1.9" fill={color} />
      <Path
        d="M1.2 9.8 C1.2 7.2 2.7 6.6 4.8 6.6 C5.7 6.6 6.3 6.9 6.6 7.4 L6.6 9.8 Z"
        fill={color}
      />

      {/* Right person */}
      <Circle cx="16.8" cy="4.8" r="1.9" fill={color} />
      <Path
        d="M15.0 9.8 L15.0 7.4 C15.3 6.9 15.9 6.6 16.8 6.6 C18.9 6.6 20.4 7.2 20.4 9.8 Z"
        fill={color}
      />

      {/* Center person (larger) */}
      <Circle cx="10.8" cy="3.6" r="2.5" fill={color} />
      <Path
        d="M7.4 9.8 C7.4 6.7 9.0 5.9 10.8 5.9 C12.6 5.9 14.2 6.7 14.2 9.8 Z"
        fill={color}
      />

      {/* Third bill (furthest back) */}
      <Path
        d="M22.8 12.5 v8.5 a2 2 0 0 1 -2 2 H4.2"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Second bill (middle) */}
      <Path
        d="M21.2 11.2 v8.5 a2 2 0 0 1 -2 2 H2.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Front bill outer white shape */}
      <Rect x="0.8" y="9.8" width="18.8" height="11.4" rx="2.2" fill={color} />

      {/* Front bill inner cutout area with scalloped corners */}
      <Path
        d="M3.2 10.8 H17.2 A1.6 1.6 0 0 0 18.6 12.2 V18.8 A1.6 1.6 0 0 0 17.2 20.2 H3.2 A1.6 1.6 0 0 0 1.8 18.8 V12.2 A1.6 1.6 0 0 0 3.2 10.8 Z"
        fill={cutoutColor}
      />

      {/* Center white circle */}
      <Circle cx="10.2" cy="15.5" r="3.6" fill={color} />

      {/* Rupee Symbol inside center circle */}
      <Path
        d="M8.7 13.9 h3.0"
        stroke={cutoutColor}
        strokeWidth={0.8}
        strokeLinecap="round"
      />
      <Path
        d="M8.7 14.9 h2.7"
        stroke={cutoutColor}
        strokeWidth={0.8}
        strokeLinecap="round"
      />
      <Path
        d="M9.5 13.9 v2.3 c0.8 0 1.6 -0.3 1.6 -1.1 c0 -0.8 -0.8 -1.2 -1.6 -1.2"
        stroke={cutoutColor}
        strokeWidth={0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M9.6 16.2 l1.9 1.5"
        stroke={cutoutColor}
        strokeWidth={0.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export const StaffSalaryPayoutIcon = PaySalaryIcon;
