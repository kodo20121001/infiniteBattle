const fs = require("fs");
const { createCanvas } = require("canvas");

const canvas = createCanvas(64, 64);
const ctx = canvas.getContext("2d");

// Create idle0.png (red square)
ctx.fillStyle = "#FF6347";
ctx.fillRect(0, 0, 64, 64);
ctx.strokeStyle = "#FFF";
ctx.lineWidth = 3;
ctx.strokeRect(2, 2, 60, 60);
ctx.fillStyle = "#FFF";
ctx.font = "bold 20px Arial";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("102", 32, 32);

const buffer0 = canvas.toBuffer("image/png");
fs.writeFileSync("d:/infinite_play/trunk/client/public/unit/102/idle/idle0.png", buffer0);

// Create idle1.png (slightly different)
ctx.fillStyle = "#FF4500";
ctx.fillRect(0, 0, 64, 64);
ctx.strokeStyle = "#FFF";
ctx.lineWidth = 3;
ctx.strokeRect(2, 2, 60, 60);
ctx.fillStyle = "#FFF";
ctx.font = "bold 20px Arial";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("102", 32, 32);

const buffer1 = canvas.toBuffer("image/png");
fs.writeFileSync("d:/infinite_play/trunk/client/public/unit/102/idle/idle1.png", buffer1);

console.log("Created placeholder images for unit 102");
