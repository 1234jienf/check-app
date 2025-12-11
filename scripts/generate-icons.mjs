// PWA 아이콘 생성 스크립트
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');

// SVG 아이콘 생성
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" rx="64"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="240" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">백</text>
</svg>
`;

async function generateIcons() {
  try {
    // SVG 버퍼 생성
    const svgBuffer = Buffer.from(svgIcon);

    // 192x192 아이콘 생성
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));

    console.log('✓ icon-192.png 생성 완료');

    // 512x512 아이콘 생성
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));

    console.log('✓ icon-512.png 생성 완료');

    // SVG 파일도 저장
    fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);
    console.log('✓ icon.svg 생성 완료');

    console.log('\n✅ 모든 아이콘 파일이 생성되었습니다!');
  } catch (error) {
    console.error('❌ 아이콘 생성 중 오류:', error);
    process.exit(1);
  }
}

generateIcons();

