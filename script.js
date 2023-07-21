const canvas = document.getElementById("robotCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth * 0.9;
canvas.height = window.innerHeight * 0.9;
let waypoints = [];
let splinePoints = [];
let previousPositions = [
  { x: canvas.width / 2, y: canvas.height / 2 },
];

// Initial robot state
let posX = canvas.width / 2;
let posY = canvas.height / 2;
let angle = 0;
const stepSize = 5; // Adjust the step size as needed
let segmentThing = 0.01;

// Timer variables for following the spline
let timerId = null;

// Function to draw the robot at its current position and orientation
function drawRobot() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(posX, posY);
  ctx.rotate(angle);
  ctx.fillStyle = "red";
  ctx.fillRect(-25, -15, 50, 30); // Represent the robot as a rectangle
  ctx.fillStyle = "black";
  ctx.fillRect(12, -5, 10, 10); // Represent the robot's center of rotation
  ctx.restore();

  // Draw waypoints
  ctx.fillStyle = "blue";
  for (const point of waypoints) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Draw spline
  ctx.strokeStyle = "green";
  ctx.beginPath();
  if (splinePoints.length > 0) {
    ctx.moveTo(splinePoints[0].x, splinePoints[0].y);
    for (const point of splinePoints) {
      ctx.lineTo(point.x, point.y);
    }
  }
  ctx.stroke();

  ctx.strokeStyle = "yellow";
  ctx.beginPath();
  ctx.moveTo(previousPositions[0].x, previousPositions[0].y);
  for (const point of previousPositions) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
}

// Function to move the robot
function moveRobot(leftSpeed, rightSpeed) {
  // Differential drive algorithm
  const avgSpeed = (leftSpeed + rightSpeed) / 2;
  const diffSpeed = (leftSpeed - rightSpeed) / 2;

  angle += diffSpeed / document.getElementById("turnSlider").value; // Adjust the rotation factor as needed
  posX += avgSpeed * Math.cos(angle);
  posY += avgSpeed * Math.sin(angle);

  previousPositions.push({ x: posX, y: posY });
  if (previousPositions.length > document.getElementById("pathSlider").value) {
    previousPositions.shift();
  }
  drawRobot();
}

function limitAngle(angle) {
  while (angle > Math.PI) {
    angle -= 2 * Math.PI;
  }
  while (angle < -Math.PI) {
    angle += 2 * Math.PI;
  }
  return angle;
}

function followSpline() {
  if (splinePoints.length <= 1) {
    return; // No spline points available
  }

  const targetX = splinePoints[0].x;
  const targetY = splinePoints[0].y;
  const deltaX = targetX - posX;
  const deltaY = targetY - posY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  if (distance > 1) {
    const angleToTarget = Math.atan2(deltaY, deltaX);
    const diffAngle = limitAngle(angleToTarget - angle);
    const maxTurnAngle = Math.PI / document.getElementById("piSlider").value; // Adjust the turn angle as needed

    console.log(diffAngle);

    let lSpeed = 0;
    let rSpeed = 0;
    if (Math.abs(diffAngle) < maxTurnAngle) {
      if (diffAngle > 0) {
        lSpeed = Math.min(distance, stepSize);
        rSpeed = lSpeed * (1 - diffAngle / maxTurnAngle);
      } else {
        rSpeed = Math.min(distance, stepSize);
        lSpeed = rSpeed * (1 + diffAngle / maxTurnAngle);
      }
    } else {
      if (diffAngle < 0) {
        lSpeed = -stepSize;
        rSpeed = stepSize;
      } else {
        lSpeed = stepSize;
        rSpeed = -stepSize;
      }
    }

    moveRobot(lSpeed, rSpeed);

    drawRobot();
    ctx.beginPath();
    ctx.arc(targetX, targetY, 5, 0, 2 * Math.PI);
    ctx.fill();
  } else {
    // Remove the first point as we reached it
    if (splinePoints.length > 0) {
      splinePoints.shift();
    }
    for (
      let i = 0;
      i <
      Math.min(
        splinePoints.length - document.getElementById("aheadSlider").value - 1,
        document.getElementById("aheadSlider").value
      );
      i++
    ) {
      splinePoints.shift();
    }
  }

  if (distance < document.getElementById("underSlider").value) {
    for (let i = 0; i < Math.min(splinePoints.length - document.getElementById("poorSlider").value - 1, document.getElementById("poorSlider").value); i++) {
      splinePoints.shift();
    }
  }

  if (splinePoints.length > 0) {
    timerId = setTimeout(
      followSpline,
      document.getElementById("timeSlider").value
    );
  }
}

// Event listeners for arrow key presses
document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowLeft":
      moveRobot(-stepSize, stepSize); // Rotate left in place
      break;
    case "ArrowRight":
      moveRobot(stepSize, -stepSize); // Rotate right in place
      break;
    case "ArrowUp":
      moveRobot(stepSize, stepSize); // Move forward
      break;
    case "ArrowDown":
      moveRobot(-stepSize, -stepSize); // Move backward
      break;
    case "Enter":
      clearTimeout(timerId);
      followSpline();
    default:
      break;
  }
});

// Prevent default arrow key behavior to avoid scrolling
document.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
  }
  console.log(event.key);
});

function generateLinearSpline() {
  if (waypoints.length >= 2) {
    splinePoints = [waypoints[0]]; // Reset spline points
    // Implement spline generation algorithm (e.g., Catmull-Rom, Bezier, etc.)
    // For simplicity, we'll use a straight line here (linear interpolation)
    for (let i = 0; i < waypoints.length - 1; i++) {
      const startX = waypoints[i].x;
      const startY = waypoints[i].y;
      const endX = waypoints[i + 1].x;
      const endY = waypoints[i + 1].y;

      for (let t = 0; t <= 1; t += segmentThing) {
        const x = startX + (endX - startX) * t;
        const y = startY + (endY - startY) * t;
        splinePoints.push({ x, y });
      }
    }
  }
}

// Function to generate a Catmull-Rom spline through waypoints
function generateCatmullRomSpline() {
  if (waypoints.length >= 2) {
    splinePoints = []; // Reset spline points

    // Add two extra points at the beginning and end to enable the spline to pass through the first and last waypoints
    waypoints.unshift(waypoints[0]);
    waypoints.push(waypoints[waypoints.length - 1]);

    for (let i = 0; i < waypoints.length - 3; i++) {
      for (let t = 0; t <= 1; t += segmentThing) {
        const p0 = waypoints[i];
        const p1 = waypoints[i + 1];
        const p2 = waypoints[i + 2];
        const p3 = waypoints[i + 3];

        const x =
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t * t +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t * t * t);

        const y =
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t * t +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t * t * t);

        splinePoints.push({ x, y });
      }
    }

    // Remove the extra points added at the beginning and end
    waypoints.shift();
    waypoints.pop();
  }
}

function getSplineMode() {
  const radioButtons = document.getElementsByName("splineMode");
  for (const radioButton of radioButtons) {
    if (radioButton.checked) {
      return radioButton.value;
    }
  }
  return "linear"; // Default to linear if no mode is selected
}

// Function to generate the spline based on the selected mode
function generateSpline() {
  const splineMode = getSplineMode();
  if (splineMode === "linear") {
    generateLinearSpline();
  } else if (splineMode === "catmull-rom") {
    generateCatmullRomSpline();
  }
  drawRobot();
}

// Event listener for mouse click on the canvas
canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  waypoints.push({ x: mouseX, y: mouseY });
  generateSpline();
  addPointToTable({ x: mouseX, y: mouseY });
  drawRobot();
});

function addPointToTable(waypoint) {
  console.log(waypoint);
  let pointsTableBody = document.getElementById("points");
  const newRow = document.createElement('tr');
  const id = document.createElement('td');
  const xCell = document.createElement('td');
  const yCell = document.createElement('td');
  const deleteCell = document.createElement('td');
  const deleteButton = document.createElement('button');

  id.innerHTML = waypoints.length;
  xCell.innerText = waypoint.x.toFixed(2);
  yCell.innerText = waypoint.y.toFixed(2);

  deleteButton.innerText = 'Delete';
  deleteButton.classList.add('btn', 'btn-danger', 'btn-sm');
  deleteButton.addEventListener('click', () => {
    waypoints.splice(id - 1, 1);
    generateSpline();
    drawRobot();
    pointsTableBody.removeChild(newRow);
  });

  deleteCell.appendChild(deleteButton);

  newRow.appendChild(id);
  newRow.appendChild(xCell);
  newRow.appendChild(yCell);
  newRow.appendChild(deleteCell);

  pointsTableBody.appendChild(newRow);
}
// Initial robot position
drawRobot();

function updateText(id) {
    document.getElementById(id + "Text").innerHTML = document.getElementById(id).value;
}