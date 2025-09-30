const robot = require("robotjs");
const keyHandler = require("node-key-sender");

// Configuration
const startX = 1500;
const endX = 500;
const y = 500;
const totalDuration = 30 * 60 * 1000; // Keep the same slow speed
const step = 0.7;
const steps = Math.abs(startX - endX) / step;
const delayPerStep = totalDuration / steps;

// State tracking
let isRunning = false;
let lastKnownPosition = { x: 0, y: 0 };
let timer = null;

// Function to detect if user has moved mouse
function checkMousePosition() {
  const currentPosition = robot.getMousePos();
  
  // If we're not tracking yet, just start tracking
  if (lastKnownPosition.x === 0 && lastKnownPosition.y === 0) {
    lastKnownPosition = currentPosition;
    return false;
  }
  
  // Calculate distance moved
  const xDiff = Math.abs(currentPosition.x - lastKnownPosition.x);
  const yDiff = Math.abs(currentPosition.y - lastKnownPosition.y);
  
  // Update tracking position
  lastKnownPosition = currentPosition;
  
  // If moved more than threshold, consider it user intervention
  if (xDiff > 20 || yDiff > 20) {
    console.log("User movement detected:", xDiff, yDiff);
    return true;
  }
  
  return false;
}

// Function to perform the horizontal line drawing
async function drawHorizontalLine(customStartX = startX) {
  console.log("Starting horizontal line drawing...");
  isRunning = true;
  
  // Get current mouse position
  const currentPos = robot.getMousePos();
  
  // If we're using a custom starting point, use current Y position too
  const startingX = customStartX;
  const startingY = customStartX === startX ? y : currentPos.y;
  
  // Move to start position only if not using current position
  if (customStartX === startX) {
    robot.moveMouse(startingX, startingY);
    await new Promise(res => setTimeout(res, 500));
  }
  
  // Double click to ensure chart is focused
  robot.mouseClick();
  await new Promise(res => setTimeout(res, 100));
  robot.mouseClick();
  await new Promise(res => setTimeout(res, 500));
  
  // Hold mouse down and start dragging
  robot.mouseToggle("down");
  
  // Reset position tracker before starting movement
  lastKnownPosition = robot.getMousePos();
  
  // Calculate how far to go horizontally
  const targetEndX = customStartX === startX ? endX : Math.max(customStartX - (startX - endX), 10);
  
  // Start mouse movement
  for (let x = startingX; x >= targetEndX && isRunning; x -= step) {
    robot.moveMouse(x, startingY);
    await new Promise(res => setTimeout(res, delayPerStep));
  }
  
  // Release mouse if we're still running
  if (isRunning) {
    robot.mouseToggle("up");
    console.log("Horizontal line drawing completed.");
  }
  
  isRunning = false;
}

// Function to monitor user intervention
function startMonitoring() {
  // Clear any existing monitoring
  if (timer) {
    clearInterval(timer);
  }
  
  // Set up monitoring interval
  timer = setInterval(() => {
    if (!isRunning) return;
    
    // Check if user moved the mouse
    if (checkMousePosition()) {
      console.log("User interruption detected!");
      handleInterruption();
    }
  }, 100); // Check every 100ms
}

// Function to handle interruption and restart
function handleInterruption() {
  if (!isRunning) return;
  
  // Stop current execution
  isRunning = false;
  robot.mouseToggle("up"); // Make sure to release mouse
  console.log("Drawing interrupted. Will restart in 3 seconds...");
  
  // Store current position for restart
  setTimeout(() => {
    // Get current position right before restarting
    const currentPos = robot.getMousePos();
    console.log("Restarting drawing process from current position:", currentPos.x, currentPos.y);
    
    // Pass current X position to restart from there
    drawHorizontalLine(currentPos.x);
  }, 3000); // Changed to 3 seconds as requested
}

// Function to initiate a scheduled draw after delay
function scheduleDrawing() {
  console.log("Drawing scheduled to start in 5 seconds...");
  setTimeout(() => {
    const currentPos = robot.getMousePos();
    console.log("Starting scheduled drawing from position:", currentPos.x, currentPos.y);
    drawHorizontalLine(currentPos.x);
  }, 5000);
}

// Monitoring for key presses using a child process
function setupKeyboardShortcuts() {
  console.log("Keyboard shortcuts set up:");
  console.log("- ESC: Terminate script");
  console.log("- Command+P: Wait 5 seconds then draw horizontal line");
  
  // We'll use a polling approach with the child_process module
  const { spawn } = require('child_process');
  let keyCheckProcess;
  
  try {
    // This works on macOS to monitor key state
    const script = `
      osascript -e '
        tell application "System Events"
          repeat
            set escapeKey to key code 53 is down
            set commandKey to command down
            set pKey to key code 35 is down
            
            if escapeKey then
              do shell script "echo ESC_PRESSED"
              exit repeat
            end if
            
            if commandKey and pKey then
              do shell script "echo CMD_P_PRESSED" 
              delay 1
            end if
            
            delay 0.1
          end repeat
        end tell
      '
    `;
    
    keyCheckProcess = spawn('bash', ['-c', script]);
    
    keyCheckProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      
      if (output.includes("ESC_PRESSED")) {
        console.log("ESC key detected. Terminating script...");
        process.exit(0);
      }
      
      if (output.includes("CMD_P_PRESSED")) {
        console.log("Command+P detected.");
        
        // If already running, stop it first
        if (isRunning) {
          isRunning = false;
          robot.mouseToggle("up");
        }
        
        // Schedule drawing
        scheduleDrawing();
      }
    });
    
    keyCheckProcess.stderr.on('data', (data) => {
      console.error(`Key monitor error: ${data}`);
    });
    
    // Make sure to kill the monitoring process when the main script exits
    process.on('exit', () => {
      if (keyCheckProcess) {
        keyCheckProcess.kill();
      }
    });
    
  } catch (error) {
    console.error("Failed to set up key monitoring:", error);
    console.log("Key shortcuts won't be available.");
  }
}

// Main execution
console.log("Starting in 3 seconds. Please navigate to TradingView chart...");
console.log("Keyboard controls:");
console.log("- Press ESC to terminate the script");
console.log("- Press Command+P to schedule a new horizontal line draw (5-second delay)");
console.log("- When you move the mouse, drawing will pause and restart after 3 seconds");

// Start keyboard monitoring
setupKeyboardShortcuts();

// Start the mouse monitoring process
startMonitoring();

// Start the drawing process after initial delay
setTimeout(() => {
  drawHorizontalLine();
}, 3000);

// Handle process termination
process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  console.log("Script terminated.");
  process.exit(0);
});
