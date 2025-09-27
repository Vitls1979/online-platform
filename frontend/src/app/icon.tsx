import { ImageResponse } from "next/server";

const size = 64;

export const contentType = "image/svg+xml";

export const width = size;
export const height = size;

const bgColor = "#0f172a";
const accentColor = "#38bdf8";

export default function Icon() {
  return new ImageResponse(
    (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 64 64"
      >
        <rect width="64" height="64" rx="14" fill={bgColor} />
        <rect
          x="10"
          y="10"
          width="44"
          height="44"
          rx="12"
          fill="none"
          stroke={accentColor}
          strokeWidth="4"
        />
        <text
          x="50%"
          y="52%"
          fill={accentColor}
          fontFamily="'Inter', 'Segoe UI', sans-serif"
          fontSize="26"
          fontWeight="700"
          textAnchor="middle"
        >
          OP
        </text>
      </svg>
    ),
    {
      width: size,
      height: size,
    }
  );
}
