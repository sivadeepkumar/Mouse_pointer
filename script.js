const robot = require("robotjs");

const startX = 1500;
const endX = 500;
const y = 500;
const totalDuration = 500000; // 20 sec
const step = 0.7; // move half pixel at a time
const steps = Math.abs(startX - endX) / step;
const delayPerStep = totalDuration / steps;

setTimeout(async () => {
  robot.moveMouse(startX, y);
  robot.mouseClick();
  robot.mouseClick();

  robot.mouseToggle("down");
  for (let x = startX; x >= endX; x -= step) {
    robot.moveMouse(x, y);
    await new Promise(res => setTimeout(res, delayPerStep));
  }
  robot.mouseToggle("up");
  console.log("Drag complete.");
}, 3000);

