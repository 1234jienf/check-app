// PWA 아이콘 생성 스크립트
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const bishopLogoPath = path.join(publicDir, 'bishop-logo.png');

async function generateIcons() {
  try {
    // bishop-logo.png 파일 확인
    if (!fs.existsSync(bishopLogoPath)) {
      console.error('❌ bishop-logo.png 파일을 찾을 수 없습니다.');
      process.exit(1);
    }

    // 비숍 로고 이미지 로드
    const bishopImage = sharp(bishopLogoPath);
    const metadata = await bishopImage.metadata();
    
    // 비숍 로고를 중앙에 배치할 크기 계산 (약 70% 크기로)
    const logoSize192 = Math.floor(192 * 0.7);
    const logoSize512 = Math.floor(512 * 0.7);

    // 192x192 아이콘 생성
    const logo192 = await bishopImage
      .resize(logoSize192, logoSize192, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    const icon192 = await sharp({
      create: {
        width: 192,
        height: 192,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
      .composite([{
        input: logo192,
        top: Math.floor((192 - logoSize192) / 2),
        left: Math.floor((192 - logoSize192) / 2)
      }])
      .png()
      .toBuffer();
    
    await fs.promises.writeFile(path.join(publicDir, 'icon-192.png'), icon192);
    console.log('✓ icon-192.png 생성 완료');

    // 512x512 아이콘 생성
    const logo512 = await bishopImage
      .resize(logoSize512, logoSize512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    const icon512 = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
      .composite([{
        input: logo512,
        top: Math.floor((512 - logoSize512) / 2),
        left: Math.floor((512 - logoSize512) / 2)
      }])
      .png()
      .toBuffer();
    
    await fs.promises.writeFile(path.join(publicDir, 'icon-512.png'), icon512);
    console.log('✓ icon-512.png 생성 완료');

    console.log('\n✅ 모든 아이콘 파일이 생성되었습니다!');
  } catch (error) {
    console.error('❌ 아이콘 생성 중 오류:', error);
    process.exit(1);
  }
}

generateIcons();

