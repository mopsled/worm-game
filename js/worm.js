var game = new Object();
//var worm = new Object();
var worms = Array(new Object(), new Object());

var LOCAL_STORAGE_VERSION = 'version';
var LOCAL_STORAGE_HIGH_SCORE = 'highScore';

var GRID_OUTER_WIDTH = '2.0';
var GRID_OUTER_COLOR = '#000';

var DOT_COLORS = Array('88A825', '345BC1', 'ED8C2B', 'C1BC36', 'CF4A39', '51386E');

var ITEMS = Array('FOOD', 'SHRINK', 'GROW', 'SLOW_TIME', 'BOMB', 'PORTAL');

var FOOD_ACTION = function(player) {
	worms[player].length = (worms[player].length + 1);

	isFoodOut = false;
};

var SHRINK_ACTION = function(player) {
	worms[player].length = Math.max(1, Math.floor(worms[player].length / 2));
};

var GROW_ACTION = function(player) {
	worms[player].length = Math.floor(worms[player].length * 1.5)  % worms[player].maxSize;
};

var SLOW_TIME_ACTION = function() {
	originalSpeed = game.speed;
	game.speed = originalSpeed * 2;
	clearInterval(game.updateBoardIntervalId);
	game.updateBoardIntervalId = setInterval('updateBoard()', game.speed);

	setTimeout(function() {
		game.speed = originalSpeed;
		clearInterval(game.updateBoardIntervalId);
		game.updateBoardIntervalId = setInterval('updateBoard()', game.speed);
	}, 3000);
};

var isFoodOut = false;

var BOMB_ACTION = function() {
	resetBoard();
};

var PORTAL_ACTION = function() {
	worms[0].position.x = getRandomX();
	worms[0].position.y = getRandomY();
};

var ITEMS_ACTIONS = Array(FOOD_ACTION, SHRINK_ACTION, GROW_ACTION, SLOW_TIME_ACTION, BOMB_ACTION, PORTAL_ACTION);
			
var TIME_PER_STAGE = 250;
var POWERUP_STAGES = 20;
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
	//	.previousCells - an array of object()s (previousCells[index].x and previousCells[index].y) holding
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

	for (var i = 0; i < 2; i++) {
		worms[i].direction = 'none';
		worms[i].previousCells = new Array();
		worms[i].length = 1;
		worms[i].movedThisTurn = false;
		worms[i].cachedMove = 'none';
		worms[i].maxSize = 100;
	}
	
	
	// Grid properties: game.grid
	//	.size - In pixels, size of a side of a square in the grid
	//	.width, .height - In pixels, should be a multiple of the size
	//	.offsetX, .offsetY - the offset of the grid in the X and Y direction on the canvas
	game.grid = new Object();
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
	game.dot = new Object();
	game.dot.timePerStage = 250;
	game.dot.minValue = 6;
	game.dot.maxValue = 16;
	game.dot.exists = false;
	
	game.dots = new Array();

	// Position properties: worm.position
	//	.x, .y - the current x and y position (in grid value, not pixel value) of the worm

	for (var i = 0; i < 2; i++) {
		worms[i].position = new Object();
		worms[i].position.x = getRandomX();
		worms[i].position.y = getRandomY();
	}

	
	// Add key event listener
	window.addEventListener('keydown', wormOneKeyHit, false);
	window.addEventListener('keydown',wormTwoKeyHit, false);
	
	game.updateBoardIntervalId = setInterval('updateBoard()', game.speed);
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

	for (var i = 0; i < 2; i++) {
		// If the worm is currently playing, add its current position to previousCells
		if(worms[i].direction != 'none') {
			position = new Object();
			position.x = worms[i].position.x;
			position.y = worms[i].position.y;
			worms[i].previousCells.push(position);
			
			// Keep previousCells.length to a maximum size of worm.maxSize
			while(worms[i].previousCells.length > worms[i].maxSize) {
				worms[i].previousCells.shift();
			}
		}

		moveWorm(i);
		
		// If the worm's position lies outside of the board, reset the board
		var lessThanX = worms[i].position.x < 0;
		var lessThanY = worms[i].position.y < 0;
		var greaterThanx = worms[i].position.x > (game.grid.width/game.grid.size - 1);
		var greaterThanY = worms[i].position.y > (game.grid.height/game.grid.size - 1)

		if(lessThanX || lessThanY || greaterThanx || greaterThanY) {
			resetBoard();
		}

		drawWorm(game.context,i);
		collideDots(i);
		
		if(worms[i].direction != 'none') {
			if(isFoodOut) {
				drawDots(game.context);
			} else {
				makeRandomDots();
			}
		}

		if(worms[i].direction != 'none' && collision(i)) {
			resetBoard();
		}
		
	
		if(game.score > game.highScore) {
			setHighScore(game.score);
		}

		drawText(game.context,i);
	}
}

function collideDots(player) {
	for(var i = 0; i < game.dots.length; i++) {
		var dot = game.dots[i];

		if(dot.x == worms[player].position.x && dot.y == worms[player].position.y) {
			dot['type'](player);
			game.dots.splice(i,1);
			return;
		}
	}
}

function moveWorm(player) {
	// For each of the four directions, follow this logic:
	//	change the worm's coordinates
	//	mark the worm as not having moved
	//	if the is a cached move:
	//		if the cached move does not violate the way the worm should go:
	//			queue the cached move as the next move for the worm
	//		otherwise:
	//			remove cached move
	if(worms[player].direction == 'left') {
		worms[player].position.x = worms[player].position.x - 1;
		worms[player].movedThisTurn = false;
		
		if(worms[player].cachedMove != 'none') {
			if(worms[player].cachedMove != 'right') {
				worms[player].direction = worms[player].cachedMove;
				worms[player].cachedMove = 'none';
				worms[player].movedThisTurn = 'true';
			} else {
				worms[player].cachedMove = 'none';
			}
		}
		
	} else if(worms[player].direction == 'right') {
		worms[player].position.x = worms[player].position.x + 1;
		worms[player].movedThisTurn = false;
		
		if(worms[player].cachedMove != 'none') {
			if(worms[player].cachedMove != 'left') {
				worms[player].direction = worms[player].cachedMove;
				worms[player].cachedMove = 'none';
				worms[player].movedThisTurn = 'true';
			} else {
				worms[player].cachedMove = 'none';
			}
		}
		
	} else if(worms[player].direction == 'up') {
		worms[player].position.y = worms[player].position.y - 1;
		worms[player].movedThisTurn = false;
		
		if(worms[player].cachedMove != 'none') {
			if(worms[player].cachedMove != 'down') {
				worms[player].direction = worms[player].cachedMove;
				worms[player].cachedMove = 'none';
				worms[player].movedThisTurn = 'true';
			} else {
				worms[player].cachedMove = 'none';
			}
		}
		
	} else if(worms[player].direction == 'down') {
		worms[player].position.y = worms[player].position.y + 1;
		worms[player].movedThisTurn = false;
		
		if(worms[player].cachedMove != 'none') {
			if(worms[player].cachedMove != 'up') {
				worms[player].direction = worms[player].cachedMove;
				worms[player].cachedMove = 'none';
				worms[player].movedThisTurn = 'true';
			} else {
				worms[player].cachedMove = 'none';
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

function drawWorm(context, player) {
	// Draw the head-end dot of the worm (always visible)
	context.fillStyle = '#000000';
	context.fillRect(game.grid.offsetX + worms[player].position.x * game.grid.size - .5, 
		game.grid.offsetY + worms[player].position.y * game.grid.size + .5, 
		game.grid.size + 1, game.grid.size + 1);
	
	// If the worm is longer than one block
	if(worms[player].length > 1) {
		// If the worm's length is greater than the maximum size, trim it back down to the maximum size
		if(worms[player].length > worms[player].maxSize){
			worms[player].length = worms[player].maxSize;
		}
		
		// For each of the rest of the blocks in the worm's tail
		for(var n = worms[player].length - 1; n != 0; n--) {
			// Do some math magic to create a gradient for the tail
			context.fillStyle = 'rgb(' + Math.floor(0x00/worms[player].length * n) + ', ' + 
				Math.floor(0xbb/worms[player].length * n) + ', ' + Math.floor(0x00/worms[player].length * n) + ')';
			context.fillRect(game.grid.offsetX + worms[player].previousCells[worms[player].previousCells.length-n].x * game.grid.size - .5, 
				game.grid.offsetY + worms[player].previousCells[worms[player].previousCells.length-n].y * game.grid.size + .5, 
				game.grid.size + 1, game.grid.size + 1);
		}
	}
}

function drawDots(context) {
	var i;
	for (i = 0; i < game.dots.length; i++) {
		if (typeof game.dots[i] !== "undefined") {
			// Strip the red, green, and blue values from the dot's color
			var color = new Object();
			color.red = parseInt(game.dots[i].color.substr(0, 2), 16);
			color.green = parseInt(game.dots[i].color.substr(2, 2), 16);
			color.blue = parseInt(game.dots[i].color.substr(4, 2), 16);
			drawDot(game.dots[i],color,context);
		}
	}	
}

function drawDot(dot,color,context) {
	// Fill in the dot on the grid with a transparency based off of the dot's current value and
	//	the amount of time it has left in the stage. Should give a clean fading animation to the dot.
	context.fillStyle = 'rgba(' + color.red + ', ' + color.green + ', ' + color.blue + ', ' + 
		(dot.value + dot.timeToLiveThisStage/game.dot.timePerStage)/(game.dot.maxValue + 1) + ')';	
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
		dot.timeToLiveThisStage = game.dot.timePerStage;
	}
}

function makeRandomDots() {
	var position = getUnusedPosition();
	var dot = new Object();
	dot.x = position.x;
	dot.y = position.y;
	dot.color = DOT_COLORS[0];
	dot.timeToLiveThisStage = 2 * game.dot.timePerStage;
	dot.value = game.dot.maxValue;
	dot.type = ITEMS_ACTIONS[0];
	dot.exists = true;
	game.dots.push(dot);
	isFoodOut = true;

	var pickupType = Math.floor(Math.random()*ITEMS.length);
	if (pickupType != 0 && Math.random() > 0.6) {
		position = getUnusedPosition();
		var pickup = new Object();
		pickup.x = position.x;
		pickup.y = position.y;
		pickup.color = DOT_COLORS[pickupType];
		pickup.timeToLiveThisStage = 2 * game.dot.timePerStage;
		pickup.value = game.dot.maxValue;
		pickup.type = ITEMS_ACTIONS[pickupType];
		pickup.exists = true;
		game.dots.push(pickup);
	}
}

function drawText(context, player) {
	if(worms[player].direction != 'none') {
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

// Returns true if the worm has collided with itself or the other worm
function collision(player) {
	var otherPlayer = (player +  1) % 2;

	// if worm heads collide
	if (worms[0].position.x == worms[1].position.x  &&
		worms[0].position.y == worms[1].position.y) {
		return true;
	}

	for (var i = 0; i < 2; i++) {
		for (var n = 0; n != worms[i].length - 1; n++) {
			if (worms[player].position.x == worms[i].previousCells[worms[i].previousCells.length - n - 1].x &&
				worms[player].position.y == worms[i].previousCells[worms[i].previousCells.length - n - 1].y) {
				return true;
			}
		}
	}

	
	return false;
}

// Set the board back to default - handle all lives/game over logic elsewhere.
// Sets the initial position to be random
function resetBoard() {
	game.score = 0;
	game.dot.exists = false;

	for (var i = 0; i < 2; i++) {
		worms[i].direction = "none";
		worms[i].previousCells = new Array();
		worms[i].length = 1;
		worms[i].movedThisTurn = false; 
		worms[i].cachedMove = 'none';

		game.dots = new Array();
		isFoodOut = false;
		
		worms[i].position.x = 1 + Math.floor(Math.random()*(game.grid.width/game.grid.size - 2));
		worms[i].position.y = 1 + Math.floor(Math.random()*(game.grid.height/game.grid.size - 2));
	}	
}

function getUnusedPosition() {
	var positionInWorm = true;

	while(positionInWorm) {
		var position = {
			x: Math.floor(Math.random() * game.grid.width/game.grid.size),
			y: Math.floor(Math.random() * game.grid.height/game.grid.size)
		};
		positionInWorm = false;

		for (var j = 0; j < 2; j++) {
			var lastCellInWorm = worms[j].previousCells.length - worms[j].length;

			for(var i = worms[j].previousCells.length - 1; i > lastCellInWorm; --i) {
				if(position.x == worms[j].previousCells[i].x && position.y == worms[j].previousCells[i].y) {
					positionInWorm = true;
					break;
				}
			}
		}
	}

	return position;
}

function wormOneKeyHit(e) {
	switch(e.keyCode) {
		// left key
		case 37:
			if(worms[0].direction != 'right') {
				if(!worms[0].movedThisTurn) {
					worms[0].direction = 'left';
					worms[0].movedThisTurn = true;
				} else if(worms[0].cachedMove == 'none') {
					worms[0].cachedMove = 'left';
				}
			}
			
			break;
			
		// up key
		case 38:
			if(worms[0].direction != 'down') {
				if(!worms[0].movedThisTurn) {
					worms[0].direction = 'up';
					worms[0].movedThisTurn = true;
				} else if(worms[0].cachedMove == 'none') {
					worms[0].cachedMove = 'up';
				}
			}
			break;
			
		// right key
		case 39:
			if(worms[0].direction != 'left') {
				if(!worms[0].movedThisTurn) {
					worms[0].direction = 'right';
					worms[0].movedThisTurn = true;
				} else if(worms[0].cachedMove == 'none') {
					worms[0].cachedMove = 'right';
				}
			}
			break;
			
		// down key
		case 40:
			if(worms[0].direction != 'up') {
				if(!worms[0].movedThisTurn) {
					worms[0].direction = 'down';
					worms[0].movedThisTurn = true;
				} else if(worms[0].cachedMove == 'none') {
					worms[0].cachedMove = 'down';
				}
			}
			break;
			
		// 'g' key
		case 71:
			if(worms[0].direction != 'none')
				worms[0].length += 1;
			break;
/*
		// 'd' key
		case 68:
			if(worms[0].direction != 'none')
				makeRandomDot();
			break;
*/			
		// 'p' key
		case 80:
			if(worms[0].paused) {
				worms[0].updateBoardIntervalId = setInterval('updateBoard()', game.speed);
			} else {
				clearInterval(worms[0].updateBoardIntervalId);
			}
			
			worms[0].paused = !worms[0].paused;
			
			break;
			
		// '\' key
		case 220:
			setHighScore(0);
			resetBoard();
	}
	
	return false;
}

function wormTwoKeyHit(e) {
	switch(e.keyCode) {
		// left key
		case 65:
			if(worms[1].direction != 'right') {
				if(!worms[1].movedThisTurn) {
					worms[1].direction = 'left';
					worms[1].movedThisTurn = true;
				} else if(worms[1].cachedMove == 'none') {
					worms[1].cachedMove = 'left';
				}
			}
			
			break;
			
		// up key
		case 87:
			if(worms[1].direction != 'down') {
				if(!worms[1].movedThisTurn) {
					worms[1].direction = 'up';
					worms[1].movedThisTurn = true;
				} else if(worms[1].cachedMove == 'none') {
					worms[1].cachedMove = 'up';
				}
			}
			break;
			
		// right key
		case 68:
			if(worms[1].direction != 'left') {
				if(!worms[1].movedThisTurn) {
					worms[1].direction = 'right';
					worms[1].movedThisTurn = true;
				} else if(worms[1].cachedMove == 'none') {
					worms[1].cachedMove = 'right';
				}
			}
			break;
			
		// down key
		case 83:
			if(worms[1].direction != 'up') {
				if(!worms[1].movedThisTurn) {
					worms[1].direction = 'down';
					worms[1].movedThisTurn = true;
				} else if(worms[1].cachedMove == 'none') {
					worms[1].cachedMove = 'down';
				}
			}
			break;
			
		// 'g' key
		case 71:
			if(worms[1].direction != 'none')
				worms[1].length += 1;
			break;

		// 'p' key
		case 80:
			if(worms[1].paused) {
				worms[1].updateBoardIntervalId = setInterval('updateBoard()', game.speed);
			} else {
				clearInterval(worms[1].updateBoardIntervalId);
			}
			
			worms[1].paused = !worms[1].paused;
			
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
