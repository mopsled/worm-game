var game = new Object;
var worm = new Object;

var LOCAL_STORAGE_VERSION = 'version';
var LOCAL_STORAGE_HIGH_SCORE = 'highScore';

var GRID_OUTER_WIDTH = '2.0';
var GRID_OUTER_COLOR = '#000';
var DOT_COLORS = Array('88A825', '35203B', '911146', 'CF4A39', 'ED8C2B', '4BB5C1', '345BC1');
			
// Initialize all worm properties and event listeners
function init() {
	// game properties:
	//	.canvas - the canvas that the worm will be drawn to
	//	.context - a 2d context in which to draw the worm game
	//	.speed - the number of milliseconds for each frame. Lower value = faster fame
	//	.paused - holds true value if the game is paused. A paused game will not update the grid
	//	.score - the point value that the game is currently at (used for 'score:')
	//	.score - the max point value for the gam ever
	//	.highScore - the maximum score acheived. This is stored in localStorage, if possible
	//	.updateBoardIntervalId - the interval id of the updateBoard()'s setInterval. This is
	//		used to stop and start the repeated updating of the board if the game is paused
	//		and restarted
	//	.grid - Holds the size and shape properties of the grid (more below)
	//	.dot - Holds dot properies, such as point value and location (more below)

	// worm properties:
	//	.direction - a variable that holds the direction the worm is currently moving in:
	//		'none' - for not moving
	//		and 'left', 'right', 'up', and 'down' for any move in those directions
	//	.previousCells - an array of objects (previousCells[index].x and previousCells[index].y) holding
	//		the most recent places that the worm has been, with up to worm.maxSize places
	//	.length - the current length of the worm
	//	.movedThisTurn - holds true value if a move has been entered this turn
	// 	.cachedMove - holds 'left', 'right', 'up', or 'down' if a move has been been cached from
	//		this frame for the next frame. Used for storing a single move if the user enters
	//		moves faster than the grid updates
	//	.maxSize - the maximum length of a worm on board, and the worm.previousCells array
	//	.position - X & Y coordinates for worm position
	
	game.canvas = document.getElementById('game');
	game.context = game.canvas.getContext('2d');
	game.speed = 70;
	game.paused = false;
	game.score = 0;
	game.highScore = retrieveHighScore();

	worm.direction = 'none';
	worm.previousCells = new Array();
	worm.length = 1;
	worm.movedThisTurn = false;
	worm.cachedMove = 'none';
	worm.maxSize = 100;
	
	
	
	// Grid properties: game.grid
	//	.size - In pixels, size of a side of a square in the grid
	//	.width, .height - In pixels, should be a multiple of the size
	//	.offsetX, .offsetY - the offset of the grid in the X and Y direction on the canvas
	game.grid = new Object;
	game.grid.size = 20;
	game.grid.width = 700;
	game.grid.height = 400;
	game.grid.offsetX = 10;
	game.grid.offsetY = 10;
	
	// Dot properties: game.dot
	//	.timePerStage - the amount of time (in milliseconds) that a dot stays a point value
	//	.minValue, .maxValue - the lower and upper bounds of point value for a dot
	// 	.exists - a boolean variable specifying dot existance
	//	.x - the x position (in grid value, not pixel value) of the worm
	//	.y - the y position (in grid value, not pixel value) of the worm
	//	.color - a hexidecimal string (e.g. '123456') that holds the dot's color
	//	.timeToLiveThisStage - the number of milliseconds left in the current stage
	//	.value - the current value of the dot on the board (between .minValue and .maxValue)
	game.dot = new Object;
	game.dot.timePerStage = 250;
	game.dot.minValue = 6;
	game.dot.maxValue = 16;
	game.dot.exists = false;
	game.pickup.exists = false;
	
	game.dots = new Array();

	// Position properties: worm.position
	//	.x, .y - the current x and y position (in grid value, not pixel value) of the worm
	worm.position = new Object;
	worm.position.x = getRandomX();
	worm.position.y = getRandomY();
	
	// Add key event listener
	window.addEventListener('keydown', wormKeyHit, false);
	
	worm.updateBoardIntervalId = setInterval('updateBoard()', game.speed);
}

function getRandomX() {
	return Math.floor(Math.random()*(game.grid.width/game.grid.size + 1));
}

function getRandomY() {
	return Math.floor(Math.random()*(game.grid.height/game.grid.size + 1));
}

// Redraw the board
function updateBoard() {
	resetCanvas(game.canvas);
	drawGrid(game.context);
	
	// If the worm is currently playing, add its current position to previousCells
	if(worm.direction != 'none') {
		position = new Object;
		position.x = worm.position.x;
		position.y = worm.position.y;
		worm.previousCells.push(position);
		
		// Keep previousCells.length to a maximum size of worm.maxSize
		while(worm.previousCells.length > worm.maxSize) {
			worm.previousCells.shift();
		}
	}

	moveWorm();
	
	// If the worm's position lies outside of the board, reset the board
	var lessThanX = worm.position.x < 0;
	var lessThanY = worm.position.y < 0;
	var greaterThanx = worm.position.x > (game.grid.width/game.grid.size - 1);
	var greaterThanY = worm.position.y > (game.grid.height/game.grid.size - 1)

	if(lessThanX || lessThanY || greaterThanx || greaterThanY) {
		resetBoard();
	}

	drawWorm(game.context);
	
	if(worm.direction != 'none') {
		if(items.size() > 0) {
			drawDots(game.context);
		} else {
			makeRandomDots();
		}
	}


	if(worm.direction != 'none' && collision()) {
		resetBoard();
	}

	if(game.dot.x == worm.position.x && game.dot.y == worm.position.y) {
		game.dot.exists = false;
		worm.length += 1;
		game.score += game.dot.value;
	}
	
	if(game.score > game.highScore) {
		setHighScore(game.score);
	}

	drawText(game.context);
}

function moveWorm() {
	// For each of the four directions, follow this logic:
	//	change the worm's coordinates
	//	mark the worm as not having moved
	//	if the is a cached move:
	//		if the cached move does not violate the way the worm should go:
	//			queue the cached move as the next move for the worm
	//		otherwise:
	//			remove cached move
	if(worm.direction == 'left') {
		worm.position.x = worm.position.x - 1;
		worm.movedThisTurn = false;
		
		if(worm.cachedMove != 'none') {
			if(worm.cachedMove != 'right') {
				worm.direction = worm.cachedMove;
				worm.cachedMove = 'none';
				worm.movedThisTurn = 'true';
			} else {
				worm.cachedMove = 'none';
			}
		}
		
	} else if(worm.direction == 'right') {
		worm.position.x = worm.position.x + 1;
		worm.movedThisTurn = false;
		
		if(worm.cachedMove != 'none') {
			if(worm.cachedMove != 'left') {
				worm.direction = worm.cachedMove;
				worm.cachedMove = 'none';
				worm.movedThisTurn = 'true';
			} else {
				worm.cachedMove = 'none';
			}
		}
		
	} else if(worm.direction == 'up') {
		worm.position.y = worm.position.y - 1;
		worm.movedThisTurn = false;
		
		if(worm.cachedMove != 'none') {
			if(worm.cachedMove != 'down') {
				worm.direction = worm.cachedMove;
				worm.cachedMove = 'none';
				worm.movedThisTurn = 'true';
			} else {
				worm.cachedMove = 'none';
			}
		}
		
	} else if(worm.direction == 'down') {
		worm.position.y = worm.position.y + 1;
		worm.movedThisTurn = false;
		
		if(worm.cachedMove != 'none') {
			if(worm.cachedMove != 'up') {
				worm.direction = worm.cachedMove;
				worm.cachedMove = 'none';
				worm.movedThisTurn = 'true';
			} else {
				worm.cachedMove = 'none';
			}
		}
	}
}

function resetCanvas(canvas) {
	game.canvas.height = game.canvas.height;
	game.canvas.width = game.canvas.width;
}

function drawGrid(context) {

	// Draw the outer boundry of the board
	context.beginPath();
	context.moveTo(game.grid.offsetX, game.grid.offsetY);
	context.lineTo(game.grid.offsetX, game.grid.offsetY + game.grid.height);
	context.lineTo(game.grid.offsetX + game.grid.width, game.grid.offsetY + game.grid.height)
	context.lineTo(game.grid.offsetX + game.grid.width, game.grid.offsetY);
	context.lineTo(game.grid.offsetX, game.grid.offsetY);
	context.strokeStyle = GRID_OUTER_COLOR;
	context.lineWidth = GRID_OUTER_WIDTH;
	context.closePath();
	context.stroke();
}

function drawWorm(context) {
	// Draw the head-end dot of the worm (always visible)
	context.fillStyle = '#000000';
	context.fillRect(game.grid.offsetX + worm.position.x * game.grid.size - .5, 
		game.grid.offsetY + worm.position.y * game.grid.size + .5, 
		game.grid.size + 1, game.grid.size + 1);
	
	// If the worm is longer than one block
	if(worm.length > 1) {
		// If the worm's length is greater than the maximum size, trim it back down to the maximum size
		if(worm.length > worm.maxSize){
			worm.length = worm.maxSize;
		}
		
		// For each of the rest of the blocks in the worm's tail
		for(var n = worm.length - 1; n != 0; n--) {
			// Do some math magic to create a gradient for the tail
			context.fillStyle = 'rgb(' + Math.floor(0x00/worm.length * n) + ', ' + 
				Math.floor(0xbb/worm.length * n) + ', ' + Math.floor(0x00/worm.length * n) + ')';
			context.fillRect(game.grid.offsetX + worm.previousCells[worm.previousCells.length-n].x * game.grid.size - .5, 
				game.grid.offsetY + worm.previousCells[worm.previousCells.length-n].y * game.grid.size + .5, 
				game.grid.size + 1, game.grid.size + 1);
		}
	}
}

function drawDots(context) {
	// Strip the red, green, and blue values from the dot's color
	var color = new Object;
	color.red = 50;
	color.green = 225;
	color.blue = 50;
	
	
}

function drawDot(dot,color) {
	// Fill in the dot on the grid with a transparency based off of the dot's current value and
	//	the amount of time it has left in the stage. Should give a clean fading animation to the dot.
	context.fillStyle = 'rgba(' + color.red + "," + color.green + "," + color.blue "," + 
		(dot.value + dot.timeToLiveThisStage/dot.timePerStage)/(game.dot.maxValue + 1) + ')';		
	context.fillRect(game.grid.offsetX + dot.x * game.grid.size + .5, 
					 game.grid.offsetY + dot.y * game.grid.size + .5, 
					 game.grid.size, game.grid.size);
	
	// If game.dot.timeToLiveThisStage is positive, subtract the amount of time taken from the current frame
	if(dot.timeToLiveThisStage > 0) {
		dot.timeToLiveThisStage -= game.speed;
	}
	
	// If the dot value isn't at the minimum and timeToLiveThisStage has hit zero
	if(dot.value > game.dot.minValue && (dot.timeToLiveThisStage <= 0)) {
		dot.value -= 1;
		dot.timeToLiveThisStage = dot.timePerStage;
	}
}

function makeRandomDots() {
	var position = getUnusedPosition();
	
	dot.x = position.x;
	dot.y = position.y;
	dot.color = DOT_COLORS[0];
	dot.timeToLiveThisStage = game.dot.timePerStage;
	dot.value = game.dot.maxValue;
	dot.exists = true;
}

// function drawPickups(context) {
// 	var dot = makeRandomPowerup();
// 	console.log(dot);
// 	if (dot[0] == -1)
// 		return;
// 	context.fillStyle = DOT_COLORS[Math.random() % DOT_COLORS.length];
// 	context.fillRect(dot[0],dot[1],game.grid.size,game.grid.size);
// }

// function makeRandomPowerup() {
// 	if(Math.random() % 3 != 0) 
// 		return [-1,-1];

// 	var position = getUnusedPosition();

// 	var dot = new Object;
// 	dot.x = position.x;
// 	dot.y = position.y;
// 	dot.exists = true;
// 	//dot.powerup = POWERUPS[Math.random() % 5];
// 	game.dots.push(dot);
// 	return [dot.x,dot.y];
// }

function drawText(context) {
	if(worm.direction != 'none') {
		context.fillStyle = '#000';
		context.font = "20px Georgia";
		context.textAlign = "right"
		context.fillText("dot score: " + game.dot.value, game.canvas.width - game.grid.offsetX, 
			game.canvas.height - 60);
	}
	
	context.textAlign = "left"
	context.fillStyle = '#000';
	context.font = "20px Georgia";
	context.fillText("score: " + game.score, 10, game.canvas.height - 60);
	
	if(game.highScore != 0) {
		context.textAlign = "center"
		context.fillStyle = '#000';
		context.font = "20px Georgia";
		context.fillText("high score: " + game.highScore, 
			(game.canvas.width - game.grid.offsetX + game.grid.offsetY)/ 2, 
			game.canvas.height - 35);
	}
}

function setHighScore(score) {
	game.highScore = score;

	if(supportsLocalStorage()) {
		localStorage.setItem(LOCAL_STORAGE_HIGH_SCORE, score)
	}
}

function retrieveHighScore(score) {
	if(supportsLocalStorage() && localStorage.getItem(LOCAL_STORAGE_HIGH_SCORE)) {
		return localStorage.getItem(LOCAL_STORAGE_HIGH_SCORE);
	} else {
		return 0;
	}
}

// Returns true if the worm has collided with itself
function collision() {
	for(var n = 0; n != worm.length - 1; n++) {
		if(worm.position.x == worm.previousCells[worm.previousCells.length - n - 1].x &&
			worm.position.y == worm.previousCells[worm.previousCells.length - n - 1].y) {
			return true;
		}
	}
	
	return false;
}

// Set the board back to default - handle all lives/game over logic elsewhere.
// Sets the initial position to be random
function resetBoard() {
	game.score = 0;
	game.dot.exists = false;

	worm.direction = "none";
	worm.previousCells = new Array();
	worm.length = 1;
	worm.movedThisTurn = false; 
	worm.cachedMove = 'none';
	
	worm.position.x = 1 + Math.floor(Math.random()*(game.grid.width/game.grid.size - 2));
	worm.position.y = 1 + Math.floor(Math.random()*(game.grid.height/game.grid.size - 2));	
}

function getUnusedPosition() {
	var positionInWorm = true;

	while(positionInWorm) {
		var position = {
			x: Math.floor(Math.random() * game.grid.width/game.grid.size),
			y: Math.floor(Math.random() * game.grid.height/game.grid.size)
		};
		positionInWorm = false;

		var lastCellInWorm = worm.previousCells.length - worm.length;
		for(var i = worm.previousCells.length - 1; i > lastCellInWorm; --i) {
			if(position.x == worm.previousCells[i].x && position.y == worm.previousCells[i].y) {
				positionInWorm = true;
				break;
			}
		}
	}

	return position;
}

function wormKeyHit(e) {
	switch(e.keyCode) {
		// left key
		case 37:
			if(worm.direction != 'right') {
				if(!worm.movedThisTurn) {
					worm.direction = 'left';
					worm.movedThisTurn = true;
				} else if(worm.cachedMove == 'none') {
					worm.cachedMove = 'left';
				}
			}
			
			break;
			
		// up key
		case 38:
			if(worm.direction != 'down') {
				if(!worm.movedThisTurn) {
					worm.direction = 'up';
					worm.movedThisTurn = true;
				} else if(worm.cachedMove == 'none') {
					worm.cachedMove = 'up';
				}
			}
			break;
			
		// right key
		case 39:
			if(worm.direction != 'left') {
				if(!worm.movedThisTurn) {
					worm.direction = 'right';
					worm.movedThisTurn = true;
				} else if(worm.cachedMove == 'none') {
					worm.cachedMove = 'right';
				}
			}
			break;
			
		// down key
		case 40:
			if(worm.direction != 'up') {
				if(!worm.movedThisTurn) {
					worm.direction = 'down';
					worm.movedThisTurn = true;
				} else if(worm.cachedMove == 'none') {
					worm.cachedMove = 'down';
				}
			}
			break;
			
		// 'g' key
		case 71:
			if(worm.direction != 'none')
				worm.length += 1;
			break;

		// 'd' key
		case 68:
			if(worm.direction != 'none')
				makeRandomDot();
			break;
			
		// 'p' key
		case 80:
			if(worm.paused) {
				worm.updateBoardIntervalId = setInterval('updateBoard()', game.speed);
			} else {
				clearInterval(worm.updateBoardIntervalId);
			}
			
			worm.paused = !worm.paused;
			
			break;
			
		// '\' key
		case 220:
			setHighScore(0);
			resetBoard();
	}
	
	return false;
}

// Returns true if localStorage is present in the browser (source: http://bit.ly/cOSABP)			
function supportsLocalStorage() {
	try { 
		return 'localStorage' in window && window['localStorage'] !== null; 
	} catch (e) { 
		return false; 
	}
}

// Adds a .mod(x) function to numbers that handles negative numbers correctly
Number.prototype.mod = function(n) {
	return ((this%n)+n)%n;
}

$(document).ready(function() {
	init();
});
