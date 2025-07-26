// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const SHIP_SPEED = 5;
const SHIP_ROTATION_SPEED = 5;
const ASTEROID_MIN_SPEED = 1;
const ASTEROID_MAX_SPEED = 4;
const LASER_SPEED = 10;
const LASER_COOLDOWN = 500; // ms
const HYPESPACE_COOLDOWN = 5000; // ms
const INITIAL_LIVES = 3;

// Game state
let gameActive = false;
let score = 0;
let lives = INITIAL_LIVES;
let asteroids = [];
let lasers = [];
let fragments = [];
let keys = {};
let lastShot = 0;
let lastHyperspace = 0;
let difficulty = 1;
let asteroidSpawnTimer = 0;

// DOM elements
const gameContainer = document.getElementById("game-container");
const spaceship = document.getElementById("spaceship");
const flames = document.getElementById("flames");
const scoreDisplay = document.getElementById("score");
const livesDisplay = document.getElementById("lives");
const cooldownBar = document.getElementById("cooldown-bar");
const hyperspaceBtn = document.getElementById("hyperspace");
const startScreen = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("game-over-screen");
const finalScoreDisplay = document.getElementById("score-display");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");

// Initialize ship position
let shipX = GAME_WIDTH / 2;
let shipY = GAME_HEIGHT / 2;
let shipRotation = 0;
let shipVelocityX = 0;
let shipVelocityY = 0;

// Initialize lives display
function initLivesDisplay() {
  livesDisplay.innerHTML = "";
  for (let i = 0; i < lives; i++) {
    const life = document.createElement("div");
    life.className = "life";
    livesDisplay.appendChild(life);
  }
}

// Update cooldown bar
function updateCooldownBar() {
  const now = Date.now();
  const timeSinceLastShot = now - lastShot;
  const cooldownPercent = Math.min(
    100,
    (timeSinceLastShot / LASER_COOLDOWN) * 100
  );
  cooldownBar.style.width = `${cooldownPercent}%`;

  // Update hyperspace button
  const hyperspaceCooldown = now - lastHyperspace;
  if (hyperspaceCooldown < HYPESPACE_COOLDOWN) {
    hyperspaceBtn.classList.add("disabled");
    hyperspaceBtn.disabled = true;
    const remaining = (
      (HYPESPACE_COOLDOWN - hyperspaceCooldown) /
      1000
    ).toFixed(1);
    hyperspaceBtn.textContent = `HYPERSPACE (${remaining}s)`;
  } else {
    hyperspaceBtn.classList.remove("disabled");
    hyperspaceBtn.disabled = false;
    hyperspaceBtn.textContent = "HYPERSPACE (H)";
  }
}

// Create asteroid
function createAsteroid(x, y, size, velocityX, velocityY) {
  const asteroid = document.createElement("div");
  let className = "asteroid asteroid-";
  let rotationSpeed = (Math.random() * 5 + 1) * (Math.random() > 0.5 ? 1 : -1);

  switch (size) {
    case "large":
      className += "large";
      break;
    case "medium":
      className += "medium";
      break;
    case "small":
      className += "small";
      break;
  }

  asteroid.className = className;
  asteroid.style.left = `${x}px`;
  asteroid.style.top = `${y}px`;
  asteroid.dataset.size = size;
  asteroid.dataset.rotationSpeed = rotationSpeed;
  asteroid.dataset.rotation = 0;

  gameContainer.appendChild(asteroid);

  return {
    element: asteroid,
    x,
    y,
    size,
    velocityX:
      velocityX ||
      (Math.random() * (ASTEROID_MAX_SPEED - ASTEROID_MIN_SPEED) +
        ASTEROID_MIN_SPEED) *
        (Math.random() > 0.5 ? 1 : -1),
    velocityY:
      velocityY ||
      (Math.random() * (ASTEROID_MAX_SPEED - ASTEROID_MIN_SPEED) +
        ASTEROID_MIN_SPEED) *
        (Math.random() > 0.5 ? 1 : -1),
    rotationSpeed,
  };
}

// Create laser
function createLaser() {
  const laser = document.createElement("div");
  laser.className = "laser";

  // Position laser at ship's front
  const laserLength = 30;
  const angleRad = (shipRotation * Math.PI) / 180;
  const startX = shipX + Math.sin(angleRad) * 30;
  const startY = shipY - Math.cos(angleRad) * 30;

  laser.style.left = `${startX}px`;
  laser.style.top = `${startY}px`;
  laser.style.width = `${laserLength}px`;
  laser.style.transform = `rotate(${shipRotation}deg)`;

  gameContainer.appendChild(laser);

  return {
    element: laser,
    x: startX,
    y: startY,
    rotation: shipRotation,
    length: laserLength,
  };
}

// Create fragments
function createFragments(x, y, size, count) {
  const newFragments = [];
  for (let i = 0; i < count; i++) {
    const fragment = document.createElement("div");
    fragment.className = "fragment";
    fragment.style.left = `${x}px`;
    fragment.style.top = `${y}px`;
    gameContainer.appendChild(fragment);

    const velocityX = Math.random() * 4 - 2;
    const velocityY = Math.random() * 4 - 2;

    newFragments.push({
      element: fragment,
      x,
      y,
      velocityX,
      velocityY,
      size: "fragment",
    });
  }
  return newFragments;
}

// Check collision between two elements
function checkCollision(obj1, obj2) {
  const rect1 = obj1.element.getBoundingClientRect();
  const rect2 = obj2.element.getBoundingClientRect();

  return (
    rect1.left < rect2.right &&
    rect1.right > rect2.left &&
    rect1.top < rect2.bottom &&
    rect1.bottom > rect2.top
  );
}

// Handle asteroid hit
function handleAsteroidHit(asteroid, laser) {
  // Remove laser
  laser.element.remove();
  lasers = lasers.filter((l) => l !== laser);

  // Remove asteroid
  asteroid.element.remove();
  asteroids = asteroids.filter((a) => a !== asteroid);

  // Add score based on asteroid size
  let points = 0;
  switch (asteroid.size) {
    case "large":
      points = 20;
      break;
    case "medium":
      points = 50;
      break;
    case "small":
      points = 100;
      break;
  }
  score += points;
  scoreDisplay.textContent = score;

  // Create fragments if not the smallest size
  if (asteroid.size !== "small") {
    const newSize = asteroid.size === "large" ? "medium" : "small";
    const fragmentCount = Math.floor(Math.random() * 3) + 2; // 2-4 fragments

    for (let i = 0; i < 2; i++) {
      const newAsteroid = createAsteroid(
        asteroid.x,
        asteroid.y,
        newSize,
        Math.random() * 4 - 2,
        Math.random() * 4 - 2
      );
      asteroids.push(newAsteroid);
    }

    // Also create small visual fragments
    const visualFragments = createFragments(
      asteroid.x,
      asteroid.y,
      "fragment",
      fragmentCount
    );
    fragments = fragments.concat(visualFragments);
  } else {
    // Create visual fragments for small asteroids
    const visualFragments = createFragments(
      asteroid.x,
      asteroid.y,
      "fragment",
      4
    );
    fragments = fragments.concat(visualFragments);
  }
}

// Handle ship hit
function handleShipHit() {
  lives--;
  initLivesDisplay();

  if (lives <= 0) {
    gameOver();
  } else {
    // Reset ship position
    shipX = GAME_WIDTH / 2;
    shipY = GAME_HEIGHT / 2;
    shipVelocityX = 0;
    shipVelocityY = 0;

    // Create explosion effect
    const explosionFragments = createFragments(shipX, shipY, "fragment", 12);
    fragments = fragments.concat(explosionFragments);

    // Make ship invulnerable for a short time
    spaceship.style.opacity = "0.5";
    setTimeout(() => {
      if (gameActive) spaceship.style.opacity = "1";
    }, 1500);
  }
}

// Hyperspace teleport
function activateHyperspace() {
  const now = Date.now();
  if (now - lastHyperspace < HYPESPACE_COOLDOWN) return;

  lastHyperspace = now;

  // Create teleport effect
  const teleportEffect = document.createElement("div");
  teleportEffect.style.position = "absolute";
  teleportEffect.style.left = `${shipX - 50}px`;
  teleportEffect.style.top = `${shipY - 50}px`;
  teleportEffect.style.width = "100px";
  teleportEffect.style.height = "100px";
  teleportEffect.style.border = "5px solid #00ffff";
  teleportEffect.style.borderRadius = "50%";
  teleportEffect.style.animation = "pulse 0.5s ease-out forwards";
  teleportEffect.style.zIndex = "15";
  gameContainer.appendChild(teleportEffect);

  // Define pulse animation
  const pulseKeyframes = [
    { transform: "scale(0)", opacity: 1 },
    { transform: "scale(2)", opacity: 0 },
  ];

  const pulseOptions = {
    duration: 500,
    easing: "ease-out",
    fill: "forwards",
  };

  teleportEffect.animate(pulseKeyframes, pulseOptions).onfinish = () => {
    teleportEffect.remove();
  };

  // Calculate new position (with 10% chance of malfunction)
  const malfunction = Math.random() < 0.1;
  let newX, newY;

  if (malfunction) {
    // Teleport into an asteroid (if any exist)
    if (asteroids.length > 0) {
      const randomAsteroid =
        asteroids[Math.floor(Math.random() * asteroids.length)];
      newX = randomAsteroid.x;
      newY = randomAsteroid.y;
    } else {
      newX = Math.random() * (GAME_WIDTH - 100) + 50;
      newY = Math.random() * (GAME_HEIGHT - 100) + 50;
    }
  } else {
    // Safe teleport
    newX = Math.random() * (GAME_WIDTH - 100) + 50;
    newY = Math.random() * (GAME_HEIGHT - 100) + 50;
  }

  // Move ship
  shipX = newX;
  shipY = newY;

  // If malfunction, take damage
  if (malfunction) {
    handleShipHit();
  }
}

// Game over
function gameOver() {
  gameActive = false;
  finalScoreDisplay.textContent = `FINAL SCORE: ${score}`;
  gameOverScreen.style.display = "flex";
}

// Start game
function startGame() {
  // Reset game state
  gameActive = true;
  score = 0;
  lives = INITIAL_LIVES;
  asteroids = [];
  lasers = [];
  fragments = [];
  shipX = GAME_WIDTH / 2;
  shipY = GAME_HEIGHT / 2;
  shipRotation = 0;
  shipVelocityX = 0;
  shipVelocityY = 0;
  difficulty = 1;
  asteroidSpawnTimer = 0;
  lastShot = 0;
  lastHyperspace = 0;

  // Update UI
  scoreDisplay.textContent = score;
  initLivesDisplay();
  cooldownBar.style.width = "100%";
  hyperspaceBtn.classList.remove("disabled");
  hyperspaceBtn.disabled = false;
  hyperspaceBtn.textContent = "HYPERSPACE (H)";
  spaceship.style.opacity = "1";

  // Hide screens
  startScreen.style.display = "none";
  gameOverScreen.style.display = "none";

  // Start game loop
  gameLoop();
}

// Game loop
function gameLoop() {
  if (!gameActive) return;

  // Update cooldown bar
  updateCooldownBar();

  // Handle ship movement
  const rotationSpeed = 5;
  const acceleration = 0.2;
  const friction = 0.95;

  // Rotation
  if (keys["ArrowLeft"] || keys["a"]) {
    shipRotation -= rotationSpeed;
  }
  if (keys["ArrowRight"] || keys["d"]) {
    shipRotation += rotationSpeed;
  }

  // Thrust
  if (keys["ArrowUp"] || keys["w"]) {
    const angleRad = (shipRotation * Math.PI) / 180;
    shipVelocityX += Math.sin(angleRad) * acceleration;
    shipVelocityY -= Math.cos(angleRad) * acceleration;

    // Show flames
    flames.style.height = "20px";
  } else {
    // Hide flames when not thrusting
    flames.style.height = "0";
  }

  // Apply friction
  shipVelocityX *= friction;
  shipVelocityY *= friction;

  // Update ship position
  shipX += shipVelocityX;
  shipY += shipVelocityY;

  // Keep ship within bounds
  shipX = Math.max(20, Math.min(GAME_WIDTH - 20, shipX));
  shipY = Math.max(20, Math.min(GAME_HEIGHT - 20, shipY));

  // Update ship element
  spaceship.style.left = `${shipX - 20}px`;
  spaceship.style.top = `${shipY - 30}px`;
  spaceship.style.transform = `rotate(${shipRotation}deg)`;

  // Shooting
  const now = Date.now();
  if ((keys[" "] || keys["Spacebar"]) && now - lastShot > LASER_COOLDOWN) {
    lasers.push(createLaser());
    lastShot = now;
  }

  // Hyperspace
  if (keys["h"] && now - lastHyperspace > HYPESPACE_COOLDOWN) {
    activateHyperspace();
  }

  // Spawn asteroids
  asteroidSpawnTimer++;
  if (asteroidSpawnTimer > 60 / difficulty) {
    asteroidSpawnTimer = 0;

    // Random edge position
    const edge = Math.floor(Math.random() * 4);
    let x, y;

    switch (edge) {
      case 0: // top
        x = Math.random() * GAME_WIDTH;
        y = -50;
        break;
      case 1: // right
        x = GAME_WIDTH + 50;
        y = Math.random() * GAME_HEIGHT;
        break;
      case 2: // bottom
        x = Math.random() * GAME_WIDTH;
        y = GAME_HEIGHT + 50;
        break;
      case 3: // left
        x = -50;
        y = Math.random() * GAME_HEIGHT;
        break;
    }

    // Random size (weighted toward larger at beginning)
    const sizeRand = Math.random();
    let size = "large";
    if (sizeRand > 0.7) size = "medium";
    if (sizeRand > 0.9) size = "small";

    asteroids.push(createAsteroid(x, y, size));

    // Gradually increase difficulty
    difficulty = Math.min(3, difficulty + 0.001);
  }

  // Update asteroids
  asteroids.forEach((asteroid) => {
    asteroid.x += asteroid.velocityX;
    asteroid.y += asteroid.velocityY;

    // Apply rotation
    let rotation = parseFloat(asteroid.element.dataset.rotation) || 0;
    rotation += asteroid.rotationSpeed;
    asteroid.element.dataset.rotation = rotation;
    asteroid.element.style.transform = `rotate(${rotation}deg)`;

    // Update position
    asteroid.element.style.left = `${
      asteroid.x - asteroid.element.offsetWidth / 2
    }px`;
    asteroid.element.style.top = `${
      asteroid.y - asteroid.element.offsetHeight / 2
    }px`;

    // Remove if out of bounds
    if (
      asteroid.x < -100 ||
      asteroid.x > GAME_WIDTH + 100 ||
      asteroid.y < -100 ||
      asteroid.y > GAME_HEIGHT + 100
    ) {
      asteroid.element.remove();
    }
  });

  // Remove out-of-bound asteroids
  asteroids = asteroids.filter((asteroid) => {
    const isOut =
      asteroid.x < -100 ||
      asteroid.x > GAME_WIDTH + 100 ||
      asteroid.y < -100 ||
      asteroid.y > GAME_HEIGHT + 100;
    if (isOut) asteroid.element.remove();
    return !isOut;
  });

  // Update lasers
  lasers.forEach((laser) => {
    const angleRad = (laser.rotation * Math.PI) / 180;
    laser.x += Math.sin(angleRad) * LASER_SPEED;
    laser.y -= Math.cos(angleRad) * LASER_SPEED;

    laser.element.style.left = `${laser.x}px`;
    laser.element.style.top = `${laser.y}px`;

    // Remove if out of bounds
    if (
      laser.x < -50 ||
      laser.x > GAME_WIDTH + 50 ||
      laser.y < -50 ||
      laser.y > GAME_HEIGHT + 50
    ) {
      laser.element.remove();
    }
  });

  // Remove out-of-bound lasers
  lasers = lasers.filter((laser) => {
    const isOut =
      laser.x < -50 ||
      laser.x > GAME_WIDTH + 50 ||
      laser.y < -50 ||
      laser.y > GAME_HEIGHT + 50;
    if (isOut) laser.element.remove();
    return !isOut;
  });

  // Update fragments
  fragments.forEach((fragment) => {
    fragment.x += fragment.velocityX;
    fragment.y += fragment.velocityY;

    fragment.element.style.left = `${fragment.x}px`;
    fragment.element.style.top = `${fragment.y}px`;

    // Fade out fragments
    const opacity = parseFloat(fragment.element.style.opacity) || 1;
    fragment.element.style.opacity = opacity - 0.01;

    // Remove if out of bounds or faded
    if (
      fragment.x < -50 ||
      fragment.x > GAME_WIDTH + 50 ||
      fragment.y < -50 ||
      fragment.y > GAME_HEIGHT + 50 ||
      opacity <= 0
    ) {
      fragment.element.remove();
    }
  });

  // Remove old fragments
  fragments = fragments.filter((fragment) => {
    const opacity = parseFloat(fragment.element.style.opacity) || 1;
    const isOut =
      fragment.x < -50 ||
      fragment.x > GAME_WIDTH + 50 ||
      fragment.y < -50 ||
      fragment.y > GAME_HEIGHT + 50 ||
      opacity <= 0;
    if (isOut) fragment.element.remove();
    return !isOut;
  });

  // Check collisions: lasers vs asteroids
  lasers.forEach((laser, laserIndex) => {
    asteroids.forEach((asteroid, asteroidIndex) => {
      if (checkCollision(laser, asteroid)) {
        handleAsteroidHit(asteroid, laser);
      }
    });
  });

  // Check collisions: ship vs asteroids
  const shipObj = { element: spaceship, x: shipX, y: shipY };
  if (spaceship.style.opacity === "1") {
    asteroids.forEach((asteroid) => {
      if (checkCollision(shipObj, asteroid)) {
        handleShipHit();
      }
    });
  }

  // Check collisions: ship vs fragments
  fragments.forEach((fragment) => {
    if (spaceship.style.opacity === "1" && checkCollision(shipObj, fragment)) {
      handleShipHit();
    }
  });

  // Continue game loop
  requestAnimationFrame(gameLoop);
}

// Event listeners
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
hyperspaceBtn.addEventListener("click", activateHyperspace);

// Initialize lives display
initLivesDisplay();
