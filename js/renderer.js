// js/renderer.js — Canvas 渲染器

const Renderer = {
    canvas: null,
    ctx: null,
    imageCache: {},

    /**
     * 初始化渲染器
     */
    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.preloadImages();
    },

    /**
     * 预加载所有水果头像
     */
    preloadImages() {
        FRUITS.forEach(fruit => {
            const img = new Image();
            img.src = fruit.img;
            this.imageCache[fruit.level] = img;
        });
    },

    /**
     * 调整画布尺寸
     */
    resize() {
        const container = document.getElementById('game-container');
        const topBar = document.getElementById('top-bar');
        const bottomBar = document.getElementById('bottom-bar');

        const w = container.clientWidth;
        const h = container.clientHeight - topBar.offsetHeight - bottomBar.offsetHeight;

        const gameW = Math.min(w, 500);
        const gameH = h;

        Physics.resize(gameW, gameH);

        this.canvas.width = gameW;
        this.canvas.height = gameH;
        // 根据画布高度缩放水果
        scaleFruits(gameH);
    },

    /**
     * 渲染完整帧
     * @param {Object} gameState
     */
    render(gameState) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, w, h);

        this.drawBackground(w, h);
        this.drawWarningLine(w);
        this.drawWallGlow(w, h);

        if (gameState.fruits) {
            gameState.fruits.forEach(f => {
                if (f.body && !f.body.isRemoved) {
                    this.drawFruit(f.body, f.level);
                }
            });
        }

        // 拖拽预览 — 跟随鼠标的掉落引导
        if (gameState.previewFruit) {
            this.drawDropPreview(gameState.previewFruit);
        }

        // 右上角：下下个球小窗
        if (gameState.nextNextLevel != null) {
            this.drawNextPreview(gameState.nextNextLevel, w);
        }
    },

    /**
     * 绘制背景
     */
    drawBackground(w, h) {
        const ctx = this.ctx;
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#fff8fa');
        grad.addColorStop(0.5, '#fff0f3');
        grad.addColorStop(1, '#fce4ec');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 网格纹理
        ctx.strokeStyle = 'rgba(224, 43, 61, 0.04)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x < w; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
    },

    /**
     * 绘制警戒线
     */
    drawWarningLine(w) {
        const ctx = this.ctx;
        const y = Math.round(this.canvas.height * 0.1);

        ctx.save();
        ctx.setLineDash([6, 10]);
        ctx.strokeStyle = 'rgba(224, 43, 61, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(15, y);
        ctx.lineTo(w - 15, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(224, 43, 61, 0.5)';
        ctx.font = '10px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('警戒线', w - 20, y - 6);
        ctx.restore();
    },

    /**
     * 绘制墙壁内侧发光
     */
    drawWallGlow(w, h) {
        const ctx = this.ctx;
        const wallGlow = ctx.createLinearGradient(0, 0, w, 0);
        wallGlow.addColorStop(0, 'rgba(224, 43, 61, 0.06)');
        wallGlow.addColorStop(0.03, 'rgba(224, 43, 61, 0.02)');
        wallGlow.addColorStop(0.5, 'rgba(224, 43, 61, 0)');
        wallGlow.addColorStop(0.97, 'rgba(224, 43, 61, 0.02)');
        wallGlow.addColorStop(1, 'rgba(224, 43, 61, 0.06)');
        ctx.fillStyle = wallGlow;
        ctx.fillRect(0, 0, w, h);
    },

    /**
     * 绘制单个水果
     */
    drawFruit(body, level) {
        const ctx = this.ctx;
        const fruit = FRUITS[level];
        const r = fruit.radius;
        const x = body.position.x;
        const y = body.position.y;
        const angle = body.angle;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // 外发光
        const glowGrad = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.2);
        glowGrad.addColorStop(0, 'rgba(57, 197, 187, 0)');
        glowGrad.addColorStop(0.5, 'rgba(57, 197, 187, 0.1)');
        glowGrad.addColorStop(1, 'rgba(57, 197, 187, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // 阴影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;

        // 白色圆形底衬
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // 剪裁为圆形
        ctx.beginPath();
        ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
        ctx.clip();

        // 绘制头像
        const img = this.imageCache[level];
        if (img && img.complete) {
            const d = (r - 2) * 2;
            ctx.drawImage(img, -r + 2, -r + 2, d, d);
        }

        ctx.restore();
    },

    /**
     * 绘制拖拽预览 — 跟随鼠标/手指，带下落引导线
     */
    drawDropPreview(preview) {
        const ctx = this.ctx;
        const fruit = FRUITS[preview.level];
        const r = fruit.radius;
        const x = preview.x;
        const y = Math.round(this.canvas.height * 0.08);

        ctx.save();
        ctx.globalAlpha = 0.7;

        // 下落引导虚线
        ctx.setLineDash([3, 6]);
        ctx.strokeStyle = 'rgba(57, 197, 187, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + r);
        ctx.lineTo(x, this.canvas.height - 60);
        ctx.stroke();
        ctx.setLineDash([]);

        // 光晕
        ctx.shadowColor = 'rgba(57, 197, 187, 0.5)';
        ctx.shadowBlur = 18;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // 头像
        ctx.beginPath();
        ctx.arc(x, y, r - 2, 0, Math.PI * 2);
        ctx.clip();
        const img = this.imageCache[preview.level];
        if (img && img.complete) {
            const d = (r - 2) * 2;
            ctx.drawImage(img, x - r + 2, y - r + 2, d, d);
        }

        ctx.restore();
    },

    /**
     * 绘制下下个预览 — 右上角小窗
     */
    drawNextPreview(level, canvasW) {
        const ctx = this.ctx;
        const fruit = FRUITS[level];
        const r = 22;
        const x = canvasW - r - 16;
        const y = 16 + r;

        ctx.save();

        // 半透明背景圆
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.arc(x, y, r + 6, 0, Math.PI * 2);
        ctx.fill();

        // 边框
        ctx.strokeStyle = 'rgba(57, 197, 187, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r + 6, 0, Math.PI * 2);
        ctx.stroke();

        // 标签
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '8px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NEXT', x, y - r - 10);

        // 水果
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // 头像
        ctx.beginPath();
        ctx.arc(x, y, r - 2, 0, Math.PI * 2);
        ctx.clip();
        const img = this.imageCache[level];
        if (img && img.complete) {
            const d = (r - 2) * 2;
            ctx.drawImage(img, x - r + 2, y - r + 2, d, d);
        }

        ctx.restore();
    },
};
