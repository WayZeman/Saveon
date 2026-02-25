const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const publicDir = path.join(__dirname, "..", "public");
const logoPath = path.join(publicDir, "logo.png");
const defaultLogoSvg = path.join(publicDir, "default-logo.svg");

const sizes = [180, 192, 512];

function ensureLogo() {
  if (fs.existsSync(logoPath)) return Promise.resolve();
  if (!fs.existsSync(defaultLogoSvg)) {
    return Promise.reject(new Error("public/logo.png missing and public/default-logo.svg not found. Add logo.png or run from repo root."));
  }
  return sharp(defaultLogoSvg)
    .resize(512, 512)
    .png()
    .toFile(logoPath)
    .then(() => console.log("Created logo.png from default-logo.svg"));
}

ensureLogo()
  .then(() =>
    Promise.all(
      sizes.map((size) =>
        sharp(logoPath)
          .resize(size, size)
          .png()
          .toFile(path.join(publicDir, `icon-${size}.png`))
          .then(() => console.log(`Created icon-${size}.png from logo.png`))
      )
    )
  )
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
