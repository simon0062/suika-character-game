// js/game.js — 游戏主控制器

const Game = {
    state: 'idle',
    score: 0,
    highScore: 0,
    dropCount: 0,
    fruits: [],
    previewFruit: null,
    mouseX: 0,
    particles: [],
    scorePopups: [],
    lastTime: 0,
    lastDropTime: 0,
    dropCooldown: 450,
    currentMaxLevel: -1,
    nextNextLevel: 0,

    // ===== 音效 =====
    sounds: {},

    preloadSounds() {
        const list = {
            merge1: 'audio/merge1.mp3',
            merge2: 'audio/merge2.mp3',
            merge3: 'audio/merge3.mp3',
            success: 'audio/success.mp3',
            explosion: 'audio/explosion.mp3',
        };
        for (const [key, src] of Object.entries(list)) {
            const a = new Audio(src);
            a.preload = 'auto';
            this.sounds[key] = a;
        }
    },

    playSound(name) {
        const s = this.sounds[name];
        if (s) {
            s.currentTime = 0;
            s.play().catch(() => {});
        }
    },

    // ===== 初始化 =====
    init() {
        this.loadHighScore();
        this.updateUI();
        this.preloadSounds();

        // 预加载所有立绘图片
        this.preloadIllustrations();

        Physics.init();
        Renderer.init('game-canvas');
        Renderer.resize();

        this.bindEvents();
        MusicPlayer.init();
        this.setupNewGame();

        this.lastTime = performance.now();
        requestAnimationFrame(t => this.gameLoop(t));
    },

    preloadIllustrations() {
        FRUITS.forEach(f => {
            if (f.lihui) {
                const img = new Image();
                img.src = f.lihui;
            }
        });
    },

    // ===== 新游戏 =====
    setupNewGame() {
        this.state = 'idle';
        this.score = 0;
        this.dropCount = 0;
        this.lastDropTime = 0;
        this.currentMaxLevel = -1;
        MusicPlayer.reset();
        this.fruits = [];
        this.particles = [];
        this.scorePopups = [];
        Physics.reset();

        // 不预填充初始水果

        this.previewFruit = {
            x: Physics.gameWidth / 2,
            level: 0,
        };
        this.nextNextLevel = getNextFruitLevel(1);  // 下下个球

        this.updateIllustration();
        document.getElementById('game-over-panel').classList.add('hidden');
        this.updateUI();
    },

    // ===== 立绘控制 =====
    updateIllustration() {
        const img = document.getElementById('illustration-img');
        const nameLabel = document.getElementById('illustration-name');

        if (this.currentMaxLevel < 0) {
            img.style.opacity = '0';
            nameLabel.textContent = '';
            return;
        }

        const fruit = FRUITS[this.currentMaxLevel];
        const src = fruit.lihui || (this.currentMaxLevel > 0 ? FRUITS[this.currentMaxLevel - 1].lihui : null);

        if (src && img.src !== src) {
            img.src = src;
            img.onload = () => { img.style.opacity = '0.85'; };
            img.onerror = () => { img.style.opacity = '0'; };
            // 如果图片已经缓存好了，立即显示
            if (img.complete && img.naturalWidth > 0) {
                img.style.opacity = '0.85';
            }
        } else if (!src) {
            img.style.opacity = '0';
        }

        nameLabel.textContent = fruit.name;
    },

    /**
     * 检查并更新场上最大等级
     */
    checkMaxLevel() {
        let max = -1;
        for (const f of this.fruits) {
            if (f.body && !f.body.isRemoved && f.level > max) {
                max = f.level;
            }
        }
        if (max !== this.currentMaxLevel) {
            this.currentMaxLevel = max;
            this.updateIllustration();
            if (max >= 0) MusicPlayer.unlock(max);
        }
    },

    // ===== 输入事件 =====
    bindEvents() {
        const canvas = Renderer.canvas;
        const container = document.getElementById('game-container');

        canvas.addEventListener('mousemove', e => this.onPointerMove(e.clientX));
        canvas.addEventListener('mousedown', e => this.onPointerDown(e.clientX));
        canvas.addEventListener('mouseup', () => this.onPointerUp());

        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            this.onPointerMove(e.touches[0].clientX);
        }, { passive: false });
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            this.onPointerDown(e.touches[0].clientX);
        }, { passive: false });
        canvas.addEventListener('touchend', e => {
            e.preventDefault();
            this.onPointerUp();
        }, { passive: false });

        // canvas 阻止浏览器默认手势
        canvas.style.touchAction = 'none';

        window.addEventListener('resize', () => this.onResize());
        document.getElementById('restart-btn').addEventListener('click', () => this.setupNewGame());
        document.getElementById('restart-btn').addEventListener('touchend', e => {
            e.preventDefault();
            e.stopPropagation();
            this.setupNewGame();
        });
        container.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    },

    onPointerMove(clientX) {
        const rect = Renderer.canvas.getBoundingClientRect();
        const scaleX = Physics.gameWidth / rect.width;
        let x = (clientX - rect.left) * scaleX;

        const fruit = this.previewFruit ? FRUITS[this.previewFruit.level] : FRUITS[0];
        x = Math.max(fruit.radius, Math.min(Physics.gameWidth - fruit.radius, x));
        this.mouseX = x;

        if (this.state !== 'over' && this.previewFruit) {
            this.previewFruit.x = x;
        }
    },

    onPointerDown(clientX) {
        if (this.state === 'over') return;
        const rect = Renderer.canvas.getBoundingClientRect();
        const scaleX = Physics.gameWidth / rect.width;
        this.mouseX = (clientX - rect.left) * scaleX;
        if (this.previewFruit) {
            const r = FRUITS[this.previewFruit.level].radius;
            this.previewFruit.x = Math.max(r, Math.min(Physics.gameWidth - r, this.mouseX));
        }
    },

    canDrop() {
        if (this.state === 'over') return false;
        const now = performance.now();
        if (now - this.lastDropTime < this.dropCooldown) return false;
        return true;
    },

    onPointerUp() {
        if (!this.canDrop()) return;
        if (!this.previewFruit) return;

        this.lastDropTime = performance.now();
        this.dropFruit(this.previewFruit.x, this.previewFruit.level);
        this.dropCount++;
        this.state = 'playing';

        const nextLevel = this.nextNextLevel;
        this.nextNextLevel = getNextFruitLevel(this.dropCount + 1);
        this.previewFruit = {
            x: Math.max(FRUITS[nextLevel].radius,
                Math.min(Physics.gameWidth - FRUITS[nextLevel].radius, this.mouseX || Physics.gameWidth / 2)),
            level: nextLevel,
        };
    },

    onResize() {
        Renderer.resize();
        if (this.previewFruit) {
            const r = FRUITS[this.previewFruit.level].radius;
            this.previewFruit.x = Math.max(r, Math.min(Physics.gameWidth - r, this.mouseX));
        }
    },

    // ===== 水果掉落 =====
    dropFruit(x, level) {
        const body = Physics.createFruitBody(x, 50, level);
        Matter.Composite.add(Physics.world, body);
        this.fruits.push({ body, level });
        this.checkMaxLevel();
        MusicPlayer.unlock(level);
    },

    // ===== 游戏循环 =====
    gameLoop(timestamp) {
        const delta = Math.min(timestamp - this.lastTime, 33);
        this.lastTime = timestamp;

        if (this.state === 'playing' || this.state === 'idle') {
            Physics.update(delta);
        }

        this.processMerges();
        this.checkGameOver(timestamp);
        this.updateParticles(delta);
        this.updateScorePopups(delta);

        Renderer.render({
            fruits: this.fruits.filter(f => f.body && !f.body.isRemoved),
            previewFruit: this.state !== 'over' ? this.previewFruit : null,
            nextNextLevel: this.state !== 'over' ? this.nextNextLevel : null,
        });

        this.renderParticles();
        this.renderScorePopups();

        requestAnimationFrame(t => this.gameLoop(t));
    },

    // ===== 合并处理 =====
    processMerges() {
        const merges = Physics.drainPendingMerges();
        if (merges.length === 0) return;

        for (const m of merges) {
            const a = this.fruits.find(f => f.body === m.bodyA);
            const b = this.fruits.find(f => f.body === m.bodyB);
            if (!a || !b) continue;
            this.mergeFruits(a, b);
        }
    },

    mergeFruits(a, b) {
        const newLevel = a.level + 1;
        const midX = (a.body.position.x + b.body.position.x) / 2;
        const midY = (a.body.position.y + b.body.position.y) / 2;

        Matter.Composite.remove(Physics.world, a.body);
        Matter.Composite.remove(Physics.world, b.body);
        this.fruits = this.fruits.filter(f => f !== a && f !== b);

        if (newLevel <= MAX_LEVEL) {
            const newBody = Physics.createFruitBody(midX, midY, newLevel);
            Matter.Composite.add(Physics.world, newBody);
            this.fruits.push({ body: newBody, level: newLevel });

            const gained = FRUITS[newLevel].score;
            this.score += gained;
            this.spawnMergeParticles(midX, midY, newLevel);
            this.spawnScorePopup(midX, midY - FRUITS[newLevel].radius, gained);

            // 音效
            if (newLevel >= 9) {
                this.playSound('success');
            } else {
                const r = Math.random();
                this.playSound(r < 0.5 ? 'merge1' : (r < 0.8 ? 'merge2' : 'merge3'));
            }

            if (newLevel >= 8) {
                this.spawnBonusParticles(midX, midY);
            }

            // 解锁该角色的音乐
            MusicPlayer.unlock(newLevel);

            // 检查是否升级了最大等级
            if (newLevel > this.currentMaxLevel) {
                this.currentMaxLevel = newLevel;
                this.updateIllustration();
            }
        } else {
            this.score += 50;
            this.spawnVictoryParticles(midX, midY);
            this.spawnScorePopup(midX, midY - 30, 50);
            this.playSound('explosion');
        }

        this.updateUI();
    },

    // ===== 游戏结束检测：碰到线立即结束（掉落保护0.3s）=====
    checkGameOver(timestamp) {
        if (this.state !== 'playing') return;
        // 掉落保护：刚掉落的球有 300ms 缓冲
        if (timestamp - this.lastDropTime < 1000) return;

        const warningY = 75;
        for (const f of this.fruits) {
            if (!f.body || f.body.isRemoved) continue;
            const topY = f.body.position.y - FRUITS[f.level].radius;
            if (topY < warningY) {
                this.gameOver();
                return;
            }
        }
    },

    gameOver() {
        if (this.state === 'over') return;
        this.state = 'over';

        // 重置音乐解锁
        MusicPlayer.reset();

        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-high-score').textContent = this.highScore;
        document.getElementById('game-over-panel').classList.remove('hidden');
    },

    // ===== 粒子特效 =====
    spawnMergeParticles(x, y, level) {
        const colors = ['#39C5BB', '#FFD700', '#E02B3D', '#fff'];
        const count = 6 + level * 3;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6 - 3,
                life: 1.0,
                decay: 0.015 + Math.random() * 0.03,
                size: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
    },

    spawnBonusParticles(x, y) {
        for (let i = 0; i < 18; i++) {
            const angle = (Math.PI * 2 * i) / 18;
            const speed = 2 + Math.random() * 5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 1.0,
                decay: 0.01 + Math.random() * 0.02,
                size: 3 + Math.random() * 6,
                color: '#FFD700',
            });
        }
    },

    spawnVictoryParticles(x, y) {
        const colors = ['#FFD700', '#39C5BB', '#E02B3D', '#fff', '#FF69B4'];
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 12;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 6,
                life: 1.0,
                decay: 0.004 + Math.random() * 0.012,
                size: 3 + Math.random() * 12,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
    },

    updateParticles(delta) {
        const dt = delta / 16.667;
        for (const p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 0.15 * dt;
            p.life -= p.decay * dt;
        }
        this.particles = this.particles.filter(p => p.life > 0);
    },

    renderParticles() {
        const ctx = Renderer.ctx;
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    },

    // ===== 分数弹出 =====
    spawnScorePopup(x, y, score) {
        this.scorePopups.push({ x, y, text: '+' + score, life: 1.0 });
    },

    updateScorePopups(delta) {
        const dt = delta / 16.667;
        for (const p of this.scorePopups) {
            p.y -= 1.5 * dt;
            p.life -= 0.018 * dt;
        }
        this.scorePopups = this.scorePopups.filter(p => p.life > 0);
    },

    renderScorePopups() {
        const ctx = Renderer.ctx;
        for (const p of this.scorePopups) {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 18px "PingFang SC", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 3;
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        }
    },

    // ===== UI =====
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('high-score').textContent = this.highScore;
    },

    // ===== 持久化 =====
    loadHighScore() {
        try {
            this.highScore = parseInt(localStorage.getItem('suika_char_high_score')) || 0;
        } catch (e) { this.highScore = 0; }
    },

    saveHighScore() {
        try {
            localStorage.setItem('suika_char_high_score', String(this.highScore));
        } catch (e) {}
    },
};

window.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
