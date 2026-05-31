// js/music.js — 音乐播放器

const MusicPlayer = {
    audio: null,
    songData: {},
    unlocked: {},        // { charName: true }
    currentSong: null,   // { char, title, file }
    playlist: [],        // all currently playable songs
    playlistIndex: -1,
    isPlaying: false,
    dataReady: false,
    pendingUnlocks: [],  // 数据加载前的待解锁队列

    init() {
        this.audio = new Audio();
        this.audio.volume = 0.5;

        // 先渲染空状态
        this.renderPanel();

        // 加载歌曲清单
        fetch('js/music_data.json')
            .then(r => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(data => {
                this.songData = data;
                this.dataReady = true;
                // 处理待解锁
                for (const char of this.pendingUnlocks) {
                    this.doUnlock(char);
                }
                this.pendingUnlocks = [];
                this.renderPanel();
            })
            .catch(err => {
                console.error('Music data load failed:', err);
                document.getElementById('music-panel').innerHTML = '<div id="music-header">🎵 音乐</div><div id="music-empty">加载失败</div>';
            });

        // 播放结束自动下一首
        this.audio.addEventListener('ended', () => this.next());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('play', () => this.isPlaying = true);
        this.audio.addEventListener('pause', () => this.isPlaying = false);
    },

    // ===== 解锁 =====
    unlock(level) {
        const fruit = FRUITS[level];
        if (!fruit || !fruit.music) return;
        const char = fruit.music;
        if (this.unlocked[char]) return;

        if (!this.dataReady) {
            // 数据还没加载，先排队
            if (!this.pendingUnlocks.includes(char)) {
                this.pendingUnlocks.push(char);
            }
            return;
        }

        this.doUnlock(char);
    },

    doUnlock(char) {
        if (this.unlocked[char]) return;
        if (!this.songData[char]) return;

        this.unlocked[char] = true;
        this.rebuildPlaylist();
        this.renderPanel();

        // 自动播放该角色的第一首歌
        if (!this.currentSong) {
            this.playCharFirst(char);
        }
    },

    isUnlocked(level) {
        const fruit = FRUITS[level];
        if (!fruit || !fruit.music) return false;
        return !!this.unlocked[fruit.music];
    },

    // ===== 播放控制 =====
    rebuildPlaylist() {
        this.playlist = [];
        for (const fruit of FRUITS) {
            if (!fruit.music) continue;
            const char = fruit.music;
            if (this.unlocked[char] && this.songData[char]) {
                for (const song of this.songData[char]) {
                    this.playlist.push({ char, ...song });
                }
            }
        }
    },

    play(song) {
        this.currentSong = song;
        this.audio.src = song.file;
        this.audio.play().catch(() => {});
        this.playlistIndex = this.playlist.findIndex(s => s.file === song.file);
        this.renderPanel();
    },

    playCharFirst(char) {
        if (this.songData[char] && this.songData[char].length > 0) {
            this.play({ char, ...this.songData[char][0] });
        }
    },

    togglePlay() {
        if (!this.currentSong) return;
        if (this.audio.paused) {
            this.audio.play().catch(() => {});
        } else {
            this.audio.pause();
        }
        this.renderPanel();
    },

    next() {
        if (this.playlist.length === 0) return;
        const idx = (this.playlistIndex + 1) % this.playlist.length;
        this.play(this.playlist[idx]);
    },

    prev() {
        if (this.playlist.length === 0) return;
        const idx = (this.playlistIndex - 1 + this.playlist.length) % this.playlist.length;
        this.play(this.playlist[idx]);
    },

    seek(e) {
        if (!this.audio.duration) return;
        const rect = e.target.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = pct * this.audio.duration;
    },

    // ===== UI =====
    renderPanel() {
        const panel = document.getElementById('music-panel');
        if (!panel) return;

        // 事件委托：同时绑定 click 和 touchend
        if (!panel._bound) {
            panel.addEventListener('click', e => this.handleClick(e));
            panel.addEventListener('touchend', e => {
                e.preventDefault();
                this.handleClick(e);
            }, { passive: false });
            panel._bound = true;
        }

        let html = '<button id="music-close-btn" onclick="var p=document.getElementById(\'music-panel\');p.classList.remove(\'show\');var b=document.getElementById(\'music-toggle-btn\');if(b)b.textContent=\'🎵\'">✕</button>';
        html += '<div id="music-header">🎵 音乐</div>';
        html += '<div id="music-list">';

        let hasUnlocked = false;
        for (const fruit of FRUITS) {
            if (!fruit.music) continue;
            const char = fruit.music;
            const songs = this.songData[char];
            if (!songs) continue;

            const unlocked = this.unlocked[char];
            if (unlocked) hasUnlocked = true;

            html += '<div class="music-char-group">';
            html += `<div class="music-char-name ${unlocked ? 'unlocked' : 'locked'}">`;
            html += `${unlocked ? '🔓' : '🔒'} ${fruit.name}`;
            html += `</div>`;

            if (unlocked && songs.length > 0) {
                html += '<div class="music-songs">';
                for (const song of songs) {
                    const isActive = this.currentSong && this.currentSong.file === song.file;
                    html += `<div class="music-song-item ${isActive ? 'active' : ''}" data-char="${this.esc(char)}" data-title="${this.esc(song.title)}" data-file="${this.esc(song.file)}">`;
                    html += `${isActive ? '🔊' : '🎵'} ${this.esc(song.title)}`;
                    html += '</div>';
                }
                html += '</div>';
            }
            html += '</div>';
        }

        if (!hasUnlocked) {
            html += '<div id="music-empty">合成水果解锁音乐 🎶</div>';
        }

        html += '</div>'; // music-list

        // 播放器底部控制栏
        html += '<div id="music-player-bar">';
        const curTitle = this.currentSong ? this.currentSong.title : '未播放';
        html += `<div id="music-now-playing">${this.esc(curTitle)}</div>`;

        html += '<div id="music-controls">';
        html += '<button class="mc-btn" data-action="prev">⏮</button>';
        html += `<button class="mc-btn mc-play" data-action="toggle">${this.audio.paused ? '▶' : '⏸'}</button>`;
        html += '<button class="mc-btn" data-action="next">⏭</button>';
        html += '</div>';

        // 进度条
        const pct = this.audio.duration ? (this.audio.currentTime / this.audio.duration * 100) : 0;
        const curStr = this.fmtTime(this.audio.currentTime || 0);
        const durStr = this.audio.duration ? this.fmtTime(this.audio.duration) : '--:--';
        html += `<div id="music-progress-wrap" data-action="seek">`;
        html += `<div id="music-progress-bar"><div id="music-progress-fill" style="width:${pct}%"></div></div>`;
        html += `<div id="music-time">${curStr} / ${durStr}</div>`;
        html += `</div>`;

        html += '</div>'; // player-bar

        panel.innerHTML = html;
    },

    updateProgress() {
        const fill = document.getElementById('music-progress-fill');
        const time = document.getElementById('music-time');
        if (fill && this.audio.duration) {
            fill.style.width = (this.audio.currentTime / this.audio.duration * 100) + '%';
        }
        if (time) {
            time.textContent = this.fmtTime(this.audio.currentTime) + ' / ' + this.fmtTime(this.audio.duration || 0);
        }
        // 更新播放按钮
        const btn = document.querySelector('.mc-play');
        if (btn) btn.textContent = this.audio.paused ? '▶' : '⏸';
    },

    fmtTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    },

    esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    },

    reset() {
        this.unlocked = {};
        this.currentSong = null;
        this.playlist = [];
        this.playlistIndex = -1;
        this.audio.pause();
        this.audio.src = '';
        this.isPlaying = false;
        this.renderPanel();
    },

    // 事件委托处理点击
    handleClick(e) {
        // 进度条
        const progress = e.target.closest('#music-progress-wrap');
        if (progress) { this.seek(e); return; }
        // 控制按钮
        const btn = e.target.closest('.mc-btn');
        if (btn) {
            const action = btn.dataset.action;
            if (action === 'prev') this.prev();
            else if (action === 'next') this.next();
            else if (action === 'toggle') this.togglePlay();
            return;
        }
        // 歌曲项
        const songEl = e.target.closest('.music-song-item');
        if (songEl) {
            const file = songEl.dataset.file;
            const char = songEl.dataset.char;
            const title = songEl.dataset.title;
            if (file) this.play({ char, title, file });
        }
    },
};
