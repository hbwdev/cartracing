(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var Sprite = require('./sprite');

(function(global) {
	function AnimatedSprite(data) {
		var that = new Sprite(data);
		var super_draw = that.superior('draw');
		var currentFrame = 0;
		var started = false;

		that.draw = function(dContext) {
			var spritePartToUse = function () {
				if (!started) {
					started = true;
					startAnimation();
				}
				return Object.keys(data.parts)[currentFrame];
			};
			return super_draw(dContext, spritePartToUse());
		};

		function startAnimation() {
			currentFrame += 1;
			if (currentFrame < Object.keys(data.parts).length) {
				setTimeout(function () { 
					startAnimation();
				}, 300);
			}
			else {
				currentFrame = 0;
				started = false;
			}
		}

		that.startAnimation = startAnimation;

		return that;
	}

	global.animatedSprite = AnimatedSprite;
})( this );


if (typeof module !== 'undefined') {
	module.exports = this.animatedSprite;
}
},{"./sprite":11}],2:[function(require,module,exports){
CanvasRenderingContext2D.prototype.storeLoadedImage = function (key, image) {
	if (!this.images) {
		this.images = {};
	}

	this.images[key] = image;
};

CanvasRenderingContext2D.prototype.getLoadedImage = function (key) {
	if (this.images[key]) {
		return this.images[key];
	}
};

CanvasRenderingContext2D.prototype.followSprite = function (sprite) {
	this.centralSprite = sprite;
};

CanvasRenderingContext2D.prototype.getCentralPosition = function () {
	if (!this.centralOffsetX) this.centralOffsetX = 0;
	if (!this.centralOffsetY) this.centralOffsetY = 0;

	let position = {
		map: this.centralSprite.mapPosition,
		canvas: [ Math.round(this.canvas.width * 0.5) + this.centralOffsetX,
			      Math.round(this.canvas.height * 0.33) + this.centralOffsetY, 0]
	};

	return position;
};

CanvasRenderingContext2D.prototype.setCentralPositionOffset = function (offsetX, offsetY) {
	this.centralOffsetX = offsetX;
	this.centralOffsetY = offsetY;
};

CanvasRenderingContext2D.prototype.mapPositionToCanvasPosition = function (position) {
	var central = this.getCentralPosition();
	var centralMapPosition = central.map;
	var centralCanvasPosition = central.canvas;
	var mapDifferenceX = centralMapPosition[0] - position[0];
	var mapDifferenceY = centralMapPosition[1] - position[1];
	return [ centralCanvasPosition[0] - mapDifferenceX, centralCanvasPosition[1] - mapDifferenceY ];
};

CanvasRenderingContext2D.prototype.canvasPositionToMapPosition = function (position) {
	var central = this.getCentralPosition();
	var centralMapPosition = central.map;
	var centralCanvasPosition = central.canvas;
	var mapDifferenceX = centralCanvasPosition[0] - position[0];
	var mapDifferenceY = centralCanvasPosition[1] - position[1];
	return [ centralMapPosition[0] - mapDifferenceX, centralMapPosition[1] - mapDifferenceY ];
};

CanvasRenderingContext2D.prototype.getCentreOfViewport = function () {
	return (this.canvas.width / 2).floor();
};

// Y-pos canvas functions
CanvasRenderingContext2D.prototype.getMiddleOfViewport = function () {
	return (this.canvas.height / 2).floor();
};

CanvasRenderingContext2D.prototype.getBelowViewport = function () {
	return this.canvas.height.floor();
};

CanvasRenderingContext2D.prototype.getMapBelowViewport = function () {
	var below = this.getBelowViewport();
	return this.canvasPositionToMapPosition([ 0, below ])[1];
};

CanvasRenderingContext2D.prototype.getRandomlyInTheCentreOfCanvas = function (buffer) {
	var min = 0;
	var max = this.canvas.width;

	if (buffer) {
		min -= buffer;
		max += buffer;
	}

	return Number.random(min, max);
};

CanvasRenderingContext2D.prototype.getRandomlyInTheCentreOfMap = function (buffer) {
	var random = this.getRandomlyInTheCentreOfCanvas(buffer);
	return this.canvasPositionToMapPosition([ random, 0 ])[0];
};

CanvasRenderingContext2D.prototype.getRandomMapPositionBelowViewport = function () {
	var xCanvas = this.getRandomlyInTheCentreOfCanvas();
	var yCanvas = this.getBelowViewport();
	return this.canvasPositionToMapPosition([ xCanvas, yCanvas ]);
};

CanvasRenderingContext2D.prototype.getRandomMapPositionAboveViewport = function () {
	var xCanvas = this.getRandomlyInTheCentreOfCanvas();
	var yCanvas = this.getAboveViewport();
	return this.canvasPositionToMapPosition([ xCanvas, yCanvas ]);
};

CanvasRenderingContext2D.prototype.getTopOfViewport = function () {
	return this.canvasPositionToMapPosition([ 0, 0 ])[1];
};

CanvasRenderingContext2D.prototype.getAboveViewport = function () {
	return 0 - (this.canvas.height / 4).floor();
};
},{}],3:[function(require,module,exports){
// Extends function so that new-able objects can be given new methods easily
Function.prototype.method = function (name, func) {
    this.prototype[name] = func;
    return this;
};

// Will return the original method of an object when inheriting from another
Object.method('superior', function (name) {
    var that = this;
    var method = that[name];
    return function() {
        return method.apply(that, arguments);
    };
});
},{}],4:[function(require,module,exports){
var SpriteArray = require('./spriteArray');
var Stats = require('stats.js');

if (typeof navigator !== 'undefined') {
	navigator.vibrate = navigator.vibrate ||
		navigator.webkitVibrate ||
		navigator.mozVibrate ||
		navigator.msVibrate;
} else {
	navigator = {
		vibrate: false
	};
}

(function (global) {
	function Game (mainCanvas, player) {
		var staticObjects = new SpriteArray();
		var movingObjects = new SpriteArray();
		var uiElements = new SpriteArray();
		var dContext = mainCanvas.getContext('2d');
		var showHitBoxes = false;

		// Scrolling background
		var backgroundImage = dContext.getLoadedImage('assets/background.jpg');
		var backgroundX = 0;
		var backgroundY = 0;

		var mouseX = dContext.getCentreOfViewport();
		var mouseY = 0;
		var paused = false;
		var gameEnding = false;
		var that = this;
		var beforeCycleCallbacks = [];
		var afterCycleCallbacks = [];
		var gameLoop = new EventedLoop();

		this.toggleHitBoxes = function() {
			showHitBoxes = !showHitBoxes;
			staticObjects.each(function (sprite) {
				sprite.setHitBoxesVisible(showHitBoxes);
			});
		};

		this.addStaticObject = function (sprite) {
			sprite.setHitBoxesVisible(showHitBoxes);
			staticObjects.push(sprite);
		};

		this.addStaticObjects = function (sprites) {
			sprites.forEach(this.addStaticObject.bind(this));
		};

		this.addMovingObject = function (movingObject, movingObjectType) {
			if (movingObjectType) {
				staticObjects.onPush(function (obj) {
					if (obj.data && obj.data.hitBehaviour[movingObjectType]) {
						obj.onHitting(movingObject, obj.data.hitBehaviour[movingObjectType]);
					}
				}, true);
			}

			movingObject.setHitBoxesVisible(showHitBoxes);
			movingObjects.push(movingObject);
		};

		this.addUIElement = function (element) {
			uiElements.push(element);
		};

		this.beforeCycle = function (callback) {
			beforeCycleCallbacks.push(callback);
		};

		this.afterCycle = function (callback) {
			afterCycleCallbacks.push(callback);
		};

		this.setMouseX = function (x) {
			mouseX = x;
		};

		this.setMouseY = function (y) {
			mouseY = y;
		};

		player.setMapPosition(0, 0);
		player.setMapPositionTarget(0, -10);
		dContext.followSprite(player);

		this.cycle = function () {
			beforeCycleCallbacks.each(function(c) {
				c();
			});

			// Clear canvas
			var mouseMapPosition = dContext.canvasPositionToMapPosition([mouseX, mouseY]);

			if (!player.isJumping) {
				player.setMapPositionTarget(mouseMapPosition[0], mouseMapPosition[1]);
			}

			player.cycle();

			movingObjects.cull();
			movingObjects.each(function (movingObject, i) {
				movingObject.cycle(dContext);
			});
			
			staticObjects.cull();
			staticObjects.each(function (staticObject, i) {
				if (staticObject.cycle) {
					staticObject.cycle();
				}
				// Remove item
				if (staticObject.getCanvasPositionY() < -100)
					staticObject.deleteOnNextCycle();
			});

			uiElements.each(function (uiElement, i) {
				if (uiElement.cycle) {
					uiElement.cycle();
				}
			});

			isShaking = movingObjects.some(item => item.data.name == 'monster' && !item.isFull && !item.isEating);

			afterCycleCallbacks.each(function(c) {
				c();
			});
		};

		function drawBackground() {
			// Stretch background image to canvas size
			backgroundImage.width = mainCanvas.width;
			backgroundImage.height = mainCanvas.height;

			backgroundX = player.mapPosition[0] % backgroundImage.width * -1;
			backgroundY = player.mapPosition[1] % backgroundImage.height * -1;

			// Redraw background
			dContext.drawImage(backgroundImage, backgroundX, backgroundY, mainCanvas.width, backgroundImage.height);
			dContext.drawImage(backgroundImage, backgroundX + mainCanvas.width, backgroundY, mainCanvas.width, backgroundImage.height);
			dContext.drawImage(backgroundImage, backgroundX - mainCanvas.width, backgroundY, mainCanvas.width, backgroundImage.height);
			dContext.drawImage(backgroundImage, backgroundX, backgroundY + mainCanvas.height, mainCanvas.width, backgroundImage.height);
			dContext.drawImage(backgroundImage, backgroundX + mainCanvas.width, backgroundY + mainCanvas.height, mainCanvas.width, backgroundImage.height);
			dContext.drawImage(backgroundImage, backgroundX - mainCanvas.width, backgroundY + mainCanvas.height, mainCanvas.width, backgroundImage.height);
		}

		// Shaking effect: https://stackoverflow.com/questions/28023696/html-canvas-animation-which-incorporates-a-shaking-effect
		var isShaking = false;
		var shakeDuration = 200;
		var shakeStartTime = -1;
		
		var playerShift = 0; // Experimental view shift when monster active

		function preShake(ctx) {
			if (!isShaking) shakeStartTime = -1;

			if (shakeStartTime == -1) return;
			var dt = Date.now() - shakeStartTime;
			if (dt > shakeDuration) {
				shakeStartTime = -1; 
				return;
			}
			var easingCoef = dt / shakeDuration;
			var easing = Math.pow(easingCoef - 1, 3) + 1;
			ctx.save();  
			var dx = easing * (Math.cos(dt * 0.1 ) + Math.cos(dt * 0.3115)) * 3;
			var dy = easing * (Math.sin(dt * 0.05) + Math.sin(dt * 0.057113)) * 3;
			ctx.translate(dx, dy);

			navigator.vibrate(100);
		}

		function postShake(ctx) {
			if (shakeStartTime == -1) return;
			ctx.restore();
		}

		function startShake() {
			if (!isShaking) return;
			shakeStartTime = Date.now();
		}

		var stats = new Stats();
		// Stats for performance debugging
		//stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
		//document.body.appendChild(stats.dom);

		that.draw = function () {
			stats.begin();

			// Clear canvas
			mainCanvas.width = mainCanvas.width;
			
			// Update scrolling background
			drawBackground();
			
			preShake(dContext);

			staticObjects.each(function (staticObject, i) {
				if (staticObject.isDrawnUnderPlayer && staticObject.draw) {
						staticObject.draw(dContext, 'main');
				}
			});

			player.setHitBoxesVisible(showHitBoxes);
			player.draw(dContext);

			player.cycle();

			movingObjects.each(function (movingObject, i) {
				movingObject.draw(dContext);
			});
			
			staticObjects.each(function (staticObject, i) {
				if (!staticObject.isDrawnUnderPlayer && staticObject.draw) {
					staticObject.draw(dContext, 'main');
				}
			});
			
			uiElements.each(function (uiElement, i) {
				if (uiElement.draw) {
					uiElement.draw(dContext, 'main');
				}
			});

			postShake(dContext);

			// Experimenting with view shift when monster active
		/* 	if (isShaking) {
				if (playerShift < 50) playerShift += 2;
			} else {
				// TODO: Ease this back after monster finishes eating
				if (playerShift > 0) playerShift -= 1;
			}
			dContext.setCentralPositionOffset(0, playerShift); */

			stats.end();
		};

		this.start = function () {
			gameLoop.start();
		};

		this.pause = function () {
			paused = true;
			gameLoop.stop();
		};

		this.gameOver = function() {
			gameEnding = true;
		}

		this.isPaused = function () {
			return paused;
		};

		this.isGameEnding = function() {
			return gameEnding;
		};

		this.reset = function () {
			paused = false;
			gameEnding = false;
			staticObjects = new SpriteArray();
			movingObjects = new SpriteArray();
			mouseX = dContext.getCentreOfViewport();
			mouseY = 0;
			player.reset();
			player.setMapPosition(0, 0, 0);
			this.start();
		}.bind(this);

		gameLoop.on('18', this.cycle);
		gameLoop.on('18', this.draw);

		startShake(mainCanvas);
		setInterval(startShake, 300, dContext);
	}

	global.game = Game;
})( this );


if (typeof module !== 'undefined') {
	module.exports = this.game;
}
},{"./spriteArray":12,"stats.js":16}],5:[function(require,module,exports){
function GameHud(data) {
	var that = this;

	var hudImage = new Image();
	hudImage.src = 'assets/CartWars-small.png';

	that.lines = data.initialLines;

	that.top = data.position.top;
	that.right = data.position.right;
	that.bottom = data.position.bottom;
	that.left = data.position.left;

	that.width = data.width;
	that.height = data.height;

	that.setLines = function (lines) {
		that.lines = lines;
	};

	that.draw = function (ctx) {
		ctx.drawImage(hudImage, 20, 5);

		ctx.font = '12px monospace';
		var yOffset = 0;
		that.lines.each(function (line) {
			var fontSize = +ctx.font.slice(0, 2);
			var textWidth = ctx.measureText(line).width;
			var textHeight = fontSize * 1.3;
			var xPos, yPos;
			if (that.top) {
				yPos = that.top + yOffset;
			} else if (that.bottom) {
				yPos = ctx.canvas.height - that.top - textHeight + yOffset;
			}

			if (that.right) {
				xPos = ctx.canvas.width - that.right - textWidth;
			} else if (that.left) {
				xPos = that.left;
			}

			yOffset += textHeight;
			ctx.fillStyle = "#FFFFFF";
			ctx.fillText(line, xPos, yPos);
		});
	};

	return that;
}

if (typeof module !== 'undefined') {
	module.exports = GameHud;
}

},{}],6:[function(require,module,exports){
// Creates a random ID string
(function(global) {
    function guid ()
    {
        var S4 = function ()
        {
            return Math.floor(
                    Math.random() * 0x10000 /* 65536 */
                ).toString(16);
        };

        return (
                S4() + S4() + "-" +
                S4() + "-" +
                S4() + "-" +
                S4() + "-" +
                S4() + S4() + S4()
            );
    }
    global.guid = guid;
})(this);

if (typeof module !== 'undefined') {
    module.exports = this.guid;
}
},{}],7:[function(require,module,exports){
function isMobileDevice() {
	if(navigator.userAgent.match(/Android/i) ||
		navigator.userAgent.match(/webOS/i) ||
		navigator.userAgent.match(/iPhone/i) ||
		navigator.userAgent.match(/iPad/i) ||
		navigator.userAgent.match(/iPod/i) ||
		navigator.userAgent.match(/BlackBerry/i) ||
		navigator.userAgent.match(/Windows Phone/i)
	) {
		return true;
	}
	else {
		return false;
	}
}

module.exports = isMobileDevice;
},{}],8:[function(require,module,exports){
var Sprite = require('./sprite');

(function(global) {
	function Monster(data) {
		var that = new Sprite(data);
		var super_draw = that.superior('draw');
		var spriteVersion = 1;
		var eatingStage = 0;
		const standardSpeed = 8;
		const slowSpeed = 5;
		const chasingSpeed = 12;

		that.isEating = false;
		that.isFull = false;
		that.isChasing = false;

		that.resetSpeed = function() {
			if (that.isChasing)
				that.setSpeed(chasingSpeed);
			else
				that.setSpeed(standardSpeed);
		};
		that.setStandardSpeed = function() {
			that.isChasing = false;
			that.setSpeed(standardSpeed);
		};
		that.setObstacleHitSpeed = function() {
			that.setSpeed(slowSpeed);
			setTimeout(that.resetSpeed, 300);
		};
		that.startChasing = function() {
			that.isChasing = true;
			that.setSpeed(chasingSpeed);
			// Reset the speed after rushing in
			setTimeout(that.setStandardSpeed, 2000);
		};
		that.startChasing();

		that.draw = function(dContext) {
			var spritePartToUse = function () {
				var xDiff = that.movingToward[0] - that.canvasX;

				if (that.isEating) {
					return 'eating' + eatingStage;
				}

				if (spriteVersion + 0.1 > 2) {
					spriteVersion = 0.1;
				} else {
					spriteVersion += 0.1;
				}
				if (xDiff >= 0) {
					return 'sEast' + Math.ceil(spriteVersion);
				} else if (xDiff < 0) {
					return 'sWest' + Math.ceil(spriteVersion);
				}
			};

			return super_draw(dContext, spritePartToUse());
		};

		function startEating (whenDone) {
			eatingStage += 1;
			that.isEating = true;
			that.isMoving = false;
			if (eatingStage < 6) {
				setTimeout(function () {
					startEating(whenDone);
				}, 300);
			} else {
				eatingStage = 1;
				setTimeout(function () {
					startEating(whenDone);
				}, 300);
				//that.isEating = false;
				//that.isMoving = true;
				//whenDone();
			}
		}

		that.startEating = startEating;

		return that;
	}

	global.monster = Monster;
})( this );


if (typeof module !== 'undefined') {
	module.exports = this.monster;
}
},{"./sprite":11}],9:[function(require,module,exports){
var Sprite = require('./sprite');
if (typeof navigator !== 'undefined') {
	navigator.vibrate = navigator.vibrate ||
		navigator.webkitVibrate ||
		navigator.mozVibrate ||
		navigator.msVibrate;
} else {
	navigator = {
		vibrate: false
	};
}

(function(global) {
	function Player(data) {
		var discreteDirections = {
			'west': 270,
			'wsWest': 240,
			'sWest': 195,
			'south': 180,
			'sEast': 165,
			'esEast': 120,
			'east': 90
		};
		var that = new Sprite(data);
		var sup = {
			draw: that.superior('draw'),
			cycle: that.superior('cycle'),
			getSpeedX: that.superior('getSpeedX'),
			getSpeedY: that.superior('getSpeedY'),
			hits: that.superior('hits')
		};
		var directions = {
			esEast: function(xDiff) { return xDiff > 300; },
			sEast: function(xDiff) { return xDiff > 75; },
			wsWest: function(xDiff) { return xDiff < -300; },
			sWest: function(xDiff) { return xDiff < -75; }
		};

		var cancelableStateTimeout;
		var cancelableStateInterval;

		var obstaclesHit = [];
		var pixelsTravelled = 0;
		const standardSpeed = 5;
		const boostMultiplier = 2;
		var turnEaseCycles = 70;
		var speedX = 0;
		var speedXFactor = 0;
		var speedY = 0;
		var speedYFactor = 1;
		var trickStep = 0; // There are three of these
		var crashingFrame = 0; // 6-frame sequence

		that.isMoving = true;
		that.hasBeenHit = false;
		that.isJumping = false;
		that.isPerformingTrick = false;
		that.isCrashing = false;
		that.isBoosting = false;
		that.isSlowed = false;
		that.availableAwake = 100;
		that.onHitObstacleCb = function() {};
		that.onCollectItemCb = function() {};
		that.onHitMonsterCb = function() {};
		that.setSpeed(standardSpeed);

		// Increase awake by 5 every second
		interval: awakeInterval = setInterval(() => {
			if (that.isMoving && !that.isBoosting)
				that.availableAwake = that.availableAwake >= 95 ? 100 : that.availableAwake + 5
		}, 3000);

		that.reset = function () {
			obstaclesHit = [];
			pixelsTravelled = 0;
			that.isMoving = true;
			that.hasBeenHit = false;
			that.availableAwake = 100;
			that.isCrashing = false;
			that.isBeingEaten = false;
			setNormal();
		};
		
		that.clear = function() {
			that.reset();
			clearInterval(awakeInterval);
		}

		function canSpeedBoost() {
			return !that.isCrashing 
				&& that.isMoving
				&& that.availableAwake >= 50;
		}

		function setNormal() {
			if (that.isBeingEaten) return;
			that.setSpeed(standardSpeed);
			that.isMoving = true;
			that.hasBeenHit = false;
			that.isJumping = false;
			that.isPerformingTrick = false;
			that.isCrashing = false;
			that.isBoosted = false;
			that.isSlowed = false;
			if (cancelableStateInterval) {
				clearInterval(cancelableStateInterval);
			}
			that.setMapPosition(undefined, undefined, 0);
		}

		function setCrashed() {
			that.hasBeenHit = true;
			that.isCrashing = true;
			that.isJumping = false;
			that.isPerformingTrick = false;
			that.startCrashing();
			if (cancelableStateInterval) {
				clearInterval(cancelableStateInterval);
			}
			that.setMapPosition(undefined, undefined, 0);
		}

		function setJumping() {
			var currentSpeed = that.getSpeed();
			setDiscreteDirection('south');
			that.setSpeed(currentSpeed + 2);
			that.setSpeedY(currentSpeed + 2);
			that.isMoving = true;
			that.hasBeenHit = false;
			that.isJumping = true;
			that.setMapPosition(undefined, undefined, 1);
		}

		function setSlowDown() {
			that.setSpeed(1);
			that.setSpeedY(1);
			that.isMoving = true;
			that.isSlowed = true;
		}

		function getDiscreteDirection() {
			if (that.direction) {
				if (that.direction <= 90) {
					return 'east';
				} else if (that.direction > 90 && that.direction < 150) {
					return 'esEast';
				} else if (that.direction >= 150 && that.direction < 180) {
					return 'sEast';
				} else if (that.direction === 180) {
					return 'south';
				} else if (that.direction > 180 && that.direction <= 210) {
					return 'sWest';
				} else if (that.direction > 210 && that.direction < 270) {
					return 'wsWest';
				} else if (that.direction >= 270) {
					return 'west';
				} else {
					return 'south';
				}
			} else {
				var xDiff = that.movingToward[0] - that.mapPosition[0];
				var yDiff = that.movingToward[1] - that.mapPosition[1];
				if (yDiff <= 0) {
					if (xDiff > 0) {
						return 'east';
					} else {
						return 'west';
					}
				}

				if (directions.esEast(xDiff)) {
					return 'esEast';
				} else if (directions.sEast(xDiff)) {
					return 'sEast';
				} else if (directions.wsWest(xDiff)) {
					return 'wsWest';
				} else if (directions.sWest(xDiff)) {
					return 'sWest';
				}
			}
			return 'south';
		}

		function setDiscreteDirection(d) {
			if (discreteDirections[d]) {
				that.setDirection(discreteDirections[d]);
			}

			if (d === 'west' || d === 'east') {
				that.isMoving = false;
			} else {
				that.isMoving = true;
			}
		}

		function getBeingEatenSprite() {
			return 'blank';
		}

		function getJumpingSprite() {
			return 'jumping';
		}

		that.stop = function () {
			if (that.direction > 180) {
				setDiscreteDirection('west');
			} else {
				setDiscreteDirection('east');
			}
		};

		that.turnEast = function () {
			switch (getDiscreteDirection()) {
				case 'west':
					setDiscreteDirection('wsWest');
					break;
				case 'wsWest':
					setDiscreteDirection('sWest');
					break;
				case 'sWest':
					setDiscreteDirection('south');
					break;
				case 'south':
					setDiscreteDirection('sEast');
					break;
				case 'sEast':
					setDiscreteDirection('esEast');
					break;
				case 'esEast':
					setDiscreteDirection('east');
					break;
				default:
					setDiscreteDirection('south');
					break;
			}
		};

		that.turnWest = function () {
			switch (getDiscreteDirection()) {
				case 'east':
					setDiscreteDirection('esEast');
					break;
				case 'esEast':
					setDiscreteDirection('sEast');
					break;
				case 'sEast':
					setDiscreteDirection('south');
					break;
				case 'south':
					setDiscreteDirection('sWest');
					break;
				case 'sWest':
					setDiscreteDirection('wsWest');
					break;
				case 'wsWest':
					setDiscreteDirection('west');
					break;
				default:
					setDiscreteDirection('south');
					break;
			}
		};

		that.stepWest = function () {
			that.mapPosition[0] -= that.speed * 2;
		};

		that.stepEast = function () {
			that.mapPosition[0] += that.speed * 2;
		};

		that.setMapPositionTarget = function (x, y) {
			if (that.hasBeenHit) return;

			if (Math.abs(that.mapPosition[0] - x) <= 75) {
				x = that.mapPosition[0];
			}

			that.movingToward = [ x, y ];

			// that.resetDirection();
		};

		that.startMovingIfPossible = function () {
			if (!that.hasBeenHit && !that.isBeingEaten) {
				that.isMoving = true;
			}
		};

		that.setTurnEaseCycles = function (c) {
			turnEaseCycles = c;
		};

		that.getPixelsTravelledDownRoad = function () {
			return pixelsTravelled;
		};

		that.resetSpeed = function () {
			that.setSpeed(standardSpeed);
		};

		that.cycle = function () {
			if ( that.getSpeedX() <= 0 && that.getSpeedY() <= 0 ) {
						that.isMoving = false;
			}

			const direction = getDiscreteDirection();
			if (that.isMoving && direction !== 'east' && direction !== 'west') {
				pixelsTravelled += that.speed;
			}

			if (that.isJumping) {
				that.setMapPositionTarget(undefined, that.mapPosition[1] + that.getSpeed());
			}

			sup.cycle();
			
			that.checkHittableObjects();
		};

		that.draw = function(dContext) {
			var spritePartToUse = function () {
				if (that.isBeingEaten) {
					return getBeingEatenSprite();
				}

				if (that.isJumping) {
					/* if (that.isPerformingTrick) {
						return getTrickSprite();
					} */
					return getJumpingSprite();
				}

				if (that.isCrashing)
					return 'wreck' + crashingFrame;

				if (that.isBoosting)
					return 'boost';

				return getDiscreteDirection();
			};

			return sup.draw(dContext, spritePartToUse());
		};

		that.hits = function (obs) {
			if (obstaclesHit.indexOf(obs.id) !== -1) {
				return false;
			}

			if (!obs.occupiesZIndex(that.mapPosition[2])) {
				return false;
			}

			if (sup.hits(obs)) {
				return true;
			}

			return false;
		};

		that.speedBoost = function () {
			if (!that.isBoosting && canSpeedBoost()) {
				that.availableAwake -= 50;
				that.setSpeed(that.speed * boostMultiplier);
				that.isBoosting = true;

				setTimeout(function () {
					that.setSpeed(standardSpeed);
					that.isBoosting = false;
				}, 2000);
			}
		};

		that.attemptTrick = function () {
			if (that.isJumping) {
				that.isPerformingTrick = true;
				cancelableStateInterval = setInterval(function () {
					if (trickStep >= 2) {
						trickStep = 0;
					} else {
						trickStep += 1;
					}
				}, 300);
			}
		};

		that.getStandardSpeed = function () {
			return standardSpeed;
		};

		function easeSpeedToTargetUsingFactor(sp, targetSpeed, f) {
			if (f === 0 || f === 1) {
				return targetSpeed;
			}

			if (sp < targetSpeed) {
				sp += that.getSpeed() * (f / turnEaseCycles);
			}

			if (sp > targetSpeed) {
				sp -= that.getSpeed() * (f / turnEaseCycles);
			}

			return sp;
		}

		that.getSpeedX = function () {
			switch (getDiscreteDirection()) {
				case 'esEast':
				case 'wsWest':
					speedXFactor = 0.5;
					speedX = easeSpeedToTargetUsingFactor(speedX, that.getSpeed() * speedXFactor, speedXFactor);
					return speedX;
				case 'sEast':
				case 'sWest':
					speedXFactor = 0.33;
					speedX = easeSpeedToTargetUsingFactor(speedX, that.getSpeed() * speedXFactor, speedXFactor);
					return speedX;
			}
			// So it must be south
			speedX = easeSpeedToTargetUsingFactor(speedX, 0, speedXFactor);

			return speedX;
		};

		that.setSpeedY = function(sy) {
			speedY = sy;
		};

		that.getSpeedY = function () {
			if (that.isJumping) {
				return speedY;
			}

			switch (getDiscreteDirection()) {
				case 'esEast':
				case 'wsWest':
					speedYFactor = 0.6;
					speedY = easeSpeedToTargetUsingFactor(speedY, that.getSpeed() * 0.6, 0.6);
					return speedY;
				case 'esEast':
				case 'wsWest':
					speedYFactor = 0.85;
					speedY = easeSpeedToTargetUsingFactor(speedY, that.getSpeed() * 0.85, 0.85);
					return speedY;
				case 'east':
				case 'west':
					speedYFactor = 1;
					speedY = 0;
					return speedY;
			}

			// So it must be south
			speedY = easeSpeedToTargetUsingFactor(speedY, that.getSpeed(), speedYFactor);

			return speedY;
		};

		that.hasHitObstacle = function (obs) {
			setCrashed();

			if (navigator.vibrate) {
				navigator.vibrate(500);
			}

			obstaclesHit.push(obs.id);

			that.resetSpeed();
			that.onHitObstacleCb(obs);

			if (cancelableStateTimeout) {
				clearTimeout(cancelableStateTimeout);
			}
			cancelableStateTimeout = setTimeout(function() {
				setNormal();
			}, 1500);
		};

		that.hasHitMonster = function (monster) {
			// TODO
		};

		that.hasHitJump = function () {
			setJumping();

			if (cancelableStateTimeout) {
				clearTimeout(cancelableStateTimeout);
			}
			cancelableStateTimeout = setTimeout(function() {
				setNormal();
			}, 1000);
		};

		that.hasHitOilSlick = function () {
			that.setSpeed(7);
			that.isMoving = true;

			// Experimenting with losing control
			/* const direction = Math.floor(Math.random() * 4);
			switch (direction) {
				case 0: setDiscreteDirection('sEast');
				case 1: setDiscreteDirection('sWest');
				case 2: setDiscreteDirection('sEast');
				case 3: setDiscreteDirection('sWest');
			} */

			if (cancelableStateTimeout) {
				clearTimeout(cancelableStateTimeout);
			}
			cancelableStateTimeout = setTimeout(function() {
				setNormal();
			}, 200);
		}

		that.hasHitCollectible = function (item) {
			that.onCollectItemCb(item);
		}

		that.isEatenBy = function (monster, whenEaten) {
			that.onHitMonsterCb();
			that.hasHitMonster(monster);
			monster.startEating(whenEaten);
			obstaclesHit.push(monster.id);
			that.isMoving = false;
			that.isBeingEaten = true;
		};

		that.reset = function () {
			obstaclesHit = [];
			pixelsTravelled = 0;
			that.isMoving = true;
			that.isJumping = false;
			that.hasBeenHit = false;
			that.availableAwake = 100;
			that.isBeingEaten = false;
			that.isBoosted = false;
			that.isBoosting = false;
		};

		that.setHitObstacleCb = function (fn) {
			that.onHitObstacleCb = fn || function() {};
		};

		that.setHitMonsterCb = function (fn) {
			that.onHitMonsterCb = fn || function() {};
		}

		that.setCollectItemCb = function (fn) {
			that.onCollectItemCb = fn || function() {};
		};

		function startCrashing() {
			crashingFrame += 1;
			that.isCrashing = true;
			that.isBoosting = false;
			that.setSpeed(1);
			if (crashingFrame < 6) {
				setTimeout(function () {
					startCrashing();
				}, 100);
			} else {
				crashingFrame = 0;
				that.isCrashing = false;
				that.isMoving = false; // stop moving on last frame
				that.resetSpeed();
			}
		}

		that.startCrashing = startCrashing;

		return that;
	}

	global.player = Player;
})(this);

if (typeof module !== 'undefined') {
	module.exports = this.player;
}

},{"./sprite":11}],10:[function(require,module,exports){
// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function noop() {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());
},{}],11:[function(require,module,exports){
(function (global) {
	var GUID = require('./guid');
	function Sprite (data) {
		var hittableObjects = {};
		var zIndexesOccupied = [ 0 ];
		var that = this;
		var trackedSpriteToMoveToward;
		var showHitBoxes = false;

		that.direction = undefined;
		that.mapPosition = [0, 0, 0];
		that.id = GUID();
		that.canvasX = 0;
		that.canvasY = 0;
		that.canvasZ = 0;
		that.height = 0;
		that.speed = 0;
		that.data = data || { parts : {} };
		that.movingToward = [ 0, 0 ];
		that.metresDownTheRoad = 0;
		that.movingWithConviction = false;
		that.deleted = false;
		that.maxHeight = (function () {
			if (that.data.parts == undefined) {
				return 0;
			}
			Object.values(that.data.parts).map(function (p) { 
				var height = p[3] || that.height;
				return height;
			 }).max();
		}());
		that.isMoving = true;
		that.isDrawnUnderPlayer = that.data.isDrawnUnderPlayer || false;
		
		if (!that.data.parts) {
			that.data.parts = {};
			that.currentFrame = undefined;
		} else {
			that.currentFrame = that.data.parts[0];
		}

		if (data && data.id){
			that.id = data.id;
		}

		if (data && data.zIndexesOccupied) {
			zIndexesOccupied = data.zIndexesOccupied;
		}

		function incrementX(amount) {
			that.canvasX += amount.toNumber();
		}

		function incrementY(amount) {
			that.canvasY += amount.toNumber();
		}

		function getHitBox(forZIndex) {
			if (that.data.hitBoxes) {
				if (data.hitBoxes[forZIndex]) {
					return data.hitBoxes[forZIndex];
				}
			}
		}

		function roundHalf(num) {
			num = Math.round(num*2)/2;
			return num;
		}

		function move() {
			if (!that.isMoving) {
				return;
			}

			let currentX = that.mapPosition[0];
			let currentY = that.mapPosition[1];

			if (typeof that.direction !== 'undefined') {
				// For this we need to modify the that.direction so it relates to the horizontal
				var d = that.direction - 90;
				if (d < 0) d = 360 + d;
				currentX += roundHalf(that.speed * Math.cos(d * (Math.PI / 180)));
				currentY += roundHalf(that.speed * Math.sin(d * (Math.PI / 180)));
			} else {
				if (typeof that.movingToward[0] !== 'undefined') {
					if (currentX > that.movingToward[0]) {
						currentX -= Math.min(that.getSpeedX(), Math.abs(currentX - that.movingToward[0]));
					} else if (currentX < that.movingToward[0]) {
						currentX += Math.min(that.getSpeedX(), Math.abs(currentX - that.movingToward[0]));
					}
				}
				
				if (typeof that.movingToward[1] !== 'undefined') {
					if (currentY > that.movingToward[1]) {
						currentY -= Math.min(that.getSpeedY(), Math.abs(currentY - that.movingToward[1]));
					} else if (currentY < that.movingToward[1]) {
						currentY += Math.min(that.getSpeedY(), Math.abs(currentY - that.movingToward[1]));
					}
				}
			}

			that.setMapPosition(currentX, currentY);
		}

		this.setHitBoxesVisible = function(show) {
			showHitBoxes = show;
		}

		this.draw = function (dCtx, spriteFrame) {
			that.currentFrame = that.data.parts[spriteFrame];
			let fr = that.currentFrame;// that.data.parts[spriteFrame];
			that.height = fr[3];
			that.width = fr[2];

			const newCanvasPosition = dCtx.mapPositionToCanvasPosition(that.mapPosition);
			that.setCanvasPosition(newCanvasPosition[0], newCanvasPosition[1]);

			// Sprite offset for keeping sprite frame centered (for sprite frames of various sizes)
			const offsetX = fr.length > 4 ? fr[4] : 0;
			const offsetY = fr.length > 5 ? fr[5] : 0;

			dCtx.drawImage(dCtx.getLoadedImage(that.data.$imageFile), fr[0], fr[1], fr[2], fr[3], that.canvasX + offsetX, that.canvasY + offsetY, fr[2], fr[3]);
		
			drawHitbox(dCtx, fr);
		};


		function drawHitbox(dCtx, spritePart) {
			if (!showHitBoxes)
				return;
		
			const hitboxOffsetX = spritePart.length > 6 ? spritePart[6] : 0;
			const hitboxOffsetY = spritePart.length > 7 ? spritePart[7] : 0;

			// Draw hitboxes
			for (const box in that.data.hitBoxes) {
				if (Object.hasOwnProperty.call(that.data.hitBoxes, box)) {
					const hitBox = that.data.hitBoxes[box];
					const left = hitBox[0] + hitboxOffsetX;
					const top = hitBox[1] + hitboxOffsetY;
					const right = hitBox[2] + hitboxOffsetX;
					const bottom = hitBox[3] + hitboxOffsetY;
					dCtx.strokeStyle = 'yellow';
					dCtx.strokeRect(that.canvasX + left, that.canvasY + top, right - left, bottom - top);
				}
			}
		}

		this.setMapPosition = function (x, y, z) {
			if (typeof x === 'undefined') {
				x = that.mapPosition[0];
			}
			if (typeof y === 'undefined') {
				y = that.mapPosition[1];
			}
			if (typeof z === 'undefined') {
				z = that.mapPosition[2];
			} else {
				that.zIndexesOccupied = [ z ];
			}
			that.mapPosition = [x, y, z];
		};

		this.setCanvasPosition = function (cx, cy) {
			if (cx) {
				if (Object.isString(cx) && (cx.first() === '+' || cx.first() === '-')) incrementX(cx);
				else that.canvasX = cx;
			}
			
			if (cy) {
				if (Object.isString(cy) && (cy.first() === '+' || cy.first() === '-')) incrementY(cy);
				else that.canvasY = cy;
			}
		};

		this.getCanvasPositionX = function () {
			return that.canvasX;
		};

		this.getCanvasPositionY = function  () {
			return that.canvasY;
		};

		this.getLeftHitBoxEdge = function (zIndex) {
			zIndex = zIndex || 0;
			let lhbe = this.getCanvasPositionX();
			const hitbox = getHitBox(zIndex);
			if (hitbox) {
				lhbe += hitbox[0];
			}
			return lhbe;
		};

		this.getTopHitBoxEdge = function (zIndex) {
			zIndex = zIndex || 0;
			let thbe = this.getCanvasPositionY();
			const hitbox = getHitBox(zIndex);
			if (hitbox) {
				thbe += hitbox[1];
			}
			return thbe;
		};

		this.getRightHitBoxEdge = function (zIndex) {
			zIndex = zIndex || 0;

			const hitbox = getHitBox(zIndex);
			if (hitbox) {
				return that.canvasX + hitbox[2];
			}

			return that.canvasX + that.width;
		};

		this.getBottomHitBoxEdge = function (zIndex) {
			zIndex = zIndex || 0;

			const hitbox = getHitBox(zIndex);
			if (hitbox) {
				return that.canvasY + hitbox[3];
			}

			return that.canvasY + that.height;
		};

		this.getPositionInFrontOf = function  () {
			return [that.canvasX, that.canvasY + that.height];
		};

		this.setSpeed = function (s) {
			that.lastSpeed = that.speed;
			that.speed = s;
			that.speedX = s;
			that.speedY = s;
		};

		this.incrementSpeedBy = function (s) {
			that.speed += s;
		};

		that.getSpeed = function getSpeed () {
			return that.speed;
		};

		that.getSpeedX = function () {
			return that.speed;
		};

		that.getSpeedY = function () {
			return that.speed;
		};

		this.setHeight = function (h) {
			that.height = h;
		};

		this.setWidth = function (w) {
			that.width = w;
		};

		this.getMaxHeight = function () {
			return that.maxHeight;
		};

		that.getMovingTowardOpposite = function () {
			if (!that.isMoving) {
				return [0, 0];
			}

			var dx = (that.movingToward[0] - that.mapPosition[0]);
			var dy = (that.movingToward[1] - that.mapPosition[1]);

			var oppositeX = (Math.abs(dx) > 75 ? 0 - dx : 0);
			var oppositeY = -dy;

			return [ oppositeX, oppositeY ];
		};

		this.checkHittableObjects = function () {
			Object.keys(hittableObjects, function (k, objectData) {
				if (objectData.object.deleted) {
					delete hittableObjects[k];
				} else {
					if (objectData.object.hits(that)) {
						objectData.callbacks.each(function (callback) {
							callback(that, objectData.object);
						});
					}
				}
			});
		};

		this.cycle = function () {
			that.checkHittableObjects();

			if (trackedSpriteToMoveToward) {
				that.setMapPositionTarget(trackedSpriteToMoveToward.mapPosition[0], trackedSpriteToMoveToward.mapPosition[1], true);
			}

			move();
		};

		this.setMapPositionTarget = function (x, y, override) {
			if (override) {
				that.movingWithConviction = false;
			}

			if (!that.movingWithConviction) {
				if (typeof x === 'undefined') {
					x = that.movingToward[0];
				}

				if (typeof y === 'undefined') {
					y = that.movingToward[1];
				}

				that.movingToward = [ x, y ];

				that.movingWithConviction = false;
			}

			// that.resetDirection();
		};

		this.setDirection = function (angle) {
			if (angle >= 360) {
				angle = 360 - angle;
			}
			that.direction = angle;
			that.movingToward = undefined;
		};

		this.resetDirection = function () {
			that.direction = undefined;
		};

		this.setMapPositionTargetWithConviction = function (cx, cy) {
			that.setMapPositionTarget(cx, cy);
			that.movingWithConviction = true;
			// that.resetDirection();
		};

		this.follow = function (sprite) {
			trackedSpriteToMoveToward = sprite;
			// that.resetDirection();
		};

		this.stopFollowing = function () {
			trackedSpriteToMoveToward = false;

			// Remove items that are no longer following player
			setTimeout(that.deleteOnNextCycle, 5000);
		};

		this.onHitting = function (objectToHit, callback) {
			if (hittableObjects[objectToHit.id]) {
				return hittableObjects[objectToHit.id].callbacks.push(callback);
			}

			hittableObjects[objectToHit.id] = {
				object: objectToHit,
				callbacks: [ callback ]
			};
		};

		this.deleteOnNextCycle = function () {
			that.deleted = true;
		};

		this.occupiesZIndex = function (z) {
			return zIndexesOccupied.indexOf(z) >= 0;
		};

		this.hits = function (other) {
			const rect1x = other.getLeftHitBoxEdge(that.mapPosition[2]);
			const rect1w = other.getRightHitBoxEdge(that.mapPosition[2]) - rect1x;

			const rect1y = other.getTopHitBoxEdge(that.mapPosition[2]);
			const rect1h = other.getBottomHitBoxEdge(that.mapPosition[2]) - rect1y;

			// Get hitbox offset when specified
			const isarray = Array.isArray(that.currentFrame);
			const hitboxOffsetX =  isarray && that.currentFrame.length > 6 ? that.currentFrame[6] : 0;
			const hitboxOffsetY = isarray && that.currentFrame.length > 7 ? that.currentFrame[7] : 0;

			const rect2x = that.getLeftHitBoxEdge(that.mapPosition[2]) + hitboxOffsetX;
			const rect2w = that.getRightHitBoxEdge(that.mapPosition[2]) - rect2x + hitboxOffsetX;
			const rect2y = that.getTopHitBoxEdge(that.mapPosition[2]) + hitboxOffsetY;
			const rect2h = that.getBottomHitBoxEdge(that.mapPosition[2]) - rect2y + hitboxOffsetY;

			if (rect1x < rect2x + rect2w &&
				rect1x + rect1w > rect2x &&
				rect1y < rect2y + rect2h &&
				rect1h + rect1y > rect2y) {
				return true;
			}
			
			return false;

			// Original collision detection:
			/* var verticalIntersect = false;
			var horizontalIntersect = false;

			// Test that THIS has a bottom edge inside of the other object
			if (other.getTopHitBoxEdge(that.mapPosition[2]) <= that.getBottomHitBoxEdge(that.mapPosition[2]) && other.getBottomHitBoxEdge(that.mapPosition[2]) >= that.getBottomHitBoxEdge(that.mapPosition[2])) {
				verticalIntersect = true;
			}

			// Test that THIS has a top edge inside of the other object
			if (other.getTopHitBoxEdge(that.mapPosition[2]) <= that.getTopHitBoxEdge(that.mapPosition[2]) && other.getBottomHitBoxEdge(that.mapPosition[2]) >= that.getTopHitBoxEdge(that.mapPosition[2])) {
				verticalIntersect = true;
			}

			// Test that THIS has a right edge inside of the other object
			if (other.getLeftHitBoxEdge(that.mapPosition[2]) <= that.getRightHitBoxEdge(that.mapPosition[2]) && other.getRightHitBoxEdge(that.mapPosition[2]) >= that.getRightHitBoxEdge(that.mapPosition[2])) {
				horizontalIntersect = true;
			}

			// Test that THIS has a left edge inside of the other object
			if (other.getLeftHitBoxEdge(that.mapPosition[2]) <= that.getLeftHitBoxEdge(that.mapPosition[2]) && other.getRightHitBoxEdge(that.mapPosition[2]) >= that.getLeftHitBoxEdge(that.mapPosition[2])) {
				horizontalIntersect = true;
			}

			return verticalIntersect && horizontalIntersect; */
		};

		this.isAboveOnCanvas = function (cy) {
			return (that.canvasY + that.height) < cy;
		};

		this.isBelowOnCanvas = function (cy) {
			return (that.canvasY) > cy;
		};

		return that;
	}

	Sprite.createObjects = function createObjects(spriteInfoArray, opts) {
		if (!Array.isArray(spriteInfoArray)) spriteInfoArray = [ spriteInfoArray ];
		opts = Object.merge(opts, {
			rateModifier: 0,
			dropRate: 1,
			position: [0, 0]
		}, false, false);

		var AnimatedSprite = require('./animatedSprite');

		function createOne (spriteInfo) {
			var position = opts.position;
			if (Number.random(100 + opts.rateModifier) <= spriteInfo.dropRate) {
				var sprite;
				if (spriteInfo.sprite.animated) {
					sprite = new AnimatedSprite(spriteInfo.sprite);
				} else {
					sprite = new Sprite(spriteInfo.sprite);
				}	

				sprite.setSpeed(0);

				if (Object.isFunction(position)) {
					position = position();
				}

				sprite.setMapPosition(position[0], position[1]);

				if (spriteInfo.sprite.hitBehaviour && spriteInfo.sprite.hitBehaviour.player && opts.player) {
					sprite.onHitting(opts.player, spriteInfo.sprite.hitBehaviour.player);
				}

				return sprite;
			}
		}

		var objects = spriteInfoArray.map(createOne).remove(undefined);

		return objects;
	};

	global.sprite = Sprite;
})( this );


if (typeof module !== 'undefined') {
	module.exports = this.sprite;
}
},{"./animatedSprite":1,"./guid":6}],12:[function(require,module,exports){
(function (global) {
	function SpriteArray() {
		this.pushHandlers = [];

		return this;
	}

	SpriteArray.prototype = Object.create(Array.prototype);

	SpriteArray.prototype.onPush = function(f, retroactive) {
		this.pushHandlers.push(f);

		if (retroactive) {
			this.each(f);
		}
	};

	SpriteArray.prototype.push = function(obj) {
		Array.prototype.push.call(this, obj);
		this.pushHandlers.each(function(handler) {
			handler(obj);
		});
	};

	SpriteArray.prototype.cull = function() {
		this.each(function (obj, i) {
			if (obj.deleted) {
				return (delete this[i]);
			}
		});
	};

	global.spriteArray = SpriteArray;
})(this);


if (typeof module !== 'undefined') {
	module.exports = this.spriteArray;
}
},{}],13:[function(require,module,exports){
// Global dependencies which return no modules
require('./lib/canvasRenderingContext2DExtensions');
require('./lib/extenders');
require('./lib/plugins');

// External dependencies
var Mousetrap = require('br-mousetrap');

// Method modules
var isMobileDevice = require('./lib/isMobileDevice');

// Game Objects
var SpriteArray = require('./lib/spriteArray');
var Monster = require('./lib/monster');
var AnimatedSprite = require('./lib/animatedSprite');
var Sprite = require('./lib/sprite');
var Player = require('./lib/player');
var GameHud = require('./lib/gameHud');
var Game = require('./lib/game');

// Local variables for starting the game
var mainCanvas = document.getElementById('game-canvas');
var dContext = mainCanvas.getContext('2d', { alpha: false });

var imageSources = [ 'assets/background.jpg', 'assets/cart-sprites.png', 'assets/startsign-sprite.png', 'assets/oilslick-sprite.png', 
	'assets/token-sprites.png', 'assets/milkshake-sprite.png', 'assets/malord-sprites.png',
	'assets/hatguy-sprites.png', 'assets/pilot-sprites.png', 'assets/romansoldier-sprites.png', 'assets/skeleton-sprites.png',
	'assets/traffic-cone-large.png', 'assets/traffic-cone-small.png', 'assets/garbage-can.png', 'assets/ramp-sprite.png' ];

var playSound;
var sounds = { 'track1': 'assets/music/track1.ogg',
			   'track2': 'assets/music/track2.ogg',
			   'track3': 'assets/music/track3.ogg',
			   'gameOver': 'assets/music/gameover.ogg' };
var currentTrack;
var playingTrackNumber = 1;

var global = this;
var sprites = require('./spriteInfo');
const monster = require('./lib/monster');

var pixelsPerMetre = 18;
var monsterDistanceThreshold = 2000;
const totalLives = 5;
var livesLeft = totalLives;
var highScore = 0;

//source: https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
const cyrb53 = function(str, s = 0) {
	let h1 = 0xdeadbeef ^ s, h2 = 0x41c6ce57 ^ s;
	for (let i = 0, ch; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
	h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
	return 4294967296 * (2097151 & h2) + (h1>>>0);
};

const gameInfo = {
	distance: 0,
	money: 0,
	tokens: 0,
	points: 0,
	cans: 0,
	levelBoost: 0,
	gameEndDateTime: null,

	god: false,

	reset() {
		this.distance = 0;
		this.money = 0;
		this.tokens = 0;
		this.points = 0;
		this.cans = 0;
		this.levelBoost = 0;
		this.gameEndDateTime = null;
	},

	getLevel() {
		return this.distance < 100 ? 1 
			: Math.floor(this.distance / 100) + this.levelBoost;
	},

	getScore() {
		return (this.getLevel() * 100)
			+ (this.tokens * 10)
			+ (this.distance * 10);
	},

	getFormattedScore() {
		const d = this.gameEndDateTime;
		return '🛒 CartWars - Serious Shopper 🛒'
			+ '\nDate: ' + d.getMonth() + '/' + d.getDate() + '/' + d.getFullYear() + ' '
				+ ('00' + d.getHours()).slice(-2) + ':' + ('00' + d.getMinutes()).slice(-2) + ':' + ('00' + d.getSeconds()).slice(-2)
			+ '\nLevel: ' + this.getLevel()
			+ '\nTokens: ' + this.tokens
			+ '\nDistance: ' + this.distance + 'm'
			+ '\nTotal Score: ' + this.getScore()
			+ '\nCode: ' + cyrb53(this.getLevel().toString() + this.tokens.toString()
				+ this.distance.toString() + this.getScore().toString(), 
				d.getDate() + d.getMonth() + d.getFullYear() + d.getHours() + d.getMinutes()).toString(36);
	},
};

var dropRates = { trafficConeLarge: 1, trafficConeSmall: 1, garbageCan: 1, jump: 1, oilSlick: 1, 
				  token: 3, milkshake: 1};
if (localStorage.getItem('highScore')) highScore = localStorage.getItem('highScore');

function loadImages (sources, next) {
	var loaded = 0;
	var images = {};

	function finish () {
		loaded += 1;
		if (loaded === sources.length) {
			next(images);
		}
	}

	sources.each(function (src) {
		var im = new Image();
		im.onload = finish;
		im.src = src;
		dContext.storeLoadedImage(src, im);
	});
}

function _checkAudioState(sound) {
	/* if (sounds[sound].status === 'loading' && sounds[sound].readyState === 4) {
		assetLoaded.call(this, 'sounds', sound);
	} */
}

function loadSounds () {
	for (var sound in sounds) {
		if (sounds.hasOwnProperty(sound)) {
			src = sounds[sound];
			// create a closure for event binding
			(function(sound) {
				sounds[sound] = new Audio();
				sounds[sound].status = 'loading';
				sounds[sound].name = sound;
				sounds[sound].addEventListener('canplay', function() {
					_checkAudioState.call(sound);
				});
				sounds[sound].src = src;
				sounds[sound].preload = 'auto';
				sounds[sound].load();
			})(sound);
		}
	}
}

function monsterHitsPlayerBehaviour(monster, player) {
	player.isEatenBy(monster, function () {
		monster.isFull = true;
		monster.isEating = false;
		//player.isBeingEaten = false;
		monster.setSpeed(player.getSpeed());
		monster.stopFollowing();
		var randomPositionAbove = dContext.getRandomMapPositionAboveViewport();
		monster.setMapPositionTarget(randomPositionAbove[0], randomPositionAbove[1]);
	});
}

function playMusicTrack(nextTrack) {
	if (nextTrack === playingTrackNumber) return;

	currentTrack.muted = true;
	playingTrackNumber = nextTrack;
	if (nextTrack > sounds.length - 1)
		playingTrackNumber = 1;
	currentTrack = sounds["track" + nextTrack];
	currentTrack.currentTime = 0;
	currentTrack.loop = true;

	if (playSound) {
		currentTrack.play();
		currentTrack.muted = false;
	}
}

function showValidateCodeMenu() {
	$('#main').hide();
	$('#validatecode').show();
	$('#menu').addClass('validatecode');
}

function validateCode() {
	let tokens = $("#validatetext").val().toLowerCase().split(/\r?\n/).filter(function(token) {
		return token.startsWith('date:') ||
			token.startsWith('level:') ||
			token.startsWith('tokens:') ||
			token.startsWith('distance:') ||
			token.startsWith('total score:') ||
			token.startsWith('code:');
	});
	function getValue(token) {
		return tokens.find(i => i.startsWith(token))?.split(": ")[1];
	}
	let val = getValue('level:') + getValue('tokens:') + getValue('distance:')?.replace('m', '') + getValue('total score:');
	let d = getValue('date:')?.replaceAll(' ', '/')?.replaceAll(':', '/')?.split('/');
	if (val != null && d != null) {
		let s = 0;
		for (let i = 0; i < d.length - 1; i++) {
			s += parseInt(d[i]);
		}
		const c = cyrb53(val, s);
		if (c.toString(36) == getValue('code:')) { 
			alert('Code is valid!');
			return;
		}
	}
	alert('Code is NOT valid!');	
}

$('.validate').click(validateCode);

function startNeverEndingGame (images) {
	var player;
	var startSign;
	var gameHud;
	var game;

	function showMainMenu(images) {
		for (var sound in sounds) {
			if (sounds.hasOwnProperty(sound)) {
				sounds[sound].muted = true;
				currentTrack.muted = !playSound;
			}
		}
		mainCanvas.style.display = 'none';
		$('#main').show();
		$('#menu').addClass('main');
		$('.sound').show();
	}

	function showGameOverMenu() {
		$('#menu').removeClass('main');
		$('#menu').show();
		$('#gameover').show();
		$('#menu').addClass('gameover');
		$('#copypaste').hide();
		$('#level').text('Level: ' + gameInfo.getLevel().toLocaleString() + ' x100');
		$('#tokens').text('Tokens: ' + gameInfo.tokens.toLocaleString() + ' x10');
		$('#distance').text('Distance: ' + gameInfo.distance.toLocaleString() + 'm x10');
		$('#score').text('Score: ' + gameInfo.getScore().toLocaleString());
	}

	function toggleGodMode() {
		gameInfo.god = !gameInfo.god;
	}

	function resetGame () {
		livesLeft = 5;
		highScore = localStorage.getItem('highScore');
		game.reset();
		game.addStaticObject(startSign);
		gameInfo.reset();
		playMusicTrack(1);
	}

	function detectEnd () {
		if (game.isGameEnding()) return;

		game.gameOver();
		gameInfo.gameEndDateTime = new Date();
		livesLeft = 0;
		updateHud();
		
		if (gameInfo.getScore() > highScore)
			highScore = localStorage.setItem('highScore', gameInfo.getScore());
		
		playingTrackNumber = 0;
		currentTrack.muted = true;
		currentTrack = sounds.gameOver;
		currentTrack.currentTime = 0;
		currentTrack.loop = true;
		if (playSound) {
			currentTrack.play();
			currentTrack.muted = false;
		}

		// Let the monster finish eating
		if (player.isBeingEaten) {
			setTimeout(showGameOverMenu, 1000);
		} else {
			game.pause();
			game.cycle();
			showGameOverMenu();
		}
	}

	function updateHud(message) {
		if (!message)
			message = '';

		if (!gameHud) {
			gameHud = new GameHud({
				position: {
					top: 50,
					left: 25
				}
			});
		}

		gameHud.setLines([
			'Level ' + gameInfo.getLevel(),
			'Tokens ' + gameInfo.tokens,
			'Life ' + livesLeft / totalLives * 100 + '%',
			'Awake ' + player.availableAwake + '/100',
			'Distance ' + gameInfo.distance + 'm',
			'Speed ' + player.getSpeed(),
			'Total Score ' + gameInfo.getScore(),
			'High Score ' + highScore,
			message
		]);

		playMusicTrack(Math.floor(gameInfo.distance / 1000 % 3) + 1);
	}

	function randomlySpawnNPC(spawnFunction, dropRate) {
		var rateModifier = mainCanvas.width; //Math.max(800 - mainCanvas.width, 0);
		if (Number.random(1000 + rateModifier) <= dropRate) {
			spawnFunction();
		}
	}

	function spawnMonster () {
		var newMonster = new Monster(sprites.monster);
		var randomPosition = dContext.getRandomMapPositionAboveViewport();
		newMonster.setMapPosition(randomPosition[0], randomPosition[1]);
		newMonster.follow(player);
		newMonster.onHitting(player, monsterHitsPlayerBehaviour);

		// Stop chasing after timeout
		setTimeout(() => {
			if (newMonster) {
				if (newMonster.isEating || newMonster.isFull) return;
				newMonster.isFull = true;
				newMonster.setSpeed(player.getSpeed());
				newMonster.stopFollowing();
				var randomPositionAbove = dContext.getRandomMapPositionAboveViewport();
				newMonster.setMapPositionTarget(randomPositionAbove[0], randomPositionAbove[1]);
			}
		}, 15000);

		game.addMovingObject(newMonster, 'monster');
	}

	$('.player1').click(function() {
		sprites.player = sprites.player1;
		startGame();
	});
	$('.player2').click(function() {
		sprites.player = sprites.player2;
		startGame();
	});
	$('.player3').click(function() {
		sprites.player = sprites.player3;
		startGame();
	});
	$('.player4').click(function() {
		sprites.player = sprites.player4;
		startGame();
	});

	Mousetrap.bind('shift+v', showValidateCodeMenu);

	function startGame(){
		$('#gameover').hide();
		$('#selectPlayer').hide();
		$('#menu').removeClass('gameover');
		$('#menu').removeClass('selectPlayer');
		$('#menu').hide();
		mainCanvas.style.display = '';

		player = new Player(sprites.player);
		player.setMapPosition(0, 0);
		player.setMapPositionTarget(0, -10);

		player.setHitObstacleCb(function() {
			if (gameInfo.god) return;
			if (livesLeft > 0) livesLeft -= 1;
		});

		player.setHitMonsterCb(() => {
			if (gameInfo.god) return;
			livesLeft = 0;
		});

		player.setCollectItemCb(function(item) {
			switch (item.data.name)
			{
				case 'token':
					gameInfo.tokens += item.data.pointValues[Math.floor(Math.random() * item.data.pointValues.length)];
					break;
				case 'milkshake':
					gameInfo.levelBoost += 1;
					break;
			}
		});

		game = new Game(mainCanvas, player);

		startSign = new Sprite(sprites.signStart);
		game.addStaticObject(startSign);
		startSign.setMapPosition(-50, 0);
		dContext.followSprite(player);
		
		updateHud();

		game.beforeCycle(function () {
			var newObjects = [];
			if (player.isMoving) {
				newObjects = Sprite.createObjects([
					{ sprite: sprites.jump, dropRate: dropRates.jump },
					{ sprite: sprites.oilSlick, dropRate: dropRates.oilSlick },
					{ sprite: sprites.trafficConeLarge, dropRate: dropRates.trafficConeLarge },
					{ sprite: sprites.trafficConeSmall, dropRate: dropRates.trafficConeSmall },
					{ sprite: sprites.garbageCan, dropRate: dropRates.garbageCan },
					{ sprite: sprites.token, dropRate: dropRates.token },
					{ sprite: sprites.milkshake, dropRate: dropRates.milkshake }
				], {
					rateModifier: Math.max(600 - mainCanvas.width, 0),
					position: function () {
						return dContext.getRandomMapPositionBelowViewport();
					},
					player: player
				});
			}
			if (!game.isPaused()) {
				game.addStaticObjects(newObjects);

				gameInfo.distance = parseFloat(player.getPixelsTravelledDownRoad() / pixelsPerMetre).toFixed(1);

				if (gameInfo.distance > monsterDistanceThreshold) {
					randomlySpawnNPC(spawnMonster, 0.001);
				}

				if (gameInfo.distance)

				updateHud();
			}
		});

		game.afterCycle(function() {
			if (livesLeft === 0) {
				detectEnd();
			}
		});

		game.addUIElement(gameHud);
		
		$(mainCanvas)
			.mousemove(function (e) {
				game.setMouseX(e.pageX);
				game.setMouseY(e.pageY);
				player.resetDirection();
				player.startMovingIfPossible();
			})
			.bind('click', function (e) {
				game.setMouseX(e.pageX);
				game.setMouseY(e.pageY);
				player.resetDirection();
				player.startMovingIfPossible();
			})
			.focus(); // So we can listen to events immediately
		
		Mousetrap.unbind('v');
		Mousetrap.bind('f', player.speedBoost);
		//Mousetrap.bind('t', player.attemptTrick);
		Mousetrap.bind(['w', 'up'], function () {
			player.stop();
		});
		Mousetrap.bind(['a', 'left'], function () {
			if (player.direction === 270) {
				player.stepWest();
			} else {
				player.turnWest();
			}
		});
		Mousetrap.bind(['s', 'down'], function () {
			player.setDirection(180);
			player.startMovingIfPossible();
		});
		Mousetrap.bind(['d', 'right'], function () {
			if (player.direction === 90) {
				player.stepEast();
			} else {
				player.turnEast();
			}
		});
		
		Mousetrap.bind('space', resetGame);
		
		$(document).ready(function() {
			if (window.location.href.indexOf("index-dev.html") !== -1) {
				Mousetrap.bind('m', spawnMonster);
				Mousetrap.bind('g', toggleGodMode);
				Mousetrap.bind('h', game.toggleHitBoxes);
			}
		});

		var hammertime = new Hammer(mainCanvas);
		hammertime.on('press', function (e) {
			e.preventDefault();
			game.setMouseX(e.center.x);
			game.setMouseY(e.center.y);
		});
		hammertime.on('tap', function (e) {
			game.setMouseX(e.center.x);
			game.setMouseY(e.center.y);
		});
		hammertime.on('pan', function (e) {
			game.setMouseX(e.center.x);
			game.setMouseY(e.center.y);
			player.resetDirection();
			player.startMovingIfPossible();
		})
		hammertime.on('doubletap', function (e) {
			player.speedBoost();
		});

		player.isMoving = false;
		player.setDirection(270);
		
		game.start();

		currentTrack = sounds.track1;
		currentTrack.play();
	}

	$('.copyscore').click(function() {
		$('#copypaste').show();
		const s = gameInfo.getFormattedScore();
		$('#copypastetext').text(s).select();
		navigator.clipboard.writeText(s);
	});
	$('.restart').click(function() {
		$('#gameover').hide();
		$('#menu').hide();
		resetGame();
	});

	showMainMenu();
}

function resizeCanvas() {
	mainCanvas.width = window.innerWidth;
	mainCanvas.height = window.innerHeight;
}

$('.play').click(function() {
	$('#main').hide();
	$('#selectPlayer').show();
	$('#menu').addClass('selectPlayer');
  });

$('.instructions').click(function() {
	$('#main').hide();
	$('#instructions').show();
	$('#menu').addClass('instructions');
  });

$('.credits').click(function() {
	$('#main').hide();
	$('#credits').show();
	$('#menu').addClass('credits');
  });

$('.back').click(function() {
	$('#credits').hide();
	$('#selectPlayer').hide();
	$('#instructions').hide();
	$('#validatecode').hide();
	$('#main').show();
	$('#menu').removeClass('credits');
	$('#menu').removeClass('selectPlayer');
	$('#menu').removeClass('instructions');
	$('#menu').removeClass('validatecode');
  });

// set the sound preference
var canUseLocalStorage = 'localStorage' in window && window.localStorage !== null;
if (canUseLocalStorage) {
	playSound = (localStorage.getItem('hbwCartRacing.playSound') === "true")
	if (playSound) {
		$('.sound').addClass('sound-on').removeClass('sound-off');
	}
	else {
		$('.sound').addClass('sound-off').removeClass('sound-on');
	}
}

$('.sound').click(function() {
	var $this = $(this);
	// sound off
	if ($this.hasClass('sound-on')) {
	  $this.removeClass('sound-on').addClass('sound-off');
	  playSound = false;
	}
	// sound on
	else {
	  $this.removeClass('sound-off').addClass('sound-on');
	  playSound = true;
	}
	if (canUseLocalStorage) {
	  localStorage.setItem('hbwCartRacing.playSound', playSound);
	}
	// mute or unmute all sounds
	for (var sound in sounds) {
		if (sounds.hasOwnProperty(sound)) {
			sounds[sound].muted = true;
			currentTrack.muted = !playSound;
		}
	}
	if (playSound) currentTrack.play();
});

window.addEventListener('resize', resizeCanvas, false);

resizeCanvas();

loadSounds();

currentTrack = sounds.track1;
currentTrack.currentTime = 0;
currentTrack.loop = true;

loadImages(imageSources, startNeverEndingGame);

this.exports = window;

},{"./lib/animatedSprite":1,"./lib/canvasRenderingContext2DExtensions":2,"./lib/extenders":3,"./lib/game":4,"./lib/gameHud":5,"./lib/isMobileDevice":7,"./lib/monster":8,"./lib/player":9,"./lib/plugins":10,"./lib/sprite":11,"./lib/spriteArray":12,"./spriteInfo":14,"br-mousetrap":15}],14:[function(require,module,exports){
const game = require("./lib/game");

(function (global) {
	var sprites = {
		'player': {
			id: 'player',
			$imageFile: '',
			parts: {},
			hitBoxes: {},
			hitBehavior: {}
		},
		'player1': {
			$imageFile : 'assets/hatguy-sprites.png',
			parts : {
				// x, y, width, height, canvasOffsetX, canvasOffsetY, hitboxOffsetX, hitboxOffsetY 
				blank : [ 0, 0, 0, 0 ],
				east : [ 145, 61, 70, 66, 0, 0, 25, 0 ],
				esEast : [ 71, 196, 65, 71, 0, 0, 21, 0 ],
				sEast : [ 103, 127, 52, 69, 0, 0, 13, 0 ],
				south : [ 60, 127, 43, 68 ],
				sWest : [ 155, 127, 50, 69 ],
				wsWest : [ 0, 127, 60, 66 ],
				west : [ 153, 0, 65, 61 ],
				jumping : [ 0, 267, 56, 87, -3, 10 ],
				boost : [ 56, 267, 43, 113, 0, -45 ],

				// Wreck sequence
				wreck1 : [ 0, 196, 71, 70 ],
				wreck2 : [ 77, 61, 68, 64 ],
				wreck3 : [ 0, 0, 70, 50 ],
				wreck4 : [ 136, 196, 75, 71 ],
				wreck5 : [ 70, 0, 83, 59 ],
				wreck6 : [ 0, 61, 77, 61 ]
			},
			hitBoxes: {
				//Left, Top, Right, Bottom
				0: [ 0, 20, 45, 60 ]
			},
			id : 'player',
			hitBehaviour: {}
		},
		'player2': {
			$imageFile : 'assets/pilot-sprites.png',
			parts : {
				// x, y, width, height, canvasOffsetX, canvasOffsetY, hitboxOffsetX, hitboxOffsetY 
				blank : [ 0, 0, 0, 0 ],
				east : [ 0, 365, 70, 68, 0, 0, 25, 0 ],
				esEast : [ 51, 283, 65, 71, 0, 0, 21, 0 ],
				sEast : [ 0, 209, 57, 74, 0, 0, 13, 0 ],
				south : [ 0, 0, 43, 68 ],
				sWest : [ 0, 135, 54, 74, 0 ],
				wsWest : [ 65, 68, 60, 67 ],
				west : [ 0, 68, 65, 62 ],
				jumping : [ 0, 283, 51, 82, -3, 10 ],
				boost : [ 75, 562, 43, 113, 0, -45 ],

				// Wreck sequence
				wreck1 : [ 0, 433, 68, 70 ],
				wreck2 : [ 57, 209, 68, 64 ],
				wreck3 : [ 43, 0, 70, 50 ],
				wreck4 : [ 0, 562, 75, 73 ],
				wreck5 : [ 0, 503, 83, 59 ],
				wreck6 : [ 54, 135, 71, 59 ]
			},
			hitBoxes: {
				//Left, Top, Right, Bottom
				0: [ 0, 20, 45, 60 ]
			},
			id : 'player',
			hitBehaviour: {}
		},
		'player3': {
			$imageFile : 'assets/romansoldier-sprites.png',
			parts : {
				// x, y, width, height, canvasOffsetX, canvasOffsetY, hitboxOffsetX, hitboxOffsetY 
				blank : [ 0, 0, 0, 0 ],
				east : [ 131, 62, 73, 70, 0, 0, 25, 0 ],
				esEast : [ 72, 132, 65, 71, 0, 0, 21, 0 ],
				sEast : [ 132, 203, 57, 74, 0, 0, 13, 0 ],
				south : [ 79, 203, 53, 74, 0, 0, 6, 0 ],
				sWest : [ 0, 62, 66, 69, 0, 0, 15, 0 ],
				wsWest : [ 0, 203, 79, 72, 0, 0, 10, 0 ],
				west : [ 66, 62, 65, 69 ],
				jumping : [ 75, 277, 64, 91, -12, 10 ],
				boost : [ 139, 277, 53, 122, 0, -45 ],

				// Wreck sequence
				wreck1 : [ 0, 132, 72, 70 ],
				wreck2 : [ 77, 0, 63, 59 ],
				wreck3 : [ 137, 132, 70, 71 ],
				wreck4 : [ 0, 277, 75, 77 ],
				wreck5 : [ 0, 0, 77, 55 ],
				wreck6 : [ 140, 0, 72, 62 ]
			},
			hitBoxes: {
				//Left, Top, Right, Bottom
				0: [ 0, 20, 45, 60 ]
			},
			id : 'player',
			hitBehaviour: {}
		},
		'player4': {
			$imageFile : 'assets/skeleton-sprites.png',
			parts : {
				// x, y, width, height, canvasOffsetX, canvasOffsetY, hitboxOffsetX, hitboxOffsetY 
				blank : [ 0, 0, 0, 0 ],
				east : [ 0, 68, 73, 71, 0, 0, 25, 0 ],
				esEast : [ 73, 68, 65, 71, 0, 0, 21, 0 ],
				sEast : [ 202, 68, 56, 74, 0, 0, 13, 0 ],
				south : [ 437, 0, 43, 68 ],
				sWest : [ 258, 68, 54, 74, 0 ],
				wsWest : [ 138, 68, 64, 71 ],
				west : [ 290, 0, 68, 66 ],
				jumping : [ 387, 68, 56, 93, -3, 10 ],
				boost : [ 443, 68, 46, 122, 0, -45 ],

				// Wreck sequence
				wreck1 : [ 223, 0, 67, 65 ],
				wreck2 : [ 155, 0, 68, 64 ],
				wreck3 : [ 0, 0, 71, 51 ],
				wreck4 : [ 312, 68, 75, 78 ],
				wreck5 : [ 71, 0, 84, 59 ],
				wreck6 : [ 358, 0, 79, 67 ]
			},
			hitBoxes: {
				//Left, Top, Right, Bottom
				0: [ 0, 20, 45, 60 ]
			},
			id : 'player',
			hitBehaviour: {}
		},
		'token' : {
			name: 'token',
			$imageFile: 'assets/token-sprites.png',
			animated: true,
			collectible: true,
			pointValues: [125, 150, 175, 200, 250, 300, 350, 400, 450, 500],
			parts: {
				frame1: [0, 0, 25, 26],
				frame2: [25, 0, 25, 26],
				frame3: [50, 0, 25, 26],
				frame4: [75, 0, 25, 26]
			},
			hitBehaviour: {}
		},
		'oilSlick' : {
			$imageFile : 'assets/oilslick-sprite.png',
			parts : {
				main : [ 0, 0, 40, 19 ]
			},
			hitBehaviour: {},
			isDrawnUnderPlayer: true
		},
		'monster' : {
			name: 'monster',
			$imageFile : 'assets/malord-sprites.png',
			parts : {
				sEast1 : [ 332, 149, 166, 149 ],
				sEast2 : [ 0, 298, 166, 149 ],
				sWest1 : [ 166, 298, 166, 149 ],
				sWest2 : [ 332, 298, 166, 149 ],
				eating1 : [ 0, 0, 166, 149 ],
				eating2 : [ 166, 0, 166, 149 ],
				eating3 : [ 332, 0, 166, 149 ],
				eating4 : [ 0, 149, 166, 149 ],
				eating5 : [ 166, 149, 166, 149 ],
			},
			hitBoxes: {
				//Left, Top, Right, Bottom
				0: [ 30, 50, 145, 125 ]
			},
			hitBehaviour: {}
		},
		'jump' : {
			$imageFile : 'assets/ramp-sprite.png',
			parts : {
				main : [ 0, 0, 54, 36 ]
			},
			hitBoxes: {
				//Left, Top, Right, Bottom
				0: [ 6, 3, 48, 10 ]
			},
			hitBehaviour: {},
			isDrawnUnderPlayer: true
		},
		'signStart' : {
			$imageFile : 'assets/startsign-sprite.png',
			parts : {
				main : [ 0, 0, 42, 27 ]
			},
			hitBehaviour: {}
		},
		'milkshake': {
			name: 'milkshake',
			$imageFile: 'assets/milkshake-sprite.png',
			collectible: true,
			pointValues: [125, 150, 175, 200, 250, 300, 350, 400, 450, 500],
			parts: {
				main : [ 0, 0, 25, 43 ]
			},
			hitBehaviour: {}
		},
		'trafficConeLarge': {
			$imageFile: 'assets/traffic-cone-large.png',
			parts: {
				main : [ 0, 0, 39, 48 ]
			},
			zIndexesOccupied : [0, 1],
			hitBoxes: {
				0: [ 0, 26, 39, 48 ],
				1: [ 12, 0, 28, 20 ]
			},
			hitBehaviour: {}
		},
		'trafficConeSmall': {
			$imageFile: 'assets/traffic-cone-small.png',
			parts: {
				main : [ 0, 0, 19, 24 ]
			},
			hitBoxes: {
				0: [ 0, 13, 19, 24 ]
			},
			hitBehaviour: {}
		},
		'garbageCan': {
			$imageFile: 'assets/garbage-can.png',
			parts: {
				main : [ 0, 0, 29, 45 ]
			},
			hitBoxes: {
				0: [ 1, 30, 28, 44 ]
			},
			hitBehaviour: {}
		}
	};

	function obstacleHitsMonsterBehavior(obstacle, monster) {
		// Remove obstacles as monster hits them, slow monster

		// Disabled monster slowdown
		//monster.setObstacleHitSpeed();
		obstacle.deleteOnNextCycle();
	}
	sprites.garbageCan.hitBehaviour.monster = obstacleHitsMonsterBehavior;
	sprites.trafficConeLarge.hitBehaviour.monster = obstacleHitsMonsterBehavior;
	sprites.trafficConeSmall.hitBehaviour.monster = obstacleHitsMonsterBehavior;
	sprites.jump.hitBehaviour.monster = obstacleHitsMonsterBehavior;
	sprites.oilSlick.hitBehaviour.monster = obstacleHitsMonsterBehavior;

	function jumpHitsPlayerBehaviour(jump, player) {
		player.hasHitJump(jump);
	}
	sprites.jump.hitBehaviour.player = jumpHitsPlayerBehaviour;

	function obstacleHitsPlayerBehaviour(obstacle, player) {
		player.hasHitObstacle(obstacle);
	}
	sprites.trafficConeLarge.hitBehaviour.player = obstacleHitsPlayerBehaviour;
	sprites.trafficConeSmall.hitBehaviour.player = obstacleHitsPlayerBehaviour;
	sprites.garbageCan.hitBehaviour.player = obstacleHitsPlayerBehaviour;

	function oilSlickHitsPlayerBehaviour(oilSlick, player) {
		player.hasHitOilSlick(oilSlick);
	}
	sprites.oilSlick.hitBehaviour.player = oilSlickHitsPlayerBehaviour;

	function playerHitsCollectibleBehaviour(item, player) {
		player.hasHitCollectible(item);
		item.deleteOnNextCycle();
	}
	sprites.token.hitBehaviour.player = playerHitsCollectibleBehaviour;
	sprites.milkshake.hitBehaviour.player = playerHitsCollectibleBehaviour;
	
	global.spriteInfo = sprites;
})( this );


if (typeof module !== 'undefined') {
	module.exports = this.spriteInfo;
}
},{"./lib/game":4}],15:[function(require,module,exports){
/**
 * Copyright 2012 Craig Campbell
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Mousetrap is a simple keyboard shortcut library for Javascript with
 * no external dependencies
 *
 * @version 1.1.3
 * @url craig.is/killing/mice
 */
(function() {

    /**
     * mapping of special keycodes to their corresponding keys
     *
     * everything in this dictionary cannot use keypress events
     * so it has to be here to map to the correct keycodes for
     * keyup/keydown events
     *
     * @type {Object}
     */
    var _MAP = {
            8: 'backspace',
            9: 'tab',
            13: 'enter',
            16: 'shift',
            17: 'ctrl',
            18: 'alt',
            20: 'capslock',
            27: 'esc',
            32: 'space',
            33: 'pageup',
            34: 'pagedown',
            35: 'end',
            36: 'home',
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down',
            45: 'ins',
            46: 'del',
            91: 'meta',
            93: 'meta',
            224: 'meta'
        },

        /**
         * mapping for special characters so they can support
         *
         * this dictionary is only used incase you want to bind a
         * keyup or keydown event to one of these keys
         *
         * @type {Object}
         */
        _KEYCODE_MAP = {
            106: '*',
            107: '+',
            109: '-',
            110: '.',
            111 : '/',
            186: ';',
            187: '=',
            188: ',',
            189: '-',
            190: '.',
            191: '/',
            192: '`',
            219: '[',
            220: '\\',
            221: ']',
            222: '\''
        },

        /**
         * this is a mapping of keys that require shift on a US keypad
         * back to the non shift equivelents
         *
         * this is so you can use keyup events with these keys
         *
         * note that this will only work reliably on US keyboards
         *
         * @type {Object}
         */
        _SHIFT_MAP = {
            '~': '`',
            '!': '1',
            '@': '2',
            '#': '3',
            '$': '4',
            '%': '5',
            '^': '6',
            '&': '7',
            '*': '8',
            '(': '9',
            ')': '0',
            '_': '-',
            '+': '=',
            ':': ';',
            '\"': '\'',
            '<': ',',
            '>': '.',
            '?': '/',
            '|': '\\'
        },

        /**
         * this is a list of special strings you can use to map
         * to modifier keys when you specify your keyboard shortcuts
         *
         * @type {Object}
         */
        _SPECIAL_ALIASES = {
            'option': 'alt',
            'command': 'meta',
            'return': 'enter',
            'escape': 'esc'
        },

        /**
         * variable to store the flipped version of _MAP from above
         * needed to check if we should use keypress or not when no action
         * is specified
         *
         * @type {Object|undefined}
         */
        _REVERSE_MAP,

        /**
         * a list of all the callbacks setup via Mousetrap.bind()
         *
         * @type {Object}
         */
        _callbacks = {},

        /**
         * direct map of string combinations to callbacks used for trigger()
         *
         * @type {Object}
         */
        _direct_map = {},

        /**
         * keeps track of what level each sequence is at since multiple
         * sequences can start out with the same sequence
         *
         * @type {Object}
         */
        _sequence_levels = {},

        /**
         * variable to store the setTimeout call
         *
         * @type {null|number}
         */
        _reset_timer,

        /**
         * temporary state where we will ignore the next keyup
         *
         * @type {boolean|string}
         */
        _ignore_next_keyup = false,

        /**
         * are we currently inside of a sequence?
         * type of action ("keyup" or "keydown" or "keypress") or false
         *
         * @type {boolean|string}
         */
        _inside_sequence = false;

    /**
     * loop through the f keys, f1 to f19 and add them to the map
     * programatically
     */
    for (var i = 1; i < 20; ++i) {
        _MAP[111 + i] = 'f' + i;
    }

    /**
     * loop through to map numbers on the numeric keypad
     */
    for (i = 0; i <= 9; ++i) {
        _MAP[i + 96] = i;
    }

    /**
     * cross browser add event method
     *
     * @param {Element|HTMLDocument} object
     * @param {string} type
     * @param {Function} callback
     * @returns void
     */
    function _addEvent(object, type, callback) {
        if (object.addEventListener) {
            object.addEventListener(type, callback, false);
            return;
        }

        object.attachEvent('on' + type, callback);
    }

    /**
     * takes the event and returns the key character
     *
     * @param {Event} e
     * @return {string}
     */
    function _characterFromEvent(e) {

        // for keypress events we should return the character as is
        if (e.type == 'keypress') {
            return String.fromCharCode(e.which);
        }

        // for non keypress events the special maps are needed
        if (_MAP[e.which]) {
            return _MAP[e.which];
        }

        if (_KEYCODE_MAP[e.which]) {
            return _KEYCODE_MAP[e.which];
        }

        // if it is not in the special map
        return String.fromCharCode(e.which).toLowerCase();
    }

    /**
     * checks if two arrays are equal
     *
     * @param {Array} modifiers1
     * @param {Array} modifiers2
     * @returns {boolean}
     */
    function _modifiersMatch(modifiers1, modifiers2) {
        return modifiers1.sort().join(',') === modifiers2.sort().join(',');
    }

    /**
     * resets all sequence counters except for the ones passed in
     *
     * @param {Object} do_not_reset
     * @returns void
     */
    function _resetSequences(do_not_reset) {
        do_not_reset = do_not_reset || {};

        var active_sequences = false,
            key;

        for (key in _sequence_levels) {
            if (do_not_reset[key]) {
                active_sequences = true;
                continue;
            }
            _sequence_levels[key] = 0;
        }

        if (!active_sequences) {
            _inside_sequence = false;
        }
    }

    /**
     * finds all callbacks that match based on the keycode, modifiers,
     * and action
     *
     * @param {string} character
     * @param {Array} modifiers
     * @param {Event|Object} e
     * @param {boolean=} remove - should we remove any matches
     * @param {string=} combination
     * @returns {Array}
     */
    function _getMatches(character, modifiers, e, remove, combination) {
        var i,
            callback,
            matches = [],
            action = e.type;

        // if there are no events related to this keycode
        if (!_callbacks[character]) {
            return [];
        }

        // if a modifier key is coming up on its own we should allow it
        if (action == 'keyup' && _isModifier(character)) {
            modifiers = [character];
        }

        // loop through all callbacks for the key that was pressed
        // and see if any of them match
        for (i = 0; i < _callbacks[character].length; ++i) {
            callback = _callbacks[character][i];

            // if this is a sequence but it is not at the right level
            // then move onto the next match
            if (callback.seq && _sequence_levels[callback.seq] != callback.level) {
                continue;
            }

            // if the action we are looking for doesn't match the action we got
            // then we should keep going
            if (action != callback.action) {
                continue;
            }

            // if this is a keypress event and the meta key and control key
            // are not pressed that means that we need to only look at the
            // character, otherwise check the modifiers as well
            //
            // chrome will not fire a keypress if meta or control is down
            // safari will fire a keypress if meta or meta+shift is down
            // firefox will fire a keypress if meta or control is down
            if ((action == 'keypress' && !e.metaKey && !e.ctrlKey) || _modifiersMatch(modifiers, callback.modifiers)) {

                // remove is used so if you change your mind and call bind a
                // second time with a new function the first one is overwritten
                if (remove && callback.combo == combination) {
                    _callbacks[character].splice(i, 1);
                }

                matches.push(callback);
            }
        }

        return matches;
    }

    /**
     * takes a key event and figures out what the modifiers are
     *
     * @param {Event} e
     * @returns {Array}
     */
    function _eventModifiers(e) {
        var modifiers = [];

        if (e.shiftKey) {
            modifiers.push('shift');
        }

        if (e.altKey) {
            modifiers.push('alt');
        }

        if (e.ctrlKey) {
            modifiers.push('ctrl');
        }

        if (e.metaKey) {
            modifiers.push('meta');
        }

        return modifiers;
    }

    /**
     * actually calls the callback function
     *
     * if your callback function returns false this will use the jquery
     * convention - prevent default and stop propogation on the event
     *
     * @param {Function} callback
     * @param {Event} e
     * @returns void
     */
    function _fireCallback(callback, e) {
        if (callback(e) === false) {
            if (e.preventDefault) {
                e.preventDefault();
            }

            if (e.stopPropagation) {
                e.stopPropagation();
            }

            e.returnValue = false;
            e.cancelBubble = true;
        }
    }

    /**
     * handles a character key event
     *
     * @param {string} character
     * @param {Event} e
     * @returns void
     */
    function _handleCharacter(character, e) {

        // if this event should not happen stop here
        if (Mousetrap.stopCallback(e, e.target || e.srcElement)) {
            return;
        }

        var callbacks = _getMatches(character, _eventModifiers(e), e),
            i,
            do_not_reset = {},
            processed_sequence_callback = false;

        // loop through matching callbacks for this key event
        for (i = 0; i < callbacks.length; ++i) {

            // fire for all sequence callbacks
            // this is because if for example you have multiple sequences
            // bound such as "g i" and "g t" they both need to fire the
            // callback for matching g cause otherwise you can only ever
            // match the first one
            if (callbacks[i].seq) {
                processed_sequence_callback = true;

                // keep a list of which sequences were matches for later
                do_not_reset[callbacks[i].seq] = 1;
                _fireCallback(callbacks[i].callback, e);
                continue;
            }

            // if there were no sequence matches but we are still here
            // that means this is a regular match so we should fire that
            if (!processed_sequence_callback && !_inside_sequence) {
                _fireCallback(callbacks[i].callback, e);
            }
        }

        // if you are inside of a sequence and the key you are pressing
        // is not a modifier key then we should reset all sequences
        // that were not matched by this key event
        if (e.type == _inside_sequence && !_isModifier(character)) {
            _resetSequences(do_not_reset);
        }
    }

    /**
     * handles a keydown event
     *
     * @param {Event} e
     * @returns void
     */
    function _handleKey(e) {

        // normalize e.which for key events
        // @see http://stackoverflow.com/questions/4285627/javascript-keycode-vs-charcode-utter-confusion
        e.which = typeof e.which == "number" ? e.which : e.keyCode;

        var character = _characterFromEvent(e);

        // no character found then stop
        if (!character) {
            return;
        }

        if (e.type == 'keyup' && _ignore_next_keyup == character) {
            _ignore_next_keyup = false;
            return;
        }

        _handleCharacter(character, e);
    }

    /**
     * determines if the keycode specified is a modifier key or not
     *
     * @param {string} key
     * @returns {boolean}
     */
    function _isModifier(key) {
        return key == 'shift' || key == 'ctrl' || key == 'alt' || key == 'meta';
    }

    /**
     * called to set a 1 second timeout on the specified sequence
     *
     * this is so after each key press in the sequence you have 1 second
     * to press the next key before you have to start over
     *
     * @returns void
     */
    function _resetSequenceTimer() {
        clearTimeout(_reset_timer);
        _reset_timer = setTimeout(_resetSequences, 1000);
    }

    /**
     * reverses the map lookup so that we can look for specific keys
     * to see what can and can't use keypress
     *
     * @return {Object}
     */
    function _getReverseMap() {
        if (!_REVERSE_MAP) {
            _REVERSE_MAP = {};
            for (var key in _MAP) {

                // pull out the numeric keypad from here cause keypress should
                // be able to detect the keys from the character
                if (key > 95 && key < 112) {
                    continue;
                }

                if (_MAP.hasOwnProperty(key)) {
                    _REVERSE_MAP[_MAP[key]] = key;
                }
            }
        }
        return _REVERSE_MAP;
    }

    /**
     * picks the best action based on the key combination
     *
     * @param {string} key - character for key
     * @param {Array} modifiers
     * @param {string=} action passed in
     */
    function _pickBestAction(key, modifiers, action) {

        // if no action was picked in we should try to pick the one
        // that we think would work best for this key
        if (!action) {
            action = _getReverseMap()[key] ? 'keydown' : 'keypress';
        }

        // modifier keys don't work as expected with keypress,
        // switch to keydown
        if (action == 'keypress' && modifiers.length) {
            action = 'keydown';
        }

        return action;
    }

    /**
     * binds a key sequence to an event
     *
     * @param {string} combo - combo specified in bind call
     * @param {Array} keys
     * @param {Function} callback
     * @param {string=} action
     * @returns void
     */
    function _bindSequence(combo, keys, callback, action) {

        // start off by adding a sequence level record for this combination
        // and setting the level to 0
        _sequence_levels[combo] = 0;

        // if there is no action pick the best one for the first key
        // in the sequence
        if (!action) {
            action = _pickBestAction(keys[0], []);
        }

        /**
         * callback to increase the sequence level for this sequence and reset
         * all other sequences that were active
         *
         * @param {Event} e
         * @returns void
         */
        var _increaseSequence = function(e) {
                _inside_sequence = action;
                ++_sequence_levels[combo];
                _resetSequenceTimer();
            },

            /**
             * wraps the specified callback inside of another function in order
             * to reset all sequence counters as soon as this sequence is done
             *
             * @param {Event} e
             * @returns void
             */
            _callbackAndReset = function(e) {
                _fireCallback(callback, e);

                // we should ignore the next key up if the action is key down
                // or keypress.  this is so if you finish a sequence and
                // release the key the final key will not trigger a keyup
                if (action !== 'keyup') {
                    _ignore_next_keyup = _characterFromEvent(e);
                }

                // weird race condition if a sequence ends with the key
                // another sequence begins with
                setTimeout(_resetSequences, 10);
            },
            i;

        // loop through keys one at a time and bind the appropriate callback
        // function.  for any key leading up to the final one it should
        // increase the sequence. after the final, it should reset all sequences
        for (i = 0; i < keys.length; ++i) {
            _bindSingle(keys[i], i < keys.length - 1 ? _increaseSequence : _callbackAndReset, action, combo, i);
        }
    }

    /**
     * binds a single keyboard combination
     *
     * @param {string} combination
     * @param {Function} callback
     * @param {string=} action
     * @param {string=} sequence_name - name of sequence if part of sequence
     * @param {number=} level - what part of the sequence the command is
     * @returns void
     */
    function _bindSingle(combination, callback, action, sequence_name, level) {

        // make sure multiple spaces in a row become a single space
        combination = combination.replace(/\s+/g, ' ');

        var sequence = combination.split(' '),
            i,
            key,
            keys,
            modifiers = [];

        // if this pattern is a sequence of keys then run through this method
        // to reprocess each pattern one key at a time
        if (sequence.length > 1) {
            _bindSequence(combination, sequence, callback, action);
            return;
        }

        // take the keys from this pattern and figure out what the actual
        // pattern is all about
        keys = combination === '+' ? ['+'] : combination.split('+');

        for (i = 0; i < keys.length; ++i) {
            key = keys[i];

            // normalize key names
            if (_SPECIAL_ALIASES[key]) {
                key = _SPECIAL_ALIASES[key];
            }

            // if this is not a keypress event then we should
            // be smart about using shift keys
            // this will only work for US keyboards however
            if (action && action != 'keypress' && _SHIFT_MAP[key]) {
                key = _SHIFT_MAP[key];
                modifiers.push('shift');
            }

            // if this key is a modifier then add it to the list of modifiers
            if (_isModifier(key)) {
                modifiers.push(key);
            }
        }

        // depending on what the key combination is
        // we will try to pick the best event for it
        action = _pickBestAction(key, modifiers, action);

        // make sure to initialize array if this is the first time
        // a callback is added for this key
        if (!_callbacks[key]) {
            _callbacks[key] = [];
        }

        // remove an existing match if there is one
        _getMatches(key, modifiers, {type: action}, !sequence_name, combination);

        // add this call back to the array
        // if it is a sequence put it at the beginning
        // if not put it at the end
        //
        // this is important because the way these are processed expects
        // the sequence ones to come first
        _callbacks[key][sequence_name ? 'unshift' : 'push']({
            callback: callback,
            modifiers: modifiers,
            action: action,
            seq: sequence_name,
            level: level,
            combo: combination
        });
    }

    /**
     * binds multiple combinations to the same callback
     *
     * @param {Array} combinations
     * @param {Function} callback
     * @param {string|undefined} action
     * @returns void
     */
    function _bindMultiple(combinations, callback, action) {
        for (var i = 0; i < combinations.length; ++i) {
            _bindSingle(combinations[i], callback, action);
        }
    }

    // start!
    _addEvent(document, 'keypress', _handleKey);
    _addEvent(document, 'keydown', _handleKey);
    _addEvent(document, 'keyup', _handleKey);

    var Mousetrap = {

        /**
         * binds an event to mousetrap
         *
         * can be a single key, a combination of keys separated with +,
         * an array of keys, or a sequence of keys separated by spaces
         *
         * be sure to list the modifier keys first to make sure that the
         * correct key ends up getting bound (the last key in the pattern)
         *
         * @param {string|Array} keys
         * @param {Function} callback
         * @param {string=} action - 'keypress', 'keydown', or 'keyup'
         * @returns void
         */
        bind: function(keys, callback, action) {
            _bindMultiple(keys instanceof Array ? keys : [keys], callback, action);
            _direct_map[keys + ':' + action] = callback;
            return this;
        },

        /**
         * unbinds an event to mousetrap
         *
         * the unbinding sets the callback function of the specified key combo
         * to an empty function and deletes the corresponding key in the
         * _direct_map dict.
         *
         * the keycombo+action has to be exactly the same as
         * it was defined in the bind method
         *
         * TODO: actually remove this from the _callbacks dictionary instead
         * of binding an empty function
         *
         * @param {string|Array} keys
         * @param {string} action
         * @returns void
         */
        unbind: function(keys, action) {
            if (_direct_map[keys + ':' + action]) {
                delete _direct_map[keys + ':' + action];
                this.bind(keys, function() {}, action);
            }
            return this;
        },

        /**
         * triggers an event that has already been bound
         *
         * @param {string} keys
         * @param {string=} action
         * @returns void
         */
        trigger: function(keys, action) {
            _direct_map[keys + ':' + action]();
            return this;
        },

        /**
         * resets the library back to its initial state.  this is useful
         * if you want to clear out the current keyboard shortcuts and bind
         * new ones - for example if you switch to another page
         *
         * @returns void
         */
        reset: function() {
            _callbacks = {};
            _direct_map = {};
            return this;
        },

       /**
        * should we stop this event before firing off callbacks
        *
        * @param {Event} e
        * @param {Element} element
        * @return {boolean}
        */
        stopCallback: function(e, element) {

            // if the element has the class "mousetrap" then no need to stop
            if ((' ' + element.className + ' ').indexOf(' mousetrap ') > -1) {
                return false;
            }

            // stop for input, select, and textarea
            return element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA' || (element.contentEditable && element.contentEditable == 'true');
        }
    };

    // expose mousetrap to the global object
    window.Mousetrap = Mousetrap;

    // expose mousetrap as an AMD module
    if (typeof define == 'function' && define.amd) {
        define('mousetrap', function() { return Mousetrap; });
    }
    // browserify support
    if(typeof module === 'object' && module.exports) {
        module.exports = Mousetrap;
    }
}) ();

},{}],16:[function(require,module,exports){
// stats.js - http://github.com/mrdoob/stats.js
(function(f,e){"object"===typeof exports&&"undefined"!==typeof module?module.exports=e():"function"===typeof define&&define.amd?define(e):f.Stats=e()})(this,function(){var f=function(){function e(a){c.appendChild(a.dom);return a}function u(a){for(var d=0;d<c.children.length;d++)c.children[d].style.display=d===a?"block":"none";l=a}var l=0,c=document.createElement("div");c.style.cssText="position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000";c.addEventListener("click",function(a){a.preventDefault();
u(++l%c.children.length)},!1);var k=(performance||Date).now(),g=k,a=0,r=e(new f.Panel("FPS","#0ff","#002")),h=e(new f.Panel("MS","#0f0","#020"));if(self.performance&&self.performance.memory)var t=e(new f.Panel("MB","#f08","#201"));u(0);return{REVISION:16,dom:c,addPanel:e,showPanel:u,begin:function(){k=(performance||Date).now()},end:function(){a++;var c=(performance||Date).now();h.update(c-k,200);if(c>g+1E3&&(r.update(1E3*a/(c-g),100),g=c,a=0,t)){var d=performance.memory;t.update(d.usedJSHeapSize/
1048576,d.jsHeapSizeLimit/1048576)}return c},update:function(){k=this.end()},domElement:c,setMode:u}};f.Panel=function(e,f,l){var c=Infinity,k=0,g=Math.round,a=g(window.devicePixelRatio||1),r=80*a,h=48*a,t=3*a,v=2*a,d=3*a,m=15*a,n=74*a,p=30*a,q=document.createElement("canvas");q.width=r;q.height=h;q.style.cssText="width:80px;height:48px";var b=q.getContext("2d");b.font="bold "+9*a+"px Helvetica,Arial,sans-serif";b.textBaseline="top";b.fillStyle=l;b.fillRect(0,0,r,h);b.fillStyle=f;b.fillText(e,t,v);
b.fillRect(d,m,n,p);b.fillStyle=l;b.globalAlpha=.9;b.fillRect(d,m,n,p);return{dom:q,update:function(h,w){c=Math.min(c,h);k=Math.max(k,h);b.fillStyle=l;b.globalAlpha=1;b.fillRect(0,0,r,m);b.fillStyle=f;b.fillText(g(h)+" "+e+" ("+g(c)+"-"+g(k)+")",t,v);b.drawImage(q,d+a,m,n-a,p,d,m,n-a,p);b.fillRect(d+n-a,m,a,p);b.fillStyle=l;b.globalAlpha=.9;b.fillRect(d+n-a,m,a,g((1-h/w)*p))}}};return f});

},{}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9saWIvYW5pbWF0ZWRTcHJpdGUuanMiLCJqcy9saWIvY2FudmFzUmVuZGVyaW5nQ29udGV4dDJERXh0ZW5zaW9ucy5qcyIsImpzL2xpYi9leHRlbmRlcnMuanMiLCJqcy9saWIvZ2FtZS5qcyIsImpzL2xpYi9nYW1lSHVkLmpzIiwianMvbGliL2d1aWQuanMiLCJqcy9saWIvaXNNb2JpbGVEZXZpY2UuanMiLCJqcy9saWIvbW9uc3Rlci5qcyIsImpzL2xpYi9wbGF5ZXIuanMiLCJqcy9saWIvcGx1Z2lucy5qcyIsImpzL2xpYi9zcHJpdGUuanMiLCJqcy9saWIvc3ByaXRlQXJyYXkuanMiLCJqcy9tYWluLmpzIiwianMvc3ByaXRlSW5mby5qcyIsIm5vZGVfbW9kdWxlcy9ici1tb3VzZXRyYXAvbW91c2V0cmFwLmpzIiwibm9kZV9tb2R1bGVzL3N0YXRzLmpzL2J1aWxkL3N0YXRzLm1pbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1bkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL3lCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgU3ByaXRlID0gcmVxdWlyZSgnLi9zcHJpdGUnKTtcclxuXHJcbihmdW5jdGlvbihnbG9iYWwpIHtcclxuXHRmdW5jdGlvbiBBbmltYXRlZFNwcml0ZShkYXRhKSB7XHJcblx0XHR2YXIgdGhhdCA9IG5ldyBTcHJpdGUoZGF0YSk7XHJcblx0XHR2YXIgc3VwZXJfZHJhdyA9IHRoYXQuc3VwZXJpb3IoJ2RyYXcnKTtcclxuXHRcdHZhciBjdXJyZW50RnJhbWUgPSAwO1xyXG5cdFx0dmFyIHN0YXJ0ZWQgPSBmYWxzZTtcclxuXHJcblx0XHR0aGF0LmRyYXcgPSBmdW5jdGlvbihkQ29udGV4dCkge1xyXG5cdFx0XHR2YXIgc3ByaXRlUGFydFRvVXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdGlmICghc3RhcnRlZCkge1xyXG5cdFx0XHRcdFx0c3RhcnRlZCA9IHRydWU7XHJcblx0XHRcdFx0XHRzdGFydEFuaW1hdGlvbigpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LmtleXMoZGF0YS5wYXJ0cylbY3VycmVudEZyYW1lXTtcclxuXHRcdFx0fTtcclxuXHRcdFx0cmV0dXJuIHN1cGVyX2RyYXcoZENvbnRleHQsIHNwcml0ZVBhcnRUb1VzZSgpKTtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gc3RhcnRBbmltYXRpb24oKSB7XHJcblx0XHRcdGN1cnJlbnRGcmFtZSArPSAxO1xyXG5cdFx0XHRpZiAoY3VycmVudEZyYW1lIDwgT2JqZWN0LmtleXMoZGF0YS5wYXJ0cykubGVuZ3RoKSB7XHJcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7IFxyXG5cdFx0XHRcdFx0c3RhcnRBbmltYXRpb24oKTtcclxuXHRcdFx0XHR9LCAzMDApO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdGN1cnJlbnRGcmFtZSA9IDA7XHJcblx0XHRcdFx0c3RhcnRlZCA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5zdGFydEFuaW1hdGlvbiA9IHN0YXJ0QW5pbWF0aW9uO1xyXG5cclxuXHRcdHJldHVybiB0aGF0O1xyXG5cdH1cclxuXHJcblx0Z2xvYmFsLmFuaW1hdGVkU3ByaXRlID0gQW5pbWF0ZWRTcHJpdGU7XHJcbn0pKCB0aGlzICk7XHJcblxyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSB0aGlzLmFuaW1hdGVkU3ByaXRlO1xyXG59IiwiQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5zdG9yZUxvYWRlZEltYWdlID0gZnVuY3Rpb24gKGtleSwgaW1hZ2UpIHtcclxuXHRpZiAoIXRoaXMuaW1hZ2VzKSB7XHJcblx0XHR0aGlzLmltYWdlcyA9IHt9O1xyXG5cdH1cclxuXHJcblx0dGhpcy5pbWFnZXNba2V5XSA9IGltYWdlO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRMb2FkZWRJbWFnZSA9IGZ1bmN0aW9uIChrZXkpIHtcclxuXHRpZiAodGhpcy5pbWFnZXNba2V5XSkge1xyXG5cdFx0cmV0dXJuIHRoaXMuaW1hZ2VzW2tleV07XHJcblx0fVxyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5mb2xsb3dTcHJpdGUgPSBmdW5jdGlvbiAoc3ByaXRlKSB7XHJcblx0dGhpcy5jZW50cmFsU3ByaXRlID0gc3ByaXRlO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRDZW50cmFsUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcblx0aWYgKCF0aGlzLmNlbnRyYWxPZmZzZXRYKSB0aGlzLmNlbnRyYWxPZmZzZXRYID0gMDtcclxuXHRpZiAoIXRoaXMuY2VudHJhbE9mZnNldFkpIHRoaXMuY2VudHJhbE9mZnNldFkgPSAwO1xyXG5cclxuXHRsZXQgcG9zaXRpb24gPSB7XHJcblx0XHRtYXA6IHRoaXMuY2VudHJhbFNwcml0ZS5tYXBQb3NpdGlvbixcclxuXHRcdGNhbnZhczogWyBNYXRoLnJvdW5kKHRoaXMuY2FudmFzLndpZHRoICogMC41KSArIHRoaXMuY2VudHJhbE9mZnNldFgsXHJcblx0XHRcdCAgICAgIE1hdGgucm91bmQodGhpcy5jYW52YXMuaGVpZ2h0ICogMC4zMykgKyB0aGlzLmNlbnRyYWxPZmZzZXRZLCAwXVxyXG5cdH07XHJcblxyXG5cdHJldHVybiBwb3NpdGlvbjtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuc2V0Q2VudHJhbFBvc2l0aW9uT2Zmc2V0ID0gZnVuY3Rpb24gKG9mZnNldFgsIG9mZnNldFkpIHtcclxuXHR0aGlzLmNlbnRyYWxPZmZzZXRYID0gb2Zmc2V0WDtcclxuXHR0aGlzLmNlbnRyYWxPZmZzZXRZID0gb2Zmc2V0WTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUubWFwUG9zaXRpb25Ub0NhbnZhc1Bvc2l0aW9uID0gZnVuY3Rpb24gKHBvc2l0aW9uKSB7XHJcblx0dmFyIGNlbnRyYWwgPSB0aGlzLmdldENlbnRyYWxQb3NpdGlvbigpO1xyXG5cdHZhciBjZW50cmFsTWFwUG9zaXRpb24gPSBjZW50cmFsLm1hcDtcclxuXHR2YXIgY2VudHJhbENhbnZhc1Bvc2l0aW9uID0gY2VudHJhbC5jYW52YXM7XHJcblx0dmFyIG1hcERpZmZlcmVuY2VYID0gY2VudHJhbE1hcFBvc2l0aW9uWzBdIC0gcG9zaXRpb25bMF07XHJcblx0dmFyIG1hcERpZmZlcmVuY2VZID0gY2VudHJhbE1hcFBvc2l0aW9uWzFdIC0gcG9zaXRpb25bMV07XHJcblx0cmV0dXJuIFsgY2VudHJhbENhbnZhc1Bvc2l0aW9uWzBdIC0gbWFwRGlmZmVyZW5jZVgsIGNlbnRyYWxDYW52YXNQb3NpdGlvblsxXSAtIG1hcERpZmZlcmVuY2VZIF07XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmNhbnZhc1Bvc2l0aW9uVG9NYXBQb3NpdGlvbiA9IGZ1bmN0aW9uIChwb3NpdGlvbikge1xyXG5cdHZhciBjZW50cmFsID0gdGhpcy5nZXRDZW50cmFsUG9zaXRpb24oKTtcclxuXHR2YXIgY2VudHJhbE1hcFBvc2l0aW9uID0gY2VudHJhbC5tYXA7XHJcblx0dmFyIGNlbnRyYWxDYW52YXNQb3NpdGlvbiA9IGNlbnRyYWwuY2FudmFzO1xyXG5cdHZhciBtYXBEaWZmZXJlbmNlWCA9IGNlbnRyYWxDYW52YXNQb3NpdGlvblswXSAtIHBvc2l0aW9uWzBdO1xyXG5cdHZhciBtYXBEaWZmZXJlbmNlWSA9IGNlbnRyYWxDYW52YXNQb3NpdGlvblsxXSAtIHBvc2l0aW9uWzFdO1xyXG5cdHJldHVybiBbIGNlbnRyYWxNYXBQb3NpdGlvblswXSAtIG1hcERpZmZlcmVuY2VYLCBjZW50cmFsTWFwUG9zaXRpb25bMV0gLSBtYXBEaWZmZXJlbmNlWSBdO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRDZW50cmVPZlZpZXdwb3J0ID0gZnVuY3Rpb24gKCkge1xyXG5cdHJldHVybiAodGhpcy5jYW52YXMud2lkdGggLyAyKS5mbG9vcigpO1xyXG59O1xyXG5cclxuLy8gWS1wb3MgY2FudmFzIGZ1bmN0aW9uc1xyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmdldE1pZGRsZU9mVmlld3BvcnQgPSBmdW5jdGlvbiAoKSB7XHJcblx0cmV0dXJuICh0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKS5mbG9vcigpO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRCZWxvd1ZpZXdwb3J0ID0gZnVuY3Rpb24gKCkge1xyXG5cdHJldHVybiB0aGlzLmNhbnZhcy5oZWlnaHQuZmxvb3IoKTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0TWFwQmVsb3dWaWV3cG9ydCA9IGZ1bmN0aW9uICgpIHtcclxuXHR2YXIgYmVsb3cgPSB0aGlzLmdldEJlbG93Vmlld3BvcnQoKTtcclxuXHRyZXR1cm4gdGhpcy5jYW52YXNQb3NpdGlvblRvTWFwUG9zaXRpb24oWyAwLCBiZWxvdyBdKVsxXTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0UmFuZG9tbHlJblRoZUNlbnRyZU9mQ2FudmFzID0gZnVuY3Rpb24gKGJ1ZmZlcikge1xyXG5cdHZhciBtaW4gPSAwO1xyXG5cdHZhciBtYXggPSB0aGlzLmNhbnZhcy53aWR0aDtcclxuXHJcblx0aWYgKGJ1ZmZlcikge1xyXG5cdFx0bWluIC09IGJ1ZmZlcjtcclxuXHRcdG1heCArPSBidWZmZXI7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gTnVtYmVyLnJhbmRvbShtaW4sIG1heCk7XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmdldFJhbmRvbWx5SW5UaGVDZW50cmVPZk1hcCA9IGZ1bmN0aW9uIChidWZmZXIpIHtcclxuXHR2YXIgcmFuZG9tID0gdGhpcy5nZXRSYW5kb21seUluVGhlQ2VudHJlT2ZDYW52YXMoYnVmZmVyKTtcclxuXHRyZXR1cm4gdGhpcy5jYW52YXNQb3NpdGlvblRvTWFwUG9zaXRpb24oWyByYW5kb20sIDAgXSlbMF07XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmdldFJhbmRvbU1hcFBvc2l0aW9uQmVsb3dWaWV3cG9ydCA9IGZ1bmN0aW9uICgpIHtcclxuXHR2YXIgeENhbnZhcyA9IHRoaXMuZ2V0UmFuZG9tbHlJblRoZUNlbnRyZU9mQ2FudmFzKCk7XHJcblx0dmFyIHlDYW52YXMgPSB0aGlzLmdldEJlbG93Vmlld3BvcnQoKTtcclxuXHRyZXR1cm4gdGhpcy5jYW52YXNQb3NpdGlvblRvTWFwUG9zaXRpb24oWyB4Q2FudmFzLCB5Q2FudmFzIF0pO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRSYW5kb21NYXBQb3NpdGlvbkFib3ZlVmlld3BvcnQgPSBmdW5jdGlvbiAoKSB7XHJcblx0dmFyIHhDYW52YXMgPSB0aGlzLmdldFJhbmRvbWx5SW5UaGVDZW50cmVPZkNhbnZhcygpO1xyXG5cdHZhciB5Q2FudmFzID0gdGhpcy5nZXRBYm92ZVZpZXdwb3J0KCk7XHJcblx0cmV0dXJuIHRoaXMuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFsgeENhbnZhcywgeUNhbnZhcyBdKTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0VG9wT2ZWaWV3cG9ydCA9IGZ1bmN0aW9uICgpIHtcclxuXHRyZXR1cm4gdGhpcy5jYW52YXNQb3NpdGlvblRvTWFwUG9zaXRpb24oWyAwLCAwIF0pWzFdO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRBYm92ZVZpZXdwb3J0ID0gZnVuY3Rpb24gKCkge1xyXG5cdHJldHVybiAwIC0gKHRoaXMuY2FudmFzLmhlaWdodCAvIDQpLmZsb29yKCk7XHJcbn07IiwiLy8gRXh0ZW5kcyBmdW5jdGlvbiBzbyB0aGF0IG5ldy1hYmxlIG9iamVjdHMgY2FuIGJlIGdpdmVuIG5ldyBtZXRob2RzIGVhc2lseVxyXG5GdW5jdGlvbi5wcm90b3R5cGUubWV0aG9kID0gZnVuY3Rpb24gKG5hbWUsIGZ1bmMpIHtcclxuICAgIHRoaXMucHJvdG90eXBlW25hbWVdID0gZnVuYztcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLy8gV2lsbCByZXR1cm4gdGhlIG9yaWdpbmFsIG1ldGhvZCBvZiBhbiBvYmplY3Qgd2hlbiBpbmhlcml0aW5nIGZyb20gYW5vdGhlclxyXG5PYmplY3QubWV0aG9kKCdzdXBlcmlvcicsIGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB2YXIgbWV0aG9kID0gdGhhdFtuYW1lXTtcclxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gbWV0aG9kLmFwcGx5KHRoYXQsIGFyZ3VtZW50cyk7XHJcbiAgICB9O1xyXG59KTsiLCJ2YXIgU3ByaXRlQXJyYXkgPSByZXF1aXJlKCcuL3Nwcml0ZUFycmF5Jyk7XHJcbnZhciBTdGF0cyA9IHJlcXVpcmUoJ3N0YXRzLmpzJyk7XHJcblxyXG5pZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRuYXZpZ2F0b3IudmlicmF0ZSA9IG5hdmlnYXRvci52aWJyYXRlIHx8XHJcblx0XHRuYXZpZ2F0b3Iud2Via2l0VmlicmF0ZSB8fFxyXG5cdFx0bmF2aWdhdG9yLm1velZpYnJhdGUgfHxcclxuXHRcdG5hdmlnYXRvci5tc1ZpYnJhdGU7XHJcbn0gZWxzZSB7XHJcblx0bmF2aWdhdG9yID0ge1xyXG5cdFx0dmlicmF0ZTogZmFsc2VcclxuXHR9O1xyXG59XHJcblxyXG4oZnVuY3Rpb24gKGdsb2JhbCkge1xyXG5cdGZ1bmN0aW9uIEdhbWUgKG1haW5DYW52YXMsIHBsYXllcikge1xyXG5cdFx0dmFyIHN0YXRpY09iamVjdHMgPSBuZXcgU3ByaXRlQXJyYXkoKTtcclxuXHRcdHZhciBtb3ZpbmdPYmplY3RzID0gbmV3IFNwcml0ZUFycmF5KCk7XHJcblx0XHR2YXIgdWlFbGVtZW50cyA9IG5ldyBTcHJpdGVBcnJheSgpO1xyXG5cdFx0dmFyIGRDb250ZXh0ID0gbWFpbkNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cdFx0dmFyIHNob3dIaXRCb3hlcyA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIFNjcm9sbGluZyBiYWNrZ3JvdW5kXHJcblx0XHR2YXIgYmFja2dyb3VuZEltYWdlID0gZENvbnRleHQuZ2V0TG9hZGVkSW1hZ2UoJ2Fzc2V0cy9iYWNrZ3JvdW5kLmpwZycpO1xyXG5cdFx0dmFyIGJhY2tncm91bmRYID0gMDtcclxuXHRcdHZhciBiYWNrZ3JvdW5kWSA9IDA7XHJcblxyXG5cdFx0dmFyIG1vdXNlWCA9IGRDb250ZXh0LmdldENlbnRyZU9mVmlld3BvcnQoKTtcclxuXHRcdHZhciBtb3VzZVkgPSAwO1xyXG5cdFx0dmFyIHBhdXNlZCA9IGZhbHNlO1xyXG5cdFx0dmFyIGdhbWVFbmRpbmcgPSBmYWxzZTtcclxuXHRcdHZhciB0aGF0ID0gdGhpcztcclxuXHRcdHZhciBiZWZvcmVDeWNsZUNhbGxiYWNrcyA9IFtdO1xyXG5cdFx0dmFyIGFmdGVyQ3ljbGVDYWxsYmFja3MgPSBbXTtcclxuXHRcdHZhciBnYW1lTG9vcCA9IG5ldyBFdmVudGVkTG9vcCgpO1xyXG5cclxuXHRcdHRoaXMudG9nZ2xlSGl0Qm94ZXMgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0c2hvd0hpdEJveGVzID0gIXNob3dIaXRCb3hlcztcclxuXHRcdFx0c3RhdGljT2JqZWN0cy5lYWNoKGZ1bmN0aW9uIChzcHJpdGUpIHtcclxuXHRcdFx0XHRzcHJpdGUuc2V0SGl0Qm94ZXNWaXNpYmxlKHNob3dIaXRCb3hlcyk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmFkZFN0YXRpY09iamVjdCA9IGZ1bmN0aW9uIChzcHJpdGUpIHtcclxuXHRcdFx0c3ByaXRlLnNldEhpdEJveGVzVmlzaWJsZShzaG93SGl0Qm94ZXMpO1xyXG5cdFx0XHRzdGF0aWNPYmplY3RzLnB1c2goc3ByaXRlKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5hZGRTdGF0aWNPYmplY3RzID0gZnVuY3Rpb24gKHNwcml0ZXMpIHtcclxuXHRcdFx0c3ByaXRlcy5mb3JFYWNoKHRoaXMuYWRkU3RhdGljT2JqZWN0LmJpbmQodGhpcykpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmFkZE1vdmluZ09iamVjdCA9IGZ1bmN0aW9uIChtb3ZpbmdPYmplY3QsIG1vdmluZ09iamVjdFR5cGUpIHtcclxuXHRcdFx0aWYgKG1vdmluZ09iamVjdFR5cGUpIHtcclxuXHRcdFx0XHRzdGF0aWNPYmplY3RzLm9uUHVzaChmdW5jdGlvbiAob2JqKSB7XHJcblx0XHRcdFx0XHRpZiAob2JqLmRhdGEgJiYgb2JqLmRhdGEuaGl0QmVoYXZpb3VyW21vdmluZ09iamVjdFR5cGVdKSB7XHJcblx0XHRcdFx0XHRcdG9iai5vbkhpdHRpbmcobW92aW5nT2JqZWN0LCBvYmouZGF0YS5oaXRCZWhhdmlvdXJbbW92aW5nT2JqZWN0VHlwZV0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sIHRydWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRtb3ZpbmdPYmplY3Quc2V0SGl0Qm94ZXNWaXNpYmxlKHNob3dIaXRCb3hlcyk7XHJcblx0XHRcdG1vdmluZ09iamVjdHMucHVzaChtb3ZpbmdPYmplY3QpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmFkZFVJRWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XHJcblx0XHRcdHVpRWxlbWVudHMucHVzaChlbGVtZW50KTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5iZWZvcmVDeWNsZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG5cdFx0XHRiZWZvcmVDeWNsZUNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5hZnRlckN5Y2xlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcblx0XHRcdGFmdGVyQ3ljbGVDYWxsYmFja3MucHVzaChjYWxsYmFjayk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0TW91c2VYID0gZnVuY3Rpb24gKHgpIHtcclxuXHRcdFx0bW91c2VYID0geDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXRNb3VzZVkgPSBmdW5jdGlvbiAoeSkge1xyXG5cdFx0XHRtb3VzZVkgPSB5O1xyXG5cdFx0fTtcclxuXHJcblx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb24oMCwgMCk7XHJcblx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb25UYXJnZXQoMCwgLTEwKTtcclxuXHRcdGRDb250ZXh0LmZvbGxvd1Nwcml0ZShwbGF5ZXIpO1xyXG5cclxuXHRcdHRoaXMuY3ljbGUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGJlZm9yZUN5Y2xlQ2FsbGJhY2tzLmVhY2goZnVuY3Rpb24oYykge1xyXG5cdFx0XHRcdGMoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDbGVhciBjYW52YXNcclxuXHRcdFx0dmFyIG1vdXNlTWFwUG9zaXRpb24gPSBkQ29udGV4dC5jYW52YXNQb3NpdGlvblRvTWFwUG9zaXRpb24oW21vdXNlWCwgbW91c2VZXSk7XHJcblxyXG5cdFx0XHRpZiAoIXBsYXllci5pc0p1bXBpbmcpIHtcclxuXHRcdFx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb25UYXJnZXQobW91c2VNYXBQb3NpdGlvblswXSwgbW91c2VNYXBQb3NpdGlvblsxXSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHBsYXllci5jeWNsZSgpO1xyXG5cclxuXHRcdFx0bW92aW5nT2JqZWN0cy5jdWxsKCk7XHJcblx0XHRcdG1vdmluZ09iamVjdHMuZWFjaChmdW5jdGlvbiAobW92aW5nT2JqZWN0LCBpKSB7XHJcblx0XHRcdFx0bW92aW5nT2JqZWN0LmN5Y2xlKGRDb250ZXh0KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0XHRzdGF0aWNPYmplY3RzLmN1bGwoKTtcclxuXHRcdFx0c3RhdGljT2JqZWN0cy5lYWNoKGZ1bmN0aW9uIChzdGF0aWNPYmplY3QsIGkpIHtcclxuXHRcdFx0XHRpZiAoc3RhdGljT2JqZWN0LmN5Y2xlKSB7XHJcblx0XHRcdFx0XHRzdGF0aWNPYmplY3QuY3ljbGUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gUmVtb3ZlIGl0ZW1cclxuXHRcdFx0XHRpZiAoc3RhdGljT2JqZWN0LmdldENhbnZhc1Bvc2l0aW9uWSgpIDwgLTEwMClcclxuXHRcdFx0XHRcdHN0YXRpY09iamVjdC5kZWxldGVPbk5leHRDeWNsZSgpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHVpRWxlbWVudHMuZWFjaChmdW5jdGlvbiAodWlFbGVtZW50LCBpKSB7XHJcblx0XHRcdFx0aWYgKHVpRWxlbWVudC5jeWNsZSkge1xyXG5cdFx0XHRcdFx0dWlFbGVtZW50LmN5Y2xlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGlzU2hha2luZyA9IG1vdmluZ09iamVjdHMuc29tZShpdGVtID0+IGl0ZW0uZGF0YS5uYW1lID09ICdtb25zdGVyJyAmJiAhaXRlbS5pc0Z1bGwgJiYgIWl0ZW0uaXNFYXRpbmcpO1xyXG5cclxuXHRcdFx0YWZ0ZXJDeWNsZUNhbGxiYWNrcy5lYWNoKGZ1bmN0aW9uKGMpIHtcclxuXHRcdFx0XHRjKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jdGlvbiBkcmF3QmFja2dyb3VuZCgpIHtcclxuXHRcdFx0Ly8gU3RyZXRjaCBiYWNrZ3JvdW5kIGltYWdlIHRvIGNhbnZhcyBzaXplXHJcblx0XHRcdGJhY2tncm91bmRJbWFnZS53aWR0aCA9IG1haW5DYW52YXMud2lkdGg7XHJcblx0XHRcdGJhY2tncm91bmRJbWFnZS5oZWlnaHQgPSBtYWluQ2FudmFzLmhlaWdodDtcclxuXHJcblx0XHRcdGJhY2tncm91bmRYID0gcGxheWVyLm1hcFBvc2l0aW9uWzBdICUgYmFja2dyb3VuZEltYWdlLndpZHRoICogLTE7XHJcblx0XHRcdGJhY2tncm91bmRZID0gcGxheWVyLm1hcFBvc2l0aW9uWzFdICUgYmFja2dyb3VuZEltYWdlLmhlaWdodCAqIC0xO1xyXG5cclxuXHRcdFx0Ly8gUmVkcmF3IGJhY2tncm91bmRcclxuXHRcdFx0ZENvbnRleHQuZHJhd0ltYWdlKGJhY2tncm91bmRJbWFnZSwgYmFja2dyb3VuZFgsIGJhY2tncm91bmRZLCBtYWluQ2FudmFzLndpZHRoLCBiYWNrZ3JvdW5kSW1hZ2UuaGVpZ2h0KTtcclxuXHRcdFx0ZENvbnRleHQuZHJhd0ltYWdlKGJhY2tncm91bmRJbWFnZSwgYmFja2dyb3VuZFggKyBtYWluQ2FudmFzLndpZHRoLCBiYWNrZ3JvdW5kWSwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHRcdGRDb250ZXh0LmRyYXdJbWFnZShiYWNrZ3JvdW5kSW1hZ2UsIGJhY2tncm91bmRYIC0gbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZFksIG1haW5DYW52YXMud2lkdGgsIGJhY2tncm91bmRJbWFnZS5oZWlnaHQpO1xyXG5cdFx0XHRkQ29udGV4dC5kcmF3SW1hZ2UoYmFja2dyb3VuZEltYWdlLCBiYWNrZ3JvdW5kWCwgYmFja2dyb3VuZFkgKyBtYWluQ2FudmFzLmhlaWdodCwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHRcdGRDb250ZXh0LmRyYXdJbWFnZShiYWNrZ3JvdW5kSW1hZ2UsIGJhY2tncm91bmRYICsgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZFkgKyBtYWluQ2FudmFzLmhlaWdodCwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHRcdGRDb250ZXh0LmRyYXdJbWFnZShiYWNrZ3JvdW5kSW1hZ2UsIGJhY2tncm91bmRYIC0gbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZFkgKyBtYWluQ2FudmFzLmhlaWdodCwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2hha2luZyBlZmZlY3Q6IGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzI4MDIzNjk2L2h0bWwtY2FudmFzLWFuaW1hdGlvbi13aGljaC1pbmNvcnBvcmF0ZXMtYS1zaGFraW5nLWVmZmVjdFxyXG5cdFx0dmFyIGlzU2hha2luZyA9IGZhbHNlO1xyXG5cdFx0dmFyIHNoYWtlRHVyYXRpb24gPSAyMDA7XHJcblx0XHR2YXIgc2hha2VTdGFydFRpbWUgPSAtMTtcclxuXHRcdFxyXG5cdFx0dmFyIHBsYXllclNoaWZ0ID0gMDsgLy8gRXhwZXJpbWVudGFsIHZpZXcgc2hpZnQgd2hlbiBtb25zdGVyIGFjdGl2ZVxyXG5cclxuXHRcdGZ1bmN0aW9uIHByZVNoYWtlKGN0eCkge1xyXG5cdFx0XHRpZiAoIWlzU2hha2luZykgc2hha2VTdGFydFRpbWUgPSAtMTtcclxuXHJcblx0XHRcdGlmIChzaGFrZVN0YXJ0VGltZSA9PSAtMSkgcmV0dXJuO1xyXG5cdFx0XHR2YXIgZHQgPSBEYXRlLm5vdygpIC0gc2hha2VTdGFydFRpbWU7XHJcblx0XHRcdGlmIChkdCA+IHNoYWtlRHVyYXRpb24pIHtcclxuXHRcdFx0XHRzaGFrZVN0YXJ0VGltZSA9IC0xOyBcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0dmFyIGVhc2luZ0NvZWYgPSBkdCAvIHNoYWtlRHVyYXRpb247XHJcblx0XHRcdHZhciBlYXNpbmcgPSBNYXRoLnBvdyhlYXNpbmdDb2VmIC0gMSwgMykgKyAxO1xyXG5cdFx0XHRjdHguc2F2ZSgpOyAgXHJcblx0XHRcdHZhciBkeCA9IGVhc2luZyAqIChNYXRoLmNvcyhkdCAqIDAuMSApICsgTWF0aC5jb3MoZHQgKiAwLjMxMTUpKSAqIDM7XHJcblx0XHRcdHZhciBkeSA9IGVhc2luZyAqIChNYXRoLnNpbihkdCAqIDAuMDUpICsgTWF0aC5zaW4oZHQgKiAwLjA1NzExMykpICogMztcclxuXHRcdFx0Y3R4LnRyYW5zbGF0ZShkeCwgZHkpO1xyXG5cclxuXHRcdFx0bmF2aWdhdG9yLnZpYnJhdGUoMTAwKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBwb3N0U2hha2UoY3R4KSB7XHJcblx0XHRcdGlmIChzaGFrZVN0YXJ0VGltZSA9PSAtMSkgcmV0dXJuO1xyXG5cdFx0XHRjdHgucmVzdG9yZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHN0YXJ0U2hha2UoKSB7XHJcblx0XHRcdGlmICghaXNTaGFraW5nKSByZXR1cm47XHJcblx0XHRcdHNoYWtlU3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgc3RhdHMgPSBuZXcgU3RhdHMoKTtcclxuXHRcdC8vIFN0YXRzIGZvciBwZXJmb3JtYW5jZSBkZWJ1Z2dpbmdcclxuXHRcdC8vc3RhdHMuc2hvd1BhbmVsKDApOyAvLyAwOiBmcHMsIDE6IG1zLCAyOiBtYiwgMys6IGN1c3RvbVxyXG5cdFx0Ly9kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHN0YXRzLmRvbSk7XHJcblxyXG5cdFx0dGhhdC5kcmF3ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRzdGF0cy5iZWdpbigpO1xyXG5cclxuXHRcdFx0Ly8gQ2xlYXIgY2FudmFzXHJcblx0XHRcdG1haW5DYW52YXMud2lkdGggPSBtYWluQ2FudmFzLndpZHRoO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gVXBkYXRlIHNjcm9sbGluZyBiYWNrZ3JvdW5kXHJcblx0XHRcdGRyYXdCYWNrZ3JvdW5kKCk7XHJcblx0XHRcdFxyXG5cdFx0XHRwcmVTaGFrZShkQ29udGV4dCk7XHJcblxyXG5cdFx0XHRzdGF0aWNPYmplY3RzLmVhY2goZnVuY3Rpb24gKHN0YXRpY09iamVjdCwgaSkge1xyXG5cdFx0XHRcdGlmIChzdGF0aWNPYmplY3QuaXNEcmF3blVuZGVyUGxheWVyICYmIHN0YXRpY09iamVjdC5kcmF3KSB7XHJcblx0XHRcdFx0XHRcdHN0YXRpY09iamVjdC5kcmF3KGRDb250ZXh0LCAnbWFpbicpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRwbGF5ZXIuc2V0SGl0Qm94ZXNWaXNpYmxlKHNob3dIaXRCb3hlcyk7XHJcblx0XHRcdHBsYXllci5kcmF3KGRDb250ZXh0KTtcclxuXHJcblx0XHRcdHBsYXllci5jeWNsZSgpO1xyXG5cclxuXHRcdFx0bW92aW5nT2JqZWN0cy5lYWNoKGZ1bmN0aW9uIChtb3ZpbmdPYmplY3QsIGkpIHtcclxuXHRcdFx0XHRtb3ZpbmdPYmplY3QuZHJhdyhkQ29udGV4dCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0c3RhdGljT2JqZWN0cy5lYWNoKGZ1bmN0aW9uIChzdGF0aWNPYmplY3QsIGkpIHtcclxuXHRcdFx0XHRpZiAoIXN0YXRpY09iamVjdC5pc0RyYXduVW5kZXJQbGF5ZXIgJiYgc3RhdGljT2JqZWN0LmRyYXcpIHtcclxuXHRcdFx0XHRcdHN0YXRpY09iamVjdC5kcmF3KGRDb250ZXh0LCAnbWFpbicpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0XHR1aUVsZW1lbnRzLmVhY2goZnVuY3Rpb24gKHVpRWxlbWVudCwgaSkge1xyXG5cdFx0XHRcdGlmICh1aUVsZW1lbnQuZHJhdykge1xyXG5cdFx0XHRcdFx0dWlFbGVtZW50LmRyYXcoZENvbnRleHQsICdtYWluJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHBvc3RTaGFrZShkQ29udGV4dCk7XHJcblxyXG5cdFx0XHQvLyBFeHBlcmltZW50aW5nIHdpdGggdmlldyBzaGlmdCB3aGVuIG1vbnN0ZXIgYWN0aXZlXHJcblx0XHQvKiBcdGlmIChpc1NoYWtpbmcpIHtcclxuXHRcdFx0XHRpZiAocGxheWVyU2hpZnQgPCA1MCkgcGxheWVyU2hpZnQgKz0gMjtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBUT0RPOiBFYXNlIHRoaXMgYmFjayBhZnRlciBtb25zdGVyIGZpbmlzaGVzIGVhdGluZ1xyXG5cdFx0XHRcdGlmIChwbGF5ZXJTaGlmdCA+IDApIHBsYXllclNoaWZ0IC09IDE7XHJcblx0XHRcdH1cclxuXHRcdFx0ZENvbnRleHQuc2V0Q2VudHJhbFBvc2l0aW9uT2Zmc2V0KDAsIHBsYXllclNoaWZ0KTsgKi9cclxuXHJcblx0XHRcdHN0YXRzLmVuZCgpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRnYW1lTG9vcC5zdGFydCgpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnBhdXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRwYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHRnYW1lTG9vcC5zdG9wKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZ2FtZU92ZXIgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0Z2FtZUVuZGluZyA9IHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5pc1BhdXNlZCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIHBhdXNlZDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5pc0dhbWVFbmRpbmcgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0cmV0dXJuIGdhbWVFbmRpbmc7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMucmVzZXQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHBhdXNlZCA9IGZhbHNlO1xyXG5cdFx0XHRnYW1lRW5kaW5nID0gZmFsc2U7XHJcblx0XHRcdHN0YXRpY09iamVjdHMgPSBuZXcgU3ByaXRlQXJyYXkoKTtcclxuXHRcdFx0bW92aW5nT2JqZWN0cyA9IG5ldyBTcHJpdGVBcnJheSgpO1xyXG5cdFx0XHRtb3VzZVggPSBkQ29udGV4dC5nZXRDZW50cmVPZlZpZXdwb3J0KCk7XHJcblx0XHRcdG1vdXNlWSA9IDA7XHJcblx0XHRcdHBsYXllci5yZXNldCgpO1xyXG5cdFx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb24oMCwgMCwgMCk7XHJcblx0XHRcdHRoaXMuc3RhcnQoKTtcclxuXHRcdH0uYmluZCh0aGlzKTtcclxuXHJcblx0XHRnYW1lTG9vcC5vbignMTgnLCB0aGlzLmN5Y2xlKTtcclxuXHRcdGdhbWVMb29wLm9uKCcxOCcsIHRoaXMuZHJhdyk7XHJcblxyXG5cdFx0c3RhcnRTaGFrZShtYWluQ2FudmFzKTtcclxuXHRcdHNldEludGVydmFsKHN0YXJ0U2hha2UsIDMwMCwgZENvbnRleHQpO1xyXG5cdH1cclxuXHJcblx0Z2xvYmFsLmdhbWUgPSBHYW1lO1xyXG59KSggdGhpcyApO1xyXG5cclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG5cdG1vZHVsZS5leHBvcnRzID0gdGhpcy5nYW1lO1xyXG59IiwiZnVuY3Rpb24gR2FtZUh1ZChkYXRhKSB7XHJcblx0dmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuXHR2YXIgaHVkSW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuXHRodWRJbWFnZS5zcmMgPSAnYXNzZXRzL0NhcnRXYXJzLXNtYWxsLnBuZyc7XHJcblxyXG5cdHRoYXQubGluZXMgPSBkYXRhLmluaXRpYWxMaW5lcztcclxuXHJcblx0dGhhdC50b3AgPSBkYXRhLnBvc2l0aW9uLnRvcDtcclxuXHR0aGF0LnJpZ2h0ID0gZGF0YS5wb3NpdGlvbi5yaWdodDtcclxuXHR0aGF0LmJvdHRvbSA9IGRhdGEucG9zaXRpb24uYm90dG9tO1xyXG5cdHRoYXQubGVmdCA9IGRhdGEucG9zaXRpb24ubGVmdDtcclxuXHJcblx0dGhhdC53aWR0aCA9IGRhdGEud2lkdGg7XHJcblx0dGhhdC5oZWlnaHQgPSBkYXRhLmhlaWdodDtcclxuXHJcblx0dGhhdC5zZXRMaW5lcyA9IGZ1bmN0aW9uIChsaW5lcykge1xyXG5cdFx0dGhhdC5saW5lcyA9IGxpbmVzO1xyXG5cdH07XHJcblxyXG5cdHRoYXQuZHJhdyA9IGZ1bmN0aW9uIChjdHgpIHtcclxuXHRcdGN0eC5kcmF3SW1hZ2UoaHVkSW1hZ2UsIDIwLCA1KTtcclxuXHJcblx0XHRjdHguZm9udCA9ICcxMnB4IG1vbm9zcGFjZSc7XHJcblx0XHR2YXIgeU9mZnNldCA9IDA7XHJcblx0XHR0aGF0LmxpbmVzLmVhY2goZnVuY3Rpb24gKGxpbmUpIHtcclxuXHRcdFx0dmFyIGZvbnRTaXplID0gK2N0eC5mb250LnNsaWNlKDAsIDIpO1xyXG5cdFx0XHR2YXIgdGV4dFdpZHRoID0gY3R4Lm1lYXN1cmVUZXh0KGxpbmUpLndpZHRoO1xyXG5cdFx0XHR2YXIgdGV4dEhlaWdodCA9IGZvbnRTaXplICogMS4zO1xyXG5cdFx0XHR2YXIgeFBvcywgeVBvcztcclxuXHRcdFx0aWYgKHRoYXQudG9wKSB7XHJcblx0XHRcdFx0eVBvcyA9IHRoYXQudG9wICsgeU9mZnNldDtcclxuXHRcdFx0fSBlbHNlIGlmICh0aGF0LmJvdHRvbSkge1xyXG5cdFx0XHRcdHlQb3MgPSBjdHguY2FudmFzLmhlaWdodCAtIHRoYXQudG9wIC0gdGV4dEhlaWdodCArIHlPZmZzZXQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh0aGF0LnJpZ2h0KSB7XHJcblx0XHRcdFx0eFBvcyA9IGN0eC5jYW52YXMud2lkdGggLSB0aGF0LnJpZ2h0IC0gdGV4dFdpZHRoO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHRoYXQubGVmdCkge1xyXG5cdFx0XHRcdHhQb3MgPSB0aGF0LmxlZnQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHlPZmZzZXQgKz0gdGV4dEhlaWdodDtcclxuXHRcdFx0Y3R4LmZpbGxTdHlsZSA9IFwiI0ZGRkZGRlwiO1xyXG5cdFx0XHRjdHguZmlsbFRleHQobGluZSwgeFBvcywgeVBvcyk7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHRyZXR1cm4gdGhhdDtcclxufVxyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSBHYW1lSHVkO1xyXG59XHJcbiIsIi8vIENyZWF0ZXMgYSByYW5kb20gSUQgc3RyaW5nXHJcbihmdW5jdGlvbihnbG9iYWwpIHtcclxuICAgIGZ1bmN0aW9uIGd1aWQgKClcclxuICAgIHtcclxuICAgICAgICB2YXIgUzQgPSBmdW5jdGlvbiAoKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoXHJcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yYW5kb20oKSAqIDB4MTAwMDAgLyogNjU1MzYgKi9cclxuICAgICAgICAgICAgICAgICkudG9TdHJpbmcoMTYpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICBTNCgpICsgUzQoKSArIFwiLVwiICtcclxuICAgICAgICAgICAgICAgIFM0KCkgKyBcIi1cIiArXHJcbiAgICAgICAgICAgICAgICBTNCgpICsgXCItXCIgK1xyXG4gICAgICAgICAgICAgICAgUzQoKSArIFwiLVwiICtcclxuICAgICAgICAgICAgICAgIFM0KCkgKyBTNCgpICsgUzQoKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgfVxyXG4gICAgZ2xvYmFsLmd1aWQgPSBndWlkO1xyXG59KSh0aGlzKTtcclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB0aGlzLmd1aWQ7XHJcbn0iLCJmdW5jdGlvbiBpc01vYmlsZURldmljZSgpIHtcclxuXHRpZihuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9BbmRyb2lkL2kpIHx8XHJcblx0XHRuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC93ZWJPUy9pKSB8fFxyXG5cdFx0bmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBob25lL2kpIHx8XHJcblx0XHRuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9pUGFkL2kpIHx8XHJcblx0XHRuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9pUG9kL2kpIHx8XHJcblx0XHRuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9CbGFja0JlcnJ5L2kpIHx8XHJcblx0XHRuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9XaW5kb3dzIFBob25lL2kpXHJcblx0KSB7XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGlzTW9iaWxlRGV2aWNlOyIsInZhciBTcHJpdGUgPSByZXF1aXJlKCcuL3Nwcml0ZScpO1xyXG5cclxuKGZ1bmN0aW9uKGdsb2JhbCkge1xyXG5cdGZ1bmN0aW9uIE1vbnN0ZXIoZGF0YSkge1xyXG5cdFx0dmFyIHRoYXQgPSBuZXcgU3ByaXRlKGRhdGEpO1xyXG5cdFx0dmFyIHN1cGVyX2RyYXcgPSB0aGF0LnN1cGVyaW9yKCdkcmF3Jyk7XHJcblx0XHR2YXIgc3ByaXRlVmVyc2lvbiA9IDE7XHJcblx0XHR2YXIgZWF0aW5nU3RhZ2UgPSAwO1xyXG5cdFx0Y29uc3Qgc3RhbmRhcmRTcGVlZCA9IDg7XHJcblx0XHRjb25zdCBzbG93U3BlZWQgPSA1O1xyXG5cdFx0Y29uc3QgY2hhc2luZ1NwZWVkID0gMTI7XHJcblxyXG5cdFx0dGhhdC5pc0VhdGluZyA9IGZhbHNlO1xyXG5cdFx0dGhhdC5pc0Z1bGwgPSBmYWxzZTtcclxuXHRcdHRoYXQuaXNDaGFzaW5nID0gZmFsc2U7XHJcblxyXG5cdFx0dGhhdC5yZXNldFNwZWVkID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdGlmICh0aGF0LmlzQ2hhc2luZylcclxuXHRcdFx0XHR0aGF0LnNldFNwZWVkKGNoYXNpbmdTcGVlZCk7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHR0aGF0LnNldFNwZWVkKHN0YW5kYXJkU3BlZWQpO1xyXG5cdFx0fTtcclxuXHRcdHRoYXQuc2V0U3RhbmRhcmRTcGVlZCA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0aGF0LmlzQ2hhc2luZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LnNldFNwZWVkKHN0YW5kYXJkU3BlZWQpO1xyXG5cdFx0fTtcclxuXHRcdHRoYXQuc2V0T2JzdGFjbGVIaXRTcGVlZCA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0aGF0LnNldFNwZWVkKHNsb3dTcGVlZCk7XHJcblx0XHRcdHNldFRpbWVvdXQodGhhdC5yZXNldFNwZWVkLCAzMDApO1xyXG5cdFx0fTtcclxuXHRcdHRoYXQuc3RhcnRDaGFzaW5nID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdHRoYXQuaXNDaGFzaW5nID0gdHJ1ZTtcclxuXHRcdFx0dGhhdC5zZXRTcGVlZChjaGFzaW5nU3BlZWQpO1xyXG5cdFx0XHQvLyBSZXNldCB0aGUgc3BlZWQgYWZ0ZXIgcnVzaGluZyBpblxyXG5cdFx0XHRzZXRUaW1lb3V0KHRoYXQuc2V0U3RhbmRhcmRTcGVlZCwgMjAwMCk7XHJcblx0XHR9O1xyXG5cdFx0dGhhdC5zdGFydENoYXNpbmcoKTtcclxuXHJcblx0XHR0aGF0LmRyYXcgPSBmdW5jdGlvbihkQ29udGV4dCkge1xyXG5cdFx0XHR2YXIgc3ByaXRlUGFydFRvVXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciB4RGlmZiA9IHRoYXQubW92aW5nVG93YXJkWzBdIC0gdGhhdC5jYW52YXNYO1xyXG5cclxuXHRcdFx0XHRpZiAodGhhdC5pc0VhdGluZykge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdlYXRpbmcnICsgZWF0aW5nU3RhZ2U7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAoc3ByaXRlVmVyc2lvbiArIDAuMSA+IDIpIHtcclxuXHRcdFx0XHRcdHNwcml0ZVZlcnNpb24gPSAwLjE7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHNwcml0ZVZlcnNpb24gKz0gMC4xO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoeERpZmYgPj0gMCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdzRWFzdCcgKyBNYXRoLmNlaWwoc3ByaXRlVmVyc2lvbik7XHJcblx0XHRcdFx0fSBlbHNlIGlmICh4RGlmZiA8IDApIHtcclxuXHRcdFx0XHRcdHJldHVybiAnc1dlc3QnICsgTWF0aC5jZWlsKHNwcml0ZVZlcnNpb24pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHJldHVybiBzdXBlcl9kcmF3KGRDb250ZXh0LCBzcHJpdGVQYXJ0VG9Vc2UoKSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIHN0YXJ0RWF0aW5nICh3aGVuRG9uZSkge1xyXG5cdFx0XHRlYXRpbmdTdGFnZSArPSAxO1xyXG5cdFx0XHR0aGF0LmlzRWF0aW5nID0gdHJ1ZTtcclxuXHRcdFx0dGhhdC5pc01vdmluZyA9IGZhbHNlO1xyXG5cdFx0XHRpZiAoZWF0aW5nU3RhZ2UgPCA2KSB7XHJcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRzdGFydEVhdGluZyh3aGVuRG9uZSk7XHJcblx0XHRcdFx0fSwgMzAwKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRlYXRpbmdTdGFnZSA9IDE7XHJcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRzdGFydEVhdGluZyh3aGVuRG9uZSk7XHJcblx0XHRcdFx0fSwgMzAwKTtcclxuXHRcdFx0XHQvL3RoYXQuaXNFYXRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHQvL3RoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHRcdC8vd2hlbkRvbmUoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoYXQuc3RhcnRFYXRpbmcgPSBzdGFydEVhdGluZztcclxuXHJcblx0XHRyZXR1cm4gdGhhdDtcclxuXHR9XHJcblxyXG5cdGdsb2JhbC5tb25zdGVyID0gTW9uc3RlcjtcclxufSkoIHRoaXMgKTtcclxuXHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IHRoaXMubW9uc3RlcjtcclxufSIsInZhciBTcHJpdGUgPSByZXF1aXJlKCcuL3Nwcml0ZScpO1xyXG5pZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRuYXZpZ2F0b3IudmlicmF0ZSA9IG5hdmlnYXRvci52aWJyYXRlIHx8XHJcblx0XHRuYXZpZ2F0b3Iud2Via2l0VmlicmF0ZSB8fFxyXG5cdFx0bmF2aWdhdG9yLm1velZpYnJhdGUgfHxcclxuXHRcdG5hdmlnYXRvci5tc1ZpYnJhdGU7XHJcbn0gZWxzZSB7XHJcblx0bmF2aWdhdG9yID0ge1xyXG5cdFx0dmlicmF0ZTogZmFsc2VcclxuXHR9O1xyXG59XHJcblxyXG4oZnVuY3Rpb24oZ2xvYmFsKSB7XHJcblx0ZnVuY3Rpb24gUGxheWVyKGRhdGEpIHtcclxuXHRcdHZhciBkaXNjcmV0ZURpcmVjdGlvbnMgPSB7XHJcblx0XHRcdCd3ZXN0JzogMjcwLFxyXG5cdFx0XHQnd3NXZXN0JzogMjQwLFxyXG5cdFx0XHQnc1dlc3QnOiAxOTUsXHJcblx0XHRcdCdzb3V0aCc6IDE4MCxcclxuXHRcdFx0J3NFYXN0JzogMTY1LFxyXG5cdFx0XHQnZXNFYXN0JzogMTIwLFxyXG5cdFx0XHQnZWFzdCc6IDkwXHJcblx0XHR9O1xyXG5cdFx0dmFyIHRoYXQgPSBuZXcgU3ByaXRlKGRhdGEpO1xyXG5cdFx0dmFyIHN1cCA9IHtcclxuXHRcdFx0ZHJhdzogdGhhdC5zdXBlcmlvcignZHJhdycpLFxyXG5cdFx0XHRjeWNsZTogdGhhdC5zdXBlcmlvcignY3ljbGUnKSxcclxuXHRcdFx0Z2V0U3BlZWRYOiB0aGF0LnN1cGVyaW9yKCdnZXRTcGVlZFgnKSxcclxuXHRcdFx0Z2V0U3BlZWRZOiB0aGF0LnN1cGVyaW9yKCdnZXRTcGVlZFknKSxcclxuXHRcdFx0aGl0czogdGhhdC5zdXBlcmlvcignaGl0cycpXHJcblx0XHR9O1xyXG5cdFx0dmFyIGRpcmVjdGlvbnMgPSB7XHJcblx0XHRcdGVzRWFzdDogZnVuY3Rpb24oeERpZmYpIHsgcmV0dXJuIHhEaWZmID4gMzAwOyB9LFxyXG5cdFx0XHRzRWFzdDogZnVuY3Rpb24oeERpZmYpIHsgcmV0dXJuIHhEaWZmID4gNzU7IH0sXHJcblx0XHRcdHdzV2VzdDogZnVuY3Rpb24oeERpZmYpIHsgcmV0dXJuIHhEaWZmIDwgLTMwMDsgfSxcclxuXHRcdFx0c1dlc3Q6IGZ1bmN0aW9uKHhEaWZmKSB7IHJldHVybiB4RGlmZiA8IC03NTsgfVxyXG5cdFx0fTtcclxuXHJcblx0XHR2YXIgY2FuY2VsYWJsZVN0YXRlVGltZW91dDtcclxuXHRcdHZhciBjYW5jZWxhYmxlU3RhdGVJbnRlcnZhbDtcclxuXHJcblx0XHR2YXIgb2JzdGFjbGVzSGl0ID0gW107XHJcblx0XHR2YXIgcGl4ZWxzVHJhdmVsbGVkID0gMDtcclxuXHRcdGNvbnN0IHN0YW5kYXJkU3BlZWQgPSA1O1xyXG5cdFx0Y29uc3QgYm9vc3RNdWx0aXBsaWVyID0gMjtcclxuXHRcdHZhciB0dXJuRWFzZUN5Y2xlcyA9IDcwO1xyXG5cdFx0dmFyIHNwZWVkWCA9IDA7XHJcblx0XHR2YXIgc3BlZWRYRmFjdG9yID0gMDtcclxuXHRcdHZhciBzcGVlZFkgPSAwO1xyXG5cdFx0dmFyIHNwZWVkWUZhY3RvciA9IDE7XHJcblx0XHR2YXIgdHJpY2tTdGVwID0gMDsgLy8gVGhlcmUgYXJlIHRocmVlIG9mIHRoZXNlXHJcblx0XHR2YXIgY3Jhc2hpbmdGcmFtZSA9IDA7IC8vIDYtZnJhbWUgc2VxdWVuY2VcclxuXHJcblx0XHR0aGF0LmlzTW92aW5nID0gdHJ1ZTtcclxuXHRcdHRoYXQuaGFzQmVlbkhpdCA9IGZhbHNlO1xyXG5cdFx0dGhhdC5pc0p1bXBpbmcgPSBmYWxzZTtcclxuXHRcdHRoYXQuaXNQZXJmb3JtaW5nVHJpY2sgPSBmYWxzZTtcclxuXHRcdHRoYXQuaXNDcmFzaGluZyA9IGZhbHNlO1xyXG5cdFx0dGhhdC5pc0Jvb3N0aW5nID0gZmFsc2U7XHJcblx0XHR0aGF0LmlzU2xvd2VkID0gZmFsc2U7XHJcblx0XHR0aGF0LmF2YWlsYWJsZUF3YWtlID0gMTAwO1xyXG5cdFx0dGhhdC5vbkhpdE9ic3RhY2xlQ2IgPSBmdW5jdGlvbigpIHt9O1xyXG5cdFx0dGhhdC5vbkNvbGxlY3RJdGVtQ2IgPSBmdW5jdGlvbigpIHt9O1xyXG5cdFx0dGhhdC5vbkhpdE1vbnN0ZXJDYiA9IGZ1bmN0aW9uKCkge307XHJcblx0XHR0aGF0LnNldFNwZWVkKHN0YW5kYXJkU3BlZWQpO1xyXG5cclxuXHRcdC8vIEluY3JlYXNlIGF3YWtlIGJ5IDUgZXZlcnkgc2Vjb25kXHJcblx0XHRpbnRlcnZhbDogYXdha2VJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcclxuXHRcdFx0aWYgKHRoYXQuaXNNb3ZpbmcgJiYgIXRoYXQuaXNCb29zdGluZylcclxuXHRcdFx0XHR0aGF0LmF2YWlsYWJsZUF3YWtlID0gdGhhdC5hdmFpbGFibGVBd2FrZSA+PSA5NSA/IDEwMCA6IHRoYXQuYXZhaWxhYmxlQXdha2UgKyA1XHJcblx0XHR9LCAzMDAwKTtcclxuXHJcblx0XHR0aGF0LnJlc2V0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRvYnN0YWNsZXNIaXQgPSBbXTtcclxuXHRcdFx0cGl4ZWxzVHJhdmVsbGVkID0gMDtcclxuXHRcdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHRcdHRoYXQuaGFzQmVlbkhpdCA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LmF2YWlsYWJsZUF3YWtlID0gMTAwO1xyXG5cdFx0XHR0aGF0LmlzQ3Jhc2hpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc0JlaW5nRWF0ZW4gPSBmYWxzZTtcclxuXHRcdFx0c2V0Tm9ybWFsKCk7XHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHR0aGF0LmNsZWFyID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdHRoYXQucmVzZXQoKTtcclxuXHRcdFx0Y2xlYXJJbnRlcnZhbChhd2FrZUludGVydmFsKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBjYW5TcGVlZEJvb3N0KCkge1xyXG5cdFx0XHRyZXR1cm4gIXRoYXQuaXNDcmFzaGluZyBcclxuXHRcdFx0XHQmJiB0aGF0LmlzTW92aW5nXHJcblx0XHRcdFx0JiYgdGhhdC5hdmFpbGFibGVBd2FrZSA+PSA1MDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBzZXROb3JtYWwoKSB7XHJcblx0XHRcdGlmICh0aGF0LmlzQmVpbmdFYXRlbikgcmV0dXJuO1xyXG5cdFx0XHR0aGF0LnNldFNwZWVkKHN0YW5kYXJkU3BlZWQpO1xyXG5cdFx0XHR0aGF0LmlzTW92aW5nID0gdHJ1ZTtcclxuXHRcdFx0dGhhdC5oYXNCZWVuSGl0ID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuaXNKdW1waW5nID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuaXNQZXJmb3JtaW5nVHJpY2sgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc0NyYXNoaW5nID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuaXNCb29zdGVkID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuaXNTbG93ZWQgPSBmYWxzZTtcclxuXHRcdFx0aWYgKGNhbmNlbGFibGVTdGF0ZUludGVydmFsKSB7XHJcblx0XHRcdFx0Y2xlYXJJbnRlcnZhbChjYW5jZWxhYmxlU3RhdGVJbnRlcnZhbCk7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhhdC5zZXRNYXBQb3NpdGlvbih1bmRlZmluZWQsIHVuZGVmaW5lZCwgMCk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gc2V0Q3Jhc2hlZCgpIHtcclxuXHRcdFx0dGhhdC5oYXNCZWVuSGl0ID0gdHJ1ZTtcclxuXHRcdFx0dGhhdC5pc0NyYXNoaW5nID0gdHJ1ZTtcclxuXHRcdFx0dGhhdC5pc0p1bXBpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc1BlcmZvcm1pbmdUcmljayA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LnN0YXJ0Q3Jhc2hpbmcoKTtcclxuXHRcdFx0aWYgKGNhbmNlbGFibGVTdGF0ZUludGVydmFsKSB7XHJcblx0XHRcdFx0Y2xlYXJJbnRlcnZhbChjYW5jZWxhYmxlU3RhdGVJbnRlcnZhbCk7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhhdC5zZXRNYXBQb3NpdGlvbih1bmRlZmluZWQsIHVuZGVmaW5lZCwgMCk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gc2V0SnVtcGluZygpIHtcclxuXHRcdFx0dmFyIGN1cnJlbnRTcGVlZCA9IHRoYXQuZ2V0U3BlZWQoKTtcclxuXHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NvdXRoJyk7XHJcblx0XHRcdHRoYXQuc2V0U3BlZWQoY3VycmVudFNwZWVkICsgMik7XHJcblx0XHRcdHRoYXQuc2V0U3BlZWRZKGN1cnJlbnRTcGVlZCArIDIpO1xyXG5cdFx0XHR0aGF0LmlzTW92aW5nID0gdHJ1ZTtcclxuXHRcdFx0dGhhdC5oYXNCZWVuSGl0ID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuaXNKdW1waW5nID0gdHJ1ZTtcclxuXHRcdFx0dGhhdC5zZXRNYXBQb3NpdGlvbih1bmRlZmluZWQsIHVuZGVmaW5lZCwgMSk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gc2V0U2xvd0Rvd24oKSB7XHJcblx0XHRcdHRoYXQuc2V0U3BlZWQoMSk7XHJcblx0XHRcdHRoYXQuc2V0U3BlZWRZKDEpO1xyXG5cdFx0XHR0aGF0LmlzTW92aW5nID0gdHJ1ZTtcclxuXHRcdFx0dGhhdC5pc1Nsb3dlZCA9IHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0RGlzY3JldGVEaXJlY3Rpb24oKSB7XHJcblx0XHRcdGlmICh0aGF0LmRpcmVjdGlvbikge1xyXG5cdFx0XHRcdGlmICh0aGF0LmRpcmVjdGlvbiA8PSA5MCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdlYXN0JztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHRoYXQuZGlyZWN0aW9uID4gOTAgJiYgdGhhdC5kaXJlY3Rpb24gPCAxNTApIHtcclxuXHRcdFx0XHRcdHJldHVybiAnZXNFYXN0JztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHRoYXQuZGlyZWN0aW9uID49IDE1MCAmJiB0aGF0LmRpcmVjdGlvbiA8IDE4MCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdzRWFzdCc7XHJcblx0XHRcdFx0fSBlbHNlIGlmICh0aGF0LmRpcmVjdGlvbiA9PT0gMTgwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3NvdXRoJztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHRoYXQuZGlyZWN0aW9uID4gMTgwICYmIHRoYXQuZGlyZWN0aW9uIDw9IDIxMCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdzV2VzdCc7XHJcblx0XHRcdFx0fSBlbHNlIGlmICh0aGF0LmRpcmVjdGlvbiA+IDIxMCAmJiB0aGF0LmRpcmVjdGlvbiA8IDI3MCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICd3c1dlc3QnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5kaXJlY3Rpb24gPj0gMjcwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3dlc3QnO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3NvdXRoJztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dmFyIHhEaWZmID0gdGhhdC5tb3ZpbmdUb3dhcmRbMF0gLSB0aGF0Lm1hcFBvc2l0aW9uWzBdO1xyXG5cdFx0XHRcdHZhciB5RGlmZiA9IHRoYXQubW92aW5nVG93YXJkWzFdIC0gdGhhdC5tYXBQb3NpdGlvblsxXTtcclxuXHRcdFx0XHRpZiAoeURpZmYgPD0gMCkge1xyXG5cdFx0XHRcdFx0aWYgKHhEaWZmID4gMCkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gJ2Vhc3QnO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuICd3ZXN0JztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmIChkaXJlY3Rpb25zLmVzRWFzdCh4RGlmZikpIHtcclxuXHRcdFx0XHRcdHJldHVybiAnZXNFYXN0JztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKGRpcmVjdGlvbnMuc0Vhc3QoeERpZmYpKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3NFYXN0JztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKGRpcmVjdGlvbnMud3NXZXN0KHhEaWZmKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICd3c1dlc3QnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoZGlyZWN0aW9ucy5zV2VzdCh4RGlmZikpIHtcclxuXHRcdFx0XHRcdHJldHVybiAnc1dlc3QnO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gJ3NvdXRoJztcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBzZXREaXNjcmV0ZURpcmVjdGlvbihkKSB7XHJcblx0XHRcdGlmIChkaXNjcmV0ZURpcmVjdGlvbnNbZF0pIHtcclxuXHRcdFx0XHR0aGF0LnNldERpcmVjdGlvbihkaXNjcmV0ZURpcmVjdGlvbnNbZF0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoZCA9PT0gJ3dlc3QnIHx8IGQgPT09ICdlYXN0Jykge1xyXG5cdFx0XHRcdHRoYXQuaXNNb3ZpbmcgPSBmYWxzZTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGF0LmlzTW92aW5nID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldEJlaW5nRWF0ZW5TcHJpdGUoKSB7XHJcblx0XHRcdHJldHVybiAnYmxhbmsnO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldEp1bXBpbmdTcHJpdGUoKSB7XHJcblx0XHRcdHJldHVybiAnanVtcGluZyc7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5zdG9wID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRpZiAodGhhdC5kaXJlY3Rpb24gPiAxODApIHtcclxuXHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignd2VzdCcpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdlYXN0Jyk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC50dXJuRWFzdCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0c3dpdGNoIChnZXREaXNjcmV0ZURpcmVjdGlvbigpKSB7XHJcblx0XHRcdFx0Y2FzZSAnd2VzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignd3NXZXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICd3c1dlc3QnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NXZXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdzV2VzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc291dGgnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3NvdXRoJzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdzRWFzdCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnc0Vhc3QnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ2VzRWFzdCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnZXNFYXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdlYXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NvdXRoJyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnR1cm5XZXN0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRzd2l0Y2ggKGdldERpc2NyZXRlRGlyZWN0aW9uKCkpIHtcclxuXHRcdFx0XHRjYXNlICdlYXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdlc0Vhc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2VzRWFzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc0Vhc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3NFYXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdzb3V0aCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnc291dGgnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NXZXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdzV2VzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignd3NXZXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICd3c1dlc3QnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3dlc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc291dGgnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuc3RlcFdlc3QgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRoYXQubWFwUG9zaXRpb25bMF0gLT0gdGhhdC5zcGVlZCAqIDI7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuc3RlcEVhc3QgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRoYXQubWFwUG9zaXRpb25bMF0gKz0gdGhhdC5zcGVlZCAqIDI7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuc2V0TWFwUG9zaXRpb25UYXJnZXQgPSBmdW5jdGlvbiAoeCwgeSkge1xyXG5cdFx0XHRpZiAodGhhdC5oYXNCZWVuSGl0KSByZXR1cm47XHJcblxyXG5cdFx0XHRpZiAoTWF0aC5hYnModGhhdC5tYXBQb3NpdGlvblswXSAtIHgpIDw9IDc1KSB7XHJcblx0XHRcdFx0eCA9IHRoYXQubWFwUG9zaXRpb25bMF07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoYXQubW92aW5nVG93YXJkID0gWyB4LCB5IF07XHJcblxyXG5cdFx0XHQvLyB0aGF0LnJlc2V0RGlyZWN0aW9uKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuc3RhcnRNb3ZpbmdJZlBvc3NpYmxlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRpZiAoIXRoYXQuaGFzQmVlbkhpdCAmJiAhdGhhdC5pc0JlaW5nRWF0ZW4pIHtcclxuXHRcdFx0XHR0aGF0LmlzTW92aW5nID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnNldFR1cm5FYXNlQ3ljbGVzID0gZnVuY3Rpb24gKGMpIHtcclxuXHRcdFx0dHVybkVhc2VDeWNsZXMgPSBjO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmdldFBpeGVsc1RyYXZlbGxlZERvd25Sb2FkID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gcGl4ZWxzVHJhdmVsbGVkO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnJlc2V0U3BlZWQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRoYXQuc2V0U3BlZWQoc3RhbmRhcmRTcGVlZCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuY3ljbGUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmICggdGhhdC5nZXRTcGVlZFgoKSA8PSAwICYmIHRoYXQuZ2V0U3BlZWRZKCkgPD0gMCApIHtcclxuXHRcdFx0XHRcdFx0dGhhdC5pc01vdmluZyA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBkaXJlY3Rpb24gPSBnZXREaXNjcmV0ZURpcmVjdGlvbigpO1xyXG5cdFx0XHRpZiAodGhhdC5pc01vdmluZyAmJiBkaXJlY3Rpb24gIT09ICdlYXN0JyAmJiBkaXJlY3Rpb24gIT09ICd3ZXN0Jykge1xyXG5cdFx0XHRcdHBpeGVsc1RyYXZlbGxlZCArPSB0aGF0LnNwZWVkO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodGhhdC5pc0p1bXBpbmcpIHtcclxuXHRcdFx0XHR0aGF0LnNldE1hcFBvc2l0aW9uVGFyZ2V0KHVuZGVmaW5lZCwgdGhhdC5tYXBQb3NpdGlvblsxXSArIHRoYXQuZ2V0U3BlZWQoKSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHN1cC5jeWNsZSgpO1xyXG5cdFx0XHRcclxuXHRcdFx0dGhhdC5jaGVja0hpdHRhYmxlT2JqZWN0cygpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmRyYXcgPSBmdW5jdGlvbihkQ29udGV4dCkge1xyXG5cdFx0XHR2YXIgc3ByaXRlUGFydFRvVXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdGlmICh0aGF0LmlzQmVpbmdFYXRlbikge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGdldEJlaW5nRWF0ZW5TcHJpdGUoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmICh0aGF0LmlzSnVtcGluZykge1xyXG5cdFx0XHRcdFx0LyogaWYgKHRoYXQuaXNQZXJmb3JtaW5nVHJpY2spIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGdldFRyaWNrU3ByaXRlKCk7XHJcblx0XHRcdFx0XHR9ICovXHJcblx0XHRcdFx0XHRyZXR1cm4gZ2V0SnVtcGluZ1Nwcml0ZSgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKHRoYXQuaXNDcmFzaGluZylcclxuXHRcdFx0XHRcdHJldHVybiAnd3JlY2snICsgY3Jhc2hpbmdGcmFtZTtcclxuXHJcblx0XHRcdFx0aWYgKHRoYXQuaXNCb29zdGluZylcclxuXHRcdFx0XHRcdHJldHVybiAnYm9vc3QnO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gZ2V0RGlzY3JldGVEaXJlY3Rpb24oKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHJldHVybiBzdXAuZHJhdyhkQ29udGV4dCwgc3ByaXRlUGFydFRvVXNlKCkpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmhpdHMgPSBmdW5jdGlvbiAob2JzKSB7XHJcblx0XHRcdGlmIChvYnN0YWNsZXNIaXQuaW5kZXhPZihvYnMuaWQpICE9PSAtMSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKCFvYnMub2NjdXBpZXNaSW5kZXgodGhhdC5tYXBQb3NpdGlvblsyXSkpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChzdXAuaGl0cyhvYnMpKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zcGVlZEJvb3N0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRpZiAoIXRoYXQuaXNCb29zdGluZyAmJiBjYW5TcGVlZEJvb3N0KCkpIHtcclxuXHRcdFx0XHR0aGF0LmF2YWlsYWJsZUF3YWtlIC09IDUwO1xyXG5cdFx0XHRcdHRoYXQuc2V0U3BlZWQodGhhdC5zcGVlZCAqIGJvb3N0TXVsdGlwbGllcik7XHJcblx0XHRcdFx0dGhhdC5pc0Jvb3N0aW5nID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHR0aGF0LnNldFNwZWVkKHN0YW5kYXJkU3BlZWQpO1xyXG5cdFx0XHRcdFx0dGhhdC5pc0Jvb3N0aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0fSwgMjAwMCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5hdHRlbXB0VHJpY2sgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmICh0aGF0LmlzSnVtcGluZykge1xyXG5cdFx0XHRcdHRoYXQuaXNQZXJmb3JtaW5nVHJpY2sgPSB0cnVlO1xyXG5cdFx0XHRcdGNhbmNlbGFibGVTdGF0ZUludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0aWYgKHRyaWNrU3RlcCA+PSAyKSB7XHJcblx0XHRcdFx0XHRcdHRyaWNrU3RlcCA9IDA7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0cmlja1N0ZXAgKz0gMTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LCAzMDApO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuZ2V0U3RhbmRhcmRTcGVlZCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIHN0YW5kYXJkU3BlZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIGVhc2VTcGVlZFRvVGFyZ2V0VXNpbmdGYWN0b3Ioc3AsIHRhcmdldFNwZWVkLCBmKSB7XHJcblx0XHRcdGlmIChmID09PSAwIHx8IGYgPT09IDEpIHtcclxuXHRcdFx0XHRyZXR1cm4gdGFyZ2V0U3BlZWQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChzcCA8IHRhcmdldFNwZWVkKSB7XHJcblx0XHRcdFx0c3AgKz0gdGhhdC5nZXRTcGVlZCgpICogKGYgLyB0dXJuRWFzZUN5Y2xlcyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChzcCA+IHRhcmdldFNwZWVkKSB7XHJcblx0XHRcdFx0c3AgLT0gdGhhdC5nZXRTcGVlZCgpICogKGYgLyB0dXJuRWFzZUN5Y2xlcyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBzcDtcclxuXHRcdH1cclxuXHJcblx0XHR0aGF0LmdldFNwZWVkWCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0c3dpdGNoIChnZXREaXNjcmV0ZURpcmVjdGlvbigpKSB7XHJcblx0XHRcdFx0Y2FzZSAnZXNFYXN0JzpcclxuXHRcdFx0XHRjYXNlICd3c1dlc3QnOlxyXG5cdFx0XHRcdFx0c3BlZWRYRmFjdG9yID0gMC41O1xyXG5cdFx0XHRcdFx0c3BlZWRYID0gZWFzZVNwZWVkVG9UYXJnZXRVc2luZ0ZhY3RvcihzcGVlZFgsIHRoYXQuZ2V0U3BlZWQoKSAqIHNwZWVkWEZhY3Rvciwgc3BlZWRYRmFjdG9yKTtcclxuXHRcdFx0XHRcdHJldHVybiBzcGVlZFg7XHJcblx0XHRcdFx0Y2FzZSAnc0Vhc3QnOlxyXG5cdFx0XHRcdGNhc2UgJ3NXZXN0JzpcclxuXHRcdFx0XHRcdHNwZWVkWEZhY3RvciA9IDAuMzM7XHJcblx0XHRcdFx0XHRzcGVlZFggPSBlYXNlU3BlZWRUb1RhcmdldFVzaW5nRmFjdG9yKHNwZWVkWCwgdGhhdC5nZXRTcGVlZCgpICogc3BlZWRYRmFjdG9yLCBzcGVlZFhGYWN0b3IpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHNwZWVkWDtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBTbyBpdCBtdXN0IGJlIHNvdXRoXHJcblx0XHRcdHNwZWVkWCA9IGVhc2VTcGVlZFRvVGFyZ2V0VXNpbmdGYWN0b3Ioc3BlZWRYLCAwLCBzcGVlZFhGYWN0b3IpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHNwZWVkWDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zZXRTcGVlZFkgPSBmdW5jdGlvbihzeSkge1xyXG5cdFx0XHRzcGVlZFkgPSBzeTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5nZXRTcGVlZFkgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmICh0aGF0LmlzSnVtcGluZykge1xyXG5cdFx0XHRcdHJldHVybiBzcGVlZFk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHN3aXRjaCAoZ2V0RGlzY3JldGVEaXJlY3Rpb24oKSkge1xyXG5cdFx0XHRcdGNhc2UgJ2VzRWFzdCc6XHJcblx0XHRcdFx0Y2FzZSAnd3NXZXN0JzpcclxuXHRcdFx0XHRcdHNwZWVkWUZhY3RvciA9IDAuNjtcclxuXHRcdFx0XHRcdHNwZWVkWSA9IGVhc2VTcGVlZFRvVGFyZ2V0VXNpbmdGYWN0b3Ioc3BlZWRZLCB0aGF0LmdldFNwZWVkKCkgKiAwLjYsIDAuNik7XHJcblx0XHRcdFx0XHRyZXR1cm4gc3BlZWRZO1xyXG5cdFx0XHRcdGNhc2UgJ2VzRWFzdCc6XHJcblx0XHRcdFx0Y2FzZSAnd3NXZXN0JzpcclxuXHRcdFx0XHRcdHNwZWVkWUZhY3RvciA9IDAuODU7XHJcblx0XHRcdFx0XHRzcGVlZFkgPSBlYXNlU3BlZWRUb1RhcmdldFVzaW5nRmFjdG9yKHNwZWVkWSwgdGhhdC5nZXRTcGVlZCgpICogMC44NSwgMC44NSk7XHJcblx0XHRcdFx0XHRyZXR1cm4gc3BlZWRZO1xyXG5cdFx0XHRcdGNhc2UgJ2Vhc3QnOlxyXG5cdFx0XHRcdGNhc2UgJ3dlc3QnOlxyXG5cdFx0XHRcdFx0c3BlZWRZRmFjdG9yID0gMTtcclxuXHRcdFx0XHRcdHNwZWVkWSA9IDA7XHJcblx0XHRcdFx0XHRyZXR1cm4gc3BlZWRZO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBTbyBpdCBtdXN0IGJlIHNvdXRoXHJcblx0XHRcdHNwZWVkWSA9IGVhc2VTcGVlZFRvVGFyZ2V0VXNpbmdGYWN0b3Ioc3BlZWRZLCB0aGF0LmdldFNwZWVkKCksIHNwZWVkWUZhY3Rvcik7XHJcblxyXG5cdFx0XHRyZXR1cm4gc3BlZWRZO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0Lmhhc0hpdE9ic3RhY2xlID0gZnVuY3Rpb24gKG9icykge1xyXG5cdFx0XHRzZXRDcmFzaGVkKCk7XHJcblxyXG5cdFx0XHRpZiAobmF2aWdhdG9yLnZpYnJhdGUpIHtcclxuXHRcdFx0XHRuYXZpZ2F0b3IudmlicmF0ZSg1MDApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRvYnN0YWNsZXNIaXQucHVzaChvYnMuaWQpO1xyXG5cclxuXHRcdFx0dGhhdC5yZXNldFNwZWVkKCk7XHJcblx0XHRcdHRoYXQub25IaXRPYnN0YWNsZUNiKG9icyk7XHJcblxyXG5cdFx0XHRpZiAoY2FuY2VsYWJsZVN0YXRlVGltZW91dCkge1xyXG5cdFx0XHRcdGNsZWFyVGltZW91dChjYW5jZWxhYmxlU3RhdGVUaW1lb3V0KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYW5jZWxhYmxlU3RhdGVUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRzZXROb3JtYWwoKTtcclxuXHRcdFx0fSwgMTUwMCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuaGFzSGl0TW9uc3RlciA9IGZ1bmN0aW9uIChtb25zdGVyKSB7XHJcblx0XHRcdC8vIFRPRE9cclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5oYXNIaXRKdW1wID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRzZXRKdW1waW5nKCk7XHJcblxyXG5cdFx0XHRpZiAoY2FuY2VsYWJsZVN0YXRlVGltZW91dCkge1xyXG5cdFx0XHRcdGNsZWFyVGltZW91dChjYW5jZWxhYmxlU3RhdGVUaW1lb3V0KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYW5jZWxhYmxlU3RhdGVUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRzZXROb3JtYWwoKTtcclxuXHRcdFx0fSwgMTAwMCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuaGFzSGl0T2lsU2xpY2sgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRoYXQuc2V0U3BlZWQoNyk7XHJcblx0XHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cclxuXHRcdFx0Ly8gRXhwZXJpbWVudGluZyB3aXRoIGxvc2luZyBjb250cm9sXHJcblx0XHRcdC8qIGNvbnN0IGRpcmVjdGlvbiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQpO1xyXG5cdFx0XHRzd2l0Y2ggKGRpcmVjdGlvbikge1xyXG5cdFx0XHRcdGNhc2UgMDogc2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NFYXN0Jyk7XHJcblx0XHRcdFx0Y2FzZSAxOiBzZXREaXNjcmV0ZURpcmVjdGlvbignc1dlc3QnKTtcclxuXHRcdFx0XHRjYXNlIDI6IHNldERpc2NyZXRlRGlyZWN0aW9uKCdzRWFzdCcpO1xyXG5cdFx0XHRcdGNhc2UgMzogc2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NXZXN0Jyk7XHJcblx0XHRcdH0gKi9cclxuXHJcblx0XHRcdGlmIChjYW5jZWxhYmxlU3RhdGVUaW1lb3V0KSB7XHJcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KGNhbmNlbGFibGVTdGF0ZVRpbWVvdXQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhbmNlbGFibGVTdGF0ZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHNldE5vcm1hbCgpO1xyXG5cdFx0XHR9LCAyMDApO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoYXQuaGFzSGl0Q29sbGVjdGlibGUgPSBmdW5jdGlvbiAoaXRlbSkge1xyXG5cdFx0XHR0aGF0Lm9uQ29sbGVjdEl0ZW1DYihpdGVtKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGF0LmlzRWF0ZW5CeSA9IGZ1bmN0aW9uIChtb25zdGVyLCB3aGVuRWF0ZW4pIHtcclxuXHRcdFx0dGhhdC5vbkhpdE1vbnN0ZXJDYigpO1xyXG5cdFx0XHR0aGF0Lmhhc0hpdE1vbnN0ZXIobW9uc3Rlcik7XHJcblx0XHRcdG1vbnN0ZXIuc3RhcnRFYXRpbmcod2hlbkVhdGVuKTtcclxuXHRcdFx0b2JzdGFjbGVzSGl0LnB1c2gobW9uc3Rlci5pZCk7XHJcblx0XHRcdHRoYXQuaXNNb3ZpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc0JlaW5nRWF0ZW4gPSB0cnVlO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnJlc2V0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRvYnN0YWNsZXNIaXQgPSBbXTtcclxuXHRcdFx0cGl4ZWxzVHJhdmVsbGVkID0gMDtcclxuXHRcdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHRcdHRoYXQuaXNKdW1waW5nID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuaGFzQmVlbkhpdCA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LmF2YWlsYWJsZUF3YWtlID0gMTAwO1xyXG5cdFx0XHR0aGF0LmlzQmVpbmdFYXRlbiA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LmlzQm9vc3RlZCA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LmlzQm9vc3RpbmcgPSBmYWxzZTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zZXRIaXRPYnN0YWNsZUNiID0gZnVuY3Rpb24gKGZuKSB7XHJcblx0XHRcdHRoYXQub25IaXRPYnN0YWNsZUNiID0gZm4gfHwgZnVuY3Rpb24oKSB7fTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zZXRIaXRNb25zdGVyQ2IgPSBmdW5jdGlvbiAoZm4pIHtcclxuXHRcdFx0dGhhdC5vbkhpdE1vbnN0ZXJDYiA9IGZuIHx8IGZ1bmN0aW9uKCkge307XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5zZXRDb2xsZWN0SXRlbUNiID0gZnVuY3Rpb24gKGZuKSB7XHJcblx0XHRcdHRoYXQub25Db2xsZWN0SXRlbUNiID0gZm4gfHwgZnVuY3Rpb24oKSB7fTtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gc3RhcnRDcmFzaGluZygpIHtcclxuXHRcdFx0Y3Jhc2hpbmdGcmFtZSArPSAxO1xyXG5cdFx0XHR0aGF0LmlzQ3Jhc2hpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0LmlzQm9vc3RpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5zZXRTcGVlZCgxKTtcclxuXHRcdFx0aWYgKGNyYXNoaW5nRnJhbWUgPCA2KSB7XHJcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRzdGFydENyYXNoaW5nKCk7XHJcblx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjcmFzaGluZ0ZyYW1lID0gMDtcclxuXHRcdFx0XHR0aGF0LmlzQ3Jhc2hpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHR0aGF0LmlzTW92aW5nID0gZmFsc2U7IC8vIHN0b3AgbW92aW5nIG9uIGxhc3QgZnJhbWVcclxuXHRcdFx0XHR0aGF0LnJlc2V0U3BlZWQoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoYXQuc3RhcnRDcmFzaGluZyA9IHN0YXJ0Q3Jhc2hpbmc7XHJcblxyXG5cdFx0cmV0dXJuIHRoYXQ7XHJcblx0fVxyXG5cclxuXHRnbG9iYWwucGxheWVyID0gUGxheWVyO1xyXG59KSh0aGlzKTtcclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG5cdG1vZHVsZS5leHBvcnRzID0gdGhpcy5wbGF5ZXI7XHJcbn1cclxuIiwiLy8gQXZvaWQgYGNvbnNvbGVgIGVycm9ycyBpbiBicm93c2VycyB0aGF0IGxhY2sgYSBjb25zb2xlLlxyXG4oZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgbWV0aG9kO1xyXG4gICAgdmFyIG5vb3AgPSBmdW5jdGlvbiBub29wKCkge307XHJcbiAgICB2YXIgbWV0aG9kcyA9IFtcclxuICAgICAgICAnYXNzZXJ0JywgJ2NsZWFyJywgJ2NvdW50JywgJ2RlYnVnJywgJ2RpcicsICdkaXJ4bWwnLCAnZXJyb3InLFxyXG4gICAgICAgICdleGNlcHRpb24nLCAnZ3JvdXAnLCAnZ3JvdXBDb2xsYXBzZWQnLCAnZ3JvdXBFbmQnLCAnaW5mbycsICdsb2cnLFxyXG4gICAgICAgICdtYXJrVGltZWxpbmUnLCAncHJvZmlsZScsICdwcm9maWxlRW5kJywgJ3RhYmxlJywgJ3RpbWUnLCAndGltZUVuZCcsXHJcbiAgICAgICAgJ3RpbWVTdGFtcCcsICd0cmFjZScsICd3YXJuJ1xyXG4gICAgXTtcclxuICAgIHZhciBsZW5ndGggPSBtZXRob2RzLmxlbmd0aDtcclxuICAgIHZhciBjb25zb2xlID0gKHdpbmRvdy5jb25zb2xlID0gd2luZG93LmNvbnNvbGUgfHwge30pO1xyXG5cclxuICAgIHdoaWxlIChsZW5ndGgtLSkge1xyXG4gICAgICAgIG1ldGhvZCA9IG1ldGhvZHNbbGVuZ3RoXTtcclxuXHJcbiAgICAgICAgLy8gT25seSBzdHViIHVuZGVmaW5lZCBtZXRob2RzLlxyXG4gICAgICAgIGlmICghY29uc29sZVttZXRob2RdKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGVbbWV0aG9kXSA9IG5vb3A7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KCkpOyIsIihmdW5jdGlvbiAoZ2xvYmFsKSB7XHJcblx0dmFyIEdVSUQgPSByZXF1aXJlKCcuL2d1aWQnKTtcclxuXHRmdW5jdGlvbiBTcHJpdGUgKGRhdGEpIHtcclxuXHRcdHZhciBoaXR0YWJsZU9iamVjdHMgPSB7fTtcclxuXHRcdHZhciB6SW5kZXhlc09jY3VwaWVkID0gWyAwIF07XHJcblx0XHR2YXIgdGhhdCA9IHRoaXM7XHJcblx0XHR2YXIgdHJhY2tlZFNwcml0ZVRvTW92ZVRvd2FyZDtcclxuXHRcdHZhciBzaG93SGl0Qm94ZXMgPSBmYWxzZTtcclxuXHJcblx0XHR0aGF0LmRpcmVjdGlvbiA9IHVuZGVmaW5lZDtcclxuXHRcdHRoYXQubWFwUG9zaXRpb24gPSBbMCwgMCwgMF07XHJcblx0XHR0aGF0LmlkID0gR1VJRCgpO1xyXG5cdFx0dGhhdC5jYW52YXNYID0gMDtcclxuXHRcdHRoYXQuY2FudmFzWSA9IDA7XHJcblx0XHR0aGF0LmNhbnZhc1ogPSAwO1xyXG5cdFx0dGhhdC5oZWlnaHQgPSAwO1xyXG5cdFx0dGhhdC5zcGVlZCA9IDA7XHJcblx0XHR0aGF0LmRhdGEgPSBkYXRhIHx8IHsgcGFydHMgOiB7fSB9O1xyXG5cdFx0dGhhdC5tb3ZpbmdUb3dhcmQgPSBbIDAsIDAgXTtcclxuXHRcdHRoYXQubWV0cmVzRG93blRoZVJvYWQgPSAwO1xyXG5cdFx0dGhhdC5tb3ZpbmdXaXRoQ29udmljdGlvbiA9IGZhbHNlO1xyXG5cdFx0dGhhdC5kZWxldGVkID0gZmFsc2U7XHJcblx0XHR0aGF0Lm1heEhlaWdodCA9IChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmICh0aGF0LmRhdGEucGFydHMgPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdH1cclxuXHRcdFx0T2JqZWN0LnZhbHVlcyh0aGF0LmRhdGEucGFydHMpLm1hcChmdW5jdGlvbiAocCkgeyBcclxuXHRcdFx0XHR2YXIgaGVpZ2h0ID0gcFszXSB8fCB0aGF0LmhlaWdodDtcclxuXHRcdFx0XHRyZXR1cm4gaGVpZ2h0O1xyXG5cdFx0XHQgfSkubWF4KCk7XHJcblx0XHR9KCkpO1xyXG5cdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHR0aGF0LmlzRHJhd25VbmRlclBsYXllciA9IHRoYXQuZGF0YS5pc0RyYXduVW5kZXJQbGF5ZXIgfHwgZmFsc2U7XHJcblx0XHRcclxuXHRcdGlmICghdGhhdC5kYXRhLnBhcnRzKSB7XHJcblx0XHRcdHRoYXQuZGF0YS5wYXJ0cyA9IHt9O1xyXG5cdFx0XHR0aGF0LmN1cnJlbnRGcmFtZSA9IHVuZGVmaW5lZDtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoYXQuY3VycmVudEZyYW1lID0gdGhhdC5kYXRhLnBhcnRzWzBdO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChkYXRhICYmIGRhdGEuaWQpe1xyXG5cdFx0XHR0aGF0LmlkID0gZGF0YS5pZDtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoZGF0YSAmJiBkYXRhLnpJbmRleGVzT2NjdXBpZWQpIHtcclxuXHRcdFx0ekluZGV4ZXNPY2N1cGllZCA9IGRhdGEuekluZGV4ZXNPY2N1cGllZDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBpbmNyZW1lbnRYKGFtb3VudCkge1xyXG5cdFx0XHR0aGF0LmNhbnZhc1ggKz0gYW1vdW50LnRvTnVtYmVyKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gaW5jcmVtZW50WShhbW91bnQpIHtcclxuXHRcdFx0dGhhdC5jYW52YXNZICs9IGFtb3VudC50b051bWJlcigpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldEhpdEJveChmb3JaSW5kZXgpIHtcclxuXHRcdFx0aWYgKHRoYXQuZGF0YS5oaXRCb3hlcykge1xyXG5cdFx0XHRcdGlmIChkYXRhLmhpdEJveGVzW2ZvclpJbmRleF0pIHtcclxuXHRcdFx0XHRcdHJldHVybiBkYXRhLmhpdEJveGVzW2ZvclpJbmRleF07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gcm91bmRIYWxmKG51bSkge1xyXG5cdFx0XHRudW0gPSBNYXRoLnJvdW5kKG51bSoyKS8yO1xyXG5cdFx0XHRyZXR1cm4gbnVtO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIG1vdmUoKSB7XHJcblx0XHRcdGlmICghdGhhdC5pc01vdmluZykge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bGV0IGN1cnJlbnRYID0gdGhhdC5tYXBQb3NpdGlvblswXTtcclxuXHRcdFx0bGV0IGN1cnJlbnRZID0gdGhhdC5tYXBQb3NpdGlvblsxXTtcclxuXHJcblx0XHRcdGlmICh0eXBlb2YgdGhhdC5kaXJlY3Rpb24gIT09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0Ly8gRm9yIHRoaXMgd2UgbmVlZCB0byBtb2RpZnkgdGhlIHRoYXQuZGlyZWN0aW9uIHNvIGl0IHJlbGF0ZXMgdG8gdGhlIGhvcml6b250YWxcclxuXHRcdFx0XHR2YXIgZCA9IHRoYXQuZGlyZWN0aW9uIC0gOTA7XHJcblx0XHRcdFx0aWYgKGQgPCAwKSBkID0gMzYwICsgZDtcclxuXHRcdFx0XHRjdXJyZW50WCArPSByb3VuZEhhbGYodGhhdC5zcGVlZCAqIE1hdGguY29zKGQgKiAoTWF0aC5QSSAvIDE4MCkpKTtcclxuXHRcdFx0XHRjdXJyZW50WSArPSByb3VuZEhhbGYodGhhdC5zcGVlZCAqIE1hdGguc2luKGQgKiAoTWF0aC5QSSAvIDE4MCkpKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpZiAodHlwZW9mIHRoYXQubW92aW5nVG93YXJkWzBdICE9PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdFx0aWYgKGN1cnJlbnRYID4gdGhhdC5tb3ZpbmdUb3dhcmRbMF0pIHtcclxuXHRcdFx0XHRcdFx0Y3VycmVudFggLT0gTWF0aC5taW4odGhhdC5nZXRTcGVlZFgoKSwgTWF0aC5hYnMoY3VycmVudFggLSB0aGF0Lm1vdmluZ1Rvd2FyZFswXSkpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChjdXJyZW50WCA8IHRoYXQubW92aW5nVG93YXJkWzBdKSB7XHJcblx0XHRcdFx0XHRcdGN1cnJlbnRYICs9IE1hdGgubWluKHRoYXQuZ2V0U3BlZWRYKCksIE1hdGguYWJzKGN1cnJlbnRYIC0gdGhhdC5tb3ZpbmdUb3dhcmRbMF0pKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKHR5cGVvZiB0aGF0Lm1vdmluZ1Rvd2FyZFsxXSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0XHRcdGlmIChjdXJyZW50WSA+IHRoYXQubW92aW5nVG93YXJkWzFdKSB7XHJcblx0XHRcdFx0XHRcdGN1cnJlbnRZIC09IE1hdGgubWluKHRoYXQuZ2V0U3BlZWRZKCksIE1hdGguYWJzKGN1cnJlbnRZIC0gdGhhdC5tb3ZpbmdUb3dhcmRbMV0pKTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoY3VycmVudFkgPCB0aGF0Lm1vdmluZ1Rvd2FyZFsxXSkge1xyXG5cdFx0XHRcdFx0XHRjdXJyZW50WSArPSBNYXRoLm1pbih0aGF0LmdldFNwZWVkWSgpLCBNYXRoLmFicyhjdXJyZW50WSAtIHRoYXQubW92aW5nVG93YXJkWzFdKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGF0LnNldE1hcFBvc2l0aW9uKGN1cnJlbnRYLCBjdXJyZW50WSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5zZXRIaXRCb3hlc1Zpc2libGUgPSBmdW5jdGlvbihzaG93KSB7XHJcblx0XHRcdHNob3dIaXRCb3hlcyA9IHNob3c7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5kcmF3ID0gZnVuY3Rpb24gKGRDdHgsIHNwcml0ZUZyYW1lKSB7XHJcblx0XHRcdHRoYXQuY3VycmVudEZyYW1lID0gdGhhdC5kYXRhLnBhcnRzW3Nwcml0ZUZyYW1lXTtcclxuXHRcdFx0bGV0IGZyID0gdGhhdC5jdXJyZW50RnJhbWU7Ly8gdGhhdC5kYXRhLnBhcnRzW3Nwcml0ZUZyYW1lXTtcclxuXHRcdFx0dGhhdC5oZWlnaHQgPSBmclszXTtcclxuXHRcdFx0dGhhdC53aWR0aCA9IGZyWzJdO1xyXG5cclxuXHRcdFx0Y29uc3QgbmV3Q2FudmFzUG9zaXRpb24gPSBkQ3R4Lm1hcFBvc2l0aW9uVG9DYW52YXNQb3NpdGlvbih0aGF0Lm1hcFBvc2l0aW9uKTtcclxuXHRcdFx0dGhhdC5zZXRDYW52YXNQb3NpdGlvbihuZXdDYW52YXNQb3NpdGlvblswXSwgbmV3Q2FudmFzUG9zaXRpb25bMV0pO1xyXG5cclxuXHRcdFx0Ly8gU3ByaXRlIG9mZnNldCBmb3Iga2VlcGluZyBzcHJpdGUgZnJhbWUgY2VudGVyZWQgKGZvciBzcHJpdGUgZnJhbWVzIG9mIHZhcmlvdXMgc2l6ZXMpXHJcblx0XHRcdGNvbnN0IG9mZnNldFggPSBmci5sZW5ndGggPiA0ID8gZnJbNF0gOiAwO1xyXG5cdFx0XHRjb25zdCBvZmZzZXRZID0gZnIubGVuZ3RoID4gNSA/IGZyWzVdIDogMDtcclxuXHJcblx0XHRcdGRDdHguZHJhd0ltYWdlKGRDdHguZ2V0TG9hZGVkSW1hZ2UodGhhdC5kYXRhLiRpbWFnZUZpbGUpLCBmclswXSwgZnJbMV0sIGZyWzJdLCBmclszXSwgdGhhdC5jYW52YXNYICsgb2Zmc2V0WCwgdGhhdC5jYW52YXNZICsgb2Zmc2V0WSwgZnJbMl0sIGZyWzNdKTtcclxuXHRcdFxyXG5cdFx0XHRkcmF3SGl0Ym94KGRDdHgsIGZyKTtcclxuXHRcdH07XHJcblxyXG5cclxuXHRcdGZ1bmN0aW9uIGRyYXdIaXRib3goZEN0eCwgc3ByaXRlUGFydCkge1xyXG5cdFx0XHRpZiAoIXNob3dIaXRCb3hlcylcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcclxuXHRcdFx0Y29uc3QgaGl0Ym94T2Zmc2V0WCA9IHNwcml0ZVBhcnQubGVuZ3RoID4gNiA/IHNwcml0ZVBhcnRbNl0gOiAwO1xyXG5cdFx0XHRjb25zdCBoaXRib3hPZmZzZXRZID0gc3ByaXRlUGFydC5sZW5ndGggPiA3ID8gc3ByaXRlUGFydFs3XSA6IDA7XHJcblxyXG5cdFx0XHQvLyBEcmF3IGhpdGJveGVzXHJcblx0XHRcdGZvciAoY29uc3QgYm94IGluIHRoYXQuZGF0YS5oaXRCb3hlcykge1xyXG5cdFx0XHRcdGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbCh0aGF0LmRhdGEuaGl0Qm94ZXMsIGJveCkpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGhpdEJveCA9IHRoYXQuZGF0YS5oaXRCb3hlc1tib3hdO1xyXG5cdFx0XHRcdFx0Y29uc3QgbGVmdCA9IGhpdEJveFswXSArIGhpdGJveE9mZnNldFg7XHJcblx0XHRcdFx0XHRjb25zdCB0b3AgPSBoaXRCb3hbMV0gKyBoaXRib3hPZmZzZXRZO1xyXG5cdFx0XHRcdFx0Y29uc3QgcmlnaHQgPSBoaXRCb3hbMl0gKyBoaXRib3hPZmZzZXRYO1xyXG5cdFx0XHRcdFx0Y29uc3QgYm90dG9tID0gaGl0Qm94WzNdICsgaGl0Ym94T2Zmc2V0WTtcclxuXHRcdFx0XHRcdGRDdHguc3Ryb2tlU3R5bGUgPSAneWVsbG93JztcclxuXHRcdFx0XHRcdGRDdHguc3Ryb2tlUmVjdCh0aGF0LmNhbnZhc1ggKyBsZWZ0LCB0aGF0LmNhbnZhc1kgKyB0b3AsIHJpZ2h0IC0gbGVmdCwgYm90dG9tIC0gdG9wKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnNldE1hcFBvc2l0aW9uID0gZnVuY3Rpb24gKHgsIHksIHopIHtcclxuXHRcdFx0aWYgKHR5cGVvZiB4ID09PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdHggPSB0aGF0Lm1hcFBvc2l0aW9uWzBdO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlb2YgeSA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0XHR5ID0gdGhhdC5tYXBQb3NpdGlvblsxXTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodHlwZW9mIHogPT09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0eiA9IHRoYXQubWFwUG9zaXRpb25bMl07XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhhdC56SW5kZXhlc09jY3VwaWVkID0gWyB6IF07XHJcblx0XHRcdH1cclxuXHRcdFx0dGhhdC5tYXBQb3NpdGlvbiA9IFt4LCB5LCB6XTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXRDYW52YXNQb3NpdGlvbiA9IGZ1bmN0aW9uIChjeCwgY3kpIHtcclxuXHRcdFx0aWYgKGN4KSB7XHJcblx0XHRcdFx0aWYgKE9iamVjdC5pc1N0cmluZyhjeCkgJiYgKGN4LmZpcnN0KCkgPT09ICcrJyB8fCBjeC5maXJzdCgpID09PSAnLScpKSBpbmNyZW1lbnRYKGN4KTtcclxuXHRcdFx0XHRlbHNlIHRoYXQuY2FudmFzWCA9IGN4O1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoY3kpIHtcclxuXHRcdFx0XHRpZiAoT2JqZWN0LmlzU3RyaW5nKGN5KSAmJiAoY3kuZmlyc3QoKSA9PT0gJysnIHx8IGN5LmZpcnN0KCkgPT09ICctJykpIGluY3JlbWVudFkoY3kpO1xyXG5cdFx0XHRcdGVsc2UgdGhhdC5jYW52YXNZID0gY3k7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nZXRDYW52YXNQb3NpdGlvblggPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiB0aGF0LmNhbnZhc1g7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZ2V0Q2FudmFzUG9zaXRpb25ZID0gZnVuY3Rpb24gICgpIHtcclxuXHRcdFx0cmV0dXJuIHRoYXQuY2FudmFzWTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nZXRMZWZ0SGl0Qm94RWRnZSA9IGZ1bmN0aW9uICh6SW5kZXgpIHtcclxuXHRcdFx0ekluZGV4ID0gekluZGV4IHx8IDA7XHJcblx0XHRcdGxldCBsaGJlID0gdGhpcy5nZXRDYW52YXNQb3NpdGlvblgoKTtcclxuXHRcdFx0Y29uc3QgaGl0Ym94ID0gZ2V0SGl0Qm94KHpJbmRleCk7XHJcblx0XHRcdGlmIChoaXRib3gpIHtcclxuXHRcdFx0XHRsaGJlICs9IGhpdGJveFswXTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gbGhiZTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nZXRUb3BIaXRCb3hFZGdlID0gZnVuY3Rpb24gKHpJbmRleCkge1xyXG5cdFx0XHR6SW5kZXggPSB6SW5kZXggfHwgMDtcclxuXHRcdFx0bGV0IHRoYmUgPSB0aGlzLmdldENhbnZhc1Bvc2l0aW9uWSgpO1xyXG5cdFx0XHRjb25zdCBoaXRib3ggPSBnZXRIaXRCb3goekluZGV4KTtcclxuXHRcdFx0aWYgKGhpdGJveCkge1xyXG5cdFx0XHRcdHRoYmUgKz0gaGl0Ym94WzFdO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB0aGJlO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmdldFJpZ2h0SGl0Qm94RWRnZSA9IGZ1bmN0aW9uICh6SW5kZXgpIHtcclxuXHRcdFx0ekluZGV4ID0gekluZGV4IHx8IDA7XHJcblxyXG5cdFx0XHRjb25zdCBoaXRib3ggPSBnZXRIaXRCb3goekluZGV4KTtcclxuXHRcdFx0aWYgKGhpdGJveCkge1xyXG5cdFx0XHRcdHJldHVybiB0aGF0LmNhbnZhc1ggKyBoaXRib3hbMl07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB0aGF0LmNhbnZhc1ggKyB0aGF0LndpZHRoO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmdldEJvdHRvbUhpdEJveEVkZ2UgPSBmdW5jdGlvbiAoekluZGV4KSB7XHJcblx0XHRcdHpJbmRleCA9IHpJbmRleCB8fCAwO1xyXG5cclxuXHRcdFx0Y29uc3QgaGl0Ym94ID0gZ2V0SGl0Qm94KHpJbmRleCk7XHJcblx0XHRcdGlmIChoaXRib3gpIHtcclxuXHRcdFx0XHRyZXR1cm4gdGhhdC5jYW52YXNZICsgaGl0Ym94WzNdO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gdGhhdC5jYW52YXNZICsgdGhhdC5oZWlnaHQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZ2V0UG9zaXRpb25JbkZyb250T2YgPSBmdW5jdGlvbiAgKCkge1xyXG5cdFx0XHRyZXR1cm4gW3RoYXQuY2FudmFzWCwgdGhhdC5jYW52YXNZICsgdGhhdC5oZWlnaHRdO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnNldFNwZWVkID0gZnVuY3Rpb24gKHMpIHtcclxuXHRcdFx0dGhhdC5sYXN0U3BlZWQgPSB0aGF0LnNwZWVkO1xyXG5cdFx0XHR0aGF0LnNwZWVkID0gcztcclxuXHRcdFx0dGhhdC5zcGVlZFggPSBzO1xyXG5cdFx0XHR0aGF0LnNwZWVkWSA9IHM7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuaW5jcmVtZW50U3BlZWRCeSA9IGZ1bmN0aW9uIChzKSB7XHJcblx0XHRcdHRoYXQuc3BlZWQgKz0gcztcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5nZXRTcGVlZCA9IGZ1bmN0aW9uIGdldFNwZWVkICgpIHtcclxuXHRcdFx0cmV0dXJuIHRoYXQuc3BlZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuZ2V0U3BlZWRYID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gdGhhdC5zcGVlZDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5nZXRTcGVlZFkgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiB0aGF0LnNwZWVkO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnNldEhlaWdodCA9IGZ1bmN0aW9uIChoKSB7XHJcblx0XHRcdHRoYXQuaGVpZ2h0ID0gaDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXRXaWR0aCA9IGZ1bmN0aW9uICh3KSB7XHJcblx0XHRcdHRoYXQud2lkdGggPSB3O1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmdldE1heEhlaWdodCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIHRoYXQubWF4SGVpZ2h0O1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmdldE1vdmluZ1Rvd2FyZE9wcG9zaXRlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRpZiAoIXRoYXQuaXNNb3ZpbmcpIHtcclxuXHRcdFx0XHRyZXR1cm4gWzAsIDBdO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgZHggPSAodGhhdC5tb3ZpbmdUb3dhcmRbMF0gLSB0aGF0Lm1hcFBvc2l0aW9uWzBdKTtcclxuXHRcdFx0dmFyIGR5ID0gKHRoYXQubW92aW5nVG93YXJkWzFdIC0gdGhhdC5tYXBQb3NpdGlvblsxXSk7XHJcblxyXG5cdFx0XHR2YXIgb3Bwb3NpdGVYID0gKE1hdGguYWJzKGR4KSA+IDc1ID8gMCAtIGR4IDogMCk7XHJcblx0XHRcdHZhciBvcHBvc2l0ZVkgPSAtZHk7XHJcblxyXG5cdFx0XHRyZXR1cm4gWyBvcHBvc2l0ZVgsIG9wcG9zaXRlWSBdO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmNoZWNrSGl0dGFibGVPYmplY3RzID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRPYmplY3Qua2V5cyhoaXR0YWJsZU9iamVjdHMsIGZ1bmN0aW9uIChrLCBvYmplY3REYXRhKSB7XHJcblx0XHRcdFx0aWYgKG9iamVjdERhdGEub2JqZWN0LmRlbGV0ZWQpIHtcclxuXHRcdFx0XHRcdGRlbGV0ZSBoaXR0YWJsZU9iamVjdHNba107XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGlmIChvYmplY3REYXRhLm9iamVjdC5oaXRzKHRoYXQpKSB7XHJcblx0XHRcdFx0XHRcdG9iamVjdERhdGEuY2FsbGJhY2tzLmVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcblx0XHRcdFx0XHRcdFx0Y2FsbGJhY2sodGhhdCwgb2JqZWN0RGF0YS5vYmplY3QpO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmN5Y2xlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR0aGF0LmNoZWNrSGl0dGFibGVPYmplY3RzKCk7XHJcblxyXG5cdFx0XHRpZiAodHJhY2tlZFNwcml0ZVRvTW92ZVRvd2FyZCkge1xyXG5cdFx0XHRcdHRoYXQuc2V0TWFwUG9zaXRpb25UYXJnZXQodHJhY2tlZFNwcml0ZVRvTW92ZVRvd2FyZC5tYXBQb3NpdGlvblswXSwgdHJhY2tlZFNwcml0ZVRvTW92ZVRvd2FyZC5tYXBQb3NpdGlvblsxXSwgdHJ1ZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdG1vdmUoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXRNYXBQb3NpdGlvblRhcmdldCA9IGZ1bmN0aW9uICh4LCB5LCBvdmVycmlkZSkge1xyXG5cdFx0XHRpZiAob3ZlcnJpZGUpIHtcclxuXHRcdFx0XHR0aGF0Lm1vdmluZ1dpdGhDb252aWN0aW9uID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICghdGhhdC5tb3ZpbmdXaXRoQ29udmljdGlvbikge1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgeCA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0XHRcdHggPSB0aGF0Lm1vdmluZ1Rvd2FyZFswXTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmICh0eXBlb2YgeSA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0XHRcdHkgPSB0aGF0Lm1vdmluZ1Rvd2FyZFsxXTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHRoYXQubW92aW5nVG93YXJkID0gWyB4LCB5IF07XHJcblxyXG5cdFx0XHRcdHRoYXQubW92aW5nV2l0aENvbnZpY3Rpb24gPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gdGhhdC5yZXNldERpcmVjdGlvbigpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnNldERpcmVjdGlvbiA9IGZ1bmN0aW9uIChhbmdsZSkge1xyXG5cdFx0XHRpZiAoYW5nbGUgPj0gMzYwKSB7XHJcblx0XHRcdFx0YW5nbGUgPSAzNjAgLSBhbmdsZTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGF0LmRpcmVjdGlvbiA9IGFuZ2xlO1xyXG5cdFx0XHR0aGF0Lm1vdmluZ1Rvd2FyZCA9IHVuZGVmaW5lZDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5yZXNldERpcmVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dGhhdC5kaXJlY3Rpb24gPSB1bmRlZmluZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0TWFwUG9zaXRpb25UYXJnZXRXaXRoQ29udmljdGlvbiA9IGZ1bmN0aW9uIChjeCwgY3kpIHtcclxuXHRcdFx0dGhhdC5zZXRNYXBQb3NpdGlvblRhcmdldChjeCwgY3kpO1xyXG5cdFx0XHR0aGF0Lm1vdmluZ1dpdGhDb252aWN0aW9uID0gdHJ1ZTtcclxuXHRcdFx0Ly8gdGhhdC5yZXNldERpcmVjdGlvbigpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmZvbGxvdyA9IGZ1bmN0aW9uIChzcHJpdGUpIHtcclxuXHRcdFx0dHJhY2tlZFNwcml0ZVRvTW92ZVRvd2FyZCA9IHNwcml0ZTtcclxuXHRcdFx0Ly8gdGhhdC5yZXNldERpcmVjdGlvbigpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnN0b3BGb2xsb3dpbmcgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRyYWNrZWRTcHJpdGVUb01vdmVUb3dhcmQgPSBmYWxzZTtcclxuXHJcblx0XHRcdC8vIFJlbW92ZSBpdGVtcyB0aGF0IGFyZSBubyBsb25nZXIgZm9sbG93aW5nIHBsYXllclxyXG5cdFx0XHRzZXRUaW1lb3V0KHRoYXQuZGVsZXRlT25OZXh0Q3ljbGUsIDUwMDApO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLm9uSGl0dGluZyA9IGZ1bmN0aW9uIChvYmplY3RUb0hpdCwgY2FsbGJhY2spIHtcclxuXHRcdFx0aWYgKGhpdHRhYmxlT2JqZWN0c1tvYmplY3RUb0hpdC5pZF0pIHtcclxuXHRcdFx0XHRyZXR1cm4gaGl0dGFibGVPYmplY3RzW29iamVjdFRvSGl0LmlkXS5jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGhpdHRhYmxlT2JqZWN0c1tvYmplY3RUb0hpdC5pZF0gPSB7XHJcblx0XHRcdFx0b2JqZWN0OiBvYmplY3RUb0hpdCxcclxuXHRcdFx0XHRjYWxsYmFja3M6IFsgY2FsbGJhY2sgXVxyXG5cdFx0XHR9O1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmRlbGV0ZU9uTmV4dEN5Y2xlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR0aGF0LmRlbGV0ZWQgPSB0cnVlO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLm9jY3VwaWVzWkluZGV4ID0gZnVuY3Rpb24gKHopIHtcclxuXHRcdFx0cmV0dXJuIHpJbmRleGVzT2NjdXBpZWQuaW5kZXhPZih6KSA+PSAwO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmhpdHMgPSBmdW5jdGlvbiAob3RoZXIpIHtcclxuXHRcdFx0Y29uc3QgcmVjdDF4ID0gb3RoZXIuZ2V0TGVmdEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSk7XHJcblx0XHRcdGNvbnN0IHJlY3QxdyA9IG90aGVyLmdldFJpZ2h0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSAtIHJlY3QxeDtcclxuXHJcblx0XHRcdGNvbnN0IHJlY3QxeSA9IG90aGVyLmdldFRvcEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSk7XHJcblx0XHRcdGNvbnN0IHJlY3QxaCA9IG90aGVyLmdldEJvdHRvbUhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgLSByZWN0MXk7XHJcblxyXG5cdFx0XHQvLyBHZXQgaGl0Ym94IG9mZnNldCB3aGVuIHNwZWNpZmllZFxyXG5cdFx0XHRjb25zdCBpc2FycmF5ID0gQXJyYXkuaXNBcnJheSh0aGF0LmN1cnJlbnRGcmFtZSk7XHJcblx0XHRcdGNvbnN0IGhpdGJveE9mZnNldFggPSAgaXNhcnJheSAmJiB0aGF0LmN1cnJlbnRGcmFtZS5sZW5ndGggPiA2ID8gdGhhdC5jdXJyZW50RnJhbWVbNl0gOiAwO1xyXG5cdFx0XHRjb25zdCBoaXRib3hPZmZzZXRZID0gaXNhcnJheSAmJiB0aGF0LmN1cnJlbnRGcmFtZS5sZW5ndGggPiA3ID8gdGhhdC5jdXJyZW50RnJhbWVbN10gOiAwO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVjdDJ4ID0gdGhhdC5nZXRMZWZ0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSArIGhpdGJveE9mZnNldFg7XHJcblx0XHRcdGNvbnN0IHJlY3QydyA9IHRoYXQuZ2V0UmlnaHRIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pIC0gcmVjdDJ4ICsgaGl0Ym94T2Zmc2V0WDtcclxuXHRcdFx0Y29uc3QgcmVjdDJ5ID0gdGhhdC5nZXRUb3BIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pICsgaGl0Ym94T2Zmc2V0WTtcclxuXHRcdFx0Y29uc3QgcmVjdDJoID0gdGhhdC5nZXRCb3R0b21IaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pIC0gcmVjdDJ5ICsgaGl0Ym94T2Zmc2V0WTtcclxuXHJcblx0XHRcdGlmIChyZWN0MXggPCByZWN0MnggKyByZWN0MncgJiZcclxuXHRcdFx0XHRyZWN0MXggKyByZWN0MXcgPiByZWN0MnggJiZcclxuXHRcdFx0XHRyZWN0MXkgPCByZWN0MnkgKyByZWN0MmggJiZcclxuXHRcdFx0XHRyZWN0MWggKyByZWN0MXkgPiByZWN0MnkpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdFx0Ly8gT3JpZ2luYWwgY29sbGlzaW9uIGRldGVjdGlvbjpcclxuXHRcdFx0LyogdmFyIHZlcnRpY2FsSW50ZXJzZWN0ID0gZmFsc2U7XHJcblx0XHRcdHZhciBob3Jpem9udGFsSW50ZXJzZWN0ID0gZmFsc2U7XHJcblxyXG5cdFx0XHQvLyBUZXN0IHRoYXQgVEhJUyBoYXMgYSBib3R0b20gZWRnZSBpbnNpZGUgb2YgdGhlIG90aGVyIG9iamVjdFxyXG5cdFx0XHRpZiAob3RoZXIuZ2V0VG9wSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSA8PSB0aGF0LmdldEJvdHRvbUhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgJiYgb3RoZXIuZ2V0Qm90dG9tSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSA+PSB0aGF0LmdldEJvdHRvbUhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkpIHtcclxuXHRcdFx0XHR2ZXJ0aWNhbEludGVyc2VjdCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRlc3QgdGhhdCBUSElTIGhhcyBhIHRvcCBlZGdlIGluc2lkZSBvZiB0aGUgb3RoZXIgb2JqZWN0XHJcblx0XHRcdGlmIChvdGhlci5nZXRUb3BIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pIDw9IHRoYXQuZ2V0VG9wSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSAmJiBvdGhlci5nZXRCb3R0b21IaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pID49IHRoYXQuZ2V0VG9wSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSkge1xyXG5cdFx0XHRcdHZlcnRpY2FsSW50ZXJzZWN0ID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVGVzdCB0aGF0IFRISVMgaGFzIGEgcmlnaHQgZWRnZSBpbnNpZGUgb2YgdGhlIG90aGVyIG9iamVjdFxyXG5cdFx0XHRpZiAob3RoZXIuZ2V0TGVmdEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgPD0gdGhhdC5nZXRSaWdodEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgJiYgb3RoZXIuZ2V0UmlnaHRIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pID49IHRoYXQuZ2V0UmlnaHRIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pKSB7XHJcblx0XHRcdFx0aG9yaXpvbnRhbEludGVyc2VjdCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRlc3QgdGhhdCBUSElTIGhhcyBhIGxlZnQgZWRnZSBpbnNpZGUgb2YgdGhlIG90aGVyIG9iamVjdFxyXG5cdFx0XHRpZiAob3RoZXIuZ2V0TGVmdEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgPD0gdGhhdC5nZXRMZWZ0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSAmJiBvdGhlci5nZXRSaWdodEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgPj0gdGhhdC5nZXRMZWZ0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSkge1xyXG5cdFx0XHRcdGhvcml6b250YWxJbnRlcnNlY3QgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gdmVydGljYWxJbnRlcnNlY3QgJiYgaG9yaXpvbnRhbEludGVyc2VjdDsgKi9cclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5pc0Fib3ZlT25DYW52YXMgPSBmdW5jdGlvbiAoY3kpIHtcclxuXHRcdFx0cmV0dXJuICh0aGF0LmNhbnZhc1kgKyB0aGF0LmhlaWdodCkgPCBjeTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5pc0JlbG93T25DYW52YXMgPSBmdW5jdGlvbiAoY3kpIHtcclxuXHRcdFx0cmV0dXJuICh0aGF0LmNhbnZhc1kpID4gY3k7XHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiB0aGF0O1xyXG5cdH1cclxuXHJcblx0U3ByaXRlLmNyZWF0ZU9iamVjdHMgPSBmdW5jdGlvbiBjcmVhdGVPYmplY3RzKHNwcml0ZUluZm9BcnJheSwgb3B0cykge1xyXG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KHNwcml0ZUluZm9BcnJheSkpIHNwcml0ZUluZm9BcnJheSA9IFsgc3ByaXRlSW5mb0FycmF5IF07XHJcblx0XHRvcHRzID0gT2JqZWN0Lm1lcmdlKG9wdHMsIHtcclxuXHRcdFx0cmF0ZU1vZGlmaWVyOiAwLFxyXG5cdFx0XHRkcm9wUmF0ZTogMSxcclxuXHRcdFx0cG9zaXRpb246IFswLCAwXVxyXG5cdFx0fSwgZmFsc2UsIGZhbHNlKTtcclxuXHJcblx0XHR2YXIgQW5pbWF0ZWRTcHJpdGUgPSByZXF1aXJlKCcuL2FuaW1hdGVkU3ByaXRlJyk7XHJcblxyXG5cdFx0ZnVuY3Rpb24gY3JlYXRlT25lIChzcHJpdGVJbmZvKSB7XHJcblx0XHRcdHZhciBwb3NpdGlvbiA9IG9wdHMucG9zaXRpb247XHJcblx0XHRcdGlmIChOdW1iZXIucmFuZG9tKDEwMCArIG9wdHMucmF0ZU1vZGlmaWVyKSA8PSBzcHJpdGVJbmZvLmRyb3BSYXRlKSB7XHJcblx0XHRcdFx0dmFyIHNwcml0ZTtcclxuXHRcdFx0XHRpZiAoc3ByaXRlSW5mby5zcHJpdGUuYW5pbWF0ZWQpIHtcclxuXHRcdFx0XHRcdHNwcml0ZSA9IG5ldyBBbmltYXRlZFNwcml0ZShzcHJpdGVJbmZvLnNwcml0ZSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHNwcml0ZSA9IG5ldyBTcHJpdGUoc3ByaXRlSW5mby5zcHJpdGUpO1xyXG5cdFx0XHRcdH1cdFxyXG5cclxuXHRcdFx0XHRzcHJpdGUuc2V0U3BlZWQoMCk7XHJcblxyXG5cdFx0XHRcdGlmIChPYmplY3QuaXNGdW5jdGlvbihwb3NpdGlvbikpIHtcclxuXHRcdFx0XHRcdHBvc2l0aW9uID0gcG9zaXRpb24oKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHNwcml0ZS5zZXRNYXBQb3NpdGlvbihwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xyXG5cclxuXHRcdFx0XHRpZiAoc3ByaXRlSW5mby5zcHJpdGUuaGl0QmVoYXZpb3VyICYmIHNwcml0ZUluZm8uc3ByaXRlLmhpdEJlaGF2aW91ci5wbGF5ZXIgJiYgb3B0cy5wbGF5ZXIpIHtcclxuXHRcdFx0XHRcdHNwcml0ZS5vbkhpdHRpbmcob3B0cy5wbGF5ZXIsIHNwcml0ZUluZm8uc3ByaXRlLmhpdEJlaGF2aW91ci5wbGF5ZXIpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0cmV0dXJuIHNwcml0ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBvYmplY3RzID0gc3ByaXRlSW5mb0FycmF5Lm1hcChjcmVhdGVPbmUpLnJlbW92ZSh1bmRlZmluZWQpO1xyXG5cclxuXHRcdHJldHVybiBvYmplY3RzO1xyXG5cdH07XHJcblxyXG5cdGdsb2JhbC5zcHJpdGUgPSBTcHJpdGU7XHJcbn0pKCB0aGlzICk7XHJcblxyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSB0aGlzLnNwcml0ZTtcclxufSIsIihmdW5jdGlvbiAoZ2xvYmFsKSB7XHJcblx0ZnVuY3Rpb24gU3ByaXRlQXJyYXkoKSB7XHJcblx0XHR0aGlzLnB1c2hIYW5kbGVycyA9IFtdO1xyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH1cclxuXHJcblx0U3ByaXRlQXJyYXkucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShBcnJheS5wcm90b3R5cGUpO1xyXG5cclxuXHRTcHJpdGVBcnJheS5wcm90b3R5cGUub25QdXNoID0gZnVuY3Rpb24oZiwgcmV0cm9hY3RpdmUpIHtcclxuXHRcdHRoaXMucHVzaEhhbmRsZXJzLnB1c2goZik7XHJcblxyXG5cdFx0aWYgKHJldHJvYWN0aXZlKSB7XHJcblx0XHRcdHRoaXMuZWFjaChmKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRTcHJpdGVBcnJheS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uKG9iaikge1xyXG5cdFx0QXJyYXkucHJvdG90eXBlLnB1c2guY2FsbCh0aGlzLCBvYmopO1xyXG5cdFx0dGhpcy5wdXNoSGFuZGxlcnMuZWFjaChmdW5jdGlvbihoYW5kbGVyKSB7XHJcblx0XHRcdGhhbmRsZXIob2JqKTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdFNwcml0ZUFycmF5LnByb3RvdHlwZS5jdWxsID0gZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLmVhY2goZnVuY3Rpb24gKG9iaiwgaSkge1xyXG5cdFx0XHRpZiAob2JqLmRlbGV0ZWQpIHtcclxuXHRcdFx0XHRyZXR1cm4gKGRlbGV0ZSB0aGlzW2ldKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0Z2xvYmFsLnNwcml0ZUFycmF5ID0gU3ByaXRlQXJyYXk7XHJcbn0pKHRoaXMpO1xyXG5cclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG5cdG1vZHVsZS5leHBvcnRzID0gdGhpcy5zcHJpdGVBcnJheTtcclxufSIsIi8vIEdsb2JhbCBkZXBlbmRlbmNpZXMgd2hpY2ggcmV0dXJuIG5vIG1vZHVsZXNcclxucmVxdWlyZSgnLi9saWIvY2FudmFzUmVuZGVyaW5nQ29udGV4dDJERXh0ZW5zaW9ucycpO1xyXG5yZXF1aXJlKCcuL2xpYi9leHRlbmRlcnMnKTtcclxucmVxdWlyZSgnLi9saWIvcGx1Z2lucycpO1xyXG5cclxuLy8gRXh0ZXJuYWwgZGVwZW5kZW5jaWVzXHJcbnZhciBNb3VzZXRyYXAgPSByZXF1aXJlKCdici1tb3VzZXRyYXAnKTtcclxuXHJcbi8vIE1ldGhvZCBtb2R1bGVzXHJcbnZhciBpc01vYmlsZURldmljZSA9IHJlcXVpcmUoJy4vbGliL2lzTW9iaWxlRGV2aWNlJyk7XHJcblxyXG4vLyBHYW1lIE9iamVjdHNcclxudmFyIFNwcml0ZUFycmF5ID0gcmVxdWlyZSgnLi9saWIvc3ByaXRlQXJyYXknKTtcclxudmFyIE1vbnN0ZXIgPSByZXF1aXJlKCcuL2xpYi9tb25zdGVyJyk7XHJcbnZhciBBbmltYXRlZFNwcml0ZSA9IHJlcXVpcmUoJy4vbGliL2FuaW1hdGVkU3ByaXRlJyk7XHJcbnZhciBTcHJpdGUgPSByZXF1aXJlKCcuL2xpYi9zcHJpdGUnKTtcclxudmFyIFBsYXllciA9IHJlcXVpcmUoJy4vbGliL3BsYXllcicpO1xyXG52YXIgR2FtZUh1ZCA9IHJlcXVpcmUoJy4vbGliL2dhbWVIdWQnKTtcclxudmFyIEdhbWUgPSByZXF1aXJlKCcuL2xpYi9nYW1lJyk7XHJcblxyXG4vLyBMb2NhbCB2YXJpYWJsZXMgZm9yIHN0YXJ0aW5nIHRoZSBnYW1lXHJcbnZhciBtYWluQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWUtY2FudmFzJyk7XHJcbnZhciBkQ29udGV4dCA9IG1haW5DYW52YXMuZ2V0Q29udGV4dCgnMmQnLCB7IGFscGhhOiBmYWxzZSB9KTtcclxuXHJcbnZhciBpbWFnZVNvdXJjZXMgPSBbICdhc3NldHMvYmFja2dyb3VuZC5qcGcnLCAnYXNzZXRzL2NhcnQtc3ByaXRlcy5wbmcnLCAnYXNzZXRzL3N0YXJ0c2lnbi1zcHJpdGUucG5nJywgJ2Fzc2V0cy9vaWxzbGljay1zcHJpdGUucG5nJywgXHJcblx0J2Fzc2V0cy90b2tlbi1zcHJpdGVzLnBuZycsICdhc3NldHMvbWlsa3NoYWtlLXNwcml0ZS5wbmcnLCAnYXNzZXRzL21hbG9yZC1zcHJpdGVzLnBuZycsXHJcblx0J2Fzc2V0cy9oYXRndXktc3ByaXRlcy5wbmcnLCAnYXNzZXRzL3BpbG90LXNwcml0ZXMucG5nJywgJ2Fzc2V0cy9yb21hbnNvbGRpZXItc3ByaXRlcy5wbmcnLCAnYXNzZXRzL3NrZWxldG9uLXNwcml0ZXMucG5nJyxcclxuXHQnYXNzZXRzL3RyYWZmaWMtY29uZS1sYXJnZS5wbmcnLCAnYXNzZXRzL3RyYWZmaWMtY29uZS1zbWFsbC5wbmcnLCAnYXNzZXRzL2dhcmJhZ2UtY2FuLnBuZycsICdhc3NldHMvcmFtcC1zcHJpdGUucG5nJyBdO1xyXG5cclxudmFyIHBsYXlTb3VuZDtcclxudmFyIHNvdW5kcyA9IHsgJ3RyYWNrMSc6ICdhc3NldHMvbXVzaWMvdHJhY2sxLm9nZycsXHJcblx0XHRcdCAgICd0cmFjazInOiAnYXNzZXRzL211c2ljL3RyYWNrMi5vZ2cnLFxyXG5cdFx0XHQgICAndHJhY2szJzogJ2Fzc2V0cy9tdXNpYy90cmFjazMub2dnJyxcclxuXHRcdFx0ICAgJ2dhbWVPdmVyJzogJ2Fzc2V0cy9tdXNpYy9nYW1lb3Zlci5vZ2cnIH07XHJcbnZhciBjdXJyZW50VHJhY2s7XHJcbnZhciBwbGF5aW5nVHJhY2tOdW1iZXIgPSAxO1xyXG5cclxudmFyIGdsb2JhbCA9IHRoaXM7XHJcbnZhciBzcHJpdGVzID0gcmVxdWlyZSgnLi9zcHJpdGVJbmZvJyk7XHJcbmNvbnN0IG1vbnN0ZXIgPSByZXF1aXJlKCcuL2xpYi9tb25zdGVyJyk7XHJcblxyXG52YXIgcGl4ZWxzUGVyTWV0cmUgPSAxODtcclxudmFyIG1vbnN0ZXJEaXN0YW5jZVRocmVzaG9sZCA9IDIwMDA7XHJcbmNvbnN0IHRvdGFsTGl2ZXMgPSA1O1xyXG52YXIgbGl2ZXNMZWZ0ID0gdG90YWxMaXZlcztcclxudmFyIGhpZ2hTY29yZSA9IDA7XHJcblxyXG4vL3NvdXJjZTogaHR0cHM6Ly9naXRodWIuY29tL2JyeWMvY29kZS9ibG9iL21hc3Rlci9qc2hhc2gvZXhwZXJpbWVudGFsL2N5cmI1My5qc1xyXG5jb25zdCBjeXJiNTMgPSBmdW5jdGlvbihzdHIsIHMgPSAwKSB7XHJcblx0bGV0IGgxID0gMHhkZWFkYmVlZiBeIHMsIGgyID0gMHg0MWM2Y2U1NyBeIHM7XHJcblx0Zm9yIChsZXQgaSA9IDAsIGNoOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRjaCA9IHN0ci5jaGFyQ29kZUF0KGkpO1xyXG5cdFx0aDEgPSBNYXRoLmltdWwoaDEgXiBjaCwgMjY1NDQzNTc2MSk7XHJcblx0XHRoMiA9IE1hdGguaW11bChoMiBeIGNoLCAxNTk3MzM0Njc3KTtcclxuXHR9XHJcblx0aDEgPSBNYXRoLmltdWwoaDEgXiAoaDE+Pj4xNiksIDIyNDY4MjI1MDcpIF4gTWF0aC5pbXVsKGgyIF4gKGgyPj4+MTMpLCAzMjY2NDg5OTA5KTtcclxuXHRoMiA9IE1hdGguaW11bChoMiBeIChoMj4+PjE2KSwgMjI0NjgyMjUwNykgXiBNYXRoLmltdWwoaDEgXiAoaDE+Pj4xMyksIDMyNjY0ODk5MDkpO1xyXG5cdHJldHVybiA0Mjk0OTY3Mjk2ICogKDIwOTcxNTEgJiBoMikgKyAoaDE+Pj4wKTtcclxufTtcclxuXHJcbmNvbnN0IGdhbWVJbmZvID0ge1xyXG5cdGRpc3RhbmNlOiAwLFxyXG5cdG1vbmV5OiAwLFxyXG5cdHRva2VuczogMCxcclxuXHRwb2ludHM6IDAsXHJcblx0Y2FuczogMCxcclxuXHRsZXZlbEJvb3N0OiAwLFxyXG5cdGdhbWVFbmREYXRlVGltZTogbnVsbCxcclxuXHJcblx0Z29kOiBmYWxzZSxcclxuXHJcblx0cmVzZXQoKSB7XHJcblx0XHR0aGlzLmRpc3RhbmNlID0gMDtcclxuXHRcdHRoaXMubW9uZXkgPSAwO1xyXG5cdFx0dGhpcy50b2tlbnMgPSAwO1xyXG5cdFx0dGhpcy5wb2ludHMgPSAwO1xyXG5cdFx0dGhpcy5jYW5zID0gMDtcclxuXHRcdHRoaXMubGV2ZWxCb29zdCA9IDA7XHJcblx0XHR0aGlzLmdhbWVFbmREYXRlVGltZSA9IG51bGw7XHJcblx0fSxcclxuXHJcblx0Z2V0TGV2ZWwoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5kaXN0YW5jZSA8IDEwMCA/IDEgXHJcblx0XHRcdDogTWF0aC5mbG9vcih0aGlzLmRpc3RhbmNlIC8gMTAwKSArIHRoaXMubGV2ZWxCb29zdDtcclxuXHR9LFxyXG5cclxuXHRnZXRTY29yZSgpIHtcclxuXHRcdHJldHVybiAodGhpcy5nZXRMZXZlbCgpICogMTAwKVxyXG5cdFx0XHQrICh0aGlzLnRva2VucyAqIDEwKVxyXG5cdFx0XHQrICh0aGlzLmRpc3RhbmNlICogMTApO1xyXG5cdH0sXHJcblxyXG5cdGdldEZvcm1hdHRlZFNjb3JlKCkge1xyXG5cdFx0Y29uc3QgZCA9IHRoaXMuZ2FtZUVuZERhdGVUaW1lO1xyXG5cdFx0cmV0dXJuICfwn5uSIENhcnRXYXJzIC0gU2VyaW91cyBTaG9wcGVyIPCfm5InXHJcblx0XHRcdCsgJ1xcbkRhdGU6ICcgKyBkLmdldE1vbnRoKCkgKyAnLycgKyBkLmdldERhdGUoKSArICcvJyArIGQuZ2V0RnVsbFllYXIoKSArICcgJ1xyXG5cdFx0XHRcdCsgKCcwMCcgKyBkLmdldEhvdXJzKCkpLnNsaWNlKC0yKSArICc6JyArICgnMDAnICsgZC5nZXRNaW51dGVzKCkpLnNsaWNlKC0yKSArICc6JyArICgnMDAnICsgZC5nZXRTZWNvbmRzKCkpLnNsaWNlKC0yKVxyXG5cdFx0XHQrICdcXG5MZXZlbDogJyArIHRoaXMuZ2V0TGV2ZWwoKVxyXG5cdFx0XHQrICdcXG5Ub2tlbnM6ICcgKyB0aGlzLnRva2Vuc1xyXG5cdFx0XHQrICdcXG5EaXN0YW5jZTogJyArIHRoaXMuZGlzdGFuY2UgKyAnbSdcclxuXHRcdFx0KyAnXFxuVG90YWwgU2NvcmU6ICcgKyB0aGlzLmdldFNjb3JlKClcclxuXHRcdFx0KyAnXFxuQ29kZTogJyArIGN5cmI1Myh0aGlzLmdldExldmVsKCkudG9TdHJpbmcoKSArIHRoaXMudG9rZW5zLnRvU3RyaW5nKClcclxuXHRcdFx0XHQrIHRoaXMuZGlzdGFuY2UudG9TdHJpbmcoKSArIHRoaXMuZ2V0U2NvcmUoKS50b1N0cmluZygpLCBcclxuXHRcdFx0XHRkLmdldERhdGUoKSArIGQuZ2V0TW9udGgoKSArIGQuZ2V0RnVsbFllYXIoKSArIGQuZ2V0SG91cnMoKSArIGQuZ2V0TWludXRlcygpKS50b1N0cmluZygzNik7XHJcblx0fSxcclxufTtcclxuXHJcbnZhciBkcm9wUmF0ZXMgPSB7IHRyYWZmaWNDb25lTGFyZ2U6IDEsIHRyYWZmaWNDb25lU21hbGw6IDEsIGdhcmJhZ2VDYW46IDEsIGp1bXA6IDEsIG9pbFNsaWNrOiAxLCBcclxuXHRcdFx0XHQgIHRva2VuOiAzLCBtaWxrc2hha2U6IDF9O1xyXG5pZiAobG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2hpZ2hTY29yZScpKSBoaWdoU2NvcmUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnaGlnaFNjb3JlJyk7XHJcblxyXG5mdW5jdGlvbiBsb2FkSW1hZ2VzIChzb3VyY2VzLCBuZXh0KSB7XHJcblx0dmFyIGxvYWRlZCA9IDA7XHJcblx0dmFyIGltYWdlcyA9IHt9O1xyXG5cclxuXHRmdW5jdGlvbiBmaW5pc2ggKCkge1xyXG5cdFx0bG9hZGVkICs9IDE7XHJcblx0XHRpZiAobG9hZGVkID09PSBzb3VyY2VzLmxlbmd0aCkge1xyXG5cdFx0XHRuZXh0KGltYWdlcyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzb3VyY2VzLmVhY2goZnVuY3Rpb24gKHNyYykge1xyXG5cdFx0dmFyIGltID0gbmV3IEltYWdlKCk7XHJcblx0XHRpbS5vbmxvYWQgPSBmaW5pc2g7XHJcblx0XHRpbS5zcmMgPSBzcmM7XHJcblx0XHRkQ29udGV4dC5zdG9yZUxvYWRlZEltYWdlKHNyYywgaW0pO1xyXG5cdH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBfY2hlY2tBdWRpb1N0YXRlKHNvdW5kKSB7XHJcblx0LyogaWYgKHNvdW5kc1tzb3VuZF0uc3RhdHVzID09PSAnbG9hZGluZycgJiYgc291bmRzW3NvdW5kXS5yZWFkeVN0YXRlID09PSA0KSB7XHJcblx0XHRhc3NldExvYWRlZC5jYWxsKHRoaXMsICdzb3VuZHMnLCBzb3VuZCk7XHJcblx0fSAqL1xyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkU291bmRzICgpIHtcclxuXHRmb3IgKHZhciBzb3VuZCBpbiBzb3VuZHMpIHtcclxuXHRcdGlmIChzb3VuZHMuaGFzT3duUHJvcGVydHkoc291bmQpKSB7XHJcblx0XHRcdHNyYyA9IHNvdW5kc1tzb3VuZF07XHJcblx0XHRcdC8vIGNyZWF0ZSBhIGNsb3N1cmUgZm9yIGV2ZW50IGJpbmRpbmdcclxuXHRcdFx0KGZ1bmN0aW9uKHNvdW5kKSB7XHJcblx0XHRcdFx0c291bmRzW3NvdW5kXSA9IG5ldyBBdWRpbygpO1xyXG5cdFx0XHRcdHNvdW5kc1tzb3VuZF0uc3RhdHVzID0gJ2xvYWRpbmcnO1xyXG5cdFx0XHRcdHNvdW5kc1tzb3VuZF0ubmFtZSA9IHNvdW5kO1xyXG5cdFx0XHRcdHNvdW5kc1tzb3VuZF0uYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheScsIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0X2NoZWNrQXVkaW9TdGF0ZS5jYWxsKHNvdW5kKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRzb3VuZHNbc291bmRdLnNyYyA9IHNyYztcclxuXHRcdFx0XHRzb3VuZHNbc291bmRdLnByZWxvYWQgPSAnYXV0byc7XHJcblx0XHRcdFx0c291bmRzW3NvdW5kXS5sb2FkKCk7XHJcblx0XHRcdH0pKHNvdW5kKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vbnN0ZXJIaXRzUGxheWVyQmVoYXZpb3VyKG1vbnN0ZXIsIHBsYXllcikge1xyXG5cdHBsYXllci5pc0VhdGVuQnkobW9uc3RlciwgZnVuY3Rpb24gKCkge1xyXG5cdFx0bW9uc3Rlci5pc0Z1bGwgPSB0cnVlO1xyXG5cdFx0bW9uc3Rlci5pc0VhdGluZyA9IGZhbHNlO1xyXG5cdFx0Ly9wbGF5ZXIuaXNCZWluZ0VhdGVuID0gZmFsc2U7XHJcblx0XHRtb25zdGVyLnNldFNwZWVkKHBsYXllci5nZXRTcGVlZCgpKTtcclxuXHRcdG1vbnN0ZXIuc3RvcEZvbGxvd2luZygpO1xyXG5cdFx0dmFyIHJhbmRvbVBvc2l0aW9uQWJvdmUgPSBkQ29udGV4dC5nZXRSYW5kb21NYXBQb3NpdGlvbkFib3ZlVmlld3BvcnQoKTtcclxuXHRcdG1vbnN0ZXIuc2V0TWFwUG9zaXRpb25UYXJnZXQocmFuZG9tUG9zaXRpb25BYm92ZVswXSwgcmFuZG9tUG9zaXRpb25BYm92ZVsxXSk7XHJcblx0fSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBsYXlNdXNpY1RyYWNrKG5leHRUcmFjaykge1xyXG5cdGlmIChuZXh0VHJhY2sgPT09IHBsYXlpbmdUcmFja051bWJlcikgcmV0dXJuO1xyXG5cclxuXHRjdXJyZW50VHJhY2subXV0ZWQgPSB0cnVlO1xyXG5cdHBsYXlpbmdUcmFja051bWJlciA9IG5leHRUcmFjaztcclxuXHRpZiAobmV4dFRyYWNrID4gc291bmRzLmxlbmd0aCAtIDEpXHJcblx0XHRwbGF5aW5nVHJhY2tOdW1iZXIgPSAxO1xyXG5cdGN1cnJlbnRUcmFjayA9IHNvdW5kc1tcInRyYWNrXCIgKyBuZXh0VHJhY2tdO1xyXG5cdGN1cnJlbnRUcmFjay5jdXJyZW50VGltZSA9IDA7XHJcblx0Y3VycmVudFRyYWNrLmxvb3AgPSB0cnVlO1xyXG5cclxuXHRpZiAocGxheVNvdW5kKSB7XHJcblx0XHRjdXJyZW50VHJhY2sucGxheSgpO1xyXG5cdFx0Y3VycmVudFRyYWNrLm11dGVkID0gZmFsc2U7XHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93VmFsaWRhdGVDb2RlTWVudSgpIHtcclxuXHQkKCcjbWFpbicpLmhpZGUoKTtcclxuXHQkKCcjdmFsaWRhdGVjb2RlJykuc2hvdygpO1xyXG5cdCQoJyNtZW51JykuYWRkQ2xhc3MoJ3ZhbGlkYXRlY29kZScpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB2YWxpZGF0ZUNvZGUoKSB7XHJcblx0bGV0IHRva2VucyA9ICQoXCIjdmFsaWRhdGV0ZXh0XCIpLnZhbCgpLnRvTG93ZXJDYXNlKCkuc3BsaXQoL1xccj9cXG4vKS5maWx0ZXIoZnVuY3Rpb24odG9rZW4pIHtcclxuXHRcdHJldHVybiB0b2tlbi5zdGFydHNXaXRoKCdkYXRlOicpIHx8XHJcblx0XHRcdHRva2VuLnN0YXJ0c1dpdGgoJ2xldmVsOicpIHx8XHJcblx0XHRcdHRva2VuLnN0YXJ0c1dpdGgoJ3Rva2VuczonKSB8fFxyXG5cdFx0XHR0b2tlbi5zdGFydHNXaXRoKCdkaXN0YW5jZTonKSB8fFxyXG5cdFx0XHR0b2tlbi5zdGFydHNXaXRoKCd0b3RhbCBzY29yZTonKSB8fFxyXG5cdFx0XHR0b2tlbi5zdGFydHNXaXRoKCdjb2RlOicpO1xyXG5cdH0pO1xyXG5cdGZ1bmN0aW9uIGdldFZhbHVlKHRva2VuKSB7XHJcblx0XHRyZXR1cm4gdG9rZW5zLmZpbmQoaSA9PiBpLnN0YXJ0c1dpdGgodG9rZW4pKT8uc3BsaXQoXCI6IFwiKVsxXTtcclxuXHR9XHJcblx0bGV0IHZhbCA9IGdldFZhbHVlKCdsZXZlbDonKSArIGdldFZhbHVlKCd0b2tlbnM6JykgKyBnZXRWYWx1ZSgnZGlzdGFuY2U6Jyk/LnJlcGxhY2UoJ20nLCAnJykgKyBnZXRWYWx1ZSgndG90YWwgc2NvcmU6Jyk7XHJcblx0bGV0IGQgPSBnZXRWYWx1ZSgnZGF0ZTonKT8ucmVwbGFjZUFsbCgnICcsICcvJyk/LnJlcGxhY2VBbGwoJzonLCAnLycpPy5zcGxpdCgnLycpO1xyXG5cdGlmICh2YWwgIT0gbnVsbCAmJiBkICE9IG51bGwpIHtcclxuXHRcdGxldCBzID0gMDtcclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgZC5sZW5ndGggLSAxOyBpKyspIHtcclxuXHRcdFx0cyArPSBwYXJzZUludChkW2ldKTtcclxuXHRcdH1cclxuXHRcdGNvbnN0IGMgPSBjeXJiNTModmFsLCBzKTtcclxuXHRcdGlmIChjLnRvU3RyaW5nKDM2KSA9PSBnZXRWYWx1ZSgnY29kZTonKSkgeyBcclxuXHRcdFx0YWxlcnQoJ0NvZGUgaXMgdmFsaWQhJyk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHR9XHJcblx0YWxlcnQoJ0NvZGUgaXMgTk9UIHZhbGlkIScpO1x0XHJcbn1cclxuXHJcbiQoJy52YWxpZGF0ZScpLmNsaWNrKHZhbGlkYXRlQ29kZSk7XHJcblxyXG5mdW5jdGlvbiBzdGFydE5ldmVyRW5kaW5nR2FtZSAoaW1hZ2VzKSB7XHJcblx0dmFyIHBsYXllcjtcclxuXHR2YXIgc3RhcnRTaWduO1xyXG5cdHZhciBnYW1lSHVkO1xyXG5cdHZhciBnYW1lO1xyXG5cclxuXHRmdW5jdGlvbiBzaG93TWFpbk1lbnUoaW1hZ2VzKSB7XHJcblx0XHRmb3IgKHZhciBzb3VuZCBpbiBzb3VuZHMpIHtcclxuXHRcdFx0aWYgKHNvdW5kcy5oYXNPd25Qcm9wZXJ0eShzb3VuZCkpIHtcclxuXHRcdFx0XHRzb3VuZHNbc291bmRdLm11dGVkID0gdHJ1ZTtcclxuXHRcdFx0XHRjdXJyZW50VHJhY2subXV0ZWQgPSAhcGxheVNvdW5kO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRtYWluQ2FudmFzLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0XHQkKCcjbWFpbicpLnNob3coKTtcclxuXHRcdCQoJyNtZW51JykuYWRkQ2xhc3MoJ21haW4nKTtcclxuXHRcdCQoJy5zb3VuZCcpLnNob3coKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNob3dHYW1lT3Zlck1lbnUoKSB7XHJcblx0XHQkKCcjbWVudScpLnJlbW92ZUNsYXNzKCdtYWluJyk7XHJcblx0XHQkKCcjbWVudScpLnNob3coKTtcclxuXHRcdCQoJyNnYW1lb3ZlcicpLnNob3coKTtcclxuXHRcdCQoJyNtZW51JykuYWRkQ2xhc3MoJ2dhbWVvdmVyJyk7XHJcblx0XHQkKCcjY29weXBhc3RlJykuaGlkZSgpO1xyXG5cdFx0JCgnI2xldmVsJykudGV4dCgnTGV2ZWw6ICcgKyBnYW1lSW5mby5nZXRMZXZlbCgpLnRvTG9jYWxlU3RyaW5nKCkgKyAnIHgxMDAnKTtcclxuXHRcdCQoJyN0b2tlbnMnKS50ZXh0KCdUb2tlbnM6ICcgKyBnYW1lSW5mby50b2tlbnMudG9Mb2NhbGVTdHJpbmcoKSArICcgeDEwJyk7XHJcblx0XHQkKCcjZGlzdGFuY2UnKS50ZXh0KCdEaXN0YW5jZTogJyArIGdhbWVJbmZvLmRpc3RhbmNlLnRvTG9jYWxlU3RyaW5nKCkgKyAnbSB4MTAnKTtcclxuXHRcdCQoJyNzY29yZScpLnRleHQoJ1Njb3JlOiAnICsgZ2FtZUluZm8uZ2V0U2NvcmUoKS50b0xvY2FsZVN0cmluZygpKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHRvZ2dsZUdvZE1vZGUoKSB7XHJcblx0XHRnYW1lSW5mby5nb2QgPSAhZ2FtZUluZm8uZ29kO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcmVzZXRHYW1lICgpIHtcclxuXHRcdGxpdmVzTGVmdCA9IDU7XHJcblx0XHRoaWdoU2NvcmUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnaGlnaFNjb3JlJyk7XHJcblx0XHRnYW1lLnJlc2V0KCk7XHJcblx0XHRnYW1lLmFkZFN0YXRpY09iamVjdChzdGFydFNpZ24pO1xyXG5cdFx0Z2FtZUluZm8ucmVzZXQoKTtcclxuXHRcdHBsYXlNdXNpY1RyYWNrKDEpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZGV0ZWN0RW5kICgpIHtcclxuXHRcdGlmIChnYW1lLmlzR2FtZUVuZGluZygpKSByZXR1cm47XHJcblxyXG5cdFx0Z2FtZS5nYW1lT3ZlcigpO1xyXG5cdFx0Z2FtZUluZm8uZ2FtZUVuZERhdGVUaW1lID0gbmV3IERhdGUoKTtcclxuXHRcdGxpdmVzTGVmdCA9IDA7XHJcblx0XHR1cGRhdGVIdWQoKTtcclxuXHRcdFxyXG5cdFx0aWYgKGdhbWVJbmZvLmdldFNjb3JlKCkgPiBoaWdoU2NvcmUpXHJcblx0XHRcdGhpZ2hTY29yZSA9IGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdoaWdoU2NvcmUnLCBnYW1lSW5mby5nZXRTY29yZSgpKTtcclxuXHRcdFxyXG5cdFx0cGxheWluZ1RyYWNrTnVtYmVyID0gMDtcclxuXHRcdGN1cnJlbnRUcmFjay5tdXRlZCA9IHRydWU7XHJcblx0XHRjdXJyZW50VHJhY2sgPSBzb3VuZHMuZ2FtZU92ZXI7XHJcblx0XHRjdXJyZW50VHJhY2suY3VycmVudFRpbWUgPSAwO1xyXG5cdFx0Y3VycmVudFRyYWNrLmxvb3AgPSB0cnVlO1xyXG5cdFx0aWYgKHBsYXlTb3VuZCkge1xyXG5cdFx0XHRjdXJyZW50VHJhY2sucGxheSgpO1xyXG5cdFx0XHRjdXJyZW50VHJhY2subXV0ZWQgPSBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBMZXQgdGhlIG1vbnN0ZXIgZmluaXNoIGVhdGluZ1xyXG5cdFx0aWYgKHBsYXllci5pc0JlaW5nRWF0ZW4pIHtcclxuXHRcdFx0c2V0VGltZW91dChzaG93R2FtZU92ZXJNZW51LCAxMDAwKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGdhbWUucGF1c2UoKTtcclxuXHRcdFx0Z2FtZS5jeWNsZSgpO1xyXG5cdFx0XHRzaG93R2FtZU92ZXJNZW51KCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1cGRhdGVIdWQobWVzc2FnZSkge1xyXG5cdFx0aWYgKCFtZXNzYWdlKVxyXG5cdFx0XHRtZXNzYWdlID0gJyc7XHJcblxyXG5cdFx0aWYgKCFnYW1lSHVkKSB7XHJcblx0XHRcdGdhbWVIdWQgPSBuZXcgR2FtZUh1ZCh7XHJcblx0XHRcdFx0cG9zaXRpb246IHtcclxuXHRcdFx0XHRcdHRvcDogNTAsXHJcblx0XHRcdFx0XHRsZWZ0OiAyNVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Z2FtZUh1ZC5zZXRMaW5lcyhbXHJcblx0XHRcdCdMZXZlbCAnICsgZ2FtZUluZm8uZ2V0TGV2ZWwoKSxcclxuXHRcdFx0J1Rva2VucyAnICsgZ2FtZUluZm8udG9rZW5zLFxyXG5cdFx0XHQnTGlmZSAnICsgbGl2ZXNMZWZ0IC8gdG90YWxMaXZlcyAqIDEwMCArICclJyxcclxuXHRcdFx0J0F3YWtlICcgKyBwbGF5ZXIuYXZhaWxhYmxlQXdha2UgKyAnLzEwMCcsXHJcblx0XHRcdCdEaXN0YW5jZSAnICsgZ2FtZUluZm8uZGlzdGFuY2UgKyAnbScsXHJcblx0XHRcdCdTcGVlZCAnICsgcGxheWVyLmdldFNwZWVkKCksXHJcblx0XHRcdCdUb3RhbCBTY29yZSAnICsgZ2FtZUluZm8uZ2V0U2NvcmUoKSxcclxuXHRcdFx0J0hpZ2ggU2NvcmUgJyArIGhpZ2hTY29yZSxcclxuXHRcdFx0bWVzc2FnZVxyXG5cdFx0XSk7XHJcblxyXG5cdFx0cGxheU11c2ljVHJhY2soTWF0aC5mbG9vcihnYW1lSW5mby5kaXN0YW5jZSAvIDEwMDAgJSAzKSArIDEpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcmFuZG9tbHlTcGF3bk5QQyhzcGF3bkZ1bmN0aW9uLCBkcm9wUmF0ZSkge1xyXG5cdFx0dmFyIHJhdGVNb2RpZmllciA9IG1haW5DYW52YXMud2lkdGg7IC8vTWF0aC5tYXgoODAwIC0gbWFpbkNhbnZhcy53aWR0aCwgMCk7XHJcblx0XHRpZiAoTnVtYmVyLnJhbmRvbSgxMDAwICsgcmF0ZU1vZGlmaWVyKSA8PSBkcm9wUmF0ZSkge1xyXG5cdFx0XHRzcGF3bkZ1bmN0aW9uKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzcGF3bk1vbnN0ZXIgKCkge1xyXG5cdFx0dmFyIG5ld01vbnN0ZXIgPSBuZXcgTW9uc3RlcihzcHJpdGVzLm1vbnN0ZXIpO1xyXG5cdFx0dmFyIHJhbmRvbVBvc2l0aW9uID0gZENvbnRleHQuZ2V0UmFuZG9tTWFwUG9zaXRpb25BYm92ZVZpZXdwb3J0KCk7XHJcblx0XHRuZXdNb25zdGVyLnNldE1hcFBvc2l0aW9uKHJhbmRvbVBvc2l0aW9uWzBdLCByYW5kb21Qb3NpdGlvblsxXSk7XHJcblx0XHRuZXdNb25zdGVyLmZvbGxvdyhwbGF5ZXIpO1xyXG5cdFx0bmV3TW9uc3Rlci5vbkhpdHRpbmcocGxheWVyLCBtb25zdGVySGl0c1BsYXllckJlaGF2aW91cik7XHJcblxyXG5cdFx0Ly8gU3RvcCBjaGFzaW5nIGFmdGVyIHRpbWVvdXRcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRpZiAobmV3TW9uc3Rlcikge1xyXG5cdFx0XHRcdGlmIChuZXdNb25zdGVyLmlzRWF0aW5nIHx8IG5ld01vbnN0ZXIuaXNGdWxsKSByZXR1cm47XHJcblx0XHRcdFx0bmV3TW9uc3Rlci5pc0Z1bGwgPSB0cnVlO1xyXG5cdFx0XHRcdG5ld01vbnN0ZXIuc2V0U3BlZWQocGxheWVyLmdldFNwZWVkKCkpO1xyXG5cdFx0XHRcdG5ld01vbnN0ZXIuc3RvcEZvbGxvd2luZygpO1xyXG5cdFx0XHRcdHZhciByYW5kb21Qb3NpdGlvbkFib3ZlID0gZENvbnRleHQuZ2V0UmFuZG9tTWFwUG9zaXRpb25BYm92ZVZpZXdwb3J0KCk7XHJcblx0XHRcdFx0bmV3TW9uc3Rlci5zZXRNYXBQb3NpdGlvblRhcmdldChyYW5kb21Qb3NpdGlvbkFib3ZlWzBdLCByYW5kb21Qb3NpdGlvbkFib3ZlWzFdKTtcclxuXHRcdFx0fVxyXG5cdFx0fSwgMTUwMDApO1xyXG5cclxuXHRcdGdhbWUuYWRkTW92aW5nT2JqZWN0KG5ld01vbnN0ZXIsICdtb25zdGVyJyk7XHJcblx0fVxyXG5cclxuXHQkKCcucGxheWVyMScpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdFx0c3ByaXRlcy5wbGF5ZXIgPSBzcHJpdGVzLnBsYXllcjE7XHJcblx0XHRzdGFydEdhbWUoKTtcclxuXHR9KTtcclxuXHQkKCcucGxheWVyMicpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdFx0c3ByaXRlcy5wbGF5ZXIgPSBzcHJpdGVzLnBsYXllcjI7XHJcblx0XHRzdGFydEdhbWUoKTtcclxuXHR9KTtcclxuXHQkKCcucGxheWVyMycpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdFx0c3ByaXRlcy5wbGF5ZXIgPSBzcHJpdGVzLnBsYXllcjM7XHJcblx0XHRzdGFydEdhbWUoKTtcclxuXHR9KTtcclxuXHQkKCcucGxheWVyNCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdFx0c3ByaXRlcy5wbGF5ZXIgPSBzcHJpdGVzLnBsYXllcjQ7XHJcblx0XHRzdGFydEdhbWUoKTtcclxuXHR9KTtcclxuXHJcblx0TW91c2V0cmFwLmJpbmQoJ3NoaWZ0K3YnLCBzaG93VmFsaWRhdGVDb2RlTWVudSk7XHJcblxyXG5cdGZ1bmN0aW9uIHN0YXJ0R2FtZSgpe1xyXG5cdFx0JCgnI2dhbWVvdmVyJykuaGlkZSgpO1xyXG5cdFx0JCgnI3NlbGVjdFBsYXllcicpLmhpZGUoKTtcclxuXHRcdCQoJyNtZW51JykucmVtb3ZlQ2xhc3MoJ2dhbWVvdmVyJyk7XHJcblx0XHQkKCcjbWVudScpLnJlbW92ZUNsYXNzKCdzZWxlY3RQbGF5ZXInKTtcclxuXHRcdCQoJyNtZW51JykuaGlkZSgpO1xyXG5cdFx0bWFpbkNhbnZhcy5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcblxyXG5cdFx0cGxheWVyID0gbmV3IFBsYXllcihzcHJpdGVzLnBsYXllcik7XHJcblx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb24oMCwgMCk7XHJcblx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb25UYXJnZXQoMCwgLTEwKTtcclxuXHJcblx0XHRwbGF5ZXIuc2V0SGl0T2JzdGFjbGVDYihmdW5jdGlvbigpIHtcclxuXHRcdFx0aWYgKGdhbWVJbmZvLmdvZCkgcmV0dXJuO1xyXG5cdFx0XHRpZiAobGl2ZXNMZWZ0ID4gMCkgbGl2ZXNMZWZ0IC09IDE7XHJcblx0XHR9KTtcclxuXHJcblx0XHRwbGF5ZXIuc2V0SGl0TW9uc3RlckNiKCgpID0+IHtcclxuXHRcdFx0aWYgKGdhbWVJbmZvLmdvZCkgcmV0dXJuO1xyXG5cdFx0XHRsaXZlc0xlZnQgPSAwO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cGxheWVyLnNldENvbGxlY3RJdGVtQ2IoZnVuY3Rpb24oaXRlbSkge1xyXG5cdFx0XHRzd2l0Y2ggKGl0ZW0uZGF0YS5uYW1lKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2FzZSAndG9rZW4nOlxyXG5cdFx0XHRcdFx0Z2FtZUluZm8udG9rZW5zICs9IGl0ZW0uZGF0YS5wb2ludFZhbHVlc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBpdGVtLmRhdGEucG9pbnRWYWx1ZXMubGVuZ3RoKV07XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdtaWxrc2hha2UnOlxyXG5cdFx0XHRcdFx0Z2FtZUluZm8ubGV2ZWxCb29zdCArPSAxO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGdhbWUgPSBuZXcgR2FtZShtYWluQ2FudmFzLCBwbGF5ZXIpO1xyXG5cclxuXHRcdHN0YXJ0U2lnbiA9IG5ldyBTcHJpdGUoc3ByaXRlcy5zaWduU3RhcnQpO1xyXG5cdFx0Z2FtZS5hZGRTdGF0aWNPYmplY3Qoc3RhcnRTaWduKTtcclxuXHRcdHN0YXJ0U2lnbi5zZXRNYXBQb3NpdGlvbigtNTAsIDApO1xyXG5cdFx0ZENvbnRleHQuZm9sbG93U3ByaXRlKHBsYXllcik7XHJcblx0XHRcclxuXHRcdHVwZGF0ZUh1ZCgpO1xyXG5cclxuXHRcdGdhbWUuYmVmb3JlQ3ljbGUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR2YXIgbmV3T2JqZWN0cyA9IFtdO1xyXG5cdFx0XHRpZiAocGxheWVyLmlzTW92aW5nKSB7XHJcblx0XHRcdFx0bmV3T2JqZWN0cyA9IFNwcml0ZS5jcmVhdGVPYmplY3RzKFtcclxuXHRcdFx0XHRcdHsgc3ByaXRlOiBzcHJpdGVzLmp1bXAsIGRyb3BSYXRlOiBkcm9wUmF0ZXMuanVtcCB9LFxyXG5cdFx0XHRcdFx0eyBzcHJpdGU6IHNwcml0ZXMub2lsU2xpY2ssIGRyb3BSYXRlOiBkcm9wUmF0ZXMub2lsU2xpY2sgfSxcclxuXHRcdFx0XHRcdHsgc3ByaXRlOiBzcHJpdGVzLnRyYWZmaWNDb25lTGFyZ2UsIGRyb3BSYXRlOiBkcm9wUmF0ZXMudHJhZmZpY0NvbmVMYXJnZSB9LFxyXG5cdFx0XHRcdFx0eyBzcHJpdGU6IHNwcml0ZXMudHJhZmZpY0NvbmVTbWFsbCwgZHJvcFJhdGU6IGRyb3BSYXRlcy50cmFmZmljQ29uZVNtYWxsIH0sXHJcblx0XHRcdFx0XHR7IHNwcml0ZTogc3ByaXRlcy5nYXJiYWdlQ2FuLCBkcm9wUmF0ZTogZHJvcFJhdGVzLmdhcmJhZ2VDYW4gfSxcclxuXHRcdFx0XHRcdHsgc3ByaXRlOiBzcHJpdGVzLnRva2VuLCBkcm9wUmF0ZTogZHJvcFJhdGVzLnRva2VuIH0sXHJcblx0XHRcdFx0XHR7IHNwcml0ZTogc3ByaXRlcy5taWxrc2hha2UsIGRyb3BSYXRlOiBkcm9wUmF0ZXMubWlsa3NoYWtlIH1cclxuXHRcdFx0XHRdLCB7XHJcblx0XHRcdFx0XHRyYXRlTW9kaWZpZXI6IE1hdGgubWF4KDYwMCAtIG1haW5DYW52YXMud2lkdGgsIDApLFxyXG5cdFx0XHRcdFx0cG9zaXRpb246IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGRDb250ZXh0LmdldFJhbmRvbU1hcFBvc2l0aW9uQmVsb3dWaWV3cG9ydCgpO1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHBsYXllcjogcGxheWVyXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCFnYW1lLmlzUGF1c2VkKCkpIHtcclxuXHRcdFx0XHRnYW1lLmFkZFN0YXRpY09iamVjdHMobmV3T2JqZWN0cyk7XHJcblxyXG5cdFx0XHRcdGdhbWVJbmZvLmRpc3RhbmNlID0gcGFyc2VGbG9hdChwbGF5ZXIuZ2V0UGl4ZWxzVHJhdmVsbGVkRG93blJvYWQoKSAvIHBpeGVsc1Blck1ldHJlKS50b0ZpeGVkKDEpO1xyXG5cclxuXHRcdFx0XHRpZiAoZ2FtZUluZm8uZGlzdGFuY2UgPiBtb25zdGVyRGlzdGFuY2VUaHJlc2hvbGQpIHtcclxuXHRcdFx0XHRcdHJhbmRvbWx5U3Bhd25OUEMoc3Bhd25Nb25zdGVyLCAwLjAwMSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAoZ2FtZUluZm8uZGlzdGFuY2UpXHJcblxyXG5cdFx0XHRcdHVwZGF0ZUh1ZCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRnYW1lLmFmdGVyQ3ljbGUoZnVuY3Rpb24oKSB7XHJcblx0XHRcdGlmIChsaXZlc0xlZnQgPT09IDApIHtcclxuXHRcdFx0XHRkZXRlY3RFbmQoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Z2FtZS5hZGRVSUVsZW1lbnQoZ2FtZUh1ZCk7XHJcblx0XHRcclxuXHRcdCQobWFpbkNhbnZhcylcclxuXHRcdFx0Lm1vdXNlbW92ZShmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRcdGdhbWUuc2V0TW91c2VYKGUucGFnZVgpO1xyXG5cdFx0XHRcdGdhbWUuc2V0TW91c2VZKGUucGFnZVkpO1xyXG5cdFx0XHRcdHBsYXllci5yZXNldERpcmVjdGlvbigpO1xyXG5cdFx0XHRcdHBsYXllci5zdGFydE1vdmluZ0lmUG9zc2libGUoKTtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmJpbmQoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0XHRnYW1lLnNldE1vdXNlWChlLnBhZ2VYKTtcclxuXHRcdFx0XHRnYW1lLnNldE1vdXNlWShlLnBhZ2VZKTtcclxuXHRcdFx0XHRwbGF5ZXIucmVzZXREaXJlY3Rpb24oKTtcclxuXHRcdFx0XHRwbGF5ZXIuc3RhcnRNb3ZpbmdJZlBvc3NpYmxlKCk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5mb2N1cygpOyAvLyBTbyB3ZSBjYW4gbGlzdGVuIHRvIGV2ZW50cyBpbW1lZGlhdGVseVxyXG5cdFx0XHJcblx0XHRNb3VzZXRyYXAudW5iaW5kKCd2Jyk7XHJcblx0XHRNb3VzZXRyYXAuYmluZCgnZicsIHBsYXllci5zcGVlZEJvb3N0KTtcclxuXHRcdC8vTW91c2V0cmFwLmJpbmQoJ3QnLCBwbGF5ZXIuYXR0ZW1wdFRyaWNrKTtcclxuXHRcdE1vdXNldHJhcC5iaW5kKFsndycsICd1cCddLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHBsYXllci5zdG9wKCk7XHJcblx0XHR9KTtcclxuXHRcdE1vdXNldHJhcC5iaW5kKFsnYScsICdsZWZ0J10sIGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0aWYgKHBsYXllci5kaXJlY3Rpb24gPT09IDI3MCkge1xyXG5cdFx0XHRcdHBsYXllci5zdGVwV2VzdCgpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHBsYXllci50dXJuV2VzdCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdE1vdXNldHJhcC5iaW5kKFsncycsICdkb3duJ10sIGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cGxheWVyLnNldERpcmVjdGlvbigxODApO1xyXG5cdFx0XHRwbGF5ZXIuc3RhcnRNb3ZpbmdJZlBvc3NpYmxlKCk7XHJcblx0XHR9KTtcclxuXHRcdE1vdXNldHJhcC5iaW5kKFsnZCcsICdyaWdodCddLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmIChwbGF5ZXIuZGlyZWN0aW9uID09PSA5MCkge1xyXG5cdFx0XHRcdHBsYXllci5zdGVwRWFzdCgpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHBsYXllci50dXJuRWFzdCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0TW91c2V0cmFwLmJpbmQoJ3NwYWNlJywgcmVzZXRHYW1lKTtcclxuXHRcdFxyXG5cdFx0JChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XHJcblx0XHRcdGlmICh3aW5kb3cubG9jYXRpb24uaHJlZi5pbmRleE9mKFwiaW5kZXgtZGV2Lmh0bWxcIikgIT09IC0xKSB7XHJcblx0XHRcdFx0TW91c2V0cmFwLmJpbmQoJ20nLCBzcGF3bk1vbnN0ZXIpO1xyXG5cdFx0XHRcdE1vdXNldHJhcC5iaW5kKCdnJywgdG9nZ2xlR29kTW9kZSk7XHJcblx0XHRcdFx0TW91c2V0cmFwLmJpbmQoJ2gnLCBnYW1lLnRvZ2dsZUhpdEJveGVzKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dmFyIGhhbW1lcnRpbWUgPSBuZXcgSGFtbWVyKG1haW5DYW52YXMpO1xyXG5cdFx0aGFtbWVydGltZS5vbigncHJlc3MnLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdGdhbWUuc2V0TW91c2VYKGUuY2VudGVyLngpO1xyXG5cdFx0XHRnYW1lLnNldE1vdXNlWShlLmNlbnRlci55KTtcclxuXHRcdH0pO1xyXG5cdFx0aGFtbWVydGltZS5vbigndGFwJywgZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0Z2FtZS5zZXRNb3VzZVgoZS5jZW50ZXIueCk7XHJcblx0XHRcdGdhbWUuc2V0TW91c2VZKGUuY2VudGVyLnkpO1xyXG5cdFx0fSk7XHJcblx0XHRoYW1tZXJ0aW1lLm9uKCdwYW4nLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRnYW1lLnNldE1vdXNlWChlLmNlbnRlci54KTtcclxuXHRcdFx0Z2FtZS5zZXRNb3VzZVkoZS5jZW50ZXIueSk7XHJcblx0XHRcdHBsYXllci5yZXNldERpcmVjdGlvbigpO1xyXG5cdFx0XHRwbGF5ZXIuc3RhcnRNb3ZpbmdJZlBvc3NpYmxlKCk7XHJcblx0XHR9KVxyXG5cdFx0aGFtbWVydGltZS5vbignZG91YmxldGFwJywgZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0cGxheWVyLnNwZWVkQm9vc3QoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHBsYXllci5pc01vdmluZyA9IGZhbHNlO1xyXG5cdFx0cGxheWVyLnNldERpcmVjdGlvbigyNzApO1xyXG5cdFx0XHJcblx0XHRnYW1lLnN0YXJ0KCk7XHJcblxyXG5cdFx0Y3VycmVudFRyYWNrID0gc291bmRzLnRyYWNrMTtcclxuXHRcdGN1cnJlbnRUcmFjay5wbGF5KCk7XHJcblx0fVxyXG5cclxuXHQkKCcuY29weXNjb3JlJykuY2xpY2soZnVuY3Rpb24oKSB7XHJcblx0XHQkKCcjY29weXBhc3RlJykuc2hvdygpO1xyXG5cdFx0Y29uc3QgcyA9IGdhbWVJbmZvLmdldEZvcm1hdHRlZFNjb3JlKCk7XHJcblx0XHQkKCcjY29weXBhc3RldGV4dCcpLnRleHQocykuc2VsZWN0KCk7XHJcblx0XHRuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChzKTtcclxuXHR9KTtcclxuXHQkKCcucmVzdGFydCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdFx0JCgnI2dhbWVvdmVyJykuaGlkZSgpO1xyXG5cdFx0JCgnI21lbnUnKS5oaWRlKCk7XHJcblx0XHRyZXNldEdhbWUoKTtcclxuXHR9KTtcclxuXHJcblx0c2hvd01haW5NZW51KCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc2l6ZUNhbnZhcygpIHtcclxuXHRtYWluQ2FudmFzLndpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XHJcblx0bWFpbkNhbnZhcy5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XHJcbn1cclxuXHJcbiQoJy5wbGF5JykuY2xpY2soZnVuY3Rpb24oKSB7XHJcblx0JCgnI21haW4nKS5oaWRlKCk7XHJcblx0JCgnI3NlbGVjdFBsYXllcicpLnNob3coKTtcclxuXHQkKCcjbWVudScpLmFkZENsYXNzKCdzZWxlY3RQbGF5ZXInKTtcclxuICB9KTtcclxuXHJcbiQoJy5pbnN0cnVjdGlvbnMnKS5jbGljayhmdW5jdGlvbigpIHtcclxuXHQkKCcjbWFpbicpLmhpZGUoKTtcclxuXHQkKCcjaW5zdHJ1Y3Rpb25zJykuc2hvdygpO1xyXG5cdCQoJyNtZW51JykuYWRkQ2xhc3MoJ2luc3RydWN0aW9ucycpO1xyXG4gIH0pO1xyXG5cclxuJCgnLmNyZWRpdHMnKS5jbGljayhmdW5jdGlvbigpIHtcclxuXHQkKCcjbWFpbicpLmhpZGUoKTtcclxuXHQkKCcjY3JlZGl0cycpLnNob3coKTtcclxuXHQkKCcjbWVudScpLmFkZENsYXNzKCdjcmVkaXRzJyk7XHJcbiAgfSk7XHJcblxyXG4kKCcuYmFjaycpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdCQoJyNjcmVkaXRzJykuaGlkZSgpO1xyXG5cdCQoJyNzZWxlY3RQbGF5ZXInKS5oaWRlKCk7XHJcblx0JCgnI2luc3RydWN0aW9ucycpLmhpZGUoKTtcclxuXHQkKCcjdmFsaWRhdGVjb2RlJykuaGlkZSgpO1xyXG5cdCQoJyNtYWluJykuc2hvdygpO1xyXG5cdCQoJyNtZW51JykucmVtb3ZlQ2xhc3MoJ2NyZWRpdHMnKTtcclxuXHQkKCcjbWVudScpLnJlbW92ZUNsYXNzKCdzZWxlY3RQbGF5ZXInKTtcclxuXHQkKCcjbWVudScpLnJlbW92ZUNsYXNzKCdpbnN0cnVjdGlvbnMnKTtcclxuXHQkKCcjbWVudScpLnJlbW92ZUNsYXNzKCd2YWxpZGF0ZWNvZGUnKTtcclxuICB9KTtcclxuXHJcbi8vIHNldCB0aGUgc291bmQgcHJlZmVyZW5jZVxyXG52YXIgY2FuVXNlTG9jYWxTdG9yYWdlID0gJ2xvY2FsU3RvcmFnZScgaW4gd2luZG93ICYmIHdpbmRvdy5sb2NhbFN0b3JhZ2UgIT09IG51bGw7XHJcbmlmIChjYW5Vc2VMb2NhbFN0b3JhZ2UpIHtcclxuXHRwbGF5U291bmQgPSAobG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2hid0NhcnRSYWNpbmcucGxheVNvdW5kJykgPT09IFwidHJ1ZVwiKVxyXG5cdGlmIChwbGF5U291bmQpIHtcclxuXHRcdCQoJy5zb3VuZCcpLmFkZENsYXNzKCdzb3VuZC1vbicpLnJlbW92ZUNsYXNzKCdzb3VuZC1vZmYnKTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHQkKCcuc291bmQnKS5hZGRDbGFzcygnc291bmQtb2ZmJykucmVtb3ZlQ2xhc3MoJ3NvdW5kLW9uJyk7XHJcblx0fVxyXG59XHJcblxyXG4kKCcuc291bmQnKS5jbGljayhmdW5jdGlvbigpIHtcclxuXHR2YXIgJHRoaXMgPSAkKHRoaXMpO1xyXG5cdC8vIHNvdW5kIG9mZlxyXG5cdGlmICgkdGhpcy5oYXNDbGFzcygnc291bmQtb24nKSkge1xyXG5cdCAgJHRoaXMucmVtb3ZlQ2xhc3MoJ3NvdW5kLW9uJykuYWRkQ2xhc3MoJ3NvdW5kLW9mZicpO1xyXG5cdCAgcGxheVNvdW5kID0gZmFsc2U7XHJcblx0fVxyXG5cdC8vIHNvdW5kIG9uXHJcblx0ZWxzZSB7XHJcblx0ICAkdGhpcy5yZW1vdmVDbGFzcygnc291bmQtb2ZmJykuYWRkQ2xhc3MoJ3NvdW5kLW9uJyk7XHJcblx0ICBwbGF5U291bmQgPSB0cnVlO1xyXG5cdH1cclxuXHRpZiAoY2FuVXNlTG9jYWxTdG9yYWdlKSB7XHJcblx0ICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnaGJ3Q2FydFJhY2luZy5wbGF5U291bmQnLCBwbGF5U291bmQpO1xyXG5cdH1cclxuXHQvLyBtdXRlIG9yIHVubXV0ZSBhbGwgc291bmRzXHJcblx0Zm9yICh2YXIgc291bmQgaW4gc291bmRzKSB7XHJcblx0XHRpZiAoc291bmRzLmhhc093blByb3BlcnR5KHNvdW5kKSkge1xyXG5cdFx0XHRzb3VuZHNbc291bmRdLm11dGVkID0gdHJ1ZTtcclxuXHRcdFx0Y3VycmVudFRyYWNrLm11dGVkID0gIXBsYXlTb3VuZDtcclxuXHRcdH1cclxuXHR9XHJcblx0aWYgKHBsYXlTb3VuZCkgY3VycmVudFRyYWNrLnBsYXkoKTtcclxufSk7XHJcblxyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgcmVzaXplQ2FudmFzLCBmYWxzZSk7XHJcblxyXG5yZXNpemVDYW52YXMoKTtcclxuXHJcbmxvYWRTb3VuZHMoKTtcclxuXHJcbmN1cnJlbnRUcmFjayA9IHNvdW5kcy50cmFjazE7XHJcbmN1cnJlbnRUcmFjay5jdXJyZW50VGltZSA9IDA7XHJcbmN1cnJlbnRUcmFjay5sb29wID0gdHJ1ZTtcclxuXHJcbmxvYWRJbWFnZXMoaW1hZ2VTb3VyY2VzLCBzdGFydE5ldmVyRW5kaW5nR2FtZSk7XHJcblxyXG50aGlzLmV4cG9ydHMgPSB3aW5kb3c7XHJcbiIsImNvbnN0IGdhbWUgPSByZXF1aXJlKFwiLi9saWIvZ2FtZVwiKTtcclxuXHJcbihmdW5jdGlvbiAoZ2xvYmFsKSB7XHJcblx0dmFyIHNwcml0ZXMgPSB7XHJcblx0XHQncGxheWVyJzoge1xyXG5cdFx0XHRpZDogJ3BsYXllcicsXHJcblx0XHRcdCRpbWFnZUZpbGU6ICcnLFxyXG5cdFx0XHRwYXJ0czoge30sXHJcblx0XHRcdGhpdEJveGVzOiB7fSxcclxuXHRcdFx0aGl0QmVoYXZpb3I6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3BsYXllcjEnOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL2hhdGd1eS1zcHJpdGVzLnBuZycsXHJcblx0XHRcdHBhcnRzIDoge1xyXG5cdFx0XHRcdC8vIHgsIHksIHdpZHRoLCBoZWlnaHQsIGNhbnZhc09mZnNldFgsIGNhbnZhc09mZnNldFksIGhpdGJveE9mZnNldFgsIGhpdGJveE9mZnNldFkgXHJcblx0XHRcdFx0YmxhbmsgOiBbIDAsIDAsIDAsIDAgXSxcclxuXHRcdFx0XHRlYXN0IDogWyAxNDUsIDYxLCA3MCwgNjYsIDAsIDAsIDI1LCAwIF0sXHJcblx0XHRcdFx0ZXNFYXN0IDogWyA3MSwgMTk2LCA2NSwgNzEsIDAsIDAsIDIxLCAwIF0sXHJcblx0XHRcdFx0c0Vhc3QgOiBbIDEwMywgMTI3LCA1MiwgNjksIDAsIDAsIDEzLCAwIF0sXHJcblx0XHRcdFx0c291dGggOiBbIDYwLCAxMjcsIDQzLCA2OCBdLFxyXG5cdFx0XHRcdHNXZXN0IDogWyAxNTUsIDEyNywgNTAsIDY5IF0sXHJcblx0XHRcdFx0d3NXZXN0IDogWyAwLCAxMjcsIDYwLCA2NiBdLFxyXG5cdFx0XHRcdHdlc3QgOiBbIDE1MywgMCwgNjUsIDYxIF0sXHJcblx0XHRcdFx0anVtcGluZyA6IFsgMCwgMjY3LCA1NiwgODcsIC0zLCAxMCBdLFxyXG5cdFx0XHRcdGJvb3N0IDogWyA1NiwgMjY3LCA0MywgMTEzLCAwLCAtNDUgXSxcclxuXHJcblx0XHRcdFx0Ly8gV3JlY2sgc2VxdWVuY2VcclxuXHRcdFx0XHR3cmVjazEgOiBbIDAsIDE5NiwgNzEsIDcwIF0sXHJcblx0XHRcdFx0d3JlY2syIDogWyA3NywgNjEsIDY4LCA2NCBdLFxyXG5cdFx0XHRcdHdyZWNrMyA6IFsgMCwgMCwgNzAsIDUwIF0sXHJcblx0XHRcdFx0d3JlY2s0IDogWyAxMzYsIDE5NiwgNzUsIDcxIF0sXHJcblx0XHRcdFx0d3JlY2s1IDogWyA3MCwgMCwgODMsIDU5IF0sXHJcblx0XHRcdFx0d3JlY2s2IDogWyAwLCA2MSwgNzcsIDYxIF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0Qm94ZXM6IHtcclxuXHRcdFx0XHQvL0xlZnQsIFRvcCwgUmlnaHQsIEJvdHRvbVxyXG5cdFx0XHRcdDA6IFsgMCwgMjAsIDQ1LCA2MCBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGlkIDogJ3BsYXllcicsXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge31cclxuXHRcdH0sXHJcblx0XHQncGxheWVyMic6IHtcclxuXHRcdFx0JGltYWdlRmlsZSA6ICdhc3NldHMvcGlsb3Qtc3ByaXRlcy5wbmcnLFxyXG5cdFx0XHRwYXJ0cyA6IHtcclxuXHRcdFx0XHQvLyB4LCB5LCB3aWR0aCwgaGVpZ2h0LCBjYW52YXNPZmZzZXRYLCBjYW52YXNPZmZzZXRZLCBoaXRib3hPZmZzZXRYLCBoaXRib3hPZmZzZXRZIFxyXG5cdFx0XHRcdGJsYW5rIDogWyAwLCAwLCAwLCAwIF0sXHJcblx0XHRcdFx0ZWFzdCA6IFsgMCwgMzY1LCA3MCwgNjgsIDAsIDAsIDI1LCAwIF0sXHJcblx0XHRcdFx0ZXNFYXN0IDogWyA1MSwgMjgzLCA2NSwgNzEsIDAsIDAsIDIxLCAwIF0sXHJcblx0XHRcdFx0c0Vhc3QgOiBbIDAsIDIwOSwgNTcsIDc0LCAwLCAwLCAxMywgMCBdLFxyXG5cdFx0XHRcdHNvdXRoIDogWyAwLCAwLCA0MywgNjggXSxcclxuXHRcdFx0XHRzV2VzdCA6IFsgMCwgMTM1LCA1NCwgNzQsIDAgXSxcclxuXHRcdFx0XHR3c1dlc3QgOiBbIDY1LCA2OCwgNjAsIDY3IF0sXHJcblx0XHRcdFx0d2VzdCA6IFsgMCwgNjgsIDY1LCA2MiBdLFxyXG5cdFx0XHRcdGp1bXBpbmcgOiBbIDAsIDI4MywgNTEsIDgyLCAtMywgMTAgXSxcclxuXHRcdFx0XHRib29zdCA6IFsgNzUsIDU2MiwgNDMsIDExMywgMCwgLTQ1IF0sXHJcblxyXG5cdFx0XHRcdC8vIFdyZWNrIHNlcXVlbmNlXHJcblx0XHRcdFx0d3JlY2sxIDogWyAwLCA0MzMsIDY4LCA3MCBdLFxyXG5cdFx0XHRcdHdyZWNrMiA6IFsgNTcsIDIwOSwgNjgsIDY0IF0sXHJcblx0XHRcdFx0d3JlY2szIDogWyA0MywgMCwgNzAsIDUwIF0sXHJcblx0XHRcdFx0d3JlY2s0IDogWyAwLCA1NjIsIDc1LCA3MyBdLFxyXG5cdFx0XHRcdHdyZWNrNSA6IFsgMCwgNTAzLCA4MywgNTkgXSxcclxuXHRcdFx0XHR3cmVjazYgOiBbIDU0LCAxMzUsIDcxLCA1OSBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJveGVzOiB7XHJcblx0XHRcdFx0Ly9MZWZ0LCBUb3AsIFJpZ2h0LCBCb3R0b21cclxuXHRcdFx0XHQwOiBbIDAsIDIwLCA0NSwgNjAgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpZCA6ICdwbGF5ZXInLFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3BsYXllcjMnOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL3JvbWFuc29sZGllci1zcHJpdGVzLnBuZycsXHJcblx0XHRcdHBhcnRzIDoge1xyXG5cdFx0XHRcdC8vIHgsIHksIHdpZHRoLCBoZWlnaHQsIGNhbnZhc09mZnNldFgsIGNhbnZhc09mZnNldFksIGhpdGJveE9mZnNldFgsIGhpdGJveE9mZnNldFkgXHJcblx0XHRcdFx0YmxhbmsgOiBbIDAsIDAsIDAsIDAgXSxcclxuXHRcdFx0XHRlYXN0IDogWyAxMzEsIDYyLCA3MywgNzAsIDAsIDAsIDI1LCAwIF0sXHJcblx0XHRcdFx0ZXNFYXN0IDogWyA3MiwgMTMyLCA2NSwgNzEsIDAsIDAsIDIxLCAwIF0sXHJcblx0XHRcdFx0c0Vhc3QgOiBbIDEzMiwgMjAzLCA1NywgNzQsIDAsIDAsIDEzLCAwIF0sXHJcblx0XHRcdFx0c291dGggOiBbIDc5LCAyMDMsIDUzLCA3NCwgMCwgMCwgNiwgMCBdLFxyXG5cdFx0XHRcdHNXZXN0IDogWyAwLCA2MiwgNjYsIDY5LCAwLCAwLCAxNSwgMCBdLFxyXG5cdFx0XHRcdHdzV2VzdCA6IFsgMCwgMjAzLCA3OSwgNzIsIDAsIDAsIDEwLCAwIF0sXHJcblx0XHRcdFx0d2VzdCA6IFsgNjYsIDYyLCA2NSwgNjkgXSxcclxuXHRcdFx0XHRqdW1waW5nIDogWyA3NSwgMjc3LCA2NCwgOTEsIC0xMiwgMTAgXSxcclxuXHRcdFx0XHRib29zdCA6IFsgMTM5LCAyNzcsIDUzLCAxMjIsIDAsIC00NSBdLFxyXG5cclxuXHRcdFx0XHQvLyBXcmVjayBzZXF1ZW5jZVxyXG5cdFx0XHRcdHdyZWNrMSA6IFsgMCwgMTMyLCA3MiwgNzAgXSxcclxuXHRcdFx0XHR3cmVjazIgOiBbIDc3LCAwLCA2MywgNTkgXSxcclxuXHRcdFx0XHR3cmVjazMgOiBbIDEzNywgMTMyLCA3MCwgNzEgXSxcclxuXHRcdFx0XHR3cmVjazQgOiBbIDAsIDI3NywgNzUsIDc3IF0sXHJcblx0XHRcdFx0d3JlY2s1IDogWyAwLCAwLCA3NywgNTUgXSxcclxuXHRcdFx0XHR3cmVjazYgOiBbIDE0MCwgMCwgNzIsIDYyIF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0Qm94ZXM6IHtcclxuXHRcdFx0XHQvL0xlZnQsIFRvcCwgUmlnaHQsIEJvdHRvbVxyXG5cdFx0XHRcdDA6IFsgMCwgMjAsIDQ1LCA2MCBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGlkIDogJ3BsYXllcicsXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge31cclxuXHRcdH0sXHJcblx0XHQncGxheWVyNCc6IHtcclxuXHRcdFx0JGltYWdlRmlsZSA6ICdhc3NldHMvc2tlbGV0b24tc3ByaXRlcy5wbmcnLFxyXG5cdFx0XHRwYXJ0cyA6IHtcclxuXHRcdFx0XHQvLyB4LCB5LCB3aWR0aCwgaGVpZ2h0LCBjYW52YXNPZmZzZXRYLCBjYW52YXNPZmZzZXRZLCBoaXRib3hPZmZzZXRYLCBoaXRib3hPZmZzZXRZIFxyXG5cdFx0XHRcdGJsYW5rIDogWyAwLCAwLCAwLCAwIF0sXHJcblx0XHRcdFx0ZWFzdCA6IFsgMCwgNjgsIDczLCA3MSwgMCwgMCwgMjUsIDAgXSxcclxuXHRcdFx0XHRlc0Vhc3QgOiBbIDczLCA2OCwgNjUsIDcxLCAwLCAwLCAyMSwgMCBdLFxyXG5cdFx0XHRcdHNFYXN0IDogWyAyMDIsIDY4LCA1NiwgNzQsIDAsIDAsIDEzLCAwIF0sXHJcblx0XHRcdFx0c291dGggOiBbIDQzNywgMCwgNDMsIDY4IF0sXHJcblx0XHRcdFx0c1dlc3QgOiBbIDI1OCwgNjgsIDU0LCA3NCwgMCBdLFxyXG5cdFx0XHRcdHdzV2VzdCA6IFsgMTM4LCA2OCwgNjQsIDcxIF0sXHJcblx0XHRcdFx0d2VzdCA6IFsgMjkwLCAwLCA2OCwgNjYgXSxcclxuXHRcdFx0XHRqdW1waW5nIDogWyAzODcsIDY4LCA1NiwgOTMsIC0zLCAxMCBdLFxyXG5cdFx0XHRcdGJvb3N0IDogWyA0NDMsIDY4LCA0NiwgMTIyLCAwLCAtNDUgXSxcclxuXHJcblx0XHRcdFx0Ly8gV3JlY2sgc2VxdWVuY2VcclxuXHRcdFx0XHR3cmVjazEgOiBbIDIyMywgMCwgNjcsIDY1IF0sXHJcblx0XHRcdFx0d3JlY2syIDogWyAxNTUsIDAsIDY4LCA2NCBdLFxyXG5cdFx0XHRcdHdyZWNrMyA6IFsgMCwgMCwgNzEsIDUxIF0sXHJcblx0XHRcdFx0d3JlY2s0IDogWyAzMTIsIDY4LCA3NSwgNzggXSxcclxuXHRcdFx0XHR3cmVjazUgOiBbIDcxLCAwLCA4NCwgNTkgXSxcclxuXHRcdFx0XHR3cmVjazYgOiBbIDM1OCwgMCwgNzksIDY3IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0Qm94ZXM6IHtcclxuXHRcdFx0XHQvL0xlZnQsIFRvcCwgUmlnaHQsIEJvdHRvbVxyXG5cdFx0XHRcdDA6IFsgMCwgMjAsIDQ1LCA2MCBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGlkIDogJ3BsYXllcicsXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge31cclxuXHRcdH0sXHJcblx0XHQndG9rZW4nIDoge1xyXG5cdFx0XHRuYW1lOiAndG9rZW4nLFxyXG5cdFx0XHQkaW1hZ2VGaWxlOiAnYXNzZXRzL3Rva2VuLXNwcml0ZXMucG5nJyxcclxuXHRcdFx0YW5pbWF0ZWQ6IHRydWUsXHJcblx0XHRcdGNvbGxlY3RpYmxlOiB0cnVlLFxyXG5cdFx0XHRwb2ludFZhbHVlczogWzEyNSwgMTUwLCAxNzUsIDIwMCwgMjUwLCAzMDAsIDM1MCwgNDAwLCA0NTAsIDUwMF0sXHJcblx0XHRcdHBhcnRzOiB7XHJcblx0XHRcdFx0ZnJhbWUxOiBbMCwgMCwgMjUsIDI2XSxcclxuXHRcdFx0XHRmcmFtZTI6IFsyNSwgMCwgMjUsIDI2XSxcclxuXHRcdFx0XHRmcmFtZTM6IFs1MCwgMCwgMjUsIDI2XSxcclxuXHRcdFx0XHRmcmFtZTQ6IFs3NSwgMCwgMjUsIDI2XVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J29pbFNsaWNrJyA6IHtcclxuXHRcdFx0JGltYWdlRmlsZSA6ICdhc3NldHMvb2lsc2xpY2stc3ByaXRlLnBuZycsXHJcblx0XHRcdHBhcnRzIDoge1xyXG5cdFx0XHRcdG1haW4gOiBbIDAsIDAsIDQwLCAxOSBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge30sXHJcblx0XHRcdGlzRHJhd25VbmRlclBsYXllcjogdHJ1ZVxyXG5cdFx0fSxcclxuXHRcdCdtb25zdGVyJyA6IHtcclxuXHRcdFx0bmFtZTogJ21vbnN0ZXInLFxyXG5cdFx0XHQkaW1hZ2VGaWxlIDogJ2Fzc2V0cy9tYWxvcmQtc3ByaXRlcy5wbmcnLFxyXG5cdFx0XHRwYXJ0cyA6IHtcclxuXHRcdFx0XHRzRWFzdDEgOiBbIDMzMiwgMTQ5LCAxNjYsIDE0OSBdLFxyXG5cdFx0XHRcdHNFYXN0MiA6IFsgMCwgMjk4LCAxNjYsIDE0OSBdLFxyXG5cdFx0XHRcdHNXZXN0MSA6IFsgMTY2LCAyOTgsIDE2NiwgMTQ5IF0sXHJcblx0XHRcdFx0c1dlc3QyIDogWyAzMzIsIDI5OCwgMTY2LCAxNDkgXSxcclxuXHRcdFx0XHRlYXRpbmcxIDogWyAwLCAwLCAxNjYsIDE0OSBdLFxyXG5cdFx0XHRcdGVhdGluZzIgOiBbIDE2NiwgMCwgMTY2LCAxNDkgXSxcclxuXHRcdFx0XHRlYXRpbmczIDogWyAzMzIsIDAsIDE2NiwgMTQ5IF0sXHJcblx0XHRcdFx0ZWF0aW5nNCA6IFsgMCwgMTQ5LCAxNjYsIDE0OSBdLFxyXG5cdFx0XHRcdGVhdGluZzUgOiBbIDE2NiwgMTQ5LCAxNjYsIDE0OSBdLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCb3hlczoge1xyXG5cdFx0XHRcdC8vTGVmdCwgVG9wLCBSaWdodCwgQm90dG9tXHJcblx0XHRcdFx0MDogWyAzMCwgNTAsIDE0NSwgMTI1IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCdqdW1wJyA6IHtcclxuXHRcdFx0JGltYWdlRmlsZSA6ICdhc3NldHMvcmFtcC1zcHJpdGUucG5nJyxcclxuXHRcdFx0cGFydHMgOiB7XHJcblx0XHRcdFx0bWFpbiA6IFsgMCwgMCwgNTQsIDM2IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0Qm94ZXM6IHtcclxuXHRcdFx0XHQvL0xlZnQsIFRvcCwgUmlnaHQsIEJvdHRvbVxyXG5cdFx0XHRcdDA6IFsgNiwgMywgNDgsIDEwIF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fSxcclxuXHRcdFx0aXNEcmF3blVuZGVyUGxheWVyOiB0cnVlXHJcblx0XHR9LFxyXG5cdFx0J3NpZ25TdGFydCcgOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL3N0YXJ0c2lnbi1zcHJpdGUucG5nJyxcclxuXHRcdFx0cGFydHMgOiB7XHJcblx0XHRcdFx0bWFpbiA6IFsgMCwgMCwgNDIsIDI3IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCdtaWxrc2hha2UnOiB7XHJcblx0XHRcdG5hbWU6ICdtaWxrc2hha2UnLFxyXG5cdFx0XHQkaW1hZ2VGaWxlOiAnYXNzZXRzL21pbGtzaGFrZS1zcHJpdGUucG5nJyxcclxuXHRcdFx0Y29sbGVjdGlibGU6IHRydWUsXHJcblx0XHRcdHBvaW50VmFsdWVzOiBbMTI1LCAxNTAsIDE3NSwgMjAwLCAyNTAsIDMwMCwgMzUwLCA0MDAsIDQ1MCwgNTAwXSxcclxuXHRcdFx0cGFydHM6IHtcclxuXHRcdFx0XHRtYWluIDogWyAwLCAwLCAyNSwgNDMgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3RyYWZmaWNDb25lTGFyZ2UnOiB7XHJcblx0XHRcdCRpbWFnZUZpbGU6ICdhc3NldHMvdHJhZmZpYy1jb25lLWxhcmdlLnBuZycsXHJcblx0XHRcdHBhcnRzOiB7XHJcblx0XHRcdFx0bWFpbiA6IFsgMCwgMCwgMzksIDQ4IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0ekluZGV4ZXNPY2N1cGllZCA6IFswLCAxXSxcclxuXHRcdFx0aGl0Qm94ZXM6IHtcclxuXHRcdFx0XHQwOiBbIDAsIDI2LCAzOSwgNDggXSxcclxuXHRcdFx0XHQxOiBbIDEyLCAwLCAyOCwgMjAgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3RyYWZmaWNDb25lU21hbGwnOiB7XHJcblx0XHRcdCRpbWFnZUZpbGU6ICdhc3NldHMvdHJhZmZpYy1jb25lLXNtYWxsLnBuZycsXHJcblx0XHRcdHBhcnRzOiB7XHJcblx0XHRcdFx0bWFpbiA6IFsgMCwgMCwgMTksIDI0IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0Qm94ZXM6IHtcclxuXHRcdFx0XHQwOiBbIDAsIDEzLCAxOSwgMjQgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J2dhcmJhZ2VDYW4nOiB7XHJcblx0XHRcdCRpbWFnZUZpbGU6ICdhc3NldHMvZ2FyYmFnZS1jYW4ucG5nJyxcclxuXHRcdFx0cGFydHM6IHtcclxuXHRcdFx0XHRtYWluIDogWyAwLCAwLCAyOSwgNDUgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCb3hlczoge1xyXG5cdFx0XHRcdDA6IFsgMSwgMzAsIDI4LCA0NCBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge31cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRmdW5jdGlvbiBvYnN0YWNsZUhpdHNNb25zdGVyQmVoYXZpb3Iob2JzdGFjbGUsIG1vbnN0ZXIpIHtcclxuXHRcdC8vIFJlbW92ZSBvYnN0YWNsZXMgYXMgbW9uc3RlciBoaXRzIHRoZW0sIHNsb3cgbW9uc3RlclxyXG5cclxuXHRcdC8vIERpc2FibGVkIG1vbnN0ZXIgc2xvd2Rvd25cclxuXHRcdC8vbW9uc3Rlci5zZXRPYnN0YWNsZUhpdFNwZWVkKCk7XHJcblx0XHRvYnN0YWNsZS5kZWxldGVPbk5leHRDeWNsZSgpO1xyXG5cdH1cclxuXHRzcHJpdGVzLmdhcmJhZ2VDYW4uaGl0QmVoYXZpb3VyLm1vbnN0ZXIgPSBvYnN0YWNsZUhpdHNNb25zdGVyQmVoYXZpb3I7XHJcblx0c3ByaXRlcy50cmFmZmljQ29uZUxhcmdlLmhpdEJlaGF2aW91ci5tb25zdGVyID0gb2JzdGFjbGVIaXRzTW9uc3RlckJlaGF2aW9yO1xyXG5cdHNwcml0ZXMudHJhZmZpY0NvbmVTbWFsbC5oaXRCZWhhdmlvdXIubW9uc3RlciA9IG9ic3RhY2xlSGl0c01vbnN0ZXJCZWhhdmlvcjtcclxuXHRzcHJpdGVzLmp1bXAuaGl0QmVoYXZpb3VyLm1vbnN0ZXIgPSBvYnN0YWNsZUhpdHNNb25zdGVyQmVoYXZpb3I7XHJcblx0c3ByaXRlcy5vaWxTbGljay5oaXRCZWhhdmlvdXIubW9uc3RlciA9IG9ic3RhY2xlSGl0c01vbnN0ZXJCZWhhdmlvcjtcclxuXHJcblx0ZnVuY3Rpb24ganVtcEhpdHNQbGF5ZXJCZWhhdmlvdXIoanVtcCwgcGxheWVyKSB7XHJcblx0XHRwbGF5ZXIuaGFzSGl0SnVtcChqdW1wKTtcclxuXHR9XHJcblx0c3ByaXRlcy5qdW1wLmhpdEJlaGF2aW91ci5wbGF5ZXIgPSBqdW1wSGl0c1BsYXllckJlaGF2aW91cjtcclxuXHJcblx0ZnVuY3Rpb24gb2JzdGFjbGVIaXRzUGxheWVyQmVoYXZpb3VyKG9ic3RhY2xlLCBwbGF5ZXIpIHtcclxuXHRcdHBsYXllci5oYXNIaXRPYnN0YWNsZShvYnN0YWNsZSk7XHJcblx0fVxyXG5cdHNwcml0ZXMudHJhZmZpY0NvbmVMYXJnZS5oaXRCZWhhdmlvdXIucGxheWVyID0gb2JzdGFjbGVIaXRzUGxheWVyQmVoYXZpb3VyO1xyXG5cdHNwcml0ZXMudHJhZmZpY0NvbmVTbWFsbC5oaXRCZWhhdmlvdXIucGxheWVyID0gb2JzdGFjbGVIaXRzUGxheWVyQmVoYXZpb3VyO1xyXG5cdHNwcml0ZXMuZ2FyYmFnZUNhbi5oaXRCZWhhdmlvdXIucGxheWVyID0gb2JzdGFjbGVIaXRzUGxheWVyQmVoYXZpb3VyO1xyXG5cclxuXHRmdW5jdGlvbiBvaWxTbGlja0hpdHNQbGF5ZXJCZWhhdmlvdXIob2lsU2xpY2ssIHBsYXllcikge1xyXG5cdFx0cGxheWVyLmhhc0hpdE9pbFNsaWNrKG9pbFNsaWNrKTtcclxuXHR9XHJcblx0c3ByaXRlcy5vaWxTbGljay5oaXRCZWhhdmlvdXIucGxheWVyID0gb2lsU2xpY2tIaXRzUGxheWVyQmVoYXZpb3VyO1xyXG5cclxuXHRmdW5jdGlvbiBwbGF5ZXJIaXRzQ29sbGVjdGlibGVCZWhhdmlvdXIoaXRlbSwgcGxheWVyKSB7XHJcblx0XHRwbGF5ZXIuaGFzSGl0Q29sbGVjdGlibGUoaXRlbSk7XHJcblx0XHRpdGVtLmRlbGV0ZU9uTmV4dEN5Y2xlKCk7XHJcblx0fVxyXG5cdHNwcml0ZXMudG9rZW4uaGl0QmVoYXZpb3VyLnBsYXllciA9IHBsYXllckhpdHNDb2xsZWN0aWJsZUJlaGF2aW91cjtcclxuXHRzcHJpdGVzLm1pbGtzaGFrZS5oaXRCZWhhdmlvdXIucGxheWVyID0gcGxheWVySGl0c0NvbGxlY3RpYmxlQmVoYXZpb3VyO1xyXG5cdFxyXG5cdGdsb2JhbC5zcHJpdGVJbmZvID0gc3ByaXRlcztcclxufSkoIHRoaXMgKTtcclxuXHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IHRoaXMuc3ByaXRlSW5mbztcclxufSIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTIgQ3JhaWcgQ2FtcGJlbGxcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKiBNb3VzZXRyYXAgaXMgYSBzaW1wbGUga2V5Ym9hcmQgc2hvcnRjdXQgbGlicmFyeSBmb3IgSmF2YXNjcmlwdCB3aXRoXG4gKiBubyBleHRlcm5hbCBkZXBlbmRlbmNpZXNcbiAqXG4gKiBAdmVyc2lvbiAxLjEuM1xuICogQHVybCBjcmFpZy5pcy9raWxsaW5nL21pY2VcbiAqL1xuKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogbWFwcGluZyBvZiBzcGVjaWFsIGtleWNvZGVzIHRvIHRoZWlyIGNvcnJlc3BvbmRpbmcga2V5c1xuICAgICAqXG4gICAgICogZXZlcnl0aGluZyBpbiB0aGlzIGRpY3Rpb25hcnkgY2Fubm90IHVzZSBrZXlwcmVzcyBldmVudHNcbiAgICAgKiBzbyBpdCBoYXMgdG8gYmUgaGVyZSB0byBtYXAgdG8gdGhlIGNvcnJlY3Qga2V5Y29kZXMgZm9yXG4gICAgICoga2V5dXAva2V5ZG93biBldmVudHNcbiAgICAgKlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgdmFyIF9NQVAgPSB7XG4gICAgICAgICAgICA4OiAnYmFja3NwYWNlJyxcbiAgICAgICAgICAgIDk6ICd0YWInLFxuICAgICAgICAgICAgMTM6ICdlbnRlcicsXG4gICAgICAgICAgICAxNjogJ3NoaWZ0JyxcbiAgICAgICAgICAgIDE3OiAnY3RybCcsXG4gICAgICAgICAgICAxODogJ2FsdCcsXG4gICAgICAgICAgICAyMDogJ2NhcHNsb2NrJyxcbiAgICAgICAgICAgIDI3OiAnZXNjJyxcbiAgICAgICAgICAgIDMyOiAnc3BhY2UnLFxuICAgICAgICAgICAgMzM6ICdwYWdldXAnLFxuICAgICAgICAgICAgMzQ6ICdwYWdlZG93bicsXG4gICAgICAgICAgICAzNTogJ2VuZCcsXG4gICAgICAgICAgICAzNjogJ2hvbWUnLFxuICAgICAgICAgICAgMzc6ICdsZWZ0JyxcbiAgICAgICAgICAgIDM4OiAndXAnLFxuICAgICAgICAgICAgMzk6ICdyaWdodCcsXG4gICAgICAgICAgICA0MDogJ2Rvd24nLFxuICAgICAgICAgICAgNDU6ICdpbnMnLFxuICAgICAgICAgICAgNDY6ICdkZWwnLFxuICAgICAgICAgICAgOTE6ICdtZXRhJyxcbiAgICAgICAgICAgIDkzOiAnbWV0YScsXG4gICAgICAgICAgICAyMjQ6ICdtZXRhJ1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBtYXBwaW5nIGZvciBzcGVjaWFsIGNoYXJhY3RlcnMgc28gdGhleSBjYW4gc3VwcG9ydFxuICAgICAgICAgKlxuICAgICAgICAgKiB0aGlzIGRpY3Rpb25hcnkgaXMgb25seSB1c2VkIGluY2FzZSB5b3Ugd2FudCB0byBiaW5kIGFcbiAgICAgICAgICoga2V5dXAgb3Iga2V5ZG93biBldmVudCB0byBvbmUgb2YgdGhlc2Uga2V5c1xuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgX0tFWUNPREVfTUFQID0ge1xuICAgICAgICAgICAgMTA2OiAnKicsXG4gICAgICAgICAgICAxMDc6ICcrJyxcbiAgICAgICAgICAgIDEwOTogJy0nLFxuICAgICAgICAgICAgMTEwOiAnLicsXG4gICAgICAgICAgICAxMTEgOiAnLycsXG4gICAgICAgICAgICAxODY6ICc7JyxcbiAgICAgICAgICAgIDE4NzogJz0nLFxuICAgICAgICAgICAgMTg4OiAnLCcsXG4gICAgICAgICAgICAxODk6ICctJyxcbiAgICAgICAgICAgIDE5MDogJy4nLFxuICAgICAgICAgICAgMTkxOiAnLycsXG4gICAgICAgICAgICAxOTI6ICdgJyxcbiAgICAgICAgICAgIDIxOTogJ1snLFxuICAgICAgICAgICAgMjIwOiAnXFxcXCcsXG4gICAgICAgICAgICAyMjE6ICddJyxcbiAgICAgICAgICAgIDIyMjogJ1xcJydcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogdGhpcyBpcyBhIG1hcHBpbmcgb2Yga2V5cyB0aGF0IHJlcXVpcmUgc2hpZnQgb24gYSBVUyBrZXlwYWRcbiAgICAgICAgICogYmFjayB0byB0aGUgbm9uIHNoaWZ0IGVxdWl2ZWxlbnRzXG4gICAgICAgICAqXG4gICAgICAgICAqIHRoaXMgaXMgc28geW91IGNhbiB1c2Uga2V5dXAgZXZlbnRzIHdpdGggdGhlc2Uga2V5c1xuICAgICAgICAgKlxuICAgICAgICAgKiBub3RlIHRoYXQgdGhpcyB3aWxsIG9ubHkgd29yayByZWxpYWJseSBvbiBVUyBrZXlib2FyZHNcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIF9TSElGVF9NQVAgPSB7XG4gICAgICAgICAgICAnfic6ICdgJyxcbiAgICAgICAgICAgICchJzogJzEnLFxuICAgICAgICAgICAgJ0AnOiAnMicsXG4gICAgICAgICAgICAnIyc6ICczJyxcbiAgICAgICAgICAgICckJzogJzQnLFxuICAgICAgICAgICAgJyUnOiAnNScsXG4gICAgICAgICAgICAnXic6ICc2JyxcbiAgICAgICAgICAgICcmJzogJzcnLFxuICAgICAgICAgICAgJyonOiAnOCcsXG4gICAgICAgICAgICAnKCc6ICc5JyxcbiAgICAgICAgICAgICcpJzogJzAnLFxuICAgICAgICAgICAgJ18nOiAnLScsXG4gICAgICAgICAgICAnKyc6ICc9JyxcbiAgICAgICAgICAgICc6JzogJzsnLFxuICAgICAgICAgICAgJ1xcXCInOiAnXFwnJyxcbiAgICAgICAgICAgICc8JzogJywnLFxuICAgICAgICAgICAgJz4nOiAnLicsXG4gICAgICAgICAgICAnPyc6ICcvJyxcbiAgICAgICAgICAgICd8JzogJ1xcXFwnXG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHRoaXMgaXMgYSBsaXN0IG9mIHNwZWNpYWwgc3RyaW5ncyB5b3UgY2FuIHVzZSB0byBtYXBcbiAgICAgICAgICogdG8gbW9kaWZpZXIga2V5cyB3aGVuIHlvdSBzcGVjaWZ5IHlvdXIga2V5Ym9hcmQgc2hvcnRjdXRzXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBfU1BFQ0lBTF9BTElBU0VTID0ge1xuICAgICAgICAgICAgJ29wdGlvbic6ICdhbHQnLFxuICAgICAgICAgICAgJ2NvbW1hbmQnOiAnbWV0YScsXG4gICAgICAgICAgICAncmV0dXJuJzogJ2VudGVyJyxcbiAgICAgICAgICAgICdlc2NhcGUnOiAnZXNjJ1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiB2YXJpYWJsZSB0byBzdG9yZSB0aGUgZmxpcHBlZCB2ZXJzaW9uIG9mIF9NQVAgZnJvbSBhYm92ZVxuICAgICAgICAgKiBuZWVkZWQgdG8gY2hlY2sgaWYgd2Ugc2hvdWxkIHVzZSBrZXlwcmVzcyBvciBub3Qgd2hlbiBubyBhY3Rpb25cbiAgICAgICAgICogaXMgc3BlY2lmaWVkXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R8dW5kZWZpbmVkfVxuICAgICAgICAgKi9cbiAgICAgICAgX1JFVkVSU0VfTUFQLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBhIGxpc3Qgb2YgYWxsIHRoZSBjYWxsYmFja3Mgc2V0dXAgdmlhIE1vdXNldHJhcC5iaW5kKClcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIF9jYWxsYmFja3MgPSB7fSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogZGlyZWN0IG1hcCBvZiBzdHJpbmcgY29tYmluYXRpb25zIHRvIGNhbGxiYWNrcyB1c2VkIGZvciB0cmlnZ2VyKClcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIF9kaXJlY3RfbWFwID0ge30sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIGtlZXBzIHRyYWNrIG9mIHdoYXQgbGV2ZWwgZWFjaCBzZXF1ZW5jZSBpcyBhdCBzaW5jZSBtdWx0aXBsZVxuICAgICAgICAgKiBzZXF1ZW5jZXMgY2FuIHN0YXJ0IG91dCB3aXRoIHRoZSBzYW1lIHNlcXVlbmNlXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBfc2VxdWVuY2VfbGV2ZWxzID0ge30sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHZhcmlhYmxlIHRvIHN0b3JlIHRoZSBzZXRUaW1lb3V0IGNhbGxcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge251bGx8bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgX3Jlc2V0X3RpbWVyLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiB0ZW1wb3Jhcnkgc3RhdGUgd2hlcmUgd2Ugd2lsbCBpZ25vcmUgdGhlIG5leHQga2V5dXBcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW58c3RyaW5nfVxuICAgICAgICAgKi9cbiAgICAgICAgX2lnbm9yZV9uZXh0X2tleXVwID0gZmFsc2UsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIGFyZSB3ZSBjdXJyZW50bHkgaW5zaWRlIG9mIGEgc2VxdWVuY2U/XG4gICAgICAgICAqIHR5cGUgb2YgYWN0aW9uIChcImtleXVwXCIgb3IgXCJrZXlkb3duXCIgb3IgXCJrZXlwcmVzc1wiKSBvciBmYWxzZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbnxzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBfaW5zaWRlX3NlcXVlbmNlID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBsb29wIHRocm91Z2ggdGhlIGYga2V5cywgZjEgdG8gZjE5IGFuZCBhZGQgdGhlbSB0byB0aGUgbWFwXG4gICAgICogcHJvZ3JhbWF0aWNhbGx5XG4gICAgICovXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCAyMDsgKytpKSB7XG4gICAgICAgIF9NQVBbMTExICsgaV0gPSAnZicgKyBpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGxvb3AgdGhyb3VnaCB0byBtYXAgbnVtYmVycyBvbiB0aGUgbnVtZXJpYyBrZXlwYWRcbiAgICAgKi9cbiAgICBmb3IgKGkgPSAwOyBpIDw9IDk7ICsraSkge1xuICAgICAgICBfTUFQW2kgKyA5Nl0gPSBpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNyb3NzIGJyb3dzZXIgYWRkIGV2ZW50IG1ldGhvZFxuICAgICAqXG4gICAgICogQHBhcmFtIHtFbGVtZW50fEhUTUxEb2N1bWVudH0gb2JqZWN0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfYWRkRXZlbnQob2JqZWN0LCB0eXBlLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAob2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIG9iamVjdC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGNhbGxiYWNrLCBmYWxzZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBvYmplY3QuYXR0YWNoRXZlbnQoJ29uJyArIHR5cGUsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiB0YWtlcyB0aGUgZXZlbnQgYW5kIHJldHVybnMgdGhlIGtleSBjaGFyYWN0ZXJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGVcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2NoYXJhY3RlckZyb21FdmVudChlKSB7XG5cbiAgICAgICAgLy8gZm9yIGtleXByZXNzIGV2ZW50cyB3ZSBzaG91bGQgcmV0dXJuIHRoZSBjaGFyYWN0ZXIgYXMgaXNcbiAgICAgICAgaWYgKGUudHlwZSA9PSAna2V5cHJlc3MnKSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShlLndoaWNoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZvciBub24ga2V5cHJlc3MgZXZlbnRzIHRoZSBzcGVjaWFsIG1hcHMgYXJlIG5lZWRlZFxuICAgICAgICBpZiAoX01BUFtlLndoaWNoXSkge1xuICAgICAgICAgICAgcmV0dXJuIF9NQVBbZS53aGljaF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoX0tFWUNPREVfTUFQW2Uud2hpY2hdKSB7XG4gICAgICAgICAgICByZXR1cm4gX0tFWUNPREVfTUFQW2Uud2hpY2hdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgaXQgaXMgbm90IGluIHRoZSBzcGVjaWFsIG1hcFxuICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShlLndoaWNoKS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNoZWNrcyBpZiB0d28gYXJyYXlzIGFyZSBlcXVhbFxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gbW9kaWZpZXJzMVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG1vZGlmaWVyczJcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfbW9kaWZpZXJzTWF0Y2gobW9kaWZpZXJzMSwgbW9kaWZpZXJzMikge1xuICAgICAgICByZXR1cm4gbW9kaWZpZXJzMS5zb3J0KCkuam9pbignLCcpID09PSBtb2RpZmllcnMyLnNvcnQoKS5qb2luKCcsJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXRzIGFsbCBzZXF1ZW5jZSBjb3VudGVycyBleGNlcHQgZm9yIHRoZSBvbmVzIHBhc3NlZCBpblxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRvX25vdF9yZXNldFxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfcmVzZXRTZXF1ZW5jZXMoZG9fbm90X3Jlc2V0KSB7XG4gICAgICAgIGRvX25vdF9yZXNldCA9IGRvX25vdF9yZXNldCB8fCB7fTtcblxuICAgICAgICB2YXIgYWN0aXZlX3NlcXVlbmNlcyA9IGZhbHNlLFxuICAgICAgICAgICAga2V5O1xuXG4gICAgICAgIGZvciAoa2V5IGluIF9zZXF1ZW5jZV9sZXZlbHMpIHtcbiAgICAgICAgICAgIGlmIChkb19ub3RfcmVzZXRba2V5XSkge1xuICAgICAgICAgICAgICAgIGFjdGl2ZV9zZXF1ZW5jZXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX3NlcXVlbmNlX2xldmVsc1trZXldID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghYWN0aXZlX3NlcXVlbmNlcykge1xuICAgICAgICAgICAgX2luc2lkZV9zZXF1ZW5jZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZmluZHMgYWxsIGNhbGxiYWNrcyB0aGF0IG1hdGNoIGJhc2VkIG9uIHRoZSBrZXljb2RlLCBtb2RpZmllcnMsXG4gICAgICogYW5kIGFjdGlvblxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNoYXJhY3RlclxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG1vZGlmaWVyc1xuICAgICAqIEBwYXJhbSB7RXZlbnR8T2JqZWN0fSBlXG4gICAgICogQHBhcmFtIHtib29sZWFuPX0gcmVtb3ZlIC0gc2hvdWxkIHdlIHJlbW92ZSBhbnkgbWF0Y2hlc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nPX0gY29tYmluYXRpb25cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldE1hdGNoZXMoY2hhcmFjdGVyLCBtb2RpZmllcnMsIGUsIHJlbW92ZSwgY29tYmluYXRpb24pIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgICBjYWxsYmFjayxcbiAgICAgICAgICAgIG1hdGNoZXMgPSBbXSxcbiAgICAgICAgICAgIGFjdGlvbiA9IGUudHlwZTtcblxuICAgICAgICAvLyBpZiB0aGVyZSBhcmUgbm8gZXZlbnRzIHJlbGF0ZWQgdG8gdGhpcyBrZXljb2RlXG4gICAgICAgIGlmICghX2NhbGxiYWNrc1tjaGFyYWN0ZXJdKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiBhIG1vZGlmaWVyIGtleSBpcyBjb21pbmcgdXAgb24gaXRzIG93biB3ZSBzaG91bGQgYWxsb3cgaXRcbiAgICAgICAgaWYgKGFjdGlvbiA9PSAna2V5dXAnICYmIF9pc01vZGlmaWVyKGNoYXJhY3RlcikpIHtcbiAgICAgICAgICAgIG1vZGlmaWVycyA9IFtjaGFyYWN0ZXJdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbG9vcCB0aHJvdWdoIGFsbCBjYWxsYmFja3MgZm9yIHRoZSBrZXkgdGhhdCB3YXMgcHJlc3NlZFxuICAgICAgICAvLyBhbmQgc2VlIGlmIGFueSBvZiB0aGVtIG1hdGNoXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBfY2FsbGJhY2tzW2NoYXJhY3Rlcl0ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gX2NhbGxiYWNrc1tjaGFyYWN0ZXJdW2ldO1xuXG4gICAgICAgICAgICAvLyBpZiB0aGlzIGlzIGEgc2VxdWVuY2UgYnV0IGl0IGlzIG5vdCBhdCB0aGUgcmlnaHQgbGV2ZWxcbiAgICAgICAgICAgIC8vIHRoZW4gbW92ZSBvbnRvIHRoZSBuZXh0IG1hdGNoXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2suc2VxICYmIF9zZXF1ZW5jZV9sZXZlbHNbY2FsbGJhY2suc2VxXSAhPSBjYWxsYmFjay5sZXZlbCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGUgYWN0aW9uIHdlIGFyZSBsb29raW5nIGZvciBkb2Vzbid0IG1hdGNoIHRoZSBhY3Rpb24gd2UgZ290XG4gICAgICAgICAgICAvLyB0aGVuIHdlIHNob3VsZCBrZWVwIGdvaW5nXG4gICAgICAgICAgICBpZiAoYWN0aW9uICE9IGNhbGxiYWNrLmFjdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGlzIGlzIGEga2V5cHJlc3MgZXZlbnQgYW5kIHRoZSBtZXRhIGtleSBhbmQgY29udHJvbCBrZXlcbiAgICAgICAgICAgIC8vIGFyZSBub3QgcHJlc3NlZCB0aGF0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byBvbmx5IGxvb2sgYXQgdGhlXG4gICAgICAgICAgICAvLyBjaGFyYWN0ZXIsIG90aGVyd2lzZSBjaGVjayB0aGUgbW9kaWZpZXJzIGFzIHdlbGxcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBjaHJvbWUgd2lsbCBub3QgZmlyZSBhIGtleXByZXNzIGlmIG1ldGEgb3IgY29udHJvbCBpcyBkb3duXG4gICAgICAgICAgICAvLyBzYWZhcmkgd2lsbCBmaXJlIGEga2V5cHJlc3MgaWYgbWV0YSBvciBtZXRhK3NoaWZ0IGlzIGRvd25cbiAgICAgICAgICAgIC8vIGZpcmVmb3ggd2lsbCBmaXJlIGEga2V5cHJlc3MgaWYgbWV0YSBvciBjb250cm9sIGlzIGRvd25cbiAgICAgICAgICAgIGlmICgoYWN0aW9uID09ICdrZXlwcmVzcycgJiYgIWUubWV0YUtleSAmJiAhZS5jdHJsS2V5KSB8fCBfbW9kaWZpZXJzTWF0Y2gobW9kaWZpZXJzLCBjYWxsYmFjay5tb2RpZmllcnMpKSB7XG5cbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgaXMgdXNlZCBzbyBpZiB5b3UgY2hhbmdlIHlvdXIgbWluZCBhbmQgY2FsbCBiaW5kIGFcbiAgICAgICAgICAgICAgICAvLyBzZWNvbmQgdGltZSB3aXRoIGEgbmV3IGZ1bmN0aW9uIHRoZSBmaXJzdCBvbmUgaXMgb3ZlcndyaXR0ZW5cbiAgICAgICAgICAgICAgICBpZiAocmVtb3ZlICYmIGNhbGxiYWNrLmNvbWJvID09IGNvbWJpbmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIF9jYWxsYmFja3NbY2hhcmFjdGVyXS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbWF0Y2hlcy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtYXRjaGVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHRha2VzIGEga2V5IGV2ZW50IGFuZCBmaWd1cmVzIG91dCB3aGF0IHRoZSBtb2RpZmllcnMgYXJlXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9ldmVudE1vZGlmaWVycyhlKSB7XG4gICAgICAgIHZhciBtb2RpZmllcnMgPSBbXTtcblxuICAgICAgICBpZiAoZS5zaGlmdEtleSkge1xuICAgICAgICAgICAgbW9kaWZpZXJzLnB1c2goJ3NoaWZ0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZS5hbHRLZXkpIHtcbiAgICAgICAgICAgIG1vZGlmaWVycy5wdXNoKCdhbHQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlLmN0cmxLZXkpIHtcbiAgICAgICAgICAgIG1vZGlmaWVycy5wdXNoKCdjdHJsJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZS5tZXRhS2V5KSB7XG4gICAgICAgICAgICBtb2RpZmllcnMucHVzaCgnbWV0YScpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vZGlmaWVycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBhY3R1YWxseSBjYWxscyB0aGUgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKlxuICAgICAqIGlmIHlvdXIgY2FsbGJhY2sgZnVuY3Rpb24gcmV0dXJucyBmYWxzZSB0aGlzIHdpbGwgdXNlIHRoZSBqcXVlcnlcbiAgICAgKiBjb252ZW50aW9uIC0gcHJldmVudCBkZWZhdWx0IGFuZCBzdG9wIHByb3BvZ2F0aW9uIG9uIHRoZSBldmVudFxuICAgICAqXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9maXJlQ2FsbGJhY2soY2FsbGJhY2ssIGUpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKGUpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgaWYgKGUucHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChlLnN0b3BQcm9wYWdhdGlvbikge1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGUucmV0dXJuVmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGhhbmRsZXMgYSBjaGFyYWN0ZXIga2V5IGV2ZW50XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2hhcmFjdGVyXG4gICAgICogQHBhcmFtIHtFdmVudH0gZVxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfaGFuZGxlQ2hhcmFjdGVyKGNoYXJhY3RlciwgZSkge1xuXG4gICAgICAgIC8vIGlmIHRoaXMgZXZlbnQgc2hvdWxkIG5vdCBoYXBwZW4gc3RvcCBoZXJlXG4gICAgICAgIGlmIChNb3VzZXRyYXAuc3RvcENhbGxiYWNrKGUsIGUudGFyZ2V0IHx8IGUuc3JjRWxlbWVudCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjYWxsYmFja3MgPSBfZ2V0TWF0Y2hlcyhjaGFyYWN0ZXIsIF9ldmVudE1vZGlmaWVycyhlKSwgZSksXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgZG9fbm90X3Jlc2V0ID0ge30sXG4gICAgICAgICAgICBwcm9jZXNzZWRfc2VxdWVuY2VfY2FsbGJhY2sgPSBmYWxzZTtcblxuICAgICAgICAvLyBsb29wIHRocm91Z2ggbWF0Y2hpbmcgY2FsbGJhY2tzIGZvciB0aGlzIGtleSBldmVudFxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgKytpKSB7XG5cbiAgICAgICAgICAgIC8vIGZpcmUgZm9yIGFsbCBzZXF1ZW5jZSBjYWxsYmFja3NcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgYmVjYXVzZSBpZiBmb3IgZXhhbXBsZSB5b3UgaGF2ZSBtdWx0aXBsZSBzZXF1ZW5jZXNcbiAgICAgICAgICAgIC8vIGJvdW5kIHN1Y2ggYXMgXCJnIGlcIiBhbmQgXCJnIHRcIiB0aGV5IGJvdGggbmVlZCB0byBmaXJlIHRoZVxuICAgICAgICAgICAgLy8gY2FsbGJhY2sgZm9yIG1hdGNoaW5nIGcgY2F1c2Ugb3RoZXJ3aXNlIHlvdSBjYW4gb25seSBldmVyXG4gICAgICAgICAgICAvLyBtYXRjaCB0aGUgZmlyc3Qgb25lXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2tzW2ldLnNlcSkge1xuICAgICAgICAgICAgICAgIHByb2Nlc3NlZF9zZXF1ZW5jZV9jYWxsYmFjayA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAvLyBrZWVwIGEgbGlzdCBvZiB3aGljaCBzZXF1ZW5jZXMgd2VyZSBtYXRjaGVzIGZvciBsYXRlclxuICAgICAgICAgICAgICAgIGRvX25vdF9yZXNldFtjYWxsYmFja3NbaV0uc2VxXSA9IDE7XG4gICAgICAgICAgICAgICAgX2ZpcmVDYWxsYmFjayhjYWxsYmFja3NbaV0uY2FsbGJhY2ssIGUpO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGVyZSB3ZXJlIG5vIHNlcXVlbmNlIG1hdGNoZXMgYnV0IHdlIGFyZSBzdGlsbCBoZXJlXG4gICAgICAgICAgICAvLyB0aGF0IG1lYW5zIHRoaXMgaXMgYSByZWd1bGFyIG1hdGNoIHNvIHdlIHNob3VsZCBmaXJlIHRoYXRcbiAgICAgICAgICAgIGlmICghcHJvY2Vzc2VkX3NlcXVlbmNlX2NhbGxiYWNrICYmICFfaW5zaWRlX3NlcXVlbmNlKSB7XG4gICAgICAgICAgICAgICAgX2ZpcmVDYWxsYmFjayhjYWxsYmFja3NbaV0uY2FsbGJhY2ssIGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgeW91IGFyZSBpbnNpZGUgb2YgYSBzZXF1ZW5jZSBhbmQgdGhlIGtleSB5b3UgYXJlIHByZXNzaW5nXG4gICAgICAgIC8vIGlzIG5vdCBhIG1vZGlmaWVyIGtleSB0aGVuIHdlIHNob3VsZCByZXNldCBhbGwgc2VxdWVuY2VzXG4gICAgICAgIC8vIHRoYXQgd2VyZSBub3QgbWF0Y2hlZCBieSB0aGlzIGtleSBldmVudFxuICAgICAgICBpZiAoZS50eXBlID09IF9pbnNpZGVfc2VxdWVuY2UgJiYgIV9pc01vZGlmaWVyKGNoYXJhY3RlcikpIHtcbiAgICAgICAgICAgIF9yZXNldFNlcXVlbmNlcyhkb19ub3RfcmVzZXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaGFuZGxlcyBhIGtleWRvd24gZXZlbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGVcbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2hhbmRsZUtleShlKSB7XG5cbiAgICAgICAgLy8gbm9ybWFsaXplIGUud2hpY2ggZm9yIGtleSBldmVudHNcbiAgICAgICAgLy8gQHNlZSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzQyODU2MjcvamF2YXNjcmlwdC1rZXljb2RlLXZzLWNoYXJjb2RlLXV0dGVyLWNvbmZ1c2lvblxuICAgICAgICBlLndoaWNoID0gdHlwZW9mIGUud2hpY2ggPT0gXCJudW1iZXJcIiA/IGUud2hpY2ggOiBlLmtleUNvZGU7XG5cbiAgICAgICAgdmFyIGNoYXJhY3RlciA9IF9jaGFyYWN0ZXJGcm9tRXZlbnQoZSk7XG5cbiAgICAgICAgLy8gbm8gY2hhcmFjdGVyIGZvdW5kIHRoZW4gc3RvcFxuICAgICAgICBpZiAoIWNoYXJhY3Rlcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGUudHlwZSA9PSAna2V5dXAnICYmIF9pZ25vcmVfbmV4dF9rZXl1cCA9PSBjaGFyYWN0ZXIpIHtcbiAgICAgICAgICAgIF9pZ25vcmVfbmV4dF9rZXl1cCA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgX2hhbmRsZUNoYXJhY3RlcihjaGFyYWN0ZXIsIGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRldGVybWluZXMgaWYgdGhlIGtleWNvZGUgc3BlY2lmaWVkIGlzIGEgbW9kaWZpZXIga2V5IG9yIG5vdFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9pc01vZGlmaWVyKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5ID09ICdzaGlmdCcgfHwga2V5ID09ICdjdHJsJyB8fCBrZXkgPT0gJ2FsdCcgfHwga2V5ID09ICdtZXRhJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjYWxsZWQgdG8gc2V0IGEgMSBzZWNvbmQgdGltZW91dCBvbiB0aGUgc3BlY2lmaWVkIHNlcXVlbmNlXG4gICAgICpcbiAgICAgKiB0aGlzIGlzIHNvIGFmdGVyIGVhY2gga2V5IHByZXNzIGluIHRoZSBzZXF1ZW5jZSB5b3UgaGF2ZSAxIHNlY29uZFxuICAgICAqIHRvIHByZXNzIHRoZSBuZXh0IGtleSBiZWZvcmUgeW91IGhhdmUgdG8gc3RhcnQgb3ZlclxuICAgICAqXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9yZXNldFNlcXVlbmNlVGltZXIoKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChfcmVzZXRfdGltZXIpO1xuICAgICAgICBfcmVzZXRfdGltZXIgPSBzZXRUaW1lb3V0KF9yZXNldFNlcXVlbmNlcywgMTAwMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmV2ZXJzZXMgdGhlIG1hcCBsb29rdXAgc28gdGhhdCB3ZSBjYW4gbG9vayBmb3Igc3BlY2lmaWMga2V5c1xuICAgICAqIHRvIHNlZSB3aGF0IGNhbiBhbmQgY2FuJ3QgdXNlIGtleXByZXNzXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJldmVyc2VNYXAoKSB7XG4gICAgICAgIGlmICghX1JFVkVSU0VfTUFQKSB7XG4gICAgICAgICAgICBfUkVWRVJTRV9NQVAgPSB7fTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBfTUFQKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBwdWxsIG91dCB0aGUgbnVtZXJpYyBrZXlwYWQgZnJvbSBoZXJlIGNhdXNlIGtleXByZXNzIHNob3VsZFxuICAgICAgICAgICAgICAgIC8vIGJlIGFibGUgdG8gZGV0ZWN0IHRoZSBrZXlzIGZyb20gdGhlIGNoYXJhY3RlclxuICAgICAgICAgICAgICAgIGlmIChrZXkgPiA5NSAmJiBrZXkgPCAxMTIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKF9NQVAuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBfUkVWRVJTRV9NQVBbX01BUFtrZXldXSA9IGtleTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF9SRVZFUlNFX01BUDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBwaWNrcyB0aGUgYmVzdCBhY3Rpb24gYmFzZWQgb24gdGhlIGtleSBjb21iaW5hdGlvblxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSAtIGNoYXJhY3RlciBmb3Iga2V5XG4gICAgICogQHBhcmFtIHtBcnJheX0gbW9kaWZpZXJzXG4gICAgICogQHBhcmFtIHtzdHJpbmc9fSBhY3Rpb24gcGFzc2VkIGluXG4gICAgICovXG4gICAgZnVuY3Rpb24gX3BpY2tCZXN0QWN0aW9uKGtleSwgbW9kaWZpZXJzLCBhY3Rpb24pIHtcblxuICAgICAgICAvLyBpZiBubyBhY3Rpb24gd2FzIHBpY2tlZCBpbiB3ZSBzaG91bGQgdHJ5IHRvIHBpY2sgdGhlIG9uZVxuICAgICAgICAvLyB0aGF0IHdlIHRoaW5rIHdvdWxkIHdvcmsgYmVzdCBmb3IgdGhpcyBrZXlcbiAgICAgICAgaWYgKCFhY3Rpb24pIHtcbiAgICAgICAgICAgIGFjdGlvbiA9IF9nZXRSZXZlcnNlTWFwKClba2V5XSA/ICdrZXlkb3duJyA6ICdrZXlwcmVzcyc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBtb2RpZmllciBrZXlzIGRvbid0IHdvcmsgYXMgZXhwZWN0ZWQgd2l0aCBrZXlwcmVzcyxcbiAgICAgICAgLy8gc3dpdGNoIHRvIGtleWRvd25cbiAgICAgICAgaWYgKGFjdGlvbiA9PSAna2V5cHJlc3MnICYmIG1vZGlmaWVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFjdGlvbiA9ICdrZXlkb3duJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhY3Rpb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogYmluZHMgYSBrZXkgc2VxdWVuY2UgdG8gYW4gZXZlbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb21ibyAtIGNvbWJvIHNwZWNpZmllZCBpbiBiaW5kIGNhbGxcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBrZXlzXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge3N0cmluZz19IGFjdGlvblxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfYmluZFNlcXVlbmNlKGNvbWJvLCBrZXlzLCBjYWxsYmFjaywgYWN0aW9uKSB7XG5cbiAgICAgICAgLy8gc3RhcnQgb2ZmIGJ5IGFkZGluZyBhIHNlcXVlbmNlIGxldmVsIHJlY29yZCBmb3IgdGhpcyBjb21iaW5hdGlvblxuICAgICAgICAvLyBhbmQgc2V0dGluZyB0aGUgbGV2ZWwgdG8gMFxuICAgICAgICBfc2VxdWVuY2VfbGV2ZWxzW2NvbWJvXSA9IDA7XG5cbiAgICAgICAgLy8gaWYgdGhlcmUgaXMgbm8gYWN0aW9uIHBpY2sgdGhlIGJlc3Qgb25lIGZvciB0aGUgZmlyc3Qga2V5XG4gICAgICAgIC8vIGluIHRoZSBzZXF1ZW5jZVxuICAgICAgICBpZiAoIWFjdGlvbikge1xuICAgICAgICAgICAgYWN0aW9uID0gX3BpY2tCZXN0QWN0aW9uKGtleXNbMF0sIFtdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBjYWxsYmFjayB0byBpbmNyZWFzZSB0aGUgc2VxdWVuY2UgbGV2ZWwgZm9yIHRoaXMgc2VxdWVuY2UgYW5kIHJlc2V0XG4gICAgICAgICAqIGFsbCBvdGhlciBzZXF1ZW5jZXMgdGhhdCB3ZXJlIGFjdGl2ZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgIHZhciBfaW5jcmVhc2VTZXF1ZW5jZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBfaW5zaWRlX3NlcXVlbmNlID0gYWN0aW9uO1xuICAgICAgICAgICAgICAgICsrX3NlcXVlbmNlX2xldmVsc1tjb21ib107XG4gICAgICAgICAgICAgICAgX3Jlc2V0U2VxdWVuY2VUaW1lcigpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiB3cmFwcyB0aGUgc3BlY2lmaWVkIGNhbGxiYWNrIGluc2lkZSBvZiBhbm90aGVyIGZ1bmN0aW9uIGluIG9yZGVyXG4gICAgICAgICAgICAgKiB0byByZXNldCBhbGwgc2VxdWVuY2UgY291bnRlcnMgYXMgc29vbiBhcyB0aGlzIHNlcXVlbmNlIGlzIGRvbmVcbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9jYWxsYmFja0FuZFJlc2V0ID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIF9maXJlQ2FsbGJhY2soY2FsbGJhY2ssIGUpO1xuXG4gICAgICAgICAgICAgICAgLy8gd2Ugc2hvdWxkIGlnbm9yZSB0aGUgbmV4dCBrZXkgdXAgaWYgdGhlIGFjdGlvbiBpcyBrZXkgZG93blxuICAgICAgICAgICAgICAgIC8vIG9yIGtleXByZXNzLiAgdGhpcyBpcyBzbyBpZiB5b3UgZmluaXNoIGEgc2VxdWVuY2UgYW5kXG4gICAgICAgICAgICAgICAgLy8gcmVsZWFzZSB0aGUga2V5IHRoZSBmaW5hbCBrZXkgd2lsbCBub3QgdHJpZ2dlciBhIGtleXVwXG4gICAgICAgICAgICAgICAgaWYgKGFjdGlvbiAhPT0gJ2tleXVwJykge1xuICAgICAgICAgICAgICAgICAgICBfaWdub3JlX25leHRfa2V5dXAgPSBfY2hhcmFjdGVyRnJvbUV2ZW50KGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIHdlaXJkIHJhY2UgY29uZGl0aW9uIGlmIGEgc2VxdWVuY2UgZW5kcyB3aXRoIHRoZSBrZXlcbiAgICAgICAgICAgICAgICAvLyBhbm90aGVyIHNlcXVlbmNlIGJlZ2lucyB3aXRoXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChfcmVzZXRTZXF1ZW5jZXMsIDEwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpO1xuXG4gICAgICAgIC8vIGxvb3AgdGhyb3VnaCBrZXlzIG9uZSBhdCBhIHRpbWUgYW5kIGJpbmQgdGhlIGFwcHJvcHJpYXRlIGNhbGxiYWNrXG4gICAgICAgIC8vIGZ1bmN0aW9uLiAgZm9yIGFueSBrZXkgbGVhZGluZyB1cCB0byB0aGUgZmluYWwgb25lIGl0IHNob3VsZFxuICAgICAgICAvLyBpbmNyZWFzZSB0aGUgc2VxdWVuY2UuIGFmdGVyIHRoZSBmaW5hbCwgaXQgc2hvdWxkIHJlc2V0IGFsbCBzZXF1ZW5jZXNcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIF9iaW5kU2luZ2xlKGtleXNbaV0sIGkgPCBrZXlzLmxlbmd0aCAtIDEgPyBfaW5jcmVhc2VTZXF1ZW5jZSA6IF9jYWxsYmFja0FuZFJlc2V0LCBhY3Rpb24sIGNvbWJvLCBpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGJpbmRzIGEgc2luZ2xlIGtleWJvYXJkIGNvbWJpbmF0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29tYmluYXRpb25cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7c3RyaW5nPX0gYWN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmc9fSBzZXF1ZW5jZV9uYW1lIC0gbmFtZSBvZiBzZXF1ZW5jZSBpZiBwYXJ0IG9mIHNlcXVlbmNlXG4gICAgICogQHBhcmFtIHtudW1iZXI9fSBsZXZlbCAtIHdoYXQgcGFydCBvZiB0aGUgc2VxdWVuY2UgdGhlIGNvbW1hbmQgaXNcbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2JpbmRTaW5nbGUoY29tYmluYXRpb24sIGNhbGxiYWNrLCBhY3Rpb24sIHNlcXVlbmNlX25hbWUsIGxldmVsKSB7XG5cbiAgICAgICAgLy8gbWFrZSBzdXJlIG11bHRpcGxlIHNwYWNlcyBpbiBhIHJvdyBiZWNvbWUgYSBzaW5nbGUgc3BhY2VcbiAgICAgICAgY29tYmluYXRpb24gPSBjb21iaW5hdGlvbi5yZXBsYWNlKC9cXHMrL2csICcgJyk7XG5cbiAgICAgICAgdmFyIHNlcXVlbmNlID0gY29tYmluYXRpb24uc3BsaXQoJyAnKSxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBrZXksXG4gICAgICAgICAgICBrZXlzLFxuICAgICAgICAgICAgbW9kaWZpZXJzID0gW107XG5cbiAgICAgICAgLy8gaWYgdGhpcyBwYXR0ZXJuIGlzIGEgc2VxdWVuY2Ugb2Yga2V5cyB0aGVuIHJ1biB0aHJvdWdoIHRoaXMgbWV0aG9kXG4gICAgICAgIC8vIHRvIHJlcHJvY2VzcyBlYWNoIHBhdHRlcm4gb25lIGtleSBhdCBhIHRpbWVcbiAgICAgICAgaWYgKHNlcXVlbmNlLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIF9iaW5kU2VxdWVuY2UoY29tYmluYXRpb24sIHNlcXVlbmNlLCBjYWxsYmFjaywgYWN0aW9uKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRha2UgdGhlIGtleXMgZnJvbSB0aGlzIHBhdHRlcm4gYW5kIGZpZ3VyZSBvdXQgd2hhdCB0aGUgYWN0dWFsXG4gICAgICAgIC8vIHBhdHRlcm4gaXMgYWxsIGFib3V0XG4gICAgICAgIGtleXMgPSBjb21iaW5hdGlvbiA9PT0gJysnID8gWycrJ10gOiBjb21iaW5hdGlvbi5zcGxpdCgnKycpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBrZXkgPSBrZXlzW2ldO1xuXG4gICAgICAgICAgICAvLyBub3JtYWxpemUga2V5IG5hbWVzXG4gICAgICAgICAgICBpZiAoX1NQRUNJQUxfQUxJQVNFU1trZXldKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gX1NQRUNJQUxfQUxJQVNFU1trZXldO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGlzIGlzIG5vdCBhIGtleXByZXNzIGV2ZW50IHRoZW4gd2Ugc2hvdWxkXG4gICAgICAgICAgICAvLyBiZSBzbWFydCBhYm91dCB1c2luZyBzaGlmdCBrZXlzXG4gICAgICAgICAgICAvLyB0aGlzIHdpbGwgb25seSB3b3JrIGZvciBVUyBrZXlib2FyZHMgaG93ZXZlclxuICAgICAgICAgICAgaWYgKGFjdGlvbiAmJiBhY3Rpb24gIT0gJ2tleXByZXNzJyAmJiBfU0hJRlRfTUFQW2tleV0pIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBfU0hJRlRfTUFQW2tleV07XG4gICAgICAgICAgICAgICAgbW9kaWZpZXJzLnB1c2goJ3NoaWZ0Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHRoaXMga2V5IGlzIGEgbW9kaWZpZXIgdGhlbiBhZGQgaXQgdG8gdGhlIGxpc3Qgb2YgbW9kaWZpZXJzXG4gICAgICAgICAgICBpZiAoX2lzTW9kaWZpZXIoa2V5KSkge1xuICAgICAgICAgICAgICAgIG1vZGlmaWVycy5wdXNoKGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkZXBlbmRpbmcgb24gd2hhdCB0aGUga2V5IGNvbWJpbmF0aW9uIGlzXG4gICAgICAgIC8vIHdlIHdpbGwgdHJ5IHRvIHBpY2sgdGhlIGJlc3QgZXZlbnQgZm9yIGl0XG4gICAgICAgIGFjdGlvbiA9IF9waWNrQmVzdEFjdGlvbihrZXksIG1vZGlmaWVycywgYWN0aW9uKTtcblxuICAgICAgICAvLyBtYWtlIHN1cmUgdG8gaW5pdGlhbGl6ZSBhcnJheSBpZiB0aGlzIGlzIHRoZSBmaXJzdCB0aW1lXG4gICAgICAgIC8vIGEgY2FsbGJhY2sgaXMgYWRkZWQgZm9yIHRoaXMga2V5XG4gICAgICAgIGlmICghX2NhbGxiYWNrc1trZXldKSB7XG4gICAgICAgICAgICBfY2FsbGJhY2tzW2tleV0gPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlbW92ZSBhbiBleGlzdGluZyBtYXRjaCBpZiB0aGVyZSBpcyBvbmVcbiAgICAgICAgX2dldE1hdGNoZXMoa2V5LCBtb2RpZmllcnMsIHt0eXBlOiBhY3Rpb259LCAhc2VxdWVuY2VfbmFtZSwgY29tYmluYXRpb24pO1xuXG4gICAgICAgIC8vIGFkZCB0aGlzIGNhbGwgYmFjayB0byB0aGUgYXJyYXlcbiAgICAgICAgLy8gaWYgaXQgaXMgYSBzZXF1ZW5jZSBwdXQgaXQgYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAvLyBpZiBub3QgcHV0IGl0IGF0IHRoZSBlbmRcbiAgICAgICAgLy9cbiAgICAgICAgLy8gdGhpcyBpcyBpbXBvcnRhbnQgYmVjYXVzZSB0aGUgd2F5IHRoZXNlIGFyZSBwcm9jZXNzZWQgZXhwZWN0c1xuICAgICAgICAvLyB0aGUgc2VxdWVuY2Ugb25lcyB0byBjb21lIGZpcnN0XG4gICAgICAgIF9jYWxsYmFja3Nba2V5XVtzZXF1ZW5jZV9uYW1lID8gJ3Vuc2hpZnQnIDogJ3B1c2gnXSh7XG4gICAgICAgICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICAgICAgICBtb2RpZmllcnM6IG1vZGlmaWVycyxcbiAgICAgICAgICAgIGFjdGlvbjogYWN0aW9uLFxuICAgICAgICAgICAgc2VxOiBzZXF1ZW5jZV9uYW1lLFxuICAgICAgICAgICAgbGV2ZWw6IGxldmVsLFxuICAgICAgICAgICAgY29tYm86IGNvbWJpbmF0aW9uXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGJpbmRzIG11bHRpcGxlIGNvbWJpbmF0aW9ucyB0byB0aGUgc2FtZSBjYWxsYmFja1xuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gY29tYmluYXRpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3x1bmRlZmluZWR9IGFjdGlvblxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfYmluZE11bHRpcGxlKGNvbWJpbmF0aW9ucywgY2FsbGJhY2ssIGFjdGlvbikge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbWJpbmF0aW9ucy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgX2JpbmRTaW5nbGUoY29tYmluYXRpb25zW2ldLCBjYWxsYmFjaywgYWN0aW9uKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIHN0YXJ0IVxuICAgIF9hZGRFdmVudChkb2N1bWVudCwgJ2tleXByZXNzJywgX2hhbmRsZUtleSk7XG4gICAgX2FkZEV2ZW50KGRvY3VtZW50LCAna2V5ZG93bicsIF9oYW5kbGVLZXkpO1xuICAgIF9hZGRFdmVudChkb2N1bWVudCwgJ2tleXVwJywgX2hhbmRsZUtleSk7XG5cbiAgICB2YXIgTW91c2V0cmFwID0ge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBiaW5kcyBhbiBldmVudCB0byBtb3VzZXRyYXBcbiAgICAgICAgICpcbiAgICAgICAgICogY2FuIGJlIGEgc2luZ2xlIGtleSwgYSBjb21iaW5hdGlvbiBvZiBrZXlzIHNlcGFyYXRlZCB3aXRoICssXG4gICAgICAgICAqIGFuIGFycmF5IG9mIGtleXMsIG9yIGEgc2VxdWVuY2Ugb2Yga2V5cyBzZXBhcmF0ZWQgYnkgc3BhY2VzXG4gICAgICAgICAqXG4gICAgICAgICAqIGJlIHN1cmUgdG8gbGlzdCB0aGUgbW9kaWZpZXIga2V5cyBmaXJzdCB0byBtYWtlIHN1cmUgdGhhdCB0aGVcbiAgICAgICAgICogY29ycmVjdCBrZXkgZW5kcyB1cCBnZXR0aW5nIGJvdW5kICh0aGUgbGFzdCBrZXkgaW4gdGhlIHBhdHRlcm4pXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfEFycmF5fSBrZXlzXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nPX0gYWN0aW9uIC0gJ2tleXByZXNzJywgJ2tleWRvd24nLCBvciAna2V5dXAnXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgIGJpbmQ6IGZ1bmN0aW9uKGtleXMsIGNhbGxiYWNrLCBhY3Rpb24pIHtcbiAgICAgICAgICAgIF9iaW5kTXVsdGlwbGUoa2V5cyBpbnN0YW5jZW9mIEFycmF5ID8ga2V5cyA6IFtrZXlzXSwgY2FsbGJhY2ssIGFjdGlvbik7XG4gICAgICAgICAgICBfZGlyZWN0X21hcFtrZXlzICsgJzonICsgYWN0aW9uXSA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHVuYmluZHMgYW4gZXZlbnQgdG8gbW91c2V0cmFwXG4gICAgICAgICAqXG4gICAgICAgICAqIHRoZSB1bmJpbmRpbmcgc2V0cyB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHNwZWNpZmllZCBrZXkgY29tYm9cbiAgICAgICAgICogdG8gYW4gZW1wdHkgZnVuY3Rpb24gYW5kIGRlbGV0ZXMgdGhlIGNvcnJlc3BvbmRpbmcga2V5IGluIHRoZVxuICAgICAgICAgKiBfZGlyZWN0X21hcCBkaWN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiB0aGUga2V5Y29tYm8rYWN0aW9uIGhhcyB0byBiZSBleGFjdGx5IHRoZSBzYW1lIGFzXG4gICAgICAgICAqIGl0IHdhcyBkZWZpbmVkIGluIHRoZSBiaW5kIG1ldGhvZFxuICAgICAgICAgKlxuICAgICAgICAgKiBUT0RPOiBhY3R1YWxseSByZW1vdmUgdGhpcyBmcm9tIHRoZSBfY2FsbGJhY2tzIGRpY3Rpb25hcnkgaW5zdGVhZFxuICAgICAgICAgKiBvZiBiaW5kaW5nIGFuIGVtcHR5IGZ1bmN0aW9uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfEFycmF5fSBrZXlzXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb25cbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgdW5iaW5kOiBmdW5jdGlvbihrZXlzLCBhY3Rpb24pIHtcbiAgICAgICAgICAgIGlmIChfZGlyZWN0X21hcFtrZXlzICsgJzonICsgYWN0aW9uXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBfZGlyZWN0X21hcFtrZXlzICsgJzonICsgYWN0aW9uXTtcbiAgICAgICAgICAgICAgICB0aGlzLmJpbmQoa2V5cywgZnVuY3Rpb24oKSB7fSwgYWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiB0cmlnZ2VycyBhbiBldmVudCB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gYm91bmRcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGtleXNcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmc9fSBhY3Rpb25cbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgdHJpZ2dlcjogZnVuY3Rpb24oa2V5cywgYWN0aW9uKSB7XG4gICAgICAgICAgICBfZGlyZWN0X21hcFtrZXlzICsgJzonICsgYWN0aW9uXSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHJlc2V0cyB0aGUgbGlicmFyeSBiYWNrIHRvIGl0cyBpbml0aWFsIHN0YXRlLiAgdGhpcyBpcyB1c2VmdWxcbiAgICAgICAgICogaWYgeW91IHdhbnQgdG8gY2xlYXIgb3V0IHRoZSBjdXJyZW50IGtleWJvYXJkIHNob3J0Y3V0cyBhbmQgYmluZFxuICAgICAgICAgKiBuZXcgb25lcyAtIGZvciBleGFtcGxlIGlmIHlvdSBzd2l0Y2ggdG8gYW5vdGhlciBwYWdlXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF9jYWxsYmFja3MgPSB7fTtcbiAgICAgICAgICAgIF9kaXJlY3RfbWFwID0ge307XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgIC8qKlxuICAgICAgICAqIHNob3VsZCB3ZSBzdG9wIHRoaXMgZXZlbnQgYmVmb3JlIGZpcmluZyBvZmYgY2FsbGJhY2tzXG4gICAgICAgICpcbiAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICAgICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50XG4gICAgICAgICogQHJldHVybiB7Ym9vbGVhbn1cbiAgICAgICAgKi9cbiAgICAgICAgc3RvcENhbGxiYWNrOiBmdW5jdGlvbihlLCBlbGVtZW50KSB7XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZSBlbGVtZW50IGhhcyB0aGUgY2xhc3MgXCJtb3VzZXRyYXBcIiB0aGVuIG5vIG5lZWQgdG8gc3RvcFxuICAgICAgICAgICAgaWYgKCgnICcgKyBlbGVtZW50LmNsYXNzTmFtZSArICcgJykuaW5kZXhPZignIG1vdXNldHJhcCAnKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzdG9wIGZvciBpbnB1dCwgc2VsZWN0LCBhbmQgdGV4dGFyZWFcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50LnRhZ05hbWUgPT0gJ0lOUFVUJyB8fCBlbGVtZW50LnRhZ05hbWUgPT0gJ1NFTEVDVCcgfHwgZWxlbWVudC50YWdOYW1lID09ICdURVhUQVJFQScgfHwgKGVsZW1lbnQuY29udGVudEVkaXRhYmxlICYmIGVsZW1lbnQuY29udGVudEVkaXRhYmxlID09ICd0cnVlJyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gZXhwb3NlIG1vdXNldHJhcCB0byB0aGUgZ2xvYmFsIG9iamVjdFxuICAgIHdpbmRvdy5Nb3VzZXRyYXAgPSBNb3VzZXRyYXA7XG5cbiAgICAvLyBleHBvc2UgbW91c2V0cmFwIGFzIGFuIEFNRCBtb2R1bGVcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKCdtb3VzZXRyYXAnLCBmdW5jdGlvbigpIHsgcmV0dXJuIE1vdXNldHJhcDsgfSk7XG4gICAgfVxuICAgIC8vIGJyb3dzZXJpZnkgc3VwcG9ydFxuICAgIGlmKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gTW91c2V0cmFwO1xuICAgIH1cbn0pICgpO1xuIiwiLy8gc3RhdHMuanMgLSBodHRwOi8vZ2l0aHViLmNvbS9tcmRvb2Ivc3RhdHMuanNcbihmdW5jdGlvbihmLGUpe1wib2JqZWN0XCI9PT10eXBlb2YgZXhwb3J0cyYmXCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBtb2R1bGU/bW9kdWxlLmV4cG9ydHM9ZSgpOlwiZnVuY3Rpb25cIj09PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKGUpOmYuU3RhdHM9ZSgpfSkodGhpcyxmdW5jdGlvbigpe3ZhciBmPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gZShhKXtjLmFwcGVuZENoaWxkKGEuZG9tKTtyZXR1cm4gYX1mdW5jdGlvbiB1KGEpe2Zvcih2YXIgZD0wO2Q8Yy5jaGlsZHJlbi5sZW5ndGg7ZCsrKWMuY2hpbGRyZW5bZF0uc3R5bGUuZGlzcGxheT1kPT09YT9cImJsb2NrXCI6XCJub25lXCI7bD1hfXZhciBsPTAsYz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO2Muc3R5bGUuY3NzVGV4dD1cInBvc2l0aW9uOmZpeGVkO3RvcDowO2xlZnQ6MDtjdXJzb3I6cG9pbnRlcjtvcGFjaXR5OjAuOTt6LWluZGV4OjEwMDAwXCI7Yy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIixmdW5jdGlvbihhKXthLnByZXZlbnREZWZhdWx0KCk7XG51KCsrbCVjLmNoaWxkcmVuLmxlbmd0aCl9LCExKTt2YXIgaz0ocGVyZm9ybWFuY2V8fERhdGUpLm5vdygpLGc9ayxhPTAscj1lKG5ldyBmLlBhbmVsKFwiRlBTXCIsXCIjMGZmXCIsXCIjMDAyXCIpKSxoPWUobmV3IGYuUGFuZWwoXCJNU1wiLFwiIzBmMFwiLFwiIzAyMFwiKSk7aWYoc2VsZi5wZXJmb3JtYW5jZSYmc2VsZi5wZXJmb3JtYW5jZS5tZW1vcnkpdmFyIHQ9ZShuZXcgZi5QYW5lbChcIk1CXCIsXCIjZjA4XCIsXCIjMjAxXCIpKTt1KDApO3JldHVybntSRVZJU0lPTjoxNixkb206YyxhZGRQYW5lbDplLHNob3dQYW5lbDp1LGJlZ2luOmZ1bmN0aW9uKCl7az0ocGVyZm9ybWFuY2V8fERhdGUpLm5vdygpfSxlbmQ6ZnVuY3Rpb24oKXthKys7dmFyIGM9KHBlcmZvcm1hbmNlfHxEYXRlKS5ub3coKTtoLnVwZGF0ZShjLWssMjAwKTtpZihjPmcrMUUzJiYoci51cGRhdGUoMUUzKmEvKGMtZyksMTAwKSxnPWMsYT0wLHQpKXt2YXIgZD1wZXJmb3JtYW5jZS5tZW1vcnk7dC51cGRhdGUoZC51c2VkSlNIZWFwU2l6ZS9cbjEwNDg1NzYsZC5qc0hlYXBTaXplTGltaXQvMTA0ODU3Nil9cmV0dXJuIGN9LHVwZGF0ZTpmdW5jdGlvbigpe2s9dGhpcy5lbmQoKX0sZG9tRWxlbWVudDpjLHNldE1vZGU6dX19O2YuUGFuZWw9ZnVuY3Rpb24oZSxmLGwpe3ZhciBjPUluZmluaXR5LGs9MCxnPU1hdGgucm91bmQsYT1nKHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvfHwxKSxyPTgwKmEsaD00OCphLHQ9MyphLHY9MiphLGQ9MyphLG09MTUqYSxuPTc0KmEscD0zMCphLHE9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtxLndpZHRoPXI7cS5oZWlnaHQ9aDtxLnN0eWxlLmNzc1RleHQ9XCJ3aWR0aDo4MHB4O2hlaWdodDo0OHB4XCI7dmFyIGI9cS5nZXRDb250ZXh0KFwiMmRcIik7Yi5mb250PVwiYm9sZCBcIis5KmErXCJweCBIZWx2ZXRpY2EsQXJpYWwsc2Fucy1zZXJpZlwiO2IudGV4dEJhc2VsaW5lPVwidG9wXCI7Yi5maWxsU3R5bGU9bDtiLmZpbGxSZWN0KDAsMCxyLGgpO2IuZmlsbFN0eWxlPWY7Yi5maWxsVGV4dChlLHQsdik7XG5iLmZpbGxSZWN0KGQsbSxuLHApO2IuZmlsbFN0eWxlPWw7Yi5nbG9iYWxBbHBoYT0uOTtiLmZpbGxSZWN0KGQsbSxuLHApO3JldHVybntkb206cSx1cGRhdGU6ZnVuY3Rpb24oaCx3KXtjPU1hdGgubWluKGMsaCk7az1NYXRoLm1heChrLGgpO2IuZmlsbFN0eWxlPWw7Yi5nbG9iYWxBbHBoYT0xO2IuZmlsbFJlY3QoMCwwLHIsbSk7Yi5maWxsU3R5bGU9ZjtiLmZpbGxUZXh0KGcoaCkrXCIgXCIrZStcIiAoXCIrZyhjKStcIi1cIitnKGspK1wiKVwiLHQsdik7Yi5kcmF3SW1hZ2UocSxkK2EsbSxuLWEscCxkLG0sbi1hLHApO2IuZmlsbFJlY3QoZCtuLWEsbSxhLHApO2IuZmlsbFN0eWxlPWw7Yi5nbG9iYWxBbHBoYT0uOTtiLmZpbGxSZWN0KGQrbi1hLG0sYSxnKCgxLWgvdykqcCkpfX19O3JldHVybiBmfSk7XG4iXX0=
