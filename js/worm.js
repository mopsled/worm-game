var worm = new Object;
			
// Initialize all worm properties and event listeners
function init() {

	// worm properties: worm.
	//	.canvas - the canvas that the worm will be drawn to
	//	.context - a 2d context in which to draw the worm game
	//	.direction - a variable that holds the direction the worm is currently moving in:
	//		'none' - for not moving
	//		and 'left', 'right', 'up', and 'down' for any move in those directions
	//	.cellsBefore - an array of objects (cellsBefore[index].x and cellsBefore[index].y) holding
	//		the most recent places that the worm has been, with up to worm.maxSize places
	//	.length - the current length of the worm
	//	.speed - the number of milliseconds for each frame. Lower value = faster fame
	//	.movedThisTurn - holds true value if a move has been entered this turn
	// 	.cachedMove - holds 'left', 'right', 'up', or 'down' if a move has been been cached from
	//		this frame for the next frame. Used for storing a single move if the user enters
	//		moves faster than the grid updates
	//	.paused - holds true value if the game is paused. A paused game will not update the grid
	//	.score - the point value that the worm is currently at (used for 'score:')
	//	.maxSize - the maximum length of a worm on board, and the worm.cellsBefore array
	//	.version - the current version of the game. This is used to erase high scores that belong to
	//		an earlier version of the game
	//	.highScore - the maximum score acheived. This is stored in localStorage, if possible
	//	.updateBoardIntervalId - the interval id of the updateBoard()'s setInterval. This is
	//		used to stop and start the repeated updating of the board if the game is paused
	//		and restarted
	
	worm.canvas = document.getElementById('wormGame');
	worm.canvas.width = 420;
	worm.canvas.height = 500;
	worm.context = worm.canvas.getContext('2d');
	worm.direction = 'none';
	worm.cellsBefore = new Array();
	worm.length = 1;
	worm.speed = 70;
	worm.movedThisTurn = false;
	worm.cachedMove = 'none';
	worm.paused = false;
	worm.score = 0;
	worm.maxSize = 100;
	worm.version = 2;
	
	// If the user supports local storage and has a lower version, reset his high score
	if(supportsLocalStorage()) {
		if(!localStorage['worm.version'] || localStorage['worm.version'] < worm.version) {
			localStorage['worm.highScore'] = 0;
			localStorage['worm.version'] = worm.version
		}
	}
	
	// If local storage exists and a high score exists in it, restore that high score
	if(supportsLocalStorage() && localStorage['worm.highScore']) {
		worm.highScore = localStorage['worm.highScore'];
	} else {
		worm.highScore = 0;
	}
	
	// Grid properties: worm.grid
	//	.size - the size, in pixels, of a side of a square in the grid
	//	.width - the total width of the grid. should be a multiple of the size
	//	.height - the total height of the grid. should be a multiple of the size
	//	.offsetX - the offset of the grid in the X direction on the canvas
	//	.offsetY - the offset of the grid in the Y direction on the canvas
	worm.grid = new Object;
	worm.grid.size = 20;
	worm.grid.width = 400;
	worm.grid.height = 400;
	worm.grid.offsetX = 10;
	worm.grid.offsetY = 10;
	
	// Dot properties: worm.dot
	//	.timePerStage - the amount of time (in milliseconds) that a dot stays a point value
	//	.maxValue - the higher bound of point value for a dot
	//	.minValue - the lower bound of point value for a dot
	// 	.alive - a boolean variable specifying false and true for dead and alive
	//	.x - the x position (in grid value, not pixel value) of the worm
	//	.y - the y position (in grid value, not pixel value) of the worm
	//	.color - a hexidecimal string (e.g. '123456') that holds the dot's color
	//	.timeToLiveThisStage - the number of milliseconds left in the current stage
	//	.value - the current value of the dot on the board (between .minValue and .maxValue)
	worm.dot = new Object;
	worm.dot.timePerStage = 250;
	worm.dot.maxValue = 16;
	worm.dot.minValue = 6;
	worm.dot.alive = false;
	
	// Position properties: worm.pos
	//	.x - the current x position (in grid value, not pixel value) of the worm
	//	.y - the current y position (in grid value, not pixel value) of the worm
	worm.pos = new Object;
	worm.pos.x = Math.floor(Math.random()*(worm.grid.width/worm.grid.size + 1));
	worm.pos.y = Math.floor(Math.random()*(worm.grid.height/worm.grid.size + 1));
	
	// Make the game respond to key events if the mouse is currently hovering over the canvas
	worm.canvas.addEventListener('mouseover', 
		function() {
			window.addEventListener('keydown', wormKeyHit, false);
		}, 
	false);
	
	worm.canvas.addEventListener('mouseout', 
		function() {
			window.removeEventListener('keydown', wormKeyHit, false);
		}, 
	false);
	
	worm.updateBoardIntervalId = setInterval('updateBoard()', worm.speed);
}

// Redraw the board
function updateBoard() {
	// Reset the board
	worm.canvas.height = worm.canvas.height;
	worm.canvas.width = worm.canvas.width;
	
	// Draw the smaller vertical lines
	worm.context.beginPath();
	for(var x = worm.grid.offsetX + worm.grid.size + 0.5; x <= worm.grid.offsetX + worm.grid.width; x += worm.grid.size) {
		worm.context.moveTo(x, worm.grid.offsetY);
		worm.context.lineTo(x, worm.grid.height + worm.grid.offsetY);
	}
	
	// Draw the smaller horizontal lines
	for(var y = worm.grid.offsetY + worm.grid.size + 0.5; y <= worm.grid.offsetY + worm.grid.height; y += worm.grid.size) {
		worm.context.moveTo(worm.grid.offsetX, y);
		worm.context.lineTo(worm.grid.width + worm.grid.offsetX, y);
	}
	
	worm.context.closePath();
	worm.context.lineWidth = '1.0';
	worm.context.strokeStyle = "#ccc";
	worm.context.stroke();
	
	// Draw the outer boundry of the board
	worm.context.beginPath();
	worm.context.moveTo(worm.grid.offsetX, worm.grid.offsetY);
	worm.context.lineTo(worm.grid.offsetX, worm.grid.offsetY + worm.grid.height);
	worm.context.lineTo(worm.grid.offsetX + worm.grid.width, worm.grid.offsetY + worm.grid.height)
	worm.context.lineTo(worm.grid.offsetX + worm.grid.width, worm.grid.offsetY);
	worm.context.lineTo(worm.grid.offsetX, worm.grid.offsetY);
	worm.context.strokeStyle = "#000";
	worm.context.lineWidth = '2.0';
	worm.context.closePath();
	worm.context.stroke();
	
	// If the worm is currently playing, add its current position to cellsBefore
	if(worm.direction != 'none') {
		position = new Object;
		position.x = worm.pos.x;
		position.y = worm.pos.y;
		worm.cellsBefore.push(position);
		
		// Keep cellsBefore.length to a maximum size of worm.maxSize
		if(worm.cellsBefore.length > worm.maxSize) {
			worm.cellsBefore.shift();
		}
	}
	
	// For each of the four directions, follow this logic:
	//	change the worm's coordinates
	//	mark the worm as not having moved
	//	if the is a cached move:
	//		if the cached move does not violate the way the worm should go:
	//			queue the cached move as the next move for the worm
	//		otherwise:
	//			remove cached move
	if(worm.direction == 'left') {
		worm.pos.x = worm.pos.x - 1;
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
		worm.pos.x = worm.pos.x + 1;
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
		worm.pos.y = worm.pos.y - 1;
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
		worm.pos.y = worm.pos.y + 1;
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
	
	
	// If the worm's position lies outside of the board, reset the board
	if(worm.pos.x < 0 || worm.pos.y < 0 || worm.pos.x > (worm.grid.width/worm.grid.size - 1) || worm.pos.y > (worm.grid.height/worm.grid.size - 1)) {
		resetBoard();
	}
	
	// Draw the head-end dot of the worm (always visible)
	worm.context.fillStyle = '#000';
	worm.context.fillRect(worm.grid.offsetX + worm.pos.x * worm.grid.size + .5, worm.grid.offsetY + worm.pos.y * worm.grid.size + .5, worm.grid.size, worm.grid.size);
	
	// If the worm is longer than one block
	if(worm.length > 1) {
		// If the worm's length is greater than the maximum size, trim it back down to the maximum size
		if(worm.length > worm.maxSize){worm.length = worm.maxSize;}
		
		// For each of the rest of the blocks in the worm's tail
		for(var n = worm.length - 1; n != 0; n--) {
			// Do some math magic to create a gradient for the tail
			worm.context.fillStyle = 'rgb(' + Math.floor(0xbb/worm.length * n) + ', ' + Math.floor(0xbb/worm.length * n) + ', ' + Math.floor(0xbb/worm.length * n) + ')';
			worm.context.fillRect(worm.grid.offsetX + worm.cellsBefore[worm.cellsBefore.length-n].x * worm.grid.size + .5, worm.grid.offsetY + worm.cellsBefore[worm.cellsBefore.length-n].y * worm.grid.size + .5, worm.grid.size, worm.grid.size);
		}
	}
	
	// If a dot exists on the board
	if(worm.dot.alive) {
		// Strip the red, green, and blue values from the dot's color
		var red = parseInt(worm.dot.color.substr(0, 2), 16);
		var green = parseInt(worm.dot.color.substr(2, 2), 16);
		var blue = parseInt(worm.dot.color.substr(4, 2), 16);
		
		// Fill in the dot on the grid with a transparency based off of the dot's current value and
		//	the amount of time it has left in the stage. Should give a clean fading animation to the dot.
		worm.context.fillStyle = 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + (worm.dot.value + worm.dot.timeToLiveThisStage/worm.dot.timePerStage)/(worm.dot.maxValue + 1) + ')';		
		worm.context.fillRect(worm.grid.offsetX + worm.dot.x * worm.grid.size + .5, worm.grid.offsetY + worm.dot.y * worm.grid.size + .5, worm.grid.size, worm.grid.size);
		
		// If worm.dot.timeToLiveThisStage is positive, subtract the amount of time taken from the current frame
		if(worm.dot.timeToLiveThisStage > 0) {
			worm.dot.timeToLiveThisStage -= worm.speed;
		}
		
		// If the dot value isn't at the minimum and timeToLiveThisStage has hit zero
		if(worm.dot.value > worm.dot.minValue && (worm.dot.timeToLiveThisStage <= 0)) {
			worm.dot.value -= 1;
			worm.dot.timeToLiveThisStage = worm.dot.timePerStage;
		}
	} else {
		// If not dot exists, create one
		makeRandomDot();
	}
	
	if(worm.direction != 'none') {
		if(collision()) {
			resetBoard();
		}
		
		worm.context.fillStyle = '#000';
		worm.context.font = "20px Georgia";
		worm.context.textAlign = "right"
		worm.context.fillText("dot score: " + worm.dot.value, 410, 440);
	}
	
	if(worm.dot.x == worm.pos.x && worm.dot.y == worm.pos.y) {
		worm.dot.alive = false;
		worm.length += 1;
		worm.score += worm.dot.value;
	}
	
	if(worm.score > worm.highScore) {
		worm.highScore = worm.score;
		if(supportsLocalStorage()) {
			localStorage['worm.highScore'] = worm.highScore;
		}
	}
	
	
	worm.context.textAlign = "left"
	worm.context.fillStyle = '#000';
	worm.context.font = "20px Georgia";
	worm.context.fillText("score: " + worm.score, 10, 440);
	
	if(worm.highScore != 0) {
		worm.context.textAlign = "center"
		worm.context.fillStyle = '#000';
		worm.context.font = "20px Georgia";
		worm.context.fillText("high score: " + worm.highScore, 200, 465);
	}
}

// Returns true if the worm has collided with itself
function collision() {
	for(var n = 0; n != worm.length - 1; n++) {
		if(worm.pos.x == worm.cellsBefore[worm.cellsBefore.length - n - 1].x &&
			worm.pos.y == worm.cellsBefore[worm.cellsBefore.length - n - 1].y) {
			return true;
		}
	}
	
	return false;
}

// Set the board back to default - handle all lives/game over logic elsewhere. Sets the initial position to be random
function resetBoard() {
	worm.direction = "none";
	worm.cellsBefore = new Array();
	worm.length = 1;
	worm.movedThisTurn = false;
	worm.cachedMove = 'none';
	worm.score = 0;
	worm.dot.alive = false;
	
	worm.pos.x = 1 + Math.floor(Math.random()*(worm.grid.width/worm.grid.size - 2));
	worm.pos.y = 1 + Math.floor(Math.random()*(worm.grid.height/worm.grid.size - 2));	
}

function makeRandomDot() {
	if(worm.direction != 'none') {
		var position = {
			x: Math.floor(Math.random() * worm.grid.width/worm.grid.size),
			y: Math.floor(Math.random() * worm.grid.height/worm.grid.size)
		};
		
		var inThere = false;
		for(var n = 0; n != worm.length - 1; n++) {
			if(position.x == worm.cellsBefore[worm.cellsBefore.length - n - 1].x &&
				position.y == worm.cellsBefore[worm.cellsBefore.length - n - 1].y) {
				inThere = true;
			}
		}
		
		while(inThere) {
			position = {
				x: Math.floor(Math.random() * worm.grid.width/worm.grid.size),
				y: Math.floor(Math.random() * worm.grid.height/worm.grid.size)
			};
			
			inThere = false;
			for(var n = 0; n != worm.length - 1; n++) {
				if(position.x == worm.cellsBefore[worm.cellsBefore.length - n - 1].x &&
					position.y == worm.cellsBefore[worm.cellsBefore.length - n - 1].y) {
					inThere = true;
				}
			}
		}
		
		worm.dot.x = position.x;
		worm.dot.y = position.y;
		// colors taken from http://bit.ly/g50AA0
		var prettyColors = Array('88A825', '35203B', '911146', 'CF4A39', 'ED8C2B', '4BB5C1', '345BC1');
		worm.dot.color = prettyColors[Math.floor(prettyColors.length*Math.random())];
		worm.dot.timeToLiveThisStage = worm.dot.timePerStage;
		worm.dot.value = worm.dot.maxValue;
		worm.dot.alive = true;
	}
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
			
		// 'p' key
		case 80:
			if(worm.paused) {
				worm.updateBoardIntervalId = setInterval('updateBoard()', worm.speed);
			} else {
				clearInterval(worm.updateBoardIntervalId);
			}
			
			worm.paused = !worm.paused;
			
			break;
			
		// 'r' key
		case 82:
			if(supportsLocalStorage()) {
				localStorage['worm.highScore'] = 0;
			}
			
			worm.highScore = 0;
			resetBoard();
	}
	
	return false;
}

// Adds a .mod(x) function to numbers that handles negative numbers correctly
Number.prototype.mod = function(n) {
	return ((this%n)+n)%n;
}

// Returns true if localStorage is present in the browser (source: http://bit.ly/cOSABP)			
function supportsLocalStorage() {
	try { 
		return 'localStorage' in window && window['localStorage'] !== null; 
	} catch (e) { 
		return false; 
	}
}

// When the page loads, launch the init() function
$(document).ready(function() {
	init();
});