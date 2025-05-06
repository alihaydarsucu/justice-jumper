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

const BOOK_SETTINGS = {
    thickness: {
        min: 0.08,    // Min % of pipe height (8%)
        max: 0.15,    // Max % of pipe height (15%)
        absoluteMin: 10 // Minimum pixels
    },
    width: {
        min: 0.6,     // Min % of pipe width (60%)
        max: 0.9      // Max % of pipe width (90%)
    },
    perspective: {
        maxOffset: 6  // Max perspective slant in pixels
    }
};

const MOBILE_SETTINGS = {
    pipeSpeed: 1.5,       // Base speed (px/frame)
    pipeSpawnRate: 1500,  // Milliseconds between pipes
    player: {
        gravity: 0.28,     // Fall speed
        lift: -6          // Jump strength (negative = upward)
    }
};

// Sound effects
const jumpSound = document.getElementById("jumpSound");
const scoreSound = document.getElementById("scoreSound");
const hitSound = document.getElementById("hitSound");
const dieSound = document.getElementById("dieSound");

// Set screen scale - for responsiveness
let scale;
let canvasWidth;
let canvasHeight;

// Game variables
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
let totalResources = 7; // Total number of images to load

// Player object containing properties
const player = {
    x: 80,
    y: 300,
    width: 40,
    height: 50,
    radius: 20,
    velocity: 0,
    gravity: 0.25, // Reduced - slower fall
    lift: -6,     // Reduced - softer jump
    rotation: 0,
    frame: 0,
    frameCount: 4,
    animationSpeed: 5,
    animationCounter: 0,
    isJumping: false
};

// Pipes and game settings
const pipes = [];
const pipeWidth = 60;
const pipeGap = 180; // Increased - easier passage
let pipeSpeed = 1.5; // Reduced - slower
let pipeSpawnRate = 2000; // Increased - less frequent pipes
let lastPipeTime = 0;

// Background and ground
const ground = {
    y: 0, // To be calculated
    height: 80,
    x: 0,
    speed: 1.5 // Reduced - slower
};

// Sprites
const sprites = {
    player: [],
    playerJump: [],
    pipeTop: null,
    pipeBottom: null,
    background: null,
    ground: null,
    ready: false
};

// Start the game and load resources
function init() {
    // Set canvas dimensions
    updateCanvasSize();
    
    // Display high score
    highScoreDisplay.textContent = highScore;
    
    // Load images
    loadImages();
    
    // Add event listeners
    addEventListeners();
}

// Load images
function loadImages() {
    // Player running frames
    for (let i = 0; i < 4; i++) {
        sprites.player[i] = new Image();
        sprites.player[i].src = `Images/player${i}.png`;
        sprites.player[i].onload = resourceLoaded;
        sprites.player[i].onerror = () => {
            console.log(`Player image ${i} failed to load, using fallback`);
            sprites.player[i] = null; // Mark as failed
            resourceLoaded();
        };
    }
    
    // Player jumping frames
    for (let i = 0; i < 2; i++) {
        sprites.playerJump[i] = new Image();
        sprites.playerJump[i].src = `Images/playerJump${i}.png`;
        sprites.playerJump[i].onload = resourceLoaded;
        sprites.playerJump[i].onerror = () => {
            console.log(`Jump image ${i} failed to load, using fallback`);
            sprites.playerJump[i] = null; // Mark as failed
            resourceLoaded();
        };
    }
    
        
    // Pipe images
    sprites.pipeTop = new Image();
    sprites.pipeTop.src = "Images/pipe.png";
    sprites.pipeTop.onload = resourceLoaded;
    sprites.pipeTop.onerror = () => {
        resourcesLoaded++;
        console.log("Pipe image could not be loaded, default will be used");
    };
    
    sprites.pipeBottom = new Image();
    sprites.pipeBottom = sprites.pipeTop;  // Same image for bottom pipe
    sprites.pipeBottom.onload = resourceLoaded;
    sprites.pipeBottom.onerror = () => {
        resourcesLoaded++;
        console.log("Pipe image could not be loaded, default will be used");
    };

    // Background and ground
    sprites.background = new Image();
    sprites.background.src = "Images/background.png";
    sprites.background.onload = resourceLoaded;
    sprites.background.onerror = () => {
        resourcesLoaded++;
        console.log("Background image could not be loaded, default will be used");
    };
    
    sprites.ground = new Image();
    sprites.ground.src = "Images/ground.png";
    sprites.ground.onload = resourceLoaded;
    sprites.ground.onerror = () => {
        resourcesLoaded++;
        console.log("Ground image could not be loaded, default will be used");
    };
}

// Called when an image is loaded
function resourceLoaded() {
    resourcesLoaded++;
    
    if (resourcesLoaded >= totalResources) {
        sprites.ready = true;
        loadingScreen.style.display = "none";
        document.getElementById("startScreen").style.display = "flex";
    }
}

// Adjust canvas dimensions based on screen size
function updateCanvasSize() {
    const isMobile = window.innerWidth <= 768;
    const baseWidth = isMobile ? 350 : 400;
    const baseHeight = isMobile ? 500 : 600;
    const aspectRatio = baseWidth / baseHeight;

    // Ekranın gerçek ölçülerini al
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // En-boy oranına göre canvas boyutunu hesapla
    if (screenWidth / screenHeight > aspectRatio) {
        canvasHeight = screenHeight;
        canvasWidth = screenHeight * aspectRatio;
    } else {
        canvasWidth = screenWidth;
        canvasHeight = screenWidth / aspectRatio;
    }

    scale = canvasWidth / baseWidth;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ground.y = canvasHeight - (ground.height * scale);
    player.radius = 20 * scale;
    player.width = 40 * scale;
    player.height = 50 * scale;

    // Canvas'ı ortalamak için container ayarları
    const container = document.getElementById("game-container");
    container.style.width = `${canvasWidth}px`;
    container.style.height = `${canvasHeight}px`;
}



// Add event listeners
function addEventListeners() {
    // Click and touch events
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", handleTouch, { passive: false }); // Add touch event

    // Keyboard events
    window.addEventListener("keydown", handleKeyDown);

    // Window resize
    window.addEventListener("resize", () => {
        updateCanvasSize();
        if (gameRunning) {
            // Update player position
            player.y = Math.min(player.y, ground.y - player.radius);
        }
    });

    // Start screen
    document.getElementById("startScreen").addEventListener("click", restartGame);
    document.getElementById("startScreen").addEventListener("touchstart", restartGame, { passive: false });

    // Pause and resume buttons
    pauseButton.addEventListener("click", togglePause);
    pauseButton.addEventListener("touchstart", togglePause, { passive: false }); // Add touch event
    resumeButton.addEventListener("click", togglePause);
    resumeButton.addEventListener("touchstart", togglePause, { passive: false }); // Add touch event

    // Restart button
    document.getElementById("restartButton").addEventListener("click", restartGame);
    document.getElementById("restartButton").addEventListener("touchstart", restartGame, { passive: false }); // Add touch event
}

// Make the player jump on click
function handleClick(event) {
    event.preventDefault();
    if (!gameRunning && !gameOver) {
        startGame();
    } else if (!gamePaused && gameRunning) {
        playerJump();
    }
}

// Make the player jump on touch
function handleTouch(event) {
    event.preventDefault(); // Prevent default behavior of touch event
    if (!gameRunning && !gameOver) {
        startGame();
    } else if (!gamePaused && gameRunning) {
        playerJump();
    }
}

// Control with keyboard
function handleKeyDown(event) {
    if (event.code === "Enter") {
        if (gamePaused) {
            resumeGame();
        } else if (gameOver) {
            restartGame();
        }
    } else if (event.code === "Space") {
        event.preventDefault();
        if (!gameRunning && !gameOver) {
            startGame();
        } else if (!gamePaused && gameRunning) {
            playerJump();
        }
    }
    else if (event.code === "Escape") { 
        if (gameRunning) togglePause();
    }
}

// Make the player jump
function playerJump() {
    player.velocity = player.lift * scale;
    player.isJumping = true;
    setTimeout(() => {
        player.isJumping = false;
    }, 500);
    
    // Sound effect
    if (jumpSound) {
        jumpSound.currentTime = 0;
        jumpSound.play().catch(e => console.log("Sound play error:", e));
    }
}

// Start the game
function startGame() {
    document.getElementById("startScreen").style.display = "none";
    
    // Reset game variables
    gameRunning = true;
    gameOver = false;
    score = 0;
    pipes.length = 0;
    player.y = canvasHeight / 2;
    player.velocity = 0;
    player.rotation = 0;
    pipeSpeed = MOBILE_SETTINGS.pipeSpeed * scale;
    pipeSpawnRate = MOBILE_SETTINGS.pipeSpawnRate;
    player.gravity = MOBILE_SETTINGS.player.gravity * scale;
    player.lift = MOBILE_SETTINGS.player.lift * scale;
    ground.speed = 2.5 * scale;
    difficulty = 1;
    
    // Update score display
    scoreDisplay.textContent = score;
    finalScoreDisplay.textContent = score;
    
    // Create the first pipe
    lastPipeTime = performance.now();
    generatePipe();
    
    // Start the game loop
    lastTime = performance.now();
    pauseButton.style.display = "flex";
    gameLoop();
}

// Restart the game
function restartGame() {
    document.getElementById("gameOverScreen").style.display = "none";
    startGame();
}

// Pause the game
function togglePause() {
    if (!gameRunning || gameOver) return;
    
    if (gamePaused) {
        resumeGame();
    } else {
        gamePaused = true;
        pauseScreen.style.display = "flex"; // Show pause screen
        pauseScreen.classList.add("active"); // Add active class
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null; // Clear the animation frame ID
    }
}

// Resume the game
function resumeGame() {
    if (!gamePaused) return;
    
    gamePaused = false;
    pauseScreen.style.display = "none"; // Hide pause screen
    pauseScreen.classList.remove("active"); // Remove active class
    lastTime = performance.now();
    gameLoop(); // Restart the game loop
}

// Game loop
function gameLoop(timestamp) {
    if (!gameRunning || gamePaused) return;
    
    // Time calculation
    deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Clear the screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the background
    drawBackground();
    
    // Create and draw pipes
    managePipes(timestamp);
    drawPipes();
    
    // Update and draw player position
    updatePlayer();
    drawPlayer();
    
    // Draw the ground
    drawGround();
    
    // Check collisions
    checkCollisions();
    
   
    
    // Increase difficulty
    if (score > 0 && score % 10 === 0) {
        increaseDifficulty();
    }
    
    // Call the next frame
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Draw the background
function drawBackground() {
    if (sprites.background.complete) {
        ctx.drawImage(sprites.background, 0, 0, canvas.width, canvas.height);
    } else {
        // Arcade style pixel background
        ctx.fillStyle = "#2b9ef4"; // Dark blue
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Pixel stars
        ctx.fillStyle = "#FFFFFF";
        for (let i = 0; i < 50; i++) {
            let x = Math.random() * canvas.width;
            let y = Math.random() * ground.y;
            let size = Math.random() * 3 * scale;
            ctx.fillRect(x, y, size, size);
        }
        
    }
}

// Draw the ground
function drawGround() {
    if (sprites.ground.complete) {
        // Scroll the ground
        ground.x = (ground.x - ground.speed) % (50 * scale);
        
        // Draw the ground
        ctx.drawImage(sprites.ground, ground.x, ground.y, canvas.width + (50 * scale), ground.height * scale);
    } else {
        // Arcade style pixel ground
        const gridSize = 20 * scale;
        ctx.fillStyle = "#663931"; // Brown
        ctx.fillRect(0, ground.y, canvas.width, ground.height * scale);
        
        // Pixel pattern
        ctx.fillStyle = "#8C5E58";
        for (let x = 0; x < canvas.width; x += gridSize * 2) {
            for (let y = ground.y; y < canvas.height; y += gridSize * 2) {
                ctx.fillRect(x, y, gridSize, gridSize);
                ctx.fillRect(x + gridSize, y + gridSize, gridSize, gridSize);
            }
        }
    }
}

// Update the player
function updatePlayer() {
    // Drop the player with gravity
    player.velocity += player.gravity * scale;
    player.y += player.velocity;
    
    // Update animation
    player.animationCounter++;
    if (player.animationCounter >= player.animationSpeed) {
        player.frame = (player.frame + 1) % player.frameCount;
        player.animationCounter = 0;
    }
    
    // Jump animation
    if (player.isJumping) {
        player.frame = 3; // Jump frame
    }
}

// Draw the player
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    
    // Check if we should use sprite or fallback
    const useSprite = sprites.ready && 
                     ((player.isJumping && sprites.playerJump[player.frame % 2]?.complete) ||
                     (!player.isJumping && sprites.player[player.frame]?.complete));
    
    if (useSprite) {
        const sprite = player.isJumping ? 
            sprites.playerJump[player.frame % 2] : 
            sprites.player[player.frame];
            
        try {
            ctx.drawImage(
                sprite,
                -player.width / 2,
                -player.height / 2,
                player.width,
                player.height
            );
        } catch (e) {
            console.log("Sprite drawing failed, falling back:", e);
            drawDefaultPlayer();
        }
    } else {
        drawDefaultPlayer();
    }
    
    ctx.restore();
}

// Default player drawing
function drawDefaultPlayer() {
    // Body
    ctx.fillStyle = "#FF5555";
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(-8 * scale, -8 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.arc(8 * scale, -8 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, 12 * scale, Math.PI * 0.25, Math.PI * 0.75);
    ctx.stroke();
}

// Manage and create pipes
function managePipes(timestamp) {
    // Create new pipe when time comes
    if (timestamp - lastPipeTime > pipeSpawnRate) {
        generatePipe();
        lastPipeTime = timestamp;
    }
    
    // Move pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= pipeSpeed;
        
        // Remove pipe if it goes off screen
        if (pipes[i].x + pipeWidth * scale < 0) {
            pipes.splice(i, 1);
            continue;
        }
        
        // Check score
        if (!pipes[i].passed && pipes[i].x + pipeWidth * scale < player.x - player.radius) {
            pipes[i].passed = true;
            score++;
            scoreDisplay.textContent = score;
            // Sound effect
            if (scoreSound) {
                scoreSound.currentTime = 0;
                scoreSound.play().catch(e => console.log("Sound play error:", e));
            }
        }
    }
}

// Create new pipe
function generatePipe() {
    // Create a pipe at random height
    let minHeight = 80 * scale;
    let maxHeight = canvas.height - ground.height * scale - pipeGap * scale - minHeight;
    let height = Math.floor(Math.random() * (maxHeight - minHeight) + minHeight);
    height = Math.max(minHeight, Math.min(height, maxHeight)); // Check boundaries
    
    pipes.push({
        x: canvas.width,
        y: 0,
        topHeight: height,
        bottomY: height + pipeGap * scale,
        bottomHeight: canvas.height - height - pipeGap * scale - ground.height * scale,
        passed: false,
        seed: Math.floor(Math.random() * 10000),
        colorSeed: Math.floor(Math.random() * 10000),
        lastColorIndex: -1 // Track last used color
    });
}

// Draw pipes
function drawPipes() {
    for (const pipe of pipes) {
        // Top stack
        drawLawBookStack(
            ctx,
            pipe.x,
            0,
            pipeWidth * scale,
            pipe.topHeight,
            pipe // Pass the whole pipe object
        );
        
        // Bottom stack
        drawLawBookStack(
            ctx,
            pipe.x,
            pipe.bottomY,
            pipeWidth * scale,
            pipe.bottomHeight,
            pipe // Pass the same pipe object
        );
    }
}

function drawLawBookStack(ctx, x, y, width, height, pipe) {
    const titles = ["CIVIL", "LEGAL", "CRIMINAL", "CONSTITUTIONAL", "PROPERTY", "CONTRACTS", "ADMINISTRATIVE"];
    const colorSets = [
        ["#0A5C36", "#1E8449", "#27AE60"], // Greens
        ["#3A0C3B", "#5B2C6F", "#8E44AD"], // Purples
        ["#5C1B1B", "#922B21", "#C0392B"], // Reds
        ["#0B3866", "#1F618D", "#3498DB"], // Blues
        ["#5C3317", "#7D6608", "#B7950B"], // Browns
        ["#2F4F4F", "#21618C", "#5D6D7E"]  // Slates
    ];

    const rand = (seed, max = 1, min = 0) => {
        seed = (seed * 9301 + 49297) % 233280;
        return min + (seed / 233280) * (max - min);
    };

    let currentY = y;
    let colorIndex = Math.floor(rand(pipe.colorSeed) * colorSets.length);
    let lastColor = null;
    let bookCount = 0;

    while (currentY < y + height - 2) {
        bookCount++;
        // More dramatic width variation (70%-100% of pipe width)
        const widthVariation = 0.7 + rand(pipe.seed + bookCount) * 0.3;
        let bookHeight = Math.max(
            BOOK_SETTINGS.thickness.absoluteMin,
            height * (BOOK_SETTINGS.thickness.min + 
                     rand(pipe.seed + currentY) * 
                     (BOOK_SETTINGS.thickness.max - BOOK_SETTINGS.thickness.min))
        );
        
        let bookWidth = width * 
            (BOOK_SETTINGS.width.min + 
             rand(pipe.seed + bookCount) * 
             (BOOK_SETTINGS.width.max - BOOK_SETTINGS.width.min));
        
        let perspective = rand(pipe.seed + currentY) * BOOK_SETTINGS.perspective.maxOffset;
        const bookX = x + perspective;

        // Get color different from previous
        let colors = colorSets[colorIndex % colorSets.length];
        let color;
        let attempts = 0;
        
        do {
            color = colors[Math.floor(rand(pipe.colorSeed + bookCount + attempts) * colors.length)];
            attempts++;
            if (attempts > 10) {
                colorIndex = (colorIndex + 1) % colorSets.length;
                colors = colorSets[colorIndex];
                color = colors[0];
                break;
            }
        } while (color === lastColor);

        lastColor = color;
        
        // Determine title (only if enough space)
        const showTitle = (currentY === y) || (rand(pipe.seed + currentY) > 0.7);
        const title = showTitle ? titles[Math.floor(rand(pipe.seed + currentY) * titles.length)] : null;

        drawLawBook(
            ctx,
            bookX,
            currentY,
            bookWidth,
            bookHeight,
            title,
            color,
            perspective
        );

        currentY += bookHeight;
        
        // Change color set occasionally
        if (rand(pipe.colorSeed + currentY) > 0.8) {
            colorIndex = (colorIndex + 1) % colorSets.length;
        }
    }
}

function drawLawBook(ctx, x, y, width, height, title, color, perspective) {
    // 1. Calculate 3D points
    const frontBottom = { x: x + perspective/2, y: y + height };
    const frontTop = { x: x, y: y };
    const backTop = { x: x + width * 0.85, y: y };
    const backBottom = { x: x + width * 0.85 + perspective/2, y: y + height };
    const pagesTop = { x: x + width, y: y };
    const pagesBottom = { x: x + width, y: y + height };

    // 2. Draw book cover with shading
    ctx.fillStyle = shadeColor(color, -15); // Darker shade
    ctx.beginPath();
    ctx.moveTo(frontTop.x, frontTop.y);
    ctx.lineTo(backTop.x, backTop.y);
    ctx.lineTo(backBottom.x, backBottom.y);
    ctx.lineTo(frontBottom.x, frontBottom.y);
    ctx.closePath();
    ctx.fill();

    // 3. Draw pages with gradient
    const pagesGradient = ctx.createLinearGradient(
        backTop.x, backTop.y,
        pagesTop.x, pagesTop.y
    );
    pagesGradient.addColorStop(0, "#F5F5DC"); // Parchment
    pagesGradient.addColorStop(1, "#E8E8CC"); // Slightly darker
    
    ctx.fillStyle = pagesGradient;
    ctx.beginPath();
    ctx.moveTo(backTop.x, backTop.y);
    ctx.lineTo(pagesTop.x, pagesTop.y);
    ctx.lineTo(pagesBottom.x, pagesBottom.y);
    ctx.lineTo(backBottom.x, backBottom.y);
    ctx.closePath();
    ctx.fill();

    // 4. Add spine with shadow
    ctx.fillStyle = shadeColor(color, -30);
    ctx.fillRect(x, y, 4, height);
    
    // 5. Add depth highlights
    ctx.strokeStyle = shadeColor(color, 20);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(frontTop.x, frontTop.y);
    ctx.lineTo(backTop.x, backTop.y);
    ctx.stroke();

    // Title (if specified and enough space)
    if (title && height > 14) {
        ctx.fillStyle = "#FFD700";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Smart font sizing
        const maxWidth = width * 0.8;
        let fontSize = Math.min(16, height * 0.5);
        
        ctx.font = `bold ${fontSize}px 'Press Start 2P'`;
        let textWidth;
        
        // Ensure text fits
        do {
            textWidth = ctx.measureText(title).width;
            if (textWidth > maxWidth && fontSize > 6) {
                fontSize -= 1;
                ctx.font = `bold ${fontSize}px 'Press Start 2P'`;
            } else {
                break;
            }
        } while (true);
        
        // Draw with outline
        const centerX = x + (width * 0.85)/2 + perspective/4;
        const centerY = y + height/2;
        ctx.strokeText(title, centerX, centerY);
        ctx.fillText(title, centerX, centerY);
    }

    // Pages lines
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 1;
    const lineSpacing = Math.max(4, height/5);
    for (let ly = y + 2; ly < y + height - 2; ly += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(x + 5, ly);
        ctx.lineTo(x + width * 0.85 - 2, ly);
        ctx.stroke();
    }
}

// Helper function to shade colors
function shadeColor(color, percent) {
    let R = parseInt(color.substring(1,3), 16);
    let G = parseInt(color.substring(3,5), 16);
    let B = parseInt(color.substring(5,7), 16);

    R = Math.min(255, R + R * percent / 100);
    G = Math.min(255, G + G * percent / 100);
    B = Math.min(255, B + B * percent / 100);

    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}


// Check collisions
function checkCollisions() {
    // Collision with the ground
    if (player.y + player.radius > ground.y) {
        player.y = ground.y - player.radius;
        endGame();
        return;
    }
    
    // Collision with the ceiling
    if (player.y - player.radius < 0) {
        player.y = player.radius;
        player.velocity = 0;
    }
    
    // Collision with pipes
    for (let pipe of pipes) {
        // Is the player's x position within the pipe?
        if (player.x + player.radius > pipe.x && player.x - player.radius < pipe.x + pipeWidth * scale) {
            // Collision with the top pipe
            if (player.y - player.radius < pipe.topHeight) {
                endGame();
                return;
            }
            // Collision with the bottom pipe
            if (player.y + player.radius > pipe.bottomY) {
                endGame();
                return;
            }
        }
    }
}

// Draw the score
function drawScore() {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `${32 * scale}px 'Bungee', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    
    if (!gameRunning || gameOver) {
        return;
    }
    
    // In-game score display
    ctx.fillText(score.toString(), canvas.width / 2, 20 * scale);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2 * scale;
    ctx.strokeText(score.toString(), canvas.width / 2, 20 * scale);
}

// Increase difficulty
function increaseDifficulty() {
    if (difficulty >= score / 10) return;
    
    difficulty = Math.floor(score / 10) + 1;
    pipeSpeed = Math.min(6, 1.5 + (difficulty * 0.4)) * scale;
    pipeSpawnRate = Math.max(1000, 2000 - (difficulty * 100));
}

// End the game
function endGame() {
    gameRunning = false;
    gameOver = true;
    
    // Sound effects
    if (hitSound) {
        hitSound.play().catch(e => console.log("Sound play error:", e));
        setTimeout(() => {
            if (dieSound) dieSound.play().catch(e => console.log("Sound play error:", e));
        }, 300);
    }
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
        highScoreDisplay.textContent = highScore;
    }
    
    // Show final score
    finalScoreDisplay.textContent = score;
    
    // Hide pause button
    pauseButton.style.display = "none";
    
    // Show game over screen
    setTimeout(() => {
        document.getElementById("gameOverScreen").style.display = "flex";
        document.getElementById("gameOverScreen").classList.add("active");
    }, 800);
    
    // Stop the animation loop
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null; // Clear the animation frame ID
}

// Isolate touch events for mobile devices
document.body.addEventListener('touchstart', function(e) {
    if (e.target === canvas || e.target.id === 'pauseButton' || 
        e.target.id === 'restartButton' || e.target.id === 'resumeButton') {
        return;
    }
    e.preventDefault();
}, { passive: false });

// Start the game when loaded
window.addEventListener('load', init);