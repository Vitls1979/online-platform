import { ImageResponse } from "next/server";

const SIZE = 64;

export const size = {
  width: SIZE,
  height: SIZE,
};

export const contentType = "image/svg+xml";

export default function Icon() {
  return new ImageResponse(
    (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width={SIZE}
        height={SIZE}
      >
        <defs>
          <linearGradient id="accent" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="#0f172a" />
        <rect
          x="8"
          y="8"
          width="48"
          height="48"
          rx="10"
          fill="url(#accent)"
          opacity="0.9"
        />
        <text
          x="50%"
          y="52%"
          fill="#f8fafc"
          fontFamily="'Inter', 'Segoe UI', sans-serif"
          fontSize="26"
          fontWeight="700"
          textAnchor="middle"
        >
          OP
        </text>
      </svg>
    ),
    size
  );
}
