import { ImageResponse } from "next/server";

const iconLabel = "OP";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/svg+xml";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          backgroundColor: "#0f172a",
          color: "#f8fafc",
          display: "flex",
          fontFamily: '"Inter", "Segoe UI", sans-serif',
          fontSize: 18,
          fontWeight: 700,
          height: "100%",
          justifyContent: "center",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          width: "100%",
        }}
      >
        {iconLabel}
      </div>
    ),
    {
      ...size,
    },
  );
}
