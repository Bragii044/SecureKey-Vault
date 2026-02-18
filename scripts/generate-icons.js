import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const svgPath = path.resolve('public/icon.svg');
const pngPath = path.resolve('public/icon.png');
const icoPath = path.resolve('public/favicon.ico');
const desktopIconPath = path.resolve('public/icon.ico');

async function createIcons() {
    try {
        console.log('Generating PNG from SVG...');
        await sharp(svgPath)
            .resize(256, 256)
            .png()
            .toFile(pngPath);
        console.log(`PNG created at ${pngPath}`);

        console.log('Generating ICO from PNG...');
        const buf = fs.readFileSync(pngPath);
        const icoBuf = await toIco([buf], {
            resize: true,
            sizes: [16, 24, 32, 48, 64, 128, 256]
        });
        fs.writeFileSync(icoPath, icoBuf);
        fs.writeFileSync(desktopIconPath, icoBuf);

        console.log(`Favicon created at ${icoPath}`);
        console.log(`Desktop Icon created at ${desktopIconPath}`);

    } catch (error) {
        console.error('Error creating icons:', error);
    }
}

createIcons();
