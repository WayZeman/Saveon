const sharp = require("sharp");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const logoPath = path.join(publicDir, "logo.png");

const sizes = [180, 192, 512];

Promise.all(
  sizes.map((size) =>
    sharp(logoPath)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, `icon-${size}.png`))
      .then(() => console.log(`Created icon-${size}.png from logo.png`))
  )
).catch((err) => {
  console.error(err);
  process.exit(1);
});
