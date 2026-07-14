var PLAY = 1;
var END = 0;
var gameState = PLAY;

var trex, trex_running, trex_collided;
var ground, invisibleGround, groundImage;

var cloudsGroup, cloudImage;
var obstaclesGroup, obstacle1, obstacle2, obstacle3, obstacle4, obstacle5, obstacle6;

var score=0;

var gameOver, restart, gameOverImg, restartImg;

// Base canvas size the original game was designed for.
// Used to keep proportions (jump height, gravity feel, sprite scale) consistent
// no matter how big the window actually is.
var BASE_HEIGHT = 200;

// ----- visual theme -----
var skyTop, skyBottom, neonAccent, neonAccent2;
var stars = [];
var groundPulse = 0;
var skyBuffer; // pre-rendered gradient, redrawn only on resize (not every frame)
var MAX_SPEED = 7; // cap so obstacles never move so many px/frame that they visually alias "backwards"

localStorage["HighestScore"] = 0;

function preload(){
  trex_running =   loadAnimation("trex1.png","trex3.png","trex4.png");
  trex_collided = loadAnimation("trex_collided.png");
  
  groundImage = loadImage("ground2.png");
  
  cloudImage = loadImage("cloud.png");
  
  obstacle1 = loadImage("obstacle1.png");
  obstacle2 = loadImage("obstacle2.png");
  obstacle3 = loadImage("obstacle3.png");
  obstacle4 = loadImage("obstacle4.png");
  obstacle5 = loadImage("obstacle5.png");
  obstacle6 = loadImage("obstacle6.png");
  
  gameOverImg = loadImage("gameOver.png");
  restartImg = loadImage("restart.png");
}

function setup() {
  // fill the entire browser window
  createCanvas(windowWidth, windowHeight);
  
  // dinosaur-age color palette
  skyTop = color(210, 120, 50);
  skyBottom = color(250, 210, 140);
  neonAccent = color(220, 150, 70);
  neonAccent2 = color(70, 120, 60);
  
  textFont("Courier New");
  
  buildSkyBuffer();
  
  // scattered background stars for a parallax feel
  for (var i = 0; i < 80; i++) {
    stars.push({
      x: random(width),

      y: random(height * 0.7),
      size: random(1, 3),
      twinkleSpeed: random(0.02, 0.08),
      twinklePhase: random(TWO_PI)
    });
  }
  
  trex = createSprite(50, groundLevelY() - 21, 20, 50);
  
  trex.addAnimation("running", trex_running);
  trex.addAnimation("collided", trex_collided);
  trex.scale = 0.5;
  
  ground = createSprite(width/2, groundLevelY(), width, 20);
  ground.addImage("ground",groundImage);
  ground.x = ground.width /2;
  ground.velocityX = -(6 + 3*score/100);
  
  gameOver = createSprite(width/2, height/2 - 30);
  gameOver.addImage(gameOverImg);
  
  restart = createSprite(width/2, height/2 + 10);
  restart.addImage(restartImg);
  
  gameOver.scale = 0.5;
  restart.scale = 0.5;

  gameOver.visible = false;
  restart.visible = false;
  
  invisibleGround = createSprite(width/2, groundLevelY() + 10, width, 10);
  invisibleGround.visible = false;
  
  cloudsGroup = new Group();
  obstaclesGroup = new Group();
  
  score = 0;
}

// y-coordinate of the ground, placed in the middle of the screen
function groundLevelY() {
  return height / 2;
}

// how close to the ground the trex needs to be before it's allowed to jump again
function jumpThresholdY() {
  return height / 2 - 21;
}

// current scroll speed, capped so it never gets fast enough per-frame to
// visually alias into looking like it's moving backwards
function currentSpeed() {
  return -Math.min(6 + 3*score/100, MAX_SPEED);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildSkyBuffer();
  
  ground.y = groundLevelY();
  ground.width = width;
  
  invisibleGround.y = groundLevelY() + 10;
  invisibleGround.width = width;
  
  gameOver.x = width/2;
  gameOver.y = height/2 - 30;
  
  restart.x = width/2;
  restart.y = height/2 + 10;
}

function draw() {
  //trex.debug = true;
  drawBackground();
  drawGroundGlow();
  
  if (gameState===PLAY){
    score = score + Math.round(getFrameRate()/60);
    ground.velocityX = currentSpeed();
  
  if ((keyDown("space") || keyDown(UP_ARROW)) && trex.y >= jumpThresholdY()) {
    trex.velocityY = -10;
}

  trex.velocityY += 0.5;
  trex.collide(invisibleGround);
  
    if (ground.x < 0){
      ground.x = ground.width/2;
    }
  
    trex.collide(invisibleGround);
    spawnClouds();
    spawnObstacles();
  
    if(obstaclesGroup.isTouching(trex)){
        gameState = END;
    }
  }
  else if (gameState === END) {
    gameOver.visible = true;
    restart.visible = true;
    
    //set velcity of each game object to 0
    ground.velocityX = 0;
    trex.velocityY = 0;
    obstaclesGroup.setVelocityXEach(0);
    cloudsGroup.setVelocityXEach(0);
    
    //change the trex animation
    trex.changeAnimation("collided",trex_collided);
    
    //set lifetime of the game objects so that they are never destroyed
    obstaclesGroup.setLifetimeEach(-1);
    cloudsGroup.setLifetimeEach(-1);
    
    if(mousePressedOver(restart)) {
      reset();
    }
  }
  
  
  if (gameState === END) {
    drawGameOverPanel();
  }
  drawSprites();
  drawHUD();
}

// build the sky gradient once into an offscreen buffer (cheap to blit every frame)
function buildSkyBuffer() {
  skyBuffer = createGraphics(width, height);
  skyBuffer.noStroke();
  for (var y = 0; y < height; y++) {
    var t = y / height;
    skyBuffer.stroke(lerpColor(skyTop, skyBottom, t));
    skyBuffer.line(0, y, width, y);
  }

  // distant sun glow
  skyBuffer.noStroke();
  skyBuffer.fill(255, 220, 130, 140);
  skyBuffer.ellipse(width * 0.75, height * 0.2, width * 0.25, height * 0.25);

  // distant volcanic mountains and cliffs
  skyBuffer.fill(90, 60, 35, 220);
  skyBuffer.triangle(width * 0.1, height * 0.7, width * 0.25, height * 0.35, width * 0.4, height * 0.7);
  skyBuffer.triangle(width * 0.35, height * 0.7, width * 0.55, height * 0.45, width * 0.7, height * 0.7);
  skyBuffer.triangle(width * 0.58, height * 0.7, width * 0.7, height * 0.5, width * 0.8, height * 0.7);

  // volcano plume
  skyBuffer.fill(255, 200, 120, 140);
  skyBuffer.ellipse(width * 0.13, height * 0.43, width * 0.14, height * 0.18);
  skyBuffer.fill(220, 160, 90, 160);
  skyBuffer.ellipse(width * 0.15, height * 0.35, width * 0.08, height * 0.12);

  // soft cloud layers
  for (var c = 0; c < 4; c++) {
    skyBuffer.fill(245, 220, 170, 120 - c * 20);
    skyBuffer.ellipse(width * (0.25 + c * 0.18), height * (0.22 + c * 0.06), width * 0.24, height * 0.08);
    skyBuffer.ellipse(width * (0.35 + c * 0.15), height * (0.14 + c * 0.08), width * 0.18, height * 0.06);
  }

  // subtle dust and insects
  for (var i = 0; i < 90; i++) {
    skyBuffer.fill(255, 220, 180, random(10, 35));
    var sx = random(width);
    var sy = random(height * 0.55);
    var ss = random(1, 2.5);
    skyBuffer.ellipse(sx, sy, ss, ss);
  }
}

// blit the pre-rendered sky + draw prehistoric atmosphere
function drawBackground() {
  image(skyBuffer, 0, 0);
  
  noStroke();
  for (var i = 0; i < stars.length; i++) {
    var s = stars[i];
    var twinkle = 120 + 80 * sin(frameCount * s.twinkleSpeed + s.twinklePhase);
    fill(255, 220, 180, twinkle * 0.4);
    ellipse(s.x, s.y, s.size, s.size);
  }

  // flying pterodactyl silhouettes
  for (var f = 0; f < 3; f++) {
    var fx = (frameCount * (1 + f * 0.3) + f * 180) % width;
    var fy = height * 0.15 + f * 22;
    fill(60, 40, 25, 220);
    noStroke();
    triangle(fx, fy, fx + 18, fy - 8, fx + 30, fy + 4);
    triangle(fx + 10, fy + 2, fx + 22, fy - 10, fx + 34, fy + 2);
  }

  // foreground palms and fern silhouettes
  noStroke();
  fill(50, 50, 30, 220);
  var baseY = height * 0.75;
  rect(0, baseY, width * 0.35, height * 0.25);
  rect(width * 0.65, baseY, width * 0.35, height * 0.25);
  
  // left foliage
  for (var l = 0; l < 5; l++) {
    var leafY = baseY - 10 - l * 12;
    triangle(width * 0.08, leafY, width * 0.02, leafY - 22, width * 0.14, leafY - 10);
    triangle(width * 0.1, leafY + 8, width * 0.03, leafY - 14, width * 0.18, leafY - 4);
  }
  
  // right foliage
  for (var r = 0; r < 5; r++) {
    var leafY = baseY - 12 - r * 12;
    triangle(width * 0.92, leafY, width * 0.86, leafY - 22, width * 0.98, leafY - 10);
    triangle(width * 0.9, leafY + 8, width * 0.84, leafY - 14, width * 0.96, leafY - 4);
  }
}

// enhanced ground with multiple neon glowing layers and animated particles
function drawGroundGlow() {
  groundPulse += 0.05;
  var glow1 = 120 + 80 * sin(groundPulse);
  var glow2 = 100 + 60 * sin(groundPulse + 0.5);
  var glow3 = 80 + 50 * sin(groundPulse + 1);
  
  // outer glow layer (cyan)
  strokeWeight(6);
  stroke(red(neonAccent), green(neonAccent), blue(neonAccent), glow1 * 0.3);
  line(0, groundLevelY() - 10, width, groundLevelY() - 10);
  
  // middle glow layer (cyan)
  strokeWeight(4);
  stroke(red(neonAccent), green(neonAccent), blue(neonAccent), glow2 * 0.6);
  line(0, groundLevelY() - 10, width, groundLevelY() - 10);
  
  // brightest center line (cyan)
  strokeWeight(2);
  stroke(red(neonAccent), green(neonAccent), blue(neonAccent), glow1);
  line(0, groundLevelY() - 10, width, groundLevelY() - 10);
  
  // pink accent line below
  strokeWeight(2);
  stroke(red(neonAccent2), green(neonAccent2), blue(neonAccent2), glow3 * 0.7);
  line(0, groundLevelY() + 5, width, groundLevelY() + 5);
  
  // dashed animated accent line
  var dashOffset = frameCount * 2;
  stroke(red(neonAccent), green(neonAccent), blue(neonAccent), glow2 * 0.5);
  strokeWeight(1);
  drawingContext.setLineDash([10, 5]);
  drawingContext.lineDashOffset = -dashOffset;
  line(0, groundLevelY() - 3, width, groundLevelY() - 3);
  drawingContext.setLineDash([]);
  
  // ground area gradient fill
  noStroke();
  var gradient = drawingContext.createLinearGradient(0, groundLevelY(), 0, groundLevelY() + 40);
  gradient.addColorStop(0, `rgba(0, 255, 200, ${glow1 * 0.08})`);
  gradient.addColorStop(1, `rgba(0, 255, 200, 0)`);
  drawingContext.fillStyle = gradient;
  rect(0, groundLevelY(), width, 40);
  
  strokeWeight(1);
  noStroke();
}

// score + high score HUD, top-right, with glassmorphism effect
function drawHUD() {
  var highScore = localStorage["HighestScore"] || 0;
  var hudW = 200;
  var hudH = 90;
  var hudX = width - hudW - 15;
  var hudY = 15;
  
  // glassmorphism background
  noStroke();
  fill(20, 8, 40, 150);
  rect(hudX, hudY, hudW, hudH, 12);
  
  // glowing border
  var borderGlow = 100 + 50 * sin(frameCount * 0.05);
  noFill();
  strokeWeight(2);
  stroke(red(neonAccent), green(neonAccent), blue(neonAccent), borderGlow);
  rect(hudX, hudY, hudW, hudH, 12);
  
  // enhanced text with multiple glow layers
  textAlign(RIGHT, TOP);
  textSize(28);
  textStyle(BOLD);
  
  // outer glow
  fill(red(neonAccent), green(neonAccent), blue(neonAccent), 30);
  text(nf(score, 5), hudX + hudW - 12, hudY + 12);
  text(nf(score, 5), hudX + hudW - 10, hudY + 12);
  
  // bright text
  fill(255);
  text(nf(score, 5), hudX + hudW - 8, hudY + 10);
  
  // score label
  textSize(11);
  textStyle(NORMAL);
  fill(red(neonAccent), green(neonAccent), blue(neonAccent), 200);
  text("SCORE", hudX + hudW - 8, hudY + 38);
  
  // high score section
  textSize(18);
  textStyle(BOLD);
  fill(red(neonAccent2), green(neonAccent2), blue(neonAccent2), 200);
  text(nf(highScore, 5), hudX + hudW - 8, hudY + 58);
  
  textSize(10);
  textStyle(NORMAL);
  fill(red(neonAccent2), green(neonAccent2), blue(neonAccent2), 150);
  text("HI SCORE", hudX + hudW - 8, hudY + 72);
  
  textAlign(LEFT, BASELINE);
  textStyle(NORMAL);
  noStroke();
}

// dark glassy panel with intense neon effects behind the game-over / restart sprites
function drawGameOverPanel() {
  var panelW = 320;
  var panelH = 180;
  var panelX = width/2 - panelW/2;
  var panelY = height/2 - panelH/2;
  
  // multiple glow layers for intensity
  var pulse1 = 50 + 40 * sin(frameCount * 0.06);
  var pulse2 = 30 + 30 * sin(frameCount * 0.08 + 1);
  
  // outer glow effect
  noFill();
  strokeWeight(3);
  stroke(red(neonAccent2), green(neonAccent2), blue(neonAccent2), pulse1 * 0.4);
  rect(panelX - 6, panelY - 6, panelW + 12, panelH + 12, 14);
  
  // main background with transparency
  noStroke();
  fill(10, 5, 20, 220);
  rect(panelX, panelY, panelW, panelH, 12);
  
  // inner glowing border
  noFill();
  strokeWeight(2.5);
  stroke(red(neonAccent2), green(neonAccent2), blue(neonAccent2), pulse1);
  rect(panelX, panelY, panelW, panelH, 12);
  
  // accent top line
  strokeWeight(2);
  stroke(red(neonAccent), green(neonAccent), blue(neonAccent), pulse2 * 1.5);
  line(panelX + 20, panelY + 10, panelX + panelW - 20, panelY + 10);
  
  // game over text
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  textSize(26);
  
  // text glow effect
  fill(red(neonAccent2), green(neonAccent2), blue(neonAccent2), 60);
  text("GAME OVER", width/2, panelY + 25);
  
  fill(255);
  text("GAME OVER", width/2, panelY + 23);
  
  // instruction text
  textSize(13);
  textStyle(NORMAL);
  fill(200, 200, 220, 200);
  text("click restart to play again", width/2, panelY + panelH - 35);
  
  // decorative corners
  stroke(red(neonAccent), green(neonAccent), blue(neonAccent), 100);
  strokeWeight(2);
  line(panelX + 10, panelY, panelX, panelY + 10);
  line(panelX + panelW - 10, panelY, panelX + panelW, panelY + 10);
  line(panelX, panelY + panelH - 10, panelX + 10, panelY + panelH);
  line(panelX + panelW, panelY + panelH - 10, panelX + panelW - 10, panelY + panelH);
  
  textAlign(LEFT, BASELINE);
  textStyle(NORMAL);
  noStroke();
}

function spawnClouds() {
  //write code here to spawn the clouds
  if (frameCount % 60 === 0) {
    var cloud = createSprite(width + 40, height*0.6, 40, 10);
    cloud.y = Math.round(random(height*0.1, height*0.3));
    cloud.addImage(cloudImage);
    cloud.scale = 0.5;
    cloud.velocityX = -3;
    
     //assign lifetime to the variable
    cloud.lifetime = 300;
    
    //adjust the depth
    cloud.depth = trex.depth;
    trex.depth = trex.depth + 1;
    
    //add each cloud to the group
    cloudsGroup.add(cloud);
  }
  
}

function spawnObstacles() {
  if(frameCount % 60 === 0) {
    var obstacle = createSprite(width + 20, groundLevelY() - 15, 6, 20);
    //obstacle.debug = true;
    obstacle.velocityX = currentSpeed();
    
    //generate random obstacles
    var rand = Math.round(random(1,6));
    switch(rand) {
      case 1: obstacle.addImage(obstacle1);
              break;
      case 2: obstacle.addImage(obstacle2);
              break;
      case 3: obstacle.addImage(obstacle3);
              break;
      case 4: obstacle.addImage(obstacle4);
              break;
      case 5: obstacle.addImage(obstacle5);
              break;
      case 6: obstacle.addImage(obstacle6);
              break;
      default: break;
    }
    
    //assign scale and lifetime to the obstacle           
    obstacle.scale = 0.5;
    obstacle.lifetime = 300;
    //add each obstacle to the group
    obstaclesGroup.add(obstacle);
  }
}

function reset(){
  gameState = PLAY;
  gameOver.visible = false;
  restart.visible = false;
  
  obstaclesGroup.destroyEach();
  cloudsGroup.destroyEach();
  
  trex.changeAnimation("running",trex_running);
  
  if(localStorage["HighestScore"]<score){
    localStorage["HighestScore"] = score;
  }
  console.log(localStorage["HighestScore"]);
  
  score = 0;
  
}