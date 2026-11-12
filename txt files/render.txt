import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const targetShot = process.argv[2];
if (!targetShot) {
    console.error("❌ Error: Please provide a shot folder.");
    process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const currentDir = process.cwd(); 
const projectName = path.basename(currentDir); 
const kitPath = path.resolve(__dirname); 
const shotRoot = path.join(currentDir, targetShot); 
const buildDir = path.join(shotRoot, 'build');
const outputPath = path.join(buildDir, 'scene_render.mp4');

if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

const htmlPath = path.join(shotRoot, 'index.html');
if (!fs.existsSync(htmlPath)) {
    const shotNumber = targetShot.split('_')[1];
    const autoHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${targetShot} Render</title><style>body { margin: 0; padding: 0; overflow: hidden; background-color: #141619; } canvas { display: block; }</style></head><body><script type="module" src="./scenes/${shotNumber}_scene.js"></script></body></html>`;
    fs.writeFileSync(htmlPath, autoHtml);
}

const app = express();
app.use(express.static(kitPath)); 
const server = app.listen(8080, async () => {
    console.log(`\n🚀 Starting Headless Render for: ${projectName} -> ${targetShot}`);
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // ==========================================
    // CATCH BROWSER AND NETWORK ERRORS
    // ==========================================
    page.on('console', msg => console.log(`[Browser Console]: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[Browser Error]: ${err.toString()}`));
    page.on('response', response => {
        if (!response.ok()) {
            console.error(`[Network 404]: ${response.url()} could not be found.`);
        }
    });
    // ==========================================

    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

    const fps = 60; 
    const ffmpegArgs = [
        '-y', '-f', 'image2pipe', '-vcodec', 'png', '-r', `${fps}`,
        '-i', '-', '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', outputPath
    ];
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    const shotUrl = `http://localhost:8080/projects/${projectName}/${targetShot}/index.html`;
    console.log(`🔗 Loading: ${shotUrl}`);
    
    try {
        await page.goto(shotUrl, { waitUntil: 'networkidle0' });
        console.log(`⏳ Waiting for engine to load...`);
        await page.waitForSelector('canvas', { timeout: 10000 });
    } catch (error) {
        console.error(`❌ Error: Canvas failed to load. Check the logs above.`);
        await browser.close();
        server.close();
        process.exit(1);
    }

    console.log(`🎥 Capturing frames for ${targetShot}...`);
    const totalFrames = 300; 
    
    for (let i = 1; i <= totalFrames; i++) {
        const base64Data = await page.evaluate(() => {
            const canvas = document.querySelector('canvas');
            if (!canvas) return null;
            return canvas.toDataURL('image/png');
        });

        if (!base64Data) break;
        const base64Image = base64Data.split(';base64,').pop();
        const buffer = Buffer.from(base64Image, 'base64');
        ffmpeg.stdin.write(buffer);
        if (i % 60 === 0) console.log(`⏳ Rendered ${i} / ${totalFrames} frames...`);
    }

    console.log("✅ Frame capture complete. Encoding MP4...");
    ffmpeg.stdin.end(); 
    ffmpeg.on('close', async () => {
        console.log(`🎉 SUCCESS! Saved to: projects/${projectName}/${targetShot}/build/scene_render.mp4\n`);
        await browser.close();
        server.close();
        process.exit(0);
    });
});