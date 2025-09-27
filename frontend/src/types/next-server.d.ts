declare module "next/server" {
  import type { ReactElement } from "react";

  interface ImageResponseInit {
    width?: number;
    height?: number;
    emojis?:
      | "twemoji"
      | "noto"
      | "fluent"
      | "blobmoji"
      | "openmoji"
      | "emojione"
      | "noto-v1"
      | "joypixels";
    fonts?: Array<{
      name: string;
      data: ArrayBuffer;
      style?: string;
      weight?: number;
    }>;
    contentType?: string;
  }

  export class ImageResponse {
    constructor(element: ReactElement, init?: ImageResponseInit);
  }
}
