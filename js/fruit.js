// js/fruit.js — 水果等级数据定义（11级）

const FRUITS = [
    { level: 0,  name: 'cayunxunyin', radius: 28,  img: 'img/avatars/cayunxunyin.png', lihui: 'img/lihui/cayunxunyin.png', score: 1,  music: 'chayunxunyin' },
    { level: 1,  name: 'sion',        radius: 36,  img: 'img/avatars/sion.png',        lihui: 'img/lihui/sion.png',        score: 2,  music: 'sion' },
    { level: 2,  name: 'kafu',        radius: 45,  img: 'img/avatars/kafu.png',        lihui: 'img/lihui/kafu.jpg',        score: 3,  music: 'kafu' },
    { level: 3,  name: 'rikka',       radius: 55,  img: 'img/avatars/rikka.png',       lihui: 'img/lihui/rikka.jpg',       score: 4,  music: 'rikka' },
    { level: 4,  name: 'gumi',        radius: 65,  img: 'img/avatars/gumi.png',        lihui: 'img/lihui/gumi.jpeg',       score: 5,  music: 'gumi' },
    { level: 5,  name: 'rei',         radius: 76,  img: 'img/avatars/rei.png',         lihui: 'img/lihui/rei.png',         score: 6,  music: 'rei' },
    { level: 6,  name: 'luka',        radius: 88,  img: 'img/avatars/luka.png',        lihui: 'img/lihui/luka.png',        score: 7,  music: 'luka' },
    { level: 7,  name: 'uta',         radius: 100, img: 'img/avatars/uta.png',         lihui: 'img/lihui/uta.jpg',         score: 8,  music: 'uta' },
    { level: 8,  name: 'teto',        radius: 113, img: 'img/avatars/teto.png',        lihui: 'img/lihui/teto.png',        score: 9,  music: 'teto' },
    { level: 9,  name: 'rin',         radius: 128, img: 'img/avatars/rin.png',         lihui: 'img/lihui/rin.png',         score: 10, music: 'rin' },
    { level: 10, name: 'miku',        radius: 150, img: 'img/avatars/miku.png',        lihui: 'img/lihui/miku.png',        score: 15, music: 'miku' },
];

const MAX_LEVEL = 10;
const INITIAL_FRUIT_MAX = 3;
const LATER_FRUIT_MAX = 5;

function getNextFruitLevel(dropCount) {
    if (dropCount < 2) return 0;
    if (dropCount < 5) return Math.floor(Math.random() * (INITIAL_FRUIT_MAX + 1));
    return Math.floor(Math.random() * (LATER_FRUIT_MAX + 1));
}
