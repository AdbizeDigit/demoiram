import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, '../public');
const imageExtensions = ['.png', '.jpg', '.jpeg'];
const MAX_WIDTH = 1920;
const QUALITY = 75;

async function compressImage(filePath) {
  try {
    const ext = extname(filePath).toLowerCase();

    if (!imageExtensions.includes(ext)) {
      return;
    }

    const stats = await stat(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);

    // Only compress images larger than 200KB
    if (fileSizeMB < 0.2) {
      console.log(`⏩ Skipping ${filePath} (${fileSizeMB.toFixed(2)}MB)`);
      return;
    }

    console.log(`🔄 Compressing ${filePath} (${fileSizeMB.toFixed(2)}MB)...`);

    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Resize if too large
    let pipeline = image.clone();
    if (metadata.width > MAX_WIDTH) {
      pipeline = pipeline.resize(MAX_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }

    // Compress based on format
    if (ext === '.png') {
      await pipeline
        .png({ quality: QUALITY, compressionLevel: 9 })
        .toFile(filePath + '.tmp');
    } else {
      await pipeline
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toFile(filePath + '.tmp');
    }

    // Replace original with compressed version
    const { rename, unlink } = await import('fs/promises');
    await unlink(filePath);
    await rename(filePath + '.tmp', filePath);

    const newStats = await stat(filePath);
    const newSizeMB = newStats.size / (1024 * 1024);
    const savedMB = fileSizeMB - newSizeMB;
    const savedPercent = ((savedMB / fileSizeMB) * 100).toFixed(1);

    console.log(`✅ Compressed ${filePath}: ${fileSizeMB.toFixed(2)}MB → ${newSizeMB.toFixed(2)}MB (saved ${savedPercent}%)`);
  } catch (error) {
    console.error(`❌ Error compressing ${filePath}:`, error.message);
  }
}

async function processDirectory(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await processDirectory(fullPath);
      } else if (entry.isFile()) {
        await compressImage(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error.message);
  }
}

console.log('🚀 Starting image compression...\n');
await processDirectory(publicDir);
console.log('\n✨ Image compression complete!');
