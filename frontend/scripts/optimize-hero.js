import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const heroImagePath = join(__dirname, '../public/personajes/Generated Image November 04, 2025 - 11_09AM.png');

console.log('🎯 Optimizing hero image for ultra-fast loading...\n');

try {
  // Create a much smaller version for mobile
  await sharp(heroImagePath)
    .resize(400, null, {
      withoutEnlargement: true,
      fit: 'inside'
    })
    .png({
      quality: 70,
      compressionLevel: 9,
      palette: true // Use palette-based PNG for smaller size
    })
    .toFile(heroImagePath.replace('.png', '-mobile.png'));

  console.log('✅ Created mobile version (400px wide)');

  // Optimize the original for desktop (max 600px)
  await sharp(heroImagePath)
    .resize(600, null, {
      withoutEnlargement: true,
      fit: 'inside'
    })
    .png({
      quality: 75,
      compressionLevel: 9
    })
    .toFile(heroImagePath + '.tmp');

  // Replace original
  const { rename, unlink, stat } = await import('fs/promises');
  const originalStats = await stat(heroImagePath);
  await unlink(heroImagePath);
  await rename(heroImagePath + '.tmp', heroImagePath);

  const newStats = await stat(heroImagePath);
  const savedPercent = (((originalStats.size - newStats.size) / originalStats.size) * 100).toFixed(1);

  console.log(`✅ Optimized desktop version (600px wide)`);
  console.log(`📊 Size: ${(originalStats.size / 1024).toFixed(0)}KB → ${(newStats.size / 1024).toFixed(0)}KB (saved ${savedPercent}%)\n`);

  console.log('✨ Hero image optimization complete!');
} catch (error) {
  console.error('❌ Error:', error.message);
}
