const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { Logger } = require('./logger');

const FONT_CANDIDATES = [
  'C:/Windows/Fonts/arialbd.ttf',
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/calibrib.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
];

const BG_COLOR    = '0x0d1b2a';
const TITLE_CLR   = 'white';
const SECTION_CLR = 'ffcc66';
const BODY_CLR    = 'eeeeee';
const FPS         = 24;
const W           = 1280;
const H           = 720;

class FFmpegAssembler {
  constructor() {
    this.logger = new Logger('FFmpegAssembler');
    this.font = null;
  }

  async initialize() {
    for (const f of FONT_CANDIDATES) {
      try {
        await fs.access(f);
        this.font = f;
        this.logger.info(`Font: ${this.font}`);
        return;
      } catch {}
    }
    this.logger.warn('No font found — text overlays disabled');
  }

  // ─── Public entry point ───────────────────────────────────────────────────

  async assembleVideo(script, imagePaths, audioPath, outputPath) {
    await this.initialize();

    const tempDir = path.join(os.tmpdir(), `ffasm_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const slides = this.buildSlides(script, imagePaths);
      this.logger.info(`Rendering ${slides.length} slides...`);

      const slidePaths = [];
      for (let i = 0; i < slides.length; i++) {
        const out = path.join(tempDir, `s${String(i).padStart(3, '0')}.mp4`);
        await this.renderSlide(slides[i], out);
        slidePaths.push(out);
        this.logger.info(`  Slide ${i + 1}/${slides.length} done`);
      }

      const concatPath = path.join(tempDir, 'concat.mp4');
      await this.concatenateSlides(slidePaths, concatPath);

      const isRealAudio = audioPath
        && !audioPath.endsWith('.info')
        && await this.fileExists(audioPath);

      if (isRealAudio) {
        this.logger.info('Mixing audio...');
        await this.mixAudio(concatPath, audioPath, outputPath);
      } else {
        this.logger.warn('No real audio — outputting silent video');
        await fs.copyFile(concatPath, outputPath);
      }

      const stats = await fs.stat(outputPath);
      this.logger.info(`Video ready: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
      return outputPath;

    } finally {
      await this.cleanupDir(tempDir);
    }
  }

  // ─── Slide builder ────────────────────────────────────────────────────────

  buildSlides(script, rawImages) {
    const images = (rawImages || []).filter(p => p && !p.endsWith('.info'));
    let imgIdx = 0;
    const nextImg = () => images.length ? images[imgIdx++ % images.length] : null;

    const slides = [];

    slides.push({
      kind: 'title',
      title: script.title,
      subtitle: 'The Forgotten Front',
      duration: this.wdur(script.title, 6),
      image: nextImg()
    });

    if (script.hook?.text) {
      slides.push({
        kind: 'content',
        title: null,
        body: script.hook.text,
        duration: this.wdur(script.hook.text, 8),
        image: nextImg()
      });
    }

    for (const section of (script.mainContent?.sections || [])) {
      const lines = this.cleanLines(section);
      slides.push({
        kind: 'section',
        title: section.title || null,
        body: lines.slice(0, 2).join(' — ') || null,
        duration: this.wdur([section.title, ...lines].join(' '), 10, 40),
        image: nextImg()
      });
    }

    if (script.conclusion?.finalThought) {
      slides.push({
        kind: 'conclusion',
        title: 'Lest We Forget',
        body: script.conclusion.finalThought,
        duration: this.wdur(script.conclusion.finalThought, 10),
        image: nextImg()
      });
    }

    slides.push({
      kind: 'cta',
      title: null,
      body: (script.callToAction?.subscribe || 'Subscribe to The Forgotten Front').substring(0, 60),
      duration: 8,
      image: null
    });

    return slides;
  }

  wdur(text = '', minSec = 5, maxSec = 40) {
    const words = text.replace(/\[.*?\]/g, '').split(/\s+/).filter(Boolean).length;
    return Math.max(minSec, Math.min(maxSec, Math.ceil((words / 150) * 60)));
  }

  cleanLines(section) {
    if (Array.isArray(section.content)) {
      return section.content
        .filter(l => typeof l === 'string' && !l.startsWith('[') && l.trim())
        .map(l => l.replace(/\[.*?\]/g, '').trim())
        .filter(Boolean);
    }
    if (typeof section.content === 'string') {
      return [section.content.replace(/\[.*?\]/g, '').trim()];
    }
    return [];
  }

  // ─── Slide renderer ───────────────────────────────────────────────────────

  async renderSlide(slide, outputPath) {
    const { duration, image } = slide;
    const frames = FPS * duration;
    const hasImage = image && await this.fileExists(image);

    const filterParts = [];

    if (hasImage) {
      filterParts.push(
        `scale=${W}:${H}:force_original_aspect_ratio=increase`,
        `crop=${W}:${H}`,
        // single-quoted option values → FFmpeg Level-2, commas safe inside
        `zoompan=z='if(lte(zoom,1.0),zoom-0.001)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS}`,
        `colorchannelmixer=aa=0.55`
      );
    } else {
      filterParts.push('format=yuv420p');
    }

    if (this.font) {
      const textFilters = this.buildTextFilters(slide);
      filterParts.push(...textFilters);
    }

    filterParts.push('fade=t=in:st=0:d=1');
    if (duration > 2) filterParts.push(`fade=t=out:st=${duration - 1}:d=1`);

    const filterStr = filterParts.join(',');

    let inputPart;
    if (hasImage) {
      inputPart = `-loop 1 -t ${duration} -i '${this.gfp(image)}'`;
    } else {
      inputPart = `-f lavfi -t ${duration} -i 'color=c=${BG_COLOR}:s=${W}x${H}:r=${FPS}'`;
    }

    // -vf in double quotes so inner single-quoted filter values pass through correctly
    const cmd = `ffmpeg -y ${inputPart} -vf "${filterStr}" -c:v libx264 -pix_fmt yuv420p -r ${FPS} -preset ultrafast -t ${duration} '${this.gfp(outputPath)}'`;
    await this.bashRun(cmd);
  }

  // buildTextFilters: embed text directly using text= (single-quoted Level-2 value).
  // This avoids all Windows path issues with textfile= on this FFmpeg build.
  buildTextFilters(slide) {
    const filters = [];

    const draw = (text, size, color, yExpr) => {
      const clean = (text || '')
        .replace(/\[.*?\]/g, '')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/['"\\$`]/g, '')  // strip chars that break bash/filter quoting
        .trim()
        .substring(0, 75);
      if (!clean) return null;

      // fontfile single-quoted /c/ path; text embedded in single-quoted Level-2 value
      return `drawtext=fontfile='${this.gfp(this.font)}':text='${clean}':fontsize=${size}:fontcolor=${color}:x=(w-tw)/2:y=${yExpr}:shadowcolor=black@0.9:shadowx=2:shadowy=2:box=1:boxcolor=black@0.35:boxborderw=8`;
    };

    if (slide.kind === 'title') {
      const t = draw(slide.title, 52, TITLE_CLR, 'h/2-th-10');
      const s = draw(slide.subtitle, 28, SECTION_CLR, 'h/2+10');
      if (t) filters.push(t);
      if (s) filters.push(s);
    } else if (slide.kind === 'cta') {
      const b = draw(slide.body, 32, TITLE_CLR, 'h/2-th/2');
      if (b) filters.push(b);
    } else {
      if (slide.title) {
        const t = draw(slide.title, 42, SECTION_CLR, 'h/5');
        if (t) filters.push(t);
      }
      if (slide.body) {
        const b = draw(slide.body, 26, BODY_CLR, 'h/2-th/2');
        if (b) filters.push(b);
      }
    }

    return filters;
  }

  // ─── Concat + audio ───────────────────────────────────────────────────────

  async concatenateSlides(slidePaths, outputPath) {
    const listPath = outputPath + '.txt';
    // Concat file is read by ffmpeg.exe directly (not via bash), so use Windows C:/path
    const lines = slidePaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    await fs.writeFile(listPath, lines, 'utf8');

    const cmd = `ffmpeg -y -f concat -safe 0 -i '${this.gfp(listPath)}' -c copy '${this.gfp(outputPath)}'`;
    await this.bashRun(cmd);
    await fs.unlink(listPath).catch(() => {});
  }

  async mixAudio(videoPath, audioPath, outputPath) {
    const cmd = `ffmpeg -y -i '${this.gfp(videoPath)}' -i '${this.gfp(audioPath)}' -c:v copy -c:a aac -shortest -map 0:v:0 -map 1:a:0 '${this.gfp(outputPath)}'`;
    await this.bashRun(cmd);
  }

  // ─── Run FFmpeg via bash ──────────────────────────────────────────────────

  bashRun(cmd) {
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', ['-c', cmd], { windowsHide: true });
      let stderr = '';
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', code => {
        if (code === 0) resolve();
        else reject(Object.assign(new Error(`FFmpeg failed (${code})`), { stderr: stderr.slice(-800) }));
      });
      proc.on('error', reject);
    });
  }

  // ─── Path helpers ─────────────────────────────────────────────────────────

  // Git-Bash / MSYS2 path: C:\path or C:/path → /c/path
  // Use for: shell-level single-quoted args, fontfile= (single-quoted in filter)
  gfp(p) {
    return p.replace(/\\/g, '/').replace(/^([A-Za-z]):\//, (_, d) => `/${d.toLowerCase()}/`);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  async fileExists(p) {
    try { await fs.access(p); return true; } catch { return false; }
  }

  async cleanupDir(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      await Promise.all(files.map(f => fs.unlink(path.join(dirPath, f)).catch(() => {})));
      await fs.rmdir(dirPath).catch(() => {});
    } catch {}
  }
}

module.exports = { FFmpegAssembler };
