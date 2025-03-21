// DOM Elementleri
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const finalScoreDisplay = document.getElementById("finalScore");
const highScoreDisplay = document.getElementById("highScore");
const pauseButton = document.getElementById("pauseButton");
const pauseScreen = document.getElementById("pauseScreen");
const resumeButton = document.getElementById("resumeButton");
const loadingScreen = document.getElementById("loadingScreen");

// Ses efektleri
const jumpSound = document.getElementById("jumpSound");
const scoreSound = document.getElementById("scoreSound");
const hitSound = document.getElementById("hitSound");
const dieSound = document.getElementById("dieSound");

// Ekran ölçeğini ayarla - responsive için
let scale;
let canvasWidth;
let canvasHeight;

// Oyun değişkenleri
let gameRunning = false;
let gamePaused = false;
let gameOver = false;
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let animationFrameId = null;
let lastTime = 0;
let deltaTime = 0;
let difficulty = 1;
let resourcesLoaded = 0;
let totalResources = 7; // Toplam yüklenecek resim sayısı

// Player özelliklerini kapsayan obje
const player = {
    x: 80,
    y: 300,
    width: 40,
    height: 50,
    radius: 20,
    velocity: 0,
    gravity: 0.25, // Azaltıldı - daha yavaş düşme
    lift: -6,     // Azaltıldı - daha yumuşak zıplama
    rotation: 0,
    frame: 0,
    frameCount: 4,
    animationSpeed: 5,
    animationCounter: 0,
    isJumping: false
};

// Borular ve oyun ayarları
const pipes = [];
const pipeWidth = 60;
const pipeGap = 180; // Arttırıldı - daha kolay geçiş
let pipeSpeed = 1.5; // Azaltıldı - daha yavaş
let pipeSpawnRate = 2000; // Artırıldı - daha seyrek boru
let lastPipeTime = 0;

// Arka plan ve zemin
const ground = {
    y: 0, // Hesaplanacak
    height: 80,
    x: 0,
    speed: 1.5 // Azaltıldı - daha yavaş
};

// Görüntüler
const sprites = {
    player: [],
    playerJump: [],
    pipeTop: null,
    pipeBottom: null,
    background: null,
    ground: null,
    ready: false
};

// Oyunu başlat ve kaynaklarını yükle
function init() {
    // Canvas boyutlarını ayarla
    updateCanvasSize();
    
    // Yüksek skoru göster
    highScoreDisplay.textContent = highScore;
    
    // Görselleri yükle
    loadImages();
    
    // Olay dinleyicileri ekle
    addEventListeners();
}

// Görselleri yükle
function loadImages() {
    // Oyuncu koşma frame'leri
    for (let i = 0; i < 4; i++) {
        sprites.player[i] = new Image();
        sprites.player[i].src = `images/player${i}.png`;
        sprites.player[i].onload = resourceLoaded;
        // Görüntü yüklenemezse hata işleme
        sprites.player[i].onerror = () => {
            resourcesLoaded++;
            console.log("Oyuncu resmi yüklenemedi, varsayılan kullanılacak");
        };
    }
    
    // Oyuncu zıplama frame'leri
    for (let i = 0; i < 2; i++) {
        sprites.playerJump[i] = new Image();
        sprites.playerJump[i].src = `images/playerJump${i}.png`;
        sprites.playerJump[i].onload = resourceLoaded;
        sprites.playerJump[i].onerror = () => {
            resourcesLoaded++;
            console.log("Zıplama resmi yüklenemedi, varsayılan kullanılacak");
        };
    }
    
    // Boru resimleri
    sprites.pipeTop = new Image();
    sprites.pipeTop.src = "images/pipeTop.png";
    sprites.pipeTop.onload = resourceLoaded;
    sprites.pipeTop.onerror = () => {
        resourcesLoaded++;
        console.log("Boru resmi yüklenemedi, varsayılan kullanılacak");
    };
    
    sprites.pipeBottom = new Image();
    sprites.pipeBottom.src = "images/pipeBottom.png";
    sprites.pipeBottom.onload = resourceLoaded;
    sprites.pipeBottom.onerror = () => {
        resourcesLoaded++;
        console.log("Boru resmi yüklenemedi, varsayılan kullanılacak");
    };
    
    // Arka plan ve zemin
    sprites.background = new Image();
    sprites.background.src = "images/background.png";
    sprites.background.onload = resourceLoaded;
    sprites.background.onerror = () => {
        resourcesLoaded++;
        console.log("Arka plan resmi yüklenemedi, varsayılan kullanılacak");
    };
    
    sprites.ground = new Image();
    sprites.ground.src = "images/ground.png";
    sprites.ground.onload = resourceLoaded;
    sprites.ground.onerror = () => {
        resourcesLoaded++;
        console.log("Zemin resmi yüklenemedi, varsayılan kullanılacak");
    };
}

// Resim yüklenince çağrılır
function resourceLoaded() {
    resourcesLoaded++;
    
    if (resourcesLoaded >= totalResources) {
        sprites.ready = true;
        loadingScreen.style.display = "none";
        document.getElementById("startScreen").style.display = "flex";
    }
}

// Canvas boyutlarını ekrana göre ayarla
function updateCanvasSize() {
    const container = document.getElementById("game-container");
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Referans ölçülerle oranı hesapla
    const baseWidth = 400;
    const baseHeight = 600;
    
    // En-boy oranını koru
    const aspectRatio = baseWidth / baseHeight;
    
    // Oyun konteynerinin en-boy oranını koru, ama ekrana sığdır
    if (containerWidth / containerHeight > aspectRatio) {
        // Ekran daha geniş, yüksekliğe göre ayarla
        canvasHeight = containerHeight;
        canvasWidth = containerHeight * aspectRatio;
    } else {
        // Ekran daha uzun, genişliğe göre ayarla
        canvasWidth = containerWidth;
        canvasHeight = containerWidth / aspectRatio;
    }
    
    // Ölçek faktörünü hesapla
    scale = canvasWidth / baseWidth;
    
    // Canvas boyutlarını ayarla
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Oyun değişkenlerini yeniden hesapla
    ground.y = canvasHeight - (ground.height * scale);
    player.radius = 20 * scale;
    player.width = 40 * scale;
    player.height = 50 * scale;
}

// Olay dinleyicileri ekle
function addEventListeners() {
    // Tıklama ve dokunma olayları
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", handleTouch);
    
    // Klavye olayları
    window.addEventListener("keydown", handleKeyDown);
    
    // Pencere yeniden boyutlandırma
    window.addEventListener("resize", () => {
        updateCanvasSize();
        if (gameRunning) {
            // Oyuncunun pozisyonunu güncelle
            player.y = Math.min(player.y, ground.y - player.radius);
        }
    });
    
    // Duraklat ve devam et butonları
    pauseButton.addEventListener("click", togglePause);
    resumeButton.addEventListener("click", resumeGame);
    
    // Restart butonu
    document.getElementById("restartButton").addEventListener("click", restartGame);
}

// Tıklama ile oyuncuyu zıplat
function handleClick(event) {
    event.preventDefault();
    if (!gameRunning && !gameOver) {
        startGame();
    } else if (!gamePaused && gameRunning) {
        playerJump();
    }
}

// Dokunma ile oyuncuyu zıplat
function handleTouch(event) {
    event.preventDefault();
    if (!gameRunning && !gameOver) {
        startGame();
    } else if (!gamePaused && gameRunning) {
        playerJump();
    }
}

// Klav
