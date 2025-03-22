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
        sprites.player[i].src = `images/player${i}.png`;
        sprites.player[i].onload = resourceLoaded;
        // Error handling if image cannot be loaded
        sprites.player[i].onerror = () => {
            resourcesLoaded++;
            console.log("Player image could not be loaded, default will be used");
        };
    }
    
    // Player jumping frames
    for (let i = 0; i < 2; i++) {
        sprites.playerJump[i] = new Image();
        sprites.playerJump[i].src = `images/playerJump${i}.png`;
        sprites.playerJump[i].onload = resourceLoaded;
        sprites.playerJump[i].onerror = () => {
            resourcesLoaded++;
            console.log("Jump image could not be loaded, default will be used");
        };
    }
    
    // Pipe images
    sprites.pipeTop = new Image();
    sprites.pipeTop.src = "images/pipeTop.png";
    sprites.pipeTop.onload = resourceLoaded;
    sprites.pipeTop.onerror = () => {
        resourcesLoaded++;
        console.log("Pipe image could not be loaded, default will be used");
    };
    
    sprites.pipeBottom = new Image();
    sprites.pipeBottom.src = "images/pipeBottom.png";
    sprites.pipeBottom.onload = resourceLoaded;
    sprites.pipeBottom.onerror = () => {
        resourcesLoaded++;
        console.log("Pipe image could not be loaded, default will be used");
    };
    
    // Background and ground
    sprites.background = new Image();
    sprites.background.src = "images/background.png";
    sprites.background.onload = resourceLoaded;
    sprites.background.onerror = () => {
        resourcesLoaded++;
        console.log("Background image could not be loaded, default will be used");
    };
    
    sprites.ground = new Image();
    sprites.ground.src = "images/ground.png";
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
    const container = document.getElementById("game-container");
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate ratio with reference dimensions
    const baseWidth = 400;
    const baseHeight = 600;
    
    // Maintain aspect ratio
    const aspectRatio = baseWidth / baseHeight;
    
    // Maintain aspect ratio of game container, but fit to screen
    if (containerWidth / containerHeight > aspectRatio) {
        // Screen is wider, adjust based on height
        canvasHeight = containerHeight;
        canvasWidth = containerHeight * aspectRatio;
    } else {
        // Screen is taller, adjust based on width
        canvasWidth = containerWidth;
        canvasHeight = containerWidth / aspectRatio;
    }
    
    // Calculate scale factor
    scale = canvasWidth / baseWidth;
    
    // Set canvas dimensions
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Recalculate game variables
    ground.y = canvasHeight - (ground.height * scale);
    player.radius = 20 * scale;
    player.width = 40 * scale;
    player.height = 50 * scale;
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
    pipeSpeed = 1.5 * scale;
    ground.speed = 1.5 * scale;
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
    
    // Draw the score
    drawScore();
    
    // Increase difficulty
    if (score > 0 && score % 10 === 0) {
        increaseDifficulty();
    }
    
    // Call the next frame
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Draw the background
function drawBackground() {
    if (sprites.ready && sprites.background.complete) {
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
        
        // Arcade style grid lines
        ctx.strokeStyle = "#554CA8";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = 0; y < ground.y; y += 30 * scale) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
    }
}

// Draw the ground
function drawGround() {
    if (sprites.ready && sprites.ground.complete) {
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
    
    if (sprites.ready) {
        // Use different sprite based on jump state
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

// Default player drawing
function drawDefaultPlayer() {
    // Arcade style pixel player
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
    
    // Smile
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
        passed: false
    });
}

// Draw pipes
function drawPipes() {
    for (let pipe of pipes) {
        if (sprites.ready && sprites.pipeTop.complete && sprites.pipeBottom.complete) {
            // Top pipe
            ctx.drawImage(
                sprites.pipeTop,
                pipe.x,
                pipe.y + pipe.topHeight - (sprites.pipeTop.height * scale),
                pipeWidth * scale,
                sprites.pipeTop.height * scale
            );
            
            // Bottom pipe
            ctx.drawImage(
                sprites.pipeBottom,
                pipe.x,
                pipe.bottomY,
                pipeWidth * scale,
                sprites.pipeBottom ? sprites.pipeBottom.height * scale : pipe.bottomHeight
            );
        } else {
            // Arcade style pixel pipes
            ctx.fillStyle = "#55AA55";
            // Top pipe
            ctx.fillRect(pipe.x, pipe.y, pipeWidth * scale, pipe.topHeight);
            // Bottom pipe
            ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth * scale, pipe.bottomHeight);
            
            // Pipe edges
            ctx.strokeStyle = "#338833";
            ctx.lineWidth = 2 * scale;
            ctx.strokeRect(pipe.x, pipe.y, pipeWidth * scale, pipe.topHeight);
            ctx.strokeRect(pipe.x, pipe.bottomY, pipeWidth * scale, pipe.bottomHeight);
        }
    }
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
    pipeSpeed = Math.min(6, 1.5 + (difficulty * 0.2)) * scale;
    pipeSpawnRate = Math.max(1000, 2000 - (difficulty * 50));
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
