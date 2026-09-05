"use strict";
const CONFIG = {
    relationshipDate: "2026-03-31T00:00:00",
    typingSpeed: 35,
    revealOffset: 0.15,
    shootingStarInterval: 6000,
    rosePetalInterval: 250,
    heartTrailInterval: 45,
};
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const loader = $("#loader");
const loadingFill = $(".loading-fill");
const hero = $("#hero");
const envelope = $("#envelope");
const envelopeContainer = $("#envelopeContainer");
const book = $("#book");
const typewriter = $("#typewriter");
const celebrateBtn = $("#celebrateBtn");
const proposalBtn = $("#yesBtn");
const giftBox = $(".gift-box");
const playPause = $("#playPause");
const starsCanvas = $("#stars");
const nebulaCanvas = $("#nebula");
const fireworksCanvas = $("#fireworks");
const petalsCanvas = $("#petals");
const state = {
    loaded: false,
    bookOpened: false,
    typingFinished: false,
    audioPlaying: false,
    galleryIndex: 0,
    relationshipStart: new Date(CONFIG.relationshipDate),
};

/*
 * Persistent user uploads
 * -----------------------
 * Uploaded photos and songs are stored as Blobs in IndexedDB. Unlike
 * URL.createObjectURL(file), the data survives page reloads and browser restarts.
 * It is still local to this browser/device, not synced to other devices.
 */
const UPLOAD_DB_NAME = "our-love-story-uploads";
const UPLOAD_DB_VERSION = 1;
const UPLOAD_STORE = "files";

function openUploadDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB is not supported by this browser."));
            return;
        }

        const request = indexedDB.open(UPLOAD_DB_NAME, UPLOAD_DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(UPLOAD_STORE)) {
                db.createObjectStore(UPLOAD_STORE, { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not open upload storage."));
    });
}

async function saveUploadedFile(kind, file, extra = {}) {
    const db = await openUploadDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(UPLOAD_STORE, "readwrite");
        tx.objectStore(UPLOAD_STORE).add({
            kind,
            name: file.name,
            type: file.type,
            blob: file,
            createdAt: Date.now(),
            ...extra
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error || new Error("Could not save upload.")); };
    });
}

async function getUploadedFiles(kind) {
    const db = await openUploadDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(UPLOAD_STORE, "readonly");
        const request = tx.objectStore(UPLOAD_STORE).getAll();
        request.onsuccess = () => {
            const items = request.result
                .filter(item => item.kind === kind)
                .sort((a, b) => a.createdAt - b.createdAt);
            db.close();
            resolve(items);
        };
        request.onerror = () => { db.close(); reject(request.error || new Error("Could not read upload storage.")); };
    });
}

async function restoreUploadedContent() {
    try {
        const [savedPhotos, savedSongs] = await Promise.all([
            getUploadedFiles("photo"),
            getUploadedFiles("music")
        ]);

        // Restore photos
        if (galleryGrid) {
            savedPhotos.forEach((item, index) => {
                const url = URL.createObjectURL(item.blob);
                const card = document.createElement("div");
                card.className = "photo-card new-memory persistent-memory";
                card.dataset.caption = item.caption || `Saved Memory ${index + 1} 💞`;
                card.innerHTML = `
                    <img src="${url}" alt="${escapeHtml(card.dataset.caption)}">
                    <div class="photo-overlay">
                        <small>SAVED MEMORY</small>
                        <span>${escapeHtml(card.dataset.caption)}</span>
                    </div>
                `;
                galleryGrid.appendChild(card);
            });
            refreshGallery();
        }

        // Restore songs
        savedSongs.forEach((item) => {
            playlist.push({
                title: item.title || item.name.replace(/\.[^/.]+$/, ""),
                artist: item.artist || "My Music",
                album: item.album || "My Uploaded Music",
                cover: "images/music1.jpg",
                src: URL.createObjectURL(item.blob),
                persistent: true
            });
        });
        renderPlaylist();
    } catch (error) {
        console.warn("Saved uploads could not be restored:", error);
    }
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}
const LETTER = `My Dearest Babie,

Happy 5th Monthsary, MARGA. ❤️

Wow 5th Mot2x na pala naten grabe ang bilis lang thank you so muchhh sa tanan2 gina himo nimo sa akoa

I really appreciate your hard work, your studies, your dedication sa lahat2. I know daghan pa kaayo ko matutunan sa imoha and I'm sorry if dungol jud ko pero

I'm really Loveeee youu so muchh 5 moths muna den pala ako pinapa saya pina pa kiligg pinapa encourage sa tanan bagay

I'm always here on your side to be your number one fan to be your BFF to be your supportive BF sa tanan bagay gusto mo

I know na daghan man jud ta misunderstanding but I always lovee youu and I know jud na naa kay challenges ron pero naa lang jud ko diri para makinig mag cheer up sa imoha

and maging protector mo sa tanan I can't believe na mag uyab ta HAHAHHAHA well na love struck jud ko sa imoha dahil sa how wonderful you are as a person I'm 1000x na jud inlab sa imoha sheesh lang naten yan HA

I really want to see you smile to be happy and to be successful sa life jud babieee we gonna take this challenge jud daghan pata memories daghan pata adventure and daghan pajud ta

Dream sa our lifee I really want to see you in the aisle jud babiee LOVEEEE YOUUU SO MUCHHHH MY BABIEEE

Forever yours,
Bern ❤️`;
function random(min, max) {
    return Math.random() * (max - min) + min;
}
function randomInt(min, max) {
    return Math.floor(random(min, max));
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function createElement(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
}
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function pad(number) {
    return String(number).padStart(2, "0");
}
document.addEventListener("DOMContentLoaded", () => {
    initialize();
});
async function initialize() {
    setupLoader();
    setupRevealElements();
    setupResize();
}
function setupResize() {
    window.addEventListener("resize", () => {});
}
function setupRevealElements() {
    $$("section").forEach((section) => {
        section.classList.add("reveal");
    });
}
function setupLoader() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += random(3, 8);
        progress = clamp(progress, 0, 100);
        if (loadingFill) {
            loadingFill.style.width = progress + "%";
        }
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(finishLoading, 800);
        }
    }, 120);
}
function finishLoading() {
    state.loaded = true;
    if (loader) {
        loader.classList.add("hide");
        setTimeout(() => {
            loader.style.display = "none";
        }, 1000);
    }
    playEntranceAnimation();
}
function playEntranceAnimation() {
    document.body.classList.add("loaded");
    fadeHero();
    revealVisibleSections();
}
function fadeHero() {
    if (!hero) return;
    hero.animate(
        [
            { opacity: 0, transform: "translateY(40px)" },
            { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 1200, easing: "ease-out", fill: "forwards" },
    );
}
function revealVisibleSections() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("show");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: CONFIG.revealOffset },
    );
    $$(".reveal").forEach((section) => {
        observer.observe(section);
    });
}
function smoothScroll(target) {
    const element =
        typeof target === "string" ? document.querySelector(target) : target;
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
}
document.addEventListener("click", (event) => {
    const target = event.target;
    if (target.matches("[data-scroll]")) {
        event.preventDefault();
        smoothScroll(target.dataset.scroll);
    }
});
if (envelopeContainer) {
    envelopeContainer.addEventListener("click", () => {
        if (!envelope.classList.contains("open")) {
            envelope.classList.add("open");
            setTimeout(() => {
                smoothScroll("#letterSection");
            }, 1000);
        }
    });
}
const openLetterBtn = $("#openLetter");
if (openLetterBtn) {
    openLetterBtn.addEventListener("click", () => {
        envelope.classList.add("open");
        setTimeout(() => smoothScroll("#letterSection"), 1000);
    });
}
const scrollLetterBtn = $("#scrollLetter");
if (scrollLetterBtn) {
    scrollLetterBtn.addEventListener("click", () =>
        smoothScroll("#letterSection"),
    );
}
const playMusicBtn = $("#playMusic");
if (playMusicBtn) {
    playMusicBtn.addEventListener("click", () => toggleMusic());
}
function fadeIn(element, duration = 800) {
    if (!element) return;
    element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration,
        easing: "ease-out",
        fill: "forwards",
    });
}
function pop(element) {
    if (!element) return;
    element.animate(
        [
            { transform: "scale(.8)" },
            { transform: "scale(1.08)" },
            { transform: "scale(1)" },
        ],
        { duration: 350, easing: "ease-out" },
    );
}
function shake(element) {
    if (!element) return;
    element.animate(
        [
            { transform: "translateX(0)" },
            { transform: "translateX(-6px)" },
            { transform: "translateX(6px)" },
            { transform: "translateX(-4px)" },
            { transform: "translateX(4px)" },
            { transform: "translateX(0)" },
        ],
        { duration: 450 },
    );
}
const counterMap = {
    years: $("#years"),
    months: $("#months"),
    days: $("#days"),
    hours: $("#hours"),
    minutes: $("#minutes"),
    seconds: $("#seconds"),
};
function updateLoveTimer() {
    const now = new Date();
    const diff = now - state.relationshipStart;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (counterMap.years) counterMap.years.textContent = pad(years);
    if (counterMap.months) counterMap.months.textContent = pad(months);
    if (counterMap.days) counterMap.days.textContent = pad(days % 30);
    if (counterMap.hours) counterMap.hours.textContent = pad(hours % 24);
    if (counterMap.minutes) counterMap.minutes.textContent = pad(minutes % 60);
    if (counterMap.seconds) counterMap.seconds.textContent = pad(seconds % 60);
}
setInterval(updateLoveTimer, 1000);
updateLoveTimer();
function openBook() {
    if (state.bookOpened) return;
    state.bookOpened = true;
    if (book) {
        book.classList.add("open");
    }
    setTimeout(startTypewriter, 800);
}
if (book) {
    book.addEventListener("click", openBook);
}
let typingIndex = 0;
async function startTypewriter() {
    if (state.typingFinished) return;
    state.typingFinished = true;
    if (!typewriter) return;
    typewriter.innerHTML = "";
    while (typingIndex < LETTER.length) {
        typewriter.innerHTML += LETTER.charAt(typingIndex);
        typingIndex++;
        await wait(CONFIG.typingSpeed);
        typewriter.scrollTop = typewriter.scrollHeight;
    }
}
const letterObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                openBook();
                letterObserver.disconnect();
            }
        });
    },
    { threshold: 0.45 },
);
if ($("#letterSection")) {
    letterObserver.observe($("#letterSection"));
}
function createLetterPetal() {
    if (!book) return;
    const petal = createElement("div", "page-petal");
    petal.innerHTML = "🌸";
    petal.style.left = random(0, 100) + "%";
    petal.style.bottom = "-40px";
    petal.style.animationDuration = random(8, 14) + "s";
    petal.style.fontSize = random(14, 26) + "px";
    book.appendChild(petal);
    setTimeout(() => {
        petal.remove();
    }, 14000);
}
setInterval(createLetterPetal, 1800);
function pulseBook() {
    if (!book) return;
    book.animate(
        [
            { transform: "scale(1)" },
            { transform: "scale(1.01)" },
            { transform: "scale(1)" },
        ],
        { duration: 4000, iterations: Infinity, easing: "ease-in-out" },
    );
}
pulseBook();
async function celebrateLetterFinished() {
    while (!state.typingFinished) {
        await wait(500);
    }
    if (!typewriter) return;
    typewriter.animate([{ opacity: 0.9 }, { opacity: 1 }, { opacity: 0.95 }], {
        duration: 2500,
        iterations: Infinity,
    });
}
celebrateLetterFinished();
const galaxy = {
    canvas: starsCanvas,
    ctx: null,
    width: 0,
    height: 0,
    stars: [],
    maxStars: 300,
    animationId: null,
};
class Star {
    constructor() {
        this.reset(true);
    }
    reset(initial = false) {
        this.x = Math.random() * galaxy.width;
        this.y = initial ? Math.random() * galaxy.height : -20;
        this.radius = random(0.4, 2.2);
        this.speed = random(0.05, 0.35);
        this.alpha = random(0.2, 1);
        this.twinkle = random(0.01, 0.05);
        this.direction = Math.random() > 0.5 ? 1 : -1;
    }
    update() {
        this.y += this.speed;
        this.alpha += this.twinkle * this.direction;
        if (this.alpha >= 1) {
            this.direction = -1;
        }
        if (this.alpha <= 0.2) {
            this.direction = 1;
        }
        if (this.y > galaxy.height + 10) {
            this.reset();
        }
    }
    draw() {
        galaxy.ctx.beginPath();
        galaxy.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        galaxy.ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
        galaxy.ctx.fill();
    }
}
function initGalaxy() {
    if (!starsCanvas) return;
    galaxy.ctx = starsCanvas.getContext("2d");
    resizeGalaxy();
    createStars();
    animateGalaxy();
}
function createStars() {
    galaxy.stars.length = 0;
    for (let i = 0; i < galaxy.maxStars; i++) {
        galaxy.stars.push(new Star());
    }
}
function resizeGalaxy() {
    galaxy.width = window.innerWidth;
    galaxy.height = window.innerHeight;
    starsCanvas.width = galaxy.width;
    starsCanvas.height = galaxy.height;
}
window.addEventListener("resize", resizeGalaxy);
function drawGalaxyBackground() {
    const ctx = galaxy.ctx;
    ctx.clearRect(0, 0, galaxy.width, galaxy.height);
    const gradient = ctx.createRadialGradient(
        galaxy.width * 0.5,
        galaxy.height * 0.4,
        50,
        galaxy.width * 0.5,
        galaxy.height * 0.4,
        galaxy.width,
    );
    gradient.addColorStop(0, "rgba(110,60,255,.22)");
    gradient.addColorStop(0.45, "rgba(255,70,170,.10)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, galaxy.width, galaxy.height);
}
document.addEventListener("DOMContentLoaded", () => {
    initGalaxy();
});
function setupHiDPI() {
    if (!starsCanvas) return;
    const ratio = window.devicePixelRatio || 1;
    starsCanvas.width = galaxy.width * ratio;
    starsCanvas.height = galaxy.height * ratio;
    starsCanvas.style.width = galaxy.width + "px";
    starsCanvas.style.height = galaxy.height + "px";
    galaxy.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
function updateStars() {
    for (let i = 0; i < galaxy.stars.length; i++) {
        galaxy.stars[i].update();
    }
}
function drawStars() {
    for (let i = 0; i < galaxy.stars.length; i++) {
        galaxy.stars[i].draw();
    }
}
function drawGalaxyGlow() {
    const ctx = galaxy.ctx;
    const glow = ctx.createRadialGradient(
        galaxy.width * 0.25,
        galaxy.height * 0.3,
        0,
        galaxy.width * 0.25,
        galaxy.height * 0.3,
        350,
    );
    glow.addColorStop(0, "rgba(255,90,180,.10)");
    glow.addColorStop(0.4, "rgba(120,120,255,.05)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, galaxy.width, galaxy.height);
}
let previousTime = 0;
const FPS = 60;
const frameTime = 1000 / FPS;
function animateGalaxy(timestamp = 0) {
    galaxy.animationId = requestAnimationFrame(animateGalaxy);
    const delta = timestamp - previousTime;
    if (delta < frameTime) return;
    previousTime = timestamp;
    drawGalaxyBackground();
    drawGalaxyGlow();
    updateStars();
    drawStars();
}
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        cancelAnimationFrame(galaxy.animationId);
    } else {
        animateGalaxy();
    }
});
window.addEventListener("resize", () => {
    resizeGalaxy();
    setupHiDPI();
    createStars();
});
document.addEventListener("DOMContentLoaded", () => {
    resizeGalaxy();
    setupHiDPI();
    createStars();
    animateGalaxy();
});
const shootingStars = [];
class ShootingStar {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = random(-200, galaxy.width);
        this.y = random(0, galaxy.height * 0.4);
        this.length = random(180, 350);
        this.speed = random(18, 30);
        this.life = 0;
        this.maxLife = random(35, 60);
        this.angle = Math.PI / 4;
        this.opacity = 1;
    }
    update() {
        this.life++;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.opacity = 1 - this.life / this.maxLife;
    }
    draw() {
        const ctx = galaxy.ctx;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        const gradient = ctx.createLinearGradient(
            this.x,
            this.y,
            this.x - this.length,
            this.y - this.length,
        );
        gradient.addColorStop(0, "white");
        gradient.addColorStop(0.3, "#ffb6e6");
        gradient.addColorStop(1, "transparent");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.length, this.y - this.length);
        ctx.stroke();
        ctx.restore();
    }
    dead() {
        return this.life >= this.maxLife;
    }
}
function spawnShootingStar() {
    shootingStars.push(new ShootingStar());
}
setInterval(spawnShootingStar, CONFIG.shootingStarInterval);
function updateShootingStars() {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        shootingStars[i].update();
        shootingStars[i].draw();
        if (shootingStars[i].dead()) {
            shootingStars.splice(i, 1);
        }
    }
}
let nebulaTime = 0;
function drawNebula() {
    const ctx = galaxy.ctx;
    nebulaTime += 0.002;
    const x = galaxy.width * 0.5 + Math.sin(nebulaTime) * 120;
    const y = galaxy.height * 0.35 + Math.cos(nebulaTime * 0.7) * 80;
    const gradient = ctx.createRadialGradient(x, y, 40, x, y, 500);
    gradient.addColorStop(0, "rgba(255,80,180,.18)");
    gradient.addColorStop(0.35, "rgba(140,120,255,.10)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, galaxy.width, galaxy.height);
}
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
function applyParallax() {
    const percentX = mouse.x / galaxy.width - 0.5;
    const percentY = mouse.y / galaxy.height - 0.5;
    galaxy.ctx.save();
    galaxy.ctx.translate(percentX * 15, percentY * 15);
}
function endParallax() {
    galaxy.ctx.restore();
}
animateGalaxy = function (time = 0) {
    galaxy.animationId = requestAnimationFrame(animateGalaxy);
    const delta = time - previousTime;
    if (delta < frameTime) return;
    previousTime = time;
    drawGalaxyBackground();
    applyParallax();
    drawNebula();
    updateStars();
    drawStars();
    updateShootingStars();
    endParallax();
};
setTimeout(() => {
    spawnShootingStar();
}, 2000);
const musicPlayer = document.getElementById("musicPlayer");
const coverImage = document.querySelector(".music-cover img");
const coverContainer = document.querySelector(".music-cover");
const songTitle = document.getElementById("songTitle");
const artistName = document.getElementById("artistName");
const playBtn = document.getElementById("playPause");
const prevBtn = document.getElementById("prevSong");
const nextBtn = document.getElementById("nextSong");
const playlist = [
    { title: "Music 1", artist: "My Music", album: "My Album 1", cover: "images/music1.jpg", src: "music/music1.mp3" },
    { title: "Music 2", artist: "My Music", album: "My Album 2", cover: "images/music2.jpg", src: "music/music2.mp3" },
    { title: "Music 3", artist: "My Music", album: "My Album 3", cover: "images/music3.jpg", src: "music/music3.mp3" },
    { title: "Music 4", artist: "My Music", album: "My Album 4", cover: "images/music4.jpg", src: "music/music4.mp3" },
    { title: "Music 5", artist: "My Music", album: "My Album 5", cover: "images/music5.jpg", src: "music/music5.mp3" },
	{ title: "Music 6", artist: "My Music", album: "My Album 6", cover: "images/music6.jpg", src: "music/music6.mp3" }
];
let currentSong = 0;
const player = new Audio();
player.preload = "auto";
player.volume = 0.8;
function loadSong(index) {
    currentSong = index;
    const song = playlist[currentSong];
    player.src = song.src;
    if (songTitle) songTitle.textContent = song.title;
    if (artistName) artistName.textContent = song.artist;
    if (coverImage) coverImage.src = song.cover;
}
loadSong(currentSong);
function playSong() {
    const playPromise = player.play();
    if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
            state.audioPlaying = false;
            if (playBtn) playBtn.innerHTML = "▶";
            if (coverContainer) coverContainer.classList.remove("playing");
        });
    }
    state.audioPlaying = true;
    if (playBtn) playBtn.innerHTML = "❚❚";
    if (coverContainer) coverContainer.classList.add("playing");
    if (playBtn) pop(playBtn);
}
function pauseSong() {
    player.pause();
    state.audioPlaying = false;
    if (playBtn) playBtn.innerHTML = "▶";
    if (coverContainer) coverContainer.classList.remove("playing");
}
function toggleMusic() {
    if (state.audioPlaying) {
        pauseSong();
    } else {
        playSong();
    }
}
function nextSong() {
    currentSong++;
    if (currentSong >= playlist.length) {
        currentSong = 0;
    }
    loadSong(currentSong);
    playSong();
}
function previousSong() {
    currentSong--;
    if (currentSong < 0) {
        currentSong = playlist.length - 1;
    }
    loadSong(currentSong);
    playSong();
}
if (playBtn) {
    playBtn.addEventListener("click", toggleMusic);
}
if (nextBtn) {
    nextBtn.addEventListener("click", nextSong);
}
if (prevBtn) {
    prevBtn.addEventListener("click", previousSong);
}
player.addEventListener("ended", nextSong);
const minimizeBtn = document.getElementById("minimizeBtn");
if (minimizeBtn && musicPlayer) {
    minimizeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        musicPlayer.classList.toggle("minimized");
        const isMin = musicPlayer.classList.contains("minimized");
        minimizeBtn.textContent = isMin ? "□" : "─";
        minimizeBtn.title = isMin ? "Expand" : "Minimize";
    });
}
if (coverContainer) {
    coverContainer.addEventListener("mouseenter", () => {
        coverContainer.style.transform = "scale(1.08) rotate(4deg)";
    });
    coverContainer.addEventListener("mouseleave", () => {
        coverContainer.style.transform = "";
    });
}
function fadeInMusic() {
    player.volume = 0;
    playSong();
    let v = 0;
    const fade = setInterval(() => {
        v += 0.02;
        player.volume = v;
        if (v >= 0.8) {
            player.volume = 0.8;
            clearInterval(fade);
        }
    }, 120);
}

const playlistList = document.getElementById("playlistList");
const musicUploader = document.getElementById("musicUploader");

function renderPlaylist() {
    if (!playlistList) return;
    playlistList.innerHTML = "";
    playlist.forEach((song, index) => {
        const item = document.createElement("div");
        item.className = `separate-music-item ${index === currentSong ? "active" : ""}`;
        item.innerHTML = `
            <img class="separate-music-cover" src="${song.cover}" alt="${song.title} album cover">
            <div class="separate-music-copy">
                <div class="separate-music-label">${song.album || "Our Music"}</div>
                <h3 class="separate-music-title">${song.title}</h3>
                <p class="separate-music-artist">${song.artist}</p>
            </div>
            <button class="separate-music-play" type="button" aria-label="Play ${song.title}">${index === currentSong && state.audioPlaying ? "❚❚" : "▶"}</button>
        `;
        const play = item.querySelector(".separate-music-play");
        play.addEventListener("click", (event) => {
            event.stopPropagation();
            if (index === currentSong) {
                toggleMusic();
            } else {
                loadSong(index);
                playSong();
            }
            renderPlaylist();
        });
        item.addEventListener("click", () => {
            if (index !== currentSong) {
                loadSong(index);
                playSong();
                renderPlaylist();
            }
        });
        playlistList.appendChild(item);
    });
}
renderPlaylist();

musicUploader?.addEventListener("change", async (event) => {
    const files = [...event.target.files].filter(file => file.type.startsWith("audio/"));
    let savedCount = 0;

    for (const file of files) {
        const title = file.name.replace(/\.[^/.]+$/, "");
        try {
            await saveUploadedFile("music", file, {
                title,
                artist: "My Music",
                album: "My Uploaded Music"
            });

            playlist.push({
                title,
                artist: "My Music",
                album: "My Uploaded Music",
                cover: "images/music1.jpg",
                src: URL.createObjectURL(file),
                persistent: true
            });
            savedCount++;
        } catch (error) {
            console.error("Could not save song:", error);
        }
    }

    renderPlaylist();
    if (savedCount) showToast(`${savedCount} song${savedCount === 1 ? "" : "s"} saved permanently on this browser! 🎧`);
    event.target.value = "";
});

const originalLoadSong = loadSong;
loadSong = function(index) {
    originalLoadSong(index);
    renderPlaylist();
};
const progress = document.querySelector(".progress");
const progressFill = document.querySelector(".progress-fill");
const currentTimeLabel = document.getElementById("currentTime");
const durationLabel = document.getElementById("duration");
const volumeSlider = document.querySelector(".volume-slider");
const equalizerBars = document.querySelectorAll(".equalizer span");
function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${String(sec).padStart(2, "0")}`;
}
function updateProgress() {
    if (!player.duration) return;
    const percent = (player.currentTime / player.duration) * 100;
    if (progressFill) {
        progressFill.style.width = percent + "%";
    }
    if (currentTimeLabel) {
        currentTimeLabel.textContent = formatTime(player.currentTime);
    }
    if (durationLabel) {
        durationLabel.textContent = formatTime(player.duration);
    }
}
player.addEventListener("timeupdate", updateProgress);
player.addEventListener("loadedmetadata", updateProgress);
if (progress) {
    progress.addEventListener("click", (e) => {
        if (!player.duration) return;
        const rect = progress.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        player.currentTime = player.duration * percent;
    });
}
if (volumeSlider) {
    volumeSlider.value = player.volume * 100;
    volumeSlider.addEventListener("input", () => {
        player.volume = volumeSlider.value / 100;
    });
}
let equalizerAnimation = null;
function startEqualizer() {
    stopEqualizer();
    equalizerAnimation = setInterval(() => {
        equalizerBars.forEach((bar) => {
            bar.style.height = randomInt(8, 22) + "px";
        });
    }, 180);
}
function stopEqualizer() {
    clearInterval(equalizerAnimation);
    equalizerBars.forEach((bar) => {
        bar.style.height = "8px";
    });
}
player.addEventListener("play", startEqualizer);
player.addEventListener("pause", stopEqualizer);
document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    switch (e.code) {
        case "Space":
            e.preventDefault();
            toggleMusic();
            break;
        case "ArrowRight":
            nextSong();
            break;
        case "ArrowLeft":
            previousSong();
            break;
        case "KeyM":
            player.muted = !player.muted;
            break;
    }
});
let repeatMode = false;
function toggleRepeat() {
    repeatMode = !repeatMode;
    player.loop = repeatMode;
}
function shuffleSong() {
    let next = currentSong;
    while (next === currentSong) {
        next = randomInt(0, playlist.length);
    }
    loadSong(next);
    playSong();
}
player.addEventListener("play", () => {
    musicPlayer?.classList.add("playing");
});
player.addEventListener("pause", () => {
    musicPlayer?.classList.remove("playing");
});
updateProgress();

const galleryGrid = document.getElementById("galleryGrid");
const memoryCount = document.getElementById("memoryCount");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxCounter = document.getElementById("lightboxCounter");
const closeLightbox = document.querySelector(".lightbox-close");
const nextImageBtn = document.querySelector(".lightbox-next");
const prevImageBtn = document.querySelector(".lightbox-prev");
const photoUploader = document.getElementById("photoUploader");
const shuffleMemories = document.getElementById("shuffleMemories");

let gallery = [];
let slideshow = null;

function refreshGallery() {
    gallery = [];
    $$(".photo-card").forEach((card, index) => {
        const img = card.querySelector("img");
        const caption = card.dataset.caption || card.querySelector("span")?.textContent || `Memory ${index + 1}`;
        if (!img) return;
        gallery.push({ src: img.src, caption });
        card.dataset.index = gallery.length - 1;
    });
    if (memoryCount) memoryCount.textContent = `${gallery.length} memories`;
    bindGalleryCards();
}

function bindGalleryCards() {
    $$(".photo-card").forEach((card) => {
        if (card.dataset.bound === "1") return;
        card.dataset.bound = "1";

        card.addEventListener("click", () => openLightbox(Number(card.dataset.index)));

        card.addEventListener("mouseenter", () => {
            const rect = card.getBoundingClientRect();
            for (let i = 0; i < 5; i++) {
                setTimeout(() => createHeart(
                    rect.left + random(0, rect.width),
                    rect.top + random(0, rect.height)
                ), i * 120);
            }
        });

        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            card.style.transform =
                `perspective(1000px) rotateX(${(0.5 - y) * 12}deg) rotateY(${(x - 0.5) * 12}deg) scale(1.035)`;
        });
        card.addEventListener("mouseleave", () => card.style.transform = "");
    });
}

function openLightbox(index) {
    if (!gallery.length) return;
    state.galleryIndex = (index + gallery.length) % gallery.length;
    const photo = gallery[state.galleryIndex];
    lightboxImage.src = photo.src;
    lightboxCaption.textContent = photo.caption;
    lightboxCounter.textContent = `${state.galleryIndex + 1} / ${gallery.length}`;
    lightbox.classList.add("show");
    document.body.style.overflow = "hidden";
    fadeIn(lightboxImage, 250);
}

function closeGallery() {
    lightbox.classList.remove("show");
    document.body.style.overflow = "";
    stopSlideshow();
}

function nextImage() {
    if (!gallery.length) return;
    openLightbox(state.galleryIndex + 1);
}
function previousImage() {
    if (!gallery.length) return;
    openLightbox(state.galleryIndex - 1);
}

closeLightbox?.addEventListener("click", closeGallery);
nextImageBtn?.addEventListener("click", nextImage);
prevImageBtn?.addEventListener("click", previousImage);

lightbox?.addEventListener("click", (e) => {
    if (e.target === lightbox) closeGallery();
});

document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("show")) return;
    if (e.key === "Escape") closeGallery();
    if (e.key === "ArrowRight") nextImage();
    if (e.key === "ArrowLeft") previousImage();
});

function startSlideshow() {
    stopSlideshow();
    slideshow = setInterval(() => {
        if (lightbox.classList.contains("show")) nextImage();
    }, 4500);
}
function stopSlideshow() {
    if (slideshow) clearInterval(slideshow);
    slideshow = null;
}

lightbox?.addEventListener("mouseenter", stopSlideshow);
lightbox?.addEventListener("mouseleave", startSlideshow);

shuffleMemories?.addEventListener("click", () => {
    if (!gallery.length) return;
    const randomIndex = randomInt(0, gallery.length);
    openLightbox(randomIndex);
    pop(shuffleMemories);
});

photoUploader?.addEventListener("change", async (event) => {
    const files = [...event.target.files].filter(file => file.type.startsWith("image/"));
    let savedCount = 0;

    for (const file of files) {
        const caption = `New Memory ${gallery.length + savedCount + 1} 💞`;
        try {
            await saveUploadedFile("photo", file, { caption });

            const url = URL.createObjectURL(file);
            const card = document.createElement("div");
            card.className = "photo-card new-memory persistent-memory";
            card.dataset.caption = caption;
            card.innerHTML = `
                <img src="${url}" alt="${escapeHtml(caption)}">
                <div class="photo-overlay">
                    <small>SAVED MEMORY</small>
                    <span>${escapeHtml(caption)}</span>
                </div>
            `;
            galleryGrid?.appendChild(card);
            savedCount++;
        } catch (error) {
            console.error("Could not save photo:", error);
        }
    }

    refreshGallery();
    event.target.value = "";
    if (savedCount) showToast(`${savedCount} ${savedCount === 1 ? "memory" : "memories"} saved permanently on this browser! 💗`);
});

refreshGallery();
restoreUploadedContent();

function createHeart(x, y) {
    const heart = document.createElement("div");
    heart.className = "cursor-heart";
    heart.innerHTML = "💖";
    heart.style.left = x + "px";
    heart.style.top = y + "px";
    heart.style.fontSize = randomInt(14, 28) + "px";
    document.body.appendChild(heart);
    setTimeout(() => {
        heart.remove();
    }, 1200);
}
function createSparkle() {
    if (!lightbox.classList.contains("show")) return;
    const sparkle = document.createElement("div");
    sparkle.className = "sparkle";
    sparkle.innerHTML = "✨";
    const imgRect = lightboxImage.getBoundingClientRect();
    sparkle.style.left = imgRect.left + random(0, imgRect.width) + "px";
    sparkle.style.top = imgRect.top + random(0, imgRect.height) + "px";
    sparkle.style.position = "fixed";
    sparkle.style.pointerEvents = "none";
    sparkle.style.fontSize = randomInt(12, 24) + "px";
    sparkle.style.animation = "cursorHeart 1.4s forwards";
    document.body.appendChild(sparkle);
    setTimeout(() => {
        sparkle.remove();
    }, 1400);
}
setInterval(createSparkle, 300);
lightboxImage?.addEventListener("dblclick", (e) => {
    createHeart(e.clientX, e.clientY);
    pop(lightboxImage);
});
startSlideshow();
let lastHeartTime = 0;
document.addEventListener("mousemove", (e) => {
    const now = Date.now();
    if (now - lastHeartTime < CONFIG.heartTrailInterval) return;
    lastHeartTime = now;
    const heart = createElement("div", "cursor-heart");
    heart.innerHTML = Math.random() > 0.5 ? "💖" : "❤️";
    heart.style.left = e.clientX + "px";
    heart.style.top = e.clientY + "px";
    heart.style.fontSize = randomInt(12, 24) + "px";
    document.body.appendChild(heart);
    setTimeout(() => {
        heart.remove();
    }, 1200);
});

const reasons = [
    "Your smile makes my whole world brighter. 😊",
    "You make ordinary days feel magical. ✨",
    "You believe in me even when I doubt myself. 🫶",
    "You are my safe place and my favorite person. 🏡",
    "You make me laugh until my cheeks hurt. 😂",
    "I love how silly and sweet we can be together. 💕",
    "I love the way every memory feels warmer because you're in it. 🌷",
    "Most of all, I love that I get to choose you again today. ❤️"
];
let reasonIndex = 0;

function renderReason() {
    const num = document.getElementById("reasonNumber");
    const text = document.getElementById("reasonText");
    const dots = document.getElementById("reasonDots");
    if (!num || !text || !dots) return;
    num.textContent = `Reason #${reasonIndex + 1}`;
    text.textContent = reasons[reasonIndex];
    dots.innerHTML = reasons.map((_, i) =>
        `<span class="${i === reasonIndex ? "active" : ""}"></span>`
    ).join("");
    pop(document.getElementById("reasonOrb"));
}
document.getElementById("nextReason")?.addEventListener("click", () => {
    reasonIndex = (reasonIndex + 1) % reasons.length;
    renderReason();
});
renderReason();

const tinyToast = document.getElementById("tinyToast");
function showToast(message) {
    if (!tinyToast) return;
    tinyToast.textContent = message;
    tinyToast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => tinyToast.classList.remove("show"), 2400);
}
$$(".five-card").forEach(card => {
    card.addEventListener("click", () => {
        const message = card.dataset.message || "I love you. ❤️";
        showToast(message);
        card.classList.toggle("revealed");
        for (let i = 0; i < 6; i++) {
            setTimeout(() => createHeart(
                window.innerWidth / 2 + random(-80, 80),
                window.innerHeight / 2 + random(-40, 40)
            ), i * 90);
        }
    });
});

let meter = 0;
const loveMeterFill = document.getElementById("loveMeterFill");
const loveMeterValue = document.getElementById("loveMeterValue");
const meterMessage = document.getElementById("meterMessage");
const heartTap = document.getElementById("heartTap");
const meterMessages = [
    [0, "Starting with one little heartbeat…"],
    [25, "Okay… this is already getting serious. 🥹"],
    [50, "Halfway? Nah. My love is bigger than this. 💕"],
    [75, "The meter is struggling now. 😭❤️"],
    [90, "WARNING: too much love detected. 🚨💗"],
    [100, "METER BROKEN. I LOVE YOU MORE THAN 100%. ∞❤️"]
];
function renderMeter() {
    const shown = Math.min(meter, 100);
    if (loveMeterFill) loveMeterFill.style.width = `${shown}%`;
    if (loveMeterValue) loveMeterValue.textContent = meter > 100 ? "∞%" : `${shown}%`;
    const msg = [...meterMessages].reverse().find(([threshold]) => meter >= threshold);
    if (meterMessage && msg) meterMessage.textContent = msg[1];
}
heartTap?.addEventListener("click", () => {
    meter += randomInt(7, 16);
    pop(heartTap);
    if (meter >= 100) {
        meter = Math.min(meter, 135);
        if (meter > 100) {
            for (let i = 0; i < 18; i++) {
                setTimeout(() => createHeart(
                    window.innerWidth / 2 + random(-240, 240),
                    window.innerHeight / 2 + random(-120, 120)
                ), i * 50);
            }
        }
    }
    renderMeter();
});
renderMeter();

function createRosePetal() {
    const petal = createElement("div", "rose-petal");
    petal.innerHTML = ["🌹", "🌸", "💮", "🌺"][randomInt(0, 4)];
    petal.style.left = random(0, 100) + "vw";
    petal.style.animationDuration = random(8, 16) + "s";
    petal.style.fontSize = randomInt(18, 34) + "px";
    petal.style.opacity = random(0.45, 0.95);
    document.body.appendChild(petal);
    setTimeout(() => {
        petal.remove();
    }, 17000);
}
setInterval(createRosePetal, CONFIG.rosePetalInterval);
const scrollBar = document.createElement("div");
scrollBar.id = "scrollProgress";
scrollBar.style.position = "fixed";
scrollBar.style.top = "0";
scrollBar.style.left = "0";
scrollBar.style.height = "4px";
scrollBar.style.width = "0%";
scrollBar.style.zIndex = "999999";
scrollBar.style.background = "linear-gradient(90deg,#ff4da6,#9b5cff)";
document.body.appendChild(scrollBar);
window.addEventListener("scroll", () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const percent = (window.scrollY / total) * 100;
    scrollBar.style.width = percent + "%";
});
const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("show");
            }
        });
    },
    { threshold: 0.18 },
);
document.querySelectorAll(".reveal").forEach((el) => {
    revealObserver.observe(el);
});
function floatingHeart() {
    const heart = createElement("div", "floating-heart");
    heart.innerHTML = "💕";
    heart.style.left = random(0, 100) + "vw";
    heart.style.bottom = "-50px";
    heart.style.position = "fixed";
    heart.style.fontSize = randomInt(18, 36) + "px";
    heart.style.pointerEvents = "none";
    heart.style.animation = `cursorHeart ${random(5, 8)}s linear forwards`;
    document.body.appendChild(heart);
    setTimeout(() => {
        heart.remove();
    }, 9000);
}
setInterval(floatingHeart, 2200);
const fireworks = [];
class FireworkParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = random(-8, 8);
        this.vy = random(-8, 8);
        this.life = 100;
        this.size = random(2, 5);
        this.color = `hsl(${randomInt(0, 360)},100%,70%)`;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.08;
        this.life--;
    }
    draw() {
        const ctx = fireworksCanvas.getContext("2d");
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 100;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}
function launchFirework(x, y) {
    for (let i = 0; i < 80; i++) {
        fireworks.push(new FireworkParticle(x, y));
    }
}
const fwCtx = fireworksCanvas.getContext("2d");
function animateFireworks() {
    fwCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].draw();
        if (fireworks[i].life <= 0) {
            fireworks.splice(i, 1);
        }
    }
    requestAnimationFrame(animateFireworks);
}
function resizeFireworks() {
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
}
resizeFireworks();
window.addEventListener("resize", resizeFireworks);
animateFireworks();
function createConfetti() {
    const confetti = createElement("div", "confetti");
    confetti.style.position = "fixed";
    confetti.style.left = random(0, 100) + "vw";
    confetti.style.top = "-20px";
    confetti.style.width = "10px";
    confetti.style.height = "18px";
    confetti.style.background = `hsl(${randomInt(0, 360)},100%,65%)`;
    confetti.style.pointerEvents = "none";
    confetti.style.transform = `rotate(${randomInt(0, 360)}deg)`;
    confetti.style.animation = `petalFall ${random(3, 6)}s linear forwards`;
    document.body.appendChild(confetti);
    setTimeout(() => {
        confetti.remove();
    }, 7000);
}
giftBox?.addEventListener("click", () => {
    giftBox.classList.add("open");
    for (let i = 0; i < 120; i++) {
        setTimeout(createConfetti, i * 15);
    }
    launchFirework(window.innerWidth / 2, window.innerHeight / 2);
    pop(giftBox);
});
proposalBtn?.addEventListener("click", () => {
    pop(proposalBtn);
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            launchFirework(
                random(window.innerWidth * 0.2, window.innerWidth * 0.8),
                random(window.innerHeight * 0.15, window.innerHeight * 0.55),
            );
        }, i * 250);
    }
    for (let i = 0; i < 200; i++) {
        setTimeout(createConfetti, i * 8);
    }
    alert(
        `❤️\n\nHappy Monthsary!\n\nThank you for loving me.\n\nI promise to continue\nchoosing you every day.\n\nI love you forever.\n\n❤️`,
    );
});
celebrateBtn?.addEventListener("click", () => {
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            launchFirework(
                random(100, window.innerWidth - 100),
                random(80, window.innerHeight / 2),
            );
        }, i * 180);
    }
});
const endingScreen = document.getElementById("endingScreen");
const endingTitle = document.getElementById("endingTitle");
const endingMessage = document.getElementById("endingMessage");
const endingButton = document.getElementById("endingButton");
let heartRain = null;
function startHeartRain() {
    stopHeartRain();
    heartRain = setInterval(() => {
        const heart = createElement("div", "heart-rain");
        const hearts = ["❤️", "💖", "💕", "💗", "💘"];
        heart.innerHTML = hearts[randomInt(0, hearts.length)];
        heart.style.left = random(0, 100) + "vw";
        heart.style.top = "-40px";
        heart.style.position = "fixed";
        heart.style.fontSize = randomInt(18, 42) + "px";
        heart.style.pointerEvents = "none";
        heart.style.animation = `petalFall ${random(4, 8)}s linear forwards`;
        document.body.appendChild(heart);
        setTimeout(() => {
            heart.remove();
        }, 9000);
    }, 120);
}
function stopHeartRain() {
    clearInterval(heartRain);
}
function createAurora() {
    const aurora = createElement("div", "aurora-light");
    aurora.style.position = "fixed";
    aurora.style.inset = "0";
    aurora.style.pointerEvents = "none";
    aurora.style.background = `radial-gradient(circle at ${randomInt(10, 90)}% ${randomInt(10, 70)}%, rgba(255,80,180,.18), rgba(120,140,255,.08), transparent 70%)`;
    aurora.style.animation = "fadeAurora 6s linear forwards";
    document.body.appendChild(aurora);
    setTimeout(() => {
        aurora.remove();
    }, 6000);
}
setInterval(createAurora, 4000);
const endingText = `Happy 5th Monthsary, Babie. ❤️

Five months of laughs.
Five months of hugs.
Five months of memories.
And a whole future still waiting for us.

Thank you for choosing me.
I will keep choosing you.

No matter how many chapters we write,
my favorite chapter will always be the one where we're together.

I love you. Forever. ♾️❤️`;
async function typeEnding() {
    if (!endingMessage) return;
    endingMessage.innerHTML = "";
    for (let i = 0; i < endingText.length; i++) {
        endingMessage.innerHTML += endingText.charAt(i);
        await wait(35);
    }
}
function showEnding() {
    if (!endingScreen) return;
    endingScreen.classList.add("show");
    document.body.style.overflow = "hidden";
    startHeartRain();
    typeEnding();
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            launchFirework(
                random(100, window.innerWidth - 100),
                random(80, window.innerHeight * 0.5),
            );
        }, i * 250);
    }
}
async function fadeMusicOut() {
    if (!player) return;
    let volume = player.volume;
    while (volume > 0) {
        volume -= 0.02;
        player.volume = Math.max(volume, 0);
        await wait(120);
    }
    player.pause();
}
endingButton?.addEventListener("click", async () => {
    await fadeMusicOut();
    location.reload();
});
const footerEl = document.querySelector("footer");
if (footerEl) {
    const endObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setTimeout(showEnding, 2500);
                }
            });
        },
        { threshold: 0.8 },
    );
    endObserver.observe(footerEl);
}
setInterval(() => {
    if (endingScreen?.classList.contains("show")) {
        launchFirework(
            random(100, window.innerWidth - 100),
            random(80, window.innerHeight * 0.45),
        );
    }
}, 1500);

/* ---------- Love Quiz (flip cards) ---------- */
const quizCards = document.querySelectorAll(".quiz-card");
const quizFlippedCount = document.getElementById("quizFlippedCount");
let flippedTotal = 0;
quizCards.forEach((card) => {
    card.addEventListener("click", () => {
        const isFlipped = card.dataset.flipped === "true";
        if (!isFlipped) {
            card.dataset.flipped = "true";
            flippedTotal++;
            if (quizFlippedCount) quizFlippedCount.textContent = flippedTotal;
            pop(card);
            if (flippedTotal === quizCards.length) {
                setTimeout(() => {
                    for (let i = 0; i < 12; i++) {
                        setTimeout(() => {
                            launchFirework(
                                random(window.innerWidth * 0.25, window.innerWidth * 0.75),
                                random(window.innerHeight * 0.2, window.innerHeight * 0.5),
                            );
                        }, i * 150);
                    }
                }, 300);
            }
        } else {
            card.dataset.flipped = "false";
        }
    });
});

/* ---------- Spin The Wheel ---------- */
const loveWheel = document.getElementById("loveWheel");
const spinWheelBtn = document.getElementById("spinWheelBtn");
const wheelResult = document.getElementById("wheelResult");
const wheelOptions = [
    "Movie Night 🎬",
    "Beach Trip 🏖️",
    "Home-Cooked Dinner 🍝",
    "Stargazing 🌌",
    "Café Date ☕",
    "Road Trip 🚗",
    "Picnic 🧺",
    "Dance At Home 💃",
];
let wheelRotation = 0;
let wheelSpinning = false;
function spinLoveWheel() {
    if (wheelSpinning || !loveWheel) return;
    wheelSpinning = true;
    if (spinWheelBtn) spinWheelBtn.disabled = true;
    if (wheelResult) wheelResult.classList.remove("show");
    const segmentSize = 360 / wheelOptions.length;
    const winningIndex = randomInt(0, wheelOptions.length);
    const targetOffset = 360 - (winningIndex * segmentSize + segmentSize / 2);
    const extraSpins = 360 * randomInt(5, 8);
    wheelRotation += extraSpins + targetOffset - (wheelRotation % 360);
    loveWheel.style.transform = `rotate(${wheelRotation}deg)`;
    setTimeout(() => {
        wheelSpinning = false;
        if (spinWheelBtn) spinWheelBtn.disabled = false;
        if (wheelResult) {
            wheelResult.textContent = `Our next date: ${wheelOptions[winningIndex]}`;
            wheelResult.classList.add("show");
        }
        pop(wheelResult);
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                launchFirework(
                    random(window.innerWidth * 0.3, window.innerWidth * 0.7),
                    random(window.innerHeight * 0.2, window.innerHeight * 0.4),
                );
            }, i * 120);
        }
    }, 4100);
}
spinWheelBtn?.addEventListener("click", spinLoveWheel);
