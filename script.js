const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Player object
const player = {
  x: 300,
  y: 300,
  width: 40,
  height: 60,
  speed: 5,
  facing: "down",
};

// Track keyboard keys pressed
const keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;

  if (["w", "a", "s", "d"].includes(e.key.toLowerCase())) {
    switch (e.key.toLowerCase()) {
      case "w":
        player.facing = "up";
        break;
      case "s":
        player.facing = "down";
        break;
      case "a":
        player.facing = "left";
        break;
      case "d":
        player.facing = "right";
        break;
    }
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// Crop class
class Crop {
  constructor(x, y, name, growthStages, growthTimes) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.growthStages = growthStages;
    this.growthTimes = growthTimes;
    this.stage = 0;
    this.progress = 0;
    this.watered = false;
    this.width = 30;
    this.height = 30;
  }
  update() {
    if (this.stage < this.growthStages.length - 1) {
      if (this.watered) {
        this.progress += 1 / (this.growthTimes[this.stage] * 60);
        if (this.progress >= 1) {
          this.progress = 0;
          this.stage++;
          this.watered = false;
        }
      }
    }
  }
  draw(ctx) {
    // Draw crop body
    ctx.fillStyle = this.growthStages[this.stage];
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw growth progress bar background
    ctx.fillStyle = "#ccc";
    ctx.fillRect(this.x, this.y - 10, this.width, 5);

    // Draw growth progress bar fill
    ctx.fillStyle = "#76c043";
    ctx.fillRect(this.x, this.y - 10, this.width * this.progress, 5);

    // Draw watering indicator box if NOT watered and NOT fully grown
    if (!this.watered && this.stage < this.growthStages.length - 1) {
      const indicatorSize = 12;
      const centerX = this.x + this.width / 2;
      const indicatorY = this.y - 25;

      ctx.fillStyle = "rgba(0, 120, 255, 0.7)"; // semi-transparent blue box
      ctx.fillRect(
        centerX - indicatorSize / 2,
        indicatorY,
        indicatorSize,
        indicatorSize
      );
    }
  }
  water() {
    this.watered = true;
  }
  getTimeLeft() {
    if (this.stage >= this.growthStages.length - 1) return 0;
    return (1 - this.progress) * this.growthTimes[this.stage];
  }
}

const crops = [];
const carrotGrowthTimes = [5, 7, 9, 10];
const carrotColors = ["#654321", "#7BB661", "#4CAF50", "#2E7D32"];
crops.push(new Crop(350, 300, "Carrot", carrotColors, carrotGrowthTimes));

const inventory = {
  wateringCan: 1,
  selectedItem: "wateringCan",
};

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

function getFacingCrop() {
  const faceOffset = 40;
  let checkX = player.x;
  let checkY = player.y;

  switch (player.facing) {
    case "up":
      checkY -= faceOffset;
      break;
    case "down":
      checkY += faceOffset;
      break;
    case "left":
      checkX -= faceOffset;
      break;
    case "right":
      checkX += faceOffset;
      break;
  }

  return crops.find(
    (crop) =>
      checkX < crop.x + crop.width &&
      checkX + player.width > crop.x &&
      checkY < crop.y + crop.height &&
      checkY + player.height > crop.y
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// In-game clock and day system
let gameTicks = 0;
const ticksPerSecond = 60;
const gameSecondsPerRealSecond = 10;

let gameSeconds = 6 * 3600; // 6:00 AM start
let dayCount = 1;

function updateGameTime() {
  gameTicks++;
  if (gameTicks >= ticksPerSecond) {
    gameTicks = 0;
    gameSeconds += gameSecondsPerRealSecond;
    if (gameSeconds >= 24 * 3600) {
      gameSeconds -= 24 * 3600;
      dayCount++;
    }
  }
}

function getTimeString(seconds) {
  let totalMinutes = Math.floor(seconds / 60);
  let hours = Math.floor(totalMinutes / 60);
  let minutes = totalMinutes % 60;
  let ampm = "AM";
  if (hours >= 12) {
    ampm = "PM";
    if (hours > 12) hours -= 12;
  }
  if (hours === 0) hours = 12;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")} ${ampm}`;
}

function update() {
  // Player movement
  if (keys["w"]) player.y -= player.speed;
  if (keys["s"]) player.y += player.speed;
  if (keys["a"]) player.x -= player.speed;
  if (keys["d"]) player.x += player.speed;

  // Keep player in bounds
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

  crops.forEach((crop) => crop.update());

  if (keys["e"]) {
    if (inventory.selectedItem === "wateringCan" && inventory.wateringCan > 0) {
      const crop = getFacingCrop();
      if (crop && !crop.watered && crop.stage < crop.growthStages.length - 1) {
        crop.water();
      }
    }
  }

  updateGameTime();
}

function draw() {
  // Background
  ctx.fillStyle = "#70c1b3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Player
  ctx.fillStyle = "#ff9900";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Facing indicator triangle
  ctx.fillStyle = "black";
  ctx.beginPath();
  switch (player.facing) {
    case "up":
      ctx.moveTo(player.x + player.width / 2, player.y);
      ctx.lineTo(player.x + player.width / 2 - 8, player.y + 12);
      ctx.lineTo(player.x + player.width / 2 + 8, player.y + 12);
      break;
    case "down":
      ctx.moveTo(player.x + player.width / 2, player.y + player.height);
      ctx.lineTo(
        player.x + player.width / 2 - 8,
        player.y + player.height - 12
      );
      ctx.lineTo(
        player.x + player.width / 2 + 8,
        player.y + player.height - 12
      );
      break;
    case "left":
      ctx.moveTo(player.x, player.y + player.height / 2);
      ctx.lineTo(player.x + 12, player.y + player.height / 2 - 8);
      ctx.lineTo(player.x + 12, player.y + player.height / 2 + 8);
      break;
    case "right":
      ctx.moveTo(player.x + player.width, player.y + player.height / 2);
      ctx.lineTo(
        player.x + player.width - 12,
        player.y + player.height / 2 - 8
      );
      ctx.lineTo(
        player.x + player.width - 12,
        player.y + player.height / 2 + 8
      );
      break;
  }
  ctx.closePath();
  ctx.fill();

  // Draw crops
  crops.forEach((crop) => crop.draw(ctx));

  // Draw outlined yellow box around the facing crop
  const facingCrop = getFacingCrop();
  if (facingCrop) {
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      facingCrop.x - 2,
      facingCrop.y - 2,
      facingCrop.width + 4,
      facingCrop.height + 4
    );
  }

  // Show crop label and time left or "Ready!" above facing crop
  if (facingCrop) {
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    const timeLeft = facingCrop.getTimeLeft();
    const displayText =
      timeLeft > 0
        ? `${facingCrop.name} - ${formatTime(timeLeft)}`
        : `${facingCrop.name} - Ready!`;
    ctx.fillText(
      displayText,
      facingCrop.x + facingCrop.width / 2,
      facingCrop.y - 10
    );
  }

  // Inventory display
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.textAlign = "left";
  ctx.fillText(
    `Selected: ${inventory.selectedItem} (${inventory.wateringCan})`,
    20,
    30
  );

  // Day and time display (top right)
  ctx.textAlign = "right";
  ctx.font = "20px Arial";
  ctx.fillStyle = "white";
  ctx.fillText(`Day ${dayCount}`, canvas.width - 20, 30);
  ctx.fillText(getTimeString(gameSeconds), canvas.width - 20, 60);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
