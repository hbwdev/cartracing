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
var EventedLoop = require('eventedloop');

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
		var backgroundImage = new Image();
		backgroundImage.src = 'assets/background.png';
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

		that.draw = function () {
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

		gameLoop.on('20', this.cycle);
		gameLoop.on('20', this.draw);

		startShake(mainCanvas);
		setInterval(startShake, 300, dContext);
	}

	global.game = Game;
})( this );


if (typeof module !== 'undefined') {
	module.exports = this.game;
}
},{"./spriteArray":12,"eventedloop":16}],5:[function(require,module,exports){
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
		setInterval(() => {
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
			return Object.values(that.data.parts).map(function (p) { return p[3]; }).max();
		}());
		that.isMoving = true;
		that.isDrawnUnderPlayer = data.isDrawnUnderPlayer;
		
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

var imageSources = [ 'assets/cart-sprites.png', 'assets/startsign-sprite.png', 'assets/oilslick-sprite.png', 
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
				+ d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds()
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
		highScore = localStorage.setItem('highScore', gameInfo.distance);
		
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
		player.isBeingEaten ? setTimeout(endGame, 1000)
			: endGame();
	}

	function endGame() {
		//game.pause();
		//game.cycle();
		showGameOverMenu();
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
			message
		]);

		playMusicTrack(Math.floor(gameInfo.distance / 1000 % 3) + 1);
	}

	function randomlySpawnNPC(spawnFunction, dropRate) {
		var rateModifier = Math.max(800 - mainCanvas.width, 0);
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
					if (livesLeft < totalLives) {
						livesLeft += 1;
					}
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
					randomlySpawnNPC(spawnMonster, Math.round(gameInfo.distance / 1000) * .001);
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
		Mousetrap.bind('m', spawnMonster);
		//Mousetrap.bind('g', toggleGodMode);
		//Mousetrap.bind('h', game.toggleHitBoxes);

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
(function (global){(function (){
(function() {
    var root = this;
    var EventEmitter = require('events').EventEmitter;
	var _ = require('underscore');
	var intervalParser = /([0-9\.]+)(ms|s|m|h)?/;
	var root = global || window;

	// Lil bit of useful polyfill...
	if (typeof(Function.prototype.inherits) === 'undefined') {
		Function.prototype.inherits = function(parent) {
			this.prototype = Object.create(parent.prototype);
		};
	}

	if (typeof(Array.prototype.removeOne) === 'undefined') {
		Array.prototype.removeOne = function() {
			var what, a = arguments, L = a.length, ax;
			while (L && this.length) {
				what = a[--L];
				while ((ax = this.indexOf(what)) !== -1) {
					return this.splice(ax, 1);
				}
			}
		};
	}

	function greatestCommonFactor(intervals) {
		var sumOfModuli = 1;
		var interval = _.min(intervals);
		while (sumOfModuli !== 0) {
			sumOfModuli = _.reduce(intervals, function(memo, i){ return memo + (i % interval); }, 0);
			if (sumOfModuli !== 0) {
				interval -= 10;
			}
		}
		return interval;
	}

	function parseEvent(e) {
		var intervalGroups = intervalParser.exec(e);
		if (!intervalGroups) {
			throw new Error('I don\'t understand that particular interval');
		}
		var intervalAmount = +intervalGroups[1];
		var intervalType = intervalGroups[2] || 'ms';
		if (intervalType === 's') {
			intervalAmount = intervalAmount * 1000;
		} else if (intervalType === 'm') {
			intervalAmount = intervalAmount * 1000 * 60;
		} else if (intervalType === 'h') {
			intervalAmount = intervalAmount * 1000 * 60 * 60;
		} else if (!!intervalType && intervalType !== 'ms') {
			throw new Error('You can only specify intervals of ms, s, m, or h');
		}
		if (intervalAmount < 10 || intervalAmount % 10 !== 0) {
			// We only deal in 10's of milliseconds for simplicity
			throw new Error('You can only specify 10s of milliseconds, trust me on this one');
		}
		return {
			amount:intervalAmount,
			type:intervalType
		};
	}

	function EventedLoop() {
		this.intervalId = undefined;
		this.intervalLength = undefined;
		this.intervalsToEmit = {};
		this.currentTick = 1;
		this.maxTicks = 0;
		this.listeningForFocus = false;

		// Private method
		var determineIntervalLength = function () {
			var potentialIntervalLength = greatestCommonFactor(_.keys(this.intervalsToEmit));
			var changed = false;

			if (this.intervalLength) {
				if (potentialIntervalLength !== this.intervalLength) {
					// Looks like we need a new interval
					this.intervalLength = potentialIntervalLength;
					changed = true;
				}
			} else {
				this.intervalLength = potentialIntervalLength;
			}

			this.maxTicks = _.max(_.map(_.keys(this.intervalsToEmit), function(a) { return +a; })) / this.intervalLength;
			return changed;
		}.bind(this);

		this.on('newListener', function (e) {
			if (e === 'removeListener' || e === 'newListener') return; // We don't care about that one
			var intervalInfo = parseEvent(e);
			var intervalAmount = intervalInfo.amount;

			this.intervalsToEmit[+intervalAmount] = _.union(this.intervalsToEmit[+intervalAmount] || [], [e]);
			
			if (determineIntervalLength() && this.isStarted()) {
				this.stop().start();
			}
		});

		this.on('removeListener', function (e) {
			if (EventEmitter.listenerCount(this, e) > 0) return;
			var intervalInfo = parseEvent(e);
			var intervalAmount = intervalInfo.amount;

			var removedEvent = this.intervalsToEmit[+intervalAmount].removeOne(e);
			if (this.intervalsToEmit[+intervalAmount].length === 0) {
				delete this.intervalsToEmit[+intervalAmount];
			}
			console.log('Determining interval length after removal of', removedEvent);
			determineIntervalLength();

			if (determineIntervalLength() && this.isStarted()) {
				this.stop().start();
			}
		});
	}

	EventedLoop.inherits(EventEmitter);

	// Public methods
	EventedLoop.prototype.tick = function () {
		var milliseconds = this.currentTick * this.intervalLength;
		_.each(this.intervalsToEmit, function (events, key) {
			if (milliseconds % key === 0) {
				_.each(events, function(e) { this.emit(e, e, key); }.bind(this));
			}
		}.bind(this));
		this.currentTick += 1;
		if (this.currentTick > this.maxTicks) {
			this.currentTick = 1;
		}
		return this;
	};

	EventedLoop.prototype.start = function () {
		if (!this.intervalLength) {
			throw new Error('You haven\'t specified any interval callbacks. Use EventedLoop.on(\'500ms\', function () { ... }) to do so, and then you can start');
		}
		if (this.intervalId) {
			return console.log('No need to start the loop again, it\'s already started.');
		}

		this.intervalId = setInterval(this.tick.bind(this), this.intervalLength);

		if (root && !this.listeningForFocus && root.addEventListener) {
			root.addEventListener('focus', function() {
				this.start();
			}.bind(this));

			root.addEventListener('blur', function() {
				this.stop();
			}.bind(this));

			this.listeningForFocus = true;
		}
		return this;
	};

	EventedLoop.prototype.stop = function () {
		clearInterval(this.intervalId);
		this.intervalId = undefined;
		return this;
	};

	EventedLoop.prototype.isStarted = function () {
		return !!this.intervalId;
	};

	EventedLoop.prototype.every = EventedLoop.prototype.on;

    // Export the EventedLoop object for **Node.js** or other
    // commonjs systems. Otherwise, add it as a global object to the root
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = EventedLoop;
        }
        exports.EventedLoop = EventedLoop;
    }
    if (typeof window !== 'undefined') {
        window.EventedLoop = EventedLoop;
    }
}).call(this);
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"events":17,"underscore":18}],17:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

},{}],18:[function(require,module,exports){
//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);

},{}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9saWIvYW5pbWF0ZWRTcHJpdGUuanMiLCJqcy9saWIvY2FudmFzUmVuZGVyaW5nQ29udGV4dDJERXh0ZW5zaW9ucy5qcyIsImpzL2xpYi9leHRlbmRlcnMuanMiLCJqcy9saWIvZ2FtZS5qcyIsImpzL2xpYi9nYW1lSHVkLmpzIiwianMvbGliL2d1aWQuanMiLCJqcy9saWIvaXNNb2JpbGVEZXZpY2UuanMiLCJqcy9saWIvbW9uc3Rlci5qcyIsImpzL2xpYi9wbGF5ZXIuanMiLCJqcy9saWIvcGx1Z2lucy5qcyIsImpzL2xpYi9zcHJpdGUuanMiLCJqcy9saWIvc3ByaXRlQXJyYXkuanMiLCJqcy9tYWluLmpzIiwianMvc3ByaXRlSW5mby5qcyIsIm5vZGVfbW9kdWxlcy9ici1tb3VzZXRyYXAvbW91c2V0cmFwLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50ZWRsb29wL2xpYi9tYWluLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCJub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9qQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0bkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy95QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDekxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwidmFyIFNwcml0ZSA9IHJlcXVpcmUoJy4vc3ByaXRlJyk7XHJcblxyXG4oZnVuY3Rpb24oZ2xvYmFsKSB7XHJcblx0ZnVuY3Rpb24gQW5pbWF0ZWRTcHJpdGUoZGF0YSkge1xyXG5cdFx0dmFyIHRoYXQgPSBuZXcgU3ByaXRlKGRhdGEpO1xyXG5cdFx0dmFyIHN1cGVyX2RyYXcgPSB0aGF0LnN1cGVyaW9yKCdkcmF3Jyk7XHJcblx0XHR2YXIgY3VycmVudEZyYW1lID0gMDtcclxuXHRcdHZhciBzdGFydGVkID0gZmFsc2U7XHJcblxyXG5cdFx0dGhhdC5kcmF3ID0gZnVuY3Rpb24oZENvbnRleHQpIHtcclxuXHRcdFx0dmFyIHNwcml0ZVBhcnRUb1VzZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRpZiAoIXN0YXJ0ZWQpIHtcclxuXHRcdFx0XHRcdHN0YXJ0ZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0c3RhcnRBbmltYXRpb24oKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIE9iamVjdC5rZXlzKGRhdGEucGFydHMpW2N1cnJlbnRGcmFtZV07XHJcblx0XHRcdH07XHJcblx0XHRcdHJldHVybiBzdXBlcl9kcmF3KGRDb250ZXh0LCBzcHJpdGVQYXJ0VG9Vc2UoKSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIHN0YXJ0QW5pbWF0aW9uKCkge1xyXG5cdFx0XHRjdXJyZW50RnJhbWUgKz0gMTtcclxuXHRcdFx0aWYgKGN1cnJlbnRGcmFtZSA8IE9iamVjdC5rZXlzKGRhdGEucGFydHMpLmxlbmd0aCkge1xyXG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyBcclxuXHRcdFx0XHRcdHN0YXJ0QW5pbWF0aW9uKCk7XHJcblx0XHRcdFx0fSwgMzAwKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRjdXJyZW50RnJhbWUgPSAwO1xyXG5cdFx0XHRcdHN0YXJ0ZWQgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoYXQuc3RhcnRBbmltYXRpb24gPSBzdGFydEFuaW1hdGlvbjtcclxuXHJcblx0XHRyZXR1cm4gdGhhdDtcclxuXHR9XHJcblxyXG5cdGdsb2JhbC5hbmltYXRlZFNwcml0ZSA9IEFuaW1hdGVkU3ByaXRlO1xyXG59KSggdGhpcyApO1xyXG5cclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG5cdG1vZHVsZS5leHBvcnRzID0gdGhpcy5hbmltYXRlZFNwcml0ZTtcclxufSIsIkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuc3RvcmVMb2FkZWRJbWFnZSA9IGZ1bmN0aW9uIChrZXksIGltYWdlKSB7XHJcblx0aWYgKCF0aGlzLmltYWdlcykge1xyXG5cdFx0dGhpcy5pbWFnZXMgPSB7fTtcclxuXHR9XHJcblxyXG5cdHRoaXMuaW1hZ2VzW2tleV0gPSBpbWFnZTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0TG9hZGVkSW1hZ2UgPSBmdW5jdGlvbiAoa2V5KSB7XHJcblx0aWYgKHRoaXMuaW1hZ2VzW2tleV0pIHtcclxuXHRcdHJldHVybiB0aGlzLmltYWdlc1trZXldO1xyXG5cdH1cclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZm9sbG93U3ByaXRlID0gZnVuY3Rpb24gKHNwcml0ZSkge1xyXG5cdHRoaXMuY2VudHJhbFNwcml0ZSA9IHNwcml0ZTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0Q2VudHJhbFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xyXG5cdGlmICghdGhpcy5jZW50cmFsT2Zmc2V0WCkgdGhpcy5jZW50cmFsT2Zmc2V0WCA9IDA7XHJcblx0aWYgKCF0aGlzLmNlbnRyYWxPZmZzZXRZKSB0aGlzLmNlbnRyYWxPZmZzZXRZID0gMDtcclxuXHJcblx0bGV0IHBvc2l0aW9uID0ge1xyXG5cdFx0bWFwOiB0aGlzLmNlbnRyYWxTcHJpdGUubWFwUG9zaXRpb24sXHJcblx0XHRjYW52YXM6IFsgTWF0aC5yb3VuZCh0aGlzLmNhbnZhcy53aWR0aCAqIDAuNSkgKyB0aGlzLmNlbnRyYWxPZmZzZXRYLFxyXG5cdFx0XHQgICAgICBNYXRoLnJvdW5kKHRoaXMuY2FudmFzLmhlaWdodCAqIDAuMzMpICsgdGhpcy5jZW50cmFsT2Zmc2V0WSwgMF1cclxuXHR9O1xyXG5cclxuXHRyZXR1cm4gcG9zaXRpb247XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLnNldENlbnRyYWxQb3NpdGlvbk9mZnNldCA9IGZ1bmN0aW9uIChvZmZzZXRYLCBvZmZzZXRZKSB7XHJcblx0dGhpcy5jZW50cmFsT2Zmc2V0WCA9IG9mZnNldFg7XHJcblx0dGhpcy5jZW50cmFsT2Zmc2V0WSA9IG9mZnNldFk7XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLm1hcFBvc2l0aW9uVG9DYW52YXNQb3NpdGlvbiA9IGZ1bmN0aW9uIChwb3NpdGlvbikge1xyXG5cdHZhciBjZW50cmFsID0gdGhpcy5nZXRDZW50cmFsUG9zaXRpb24oKTtcclxuXHR2YXIgY2VudHJhbE1hcFBvc2l0aW9uID0gY2VudHJhbC5tYXA7XHJcblx0dmFyIGNlbnRyYWxDYW52YXNQb3NpdGlvbiA9IGNlbnRyYWwuY2FudmFzO1xyXG5cdHZhciBtYXBEaWZmZXJlbmNlWCA9IGNlbnRyYWxNYXBQb3NpdGlvblswXSAtIHBvc2l0aW9uWzBdO1xyXG5cdHZhciBtYXBEaWZmZXJlbmNlWSA9IGNlbnRyYWxNYXBQb3NpdGlvblsxXSAtIHBvc2l0aW9uWzFdO1xyXG5cdHJldHVybiBbIGNlbnRyYWxDYW52YXNQb3NpdGlvblswXSAtIG1hcERpZmZlcmVuY2VYLCBjZW50cmFsQ2FudmFzUG9zaXRpb25bMV0gLSBtYXBEaWZmZXJlbmNlWSBdO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5jYW52YXNQb3NpdGlvblRvTWFwUG9zaXRpb24gPSBmdW5jdGlvbiAocG9zaXRpb24pIHtcclxuXHR2YXIgY2VudHJhbCA9IHRoaXMuZ2V0Q2VudHJhbFBvc2l0aW9uKCk7XHJcblx0dmFyIGNlbnRyYWxNYXBQb3NpdGlvbiA9IGNlbnRyYWwubWFwO1xyXG5cdHZhciBjZW50cmFsQ2FudmFzUG9zaXRpb24gPSBjZW50cmFsLmNhbnZhcztcclxuXHR2YXIgbWFwRGlmZmVyZW5jZVggPSBjZW50cmFsQ2FudmFzUG9zaXRpb25bMF0gLSBwb3NpdGlvblswXTtcclxuXHR2YXIgbWFwRGlmZmVyZW5jZVkgPSBjZW50cmFsQ2FudmFzUG9zaXRpb25bMV0gLSBwb3NpdGlvblsxXTtcclxuXHRyZXR1cm4gWyBjZW50cmFsTWFwUG9zaXRpb25bMF0gLSBtYXBEaWZmZXJlbmNlWCwgY2VudHJhbE1hcFBvc2l0aW9uWzFdIC0gbWFwRGlmZmVyZW5jZVkgXTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0Q2VudHJlT2ZWaWV3cG9ydCA9IGZ1bmN0aW9uICgpIHtcclxuXHRyZXR1cm4gKHRoaXMuY2FudmFzLndpZHRoIC8gMikuZmxvb3IoKTtcclxufTtcclxuXHJcbi8vIFktcG9zIGNhbnZhcyBmdW5jdGlvbnNcclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRNaWRkbGVPZlZpZXdwb3J0ID0gZnVuY3Rpb24gKCkge1xyXG5cdHJldHVybiAodGhpcy5jYW52YXMuaGVpZ2h0IC8gMikuZmxvb3IoKTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0QmVsb3dWaWV3cG9ydCA9IGZ1bmN0aW9uICgpIHtcclxuXHRyZXR1cm4gdGhpcy5jYW52YXMuaGVpZ2h0LmZsb29yKCk7XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmdldE1hcEJlbG93Vmlld3BvcnQgPSBmdW5jdGlvbiAoKSB7XHJcblx0dmFyIGJlbG93ID0gdGhpcy5nZXRCZWxvd1ZpZXdwb3J0KCk7XHJcblx0cmV0dXJuIHRoaXMuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFsgMCwgYmVsb3cgXSlbMV07XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmdldFJhbmRvbWx5SW5UaGVDZW50cmVPZkNhbnZhcyA9IGZ1bmN0aW9uIChidWZmZXIpIHtcclxuXHR2YXIgbWluID0gMDtcclxuXHR2YXIgbWF4ID0gdGhpcy5jYW52YXMud2lkdGg7XHJcblxyXG5cdGlmIChidWZmZXIpIHtcclxuXHRcdG1pbiAtPSBidWZmZXI7XHJcblx0XHRtYXggKz0gYnVmZmVyO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIE51bWJlci5yYW5kb20obWluLCBtYXgpO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRSYW5kb21seUluVGhlQ2VudHJlT2ZNYXAgPSBmdW5jdGlvbiAoYnVmZmVyKSB7XHJcblx0dmFyIHJhbmRvbSA9IHRoaXMuZ2V0UmFuZG9tbHlJblRoZUNlbnRyZU9mQ2FudmFzKGJ1ZmZlcik7XHJcblx0cmV0dXJuIHRoaXMuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFsgcmFuZG9tLCAwIF0pWzBdO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRSYW5kb21NYXBQb3NpdGlvbkJlbG93Vmlld3BvcnQgPSBmdW5jdGlvbiAoKSB7XHJcblx0dmFyIHhDYW52YXMgPSB0aGlzLmdldFJhbmRvbWx5SW5UaGVDZW50cmVPZkNhbnZhcygpO1xyXG5cdHZhciB5Q2FudmFzID0gdGhpcy5nZXRCZWxvd1ZpZXdwb3J0KCk7XHJcblx0cmV0dXJuIHRoaXMuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFsgeENhbnZhcywgeUNhbnZhcyBdKTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0UmFuZG9tTWFwUG9zaXRpb25BYm92ZVZpZXdwb3J0ID0gZnVuY3Rpb24gKCkge1xyXG5cdHZhciB4Q2FudmFzID0gdGhpcy5nZXRSYW5kb21seUluVGhlQ2VudHJlT2ZDYW52YXMoKTtcclxuXHR2YXIgeUNhbnZhcyA9IHRoaXMuZ2V0QWJvdmVWaWV3cG9ydCgpO1xyXG5cdHJldHVybiB0aGlzLmNhbnZhc1Bvc2l0aW9uVG9NYXBQb3NpdGlvbihbIHhDYW52YXMsIHlDYW52YXMgXSk7XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmdldFRvcE9mVmlld3BvcnQgPSBmdW5jdGlvbiAoKSB7XHJcblx0cmV0dXJuIHRoaXMuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFsgMCwgMCBdKVsxXTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0QWJvdmVWaWV3cG9ydCA9IGZ1bmN0aW9uICgpIHtcclxuXHRyZXR1cm4gMCAtICh0aGlzLmNhbnZhcy5oZWlnaHQgLyA0KS5mbG9vcigpO1xyXG59OyIsIi8vIEV4dGVuZHMgZnVuY3Rpb24gc28gdGhhdCBuZXctYWJsZSBvYmplY3RzIGNhbiBiZSBnaXZlbiBuZXcgbWV0aG9kcyBlYXNpbHlcclxuRnVuY3Rpb24ucHJvdG90eXBlLm1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBmdW5jKSB7XHJcbiAgICB0aGlzLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmM7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8vIFdpbGwgcmV0dXJuIHRoZSBvcmlnaW5hbCBtZXRob2Qgb2YgYW4gb2JqZWN0IHdoZW4gaW5oZXJpdGluZyBmcm9tIGFub3RoZXJcclxuT2JqZWN0Lm1ldGhvZCgnc3VwZXJpb3InLCBmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdmFyIG1ldGhvZCA9IHRoYXRbbmFtZV07XHJcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIG1ldGhvZC5hcHBseSh0aGF0LCBhcmd1bWVudHMpO1xyXG4gICAgfTtcclxufSk7IiwidmFyIFNwcml0ZUFycmF5ID0gcmVxdWlyZSgnLi9zcHJpdGVBcnJheScpO1xyXG52YXIgRXZlbnRlZExvb3AgPSByZXF1aXJlKCdldmVudGVkbG9vcCcpO1xyXG5cclxuaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bmF2aWdhdG9yLnZpYnJhdGUgPSBuYXZpZ2F0b3IudmlicmF0ZSB8fFxyXG5cdFx0bmF2aWdhdG9yLndlYmtpdFZpYnJhdGUgfHxcclxuXHRcdG5hdmlnYXRvci5tb3pWaWJyYXRlIHx8XHJcblx0XHRuYXZpZ2F0b3IubXNWaWJyYXRlO1xyXG59IGVsc2Uge1xyXG5cdG5hdmlnYXRvciA9IHtcclxuXHRcdHZpYnJhdGU6IGZhbHNlXHJcblx0fTtcclxufVxyXG5cclxuKGZ1bmN0aW9uIChnbG9iYWwpIHtcclxuXHRmdW5jdGlvbiBHYW1lIChtYWluQ2FudmFzLCBwbGF5ZXIpIHtcclxuXHRcdHZhciBzdGF0aWNPYmplY3RzID0gbmV3IFNwcml0ZUFycmF5KCk7XHJcblx0XHR2YXIgbW92aW5nT2JqZWN0cyA9IG5ldyBTcHJpdGVBcnJheSgpO1xyXG5cdFx0dmFyIHVpRWxlbWVudHMgPSBuZXcgU3ByaXRlQXJyYXkoKTtcclxuXHRcdHZhciBkQ29udGV4dCA9IG1haW5DYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHRcdHZhciBzaG93SGl0Qm94ZXMgPSBmYWxzZTtcclxuXHRcdFxyXG5cdFx0Ly8gU2Nyb2xsaW5nIGJhY2tncm91bmRcclxuXHRcdHZhciBiYWNrZ3JvdW5kSW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdGJhY2tncm91bmRJbWFnZS5zcmMgPSAnYXNzZXRzL2JhY2tncm91bmQucG5nJztcclxuXHRcdHZhciBiYWNrZ3JvdW5kWCA9IDA7XHJcblx0XHR2YXIgYmFja2dyb3VuZFkgPSAwO1xyXG5cclxuXHRcdHZhciBtb3VzZVggPSBkQ29udGV4dC5nZXRDZW50cmVPZlZpZXdwb3J0KCk7XHJcblx0XHR2YXIgbW91c2VZID0gMDtcclxuXHRcdHZhciBwYXVzZWQgPSBmYWxzZTtcclxuXHRcdHZhciBnYW1lRW5kaW5nID0gZmFsc2U7XHJcblx0XHR2YXIgdGhhdCA9IHRoaXM7XHJcblx0XHR2YXIgYmVmb3JlQ3ljbGVDYWxsYmFja3MgPSBbXTtcclxuXHRcdHZhciBhZnRlckN5Y2xlQ2FsbGJhY2tzID0gW107XHJcblx0XHR2YXIgZ2FtZUxvb3AgPSBuZXcgRXZlbnRlZExvb3AoKTtcclxuXHJcblx0XHR0aGlzLnRvZ2dsZUhpdEJveGVzID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdHNob3dIaXRCb3hlcyA9ICFzaG93SGl0Qm94ZXM7XHJcblx0XHRcdHN0YXRpY09iamVjdHMuZWFjaChmdW5jdGlvbiAoc3ByaXRlKSB7XHJcblx0XHRcdFx0c3ByaXRlLnNldEhpdEJveGVzVmlzaWJsZShzaG93SGl0Qm94ZXMpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5hZGRTdGF0aWNPYmplY3QgPSBmdW5jdGlvbiAoc3ByaXRlKSB7XHJcblx0XHRcdHNwcml0ZS5zZXRIaXRCb3hlc1Zpc2libGUoc2hvd0hpdEJveGVzKTtcclxuXHRcdFx0c3RhdGljT2JqZWN0cy5wdXNoKHNwcml0ZSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuYWRkU3RhdGljT2JqZWN0cyA9IGZ1bmN0aW9uIChzcHJpdGVzKSB7XHJcblx0XHRcdHNwcml0ZXMuZm9yRWFjaCh0aGlzLmFkZFN0YXRpY09iamVjdC5iaW5kKHRoaXMpKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5hZGRNb3ZpbmdPYmplY3QgPSBmdW5jdGlvbiAobW92aW5nT2JqZWN0LCBtb3ZpbmdPYmplY3RUeXBlKSB7XHJcblx0XHRcdGlmIChtb3ZpbmdPYmplY3RUeXBlKSB7XHJcblx0XHRcdFx0c3RhdGljT2JqZWN0cy5vblB1c2goZnVuY3Rpb24gKG9iaikge1xyXG5cdFx0XHRcdFx0aWYgKG9iai5kYXRhICYmIG9iai5kYXRhLmhpdEJlaGF2aW91clttb3ZpbmdPYmplY3RUeXBlXSkge1xyXG5cdFx0XHRcdFx0XHRvYmoub25IaXR0aW5nKG1vdmluZ09iamVjdCwgb2JqLmRhdGEuaGl0QmVoYXZpb3VyW21vdmluZ09iamVjdFR5cGVdKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LCB0cnVlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bW92aW5nT2JqZWN0LnNldEhpdEJveGVzVmlzaWJsZShzaG93SGl0Qm94ZXMpO1xyXG5cdFx0XHRtb3ZpbmdPYmplY3RzLnB1c2gobW92aW5nT2JqZWN0KTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5hZGRVSUVsZW1lbnQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xyXG5cdFx0XHR1aUVsZW1lbnRzLnB1c2goZWxlbWVudCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuYmVmb3JlQ3ljbGUgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcclxuXHRcdFx0YmVmb3JlQ3ljbGVDYWxsYmFja3MucHVzaChjYWxsYmFjayk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuYWZ0ZXJDeWNsZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG5cdFx0XHRhZnRlckN5Y2xlQ2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnNldE1vdXNlWCA9IGZ1bmN0aW9uICh4KSB7XHJcblx0XHRcdG1vdXNlWCA9IHg7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0TW91c2VZID0gZnVuY3Rpb24gKHkpIHtcclxuXHRcdFx0bW91c2VZID0geTtcclxuXHRcdH07XHJcblxyXG5cdFx0cGxheWVyLnNldE1hcFBvc2l0aW9uKDAsIDApO1xyXG5cdFx0cGxheWVyLnNldE1hcFBvc2l0aW9uVGFyZ2V0KDAsIC0xMCk7XHJcblx0XHRkQ29udGV4dC5mb2xsb3dTcHJpdGUocGxheWVyKTtcclxuXHJcblx0XHR0aGlzLmN5Y2xlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRiZWZvcmVDeWNsZUNhbGxiYWNrcy5lYWNoKGZ1bmN0aW9uKGMpIHtcclxuXHRcdFx0XHRjKCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ2xlYXIgY2FudmFzXHJcblx0XHRcdHZhciBtb3VzZU1hcFBvc2l0aW9uID0gZENvbnRleHQuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFttb3VzZVgsIG1vdXNlWV0pO1xyXG5cclxuXHRcdFx0aWYgKCFwbGF5ZXIuaXNKdW1waW5nKSB7XHJcblx0XHRcdFx0cGxheWVyLnNldE1hcFBvc2l0aW9uVGFyZ2V0KG1vdXNlTWFwUG9zaXRpb25bMF0sIG1vdXNlTWFwUG9zaXRpb25bMV0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRwbGF5ZXIuY3ljbGUoKTtcclxuXHJcblx0XHRcdG1vdmluZ09iamVjdHMuY3VsbCgpO1xyXG5cdFx0XHRtb3ZpbmdPYmplY3RzLmVhY2goZnVuY3Rpb24gKG1vdmluZ09iamVjdCwgaSkge1xyXG5cdFx0XHRcdG1vdmluZ09iamVjdC5jeWNsZShkQ29udGV4dCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0c3RhdGljT2JqZWN0cy5jdWxsKCk7XHJcblx0XHRcdHN0YXRpY09iamVjdHMuZWFjaChmdW5jdGlvbiAoc3RhdGljT2JqZWN0LCBpKSB7XHJcblx0XHRcdFx0aWYgKHN0YXRpY09iamVjdC5jeWNsZSkge1xyXG5cdFx0XHRcdFx0c3RhdGljT2JqZWN0LmN5Y2xlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHVpRWxlbWVudHMuZWFjaChmdW5jdGlvbiAodWlFbGVtZW50LCBpKSB7XHJcblx0XHRcdFx0aWYgKHVpRWxlbWVudC5jeWNsZSkge1xyXG5cdFx0XHRcdFx0dWlFbGVtZW50LmN5Y2xlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGlzU2hha2luZyA9IG1vdmluZ09iamVjdHMuc29tZShpdGVtID0+IGl0ZW0uZGF0YS5uYW1lID09ICdtb25zdGVyJyAmJiAhaXRlbS5pc0Z1bGwgJiYgIWl0ZW0uaXNFYXRpbmcpO1xyXG5cclxuXHRcdFx0YWZ0ZXJDeWNsZUNhbGxiYWNrcy5lYWNoKGZ1bmN0aW9uKGMpIHtcclxuXHRcdFx0XHRjKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jdGlvbiBkcmF3QmFja2dyb3VuZCgpIHtcclxuXHRcdFx0Ly8gU3RyZXRjaCBiYWNrZ3JvdW5kIGltYWdlIHRvIGNhbnZhcyBzaXplXHJcblx0XHRcdGJhY2tncm91bmRJbWFnZS53aWR0aCA9IG1haW5DYW52YXMud2lkdGg7XHJcblx0XHRcdGJhY2tncm91bmRJbWFnZS5oZWlnaHQgPSBtYWluQ2FudmFzLmhlaWdodDtcclxuXHRcdFx0XHJcblx0XHRcdGJhY2tncm91bmRYID0gcGxheWVyLm1hcFBvc2l0aW9uWzBdICUgYmFja2dyb3VuZEltYWdlLndpZHRoICogLTE7XHJcblx0XHRcdGJhY2tncm91bmRZID0gcGxheWVyLm1hcFBvc2l0aW9uWzFdICUgYmFja2dyb3VuZEltYWdlLmhlaWdodCAqIC0xO1xyXG5cclxuXHRcdFx0Ly8gUmVkcmF3IGJhY2tncm91bmRcclxuXHRcdFx0ZENvbnRleHQuZHJhd0ltYWdlKGJhY2tncm91bmRJbWFnZSwgYmFja2dyb3VuZFgsIGJhY2tncm91bmRZLCBtYWluQ2FudmFzLndpZHRoLCBiYWNrZ3JvdW5kSW1hZ2UuaGVpZ2h0KTtcclxuXHRcdFx0ZENvbnRleHQuZHJhd0ltYWdlKGJhY2tncm91bmRJbWFnZSwgYmFja2dyb3VuZFggKyBtYWluQ2FudmFzLndpZHRoLCBiYWNrZ3JvdW5kWSwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHRcdGRDb250ZXh0LmRyYXdJbWFnZShiYWNrZ3JvdW5kSW1hZ2UsIGJhY2tncm91bmRYIC0gbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZFksIG1haW5DYW52YXMud2lkdGgsIGJhY2tncm91bmRJbWFnZS5oZWlnaHQpO1xyXG5cdFx0XHRkQ29udGV4dC5kcmF3SW1hZ2UoYmFja2dyb3VuZEltYWdlLCBiYWNrZ3JvdW5kWCwgYmFja2dyb3VuZFkgKyBtYWluQ2FudmFzLmhlaWdodCwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHRcdGRDb250ZXh0LmRyYXdJbWFnZShiYWNrZ3JvdW5kSW1hZ2UsIGJhY2tncm91bmRYICsgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZFkgKyBtYWluQ2FudmFzLmhlaWdodCwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHRcdGRDb250ZXh0LmRyYXdJbWFnZShiYWNrZ3JvdW5kSW1hZ2UsIGJhY2tncm91bmRYIC0gbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZFkgKyBtYWluQ2FudmFzLmhlaWdodCwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2hha2luZyBlZmZlY3Q6IGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzI4MDIzNjk2L2h0bWwtY2FudmFzLWFuaW1hdGlvbi13aGljaC1pbmNvcnBvcmF0ZXMtYS1zaGFraW5nLWVmZmVjdFxyXG5cdFx0dmFyIGlzU2hha2luZyA9IGZhbHNlO1xyXG5cdFx0dmFyIHNoYWtlRHVyYXRpb24gPSAyMDA7XHJcblx0XHR2YXIgc2hha2VTdGFydFRpbWUgPSAtMTtcclxuXHRcdFxyXG5cdFx0dmFyIHBsYXllclNoaWZ0ID0gMDsgLy8gRXhwZXJpbWVudGFsIHZpZXcgc2hpZnQgd2hlbiBtb25zdGVyIGFjdGl2ZVxyXG5cclxuXHRcdGZ1bmN0aW9uIHByZVNoYWtlKGN0eCkge1xyXG5cdFx0XHRpZiAoIWlzU2hha2luZykgc2hha2VTdGFydFRpbWUgPSAtMTtcclxuXHJcblx0XHRcdGlmIChzaGFrZVN0YXJ0VGltZSA9PSAtMSkgcmV0dXJuO1xyXG5cdFx0XHR2YXIgZHQgPSBEYXRlLm5vdygpIC0gc2hha2VTdGFydFRpbWU7XHJcblx0XHRcdGlmIChkdCA+IHNoYWtlRHVyYXRpb24pIHtcclxuXHRcdFx0XHRzaGFrZVN0YXJ0VGltZSA9IC0xOyBcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0dmFyIGVhc2luZ0NvZWYgPSBkdCAvIHNoYWtlRHVyYXRpb247XHJcblx0XHRcdHZhciBlYXNpbmcgPSBNYXRoLnBvdyhlYXNpbmdDb2VmIC0gMSwgMykgKyAxO1xyXG5cdFx0XHRjdHguc2F2ZSgpOyAgXHJcblx0XHRcdHZhciBkeCA9IGVhc2luZyAqIChNYXRoLmNvcyhkdCAqIDAuMSApICsgTWF0aC5jb3MoZHQgKiAwLjMxMTUpKSAqIDM7XHJcblx0XHRcdHZhciBkeSA9IGVhc2luZyAqIChNYXRoLnNpbihkdCAqIDAuMDUpICsgTWF0aC5zaW4oZHQgKiAwLjA1NzExMykpICogMztcclxuXHRcdFx0Y3R4LnRyYW5zbGF0ZShkeCwgZHkpO1xyXG5cclxuXHRcdFx0bmF2aWdhdG9yLnZpYnJhdGUoMTAwKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBwb3N0U2hha2UoY3R4KSB7XHJcblx0XHRcdGlmIChzaGFrZVN0YXJ0VGltZSA9PSAtMSkgcmV0dXJuO1xyXG5cdFx0XHRjdHgucmVzdG9yZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHN0YXJ0U2hha2UoKSB7XHJcblx0XHRcdGlmICghaXNTaGFraW5nKSByZXR1cm47XHJcblx0XHRcdHNoYWtlU3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGF0LmRyYXcgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdC8vIENsZWFyIGNhbnZhc1xyXG5cdFx0XHRtYWluQ2FudmFzLndpZHRoID0gbWFpbkNhbnZhcy53aWR0aDtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFVwZGF0ZSBzY3JvbGxpbmcgYmFja2dyb3VuZFxyXG5cdFx0XHRkcmF3QmFja2dyb3VuZCgpO1xyXG5cdFx0XHRcclxuXHRcdFx0cHJlU2hha2UoZENvbnRleHQpO1xyXG5cclxuXHRcdFx0c3RhdGljT2JqZWN0cy5lYWNoKGZ1bmN0aW9uIChzdGF0aWNPYmplY3QsIGkpIHtcclxuXHRcdFx0XHRpZiAoc3RhdGljT2JqZWN0LmlzRHJhd25VbmRlclBsYXllciAmJiBzdGF0aWNPYmplY3QuZHJhdykge1xyXG5cdFx0XHRcdFx0XHRzdGF0aWNPYmplY3QuZHJhdyhkQ29udGV4dCwgJ21haW4nKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cGxheWVyLnNldEhpdEJveGVzVmlzaWJsZShzaG93SGl0Qm94ZXMpO1xyXG5cdFx0XHRwbGF5ZXIuZHJhdyhkQ29udGV4dCk7XHJcblxyXG5cdFx0XHRwbGF5ZXIuY3ljbGUoKTtcclxuXHJcblx0XHRcdG1vdmluZ09iamVjdHMuZWFjaChmdW5jdGlvbiAobW92aW5nT2JqZWN0LCBpKSB7XHJcblx0XHRcdFx0bW92aW5nT2JqZWN0LmRyYXcoZENvbnRleHQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdHN0YXRpY09iamVjdHMuZWFjaChmdW5jdGlvbiAoc3RhdGljT2JqZWN0LCBpKSB7XHJcblx0XHRcdFx0aWYgKCFzdGF0aWNPYmplY3QuaXNEcmF3blVuZGVyUGxheWVyICYmIHN0YXRpY09iamVjdC5kcmF3KSB7XHJcblx0XHRcdFx0XHRzdGF0aWNPYmplY3QuZHJhdyhkQ29udGV4dCwgJ21haW4nKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0dWlFbGVtZW50cy5lYWNoKGZ1bmN0aW9uICh1aUVsZW1lbnQsIGkpIHtcclxuXHRcdFx0XHRpZiAodWlFbGVtZW50LmRyYXcpIHtcclxuXHRcdFx0XHRcdHVpRWxlbWVudC5kcmF3KGRDb250ZXh0LCAnbWFpbicpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRwb3N0U2hha2UoZENvbnRleHQpO1xyXG5cclxuXHRcdFx0Ly8gRXhwZXJpbWVudGluZyB3aXRoIHZpZXcgc2hpZnQgd2hlbiBtb25zdGVyIGFjdGl2ZVxyXG5cdFx0LyogXHRpZiAoaXNTaGFraW5nKSB7XHJcblx0XHRcdFx0aWYgKHBsYXllclNoaWZ0IDwgNTApIHBsYXllclNoaWZ0ICs9IDI7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gVE9ETzogRWFzZSB0aGlzIGJhY2sgYWZ0ZXIgbW9uc3RlciBmaW5pc2hlcyBlYXRpbmdcclxuXHRcdFx0XHRpZiAocGxheWVyU2hpZnQgPiAwKSBwbGF5ZXJTaGlmdCAtPSAxO1xyXG5cdFx0XHR9XHJcblx0XHRcdGRDb250ZXh0LnNldENlbnRyYWxQb3NpdGlvbk9mZnNldCgwLCBwbGF5ZXJTaGlmdCk7ICovXHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc3RhcnQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGdhbWVMb29wLnN0YXJ0KCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMucGF1c2UgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHBhdXNlZCA9IHRydWU7XHJcblx0XHRcdGdhbWVMb29wLnN0b3AoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nYW1lT3ZlciA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRnYW1lRW5kaW5nID0gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmlzUGF1c2VkID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gcGF1c2VkO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmlzR2FtZUVuZGluZyA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRyZXR1cm4gZ2FtZUVuZGluZztcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5yZXNldCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cGF1c2VkID0gZmFsc2U7XHJcblx0XHRcdGdhbWVFbmRpbmcgPSBmYWxzZTtcclxuXHRcdFx0c3RhdGljT2JqZWN0cyA9IG5ldyBTcHJpdGVBcnJheSgpO1xyXG5cdFx0XHRtb3ZpbmdPYmplY3RzID0gbmV3IFNwcml0ZUFycmF5KCk7XHJcblx0XHRcdG1vdXNlWCA9IGRDb250ZXh0LmdldENlbnRyZU9mVmlld3BvcnQoKTtcclxuXHRcdFx0bW91c2VZID0gMDtcclxuXHRcdFx0cGxheWVyLnJlc2V0KCk7XHJcblx0XHRcdHBsYXllci5zZXRNYXBQb3NpdGlvbigwLCAwLCAwKTtcclxuXHRcdFx0dGhpcy5zdGFydCgpO1xyXG5cdFx0fS5iaW5kKHRoaXMpO1xyXG5cclxuXHRcdGdhbWVMb29wLm9uKCcyMCcsIHRoaXMuY3ljbGUpO1xyXG5cdFx0Z2FtZUxvb3Aub24oJzIwJywgdGhpcy5kcmF3KTtcclxuXHJcblx0XHRzdGFydFNoYWtlKG1haW5DYW52YXMpO1xyXG5cdFx0c2V0SW50ZXJ2YWwoc3RhcnRTaGFrZSwgMzAwLCBkQ29udGV4dCk7XHJcblx0fVxyXG5cclxuXHRnbG9iYWwuZ2FtZSA9IEdhbWU7XHJcbn0pKCB0aGlzICk7XHJcblxyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSB0aGlzLmdhbWU7XHJcbn0iLCJmdW5jdGlvbiBHYW1lSHVkKGRhdGEpIHtcclxuXHR2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG5cdHZhciBodWRJbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG5cdGh1ZEltYWdlLnNyYyA9ICdhc3NldHMvQ2FydFdhcnMtc21hbGwucG5nJztcclxuXHJcblx0dGhhdC5saW5lcyA9IGRhdGEuaW5pdGlhbExpbmVzO1xyXG5cclxuXHR0aGF0LnRvcCA9IGRhdGEucG9zaXRpb24udG9wO1xyXG5cdHRoYXQucmlnaHQgPSBkYXRhLnBvc2l0aW9uLnJpZ2h0O1xyXG5cdHRoYXQuYm90dG9tID0gZGF0YS5wb3NpdGlvbi5ib3R0b207XHJcblx0dGhhdC5sZWZ0ID0gZGF0YS5wb3NpdGlvbi5sZWZ0O1xyXG5cclxuXHR0aGF0LndpZHRoID0gZGF0YS53aWR0aDtcclxuXHR0aGF0LmhlaWdodCA9IGRhdGEuaGVpZ2h0O1xyXG5cclxuXHR0aGF0LnNldExpbmVzID0gZnVuY3Rpb24gKGxpbmVzKSB7XHJcblx0XHR0aGF0LmxpbmVzID0gbGluZXM7XHJcblx0fTtcclxuXHJcblx0dGhhdC5kcmF3ID0gZnVuY3Rpb24gKGN0eCkge1xyXG5cdFx0Y3R4LmRyYXdJbWFnZShodWRJbWFnZSwgMjAsIDUpO1xyXG5cclxuXHRcdGN0eC5mb250ID0gJzEycHggbW9ub3NwYWNlJztcclxuXHRcdHZhciB5T2Zmc2V0ID0gMDtcclxuXHRcdHRoYXQubGluZXMuZWFjaChmdW5jdGlvbiAobGluZSkge1xyXG5cdFx0XHR2YXIgZm9udFNpemUgPSArY3R4LmZvbnQuc2xpY2UoMCwgMik7XHJcblx0XHRcdHZhciB0ZXh0V2lkdGggPSBjdHgubWVhc3VyZVRleHQobGluZSkud2lkdGg7XHJcblx0XHRcdHZhciB0ZXh0SGVpZ2h0ID0gZm9udFNpemUgKiAxLjM7XHJcblx0XHRcdHZhciB4UG9zLCB5UG9zO1xyXG5cdFx0XHRpZiAodGhhdC50b3ApIHtcclxuXHRcdFx0XHR5UG9zID0gdGhhdC50b3AgKyB5T2Zmc2V0O1xyXG5cdFx0XHR9IGVsc2UgaWYgKHRoYXQuYm90dG9tKSB7XHJcblx0XHRcdFx0eVBvcyA9IGN0eC5jYW52YXMuaGVpZ2h0IC0gdGhhdC50b3AgLSB0ZXh0SGVpZ2h0ICsgeU9mZnNldDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHRoYXQucmlnaHQpIHtcclxuXHRcdFx0XHR4UG9zID0gY3R4LmNhbnZhcy53aWR0aCAtIHRoYXQucmlnaHQgLSB0ZXh0V2lkdGg7XHJcblx0XHRcdH0gZWxzZSBpZiAodGhhdC5sZWZ0KSB7XHJcblx0XHRcdFx0eFBvcyA9IHRoYXQubGVmdDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0eU9mZnNldCArPSB0ZXh0SGVpZ2h0O1xyXG5cdFx0XHRjdHguZmlsbFN0eWxlID0gXCIjRkZGRkZGXCI7XHJcblx0XHRcdGN0eC5maWxsVGV4dChsaW5lLCB4UG9zLCB5UG9zKTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHJldHVybiB0aGF0O1xyXG59XHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IEdhbWVIdWQ7XHJcbn1cclxuIiwiLy8gQ3JlYXRlcyBhIHJhbmRvbSBJRCBzdHJpbmdcclxuKGZ1bmN0aW9uKGdsb2JhbCkge1xyXG4gICAgZnVuY3Rpb24gZ3VpZCAoKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBTNCA9IGZ1bmN0aW9uICgpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihcclxuICAgICAgICAgICAgICAgICAgICBNYXRoLnJhbmRvbSgpICogMHgxMDAwMCAvKiA2NTUzNiAqL1xyXG4gICAgICAgICAgICAgICAgKS50b1N0cmluZygxNik7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgICAgIFM0KCkgKyBTNCgpICsgXCItXCIgK1xyXG4gICAgICAgICAgICAgICAgUzQoKSArIFwiLVwiICtcclxuICAgICAgICAgICAgICAgIFM0KCkgKyBcIi1cIiArXHJcbiAgICAgICAgICAgICAgICBTNCgpICsgXCItXCIgK1xyXG4gICAgICAgICAgICAgICAgUzQoKSArIFM0KCkgKyBTNCgpXHJcbiAgICAgICAgICAgICk7XHJcbiAgICB9XHJcbiAgICBnbG9iYWwuZ3VpZCA9IGd1aWQ7XHJcbn0pKHRoaXMpO1xyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHRoaXMuZ3VpZDtcclxufSIsImZ1bmN0aW9uIGlzTW9iaWxlRGV2aWNlKCkge1xyXG5cdGlmKG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0FuZHJvaWQvaSkgfHxcclxuXHRcdG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL3dlYk9TL2kpIHx8XHJcblx0XHRuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9pUGhvbmUvaSkgfHxcclxuXHRcdG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL2lQYWQvaSkgfHxcclxuXHRcdG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL2lQb2QvaSkgfHxcclxuXHRcdG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0JsYWNrQmVycnkvaSkgfHxcclxuXHRcdG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL1dpbmRvd3MgUGhvbmUvaSlcclxuXHQpIHtcclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gaXNNb2JpbGVEZXZpY2U7IiwidmFyIFNwcml0ZSA9IHJlcXVpcmUoJy4vc3ByaXRlJyk7XHJcblxyXG4oZnVuY3Rpb24oZ2xvYmFsKSB7XHJcblx0ZnVuY3Rpb24gTW9uc3RlcihkYXRhKSB7XHJcblx0XHR2YXIgdGhhdCA9IG5ldyBTcHJpdGUoZGF0YSk7XHJcblx0XHR2YXIgc3VwZXJfZHJhdyA9IHRoYXQuc3VwZXJpb3IoJ2RyYXcnKTtcclxuXHRcdHZhciBzcHJpdGVWZXJzaW9uID0gMTtcclxuXHRcdHZhciBlYXRpbmdTdGFnZSA9IDA7XHJcblx0XHRjb25zdCBzdGFuZGFyZFNwZWVkID0gODtcclxuXHRcdGNvbnN0IHNsb3dTcGVlZCA9IDU7XHJcblx0XHRjb25zdCBjaGFzaW5nU3BlZWQgPSAxMjtcclxuXHJcblx0XHR0aGF0LmlzRWF0aW5nID0gZmFsc2U7XHJcblx0XHR0aGF0LmlzRnVsbCA9IGZhbHNlO1xyXG5cdFx0dGhhdC5pc0NoYXNpbmcgPSBmYWxzZTtcclxuXHJcblx0XHR0aGF0LnJlc2V0U3BlZWQgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0aWYgKHRoYXQuaXNDaGFzaW5nKVxyXG5cdFx0XHRcdHRoYXQuc2V0U3BlZWQoY2hhc2luZ1NwZWVkKTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHRoYXQuc2V0U3BlZWQoc3RhbmRhcmRTcGVlZCk7XHJcblx0XHR9O1xyXG5cdFx0dGhhdC5zZXRTdGFuZGFyZFNwZWVkID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdHRoYXQuaXNDaGFzaW5nID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuc2V0U3BlZWQoc3RhbmRhcmRTcGVlZCk7XHJcblx0XHR9O1xyXG5cdFx0dGhhdC5zZXRPYnN0YWNsZUhpdFNwZWVkID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdHRoYXQuc2V0U3BlZWQoc2xvd1NwZWVkKTtcclxuXHRcdFx0c2V0VGltZW91dCh0aGF0LnJlc2V0U3BlZWQsIDMwMCk7XHJcblx0XHR9O1xyXG5cdFx0dGhhdC5zdGFydENoYXNpbmcgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0dGhhdC5pc0NoYXNpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0LnNldFNwZWVkKGNoYXNpbmdTcGVlZCk7XHJcblx0XHRcdC8vIFJlc2V0IHRoZSBzcGVlZCBhZnRlciBydXNoaW5nIGluXHJcblx0XHRcdHNldFRpbWVvdXQodGhhdC5zZXRTdGFuZGFyZFNwZWVkLCAyMDAwKTtcclxuXHRcdH07XHJcblx0XHR0aGF0LnN0YXJ0Q2hhc2luZygpO1xyXG5cclxuXHRcdHRoYXQuZHJhdyA9IGZ1bmN0aW9uKGRDb250ZXh0KSB7XHJcblx0XHRcdHZhciBzcHJpdGVQYXJ0VG9Vc2UgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0dmFyIHhEaWZmID0gdGhhdC5tb3ZpbmdUb3dhcmRbMF0gLSB0aGF0LmNhbnZhc1g7XHJcblxyXG5cdFx0XHRcdGlmICh0aGF0LmlzRWF0aW5nKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ2VhdGluZycgKyBlYXRpbmdTdGFnZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmIChzcHJpdGVWZXJzaW9uICsgMC4xID4gMikge1xyXG5cdFx0XHRcdFx0c3ByaXRlVmVyc2lvbiA9IDAuMTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0c3ByaXRlVmVyc2lvbiArPSAwLjE7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmICh4RGlmZiA+PSAwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3NFYXN0JyArIE1hdGguY2VpbChzcHJpdGVWZXJzaW9uKTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHhEaWZmIDwgMCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdzV2VzdCcgKyBNYXRoLmNlaWwoc3ByaXRlVmVyc2lvbik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0cmV0dXJuIHN1cGVyX2RyYXcoZENvbnRleHQsIHNwcml0ZVBhcnRUb1VzZSgpKTtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gc3RhcnRFYXRpbmcgKHdoZW5Eb25lKSB7XHJcblx0XHRcdGVhdGluZ1N0YWdlICs9IDE7XHJcblx0XHRcdHRoYXQuaXNFYXRpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0LmlzTW92aW5nID0gZmFsc2U7XHJcblx0XHRcdGlmIChlYXRpbmdTdGFnZSA8IDYpIHtcclxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHN0YXJ0RWF0aW5nKHdoZW5Eb25lKTtcclxuXHRcdFx0XHR9LCAzMDApO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGVhdGluZ1N0YWdlID0gMTtcclxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHN0YXJ0RWF0aW5nKHdoZW5Eb25lKTtcclxuXHRcdFx0XHR9LCAzMDApO1xyXG5cdFx0XHRcdC8vdGhhdC5pc0VhdGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdC8vdGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHRcdFx0Ly93aGVuRG9uZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5zdGFydEVhdGluZyA9IHN0YXJ0RWF0aW5nO1xyXG5cclxuXHRcdHJldHVybiB0aGF0O1xyXG5cdH1cclxuXHJcblx0Z2xvYmFsLm1vbnN0ZXIgPSBNb25zdGVyO1xyXG59KSggdGhpcyApO1xyXG5cclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG5cdG1vZHVsZS5leHBvcnRzID0gdGhpcy5tb25zdGVyO1xyXG59IiwidmFyIFNwcml0ZSA9IHJlcXVpcmUoJy4vc3ByaXRlJyk7XHJcbmlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJykge1xyXG5cdG5hdmlnYXRvci52aWJyYXRlID0gbmF2aWdhdG9yLnZpYnJhdGUgfHxcclxuXHRcdG5hdmlnYXRvci53ZWJraXRWaWJyYXRlIHx8XHJcblx0XHRuYXZpZ2F0b3IubW96VmlicmF0ZSB8fFxyXG5cdFx0bmF2aWdhdG9yLm1zVmlicmF0ZTtcclxufSBlbHNlIHtcclxuXHRuYXZpZ2F0b3IgPSB7XHJcblx0XHR2aWJyYXRlOiBmYWxzZVxyXG5cdH07XHJcbn1cclxuXHJcbihmdW5jdGlvbihnbG9iYWwpIHtcclxuXHRmdW5jdGlvbiBQbGF5ZXIoZGF0YSkge1xyXG5cdFx0dmFyIGRpc2NyZXRlRGlyZWN0aW9ucyA9IHtcclxuXHRcdFx0J3dlc3QnOiAyNzAsXHJcblx0XHRcdCd3c1dlc3QnOiAyNDAsXHJcblx0XHRcdCdzV2VzdCc6IDE5NSxcclxuXHRcdFx0J3NvdXRoJzogMTgwLFxyXG5cdFx0XHQnc0Vhc3QnOiAxNjUsXHJcblx0XHRcdCdlc0Vhc3QnOiAxMjAsXHJcblx0XHRcdCdlYXN0JzogOTBcclxuXHRcdH07XHJcblx0XHR2YXIgdGhhdCA9IG5ldyBTcHJpdGUoZGF0YSk7XHJcblx0XHR2YXIgc3VwID0ge1xyXG5cdFx0XHRkcmF3OiB0aGF0LnN1cGVyaW9yKCdkcmF3JyksXHJcblx0XHRcdGN5Y2xlOiB0aGF0LnN1cGVyaW9yKCdjeWNsZScpLFxyXG5cdFx0XHRnZXRTcGVlZFg6IHRoYXQuc3VwZXJpb3IoJ2dldFNwZWVkWCcpLFxyXG5cdFx0XHRnZXRTcGVlZFk6IHRoYXQuc3VwZXJpb3IoJ2dldFNwZWVkWScpLFxyXG5cdFx0XHRoaXRzOiB0aGF0LnN1cGVyaW9yKCdoaXRzJylcclxuXHRcdH07XHJcblx0XHR2YXIgZGlyZWN0aW9ucyA9IHtcclxuXHRcdFx0ZXNFYXN0OiBmdW5jdGlvbih4RGlmZikgeyByZXR1cm4geERpZmYgPiAzMDA7IH0sXHJcblx0XHRcdHNFYXN0OiBmdW5jdGlvbih4RGlmZikgeyByZXR1cm4geERpZmYgPiA3NTsgfSxcclxuXHRcdFx0d3NXZXN0OiBmdW5jdGlvbih4RGlmZikgeyByZXR1cm4geERpZmYgPCAtMzAwOyB9LFxyXG5cdFx0XHRzV2VzdDogZnVuY3Rpb24oeERpZmYpIHsgcmV0dXJuIHhEaWZmIDwgLTc1OyB9XHJcblx0XHR9O1xyXG5cclxuXHRcdHZhciBjYW5jZWxhYmxlU3RhdGVUaW1lb3V0O1xyXG5cdFx0dmFyIGNhbmNlbGFibGVTdGF0ZUludGVydmFsO1xyXG5cclxuXHRcdHZhciBvYnN0YWNsZXNIaXQgPSBbXTtcclxuXHRcdHZhciBwaXhlbHNUcmF2ZWxsZWQgPSAwO1xyXG5cdFx0Y29uc3Qgc3RhbmRhcmRTcGVlZCA9IDU7XHJcblx0XHRjb25zdCBib29zdE11bHRpcGxpZXIgPSAyO1xyXG5cdFx0dmFyIHR1cm5FYXNlQ3ljbGVzID0gNzA7XHJcblx0XHR2YXIgc3BlZWRYID0gMDtcclxuXHRcdHZhciBzcGVlZFhGYWN0b3IgPSAwO1xyXG5cdFx0dmFyIHNwZWVkWSA9IDA7XHJcblx0XHR2YXIgc3BlZWRZRmFjdG9yID0gMTtcclxuXHRcdHZhciB0cmlja1N0ZXAgPSAwOyAvLyBUaGVyZSBhcmUgdGhyZWUgb2YgdGhlc2VcclxuXHRcdHZhciBjcmFzaGluZ0ZyYW1lID0gMDsgLy8gNi1mcmFtZSBzZXF1ZW5jZVxyXG5cclxuXHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0dGhhdC5oYXNCZWVuSGl0ID0gZmFsc2U7XHJcblx0XHR0aGF0LmlzSnVtcGluZyA9IGZhbHNlO1xyXG5cdFx0dGhhdC5pc1BlcmZvcm1pbmdUcmljayA9IGZhbHNlO1xyXG5cdFx0dGhhdC5pc0NyYXNoaW5nID0gZmFsc2U7XHJcblx0XHR0aGF0LmlzQm9vc3RpbmcgPSBmYWxzZTtcclxuXHRcdHRoYXQuaXNTbG93ZWQgPSBmYWxzZTtcclxuXHRcdHRoYXQuYXZhaWxhYmxlQXdha2UgPSAxMDA7XHJcblx0XHR0aGF0Lm9uSGl0T2JzdGFjbGVDYiA9IGZ1bmN0aW9uKCkge307XHJcblx0XHR0aGF0Lm9uQ29sbGVjdEl0ZW1DYiA9IGZ1bmN0aW9uKCkge307XHJcblx0XHR0aGF0Lm9uSGl0TW9uc3RlckNiID0gZnVuY3Rpb24oKSB7fTtcclxuXHRcdHRoYXQuc2V0U3BlZWQoc3RhbmRhcmRTcGVlZCk7XHJcblxyXG5cdFx0Ly8gSW5jcmVhc2UgYXdha2UgYnkgNSBldmVyeSBzZWNvbmRcclxuXHRcdHNldEludGVydmFsKCgpID0+IHtcclxuXHRcdFx0aWYgKHRoYXQuaXNNb3ZpbmcgJiYgIXRoYXQuaXNCb29zdGluZylcclxuXHRcdFx0XHR0aGF0LmF2YWlsYWJsZUF3YWtlID0gdGhhdC5hdmFpbGFibGVBd2FrZSA+PSA5NSA/IDEwMCA6IHRoYXQuYXZhaWxhYmxlQXdha2UgKyA1XHJcblx0XHR9LCAzMDAwKTtcclxuXHJcblx0XHR0aGF0LnJlc2V0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRvYnN0YWNsZXNIaXQgPSBbXTtcclxuXHRcdFx0cGl4ZWxzVHJhdmVsbGVkID0gMDtcclxuXHRcdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHRcdHRoYXQuaGFzQmVlbkhpdCA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LmF2YWlsYWJsZUF3YWtlID0gMTAwO1xyXG5cdFx0XHR0aGF0LmlzQ3Jhc2hpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc0JlaW5nRWF0ZW4gPSBmYWxzZTtcclxuXHRcdFx0c2V0Tm9ybWFsKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIGNhblNwZWVkQm9vc3QoKSB7XHJcblx0XHRcdHJldHVybiAhdGhhdC5pc0NyYXNoaW5nIFxyXG5cdFx0XHRcdCYmIHRoYXQuaXNNb3ZpbmdcclxuXHRcdFx0XHQmJiB0aGF0LmF2YWlsYWJsZUF3YWtlID49IDUwO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHNldE5vcm1hbCgpIHtcclxuXHRcdFx0aWYgKHRoYXQuaXNCZWluZ0VhdGVuKSByZXR1cm47XHJcblx0XHRcdHRoYXQuc2V0U3BlZWQoc3RhbmRhcmRTcGVlZCk7XHJcblx0XHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0Lmhhc0JlZW5IaXQgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc0p1bXBpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc1BlcmZvcm1pbmdUcmljayA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LmlzQ3Jhc2hpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc0Jvb3N0ZWQgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc1Nsb3dlZCA9IGZhbHNlO1xyXG5cdFx0XHRpZiAoY2FuY2VsYWJsZVN0YXRlSW50ZXJ2YWwpIHtcclxuXHRcdFx0XHRjbGVhckludGVydmFsKGNhbmNlbGFibGVTdGF0ZUludGVydmFsKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGF0LnNldE1hcFBvc2l0aW9uKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAwKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBzZXRDcmFzaGVkKCkge1xyXG5cdFx0XHR0aGF0Lmhhc0JlZW5IaXQgPSB0cnVlO1xyXG5cdFx0XHR0aGF0LmlzQ3Jhc2hpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0LmlzSnVtcGluZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LmlzUGVyZm9ybWluZ1RyaWNrID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuc3RhcnRDcmFzaGluZygpO1xyXG5cdFx0XHRpZiAoY2FuY2VsYWJsZVN0YXRlSW50ZXJ2YWwpIHtcclxuXHRcdFx0XHRjbGVhckludGVydmFsKGNhbmNlbGFibGVTdGF0ZUludGVydmFsKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGF0LnNldE1hcFBvc2l0aW9uKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAwKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBzZXRKdW1waW5nKCkge1xyXG5cdFx0XHR2YXIgY3VycmVudFNwZWVkID0gdGhhdC5nZXRTcGVlZCgpO1xyXG5cdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc291dGgnKTtcclxuXHRcdFx0dGhhdC5zZXRTcGVlZChjdXJyZW50U3BlZWQgKyAyKTtcclxuXHRcdFx0dGhhdC5zZXRTcGVlZFkoY3VycmVudFNwZWVkICsgMik7XHJcblx0XHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0Lmhhc0JlZW5IaXQgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc0p1bXBpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0LnNldE1hcFBvc2l0aW9uKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAxKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBzZXRTbG93RG93bigpIHtcclxuXHRcdFx0dGhhdC5zZXRTcGVlZCgxKTtcclxuXHRcdFx0dGhhdC5zZXRTcGVlZFkoMSk7XHJcblx0XHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0LmlzU2xvd2VkID0gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXREaXNjcmV0ZURpcmVjdGlvbigpIHtcclxuXHRcdFx0aWYgKHRoYXQuZGlyZWN0aW9uKSB7XHJcblx0XHRcdFx0aWYgKHRoYXQuZGlyZWN0aW9uIDw9IDkwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ2Vhc3QnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5kaXJlY3Rpb24gPiA5MCAmJiB0aGF0LmRpcmVjdGlvbiA8IDE1MCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdlc0Vhc3QnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5kaXJlY3Rpb24gPj0gMTUwICYmIHRoYXQuZGlyZWN0aW9uIDwgMTgwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3NFYXN0JztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHRoYXQuZGlyZWN0aW9uID09PSAxODApIHtcclxuXHRcdFx0XHRcdHJldHVybiAnc291dGgnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5kaXJlY3Rpb24gPiAxODAgJiYgdGhhdC5kaXJlY3Rpb24gPD0gMjEwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3NXZXN0JztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHRoYXQuZGlyZWN0aW9uID4gMjEwICYmIHRoYXQuZGlyZWN0aW9uIDwgMjcwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3dzV2VzdCc7XHJcblx0XHRcdFx0fSBlbHNlIGlmICh0aGF0LmRpcmVjdGlvbiA+PSAyNzApIHtcclxuXHRcdFx0XHRcdHJldHVybiAnd2VzdCc7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHJldHVybiAnc291dGgnO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR2YXIgeERpZmYgPSB0aGF0Lm1vdmluZ1Rvd2FyZFswXSAtIHRoYXQubWFwUG9zaXRpb25bMF07XHJcblx0XHRcdFx0dmFyIHlEaWZmID0gdGhhdC5tb3ZpbmdUb3dhcmRbMV0gLSB0aGF0Lm1hcFBvc2l0aW9uWzFdO1xyXG5cdFx0XHRcdGlmICh5RGlmZiA8PSAwKSB7XHJcblx0XHRcdFx0XHRpZiAoeERpZmYgPiAwKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiAnZWFzdCc7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gJ3dlc3QnO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKGRpcmVjdGlvbnMuZXNFYXN0KHhEaWZmKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdlc0Vhc3QnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoZGlyZWN0aW9ucy5zRWFzdCh4RGlmZikpIHtcclxuXHRcdFx0XHRcdHJldHVybiAnc0Vhc3QnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoZGlyZWN0aW9ucy53c1dlc3QoeERpZmYpKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3dzV2VzdCc7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChkaXJlY3Rpb25zLnNXZXN0KHhEaWZmKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdzV2VzdCc7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiAnc291dGgnO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHNldERpc2NyZXRlRGlyZWN0aW9uKGQpIHtcclxuXHRcdFx0aWYgKGRpc2NyZXRlRGlyZWN0aW9uc1tkXSkge1xyXG5cdFx0XHRcdHRoYXQuc2V0RGlyZWN0aW9uKGRpc2NyZXRlRGlyZWN0aW9uc1tkXSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChkID09PSAnd2VzdCcgfHwgZCA9PT0gJ2Vhc3QnKSB7XHJcblx0XHRcdFx0dGhhdC5pc01vdmluZyA9IGZhbHNlO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0QmVpbmdFYXRlblNwcml0ZSgpIHtcclxuXHRcdFx0cmV0dXJuICdibGFuayc7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0SnVtcGluZ1Nwcml0ZSgpIHtcclxuXHRcdFx0cmV0dXJuICdqdW1waW5nJztcclxuXHRcdH1cclxuXHJcblx0XHR0aGF0LnN0b3AgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmICh0aGF0LmRpcmVjdGlvbiA+IDE4MCkge1xyXG5cdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCd3ZXN0Jyk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ2Vhc3QnKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnR1cm5FYXN0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRzd2l0Y2ggKGdldERpc2NyZXRlRGlyZWN0aW9uKCkpIHtcclxuXHRcdFx0XHRjYXNlICd3ZXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCd3c1dlc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3dzV2VzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc1dlc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3NXZXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdzb3V0aCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnc291dGgnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NFYXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdzRWFzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignZXNFYXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdlc0Vhc3QnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ2Vhc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc291dGgnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQudHVybldlc3QgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHN3aXRjaCAoZ2V0RGlzY3JldGVEaXJlY3Rpb24oKSkge1xyXG5cdFx0XHRcdGNhc2UgJ2Vhc3QnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ2VzRWFzdCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnZXNFYXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdzRWFzdCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnc0Vhc3QnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NvdXRoJyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdzb3V0aCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc1dlc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3NXZXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCd3c1dlc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3dzV2VzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignd2VzdCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdzb3V0aCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zdGVwV2VzdCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dGhhdC5tYXBQb3NpdGlvblswXSAtPSB0aGF0LnNwZWVkICogMjtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zdGVwRWFzdCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dGhhdC5tYXBQb3NpdGlvblswXSArPSB0aGF0LnNwZWVkICogMjtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zZXRNYXBQb3NpdGlvblRhcmdldCA9IGZ1bmN0aW9uICh4LCB5KSB7XHJcblx0XHRcdGlmICh0aGF0Lmhhc0JlZW5IaXQpIHJldHVybjtcclxuXHJcblx0XHRcdGlmIChNYXRoLmFicyh0aGF0Lm1hcFBvc2l0aW9uWzBdIC0geCkgPD0gNzUpIHtcclxuXHRcdFx0XHR4ID0gdGhhdC5tYXBQb3NpdGlvblswXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhhdC5tb3ZpbmdUb3dhcmQgPSBbIHgsIHkgXTtcclxuXHJcblx0XHRcdC8vIHRoYXQucmVzZXREaXJlY3Rpb24oKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zdGFydE1vdmluZ0lmUG9zc2libGUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmICghdGhhdC5oYXNCZWVuSGl0ICYmICF0aGF0LmlzQmVpbmdFYXRlbikge1xyXG5cdFx0XHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuc2V0VHVybkVhc2VDeWNsZXMgPSBmdW5jdGlvbiAoYykge1xyXG5cdFx0XHR0dXJuRWFzZUN5Y2xlcyA9IGM7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuZ2V0UGl4ZWxzVHJhdmVsbGVkRG93blJvYWQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiBwaXhlbHNUcmF2ZWxsZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQucmVzZXRTcGVlZCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dGhhdC5zZXRTcGVlZChzdGFuZGFyZFNwZWVkKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5jeWNsZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0aWYgKCB0aGF0LmdldFNwZWVkWCgpIDw9IDAgJiYgdGhhdC5nZXRTcGVlZFkoKSA8PSAwICkge1xyXG5cdFx0XHRcdFx0XHR0aGF0LmlzTW92aW5nID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGRpcmVjdGlvbiA9IGdldERpc2NyZXRlRGlyZWN0aW9uKCk7XHJcblx0XHRcdGlmICh0aGF0LmlzTW92aW5nICYmIGRpcmVjdGlvbiAhPT0gJ2Vhc3QnICYmIGRpcmVjdGlvbiAhPT0gJ3dlc3QnKSB7XHJcblx0XHRcdFx0cGl4ZWxzVHJhdmVsbGVkICs9IHRoYXQuc3BlZWQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh0aGF0LmlzSnVtcGluZykge1xyXG5cdFx0XHRcdHRoYXQuc2V0TWFwUG9zaXRpb25UYXJnZXQodW5kZWZpbmVkLCB0aGF0Lm1hcFBvc2l0aW9uWzFdICsgdGhhdC5nZXRTcGVlZCgpKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c3VwLmN5Y2xlKCk7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGF0LmNoZWNrSGl0dGFibGVPYmplY3RzKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuZHJhdyA9IGZ1bmN0aW9uKGRDb250ZXh0KSB7XHJcblx0XHRcdHZhciBzcHJpdGVQYXJ0VG9Vc2UgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0aWYgKHRoYXQuaXNCZWluZ0VhdGVuKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gZ2V0QmVpbmdFYXRlblNwcml0ZSgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKHRoYXQuaXNKdW1waW5nKSB7XHJcblx0XHRcdFx0XHQvKiBpZiAodGhhdC5pc1BlcmZvcm1pbmdUcmljaykge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZ2V0VHJpY2tTcHJpdGUoKTtcclxuXHRcdFx0XHRcdH0gKi9cclxuXHRcdFx0XHRcdHJldHVybiBnZXRKdW1waW5nU3ByaXRlKCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAodGhhdC5pc0NyYXNoaW5nKVxyXG5cdFx0XHRcdFx0cmV0dXJuICd3cmVjaycgKyBjcmFzaGluZ0ZyYW1lO1xyXG5cclxuXHRcdFx0XHRpZiAodGhhdC5pc0Jvb3N0aW5nKVxyXG5cdFx0XHRcdFx0cmV0dXJuICdib29zdCc7XHJcblxyXG5cdFx0XHRcdHJldHVybiBnZXREaXNjcmV0ZURpcmVjdGlvbigpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0cmV0dXJuIHN1cC5kcmF3KGRDb250ZXh0LCBzcHJpdGVQYXJ0VG9Vc2UoKSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuaGl0cyA9IGZ1bmN0aW9uIChvYnMpIHtcclxuXHRcdFx0aWYgKG9ic3RhY2xlc0hpdC5pbmRleE9mKG9icy5pZCkgIT09IC0xKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoIW9icy5vY2N1cGllc1pJbmRleCh0aGF0Lm1hcFBvc2l0aW9uWzJdKSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHN1cC5oaXRzKG9icykpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnNwZWVkQm9vc3QgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmICghdGhhdC5pc0Jvb3N0aW5nICYmIGNhblNwZWVkQm9vc3QoKSkge1xyXG5cdFx0XHRcdHRoYXQuYXZhaWxhYmxlQXdha2UgLT0gNTA7XHJcblx0XHRcdFx0dGhhdC5zZXRTcGVlZCh0aGF0LnNwZWVkICogYm9vc3RNdWx0aXBsaWVyKTtcclxuXHRcdFx0XHR0aGF0LmlzQm9vc3RpbmcgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHRoYXQuc2V0U3BlZWQoc3RhbmRhcmRTcGVlZCk7XHJcblx0XHRcdFx0XHR0aGF0LmlzQm9vc3RpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHR9LCAyMDAwKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmF0dGVtcHRUcmljayA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0aWYgKHRoYXQuaXNKdW1waW5nKSB7XHJcblx0XHRcdFx0dGhhdC5pc1BlcmZvcm1pbmdUcmljayA9IHRydWU7XHJcblx0XHRcdFx0Y2FuY2VsYWJsZVN0YXRlSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRpZiAodHJpY2tTdGVwID49IDIpIHtcclxuXHRcdFx0XHRcdFx0dHJpY2tTdGVwID0gMDtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHRyaWNrU3RlcCArPSAxO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sIDMwMCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5nZXRTdGFuZGFyZFNwZWVkID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gc3RhbmRhcmRTcGVlZDtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gZWFzZVNwZWVkVG9UYXJnZXRVc2luZ0ZhY3RvcihzcCwgdGFyZ2V0U3BlZWQsIGYpIHtcclxuXHRcdFx0aWYgKGYgPT09IDAgfHwgZiA9PT0gMSkge1xyXG5cdFx0XHRcdHJldHVybiB0YXJnZXRTcGVlZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHNwIDwgdGFyZ2V0U3BlZWQpIHtcclxuXHRcdFx0XHRzcCArPSB0aGF0LmdldFNwZWVkKCkgKiAoZiAvIHR1cm5FYXNlQ3ljbGVzKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHNwID4gdGFyZ2V0U3BlZWQpIHtcclxuXHRcdFx0XHRzcCAtPSB0aGF0LmdldFNwZWVkKCkgKiAoZiAvIHR1cm5FYXNlQ3ljbGVzKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHNwO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoYXQuZ2V0U3BlZWRYID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRzd2l0Y2ggKGdldERpc2NyZXRlRGlyZWN0aW9uKCkpIHtcclxuXHRcdFx0XHRjYXNlICdlc0Vhc3QnOlxyXG5cdFx0XHRcdGNhc2UgJ3dzV2VzdCc6XHJcblx0XHRcdFx0XHRzcGVlZFhGYWN0b3IgPSAwLjU7XHJcblx0XHRcdFx0XHRzcGVlZFggPSBlYXNlU3BlZWRUb1RhcmdldFVzaW5nRmFjdG9yKHNwZWVkWCwgdGhhdC5nZXRTcGVlZCgpICogc3BlZWRYRmFjdG9yLCBzcGVlZFhGYWN0b3IpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHNwZWVkWDtcclxuXHRcdFx0XHRjYXNlICdzRWFzdCc6XHJcblx0XHRcdFx0Y2FzZSAnc1dlc3QnOlxyXG5cdFx0XHRcdFx0c3BlZWRYRmFjdG9yID0gMC4zMztcclxuXHRcdFx0XHRcdHNwZWVkWCA9IGVhc2VTcGVlZFRvVGFyZ2V0VXNpbmdGYWN0b3Ioc3BlZWRYLCB0aGF0LmdldFNwZWVkKCkgKiBzcGVlZFhGYWN0b3IsIHNwZWVkWEZhY3Rvcik7XHJcblx0XHRcdFx0XHRyZXR1cm4gc3BlZWRYO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIFNvIGl0IG11c3QgYmUgc291dGhcclxuXHRcdFx0c3BlZWRYID0gZWFzZVNwZWVkVG9UYXJnZXRVc2luZ0ZhY3RvcihzcGVlZFgsIDAsIHNwZWVkWEZhY3Rvcik7XHJcblxyXG5cdFx0XHRyZXR1cm4gc3BlZWRYO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnNldFNwZWVkWSA9IGZ1bmN0aW9uKHN5KSB7XHJcblx0XHRcdHNwZWVkWSA9IHN5O1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmdldFNwZWVkWSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0aWYgKHRoYXQuaXNKdW1waW5nKSB7XHJcblx0XHRcdFx0cmV0dXJuIHNwZWVkWTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c3dpdGNoIChnZXREaXNjcmV0ZURpcmVjdGlvbigpKSB7XHJcblx0XHRcdFx0Y2FzZSAnZXNFYXN0JzpcclxuXHRcdFx0XHRjYXNlICd3c1dlc3QnOlxyXG5cdFx0XHRcdFx0c3BlZWRZRmFjdG9yID0gMC42O1xyXG5cdFx0XHRcdFx0c3BlZWRZID0gZWFzZVNwZWVkVG9UYXJnZXRVc2luZ0ZhY3RvcihzcGVlZFksIHRoYXQuZ2V0U3BlZWQoKSAqIDAuNiwgMC42KTtcclxuXHRcdFx0XHRcdHJldHVybiBzcGVlZFk7XHJcblx0XHRcdFx0Y2FzZSAnZXNFYXN0JzpcclxuXHRcdFx0XHRjYXNlICd3c1dlc3QnOlxyXG5cdFx0XHRcdFx0c3BlZWRZRmFjdG9yID0gMC44NTtcclxuXHRcdFx0XHRcdHNwZWVkWSA9IGVhc2VTcGVlZFRvVGFyZ2V0VXNpbmdGYWN0b3Ioc3BlZWRZLCB0aGF0LmdldFNwZWVkKCkgKiAwLjg1LCAwLjg1KTtcclxuXHRcdFx0XHRcdHJldHVybiBzcGVlZFk7XHJcblx0XHRcdFx0Y2FzZSAnZWFzdCc6XHJcblx0XHRcdFx0Y2FzZSAnd2VzdCc6XHJcblx0XHRcdFx0XHRzcGVlZFlGYWN0b3IgPSAxO1xyXG5cdFx0XHRcdFx0c3BlZWRZID0gMDtcclxuXHRcdFx0XHRcdHJldHVybiBzcGVlZFk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNvIGl0IG11c3QgYmUgc291dGhcclxuXHRcdFx0c3BlZWRZID0gZWFzZVNwZWVkVG9UYXJnZXRVc2luZ0ZhY3RvcihzcGVlZFksIHRoYXQuZ2V0U3BlZWQoKSwgc3BlZWRZRmFjdG9yKTtcclxuXHJcblx0XHRcdHJldHVybiBzcGVlZFk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuaGFzSGl0T2JzdGFjbGUgPSBmdW5jdGlvbiAob2JzKSB7XHJcblx0XHRcdHNldENyYXNoZWQoKTtcclxuXHJcblx0XHRcdGlmIChuYXZpZ2F0b3IudmlicmF0ZSkge1xyXG5cdFx0XHRcdG5hdmlnYXRvci52aWJyYXRlKDUwMCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdG9ic3RhY2xlc0hpdC5wdXNoKG9icy5pZCk7XHJcblxyXG5cdFx0XHR0aGF0LnJlc2V0U3BlZWQoKTtcclxuXHRcdFx0dGhhdC5vbkhpdE9ic3RhY2xlQ2Iob2JzKTtcclxuXHJcblx0XHRcdGlmIChjYW5jZWxhYmxlU3RhdGVUaW1lb3V0KSB7XHJcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KGNhbmNlbGFibGVTdGF0ZVRpbWVvdXQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhbmNlbGFibGVTdGF0ZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHNldE5vcm1hbCgpO1xyXG5cdFx0XHR9LCAxNTAwKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5oYXNIaXRNb25zdGVyID0gZnVuY3Rpb24gKG1vbnN0ZXIpIHtcclxuXHRcdFx0Ly8gVE9ET1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0Lmhhc0hpdEp1bXAgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHNldEp1bXBpbmcoKTtcclxuXHJcblx0XHRcdGlmIChjYW5jZWxhYmxlU3RhdGVUaW1lb3V0KSB7XHJcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KGNhbmNlbGFibGVTdGF0ZVRpbWVvdXQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhbmNlbGFibGVTdGF0ZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHNldE5vcm1hbCgpO1xyXG5cdFx0XHR9LCAxMDAwKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5oYXNIaXRPaWxTbGljayA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dGhhdC5zZXRTcGVlZCg3KTtcclxuXHRcdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBFeHBlcmltZW50aW5nIHdpdGggbG9zaW5nIGNvbnRyb2xcclxuXHRcdFx0LyogY29uc3QgZGlyZWN0aW9uID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNCk7XHJcblx0XHRcdHN3aXRjaCAoZGlyZWN0aW9uKSB7XHJcblx0XHRcdFx0Y2FzZSAwOiBzZXREaXNjcmV0ZURpcmVjdGlvbignc0Vhc3QnKTtcclxuXHRcdFx0XHRjYXNlIDE6IHNldERpc2NyZXRlRGlyZWN0aW9uKCdzV2VzdCcpO1xyXG5cdFx0XHRcdGNhc2UgMjogc2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NFYXN0Jyk7XHJcblx0XHRcdFx0Y2FzZSAzOiBzZXREaXNjcmV0ZURpcmVjdGlvbignc1dlc3QnKTtcclxuXHRcdFx0fSAqL1xyXG5cclxuXHRcdFx0aWYgKGNhbmNlbGFibGVTdGF0ZVRpbWVvdXQpIHtcclxuXHRcdFx0XHRjbGVhclRpbWVvdXQoY2FuY2VsYWJsZVN0YXRlVGltZW91dCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FuY2VsYWJsZVN0YXRlVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0c2V0Tm9ybWFsKCk7XHJcblx0XHRcdH0sIDIwMCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5oYXNIaXRDb2xsZWN0aWJsZSA9IGZ1bmN0aW9uIChpdGVtKSB7XHJcblx0XHRcdHRoYXQub25Db2xsZWN0SXRlbUNiKGl0ZW0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoYXQuaXNFYXRlbkJ5ID0gZnVuY3Rpb24gKG1vbnN0ZXIsIHdoZW5FYXRlbikge1xyXG5cdFx0XHR0aGF0Lm9uSGl0TW9uc3RlckNiKCk7XHJcblx0XHRcdHRoYXQuaGFzSGl0TW9uc3Rlcihtb25zdGVyKTtcclxuXHRcdFx0bW9uc3Rlci5zdGFydEVhdGluZyh3aGVuRWF0ZW4pO1xyXG5cdFx0XHRvYnN0YWNsZXNIaXQucHVzaChtb25zdGVyLmlkKTtcclxuXHRcdFx0dGhhdC5pc01vdmluZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LmlzQmVpbmdFYXRlbiA9IHRydWU7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQucmVzZXQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdG9ic3RhY2xlc0hpdCA9IFtdO1xyXG5cdFx0XHRwaXhlbHNUcmF2ZWxsZWQgPSAwO1xyXG5cdFx0XHR0aGF0LmlzTW92aW5nID0gdHJ1ZTtcclxuXHRcdFx0dGhhdC5pc0p1bXBpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5oYXNCZWVuSGl0ID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuYXZhaWxhYmxlQXdha2UgPSAxMDA7XHJcblx0XHRcdHRoYXQuaXNCZWluZ0VhdGVuID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuaXNCb29zdGVkID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuaXNCb29zdGluZyA9IGZhbHNlO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnNldEhpdE9ic3RhY2xlQ2IgPSBmdW5jdGlvbiAoZm4pIHtcclxuXHRcdFx0dGhhdC5vbkhpdE9ic3RhY2xlQ2IgPSBmbiB8fCBmdW5jdGlvbigpIHt9O1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnNldEhpdE1vbnN0ZXJDYiA9IGZ1bmN0aW9uIChmbikge1xyXG5cdFx0XHR0aGF0Lm9uSGl0TW9uc3RlckNiID0gZm4gfHwgZnVuY3Rpb24oKSB7fTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGF0LnNldENvbGxlY3RJdGVtQ2IgPSBmdW5jdGlvbiAoZm4pIHtcclxuXHRcdFx0dGhhdC5vbkNvbGxlY3RJdGVtQ2IgPSBmbiB8fCBmdW5jdGlvbigpIHt9O1xyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jdGlvbiBzdGFydENyYXNoaW5nKCkge1xyXG5cdFx0XHRjcmFzaGluZ0ZyYW1lICs9IDE7XHJcblx0XHRcdHRoYXQuaXNDcmFzaGluZyA9IHRydWU7XHJcblx0XHRcdHRoYXQuaXNCb29zdGluZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LnNldFNwZWVkKDEpO1xyXG5cdFx0XHRpZiAoY3Jhc2hpbmdGcmFtZSA8IDYpIHtcclxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHN0YXJ0Q3Jhc2hpbmcoKTtcclxuXHRcdFx0XHR9LCAxMDApO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNyYXNoaW5nRnJhbWUgPSAwO1xyXG5cdFx0XHRcdHRoYXQuaXNDcmFzaGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdHRoYXQuaXNNb3ZpbmcgPSBmYWxzZTsgLy8gc3RvcCBtb3Zpbmcgb24gbGFzdCBmcmFtZVxyXG5cdFx0XHRcdHRoYXQucmVzZXRTcGVlZCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5zdGFydENyYXNoaW5nID0gc3RhcnRDcmFzaGluZztcclxuXHJcblx0XHRyZXR1cm4gdGhhdDtcclxuXHR9XHJcblxyXG5cdGdsb2JhbC5wbGF5ZXIgPSBQbGF5ZXI7XHJcbn0pKHRoaXMpO1xyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSB0aGlzLnBsYXllcjtcclxufVxyXG4iLCIvLyBBdm9pZCBgY29uc29sZWAgZXJyb3JzIGluIGJyb3dzZXJzIHRoYXQgbGFjayBhIGNvbnNvbGUuXHJcbihmdW5jdGlvbigpIHtcclxuICAgIHZhciBtZXRob2Q7XHJcbiAgICB2YXIgbm9vcCA9IGZ1bmN0aW9uIG5vb3AoKSB7fTtcclxuICAgIHZhciBtZXRob2RzID0gW1xyXG4gICAgICAgICdhc3NlcnQnLCAnY2xlYXInLCAnY291bnQnLCAnZGVidWcnLCAnZGlyJywgJ2RpcnhtbCcsICdlcnJvcicsXHJcbiAgICAgICAgJ2V4Y2VwdGlvbicsICdncm91cCcsICdncm91cENvbGxhcHNlZCcsICdncm91cEVuZCcsICdpbmZvJywgJ2xvZycsXHJcbiAgICAgICAgJ21hcmtUaW1lbGluZScsICdwcm9maWxlJywgJ3Byb2ZpbGVFbmQnLCAndGFibGUnLCAndGltZScsICd0aW1lRW5kJyxcclxuICAgICAgICAndGltZVN0YW1wJywgJ3RyYWNlJywgJ3dhcm4nXHJcbiAgICBdO1xyXG4gICAgdmFyIGxlbmd0aCA9IG1ldGhvZHMubGVuZ3RoO1xyXG4gICAgdmFyIGNvbnNvbGUgPSAod2luZG93LmNvbnNvbGUgPSB3aW5kb3cuY29uc29sZSB8fCB7fSk7XHJcblxyXG4gICAgd2hpbGUgKGxlbmd0aC0tKSB7XHJcbiAgICAgICAgbWV0aG9kID0gbWV0aG9kc1tsZW5ndGhdO1xyXG5cclxuICAgICAgICAvLyBPbmx5IHN0dWIgdW5kZWZpbmVkIG1ldGhvZHMuXHJcbiAgICAgICAgaWYgKCFjb25zb2xlW21ldGhvZF0pIHtcclxuICAgICAgICAgICAgY29uc29sZVttZXRob2RdID0gbm9vcDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0oKSk7IiwiKGZ1bmN0aW9uIChnbG9iYWwpIHtcclxuXHR2YXIgR1VJRCA9IHJlcXVpcmUoJy4vZ3VpZCcpO1xyXG5cdGZ1bmN0aW9uIFNwcml0ZSAoZGF0YSkge1xyXG5cdFx0dmFyIGhpdHRhYmxlT2JqZWN0cyA9IHt9O1xyXG5cdFx0dmFyIHpJbmRleGVzT2NjdXBpZWQgPSBbIDAgXTtcclxuXHRcdHZhciB0aGF0ID0gdGhpcztcclxuXHRcdHZhciB0cmFja2VkU3ByaXRlVG9Nb3ZlVG93YXJkO1xyXG5cdFx0dmFyIHNob3dIaXRCb3hlcyA9IGZhbHNlO1xyXG5cclxuXHRcdHRoYXQuZGlyZWN0aW9uID0gdW5kZWZpbmVkO1xyXG5cdFx0dGhhdC5tYXBQb3NpdGlvbiA9IFswLCAwLCAwXTtcclxuXHRcdHRoYXQuaWQgPSBHVUlEKCk7XHJcblx0XHR0aGF0LmNhbnZhc1ggPSAwO1xyXG5cdFx0dGhhdC5jYW52YXNZID0gMDtcclxuXHRcdHRoYXQuY2FudmFzWiA9IDA7XHJcblx0XHR0aGF0LmhlaWdodCA9IDA7XHJcblx0XHR0aGF0LnNwZWVkID0gMDtcclxuXHRcdHRoYXQuZGF0YSA9IGRhdGEgfHwgeyBwYXJ0cyA6IHt9IH07XHJcblx0XHR0aGF0Lm1vdmluZ1Rvd2FyZCA9IFsgMCwgMCBdO1xyXG5cdFx0dGhhdC5tZXRyZXNEb3duVGhlUm9hZCA9IDA7XHJcblx0XHR0aGF0Lm1vdmluZ1dpdGhDb252aWN0aW9uID0gZmFsc2U7XHJcblx0XHR0aGF0LmRlbGV0ZWQgPSBmYWxzZTtcclxuXHRcdHRoYXQubWF4SGVpZ2h0ID0gKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIE9iamVjdC52YWx1ZXModGhhdC5kYXRhLnBhcnRzKS5tYXAoZnVuY3Rpb24gKHApIHsgcmV0dXJuIHBbM107IH0pLm1heCgpO1xyXG5cdFx0fSgpKTtcclxuXHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0dGhhdC5pc0RyYXduVW5kZXJQbGF5ZXIgPSBkYXRhLmlzRHJhd25VbmRlclBsYXllcjtcclxuXHRcdFxyXG5cdFx0aWYgKCF0aGF0LmRhdGEucGFydHMpIHtcclxuXHRcdFx0dGhhdC5kYXRhLnBhcnRzID0ge307XHJcblx0XHRcdHRoYXQuY3VycmVudEZyYW1lID0gdW5kZWZpbmVkO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhhdC5jdXJyZW50RnJhbWUgPSB0aGF0LmRhdGEucGFydHNbMF07XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGRhdGEgJiYgZGF0YS5pZCl7XHJcblx0XHRcdHRoYXQuaWQgPSBkYXRhLmlkO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChkYXRhICYmIGRhdGEuekluZGV4ZXNPY2N1cGllZCkge1xyXG5cdFx0XHR6SW5kZXhlc09jY3VwaWVkID0gZGF0YS56SW5kZXhlc09jY3VwaWVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGluY3JlbWVudFgoYW1vdW50KSB7XHJcblx0XHRcdHRoYXQuY2FudmFzWCArPSBhbW91bnQudG9OdW1iZXIoKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBpbmNyZW1lbnRZKGFtb3VudCkge1xyXG5cdFx0XHR0aGF0LmNhbnZhc1kgKz0gYW1vdW50LnRvTnVtYmVyKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0SGl0Qm94KGZvclpJbmRleCkge1xyXG5cdFx0XHRpZiAodGhhdC5kYXRhLmhpdEJveGVzKSB7XHJcblx0XHRcdFx0aWYgKGRhdGEuaGl0Qm94ZXNbZm9yWkluZGV4XSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGRhdGEuaGl0Qm94ZXNbZm9yWkluZGV4XTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiByb3VuZEhhbGYobnVtKSB7XHJcblx0XHRcdG51bSA9IE1hdGgucm91bmQobnVtKjIpLzI7XHJcblx0XHRcdHJldHVybiBudW07XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gbW92ZSgpIHtcclxuXHRcdFx0aWYgKCF0aGF0LmlzTW92aW5nKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRsZXQgY3VycmVudFggPSB0aGF0Lm1hcFBvc2l0aW9uWzBdO1xyXG5cdFx0XHRsZXQgY3VycmVudFkgPSB0aGF0Lm1hcFBvc2l0aW9uWzFdO1xyXG5cclxuXHRcdFx0aWYgKHR5cGVvZiB0aGF0LmRpcmVjdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0XHQvLyBGb3IgdGhpcyB3ZSBuZWVkIHRvIG1vZGlmeSB0aGUgdGhhdC5kaXJlY3Rpb24gc28gaXQgcmVsYXRlcyB0byB0aGUgaG9yaXpvbnRhbFxyXG5cdFx0XHRcdHZhciBkID0gdGhhdC5kaXJlY3Rpb24gLSA5MDtcclxuXHRcdFx0XHRpZiAoZCA8IDApIGQgPSAzNjAgKyBkO1xyXG5cdFx0XHRcdGN1cnJlbnRYICs9IHJvdW5kSGFsZih0aGF0LnNwZWVkICogTWF0aC5jb3MoZCAqIChNYXRoLlBJIC8gMTgwKSkpO1xyXG5cdFx0XHRcdGN1cnJlbnRZICs9IHJvdW5kSGFsZih0aGF0LnNwZWVkICogTWF0aC5zaW4oZCAqIChNYXRoLlBJIC8gMTgwKSkpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgdGhhdC5tb3ZpbmdUb3dhcmRbMF0gIT09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0XHRpZiAoY3VycmVudFggPiB0aGF0Lm1vdmluZ1Rvd2FyZFswXSkge1xyXG5cdFx0XHRcdFx0XHRjdXJyZW50WCAtPSBNYXRoLm1pbih0aGF0LmdldFNwZWVkWCgpLCBNYXRoLmFicyhjdXJyZW50WCAtIHRoYXQubW92aW5nVG93YXJkWzBdKSk7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGN1cnJlbnRYIDwgdGhhdC5tb3ZpbmdUb3dhcmRbMF0pIHtcclxuXHRcdFx0XHRcdFx0Y3VycmVudFggKz0gTWF0aC5taW4odGhhdC5nZXRTcGVlZFgoKSwgTWF0aC5hYnMoY3VycmVudFggLSB0aGF0Lm1vdmluZ1Rvd2FyZFswXSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAodHlwZW9mIHRoYXQubW92aW5nVG93YXJkWzFdICE9PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdFx0aWYgKGN1cnJlbnRZID4gdGhhdC5tb3ZpbmdUb3dhcmRbMV0pIHtcclxuXHRcdFx0XHRcdFx0Y3VycmVudFkgLT0gTWF0aC5taW4odGhhdC5nZXRTcGVlZFkoKSwgTWF0aC5hYnMoY3VycmVudFkgLSB0aGF0Lm1vdmluZ1Rvd2FyZFsxXSkpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChjdXJyZW50WSA8IHRoYXQubW92aW5nVG93YXJkWzFdKSB7XHJcblx0XHRcdFx0XHRcdGN1cnJlbnRZICs9IE1hdGgubWluKHRoYXQuZ2V0U3BlZWRZKCksIE1hdGguYWJzKGN1cnJlbnRZIC0gdGhhdC5tb3ZpbmdUb3dhcmRbMV0pKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoYXQuc2V0TWFwUG9zaXRpb24oY3VycmVudFgsIGN1cnJlbnRZKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnNldEhpdEJveGVzVmlzaWJsZSA9IGZ1bmN0aW9uKHNob3cpIHtcclxuXHRcdFx0c2hvd0hpdEJveGVzID0gc2hvdztcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmRyYXcgPSBmdW5jdGlvbiAoZEN0eCwgc3ByaXRlRnJhbWUpIHtcclxuXHRcdFx0dGhhdC5jdXJyZW50RnJhbWUgPSB0aGF0LmRhdGEucGFydHNbc3ByaXRlRnJhbWVdO1xyXG5cdFx0XHRsZXQgZnIgPSB0aGF0LmN1cnJlbnRGcmFtZTsvLyB0aGF0LmRhdGEucGFydHNbc3ByaXRlRnJhbWVdO1xyXG5cdFx0XHR0aGF0LmhlaWdodCA9IGZyWzNdO1xyXG5cdFx0XHR0aGF0LndpZHRoID0gZnJbMl07XHJcblxyXG5cdFx0XHRjb25zdCBuZXdDYW52YXNQb3NpdGlvbiA9IGRDdHgubWFwUG9zaXRpb25Ub0NhbnZhc1Bvc2l0aW9uKHRoYXQubWFwUG9zaXRpb24pO1xyXG5cdFx0XHR0aGF0LnNldENhbnZhc1Bvc2l0aW9uKG5ld0NhbnZhc1Bvc2l0aW9uWzBdLCBuZXdDYW52YXNQb3NpdGlvblsxXSk7XHJcblxyXG5cdFx0XHQvLyBTcHJpdGUgb2Zmc2V0IGZvciBrZWVwaW5nIHNwcml0ZSBmcmFtZSBjZW50ZXJlZCAoZm9yIHNwcml0ZSBmcmFtZXMgb2YgdmFyaW91cyBzaXplcylcclxuXHRcdFx0Y29uc3Qgb2Zmc2V0WCA9IGZyLmxlbmd0aCA+IDQgPyBmcls0XSA6IDA7XHJcblx0XHRcdGNvbnN0IG9mZnNldFkgPSBmci5sZW5ndGggPiA1ID8gZnJbNV0gOiAwO1xyXG5cclxuXHRcdFx0ZEN0eC5kcmF3SW1hZ2UoZEN0eC5nZXRMb2FkZWRJbWFnZSh0aGF0LmRhdGEuJGltYWdlRmlsZSksIGZyWzBdLCBmclsxXSwgZnJbMl0sIGZyWzNdLCB0aGF0LmNhbnZhc1ggKyBvZmZzZXRYLCB0aGF0LmNhbnZhc1kgKyBvZmZzZXRZLCBmclsyXSwgZnJbM10pO1xyXG5cdFx0XHJcblx0XHRcdGRyYXdIaXRib3goZEN0eCwgZnIpO1xyXG5cdFx0fTtcclxuXHJcblxyXG5cdFx0ZnVuY3Rpb24gZHJhd0hpdGJveChkQ3R4LCBzcHJpdGVQYXJ0KSB7XHJcblx0XHRcdGlmICghc2hvd0hpdEJveGVzKVxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFxyXG5cdFx0XHRjb25zdCBoaXRib3hPZmZzZXRYID0gc3ByaXRlUGFydC5sZW5ndGggPiA2ID8gc3ByaXRlUGFydFs2XSA6IDA7XHJcblx0XHRcdGNvbnN0IGhpdGJveE9mZnNldFkgPSBzcHJpdGVQYXJ0Lmxlbmd0aCA+IDcgPyBzcHJpdGVQYXJ0WzddIDogMDtcclxuXHJcblx0XHRcdC8vIERyYXcgaGl0Ym94ZXNcclxuXHRcdFx0Zm9yIChjb25zdCBib3ggaW4gdGhhdC5kYXRhLmhpdEJveGVzKSB7XHJcblx0XHRcdFx0aWYgKE9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoYXQuZGF0YS5oaXRCb3hlcywgYm94KSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgaGl0Qm94ID0gdGhhdC5kYXRhLmhpdEJveGVzW2JveF07XHJcblx0XHRcdFx0XHRjb25zdCBsZWZ0ID0gaGl0Qm94WzBdICsgaGl0Ym94T2Zmc2V0WDtcclxuXHRcdFx0XHRcdGNvbnN0IHRvcCA9IGhpdEJveFsxXSArIGhpdGJveE9mZnNldFk7XHJcblx0XHRcdFx0XHRjb25zdCByaWdodCA9IGhpdEJveFsyXSArIGhpdGJveE9mZnNldFg7XHJcblx0XHRcdFx0XHRjb25zdCBib3R0b20gPSBoaXRCb3hbM10gKyBoaXRib3hPZmZzZXRZO1xyXG5cdFx0XHRcdFx0ZEN0eC5zdHJva2VTdHlsZSA9ICd5ZWxsb3cnO1xyXG5cdFx0XHRcdFx0ZEN0eC5zdHJva2VSZWN0KHRoYXQuY2FudmFzWCArIGxlZnQsIHRoYXQuY2FudmFzWSArIHRvcCwgcmlnaHQgLSBsZWZ0LCBib3R0b20gLSB0b3ApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuc2V0TWFwUG9zaXRpb24gPSBmdW5jdGlvbiAoeCwgeSwgeikge1xyXG5cdFx0XHRpZiAodHlwZW9mIHggPT09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0eCA9IHRoYXQubWFwUG9zaXRpb25bMF07XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHR5cGVvZiB5ID09PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdHkgPSB0aGF0Lm1hcFBvc2l0aW9uWzFdO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlb2YgeiA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0XHR6ID0gdGhhdC5tYXBQb3NpdGlvblsyXTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGF0LnpJbmRleGVzT2NjdXBpZWQgPSBbIHogXTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGF0Lm1hcFBvc2l0aW9uID0gW3gsIHksIHpdO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnNldENhbnZhc1Bvc2l0aW9uID0gZnVuY3Rpb24gKGN4LCBjeSkge1xyXG5cdFx0XHRpZiAoY3gpIHtcclxuXHRcdFx0XHRpZiAoT2JqZWN0LmlzU3RyaW5nKGN4KSAmJiAoY3guZmlyc3QoKSA9PT0gJysnIHx8IGN4LmZpcnN0KCkgPT09ICctJykpIGluY3JlbWVudFgoY3gpO1xyXG5cdFx0XHRcdGVsc2UgdGhhdC5jYW52YXNYID0gY3g7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdGlmIChjeSkge1xyXG5cdFx0XHRcdGlmIChPYmplY3QuaXNTdHJpbmcoY3kpICYmIChjeS5maXJzdCgpID09PSAnKycgfHwgY3kuZmlyc3QoKSA9PT0gJy0nKSkgaW5jcmVtZW50WShjeSk7XHJcblx0XHRcdFx0ZWxzZSB0aGF0LmNhbnZhc1kgPSBjeTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmdldENhbnZhc1Bvc2l0aW9uWCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIHRoYXQuY2FudmFzWDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nZXRDYW52YXNQb3NpdGlvblkgPSBmdW5jdGlvbiAgKCkge1xyXG5cdFx0XHRyZXR1cm4gdGhhdC5jYW52YXNZO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmdldExlZnRIaXRCb3hFZGdlID0gZnVuY3Rpb24gKHpJbmRleCkge1xyXG5cdFx0XHR6SW5kZXggPSB6SW5kZXggfHwgMDtcclxuXHRcdFx0bGV0IGxoYmUgPSB0aGlzLmdldENhbnZhc1Bvc2l0aW9uWCgpO1xyXG5cdFx0XHRjb25zdCBoaXRib3ggPSBnZXRIaXRCb3goekluZGV4KTtcclxuXHRcdFx0aWYgKGhpdGJveCkge1xyXG5cdFx0XHRcdGxoYmUgKz0gaGl0Ym94WzBdO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBsaGJlO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmdldFRvcEhpdEJveEVkZ2UgPSBmdW5jdGlvbiAoekluZGV4KSB7XHJcblx0XHRcdHpJbmRleCA9IHpJbmRleCB8fCAwO1xyXG5cdFx0XHRsZXQgdGhiZSA9IHRoaXMuZ2V0Q2FudmFzUG9zaXRpb25ZKCk7XHJcblx0XHRcdGNvbnN0IGhpdGJveCA9IGdldEhpdEJveCh6SW5kZXgpO1xyXG5cdFx0XHRpZiAoaGl0Ym94KSB7XHJcblx0XHRcdFx0dGhiZSArPSBoaXRib3hbMV07XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHRoYmU7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZ2V0UmlnaHRIaXRCb3hFZGdlID0gZnVuY3Rpb24gKHpJbmRleCkge1xyXG5cdFx0XHR6SW5kZXggPSB6SW5kZXggfHwgMDtcclxuXHJcblx0XHRcdGNvbnN0IGhpdGJveCA9IGdldEhpdEJveCh6SW5kZXgpO1xyXG5cdFx0XHRpZiAoaGl0Ym94KSB7XHJcblx0XHRcdFx0cmV0dXJuIHRoYXQuY2FudmFzWCArIGhpdGJveFsyXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHRoYXQuY2FudmFzWCArIHRoYXQud2lkdGg7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZ2V0Qm90dG9tSGl0Qm94RWRnZSA9IGZ1bmN0aW9uICh6SW5kZXgpIHtcclxuXHRcdFx0ekluZGV4ID0gekluZGV4IHx8IDA7XHJcblxyXG5cdFx0XHRjb25zdCBoaXRib3ggPSBnZXRIaXRCb3goekluZGV4KTtcclxuXHRcdFx0aWYgKGhpdGJveCkge1xyXG5cdFx0XHRcdHJldHVybiB0aGF0LmNhbnZhc1kgKyBoaXRib3hbM107XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB0aGF0LmNhbnZhc1kgKyB0aGF0LmhlaWdodDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nZXRQb3NpdGlvbkluRnJvbnRPZiA9IGZ1bmN0aW9uICAoKSB7XHJcblx0XHRcdHJldHVybiBbdGhhdC5jYW52YXNYLCB0aGF0LmNhbnZhc1kgKyB0aGF0LmhlaWdodF07XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0U3BlZWQgPSBmdW5jdGlvbiAocykge1xyXG5cdFx0XHR0aGF0Lmxhc3RTcGVlZCA9IHRoYXQuc3BlZWQ7XHJcblx0XHRcdHRoYXQuc3BlZWQgPSBzO1xyXG5cdFx0XHR0aGF0LnNwZWVkWCA9IHM7XHJcblx0XHRcdHRoYXQuc3BlZWRZID0gcztcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5pbmNyZW1lbnRTcGVlZEJ5ID0gZnVuY3Rpb24gKHMpIHtcclxuXHRcdFx0dGhhdC5zcGVlZCArPSBzO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmdldFNwZWVkID0gZnVuY3Rpb24gZ2V0U3BlZWQgKCkge1xyXG5cdFx0XHRyZXR1cm4gdGhhdC5zcGVlZDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5nZXRTcGVlZFggPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiB0aGF0LnNwZWVkO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmdldFNwZWVkWSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIHRoYXQuc3BlZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0SGVpZ2h0ID0gZnVuY3Rpb24gKGgpIHtcclxuXHRcdFx0dGhhdC5oZWlnaHQgPSBoO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnNldFdpZHRoID0gZnVuY3Rpb24gKHcpIHtcclxuXHRcdFx0dGhhdC53aWR0aCA9IHc7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZ2V0TWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gdGhhdC5tYXhIZWlnaHQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuZ2V0TW92aW5nVG93YXJkT3Bwb3NpdGUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmICghdGhhdC5pc01vdmluZykge1xyXG5cdFx0XHRcdHJldHVybiBbMCwgMF07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciBkeCA9ICh0aGF0Lm1vdmluZ1Rvd2FyZFswXSAtIHRoYXQubWFwUG9zaXRpb25bMF0pO1xyXG5cdFx0XHR2YXIgZHkgPSAodGhhdC5tb3ZpbmdUb3dhcmRbMV0gLSB0aGF0Lm1hcFBvc2l0aW9uWzFdKTtcclxuXHJcblx0XHRcdHZhciBvcHBvc2l0ZVggPSAoTWF0aC5hYnMoZHgpID4gNzUgPyAwIC0gZHggOiAwKTtcclxuXHRcdFx0dmFyIG9wcG9zaXRlWSA9IC1keTtcclxuXHJcblx0XHRcdHJldHVybiBbIG9wcG9zaXRlWCwgb3Bwb3NpdGVZIF07XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuY2hlY2tIaXR0YWJsZU9iamVjdHMgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdE9iamVjdC5rZXlzKGhpdHRhYmxlT2JqZWN0cywgZnVuY3Rpb24gKGssIG9iamVjdERhdGEpIHtcclxuXHRcdFx0XHRpZiAob2JqZWN0RGF0YS5vYmplY3QuZGVsZXRlZCkge1xyXG5cdFx0XHRcdFx0ZGVsZXRlIGhpdHRhYmxlT2JqZWN0c1trXTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0aWYgKG9iamVjdERhdGEub2JqZWN0LmhpdHModGhhdCkpIHtcclxuXHRcdFx0XHRcdFx0b2JqZWN0RGF0YS5jYWxsYmFja3MuZWFjaChmdW5jdGlvbiAoY2FsbGJhY2spIHtcclxuXHRcdFx0XHRcdFx0XHRjYWxsYmFjayh0aGF0LCBvYmplY3REYXRhLm9iamVjdCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuY3ljbGUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRoYXQuY2hlY2tIaXR0YWJsZU9iamVjdHMoKTtcclxuXHJcblx0XHRcdGlmICh0cmFja2VkU3ByaXRlVG9Nb3ZlVG93YXJkKSB7XHJcblx0XHRcdFx0dGhhdC5zZXRNYXBQb3NpdGlvblRhcmdldCh0cmFja2VkU3ByaXRlVG9Nb3ZlVG93YXJkLm1hcFBvc2l0aW9uWzBdLCB0cmFja2VkU3ByaXRlVG9Nb3ZlVG93YXJkLm1hcFBvc2l0aW9uWzFdLCB0cnVlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bW92ZSgpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnNldE1hcFBvc2l0aW9uVGFyZ2V0ID0gZnVuY3Rpb24gKHgsIHksIG92ZXJyaWRlKSB7XHJcblx0XHRcdGlmIChvdmVycmlkZSkge1xyXG5cdFx0XHRcdHRoYXQubW92aW5nV2l0aENvbnZpY3Rpb24gPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKCF0aGF0Lm1vdmluZ1dpdGhDb252aWN0aW9uKSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiB4ID09PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdFx0eCA9IHRoYXQubW92aW5nVG93YXJkWzBdO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKHR5cGVvZiB5ID09PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdFx0eSA9IHRoYXQubW92aW5nVG93YXJkWzFdO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dGhhdC5tb3ZpbmdUb3dhcmQgPSBbIHgsIHkgXTtcclxuXHJcblx0XHRcdFx0dGhhdC5tb3ZpbmdXaXRoQ29udmljdGlvbiA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyB0aGF0LnJlc2V0RGlyZWN0aW9uKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0RGlyZWN0aW9uID0gZnVuY3Rpb24gKGFuZ2xlKSB7XHJcblx0XHRcdGlmIChhbmdsZSA+PSAzNjApIHtcclxuXHRcdFx0XHRhbmdsZSA9IDM2MCAtIGFuZ2xlO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoYXQuZGlyZWN0aW9uID0gYW5nbGU7XHJcblx0XHRcdHRoYXQubW92aW5nVG93YXJkID0gdW5kZWZpbmVkO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnJlc2V0RGlyZWN0aW9uID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR0aGF0LmRpcmVjdGlvbiA9IHVuZGVmaW5lZDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXRNYXBQb3NpdGlvblRhcmdldFdpdGhDb252aWN0aW9uID0gZnVuY3Rpb24gKGN4LCBjeSkge1xyXG5cdFx0XHR0aGF0LnNldE1hcFBvc2l0aW9uVGFyZ2V0KGN4LCBjeSk7XHJcblx0XHRcdHRoYXQubW92aW5nV2l0aENvbnZpY3Rpb24gPSB0cnVlO1xyXG5cdFx0XHQvLyB0aGF0LnJlc2V0RGlyZWN0aW9uKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZm9sbG93ID0gZnVuY3Rpb24gKHNwcml0ZSkge1xyXG5cdFx0XHR0cmFja2VkU3ByaXRlVG9Nb3ZlVG93YXJkID0gc3ByaXRlO1xyXG5cdFx0XHQvLyB0aGF0LnJlc2V0RGlyZWN0aW9uKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc3RvcEZvbGxvd2luZyA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dHJhY2tlZFNwcml0ZVRvTW92ZVRvd2FyZCA9IGZhbHNlO1xyXG5cclxuXHRcdFx0Ly8gUmVtb3ZlIGl0ZW1zIHRoYXQgYXJlIG5vIGxvbmdlciBmb2xsb3dpbmcgcGxheWVyXHJcblx0XHRcdHNldFRpbWVvdXQodGhhdC5kZWxldGVPbk5leHRDeWNsZSwgNTAwMCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMub25IaXR0aW5nID0gZnVuY3Rpb24gKG9iamVjdFRvSGl0LCBjYWxsYmFjaykge1xyXG5cdFx0XHRpZiAoaGl0dGFibGVPYmplY3RzW29iamVjdFRvSGl0LmlkXSkge1xyXG5cdFx0XHRcdHJldHVybiBoaXR0YWJsZU9iamVjdHNbb2JqZWN0VG9IaXQuaWRdLmNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aGl0dGFibGVPYmplY3RzW29iamVjdFRvSGl0LmlkXSA9IHtcclxuXHRcdFx0XHRvYmplY3Q6IG9iamVjdFRvSGl0LFxyXG5cdFx0XHRcdGNhbGxiYWNrczogWyBjYWxsYmFjayBdXHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZGVsZXRlT25OZXh0Q3ljbGUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRoYXQuZGVsZXRlZCA9IHRydWU7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMub2NjdXBpZXNaSW5kZXggPSBmdW5jdGlvbiAoeikge1xyXG5cdFx0XHRyZXR1cm4gekluZGV4ZXNPY2N1cGllZC5pbmRleE9mKHopID49IDA7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuaGl0cyA9IGZ1bmN0aW9uIChvdGhlcikge1xyXG5cdFx0XHRjb25zdCByZWN0MXggPSBvdGhlci5nZXRMZWZ0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKTtcclxuXHRcdFx0Y29uc3QgcmVjdDF3ID0gb3RoZXIuZ2V0UmlnaHRIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pIC0gcmVjdDF4O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVjdDF5ID0gb3RoZXIuZ2V0VG9wSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKTtcclxuXHRcdFx0Y29uc3QgcmVjdDFoID0gb3RoZXIuZ2V0Qm90dG9tSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSAtIHJlY3QxeTtcclxuXHJcblx0XHRcdC8vIEdldCBoaXRib3ggb2Zmc2V0IHdoZW4gc3BlY2lmaWVkXHJcblx0XHRcdGNvbnN0IGlzYXJyYXkgPSBBcnJheS5pc0FycmF5KHRoYXQuY3VycmVudEZyYW1lKTtcclxuXHRcdFx0Y29uc3QgaGl0Ym94T2Zmc2V0WCA9ICBpc2FycmF5ICYmIHRoYXQuY3VycmVudEZyYW1lLmxlbmd0aCA+IDYgPyB0aGF0LmN1cnJlbnRGcmFtZVs2XSA6IDA7XHJcblx0XHRcdGNvbnN0IGhpdGJveE9mZnNldFkgPSBpc2FycmF5ICYmIHRoYXQuY3VycmVudEZyYW1lLmxlbmd0aCA+IDcgPyB0aGF0LmN1cnJlbnRGcmFtZVs3XSA6IDA7XHJcblxyXG5cdFx0XHRjb25zdCByZWN0MnggPSB0aGF0LmdldExlZnRIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pICsgaGl0Ym94T2Zmc2V0WDtcclxuXHRcdFx0Y29uc3QgcmVjdDJ3ID0gdGhhdC5nZXRSaWdodEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgLSByZWN0MnggKyBoaXRib3hPZmZzZXRYO1xyXG5cdFx0XHRjb25zdCByZWN0MnkgPSB0aGF0LmdldFRvcEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgKyBoaXRib3hPZmZzZXRZO1xyXG5cdFx0XHRjb25zdCByZWN0MmggPSB0aGF0LmdldEJvdHRvbUhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgLSByZWN0MnkgKyBoaXRib3hPZmZzZXRZO1xyXG5cclxuXHRcdFx0aWYgKHJlY3QxeCA8IHJlY3QyeCArIHJlY3QydyAmJlxyXG5cdFx0XHRcdHJlY3QxeCArIHJlY3QxdyA+IHJlY3QyeCAmJlxyXG5cdFx0XHRcdHJlY3QxeSA8IHJlY3QyeSArIHJlY3QyaCAmJlxyXG5cdFx0XHRcdHJlY3QxaCArIHJlY3QxeSA+IHJlY3QyeSkge1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblxyXG5cdFx0XHQvLyBPcmlnaW5hbCBjb2xsaXNpb24gZGV0ZWN0aW9uOlxyXG5cdFx0XHQvKiB2YXIgdmVydGljYWxJbnRlcnNlY3QgPSBmYWxzZTtcclxuXHRcdFx0dmFyIGhvcml6b250YWxJbnRlcnNlY3QgPSBmYWxzZTtcclxuXHJcblx0XHRcdC8vIFRlc3QgdGhhdCBUSElTIGhhcyBhIGJvdHRvbSBlZGdlIGluc2lkZSBvZiB0aGUgb3RoZXIgb2JqZWN0XHJcblx0XHRcdGlmIChvdGhlci5nZXRUb3BIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pIDw9IHRoYXQuZ2V0Qm90dG9tSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSAmJiBvdGhlci5nZXRCb3R0b21IaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pID49IHRoYXQuZ2V0Qm90dG9tSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSkge1xyXG5cdFx0XHRcdHZlcnRpY2FsSW50ZXJzZWN0ID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVGVzdCB0aGF0IFRISVMgaGFzIGEgdG9wIGVkZ2UgaW5zaWRlIG9mIHRoZSBvdGhlciBvYmplY3RcclxuXHRcdFx0aWYgKG90aGVyLmdldFRvcEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgPD0gdGhhdC5nZXRUb3BIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pICYmIG90aGVyLmdldEJvdHRvbUhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgPj0gdGhhdC5nZXRUb3BIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pKSB7XHJcblx0XHRcdFx0dmVydGljYWxJbnRlcnNlY3QgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBUZXN0IHRoYXQgVEhJUyBoYXMgYSByaWdodCBlZGdlIGluc2lkZSBvZiB0aGUgb3RoZXIgb2JqZWN0XHJcblx0XHRcdGlmIChvdGhlci5nZXRMZWZ0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSA8PSB0aGF0LmdldFJpZ2h0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSAmJiBvdGhlci5nZXRSaWdodEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgPj0gdGhhdC5nZXRSaWdodEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkpIHtcclxuXHRcdFx0XHRob3Jpem9udGFsSW50ZXJzZWN0ID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVGVzdCB0aGF0IFRISVMgaGFzIGEgbGVmdCBlZGdlIGluc2lkZSBvZiB0aGUgb3RoZXIgb2JqZWN0XHJcblx0XHRcdGlmIChvdGhlci5nZXRMZWZ0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSA8PSB0aGF0LmdldExlZnRIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pICYmIG90aGVyLmdldFJpZ2h0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSA+PSB0aGF0LmdldExlZnRIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pKSB7XHJcblx0XHRcdFx0aG9yaXpvbnRhbEludGVyc2VjdCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB2ZXJ0aWNhbEludGVyc2VjdCAmJiBob3Jpem9udGFsSW50ZXJzZWN0OyAqL1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmlzQWJvdmVPbkNhbnZhcyA9IGZ1bmN0aW9uIChjeSkge1xyXG5cdFx0XHRyZXR1cm4gKHRoYXQuY2FudmFzWSArIHRoYXQuaGVpZ2h0KSA8IGN5O1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmlzQmVsb3dPbkNhbnZhcyA9IGZ1bmN0aW9uIChjeSkge1xyXG5cdFx0XHRyZXR1cm4gKHRoYXQuY2FudmFzWSkgPiBjeTtcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIHRoYXQ7XHJcblx0fVxyXG5cclxuXHRTcHJpdGUuY3JlYXRlT2JqZWN0cyA9IGZ1bmN0aW9uIGNyZWF0ZU9iamVjdHMoc3ByaXRlSW5mb0FycmF5LCBvcHRzKSB7XHJcblx0XHRpZiAoIUFycmF5LmlzQXJyYXkoc3ByaXRlSW5mb0FycmF5KSkgc3ByaXRlSW5mb0FycmF5ID0gWyBzcHJpdGVJbmZvQXJyYXkgXTtcclxuXHRcdG9wdHMgPSBPYmplY3QubWVyZ2Uob3B0cywge1xyXG5cdFx0XHRyYXRlTW9kaWZpZXI6IDAsXHJcblx0XHRcdGRyb3BSYXRlOiAxLFxyXG5cdFx0XHRwb3NpdGlvbjogWzAsIDBdXHJcblx0XHR9LCBmYWxzZSwgZmFsc2UpO1xyXG5cclxuXHRcdHZhciBBbmltYXRlZFNwcml0ZSA9IHJlcXVpcmUoJy4vYW5pbWF0ZWRTcHJpdGUnKTtcclxuXHJcblx0XHRmdW5jdGlvbiBjcmVhdGVPbmUgKHNwcml0ZUluZm8pIHtcclxuXHRcdFx0dmFyIHBvc2l0aW9uID0gb3B0cy5wb3NpdGlvbjtcclxuXHRcdFx0aWYgKE51bWJlci5yYW5kb20oMTAwICsgb3B0cy5yYXRlTW9kaWZpZXIpIDw9IHNwcml0ZUluZm8uZHJvcFJhdGUpIHtcclxuXHRcdFx0XHR2YXIgc3ByaXRlO1xyXG5cdFx0XHRcdGlmIChzcHJpdGVJbmZvLnNwcml0ZS5hbmltYXRlZCkge1xyXG5cdFx0XHRcdFx0c3ByaXRlID0gbmV3IEFuaW1hdGVkU3ByaXRlKHNwcml0ZUluZm8uc3ByaXRlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0c3ByaXRlID0gbmV3IFNwcml0ZShzcHJpdGVJbmZvLnNwcml0ZSk7XHJcblx0XHRcdFx0fVx0XHJcblxyXG5cdFx0XHRcdHNwcml0ZS5zZXRTcGVlZCgwKTtcclxuXHJcblx0XHRcdFx0aWYgKE9iamVjdC5pc0Z1bmN0aW9uKHBvc2l0aW9uKSkge1xyXG5cdFx0XHRcdFx0cG9zaXRpb24gPSBwb3NpdGlvbigpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0c3ByaXRlLnNldE1hcFBvc2l0aW9uKHBvc2l0aW9uWzBdLCBwb3NpdGlvblsxXSk7XHJcblxyXG5cdFx0XHRcdGlmIChzcHJpdGVJbmZvLnNwcml0ZS5oaXRCZWhhdmlvdXIgJiYgc3ByaXRlSW5mby5zcHJpdGUuaGl0QmVoYXZpb3VyLnBsYXllciAmJiBvcHRzLnBsYXllcikge1xyXG5cdFx0XHRcdFx0c3ByaXRlLm9uSGl0dGluZyhvcHRzLnBsYXllciwgc3ByaXRlSW5mby5zcHJpdGUuaGl0QmVoYXZpb3VyLnBsYXllcik7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gc3ByaXRlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIG9iamVjdHMgPSBzcHJpdGVJbmZvQXJyYXkubWFwKGNyZWF0ZU9uZSkucmVtb3ZlKHVuZGVmaW5lZCk7XHJcblxyXG5cdFx0cmV0dXJuIG9iamVjdHM7XHJcblx0fTtcclxuXHJcblx0Z2xvYmFsLnNwcml0ZSA9IFNwcml0ZTtcclxufSkoIHRoaXMgKTtcclxuXHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IHRoaXMuc3ByaXRlO1xyXG59IiwiKGZ1bmN0aW9uIChnbG9iYWwpIHtcclxuXHRmdW5jdGlvbiBTcHJpdGVBcnJheSgpIHtcclxuXHRcdHRoaXMucHVzaEhhbmRsZXJzID0gW107XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fVxyXG5cclxuXHRTcHJpdGVBcnJheS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEFycmF5LnByb3RvdHlwZSk7XHJcblxyXG5cdFNwcml0ZUFycmF5LnByb3RvdHlwZS5vblB1c2ggPSBmdW5jdGlvbihmLCByZXRyb2FjdGl2ZSkge1xyXG5cdFx0dGhpcy5wdXNoSGFuZGxlcnMucHVzaChmKTtcclxuXHJcblx0XHRpZiAocmV0cm9hY3RpdmUpIHtcclxuXHRcdFx0dGhpcy5lYWNoKGYpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdFNwcml0ZUFycmF5LnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24ob2JqKSB7XHJcblx0XHRBcnJheS5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsIG9iaik7XHJcblx0XHR0aGlzLnB1c2hIYW5kbGVycy5lYWNoKGZ1bmN0aW9uKGhhbmRsZXIpIHtcclxuXHRcdFx0aGFuZGxlcihvYmopO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0U3ByaXRlQXJyYXkucHJvdG90eXBlLmN1bGwgPSBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMuZWFjaChmdW5jdGlvbiAob2JqLCBpKSB7XHJcblx0XHRcdGlmIChvYmouZGVsZXRlZCkge1xyXG5cdFx0XHRcdHJldHVybiAoZGVsZXRlIHRoaXNbaV0pO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHRnbG9iYWwuc3ByaXRlQXJyYXkgPSBTcHJpdGVBcnJheTtcclxufSkodGhpcyk7XHJcblxyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSB0aGlzLnNwcml0ZUFycmF5O1xyXG59IiwiLy8gR2xvYmFsIGRlcGVuZGVuY2llcyB3aGljaCByZXR1cm4gbm8gbW9kdWxlc1xyXG5yZXF1aXJlKCcuL2xpYi9jYW52YXNSZW5kZXJpbmdDb250ZXh0MkRFeHRlbnNpb25zJyk7XHJcbnJlcXVpcmUoJy4vbGliL2V4dGVuZGVycycpO1xyXG5yZXF1aXJlKCcuL2xpYi9wbHVnaW5zJyk7XHJcblxyXG4vLyBFeHRlcm5hbCBkZXBlbmRlbmNpZXNcclxudmFyIE1vdXNldHJhcCA9IHJlcXVpcmUoJ2JyLW1vdXNldHJhcCcpO1xyXG5cclxuLy8gTWV0aG9kIG1vZHVsZXNcclxudmFyIGlzTW9iaWxlRGV2aWNlID0gcmVxdWlyZSgnLi9saWIvaXNNb2JpbGVEZXZpY2UnKTtcclxuXHJcbi8vIEdhbWUgT2JqZWN0c1xyXG52YXIgU3ByaXRlQXJyYXkgPSByZXF1aXJlKCcuL2xpYi9zcHJpdGVBcnJheScpO1xyXG52YXIgTW9uc3RlciA9IHJlcXVpcmUoJy4vbGliL21vbnN0ZXInKTtcclxudmFyIEFuaW1hdGVkU3ByaXRlID0gcmVxdWlyZSgnLi9saWIvYW5pbWF0ZWRTcHJpdGUnKTtcclxudmFyIFNwcml0ZSA9IHJlcXVpcmUoJy4vbGliL3Nwcml0ZScpO1xyXG52YXIgUGxheWVyID0gcmVxdWlyZSgnLi9saWIvcGxheWVyJyk7XHJcbnZhciBHYW1lSHVkID0gcmVxdWlyZSgnLi9saWIvZ2FtZUh1ZCcpO1xyXG52YXIgR2FtZSA9IHJlcXVpcmUoJy4vbGliL2dhbWUnKTtcclxuXHJcbi8vIExvY2FsIHZhcmlhYmxlcyBmb3Igc3RhcnRpbmcgdGhlIGdhbWVcclxudmFyIG1haW5DYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZS1jYW52YXMnKTtcclxudmFyIGRDb250ZXh0ID0gbWFpbkNhbnZhcy5nZXRDb250ZXh0KCcyZCcsIHsgYWxwaGE6IGZhbHNlIH0pO1xyXG5cclxudmFyIGltYWdlU291cmNlcyA9IFsgJ2Fzc2V0cy9jYXJ0LXNwcml0ZXMucG5nJywgJ2Fzc2V0cy9zdGFydHNpZ24tc3ByaXRlLnBuZycsICdhc3NldHMvb2lsc2xpY2stc3ByaXRlLnBuZycsIFxyXG5cdCdhc3NldHMvdG9rZW4tc3ByaXRlcy5wbmcnLCAnYXNzZXRzL21pbGtzaGFrZS1zcHJpdGUucG5nJywgJ2Fzc2V0cy9tYWxvcmQtc3ByaXRlcy5wbmcnLFxyXG5cdCdhc3NldHMvaGF0Z3V5LXNwcml0ZXMucG5nJywgJ2Fzc2V0cy9waWxvdC1zcHJpdGVzLnBuZycsICdhc3NldHMvcm9tYW5zb2xkaWVyLXNwcml0ZXMucG5nJywgJ2Fzc2V0cy9za2VsZXRvbi1zcHJpdGVzLnBuZycsXHJcblx0J2Fzc2V0cy90cmFmZmljLWNvbmUtbGFyZ2UucG5nJywgJ2Fzc2V0cy90cmFmZmljLWNvbmUtc21hbGwucG5nJywgJ2Fzc2V0cy9nYXJiYWdlLWNhbi5wbmcnLCAnYXNzZXRzL3JhbXAtc3ByaXRlLnBuZycgXTtcclxuXHJcbnZhciBwbGF5U291bmQ7XHJcbnZhciBzb3VuZHMgPSB7ICd0cmFjazEnOiAnYXNzZXRzL211c2ljL3RyYWNrMS5vZ2cnLFxyXG5cdFx0XHQgICAndHJhY2syJzogJ2Fzc2V0cy9tdXNpYy90cmFjazIub2dnJyxcclxuXHRcdFx0ICAgJ3RyYWNrMyc6ICdhc3NldHMvbXVzaWMvdHJhY2szLm9nZycsXHJcblx0XHRcdCAgICdnYW1lT3Zlcic6ICdhc3NldHMvbXVzaWMvZ2FtZW92ZXIub2dnJyB9O1xyXG52YXIgY3VycmVudFRyYWNrO1xyXG52YXIgcGxheWluZ1RyYWNrTnVtYmVyID0gMTtcclxuXHJcbnZhciBnbG9iYWwgPSB0aGlzO1xyXG52YXIgc3ByaXRlcyA9IHJlcXVpcmUoJy4vc3ByaXRlSW5mbycpO1xyXG5jb25zdCBtb25zdGVyID0gcmVxdWlyZSgnLi9saWIvbW9uc3RlcicpO1xyXG5cclxudmFyIHBpeGVsc1Blck1ldHJlID0gMTg7XHJcbnZhciBtb25zdGVyRGlzdGFuY2VUaHJlc2hvbGQgPSAyMDAwO1xyXG5jb25zdCB0b3RhbExpdmVzID0gNTtcclxudmFyIGxpdmVzTGVmdCA9IHRvdGFsTGl2ZXM7XHJcbnZhciBoaWdoU2NvcmUgPSAwO1xyXG5cclxuLy9zb3VyY2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9icnljL2NvZGUvYmxvYi9tYXN0ZXIvanNoYXNoL2V4cGVyaW1lbnRhbC9jeXJiNTMuanNcclxuY29uc3QgY3lyYjUzID0gZnVuY3Rpb24oc3RyLCBzID0gMCkge1xyXG5cdGxldCBoMSA9IDB4ZGVhZGJlZWYgXiBzLCBoMiA9IDB4NDFjNmNlNTcgXiBzO1xyXG5cdGZvciAobGV0IGkgPSAwLCBjaDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xyXG5cdFx0Y2ggPSBzdHIuY2hhckNvZGVBdChpKTtcclxuXHRcdGgxID0gTWF0aC5pbXVsKGgxIF4gY2gsIDI2NTQ0MzU3NjEpO1xyXG5cdFx0aDIgPSBNYXRoLmltdWwoaDIgXiBjaCwgMTU5NzMzNDY3Nyk7XHJcblx0fVxyXG5cdGgxID0gTWF0aC5pbXVsKGgxIF4gKGgxPj4+MTYpLCAyMjQ2ODIyNTA3KSBeIE1hdGguaW11bChoMiBeIChoMj4+PjEzKSwgMzI2NjQ4OTkwOSk7XHJcblx0aDIgPSBNYXRoLmltdWwoaDIgXiAoaDI+Pj4xNiksIDIyNDY4MjI1MDcpIF4gTWF0aC5pbXVsKGgxIF4gKGgxPj4+MTMpLCAzMjY2NDg5OTA5KTtcclxuXHRyZXR1cm4gNDI5NDk2NzI5NiAqICgyMDk3MTUxICYgaDIpICsgKGgxPj4+MCk7XHJcbn07XHJcblxyXG5jb25zdCBnYW1lSW5mbyA9IHtcclxuXHRkaXN0YW5jZTogMCxcclxuXHRtb25leTogMCxcclxuXHR0b2tlbnM6IDAsXHJcblx0cG9pbnRzOiAwLFxyXG5cdGNhbnM6IDAsXHJcblx0bGV2ZWxCb29zdDogMCxcclxuXHRnYW1lRW5kRGF0ZVRpbWU6IG51bGwsXHJcblxyXG5cdGdvZDogZmFsc2UsXHJcblxyXG5cdHJlc2V0KCkge1xyXG5cdFx0dGhpcy5kaXN0YW5jZSA9IDA7XHJcblx0XHR0aGlzLm1vbmV5ID0gMDtcclxuXHRcdHRoaXMudG9rZW5zID0gMDtcclxuXHRcdHRoaXMucG9pbnRzID0gMDtcclxuXHRcdHRoaXMuY2FucyA9IDA7XHJcblx0XHR0aGlzLmxldmVsQm9vc3QgPSAwO1xyXG5cdFx0dGhpcy5nYW1lRW5kRGF0ZVRpbWUgPSBudWxsO1xyXG5cdH0sXHJcblxyXG5cdGdldExldmVsKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuZGlzdGFuY2UgPCAxMDAgPyAxIFxyXG5cdFx0XHQ6IE1hdGguZmxvb3IodGhpcy5kaXN0YW5jZSAvIDEwMCkgKyB0aGlzLmxldmVsQm9vc3Q7XHJcblx0fSxcclxuXHJcblx0Z2V0U2NvcmUoKSB7XHJcblx0XHRyZXR1cm4gKHRoaXMuZ2V0TGV2ZWwoKSAqIDEwMClcclxuXHRcdFx0KyAodGhpcy50b2tlbnMgKiAxMClcclxuXHRcdFx0KyAodGhpcy5kaXN0YW5jZSAqIDEwKTtcclxuXHR9LFxyXG5cclxuXHRnZXRGb3JtYXR0ZWRTY29yZSgpIHtcclxuXHRcdGNvbnN0IGQgPSB0aGlzLmdhbWVFbmREYXRlVGltZTtcclxuXHRcdHJldHVybiAn8J+bkiBDYXJ0V2FycyAtIFNlcmlvdXMgU2hvcHBlciDwn5uSJ1xyXG5cdFx0XHQrICdcXG5EYXRlOiAnICsgZC5nZXRNb250aCgpICsgJy8nICsgZC5nZXREYXRlKCkgKyAnLycgKyBkLmdldEZ1bGxZZWFyKCkgKyAnICdcclxuXHRcdFx0XHQrIGQuZ2V0SG91cnMoKSArICc6JyArIGQuZ2V0TWludXRlcygpICsgJzonICsgZC5nZXRTZWNvbmRzKClcclxuXHRcdFx0KyAnXFxuTGV2ZWw6ICcgKyB0aGlzLmdldExldmVsKClcclxuXHRcdFx0KyAnXFxuVG9rZW5zOiAnICsgdGhpcy50b2tlbnNcclxuXHRcdFx0KyAnXFxuRGlzdGFuY2U6ICcgKyB0aGlzLmRpc3RhbmNlICsgJ20nXHJcblx0XHRcdCsgJ1xcblRvdGFsIFNjb3JlOiAnICsgdGhpcy5nZXRTY29yZSgpXHJcblx0XHRcdCsgJ1xcbkNvZGU6ICcgKyBjeXJiNTModGhpcy5nZXRMZXZlbCgpLnRvU3RyaW5nKCkgKyB0aGlzLnRva2Vucy50b1N0cmluZygpXHJcblx0XHRcdFx0KyB0aGlzLmRpc3RhbmNlLnRvU3RyaW5nKCkgKyB0aGlzLmdldFNjb3JlKCkudG9TdHJpbmcoKSwgXHJcblx0XHRcdFx0ZC5nZXREYXRlKCkgKyBkLmdldE1vbnRoKCkgKyBkLmdldEZ1bGxZZWFyKCkgKyBkLmdldEhvdXJzKCkgKyBkLmdldE1pbnV0ZXMoKSkudG9TdHJpbmcoMzYpO1xyXG5cdH0sXHJcbn07XHJcblxyXG52YXIgZHJvcFJhdGVzID0geyB0cmFmZmljQ29uZUxhcmdlOiAxLCB0cmFmZmljQ29uZVNtYWxsOiAxLCBnYXJiYWdlQ2FuOiAxLCBqdW1wOiAxLCBvaWxTbGljazogMSwgXHJcblx0XHRcdFx0ICB0b2tlbjogMywgbWlsa3NoYWtlOiAxfTtcclxuaWYgKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdoaWdoU2NvcmUnKSkgaGlnaFNjb3JlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2hpZ2hTY29yZScpO1xyXG5cclxuZnVuY3Rpb24gbG9hZEltYWdlcyAoc291cmNlcywgbmV4dCkge1xyXG5cdHZhciBsb2FkZWQgPSAwO1xyXG5cdHZhciBpbWFnZXMgPSB7fTtcclxuXHJcblx0ZnVuY3Rpb24gZmluaXNoICgpIHtcclxuXHRcdGxvYWRlZCArPSAxO1xyXG5cdFx0aWYgKGxvYWRlZCA9PT0gc291cmNlcy5sZW5ndGgpIHtcclxuXHRcdFx0bmV4dChpbWFnZXMpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0c291cmNlcy5lYWNoKGZ1bmN0aW9uIChzcmMpIHtcclxuXHRcdHZhciBpbSA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0aW0ub25sb2FkID0gZmluaXNoO1xyXG5cdFx0aW0uc3JjID0gc3JjO1xyXG5cdFx0ZENvbnRleHQuc3RvcmVMb2FkZWRJbWFnZShzcmMsIGltKTtcclxuXHR9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gX2NoZWNrQXVkaW9TdGF0ZShzb3VuZCkge1xyXG5cdC8qIGlmIChzb3VuZHNbc291bmRdLnN0YXR1cyA9PT0gJ2xvYWRpbmcnICYmIHNvdW5kc1tzb3VuZF0ucmVhZHlTdGF0ZSA9PT0gNCkge1xyXG5cdFx0YXNzZXRMb2FkZWQuY2FsbCh0aGlzLCAnc291bmRzJywgc291bmQpO1xyXG5cdH0gKi9cclxufVxyXG5cclxuZnVuY3Rpb24gbG9hZFNvdW5kcyAoKSB7XHJcblx0Zm9yICh2YXIgc291bmQgaW4gc291bmRzKSB7XHJcblx0XHRpZiAoc291bmRzLmhhc093blByb3BlcnR5KHNvdW5kKSkge1xyXG5cdFx0XHRzcmMgPSBzb3VuZHNbc291bmRdO1xyXG5cdFx0XHQvLyBjcmVhdGUgYSBjbG9zdXJlIGZvciBldmVudCBiaW5kaW5nXHJcblx0XHRcdChmdW5jdGlvbihzb3VuZCkge1xyXG5cdFx0XHRcdHNvdW5kc1tzb3VuZF0gPSBuZXcgQXVkaW8oKTtcclxuXHRcdFx0XHRzb3VuZHNbc291bmRdLnN0YXR1cyA9ICdsb2FkaW5nJztcclxuXHRcdFx0XHRzb3VuZHNbc291bmRdLm5hbWUgPSBzb3VuZDtcclxuXHRcdFx0XHRzb3VuZHNbc291bmRdLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXknLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdF9jaGVja0F1ZGlvU3RhdGUuY2FsbChzb3VuZCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0c291bmRzW3NvdW5kXS5zcmMgPSBzcmM7XHJcblx0XHRcdFx0c291bmRzW3NvdW5kXS5wcmVsb2FkID0gJ2F1dG8nO1xyXG5cdFx0XHRcdHNvdW5kc1tzb3VuZF0ubG9hZCgpO1xyXG5cdFx0XHR9KShzb3VuZCk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiBtb25zdGVySGl0c1BsYXllckJlaGF2aW91cihtb25zdGVyLCBwbGF5ZXIpIHtcclxuXHRwbGF5ZXIuaXNFYXRlbkJ5KG1vbnN0ZXIsIGZ1bmN0aW9uICgpIHtcclxuXHRcdG1vbnN0ZXIuaXNGdWxsID0gdHJ1ZTtcclxuXHRcdG1vbnN0ZXIuaXNFYXRpbmcgPSBmYWxzZTtcclxuXHRcdC8vcGxheWVyLmlzQmVpbmdFYXRlbiA9IGZhbHNlO1xyXG5cdFx0bW9uc3Rlci5zZXRTcGVlZChwbGF5ZXIuZ2V0U3BlZWQoKSk7XHJcblx0XHRtb25zdGVyLnN0b3BGb2xsb3dpbmcoKTtcclxuXHRcdHZhciByYW5kb21Qb3NpdGlvbkFib3ZlID0gZENvbnRleHQuZ2V0UmFuZG9tTWFwUG9zaXRpb25BYm92ZVZpZXdwb3J0KCk7XHJcblx0XHRtb25zdGVyLnNldE1hcFBvc2l0aW9uVGFyZ2V0KHJhbmRvbVBvc2l0aW9uQWJvdmVbMF0sIHJhbmRvbVBvc2l0aW9uQWJvdmVbMV0pO1xyXG5cdH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwbGF5TXVzaWNUcmFjayhuZXh0VHJhY2spIHtcclxuXHRpZiAobmV4dFRyYWNrID09PSBwbGF5aW5nVHJhY2tOdW1iZXIpIHJldHVybjtcclxuXHJcblx0Y3VycmVudFRyYWNrLm11dGVkID0gdHJ1ZTtcclxuXHRwbGF5aW5nVHJhY2tOdW1iZXIgPSBuZXh0VHJhY2s7XHJcblx0aWYgKG5leHRUcmFjayA+IHNvdW5kcy5sZW5ndGggLSAxKVxyXG5cdFx0cGxheWluZ1RyYWNrTnVtYmVyID0gMTtcclxuXHRjdXJyZW50VHJhY2sgPSBzb3VuZHNbXCJ0cmFja1wiICsgbmV4dFRyYWNrXTtcclxuXHRjdXJyZW50VHJhY2suY3VycmVudFRpbWUgPSAwO1xyXG5cdGN1cnJlbnRUcmFjay5sb29wID0gdHJ1ZTtcclxuXHJcblx0aWYgKHBsYXlTb3VuZCkge1xyXG5cdFx0Y3VycmVudFRyYWNrLnBsYXkoKTtcclxuXHRcdGN1cnJlbnRUcmFjay5tdXRlZCA9IGZhbHNlO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd1ZhbGlkYXRlQ29kZU1lbnUoKSB7XHJcblx0JCgnI21haW4nKS5oaWRlKCk7XHJcblx0JCgnI3ZhbGlkYXRlY29kZScpLnNob3coKTtcclxuXHQkKCcjbWVudScpLmFkZENsYXNzKCd2YWxpZGF0ZWNvZGUnKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdmFsaWRhdGVDb2RlKCkge1xyXG5cdGxldCB0b2tlbnMgPSAkKFwiI3ZhbGlkYXRldGV4dFwiKS52YWwoKS50b0xvd2VyQ2FzZSgpLnNwbGl0KC9cXHI/XFxuLykuZmlsdGVyKGZ1bmN0aW9uKHRva2VuKSB7XHJcblx0XHRyZXR1cm4gdG9rZW4uc3RhcnRzV2l0aCgnZGF0ZTonKSB8fFxyXG5cdFx0XHR0b2tlbi5zdGFydHNXaXRoKCdsZXZlbDonKSB8fFxyXG5cdFx0XHR0b2tlbi5zdGFydHNXaXRoKCd0b2tlbnM6JykgfHxcclxuXHRcdFx0dG9rZW4uc3RhcnRzV2l0aCgnZGlzdGFuY2U6JykgfHxcclxuXHRcdFx0dG9rZW4uc3RhcnRzV2l0aCgndG90YWwgc2NvcmU6JykgfHxcclxuXHRcdFx0dG9rZW4uc3RhcnRzV2l0aCgnY29kZTonKTtcclxuXHR9KTtcclxuXHRmdW5jdGlvbiBnZXRWYWx1ZSh0b2tlbikge1xyXG5cdFx0cmV0dXJuIHRva2Vucy5maW5kKGkgPT4gaS5zdGFydHNXaXRoKHRva2VuKSk/LnNwbGl0KFwiOiBcIilbMV07XHJcblx0fVxyXG5cdGxldCB2YWwgPSBnZXRWYWx1ZSgnbGV2ZWw6JykgKyBnZXRWYWx1ZSgndG9rZW5zOicpICsgZ2V0VmFsdWUoJ2Rpc3RhbmNlOicpPy5yZXBsYWNlKCdtJywgJycpICsgZ2V0VmFsdWUoJ3RvdGFsIHNjb3JlOicpO1xyXG5cdGxldCBkID0gZ2V0VmFsdWUoJ2RhdGU6Jyk/LnJlcGxhY2VBbGwoJyAnLCAnLycpPy5yZXBsYWNlQWxsKCc6JywgJy8nKT8uc3BsaXQoJy8nKTtcclxuXHRpZiAodmFsICE9IG51bGwgJiYgZCAhPSBudWxsKSB7XHJcblx0XHRsZXQgcyA9IDA7XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGQubGVuZ3RoIC0gMTsgaSsrKSB7XHJcblx0XHRcdHMgKz0gcGFyc2VJbnQoZFtpXSk7XHJcblx0XHR9XHJcblx0XHRjb25zdCBjID0gY3lyYjUzKHZhbCwgcyk7XHJcblx0XHRpZiAoYy50b1N0cmluZygzNikgPT0gZ2V0VmFsdWUoJ2NvZGU6JykpIHsgXHJcblx0XHRcdGFsZXJ0KCdDb2RlIGlzIHZhbGlkIScpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0fVxyXG5cdGFsZXJ0KCdDb2RlIGlzIE5PVCB2YWxpZCEnKTtcdFxyXG59XHJcblxyXG4kKCcudmFsaWRhdGUnKS5jbGljayh2YWxpZGF0ZUNvZGUpO1xyXG5cclxuZnVuY3Rpb24gc3RhcnROZXZlckVuZGluZ0dhbWUgKGltYWdlcykge1xyXG5cdHZhciBwbGF5ZXI7XHJcblx0dmFyIHN0YXJ0U2lnbjtcclxuXHR2YXIgZ2FtZUh1ZDtcclxuXHR2YXIgZ2FtZTtcclxuXHJcblx0ZnVuY3Rpb24gc2hvd01haW5NZW51KGltYWdlcykge1xyXG5cdFx0Zm9yICh2YXIgc291bmQgaW4gc291bmRzKSB7XHJcblx0XHRcdGlmIChzb3VuZHMuaGFzT3duUHJvcGVydHkoc291bmQpKSB7XHJcblx0XHRcdFx0c291bmRzW3NvdW5kXS5tdXRlZCA9IHRydWU7XHJcblx0XHRcdFx0Y3VycmVudFRyYWNrLm11dGVkID0gIXBsYXlTb3VuZDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0bWFpbkNhbnZhcy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdFx0JCgnI21haW4nKS5zaG93KCk7XHJcblx0XHQkKCcjbWVudScpLmFkZENsYXNzKCdtYWluJyk7XHJcblx0XHQkKCcuc291bmQnKS5zaG93KCk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzaG93R2FtZU92ZXJNZW51KCkge1xyXG5cdFx0JCgnI21lbnUnKS5yZW1vdmVDbGFzcygnbWFpbicpO1xyXG5cdFx0JCgnI21lbnUnKS5zaG93KCk7XHJcblx0XHQkKCcjZ2FtZW92ZXInKS5zaG93KCk7XHJcblx0XHQkKCcjbWVudScpLmFkZENsYXNzKCdnYW1lb3ZlcicpO1xyXG5cdFx0JCgnI2NvcHlwYXN0ZScpLmhpZGUoKTtcclxuXHRcdCQoJyNsZXZlbCcpLnRleHQoJ0xldmVsOiAnICsgZ2FtZUluZm8uZ2V0TGV2ZWwoKS50b0xvY2FsZVN0cmluZygpICsgJyB4MTAwJyk7XHJcblx0XHQkKCcjdG9rZW5zJykudGV4dCgnVG9rZW5zOiAnICsgZ2FtZUluZm8udG9rZW5zLnRvTG9jYWxlU3RyaW5nKCkgKyAnIHgxMCcpO1xyXG5cdFx0JCgnI2Rpc3RhbmNlJykudGV4dCgnRGlzdGFuY2U6ICcgKyBnYW1lSW5mby5kaXN0YW5jZS50b0xvY2FsZVN0cmluZygpICsgJ20geDEwJyk7XHJcblx0XHQkKCcjc2NvcmUnKS50ZXh0KCdTY29yZTogJyArIGdhbWVJbmZvLmdldFNjb3JlKCkudG9Mb2NhbGVTdHJpbmcoKSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB0b2dnbGVHb2RNb2RlKCkge1xyXG5cdFx0Z2FtZUluZm8uZ29kID0gIWdhbWVJbmZvLmdvZDtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlc2V0R2FtZSAoKSB7XHJcblx0XHRsaXZlc0xlZnQgPSA1O1xyXG5cdFx0aGlnaFNjb3JlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2hpZ2hTY29yZScpO1xyXG5cdFx0Z2FtZS5yZXNldCgpO1xyXG5cdFx0Z2FtZS5hZGRTdGF0aWNPYmplY3Qoc3RhcnRTaWduKTtcclxuXHRcdGdhbWVJbmZvLnJlc2V0KCk7XHJcblx0XHRwbGF5TXVzaWNUcmFjaygxKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGRldGVjdEVuZCAoKSB7XHJcblx0XHRpZiAoZ2FtZS5pc0dhbWVFbmRpbmcoKSkgcmV0dXJuO1xyXG5cclxuXHRcdGdhbWUuZ2FtZU92ZXIoKTtcclxuXHRcdGdhbWVJbmZvLmdhbWVFbmREYXRlVGltZSA9IG5ldyBEYXRlKCk7XHJcblx0XHRoaWdoU2NvcmUgPSBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnaGlnaFNjb3JlJywgZ2FtZUluZm8uZGlzdGFuY2UpO1xyXG5cdFx0XHJcblx0XHRwbGF5aW5nVHJhY2tOdW1iZXIgPSAwO1xyXG5cdFx0Y3VycmVudFRyYWNrLm11dGVkID0gdHJ1ZTtcclxuXHRcdGN1cnJlbnRUcmFjayA9IHNvdW5kcy5nYW1lT3ZlcjtcclxuXHRcdGN1cnJlbnRUcmFjay5jdXJyZW50VGltZSA9IDA7XHJcblx0XHRjdXJyZW50VHJhY2subG9vcCA9IHRydWU7XHJcblx0XHRpZiAocGxheVNvdW5kKSB7XHJcblx0XHRcdGN1cnJlbnRUcmFjay5wbGF5KCk7XHJcblx0XHRcdGN1cnJlbnRUcmFjay5tdXRlZCA9IGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIExldCB0aGUgbW9uc3RlciBmaW5pc2ggZWF0aW5nXHJcblx0XHRwbGF5ZXIuaXNCZWluZ0VhdGVuID8gc2V0VGltZW91dChlbmRHYW1lLCAxMDAwKVxyXG5cdFx0XHQ6IGVuZEdhbWUoKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGVuZEdhbWUoKSB7XHJcblx0XHQvL2dhbWUucGF1c2UoKTtcclxuXHRcdC8vZ2FtZS5jeWNsZSgpO1xyXG5cdFx0c2hvd0dhbWVPdmVyTWVudSgpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdXBkYXRlSHVkKG1lc3NhZ2UpIHtcclxuXHRcdGlmICghbWVzc2FnZSlcclxuXHRcdFx0bWVzc2FnZSA9ICcnO1xyXG5cclxuXHRcdGlmICghZ2FtZUh1ZCkge1xyXG5cdFx0XHRnYW1lSHVkID0gbmV3IEdhbWVIdWQoe1xyXG5cdFx0XHRcdHBvc2l0aW9uOiB7XHJcblx0XHRcdFx0XHR0b3A6IDUwLFxyXG5cdFx0XHRcdFx0bGVmdDogMjVcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGdhbWVIdWQuc2V0TGluZXMoW1xyXG5cdFx0XHQnTGV2ZWwgJyArIGdhbWVJbmZvLmdldExldmVsKCksXHJcblx0XHRcdCdUb2tlbnMgJyArIGdhbWVJbmZvLnRva2VucyxcclxuXHRcdFx0J0xpZmUgJyArIGxpdmVzTGVmdCAvIHRvdGFsTGl2ZXMgKiAxMDAgKyAnJScsXHJcblx0XHRcdCdBd2FrZSAnICsgcGxheWVyLmF2YWlsYWJsZUF3YWtlICsgJy8xMDAnLFxyXG5cdFx0XHQnRGlzdGFuY2UgJyArIGdhbWVJbmZvLmRpc3RhbmNlICsgJ20nLFxyXG5cdFx0XHQnU3BlZWQgJyArIHBsYXllci5nZXRTcGVlZCgpLFxyXG5cdFx0XHRtZXNzYWdlXHJcblx0XHRdKTtcclxuXHJcblx0XHRwbGF5TXVzaWNUcmFjayhNYXRoLmZsb29yKGdhbWVJbmZvLmRpc3RhbmNlIC8gMTAwMCAlIDMpICsgMSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiByYW5kb21seVNwYXduTlBDKHNwYXduRnVuY3Rpb24sIGRyb3BSYXRlKSB7XHJcblx0XHR2YXIgcmF0ZU1vZGlmaWVyID0gTWF0aC5tYXgoODAwIC0gbWFpbkNhbnZhcy53aWR0aCwgMCk7XHJcblx0XHRpZiAoTnVtYmVyLnJhbmRvbSgxMDAwICsgcmF0ZU1vZGlmaWVyKSA8PSBkcm9wUmF0ZSkge1xyXG5cdFx0XHRzcGF3bkZ1bmN0aW9uKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzcGF3bk1vbnN0ZXIgKCkge1xyXG5cdFx0dmFyIG5ld01vbnN0ZXIgPSBuZXcgTW9uc3RlcihzcHJpdGVzLm1vbnN0ZXIpO1xyXG5cdFx0dmFyIHJhbmRvbVBvc2l0aW9uID0gZENvbnRleHQuZ2V0UmFuZG9tTWFwUG9zaXRpb25BYm92ZVZpZXdwb3J0KCk7XHJcblx0XHRuZXdNb25zdGVyLnNldE1hcFBvc2l0aW9uKHJhbmRvbVBvc2l0aW9uWzBdLCByYW5kb21Qb3NpdGlvblsxXSk7XHJcblx0XHRuZXdNb25zdGVyLmZvbGxvdyhwbGF5ZXIpO1xyXG5cdFx0bmV3TW9uc3Rlci5vbkhpdHRpbmcocGxheWVyLCBtb25zdGVySGl0c1BsYXllckJlaGF2aW91cik7XHJcblxyXG5cdFx0Ly8gU3RvcCBjaGFzaW5nIGFmdGVyIHRpbWVvdXRcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRpZiAobmV3TW9uc3Rlcikge1xyXG5cdFx0XHRcdGlmIChuZXdNb25zdGVyLmlzRWF0aW5nIHx8IG5ld01vbnN0ZXIuaXNGdWxsKSByZXR1cm47XHJcblx0XHRcdFx0bmV3TW9uc3Rlci5pc0Z1bGwgPSB0cnVlO1xyXG5cdFx0XHRcdG5ld01vbnN0ZXIuc2V0U3BlZWQocGxheWVyLmdldFNwZWVkKCkpO1xyXG5cdFx0XHRcdG5ld01vbnN0ZXIuc3RvcEZvbGxvd2luZygpO1xyXG5cdFx0XHRcdHZhciByYW5kb21Qb3NpdGlvbkFib3ZlID0gZENvbnRleHQuZ2V0UmFuZG9tTWFwUG9zaXRpb25BYm92ZVZpZXdwb3J0KCk7XHJcblx0XHRcdFx0bmV3TW9uc3Rlci5zZXRNYXBQb3NpdGlvblRhcmdldChyYW5kb21Qb3NpdGlvbkFib3ZlWzBdLCByYW5kb21Qb3NpdGlvbkFib3ZlWzFdKTtcclxuXHRcdFx0fVxyXG5cdFx0fSwgMTUwMDApO1xyXG5cclxuXHRcdGdhbWUuYWRkTW92aW5nT2JqZWN0KG5ld01vbnN0ZXIsICdtb25zdGVyJyk7XHJcblx0fVxyXG5cclxuXHQkKCcucGxheWVyMScpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdFx0c3ByaXRlcy5wbGF5ZXIgPSBzcHJpdGVzLnBsYXllcjE7XHJcblx0XHRzdGFydEdhbWUoKTtcclxuXHR9KTtcclxuXHQkKCcucGxheWVyMicpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdFx0c3ByaXRlcy5wbGF5ZXIgPSBzcHJpdGVzLnBsYXllcjI7XHJcblx0XHRzdGFydEdhbWUoKTtcclxuXHR9KTtcclxuXHQkKCcucGxheWVyMycpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdFx0c3ByaXRlcy5wbGF5ZXIgPSBzcHJpdGVzLnBsYXllcjM7XHJcblx0XHRzdGFydEdhbWUoKTtcclxuXHR9KTtcclxuXHQkKCcucGxheWVyNCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdFx0c3ByaXRlcy5wbGF5ZXIgPSBzcHJpdGVzLnBsYXllcjQ7XHJcblx0XHRzdGFydEdhbWUoKTtcclxuXHR9KTtcclxuXHJcblx0TW91c2V0cmFwLmJpbmQoJ3NoaWZ0K3YnLCBzaG93VmFsaWRhdGVDb2RlTWVudSk7XHJcblxyXG5cdGZ1bmN0aW9uIHN0YXJ0R2FtZSgpe1xyXG5cdFx0JCgnI2dhbWVvdmVyJykuaGlkZSgpO1xyXG5cdFx0JCgnI3NlbGVjdFBsYXllcicpLmhpZGUoKTtcclxuXHRcdCQoJyNtZW51JykucmVtb3ZlQ2xhc3MoJ2dhbWVvdmVyJyk7XHJcblx0XHQkKCcjbWVudScpLnJlbW92ZUNsYXNzKCdzZWxlY3RQbGF5ZXInKTtcclxuXHRcdCQoJyNtZW51JykuaGlkZSgpO1xyXG5cdFx0bWFpbkNhbnZhcy5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcblxyXG5cdFx0cGxheWVyID0gbmV3IFBsYXllcihzcHJpdGVzLnBsYXllcik7XHJcblx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb24oMCwgMCk7XHJcblx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb25UYXJnZXQoMCwgLTEwKTtcclxuXHJcblx0XHRwbGF5ZXIuc2V0SGl0T2JzdGFjbGVDYihmdW5jdGlvbigpIHtcclxuXHRcdFx0aWYgKGdhbWVJbmZvLmdvZCkgcmV0dXJuO1xyXG5cdFx0XHRpZiAobGl2ZXNMZWZ0ID4gMCkgbGl2ZXNMZWZ0IC09IDE7XHJcblx0XHR9KTtcclxuXHJcblx0XHRwbGF5ZXIuc2V0SGl0TW9uc3RlckNiKCgpID0+IHtcclxuXHRcdFx0aWYgKGdhbWVJbmZvLmdvZCkgcmV0dXJuO1xyXG5cdFx0XHRsaXZlc0xlZnQgPSAwO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cGxheWVyLnNldENvbGxlY3RJdGVtQ2IoZnVuY3Rpb24oaXRlbSkge1xyXG5cdFx0XHRzd2l0Y2ggKGl0ZW0uZGF0YS5uYW1lKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2FzZSAndG9rZW4nOlxyXG5cdFx0XHRcdFx0Z2FtZUluZm8udG9rZW5zICs9IGl0ZW0uZGF0YS5wb2ludFZhbHVlc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBpdGVtLmRhdGEucG9pbnRWYWx1ZXMubGVuZ3RoKV07XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdtaWxrc2hha2UnOlxyXG5cdFx0XHRcdFx0aWYgKGxpdmVzTGVmdCA8IHRvdGFsTGl2ZXMpIHtcclxuXHRcdFx0XHRcdFx0bGl2ZXNMZWZ0ICs9IDE7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRnYW1lSW5mby5sZXZlbEJvb3N0ICs9IDE7XHJcblxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGdhbWUgPSBuZXcgR2FtZShtYWluQ2FudmFzLCBwbGF5ZXIpO1xyXG5cclxuXHRcdHN0YXJ0U2lnbiA9IG5ldyBTcHJpdGUoc3ByaXRlcy5zaWduU3RhcnQpO1xyXG5cdFx0Z2FtZS5hZGRTdGF0aWNPYmplY3Qoc3RhcnRTaWduKTtcclxuXHRcdHN0YXJ0U2lnbi5zZXRNYXBQb3NpdGlvbigtNTAsIDApO1xyXG5cdFx0ZENvbnRleHQuZm9sbG93U3ByaXRlKHBsYXllcik7XHJcblx0XHRcclxuXHRcdHVwZGF0ZUh1ZCgpO1xyXG5cclxuXHRcdGdhbWUuYmVmb3JlQ3ljbGUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR2YXIgbmV3T2JqZWN0cyA9IFtdO1xyXG5cdFx0XHRpZiAocGxheWVyLmlzTW92aW5nKSB7XHJcblx0XHRcdFx0bmV3T2JqZWN0cyA9IFNwcml0ZS5jcmVhdGVPYmplY3RzKFtcclxuXHRcdFx0XHRcdHsgc3ByaXRlOiBzcHJpdGVzLmp1bXAsIGRyb3BSYXRlOiBkcm9wUmF0ZXMuanVtcCB9LFxyXG5cdFx0XHRcdFx0eyBzcHJpdGU6IHNwcml0ZXMub2lsU2xpY2ssIGRyb3BSYXRlOiBkcm9wUmF0ZXMub2lsU2xpY2sgfSxcclxuXHRcdFx0XHRcdHsgc3ByaXRlOiBzcHJpdGVzLnRyYWZmaWNDb25lTGFyZ2UsIGRyb3BSYXRlOiBkcm9wUmF0ZXMudHJhZmZpY0NvbmVMYXJnZSB9LFxyXG5cdFx0XHRcdFx0eyBzcHJpdGU6IHNwcml0ZXMudHJhZmZpY0NvbmVTbWFsbCwgZHJvcFJhdGU6IGRyb3BSYXRlcy50cmFmZmljQ29uZVNtYWxsIH0sXHJcblx0XHRcdFx0XHR7IHNwcml0ZTogc3ByaXRlcy5nYXJiYWdlQ2FuLCBkcm9wUmF0ZTogZHJvcFJhdGVzLmdhcmJhZ2VDYW4gfSxcclxuXHRcdFx0XHRcdHsgc3ByaXRlOiBzcHJpdGVzLnRva2VuLCBkcm9wUmF0ZTogZHJvcFJhdGVzLnRva2VuIH0sXHJcblx0XHRcdFx0XHR7IHNwcml0ZTogc3ByaXRlcy5taWxrc2hha2UsIGRyb3BSYXRlOiBkcm9wUmF0ZXMubWlsa3NoYWtlIH1cclxuXHRcdFx0XHRdLCB7XHJcblx0XHRcdFx0XHRyYXRlTW9kaWZpZXI6IE1hdGgubWF4KDYwMCAtIG1haW5DYW52YXMud2lkdGgsIDApLFxyXG5cdFx0XHRcdFx0cG9zaXRpb246IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGRDb250ZXh0LmdldFJhbmRvbU1hcFBvc2l0aW9uQmVsb3dWaWV3cG9ydCgpO1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHBsYXllcjogcGxheWVyXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCFnYW1lLmlzUGF1c2VkKCkpIHtcclxuXHRcdFx0XHRnYW1lLmFkZFN0YXRpY09iamVjdHMobmV3T2JqZWN0cyk7XHJcblxyXG5cdFx0XHRcdGdhbWVJbmZvLmRpc3RhbmNlID0gcGFyc2VGbG9hdChwbGF5ZXIuZ2V0UGl4ZWxzVHJhdmVsbGVkRG93blJvYWQoKSAvIHBpeGVsc1Blck1ldHJlKS50b0ZpeGVkKDEpO1xyXG5cclxuXHRcdFx0XHRpZiAoZ2FtZUluZm8uZGlzdGFuY2UgPiBtb25zdGVyRGlzdGFuY2VUaHJlc2hvbGQpIHtcclxuXHRcdFx0XHRcdHJhbmRvbWx5U3Bhd25OUEMoc3Bhd25Nb25zdGVyLCBNYXRoLnJvdW5kKGdhbWVJbmZvLmRpc3RhbmNlIC8gMTAwMCkgKiAuMDAxKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmIChnYW1lSW5mby5kaXN0YW5jZSlcclxuXHJcblx0XHRcdFx0dXBkYXRlSHVkKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGdhbWUuYWZ0ZXJDeWNsZShmdW5jdGlvbigpIHtcclxuXHRcdFx0aWYgKGxpdmVzTGVmdCA9PT0gMCkge1xyXG5cdFx0XHRcdGRldGVjdEVuZCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRnYW1lLmFkZFVJRWxlbWVudChnYW1lSHVkKTtcclxuXHRcdFxyXG5cdFx0JChtYWluQ2FudmFzKVxyXG5cdFx0XHQubW91c2Vtb3ZlKGZ1bmN0aW9uIChlKSB7XHJcblx0XHRcdFx0Z2FtZS5zZXRNb3VzZVgoZS5wYWdlWCk7XHJcblx0XHRcdFx0Z2FtZS5zZXRNb3VzZVkoZS5wYWdlWSk7XHJcblx0XHRcdFx0cGxheWVyLnJlc2V0RGlyZWN0aW9uKCk7XHJcblx0XHRcdFx0cGxheWVyLnN0YXJ0TW92aW5nSWZQb3NzaWJsZSgpO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuYmluZCgnY2xpY2snLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRcdGdhbWUuc2V0TW91c2VYKGUucGFnZVgpO1xyXG5cdFx0XHRcdGdhbWUuc2V0TW91c2VZKGUucGFnZVkpO1xyXG5cdFx0XHRcdHBsYXllci5yZXNldERpcmVjdGlvbigpO1xyXG5cdFx0XHRcdHBsYXllci5zdGFydE1vdmluZ0lmUG9zc2libGUoKTtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmZvY3VzKCk7IC8vIFNvIHdlIGNhbiBsaXN0ZW4gdG8gZXZlbnRzIGltbWVkaWF0ZWx5XHJcblx0XHRcclxuXHRcdE1vdXNldHJhcC51bmJpbmQoJ3YnKTtcclxuXHRcdE1vdXNldHJhcC5iaW5kKCdmJywgcGxheWVyLnNwZWVkQm9vc3QpO1xyXG5cdFx0Ly9Nb3VzZXRyYXAuYmluZCgndCcsIHBsYXllci5hdHRlbXB0VHJpY2spO1xyXG5cdFx0TW91c2V0cmFwLmJpbmQoWyd3JywgJ3VwJ10sIGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cGxheWVyLnN0b3AoKTtcclxuXHRcdH0pO1xyXG5cdFx0TW91c2V0cmFwLmJpbmQoWydhJywgJ2xlZnQnXSwgZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRpZiAocGxheWVyLmRpcmVjdGlvbiA9PT0gMjcwKSB7XHJcblx0XHRcdFx0cGxheWVyLnN0ZXBXZXN0KCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cGxheWVyLnR1cm5XZXN0KCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0TW91c2V0cmFwLmJpbmQoWydzJywgJ2Rvd24nXSwgZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRwbGF5ZXIuc2V0RGlyZWN0aW9uKDE4MCk7XHJcblx0XHRcdHBsYXllci5zdGFydE1vdmluZ0lmUG9zc2libGUoKTtcclxuXHRcdH0pO1xyXG5cdFx0TW91c2V0cmFwLmJpbmQoWydkJywgJ3JpZ2h0J10sIGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0aWYgKHBsYXllci5kaXJlY3Rpb24gPT09IDkwKSB7XHJcblx0XHRcdFx0cGxheWVyLnN0ZXBFYXN0KCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cGxheWVyLnR1cm5FYXN0KCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHRNb3VzZXRyYXAuYmluZCgnc3BhY2UnLCByZXNldEdhbWUpO1xyXG5cdFx0TW91c2V0cmFwLmJpbmQoJ20nLCBzcGF3bk1vbnN0ZXIpO1xyXG5cdFx0Ly9Nb3VzZXRyYXAuYmluZCgnZycsIHRvZ2dsZUdvZE1vZGUpO1xyXG5cdFx0Ly9Nb3VzZXRyYXAuYmluZCgnaCcsIGdhbWUudG9nZ2xlSGl0Qm94ZXMpO1xyXG5cclxuXHRcdHZhciBoYW1tZXJ0aW1lID0gbmV3IEhhbW1lcihtYWluQ2FudmFzKTtcclxuXHRcdGhhbW1lcnRpbWUub24oJ3ByZXNzJywgZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRnYW1lLnNldE1vdXNlWChlLmNlbnRlci54KTtcclxuXHRcdFx0Z2FtZS5zZXRNb3VzZVkoZS5jZW50ZXIueSk7XHJcblx0XHR9KTtcclxuXHRcdGhhbW1lcnRpbWUub24oJ3RhcCcsIGZ1bmN0aW9uIChlKSB7XHJcblx0XHRcdGdhbWUuc2V0TW91c2VYKGUuY2VudGVyLngpO1xyXG5cdFx0XHRnYW1lLnNldE1vdXNlWShlLmNlbnRlci55KTtcclxuXHRcdH0pO1xyXG5cdFx0aGFtbWVydGltZS5vbigncGFuJywgZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0Z2FtZS5zZXRNb3VzZVgoZS5jZW50ZXIueCk7XHJcblx0XHRcdGdhbWUuc2V0TW91c2VZKGUuY2VudGVyLnkpO1xyXG5cdFx0XHRwbGF5ZXIucmVzZXREaXJlY3Rpb24oKTtcclxuXHRcdFx0cGxheWVyLnN0YXJ0TW92aW5nSWZQb3NzaWJsZSgpO1xyXG5cdFx0fSlcclxuXHRcdGhhbW1lcnRpbWUub24oJ2RvdWJsZXRhcCcsIGZ1bmN0aW9uIChlKSB7XHJcblx0XHRcdHBsYXllci5zcGVlZEJvb3N0KCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRwbGF5ZXIuaXNNb3ZpbmcgPSBmYWxzZTtcclxuXHRcdHBsYXllci5zZXREaXJlY3Rpb24oMjcwKTtcclxuXHRcdFxyXG5cdFx0Z2FtZS5zdGFydCgpO1xyXG5cclxuXHRcdGN1cnJlbnRUcmFjayA9IHNvdW5kcy50cmFjazE7XHJcblx0XHRjdXJyZW50VHJhY2sucGxheSgpO1xyXG5cdH1cclxuXHJcblx0JCgnLmNvcHlzY29yZScpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdFx0JCgnI2NvcHlwYXN0ZScpLnNob3coKTtcclxuXHRcdGNvbnN0IHMgPSBnYW1lSW5mby5nZXRGb3JtYXR0ZWRTY29yZSgpO1xyXG5cdFx0JCgnI2NvcHlwYXN0ZXRleHQnKS50ZXh0KHMpLnNlbGVjdCgpO1xyXG5cdFx0bmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQocyk7XHJcblx0fSk7XHJcblx0JCgnLnJlc3RhcnQnKS5jbGljayhmdW5jdGlvbigpIHtcclxuXHRcdCQoJyNnYW1lb3ZlcicpLmhpZGUoKTtcclxuXHRcdCQoJyNtZW51JykuaGlkZSgpO1xyXG5cdFx0cmVzZXRHYW1lKCk7XHJcblx0fSk7XHJcblxyXG5cdHNob3dNYWluTWVudSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXNpemVDYW52YXMoKSB7XHJcblx0bWFpbkNhbnZhcy53aWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xyXG5cdG1haW5DYW52YXMuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xyXG59XHJcblxyXG4kKCcucGxheScpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdCQoJyNtYWluJykuaGlkZSgpO1xyXG5cdCQoJyNzZWxlY3RQbGF5ZXInKS5zaG93KCk7XHJcblx0JCgnI21lbnUnKS5hZGRDbGFzcygnc2VsZWN0UGxheWVyJyk7XHJcbiAgfSk7XHJcblxyXG4kKCcuaW5zdHJ1Y3Rpb25zJykuY2xpY2soZnVuY3Rpb24oKSB7XHJcblx0JCgnI21haW4nKS5oaWRlKCk7XHJcblx0JCgnI2luc3RydWN0aW9ucycpLnNob3coKTtcclxuXHQkKCcjbWVudScpLmFkZENsYXNzKCdpbnN0cnVjdGlvbnMnKTtcclxuICB9KTtcclxuXHJcbiQoJy5jcmVkaXRzJykuY2xpY2soZnVuY3Rpb24oKSB7XHJcblx0JCgnI21haW4nKS5oaWRlKCk7XHJcblx0JCgnI2NyZWRpdHMnKS5zaG93KCk7XHJcblx0JCgnI21lbnUnKS5hZGRDbGFzcygnY3JlZGl0cycpO1xyXG4gIH0pO1xyXG5cclxuJCgnLmJhY2snKS5jbGljayhmdW5jdGlvbigpIHtcclxuXHQkKCcjY3JlZGl0cycpLmhpZGUoKTtcclxuXHQkKCcjc2VsZWN0UGxheWVyJykuaGlkZSgpO1xyXG5cdCQoJyNpbnN0cnVjdGlvbnMnKS5oaWRlKCk7XHJcblx0JCgnI3ZhbGlkYXRlY29kZScpLmhpZGUoKTtcclxuXHQkKCcjbWFpbicpLnNob3coKTtcclxuXHQkKCcjbWVudScpLnJlbW92ZUNsYXNzKCdjcmVkaXRzJyk7XHJcblx0JCgnI21lbnUnKS5yZW1vdmVDbGFzcygnc2VsZWN0UGxheWVyJyk7XHJcblx0JCgnI21lbnUnKS5yZW1vdmVDbGFzcygnaW5zdHJ1Y3Rpb25zJyk7XHJcblx0JCgnI21lbnUnKS5yZW1vdmVDbGFzcygndmFsaWRhdGVjb2RlJyk7XHJcbiAgfSk7XHJcblxyXG4vLyBzZXQgdGhlIHNvdW5kIHByZWZlcmVuY2VcclxudmFyIGNhblVzZUxvY2FsU3RvcmFnZSA9ICdsb2NhbFN0b3JhZ2UnIGluIHdpbmRvdyAmJiB3aW5kb3cubG9jYWxTdG9yYWdlICE9PSBudWxsO1xyXG5pZiAoY2FuVXNlTG9jYWxTdG9yYWdlKSB7XHJcblx0cGxheVNvdW5kID0gKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdoYndDYXJ0UmFjaW5nLnBsYXlTb3VuZCcpID09PSBcInRydWVcIilcclxuXHRpZiAocGxheVNvdW5kKSB7XHJcblx0XHQkKCcuc291bmQnKS5hZGRDbGFzcygnc291bmQtb24nKS5yZW1vdmVDbGFzcygnc291bmQtb2ZmJyk7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0JCgnLnNvdW5kJykuYWRkQ2xhc3MoJ3NvdW5kLW9mZicpLnJlbW92ZUNsYXNzKCdzb3VuZC1vbicpO1xyXG5cdH1cclxufVxyXG5cclxuJCgnLnNvdW5kJykuY2xpY2soZnVuY3Rpb24oKSB7XHJcblx0dmFyICR0aGlzID0gJCh0aGlzKTtcclxuXHQvLyBzb3VuZCBvZmZcclxuXHRpZiAoJHRoaXMuaGFzQ2xhc3MoJ3NvdW5kLW9uJykpIHtcclxuXHQgICR0aGlzLnJlbW92ZUNsYXNzKCdzb3VuZC1vbicpLmFkZENsYXNzKCdzb3VuZC1vZmYnKTtcclxuXHQgIHBsYXlTb3VuZCA9IGZhbHNlO1xyXG5cdH1cclxuXHQvLyBzb3VuZCBvblxyXG5cdGVsc2Uge1xyXG5cdCAgJHRoaXMucmVtb3ZlQ2xhc3MoJ3NvdW5kLW9mZicpLmFkZENsYXNzKCdzb3VuZC1vbicpO1xyXG5cdCAgcGxheVNvdW5kID0gdHJ1ZTtcclxuXHR9XHJcblx0aWYgKGNhblVzZUxvY2FsU3RvcmFnZSkge1xyXG5cdCAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2hid0NhcnRSYWNpbmcucGxheVNvdW5kJywgcGxheVNvdW5kKTtcclxuXHR9XHJcblx0Ly8gbXV0ZSBvciB1bm11dGUgYWxsIHNvdW5kc1xyXG5cdGZvciAodmFyIHNvdW5kIGluIHNvdW5kcykge1xyXG5cdFx0aWYgKHNvdW5kcy5oYXNPd25Qcm9wZXJ0eShzb3VuZCkpIHtcclxuXHRcdFx0c291bmRzW3NvdW5kXS5tdXRlZCA9IHRydWU7XHJcblx0XHRcdGN1cnJlbnRUcmFjay5tdXRlZCA9ICFwbGF5U291bmQ7XHJcblx0XHR9XHJcblx0fVxyXG5cdGlmIChwbGF5U291bmQpIGN1cnJlbnRUcmFjay5wbGF5KCk7XHJcbn0pO1xyXG5cclxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHJlc2l6ZUNhbnZhcywgZmFsc2UpO1xyXG5cclxucmVzaXplQ2FudmFzKCk7XHJcblxyXG5sb2FkU291bmRzKCk7XHJcblxyXG5jdXJyZW50VHJhY2sgPSBzb3VuZHMudHJhY2sxO1xyXG5jdXJyZW50VHJhY2suY3VycmVudFRpbWUgPSAwO1xyXG5jdXJyZW50VHJhY2subG9vcCA9IHRydWU7XHJcblxyXG5sb2FkSW1hZ2VzKGltYWdlU291cmNlcywgc3RhcnROZXZlckVuZGluZ0dhbWUpO1xyXG5cclxudGhpcy5leHBvcnRzID0gd2luZG93O1xyXG4iLCJjb25zdCBnYW1lID0gcmVxdWlyZShcIi4vbGliL2dhbWVcIik7XHJcblxyXG4oZnVuY3Rpb24gKGdsb2JhbCkge1xyXG5cdHZhciBzcHJpdGVzID0ge1xyXG5cdFx0J3BsYXllcic6IHtcclxuXHRcdFx0aWQ6ICdwbGF5ZXInLFxyXG5cdFx0XHQkaW1hZ2VGaWxlOiAnJyxcclxuXHRcdFx0cGFydHM6IHt9LFxyXG5cdFx0XHRoaXRCb3hlczoge30sXHJcblx0XHRcdGhpdEJlaGF2aW9yOiB7fVxyXG5cdFx0fSxcclxuXHRcdCdwbGF5ZXIxJzoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlIDogJ2Fzc2V0cy9oYXRndXktc3ByaXRlcy5wbmcnLFxyXG5cdFx0XHRwYXJ0cyA6IHtcclxuXHRcdFx0XHQvLyB4LCB5LCB3aWR0aCwgaGVpZ2h0LCBjYW52YXNPZmZzZXRYLCBjYW52YXNPZmZzZXRZLCBoaXRib3hPZmZzZXRYLCBoaXRib3hPZmZzZXRZIFxyXG5cdFx0XHRcdGJsYW5rIDogWyAwLCAwLCAwLCAwIF0sXHJcblx0XHRcdFx0ZWFzdCA6IFsgMTQ1LCA2MSwgNzAsIDY2LCAwLCAwLCAyNSwgMCBdLFxyXG5cdFx0XHRcdGVzRWFzdCA6IFsgNzEsIDE5NiwgNjUsIDcxLCAwLCAwLCAyMSwgMCBdLFxyXG5cdFx0XHRcdHNFYXN0IDogWyAxMDMsIDEyNywgNTIsIDY5LCAwLCAwLCAxMywgMCBdLFxyXG5cdFx0XHRcdHNvdXRoIDogWyA2MCwgMTI3LCA0MywgNjggXSxcclxuXHRcdFx0XHRzV2VzdCA6IFsgMTU1LCAxMjcsIDUwLCA2OSBdLFxyXG5cdFx0XHRcdHdzV2VzdCA6IFsgMCwgMTI3LCA2MCwgNjYgXSxcclxuXHRcdFx0XHR3ZXN0IDogWyAxNTMsIDAsIDY1LCA2MSBdLFxyXG5cdFx0XHRcdGp1bXBpbmcgOiBbIDAsIDI2NywgNTYsIDg3LCAtMywgMTAgXSxcclxuXHRcdFx0XHRib29zdCA6IFsgNTYsIDI2NywgNDMsIDExMywgMCwgLTQ1IF0sXHJcblxyXG5cdFx0XHRcdC8vIFdyZWNrIHNlcXVlbmNlXHJcblx0XHRcdFx0d3JlY2sxIDogWyAwLCAxOTYsIDcxLCA3MCBdLFxyXG5cdFx0XHRcdHdyZWNrMiA6IFsgNzcsIDYxLCA2OCwgNjQgXSxcclxuXHRcdFx0XHR3cmVjazMgOiBbIDAsIDAsIDcwLCA1MCBdLFxyXG5cdFx0XHRcdHdyZWNrNCA6IFsgMTM2LCAxOTYsIDc1LCA3MSBdLFxyXG5cdFx0XHRcdHdyZWNrNSA6IFsgNzAsIDAsIDgzLCA1OSBdLFxyXG5cdFx0XHRcdHdyZWNrNiA6IFsgMCwgNjEsIDc3LCA2MSBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJveGVzOiB7XHJcblx0XHRcdFx0Ly9MZWZ0LCBUb3AsIFJpZ2h0LCBCb3R0b21cclxuXHRcdFx0XHQwOiBbIDAsIDIwLCA0NSwgNjAgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpZCA6ICdwbGF5ZXInLFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3BsYXllcjInOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL3BpbG90LXNwcml0ZXMucG5nJyxcclxuXHRcdFx0cGFydHMgOiB7XHJcblx0XHRcdFx0Ly8geCwgeSwgd2lkdGgsIGhlaWdodCwgY2FudmFzT2Zmc2V0WCwgY2FudmFzT2Zmc2V0WSwgaGl0Ym94T2Zmc2V0WCwgaGl0Ym94T2Zmc2V0WSBcclxuXHRcdFx0XHRibGFuayA6IFsgMCwgMCwgMCwgMCBdLFxyXG5cdFx0XHRcdGVhc3QgOiBbIDAsIDM2NSwgNzAsIDY4LCAwLCAwLCAyNSwgMCBdLFxyXG5cdFx0XHRcdGVzRWFzdCA6IFsgNTEsIDI4MywgNjUsIDcxLCAwLCAwLCAyMSwgMCBdLFxyXG5cdFx0XHRcdHNFYXN0IDogWyAwLCAyMDksIDU3LCA3NCwgMCwgMCwgMTMsIDAgXSxcclxuXHRcdFx0XHRzb3V0aCA6IFsgMCwgMCwgNDMsIDY4IF0sXHJcblx0XHRcdFx0c1dlc3QgOiBbIDAsIDEzNSwgNTQsIDc0LCAwIF0sXHJcblx0XHRcdFx0d3NXZXN0IDogWyA2NSwgNjgsIDYwLCA2NyBdLFxyXG5cdFx0XHRcdHdlc3QgOiBbIDAsIDY4LCA2NSwgNjIgXSxcclxuXHRcdFx0XHRqdW1waW5nIDogWyAwLCAyODMsIDUxLCA4MiwgLTMsIDEwIF0sXHJcblx0XHRcdFx0Ym9vc3QgOiBbIDc1LCA1NjIsIDQzLCAxMTMsIDAsIC00NSBdLFxyXG5cclxuXHRcdFx0XHQvLyBXcmVjayBzZXF1ZW5jZVxyXG5cdFx0XHRcdHdyZWNrMSA6IFsgMCwgNDMzLCA2OCwgNzAgXSxcclxuXHRcdFx0XHR3cmVjazIgOiBbIDU3LCAyMDksIDY4LCA2NCBdLFxyXG5cdFx0XHRcdHdyZWNrMyA6IFsgNDMsIDAsIDcwLCA1MCBdLFxyXG5cdFx0XHRcdHdyZWNrNCA6IFsgMCwgNTYyLCA3NSwgNzMgXSxcclxuXHRcdFx0XHR3cmVjazUgOiBbIDAsIDUwMywgODMsIDU5IF0sXHJcblx0XHRcdFx0d3JlY2s2IDogWyA1NCwgMTM1LCA3MSwgNTkgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCb3hlczoge1xyXG5cdFx0XHRcdC8vTGVmdCwgVG9wLCBSaWdodCwgQm90dG9tXHJcblx0XHRcdFx0MDogWyAwLCAyMCwgNDUsIDYwIF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aWQgOiAncGxheWVyJyxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCdwbGF5ZXIzJzoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlIDogJ2Fzc2V0cy9yb21hbnNvbGRpZXItc3ByaXRlcy5wbmcnLFxyXG5cdFx0XHRwYXJ0cyA6IHtcclxuXHRcdFx0XHQvLyB4LCB5LCB3aWR0aCwgaGVpZ2h0LCBjYW52YXNPZmZzZXRYLCBjYW52YXNPZmZzZXRZLCBoaXRib3hPZmZzZXRYLCBoaXRib3hPZmZzZXRZIFxyXG5cdFx0XHRcdGJsYW5rIDogWyAwLCAwLCAwLCAwIF0sXHJcblx0XHRcdFx0ZWFzdCA6IFsgMTMxLCA2MiwgNzMsIDcwLCAwLCAwLCAyNSwgMCBdLFxyXG5cdFx0XHRcdGVzRWFzdCA6IFsgNzIsIDEzMiwgNjUsIDcxLCAwLCAwLCAyMSwgMCBdLFxyXG5cdFx0XHRcdHNFYXN0IDogWyAxMzIsIDIwMywgNTcsIDc0LCAwLCAwLCAxMywgMCBdLFxyXG5cdFx0XHRcdHNvdXRoIDogWyA3OSwgMjAzLCA1MywgNzQsIDAsIDAsIDYsIDAgXSxcclxuXHRcdFx0XHRzV2VzdCA6IFsgMCwgNjIsIDY2LCA2OSwgMCwgMCwgMTUsIDAgXSxcclxuXHRcdFx0XHR3c1dlc3QgOiBbIDAsIDIwMywgNzksIDcyLCAwLCAwLCAxMCwgMCBdLFxyXG5cdFx0XHRcdHdlc3QgOiBbIDY2LCA2MiwgNjUsIDY5IF0sXHJcblx0XHRcdFx0anVtcGluZyA6IFsgNzUsIDI3NywgNjQsIDkxLCAtMTIsIDEwIF0sXHJcblx0XHRcdFx0Ym9vc3QgOiBbIDEzOSwgMjc3LCA1MywgMTIyLCAwLCAtNDUgXSxcclxuXHJcblx0XHRcdFx0Ly8gV3JlY2sgc2VxdWVuY2VcclxuXHRcdFx0XHR3cmVjazEgOiBbIDAsIDEzMiwgNzIsIDcwIF0sXHJcblx0XHRcdFx0d3JlY2syIDogWyA3NywgMCwgNjMsIDU5IF0sXHJcblx0XHRcdFx0d3JlY2szIDogWyAxMzcsIDEzMiwgNzAsIDcxIF0sXHJcblx0XHRcdFx0d3JlY2s0IDogWyAwLCAyNzcsIDc1LCA3NyBdLFxyXG5cdFx0XHRcdHdyZWNrNSA6IFsgMCwgMCwgNzcsIDU1IF0sXHJcblx0XHRcdFx0d3JlY2s2IDogWyAxNDAsIDAsIDcyLCA2MiBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJveGVzOiB7XHJcblx0XHRcdFx0Ly9MZWZ0LCBUb3AsIFJpZ2h0LCBCb3R0b21cclxuXHRcdFx0XHQwOiBbIDAsIDIwLCA0NSwgNjAgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpZCA6ICdwbGF5ZXInLFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3BsYXllcjQnOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL3NrZWxldG9uLXNwcml0ZXMucG5nJyxcclxuXHRcdFx0cGFydHMgOiB7XHJcblx0XHRcdFx0Ly8geCwgeSwgd2lkdGgsIGhlaWdodCwgY2FudmFzT2Zmc2V0WCwgY2FudmFzT2Zmc2V0WSwgaGl0Ym94T2Zmc2V0WCwgaGl0Ym94T2Zmc2V0WSBcclxuXHRcdFx0XHRibGFuayA6IFsgMCwgMCwgMCwgMCBdLFxyXG5cdFx0XHRcdGVhc3QgOiBbIDAsIDY4LCA3MywgNzEsIDAsIDAsIDI1LCAwIF0sXHJcblx0XHRcdFx0ZXNFYXN0IDogWyA3MywgNjgsIDY1LCA3MSwgMCwgMCwgMjEsIDAgXSxcclxuXHRcdFx0XHRzRWFzdCA6IFsgMjAyLCA2OCwgNTYsIDc0LCAwLCAwLCAxMywgMCBdLFxyXG5cdFx0XHRcdHNvdXRoIDogWyA0MzcsIDAsIDQzLCA2OCBdLFxyXG5cdFx0XHRcdHNXZXN0IDogWyAyNTgsIDY4LCA1NCwgNzQsIDAgXSxcclxuXHRcdFx0XHR3c1dlc3QgOiBbIDEzOCwgNjgsIDY0LCA3MSBdLFxyXG5cdFx0XHRcdHdlc3QgOiBbIDI5MCwgMCwgNjgsIDY2IF0sXHJcblx0XHRcdFx0anVtcGluZyA6IFsgMzg3LCA2OCwgNTYsIDkzLCAtMywgMTAgXSxcclxuXHRcdFx0XHRib29zdCA6IFsgNDQzLCA2OCwgNDYsIDEyMiwgMCwgLTQ1IF0sXHJcblxyXG5cdFx0XHRcdC8vIFdyZWNrIHNlcXVlbmNlXHJcblx0XHRcdFx0d3JlY2sxIDogWyAyMjMsIDAsIDY3LCA2NSBdLFxyXG5cdFx0XHRcdHdyZWNrMiA6IFsgMTU1LCAwLCA2OCwgNjQgXSxcclxuXHRcdFx0XHR3cmVjazMgOiBbIDAsIDAsIDcxLCA1MSBdLFxyXG5cdFx0XHRcdHdyZWNrNCA6IFsgMzEyLCA2OCwgNzUsIDc4IF0sXHJcblx0XHRcdFx0d3JlY2s1IDogWyA3MSwgMCwgODQsIDU5IF0sXHJcblx0XHRcdFx0d3JlY2s2IDogWyAzNTgsIDAsIDc5LCA2NyBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJveGVzOiB7XHJcblx0XHRcdFx0Ly9MZWZ0LCBUb3AsIFJpZ2h0LCBCb3R0b21cclxuXHRcdFx0XHQwOiBbIDAsIDIwLCA0NSwgNjAgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpZCA6ICdwbGF5ZXInLFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3Rva2VuJyA6IHtcclxuXHRcdFx0bmFtZTogJ3Rva2VuJyxcclxuXHRcdFx0JGltYWdlRmlsZTogJ2Fzc2V0cy90b2tlbi1zcHJpdGVzLnBuZycsXHJcblx0XHRcdGFuaW1hdGVkOiB0cnVlLFxyXG5cdFx0XHRjb2xsZWN0aWJsZTogdHJ1ZSxcclxuXHRcdFx0cG9pbnRWYWx1ZXM6IFsxMjUsIDE1MCwgMTc1LCAyMDAsIDI1MCwgMzAwLCAzNTAsIDQwMCwgNDUwLCA1MDBdLFxyXG5cdFx0XHRwYXJ0czoge1xyXG5cdFx0XHRcdGZyYW1lMTogWzAsIDAsIDI1LCAyNl0sXHJcblx0XHRcdFx0ZnJhbWUyOiBbMjUsIDAsIDI1LCAyNl0sXHJcblx0XHRcdFx0ZnJhbWUzOiBbNTAsIDAsIDI1LCAyNl0sXHJcblx0XHRcdFx0ZnJhbWU0OiBbNzUsIDAsIDI1LCAyNl1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCdvaWxTbGljaycgOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL29pbHNsaWNrLXNwcml0ZS5wbmcnLFxyXG5cdFx0XHRwYXJ0cyA6IHtcclxuXHRcdFx0XHRtYWluIDogWyAwLCAwLCA0MCwgMTkgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9LFxyXG5cdFx0XHRpc0RyYXduVW5kZXJQbGF5ZXI6IHRydWVcclxuXHRcdH0sXHJcblx0XHQnbW9uc3RlcicgOiB7XHJcblx0XHRcdG5hbWU6ICdtb25zdGVyJyxcclxuXHRcdFx0JGltYWdlRmlsZSA6ICdhc3NldHMvbWFsb3JkLXNwcml0ZXMucG5nJyxcclxuXHRcdFx0cGFydHMgOiB7XHJcblx0XHRcdFx0c0Vhc3QxIDogWyAzMzIsIDE0OSwgMTY2LCAxNDkgXSxcclxuXHRcdFx0XHRzRWFzdDIgOiBbIDAsIDI5OCwgMTY2LCAxNDkgXSxcclxuXHRcdFx0XHRzV2VzdDEgOiBbIDE2NiwgMjk4LCAxNjYsIDE0OSBdLFxyXG5cdFx0XHRcdHNXZXN0MiA6IFsgMzMyLCAyOTgsIDE2NiwgMTQ5IF0sXHJcblx0XHRcdFx0ZWF0aW5nMSA6IFsgMCwgMCwgMTY2LCAxNDkgXSxcclxuXHRcdFx0XHRlYXRpbmcyIDogWyAxNjYsIDAsIDE2NiwgMTQ5IF0sXHJcblx0XHRcdFx0ZWF0aW5nMyA6IFsgMzMyLCAwLCAxNjYsIDE0OSBdLFxyXG5cdFx0XHRcdGVhdGluZzQgOiBbIDAsIDE0OSwgMTY2LCAxNDkgXSxcclxuXHRcdFx0XHRlYXRpbmc1IDogWyAxNjYsIDE0OSwgMTY2LCAxNDkgXSxcclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0Qm94ZXM6IHtcclxuXHRcdFx0XHQvL0xlZnQsIFRvcCwgUmlnaHQsIEJvdHRvbVxyXG5cdFx0XHRcdDA6IFsgMzAsIDUwLCAxNDUsIDEyNSBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge31cclxuXHRcdH0sXHJcblx0XHQnanVtcCcgOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL3JhbXAtc3ByaXRlLnBuZycsXHJcblx0XHRcdHBhcnRzIDoge1xyXG5cdFx0XHRcdG1haW4gOiBbIDAsIDAsIDU0LCAzNiBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJveGVzOiB7XHJcblx0XHRcdFx0Ly9MZWZ0LCBUb3AsIFJpZ2h0LCBCb3R0b21cclxuXHRcdFx0XHQwOiBbIDYsIDMsIDQ4LCAxMCBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge30sXHJcblx0XHRcdGlzRHJhd25VbmRlclBsYXllcjogdHJ1ZVxyXG5cdFx0fSxcclxuXHRcdCdzaWduU3RhcnQnIDoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlIDogJ2Fzc2V0cy9zdGFydHNpZ24tc3ByaXRlLnBuZycsXHJcblx0XHRcdHBhcnRzIDoge1xyXG5cdFx0XHRcdG1haW4gOiBbIDAsIDAsIDQyLCAyNyBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge31cclxuXHRcdH0sXHJcblx0XHQnbWlsa3NoYWtlJzoge1xyXG5cdFx0XHRuYW1lOiAnbWlsa3NoYWtlJyxcclxuXHRcdFx0JGltYWdlRmlsZTogJ2Fzc2V0cy9taWxrc2hha2Utc3ByaXRlLnBuZycsXHJcblx0XHRcdGNvbGxlY3RpYmxlOiB0cnVlLFxyXG5cdFx0XHRwb2ludFZhbHVlczogWzEyNSwgMTUwLCAxNzUsIDIwMCwgMjUwLCAzMDAsIDM1MCwgNDAwLCA0NTAsIDUwMF0sXHJcblx0XHRcdHBhcnRzOiB7XHJcblx0XHRcdFx0bWFpbiA6IFsgMCwgMCwgMjUsIDQzIF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCd0cmFmZmljQ29uZUxhcmdlJzoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlOiAnYXNzZXRzL3RyYWZmaWMtY29uZS1sYXJnZS5wbmcnLFxyXG5cdFx0XHRwYXJ0czoge1xyXG5cdFx0XHRcdG1haW4gOiBbIDAsIDAsIDM5LCA0OCBdXHJcblx0XHRcdH0sXHJcblx0XHRcdHpJbmRleGVzT2NjdXBpZWQgOiBbMCwgMV0sXHJcblx0XHRcdGhpdEJveGVzOiB7XHJcblx0XHRcdFx0MDogWyAwLCAyNiwgMzksIDQ4IF0sXHJcblx0XHRcdFx0MTogWyAxMiwgMCwgMjgsIDIwIF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCd0cmFmZmljQ29uZVNtYWxsJzoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlOiAnYXNzZXRzL3RyYWZmaWMtY29uZS1zbWFsbC5wbmcnLFxyXG5cdFx0XHRwYXJ0czoge1xyXG5cdFx0XHRcdG1haW4gOiBbIDAsIDAsIDE5LCAyNCBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJveGVzOiB7XHJcblx0XHRcdFx0MDogWyAwLCAxMywgMTksIDI0IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCdnYXJiYWdlQ2FuJzoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlOiAnYXNzZXRzL2dhcmJhZ2UtY2FuLnBuZycsXHJcblx0XHRcdHBhcnRzOiB7XHJcblx0XHRcdFx0bWFpbiA6IFsgMCwgMCwgMjksIDQ1IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0Qm94ZXM6IHtcclxuXHRcdFx0XHQwOiBbIDEsIDMwLCAyOCwgNDQgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0ZnVuY3Rpb24gb2JzdGFjbGVIaXRzTW9uc3RlckJlaGF2aW9yKG9ic3RhY2xlLCBtb25zdGVyKSB7XHJcblx0XHQvLyBSZW1vdmUgb2JzdGFjbGVzIGFzIG1vbnN0ZXIgaGl0cyB0aGVtLCBzbG93IG1vbnN0ZXJcclxuXHJcblx0XHQvLyBEaXNhYmxlZCBtb25zdGVyIHNsb3dkb3duXHJcblx0XHQvL21vbnN0ZXIuc2V0T2JzdGFjbGVIaXRTcGVlZCgpO1xyXG5cdFx0b2JzdGFjbGUuZGVsZXRlT25OZXh0Q3ljbGUoKTtcclxuXHR9XHJcblx0c3ByaXRlcy5nYXJiYWdlQ2FuLmhpdEJlaGF2aW91ci5tb25zdGVyID0gb2JzdGFjbGVIaXRzTW9uc3RlckJlaGF2aW9yO1xyXG5cdHNwcml0ZXMudHJhZmZpY0NvbmVMYXJnZS5oaXRCZWhhdmlvdXIubW9uc3RlciA9IG9ic3RhY2xlSGl0c01vbnN0ZXJCZWhhdmlvcjtcclxuXHRzcHJpdGVzLnRyYWZmaWNDb25lU21hbGwuaGl0QmVoYXZpb3VyLm1vbnN0ZXIgPSBvYnN0YWNsZUhpdHNNb25zdGVyQmVoYXZpb3I7XHJcblx0c3ByaXRlcy5qdW1wLmhpdEJlaGF2aW91ci5tb25zdGVyID0gb2JzdGFjbGVIaXRzTW9uc3RlckJlaGF2aW9yO1xyXG5cdHNwcml0ZXMub2lsU2xpY2suaGl0QmVoYXZpb3VyLm1vbnN0ZXIgPSBvYnN0YWNsZUhpdHNNb25zdGVyQmVoYXZpb3I7XHJcblxyXG5cdGZ1bmN0aW9uIGp1bXBIaXRzUGxheWVyQmVoYXZpb3VyKGp1bXAsIHBsYXllcikge1xyXG5cdFx0cGxheWVyLmhhc0hpdEp1bXAoanVtcCk7XHJcblx0fVxyXG5cdHNwcml0ZXMuanVtcC5oaXRCZWhhdmlvdXIucGxheWVyID0ganVtcEhpdHNQbGF5ZXJCZWhhdmlvdXI7XHJcblxyXG5cdGZ1bmN0aW9uIG9ic3RhY2xlSGl0c1BsYXllckJlaGF2aW91cihvYnN0YWNsZSwgcGxheWVyKSB7XHJcblx0XHRwbGF5ZXIuaGFzSGl0T2JzdGFjbGUob2JzdGFjbGUpO1xyXG5cdH1cclxuXHRzcHJpdGVzLnRyYWZmaWNDb25lTGFyZ2UuaGl0QmVoYXZpb3VyLnBsYXllciA9IG9ic3RhY2xlSGl0c1BsYXllckJlaGF2aW91cjtcclxuXHRzcHJpdGVzLnRyYWZmaWNDb25lU21hbGwuaGl0QmVoYXZpb3VyLnBsYXllciA9IG9ic3RhY2xlSGl0c1BsYXllckJlaGF2aW91cjtcclxuXHRzcHJpdGVzLmdhcmJhZ2VDYW4uaGl0QmVoYXZpb3VyLnBsYXllciA9IG9ic3RhY2xlSGl0c1BsYXllckJlaGF2aW91cjtcclxuXHJcblx0ZnVuY3Rpb24gb2lsU2xpY2tIaXRzUGxheWVyQmVoYXZpb3VyKG9pbFNsaWNrLCBwbGF5ZXIpIHtcclxuXHRcdHBsYXllci5oYXNIaXRPaWxTbGljayhvaWxTbGljayk7XHJcblx0fVxyXG5cdHNwcml0ZXMub2lsU2xpY2suaGl0QmVoYXZpb3VyLnBsYXllciA9IG9pbFNsaWNrSGl0c1BsYXllckJlaGF2aW91cjtcclxuXHJcblx0ZnVuY3Rpb24gcGxheWVySGl0c0NvbGxlY3RpYmxlQmVoYXZpb3VyKGl0ZW0sIHBsYXllcikge1xyXG5cdFx0cGxheWVyLmhhc0hpdENvbGxlY3RpYmxlKGl0ZW0pO1xyXG5cdFx0aXRlbS5kZWxldGVPbk5leHRDeWNsZSgpO1xyXG5cdH1cclxuXHRzcHJpdGVzLnRva2VuLmhpdEJlaGF2aW91ci5wbGF5ZXIgPSBwbGF5ZXJIaXRzQ29sbGVjdGlibGVCZWhhdmlvdXI7XHJcblx0c3ByaXRlcy5taWxrc2hha2UuaGl0QmVoYXZpb3VyLnBsYXllciA9IHBsYXllckhpdHNDb2xsZWN0aWJsZUJlaGF2aW91cjtcclxuXHRcclxuXHRnbG9iYWwuc3ByaXRlSW5mbyA9IHNwcml0ZXM7XHJcbn0pKCB0aGlzICk7XHJcblxyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSB0aGlzLnNwcml0ZUluZm87XHJcbn0iLCIvKipcbiAqIENvcHlyaWdodCAyMDEyIENyYWlnIENhbXBiZWxsXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICogTW91c2V0cmFwIGlzIGEgc2ltcGxlIGtleWJvYXJkIHNob3J0Y3V0IGxpYnJhcnkgZm9yIEphdmFzY3JpcHQgd2l0aFxuICogbm8gZXh0ZXJuYWwgZGVwZW5kZW5jaWVzXG4gKlxuICogQHZlcnNpb24gMS4xLjNcbiAqIEB1cmwgY3JhaWcuaXMva2lsbGluZy9taWNlXG4gKi9cbihmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICAqIG1hcHBpbmcgb2Ygc3BlY2lhbCBrZXljb2RlcyB0byB0aGVpciBjb3JyZXNwb25kaW5nIGtleXNcbiAgICAgKlxuICAgICAqIGV2ZXJ5dGhpbmcgaW4gdGhpcyBkaWN0aW9uYXJ5IGNhbm5vdCB1c2Uga2V5cHJlc3MgZXZlbnRzXG4gICAgICogc28gaXQgaGFzIHRvIGJlIGhlcmUgdG8gbWFwIHRvIHRoZSBjb3JyZWN0IGtleWNvZGVzIGZvclxuICAgICAqIGtleXVwL2tleWRvd24gZXZlbnRzXG4gICAgICpcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHZhciBfTUFQID0ge1xuICAgICAgICAgICAgODogJ2JhY2tzcGFjZScsXG4gICAgICAgICAgICA5OiAndGFiJyxcbiAgICAgICAgICAgIDEzOiAnZW50ZXInLFxuICAgICAgICAgICAgMTY6ICdzaGlmdCcsXG4gICAgICAgICAgICAxNzogJ2N0cmwnLFxuICAgICAgICAgICAgMTg6ICdhbHQnLFxuICAgICAgICAgICAgMjA6ICdjYXBzbG9jaycsXG4gICAgICAgICAgICAyNzogJ2VzYycsXG4gICAgICAgICAgICAzMjogJ3NwYWNlJyxcbiAgICAgICAgICAgIDMzOiAncGFnZXVwJyxcbiAgICAgICAgICAgIDM0OiAncGFnZWRvd24nLFxuICAgICAgICAgICAgMzU6ICdlbmQnLFxuICAgICAgICAgICAgMzY6ICdob21lJyxcbiAgICAgICAgICAgIDM3OiAnbGVmdCcsXG4gICAgICAgICAgICAzODogJ3VwJyxcbiAgICAgICAgICAgIDM5OiAncmlnaHQnLFxuICAgICAgICAgICAgNDA6ICdkb3duJyxcbiAgICAgICAgICAgIDQ1OiAnaW5zJyxcbiAgICAgICAgICAgIDQ2OiAnZGVsJyxcbiAgICAgICAgICAgIDkxOiAnbWV0YScsXG4gICAgICAgICAgICA5MzogJ21ldGEnLFxuICAgICAgICAgICAgMjI0OiAnbWV0YSdcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogbWFwcGluZyBmb3Igc3BlY2lhbCBjaGFyYWN0ZXJzIHNvIHRoZXkgY2FuIHN1cHBvcnRcbiAgICAgICAgICpcbiAgICAgICAgICogdGhpcyBkaWN0aW9uYXJ5IGlzIG9ubHkgdXNlZCBpbmNhc2UgeW91IHdhbnQgdG8gYmluZCBhXG4gICAgICAgICAqIGtleXVwIG9yIGtleWRvd24gZXZlbnQgdG8gb25lIG9mIHRoZXNlIGtleXNcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIF9LRVlDT0RFX01BUCA9IHtcbiAgICAgICAgICAgIDEwNjogJyonLFxuICAgICAgICAgICAgMTA3OiAnKycsXG4gICAgICAgICAgICAxMDk6ICctJyxcbiAgICAgICAgICAgIDExMDogJy4nLFxuICAgICAgICAgICAgMTExIDogJy8nLFxuICAgICAgICAgICAgMTg2OiAnOycsXG4gICAgICAgICAgICAxODc6ICc9JyxcbiAgICAgICAgICAgIDE4ODogJywnLFxuICAgICAgICAgICAgMTg5OiAnLScsXG4gICAgICAgICAgICAxOTA6ICcuJyxcbiAgICAgICAgICAgIDE5MTogJy8nLFxuICAgICAgICAgICAgMTkyOiAnYCcsXG4gICAgICAgICAgICAyMTk6ICdbJyxcbiAgICAgICAgICAgIDIyMDogJ1xcXFwnLFxuICAgICAgICAgICAgMjIxOiAnXScsXG4gICAgICAgICAgICAyMjI6ICdcXCcnXG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHRoaXMgaXMgYSBtYXBwaW5nIG9mIGtleXMgdGhhdCByZXF1aXJlIHNoaWZ0IG9uIGEgVVMga2V5cGFkXG4gICAgICAgICAqIGJhY2sgdG8gdGhlIG5vbiBzaGlmdCBlcXVpdmVsZW50c1xuICAgICAgICAgKlxuICAgICAgICAgKiB0aGlzIGlzIHNvIHlvdSBjYW4gdXNlIGtleXVwIGV2ZW50cyB3aXRoIHRoZXNlIGtleXNcbiAgICAgICAgICpcbiAgICAgICAgICogbm90ZSB0aGF0IHRoaXMgd2lsbCBvbmx5IHdvcmsgcmVsaWFibHkgb24gVVMga2V5Ym9hcmRzXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBfU0hJRlRfTUFQID0ge1xuICAgICAgICAgICAgJ34nOiAnYCcsXG4gICAgICAgICAgICAnISc6ICcxJyxcbiAgICAgICAgICAgICdAJzogJzInLFxuICAgICAgICAgICAgJyMnOiAnMycsXG4gICAgICAgICAgICAnJCc6ICc0JyxcbiAgICAgICAgICAgICclJzogJzUnLFxuICAgICAgICAgICAgJ14nOiAnNicsXG4gICAgICAgICAgICAnJic6ICc3JyxcbiAgICAgICAgICAgICcqJzogJzgnLFxuICAgICAgICAgICAgJygnOiAnOScsXG4gICAgICAgICAgICAnKSc6ICcwJyxcbiAgICAgICAgICAgICdfJzogJy0nLFxuICAgICAgICAgICAgJysnOiAnPScsXG4gICAgICAgICAgICAnOic6ICc7JyxcbiAgICAgICAgICAgICdcXFwiJzogJ1xcJycsXG4gICAgICAgICAgICAnPCc6ICcsJyxcbiAgICAgICAgICAgICc+JzogJy4nLFxuICAgICAgICAgICAgJz8nOiAnLycsXG4gICAgICAgICAgICAnfCc6ICdcXFxcJ1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiB0aGlzIGlzIGEgbGlzdCBvZiBzcGVjaWFsIHN0cmluZ3MgeW91IGNhbiB1c2UgdG8gbWFwXG4gICAgICAgICAqIHRvIG1vZGlmaWVyIGtleXMgd2hlbiB5b3Ugc3BlY2lmeSB5b3VyIGtleWJvYXJkIHNob3J0Y3V0c1xuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgX1NQRUNJQUxfQUxJQVNFUyA9IHtcbiAgICAgICAgICAgICdvcHRpb24nOiAnYWx0JyxcbiAgICAgICAgICAgICdjb21tYW5kJzogJ21ldGEnLFxuICAgICAgICAgICAgJ3JldHVybic6ICdlbnRlcicsXG4gICAgICAgICAgICAnZXNjYXBlJzogJ2VzYydcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogdmFyaWFibGUgdG8gc3RvcmUgdGhlIGZsaXBwZWQgdmVyc2lvbiBvZiBfTUFQIGZyb20gYWJvdmVcbiAgICAgICAgICogbmVlZGVkIHRvIGNoZWNrIGlmIHdlIHNob3VsZCB1c2Uga2V5cHJlc3Mgb3Igbm90IHdoZW4gbm8gYWN0aW9uXG4gICAgICAgICAqIGlzIHNwZWNpZmllZFxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fHVuZGVmaW5lZH1cbiAgICAgICAgICovXG4gICAgICAgIF9SRVZFUlNFX01BUCxcblxuICAgICAgICAvKipcbiAgICAgICAgICogYSBsaXN0IG9mIGFsbCB0aGUgY2FsbGJhY2tzIHNldHVwIHZpYSBNb3VzZXRyYXAuYmluZCgpXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBfY2FsbGJhY2tzID0ge30sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIGRpcmVjdCBtYXAgb2Ygc3RyaW5nIGNvbWJpbmF0aW9ucyB0byBjYWxsYmFja3MgdXNlZCBmb3IgdHJpZ2dlcigpXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBfZGlyZWN0X21hcCA9IHt9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBrZWVwcyB0cmFjayBvZiB3aGF0IGxldmVsIGVhY2ggc2VxdWVuY2UgaXMgYXQgc2luY2UgbXVsdGlwbGVcbiAgICAgICAgICogc2VxdWVuY2VzIGNhbiBzdGFydCBvdXQgd2l0aCB0aGUgc2FtZSBzZXF1ZW5jZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgX3NlcXVlbmNlX2xldmVscyA9IHt9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiB2YXJpYWJsZSB0byBzdG9yZSB0aGUgc2V0VGltZW91dCBjYWxsXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtudWxsfG51bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIF9yZXNldF90aW1lcixcblxuICAgICAgICAvKipcbiAgICAgICAgICogdGVtcG9yYXJ5IHN0YXRlIHdoZXJlIHdlIHdpbGwgaWdub3JlIHRoZSBuZXh0IGtleXVwXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufHN0cmluZ31cbiAgICAgICAgICovXG4gICAgICAgIF9pZ25vcmVfbmV4dF9rZXl1cCA9IGZhbHNlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBhcmUgd2UgY3VycmVudGx5IGluc2lkZSBvZiBhIHNlcXVlbmNlP1xuICAgICAgICAgKiB0eXBlIG9mIGFjdGlvbiAoXCJrZXl1cFwiIG9yIFwia2V5ZG93blwiIG9yIFwia2V5cHJlc3NcIikgb3IgZmFsc2VcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW58c3RyaW5nfVxuICAgICAgICAgKi9cbiAgICAgICAgX2luc2lkZV9zZXF1ZW5jZSA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogbG9vcCB0aHJvdWdoIHRoZSBmIGtleXMsIGYxIHRvIGYxOSBhbmQgYWRkIHRoZW0gdG8gdGhlIG1hcFxuICAgICAqIHByb2dyYW1hdGljYWxseVxuICAgICAqL1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgMjA7ICsraSkge1xuICAgICAgICBfTUFQWzExMSArIGldID0gJ2YnICsgaTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBsb29wIHRocm91Z2ggdG8gbWFwIG51bWJlcnMgb24gdGhlIG51bWVyaWMga2V5cGFkXG4gICAgICovXG4gICAgZm9yIChpID0gMDsgaSA8PSA5OyArK2kpIHtcbiAgICAgICAgX01BUFtpICsgOTZdID0gaTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjcm9zcyBicm93c2VyIGFkZCBldmVudCBtZXRob2RcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RWxlbWVudHxIVE1MRG9jdW1lbnR9IG9iamVjdFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2FkZEV2ZW50KG9iamVjdCwgdHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKG9iamVjdC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICBvYmplY3QuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgZmFsc2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgb2JqZWN0LmF0dGFjaEV2ZW50KCdvbicgKyB0eXBlLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogdGFrZXMgdGhlIGV2ZW50IGFuZCByZXR1cm5zIHRoZSBrZXkgY2hhcmFjdGVyXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICogQHJldHVybiB7c3RyaW5nfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9jaGFyYWN0ZXJGcm9tRXZlbnQoZSkge1xuXG4gICAgICAgIC8vIGZvciBrZXlwcmVzcyBldmVudHMgd2Ugc2hvdWxkIHJldHVybiB0aGUgY2hhcmFjdGVyIGFzIGlzXG4gICAgICAgIGlmIChlLnR5cGUgPT0gJ2tleXByZXNzJykge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoZS53aGljaCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmb3Igbm9uIGtleXByZXNzIGV2ZW50cyB0aGUgc3BlY2lhbCBtYXBzIGFyZSBuZWVkZWRcbiAgICAgICAgaWYgKF9NQVBbZS53aGljaF0pIHtcbiAgICAgICAgICAgIHJldHVybiBfTUFQW2Uud2hpY2hdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF9LRVlDT0RFX01BUFtlLndoaWNoXSkge1xuICAgICAgICAgICAgcmV0dXJuIF9LRVlDT0RFX01BUFtlLndoaWNoXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIGl0IGlzIG5vdCBpbiB0aGUgc3BlY2lhbCBtYXBcbiAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoZS53aGljaCkudG9Mb3dlckNhc2UoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjaGVja3MgaWYgdHdvIGFycmF5cyBhcmUgZXF1YWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG1vZGlmaWVyczFcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBtb2RpZmllcnMyXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gX21vZGlmaWVyc01hdGNoKG1vZGlmaWVyczEsIG1vZGlmaWVyczIpIHtcbiAgICAgICAgcmV0dXJuIG1vZGlmaWVyczEuc29ydCgpLmpvaW4oJywnKSA9PT0gbW9kaWZpZXJzMi5zb3J0KCkuam9pbignLCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJlc2V0cyBhbGwgc2VxdWVuY2UgY291bnRlcnMgZXhjZXB0IGZvciB0aGUgb25lcyBwYXNzZWQgaW5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkb19ub3RfcmVzZXRcbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gX3Jlc2V0U2VxdWVuY2VzKGRvX25vdF9yZXNldCkge1xuICAgICAgICBkb19ub3RfcmVzZXQgPSBkb19ub3RfcmVzZXQgfHwge307XG5cbiAgICAgICAgdmFyIGFjdGl2ZV9zZXF1ZW5jZXMgPSBmYWxzZSxcbiAgICAgICAgICAgIGtleTtcblxuICAgICAgICBmb3IgKGtleSBpbiBfc2VxdWVuY2VfbGV2ZWxzKSB7XG4gICAgICAgICAgICBpZiAoZG9fbm90X3Jlc2V0W2tleV0pIHtcbiAgICAgICAgICAgICAgICBhY3RpdmVfc2VxdWVuY2VzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9zZXF1ZW5jZV9sZXZlbHNba2V5XSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWFjdGl2ZV9zZXF1ZW5jZXMpIHtcbiAgICAgICAgICAgIF9pbnNpZGVfc2VxdWVuY2UgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGZpbmRzIGFsbCBjYWxsYmFja3MgdGhhdCBtYXRjaCBiYXNlZCBvbiB0aGUga2V5Y29kZSwgbW9kaWZpZXJzLFxuICAgICAqIGFuZCBhY3Rpb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjaGFyYWN0ZXJcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBtb2RpZmllcnNcbiAgICAgKiBAcGFyYW0ge0V2ZW50fE9iamVjdH0gZVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbj19IHJlbW92ZSAtIHNob3VsZCB3ZSByZW1vdmUgYW55IG1hdGNoZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZz19IGNvbWJpbmF0aW9uXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRNYXRjaGVzKGNoYXJhY3RlciwgbW9kaWZpZXJzLCBlLCByZW1vdmUsIGNvbWJpbmF0aW9uKSB7XG4gICAgICAgIHZhciBpLFxuICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgICAgICBtYXRjaGVzID0gW10sXG4gICAgICAgICAgICBhY3Rpb24gPSBlLnR5cGU7XG5cbiAgICAgICAgLy8gaWYgdGhlcmUgYXJlIG5vIGV2ZW50cyByZWxhdGVkIHRvIHRoaXMga2V5Y29kZVxuICAgICAgICBpZiAoIV9jYWxsYmFja3NbY2hhcmFjdGVyXSkge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgYSBtb2RpZmllciBrZXkgaXMgY29taW5nIHVwIG9uIGl0cyBvd24gd2Ugc2hvdWxkIGFsbG93IGl0XG4gICAgICAgIGlmIChhY3Rpb24gPT0gJ2tleXVwJyAmJiBfaXNNb2RpZmllcihjaGFyYWN0ZXIpKSB7XG4gICAgICAgICAgICBtb2RpZmllcnMgPSBbY2hhcmFjdGVyXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGxvb3AgdGhyb3VnaCBhbGwgY2FsbGJhY2tzIGZvciB0aGUga2V5IHRoYXQgd2FzIHByZXNzZWRcbiAgICAgICAgLy8gYW5kIHNlZSBpZiBhbnkgb2YgdGhlbSBtYXRjaFxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgX2NhbGxiYWNrc1tjaGFyYWN0ZXJdLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IF9jYWxsYmFja3NbY2hhcmFjdGVyXVtpXTtcblxuICAgICAgICAgICAgLy8gaWYgdGhpcyBpcyBhIHNlcXVlbmNlIGJ1dCBpdCBpcyBub3QgYXQgdGhlIHJpZ2h0IGxldmVsXG4gICAgICAgICAgICAvLyB0aGVuIG1vdmUgb250byB0aGUgbmV4dCBtYXRjaFxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrLnNlcSAmJiBfc2VxdWVuY2VfbGV2ZWxzW2NhbGxiYWNrLnNlcV0gIT0gY2FsbGJhY2subGV2ZWwpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdGhlIGFjdGlvbiB3ZSBhcmUgbG9va2luZyBmb3IgZG9lc24ndCBtYXRjaCB0aGUgYWN0aW9uIHdlIGdvdFxuICAgICAgICAgICAgLy8gdGhlbiB3ZSBzaG91bGQga2VlcCBnb2luZ1xuICAgICAgICAgICAgaWYgKGFjdGlvbiAhPSBjYWxsYmFjay5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdGhpcyBpcyBhIGtleXByZXNzIGV2ZW50IGFuZCB0aGUgbWV0YSBrZXkgYW5kIGNvbnRyb2wga2V5XG4gICAgICAgICAgICAvLyBhcmUgbm90IHByZXNzZWQgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gb25seSBsb29rIGF0IHRoZVxuICAgICAgICAgICAgLy8gY2hhcmFjdGVyLCBvdGhlcndpc2UgY2hlY2sgdGhlIG1vZGlmaWVycyBhcyB3ZWxsXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gY2hyb21lIHdpbGwgbm90IGZpcmUgYSBrZXlwcmVzcyBpZiBtZXRhIG9yIGNvbnRyb2wgaXMgZG93blxuICAgICAgICAgICAgLy8gc2FmYXJpIHdpbGwgZmlyZSBhIGtleXByZXNzIGlmIG1ldGEgb3IgbWV0YStzaGlmdCBpcyBkb3duXG4gICAgICAgICAgICAvLyBmaXJlZm94IHdpbGwgZmlyZSBhIGtleXByZXNzIGlmIG1ldGEgb3IgY29udHJvbCBpcyBkb3duXG4gICAgICAgICAgICBpZiAoKGFjdGlvbiA9PSAna2V5cHJlc3MnICYmICFlLm1ldGFLZXkgJiYgIWUuY3RybEtleSkgfHwgX21vZGlmaWVyc01hdGNoKG1vZGlmaWVycywgY2FsbGJhY2subW9kaWZpZXJzKSkge1xuXG4gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGlzIHVzZWQgc28gaWYgeW91IGNoYW5nZSB5b3VyIG1pbmQgYW5kIGNhbGwgYmluZCBhXG4gICAgICAgICAgICAgICAgLy8gc2Vjb25kIHRpbWUgd2l0aCBhIG5ldyBmdW5jdGlvbiB0aGUgZmlyc3Qgb25lIGlzIG92ZXJ3cml0dGVuXG4gICAgICAgICAgICAgICAgaWYgKHJlbW92ZSAmJiBjYWxsYmFjay5jb21ibyA9PSBjb21iaW5hdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBfY2FsbGJhY2tzW2NoYXJhY3Rlcl0uc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG1hdGNoZXMucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbWF0Y2hlcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiB0YWtlcyBhIGtleSBldmVudCBhbmQgZmlndXJlcyBvdXQgd2hhdCB0aGUgbW9kaWZpZXJzIGFyZVxuICAgICAqXG4gICAgICogQHBhcmFtIHtFdmVudH0gZVxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZXZlbnRNb2RpZmllcnMoZSkge1xuICAgICAgICB2YXIgbW9kaWZpZXJzID0gW107XG5cbiAgICAgICAgaWYgKGUuc2hpZnRLZXkpIHtcbiAgICAgICAgICAgIG1vZGlmaWVycy5wdXNoKCdzaGlmdCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGUuYWx0S2V5KSB7XG4gICAgICAgICAgICBtb2RpZmllcnMucHVzaCgnYWx0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZS5jdHJsS2V5KSB7XG4gICAgICAgICAgICBtb2RpZmllcnMucHVzaCgnY3RybCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGUubWV0YUtleSkge1xuICAgICAgICAgICAgbW9kaWZpZXJzLnB1c2goJ21ldGEnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtb2RpZmllcnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogYWN0dWFsbHkgY2FsbHMgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICpcbiAgICAgKiBpZiB5b3VyIGNhbGxiYWNrIGZ1bmN0aW9uIHJldHVybnMgZmFsc2UgdGhpcyB3aWxsIHVzZSB0aGUganF1ZXJ5XG4gICAgICogY29udmVudGlvbiAtIHByZXZlbnQgZGVmYXVsdCBhbmQgc3RvcCBwcm9wb2dhdGlvbiBvbiB0aGUgZXZlbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtFdmVudH0gZVxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZmlyZUNhbGxiYWNrKGNhbGxiYWNrLCBlKSB7XG4gICAgICAgIGlmIChjYWxsYmFjayhlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGlmIChlLnByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZS5zdG9wUHJvcGFnYXRpb24pIHtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlLnJldHVyblZhbHVlID0gZmFsc2U7XG4gICAgICAgICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBoYW5kbGVzIGEgY2hhcmFjdGVyIGtleSBldmVudFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNoYXJhY3RlclxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGVcbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2hhbmRsZUNoYXJhY3RlcihjaGFyYWN0ZXIsIGUpIHtcblxuICAgICAgICAvLyBpZiB0aGlzIGV2ZW50IHNob3VsZCBub3QgaGFwcGVuIHN0b3AgaGVyZVxuICAgICAgICBpZiAoTW91c2V0cmFwLnN0b3BDYWxsYmFjayhlLCBlLnRhcmdldCB8fCBlLnNyY0VsZW1lbnQpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2FsbGJhY2tzID0gX2dldE1hdGNoZXMoY2hhcmFjdGVyLCBfZXZlbnRNb2RpZmllcnMoZSksIGUpLFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIGRvX25vdF9yZXNldCA9IHt9LFxuICAgICAgICAgICAgcHJvY2Vzc2VkX3NlcXVlbmNlX2NhbGxiYWNrID0gZmFsc2U7XG5cbiAgICAgICAgLy8gbG9vcCB0aHJvdWdoIG1hdGNoaW5nIGNhbGxiYWNrcyBmb3IgdGhpcyBrZXkgZXZlbnRcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7ICsraSkge1xuXG4gICAgICAgICAgICAvLyBmaXJlIGZvciBhbGwgc2VxdWVuY2UgY2FsbGJhY2tzXG4gICAgICAgICAgICAvLyB0aGlzIGlzIGJlY2F1c2UgaWYgZm9yIGV4YW1wbGUgeW91IGhhdmUgbXVsdGlwbGUgc2VxdWVuY2VzXG4gICAgICAgICAgICAvLyBib3VuZCBzdWNoIGFzIFwiZyBpXCIgYW5kIFwiZyB0XCIgdGhleSBib3RoIG5lZWQgdG8gZmlyZSB0aGVcbiAgICAgICAgICAgIC8vIGNhbGxiYWNrIGZvciBtYXRjaGluZyBnIGNhdXNlIG90aGVyd2lzZSB5b3UgY2FuIG9ubHkgZXZlclxuICAgICAgICAgICAgLy8gbWF0Y2ggdGhlIGZpcnN0IG9uZVxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrc1tpXS5zZXEpIHtcbiAgICAgICAgICAgICAgICBwcm9jZXNzZWRfc2VxdWVuY2VfY2FsbGJhY2sgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgLy8ga2VlcCBhIGxpc3Qgb2Ygd2hpY2ggc2VxdWVuY2VzIHdlcmUgbWF0Y2hlcyBmb3IgbGF0ZXJcbiAgICAgICAgICAgICAgICBkb19ub3RfcmVzZXRbY2FsbGJhY2tzW2ldLnNlcV0gPSAxO1xuICAgICAgICAgICAgICAgIF9maXJlQ2FsbGJhY2soY2FsbGJhY2tzW2ldLmNhbGxiYWNrLCBlKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdGhlcmUgd2VyZSBubyBzZXF1ZW5jZSBtYXRjaGVzIGJ1dCB3ZSBhcmUgc3RpbGwgaGVyZVxuICAgICAgICAgICAgLy8gdGhhdCBtZWFucyB0aGlzIGlzIGEgcmVndWxhciBtYXRjaCBzbyB3ZSBzaG91bGQgZmlyZSB0aGF0XG4gICAgICAgICAgICBpZiAoIXByb2Nlc3NlZF9zZXF1ZW5jZV9jYWxsYmFjayAmJiAhX2luc2lkZV9zZXF1ZW5jZSkge1xuICAgICAgICAgICAgICAgIF9maXJlQ2FsbGJhY2soY2FsbGJhY2tzW2ldLmNhbGxiYWNrLCBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHlvdSBhcmUgaW5zaWRlIG9mIGEgc2VxdWVuY2UgYW5kIHRoZSBrZXkgeW91IGFyZSBwcmVzc2luZ1xuICAgICAgICAvLyBpcyBub3QgYSBtb2RpZmllciBrZXkgdGhlbiB3ZSBzaG91bGQgcmVzZXQgYWxsIHNlcXVlbmNlc1xuICAgICAgICAvLyB0aGF0IHdlcmUgbm90IG1hdGNoZWQgYnkgdGhpcyBrZXkgZXZlbnRcbiAgICAgICAgaWYgKGUudHlwZSA9PSBfaW5zaWRlX3NlcXVlbmNlICYmICFfaXNNb2RpZmllcihjaGFyYWN0ZXIpKSB7XG4gICAgICAgICAgICBfcmVzZXRTZXF1ZW5jZXMoZG9fbm90X3Jlc2V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGhhbmRsZXMgYSBrZXlkb3duIGV2ZW50XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9oYW5kbGVLZXkoZSkge1xuXG4gICAgICAgIC8vIG5vcm1hbGl6ZSBlLndoaWNoIGZvciBrZXkgZXZlbnRzXG4gICAgICAgIC8vIEBzZWUgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80Mjg1NjI3L2phdmFzY3JpcHQta2V5Y29kZS12cy1jaGFyY29kZS11dHRlci1jb25mdXNpb25cbiAgICAgICAgZS53aGljaCA9IHR5cGVvZiBlLndoaWNoID09IFwibnVtYmVyXCIgPyBlLndoaWNoIDogZS5rZXlDb2RlO1xuXG4gICAgICAgIHZhciBjaGFyYWN0ZXIgPSBfY2hhcmFjdGVyRnJvbUV2ZW50KGUpO1xuXG4gICAgICAgIC8vIG5vIGNoYXJhY3RlciBmb3VuZCB0aGVuIHN0b3BcbiAgICAgICAgaWYgKCFjaGFyYWN0ZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlLnR5cGUgPT0gJ2tleXVwJyAmJiBfaWdub3JlX25leHRfa2V5dXAgPT0gY2hhcmFjdGVyKSB7XG4gICAgICAgICAgICBfaWdub3JlX25leHRfa2V5dXAgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIF9oYW5kbGVDaGFyYWN0ZXIoY2hhcmFjdGVyLCBlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkZXRlcm1pbmVzIGlmIHRoZSBrZXljb2RlIHNwZWNpZmllZCBpcyBhIG1vZGlmaWVyIGtleSBvciBub3RcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfaXNNb2RpZmllcihrZXkpIHtcbiAgICAgICAgcmV0dXJuIGtleSA9PSAnc2hpZnQnIHx8IGtleSA9PSAnY3RybCcgfHwga2V5ID09ICdhbHQnIHx8IGtleSA9PSAnbWV0YSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY2FsbGVkIHRvIHNldCBhIDEgc2Vjb25kIHRpbWVvdXQgb24gdGhlIHNwZWNpZmllZCBzZXF1ZW5jZVxuICAgICAqXG4gICAgICogdGhpcyBpcyBzbyBhZnRlciBlYWNoIGtleSBwcmVzcyBpbiB0aGUgc2VxdWVuY2UgeW91IGhhdmUgMSBzZWNvbmRcbiAgICAgKiB0byBwcmVzcyB0aGUgbmV4dCBrZXkgYmVmb3JlIHlvdSBoYXZlIHRvIHN0YXJ0IG92ZXJcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfcmVzZXRTZXF1ZW5jZVRpbWVyKCkge1xuICAgICAgICBjbGVhclRpbWVvdXQoX3Jlc2V0X3RpbWVyKTtcbiAgICAgICAgX3Jlc2V0X3RpbWVyID0gc2V0VGltZW91dChfcmVzZXRTZXF1ZW5jZXMsIDEwMDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJldmVyc2VzIHRoZSBtYXAgbG9va3VwIHNvIHRoYXQgd2UgY2FuIGxvb2sgZm9yIHNwZWNpZmljIGtleXNcbiAgICAgKiB0byBzZWUgd2hhdCBjYW4gYW5kIGNhbid0IHVzZSBrZXlwcmVzc1xuICAgICAqXG4gICAgICogQHJldHVybiB7T2JqZWN0fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRSZXZlcnNlTWFwKCkge1xuICAgICAgICBpZiAoIV9SRVZFUlNFX01BUCkge1xuICAgICAgICAgICAgX1JFVkVSU0VfTUFQID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gX01BUCkge1xuXG4gICAgICAgICAgICAgICAgLy8gcHVsbCBvdXQgdGhlIG51bWVyaWMga2V5cGFkIGZyb20gaGVyZSBjYXVzZSBrZXlwcmVzcyBzaG91bGRcbiAgICAgICAgICAgICAgICAvLyBiZSBhYmxlIHRvIGRldGVjdCB0aGUga2V5cyBmcm9tIHRoZSBjaGFyYWN0ZXJcbiAgICAgICAgICAgICAgICBpZiAoa2V5ID4gOTUgJiYga2V5IDwgMTEyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChfTUFQLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgX1JFVkVSU0VfTUFQW19NQVBba2V5XV0gPSBrZXk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBfUkVWRVJTRV9NQVA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcGlja3MgdGhlIGJlc3QgYWN0aW9uIGJhc2VkIG9uIHRoZSBrZXkgY29tYmluYXRpb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgLSBjaGFyYWN0ZXIgZm9yIGtleVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG1vZGlmaWVyc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nPX0gYWN0aW9uIHBhc3NlZCBpblxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9waWNrQmVzdEFjdGlvbihrZXksIG1vZGlmaWVycywgYWN0aW9uKSB7XG5cbiAgICAgICAgLy8gaWYgbm8gYWN0aW9uIHdhcyBwaWNrZWQgaW4gd2Ugc2hvdWxkIHRyeSB0byBwaWNrIHRoZSBvbmVcbiAgICAgICAgLy8gdGhhdCB3ZSB0aGluayB3b3VsZCB3b3JrIGJlc3QgZm9yIHRoaXMga2V5XG4gICAgICAgIGlmICghYWN0aW9uKSB7XG4gICAgICAgICAgICBhY3Rpb24gPSBfZ2V0UmV2ZXJzZU1hcCgpW2tleV0gPyAna2V5ZG93bicgOiAna2V5cHJlc3MnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbW9kaWZpZXIga2V5cyBkb24ndCB3b3JrIGFzIGV4cGVjdGVkIHdpdGgga2V5cHJlc3MsXG4gICAgICAgIC8vIHN3aXRjaCB0byBrZXlkb3duXG4gICAgICAgIGlmIChhY3Rpb24gPT0gJ2tleXByZXNzJyAmJiBtb2RpZmllcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhY3Rpb24gPSAna2V5ZG93bic7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGJpbmRzIGEga2V5IHNlcXVlbmNlIHRvIGFuIGV2ZW50XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29tYm8gLSBjb21ibyBzcGVjaWZpZWQgaW4gYmluZCBjYWxsXG4gICAgICogQHBhcmFtIHtBcnJheX0ga2V5c1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtzdHJpbmc9fSBhY3Rpb25cbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2JpbmRTZXF1ZW5jZShjb21ibywga2V5cywgY2FsbGJhY2ssIGFjdGlvbikge1xuXG4gICAgICAgIC8vIHN0YXJ0IG9mZiBieSBhZGRpbmcgYSBzZXF1ZW5jZSBsZXZlbCByZWNvcmQgZm9yIHRoaXMgY29tYmluYXRpb25cbiAgICAgICAgLy8gYW5kIHNldHRpbmcgdGhlIGxldmVsIHRvIDBcbiAgICAgICAgX3NlcXVlbmNlX2xldmVsc1tjb21ib10gPSAwO1xuXG4gICAgICAgIC8vIGlmIHRoZXJlIGlzIG5vIGFjdGlvbiBwaWNrIHRoZSBiZXN0IG9uZSBmb3IgdGhlIGZpcnN0IGtleVxuICAgICAgICAvLyBpbiB0aGUgc2VxdWVuY2VcbiAgICAgICAgaWYgKCFhY3Rpb24pIHtcbiAgICAgICAgICAgIGFjdGlvbiA9IF9waWNrQmVzdEFjdGlvbihrZXlzWzBdLCBbXSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogY2FsbGJhY2sgdG8gaW5jcmVhc2UgdGhlIHNlcXVlbmNlIGxldmVsIGZvciB0aGlzIHNlcXVlbmNlIGFuZCByZXNldFxuICAgICAgICAgKiBhbGwgb3RoZXIgc2VxdWVuY2VzIHRoYXQgd2VyZSBhY3RpdmVcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZVxuICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgX2luY3JlYXNlU2VxdWVuY2UgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgX2luc2lkZV9zZXF1ZW5jZSA9IGFjdGlvbjtcbiAgICAgICAgICAgICAgICArK19zZXF1ZW5jZV9sZXZlbHNbY29tYm9dO1xuICAgICAgICAgICAgICAgIF9yZXNldFNlcXVlbmNlVGltZXIoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogd3JhcHMgdGhlIHNwZWNpZmllZCBjYWxsYmFjayBpbnNpZGUgb2YgYW5vdGhlciBmdW5jdGlvbiBpbiBvcmRlclxuICAgICAgICAgICAgICogdG8gcmVzZXQgYWxsIHNlcXVlbmNlIGNvdW50ZXJzIGFzIHNvb24gYXMgdGhpcyBzZXF1ZW5jZSBpcyBkb25lXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZVxuICAgICAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfY2FsbGJhY2tBbmRSZXNldCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBfZmlyZUNhbGxiYWNrKGNhbGxiYWNrLCBlKTtcblxuICAgICAgICAgICAgICAgIC8vIHdlIHNob3VsZCBpZ25vcmUgdGhlIG5leHQga2V5IHVwIGlmIHRoZSBhY3Rpb24gaXMga2V5IGRvd25cbiAgICAgICAgICAgICAgICAvLyBvciBrZXlwcmVzcy4gIHRoaXMgaXMgc28gaWYgeW91IGZpbmlzaCBhIHNlcXVlbmNlIGFuZFxuICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgdGhlIGtleSB0aGUgZmluYWwga2V5IHdpbGwgbm90IHRyaWdnZXIgYSBrZXl1cFxuICAgICAgICAgICAgICAgIGlmIChhY3Rpb24gIT09ICdrZXl1cCcpIHtcbiAgICAgICAgICAgICAgICAgICAgX2lnbm9yZV9uZXh0X2tleXVwID0gX2NoYXJhY3RlckZyb21FdmVudChlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyB3ZWlyZCByYWNlIGNvbmRpdGlvbiBpZiBhIHNlcXVlbmNlIGVuZHMgd2l0aCB0aGUga2V5XG4gICAgICAgICAgICAgICAgLy8gYW5vdGhlciBzZXF1ZW5jZSBiZWdpbnMgd2l0aFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoX3Jlc2V0U2VxdWVuY2VzLCAxMCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaTtcblxuICAgICAgICAvLyBsb29wIHRocm91Z2gga2V5cyBvbmUgYXQgYSB0aW1lIGFuZCBiaW5kIHRoZSBhcHByb3ByaWF0ZSBjYWxsYmFja1xuICAgICAgICAvLyBmdW5jdGlvbi4gIGZvciBhbnkga2V5IGxlYWRpbmcgdXAgdG8gdGhlIGZpbmFsIG9uZSBpdCBzaG91bGRcbiAgICAgICAgLy8gaW5jcmVhc2UgdGhlIHNlcXVlbmNlLiBhZnRlciB0aGUgZmluYWwsIGl0IHNob3VsZCByZXNldCBhbGwgc2VxdWVuY2VzXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBfYmluZFNpbmdsZShrZXlzW2ldLCBpIDwga2V5cy5sZW5ndGggLSAxID8gX2luY3JlYXNlU2VxdWVuY2UgOiBfY2FsbGJhY2tBbmRSZXNldCwgYWN0aW9uLCBjb21ibywgaSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBiaW5kcyBhIHNpbmdsZSBrZXlib2FyZCBjb21iaW5hdGlvblxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbWJpbmF0aW9uXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge3N0cmluZz19IGFjdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nPX0gc2VxdWVuY2VfbmFtZSAtIG5hbWUgb2Ygc2VxdWVuY2UgaWYgcGFydCBvZiBzZXF1ZW5jZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyPX0gbGV2ZWwgLSB3aGF0IHBhcnQgb2YgdGhlIHNlcXVlbmNlIHRoZSBjb21tYW5kIGlzXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9iaW5kU2luZ2xlKGNvbWJpbmF0aW9uLCBjYWxsYmFjaywgYWN0aW9uLCBzZXF1ZW5jZV9uYW1lLCBsZXZlbCkge1xuXG4gICAgICAgIC8vIG1ha2Ugc3VyZSBtdWx0aXBsZSBzcGFjZXMgaW4gYSByb3cgYmVjb21lIGEgc2luZ2xlIHNwYWNlXG4gICAgICAgIGNvbWJpbmF0aW9uID0gY29tYmluYXRpb24ucmVwbGFjZSgvXFxzKy9nLCAnICcpO1xuXG4gICAgICAgIHZhciBzZXF1ZW5jZSA9IGNvbWJpbmF0aW9uLnNwbGl0KCcgJyksXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAga2V5LFxuICAgICAgICAgICAga2V5cyxcbiAgICAgICAgICAgIG1vZGlmaWVycyA9IFtdO1xuXG4gICAgICAgIC8vIGlmIHRoaXMgcGF0dGVybiBpcyBhIHNlcXVlbmNlIG9mIGtleXMgdGhlbiBydW4gdGhyb3VnaCB0aGlzIG1ldGhvZFxuICAgICAgICAvLyB0byByZXByb2Nlc3MgZWFjaCBwYXR0ZXJuIG9uZSBrZXkgYXQgYSB0aW1lXG4gICAgICAgIGlmIChzZXF1ZW5jZS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBfYmluZFNlcXVlbmNlKGNvbWJpbmF0aW9uLCBzZXF1ZW5jZSwgY2FsbGJhY2ssIGFjdGlvbik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0YWtlIHRoZSBrZXlzIGZyb20gdGhpcyBwYXR0ZXJuIGFuZCBmaWd1cmUgb3V0IHdoYXQgdGhlIGFjdHVhbFxuICAgICAgICAvLyBwYXR0ZXJuIGlzIGFsbCBhYm91dFxuICAgICAgICBrZXlzID0gY29tYmluYXRpb24gPT09ICcrJyA/IFsnKyddIDogY29tYmluYXRpb24uc3BsaXQoJysnKTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAga2V5ID0ga2V5c1tpXTtcblxuICAgICAgICAgICAgLy8gbm9ybWFsaXplIGtleSBuYW1lc1xuICAgICAgICAgICAgaWYgKF9TUEVDSUFMX0FMSUFTRVNba2V5XSkge1xuICAgICAgICAgICAgICAgIGtleSA9IF9TUEVDSUFMX0FMSUFTRVNba2V5XTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdGhpcyBpcyBub3QgYSBrZXlwcmVzcyBldmVudCB0aGVuIHdlIHNob3VsZFxuICAgICAgICAgICAgLy8gYmUgc21hcnQgYWJvdXQgdXNpbmcgc2hpZnQga2V5c1xuICAgICAgICAgICAgLy8gdGhpcyB3aWxsIG9ubHkgd29yayBmb3IgVVMga2V5Ym9hcmRzIGhvd2V2ZXJcbiAgICAgICAgICAgIGlmIChhY3Rpb24gJiYgYWN0aW9uICE9ICdrZXlwcmVzcycgJiYgX1NISUZUX01BUFtrZXldKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gX1NISUZUX01BUFtrZXldO1xuICAgICAgICAgICAgICAgIG1vZGlmaWVycy5wdXNoKCdzaGlmdCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGlzIGtleSBpcyBhIG1vZGlmaWVyIHRoZW4gYWRkIGl0IHRvIHRoZSBsaXN0IG9mIG1vZGlmaWVyc1xuICAgICAgICAgICAgaWYgKF9pc01vZGlmaWVyKGtleSkpIHtcbiAgICAgICAgICAgICAgICBtb2RpZmllcnMucHVzaChrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gZGVwZW5kaW5nIG9uIHdoYXQgdGhlIGtleSBjb21iaW5hdGlvbiBpc1xuICAgICAgICAvLyB3ZSB3aWxsIHRyeSB0byBwaWNrIHRoZSBiZXN0IGV2ZW50IGZvciBpdFxuICAgICAgICBhY3Rpb24gPSBfcGlja0Jlc3RBY3Rpb24oa2V5LCBtb2RpZmllcnMsIGFjdGlvbik7XG5cbiAgICAgICAgLy8gbWFrZSBzdXJlIHRvIGluaXRpYWxpemUgYXJyYXkgaWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZVxuICAgICAgICAvLyBhIGNhbGxiYWNrIGlzIGFkZGVkIGZvciB0aGlzIGtleVxuICAgICAgICBpZiAoIV9jYWxsYmFja3Nba2V5XSkge1xuICAgICAgICAgICAgX2NhbGxiYWNrc1trZXldID0gW107XG4gICAgICAgIH1cblxuICAgICAgICAvLyByZW1vdmUgYW4gZXhpc3RpbmcgbWF0Y2ggaWYgdGhlcmUgaXMgb25lXG4gICAgICAgIF9nZXRNYXRjaGVzKGtleSwgbW9kaWZpZXJzLCB7dHlwZTogYWN0aW9ufSwgIXNlcXVlbmNlX25hbWUsIGNvbWJpbmF0aW9uKTtcblxuICAgICAgICAvLyBhZGQgdGhpcyBjYWxsIGJhY2sgdG8gdGhlIGFycmF5XG4gICAgICAgIC8vIGlmIGl0IGlzIGEgc2VxdWVuY2UgcHV0IGl0IGF0IHRoZSBiZWdpbm5pbmdcbiAgICAgICAgLy8gaWYgbm90IHB1dCBpdCBhdCB0aGUgZW5kXG4gICAgICAgIC8vXG4gICAgICAgIC8vIHRoaXMgaXMgaW1wb3J0YW50IGJlY2F1c2UgdGhlIHdheSB0aGVzZSBhcmUgcHJvY2Vzc2VkIGV4cGVjdHNcbiAgICAgICAgLy8gdGhlIHNlcXVlbmNlIG9uZXMgdG8gY29tZSBmaXJzdFxuICAgICAgICBfY2FsbGJhY2tzW2tleV1bc2VxdWVuY2VfbmFtZSA/ICd1bnNoaWZ0JyA6ICdwdXNoJ10oe1xuICAgICAgICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrLFxuICAgICAgICAgICAgbW9kaWZpZXJzOiBtb2RpZmllcnMsXG4gICAgICAgICAgICBhY3Rpb246IGFjdGlvbixcbiAgICAgICAgICAgIHNlcTogc2VxdWVuY2VfbmFtZSxcbiAgICAgICAgICAgIGxldmVsOiBsZXZlbCxcbiAgICAgICAgICAgIGNvbWJvOiBjb21iaW5hdGlvblxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBiaW5kcyBtdWx0aXBsZSBjb21iaW5hdGlvbnMgdG8gdGhlIHNhbWUgY2FsbGJhY2tcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvbWJpbmF0aW9uc1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtzdHJpbmd8dW5kZWZpbmVkfSBhY3Rpb25cbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2JpbmRNdWx0aXBsZShjb21iaW5hdGlvbnMsIGNhbGxiYWNrLCBhY3Rpb24pIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb21iaW5hdGlvbnMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIF9iaW5kU2luZ2xlKGNvbWJpbmF0aW9uc1tpXSwgY2FsbGJhY2ssIGFjdGlvbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzdGFydCFcbiAgICBfYWRkRXZlbnQoZG9jdW1lbnQsICdrZXlwcmVzcycsIF9oYW5kbGVLZXkpO1xuICAgIF9hZGRFdmVudChkb2N1bWVudCwgJ2tleWRvd24nLCBfaGFuZGxlS2V5KTtcbiAgICBfYWRkRXZlbnQoZG9jdW1lbnQsICdrZXl1cCcsIF9oYW5kbGVLZXkpO1xuXG4gICAgdmFyIE1vdXNldHJhcCA9IHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogYmluZHMgYW4gZXZlbnQgdG8gbW91c2V0cmFwXG4gICAgICAgICAqXG4gICAgICAgICAqIGNhbiBiZSBhIHNpbmdsZSBrZXksIGEgY29tYmluYXRpb24gb2Yga2V5cyBzZXBhcmF0ZWQgd2l0aCArLFxuICAgICAgICAgKiBhbiBhcnJheSBvZiBrZXlzLCBvciBhIHNlcXVlbmNlIG9mIGtleXMgc2VwYXJhdGVkIGJ5IHNwYWNlc1xuICAgICAgICAgKlxuICAgICAgICAgKiBiZSBzdXJlIHRvIGxpc3QgdGhlIG1vZGlmaWVyIGtleXMgZmlyc3QgdG8gbWFrZSBzdXJlIHRoYXQgdGhlXG4gICAgICAgICAqIGNvcnJlY3Qga2V5IGVuZHMgdXAgZ2V0dGluZyBib3VuZCAodGhlIGxhc3Qga2V5IGluIHRoZSBwYXR0ZXJuKVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ3xBcnJheX0ga2V5c1xuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZz19IGFjdGlvbiAtICdrZXlwcmVzcycsICdrZXlkb3duJywgb3IgJ2tleXVwJ1xuICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAqL1xuICAgICAgICBiaW5kOiBmdW5jdGlvbihrZXlzLCBjYWxsYmFjaywgYWN0aW9uKSB7XG4gICAgICAgICAgICBfYmluZE11bHRpcGxlKGtleXMgaW5zdGFuY2VvZiBBcnJheSA/IGtleXMgOiBba2V5c10sIGNhbGxiYWNrLCBhY3Rpb24pO1xuICAgICAgICAgICAgX2RpcmVjdF9tYXBba2V5cyArICc6JyArIGFjdGlvbl0gPSBjYWxsYmFjaztcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiB1bmJpbmRzIGFuIGV2ZW50IHRvIG1vdXNldHJhcFxuICAgICAgICAgKlxuICAgICAgICAgKiB0aGUgdW5iaW5kaW5nIHNldHMgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBzcGVjaWZpZWQga2V5IGNvbWJvXG4gICAgICAgICAqIHRvIGFuIGVtcHR5IGZ1bmN0aW9uIGFuZCBkZWxldGVzIHRoZSBjb3JyZXNwb25kaW5nIGtleSBpbiB0aGVcbiAgICAgICAgICogX2RpcmVjdF9tYXAgZGljdC5cbiAgICAgICAgICpcbiAgICAgICAgICogdGhlIGtleWNvbWJvK2FjdGlvbiBoYXMgdG8gYmUgZXhhY3RseSB0aGUgc2FtZSBhc1xuICAgICAgICAgKiBpdCB3YXMgZGVmaW5lZCBpbiB0aGUgYmluZCBtZXRob2RcbiAgICAgICAgICpcbiAgICAgICAgICogVE9ETzogYWN0dWFsbHkgcmVtb3ZlIHRoaXMgZnJvbSB0aGUgX2NhbGxiYWNrcyBkaWN0aW9uYXJ5IGluc3RlYWRcbiAgICAgICAgICogb2YgYmluZGluZyBhbiBlbXB0eSBmdW5jdGlvblxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ3xBcnJheX0ga2V5c1xuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgIHVuYmluZDogZnVuY3Rpb24oa2V5cywgYWN0aW9uKSB7XG4gICAgICAgICAgICBpZiAoX2RpcmVjdF9tYXBba2V5cyArICc6JyArIGFjdGlvbl0pIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgX2RpcmVjdF9tYXBba2V5cyArICc6JyArIGFjdGlvbl07XG4gICAgICAgICAgICAgICAgdGhpcy5iaW5kKGtleXMsIGZ1bmN0aW9uKCkge30sIGFjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogdHJpZ2dlcnMgYW4gZXZlbnQgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGJvdW5kXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXlzXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nPX0gYWN0aW9uXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgIHRyaWdnZXI6IGZ1bmN0aW9uKGtleXMsIGFjdGlvbikge1xuICAgICAgICAgICAgX2RpcmVjdF9tYXBba2V5cyArICc6JyArIGFjdGlvbl0oKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiByZXNldHMgdGhlIGxpYnJhcnkgYmFjayB0byBpdHMgaW5pdGlhbCBzdGF0ZS4gIHRoaXMgaXMgdXNlZnVsXG4gICAgICAgICAqIGlmIHlvdSB3YW50IHRvIGNsZWFyIG91dCB0aGUgY3VycmVudCBrZXlib2FyZCBzaG9ydGN1dHMgYW5kIGJpbmRcbiAgICAgICAgICogbmV3IG9uZXMgLSBmb3IgZXhhbXBsZSBpZiB5b3Ugc3dpdGNoIHRvIGFub3RoZXIgcGFnZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAqL1xuICAgICAgICByZXNldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfY2FsbGJhY2tzID0ge307XG4gICAgICAgICAgICBfZGlyZWN0X21hcCA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAvKipcbiAgICAgICAgKiBzaG91bGQgd2Ugc3RvcCB0aGlzIGV2ZW50IGJlZm9yZSBmaXJpbmcgb2ZmIGNhbGxiYWNrc1xuICAgICAgICAqXG4gICAgICAgICogQHBhcmFtIHtFdmVudH0gZVxuICAgICAgICAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudFxuICAgICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAgICAgICovXG4gICAgICAgIHN0b3BDYWxsYmFjazogZnVuY3Rpb24oZSwgZWxlbWVudCkge1xuXG4gICAgICAgICAgICAvLyBpZiB0aGUgZWxlbWVudCBoYXMgdGhlIGNsYXNzIFwibW91c2V0cmFwXCIgdGhlbiBubyBuZWVkIHRvIHN0b3BcbiAgICAgICAgICAgIGlmICgoJyAnICsgZWxlbWVudC5jbGFzc05hbWUgKyAnICcpLmluZGV4T2YoJyBtb3VzZXRyYXAgJykgPiAtMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc3RvcCBmb3IgaW5wdXQsIHNlbGVjdCwgYW5kIHRleHRhcmVhXG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudC50YWdOYW1lID09ICdJTlBVVCcgfHwgZWxlbWVudC50YWdOYW1lID09ICdTRUxFQ1QnIHx8IGVsZW1lbnQudGFnTmFtZSA9PSAnVEVYVEFSRUEnIHx8IChlbGVtZW50LmNvbnRlbnRFZGl0YWJsZSAmJiBlbGVtZW50LmNvbnRlbnRFZGl0YWJsZSA9PSAndHJ1ZScpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIGV4cG9zZSBtb3VzZXRyYXAgdG8gdGhlIGdsb2JhbCBvYmplY3RcbiAgICB3aW5kb3cuTW91c2V0cmFwID0gTW91c2V0cmFwO1xuXG4gICAgLy8gZXhwb3NlIG1vdXNldHJhcCBhcyBhbiBBTUQgbW9kdWxlXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZSgnbW91c2V0cmFwJywgZnVuY3Rpb24oKSB7IHJldHVybiBNb3VzZXRyYXA7IH0pO1xuICAgIH1cbiAgICAvLyBicm93c2VyaWZ5IHN1cHBvcnRcbiAgICBpZih0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IE1vdXNldHJhcDtcbiAgICB9XG59KSAoKTtcbiIsIihmdW5jdGlvbigpIHtcbiAgICB2YXIgcm9vdCA9IHRoaXM7XG4gICAgdmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblx0dmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cdHZhciBpbnRlcnZhbFBhcnNlciA9IC8oWzAtOVxcLl0rKShtc3xzfG18aCk/Lztcblx0dmFyIHJvb3QgPSBnbG9iYWwgfHwgd2luZG93O1xuXG5cdC8vIExpbCBiaXQgb2YgdXNlZnVsIHBvbHlmaWxsLi4uXG5cdGlmICh0eXBlb2YoRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzKSA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgPSBmdW5jdGlvbihwYXJlbnQpIHtcblx0XHRcdHRoaXMucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQucHJvdG90eXBlKTtcblx0XHR9O1xuXHR9XG5cblx0aWYgKHR5cGVvZihBcnJheS5wcm90b3R5cGUucmVtb3ZlT25lKSA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRBcnJheS5wcm90b3R5cGUucmVtb3ZlT25lID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgd2hhdCwgYSA9IGFyZ3VtZW50cywgTCA9IGEubGVuZ3RoLCBheDtcblx0XHRcdHdoaWxlIChMICYmIHRoaXMubGVuZ3RoKSB7XG5cdFx0XHRcdHdoYXQgPSBhWy0tTF07XG5cdFx0XHRcdHdoaWxlICgoYXggPSB0aGlzLmluZGV4T2Yod2hhdCkpICE9PSAtMSkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnNwbGljZShheCwgMSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gZ3JlYXRlc3RDb21tb25GYWN0b3IoaW50ZXJ2YWxzKSB7XG5cdFx0dmFyIHN1bU9mTW9kdWxpID0gMTtcblx0XHR2YXIgaW50ZXJ2YWwgPSBfLm1pbihpbnRlcnZhbHMpO1xuXHRcdHdoaWxlIChzdW1PZk1vZHVsaSAhPT0gMCkge1xuXHRcdFx0c3VtT2ZNb2R1bGkgPSBfLnJlZHVjZShpbnRlcnZhbHMsIGZ1bmN0aW9uKG1lbW8sIGkpeyByZXR1cm4gbWVtbyArIChpICUgaW50ZXJ2YWwpOyB9LCAwKTtcblx0XHRcdGlmIChzdW1PZk1vZHVsaSAhPT0gMCkge1xuXHRcdFx0XHRpbnRlcnZhbCAtPSAxMDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGludGVydmFsO1xuXHR9XG5cblx0ZnVuY3Rpb24gcGFyc2VFdmVudChlKSB7XG5cdFx0dmFyIGludGVydmFsR3JvdXBzID0gaW50ZXJ2YWxQYXJzZXIuZXhlYyhlKTtcblx0XHRpZiAoIWludGVydmFsR3JvdXBzKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0kgZG9uXFwndCB1bmRlcnN0YW5kIHRoYXQgcGFydGljdWxhciBpbnRlcnZhbCcpO1xuXHRcdH1cblx0XHR2YXIgaW50ZXJ2YWxBbW91bnQgPSAraW50ZXJ2YWxHcm91cHNbMV07XG5cdFx0dmFyIGludGVydmFsVHlwZSA9IGludGVydmFsR3JvdXBzWzJdIHx8ICdtcyc7XG5cdFx0aWYgKGludGVydmFsVHlwZSA9PT0gJ3MnKSB7XG5cdFx0XHRpbnRlcnZhbEFtb3VudCA9IGludGVydmFsQW1vdW50ICogMTAwMDtcblx0XHR9IGVsc2UgaWYgKGludGVydmFsVHlwZSA9PT0gJ20nKSB7XG5cdFx0XHRpbnRlcnZhbEFtb3VudCA9IGludGVydmFsQW1vdW50ICogMTAwMCAqIDYwO1xuXHRcdH0gZWxzZSBpZiAoaW50ZXJ2YWxUeXBlID09PSAnaCcpIHtcblx0XHRcdGludGVydmFsQW1vdW50ID0gaW50ZXJ2YWxBbW91bnQgKiAxMDAwICogNjAgKiA2MDtcblx0XHR9IGVsc2UgaWYgKCEhaW50ZXJ2YWxUeXBlICYmIGludGVydmFsVHlwZSAhPT0gJ21zJykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdZb3UgY2FuIG9ubHkgc3BlY2lmeSBpbnRlcnZhbHMgb2YgbXMsIHMsIG0sIG9yIGgnKTtcblx0XHR9XG5cdFx0aWYgKGludGVydmFsQW1vdW50IDwgMTAgfHwgaW50ZXJ2YWxBbW91bnQgJSAxMCAhPT0gMCkge1xuXHRcdFx0Ly8gV2Ugb25seSBkZWFsIGluIDEwJ3Mgb2YgbWlsbGlzZWNvbmRzIGZvciBzaW1wbGljaXR5XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1lvdSBjYW4gb25seSBzcGVjaWZ5IDEwcyBvZiBtaWxsaXNlY29uZHMsIHRydXN0IG1lIG9uIHRoaXMgb25lJyk7XG5cdFx0fVxuXHRcdHJldHVybiB7XG5cdFx0XHRhbW91bnQ6aW50ZXJ2YWxBbW91bnQsXG5cdFx0XHR0eXBlOmludGVydmFsVHlwZVxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBFdmVudGVkTG9vcCgpIHtcblx0XHR0aGlzLmludGVydmFsSWQgPSB1bmRlZmluZWQ7XG5cdFx0dGhpcy5pbnRlcnZhbExlbmd0aCA9IHVuZGVmaW5lZDtcblx0XHR0aGlzLmludGVydmFsc1RvRW1pdCA9IHt9O1xuXHRcdHRoaXMuY3VycmVudFRpY2sgPSAxO1xuXHRcdHRoaXMubWF4VGlja3MgPSAwO1xuXHRcdHRoaXMubGlzdGVuaW5nRm9yRm9jdXMgPSBmYWxzZTtcblxuXHRcdC8vIFByaXZhdGUgbWV0aG9kXG5cdFx0dmFyIGRldGVybWluZUludGVydmFsTGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIHBvdGVudGlhbEludGVydmFsTGVuZ3RoID0gZ3JlYXRlc3RDb21tb25GYWN0b3IoXy5rZXlzKHRoaXMuaW50ZXJ2YWxzVG9FbWl0KSk7XG5cdFx0XHR2YXIgY2hhbmdlZCA9IGZhbHNlO1xuXG5cdFx0XHRpZiAodGhpcy5pbnRlcnZhbExlbmd0aCkge1xuXHRcdFx0XHRpZiAocG90ZW50aWFsSW50ZXJ2YWxMZW5ndGggIT09IHRoaXMuaW50ZXJ2YWxMZW5ndGgpIHtcblx0XHRcdFx0XHQvLyBMb29rcyBsaWtlIHdlIG5lZWQgYSBuZXcgaW50ZXJ2YWxcblx0XHRcdFx0XHR0aGlzLmludGVydmFsTGVuZ3RoID0gcG90ZW50aWFsSW50ZXJ2YWxMZW5ndGg7XG5cdFx0XHRcdFx0Y2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuaW50ZXJ2YWxMZW5ndGggPSBwb3RlbnRpYWxJbnRlcnZhbExlbmd0aDtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5tYXhUaWNrcyA9IF8ubWF4KF8ubWFwKF8ua2V5cyh0aGlzLmludGVydmFsc1RvRW1pdCksIGZ1bmN0aW9uKGEpIHsgcmV0dXJuICthOyB9KSkgLyB0aGlzLmludGVydmFsTGVuZ3RoO1xuXHRcdFx0cmV0dXJuIGNoYW5nZWQ7XG5cdFx0fS5iaW5kKHRoaXMpO1xuXG5cdFx0dGhpcy5vbignbmV3TGlzdGVuZXInLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0aWYgKGUgPT09ICdyZW1vdmVMaXN0ZW5lcicgfHwgZSA9PT0gJ25ld0xpc3RlbmVyJykgcmV0dXJuOyAvLyBXZSBkb24ndCBjYXJlIGFib3V0IHRoYXQgb25lXG5cdFx0XHR2YXIgaW50ZXJ2YWxJbmZvID0gcGFyc2VFdmVudChlKTtcblx0XHRcdHZhciBpbnRlcnZhbEFtb3VudCA9IGludGVydmFsSW5mby5hbW91bnQ7XG5cblx0XHRcdHRoaXMuaW50ZXJ2YWxzVG9FbWl0WytpbnRlcnZhbEFtb3VudF0gPSBfLnVuaW9uKHRoaXMuaW50ZXJ2YWxzVG9FbWl0WytpbnRlcnZhbEFtb3VudF0gfHwgW10sIFtlXSk7XG5cdFx0XHRcblx0XHRcdGlmIChkZXRlcm1pbmVJbnRlcnZhbExlbmd0aCgpICYmIHRoaXMuaXNTdGFydGVkKCkpIHtcblx0XHRcdFx0dGhpcy5zdG9wKCkuc3RhcnQoKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMub24oJ3JlbW92ZUxpc3RlbmVyJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGlmIChFdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCh0aGlzLCBlKSA+IDApIHJldHVybjtcblx0XHRcdHZhciBpbnRlcnZhbEluZm8gPSBwYXJzZUV2ZW50KGUpO1xuXHRcdFx0dmFyIGludGVydmFsQW1vdW50ID0gaW50ZXJ2YWxJbmZvLmFtb3VudDtcblxuXHRcdFx0dmFyIHJlbW92ZWRFdmVudCA9IHRoaXMuaW50ZXJ2YWxzVG9FbWl0WytpbnRlcnZhbEFtb3VudF0ucmVtb3ZlT25lKGUpO1xuXHRcdFx0aWYgKHRoaXMuaW50ZXJ2YWxzVG9FbWl0WytpbnRlcnZhbEFtb3VudF0ubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLmludGVydmFsc1RvRW1pdFsraW50ZXJ2YWxBbW91bnRdO1xuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ0RldGVybWluaW5nIGludGVydmFsIGxlbmd0aCBhZnRlciByZW1vdmFsIG9mJywgcmVtb3ZlZEV2ZW50KTtcblx0XHRcdGRldGVybWluZUludGVydmFsTGVuZ3RoKCk7XG5cblx0XHRcdGlmIChkZXRlcm1pbmVJbnRlcnZhbExlbmd0aCgpICYmIHRoaXMuaXNTdGFydGVkKCkpIHtcblx0XHRcdFx0dGhpcy5zdG9wKCkuc3RhcnQoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdEV2ZW50ZWRMb29wLmluaGVyaXRzKEV2ZW50RW1pdHRlcik7XG5cblx0Ly8gUHVibGljIG1ldGhvZHNcblx0RXZlbnRlZExvb3AucHJvdG90eXBlLnRpY2sgPSBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIG1pbGxpc2Vjb25kcyA9IHRoaXMuY3VycmVudFRpY2sgKiB0aGlzLmludGVydmFsTGVuZ3RoO1xuXHRcdF8uZWFjaCh0aGlzLmludGVydmFsc1RvRW1pdCwgZnVuY3Rpb24gKGV2ZW50cywga2V5KSB7XG5cdFx0XHRpZiAobWlsbGlzZWNvbmRzICUga2V5ID09PSAwKSB7XG5cdFx0XHRcdF8uZWFjaChldmVudHMsIGZ1bmN0aW9uKGUpIHsgdGhpcy5lbWl0KGUsIGUsIGtleSk7IH0uYmluZCh0aGlzKSk7XG5cdFx0XHR9XG5cdFx0fS5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLmN1cnJlbnRUaWNrICs9IDE7XG5cdFx0aWYgKHRoaXMuY3VycmVudFRpY2sgPiB0aGlzLm1heFRpY2tzKSB7XG5cdFx0XHR0aGlzLmN1cnJlbnRUaWNrID0gMTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0RXZlbnRlZExvb3AucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xuXHRcdGlmICghdGhpcy5pbnRlcnZhbExlbmd0aCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdZb3UgaGF2ZW5cXCd0IHNwZWNpZmllZCBhbnkgaW50ZXJ2YWwgY2FsbGJhY2tzLiBVc2UgRXZlbnRlZExvb3Aub24oXFwnNTAwbXNcXCcsIGZ1bmN0aW9uICgpIHsgLi4uIH0pIHRvIGRvIHNvLCBhbmQgdGhlbiB5b3UgY2FuIHN0YXJ0Jyk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmludGVydmFsSWQpIHtcblx0XHRcdHJldHVybiBjb25zb2xlLmxvZygnTm8gbmVlZCB0byBzdGFydCB0aGUgbG9vcCBhZ2FpbiwgaXRcXCdzIGFscmVhZHkgc3RhcnRlZC4nKTtcblx0XHR9XG5cblx0XHR0aGlzLmludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLnRpY2suYmluZCh0aGlzKSwgdGhpcy5pbnRlcnZhbExlbmd0aCk7XG5cblx0XHRpZiAocm9vdCAmJiAhdGhpcy5saXN0ZW5pbmdGb3JGb2N1cyAmJiByb290LmFkZEV2ZW50TGlzdGVuZXIpIHtcblx0XHRcdHJvb3QuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhpcy5zdGFydCgpO1xuXHRcdFx0fS5iaW5kKHRoaXMpKTtcblxuXHRcdFx0cm9vdC5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHRoaXMuc3RvcCgpO1xuXHRcdFx0fS5iaW5kKHRoaXMpKTtcblxuXHRcdFx0dGhpcy5saXN0ZW5pbmdGb3JGb2N1cyA9IHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdEV2ZW50ZWRMb29wLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gKCkge1xuXHRcdGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbElkKTtcblx0XHR0aGlzLmludGVydmFsSWQgPSB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0RXZlbnRlZExvb3AucHJvdG90eXBlLmlzU3RhcnRlZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gISF0aGlzLmludGVydmFsSWQ7XG5cdH07XG5cblx0RXZlbnRlZExvb3AucHJvdG90eXBlLmV2ZXJ5ID0gRXZlbnRlZExvb3AucHJvdG90eXBlLm9uO1xuXG4gICAgLy8gRXhwb3J0IHRoZSBFdmVudGVkTG9vcCBvYmplY3QgZm9yICoqTm9kZS5qcyoqIG9yIG90aGVyXG4gICAgLy8gY29tbW9uanMgc3lzdGVtcy4gT3RoZXJ3aXNlLCBhZGQgaXQgYXMgYSBnbG9iYWwgb2JqZWN0IHRvIHRoZSByb290XG4gICAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEV2ZW50ZWRMb29wO1xuICAgICAgICB9XG4gICAgICAgIGV4cG9ydHMuRXZlbnRlZExvb3AgPSBFdmVudGVkTG9vcDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHdpbmRvdy5FdmVudGVkTG9vcCA9IEV2ZW50ZWRMb29wO1xuICAgIH1cbn0pLmNhbGwodGhpcyk7IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFIgPSB0eXBlb2YgUmVmbGVjdCA9PT0gJ29iamVjdCcgPyBSZWZsZWN0IDogbnVsbFxudmFyIFJlZmxlY3RBcHBseSA9IFIgJiYgdHlwZW9mIFIuYXBwbHkgPT09ICdmdW5jdGlvbidcbiAgPyBSLmFwcGx5XG4gIDogZnVuY3Rpb24gUmVmbGVjdEFwcGx5KHRhcmdldCwgcmVjZWl2ZXIsIGFyZ3MpIHtcbiAgICByZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmNhbGwodGFyZ2V0LCByZWNlaXZlciwgYXJncyk7XG4gIH1cblxudmFyIFJlZmxlY3RPd25LZXlzXG5pZiAoUiAmJiB0eXBlb2YgUi5vd25LZXlzID09PSAnZnVuY3Rpb24nKSB7XG4gIFJlZmxlY3RPd25LZXlzID0gUi5vd25LZXlzXG59IGVsc2UgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMpIHtcbiAgUmVmbGVjdE93bktleXMgPSBmdW5jdGlvbiBSZWZsZWN0T3duS2V5cyh0YXJnZXQpIHtcbiAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGFyZ2V0KVxuICAgICAgLmNvbmNhdChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHRhcmdldCkpO1xuICB9O1xufSBlbHNlIHtcbiAgUmVmbGVjdE93bktleXMgPSBmdW5jdGlvbiBSZWZsZWN0T3duS2V5cyh0YXJnZXQpIHtcbiAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGFyZ2V0KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gUHJvY2Vzc0VtaXRXYXJuaW5nKHdhcm5pbmcpIHtcbiAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS53YXJuKSBjb25zb2xlLndhcm4od2FybmluZyk7XG59XG5cbnZhciBOdW1iZXJJc05hTiA9IE51bWJlci5pc05hTiB8fCBmdW5jdGlvbiBOdW1iZXJJc05hTih2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgIT09IHZhbHVlO1xufVxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIEV2ZW50RW1pdHRlci5pbml0LmNhbGwodGhpcyk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcbm1vZHVsZS5leHBvcnRzLm9uY2UgPSBvbmNlO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50c0NvdW50ID0gMDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxudmFyIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuZnVuY3Rpb24gY2hlY2tMaXN0ZW5lcihsaXN0ZW5lcikge1xuICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgRnVuY3Rpb24uIFJlY2VpdmVkIHR5cGUgJyArIHR5cGVvZiBsaXN0ZW5lcik7XG4gIH1cbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEV2ZW50RW1pdHRlciwgJ2RlZmF1bHRNYXhMaXN0ZW5lcnMnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gIH0sXG4gIHNldDogZnVuY3Rpb24oYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICdudW1iZXInIHx8IGFyZyA8IDAgfHwgTnVtYmVySXNOYU4oYXJnKSkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSB2YWx1ZSBvZiBcImRlZmF1bHRNYXhMaXN0ZW5lcnNcIiBpcyBvdXQgb2YgcmFuZ2UuIEl0IG11c3QgYmUgYSBub24tbmVnYXRpdmUgbnVtYmVyLiBSZWNlaXZlZCAnICsgYXJnICsgJy4nKTtcbiAgICB9XG4gICAgZGVmYXVsdE1heExpc3RlbmVycyA9IGFyZztcbiAgfVxufSk7XG5cbkV2ZW50RW1pdHRlci5pbml0ID0gZnVuY3Rpb24oKSB7XG5cbiAgaWYgKHRoaXMuX2V2ZW50cyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICB0aGlzLl9ldmVudHMgPT09IE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKS5fZXZlbnRzKSB7XG4gICAgdGhpcy5fZXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB0aGlzLl9ldmVudHNDb3VudCA9IDA7XG4gIH1cblxuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufTtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gc2V0TWF4TGlzdGVuZXJzKG4pIHtcbiAgaWYgKHR5cGVvZiBuICE9PSAnbnVtYmVyJyB8fCBuIDwgMCB8fCBOdW1iZXJJc05hTihuKSkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgb2YgXCJuXCIgaXMgb3V0IG9mIHJhbmdlLiBJdCBtdXN0IGJlIGEgbm9uLW5lZ2F0aXZlIG51bWJlci4gUmVjZWl2ZWQgJyArIG4gKyAnLicpO1xuICB9XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuZnVuY3Rpb24gX2dldE1heExpc3RlbmVycyh0aGF0KSB7XG4gIGlmICh0aGF0Ll9tYXhMaXN0ZW5lcnMgPT09IHVuZGVmaW5lZClcbiAgICByZXR1cm4gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gIHJldHVybiB0aGF0Ll9tYXhMaXN0ZW5lcnM7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZ2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gZ2V0TWF4TGlzdGVuZXJzKCkge1xuICByZXR1cm4gX2dldE1heExpc3RlbmVycyh0aGlzKTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQodHlwZSkge1xuICB2YXIgYXJncyA9IFtdO1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgYXJncy5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gIHZhciBkb0Vycm9yID0gKHR5cGUgPT09ICdlcnJvcicpO1xuXG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHM7XG4gIGlmIChldmVudHMgIT09IHVuZGVmaW5lZClcbiAgICBkb0Vycm9yID0gKGRvRXJyb3IgJiYgZXZlbnRzLmVycm9yID09PSB1bmRlZmluZWQpO1xuICBlbHNlIGlmICghZG9FcnJvcilcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAoZG9FcnJvcikge1xuICAgIHZhciBlcjtcbiAgICBpZiAoYXJncy5sZW5ndGggPiAwKVxuICAgICAgZXIgPSBhcmdzWzBdO1xuICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAvLyBOb3RlOiBUaGUgY29tbWVudHMgb24gdGhlIGB0aHJvd2AgbGluZXMgYXJlIGludGVudGlvbmFsLCB0aGV5IHNob3dcbiAgICAgIC8vIHVwIGluIE5vZGUncyBvdXRwdXQgaWYgdGhpcyByZXN1bHRzIGluIGFuIHVuaGFuZGxlZCBleGNlcHRpb24uXG4gICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICB9XG4gICAgLy8gQXQgbGVhc3QgZ2l2ZSBzb21lIGtpbmQgb2YgY29udGV4dCB0byB0aGUgdXNlclxuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ1VuaGFuZGxlZCBlcnJvci4nICsgKGVyID8gJyAoJyArIGVyLm1lc3NhZ2UgKyAnKScgOiAnJykpO1xuICAgIGVyci5jb250ZXh0ID0gZXI7XG4gICAgdGhyb3cgZXJyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICB9XG5cbiAgdmFyIGhhbmRsZXIgPSBldmVudHNbdHlwZV07XG5cbiAgaWYgKGhhbmRsZXIgPT09IHVuZGVmaW5lZClcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgUmVmbGVjdEFwcGx5KGhhbmRsZXIsIHRoaXMsIGFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIHZhciBsZW4gPSBoYW5kbGVyLmxlbmd0aDtcbiAgICB2YXIgbGlzdGVuZXJzID0gYXJyYXlDbG9uZShoYW5kbGVyLCBsZW4pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpXG4gICAgICBSZWZsZWN0QXBwbHkobGlzdGVuZXJzW2ldLCB0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuZnVuY3Rpb24gX2FkZExpc3RlbmVyKHRhcmdldCwgdHlwZSwgbGlzdGVuZXIsIHByZXBlbmQpIHtcbiAgdmFyIG07XG4gIHZhciBldmVudHM7XG4gIHZhciBleGlzdGluZztcblxuICBjaGVja0xpc3RlbmVyKGxpc3RlbmVyKTtcblxuICBldmVudHMgPSB0YXJnZXQuX2V2ZW50cztcbiAgaWYgKGV2ZW50cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIHRhcmdldC5fZXZlbnRzQ291bnQgPSAwO1xuICB9IGVsc2Uge1xuICAgIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gICAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICAgIGlmIChldmVudHMubmV3TGlzdGVuZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGFyZ2V0LmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyID8gbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgICAgIC8vIFJlLWFzc2lnbiBgZXZlbnRzYCBiZWNhdXNlIGEgbmV3TGlzdGVuZXIgaGFuZGxlciBjb3VsZCBoYXZlIGNhdXNlZCB0aGVcbiAgICAgIC8vIHRoaXMuX2V2ZW50cyB0byBiZSBhc3NpZ25lZCB0byBhIG5ldyBvYmplY3RcbiAgICAgIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzO1xuICAgIH1cbiAgICBleGlzdGluZyA9IGV2ZW50c1t0eXBlXTtcbiAgfVxuXG4gIGlmIChleGlzdGluZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgZXhpc3RpbmcgPSBldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgICArK3RhcmdldC5fZXZlbnRzQ291bnQ7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHR5cGVvZiBleGlzdGluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgICBleGlzdGluZyA9IGV2ZW50c1t0eXBlXSA9XG4gICAgICAgIHByZXBlbmQgPyBbbGlzdGVuZXIsIGV4aXN0aW5nXSA6IFtleGlzdGluZywgbGlzdGVuZXJdO1xuICAgICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIH0gZWxzZSBpZiAocHJlcGVuZCkge1xuICAgICAgZXhpc3RpbmcudW5zaGlmdChsaXN0ZW5lcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4aXN0aW5nLnB1c2gobGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgbSA9IF9nZXRNYXhMaXN0ZW5lcnModGFyZ2V0KTtcbiAgICBpZiAobSA+IDAgJiYgZXhpc3RpbmcubGVuZ3RoID4gbSAmJiAhZXhpc3Rpbmcud2FybmVkKSB7XG4gICAgICBleGlzdGluZy53YXJuZWQgPSB0cnVlO1xuICAgICAgLy8gTm8gZXJyb3IgY29kZSBmb3IgdGhpcyBzaW5jZSBpdCBpcyBhIFdhcm5pbmdcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1yZXN0cmljdGVkLXN5bnRheFxuICAgICAgdmFyIHcgPSBuZXcgRXJyb3IoJ1Bvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgbGVhayBkZXRlY3RlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nLmxlbmd0aCArICcgJyArIFN0cmluZyh0eXBlKSArICcgbGlzdGVuZXJzICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAnYWRkZWQuIFVzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAnaW5jcmVhc2UgbGltaXQnKTtcbiAgICAgIHcubmFtZSA9ICdNYXhMaXN0ZW5lcnNFeGNlZWRlZFdhcm5pbmcnO1xuICAgICAgdy5lbWl0dGVyID0gdGFyZ2V0O1xuICAgICAgdy50eXBlID0gdHlwZTtcbiAgICAgIHcuY291bnQgPSBleGlzdGluZy5sZW5ndGg7XG4gICAgICBQcm9jZXNzRW1pdFdhcm5pbmcodyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRhcmdldDtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uIGFkZExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHJldHVybiBfYWRkTGlzdGVuZXIodGhpcywgdHlwZSwgbGlzdGVuZXIsIGZhbHNlKTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcHJlcGVuZExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgICByZXR1cm4gX2FkZExpc3RlbmVyKHRoaXMsIHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgICB9O1xuXG5mdW5jdGlvbiBvbmNlV3JhcHBlcigpIHtcbiAgaWYgKCF0aGlzLmZpcmVkKSB7XG4gICAgdGhpcy50YXJnZXQucmVtb3ZlTGlzdGVuZXIodGhpcy50eXBlLCB0aGlzLndyYXBGbik7XG4gICAgdGhpcy5maXJlZCA9IHRydWU7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0KTtcbiAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5hcHBseSh0aGlzLnRhcmdldCwgYXJndW1lbnRzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfb25jZVdyYXAodGFyZ2V0LCB0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgc3RhdGUgPSB7IGZpcmVkOiBmYWxzZSwgd3JhcEZuOiB1bmRlZmluZWQsIHRhcmdldDogdGFyZ2V0LCB0eXBlOiB0eXBlLCBsaXN0ZW5lcjogbGlzdGVuZXIgfTtcbiAgdmFyIHdyYXBwZWQgPSBvbmNlV3JhcHBlci5iaW5kKHN0YXRlKTtcbiAgd3JhcHBlZC5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICBzdGF0ZS53cmFwRm4gPSB3cmFwcGVkO1xuICByZXR1cm4gd3JhcHBlZDtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gb25jZSh0eXBlLCBsaXN0ZW5lcikge1xuICBjaGVja0xpc3RlbmVyKGxpc3RlbmVyKTtcbiAgdGhpcy5vbih0eXBlLCBfb25jZVdyYXAodGhpcywgdHlwZSwgbGlzdGVuZXIpKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIHByZXBlbmRPbmNlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgICAgIGNoZWNrTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgdGhpcy5wcmVwZW5kTGlzdGVuZXIodHlwZSwgX29uY2VXcmFwKHRoaXMsIHR5cGUsIGxpc3RlbmVyKSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4vLyBFbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWYgYW5kIG9ubHkgaWYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgICAgIHZhciBsaXN0LCBldmVudHMsIHBvc2l0aW9uLCBpLCBvcmlnaW5hbExpc3RlbmVyO1xuXG4gICAgICBjaGVja0xpc3RlbmVyKGxpc3RlbmVyKTtcblxuICAgICAgZXZlbnRzID0gdGhpcy5fZXZlbnRzO1xuICAgICAgaWYgKGV2ZW50cyA9PT0gdW5kZWZpbmVkKVxuICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgbGlzdCA9IGV2ZW50c1t0eXBlXTtcbiAgICAgIGlmIChsaXN0ID09PSB1bmRlZmluZWQpXG4gICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHwgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKC0tdGhpcy5fZXZlbnRzQ291bnQgPT09IDApXG4gICAgICAgICAgdGhpcy5fZXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIGV2ZW50c1t0eXBlXTtcbiAgICAgICAgICBpZiAoZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3QubGlzdGVuZXIgfHwgbGlzdGVuZXIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBsaXN0ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHBvc2l0aW9uID0gLTE7XG5cbiAgICAgICAgZm9yIChpID0gbGlzdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fCBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikge1xuICAgICAgICAgICAgb3JpZ2luYWxMaXN0ZW5lciA9IGxpc3RbaV0ubGlzdGVuZXI7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgICAgIGlmIChwb3NpdGlvbiA9PT0gMClcbiAgICAgICAgICBsaXN0LnNoaWZ0KCk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHNwbGljZU9uZShsaXN0LCBwb3NpdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpXG4gICAgICAgICAgZXZlbnRzW3R5cGVdID0gbGlzdFswXTtcblxuICAgICAgICBpZiAoZXZlbnRzLnJlbW92ZUxpc3RlbmVyICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIG9yaWdpbmFsTGlzdGVuZXIgfHwgbGlzdGVuZXIpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbiAgICBmdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnModHlwZSkge1xuICAgICAgdmFyIGxpc3RlbmVycywgZXZlbnRzLCBpO1xuXG4gICAgICBldmVudHMgPSB0aGlzLl9ldmVudHM7XG4gICAgICBpZiAoZXZlbnRzID09PSB1bmRlZmluZWQpXG4gICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gICAgICBpZiAoZXZlbnRzLnJlbW92ZUxpc3RlbmVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgICAgICAgfSBlbHNlIGlmIChldmVudHNbdHlwZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICgtLXRoaXMuX2V2ZW50c0NvdW50ID09PSAwKVxuICAgICAgICAgICAgdGhpcy5fZXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBkZWxldGUgZXZlbnRzW3R5cGVdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZXZlbnRzKTtcbiAgICAgICAgdmFyIGtleTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgICAgIHRoaXMuX2V2ZW50cyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIGxpc3RlbmVycyA9IGV2ZW50c1t0eXBlXTtcblxuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICAgICAgfSBlbHNlIGlmIChsaXN0ZW5lcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBMSUZPIG9yZGVyXG4gICAgICAgIGZvciAoaSA9IGxpc3RlbmVycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG5mdW5jdGlvbiBfbGlzdGVuZXJzKHRhcmdldCwgdHlwZSwgdW53cmFwKSB7XG4gIHZhciBldmVudHMgPSB0YXJnZXQuX2V2ZW50cztcblxuICBpZiAoZXZlbnRzID09PSB1bmRlZmluZWQpXG4gICAgcmV0dXJuIFtdO1xuXG4gIHZhciBldmxpc3RlbmVyID0gZXZlbnRzW3R5cGVdO1xuICBpZiAoZXZsaXN0ZW5lciA9PT0gdW5kZWZpbmVkKVxuICAgIHJldHVybiBbXTtcblxuICBpZiAodHlwZW9mIGV2bGlzdGVuZXIgPT09ICdmdW5jdGlvbicpXG4gICAgcmV0dXJuIHVud3JhcCA/IFtldmxpc3RlbmVyLmxpc3RlbmVyIHx8IGV2bGlzdGVuZXJdIDogW2V2bGlzdGVuZXJdO1xuXG4gIHJldHVybiB1bndyYXAgP1xuICAgIHVud3JhcExpc3RlbmVycyhldmxpc3RlbmVyKSA6IGFycmF5Q2xvbmUoZXZsaXN0ZW5lciwgZXZsaXN0ZW5lci5sZW5ndGgpO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIGxpc3RlbmVycyh0eXBlKSB7XG4gIHJldHVybiBfbGlzdGVuZXJzKHRoaXMsIHR5cGUsIHRydWUpO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yYXdMaXN0ZW5lcnMgPSBmdW5jdGlvbiByYXdMaXN0ZW5lcnModHlwZSkge1xuICByZXR1cm4gX2xpc3RlbmVycyh0aGlzLCB0eXBlLCBmYWxzZSk7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgaWYgKHR5cGVvZiBlbWl0dGVyLmxpc3RlbmVyQ291bnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZW1pdHRlci5saXN0ZW5lckNvdW50KHR5cGUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBsaXN0ZW5lckNvdW50LmNhbGwoZW1pdHRlciwgdHlwZSk7XG4gIH1cbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJDb3VudCA9IGxpc3RlbmVyQ291bnQ7XG5mdW5jdGlvbiBsaXN0ZW5lckNvdW50KHR5cGUpIHtcbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcblxuICBpZiAoZXZlbnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgZXZsaXN0ZW5lciA9IGV2ZW50c1t0eXBlXTtcblxuICAgIGlmICh0eXBlb2YgZXZsaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmIChldmxpc3RlbmVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBldmxpc3RlbmVyLmxlbmd0aDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gMDtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudE5hbWVzID0gZnVuY3Rpb24gZXZlbnROYW1lcygpIHtcbiAgcmV0dXJuIHRoaXMuX2V2ZW50c0NvdW50ID4gMCA/IFJlZmxlY3RPd25LZXlzKHRoaXMuX2V2ZW50cykgOiBbXTtcbn07XG5cbmZ1bmN0aW9uIGFycmF5Q2xvbmUoYXJyLCBuKSB7XG4gIHZhciBjb3B5ID0gbmV3IEFycmF5KG4pO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG47ICsraSlcbiAgICBjb3B5W2ldID0gYXJyW2ldO1xuICByZXR1cm4gY29weTtcbn1cblxuZnVuY3Rpb24gc3BsaWNlT25lKGxpc3QsIGluZGV4KSB7XG4gIGZvciAoOyBpbmRleCArIDEgPCBsaXN0Lmxlbmd0aDsgaW5kZXgrKylcbiAgICBsaXN0W2luZGV4XSA9IGxpc3RbaW5kZXggKyAxXTtcbiAgbGlzdC5wb3AoKTtcbn1cblxuZnVuY3Rpb24gdW53cmFwTGlzdGVuZXJzKGFycikge1xuICB2YXIgcmV0ID0gbmV3IEFycmF5KGFyci5sZW5ndGgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHJldC5sZW5ndGg7ICsraSkge1xuICAgIHJldFtpXSA9IGFycltpXS5saXN0ZW5lciB8fCBhcnJbaV07XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gb25jZShlbWl0dGVyLCBuYW1lKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgZnVuY3Rpb24gZXJyb3JMaXN0ZW5lcihlcnIpIHtcbiAgICAgIGVtaXR0ZXIucmVtb3ZlTGlzdGVuZXIobmFtZSwgcmVzb2x2ZXIpO1xuICAgICAgcmVqZWN0KGVycik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzb2x2ZXIoKSB7XG4gICAgICBpZiAodHlwZW9mIGVtaXR0ZXIucmVtb3ZlTGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZW1pdHRlci5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBlcnJvckxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICB9O1xuXG4gICAgZXZlbnRUYXJnZXRBZ25vc3RpY0FkZExpc3RlbmVyKGVtaXR0ZXIsIG5hbWUsIHJlc29sdmVyLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgaWYgKG5hbWUgIT09ICdlcnJvcicpIHtcbiAgICAgIGFkZEVycm9ySGFuZGxlcklmRXZlbnRFbWl0dGVyKGVtaXR0ZXIsIGVycm9yTGlzdGVuZXIsIHsgb25jZTogdHJ1ZSB9KTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGRFcnJvckhhbmRsZXJJZkV2ZW50RW1pdHRlcihlbWl0dGVyLCBoYW5kbGVyLCBmbGFncykge1xuICBpZiAodHlwZW9mIGVtaXR0ZXIub24gPT09ICdmdW5jdGlvbicpIHtcbiAgICBldmVudFRhcmdldEFnbm9zdGljQWRkTGlzdGVuZXIoZW1pdHRlciwgJ2Vycm9yJywgaGFuZGxlciwgZmxhZ3MpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGV2ZW50VGFyZ2V0QWdub3N0aWNBZGRMaXN0ZW5lcihlbWl0dGVyLCBuYW1lLCBsaXN0ZW5lciwgZmxhZ3MpIHtcbiAgaWYgKHR5cGVvZiBlbWl0dGVyLm9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgaWYgKGZsYWdzLm9uY2UpIHtcbiAgICAgIGVtaXR0ZXIub25jZShuYW1lLCBsaXN0ZW5lcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVtaXR0ZXIub24obmFtZSwgbGlzdGVuZXIpO1xuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlb2YgZW1pdHRlci5hZGRFdmVudExpc3RlbmVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gRXZlbnRUYXJnZXQgZG9lcyBub3QgaGF2ZSBgZXJyb3JgIGV2ZW50IHNlbWFudGljcyBsaWtlIE5vZGVcbiAgICAvLyBFdmVudEVtaXR0ZXJzLCB3ZSBkbyBub3QgbGlzdGVuIGZvciBgZXJyb3JgIGV2ZW50cyBoZXJlLlxuICAgIGVtaXR0ZXIuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBmdW5jdGlvbiB3cmFwTGlzdGVuZXIoYXJnKSB7XG4gICAgICAvLyBJRSBkb2VzIG5vdCBoYXZlIGJ1aWx0aW4gYHsgb25jZTogdHJ1ZSB9YCBzdXBwb3J0IHNvIHdlXG4gICAgICAvLyBoYXZlIHRvIGRvIGl0IG1hbnVhbGx5LlxuICAgICAgaWYgKGZsYWdzLm9uY2UpIHtcbiAgICAgICAgZW1pdHRlci5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIHdyYXBMaXN0ZW5lcik7XG4gICAgICB9XG4gICAgICBsaXN0ZW5lcihhcmcpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImVtaXR0ZXJcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgRXZlbnRFbWl0dGVyLiBSZWNlaXZlZCB0eXBlICcgKyB0eXBlb2YgZW1pdHRlcik7XG4gIH1cbn1cbiIsIi8vICAgICBVbmRlcnNjb3JlLmpzIDEuNi4wXG4vLyAgICAgaHR0cDovL3VuZGVyc2NvcmVqcy5vcmdcbi8vICAgICAoYykgMjAwOS0yMDE0IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4vLyAgICAgVW5kZXJzY29yZSBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cblxuKGZ1bmN0aW9uKCkge1xuXG4gIC8vIEJhc2VsaW5lIHNldHVwXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gRXN0YWJsaXNoIHRoZSByb290IG9iamVjdCwgYHdpbmRvd2AgaW4gdGhlIGJyb3dzZXIsIG9yIGBleHBvcnRzYCBvbiB0aGUgc2VydmVyLlxuICB2YXIgcm9vdCA9IHRoaXM7XG5cbiAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgdmFsdWUgb2YgdGhlIGBfYCB2YXJpYWJsZS5cbiAgdmFyIHByZXZpb3VzVW5kZXJzY29yZSA9IHJvb3QuXztcblxuICAvLyBFc3RhYmxpc2ggdGhlIG9iamVjdCB0aGF0IGdldHMgcmV0dXJuZWQgdG8gYnJlYWsgb3V0IG9mIGEgbG9vcCBpdGVyYXRpb24uXG4gIHZhciBicmVha2VyID0ge307XG5cbiAgLy8gU2F2ZSBieXRlcyBpbiB0aGUgbWluaWZpZWQgKGJ1dCBub3QgZ3ppcHBlZCkgdmVyc2lvbjpcbiAgdmFyIEFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGUsIE9ialByb3RvID0gT2JqZWN0LnByb3RvdHlwZSwgRnVuY1Byb3RvID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gIC8vIENyZWF0ZSBxdWljayByZWZlcmVuY2UgdmFyaWFibGVzIGZvciBzcGVlZCBhY2Nlc3MgdG8gY29yZSBwcm90b3R5cGVzLlxuICB2YXJcbiAgICBwdXNoICAgICAgICAgICAgID0gQXJyYXlQcm90by5wdXNoLFxuICAgIHNsaWNlICAgICAgICAgICAgPSBBcnJheVByb3RvLnNsaWNlLFxuICAgIGNvbmNhdCAgICAgICAgICAgPSBBcnJheVByb3RvLmNvbmNhdCxcbiAgICB0b1N0cmluZyAgICAgICAgID0gT2JqUHJvdG8udG9TdHJpbmcsXG4gICAgaGFzT3duUHJvcGVydHkgICA9IE9ialByb3RvLmhhc093blByb3BlcnR5O1xuXG4gIC8vIEFsbCAqKkVDTUFTY3JpcHQgNSoqIG5hdGl2ZSBmdW5jdGlvbiBpbXBsZW1lbnRhdGlvbnMgdGhhdCB3ZSBob3BlIHRvIHVzZVxuICAvLyBhcmUgZGVjbGFyZWQgaGVyZS5cbiAgdmFyXG4gICAgbmF0aXZlRm9yRWFjaCAgICAgID0gQXJyYXlQcm90by5mb3JFYWNoLFxuICAgIG5hdGl2ZU1hcCAgICAgICAgICA9IEFycmF5UHJvdG8ubWFwLFxuICAgIG5hdGl2ZVJlZHVjZSAgICAgICA9IEFycmF5UHJvdG8ucmVkdWNlLFxuICAgIG5hdGl2ZVJlZHVjZVJpZ2h0ICA9IEFycmF5UHJvdG8ucmVkdWNlUmlnaHQsXG4gICAgbmF0aXZlRmlsdGVyICAgICAgID0gQXJyYXlQcm90by5maWx0ZXIsXG4gICAgbmF0aXZlRXZlcnkgICAgICAgID0gQXJyYXlQcm90by5ldmVyeSxcbiAgICBuYXRpdmVTb21lICAgICAgICAgPSBBcnJheVByb3RvLnNvbWUsXG4gICAgbmF0aXZlSW5kZXhPZiAgICAgID0gQXJyYXlQcm90by5pbmRleE9mLFxuICAgIG5hdGl2ZUxhc3RJbmRleE9mICA9IEFycmF5UHJvdG8ubGFzdEluZGV4T2YsXG4gICAgbmF0aXZlSXNBcnJheSAgICAgID0gQXJyYXkuaXNBcnJheSxcbiAgICBuYXRpdmVLZXlzICAgICAgICAgPSBPYmplY3Qua2V5cyxcbiAgICBuYXRpdmVCaW5kICAgICAgICAgPSBGdW5jUHJvdG8uYmluZDtcblxuICAvLyBDcmVhdGUgYSBzYWZlIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yIHVzZSBiZWxvdy5cbiAgdmFyIF8gPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqIGluc3RhbmNlb2YgXykgcmV0dXJuIG9iajtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgXykpIHJldHVybiBuZXcgXyhvYmopO1xuICAgIHRoaXMuX3dyYXBwZWQgPSBvYmo7XG4gIH07XG5cbiAgLy8gRXhwb3J0IHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgKipOb2RlLmpzKiosIHdpdGhcbiAgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgZm9yIHRoZSBvbGQgYHJlcXVpcmUoKWAgQVBJLiBJZiB3ZSdyZSBpblxuICAvLyB0aGUgYnJvd3NlciwgYWRkIGBfYCBhcyBhIGdsb2JhbCBvYmplY3QgdmlhIGEgc3RyaW5nIGlkZW50aWZpZXIsXG4gIC8vIGZvciBDbG9zdXJlIENvbXBpbGVyIFwiYWR2YW5jZWRcIiBtb2RlLlxuICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBfO1xuICAgIH1cbiAgICBleHBvcnRzLl8gPSBfO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuXyA9IF87XG4gIH1cblxuICAvLyBDdXJyZW50IHZlcnNpb24uXG4gIF8uVkVSU0lPTiA9ICcxLjYuMCc7XG5cbiAgLy8gQ29sbGVjdGlvbiBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBUaGUgY29ybmVyc3RvbmUsIGFuIGBlYWNoYCBpbXBsZW1lbnRhdGlvbiwgYWthIGBmb3JFYWNoYC5cbiAgLy8gSGFuZGxlcyBvYmplY3RzIHdpdGggdGhlIGJ1aWx0LWluIGBmb3JFYWNoYCwgYXJyYXlzLCBhbmQgcmF3IG9iamVjdHMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBmb3JFYWNoYCBpZiBhdmFpbGFibGUuXG4gIHZhciBlYWNoID0gXy5lYWNoID0gXy5mb3JFYWNoID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIG9iajtcbiAgICBpZiAobmF0aXZlRm9yRWFjaCAmJiBvYmouZm9yRWFjaCA9PT0gbmF0aXZlRm9yRWFjaCkge1xuICAgICAgb2JqLmZvckVhY2goaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2ldLCBpLCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpba2V5c1tpXV0sIGtleXNbaV0sIG9iaikgPT09IGJyZWFrZXIpIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIHJlc3VsdHMgb2YgYXBwbHlpbmcgdGhlIGl0ZXJhdG9yIHRvIGVhY2ggZWxlbWVudC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYG1hcGAgaWYgYXZhaWxhYmxlLlxuICBfLm1hcCA9IF8uY29sbGVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgaWYgKG5hdGl2ZU1hcCAmJiBvYmoubWFwID09PSBuYXRpdmVNYXApIHJldHVybiBvYmoubWFwKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXN1bHRzLnB1c2goaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICB2YXIgcmVkdWNlRXJyb3IgPSAnUmVkdWNlIG9mIGVtcHR5IGFycmF5IHdpdGggbm8gaW5pdGlhbCB2YWx1ZSc7XG5cbiAgLy8gKipSZWR1Y2UqKiBidWlsZHMgdXAgYSBzaW5nbGUgcmVzdWx0IGZyb20gYSBsaXN0IG9mIHZhbHVlcywgYWthIGBpbmplY3RgLFxuICAvLyBvciBgZm9sZGxgLiBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgcmVkdWNlYCBpZiBhdmFpbGFibGUuXG4gIF8ucmVkdWNlID0gXy5mb2xkbCA9IF8uaW5qZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgbWVtbywgY29udGV4dCkge1xuICAgIHZhciBpbml0aWFsID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICBpZiAobmF0aXZlUmVkdWNlICYmIG9iai5yZWR1Y2UgPT09IG5hdGl2ZVJlZHVjZSkge1xuICAgICAgaWYgKGNvbnRleHQpIGl0ZXJhdG9yID0gXy5iaW5kKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBpbml0aWFsID8gb2JqLnJlZHVjZShpdGVyYXRvciwgbWVtbykgOiBvYmoucmVkdWNlKGl0ZXJhdG9yKTtcbiAgICB9XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKCFpbml0aWFsKSB7XG4gICAgICAgIG1lbW8gPSB2YWx1ZTtcbiAgICAgICAgaW5pdGlhbCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZW1vID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBtZW1vLCB2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghaW5pdGlhbCkgdGhyb3cgbmV3IFR5cGVFcnJvcihyZWR1Y2VFcnJvcik7XG4gICAgcmV0dXJuIG1lbW87XG4gIH07XG5cbiAgLy8gVGhlIHJpZ2h0LWFzc29jaWF0aXZlIHZlcnNpb24gb2YgcmVkdWNlLCBhbHNvIGtub3duIGFzIGBmb2xkcmAuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGByZWR1Y2VSaWdodGAgaWYgYXZhaWxhYmxlLlxuICBfLnJlZHVjZVJpZ2h0ID0gXy5mb2xkciA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNvbnRleHQpIHtcbiAgICB2YXIgaW5pdGlhbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICAgIGlmIChvYmogPT0gbnVsbCkgb2JqID0gW107XG4gICAgaWYgKG5hdGl2ZVJlZHVjZVJpZ2h0ICYmIG9iai5yZWR1Y2VSaWdodCA9PT0gbmF0aXZlUmVkdWNlUmlnaHQpIHtcbiAgICAgIGlmIChjb250ZXh0KSBpdGVyYXRvciA9IF8uYmluZChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgICByZXR1cm4gaW5pdGlhbCA/IG9iai5yZWR1Y2VSaWdodChpdGVyYXRvciwgbWVtbykgOiBvYmoucmVkdWNlUmlnaHQoaXRlcmF0b3IpO1xuICAgIH1cbiAgICB2YXIgbGVuZ3RoID0gb2JqLmxlbmd0aDtcbiAgICBpZiAobGVuZ3RoICE9PSArbGVuZ3RoKSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgfVxuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGluZGV4ID0ga2V5cyA/IGtleXNbLS1sZW5ndGhdIDogLS1sZW5ndGg7XG4gICAgICBpZiAoIWluaXRpYWwpIHtcbiAgICAgICAgbWVtbyA9IG9ialtpbmRleF07XG4gICAgICAgIGluaXRpYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgbWVtbywgb2JqW2luZGV4XSwgaW5kZXgsIGxpc3QpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghaW5pdGlhbCkgdGhyb3cgbmV3IFR5cGVFcnJvcihyZWR1Y2VFcnJvcik7XG4gICAgcmV0dXJuIG1lbW87XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBmaXJzdCB2YWx1ZSB3aGljaCBwYXNzZXMgYSB0cnV0aCB0ZXN0LiBBbGlhc2VkIGFzIGBkZXRlY3RgLlxuICBfLmZpbmQgPSBfLmRldGVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICBhbnkob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSB7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIHRoYXQgcGFzcyBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBmaWx0ZXJgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgc2VsZWN0YC5cbiAgXy5maWx0ZXIgPSBfLnNlbGVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIGlmIChuYXRpdmVGaWx0ZXIgJiYgb2JqLmZpbHRlciA9PT0gbmF0aXZlRmlsdGVyKSByZXR1cm4gb2JqLmZpbHRlcihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSByZXN1bHRzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIGZvciB3aGljaCBhIHRydXRoIHRlc3QgZmFpbHMuXG4gIF8ucmVqZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiAhcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICB9LCBjb250ZXh0KTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgd2hldGhlciBhbGwgb2YgdGhlIGVsZW1lbnRzIG1hdGNoIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGV2ZXJ5YCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYGFsbGAuXG4gIF8uZXZlcnkgPSBfLmFsbCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcHJlZGljYXRlIHx8IChwcmVkaWNhdGUgPSBfLmlkZW50aXR5KTtcbiAgICB2YXIgcmVzdWx0ID0gdHJ1ZTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKG5hdGl2ZUV2ZXJ5ICYmIG9iai5ldmVyeSA9PT0gbmF0aXZlRXZlcnkpIHJldHVybiBvYmouZXZlcnkocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoIShyZXN1bHQgPSByZXN1bHQgJiYgcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkpIHJldHVybiBicmVha2VyO1xuICAgIH0pO1xuICAgIHJldHVybiAhIXJlc3VsdDtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgYXQgbGVhc3Qgb25lIGVsZW1lbnQgaW4gdGhlIG9iamVjdCBtYXRjaGVzIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHNvbWVgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgYW55YC5cbiAgdmFyIGFueSA9IF8uc29tZSA9IF8uYW55ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgfHwgKHByZWRpY2F0ZSA9IF8uaWRlbnRpdHkpO1xuICAgIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKG5hdGl2ZVNvbWUgJiYgb2JqLnNvbWUgPT09IG5hdGl2ZVNvbWUpIHJldHVybiBvYmouc29tZShwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChyZXN1bHQgfHwgKHJlc3VsdCA9IHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpKSByZXR1cm4gYnJlYWtlcjtcbiAgICB9KTtcbiAgICByZXR1cm4gISFyZXN1bHQ7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIHRoZSBhcnJheSBvciBvYmplY3QgY29udGFpbnMgYSBnaXZlbiB2YWx1ZSAodXNpbmcgYD09PWApLlxuICAvLyBBbGlhc2VkIGFzIGBpbmNsdWRlYC5cbiAgXy5jb250YWlucyA9IF8uaW5jbHVkZSA9IGZ1bmN0aW9uKG9iaiwgdGFyZ2V0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKG5hdGl2ZUluZGV4T2YgJiYgb2JqLmluZGV4T2YgPT09IG5hdGl2ZUluZGV4T2YpIHJldHVybiBvYmouaW5kZXhPZih0YXJnZXQpICE9IC0xO1xuICAgIHJldHVybiBhbnkob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSB0YXJnZXQ7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gSW52b2tlIGEgbWV0aG9kICh3aXRoIGFyZ3VtZW50cykgb24gZXZlcnkgaXRlbSBpbiBhIGNvbGxlY3Rpb24uXG4gIF8uaW52b2tlID0gZnVuY3Rpb24ob2JqLCBtZXRob2QpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICB2YXIgaXNGdW5jID0gXy5pc0Z1bmN0aW9uKG1ldGhvZCk7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiAoaXNGdW5jID8gbWV0aG9kIDogdmFsdWVbbWV0aG9kXSkuYXBwbHkodmFsdWUsIGFyZ3MpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYG1hcGA6IGZldGNoaW5nIGEgcHJvcGVydHkuXG4gIF8ucGx1Y2sgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBfLm1hcChvYmosIF8ucHJvcGVydHkoa2V5KSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmlsdGVyYDogc2VsZWN0aW5nIG9ubHkgb2JqZWN0c1xuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLndoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIF8ubWF0Y2hlcyhhdHRycykpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbmRgOiBnZXR0aW5nIHRoZSBmaXJzdCBvYmplY3RcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5maW5kV2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8uZmluZChvYmosIF8ubWF0Y2hlcyhhdHRycykpO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWF4aW11bSBlbGVtZW50IG9yIChlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgLy8gQ2FuJ3Qgb3B0aW1pemUgYXJyYXlzIG9mIGludGVnZXJzIGxvbmdlciB0aGFuIDY1LDUzNSBlbGVtZW50cy5cbiAgLy8gU2VlIFtXZWJLaXQgQnVnIDgwNzk3XShodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9ODA3OTcpXG4gIF8ubWF4ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0FycmF5KG9iaikgJiYgb2JqWzBdID09PSArb2JqWzBdICYmIG9iai5sZW5ndGggPCA2NTUzNSkge1xuICAgICAgcmV0dXJuIE1hdGgubWF4LmFwcGx5KE1hdGgsIG9iaik7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSAtSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IC1JbmZpbml0eTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICB2YXIgY29tcHV0ZWQgPSBpdGVyYXRvciA/IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSA6IHZhbHVlO1xuICAgICAgaWYgKGNvbXB1dGVkID4gbGFzdENvbXB1dGVkKSB7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWluaW11bSBlbGVtZW50IChvciBlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgXy5taW4gPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzQXJyYXkob2JqKSAmJiBvYmpbMF0gPT09ICtvYmpbMF0gJiYgb2JqLmxlbmd0aCA8IDY1NTM1KSB7XG4gICAgICByZXR1cm4gTWF0aC5taW4uYXBwbHkoTWF0aCwgb2JqKTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IEluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSBJbmZpbml0eTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICB2YXIgY29tcHV0ZWQgPSBpdGVyYXRvciA/IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSA6IHZhbHVlO1xuICAgICAgaWYgKGNvbXB1dGVkIDwgbGFzdENvbXB1dGVkKSB7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFNodWZmbGUgYW4gYXJyYXksIHVzaW5nIHRoZSBtb2Rlcm4gdmVyc2lvbiBvZiB0aGVcbiAgLy8gW0Zpc2hlci1ZYXRlcyBzaHVmZmxlXShodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Zpc2hlcuKAk1lhdGVzX3NodWZmbGUpLlxuICBfLnNodWZmbGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmFuZDtcbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzaHVmZmxlZCA9IFtdO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmFuZCA9IF8ucmFuZG9tKGluZGV4KyspO1xuICAgICAgc2h1ZmZsZWRbaW5kZXggLSAxXSA9IHNodWZmbGVkW3JhbmRdO1xuICAgICAgc2h1ZmZsZWRbcmFuZF0gPSB2YWx1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gc2h1ZmZsZWQ7XG4gIH07XG5cbiAgLy8gU2FtcGxlICoqbioqIHJhbmRvbSB2YWx1ZXMgZnJvbSBhIGNvbGxlY3Rpb24uXG4gIC8vIElmICoqbioqIGlzIG5vdCBzcGVjaWZpZWQsIHJldHVybnMgYSBzaW5nbGUgcmFuZG9tIGVsZW1lbnQuXG4gIC8vIFRoZSBpbnRlcm5hbCBgZ3VhcmRgIGFyZ3VtZW50IGFsbG93cyBpdCB0byB3b3JrIHdpdGggYG1hcGAuXG4gIF8uc2FtcGxlID0gZnVuY3Rpb24ob2JqLCBuLCBndWFyZCkge1xuICAgIGlmIChuID09IG51bGwgfHwgZ3VhcmQpIHtcbiAgICAgIGlmIChvYmoubGVuZ3RoICE9PSArb2JqLmxlbmd0aCkgb2JqID0gXy52YWx1ZXMob2JqKTtcbiAgICAgIHJldHVybiBvYmpbXy5yYW5kb20ob2JqLmxlbmd0aCAtIDEpXTtcbiAgICB9XG4gICAgcmV0dXJuIF8uc2h1ZmZsZShvYmopLnNsaWNlKDAsIE1hdGgubWF4KDAsIG4pKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB0byBnZW5lcmF0ZSBsb29rdXAgaXRlcmF0b3JzLlxuICB2YXIgbG9va3VwSXRlcmF0b3IgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gXy5pZGVudGl0eTtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuICAgIHJldHVybiBfLnByb3BlcnR5KHZhbHVlKTtcbiAgfTtcblxuICAvLyBTb3J0IHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24gcHJvZHVjZWQgYnkgYW4gaXRlcmF0b3IuXG4gIF8uc29ydEJ5ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGl0ZXJhdG9yID0gbG9va3VwSXRlcmF0b3IoaXRlcmF0b3IpO1xuICAgIHJldHVybiBfLnBsdWNrKF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgIGluZGV4OiBpbmRleCxcbiAgICAgICAgY3JpdGVyaWE6IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KVxuICAgICAgfTtcbiAgICB9KS5zb3J0KGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gICAgICB2YXIgYSA9IGxlZnQuY3JpdGVyaWE7XG4gICAgICB2YXIgYiA9IHJpZ2h0LmNyaXRlcmlhO1xuICAgICAgaWYgKGEgIT09IGIpIHtcbiAgICAgICAgaWYgKGEgPiBiIHx8IGEgPT09IHZvaWQgMCkgcmV0dXJuIDE7XG4gICAgICAgIGlmIChhIDwgYiB8fCBiID09PSB2b2lkIDApIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsZWZ0LmluZGV4IC0gcmlnaHQuaW5kZXg7XG4gICAgfSksICd2YWx1ZScpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIHVzZWQgZm9yIGFnZ3JlZ2F0ZSBcImdyb3VwIGJ5XCIgb3BlcmF0aW9ucy5cbiAgdmFyIGdyb3VwID0gZnVuY3Rpb24oYmVoYXZpb3IpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgIHZhciBrZXkgPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgb2JqKTtcbiAgICAgICAgYmVoYXZpb3IocmVzdWx0LCBrZXksIHZhbHVlKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEdyb3VwcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLiBQYXNzIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGVcbiAgLy8gdG8gZ3JvdXAgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBjcml0ZXJpb24uXG4gIF8uZ3JvdXBCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5LCB2YWx1ZSkge1xuICAgIF8uaGFzKHJlc3VsdCwga2V5KSA/IHJlc3VsdFtrZXldLnB1c2godmFsdWUpIDogcmVzdWx0W2tleV0gPSBbdmFsdWVdO1xuICB9KTtcblxuICAvLyBJbmRleGVzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24sIHNpbWlsYXIgdG8gYGdyb3VwQnlgLCBidXQgZm9yXG4gIC8vIHdoZW4geW91IGtub3cgdGhhdCB5b3VyIGluZGV4IHZhbHVlcyB3aWxsIGJlIHVuaXF1ZS5cbiAgXy5pbmRleEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXksIHZhbHVlKSB7XG4gICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgfSk7XG5cbiAgLy8gQ291bnRzIGluc3RhbmNlcyBvZiBhbiBvYmplY3QgdGhhdCBncm91cCBieSBhIGNlcnRhaW4gY3JpdGVyaW9uLiBQYXNzXG4gIC8vIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGUgdG8gY291bnQgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZVxuICAvLyBjcml0ZXJpb24uXG4gIF8uY291bnRCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5KSB7XG4gICAgXy5oYXMocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0rKyA6IHJlc3VsdFtrZXldID0gMTtcbiAgfSk7XG5cbiAgLy8gVXNlIGEgY29tcGFyYXRvciBmdW5jdGlvbiB0byBmaWd1cmUgb3V0IHRoZSBzbWFsbGVzdCBpbmRleCBhdCB3aGljaFxuICAvLyBhbiBvYmplY3Qgc2hvdWxkIGJlIGluc2VydGVkIHNvIGFzIHRvIG1haW50YWluIG9yZGVyLiBVc2VzIGJpbmFyeSBzZWFyY2guXG4gIF8uc29ydGVkSW5kZXggPSBmdW5jdGlvbihhcnJheSwgb2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGl0ZXJhdG9yID0gbG9va3VwSXRlcmF0b3IoaXRlcmF0b3IpO1xuICAgIHZhciB2YWx1ZSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqKTtcbiAgICB2YXIgbG93ID0gMCwgaGlnaCA9IGFycmF5Lmxlbmd0aDtcbiAgICB3aGlsZSAobG93IDwgaGlnaCkge1xuICAgICAgdmFyIG1pZCA9IChsb3cgKyBoaWdoKSA+Pj4gMTtcbiAgICAgIGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgYXJyYXlbbWlkXSkgPCB2YWx1ZSA/IGxvdyA9IG1pZCArIDEgOiBoaWdoID0gbWlkO1xuICAgIH1cbiAgICByZXR1cm4gbG93O1xuICB9O1xuXG4gIC8vIFNhZmVseSBjcmVhdGUgYSByZWFsLCBsaXZlIGFycmF5IGZyb20gYW55dGhpbmcgaXRlcmFibGUuXG4gIF8udG9BcnJheSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghb2JqKSByZXR1cm4gW107XG4gICAgaWYgKF8uaXNBcnJheShvYmopKSByZXR1cm4gc2xpY2UuY2FsbChvYmopO1xuICAgIGlmIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkgcmV0dXJuIF8ubWFwKG9iaiwgXy5pZGVudGl0eSk7XG4gICAgcmV0dXJuIF8udmFsdWVzKG9iaik7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgaW4gYW4gb2JqZWN0LlxuICBfLnNpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiAwO1xuICAgIHJldHVybiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpID8gb2JqLmxlbmd0aCA6IF8ua2V5cyhvYmopLmxlbmd0aDtcbiAgfTtcblxuICAvLyBBcnJheSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gR2V0IHRoZSBmaXJzdCBlbGVtZW50IG9mIGFuIGFycmF5LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIHRoZSBmaXJzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuIEFsaWFzZWQgYXMgYGhlYWRgIGFuZCBgdGFrZWAuIFRoZSAqKmd1YXJkKiogY2hlY2tcbiAgLy8gYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLmZpcnN0ID0gXy5oZWFkID0gXy50YWtlID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgaWYgKChuID09IG51bGwpIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbMF07XG4gICAgaWYgKG4gPCAwKSByZXR1cm4gW107XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIG4pO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGxhc3QgZW50cnkgb2YgdGhlIGFycmF5LiBFc3BlY2lhbGx5IHVzZWZ1bCBvblxuICAvLyB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiBhbGwgdGhlIHZhbHVlcyBpblxuICAvLyB0aGUgYXJyYXksIGV4Y2x1ZGluZyB0aGUgbGFzdCBOLiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGhcbiAgLy8gYF8ubWFwYC5cbiAgXy5pbml0aWFsID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIGFycmF5Lmxlbmd0aCAtICgobiA9PSBudWxsKSB8fCBndWFyZCA/IDEgOiBuKSk7XG4gIH07XG5cbiAgLy8gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGxhc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5sYXN0ID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgaWYgKChuID09IG51bGwpIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV07XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIE1hdGgubWF4KGFycmF5Lmxlbmd0aCAtIG4sIDApKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBmaXJzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEFsaWFzZWQgYXMgYHRhaWxgIGFuZCBgZHJvcGAuXG4gIC8vIEVzcGVjaWFsbHkgdXNlZnVsIG9uIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nIGFuICoqbioqIHdpbGwgcmV0dXJuXG4gIC8vIHRoZSByZXN0IE4gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKlxuICAvLyBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ucmVzdCA9IF8udGFpbCA9IF8uZHJvcCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAobiA9PSBudWxsKSB8fCBndWFyZCA/IDEgOiBuKTtcbiAgfTtcblxuICAvLyBUcmltIG91dCBhbGwgZmFsc3kgdmFsdWVzIGZyb20gYW4gYXJyYXkuXG4gIF8uY29tcGFjdCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBfLmlkZW50aXR5KTtcbiAgfTtcblxuICAvLyBJbnRlcm5hbCBpbXBsZW1lbnRhdGlvbiBvZiBhIHJlY3Vyc2l2ZSBgZmxhdHRlbmAgZnVuY3Rpb24uXG4gIHZhciBmbGF0dGVuID0gZnVuY3Rpb24oaW5wdXQsIHNoYWxsb3csIG91dHB1dCkge1xuICAgIGlmIChzaGFsbG93ICYmIF8uZXZlcnkoaW5wdXQsIF8uaXNBcnJheSkpIHtcbiAgICAgIHJldHVybiBjb25jYXQuYXBwbHkob3V0cHV0LCBpbnB1dCk7XG4gICAgfVxuICAgIGVhY2goaW5wdXQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSB8fCBfLmlzQXJndW1lbnRzKHZhbHVlKSkge1xuICAgICAgICBzaGFsbG93ID8gcHVzaC5hcHBseShvdXRwdXQsIHZhbHVlKSA6IGZsYXR0ZW4odmFsdWUsIHNoYWxsb3csIG91dHB1dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXRwdXQucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcblxuICAvLyBGbGF0dGVuIG91dCBhbiBhcnJheSwgZWl0aGVyIHJlY3Vyc2l2ZWx5IChieSBkZWZhdWx0KSwgb3IganVzdCBvbmUgbGV2ZWwuXG4gIF8uZmxhdHRlbiA9IGZ1bmN0aW9uKGFycmF5LCBzaGFsbG93KSB7XG4gICAgcmV0dXJuIGZsYXR0ZW4oYXJyYXksIHNoYWxsb3csIFtdKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSB2ZXJzaW9uIG9mIHRoZSBhcnJheSB0aGF0IGRvZXMgbm90IGNvbnRhaW4gdGhlIHNwZWNpZmllZCB2YWx1ZShzKS5cbiAgXy53aXRob3V0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5kaWZmZXJlbmNlKGFycmF5LCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICB9O1xuXG4gIC8vIFNwbGl0IGFuIGFycmF5IGludG8gdHdvIGFycmF5czogb25lIHdob3NlIGVsZW1lbnRzIGFsbCBzYXRpc2Z5IHRoZSBnaXZlblxuICAvLyBwcmVkaWNhdGUsIGFuZCBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIGRvIG5vdCBzYXRpc2Z5IHRoZSBwcmVkaWNhdGUuXG4gIF8ucGFydGl0aW9uID0gZnVuY3Rpb24oYXJyYXksIHByZWRpY2F0ZSkge1xuICAgIHZhciBwYXNzID0gW10sIGZhaWwgPSBbXTtcbiAgICBlYWNoKGFycmF5LCBmdW5jdGlvbihlbGVtKSB7XG4gICAgICAocHJlZGljYXRlKGVsZW0pID8gcGFzcyA6IGZhaWwpLnB1c2goZWxlbSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFtwYXNzLCBmYWlsXTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGEgZHVwbGljYXRlLWZyZWUgdmVyc2lvbiBvZiB0aGUgYXJyYXkuIElmIHRoZSBhcnJheSBoYXMgYWxyZWFkeVxuICAvLyBiZWVuIHNvcnRlZCwgeW91IGhhdmUgdGhlIG9wdGlvbiBvZiB1c2luZyBhIGZhc3RlciBhbGdvcml0aG0uXG4gIC8vIEFsaWFzZWQgYXMgYHVuaXF1ZWAuXG4gIF8udW5pcSA9IF8udW5pcXVlID0gZnVuY3Rpb24oYXJyYXksIGlzU29ydGVkLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oaXNTb3J0ZWQpKSB7XG4gICAgICBjb250ZXh0ID0gaXRlcmF0b3I7XG4gICAgICBpdGVyYXRvciA9IGlzU29ydGVkO1xuICAgICAgaXNTb3J0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGluaXRpYWwgPSBpdGVyYXRvciA/IF8ubWFwKGFycmF5LCBpdGVyYXRvciwgY29udGV4dCkgOiBhcnJheTtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIHZhciBzZWVuID0gW107XG4gICAgZWFjaChpbml0aWFsLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgIGlmIChpc1NvcnRlZCA/ICghaW5kZXggfHwgc2VlbltzZWVuLmxlbmd0aCAtIDFdICE9PSB2YWx1ZSkgOiAhXy5jb250YWlucyhzZWVuLCB2YWx1ZSkpIHtcbiAgICAgICAgc2Vlbi5wdXNoKHZhbHVlKTtcbiAgICAgICAgcmVzdWx0cy5wdXNoKGFycmF5W2luZGV4XSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSB1bmlvbjogZWFjaCBkaXN0aW5jdCBlbGVtZW50IGZyb20gYWxsIG9mXG4gIC8vIHRoZSBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLnVuaW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF8udW5pcShfLmZsYXR0ZW4oYXJndW1lbnRzLCB0cnVlKSk7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIGV2ZXJ5IGl0ZW0gc2hhcmVkIGJldHdlZW4gYWxsIHRoZVxuICAvLyBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLmludGVyc2VjdGlvbiA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKF8udW5pcShhcnJheSksIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHJldHVybiBfLmV2ZXJ5KHJlc3QsIGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICAgIHJldHVybiBfLmNvbnRhaW5zKG90aGVyLCBpdGVtKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIFRha2UgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBvbmUgYXJyYXkgYW5kIGEgbnVtYmVyIG9mIG90aGVyIGFycmF5cy5cbiAgLy8gT25seSB0aGUgZWxlbWVudHMgcHJlc2VudCBpbiBqdXN0IHRoZSBmaXJzdCBhcnJheSB3aWxsIHJlbWFpbi5cbiAgXy5kaWZmZXJlbmNlID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgcmVzdCA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgZnVuY3Rpb24odmFsdWUpeyByZXR1cm4gIV8uY29udGFpbnMocmVzdCwgdmFsdWUpOyB9KTtcbiAgfTtcblxuICAvLyBaaXAgdG9nZXRoZXIgbXVsdGlwbGUgbGlzdHMgaW50byBhIHNpbmdsZSBhcnJheSAtLSBlbGVtZW50cyB0aGF0IHNoYXJlXG4gIC8vIGFuIGluZGV4IGdvIHRvZ2V0aGVyLlxuICBfLnppcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsZW5ndGggPSBfLm1heChfLnBsdWNrKGFyZ3VtZW50cywgJ2xlbmd0aCcpLmNvbmNhdCgwKSk7XG4gICAgdmFyIHJlc3VsdHMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICByZXN1bHRzW2ldID0gXy5wbHVjayhhcmd1bWVudHMsICcnICsgaSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIENvbnZlcnRzIGxpc3RzIGludG8gb2JqZWN0cy4gUGFzcyBlaXRoZXIgYSBzaW5nbGUgYXJyYXkgb2YgYFtrZXksIHZhbHVlXWBcbiAgLy8gcGFpcnMsIG9yIHR3byBwYXJhbGxlbCBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoIC0tIG9uZSBvZiBrZXlzLCBhbmQgb25lIG9mXG4gIC8vIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlcy5cbiAgXy5vYmplY3QgPSBmdW5jdGlvbihsaXN0LCB2YWx1ZXMpIHtcbiAgICBpZiAobGlzdCA9PSBudWxsKSByZXR1cm4ge307XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBsaXN0Lmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodmFsdWVzKSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldXSA9IHZhbHVlc1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldWzBdXSA9IGxpc3RbaV1bMV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gSWYgdGhlIGJyb3dzZXIgZG9lc24ndCBzdXBwbHkgdXMgd2l0aCBpbmRleE9mIChJJ20gbG9va2luZyBhdCB5b3UsICoqTVNJRSoqKSxcbiAgLy8gd2UgbmVlZCB0aGlzIGZ1bmN0aW9uLiBSZXR1cm4gdGhlIHBvc2l0aW9uIG9mIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIGFuXG4gIC8vIGl0ZW0gaW4gYW4gYXJyYXksIG9yIC0xIGlmIHRoZSBpdGVtIGlzIG5vdCBpbmNsdWRlZCBpbiB0aGUgYXJyYXkuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBpbmRleE9mYCBpZiBhdmFpbGFibGUuXG4gIC8vIElmIHRoZSBhcnJheSBpcyBsYXJnZSBhbmQgYWxyZWFkeSBpbiBzb3J0IG9yZGVyLCBwYXNzIGB0cnVlYFxuICAvLyBmb3IgKippc1NvcnRlZCoqIHRvIHVzZSBiaW5hcnkgc2VhcmNoLlxuICBfLmluZGV4T2YgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgaXNTb3J0ZWQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuICAgIGlmIChpc1NvcnRlZCkge1xuICAgICAgaWYgKHR5cGVvZiBpc1NvcnRlZCA9PSAnbnVtYmVyJykge1xuICAgICAgICBpID0gKGlzU29ydGVkIDwgMCA/IE1hdGgubWF4KDAsIGxlbmd0aCArIGlzU29ydGVkKSA6IGlzU29ydGVkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGkgPSBfLnNvcnRlZEluZGV4KGFycmF5LCBpdGVtKTtcbiAgICAgICAgcmV0dXJuIGFycmF5W2ldID09PSBpdGVtID8gaSA6IC0xO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAobmF0aXZlSW5kZXhPZiAmJiBhcnJheS5pbmRleE9mID09PSBuYXRpdmVJbmRleE9mKSByZXR1cm4gYXJyYXkuaW5kZXhPZihpdGVtLCBpc1NvcnRlZCk7XG4gICAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykgaWYgKGFycmF5W2ldID09PSBpdGVtKSByZXR1cm4gaTtcbiAgICByZXR1cm4gLTE7XG4gIH07XG5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGxhc3RJbmRleE9mYCBpZiBhdmFpbGFibGUuXG4gIF8ubGFzdEluZGV4T2YgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgZnJvbSkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGhhc0luZGV4ID0gZnJvbSAhPSBudWxsO1xuICAgIGlmIChuYXRpdmVMYXN0SW5kZXhPZiAmJiBhcnJheS5sYXN0SW5kZXhPZiA9PT0gbmF0aXZlTGFzdEluZGV4T2YpIHtcbiAgICAgIHJldHVybiBoYXNJbmRleCA/IGFycmF5Lmxhc3RJbmRleE9mKGl0ZW0sIGZyb20pIDogYXJyYXkubGFzdEluZGV4T2YoaXRlbSk7XG4gICAgfVxuICAgIHZhciBpID0gKGhhc0luZGV4ID8gZnJvbSA6IGFycmF5Lmxlbmd0aCk7XG4gICAgd2hpbGUgKGktLSkgaWYgKGFycmF5W2ldID09PSBpdGVtKSByZXR1cm4gaTtcbiAgICByZXR1cm4gLTE7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYW4gaW50ZWdlciBBcnJheSBjb250YWluaW5nIGFuIGFyaXRobWV0aWMgcHJvZ3Jlc3Npb24uIEEgcG9ydCBvZlxuICAvLyB0aGUgbmF0aXZlIFB5dGhvbiBgcmFuZ2UoKWAgZnVuY3Rpb24uIFNlZVxuICAvLyBbdGhlIFB5dGhvbiBkb2N1bWVudGF0aW9uXShodHRwOi8vZG9jcy5weXRob24ub3JnL2xpYnJhcnkvZnVuY3Rpb25zLmh0bWwjcmFuZ2UpLlxuICBfLnJhbmdlID0gZnVuY3Rpb24oc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8PSAxKSB7XG4gICAgICBzdG9wID0gc3RhcnQgfHwgMDtcbiAgICAgIHN0YXJ0ID0gMDtcbiAgICB9XG4gICAgc3RlcCA9IGFyZ3VtZW50c1syXSB8fCAxO1xuXG4gICAgdmFyIGxlbmd0aCA9IE1hdGgubWF4KE1hdGguY2VpbCgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXApLCAwKTtcbiAgICB2YXIgaWR4ID0gMDtcbiAgICB2YXIgcmFuZ2UgPSBuZXcgQXJyYXkobGVuZ3RoKTtcblxuICAgIHdoaWxlKGlkeCA8IGxlbmd0aCkge1xuICAgICAgcmFuZ2VbaWR4KytdID0gc3RhcnQ7XG4gICAgICBzdGFydCArPSBzdGVwO1xuICAgIH1cblxuICAgIHJldHVybiByYW5nZTtcbiAgfTtcblxuICAvLyBGdW5jdGlvbiAoYWhlbSkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJldXNhYmxlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciBwcm90b3R5cGUgc2V0dGluZy5cbiAgdmFyIGN0b3IgPSBmdW5jdGlvbigpe307XG5cbiAgLy8gQ3JlYXRlIGEgZnVuY3Rpb24gYm91bmQgdG8gYSBnaXZlbiBvYmplY3QgKGFzc2lnbmluZyBgdGhpc2AsIGFuZCBhcmd1bWVudHMsXG4gIC8vIG9wdGlvbmFsbHkpLiBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgRnVuY3Rpb24uYmluZGAgaWZcbiAgLy8gYXZhaWxhYmxlLlxuICBfLmJpbmQgPSBmdW5jdGlvbihmdW5jLCBjb250ZXh0KSB7XG4gICAgdmFyIGFyZ3MsIGJvdW5kO1xuICAgIGlmIChuYXRpdmVCaW5kICYmIGZ1bmMuYmluZCA9PT0gbmF0aXZlQmluZCkgcmV0dXJuIG5hdGl2ZUJpbmQuYXBwbHkoZnVuYywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBpZiAoIV8uaXNGdW5jdGlvbihmdW5jKSkgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBib3VuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIGJvdW5kKSkgcmV0dXJuIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IGZ1bmMucHJvdG90eXBlO1xuICAgICAgdmFyIHNlbGYgPSBuZXcgY3RvcjtcbiAgICAgIGN0b3IucHJvdG90eXBlID0gbnVsbDtcbiAgICAgIHZhciByZXN1bHQgPSBmdW5jLmFwcGx5KHNlbGYsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgaWYgKE9iamVjdChyZXN1bHQpID09PSByZXN1bHQpIHJldHVybiByZXN1bHQ7XG4gICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFBhcnRpYWxseSBhcHBseSBhIGZ1bmN0aW9uIGJ5IGNyZWF0aW5nIGEgdmVyc2lvbiB0aGF0IGhhcyBoYWQgc29tZSBvZiBpdHNcbiAgLy8gYXJndW1lbnRzIHByZS1maWxsZWQsIHdpdGhvdXQgY2hhbmdpbmcgaXRzIGR5bmFtaWMgYHRoaXNgIGNvbnRleHQuIF8gYWN0c1xuICAvLyBhcyBhIHBsYWNlaG9sZGVyLCBhbGxvd2luZyBhbnkgY29tYmluYXRpb24gb2YgYXJndW1lbnRzIHRvIGJlIHByZS1maWxsZWQuXG4gIF8ucGFydGlhbCA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB2YXIgYm91bmRBcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwb3NpdGlvbiA9IDA7XG4gICAgICB2YXIgYXJncyA9IGJvdW5kQXJncy5zbGljZSgpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGFyZ3MubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGFyZ3NbaV0gPT09IF8pIGFyZ3NbaV0gPSBhcmd1bWVudHNbcG9zaXRpb24rK107XG4gICAgICB9XG4gICAgICB3aGlsZSAocG9zaXRpb24gPCBhcmd1bWVudHMubGVuZ3RoKSBhcmdzLnB1c2goYXJndW1lbnRzW3Bvc2l0aW9uKytdKTtcbiAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gQmluZCBhIG51bWJlciBvZiBhbiBvYmplY3QncyBtZXRob2RzIHRvIHRoYXQgb2JqZWN0LiBSZW1haW5pbmcgYXJndW1lbnRzXG4gIC8vIGFyZSB0aGUgbWV0aG9kIG5hbWVzIHRvIGJlIGJvdW5kLiBVc2VmdWwgZm9yIGVuc3VyaW5nIHRoYXQgYWxsIGNhbGxiYWNrc1xuICAvLyBkZWZpbmVkIG9uIGFuIG9iamVjdCBiZWxvbmcgdG8gaXQuXG4gIF8uYmluZEFsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBmdW5jcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBpZiAoZnVuY3MubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ2JpbmRBbGwgbXVzdCBiZSBwYXNzZWQgZnVuY3Rpb24gbmFtZXMnKTtcbiAgICBlYWNoKGZ1bmNzLCBmdW5jdGlvbihmKSB7IG9ialtmXSA9IF8uYmluZChvYmpbZl0sIG9iaik7IH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gTWVtb2l6ZSBhbiBleHBlbnNpdmUgZnVuY3Rpb24gYnkgc3RvcmluZyBpdHMgcmVzdWx0cy5cbiAgXy5tZW1vaXplID0gZnVuY3Rpb24oZnVuYywgaGFzaGVyKSB7XG4gICAgdmFyIG1lbW8gPSB7fTtcbiAgICBoYXNoZXIgfHwgKGhhc2hlciA9IF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBrZXkgPSBoYXNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBfLmhhcyhtZW1vLCBrZXkpID8gbWVtb1trZXldIDogKG1lbW9ba2V5XSA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBEZWxheXMgYSBmdW5jdGlvbiBmb3IgdGhlIGdpdmVuIG51bWJlciBvZiBtaWxsaXNlY29uZHMsIGFuZCB0aGVuIGNhbGxzXG4gIC8vIGl0IHdpdGggdGhlIGFyZ3VtZW50cyBzdXBwbGllZC5cbiAgXy5kZWxheSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpeyByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmdzKTsgfSwgd2FpdCk7XG4gIH07XG5cbiAgLy8gRGVmZXJzIGEgZnVuY3Rpb24sIHNjaGVkdWxpbmcgaXQgdG8gcnVuIGFmdGVyIHRoZSBjdXJyZW50IGNhbGwgc3RhY2sgaGFzXG4gIC8vIGNsZWFyZWQuXG4gIF8uZGVmZXIgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgcmV0dXJuIF8uZGVsYXkuYXBwbHkoXywgW2Z1bmMsIDFdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2VcbiAgLy8gZHVyaW5nIGEgZ2l2ZW4gd2luZG93IG9mIHRpbWUuIE5vcm1hbGx5LCB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIHdpbGwgcnVuXG4gIC8vIGFzIG11Y2ggYXMgaXQgY2FuLCB3aXRob3V0IGV2ZXIgZ29pbmcgbW9yZSB0aGFuIG9uY2UgcGVyIGB3YWl0YCBkdXJhdGlvbjtcbiAgLy8gYnV0IGlmIHlvdSdkIGxpa2UgdG8gZGlzYWJsZSB0aGUgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2UsIHBhc3NcbiAgLy8gYHtsZWFkaW5nOiBmYWxzZX1gLiBUbyBkaXNhYmxlIGV4ZWN1dGlvbiBvbiB0aGUgdHJhaWxpbmcgZWRnZSwgZGl0dG8uXG4gIF8udGhyb3R0bGUgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gICAgdmFyIGNvbnRleHQsIGFyZ3MsIHJlc3VsdDtcbiAgICB2YXIgdGltZW91dCA9IG51bGw7XG4gICAgdmFyIHByZXZpb3VzID0gMDtcbiAgICBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcHJldmlvdXMgPSBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlID8gMCA6IF8ubm93KCk7XG4gICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgfTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbm93ID0gXy5ub3coKTtcbiAgICAgIGlmICghcHJldmlvdXMgJiYgb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSkgcHJldmlvdXMgPSBub3c7XG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3cgLSBwcmV2aW91cyk7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBpZiAocmVtYWluaW5nIDw9IDApIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgIH0gZWxzZSBpZiAoIXRpbWVvdXQgJiYgb3B0aW9ucy50cmFpbGluZyAhPT0gZmFsc2UpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHJlbWFpbmluZyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCBhcyBsb25nIGFzIGl0IGNvbnRpbnVlcyB0byBiZSBpbnZva2VkLCB3aWxsIG5vdFxuICAvLyBiZSB0cmlnZ2VyZWQuIFRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBhZnRlciBpdCBzdG9wcyBiZWluZyBjYWxsZWQgZm9yXG4gIC8vIE4gbWlsbGlzZWNvbmRzLiBJZiBgaW1tZWRpYXRlYCBpcyBwYXNzZWQsIHRyaWdnZXIgdGhlIGZ1bmN0aW9uIG9uIHRoZVxuICAvLyBsZWFkaW5nIGVkZ2UsIGluc3RlYWQgb2YgdGhlIHRyYWlsaW5nLlxuICBfLmRlYm91bmNlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgaW1tZWRpYXRlKSB7XG4gICAgdmFyIHRpbWVvdXQsIGFyZ3MsIGNvbnRleHQsIHRpbWVzdGFtcCwgcmVzdWx0O1xuXG4gICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbGFzdCA9IF8ubm93KCkgLSB0aW1lc3RhbXA7XG4gICAgICBpZiAobGFzdCA8IHdhaXQpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQgLSBsYXN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBpZiAoIWltbWVkaWF0ZSkge1xuICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHRpbWVzdGFtcCA9IF8ubm93KCk7XG4gICAgICB2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcbiAgICAgIGlmICghdGltZW91dCkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XG4gICAgICB9XG4gICAgICBpZiAoY2FsbE5vdykge1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIGF0IG1vc3Qgb25lIHRpbWUsIG5vIG1hdHRlciBob3dcbiAgLy8gb2Z0ZW4geW91IGNhbGwgaXQuIFVzZWZ1bCBmb3IgbGF6eSBpbml0aWFsaXphdGlvbi5cbiAgXy5vbmNlID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciByYW4gPSBmYWxzZSwgbWVtbztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAocmFuKSByZXR1cm4gbWVtbztcbiAgICAgIHJhbiA9IHRydWU7XG4gICAgICBtZW1vID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgZnVuYyA9IG51bGw7XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IGZ1bmN0aW9uIHBhc3NlZCBhcyBhbiBhcmd1bWVudCB0byB0aGUgc2Vjb25kLFxuICAvLyBhbGxvd2luZyB5b3UgdG8gYWRqdXN0IGFyZ3VtZW50cywgcnVuIGNvZGUgYmVmb3JlIGFuZCBhZnRlciwgYW5kXG4gIC8vIGNvbmRpdGlvbmFsbHkgZXhlY3V0ZSB0aGUgb3JpZ2luYWwgZnVuY3Rpb24uXG4gIF8ud3JhcCA9IGZ1bmN0aW9uKGZ1bmMsIHdyYXBwZXIpIHtcbiAgICByZXR1cm4gXy5wYXJ0aWFsKHdyYXBwZXIsIGZ1bmMpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGlzIHRoZSBjb21wb3NpdGlvbiBvZiBhIGxpc3Qgb2YgZnVuY3Rpb25zLCBlYWNoXG4gIC8vIGNvbnN1bWluZyB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiB0aGF0IGZvbGxvd3MuXG4gIF8uY29tcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmdW5jcyA9IGFyZ3VtZW50cztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGZvciAodmFyIGkgPSBmdW5jcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBhcmdzID0gW2Z1bmNzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhcmdzWzBdO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBvbmx5IGJlIGV4ZWN1dGVkIGFmdGVyIGJlaW5nIGNhbGxlZCBOIHRpbWVzLlxuICBfLmFmdGVyID0gZnVuY3Rpb24odGltZXMsIGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoLS10aW1lcyA8IDEpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xuXG4gIC8vIE9iamVjdCBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJldHJpZXZlIHRoZSBuYW1lcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgT2JqZWN0LmtleXNgXG4gIF8ua2V5cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gW107XG4gICAgaWYgKG5hdGl2ZUtleXMpIHJldHVybiBuYXRpdmVLZXlzKG9iaik7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSBrZXlzLnB1c2goa2V5KTtcbiAgICByZXR1cm4ga2V5cztcbiAgfTtcblxuICAvLyBSZXRyaWV2ZSB0aGUgdmFsdWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIF8udmFsdWVzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgdmFyIHZhbHVlcyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhbHVlc1tpXSA9IG9ialtrZXlzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfTtcblxuICAvLyBDb252ZXJ0IGFuIG9iamVjdCBpbnRvIGEgbGlzdCBvZiBgW2tleSwgdmFsdWVdYCBwYWlycy5cbiAgXy5wYWlycyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciBwYWlycyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHBhaXJzW2ldID0gW2tleXNbaV0sIG9ialtrZXlzW2ldXV07XG4gICAgfVxuICAgIHJldHVybiBwYWlycztcbiAgfTtcblxuICAvLyBJbnZlcnQgdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhbiBvYmplY3QuIFRoZSB2YWx1ZXMgbXVzdCBiZSBzZXJpYWxpemFibGUuXG4gIF8uaW52ZXJ0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdFtvYmpba2V5c1tpXV1dID0ga2V5c1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBzb3J0ZWQgbGlzdCBvZiB0aGUgZnVuY3Rpb24gbmFtZXMgYXZhaWxhYmxlIG9uIHRoZSBvYmplY3QuXG4gIC8vIEFsaWFzZWQgYXMgYG1ldGhvZHNgXG4gIF8uZnVuY3Rpb25zID0gXy5tZXRob2RzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIG5hbWVzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihvYmpba2V5XSkpIG5hbWVzLnB1c2goa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWVzLnNvcnQoKTtcbiAgfTtcblxuICAvLyBFeHRlbmQgYSBnaXZlbiBvYmplY3Qgd2l0aCBhbGwgdGhlIHByb3BlcnRpZXMgaW4gcGFzc2VkLWluIG9iamVjdChzKS5cbiAgXy5leHRlbmQgPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSwgZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICBpZiAoc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgb25seSBjb250YWluaW5nIHRoZSB3aGl0ZWxpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLnBpY2sgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgY29weSA9IHt9O1xuICAgIHZhciBrZXlzID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgZWFjaChrZXlzLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgIGlmIChrZXkgaW4gb2JqKSBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICB9KTtcbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IHdpdGhvdXQgdGhlIGJsYWNrbGlzdGVkIHByb3BlcnRpZXMuXG4gIF8ub21pdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBjb3B5ID0ge307XG4gICAgdmFyIGtleXMgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoIV8uY29udGFpbnMoa2V5cywga2V5KSkgY29weVtrZXldID0gb2JqW2tleV07XG4gICAgfVxuICAgIHJldHVybiBjb3B5O1xuICB9O1xuXG4gIC8vIEZpbGwgaW4gYSBnaXZlbiBvYmplY3Qgd2l0aCBkZWZhdWx0IHByb3BlcnRpZXMuXG4gIF8uZGVmYXVsdHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSwgZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICBpZiAoc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgaWYgKG9ialtwcm9wXSA9PT0gdm9pZCAwKSBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIChzaGFsbG93LWNsb25lZCkgZHVwbGljYXRlIG9mIGFuIG9iamVjdC5cbiAgXy5jbG9uZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gb2JqO1xuICAgIHJldHVybiBfLmlzQXJyYXkob2JqKSA/IG9iai5zbGljZSgpIDogXy5leHRlbmQoe30sIG9iaik7XG4gIH07XG5cbiAgLy8gSW52b2tlcyBpbnRlcmNlcHRvciB3aXRoIHRoZSBvYmosIGFuZCB0aGVuIHJldHVybnMgb2JqLlxuICAvLyBUaGUgcHJpbWFyeSBwdXJwb3NlIG9mIHRoaXMgbWV0aG9kIGlzIHRvIFwidGFwIGludG9cIiBhIG1ldGhvZCBjaGFpbiwgaW5cbiAgLy8gb3JkZXIgdG8gcGVyZm9ybSBvcGVyYXRpb25zIG9uIGludGVybWVkaWF0ZSByZXN1bHRzIHdpdGhpbiB0aGUgY2hhaW4uXG4gIF8udGFwID0gZnVuY3Rpb24ob2JqLCBpbnRlcmNlcHRvcikge1xuICAgIGludGVyY2VwdG9yKG9iaik7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBJbnRlcm5hbCByZWN1cnNpdmUgY29tcGFyaXNvbiBmdW5jdGlvbiBmb3IgYGlzRXF1YWxgLlxuICB2YXIgZXEgPSBmdW5jdGlvbihhLCBiLCBhU3RhY2ssIGJTdGFjaykge1xuICAgIC8vIElkZW50aWNhbCBvYmplY3RzIGFyZSBlcXVhbC4gYDAgPT09IC0wYCwgYnV0IHRoZXkgYXJlbid0IGlkZW50aWNhbC5cbiAgICAvLyBTZWUgdGhlIFtIYXJtb255IGBlZ2FsYCBwcm9wb3NhbF0oaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTplZ2FsKS5cbiAgICBpZiAoYSA9PT0gYikgcmV0dXJuIGEgIT09IDAgfHwgMSAvIGEgPT0gMSAvIGI7XG4gICAgLy8gQSBzdHJpY3QgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkgYmVjYXVzZSBgbnVsbCA9PSB1bmRlZmluZWRgLlxuICAgIGlmIChhID09IG51bGwgfHwgYiA9PSBudWxsKSByZXR1cm4gYSA9PT0gYjtcbiAgICAvLyBVbndyYXAgYW55IHdyYXBwZWQgb2JqZWN0cy5cbiAgICBpZiAoYSBpbnN0YW5jZW9mIF8pIGEgPSBhLl93cmFwcGVkO1xuICAgIGlmIChiIGluc3RhbmNlb2YgXykgYiA9IGIuX3dyYXBwZWQ7XG4gICAgLy8gQ29tcGFyZSBgW1tDbGFzc11dYCBuYW1lcy5cbiAgICB2YXIgY2xhc3NOYW1lID0gdG9TdHJpbmcuY2FsbChhKTtcbiAgICBpZiAoY2xhc3NOYW1lICE9IHRvU3RyaW5nLmNhbGwoYikpIHJldHVybiBmYWxzZTtcbiAgICBzd2l0Y2ggKGNsYXNzTmFtZSkge1xuICAgICAgLy8gU3RyaW5ncywgbnVtYmVycywgZGF0ZXMsIGFuZCBib29sZWFucyBhcmUgY29tcGFyZWQgYnkgdmFsdWUuXG4gICAgICBjYXNlICdbb2JqZWN0IFN0cmluZ10nOlxuICAgICAgICAvLyBQcmltaXRpdmVzIGFuZCB0aGVpciBjb3JyZXNwb25kaW5nIG9iamVjdCB3cmFwcGVycyBhcmUgZXF1aXZhbGVudDsgdGh1cywgYFwiNVwiYCBpc1xuICAgICAgICAvLyBlcXVpdmFsZW50IHRvIGBuZXcgU3RyaW5nKFwiNVwiKWAuXG4gICAgICAgIHJldHVybiBhID09IFN0cmluZyhiKTtcbiAgICAgIGNhc2UgJ1tvYmplY3QgTnVtYmVyXSc6XG4gICAgICAgIC8vIGBOYU5gcyBhcmUgZXF1aXZhbGVudCwgYnV0IG5vbi1yZWZsZXhpdmUuIEFuIGBlZ2FsYCBjb21wYXJpc29uIGlzIHBlcmZvcm1lZCBmb3JcbiAgICAgICAgLy8gb3RoZXIgbnVtZXJpYyB2YWx1ZXMuXG4gICAgICAgIHJldHVybiBhICE9ICthID8gYiAhPSArYiA6IChhID09IDAgPyAxIC8gYSA9PSAxIC8gYiA6IGEgPT0gK2IpO1xuICAgICAgY2FzZSAnW29iamVjdCBEYXRlXSc6XG4gICAgICBjYXNlICdbb2JqZWN0IEJvb2xlYW5dJzpcbiAgICAgICAgLy8gQ29lcmNlIGRhdGVzIGFuZCBib29sZWFucyB0byBudW1lcmljIHByaW1pdGl2ZSB2YWx1ZXMuIERhdGVzIGFyZSBjb21wYXJlZCBieSB0aGVpclxuICAgICAgICAvLyBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnMuIE5vdGUgdGhhdCBpbnZhbGlkIGRhdGVzIHdpdGggbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zXG4gICAgICAgIC8vIG9mIGBOYU5gIGFyZSBub3QgZXF1aXZhbGVudC5cbiAgICAgICAgcmV0dXJuICthID09ICtiO1xuICAgICAgLy8gUmVnRXhwcyBhcmUgY29tcGFyZWQgYnkgdGhlaXIgc291cmNlIHBhdHRlcm5zIGFuZCBmbGFncy5cbiAgICAgIGNhc2UgJ1tvYmplY3QgUmVnRXhwXSc6XG4gICAgICAgIHJldHVybiBhLnNvdXJjZSA9PSBiLnNvdXJjZSAmJlxuICAgICAgICAgICAgICAgYS5nbG9iYWwgPT0gYi5nbG9iYWwgJiZcbiAgICAgICAgICAgICAgIGEubXVsdGlsaW5lID09IGIubXVsdGlsaW5lICYmXG4gICAgICAgICAgICAgICBhLmlnbm9yZUNhc2UgPT0gYi5pZ25vcmVDYXNlO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGEgIT0gJ29iamVjdCcgfHwgdHlwZW9mIGIgIT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcbiAgICAvLyBBc3N1bWUgZXF1YWxpdHkgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGUgYWxnb3JpdGhtIGZvciBkZXRlY3RpbmcgY3ljbGljXG4gICAgLy8gc3RydWN0dXJlcyBpcyBhZGFwdGVkIGZyb20gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMywgYWJzdHJhY3Qgb3BlcmF0aW9uIGBKT2AuXG4gICAgdmFyIGxlbmd0aCA9IGFTdGFjay5sZW5ndGg7XG4gICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAvLyBMaW5lYXIgc2VhcmNoLiBQZXJmb3JtYW5jZSBpcyBpbnZlcnNlbHkgcHJvcG9ydGlvbmFsIHRvIHRoZSBudW1iZXIgb2ZcbiAgICAgIC8vIHVuaXF1ZSBuZXN0ZWQgc3RydWN0dXJlcy5cbiAgICAgIGlmIChhU3RhY2tbbGVuZ3RoXSA9PSBhKSByZXR1cm4gYlN0YWNrW2xlbmd0aF0gPT0gYjtcbiAgICB9XG4gICAgLy8gT2JqZWN0cyB3aXRoIGRpZmZlcmVudCBjb25zdHJ1Y3RvcnMgYXJlIG5vdCBlcXVpdmFsZW50LCBidXQgYE9iamVjdGBzXG4gICAgLy8gZnJvbSBkaWZmZXJlbnQgZnJhbWVzIGFyZS5cbiAgICB2YXIgYUN0b3IgPSBhLmNvbnN0cnVjdG9yLCBiQ3RvciA9IGIuY29uc3RydWN0b3I7XG4gICAgaWYgKGFDdG9yICE9PSBiQ3RvciAmJiAhKF8uaXNGdW5jdGlvbihhQ3RvcikgJiYgKGFDdG9yIGluc3RhbmNlb2YgYUN0b3IpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbihiQ3RvcikgJiYgKGJDdG9yIGluc3RhbmNlb2YgYkN0b3IpKVxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgKCdjb25zdHJ1Y3RvcicgaW4gYSAmJiAnY29uc3RydWN0b3InIGluIGIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEFkZCB0aGUgZmlyc3Qgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucHVzaChhKTtcbiAgICBiU3RhY2sucHVzaChiKTtcbiAgICB2YXIgc2l6ZSA9IDAsIHJlc3VsdCA9IHRydWU7XG4gICAgLy8gUmVjdXJzaXZlbHkgY29tcGFyZSBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgaWYgKGNsYXNzTmFtZSA9PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICAvLyBDb21wYXJlIGFycmF5IGxlbmd0aHMgdG8gZGV0ZXJtaW5lIGlmIGEgZGVlcCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeS5cbiAgICAgIHNpemUgPSBhLmxlbmd0aDtcbiAgICAgIHJlc3VsdCA9IHNpemUgPT0gYi5sZW5ndGg7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIC8vIERlZXAgY29tcGFyZSB0aGUgY29udGVudHMsIGlnbm9yaW5nIG5vbi1udW1lcmljIHByb3BlcnRpZXMuXG4gICAgICAgIHdoaWxlIChzaXplLS0pIHtcbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBlcShhW3NpemVdLCBiW3NpemVdLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBEZWVwIGNvbXBhcmUgb2JqZWN0cy5cbiAgICAgIGZvciAodmFyIGtleSBpbiBhKSB7XG4gICAgICAgIGlmIChfLmhhcyhhLCBrZXkpKSB7XG4gICAgICAgICAgLy8gQ291bnQgdGhlIGV4cGVjdGVkIG51bWJlciBvZiBwcm9wZXJ0aWVzLlxuICAgICAgICAgIHNpemUrKztcbiAgICAgICAgICAvLyBEZWVwIGNvbXBhcmUgZWFjaCBtZW1iZXIuXG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gXy5oYXMoYiwga2V5KSAmJiBlcShhW2tleV0sIGJba2V5XSwgYVN0YWNrLCBiU3RhY2spKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIEVuc3VyZSB0aGF0IGJvdGggb2JqZWN0cyBjb250YWluIHRoZSBzYW1lIG51bWJlciBvZiBwcm9wZXJ0aWVzLlxuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICBmb3IgKGtleSBpbiBiKSB7XG4gICAgICAgICAgaWYgKF8uaGFzKGIsIGtleSkgJiYgIShzaXplLS0pKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgPSAhc2l6ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVtb3ZlIHRoZSBmaXJzdCBvYmplY3QgZnJvbSB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnBvcCgpO1xuICAgIGJTdGFjay5wb3AoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFBlcmZvcm0gYSBkZWVwIGNvbXBhcmlzb24gdG8gY2hlY2sgaWYgdHdvIG9iamVjdHMgYXJlIGVxdWFsLlxuICBfLmlzRXF1YWwgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGVxKGEsIGIsIFtdLCBbXSk7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiBhcnJheSwgc3RyaW5nLCBvciBvYmplY3QgZW1wdHk/XG4gIC8vIEFuIFwiZW1wdHlcIiBvYmplY3QgaGFzIG5vIGVudW1lcmFibGUgb3duLXByb3BlcnRpZXMuXG4gIF8uaXNFbXB0eSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHRydWU7XG4gICAgaWYgKF8uaXNBcnJheShvYmopIHx8IF8uaXNTdHJpbmcob2JqKSkgcmV0dXJuIG9iai5sZW5ndGggPT09IDA7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBET00gZWxlbWVudD9cbiAgXy5pc0VsZW1lbnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gISEob2JqICYmIG9iai5ub2RlVHlwZSA9PT0gMSk7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhbiBhcnJheT9cbiAgLy8gRGVsZWdhdGVzIHRvIEVDTUE1J3MgbmF0aXZlIEFycmF5LmlzQXJyYXlcbiAgXy5pc0FycmF5ID0gbmF0aXZlSXNBcnJheSB8fCBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSBhbiBvYmplY3Q/XG4gIF8uaXNPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBPYmplY3Qob2JqKTtcbiAgfTtcblxuICAvLyBBZGQgc29tZSBpc1R5cGUgbWV0aG9kczogaXNBcmd1bWVudHMsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNEYXRlLCBpc1JlZ0V4cC5cbiAgZWFjaChbJ0FyZ3VtZW50cycsICdGdW5jdGlvbicsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnLCAnUmVnRXhwJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBfWydpcycgKyBuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCAnICsgbmFtZSArICddJztcbiAgICB9O1xuICB9KTtcblxuICAvLyBEZWZpbmUgYSBmYWxsYmFjayB2ZXJzaW9uIG9mIHRoZSBtZXRob2QgaW4gYnJvd3NlcnMgKGFoZW0sIElFKSwgd2hlcmVcbiAgLy8gdGhlcmUgaXNuJ3QgYW55IGluc3BlY3RhYmxlIFwiQXJndW1lbnRzXCIgdHlwZS5cbiAgaWYgKCFfLmlzQXJndW1lbnRzKGFyZ3VtZW50cykpIHtcbiAgICBfLmlzQXJndW1lbnRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gISEob2JqICYmIF8uaGFzKG9iaiwgJ2NhbGxlZScpKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gT3B0aW1pemUgYGlzRnVuY3Rpb25gIGlmIGFwcHJvcHJpYXRlLlxuICBpZiAodHlwZW9mICgvLi8pICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgXy5pc0Z1bmN0aW9uID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9O1xuICB9XG5cbiAgLy8gSXMgYSBnaXZlbiBvYmplY3QgYSBmaW5pdGUgbnVtYmVyP1xuICBfLmlzRmluaXRlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIGlzRmluaXRlKG9iaikgJiYgIWlzTmFOKHBhcnNlRmxvYXQob2JqKSk7XG4gIH07XG5cbiAgLy8gSXMgdGhlIGdpdmVuIHZhbHVlIGBOYU5gPyAoTmFOIGlzIHRoZSBvbmx5IG51bWJlciB3aGljaCBkb2VzIG5vdCBlcXVhbCBpdHNlbGYpLlxuICBfLmlzTmFOID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8uaXNOdW1iZXIob2JqKSAmJiBvYmogIT0gK29iajtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgYm9vbGVhbj9cbiAgXy5pc0Jvb2xlYW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEJvb2xlYW5dJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGVxdWFsIHRvIG51bGw/XG4gIF8uaXNOdWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gbnVsbDtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIHVuZGVmaW5lZD9cbiAgXy5pc1VuZGVmaW5lZCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHZvaWQgMDtcbiAgfTtcblxuICAvLyBTaG9ydGN1dCBmdW5jdGlvbiBmb3IgY2hlY2tpbmcgaWYgYW4gb2JqZWN0IGhhcyBhIGdpdmVuIHByb3BlcnR5IGRpcmVjdGx5XG4gIC8vIG9uIGl0c2VsZiAoaW4gb3RoZXIgd29yZHMsIG5vdCBvbiBhIHByb3RvdHlwZSkuXG4gIF8uaGFzID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG4gIH07XG5cbiAgLy8gVXRpbGl0eSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSdW4gVW5kZXJzY29yZS5qcyBpbiAqbm9Db25mbGljdCogbW9kZSwgcmV0dXJuaW5nIHRoZSBgX2AgdmFyaWFibGUgdG8gaXRzXG4gIC8vIHByZXZpb3VzIG93bmVyLiBSZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcm9vdC5fID0gcHJldmlvdXNVbmRlcnNjb3JlO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8vIEtlZXAgdGhlIGlkZW50aXR5IGZ1bmN0aW9uIGFyb3VuZCBmb3IgZGVmYXVsdCBpdGVyYXRvcnMuXG4gIF8uaWRlbnRpdHkgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICBfLmNvbnN0YW50ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gIH07XG5cbiAgXy5wcm9wZXJ0eSA9IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmpba2V5XTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBwcmVkaWNhdGUgZm9yIGNoZWNraW5nIHdoZXRoZXIgYW4gb2JqZWN0IGhhcyBhIGdpdmVuIHNldCBvZiBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5tYXRjaGVzID0gZnVuY3Rpb24oYXR0cnMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICBpZiAob2JqID09PSBhdHRycykgcmV0dXJuIHRydWU7IC8vYXZvaWQgY29tcGFyaW5nIGFuIG9iamVjdCB0byBpdHNlbGYuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYXR0cnMpIHtcbiAgICAgICAgaWYgKGF0dHJzW2tleV0gIT09IG9ialtrZXldKVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfTtcblxuICAvLyBSdW4gYSBmdW5jdGlvbiAqKm4qKiB0aW1lcy5cbiAgXy50aW1lcyA9IGZ1bmN0aW9uKG4sIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIGFjY3VtID0gQXJyYXkoTWF0aC5tYXgoMCwgbikpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSBhY2N1bVtpXSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgaSk7XG4gICAgcmV0dXJuIGFjY3VtO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbWluIGFuZCBtYXggKGluY2x1c2l2ZSkuXG4gIF8ucmFuZG9tID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICBpZiAobWF4ID09IG51bGwpIHtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xuICB9O1xuXG4gIC8vIEEgKHBvc3NpYmx5IGZhc3Rlcikgd2F5IHRvIGdldCB0aGUgY3VycmVudCB0aW1lc3RhbXAgYXMgYW4gaW50ZWdlci5cbiAgXy5ub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuXG4gIC8vIExpc3Qgb2YgSFRNTCBlbnRpdGllcyBmb3IgZXNjYXBpbmcuXG4gIHZhciBlbnRpdHlNYXAgPSB7XG4gICAgZXNjYXBlOiB7XG4gICAgICAnJic6ICcmYW1wOycsXG4gICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICc+JzogJyZndDsnLFxuICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICBcIidcIjogJyYjeDI3OydcbiAgICB9XG4gIH07XG4gIGVudGl0eU1hcC51bmVzY2FwZSA9IF8uaW52ZXJ0KGVudGl0eU1hcC5lc2NhcGUpO1xuXG4gIC8vIFJlZ2V4ZXMgY29udGFpbmluZyB0aGUga2V5cyBhbmQgdmFsdWVzIGxpc3RlZCBpbW1lZGlhdGVseSBhYm92ZS5cbiAgdmFyIGVudGl0eVJlZ2V4ZXMgPSB7XG4gICAgZXNjYXBlOiAgIG5ldyBSZWdFeHAoJ1snICsgXy5rZXlzKGVudGl0eU1hcC5lc2NhcGUpLmpvaW4oJycpICsgJ10nLCAnZycpLFxuICAgIHVuZXNjYXBlOiBuZXcgUmVnRXhwKCcoJyArIF8ua2V5cyhlbnRpdHlNYXAudW5lc2NhcGUpLmpvaW4oJ3wnKSArICcpJywgJ2cnKVxuICB9O1xuXG4gIC8vIEZ1bmN0aW9ucyBmb3IgZXNjYXBpbmcgYW5kIHVuZXNjYXBpbmcgc3RyaW5ncyB0by9mcm9tIEhUTUwgaW50ZXJwb2xhdGlvbi5cbiAgXy5lYWNoKFsnZXNjYXBlJywgJ3VuZXNjYXBlJ10sIGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIF9bbWV0aG9kXSA9IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgaWYgKHN0cmluZyA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICByZXR1cm4gKCcnICsgc3RyaW5nKS5yZXBsYWNlKGVudGl0eVJlZ2V4ZXNbbWV0aG9kXSwgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgICAgcmV0dXJuIGVudGl0eU1hcFttZXRob2RdW21hdGNoXTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIElmIHRoZSB2YWx1ZSBvZiB0aGUgbmFtZWQgYHByb3BlcnR5YCBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0IHdpdGggdGhlXG4gIC8vIGBvYmplY3RgIGFzIGNvbnRleHQ7IG90aGVyd2lzZSwgcmV0dXJuIGl0LlxuICBfLnJlc3VsdCA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICBpZiAob2JqZWN0ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0W3Byb3BlcnR5XTtcbiAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKHZhbHVlKSA/IHZhbHVlLmNhbGwob2JqZWN0KSA6IHZhbHVlO1xuICB9O1xuXG4gIC8vIEFkZCB5b3VyIG93biBjdXN0b20gZnVuY3Rpb25zIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5taXhpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goXy5mdW5jdGlvbnMob2JqKSwgZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGZ1bmMgPSBfW25hbWVdID0gb2JqW25hbWVdO1xuICAgICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbdGhpcy5fd3JhcHBlZF07XG4gICAgICAgIHB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIGZ1bmMuYXBwbHkoXywgYXJncykpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBHZW5lcmF0ZSBhIHVuaXF1ZSBpbnRlZ2VyIGlkICh1bmlxdWUgd2l0aGluIHRoZSBlbnRpcmUgY2xpZW50IHNlc3Npb24pLlxuICAvLyBVc2VmdWwgZm9yIHRlbXBvcmFyeSBET00gaWRzLlxuICB2YXIgaWRDb3VudGVyID0gMDtcbiAgXy51bmlxdWVJZCA9IGZ1bmN0aW9uKHByZWZpeCkge1xuICAgIHZhciBpZCA9ICsraWRDb3VudGVyICsgJyc7XG4gICAgcmV0dXJuIHByZWZpeCA/IHByZWZpeCArIGlkIDogaWQ7XG4gIH07XG5cbiAgLy8gQnkgZGVmYXVsdCwgVW5kZXJzY29yZSB1c2VzIEVSQi1zdHlsZSB0ZW1wbGF0ZSBkZWxpbWl0ZXJzLCBjaGFuZ2UgdGhlXG4gIC8vIGZvbGxvd2luZyB0ZW1wbGF0ZSBzZXR0aW5ncyB0byB1c2UgYWx0ZXJuYXRpdmUgZGVsaW1pdGVycy5cbiAgXy50ZW1wbGF0ZVNldHRpbmdzID0ge1xuICAgIGV2YWx1YXRlICAgIDogLzwlKFtcXHNcXFNdKz8pJT4vZyxcbiAgICBpbnRlcnBvbGF0ZSA6IC88JT0oW1xcc1xcU10rPyklPi9nLFxuICAgIGVzY2FwZSAgICAgIDogLzwlLShbXFxzXFxTXSs/KSU+L2dcbiAgfTtcblxuICAvLyBXaGVuIGN1c3RvbWl6aW5nIGB0ZW1wbGF0ZVNldHRpbmdzYCwgaWYgeW91IGRvbid0IHdhbnQgdG8gZGVmaW5lIGFuXG4gIC8vIGludGVycG9sYXRpb24sIGV2YWx1YXRpb24gb3IgZXNjYXBpbmcgcmVnZXgsIHdlIG5lZWQgb25lIHRoYXQgaXNcbiAgLy8gZ3VhcmFudGVlZCBub3QgdG8gbWF0Y2guXG4gIHZhciBub01hdGNoID0gLyguKV4vO1xuXG4gIC8vIENlcnRhaW4gY2hhcmFjdGVycyBuZWVkIHRvIGJlIGVzY2FwZWQgc28gdGhhdCB0aGV5IGNhbiBiZSBwdXQgaW50byBhXG4gIC8vIHN0cmluZyBsaXRlcmFsLlxuICB2YXIgZXNjYXBlcyA9IHtcbiAgICBcIidcIjogICAgICBcIidcIixcbiAgICAnXFxcXCc6ICAgICAnXFxcXCcsXG4gICAgJ1xccic6ICAgICAncicsXG4gICAgJ1xcbic6ICAgICAnbicsXG4gICAgJ1xcdCc6ICAgICAndCcsXG4gICAgJ1xcdTIwMjgnOiAndTIwMjgnLFxuICAgICdcXHUyMDI5JzogJ3UyMDI5J1xuICB9O1xuXG4gIHZhciBlc2NhcGVyID0gL1xcXFx8J3xcXHJ8XFxufFxcdHxcXHUyMDI4fFxcdTIwMjkvZztcblxuICAvLyBKYXZhU2NyaXB0IG1pY3JvLXRlbXBsYXRpbmcsIHNpbWlsYXIgdG8gSm9obiBSZXNpZydzIGltcGxlbWVudGF0aW9uLlxuICAvLyBVbmRlcnNjb3JlIHRlbXBsYXRpbmcgaGFuZGxlcyBhcmJpdHJhcnkgZGVsaW1pdGVycywgcHJlc2VydmVzIHdoaXRlc3BhY2UsXG4gIC8vIGFuZCBjb3JyZWN0bHkgZXNjYXBlcyBxdW90ZXMgd2l0aGluIGludGVycG9sYXRlZCBjb2RlLlxuICBfLnRlbXBsYXRlID0gZnVuY3Rpb24odGV4dCwgZGF0YSwgc2V0dGluZ3MpIHtcbiAgICB2YXIgcmVuZGVyO1xuICAgIHNldHRpbmdzID0gXy5kZWZhdWx0cyh7fSwgc2V0dGluZ3MsIF8udGVtcGxhdGVTZXR0aW5ncyk7XG5cbiAgICAvLyBDb21iaW5lIGRlbGltaXRlcnMgaW50byBvbmUgcmVndWxhciBleHByZXNzaW9uIHZpYSBhbHRlcm5hdGlvbi5cbiAgICB2YXIgbWF0Y2hlciA9IG5ldyBSZWdFeHAoW1xuICAgICAgKHNldHRpbmdzLmVzY2FwZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuaW50ZXJwb2xhdGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmV2YWx1YXRlIHx8IG5vTWF0Y2gpLnNvdXJjZVxuICAgIF0uam9pbignfCcpICsgJ3wkJywgJ2cnKTtcblxuICAgIC8vIENvbXBpbGUgdGhlIHRlbXBsYXRlIHNvdXJjZSwgZXNjYXBpbmcgc3RyaW5nIGxpdGVyYWxzIGFwcHJvcHJpYXRlbHkuXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc291cmNlID0gXCJfX3ArPSdcIjtcbiAgICB0ZXh0LnJlcGxhY2UobWF0Y2hlciwgZnVuY3Rpb24obWF0Y2gsIGVzY2FwZSwgaW50ZXJwb2xhdGUsIGV2YWx1YXRlLCBvZmZzZXQpIHtcbiAgICAgIHNvdXJjZSArPSB0ZXh0LnNsaWNlKGluZGV4LCBvZmZzZXQpXG4gICAgICAgIC5yZXBsYWNlKGVzY2FwZXIsIGZ1bmN0aW9uKG1hdGNoKSB7IHJldHVybiAnXFxcXCcgKyBlc2NhcGVzW21hdGNoXTsgfSk7XG5cbiAgICAgIGlmIChlc2NhcGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBlc2NhcGUgKyBcIikpPT1udWxsPycnOl8uZXNjYXBlKF9fdCkpK1xcbidcIjtcbiAgICAgIH1cbiAgICAgIGlmIChpbnRlcnBvbGF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInK1xcbigoX190PShcIiArIGludGVycG9sYXRlICsgXCIpKT09bnVsbD8nJzpfX3QpK1xcbidcIjtcbiAgICAgIH1cbiAgICAgIGlmIChldmFsdWF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInO1xcblwiICsgZXZhbHVhdGUgKyBcIlxcbl9fcCs9J1wiO1xuICAgICAgfVxuICAgICAgaW5kZXggPSBvZmZzZXQgKyBtYXRjaC5sZW5ndGg7XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG4gICAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICAgIC8vIElmIGEgdmFyaWFibGUgaXMgbm90IHNwZWNpZmllZCwgcGxhY2UgZGF0YSB2YWx1ZXMgaW4gbG9jYWwgc2NvcGUuXG4gICAgaWYgKCFzZXR0aW5ncy52YXJpYWJsZSkgc291cmNlID0gJ3dpdGgob2JqfHx7fSl7XFxuJyArIHNvdXJjZSArICd9XFxuJztcblxuICAgIHNvdXJjZSA9IFwidmFyIF9fdCxfX3A9JycsX19qPUFycmF5LnByb3RvdHlwZS5qb2luLFwiICtcbiAgICAgIFwicHJpbnQ9ZnVuY3Rpb24oKXtfX3ArPV9fai5jYWxsKGFyZ3VtZW50cywnJyk7fTtcXG5cIiArXG4gICAgICBzb3VyY2UgKyBcInJldHVybiBfX3A7XFxuXCI7XG5cbiAgICB0cnkge1xuICAgICAgcmVuZGVyID0gbmV3IEZ1bmN0aW9uKHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonLCAnXycsIHNvdXJjZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgZS5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIGlmIChkYXRhKSByZXR1cm4gcmVuZGVyKGRhdGEsIF8pO1xuICAgIHZhciB0ZW1wbGF0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiByZW5kZXIuY2FsbCh0aGlzLCBkYXRhLCBfKTtcbiAgICB9O1xuXG4gICAgLy8gUHJvdmlkZSB0aGUgY29tcGlsZWQgZnVuY3Rpb24gc291cmNlIGFzIGEgY29udmVuaWVuY2UgZm9yIHByZWNvbXBpbGF0aW9uLlxuICAgIHRlbXBsYXRlLnNvdXJjZSA9ICdmdW5jdGlvbignICsgKHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonKSArICcpe1xcbicgKyBzb3VyY2UgKyAnfSc7XG5cbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH07XG5cbiAgLy8gQWRkIGEgXCJjaGFpblwiIGZ1bmN0aW9uLCB3aGljaCB3aWxsIGRlbGVnYXRlIHRvIHRoZSB3cmFwcGVyLlxuICBfLmNoYWluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8ob2JqKS5jaGFpbigpO1xuICB9O1xuXG4gIC8vIE9PUFxuICAvLyAtLS0tLS0tLS0tLS0tLS1cbiAgLy8gSWYgVW5kZXJzY29yZSBpcyBjYWxsZWQgYXMgYSBmdW5jdGlvbiwgaXQgcmV0dXJucyBhIHdyYXBwZWQgb2JqZWN0IHRoYXRcbiAgLy8gY2FuIGJlIHVzZWQgT08tc3R5bGUuIFRoaXMgd3JhcHBlciBob2xkcyBhbHRlcmVkIHZlcnNpb25zIG9mIGFsbCB0aGVcbiAgLy8gdW5kZXJzY29yZSBmdW5jdGlvbnMuIFdyYXBwZWQgb2JqZWN0cyBtYXkgYmUgY2hhaW5lZC5cblxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gY29udGludWUgY2hhaW5pbmcgaW50ZXJtZWRpYXRlIHJlc3VsdHMuXG4gIHZhciByZXN1bHQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdGhpcy5fY2hhaW4gPyBfKG9iaikuY2hhaW4oKSA6IG9iajtcbiAgfTtcblxuICAvLyBBZGQgYWxsIG9mIHRoZSBVbmRlcnNjb3JlIGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlciBvYmplY3QuXG4gIF8ubWl4aW4oXyk7XG5cbiAgLy8gQWRkIGFsbCBtdXRhdG9yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgZWFjaChbJ3BvcCcsICdwdXNoJywgJ3JldmVyc2UnLCAnc2hpZnQnLCAnc29ydCcsICdzcGxpY2UnLCAndW5zaGlmdCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBvYmogPSB0aGlzLl93cmFwcGVkO1xuICAgICAgbWV0aG9kLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgIGlmICgobmFtZSA9PSAnc2hpZnQnIHx8IG5hbWUgPT0gJ3NwbGljZScpICYmIG9iai5sZW5ndGggPT09IDApIGRlbGV0ZSBvYmpbMF07XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgb2JqKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBBZGQgYWxsIGFjY2Vzc29yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgZWFjaChbJ2NvbmNhdCcsICdqb2luJywgJ3NsaWNlJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIG1ldGhvZC5hcHBseSh0aGlzLl93cmFwcGVkLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9KTtcblxuICBfLmV4dGVuZChfLnByb3RvdHlwZSwge1xuXG4gICAgLy8gU3RhcnQgY2hhaW5pbmcgYSB3cmFwcGVkIFVuZGVyc2NvcmUgb2JqZWN0LlxuICAgIGNoYWluOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2NoYWluID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBFeHRyYWN0cyB0aGUgcmVzdWx0IGZyb20gYSB3cmFwcGVkIGFuZCBjaGFpbmVkIG9iamVjdC5cbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd3JhcHBlZDtcbiAgICB9XG5cbiAgfSk7XG5cbiAgLy8gQU1EIHJlZ2lzdHJhdGlvbiBoYXBwZW5zIGF0IHRoZSBlbmQgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBBTUQgbG9hZGVyc1xuICAvLyB0aGF0IG1heSBub3QgZW5mb3JjZSBuZXh0LXR1cm4gc2VtYW50aWNzIG9uIG1vZHVsZXMuIEV2ZW4gdGhvdWdoIGdlbmVyYWxcbiAgLy8gcHJhY3RpY2UgZm9yIEFNRCByZWdpc3RyYXRpb24gaXMgdG8gYmUgYW5vbnltb3VzLCB1bmRlcnNjb3JlIHJlZ2lzdGVyc1xuICAvLyBhcyBhIG5hbWVkIG1vZHVsZSBiZWNhdXNlLCBsaWtlIGpRdWVyeSwgaXQgaXMgYSBiYXNlIGxpYnJhcnkgdGhhdCBpc1xuICAvLyBwb3B1bGFyIGVub3VnaCB0byBiZSBidW5kbGVkIGluIGEgdGhpcmQgcGFydHkgbGliLCBidXQgbm90IGJlIHBhcnQgb2ZcbiAgLy8gYW4gQU1EIGxvYWQgcmVxdWVzdC4gVGhvc2UgY2FzZXMgY291bGQgZ2VuZXJhdGUgYW4gZXJyb3Igd2hlbiBhblxuICAvLyBhbm9ueW1vdXMgZGVmaW5lKCkgaXMgY2FsbGVkIG91dHNpZGUgb2YgYSBsb2FkZXIgcmVxdWVzdC5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZSgndW5kZXJzY29yZScsIFtdLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfO1xuICAgIH0pO1xuICB9XG59KS5jYWxsKHRoaXMpO1xuIl19
