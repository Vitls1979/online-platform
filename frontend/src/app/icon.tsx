import { ImageResponse } from "next/server";

const iconLabel = "OP";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/svg+xml";

export default function Icon() {
  return new ImageResponse(
    (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width={size.width}
        height={size.height}
      >
        <rect width="64" height="64" rx="12" fill="#0f172a" />
        <text
          x="50%"
          y="50%"
          fill="#f8fafc"
          fontFamily="'Inter', 'Segoe UI', sans-serif"
          fontSize="28"
          fontWeight="700"
          letterSpacing="0.18em"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          {iconLabel}
        </text>
      </svg>
    ),
    {
      ...size,
    }
  );
}
