import path from "path";
import { promises as fs } from "fs";
import sharp from "sharp";
import pngToIco from "png-to-ico";

async function generateFavicon() {
  const projectRoot = path.resolve(__dirname, "..");
  const publicDir = path.join(projectRoot, "public");
  const sourceSvgPath = path.join(publicDir, "favicon-source.svg");
  const outputPath = path.join(publicDir, "favicon.ico");

  try {
    await fs.access(sourceSvgPath);
  } catch (error) {
    throw new Error(
      `Source SVG not found at ${sourceSvgPath}. Please ensure the file exists before generating the favicon.`
    );
  }

  await fs.mkdir(publicDir, { recursive: true });

  const svgBuffer = await fs.readFile(sourceSvgPath);

  const pngBuffer = await sharp(svgBuffer)
    .resize(64, 64, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const icoBuffer = await pngToIco([pngBuffer]);

  await fs.writeFile(outputPath, icoBuffer);
  console.log(`Generated favicon at ${outputPath}`);
}

generateFavicon().catch((error) => {
  console.error("Failed to generate favicon:", error);
  process.exitCode = 1;
});
