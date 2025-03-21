// DOM Elements
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
    canvas.addEventListener("touchstart", handleTouch, { passive: false }); // Dokunma olayını ekle

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
    pauseButton.addEventListener("touchstart", togglePause, { passive: false }); // Dokunma olayını ekle

    // Restart butonu
    document.getElementById("restartButton").addEventListener("click", restartGame);
    document.getElementById("restartButton").addEventListener("touchstart", restartGame, { passive: false }); // Dokunma olayını ekle
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
    event.preventDefault(); // Dokunma olayının varsayılan davranışını engelle
    if (!gameRunning && !gameOver) {
        startGame();
    } else if (!gamePaused && gameRunning) {
        playerJump();
    }
}

// Klavye ile kontrol
function handleKeyDown(event) {
    if (event.code === "Space") {
        event.preventDefault();
        if (!gameRunning && !gameOver) {
            startGame();
        } else if (!gamePaused && gameRunning) {
            playerJump();
        }
    } else if (event.code === "Escape") {
        if (gameRunning) togglePause();
    }
}

// Oyuncuyu zıplat
function playerJump() {
    player.velocity = player.lift * scale;
    player.isJumping = true;
    setTimeout(() => {
        player.isJumping = false;
    }, 500);
    
    // Ses efekti
    if (jumpSound) {
        jumpSound.currentTime = 0;
        jumpSound.play().catch(e => console.log("Ses çalma hatası:", e));
    }
}

// Oyunu başlat
function startGame() {
    document.getElementById("startScreen").style.display = "none";
    
    // Oyun değişkenlerini sıfırla
    gameRunning = true;
    gameOver = false;
    score = 0;
    pipes.length = 0;
    player.y = canvasHeight / 2;
    player.velocity = 0;
    player.rotation = 0;
    pipeSpeed = 1.5 * scale;
    ground.speed = 1.5 * scale;
    difficulty = 1;
    
    // Skor göstergesini güncelle
    scoreDisplay.textContent = score;
    finalScoreDisplay.textContent = score;
    
    // İlk boruyu oluştur
    lastPipeTime = performance.now();
    generatePipe();
    
    // Oyun döngüsünü başlat
    lastTime = performance.now();
    pauseButton.style.display = "block";
    gameLoop();
}

// Oyunu yeniden başlat
function restartGame() {
    document.getElementById("gameOverScreen").style.display = "none";
    startGame();
}

// Oyunu duraklat
function togglePause() {
    if (!gameRunning || gameOver) return;
    
    if (gamePaused) {
        resumeGame();
    } else {
        gamePaused = true;
        pauseScreen.style.display = "flex"; // Pause ekranını göster
        pauseScreen.classList.add("active"); // Aktif sınıfını ekle
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null; // Animasyon döngüsünü temizle
    }
}

// Oyuna devam et
function resumeGame() {
    if (!gamePaused) return;
    
    gamePaused = false;
    pauseScreen.style.display = "none"; // Pause ekranını gizle
    pauseScreen.classList.remove("active"); // Aktif sınıfını kaldır
    lastTime = performance.now();
    gameLoop(); // Oyun döngüsünü yeniden başlat
}

// Oyun döngüsü
function gameLoop(timestamp) {
    if (!gameRunning || gamePaused) return;
    
    // Zaman hesaplaması
    deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Ekranı temizle
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Arka planı çiz
    drawBackground();
    
    // Boruları oluştur ve çiz
    managePipes(timestamp);
    drawPipes();
    
    // Oyuncu pozisyonunu güncelle ve çiz
    updatePlayer();
    drawPlayer();
    
    // Zemini çiz
    drawGround();
    
    // Çarpışmaları kontrol et
    checkCollisions();
    
    // Skoru çizdir
    drawScore();
    
    // Zorluk seviyesini artır
    if (score > 0 && score % 10 === 0) {
        increaseDifficulty();
    }
    
    // Bir sonraki frame'i çağır
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Arka planı çiz
function drawBackground() {
    if (sprites.ready && sprites.background.complete) {
        ctx.drawImage(sprites.background, 0, 0, canvas.width, canvas.height);
    } else {
        // Arcade tarzı piksel arka plan
        ctx.fillStyle = "#352879"; // Koyu mavi
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Piksel yıldızlar
        ctx.fillStyle = "#FFFFFF";
        for (let i = 0; i < 50; i++) {
            let x = Math.random() * canvas.width;
            let y = Math.random() * ground.y;
            let size = Math.random() * 3 * scale;
            ctx.fillRect(x, y, size, size);
        }
        
        // Arcade tarzı grid çizgileri
        ctx.strokeStyle = "#4faef5";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = 0; y < ground.y; y += 30 * scale) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
    }
}

// Zemini çiz
function drawGround() {
    if (sprites.ready && sprites.ground.complete) {
        // Zemini kaydır
        ground.x = (ground.x - ground.speed) % (50 * scale);
        
        // Zemini çiz
        ctx.drawImage(sprites.ground, ground.x, ground.y, canvas.width + (50 * scale), ground.height * scale);
    } else {
        // Arcade tarzı piksel zemin
        const gridSize = 20 * scale;
        ctx.fillStyle = "#663931"; // Kahverengi
        ctx.fillRect(0, ground.y, canvas.width, ground.height * scale);
        
        // Piksel deseni
        ctx.fillStyle = "#8C5E58";
        for (let x = 0; x < canvas.width; x += gridSize * 2) {
            for (let y = ground.y; y < canvas.height; y += gridSize * 2) {
                ctx.fillRect(x, y, gridSize, gridSize);
                ctx.fillRect(x + gridSize, y + gridSize, gridSize, gridSize);
            }
        }
    }
}

// Oyuncuyu güncelle
function updatePlayer() {
    // Yerçekimi ile oyuncuyu düşür
    player.velocity += player.gravity * scale;
    player.y += player.velocity;
    
    // Animasyon güncelleme
    player.animationCounter++;
    if (player.animationCounter >= player.animationSpeed) {
        player.frame = (player.frame + 1) % player.frameCount;
        player.animationCounter = 0;
    }
    
    // Zıplama animasyonu
    if (player.isJumping) {
        player.frame = 3; // Zıplama frame'i
    }
}

// Oyuncuyu çiz
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    
    if (sprites.ready) {
        // Zıplama durumuna göre farklı sprite kullan
        const sprite = player.isJumping ? 
            sprites.playerJump[player.frame % 2] : 
            sprites.player[player.frame];
            
        if (sprite && sprite.complete) {
            ctx.drawImage(
                sprite,
                -player.width / 2,
                -player.height / 2,
                player.width,
                player.height
            );
        } else {
            drawDefaultPlayer();
        }
    } else {
        drawDefaultPlayer();
    }
    
    ctx.restore();
}

// Varsayılan oyuncu çizimi
function drawDefaultPlayer() {
    // Arcade tarzı piksel oyuncu
    ctx.fillStyle = "#FF5555";
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Gözler
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(-8 * scale, -8 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.arc(8 * scale, -8 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Gülümseme
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, 12 * scale, Math.PI * 0.25, Math.PI * 0.75);
    ctx.stroke();
}

// Boruları oluştur ve yönet
function managePipes(timestamp) {
    // Zaman gelince yeni boru oluştur
    if (timestamp - lastPipeTime > pipeSpawnRate) {
        generatePipe();
        lastPipeTime = timestamp;
    }
    
    // Boruları hareket ettir
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= pipeSpeed;
        
        // Boru ekrandan çıktıysa sil
        if (pipes[i].x + pipeWidth * scale < 0) {
            pipes.splice(i, 1);
            continue;
        }
        
        // Skoru kontrol et
        if (!pipes[i].passed && pipes[i].x + pipeWidth * scale < player.x - player.radius) {
            pipes[i].passed = true;
            score++;
            scoreDisplay.textContent = score;
            // Ses efekti
            if (scoreSound) {
                scoreSound.currentTime = 0;
                scoreSound.play().catch(e => console.log("Ses çalma hatası:", e));
            }
        }
    }
}

// Yeni boru oluştur
function generatePipe() {
    // Rastgele yükseklikte bir boru oluştur
    let minHeight = 80 * scale;
    let maxHeight = canvas.height - ground.height * scale - pipeGap * scale - minHeight;
    let height = Math.floor(Math.random() * (maxHeight - minHeight) + minHeight);
    height = Math.max(minHeight, Math.min(height, maxHeight)); // Sınırları kontrol et
    
    pipes.push({
        x: canvas.width,
        y: 0,
        topHeight: height,
        bottomY: height + pipeGap * scale,
        bottomHeight: canvas.height - height - pipeGap * scale - ground.height * scale,
        passed: false
    });
}

// Boruları çiz
function drawPipes() {
    for (let pipe of pipes) {
        if (sprites.ready && sprites.pipeTop.complete && sprites.pipeBottom.complete) {
            // Üst boru
            ctx.drawImage(
                sprites.pipeTop,
                pipe.x,
                pipe.y + pipe.topHeight - (sprites.pipeTop.height * scale),
                pipeWidth * scale,
                sprites.pipeTop.height * scale
            );
            
            // Alt boru
            ctx.drawImage(
                sprites.pipeBottom,
                pipe.x,
                pipe.bottomY,
                pipeWidth * scale,
                sprites.pipeBottom ? sprites.pipeBottom.height * scale : pipe.bottomHeight
            );
        } else {
            // Arcade tarzı piksel borular
            ctx.fillStyle = "#55AA55";
            // Üst boru
            ctx.fillRect(pipe.x, pipe.y, pipeWidth * scale, pipe.topHeight);
            // Alt boru
            ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth * scale, pipe.bottomHeight);
            
            // Boru kenarları
            ctx.strokeStyle = "#338833";
            ctx.lineWidth = 2 * scale;
            ctx.strokeRect(pipe.x, pipe.y, pipeWidth * scale, pipe.topHeight);
            ctx.strokeRect(pipe.x, pipe.bottomY, pipeWidth * scale, pipe.bottomHeight);
        }
    }
}

// Çarpışmaları kontrol et
function checkCollisions() {
    // Yer ile çarpışma
    if (player.y + player.radius > ground.y) {
        player.y = ground.y - player.radius;
        endGame();
        return;
    }
    
    // Tavan ile çarpışma
    if (player.y - player.radius < 0) {
        player.y = player.radius;
        player.velocity = 0;
    }
    
    // Borular ile çarpışma
    for (let pipe of pipes) {
        // Oyuncunun x pozisyonu borunun içinde mi?
        if (player.x + player.radius > pipe.x && player.x - player.radius < pipe.x + pipeWidth * scale) {
            // Üst boru ile çarpışma
            if (player.y - player.radius < pipe.topHeight) {
                endGame();
                return;
            }
            // Alt boru ile çarpışma
            if (player.y + player.radius > pipe.bottomY) {
                endGame();
                return;
            }
        }
    }
}

// Skoru çiz
function drawScore() {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `${32 * scale}px 'Bungee', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    
    if (!gameRunning || gameOver) {
        return;
    }
    
    // In-game skor gösterimi
    ctx.fillText(score.toString(), canvas.width / 2, 20 * scale);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2 * scale;
    ctx.strokeText(score.toString(), canvas.width / 2, 20 * scale);
}

// Zorluk seviyesini artır
function increaseDifficulty() {
    if (difficulty >= score / 10) return;
    
    difficulty = Math.floor(score / 10) + 1;
    pipeSpeed = Math.min(6, 1.5 + (difficulty * 0.2)) * scale;
    pipeSpawnRate = Math.max(1000, 2000 - (difficulty * 50));
}

// Oyunu bitir
function endGame() {
    gameRunning = false;
    gameOver = true;
    
    // Ses efektleri
    if (hitSound) {
        hitSound.play().catch(e => console.log("Ses çalma hatası:", e));
        setTimeout(() => {
            if (dieSound) dieSound.play().catch(e => console.log("Ses çalma hatası:", e));
        }, 300);
    }
    
    // Yüksek skoru güncelle
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
        highScoreDisplay.textContent = highScore;
    }
    
    // Final skorunu göster
    finalScoreDisplay.textContent = score;
    
    // Duraklat butonunu gizle
    pauseButton.style.display = "none";
    
    // Oyun bitti ekranını göster
    setTimeout(() => {
        document.getElementById("gameOverScreen").style.display = "flex";
        document.getElementById("gameOverScreen").classList.add("active");
    }, 800);
    
    // Animasyon döngüsünü durdur
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null; // Clear the animation frame ID
}

// Mobil cihazlar için dokunma olaylarını izole et
document.body.addEventListener('touchstart', function(e) {
    if (e.target === canvas || e.target.id === 'pauseButton' || 
        e.target.id === 'restartButton' || e.target.id === 'resumeButton') {
        return;
    }
    e.preventDefault();
}, { passive: false });

// Oyun yüklendiğinde başlat
window.addEventListener('load', init);