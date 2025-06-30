const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const player = {
  x: 300,
  y: 300,
  width: 40,
  height: 60,
  speed: 5,
  facing: "down",
};

const keys = {};
let plantedThisPress = false;

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

function handleKeyDown(e) {
  const key = e.key.toLowerCase();

  if (!keys[key]) {
    keys[key] = true;

    if (key === "q" && !plantedThisPress) {
      handlePlanting();
      plantedThisPress = true;
    }
    if (key === "e") {
      handleWatering();
    }
    if (key === "f") {
      handleHarvesting();
    }
  }

  if (["w", "a", "s", "d"].includes(key)) {
    switch (key) {
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
}

function handleKeyUp(e) {
  const key = e.key.toLowerCase();
  keys[key] = false;
  if (key === "q") plantedThisPress = false;
}

const plotSize = 40;
const plotCols = 10;
const plotRows = 6;
const plotXStart = 200;
const plotYStart = 150;

const plots = Array(plotRows)
  .fill(null)
  .map(() => Array(plotCols).fill(null));

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
    this.width = plotSize;
    this.height = plotSize;

    this.glowTime = 0;
  }

  update() {
    if (this.stage < this.growthStages.length - 1 && this.watered) {
      this.progress += 1 / (this.growthTimes[this.stage] * 60);
      if (this.progress >= 1) {
        this.progress = 0;
        this.stage++;
        this.watered = false;
      }
    }

    if (this.isFullyGrown()) {
      this.glowTime += 0.05;
    } else {
      this.glowTime = 0;
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.growthStages[this.stage];
    ctx.fillRect(this.x, this.y, this.width, this.height);

    if (this.isFullyGrown()) {
      const glowAlpha = ((Math.sin(this.glowTime) + 1) / 2) * 0.7 + 0.3;
      ctx.save();
      ctx.shadowColor = `rgba(255, 255, 0, ${glowAlpha})`;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = `rgba(255, 255, 0, ${glowAlpha})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      ctx.restore();
    }

    if (!this.isFullyGrown()) {
      ctx.fillStyle = "#ccc";
      ctx.fillRect(this.x, this.y - 10, this.width, 6);
      ctx.fillStyle = "#76c043";
      ctx.fillRect(this.x, this.y - 10, this.width * this.progress, 6);
    }

    if (!this.watered && !this.isFullyGrown()) {
      ctx.fillStyle = "rgba(0, 120, 255, 0.7)";
      const size = 12;
      ctx.fillRect(this.x + this.width / 2 - size / 2, this.y - 26, size, size);
    }
  }

  water() {
    this.watered = true;
  }

  isFullyGrown() {
    return this.stage >= this.growthStages.length - 1;
  }
}

const carrotColors = ["#654321", "#7BB661", "#4CAF50", "#2E7D32"];
const carrotGrowthTimes = [5, 7, 9, 10];

let gameTicks = 0;
const ticksPerSecond = 60;
const gameSecondsPerRealSecond = 10;
let gameSeconds = 6 * 3600;
let dayCount = 1;

function updateGameTime() {
  gameTicks++;
  if (gameTicks >= ticksPerSecond) {
    gameTicks = 0;
    gameSeconds += gameSecondsPerRealSecond;
    if (gameSeconds >= 86400) {
      gameSeconds -= 86400;
      dayCount++;
    }
  }
}

function getTimeString(seconds) {
  let m = Math.floor(seconds / 60);
  let h = Math.floor(m / 60);
  m %= 60;
  let ampm = "AM";
  if (h >= 12) {
    ampm = "PM";
    if (h > 12) h -= 12;
  }
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")} ${ampm}`;
}

function getPlotAt(x, y) {
  const col = Math.floor((x - plotXStart) / plotSize);
  const row = Math.floor((y - plotYStart) / plotSize);
  if (col < 0 || col >= plotCols || row < 0 || row >= plotRows) return null;
  return { col, row };
}

function getPlotCoords(col, row) {
  return {
    x: plotXStart + col * plotSize,
    y: plotYStart + row * plotSize,
  };
}

function getFacingPlot() {
  let targetX = player.x + player.width / 2;
  let targetY = player.y + player.height / 2;

  const offset = plotSize;
  switch (player.facing) {
    case "up":
      targetY -= offset;
      break;
    case "down":
      targetY += offset;
      break;
    case "left":
      targetX -= offset;
      break;
    case "right":
      targetX += offset;
      break;
  }

  return getPlotAt(targetX, targetY);
}

// Inventory structure (items with count)
const inventory = {
  wateringCan: { count: 1 },
  seeds: { count: 10 },
  carrots: { count: 0 },
};

let selectedSlot = 0; // 0,1,2 index for inventory slots

function handlePlanting() {
  const plot = getFacingPlot();
  if (!plot) return;
  if (plots[plot.row][plot.col]) return;

  if (inventory.seeds.count <= 0) return;

  const { x, y } = getPlotCoords(plot.col, plot.row);
  plots[plot.row][plot.col] = new Crop(
    x,
    y,
    "carrot",
    carrotColors,
    carrotGrowthTimes
  );

  inventory.seeds.count--;
}

function handleWatering() {
  if (inventory.wateringCan.count <= 0) return;

  const plot = getFacingPlot();
  if (!plot) return;

  const crop = plots[plot.row][plot.col];
  if (!crop) return;
  if (crop.watered) return;
  if (crop.isFullyGrown()) return;

  crop.water();
}

function handleHarvesting() {
  const plot = getFacingPlot();
  if (!plot) return;

  const crop = plots[plot.row][plot.col];
  if (!crop) return;
  if (!crop.isFullyGrown()) return;

  plots[plot.row][plot.col] = null;
  inventory.carrots.count++;
}

// Mouse hover
let mouseX = 0;
let mouseY = 0;
let hoveredPlot = null;
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  hoveredPlot = getPlotAt(mouseX, mouseY);
});

function update() {
  if (keys["w"]) player.y -= player.speed;
  if (keys["s"]) player.y += player.speed;
  if (keys["a"]) player.x -= player.speed;
  if (keys["d"]) player.x += player.speed;

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

  for (let row = 0; row < plotRows; row++) {
    for (let col = 0; col < plotCols; col++) {
      if (plots[row][col]) {
        plots[row][col].update();
      }
    }
  }

  updateGameTime();
}

function drawInventory() {
  const invX = 50;
  const invY = canvas.height - 90;
  const slotSize = 60;
  const slotPadding = 15;

  ctx.font = "16px Arial";
  ctx.textAlign = "right";

  const slots = [
    {
      name: "Watering Can",
      color: "#3b7bd1",
      count: inventory.wateringCan.count,
    },
    { name: "Seeds", color: "#7d3bb7", count: inventory.seeds.count },
    { name: "Carrots", color: "#d13b3b", count: inventory.carrots.count },
  ];

  for (let i = 0; i < slots.length; i++) {
    let slotX = invX + i * (slotSize + slotPadding);
    let slotY = invY;

    // Draw slot background
    ctx.fillStyle = "#222";
    ctx.fillRect(slotX, slotY, slotSize, slotSize);

    // Draw colored item box
    ctx.fillStyle = slots[i].color;
    ctx.fillRect(slotX + 10, slotY + 10, slotSize - 20, slotSize - 20);

    // Draw count if > 1
    if (slots[i].count > 1) {
      ctx.fillStyle = "white";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "right";
      ctx.fillText(
        slots[i].count,
        slotX + slotSize - 10,
        slotY + slotSize - 10
      );
    }

    // Draw outline if selected
    if (i === selectedSlot) {
      ctx.strokeStyle = "#ffff00";
      ctx.lineWidth = 3;
      ctx.strokeRect(slotX, slotY, slotSize, slotSize);
    }
  }
}

function draw() {
  ctx.fillStyle = "#70c1b3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < plotRows; row++) {
    for (let col = 0; col < plotCols; col++) {
      const { x, y } = getPlotCoords(col, row);
      ctx.strokeStyle = "#5a8254";
      ctx.lineWidth = 2;
      ctx.fillStyle = "#8ac67b";
      ctx.fillRect(x, y, plotSize, plotSize);
      ctx.strokeRect(x, y, plotSize, plotSize);

      if (plots[row][col]) {
        plots[row][col].draw(ctx);
      }
    }
  }

  const facingPlot = getFacingPlot();

  const plotToHighlight = hoveredPlot || facingPlot;

  if (plotToHighlight) {
    const { col, row } = plotToHighlight;
    const { x, y } = getPlotCoords(col, row);

    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, plotSize, plotSize);

    if (plots[row][col]) {
      const c = plots[row][col];

      let boxX, boxY;
      if (plotToHighlight === hoveredPlot) {
        boxX = mouseX + 15;
        boxY = mouseY + 15;
        if (boxX + 150 > canvas.width) boxX = mouseX - 150 - 15;
        if (boxY + 70 > canvas.height) boxY = mouseY - 70 - 15;
      } else {
        boxX = x + plotSize + 10;
        boxY = y;
        if (boxX + 150 > canvas.width) boxX = x - 150 - 10;
        if (boxY + 70 > canvas.height) boxY = canvas.height - 70 - 10;
      }

      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(boxX, boxY, 150, 70);
      ctx.strokeStyle = "#ffff00";
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, 150, 70);

      ctx.fillStyle = "white";
      ctx.font = "14px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`Crop: ${c.name}`, boxX + 10, boxY + 25);
      ctx.fillText(
        `Stage: ${c.stage + 1} / ${c.growthStages.length}`,
        boxX + 10,
        boxY + 45
      );
      ctx.fillText(
        `Watered: ${c.watered ? "Yes" : "No"}`,
        boxX + 10,
        boxY + 65
      );
    }
  }

  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`Day ${dayCount}`, canvas.width - 20, 30);
  ctx.fillText(getTimeString(gameSeconds), canvas.width - 20, 60);

  drawInventory();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
