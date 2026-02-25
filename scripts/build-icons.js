const sharp = require("sharp");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const logoSrc = path.join(publicDir, "icon.svg");

const sizes = [180, 192, 512];

Promise.all(
  sizes.map((size) =>
    sharp(logoSrc)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, `icon-${size}.png`))
      .then(() => console.log(`Created icon-${size}.png from icon.svg`))
  )
).catch((err) => {
  console.error(err);
  process.exit(1);
});
