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
	return {
		map: this.centralSprite.mapPosition,
		canvas: [ Math.round(this.canvas.width * 0.5), Math.round(this.canvas.height * 0.33), 0]
	};
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
const sprite = require('./sprite');

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

		var intervalNum = 0;

		this.cycle = function () {

			beforeCycleCallbacks.each(function(c) {
				c();
			});

			// Clear canvas
			var mouseMapPosition = dContext.canvasPositionToMapPosition([mouseX, mouseY]);

			if (!player.isJumping) {
				player.setMapPositionTarget(mouseMapPosition[0], mouseMapPosition[1]);
			}

			intervalNum++;

			player.cycle();

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

		that.draw = function () {
			// Clear canvas
			mainCanvas.width = mainCanvas.width;
			
			// Update scrolling background
			drawBackground();

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
		};

		this.start = function () {
			gameLoop.start();
		};

		this.pause = function () {
			paused = true;
			gameLoop.stop();
		};

		this.isPaused = function () {
			return paused;
		};

		this.reset = function () {
			paused = false;
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
	}

	global.game = Game;
})( this );


if (typeof module !== 'undefined') {
	module.exports = this.game;
}
},{"./sprite":11,"./spriteArray":12,"eventedloop":16}],5:[function(require,module,exports){
function GameHud(data) {
	var that = this;

	var hudImage = new Image();
	hudImage.src = 'assets/top-bar.png';

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
		ctx.globalAlpha = 0.75;
		ctx.drawImage(hudImage, 0, 0, ctx.canvas.width, hudImage.height, 0, 0, ctx.canvas.width, hudImage.height);
		ctx.restore();

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
		var standardSpeed = 6;

		that.isEating = false;
		that.isFull = false;
		that.setSpeed(standardSpeed);

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
				eatingStage = 0;
				that.isEating = false;
				that.isMoving = true;
				whenDone();
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

		var canSpeedBoost = true;

		var obstaclesHit = [];
		var pixelsTravelled = 0;
		var standardSpeed = 5;
		var boostMultiplier = 2;
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
		that.onHitObstacleCb = function() {};
		that.onCollectItemCb = function() {};
		that.setSpeed(standardSpeed);

		that.reset = function () {
			obstaclesHit = [];
			pixelsTravelled = 0;
			that.isMoving = true;
			that.hasBeenHit = false;
			canSpeedBoost = true;
			that.isCrashing = false;
			setNormal();
		};

		function setNormal() {
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
			var discreteDirection = getDiscreteDirection();

			switch (discreteDirection) {
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
			var discreteDirection = getDiscreteDirection();

			switch (discreteDirection) {
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

		that.getPixelsTravelledDownMountain = function () {
			return pixelsTravelled;
		};

		that.resetSpeed = function () {
			that.setSpeed(standardSpeed);
		};

		that.cycle = function () {
			if ( that.getSpeedX() <= 0 && that.getSpeedY() <= 0 ) {
						that.isMoving = false;
			}
			if (that.isMoving) {
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
			var originalSpeed = that.speed;
			if (canSpeedBoost) {
				canSpeedBoost = false;
				that.setSpeed(that.speed * boostMultiplier);
				that.isBoosting = true;
				setTimeout(function () {
					that.setSpeed(originalSpeed);
					that.isBoosting = false;
					setTimeout(function () {
						canSpeedBoost = true;
					}, 10000);
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
			if (getDiscreteDirection() === 'esEast' || getDiscreteDirection() === 'wsWest') {
				speedXFactor = 0.5;
				speedX = easeSpeedToTargetUsingFactor(speedX, that.getSpeed() * speedXFactor, speedXFactor);

				return speedX;
			}

			if (getDiscreteDirection() === 'sEast' || getDiscreteDirection() === 'sWest') {
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
			var targetSpeed;

			if (that.isJumping) {
				return speedY;
			}

			if (getDiscreteDirection() === 'esEast' || getDiscreteDirection() === 'wsWest') {
				speedYFactor = 0.6;
				speedY = easeSpeedToTargetUsingFactor(speedY, that.getSpeed() * 0.6, 0.6);

				return speedY;
			}

			if (getDiscreteDirection() === 'sEast' || getDiscreteDirection() === 'sWest') {
				speedYFactor = 0.85;
				speedY = easeSpeedToTargetUsingFactor(speedY, that.getSpeed() * 0.85, 0.85);

				return speedY;
			}

			if (getDiscreteDirection() === 'east' || getDiscreteDirection() === 'west') {
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
			setSlowDown();

			if (cancelableStateTimeout) {
				clearTimeout(cancelableStateTimeout);
			}
			cancelableStateTimeout = setTimeout(function() {
				setNormal();
			}, 300);
		}

		that.hasHitCollectible = function (item) {
			console.log('Hit item:', item.data.name)
			that.onCollectItemCb(item);
		}

		that.isEatenBy = function (monster, whenEaten) {
			that.hasHitObstacle(monster);
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
			canSpeedBoost = true;
		};

		that.setHitObstacleCb = function (fn) {
			that.onHitObstacleCb = fn || function() {};
		};

		that.setCollectItemCb = function (fn) {
			that.onCollectItemCb = fn || function() {};
		}

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
		that.metresDownTheMountain = 0;
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
var dContext = mainCanvas.getContext('2d');

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
var gameHudControls = 'Use the mouse or WASD to control the cart';
if (isMobileDevice()) gameHudControls = 'Tap or drag on the road to control the cart';
var sprites = require('./spriteInfo');

var pixelsPerMetre = 18;
var monsterDistanceThreshold = 2000;
const totalLives = 5;
var livesLeft = totalLives;
var highScore = 0;

const gameInfo = {
	distance: 0,
	money: 0,
	tokens: 0,
	points: 0,
	cans: 0,
	levelBoost: 0,
	awake: 100,

	god: false,

	reset() {
		distance = 0;
		money = 0;
		tokens = 0;
		points = 0;
		cans = 0;
		awake = 0;
	}
};

var dropRates = { trafficConeLarge: 1, trafficConeSmall: 1, garbageCan: 1, jump: 1, oilSlick: 1, 
				  token: 3, milkshake: 0.0001};
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
		player.isBeingEaten = false;
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
		if (!game.isPaused()) {
			highScore = localStorage.setItem('highScore', gameInfo.distance);
			updateHud('Game over! Hit space to restart.');
			game.pause();
			game.cycle();

			playingTrackNumber = 0;
			currentTrack.muted = true;
			currentTrack = sounds.gameOver;
			currentTrack.currentTime = 0;
			currentTrack.loop = true;
			if (playSound) {
				currentTrack.play();
				currentTrack.muted = false;
			}
		}
	}

	function updateHud(message) {
		if (!message)
			message = '';

		if (!gameHud) {
			gameHud = new GameHud({
				initialLines : [
					'Cash $0'.padEnd(22) + 'Level 1',
					'Points 0'.padEnd(22) + 'Life 0%',
					'Tokens 0'.padEnd(22) + 'Awake 100/100',
					'Distance 0m'.padEnd(22) + 'Speed 0',
					gameInfo.god ? 'God Mode' : ''
				],
				position: {
					top: 15,
					left: 115
				}
			});
		}

		const level = gameInfo.distance < 100 ? 1 : Math.floor(gameInfo.distance / 100) + gameInfo.levelBoost;
		gameHud.setLines([
			('Cash $' + gameInfo.money).padEnd(22) + 'Level ' + level,
			('Points ' + gameInfo.money).padEnd(22) + 'Life ' + livesLeft / totalLives * 100 + '%',
			('Tokens ' + gameInfo.tokens).padEnd(22) + 'Awake ' + gameInfo.awake + '/100',
			('Distance ' + gameInfo.distance + 'm').padEnd(22) + 'Speed ' + player.getSpeed(),
			(gameInfo.god ? 'God Mode' : '').padEnd(22) + message
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
		newMonster.setSpeed(player.getStandardSpeed());
		newMonster.onHitting(player, monsterHitsPlayerBehaviour);

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

	function startGame(){
		$('#menu').hide();
		mainCanvas.style.display = '';
		
		player = new Player(sprites.player);
		player.setMapPosition(0, 0);
		player.setMapPositionTarget(0, -10);

		player.setHitObstacleCb(function() {
			if (gameInfo.god)
				return;
			livesLeft -= 1;
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
					rateModifier: Math.max(800 - mainCanvas.width, 0),
					position: function () {
						return dContext.getRandomMapPositionBelowViewport();
					},
					player: player
				});
			}
			if (!game.isPaused()) {
				game.addStaticObjects(newObjects);

				gameInfo.distance = parseFloat(player.getPixelsTravelledDownMountain() / pixelsPerMetre).toFixed(1);

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

		Mousetrap.bind('f', player.speedBoost);
		Mousetrap.bind('t', player.attemptTrick);
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
		Mousetrap.bind('m', spawnMonster);
		Mousetrap.bind('space', resetGame);
		Mousetrap.bind('g', toggleGodMode);
		Mousetrap.bind('h', game.toggleHitBoxes);

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

$('.credits').click(function() {
	$('#main').hide();
	$('#credits').show();
	$('#menu').addClass('credits');
  });

$('.back').click(function() {
	$('#credits').hide();
	$('#selectPlayer').hide();
	$('#main').show();
	$('#menu').removeClass('credits');
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

	// Monster hitting static objects doesn't seem to work
	function monsterHitsObstacleBehavior(monster) {
		monster.deleteOnNextCycle();
	}
	sprites.monster.hitBehaviour.garbageCan = monsterHitsObstacleBehavior;
	sprites.monster.hitBehaviour.trafficConeLarge = monsterHitsObstacleBehavior;
	sprites.monster.hitBehaviour.trafficConeSmall = monsterHitsObstacleBehavior;
	function obstacleHitsMonsterBehavior(obstacle, monster) {
		monster.deleteOnNextCycle();
	}
	sprites.garbageCan.hitBehaviour.monster = obstacleHitsMonsterBehavior;
	sprites.trafficConeLarge.hitBehaviour.monster = obstacleHitsMonsterBehavior;
	sprites.trafficConeSmall.hitBehaviour.monster = obstacleHitsMonsterBehavior;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9saWIvYW5pbWF0ZWRTcHJpdGUuanMiLCJqcy9saWIvY2FudmFzUmVuZGVyaW5nQ29udGV4dDJERXh0ZW5zaW9ucy5qcyIsImpzL2xpYi9leHRlbmRlcnMuanMiLCJqcy9saWIvZ2FtZS5qcyIsImpzL2xpYi9nYW1lSHVkLmpzIiwianMvbGliL2d1aWQuanMiLCJqcy9saWIvaXNNb2JpbGVEZXZpY2UuanMiLCJqcy9saWIvbW9uc3Rlci5qcyIsImpzL2xpYi9wbGF5ZXIuanMiLCJqcy9saWIvcGx1Z2lucy5qcyIsImpzL2xpYi9zcHJpdGUuanMiLCJqcy9saWIvc3ByaXRlQXJyYXkuanMiLCJqcy9tYWluLmpzIiwianMvc3ByaXRlSW5mby5qcyIsIm5vZGVfbW9kdWxlcy9ici1tb3VzZXRyYXAvbW91c2V0cmFwLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50ZWRsb29wL2xpYi9tYWluLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCJub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDL3lCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN6TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgU3ByaXRlID0gcmVxdWlyZSgnLi9zcHJpdGUnKTtcclxuXHJcbihmdW5jdGlvbihnbG9iYWwpIHtcclxuXHRmdW5jdGlvbiBBbmltYXRlZFNwcml0ZShkYXRhKSB7XHJcblx0XHR2YXIgdGhhdCA9IG5ldyBTcHJpdGUoZGF0YSk7XHJcblx0XHR2YXIgc3VwZXJfZHJhdyA9IHRoYXQuc3VwZXJpb3IoJ2RyYXcnKTtcclxuXHRcdHZhciBjdXJyZW50RnJhbWUgPSAwO1xyXG5cdFx0dmFyIHN0YXJ0ZWQgPSBmYWxzZTtcclxuXHJcblx0XHR0aGF0LmRyYXcgPSBmdW5jdGlvbihkQ29udGV4dCkge1xyXG5cdFx0XHR2YXIgc3ByaXRlUGFydFRvVXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdGlmICghc3RhcnRlZCkge1xyXG5cdFx0XHRcdFx0c3RhcnRlZCA9IHRydWU7XHJcblx0XHRcdFx0XHRzdGFydEFuaW1hdGlvbigpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LmtleXMoZGF0YS5wYXJ0cylbY3VycmVudEZyYW1lXTtcclxuXHRcdFx0fTtcclxuXHRcdFx0cmV0dXJuIHN1cGVyX2RyYXcoZENvbnRleHQsIHNwcml0ZVBhcnRUb1VzZSgpKTtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gc3RhcnRBbmltYXRpb24oKSB7XHJcblx0XHRcdGN1cnJlbnRGcmFtZSArPSAxO1xyXG5cdFx0XHRpZiAoY3VycmVudEZyYW1lIDwgT2JqZWN0LmtleXMoZGF0YS5wYXJ0cykubGVuZ3RoKSB7XHJcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7IFxyXG5cdFx0XHRcdFx0c3RhcnRBbmltYXRpb24oKTtcclxuXHRcdFx0XHR9LCAzMDApO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdGN1cnJlbnRGcmFtZSA9IDA7XHJcblx0XHRcdFx0c3RhcnRlZCA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5zdGFydEFuaW1hdGlvbiA9IHN0YXJ0QW5pbWF0aW9uO1xyXG5cclxuXHRcdHJldHVybiB0aGF0O1xyXG5cdH1cclxuXHJcblx0Z2xvYmFsLmFuaW1hdGVkU3ByaXRlID0gQW5pbWF0ZWRTcHJpdGU7XHJcbn0pKCB0aGlzICk7XHJcblxyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSB0aGlzLmFuaW1hdGVkU3ByaXRlO1xyXG59IiwiQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5zdG9yZUxvYWRlZEltYWdlID0gZnVuY3Rpb24gKGtleSwgaW1hZ2UpIHtcclxuXHRpZiAoIXRoaXMuaW1hZ2VzKSB7XHJcblx0XHR0aGlzLmltYWdlcyA9IHt9O1xyXG5cdH1cclxuXHJcblx0dGhpcy5pbWFnZXNba2V5XSA9IGltYWdlO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRMb2FkZWRJbWFnZSA9IGZ1bmN0aW9uIChrZXkpIHtcclxuXHRpZiAodGhpcy5pbWFnZXNba2V5XSkge1xyXG5cdFx0cmV0dXJuIHRoaXMuaW1hZ2VzW2tleV07XHJcblx0fVxyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5mb2xsb3dTcHJpdGUgPSBmdW5jdGlvbiAoc3ByaXRlKSB7XHJcblx0dGhpcy5jZW50cmFsU3ByaXRlID0gc3ByaXRlO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRDZW50cmFsUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdG1hcDogdGhpcy5jZW50cmFsU3ByaXRlLm1hcFBvc2l0aW9uLFxyXG5cdFx0Y2FudmFzOiBbIE1hdGgucm91bmQodGhpcy5jYW52YXMud2lkdGggKiAwLjUpLCBNYXRoLnJvdW5kKHRoaXMuY2FudmFzLmhlaWdodCAqIDAuMzMpLCAwXVxyXG5cdH07XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLm1hcFBvc2l0aW9uVG9DYW52YXNQb3NpdGlvbiA9IGZ1bmN0aW9uIChwb3NpdGlvbikge1xyXG5cdHZhciBjZW50cmFsID0gdGhpcy5nZXRDZW50cmFsUG9zaXRpb24oKTtcclxuXHR2YXIgY2VudHJhbE1hcFBvc2l0aW9uID0gY2VudHJhbC5tYXA7XHJcblx0dmFyIGNlbnRyYWxDYW52YXNQb3NpdGlvbiA9IGNlbnRyYWwuY2FudmFzO1xyXG5cdHZhciBtYXBEaWZmZXJlbmNlWCA9IGNlbnRyYWxNYXBQb3NpdGlvblswXSAtIHBvc2l0aW9uWzBdO1xyXG5cdHZhciBtYXBEaWZmZXJlbmNlWSA9IGNlbnRyYWxNYXBQb3NpdGlvblsxXSAtIHBvc2l0aW9uWzFdO1xyXG5cdHJldHVybiBbIGNlbnRyYWxDYW52YXNQb3NpdGlvblswXSAtIG1hcERpZmZlcmVuY2VYLCBjZW50cmFsQ2FudmFzUG9zaXRpb25bMV0gLSBtYXBEaWZmZXJlbmNlWSBdO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5jYW52YXNQb3NpdGlvblRvTWFwUG9zaXRpb24gPSBmdW5jdGlvbiAocG9zaXRpb24pIHtcclxuXHR2YXIgY2VudHJhbCA9IHRoaXMuZ2V0Q2VudHJhbFBvc2l0aW9uKCk7XHJcblx0dmFyIGNlbnRyYWxNYXBQb3NpdGlvbiA9IGNlbnRyYWwubWFwO1xyXG5cdHZhciBjZW50cmFsQ2FudmFzUG9zaXRpb24gPSBjZW50cmFsLmNhbnZhcztcclxuXHR2YXIgbWFwRGlmZmVyZW5jZVggPSBjZW50cmFsQ2FudmFzUG9zaXRpb25bMF0gLSBwb3NpdGlvblswXTtcclxuXHR2YXIgbWFwRGlmZmVyZW5jZVkgPSBjZW50cmFsQ2FudmFzUG9zaXRpb25bMV0gLSBwb3NpdGlvblsxXTtcclxuXHRyZXR1cm4gWyBjZW50cmFsTWFwUG9zaXRpb25bMF0gLSBtYXBEaWZmZXJlbmNlWCwgY2VudHJhbE1hcFBvc2l0aW9uWzFdIC0gbWFwRGlmZmVyZW5jZVkgXTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0Q2VudHJlT2ZWaWV3cG9ydCA9IGZ1bmN0aW9uICgpIHtcclxuXHRyZXR1cm4gKHRoaXMuY2FudmFzLndpZHRoIC8gMikuZmxvb3IoKTtcclxufTtcclxuXHJcbi8vIFktcG9zIGNhbnZhcyBmdW5jdGlvbnNcclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRNaWRkbGVPZlZpZXdwb3J0ID0gZnVuY3Rpb24gKCkge1xyXG5cdHJldHVybiAodGhpcy5jYW52YXMuaGVpZ2h0IC8gMikuZmxvb3IoKTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0QmVsb3dWaWV3cG9ydCA9IGZ1bmN0aW9uICgpIHtcclxuXHRyZXR1cm4gdGhpcy5jYW52YXMuaGVpZ2h0LmZsb29yKCk7XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmdldE1hcEJlbG93Vmlld3BvcnQgPSBmdW5jdGlvbiAoKSB7XHJcblx0dmFyIGJlbG93ID0gdGhpcy5nZXRCZWxvd1ZpZXdwb3J0KCk7XHJcblx0cmV0dXJuIHRoaXMuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFsgMCwgYmVsb3cgXSlbMV07XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmdldFJhbmRvbWx5SW5UaGVDZW50cmVPZkNhbnZhcyA9IGZ1bmN0aW9uIChidWZmZXIpIHtcclxuXHR2YXIgbWluID0gMDtcclxuXHR2YXIgbWF4ID0gdGhpcy5jYW52YXMud2lkdGg7XHJcblxyXG5cdGlmIChidWZmZXIpIHtcclxuXHRcdG1pbiAtPSBidWZmZXI7XHJcblx0XHRtYXggKz0gYnVmZmVyO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIE51bWJlci5yYW5kb20obWluLCBtYXgpO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRSYW5kb21seUluVGhlQ2VudHJlT2ZNYXAgPSBmdW5jdGlvbiAoYnVmZmVyKSB7XHJcblx0dmFyIHJhbmRvbSA9IHRoaXMuZ2V0UmFuZG9tbHlJblRoZUNlbnRyZU9mQ2FudmFzKGJ1ZmZlcik7XHJcblx0cmV0dXJuIHRoaXMuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFsgcmFuZG9tLCAwIF0pWzBdO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRSYW5kb21NYXBQb3NpdGlvbkJlbG93Vmlld3BvcnQgPSBmdW5jdGlvbiAoKSB7XHJcblx0dmFyIHhDYW52YXMgPSB0aGlzLmdldFJhbmRvbWx5SW5UaGVDZW50cmVPZkNhbnZhcygpO1xyXG5cdHZhciB5Q2FudmFzID0gdGhpcy5nZXRCZWxvd1ZpZXdwb3J0KCk7XHJcblx0cmV0dXJuIHRoaXMuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFsgeENhbnZhcywgeUNhbnZhcyBdKTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0UmFuZG9tTWFwUG9zaXRpb25BYm92ZVZpZXdwb3J0ID0gZnVuY3Rpb24gKCkge1xyXG5cdHZhciB4Q2FudmFzID0gdGhpcy5nZXRSYW5kb21seUluVGhlQ2VudHJlT2ZDYW52YXMoKTtcclxuXHR2YXIgeUNhbnZhcyA9IHRoaXMuZ2V0QWJvdmVWaWV3cG9ydCgpO1xyXG5cdHJldHVybiB0aGlzLmNhbnZhc1Bvc2l0aW9uVG9NYXBQb3NpdGlvbihbIHhDYW52YXMsIHlDYW52YXMgXSk7XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmdldFRvcE9mVmlld3BvcnQgPSBmdW5jdGlvbiAoKSB7XHJcblx0cmV0dXJuIHRoaXMuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFsgMCwgMCBdKVsxXTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0QWJvdmVWaWV3cG9ydCA9IGZ1bmN0aW9uICgpIHtcclxuXHRyZXR1cm4gMCAtICh0aGlzLmNhbnZhcy5oZWlnaHQgLyA0KS5mbG9vcigpO1xyXG59OyIsIi8vIEV4dGVuZHMgZnVuY3Rpb24gc28gdGhhdCBuZXctYWJsZSBvYmplY3RzIGNhbiBiZSBnaXZlbiBuZXcgbWV0aG9kcyBlYXNpbHlcclxuRnVuY3Rpb24ucHJvdG90eXBlLm1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBmdW5jKSB7XHJcbiAgICB0aGlzLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmM7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8vIFdpbGwgcmV0dXJuIHRoZSBvcmlnaW5hbCBtZXRob2Qgb2YgYW4gb2JqZWN0IHdoZW4gaW5oZXJpdGluZyBmcm9tIGFub3RoZXJcclxuT2JqZWN0Lm1ldGhvZCgnc3VwZXJpb3InLCBmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdmFyIG1ldGhvZCA9IHRoYXRbbmFtZV07XHJcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIG1ldGhvZC5hcHBseSh0aGF0LCBhcmd1bWVudHMpO1xyXG4gICAgfTtcclxufSk7IiwidmFyIFNwcml0ZUFycmF5ID0gcmVxdWlyZSgnLi9zcHJpdGVBcnJheScpO1xyXG52YXIgRXZlbnRlZExvb3AgPSByZXF1aXJlKCdldmVudGVkbG9vcCcpO1xyXG5jb25zdCBzcHJpdGUgPSByZXF1aXJlKCcuL3Nwcml0ZScpO1xyXG5cclxuKGZ1bmN0aW9uIChnbG9iYWwpIHtcclxuXHRmdW5jdGlvbiBHYW1lIChtYWluQ2FudmFzLCBwbGF5ZXIpIHtcclxuXHRcdHZhciBzdGF0aWNPYmplY3RzID0gbmV3IFNwcml0ZUFycmF5KCk7XHJcblx0XHR2YXIgbW92aW5nT2JqZWN0cyA9IG5ldyBTcHJpdGVBcnJheSgpO1xyXG5cdFx0dmFyIHVpRWxlbWVudHMgPSBuZXcgU3ByaXRlQXJyYXkoKTtcclxuXHRcdHZhciBkQ29udGV4dCA9IG1haW5DYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHRcdHZhciBzaG93SGl0Qm94ZXMgPSBmYWxzZTtcclxuXHRcdFxyXG5cdFx0Ly8gU2Nyb2xsaW5nIGJhY2tncm91bmRcclxuXHRcdHZhciBiYWNrZ3JvdW5kSW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdGJhY2tncm91bmRJbWFnZS5zcmMgPSAnYXNzZXRzL2JhY2tncm91bmQucG5nJztcclxuXHRcdHZhciBiYWNrZ3JvdW5kWCA9IDA7XHJcblx0XHR2YXIgYmFja2dyb3VuZFkgPSAwO1xyXG5cclxuXHRcdHZhciBtb3VzZVggPSBkQ29udGV4dC5nZXRDZW50cmVPZlZpZXdwb3J0KCk7XHJcblx0XHR2YXIgbW91c2VZID0gMDtcclxuXHRcdHZhciBwYXVzZWQgPSBmYWxzZTtcclxuXHRcdHZhciB0aGF0ID0gdGhpcztcclxuXHRcdHZhciBiZWZvcmVDeWNsZUNhbGxiYWNrcyA9IFtdO1xyXG5cdFx0dmFyIGFmdGVyQ3ljbGVDYWxsYmFja3MgPSBbXTtcclxuXHRcdHZhciBnYW1lTG9vcCA9IG5ldyBFdmVudGVkTG9vcCgpO1xyXG5cclxuXHRcdHRoaXMudG9nZ2xlSGl0Qm94ZXMgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0c2hvd0hpdEJveGVzID0gIXNob3dIaXRCb3hlcztcclxuXHRcdFx0c3RhdGljT2JqZWN0cy5lYWNoKGZ1bmN0aW9uIChzcHJpdGUpIHtcclxuXHRcdFx0XHRzcHJpdGUuc2V0SGl0Qm94ZXNWaXNpYmxlKHNob3dIaXRCb3hlcyk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmFkZFN0YXRpY09iamVjdCA9IGZ1bmN0aW9uIChzcHJpdGUpIHtcclxuXHRcdFx0c3ByaXRlLnNldEhpdEJveGVzVmlzaWJsZShzaG93SGl0Qm94ZXMpO1xyXG5cdFx0XHRzdGF0aWNPYmplY3RzLnB1c2goc3ByaXRlKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5hZGRTdGF0aWNPYmplY3RzID0gZnVuY3Rpb24gKHNwcml0ZXMpIHtcclxuXHRcdFx0c3ByaXRlcy5mb3JFYWNoKHRoaXMuYWRkU3RhdGljT2JqZWN0LmJpbmQodGhpcykpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmFkZE1vdmluZ09iamVjdCA9IGZ1bmN0aW9uIChtb3ZpbmdPYmplY3QsIG1vdmluZ09iamVjdFR5cGUpIHtcclxuXHRcdFx0aWYgKG1vdmluZ09iamVjdFR5cGUpIHtcclxuXHRcdFx0XHRzdGF0aWNPYmplY3RzLm9uUHVzaChmdW5jdGlvbiAob2JqKSB7XHJcblx0XHRcdFx0XHRpZiAob2JqLmRhdGEgJiYgb2JqLmRhdGEuaGl0QmVoYXZpb3VyW21vdmluZ09iamVjdFR5cGVdKSB7XHJcblx0XHRcdFx0XHRcdG9iai5vbkhpdHRpbmcobW92aW5nT2JqZWN0LCBvYmouZGF0YS5oaXRCZWhhdmlvdXJbbW92aW5nT2JqZWN0VHlwZV0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sIHRydWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRtb3ZpbmdPYmplY3Quc2V0SGl0Qm94ZXNWaXNpYmxlKHNob3dIaXRCb3hlcyk7XHJcblx0XHRcdG1vdmluZ09iamVjdHMucHVzaChtb3ZpbmdPYmplY3QpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmFkZFVJRWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XHJcblx0XHRcdHVpRWxlbWVudHMucHVzaChlbGVtZW50KTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5iZWZvcmVDeWNsZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG5cdFx0XHRiZWZvcmVDeWNsZUNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5hZnRlckN5Y2xlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcblx0XHRcdGFmdGVyQ3ljbGVDYWxsYmFja3MucHVzaChjYWxsYmFjayk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0TW91c2VYID0gZnVuY3Rpb24gKHgpIHtcclxuXHRcdFx0bW91c2VYID0geDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXRNb3VzZVkgPSBmdW5jdGlvbiAoeSkge1xyXG5cdFx0XHRtb3VzZVkgPSB5O1xyXG5cdFx0fTtcclxuXHJcblx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb24oMCwgMCk7XHJcblx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb25UYXJnZXQoMCwgLTEwKTtcclxuXHRcdGRDb250ZXh0LmZvbGxvd1Nwcml0ZShwbGF5ZXIpO1xyXG5cclxuXHRcdHZhciBpbnRlcnZhbE51bSA9IDA7XHJcblxyXG5cdFx0dGhpcy5jeWNsZSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdGJlZm9yZUN5Y2xlQ2FsbGJhY2tzLmVhY2goZnVuY3Rpb24oYykge1xyXG5cdFx0XHRcdGMoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDbGVhciBjYW52YXNcclxuXHRcdFx0dmFyIG1vdXNlTWFwUG9zaXRpb24gPSBkQ29udGV4dC5jYW52YXNQb3NpdGlvblRvTWFwUG9zaXRpb24oW21vdXNlWCwgbW91c2VZXSk7XHJcblxyXG5cdFx0XHRpZiAoIXBsYXllci5pc0p1bXBpbmcpIHtcclxuXHRcdFx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb25UYXJnZXQobW91c2VNYXBQb3NpdGlvblswXSwgbW91c2VNYXBQb3NpdGlvblsxXSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGludGVydmFsTnVtKys7XHJcblxyXG5cdFx0XHRwbGF5ZXIuY3ljbGUoKTtcclxuXHJcblx0XHRcdG1vdmluZ09iamVjdHMuZWFjaChmdW5jdGlvbiAobW92aW5nT2JqZWN0LCBpKSB7XHJcblx0XHRcdFx0bW92aW5nT2JqZWN0LmN5Y2xlKGRDb250ZXh0KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0XHRzdGF0aWNPYmplY3RzLmN1bGwoKTtcclxuXHRcdFx0c3RhdGljT2JqZWN0cy5lYWNoKGZ1bmN0aW9uIChzdGF0aWNPYmplY3QsIGkpIHtcclxuXHRcdFx0XHRpZiAoc3RhdGljT2JqZWN0LmN5Y2xlKSB7XHJcblx0XHRcdFx0XHRzdGF0aWNPYmplY3QuY3ljbGUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dWlFbGVtZW50cy5lYWNoKGZ1bmN0aW9uICh1aUVsZW1lbnQsIGkpIHtcclxuXHRcdFx0XHRpZiAodWlFbGVtZW50LmN5Y2xlKSB7XHJcblx0XHRcdFx0XHR1aUVsZW1lbnQuY3ljbGUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0YWZ0ZXJDeWNsZUNhbGxiYWNrcy5lYWNoKGZ1bmN0aW9uKGMpIHtcclxuXHRcdFx0XHRjKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jdGlvbiBkcmF3QmFja2dyb3VuZCgpIHtcclxuXHRcdFx0Ly8gU3RyZXRjaCBiYWNrZ3JvdW5kIGltYWdlIHRvIGNhbnZhcyBzaXplXHJcblx0XHRcdGJhY2tncm91bmRJbWFnZS53aWR0aCA9IG1haW5DYW52YXMud2lkdGg7XHJcblx0XHRcdGJhY2tncm91bmRJbWFnZS5oZWlnaHQgPSBtYWluQ2FudmFzLmhlaWdodDtcclxuXHRcdFx0XHJcblx0XHRcdGJhY2tncm91bmRYID0gcGxheWVyLm1hcFBvc2l0aW9uWzBdICUgYmFja2dyb3VuZEltYWdlLndpZHRoICogLTE7XHJcblx0XHRcdGJhY2tncm91bmRZID0gcGxheWVyLm1hcFBvc2l0aW9uWzFdICUgYmFja2dyb3VuZEltYWdlLmhlaWdodCAqIC0xO1xyXG5cclxuXHRcdFx0Ly8gUmVkcmF3IGJhY2tncm91bmRcclxuXHRcdFx0ZENvbnRleHQuZHJhd0ltYWdlKGJhY2tncm91bmRJbWFnZSwgYmFja2dyb3VuZFgsIGJhY2tncm91bmRZLCBtYWluQ2FudmFzLndpZHRoLCBiYWNrZ3JvdW5kSW1hZ2UuaGVpZ2h0KTtcclxuXHRcdFx0ZENvbnRleHQuZHJhd0ltYWdlKGJhY2tncm91bmRJbWFnZSwgYmFja2dyb3VuZFggKyBtYWluQ2FudmFzLndpZHRoLCBiYWNrZ3JvdW5kWSwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHRcdGRDb250ZXh0LmRyYXdJbWFnZShiYWNrZ3JvdW5kSW1hZ2UsIGJhY2tncm91bmRYIC0gbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZFksIG1haW5DYW52YXMud2lkdGgsIGJhY2tncm91bmRJbWFnZS5oZWlnaHQpO1xyXG5cdFx0XHRkQ29udGV4dC5kcmF3SW1hZ2UoYmFja2dyb3VuZEltYWdlLCBiYWNrZ3JvdW5kWCwgYmFja2dyb3VuZFkgKyBtYWluQ2FudmFzLmhlaWdodCwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHRcdGRDb250ZXh0LmRyYXdJbWFnZShiYWNrZ3JvdW5kSW1hZ2UsIGJhY2tncm91bmRYICsgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZFkgKyBtYWluQ2FudmFzLmhlaWdodCwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHRcdGRDb250ZXh0LmRyYXdJbWFnZShiYWNrZ3JvdW5kSW1hZ2UsIGJhY2tncm91bmRYIC0gbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZFkgKyBtYWluQ2FudmFzLmhlaWdodCwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5kcmF3ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHQvLyBDbGVhciBjYW52YXNcclxuXHRcdFx0bWFpbkNhbnZhcy53aWR0aCA9IG1haW5DYW52YXMud2lkdGg7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBVcGRhdGUgc2Nyb2xsaW5nIGJhY2tncm91bmRcclxuXHRcdFx0ZHJhd0JhY2tncm91bmQoKTtcclxuXHJcblx0XHRcdHN0YXRpY09iamVjdHMuZWFjaChmdW5jdGlvbiAoc3RhdGljT2JqZWN0LCBpKSB7XHJcblx0XHRcdFx0aWYgKHN0YXRpY09iamVjdC5pc0RyYXduVW5kZXJQbGF5ZXIgJiYgc3RhdGljT2JqZWN0LmRyYXcpIHtcclxuXHRcdFx0XHRcdFx0c3RhdGljT2JqZWN0LmRyYXcoZENvbnRleHQsICdtYWluJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHBsYXllci5zZXRIaXRCb3hlc1Zpc2libGUoc2hvd0hpdEJveGVzKTtcclxuXHRcdFx0cGxheWVyLmRyYXcoZENvbnRleHQpO1xyXG5cclxuXHRcdFx0cGxheWVyLmN5Y2xlKCk7XHJcblxyXG5cdFx0XHRtb3ZpbmdPYmplY3RzLmVhY2goZnVuY3Rpb24gKG1vdmluZ09iamVjdCwgaSkge1xyXG5cdFx0XHRcdG1vdmluZ09iamVjdC5kcmF3KGRDb250ZXh0KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0XHRzdGF0aWNPYmplY3RzLmVhY2goZnVuY3Rpb24gKHN0YXRpY09iamVjdCwgaSkge1xyXG5cdFx0XHRcdGlmICghc3RhdGljT2JqZWN0LmlzRHJhd25VbmRlclBsYXllciAmJiBzdGF0aWNPYmplY3QuZHJhdykge1xyXG5cdFx0XHRcdFx0c3RhdGljT2JqZWN0LmRyYXcoZENvbnRleHQsICdtYWluJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdHVpRWxlbWVudHMuZWFjaChmdW5jdGlvbiAodWlFbGVtZW50LCBpKSB7XHJcblx0XHRcdFx0aWYgKHVpRWxlbWVudC5kcmF3KSB7XHJcblx0XHRcdFx0XHR1aUVsZW1lbnQuZHJhdyhkQ29udGV4dCwgJ21haW4nKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRnYW1lTG9vcC5zdGFydCgpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnBhdXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRwYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHRnYW1lTG9vcC5zdG9wKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuaXNQYXVzZWQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiBwYXVzZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMucmVzZXQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHBhdXNlZCA9IGZhbHNlO1xyXG5cdFx0XHRzdGF0aWNPYmplY3RzID0gbmV3IFNwcml0ZUFycmF5KCk7XHJcblx0XHRcdG1vdmluZ09iamVjdHMgPSBuZXcgU3ByaXRlQXJyYXkoKTtcclxuXHRcdFx0bW91c2VYID0gZENvbnRleHQuZ2V0Q2VudHJlT2ZWaWV3cG9ydCgpO1xyXG5cdFx0XHRtb3VzZVkgPSAwO1xyXG5cdFx0XHRwbGF5ZXIucmVzZXQoKTtcclxuXHRcdFx0cGxheWVyLnNldE1hcFBvc2l0aW9uKDAsIDAsIDApO1xyXG5cdFx0XHR0aGlzLnN0YXJ0KCk7XHJcblx0XHR9LmJpbmQodGhpcyk7XHJcblxyXG5cdFx0Z2FtZUxvb3Aub24oJzIwJywgdGhpcy5jeWNsZSk7XHJcblx0XHRnYW1lTG9vcC5vbignMjAnLCB0aGlzLmRyYXcpO1xyXG5cdH1cclxuXHJcblx0Z2xvYmFsLmdhbWUgPSBHYW1lO1xyXG59KSggdGhpcyApO1xyXG5cclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG5cdG1vZHVsZS5leHBvcnRzID0gdGhpcy5nYW1lO1xyXG59IiwiZnVuY3Rpb24gR2FtZUh1ZChkYXRhKSB7XHJcblx0dmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuXHR2YXIgaHVkSW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuXHRodWRJbWFnZS5zcmMgPSAnYXNzZXRzL3RvcC1iYXIucG5nJztcclxuXHJcblx0dGhhdC5saW5lcyA9IGRhdGEuaW5pdGlhbExpbmVzO1xyXG5cclxuXHR0aGF0LnRvcCA9IGRhdGEucG9zaXRpb24udG9wO1xyXG5cdHRoYXQucmlnaHQgPSBkYXRhLnBvc2l0aW9uLnJpZ2h0O1xyXG5cdHRoYXQuYm90dG9tID0gZGF0YS5wb3NpdGlvbi5ib3R0b207XHJcblx0dGhhdC5sZWZ0ID0gZGF0YS5wb3NpdGlvbi5sZWZ0O1xyXG5cclxuXHR0aGF0LndpZHRoID0gZGF0YS53aWR0aDtcclxuXHR0aGF0LmhlaWdodCA9IGRhdGEuaGVpZ2h0O1xyXG5cclxuXHR0aGF0LnNldExpbmVzID0gZnVuY3Rpb24gKGxpbmVzKSB7XHJcblx0XHR0aGF0LmxpbmVzID0gbGluZXM7XHJcblx0fTtcclxuXHJcblx0dGhhdC5kcmF3ID0gZnVuY3Rpb24gKGN0eCkge1xyXG5cdFx0Y3R4Lmdsb2JhbEFscGhhID0gMC43NTtcclxuXHRcdGN0eC5kcmF3SW1hZ2UoaHVkSW1hZ2UsIDAsIDAsIGN0eC5jYW52YXMud2lkdGgsIGh1ZEltYWdlLmhlaWdodCwgMCwgMCwgY3R4LmNhbnZhcy53aWR0aCwgaHVkSW1hZ2UuaGVpZ2h0KTtcclxuXHRcdGN0eC5yZXN0b3JlKCk7XHJcblxyXG5cdFx0Y3R4LmZvbnQgPSAnMTJweCBtb25vc3BhY2UnO1xyXG5cdFx0dmFyIHlPZmZzZXQgPSAwO1xyXG5cdFx0dGhhdC5saW5lcy5lYWNoKGZ1bmN0aW9uIChsaW5lKSB7XHJcblx0XHRcdHZhciBmb250U2l6ZSA9ICtjdHguZm9udC5zbGljZSgwLCAyKTtcclxuXHRcdFx0dmFyIHRleHRXaWR0aCA9IGN0eC5tZWFzdXJlVGV4dChsaW5lKS53aWR0aDtcclxuXHRcdFx0dmFyIHRleHRIZWlnaHQgPSBmb250U2l6ZSAqIDEuMztcclxuXHRcdFx0dmFyIHhQb3MsIHlQb3M7XHJcblx0XHRcdGlmICh0aGF0LnRvcCkge1xyXG5cdFx0XHRcdHlQb3MgPSB0aGF0LnRvcCArIHlPZmZzZXQ7XHJcblx0XHRcdH0gZWxzZSBpZiAodGhhdC5ib3R0b20pIHtcclxuXHRcdFx0XHR5UG9zID0gY3R4LmNhbnZhcy5oZWlnaHQgLSB0aGF0LnRvcCAtIHRleHRIZWlnaHQgKyB5T2Zmc2V0O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodGhhdC5yaWdodCkge1xyXG5cdFx0XHRcdHhQb3MgPSBjdHguY2FudmFzLndpZHRoIC0gdGhhdC5yaWdodCAtIHRleHRXaWR0aDtcclxuXHRcdFx0fSBlbHNlIGlmICh0aGF0LmxlZnQpIHtcclxuXHRcdFx0XHR4UG9zID0gdGhhdC5sZWZ0O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR5T2Zmc2V0ICs9IHRleHRIZWlnaHQ7XHJcblx0XHRcdGN0eC5maWxsU3R5bGUgPSBcIiNGRkZGRkZcIjtcclxuXHRcdFx0Y3R4LmZpbGxUZXh0KGxpbmUsIHhQb3MsIHlQb3MpO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIHRoYXQ7XHJcbn1cclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG5cdG1vZHVsZS5leHBvcnRzID0gR2FtZUh1ZDtcclxufVxyXG4iLCIvLyBDcmVhdGVzIGEgcmFuZG9tIElEIHN0cmluZ1xyXG4oZnVuY3Rpb24oZ2xvYmFsKSB7XHJcbiAgICBmdW5jdGlvbiBndWlkICgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIFM0ID0gZnVuY3Rpb24gKClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKFxyXG4gICAgICAgICAgICAgICAgICAgIE1hdGgucmFuZG9tKCkgKiAweDEwMDAwIC8qIDY1NTM2ICovXHJcbiAgICAgICAgICAgICAgICApLnRvU3RyaW5nKDE2KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgICAgUzQoKSArIFM0KCkgKyBcIi1cIiArXHJcbiAgICAgICAgICAgICAgICBTNCgpICsgXCItXCIgK1xyXG4gICAgICAgICAgICAgICAgUzQoKSArIFwiLVwiICtcclxuICAgICAgICAgICAgICAgIFM0KCkgKyBcIi1cIiArXHJcbiAgICAgICAgICAgICAgICBTNCgpICsgUzQoKSArIFM0KClcclxuICAgICAgICAgICAgKTtcclxuICAgIH1cclxuICAgIGdsb2JhbC5ndWlkID0gZ3VpZDtcclxufSkodGhpcyk7XHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgIG1vZHVsZS5leHBvcnRzID0gdGhpcy5ndWlkO1xyXG59IiwiZnVuY3Rpb24gaXNNb2JpbGVEZXZpY2UoKSB7XHJcblx0aWYobmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQW5kcm9pZC9pKSB8fFxyXG5cdFx0bmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvd2ViT1MvaSkgfHxcclxuXHRcdG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL2lQaG9uZS9pKSB8fFxyXG5cdFx0bmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBhZC9pKSB8fFxyXG5cdFx0bmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBvZC9pKSB8fFxyXG5cdFx0bmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQmxhY2tCZXJyeS9pKSB8fFxyXG5cdFx0bmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvV2luZG93cyBQaG9uZS9pKVxyXG5cdCkge1xyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBpc01vYmlsZURldmljZTsiLCJ2YXIgU3ByaXRlID0gcmVxdWlyZSgnLi9zcHJpdGUnKTtcclxuXHJcbihmdW5jdGlvbihnbG9iYWwpIHtcclxuXHRmdW5jdGlvbiBNb25zdGVyKGRhdGEpIHtcclxuXHRcdHZhciB0aGF0ID0gbmV3IFNwcml0ZShkYXRhKTtcclxuXHRcdHZhciBzdXBlcl9kcmF3ID0gdGhhdC5zdXBlcmlvcignZHJhdycpO1xyXG5cdFx0dmFyIHNwcml0ZVZlcnNpb24gPSAxO1xyXG5cdFx0dmFyIGVhdGluZ1N0YWdlID0gMDtcclxuXHRcdHZhciBzdGFuZGFyZFNwZWVkID0gNjtcclxuXHJcblx0XHR0aGF0LmlzRWF0aW5nID0gZmFsc2U7XHJcblx0XHR0aGF0LmlzRnVsbCA9IGZhbHNlO1xyXG5cdFx0dGhhdC5zZXRTcGVlZChzdGFuZGFyZFNwZWVkKTtcclxuXHJcblx0XHR0aGF0LmRyYXcgPSBmdW5jdGlvbihkQ29udGV4dCkge1xyXG5cdFx0XHR2YXIgc3ByaXRlUGFydFRvVXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdHZhciB4RGlmZiA9IHRoYXQubW92aW5nVG93YXJkWzBdIC0gdGhhdC5jYW52YXNYO1xyXG5cclxuXHRcdFx0XHRpZiAodGhhdC5pc0VhdGluZykge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdlYXRpbmcnICsgZWF0aW5nU3RhZ2U7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAoc3ByaXRlVmVyc2lvbiArIDAuMSA+IDIpIHtcclxuXHRcdFx0XHRcdHNwcml0ZVZlcnNpb24gPSAwLjE7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHNwcml0ZVZlcnNpb24gKz0gMC4xO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoeERpZmYgPj0gMCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdzRWFzdCcgKyBNYXRoLmNlaWwoc3ByaXRlVmVyc2lvbik7XHJcblx0XHRcdFx0fSBlbHNlIGlmICh4RGlmZiA8IDApIHtcclxuXHRcdFx0XHRcdHJldHVybiAnc1dlc3QnICsgTWF0aC5jZWlsKHNwcml0ZVZlcnNpb24pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHJldHVybiBzdXBlcl9kcmF3KGRDb250ZXh0LCBzcHJpdGVQYXJ0VG9Vc2UoKSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIHN0YXJ0RWF0aW5nICh3aGVuRG9uZSkge1xyXG5cdFx0XHRlYXRpbmdTdGFnZSArPSAxO1xyXG5cdFx0XHR0aGF0LmlzRWF0aW5nID0gdHJ1ZTtcclxuXHRcdFx0dGhhdC5pc01vdmluZyA9IGZhbHNlO1xyXG5cdFx0XHRpZiAoZWF0aW5nU3RhZ2UgPCA2KSB7XHJcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRzdGFydEVhdGluZyh3aGVuRG9uZSk7XHJcblx0XHRcdFx0fSwgMzAwKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRlYXRpbmdTdGFnZSA9IDA7XHJcblx0XHRcdFx0dGhhdC5pc0VhdGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHRcdHdoZW5Eb25lKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGF0LnN0YXJ0RWF0aW5nID0gc3RhcnRFYXRpbmc7XHJcblxyXG5cdFx0cmV0dXJuIHRoYXQ7XHJcblx0fVxyXG5cclxuXHRnbG9iYWwubW9uc3RlciA9IE1vbnN0ZXI7XHJcbn0pKCB0aGlzICk7XHJcblxyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSB0aGlzLm1vbnN0ZXI7XHJcbn0iLCJ2YXIgU3ByaXRlID0gcmVxdWlyZSgnLi9zcHJpdGUnKTtcclxuaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bmF2aWdhdG9yLnZpYnJhdGUgPSBuYXZpZ2F0b3IudmlicmF0ZSB8fFxyXG5cdFx0bmF2aWdhdG9yLndlYmtpdFZpYnJhdGUgfHxcclxuXHRcdG5hdmlnYXRvci5tb3pWaWJyYXRlIHx8XHJcblx0XHRuYXZpZ2F0b3IubXNWaWJyYXRlO1xyXG59IGVsc2Uge1xyXG5cdG5hdmlnYXRvciA9IHtcclxuXHRcdHZpYnJhdGU6IGZhbHNlXHJcblx0fTtcclxufVxyXG5cclxuKGZ1bmN0aW9uKGdsb2JhbCkge1xyXG5cdGZ1bmN0aW9uIFBsYXllcihkYXRhKSB7XHJcblx0XHR2YXIgZGlzY3JldGVEaXJlY3Rpb25zID0ge1xyXG5cdFx0XHQnd2VzdCc6IDI3MCxcclxuXHRcdFx0J3dzV2VzdCc6IDI0MCxcclxuXHRcdFx0J3NXZXN0JzogMTk1LFxyXG5cdFx0XHQnc291dGgnOiAxODAsXHJcblx0XHRcdCdzRWFzdCc6IDE2NSxcclxuXHRcdFx0J2VzRWFzdCc6IDEyMCxcclxuXHRcdFx0J2Vhc3QnOiA5MFxyXG5cdFx0fTtcclxuXHRcdHZhciB0aGF0ID0gbmV3IFNwcml0ZShkYXRhKTtcclxuXHRcdHZhciBzdXAgPSB7XHJcblx0XHRcdGRyYXc6IHRoYXQuc3VwZXJpb3IoJ2RyYXcnKSxcclxuXHRcdFx0Y3ljbGU6IHRoYXQuc3VwZXJpb3IoJ2N5Y2xlJyksXHJcblx0XHRcdGdldFNwZWVkWDogdGhhdC5zdXBlcmlvcignZ2V0U3BlZWRYJyksXHJcblx0XHRcdGdldFNwZWVkWTogdGhhdC5zdXBlcmlvcignZ2V0U3BlZWRZJyksXHJcblx0XHRcdGhpdHM6IHRoYXQuc3VwZXJpb3IoJ2hpdHMnKVxyXG5cdFx0fTtcclxuXHRcdHZhciBkaXJlY3Rpb25zID0ge1xyXG5cdFx0XHRlc0Vhc3Q6IGZ1bmN0aW9uKHhEaWZmKSB7IHJldHVybiB4RGlmZiA+IDMwMDsgfSxcclxuXHRcdFx0c0Vhc3Q6IGZ1bmN0aW9uKHhEaWZmKSB7IHJldHVybiB4RGlmZiA+IDc1OyB9LFxyXG5cdFx0XHR3c1dlc3Q6IGZ1bmN0aW9uKHhEaWZmKSB7IHJldHVybiB4RGlmZiA8IC0zMDA7IH0sXHJcblx0XHRcdHNXZXN0OiBmdW5jdGlvbih4RGlmZikgeyByZXR1cm4geERpZmYgPCAtNzU7IH1cclxuXHRcdH07XHJcblxyXG5cdFx0dmFyIGNhbmNlbGFibGVTdGF0ZVRpbWVvdXQ7XHJcblx0XHR2YXIgY2FuY2VsYWJsZVN0YXRlSW50ZXJ2YWw7XHJcblxyXG5cdFx0dmFyIGNhblNwZWVkQm9vc3QgPSB0cnVlO1xyXG5cclxuXHRcdHZhciBvYnN0YWNsZXNIaXQgPSBbXTtcclxuXHRcdHZhciBwaXhlbHNUcmF2ZWxsZWQgPSAwO1xyXG5cdFx0dmFyIHN0YW5kYXJkU3BlZWQgPSA1O1xyXG5cdFx0dmFyIGJvb3N0TXVsdGlwbGllciA9IDI7XHJcblx0XHR2YXIgdHVybkVhc2VDeWNsZXMgPSA3MDtcclxuXHRcdHZhciBzcGVlZFggPSAwO1xyXG5cdFx0dmFyIHNwZWVkWEZhY3RvciA9IDA7XHJcblx0XHR2YXIgc3BlZWRZID0gMDtcclxuXHRcdHZhciBzcGVlZFlGYWN0b3IgPSAxO1xyXG5cdFx0dmFyIHRyaWNrU3RlcCA9IDA7IC8vIFRoZXJlIGFyZSB0aHJlZSBvZiB0aGVzZVxyXG5cdFx0dmFyIGNyYXNoaW5nRnJhbWUgPSAwOyAvLyA2LWZyYW1lIHNlcXVlbmNlXHJcblxyXG5cdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHR0aGF0Lmhhc0JlZW5IaXQgPSBmYWxzZTtcclxuXHRcdHRoYXQuaXNKdW1waW5nID0gZmFsc2U7XHJcblx0XHR0aGF0LmlzUGVyZm9ybWluZ1RyaWNrID0gZmFsc2U7XHJcblx0XHR0aGF0LmlzQ3Jhc2hpbmcgPSBmYWxzZTtcclxuXHRcdHRoYXQuaXNCb29zdGluZyA9IGZhbHNlO1xyXG5cdFx0dGhhdC5pc1Nsb3dlZCA9IGZhbHNlO1xyXG5cdFx0dGhhdC5vbkhpdE9ic3RhY2xlQ2IgPSBmdW5jdGlvbigpIHt9O1xyXG5cdFx0dGhhdC5vbkNvbGxlY3RJdGVtQ2IgPSBmdW5jdGlvbigpIHt9O1xyXG5cdFx0dGhhdC5zZXRTcGVlZChzdGFuZGFyZFNwZWVkKTtcclxuXHJcblx0XHR0aGF0LnJlc2V0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRvYnN0YWNsZXNIaXQgPSBbXTtcclxuXHRcdFx0cGl4ZWxzVHJhdmVsbGVkID0gMDtcclxuXHRcdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHRcdHRoYXQuaGFzQmVlbkhpdCA9IGZhbHNlO1xyXG5cdFx0XHRjYW5TcGVlZEJvb3N0ID0gdHJ1ZTtcclxuXHRcdFx0dGhhdC5pc0NyYXNoaW5nID0gZmFsc2U7XHJcblx0XHRcdHNldE5vcm1hbCgpO1xyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jdGlvbiBzZXROb3JtYWwoKSB7XHJcblx0XHRcdHRoYXQuc2V0U3BlZWQoc3RhbmRhcmRTcGVlZCk7XHJcblx0XHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0Lmhhc0JlZW5IaXQgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc0p1bXBpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc1BlcmZvcm1pbmdUcmljayA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LmlzQ3Jhc2hpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc0Jvb3N0ZWQgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc1Nsb3dlZCA9IGZhbHNlO1xyXG5cdFx0XHRpZiAoY2FuY2VsYWJsZVN0YXRlSW50ZXJ2YWwpIHtcclxuXHRcdFx0XHRjbGVhckludGVydmFsKGNhbmNlbGFibGVTdGF0ZUludGVydmFsKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGF0LnNldE1hcFBvc2l0aW9uKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAwKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBzZXRDcmFzaGVkKCkge1xyXG5cdFx0XHR0aGF0Lmhhc0JlZW5IaXQgPSB0cnVlO1xyXG5cdFx0XHR0aGF0LmlzQ3Jhc2hpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0LmlzSnVtcGluZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LmlzUGVyZm9ybWluZ1RyaWNrID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuc3RhcnRDcmFzaGluZygpO1xyXG5cdFx0XHRpZiAoY2FuY2VsYWJsZVN0YXRlSW50ZXJ2YWwpIHtcclxuXHRcdFx0XHRjbGVhckludGVydmFsKGNhbmNlbGFibGVTdGF0ZUludGVydmFsKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGF0LnNldE1hcFBvc2l0aW9uKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAwKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBzZXRKdW1waW5nKCkge1xyXG5cdFx0XHR2YXIgY3VycmVudFNwZWVkID0gdGhhdC5nZXRTcGVlZCgpO1xyXG5cdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc291dGgnKTtcclxuXHRcdFx0dGhhdC5zZXRTcGVlZChjdXJyZW50U3BlZWQgKyAyKTtcclxuXHRcdFx0dGhhdC5zZXRTcGVlZFkoY3VycmVudFNwZWVkICsgMik7XHJcblx0XHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0Lmhhc0JlZW5IaXQgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc0p1bXBpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0LnNldE1hcFBvc2l0aW9uKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAxKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBzZXRTbG93RG93bigpIHtcclxuXHRcdFx0dGhhdC5zZXRTcGVlZCgxKTtcclxuXHRcdFx0dGhhdC5zZXRTcGVlZFkoMSk7XHJcblx0XHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0LmlzU2xvd2VkID0gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXREaXNjcmV0ZURpcmVjdGlvbigpIHtcclxuXHRcdFx0aWYgKHRoYXQuZGlyZWN0aW9uKSB7XHJcblx0XHRcdFx0aWYgKHRoYXQuZGlyZWN0aW9uIDw9IDkwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ2Vhc3QnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5kaXJlY3Rpb24gPiA5MCAmJiB0aGF0LmRpcmVjdGlvbiA8IDE1MCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdlc0Vhc3QnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5kaXJlY3Rpb24gPj0gMTUwICYmIHRoYXQuZGlyZWN0aW9uIDwgMTgwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3NFYXN0JztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHRoYXQuZGlyZWN0aW9uID09PSAxODApIHtcclxuXHRcdFx0XHRcdHJldHVybiAnc291dGgnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5kaXJlY3Rpb24gPiAxODAgJiYgdGhhdC5kaXJlY3Rpb24gPD0gMjEwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3NXZXN0JztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHRoYXQuZGlyZWN0aW9uID4gMjEwICYmIHRoYXQuZGlyZWN0aW9uIDwgMjcwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3dzV2VzdCc7XHJcblx0XHRcdFx0fSBlbHNlIGlmICh0aGF0LmRpcmVjdGlvbiA+PSAyNzApIHtcclxuXHRcdFx0XHRcdHJldHVybiAnd2VzdCc7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHJldHVybiAnc291dGgnO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR2YXIgeERpZmYgPSB0aGF0Lm1vdmluZ1Rvd2FyZFswXSAtIHRoYXQubWFwUG9zaXRpb25bMF07XHJcblx0XHRcdFx0dmFyIHlEaWZmID0gdGhhdC5tb3ZpbmdUb3dhcmRbMV0gLSB0aGF0Lm1hcFBvc2l0aW9uWzFdO1xyXG5cdFx0XHRcdGlmICh5RGlmZiA8PSAwKSB7XHJcblx0XHRcdFx0XHRpZiAoeERpZmYgPiAwKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiAnZWFzdCc7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gJ3dlc3QnO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKGRpcmVjdGlvbnMuZXNFYXN0KHhEaWZmKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdlc0Vhc3QnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoZGlyZWN0aW9ucy5zRWFzdCh4RGlmZikpIHtcclxuXHRcdFx0XHRcdHJldHVybiAnc0Vhc3QnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoZGlyZWN0aW9ucy53c1dlc3QoeERpZmYpKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3dzV2VzdCc7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChkaXJlY3Rpb25zLnNXZXN0KHhEaWZmKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdzV2VzdCc7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiAnc291dGgnO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHNldERpc2NyZXRlRGlyZWN0aW9uKGQpIHtcclxuXHRcdFx0aWYgKGRpc2NyZXRlRGlyZWN0aW9uc1tkXSkge1xyXG5cdFx0XHRcdHRoYXQuc2V0RGlyZWN0aW9uKGRpc2NyZXRlRGlyZWN0aW9uc1tkXSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChkID09PSAnd2VzdCcgfHwgZCA9PT0gJ2Vhc3QnKSB7XHJcblx0XHRcdFx0dGhhdC5pc01vdmluZyA9IGZhbHNlO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0QmVpbmdFYXRlblNwcml0ZSgpIHtcclxuXHRcdFx0cmV0dXJuICdibGFuayc7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gZ2V0SnVtcGluZ1Nwcml0ZSgpIHtcclxuXHRcdFx0cmV0dXJuICdqdW1waW5nJztcclxuXHRcdH1cclxuXHJcblx0XHR0aGF0LnN0b3AgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmICh0aGF0LmRpcmVjdGlvbiA+IDE4MCkge1xyXG5cdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCd3ZXN0Jyk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ2Vhc3QnKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnR1cm5FYXN0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR2YXIgZGlzY3JldGVEaXJlY3Rpb24gPSBnZXREaXNjcmV0ZURpcmVjdGlvbigpO1xyXG5cclxuXHRcdFx0c3dpdGNoIChkaXNjcmV0ZURpcmVjdGlvbikge1xyXG5cdFx0XHRcdGNhc2UgJ3dlc3QnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3dzV2VzdCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnd3NXZXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdzV2VzdCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnc1dlc3QnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NvdXRoJyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdzb3V0aCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc0Vhc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3NFYXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdlc0Vhc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2VzRWFzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignZWFzdCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdzb3V0aCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC50dXJuV2VzdCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dmFyIGRpc2NyZXRlRGlyZWN0aW9uID0gZ2V0RGlzY3JldGVEaXJlY3Rpb24oKTtcclxuXHJcblx0XHRcdHN3aXRjaCAoZGlzY3JldGVEaXJlY3Rpb24pIHtcclxuXHRcdFx0XHRjYXNlICdlYXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdlc0Vhc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2VzRWFzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc0Vhc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3NFYXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdzb3V0aCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnc291dGgnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NXZXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdzV2VzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignd3NXZXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICd3c1dlc3QnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3dlc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc291dGgnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuc3RlcFdlc3QgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRoYXQubWFwUG9zaXRpb25bMF0gLT0gdGhhdC5zcGVlZCAqIDI7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuc3RlcEVhc3QgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRoYXQubWFwUG9zaXRpb25bMF0gKz0gdGhhdC5zcGVlZCAqIDI7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuc2V0TWFwUG9zaXRpb25UYXJnZXQgPSBmdW5jdGlvbiAoeCwgeSkge1xyXG5cdFx0XHRpZiAodGhhdC5oYXNCZWVuSGl0KSByZXR1cm47XHJcblxyXG5cdFx0XHRpZiAoTWF0aC5hYnModGhhdC5tYXBQb3NpdGlvblswXSAtIHgpIDw9IDc1KSB7XHJcblx0XHRcdFx0eCA9IHRoYXQubWFwUG9zaXRpb25bMF07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoYXQubW92aW5nVG93YXJkID0gWyB4LCB5IF07XHJcblxyXG5cdFx0XHQvLyB0aGF0LnJlc2V0RGlyZWN0aW9uKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuc3RhcnRNb3ZpbmdJZlBvc3NpYmxlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRpZiAoIXRoYXQuaGFzQmVlbkhpdCAmJiAhdGhhdC5pc0JlaW5nRWF0ZW4pIHtcclxuXHRcdFx0XHR0aGF0LmlzTW92aW5nID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnNldFR1cm5FYXNlQ3ljbGVzID0gZnVuY3Rpb24gKGMpIHtcclxuXHRcdFx0dHVybkVhc2VDeWNsZXMgPSBjO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmdldFBpeGVsc1RyYXZlbGxlZERvd25Nb3VudGFpbiA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIHBpeGVsc1RyYXZlbGxlZDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5yZXNldFNwZWVkID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR0aGF0LnNldFNwZWVkKHN0YW5kYXJkU3BlZWQpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmN5Y2xlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRpZiAoIHRoYXQuZ2V0U3BlZWRYKCkgPD0gMCAmJiB0aGF0LmdldFNwZWVkWSgpIDw9IDAgKSB7XHJcblx0XHRcdFx0XHRcdHRoYXQuaXNNb3ZpbmcgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodGhhdC5pc01vdmluZykge1xyXG5cdFx0XHRcdHBpeGVsc1RyYXZlbGxlZCArPSB0aGF0LnNwZWVkO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodGhhdC5pc0p1bXBpbmcpIHtcclxuXHRcdFx0XHR0aGF0LnNldE1hcFBvc2l0aW9uVGFyZ2V0KHVuZGVmaW5lZCwgdGhhdC5tYXBQb3NpdGlvblsxXSArIHRoYXQuZ2V0U3BlZWQoKSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHN1cC5jeWNsZSgpO1xyXG5cdFx0XHRcclxuXHRcdFx0dGhhdC5jaGVja0hpdHRhYmxlT2JqZWN0cygpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmRyYXcgPSBmdW5jdGlvbihkQ29udGV4dCkge1xyXG5cdFx0XHR2YXIgc3ByaXRlUGFydFRvVXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdGlmICh0aGF0LmlzQmVpbmdFYXRlbikge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGdldEJlaW5nRWF0ZW5TcHJpdGUoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmICh0aGF0LmlzSnVtcGluZykge1xyXG5cdFx0XHRcdFx0LyogaWYgKHRoYXQuaXNQZXJmb3JtaW5nVHJpY2spIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGdldFRyaWNrU3ByaXRlKCk7XHJcblx0XHRcdFx0XHR9ICovXHJcblx0XHRcdFx0XHRyZXR1cm4gZ2V0SnVtcGluZ1Nwcml0ZSgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKHRoYXQuaXNDcmFzaGluZylcclxuXHRcdFx0XHRcdHJldHVybiAnd3JlY2snICsgY3Jhc2hpbmdGcmFtZTtcclxuXHJcblx0XHRcdFx0aWYgKHRoYXQuaXNCb29zdGluZylcclxuXHRcdFx0XHRcdHJldHVybiAnYm9vc3QnO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gZ2V0RGlzY3JldGVEaXJlY3Rpb24oKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHJldHVybiBzdXAuZHJhdyhkQ29udGV4dCwgc3ByaXRlUGFydFRvVXNlKCkpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmhpdHMgPSBmdW5jdGlvbiAob2JzKSB7XHJcblx0XHRcdGlmIChvYnN0YWNsZXNIaXQuaW5kZXhPZihvYnMuaWQpICE9PSAtMSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKCFvYnMub2NjdXBpZXNaSW5kZXgodGhhdC5tYXBQb3NpdGlvblsyXSkpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChzdXAuaGl0cyhvYnMpKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zcGVlZEJvb3N0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR2YXIgb3JpZ2luYWxTcGVlZCA9IHRoYXQuc3BlZWQ7XHJcblx0XHRcdGlmIChjYW5TcGVlZEJvb3N0KSB7XHJcblx0XHRcdFx0Y2FuU3BlZWRCb29zdCA9IGZhbHNlO1xyXG5cdFx0XHRcdHRoYXQuc2V0U3BlZWQodGhhdC5zcGVlZCAqIGJvb3N0TXVsdGlwbGllcik7XHJcblx0XHRcdFx0dGhhdC5pc0Jvb3N0aW5nID0gdHJ1ZTtcclxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHRoYXQuc2V0U3BlZWQob3JpZ2luYWxTcGVlZCk7XHJcblx0XHRcdFx0XHR0aGF0LmlzQm9vc3RpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRjYW5TcGVlZEJvb3N0ID0gdHJ1ZTtcclxuXHRcdFx0XHRcdH0sIDEwMDAwKTtcclxuXHRcdFx0XHR9LCAyMDAwKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmF0dGVtcHRUcmljayA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0aWYgKHRoYXQuaXNKdW1waW5nKSB7XHJcblx0XHRcdFx0dGhhdC5pc1BlcmZvcm1pbmdUcmljayA9IHRydWU7XHJcblx0XHRcdFx0Y2FuY2VsYWJsZVN0YXRlSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRpZiAodHJpY2tTdGVwID49IDIpIHtcclxuXHRcdFx0XHRcdFx0dHJpY2tTdGVwID0gMDtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHRyaWNrU3RlcCArPSAxO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sIDMwMCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5nZXRTdGFuZGFyZFNwZWVkID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gc3RhbmRhcmRTcGVlZDtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gZWFzZVNwZWVkVG9UYXJnZXRVc2luZ0ZhY3RvcihzcCwgdGFyZ2V0U3BlZWQsIGYpIHtcclxuXHRcdFx0aWYgKGYgPT09IDAgfHwgZiA9PT0gMSkge1xyXG5cdFx0XHRcdHJldHVybiB0YXJnZXRTcGVlZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHNwIDwgdGFyZ2V0U3BlZWQpIHtcclxuXHRcdFx0XHRzcCArPSB0aGF0LmdldFNwZWVkKCkgKiAoZiAvIHR1cm5FYXNlQ3ljbGVzKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHNwID4gdGFyZ2V0U3BlZWQpIHtcclxuXHRcdFx0XHRzcCAtPSB0aGF0LmdldFNwZWVkKCkgKiAoZiAvIHR1cm5FYXNlQ3ljbGVzKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHNwO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoYXQuZ2V0U3BlZWRYID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRpZiAoZ2V0RGlzY3JldGVEaXJlY3Rpb24oKSA9PT0gJ2VzRWFzdCcgfHwgZ2V0RGlzY3JldGVEaXJlY3Rpb24oKSA9PT0gJ3dzV2VzdCcpIHtcclxuXHRcdFx0XHRzcGVlZFhGYWN0b3IgPSAwLjU7XHJcblx0XHRcdFx0c3BlZWRYID0gZWFzZVNwZWVkVG9UYXJnZXRVc2luZ0ZhY3RvcihzcGVlZFgsIHRoYXQuZ2V0U3BlZWQoKSAqIHNwZWVkWEZhY3Rvciwgc3BlZWRYRmFjdG9yKTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIHNwZWVkWDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGdldERpc2NyZXRlRGlyZWN0aW9uKCkgPT09ICdzRWFzdCcgfHwgZ2V0RGlzY3JldGVEaXJlY3Rpb24oKSA9PT0gJ3NXZXN0Jykge1xyXG5cdFx0XHRcdHNwZWVkWEZhY3RvciA9IDAuMzM7XHJcblx0XHRcdFx0c3BlZWRYID0gZWFzZVNwZWVkVG9UYXJnZXRVc2luZ0ZhY3RvcihzcGVlZFgsIHRoYXQuZ2V0U3BlZWQoKSAqIHNwZWVkWEZhY3Rvciwgc3BlZWRYRmFjdG9yKTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIHNwZWVkWDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU28gaXQgbXVzdCBiZSBzb3V0aFxyXG5cclxuXHRcdFx0c3BlZWRYID0gZWFzZVNwZWVkVG9UYXJnZXRVc2luZ0ZhY3RvcihzcGVlZFgsIDAsIHNwZWVkWEZhY3Rvcik7XHJcblxyXG5cdFx0XHRyZXR1cm4gc3BlZWRYO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnNldFNwZWVkWSA9IGZ1bmN0aW9uKHN5KSB7XHJcblx0XHRcdHNwZWVkWSA9IHN5O1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmdldFNwZWVkWSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dmFyIHRhcmdldFNwZWVkO1xyXG5cclxuXHRcdFx0aWYgKHRoYXQuaXNKdW1waW5nKSB7XHJcblx0XHRcdFx0cmV0dXJuIHNwZWVkWTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGdldERpc2NyZXRlRGlyZWN0aW9uKCkgPT09ICdlc0Vhc3QnIHx8IGdldERpc2NyZXRlRGlyZWN0aW9uKCkgPT09ICd3c1dlc3QnKSB7XHJcblx0XHRcdFx0c3BlZWRZRmFjdG9yID0gMC42O1xyXG5cdFx0XHRcdHNwZWVkWSA9IGVhc2VTcGVlZFRvVGFyZ2V0VXNpbmdGYWN0b3Ioc3BlZWRZLCB0aGF0LmdldFNwZWVkKCkgKiAwLjYsIDAuNik7XHJcblxyXG5cdFx0XHRcdHJldHVybiBzcGVlZFk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChnZXREaXNjcmV0ZURpcmVjdGlvbigpID09PSAnc0Vhc3QnIHx8IGdldERpc2NyZXRlRGlyZWN0aW9uKCkgPT09ICdzV2VzdCcpIHtcclxuXHRcdFx0XHRzcGVlZFlGYWN0b3IgPSAwLjg1O1xyXG5cdFx0XHRcdHNwZWVkWSA9IGVhc2VTcGVlZFRvVGFyZ2V0VXNpbmdGYWN0b3Ioc3BlZWRZLCB0aGF0LmdldFNwZWVkKCkgKiAwLjg1LCAwLjg1KTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIHNwZWVkWTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGdldERpc2NyZXRlRGlyZWN0aW9uKCkgPT09ICdlYXN0JyB8fCBnZXREaXNjcmV0ZURpcmVjdGlvbigpID09PSAnd2VzdCcpIHtcclxuXHRcdFx0XHRzcGVlZFlGYWN0b3IgPSAxO1xyXG5cdFx0XHRcdHNwZWVkWSA9IDA7XHJcblxyXG5cdFx0XHRcdHJldHVybiBzcGVlZFk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNvIGl0IG11c3QgYmUgc291dGhcclxuXHJcblx0XHRcdHNwZWVkWSA9IGVhc2VTcGVlZFRvVGFyZ2V0VXNpbmdGYWN0b3Ioc3BlZWRZLCB0aGF0LmdldFNwZWVkKCksIHNwZWVkWUZhY3Rvcik7XHJcblxyXG5cdFx0XHRyZXR1cm4gc3BlZWRZO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0Lmhhc0hpdE9ic3RhY2xlID0gZnVuY3Rpb24gKG9icykge1xyXG5cdFx0XHRzZXRDcmFzaGVkKCk7XHJcblxyXG5cdFx0XHRpZiAobmF2aWdhdG9yLnZpYnJhdGUpIHtcclxuXHRcdFx0XHRuYXZpZ2F0b3IudmlicmF0ZSg1MDApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRvYnN0YWNsZXNIaXQucHVzaChvYnMuaWQpO1xyXG5cclxuXHRcdFx0dGhhdC5yZXNldFNwZWVkKCk7XHJcblx0XHRcdHRoYXQub25IaXRPYnN0YWNsZUNiKG9icyk7XHJcblxyXG5cdFx0XHRpZiAoY2FuY2VsYWJsZVN0YXRlVGltZW91dCkge1xyXG5cdFx0XHRcdGNsZWFyVGltZW91dChjYW5jZWxhYmxlU3RhdGVUaW1lb3V0KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYW5jZWxhYmxlU3RhdGVUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRzZXROb3JtYWwoKTtcclxuXHRcdFx0fSwgMTUwMCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuaGFzSGl0SnVtcCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0c2V0SnVtcGluZygpO1xyXG5cclxuXHRcdFx0aWYgKGNhbmNlbGFibGVTdGF0ZVRpbWVvdXQpIHtcclxuXHRcdFx0XHRjbGVhclRpbWVvdXQoY2FuY2VsYWJsZVN0YXRlVGltZW91dCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FuY2VsYWJsZVN0YXRlVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0c2V0Tm9ybWFsKCk7XHJcblx0XHRcdH0sIDEwMDApO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0Lmhhc0hpdE9pbFNsaWNrID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRzZXRTbG93RG93bigpO1xyXG5cclxuXHRcdFx0aWYgKGNhbmNlbGFibGVTdGF0ZVRpbWVvdXQpIHtcclxuXHRcdFx0XHRjbGVhclRpbWVvdXQoY2FuY2VsYWJsZVN0YXRlVGltZW91dCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FuY2VsYWJsZVN0YXRlVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0c2V0Tm9ybWFsKCk7XHJcblx0XHRcdH0sIDMwMCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5oYXNIaXRDb2xsZWN0aWJsZSA9IGZ1bmN0aW9uIChpdGVtKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdIaXQgaXRlbTonLCBpdGVtLmRhdGEubmFtZSlcclxuXHRcdFx0dGhhdC5vbkNvbGxlY3RJdGVtQ2IoaXRlbSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5pc0VhdGVuQnkgPSBmdW5jdGlvbiAobW9uc3Rlciwgd2hlbkVhdGVuKSB7XHJcblx0XHRcdHRoYXQuaGFzSGl0T2JzdGFjbGUobW9uc3Rlcik7XHJcblx0XHRcdG1vbnN0ZXIuc3RhcnRFYXRpbmcod2hlbkVhdGVuKTtcclxuXHRcdFx0b2JzdGFjbGVzSGl0LnB1c2gobW9uc3Rlci5pZCk7XHJcblx0XHRcdHRoYXQuaXNNb3ZpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc0JlaW5nRWF0ZW4gPSB0cnVlO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnJlc2V0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRvYnN0YWNsZXNIaXQgPSBbXTtcclxuXHRcdFx0cGl4ZWxzVHJhdmVsbGVkID0gMDtcclxuXHRcdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHRcdHRoYXQuaXNKdW1waW5nID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuaGFzQmVlbkhpdCA9IGZhbHNlO1xyXG5cdFx0XHRjYW5TcGVlZEJvb3N0ID0gdHJ1ZTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zZXRIaXRPYnN0YWNsZUNiID0gZnVuY3Rpb24gKGZuKSB7XHJcblx0XHRcdHRoYXQub25IaXRPYnN0YWNsZUNiID0gZm4gfHwgZnVuY3Rpb24oKSB7fTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zZXRDb2xsZWN0SXRlbUNiID0gZnVuY3Rpb24gKGZuKSB7XHJcblx0XHRcdHRoYXQub25Db2xsZWN0SXRlbUNiID0gZm4gfHwgZnVuY3Rpb24oKSB7fTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBzdGFydENyYXNoaW5nKCkge1xyXG5cdFx0XHRjcmFzaGluZ0ZyYW1lICs9IDE7XHJcblx0XHRcdHRoYXQuaXNDcmFzaGluZyA9IHRydWU7XHJcblx0XHRcdHRoYXQuaXNCb29zdGluZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LnNldFNwZWVkKDEpO1xyXG5cdFx0XHRpZiAoY3Jhc2hpbmdGcmFtZSA8IDYpIHtcclxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHN0YXJ0Q3Jhc2hpbmcoKTtcclxuXHRcdFx0XHR9LCAxMDApO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNyYXNoaW5nRnJhbWUgPSAwO1xyXG5cdFx0XHRcdHRoYXQuaXNDcmFzaGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdHRoYXQuaXNNb3ZpbmcgPSBmYWxzZTsgLy8gc3RvcCBtb3Zpbmcgb24gbGFzdCBmcmFtZVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5zdGFydENyYXNoaW5nID0gc3RhcnRDcmFzaGluZztcclxuXHJcblx0XHRyZXR1cm4gdGhhdDtcclxuXHR9XHJcblxyXG5cdGdsb2JhbC5wbGF5ZXIgPSBQbGF5ZXI7XHJcbn0pKHRoaXMpO1xyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSB0aGlzLnBsYXllcjtcclxufVxyXG4iLCIvLyBBdm9pZCBgY29uc29sZWAgZXJyb3JzIGluIGJyb3dzZXJzIHRoYXQgbGFjayBhIGNvbnNvbGUuXHJcbihmdW5jdGlvbigpIHtcclxuICAgIHZhciBtZXRob2Q7XHJcbiAgICB2YXIgbm9vcCA9IGZ1bmN0aW9uIG5vb3AoKSB7fTtcclxuICAgIHZhciBtZXRob2RzID0gW1xyXG4gICAgICAgICdhc3NlcnQnLCAnY2xlYXInLCAnY291bnQnLCAnZGVidWcnLCAnZGlyJywgJ2RpcnhtbCcsICdlcnJvcicsXHJcbiAgICAgICAgJ2V4Y2VwdGlvbicsICdncm91cCcsICdncm91cENvbGxhcHNlZCcsICdncm91cEVuZCcsICdpbmZvJywgJ2xvZycsXHJcbiAgICAgICAgJ21hcmtUaW1lbGluZScsICdwcm9maWxlJywgJ3Byb2ZpbGVFbmQnLCAndGFibGUnLCAndGltZScsICd0aW1lRW5kJyxcclxuICAgICAgICAndGltZVN0YW1wJywgJ3RyYWNlJywgJ3dhcm4nXHJcbiAgICBdO1xyXG4gICAgdmFyIGxlbmd0aCA9IG1ldGhvZHMubGVuZ3RoO1xyXG4gICAgdmFyIGNvbnNvbGUgPSAod2luZG93LmNvbnNvbGUgPSB3aW5kb3cuY29uc29sZSB8fCB7fSk7XHJcblxyXG4gICAgd2hpbGUgKGxlbmd0aC0tKSB7XHJcbiAgICAgICAgbWV0aG9kID0gbWV0aG9kc1tsZW5ndGhdO1xyXG5cclxuICAgICAgICAvLyBPbmx5IHN0dWIgdW5kZWZpbmVkIG1ldGhvZHMuXHJcbiAgICAgICAgaWYgKCFjb25zb2xlW21ldGhvZF0pIHtcclxuICAgICAgICAgICAgY29uc29sZVttZXRob2RdID0gbm9vcDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0oKSk7IiwiKGZ1bmN0aW9uIChnbG9iYWwpIHtcclxuXHR2YXIgR1VJRCA9IHJlcXVpcmUoJy4vZ3VpZCcpO1xyXG5cdGZ1bmN0aW9uIFNwcml0ZSAoZGF0YSkge1xyXG5cdFx0dmFyIGhpdHRhYmxlT2JqZWN0cyA9IHt9O1xyXG5cdFx0dmFyIHpJbmRleGVzT2NjdXBpZWQgPSBbIDAgXTtcclxuXHRcdHZhciB0aGF0ID0gdGhpcztcclxuXHRcdHZhciB0cmFja2VkU3ByaXRlVG9Nb3ZlVG93YXJkO1xyXG5cdFx0dmFyIHNob3dIaXRCb3hlcyA9IGZhbHNlO1xyXG5cclxuXHRcdHRoYXQuZGlyZWN0aW9uID0gdW5kZWZpbmVkO1xyXG5cdFx0dGhhdC5tYXBQb3NpdGlvbiA9IFswLCAwLCAwXTtcclxuXHRcdHRoYXQuaWQgPSBHVUlEKCk7XHJcblx0XHR0aGF0LmNhbnZhc1ggPSAwO1xyXG5cdFx0dGhhdC5jYW52YXNZID0gMDtcclxuXHRcdHRoYXQuY2FudmFzWiA9IDA7XHJcblx0XHR0aGF0LmhlaWdodCA9IDA7XHJcblx0XHR0aGF0LnNwZWVkID0gMDtcclxuXHRcdHRoYXQuZGF0YSA9IGRhdGEgfHwgeyBwYXJ0cyA6IHt9IH07XHJcblx0XHR0aGF0Lm1vdmluZ1Rvd2FyZCA9IFsgMCwgMCBdO1xyXG5cdFx0dGhhdC5tZXRyZXNEb3duVGhlTW91bnRhaW4gPSAwO1xyXG5cdFx0dGhhdC5tb3ZpbmdXaXRoQ29udmljdGlvbiA9IGZhbHNlO1xyXG5cdFx0dGhhdC5kZWxldGVkID0gZmFsc2U7XHJcblx0XHR0aGF0Lm1heEhlaWdodCA9IChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiBPYmplY3QudmFsdWVzKHRoYXQuZGF0YS5wYXJ0cykubWFwKGZ1bmN0aW9uIChwKSB7IHJldHVybiBwWzNdOyB9KS5tYXgoKTtcclxuXHRcdH0oKSk7XHJcblx0XHR0aGF0LmlzTW92aW5nID0gdHJ1ZTtcclxuXHRcdHRoYXQuaXNEcmF3blVuZGVyUGxheWVyID0gZGF0YS5pc0RyYXduVW5kZXJQbGF5ZXI7XHJcblx0XHRcclxuXHRcdGlmICghdGhhdC5kYXRhLnBhcnRzKSB7XHJcblx0XHRcdHRoYXQuZGF0YS5wYXJ0cyA9IHt9O1xyXG5cdFx0XHR0aGF0LmN1cnJlbnRGcmFtZSA9IHVuZGVmaW5lZDtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoYXQuY3VycmVudEZyYW1lID0gdGhhdC5kYXRhLnBhcnRzWzBdO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChkYXRhICYmIGRhdGEuaWQpe1xyXG5cdFx0XHR0aGF0LmlkID0gZGF0YS5pZDtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoZGF0YSAmJiBkYXRhLnpJbmRleGVzT2NjdXBpZWQpIHtcclxuXHRcdFx0ekluZGV4ZXNPY2N1cGllZCA9IGRhdGEuekluZGV4ZXNPY2N1cGllZDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBpbmNyZW1lbnRYKGFtb3VudCkge1xyXG5cdFx0XHR0aGF0LmNhbnZhc1ggKz0gYW1vdW50LnRvTnVtYmVyKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gaW5jcmVtZW50WShhbW91bnQpIHtcclxuXHRcdFx0dGhhdC5jYW52YXNZICs9IGFtb3VudC50b051bWJlcigpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldEhpdEJveChmb3JaSW5kZXgpIHtcclxuXHRcdFx0aWYgKHRoYXQuZGF0YS5oaXRCb3hlcykge1xyXG5cdFx0XHRcdGlmIChkYXRhLmhpdEJveGVzW2ZvclpJbmRleF0pIHtcclxuXHRcdFx0XHRcdHJldHVybiBkYXRhLmhpdEJveGVzW2ZvclpJbmRleF07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gcm91bmRIYWxmKG51bSkge1xyXG5cdFx0XHRudW0gPSBNYXRoLnJvdW5kKG51bSoyKS8yO1xyXG5cdFx0XHRyZXR1cm4gbnVtO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIG1vdmUoKSB7XHJcblx0XHRcdGlmICghdGhhdC5pc01vdmluZykge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bGV0IGN1cnJlbnRYID0gdGhhdC5tYXBQb3NpdGlvblswXTtcclxuXHRcdFx0bGV0IGN1cnJlbnRZID0gdGhhdC5tYXBQb3NpdGlvblsxXTtcclxuXHJcblx0XHRcdGlmICh0eXBlb2YgdGhhdC5kaXJlY3Rpb24gIT09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0Ly8gRm9yIHRoaXMgd2UgbmVlZCB0byBtb2RpZnkgdGhlIHRoYXQuZGlyZWN0aW9uIHNvIGl0IHJlbGF0ZXMgdG8gdGhlIGhvcml6b250YWxcclxuXHRcdFx0XHR2YXIgZCA9IHRoYXQuZGlyZWN0aW9uIC0gOTA7XHJcblx0XHRcdFx0aWYgKGQgPCAwKSBkID0gMzYwICsgZDtcclxuXHRcdFx0XHRjdXJyZW50WCArPSByb3VuZEhhbGYodGhhdC5zcGVlZCAqIE1hdGguY29zKGQgKiAoTWF0aC5QSSAvIDE4MCkpKTtcclxuXHRcdFx0XHRjdXJyZW50WSArPSByb3VuZEhhbGYodGhhdC5zcGVlZCAqIE1hdGguc2luKGQgKiAoTWF0aC5QSSAvIDE4MCkpKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpZiAodHlwZW9mIHRoYXQubW92aW5nVG93YXJkWzBdICE9PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdFx0aWYgKGN1cnJlbnRYID4gdGhhdC5tb3ZpbmdUb3dhcmRbMF0pIHtcclxuXHRcdFx0XHRcdFx0Y3VycmVudFggLT0gTWF0aC5taW4odGhhdC5nZXRTcGVlZFgoKSwgTWF0aC5hYnMoY3VycmVudFggLSB0aGF0Lm1vdmluZ1Rvd2FyZFswXSkpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChjdXJyZW50WCA8IHRoYXQubW92aW5nVG93YXJkWzBdKSB7XHJcblx0XHRcdFx0XHRcdGN1cnJlbnRYICs9IE1hdGgubWluKHRoYXQuZ2V0U3BlZWRYKCksIE1hdGguYWJzKGN1cnJlbnRYIC0gdGhhdC5tb3ZpbmdUb3dhcmRbMF0pKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKHR5cGVvZiB0aGF0Lm1vdmluZ1Rvd2FyZFsxXSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0XHRcdGlmIChjdXJyZW50WSA+IHRoYXQubW92aW5nVG93YXJkWzFdKSB7XHJcblx0XHRcdFx0XHRcdGN1cnJlbnRZIC09IE1hdGgubWluKHRoYXQuZ2V0U3BlZWRZKCksIE1hdGguYWJzKGN1cnJlbnRZIC0gdGhhdC5tb3ZpbmdUb3dhcmRbMV0pKTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoY3VycmVudFkgPCB0aGF0Lm1vdmluZ1Rvd2FyZFsxXSkge1xyXG5cdFx0XHRcdFx0XHRjdXJyZW50WSArPSBNYXRoLm1pbih0aGF0LmdldFNwZWVkWSgpLCBNYXRoLmFicyhjdXJyZW50WSAtIHRoYXQubW92aW5nVG93YXJkWzFdKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGF0LnNldE1hcFBvc2l0aW9uKGN1cnJlbnRYLCBjdXJyZW50WSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5zZXRIaXRCb3hlc1Zpc2libGUgPSBmdW5jdGlvbihzaG93KSB7XHJcblx0XHRcdHNob3dIaXRCb3hlcyA9IHNob3c7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5kcmF3ID0gZnVuY3Rpb24gKGRDdHgsIHNwcml0ZUZyYW1lKSB7XHJcblx0XHRcdHRoYXQuY3VycmVudEZyYW1lID0gdGhhdC5kYXRhLnBhcnRzW3Nwcml0ZUZyYW1lXTtcclxuXHRcdFx0bGV0IGZyID0gdGhhdC5jdXJyZW50RnJhbWU7Ly8gdGhhdC5kYXRhLnBhcnRzW3Nwcml0ZUZyYW1lXTtcclxuXHRcdFx0dGhhdC5oZWlnaHQgPSBmclszXTtcclxuXHRcdFx0dGhhdC53aWR0aCA9IGZyWzJdO1xyXG5cclxuXHRcdFx0Y29uc3QgbmV3Q2FudmFzUG9zaXRpb24gPSBkQ3R4Lm1hcFBvc2l0aW9uVG9DYW52YXNQb3NpdGlvbih0aGF0Lm1hcFBvc2l0aW9uKTtcclxuXHRcdFx0dGhhdC5zZXRDYW52YXNQb3NpdGlvbihuZXdDYW52YXNQb3NpdGlvblswXSwgbmV3Q2FudmFzUG9zaXRpb25bMV0pO1xyXG5cclxuXHRcdFx0Ly8gU3ByaXRlIG9mZnNldCBmb3Iga2VlcGluZyBzcHJpdGUgZnJhbWUgY2VudGVyZWQgKGZvciBzcHJpdGUgZnJhbWVzIG9mIHZhcmlvdXMgc2l6ZXMpXHJcblx0XHRcdGNvbnN0IG9mZnNldFggPSBmci5sZW5ndGggPiA0ID8gZnJbNF0gOiAwO1xyXG5cdFx0XHRjb25zdCBvZmZzZXRZID0gZnIubGVuZ3RoID4gNSA/IGZyWzVdIDogMDtcclxuXHJcblx0XHRcdGRDdHguZHJhd0ltYWdlKGRDdHguZ2V0TG9hZGVkSW1hZ2UodGhhdC5kYXRhLiRpbWFnZUZpbGUpLCBmclswXSwgZnJbMV0sIGZyWzJdLCBmclszXSwgdGhhdC5jYW52YXNYICsgb2Zmc2V0WCwgdGhhdC5jYW52YXNZICsgb2Zmc2V0WSwgZnJbMl0sIGZyWzNdKTtcclxuXHRcdFxyXG5cdFx0XHRkcmF3SGl0Ym94KGRDdHgsIGZyKTtcclxuXHRcdH07XHJcblxyXG5cclxuXHRcdGZ1bmN0aW9uIGRyYXdIaXRib3goZEN0eCwgc3ByaXRlUGFydCkge1xyXG5cdFx0XHRpZiAoIXNob3dIaXRCb3hlcylcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcclxuXHRcdFx0Y29uc3QgaGl0Ym94T2Zmc2V0WCA9IHNwcml0ZVBhcnQubGVuZ3RoID4gNiA/IHNwcml0ZVBhcnRbNl0gOiAwO1xyXG5cdFx0XHRjb25zdCBoaXRib3hPZmZzZXRZID0gc3ByaXRlUGFydC5sZW5ndGggPiA3ID8gc3ByaXRlUGFydFs3XSA6IDA7XHJcblxyXG5cdFx0XHQvLyBEcmF3IGhpdGJveGVzXHJcblx0XHRcdGZvciAoY29uc3QgYm94IGluIHRoYXQuZGF0YS5oaXRCb3hlcykge1xyXG5cdFx0XHRcdGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbCh0aGF0LmRhdGEuaGl0Qm94ZXMsIGJveCkpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGhpdEJveCA9IHRoYXQuZGF0YS5oaXRCb3hlc1tib3hdO1xyXG5cdFx0XHRcdFx0Y29uc3QgbGVmdCA9IGhpdEJveFswXSArIGhpdGJveE9mZnNldFg7XHJcblx0XHRcdFx0XHRjb25zdCB0b3AgPSBoaXRCb3hbMV0gKyBoaXRib3hPZmZzZXRZO1xyXG5cdFx0XHRcdFx0Y29uc3QgcmlnaHQgPSBoaXRCb3hbMl0gKyBoaXRib3hPZmZzZXRYO1xyXG5cdFx0XHRcdFx0Y29uc3QgYm90dG9tID0gaGl0Qm94WzNdICsgaGl0Ym94T2Zmc2V0WTtcclxuXHRcdFx0XHRcdGRDdHguc3Ryb2tlU3R5bGUgPSAneWVsbG93JztcclxuXHRcdFx0XHRcdGRDdHguc3Ryb2tlUmVjdCh0aGF0LmNhbnZhc1ggKyBsZWZ0LCB0aGF0LmNhbnZhc1kgKyB0b3AsIHJpZ2h0IC0gbGVmdCwgYm90dG9tIC0gdG9wKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnNldE1hcFBvc2l0aW9uID0gZnVuY3Rpb24gKHgsIHksIHopIHtcclxuXHRcdFx0aWYgKHR5cGVvZiB4ID09PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdHggPSB0aGF0Lm1hcFBvc2l0aW9uWzBdO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlb2YgeSA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0XHR5ID0gdGhhdC5tYXBQb3NpdGlvblsxXTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodHlwZW9mIHogPT09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0eiA9IHRoYXQubWFwUG9zaXRpb25bMl07XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhhdC56SW5kZXhlc09jY3VwaWVkID0gWyB6IF07XHJcblx0XHRcdH1cclxuXHRcdFx0dGhhdC5tYXBQb3NpdGlvbiA9IFt4LCB5LCB6XTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXRDYW52YXNQb3NpdGlvbiA9IGZ1bmN0aW9uIChjeCwgY3kpIHtcclxuXHRcdFx0aWYgKGN4KSB7XHJcblx0XHRcdFx0aWYgKE9iamVjdC5pc1N0cmluZyhjeCkgJiYgKGN4LmZpcnN0KCkgPT09ICcrJyB8fCBjeC5maXJzdCgpID09PSAnLScpKSBpbmNyZW1lbnRYKGN4KTtcclxuXHRcdFx0XHRlbHNlIHRoYXQuY2FudmFzWCA9IGN4O1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoY3kpIHtcclxuXHRcdFx0XHRpZiAoT2JqZWN0LmlzU3RyaW5nKGN5KSAmJiAoY3kuZmlyc3QoKSA9PT0gJysnIHx8IGN5LmZpcnN0KCkgPT09ICctJykpIGluY3JlbWVudFkoY3kpO1xyXG5cdFx0XHRcdGVsc2UgdGhhdC5jYW52YXNZID0gY3k7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nZXRDYW52YXNQb3NpdGlvblggPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiB0aGF0LmNhbnZhc1g7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZ2V0Q2FudmFzUG9zaXRpb25ZID0gZnVuY3Rpb24gICgpIHtcclxuXHRcdFx0cmV0dXJuIHRoYXQuY2FudmFzWTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nZXRMZWZ0SGl0Qm94RWRnZSA9IGZ1bmN0aW9uICh6SW5kZXgpIHtcclxuXHRcdFx0ekluZGV4ID0gekluZGV4IHx8IDA7XHJcblx0XHRcdGxldCBsaGJlID0gdGhpcy5nZXRDYW52YXNQb3NpdGlvblgoKTtcclxuXHRcdFx0Y29uc3QgaGl0Ym94ID0gZ2V0SGl0Qm94KHpJbmRleCk7XHJcblx0XHRcdGlmIChoaXRib3gpIHtcclxuXHRcdFx0XHRsaGJlICs9IGhpdGJveFswXTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gbGhiZTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nZXRUb3BIaXRCb3hFZGdlID0gZnVuY3Rpb24gKHpJbmRleCkge1xyXG5cdFx0XHR6SW5kZXggPSB6SW5kZXggfHwgMDtcclxuXHRcdFx0bGV0IHRoYmUgPSB0aGlzLmdldENhbnZhc1Bvc2l0aW9uWSgpO1xyXG5cdFx0XHRjb25zdCBoaXRib3ggPSBnZXRIaXRCb3goekluZGV4KTtcclxuXHRcdFx0aWYgKGhpdGJveCkge1xyXG5cdFx0XHRcdHRoYmUgKz0gaGl0Ym94WzFdO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB0aGJlO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmdldFJpZ2h0SGl0Qm94RWRnZSA9IGZ1bmN0aW9uICh6SW5kZXgpIHtcclxuXHRcdFx0ekluZGV4ID0gekluZGV4IHx8IDA7XHJcblxyXG5cdFx0XHRjb25zdCBoaXRib3ggPSBnZXRIaXRCb3goekluZGV4KTtcclxuXHRcdFx0aWYgKGhpdGJveCkge1xyXG5cdFx0XHRcdHJldHVybiB0aGF0LmNhbnZhc1ggKyBoaXRib3hbMl07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB0aGF0LmNhbnZhc1ggKyB0aGF0LndpZHRoO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmdldEJvdHRvbUhpdEJveEVkZ2UgPSBmdW5jdGlvbiAoekluZGV4KSB7XHJcblx0XHRcdHpJbmRleCA9IHpJbmRleCB8fCAwO1xyXG5cclxuXHRcdFx0Y29uc3QgaGl0Ym94ID0gZ2V0SGl0Qm94KHpJbmRleCk7XHJcblx0XHRcdGlmIChoaXRib3gpIHtcclxuXHRcdFx0XHRyZXR1cm4gdGhhdC5jYW52YXNZICsgaGl0Ym94WzNdO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gdGhhdC5jYW52YXNZICsgdGhhdC5oZWlnaHQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZ2V0UG9zaXRpb25JbkZyb250T2YgPSBmdW5jdGlvbiAgKCkge1xyXG5cdFx0XHRyZXR1cm4gW3RoYXQuY2FudmFzWCwgdGhhdC5jYW52YXNZICsgdGhhdC5oZWlnaHRdO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnNldFNwZWVkID0gZnVuY3Rpb24gKHMpIHtcclxuXHRcdFx0dGhhdC5zcGVlZCA9IHM7XHJcblx0XHRcdHRoYXQuc3BlZWRYID0gcztcclxuXHRcdFx0dGhhdC5zcGVlZFkgPSBzO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmluY3JlbWVudFNwZWVkQnkgPSBmdW5jdGlvbiAocykge1xyXG5cdFx0XHR0aGF0LnNwZWVkICs9IHM7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuZ2V0U3BlZWQgPSBmdW5jdGlvbiBnZXRTcGVlZCAoKSB7XHJcblx0XHRcdHJldHVybiB0aGF0LnNwZWVkO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmdldFNwZWVkWCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIHRoYXQuc3BlZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuZ2V0U3BlZWRZID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gdGhhdC5zcGVlZDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXRIZWlnaHQgPSBmdW5jdGlvbiAoaCkge1xyXG5cdFx0XHR0aGF0LmhlaWdodCA9IGg7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0V2lkdGggPSBmdW5jdGlvbiAodykge1xyXG5cdFx0XHR0aGF0LndpZHRoID0gdztcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nZXRNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiB0aGF0Lm1heEhlaWdodDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5nZXRNb3ZpbmdUb3dhcmRPcHBvc2l0ZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0aWYgKCF0aGF0LmlzTW92aW5nKSB7XHJcblx0XHRcdFx0cmV0dXJuIFswLCAwXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIGR4ID0gKHRoYXQubW92aW5nVG93YXJkWzBdIC0gdGhhdC5tYXBQb3NpdGlvblswXSk7XHJcblx0XHRcdHZhciBkeSA9ICh0aGF0Lm1vdmluZ1Rvd2FyZFsxXSAtIHRoYXQubWFwUG9zaXRpb25bMV0pO1xyXG5cclxuXHRcdFx0dmFyIG9wcG9zaXRlWCA9IChNYXRoLmFicyhkeCkgPiA3NSA/IDAgLSBkeCA6IDApO1xyXG5cdFx0XHR2YXIgb3Bwb3NpdGVZID0gLWR5O1xyXG5cclxuXHRcdFx0cmV0dXJuIFsgb3Bwb3NpdGVYLCBvcHBvc2l0ZVkgXTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5jaGVja0hpdHRhYmxlT2JqZWN0cyA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0T2JqZWN0LmtleXMoaGl0dGFibGVPYmplY3RzLCBmdW5jdGlvbiAoaywgb2JqZWN0RGF0YSkge1xyXG5cdFx0XHRcdGlmIChvYmplY3REYXRhLm9iamVjdC5kZWxldGVkKSB7XHJcblx0XHRcdFx0XHRkZWxldGUgaGl0dGFibGVPYmplY3RzW2tdO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRpZiAob2JqZWN0RGF0YS5vYmplY3QuaGl0cyh0aGF0KSkge1xyXG5cdFx0XHRcdFx0XHRvYmplY3REYXRhLmNhbGxiYWNrcy5lYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG5cdFx0XHRcdFx0XHRcdGNhbGxiYWNrKHRoYXQsIG9iamVjdERhdGEub2JqZWN0KTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5jeWNsZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dGhhdC5jaGVja0hpdHRhYmxlT2JqZWN0cygpO1xyXG5cclxuXHRcdFx0aWYgKHRyYWNrZWRTcHJpdGVUb01vdmVUb3dhcmQpIHtcclxuXHRcdFx0XHR0aGF0LnNldE1hcFBvc2l0aW9uVGFyZ2V0KHRyYWNrZWRTcHJpdGVUb01vdmVUb3dhcmQubWFwUG9zaXRpb25bMF0sIHRyYWNrZWRTcHJpdGVUb01vdmVUb3dhcmQubWFwUG9zaXRpb25bMV0sIHRydWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRtb3ZlKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0TWFwUG9zaXRpb25UYXJnZXQgPSBmdW5jdGlvbiAoeCwgeSwgb3ZlcnJpZGUpIHtcclxuXHRcdFx0aWYgKG92ZXJyaWRlKSB7XHJcblx0XHRcdFx0dGhhdC5tb3ZpbmdXaXRoQ29udmljdGlvbiA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoIXRoYXQubW92aW5nV2l0aENvbnZpY3Rpb24pIHtcclxuXHRcdFx0XHRpZiAodHlwZW9mIHggPT09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0XHR4ID0gdGhhdC5tb3ZpbmdUb3dhcmRbMF07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAodHlwZW9mIHkgPT09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0XHR5ID0gdGhhdC5tb3ZpbmdUb3dhcmRbMV07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0aGF0Lm1vdmluZ1Rvd2FyZCA9IFsgeCwgeSBdO1xyXG5cclxuXHRcdFx0XHR0aGF0Lm1vdmluZ1dpdGhDb252aWN0aW9uID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHRoYXQucmVzZXREaXJlY3Rpb24oKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXREaXJlY3Rpb24gPSBmdW5jdGlvbiAoYW5nbGUpIHtcclxuXHRcdFx0aWYgKGFuZ2xlID49IDM2MCkge1xyXG5cdFx0XHRcdGFuZ2xlID0gMzYwIC0gYW5nbGU7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhhdC5kaXJlY3Rpb24gPSBhbmdsZTtcclxuXHRcdFx0dGhhdC5tb3ZpbmdUb3dhcmQgPSB1bmRlZmluZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMucmVzZXREaXJlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRoYXQuZGlyZWN0aW9uID0gdW5kZWZpbmVkO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnNldE1hcFBvc2l0aW9uVGFyZ2V0V2l0aENvbnZpY3Rpb24gPSBmdW5jdGlvbiAoY3gsIGN5KSB7XHJcblx0XHRcdHRoYXQuc2V0TWFwUG9zaXRpb25UYXJnZXQoY3gsIGN5KTtcclxuXHRcdFx0dGhhdC5tb3ZpbmdXaXRoQ29udmljdGlvbiA9IHRydWU7XHJcblx0XHRcdC8vIHRoYXQucmVzZXREaXJlY3Rpb24oKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5mb2xsb3cgPSBmdW5jdGlvbiAoc3ByaXRlKSB7XHJcblx0XHRcdHRyYWNrZWRTcHJpdGVUb01vdmVUb3dhcmQgPSBzcHJpdGU7XHJcblx0XHRcdC8vIHRoYXQucmVzZXREaXJlY3Rpb24oKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zdG9wRm9sbG93aW5nID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR0cmFja2VkU3ByaXRlVG9Nb3ZlVG93YXJkID0gZmFsc2U7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMub25IaXR0aW5nID0gZnVuY3Rpb24gKG9iamVjdFRvSGl0LCBjYWxsYmFjaykge1xyXG5cdFx0XHRpZiAoaGl0dGFibGVPYmplY3RzW29iamVjdFRvSGl0LmlkXSkge1xyXG5cdFx0XHRcdHJldHVybiBoaXR0YWJsZU9iamVjdHNbb2JqZWN0VG9IaXQuaWRdLmNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aGl0dGFibGVPYmplY3RzW29iamVjdFRvSGl0LmlkXSA9IHtcclxuXHRcdFx0XHRvYmplY3Q6IG9iamVjdFRvSGl0LFxyXG5cdFx0XHRcdGNhbGxiYWNrczogWyBjYWxsYmFjayBdXHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZGVsZXRlT25OZXh0Q3ljbGUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRoYXQuZGVsZXRlZCA9IHRydWU7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMub2NjdXBpZXNaSW5kZXggPSBmdW5jdGlvbiAoeikge1xyXG5cdFx0XHRyZXR1cm4gekluZGV4ZXNPY2N1cGllZC5pbmRleE9mKHopID49IDA7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuaGl0cyA9IGZ1bmN0aW9uIChvdGhlcikge1xyXG5cdFx0XHRcclxuXHRcdFx0Y29uc3QgcmVjdDF4ID0gb3RoZXIuZ2V0TGVmdEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSk7XHJcblx0XHRcdGNvbnN0IHJlY3QxdyA9IG90aGVyLmdldFJpZ2h0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSAtIHJlY3QxeDtcclxuXHJcblx0XHRcdGNvbnN0IHJlY3QxeSA9IG90aGVyLmdldFRvcEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSk7XHJcblx0XHRcdGNvbnN0IHJlY3QxaCA9IG90aGVyLmdldEJvdHRvbUhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgLSByZWN0MXk7XHJcblxyXG5cdFx0XHQvLyBHZXQgaGl0Ym94IG9mZnNldCB3aGVuIHNwZWNpZmllZFxyXG5cdFx0XHRjb25zdCBpc2FycmF5ID0gQXJyYXkuaXNBcnJheSh0aGF0LmN1cnJlbnRGcmFtZSk7XHJcblx0XHRcdGNvbnN0IGhpdGJveE9mZnNldFggPSAgaXNhcnJheSAmJiB0aGF0LmN1cnJlbnRGcmFtZS5sZW5ndGggPiA2ID8gdGhhdC5jdXJyZW50RnJhbWVbNl0gOiAwO1xyXG5cdFx0XHRjb25zdCBoaXRib3hPZmZzZXRZID0gaXNhcnJheSAmJiB0aGF0LmN1cnJlbnRGcmFtZS5sZW5ndGggPiA3ID8gdGhhdC5jdXJyZW50RnJhbWVbN10gOiAwO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVjdDJ4ID0gdGhhdC5nZXRMZWZ0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSArIGhpdGJveE9mZnNldFg7XHJcblx0XHRcdGNvbnN0IHJlY3QydyA9IHRoYXQuZ2V0UmlnaHRIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pIC0gcmVjdDJ4ICsgaGl0Ym94T2Zmc2V0WDtcclxuXHRcdFx0Y29uc3QgcmVjdDJ5ID0gdGhhdC5nZXRUb3BIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pICsgaGl0Ym94T2Zmc2V0WTtcclxuXHRcdFx0Y29uc3QgcmVjdDJoID0gdGhhdC5nZXRCb3R0b21IaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pIC0gcmVjdDJ5ICsgaGl0Ym94T2Zmc2V0WTtcclxuXHJcblx0XHRcdGlmIChyZWN0MXggPCByZWN0MnggKyByZWN0MncgJiZcclxuXHRcdFx0XHRyZWN0MXggKyByZWN0MXcgPiByZWN0MnggJiZcclxuXHRcdFx0XHRyZWN0MXkgPCByZWN0MnkgKyByZWN0MmggJiZcclxuXHRcdFx0XHRyZWN0MWggKyByZWN0MXkgPiByZWN0MnkpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdFx0Ly8gT3JpZ2luYWwgY29sbGlzaW9uIGRldGVjdGlvbjpcclxuXHRcdFx0LyogdmFyIHZlcnRpY2FsSW50ZXJzZWN0ID0gZmFsc2U7XHJcblx0XHRcdHZhciBob3Jpem9udGFsSW50ZXJzZWN0ID0gZmFsc2U7XHJcblxyXG5cdFx0XHQvLyBUZXN0IHRoYXQgVEhJUyBoYXMgYSBib3R0b20gZWRnZSBpbnNpZGUgb2YgdGhlIG90aGVyIG9iamVjdFxyXG5cdFx0XHRpZiAob3RoZXIuZ2V0VG9wSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSA8PSB0aGF0LmdldEJvdHRvbUhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgJiYgb3RoZXIuZ2V0Qm90dG9tSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSA+PSB0aGF0LmdldEJvdHRvbUhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkpIHtcclxuXHRcdFx0XHR2ZXJ0aWNhbEludGVyc2VjdCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRlc3QgdGhhdCBUSElTIGhhcyBhIHRvcCBlZGdlIGluc2lkZSBvZiB0aGUgb3RoZXIgb2JqZWN0XHJcblx0XHRcdGlmIChvdGhlci5nZXRUb3BIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pIDw9IHRoYXQuZ2V0VG9wSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSAmJiBvdGhlci5nZXRCb3R0b21IaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pID49IHRoYXQuZ2V0VG9wSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSkge1xyXG5cdFx0XHRcdHZlcnRpY2FsSW50ZXJzZWN0ID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVGVzdCB0aGF0IFRISVMgaGFzIGEgcmlnaHQgZWRnZSBpbnNpZGUgb2YgdGhlIG90aGVyIG9iamVjdFxyXG5cdFx0XHRpZiAob3RoZXIuZ2V0TGVmdEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgPD0gdGhhdC5nZXRSaWdodEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgJiYgb3RoZXIuZ2V0UmlnaHRIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pID49IHRoYXQuZ2V0UmlnaHRIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pKSB7XHJcblx0XHRcdFx0aG9yaXpvbnRhbEludGVyc2VjdCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRlc3QgdGhhdCBUSElTIGhhcyBhIGxlZnQgZWRnZSBpbnNpZGUgb2YgdGhlIG90aGVyIG9iamVjdFxyXG5cdFx0XHRpZiAob3RoZXIuZ2V0TGVmdEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgPD0gdGhhdC5nZXRMZWZ0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSAmJiBvdGhlci5nZXRSaWdodEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgPj0gdGhhdC5nZXRMZWZ0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSkge1xyXG5cdFx0XHRcdGhvcml6b250YWxJbnRlcnNlY3QgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gdmVydGljYWxJbnRlcnNlY3QgJiYgaG9yaXpvbnRhbEludGVyc2VjdDsgKi9cclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5pc0Fib3ZlT25DYW52YXMgPSBmdW5jdGlvbiAoY3kpIHtcclxuXHRcdFx0cmV0dXJuICh0aGF0LmNhbnZhc1kgKyB0aGF0LmhlaWdodCkgPCBjeTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5pc0JlbG93T25DYW52YXMgPSBmdW5jdGlvbiAoY3kpIHtcclxuXHRcdFx0cmV0dXJuICh0aGF0LmNhbnZhc1kpID4gY3k7XHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiB0aGF0O1xyXG5cdH1cclxuXHJcblx0U3ByaXRlLmNyZWF0ZU9iamVjdHMgPSBmdW5jdGlvbiBjcmVhdGVPYmplY3RzKHNwcml0ZUluZm9BcnJheSwgb3B0cykge1xyXG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KHNwcml0ZUluZm9BcnJheSkpIHNwcml0ZUluZm9BcnJheSA9IFsgc3ByaXRlSW5mb0FycmF5IF07XHJcblx0XHRvcHRzID0gT2JqZWN0Lm1lcmdlKG9wdHMsIHtcclxuXHRcdFx0cmF0ZU1vZGlmaWVyOiAwLFxyXG5cdFx0XHRkcm9wUmF0ZTogMSxcclxuXHRcdFx0cG9zaXRpb246IFswLCAwXVxyXG5cdFx0fSwgZmFsc2UsIGZhbHNlKTtcclxuXHJcblx0XHR2YXIgQW5pbWF0ZWRTcHJpdGUgPSByZXF1aXJlKCcuL2FuaW1hdGVkU3ByaXRlJyk7XHJcblx0XHRmdW5jdGlvbiBjcmVhdGVPbmUgKHNwcml0ZUluZm8pIHtcclxuXHRcdFx0dmFyIHBvc2l0aW9uID0gb3B0cy5wb3NpdGlvbjtcclxuXHRcdFx0aWYgKE51bWJlci5yYW5kb20oMTAwICsgb3B0cy5yYXRlTW9kaWZpZXIpIDw9IHNwcml0ZUluZm8uZHJvcFJhdGUpIHtcclxuXHRcdFx0XHR2YXIgc3ByaXRlO1xyXG5cdFx0XHRcdGlmIChzcHJpdGVJbmZvLnNwcml0ZS5hbmltYXRlZCkge1xyXG5cdFx0XHRcdFx0c3ByaXRlID0gbmV3IEFuaW1hdGVkU3ByaXRlKHNwcml0ZUluZm8uc3ByaXRlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0c3ByaXRlID0gbmV3IFNwcml0ZShzcHJpdGVJbmZvLnNwcml0ZSk7XHJcblx0XHRcdFx0fVx0XHJcblxyXG5cdFx0XHRcdHNwcml0ZS5zZXRTcGVlZCgwKTtcclxuXHJcblx0XHRcdFx0aWYgKE9iamVjdC5pc0Z1bmN0aW9uKHBvc2l0aW9uKSkge1xyXG5cdFx0XHRcdFx0cG9zaXRpb24gPSBwb3NpdGlvbigpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0c3ByaXRlLnNldE1hcFBvc2l0aW9uKHBvc2l0aW9uWzBdLCBwb3NpdGlvblsxXSk7XHJcblxyXG5cdFx0XHRcdGlmIChzcHJpdGVJbmZvLnNwcml0ZS5oaXRCZWhhdmlvdXIgJiYgc3ByaXRlSW5mby5zcHJpdGUuaGl0QmVoYXZpb3VyLnBsYXllciAmJiBvcHRzLnBsYXllcikge1xyXG5cdFx0XHRcdFx0c3ByaXRlLm9uSGl0dGluZyhvcHRzLnBsYXllciwgc3ByaXRlSW5mby5zcHJpdGUuaGl0QmVoYXZpb3VyLnBsYXllcik7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gc3ByaXRlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIG9iamVjdHMgPSBzcHJpdGVJbmZvQXJyYXkubWFwKGNyZWF0ZU9uZSkucmVtb3ZlKHVuZGVmaW5lZCk7XHJcblxyXG5cdFx0cmV0dXJuIG9iamVjdHM7XHJcblx0fTtcclxuXHJcblx0Z2xvYmFsLnNwcml0ZSA9IFNwcml0ZTtcclxufSkoIHRoaXMgKTtcclxuXHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IHRoaXMuc3ByaXRlO1xyXG59IiwiKGZ1bmN0aW9uIChnbG9iYWwpIHtcclxuXHRmdW5jdGlvbiBTcHJpdGVBcnJheSgpIHtcclxuXHRcdHRoaXMucHVzaEhhbmRsZXJzID0gW107XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fVxyXG5cclxuXHRTcHJpdGVBcnJheS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEFycmF5LnByb3RvdHlwZSk7XHJcblxyXG5cdFNwcml0ZUFycmF5LnByb3RvdHlwZS5vblB1c2ggPSBmdW5jdGlvbihmLCByZXRyb2FjdGl2ZSkge1xyXG5cdFx0dGhpcy5wdXNoSGFuZGxlcnMucHVzaChmKTtcclxuXHJcblx0XHRpZiAocmV0cm9hY3RpdmUpIHtcclxuXHRcdFx0dGhpcy5lYWNoKGYpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdFNwcml0ZUFycmF5LnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24ob2JqKSB7XHJcblx0XHRBcnJheS5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsIG9iaik7XHJcblx0XHR0aGlzLnB1c2hIYW5kbGVycy5lYWNoKGZ1bmN0aW9uKGhhbmRsZXIpIHtcclxuXHRcdFx0aGFuZGxlcihvYmopO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0U3ByaXRlQXJyYXkucHJvdG90eXBlLmN1bGwgPSBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMuZWFjaChmdW5jdGlvbiAob2JqLCBpKSB7XHJcblx0XHRcdGlmIChvYmouZGVsZXRlZCkge1xyXG5cdFx0XHRcdHJldHVybiAoZGVsZXRlIHRoaXNbaV0pO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHRnbG9iYWwuc3ByaXRlQXJyYXkgPSBTcHJpdGVBcnJheTtcclxufSkodGhpcyk7XHJcblxyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSB0aGlzLnNwcml0ZUFycmF5O1xyXG59IiwiLy8gR2xvYmFsIGRlcGVuZGVuY2llcyB3aGljaCByZXR1cm4gbm8gbW9kdWxlc1xyXG5yZXF1aXJlKCcuL2xpYi9jYW52YXNSZW5kZXJpbmdDb250ZXh0MkRFeHRlbnNpb25zJyk7XHJcbnJlcXVpcmUoJy4vbGliL2V4dGVuZGVycycpO1xyXG5yZXF1aXJlKCcuL2xpYi9wbHVnaW5zJyk7XHJcblxyXG4vLyBFeHRlcm5hbCBkZXBlbmRlbmNpZXNcclxudmFyIE1vdXNldHJhcCA9IHJlcXVpcmUoJ2JyLW1vdXNldHJhcCcpO1xyXG5cclxuLy8gTWV0aG9kIG1vZHVsZXNcclxudmFyIGlzTW9iaWxlRGV2aWNlID0gcmVxdWlyZSgnLi9saWIvaXNNb2JpbGVEZXZpY2UnKTtcclxuXHJcbi8vIEdhbWUgT2JqZWN0c1xyXG52YXIgU3ByaXRlQXJyYXkgPSByZXF1aXJlKCcuL2xpYi9zcHJpdGVBcnJheScpO1xyXG52YXIgTW9uc3RlciA9IHJlcXVpcmUoJy4vbGliL21vbnN0ZXInKTtcclxudmFyIEFuaW1hdGVkU3ByaXRlID0gcmVxdWlyZSgnLi9saWIvYW5pbWF0ZWRTcHJpdGUnKTtcclxudmFyIFNwcml0ZSA9IHJlcXVpcmUoJy4vbGliL3Nwcml0ZScpO1xyXG52YXIgUGxheWVyID0gcmVxdWlyZSgnLi9saWIvcGxheWVyJyk7XHJcbnZhciBHYW1lSHVkID0gcmVxdWlyZSgnLi9saWIvZ2FtZUh1ZCcpO1xyXG52YXIgR2FtZSA9IHJlcXVpcmUoJy4vbGliL2dhbWUnKTtcclxuXHJcbi8vIExvY2FsIHZhcmlhYmxlcyBmb3Igc3RhcnRpbmcgdGhlIGdhbWVcclxudmFyIG1haW5DYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZS1jYW52YXMnKTtcclxudmFyIGRDb250ZXh0ID0gbWFpbkNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxudmFyIGltYWdlU291cmNlcyA9IFsgJ2Fzc2V0cy9jYXJ0LXNwcml0ZXMucG5nJywgJ2Fzc2V0cy9zdGFydHNpZ24tc3ByaXRlLnBuZycsICdhc3NldHMvb2lsc2xpY2stc3ByaXRlLnBuZycsIFxyXG5cdCdhc3NldHMvdG9rZW4tc3ByaXRlcy5wbmcnLCAnYXNzZXRzL21pbGtzaGFrZS1zcHJpdGUucG5nJywgJ2Fzc2V0cy9tYWxvcmQtc3ByaXRlcy5wbmcnLFxyXG5cdCdhc3NldHMvaGF0Z3V5LXNwcml0ZXMucG5nJywgJ2Fzc2V0cy9waWxvdC1zcHJpdGVzLnBuZycsICdhc3NldHMvcm9tYW5zb2xkaWVyLXNwcml0ZXMucG5nJywgJ2Fzc2V0cy9za2VsZXRvbi1zcHJpdGVzLnBuZycsXHJcblx0J2Fzc2V0cy90cmFmZmljLWNvbmUtbGFyZ2UucG5nJywgJ2Fzc2V0cy90cmFmZmljLWNvbmUtc21hbGwucG5nJywgJ2Fzc2V0cy9nYXJiYWdlLWNhbi5wbmcnLCAnYXNzZXRzL3JhbXAtc3ByaXRlLnBuZycgXTtcclxuXHJcbnZhciBwbGF5U291bmQ7XHJcbnZhciBzb3VuZHMgPSB7ICd0cmFjazEnOiAnYXNzZXRzL211c2ljL3RyYWNrMS5vZ2cnLFxyXG5cdFx0XHQgICAndHJhY2syJzogJ2Fzc2V0cy9tdXNpYy90cmFjazIub2dnJyxcclxuXHRcdFx0ICAgJ3RyYWNrMyc6ICdhc3NldHMvbXVzaWMvdHJhY2szLm9nZycsXHJcblx0XHRcdCAgICdnYW1lT3Zlcic6ICdhc3NldHMvbXVzaWMvZ2FtZW92ZXIub2dnJyB9O1xyXG52YXIgY3VycmVudFRyYWNrO1xyXG52YXIgcGxheWluZ1RyYWNrTnVtYmVyID0gMTtcclxuXHJcbnZhciBnbG9iYWwgPSB0aGlzO1xyXG52YXIgZ2FtZUh1ZENvbnRyb2xzID0gJ1VzZSB0aGUgbW91c2Ugb3IgV0FTRCB0byBjb250cm9sIHRoZSBjYXJ0JztcclxuaWYgKGlzTW9iaWxlRGV2aWNlKCkpIGdhbWVIdWRDb250cm9scyA9ICdUYXAgb3IgZHJhZyBvbiB0aGUgcm9hZCB0byBjb250cm9sIHRoZSBjYXJ0JztcclxudmFyIHNwcml0ZXMgPSByZXF1aXJlKCcuL3Nwcml0ZUluZm8nKTtcclxuXHJcbnZhciBwaXhlbHNQZXJNZXRyZSA9IDE4O1xyXG52YXIgbW9uc3RlckRpc3RhbmNlVGhyZXNob2xkID0gMjAwMDtcclxuY29uc3QgdG90YWxMaXZlcyA9IDU7XHJcbnZhciBsaXZlc0xlZnQgPSB0b3RhbExpdmVzO1xyXG52YXIgaGlnaFNjb3JlID0gMDtcclxuXHJcbmNvbnN0IGdhbWVJbmZvID0ge1xyXG5cdGRpc3RhbmNlOiAwLFxyXG5cdG1vbmV5OiAwLFxyXG5cdHRva2VuczogMCxcclxuXHRwb2ludHM6IDAsXHJcblx0Y2FuczogMCxcclxuXHRsZXZlbEJvb3N0OiAwLFxyXG5cdGF3YWtlOiAxMDAsXHJcblxyXG5cdGdvZDogZmFsc2UsXHJcblxyXG5cdHJlc2V0KCkge1xyXG5cdFx0ZGlzdGFuY2UgPSAwO1xyXG5cdFx0bW9uZXkgPSAwO1xyXG5cdFx0dG9rZW5zID0gMDtcclxuXHRcdHBvaW50cyA9IDA7XHJcblx0XHRjYW5zID0gMDtcclxuXHRcdGF3YWtlID0gMDtcclxuXHR9XHJcbn07XHJcblxyXG52YXIgZHJvcFJhdGVzID0geyB0cmFmZmljQ29uZUxhcmdlOiAxLCB0cmFmZmljQ29uZVNtYWxsOiAxLCBnYXJiYWdlQ2FuOiAxLCBqdW1wOiAxLCBvaWxTbGljazogMSwgXHJcblx0XHRcdFx0ICB0b2tlbjogMywgbWlsa3NoYWtlOiAwLjAwMDF9O1xyXG5pZiAobG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2hpZ2hTY29yZScpKSBoaWdoU2NvcmUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnaGlnaFNjb3JlJyk7XHJcblxyXG5mdW5jdGlvbiBsb2FkSW1hZ2VzIChzb3VyY2VzLCBuZXh0KSB7XHJcblx0dmFyIGxvYWRlZCA9IDA7XHJcblx0dmFyIGltYWdlcyA9IHt9O1xyXG5cclxuXHRmdW5jdGlvbiBmaW5pc2ggKCkge1xyXG5cdFx0bG9hZGVkICs9IDE7XHJcblx0XHRpZiAobG9hZGVkID09PSBzb3VyY2VzLmxlbmd0aCkge1xyXG5cdFx0XHRuZXh0KGltYWdlcyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzb3VyY2VzLmVhY2goZnVuY3Rpb24gKHNyYykge1xyXG5cdFx0dmFyIGltID0gbmV3IEltYWdlKCk7XHJcblx0XHRpbS5vbmxvYWQgPSBmaW5pc2g7XHJcblx0XHRpbS5zcmMgPSBzcmM7XHJcblx0XHRkQ29udGV4dC5zdG9yZUxvYWRlZEltYWdlKHNyYywgaW0pO1xyXG5cdH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBfY2hlY2tBdWRpb1N0YXRlKHNvdW5kKSB7XHJcblx0LyogaWYgKHNvdW5kc1tzb3VuZF0uc3RhdHVzID09PSAnbG9hZGluZycgJiYgc291bmRzW3NvdW5kXS5yZWFkeVN0YXRlID09PSA0KSB7XHJcblx0XHRhc3NldExvYWRlZC5jYWxsKHRoaXMsICdzb3VuZHMnLCBzb3VuZCk7XHJcblx0fSAqL1xyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkU291bmRzICgpIHtcclxuXHRmb3IgKHZhciBzb3VuZCBpbiBzb3VuZHMpIHtcclxuXHRcdGlmIChzb3VuZHMuaGFzT3duUHJvcGVydHkoc291bmQpKSB7XHJcblx0XHRcdHNyYyA9IHNvdW5kc1tzb3VuZF07XHJcblx0XHRcdC8vIGNyZWF0ZSBhIGNsb3N1cmUgZm9yIGV2ZW50IGJpbmRpbmdcclxuXHRcdFx0KGZ1bmN0aW9uKHNvdW5kKSB7XHJcblx0XHRcdFx0c291bmRzW3NvdW5kXSA9IG5ldyBBdWRpbygpO1xyXG5cdFx0XHRcdHNvdW5kc1tzb3VuZF0uc3RhdHVzID0gJ2xvYWRpbmcnO1xyXG5cdFx0XHRcdHNvdW5kc1tzb3VuZF0ubmFtZSA9IHNvdW5kO1xyXG5cdFx0XHRcdHNvdW5kc1tzb3VuZF0uYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheScsIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0X2NoZWNrQXVkaW9TdGF0ZS5jYWxsKHNvdW5kKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRzb3VuZHNbc291bmRdLnNyYyA9IHNyYztcclxuXHRcdFx0XHRzb3VuZHNbc291bmRdLnByZWxvYWQgPSAnYXV0byc7XHJcblx0XHRcdFx0c291bmRzW3NvdW5kXS5sb2FkKCk7XHJcblx0XHRcdH0pKHNvdW5kKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vbnN0ZXJIaXRzUGxheWVyQmVoYXZpb3VyKG1vbnN0ZXIsIHBsYXllcikge1xyXG5cdHBsYXllci5pc0VhdGVuQnkobW9uc3RlciwgZnVuY3Rpb24gKCkge1xyXG5cdFx0bW9uc3Rlci5pc0Z1bGwgPSB0cnVlO1xyXG5cdFx0bW9uc3Rlci5pc0VhdGluZyA9IGZhbHNlO1xyXG5cdFx0cGxheWVyLmlzQmVpbmdFYXRlbiA9IGZhbHNlO1xyXG5cdFx0bW9uc3Rlci5zZXRTcGVlZChwbGF5ZXIuZ2V0U3BlZWQoKSk7XHJcblx0XHRtb25zdGVyLnN0b3BGb2xsb3dpbmcoKTtcclxuXHRcdHZhciByYW5kb21Qb3NpdGlvbkFib3ZlID0gZENvbnRleHQuZ2V0UmFuZG9tTWFwUG9zaXRpb25BYm92ZVZpZXdwb3J0KCk7XHJcblx0XHRtb25zdGVyLnNldE1hcFBvc2l0aW9uVGFyZ2V0KHJhbmRvbVBvc2l0aW9uQWJvdmVbMF0sIHJhbmRvbVBvc2l0aW9uQWJvdmVbMV0pO1xyXG5cdH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwbGF5TXVzaWNUcmFjayhuZXh0VHJhY2spIHtcclxuXHRpZiAobmV4dFRyYWNrID09PSBwbGF5aW5nVHJhY2tOdW1iZXIpIHJldHVybjtcclxuXHJcblx0Y3VycmVudFRyYWNrLm11dGVkID0gdHJ1ZTtcclxuXHRwbGF5aW5nVHJhY2tOdW1iZXIgPSBuZXh0VHJhY2s7XHJcblx0aWYgKG5leHRUcmFjayA+IHNvdW5kcy5sZW5ndGggLSAxKVxyXG5cdFx0cGxheWluZ1RyYWNrTnVtYmVyID0gMTtcclxuXHRjdXJyZW50VHJhY2sgPSBzb3VuZHNbXCJ0cmFja1wiICsgbmV4dFRyYWNrXTtcclxuXHRjdXJyZW50VHJhY2suY3VycmVudFRpbWUgPSAwO1xyXG5cdGN1cnJlbnRUcmFjay5sb29wID0gdHJ1ZTtcclxuXHJcblx0aWYgKHBsYXlTb3VuZCkge1xyXG5cdFx0Y3VycmVudFRyYWNrLnBsYXkoKTtcclxuXHRcdGN1cnJlbnRUcmFjay5tdXRlZCA9IGZhbHNlO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gc3RhcnROZXZlckVuZGluZ0dhbWUgKGltYWdlcykge1xyXG5cdHZhciBwbGF5ZXI7XHJcblx0dmFyIHN0YXJ0U2lnbjtcclxuXHR2YXIgZ2FtZUh1ZDtcclxuXHR2YXIgZ2FtZTtcclxuXHJcblx0ZnVuY3Rpb24gc2hvd01haW5NZW51KGltYWdlcykge1xyXG5cdFx0Zm9yICh2YXIgc291bmQgaW4gc291bmRzKSB7XHJcblx0XHRcdGlmIChzb3VuZHMuaGFzT3duUHJvcGVydHkoc291bmQpKSB7XHJcblx0XHRcdFx0c291bmRzW3NvdW5kXS5tdXRlZCA9IHRydWU7XHJcblx0XHRcdFx0Y3VycmVudFRyYWNrLm11dGVkID0gIXBsYXlTb3VuZDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0bWFpbkNhbnZhcy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdFx0JCgnI21haW4nKS5zaG93KCk7XHJcblx0XHQkKCcjbWVudScpLmFkZENsYXNzKCdtYWluJyk7XHJcblx0XHQkKCcuc291bmQnKS5zaG93KCk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB0b2dnbGVHb2RNb2RlKCkge1xyXG5cdFx0Z2FtZUluZm8uZ29kID0gIWdhbWVJbmZvLmdvZDtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlc2V0R2FtZSAoKSB7XHJcblx0XHRsaXZlc0xlZnQgPSA1O1xyXG5cdFx0aGlnaFNjb3JlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2hpZ2hTY29yZScpO1xyXG5cdFx0Z2FtZS5yZXNldCgpO1xyXG5cdFx0Z2FtZS5hZGRTdGF0aWNPYmplY3Qoc3RhcnRTaWduKTtcclxuXHRcdGdhbWVJbmZvLnJlc2V0KCk7XHJcblx0XHRwbGF5TXVzaWNUcmFjaygxKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGRldGVjdEVuZCAoKSB7XHJcblx0XHRpZiAoIWdhbWUuaXNQYXVzZWQoKSkge1xyXG5cdFx0XHRoaWdoU2NvcmUgPSBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnaGlnaFNjb3JlJywgZ2FtZUluZm8uZGlzdGFuY2UpO1xyXG5cdFx0XHR1cGRhdGVIdWQoJ0dhbWUgb3ZlciEgSGl0IHNwYWNlIHRvIHJlc3RhcnQuJyk7XHJcblx0XHRcdGdhbWUucGF1c2UoKTtcclxuXHRcdFx0Z2FtZS5jeWNsZSgpO1xyXG5cclxuXHRcdFx0cGxheWluZ1RyYWNrTnVtYmVyID0gMDtcclxuXHRcdFx0Y3VycmVudFRyYWNrLm11dGVkID0gdHJ1ZTtcclxuXHRcdFx0Y3VycmVudFRyYWNrID0gc291bmRzLmdhbWVPdmVyO1xyXG5cdFx0XHRjdXJyZW50VHJhY2suY3VycmVudFRpbWUgPSAwO1xyXG5cdFx0XHRjdXJyZW50VHJhY2subG9vcCA9IHRydWU7XHJcblx0XHRcdGlmIChwbGF5U291bmQpIHtcclxuXHRcdFx0XHRjdXJyZW50VHJhY2sucGxheSgpO1xyXG5cdFx0XHRcdGN1cnJlbnRUcmFjay5tdXRlZCA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB1cGRhdGVIdWQobWVzc2FnZSkge1xyXG5cdFx0aWYgKCFtZXNzYWdlKVxyXG5cdFx0XHRtZXNzYWdlID0gJyc7XHJcblxyXG5cdFx0aWYgKCFnYW1lSHVkKSB7XHJcblx0XHRcdGdhbWVIdWQgPSBuZXcgR2FtZUh1ZCh7XHJcblx0XHRcdFx0aW5pdGlhbExpbmVzIDogW1xyXG5cdFx0XHRcdFx0J0Nhc2ggJDAnLnBhZEVuZCgyMikgKyAnTGV2ZWwgMScsXHJcblx0XHRcdFx0XHQnUG9pbnRzIDAnLnBhZEVuZCgyMikgKyAnTGlmZSAwJScsXHJcblx0XHRcdFx0XHQnVG9rZW5zIDAnLnBhZEVuZCgyMikgKyAnQXdha2UgMTAwLzEwMCcsXHJcblx0XHRcdFx0XHQnRGlzdGFuY2UgMG0nLnBhZEVuZCgyMikgKyAnU3BlZWQgMCcsXHJcblx0XHRcdFx0XHRnYW1lSW5mby5nb2QgPyAnR29kIE1vZGUnIDogJydcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdHBvc2l0aW9uOiB7XHJcblx0XHRcdFx0XHR0b3A6IDE1LFxyXG5cdFx0XHRcdFx0bGVmdDogMTE1XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBsZXZlbCA9IGdhbWVJbmZvLmRpc3RhbmNlIDwgMTAwID8gMSA6IE1hdGguZmxvb3IoZ2FtZUluZm8uZGlzdGFuY2UgLyAxMDApICsgZ2FtZUluZm8ubGV2ZWxCb29zdDtcclxuXHRcdGdhbWVIdWQuc2V0TGluZXMoW1xyXG5cdFx0XHQoJ0Nhc2ggJCcgKyBnYW1lSW5mby5tb25leSkucGFkRW5kKDIyKSArICdMZXZlbCAnICsgbGV2ZWwsXHJcblx0XHRcdCgnUG9pbnRzICcgKyBnYW1lSW5mby5tb25leSkucGFkRW5kKDIyKSArICdMaWZlICcgKyBsaXZlc0xlZnQgLyB0b3RhbExpdmVzICogMTAwICsgJyUnLFxyXG5cdFx0XHQoJ1Rva2VucyAnICsgZ2FtZUluZm8udG9rZW5zKS5wYWRFbmQoMjIpICsgJ0F3YWtlICcgKyBnYW1lSW5mby5hd2FrZSArICcvMTAwJyxcclxuXHRcdFx0KCdEaXN0YW5jZSAnICsgZ2FtZUluZm8uZGlzdGFuY2UgKyAnbScpLnBhZEVuZCgyMikgKyAnU3BlZWQgJyArIHBsYXllci5nZXRTcGVlZCgpLFxyXG5cdFx0XHQoZ2FtZUluZm8uZ29kID8gJ0dvZCBNb2RlJyA6ICcnKS5wYWRFbmQoMjIpICsgbWVzc2FnZVxyXG5cdFx0XSk7XHJcblxyXG5cdFx0cGxheU11c2ljVHJhY2soTWF0aC5mbG9vcihnYW1lSW5mby5kaXN0YW5jZSAvIDEwMDAgJSAzKSArIDEpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcmFuZG9tbHlTcGF3bk5QQyhzcGF3bkZ1bmN0aW9uLCBkcm9wUmF0ZSkge1xyXG5cdFx0dmFyIHJhdGVNb2RpZmllciA9IE1hdGgubWF4KDgwMCAtIG1haW5DYW52YXMud2lkdGgsIDApO1xyXG5cdFx0aWYgKE51bWJlci5yYW5kb20oMTAwMCArIHJhdGVNb2RpZmllcikgPD0gZHJvcFJhdGUpIHtcclxuXHRcdFx0c3Bhd25GdW5jdGlvbigpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc3Bhd25Nb25zdGVyICgpIHtcclxuXHRcdHZhciBuZXdNb25zdGVyID0gbmV3IE1vbnN0ZXIoc3ByaXRlcy5tb25zdGVyKTtcclxuXHRcdHZhciByYW5kb21Qb3NpdGlvbiA9IGRDb250ZXh0LmdldFJhbmRvbU1hcFBvc2l0aW9uQWJvdmVWaWV3cG9ydCgpO1xyXG5cdFx0bmV3TW9uc3Rlci5zZXRNYXBQb3NpdGlvbihyYW5kb21Qb3NpdGlvblswXSwgcmFuZG9tUG9zaXRpb25bMV0pO1xyXG5cdFx0bmV3TW9uc3Rlci5mb2xsb3cocGxheWVyKTtcclxuXHRcdG5ld01vbnN0ZXIuc2V0U3BlZWQocGxheWVyLmdldFN0YW5kYXJkU3BlZWQoKSk7XHJcblx0XHRuZXdNb25zdGVyLm9uSGl0dGluZyhwbGF5ZXIsIG1vbnN0ZXJIaXRzUGxheWVyQmVoYXZpb3VyKTtcclxuXHJcblx0XHRnYW1lLmFkZE1vdmluZ09iamVjdChuZXdNb25zdGVyLCAnbW9uc3RlcicpO1xyXG5cdH1cclxuXHJcblx0JCgnLnBsYXllcjEnKS5jbGljayhmdW5jdGlvbigpIHtcclxuXHRcdHNwcml0ZXMucGxheWVyID0gc3ByaXRlcy5wbGF5ZXIxO1xyXG5cdFx0c3RhcnRHYW1lKCk7XHJcblx0fSk7XHJcblx0JCgnLnBsYXllcjInKS5jbGljayhmdW5jdGlvbigpIHtcclxuXHRcdHNwcml0ZXMucGxheWVyID0gc3ByaXRlcy5wbGF5ZXIyO1xyXG5cdFx0c3RhcnRHYW1lKCk7XHJcblx0fSk7XHJcblx0JCgnLnBsYXllcjMnKS5jbGljayhmdW5jdGlvbigpIHtcclxuXHRcdHNwcml0ZXMucGxheWVyID0gc3ByaXRlcy5wbGF5ZXIzO1xyXG5cdFx0c3RhcnRHYW1lKCk7XHJcblx0fSk7XHJcblx0JCgnLnBsYXllcjQnKS5jbGljayhmdW5jdGlvbigpIHtcclxuXHRcdHNwcml0ZXMucGxheWVyID0gc3ByaXRlcy5wbGF5ZXI0O1xyXG5cdFx0c3RhcnRHYW1lKCk7XHJcblx0fSk7XHJcblxyXG5cdGZ1bmN0aW9uIHN0YXJ0R2FtZSgpe1xyXG5cdFx0JCgnI21lbnUnKS5oaWRlKCk7XHJcblx0XHRtYWluQ2FudmFzLnN0eWxlLmRpc3BsYXkgPSAnJztcclxuXHRcdFxyXG5cdFx0cGxheWVyID0gbmV3IFBsYXllcihzcHJpdGVzLnBsYXllcik7XHJcblx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb24oMCwgMCk7XHJcblx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb25UYXJnZXQoMCwgLTEwKTtcclxuXHJcblx0XHRwbGF5ZXIuc2V0SGl0T2JzdGFjbGVDYihmdW5jdGlvbigpIHtcclxuXHRcdFx0aWYgKGdhbWVJbmZvLmdvZClcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdGxpdmVzTGVmdCAtPSAxO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cGxheWVyLnNldENvbGxlY3RJdGVtQ2IoZnVuY3Rpb24oaXRlbSkge1xyXG5cdFx0XHRzd2l0Y2ggKGl0ZW0uZGF0YS5uYW1lKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2FzZSAndG9rZW4nOlxyXG5cdFx0XHRcdFx0Z2FtZUluZm8udG9rZW5zICs9IGl0ZW0uZGF0YS5wb2ludFZhbHVlc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBpdGVtLmRhdGEucG9pbnRWYWx1ZXMubGVuZ3RoKV07XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdtaWxrc2hha2UnOlxyXG5cdFx0XHRcdFx0aWYgKGxpdmVzTGVmdCA8IHRvdGFsTGl2ZXMpIHtcclxuXHRcdFx0XHRcdFx0bGl2ZXNMZWZ0ICs9IDE7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRnYW1lSW5mby5sZXZlbEJvb3N0ICs9IDE7XHJcblxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGdhbWUgPSBuZXcgR2FtZShtYWluQ2FudmFzLCBwbGF5ZXIpO1xyXG5cclxuXHRcdHN0YXJ0U2lnbiA9IG5ldyBTcHJpdGUoc3ByaXRlcy5zaWduU3RhcnQpO1xyXG5cdFx0Z2FtZS5hZGRTdGF0aWNPYmplY3Qoc3RhcnRTaWduKTtcclxuXHRcdHN0YXJ0U2lnbi5zZXRNYXBQb3NpdGlvbigtNTAsIDApO1xyXG5cdFx0ZENvbnRleHQuZm9sbG93U3ByaXRlKHBsYXllcik7XHJcblx0XHRcclxuXHRcdHVwZGF0ZUh1ZCgpO1xyXG5cclxuXHRcdGdhbWUuYmVmb3JlQ3ljbGUoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR2YXIgbmV3T2JqZWN0cyA9IFtdO1xyXG5cdFx0XHRpZiAocGxheWVyLmlzTW92aW5nKSB7XHJcblx0XHRcdFx0bmV3T2JqZWN0cyA9IFNwcml0ZS5jcmVhdGVPYmplY3RzKFtcclxuXHRcdFx0XHRcdHsgc3ByaXRlOiBzcHJpdGVzLmp1bXAsIGRyb3BSYXRlOiBkcm9wUmF0ZXMuanVtcCB9LFxyXG5cdFx0XHRcdFx0eyBzcHJpdGU6IHNwcml0ZXMub2lsU2xpY2ssIGRyb3BSYXRlOiBkcm9wUmF0ZXMub2lsU2xpY2sgfSxcclxuXHRcdFx0XHRcdHsgc3ByaXRlOiBzcHJpdGVzLnRyYWZmaWNDb25lTGFyZ2UsIGRyb3BSYXRlOiBkcm9wUmF0ZXMudHJhZmZpY0NvbmVMYXJnZSB9LFxyXG5cdFx0XHRcdFx0eyBzcHJpdGU6IHNwcml0ZXMudHJhZmZpY0NvbmVTbWFsbCwgZHJvcFJhdGU6IGRyb3BSYXRlcy50cmFmZmljQ29uZVNtYWxsIH0sXHJcblx0XHRcdFx0XHR7IHNwcml0ZTogc3ByaXRlcy5nYXJiYWdlQ2FuLCBkcm9wUmF0ZTogZHJvcFJhdGVzLmdhcmJhZ2VDYW4gfSxcclxuXHRcdFx0XHRcdHsgc3ByaXRlOiBzcHJpdGVzLnRva2VuLCBkcm9wUmF0ZTogZHJvcFJhdGVzLnRva2VuIH0sXHJcblx0XHRcdFx0XHR7IHNwcml0ZTogc3ByaXRlcy5taWxrc2hha2UsIGRyb3BSYXRlOiBkcm9wUmF0ZXMubWlsa3NoYWtlIH1cclxuXHRcdFx0XHRdLCB7XHJcblx0XHRcdFx0XHRyYXRlTW9kaWZpZXI6IE1hdGgubWF4KDgwMCAtIG1haW5DYW52YXMud2lkdGgsIDApLFxyXG5cdFx0XHRcdFx0cG9zaXRpb246IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGRDb250ZXh0LmdldFJhbmRvbU1hcFBvc2l0aW9uQmVsb3dWaWV3cG9ydCgpO1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHBsYXllcjogcGxheWVyXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCFnYW1lLmlzUGF1c2VkKCkpIHtcclxuXHRcdFx0XHRnYW1lLmFkZFN0YXRpY09iamVjdHMobmV3T2JqZWN0cyk7XHJcblxyXG5cdFx0XHRcdGdhbWVJbmZvLmRpc3RhbmNlID0gcGFyc2VGbG9hdChwbGF5ZXIuZ2V0UGl4ZWxzVHJhdmVsbGVkRG93bk1vdW50YWluKCkgLyBwaXhlbHNQZXJNZXRyZSkudG9GaXhlZCgxKTtcclxuXHJcblx0XHRcdFx0aWYgKGdhbWVJbmZvLmRpc3RhbmNlID4gbW9uc3RlckRpc3RhbmNlVGhyZXNob2xkKSB7XHJcblx0XHRcdFx0XHRyYW5kb21seVNwYXduTlBDKHNwYXduTW9uc3RlciwgMC4wMDEpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKGdhbWVJbmZvLmRpc3RhbmNlKVxyXG5cclxuXHRcdFx0XHR1cGRhdGVIdWQoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Z2FtZS5hZnRlckN5Y2xlKGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRpZiAobGl2ZXNMZWZ0ID09PSAwKSB7XHJcblx0XHRcdFx0ZGV0ZWN0RW5kKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGdhbWUuYWRkVUlFbGVtZW50KGdhbWVIdWQpO1xyXG5cdFx0XHJcblx0XHQkKG1haW5DYW52YXMpXHJcblx0XHRcdC5tb3VzZW1vdmUoZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0XHRnYW1lLnNldE1vdXNlWChlLnBhZ2VYKTtcclxuXHRcdFx0XHRnYW1lLnNldE1vdXNlWShlLnBhZ2VZKTtcclxuXHRcdFx0XHRwbGF5ZXIucmVzZXREaXJlY3Rpb24oKTtcclxuXHRcdFx0XHRwbGF5ZXIuc3RhcnRNb3ZpbmdJZlBvc3NpYmxlKCk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5iaW5kKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XHJcblx0XHRcdFx0Z2FtZS5zZXRNb3VzZVgoZS5wYWdlWCk7XHJcblx0XHRcdFx0Z2FtZS5zZXRNb3VzZVkoZS5wYWdlWSk7XHJcblx0XHRcdFx0cGxheWVyLnJlc2V0RGlyZWN0aW9uKCk7XHJcblx0XHRcdFx0cGxheWVyLnN0YXJ0TW92aW5nSWZQb3NzaWJsZSgpO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuZm9jdXMoKTsgLy8gU28gd2UgY2FuIGxpc3RlbiB0byBldmVudHMgaW1tZWRpYXRlbHlcclxuXHJcblx0XHRNb3VzZXRyYXAuYmluZCgnZicsIHBsYXllci5zcGVlZEJvb3N0KTtcclxuXHRcdE1vdXNldHJhcC5iaW5kKCd0JywgcGxheWVyLmF0dGVtcHRUcmljayk7XHJcblx0XHRNb3VzZXRyYXAuYmluZChbJ3cnLCAndXAnXSwgZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRwbGF5ZXIuc3RvcCgpO1xyXG5cdFx0fSk7XHJcblx0XHRNb3VzZXRyYXAuYmluZChbJ2EnLCAnbGVmdCddLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmIChwbGF5ZXIuZGlyZWN0aW9uID09PSAyNzApIHtcclxuXHRcdFx0XHRwbGF5ZXIuc3RlcFdlc3QoKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRwbGF5ZXIudHVybldlc3QoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHRNb3VzZXRyYXAuYmluZChbJ3MnLCAnZG93biddLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHBsYXllci5zZXREaXJlY3Rpb24oMTgwKTtcclxuXHRcdFx0cGxheWVyLnN0YXJ0TW92aW5nSWZQb3NzaWJsZSgpO1xyXG5cdFx0fSk7XHJcblx0XHRNb3VzZXRyYXAuYmluZChbJ2QnLCAncmlnaHQnXSwgZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRpZiAocGxheWVyLmRpcmVjdGlvbiA9PT0gOTApIHtcclxuXHRcdFx0XHRwbGF5ZXIuc3RlcEVhc3QoKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRwbGF5ZXIudHVybkVhc3QoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHRNb3VzZXRyYXAuYmluZCgnbScsIHNwYXduTW9uc3Rlcik7XHJcblx0XHRNb3VzZXRyYXAuYmluZCgnc3BhY2UnLCByZXNldEdhbWUpO1xyXG5cdFx0TW91c2V0cmFwLmJpbmQoJ2cnLCB0b2dnbGVHb2RNb2RlKTtcclxuXHRcdE1vdXNldHJhcC5iaW5kKCdoJywgZ2FtZS50b2dnbGVIaXRCb3hlcyk7XHJcblxyXG5cdFx0dmFyIGhhbW1lcnRpbWUgPSBuZXcgSGFtbWVyKG1haW5DYW52YXMpO1xyXG5cdFx0aGFtbWVydGltZS5vbigncHJlc3MnLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdGdhbWUuc2V0TW91c2VYKGUuY2VudGVyLngpO1xyXG5cdFx0XHRnYW1lLnNldE1vdXNlWShlLmNlbnRlci55KTtcclxuXHRcdH0pO1xyXG5cdFx0aGFtbWVydGltZS5vbigndGFwJywgZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0Z2FtZS5zZXRNb3VzZVgoZS5jZW50ZXIueCk7XHJcblx0XHRcdGdhbWUuc2V0TW91c2VZKGUuY2VudGVyLnkpO1xyXG5cdFx0fSk7XHJcblx0XHRoYW1tZXJ0aW1lLm9uKCdwYW4nLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRnYW1lLnNldE1vdXNlWChlLmNlbnRlci54KTtcclxuXHRcdFx0Z2FtZS5zZXRNb3VzZVkoZS5jZW50ZXIueSk7XHJcblx0XHRcdHBsYXllci5yZXNldERpcmVjdGlvbigpO1xyXG5cdFx0XHRwbGF5ZXIuc3RhcnRNb3ZpbmdJZlBvc3NpYmxlKCk7XHJcblx0XHR9KVxyXG5cdFx0aGFtbWVydGltZS5vbignZG91YmxldGFwJywgZnVuY3Rpb24gKGUpIHtcclxuXHRcdFx0cGxheWVyLnNwZWVkQm9vc3QoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHBsYXllci5pc01vdmluZyA9IGZhbHNlO1xyXG5cdFx0cGxheWVyLnNldERpcmVjdGlvbigyNzApO1xyXG5cdFx0XHJcblx0XHRcclxuXHRcdGdhbWUuc3RhcnQoKTtcclxuXHJcblx0XHRjdXJyZW50VHJhY2sgPSBzb3VuZHMudHJhY2sxO1xyXG5cdFx0Y3VycmVudFRyYWNrLnBsYXkoKTtcclxuXHR9XHJcblxyXG5cdHNob3dNYWluTWVudSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXNpemVDYW52YXMoKSB7XHJcblx0bWFpbkNhbnZhcy53aWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xyXG5cdG1haW5DYW52YXMuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xyXG59XHJcblxyXG4kKCcucGxheScpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdCQoJyNtYWluJykuaGlkZSgpO1xyXG5cdCQoJyNzZWxlY3RQbGF5ZXInKS5zaG93KCk7XHJcblx0JCgnI21lbnUnKS5hZGRDbGFzcygnc2VsZWN0UGxheWVyJyk7XHJcbiAgfSk7XHJcblxyXG4kKCcuY3JlZGl0cycpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdCQoJyNtYWluJykuaGlkZSgpO1xyXG5cdCQoJyNjcmVkaXRzJykuc2hvdygpO1xyXG5cdCQoJyNtZW51JykuYWRkQ2xhc3MoJ2NyZWRpdHMnKTtcclxuICB9KTtcclxuXHJcbiQoJy5iYWNrJykuY2xpY2soZnVuY3Rpb24oKSB7XHJcblx0JCgnI2NyZWRpdHMnKS5oaWRlKCk7XHJcblx0JCgnI3NlbGVjdFBsYXllcicpLmhpZGUoKTtcclxuXHQkKCcjbWFpbicpLnNob3coKTtcclxuXHQkKCcjbWVudScpLnJlbW92ZUNsYXNzKCdjcmVkaXRzJyk7XHJcbiAgfSk7XHJcblxyXG4vLyBzZXQgdGhlIHNvdW5kIHByZWZlcmVuY2VcclxudmFyIGNhblVzZUxvY2FsU3RvcmFnZSA9ICdsb2NhbFN0b3JhZ2UnIGluIHdpbmRvdyAmJiB3aW5kb3cubG9jYWxTdG9yYWdlICE9PSBudWxsO1xyXG5pZiAoY2FuVXNlTG9jYWxTdG9yYWdlKSB7XHJcblx0cGxheVNvdW5kID0gKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdoYndDYXJ0UmFjaW5nLnBsYXlTb3VuZCcpID09PSBcInRydWVcIilcclxuXHRpZiAocGxheVNvdW5kKSB7XHJcblx0XHQkKCcuc291bmQnKS5hZGRDbGFzcygnc291bmQtb24nKS5yZW1vdmVDbGFzcygnc291bmQtb2ZmJyk7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0JCgnLnNvdW5kJykuYWRkQ2xhc3MoJ3NvdW5kLW9mZicpLnJlbW92ZUNsYXNzKCdzb3VuZC1vbicpO1xyXG5cdH1cclxufVxyXG5cclxuJCgnLnNvdW5kJykuY2xpY2soZnVuY3Rpb24oKSB7XHJcblx0dmFyICR0aGlzID0gJCh0aGlzKTtcclxuXHQvLyBzb3VuZCBvZmZcclxuXHRpZiAoJHRoaXMuaGFzQ2xhc3MoJ3NvdW5kLW9uJykpIHtcclxuXHQgICR0aGlzLnJlbW92ZUNsYXNzKCdzb3VuZC1vbicpLmFkZENsYXNzKCdzb3VuZC1vZmYnKTtcclxuXHQgIHBsYXlTb3VuZCA9IGZhbHNlO1xyXG5cdH1cclxuXHQvLyBzb3VuZCBvblxyXG5cdGVsc2Uge1xyXG5cdCAgJHRoaXMucmVtb3ZlQ2xhc3MoJ3NvdW5kLW9mZicpLmFkZENsYXNzKCdzb3VuZC1vbicpO1xyXG5cdCAgcGxheVNvdW5kID0gdHJ1ZTtcclxuXHR9XHJcblx0aWYgKGNhblVzZUxvY2FsU3RvcmFnZSkge1xyXG5cdCAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2hid0NhcnRSYWNpbmcucGxheVNvdW5kJywgcGxheVNvdW5kKTtcclxuXHR9XHJcblx0Ly8gbXV0ZSBvciB1bm11dGUgYWxsIHNvdW5kc1xyXG5cdGZvciAodmFyIHNvdW5kIGluIHNvdW5kcykge1xyXG5cdFx0aWYgKHNvdW5kcy5oYXNPd25Qcm9wZXJ0eShzb3VuZCkpIHtcclxuXHRcdFx0c291bmRzW3NvdW5kXS5tdXRlZCA9IHRydWU7XHJcblx0XHRcdGN1cnJlbnRUcmFjay5tdXRlZCA9ICFwbGF5U291bmQ7XHJcblx0XHR9XHJcblx0fVxyXG5cdGlmIChwbGF5U291bmQpIGN1cnJlbnRUcmFjay5wbGF5KCk7XHJcbn0pO1xyXG5cclxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHJlc2l6ZUNhbnZhcywgZmFsc2UpO1xyXG5cclxucmVzaXplQ2FudmFzKCk7XHJcblxyXG5sb2FkU291bmRzKCk7XHJcblxyXG5jdXJyZW50VHJhY2sgPSBzb3VuZHMudHJhY2sxO1xyXG5jdXJyZW50VHJhY2suY3VycmVudFRpbWUgPSAwO1xyXG5jdXJyZW50VHJhY2subG9vcCA9IHRydWU7XHJcblxyXG5sb2FkSW1hZ2VzKGltYWdlU291cmNlcywgc3RhcnROZXZlckVuZGluZ0dhbWUpO1xyXG5cclxudGhpcy5leHBvcnRzID0gd2luZG93O1xyXG4iLCJjb25zdCBnYW1lID0gcmVxdWlyZShcIi4vbGliL2dhbWVcIik7XHJcblxyXG4oZnVuY3Rpb24gKGdsb2JhbCkge1xyXG5cdHZhciBzcHJpdGVzID0ge1xyXG5cdFx0J3BsYXllcic6IHtcclxuXHRcdFx0aWQ6ICdwbGF5ZXInLFxyXG5cdFx0XHQkaW1hZ2VGaWxlOiAnJyxcclxuXHRcdFx0cGFydHM6IHt9LFxyXG5cdFx0XHRoaXRCb3hlczoge30sXHJcblx0XHRcdGhpdEJlaGF2aW9yOiB7fVxyXG5cdFx0fSxcclxuXHRcdCdwbGF5ZXIxJzoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlIDogJ2Fzc2V0cy9oYXRndXktc3ByaXRlcy5wbmcnLFxyXG5cdFx0XHRwYXJ0cyA6IHtcclxuXHRcdFx0XHQvLyB4LCB5LCB3aWR0aCwgaGVpZ2h0LCBjYW52YXNPZmZzZXRYLCBjYW52YXNPZmZzZXRZLCBoaXRib3hPZmZzZXRYLCBoaXRib3hPZmZzZXRZIFxyXG5cdFx0XHRcdGJsYW5rIDogWyAwLCAwLCAwLCAwIF0sXHJcblx0XHRcdFx0ZWFzdCA6IFsgMTQ1LCA2MSwgNzAsIDY2LCAwLCAwLCAyNSwgMCBdLFxyXG5cdFx0XHRcdGVzRWFzdCA6IFsgNzEsIDE5NiwgNjUsIDcxLCAwLCAwLCAyMSwgMCBdLFxyXG5cdFx0XHRcdHNFYXN0IDogWyAxMDMsIDEyNywgNTIsIDY5LCAwLCAwLCAxMywgMCBdLFxyXG5cdFx0XHRcdHNvdXRoIDogWyA2MCwgMTI3LCA0MywgNjggXSxcclxuXHRcdFx0XHRzV2VzdCA6IFsgMTU1LCAxMjcsIDUwLCA2OSBdLFxyXG5cdFx0XHRcdHdzV2VzdCA6IFsgMCwgMTI3LCA2MCwgNjYgXSxcclxuXHRcdFx0XHR3ZXN0IDogWyAxNTMsIDAsIDY1LCA2MSBdLFxyXG5cdFx0XHRcdGp1bXBpbmcgOiBbIDAsIDI2NywgNTYsIDg3LCAtMywgMTAgXSxcclxuXHRcdFx0XHRib29zdCA6IFsgNTYsIDI2NywgNDMsIDExMywgMCwgLTQ1IF0sXHJcblxyXG5cdFx0XHRcdC8vIFdyZWNrIHNlcXVlbmNlXHJcblx0XHRcdFx0d3JlY2sxIDogWyAwLCAxOTYsIDcxLCA3MCBdLFxyXG5cdFx0XHRcdHdyZWNrMiA6IFsgNzcsIDYxLCA2OCwgNjQgXSxcclxuXHRcdFx0XHR3cmVjazMgOiBbIDAsIDAsIDcwLCA1MCBdLFxyXG5cdFx0XHRcdHdyZWNrNCA6IFsgMTM2LCAxOTYsIDc1LCA3MSBdLFxyXG5cdFx0XHRcdHdyZWNrNSA6IFsgNzAsIDAsIDgzLCA1OSBdLFxyXG5cdFx0XHRcdHdyZWNrNiA6IFsgMCwgNjEsIDc3LCA2MSBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJveGVzOiB7XHJcblx0XHRcdFx0Ly9MZWZ0LCBUb3AsIFJpZ2h0LCBCb3R0b21cclxuXHRcdFx0XHQwOiBbIDAsIDIwLCA0NSwgNjAgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpZCA6ICdwbGF5ZXInLFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3BsYXllcjInOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL3BpbG90LXNwcml0ZXMucG5nJyxcclxuXHRcdFx0cGFydHMgOiB7XHJcblx0XHRcdFx0Ly8geCwgeSwgd2lkdGgsIGhlaWdodCwgY2FudmFzT2Zmc2V0WCwgY2FudmFzT2Zmc2V0WSwgaGl0Ym94T2Zmc2V0WCwgaGl0Ym94T2Zmc2V0WSBcclxuXHRcdFx0XHRibGFuayA6IFsgMCwgMCwgMCwgMCBdLFxyXG5cdFx0XHRcdGVhc3QgOiBbIDAsIDM2NSwgNzAsIDY4LCAwLCAwLCAyNSwgMCBdLFxyXG5cdFx0XHRcdGVzRWFzdCA6IFsgNTEsIDI4MywgNjUsIDcxLCAwLCAwLCAyMSwgMCBdLFxyXG5cdFx0XHRcdHNFYXN0IDogWyAwLCAyMDksIDU3LCA3NCwgMCwgMCwgMTMsIDAgXSxcclxuXHRcdFx0XHRzb3V0aCA6IFsgMCwgMCwgNDMsIDY4IF0sXHJcblx0XHRcdFx0c1dlc3QgOiBbIDAsIDEzNSwgNTQsIDc0LCAwIF0sXHJcblx0XHRcdFx0d3NXZXN0IDogWyA2NSwgNjgsIDYwLCA2NyBdLFxyXG5cdFx0XHRcdHdlc3QgOiBbIDAsIDY4LCA2NSwgNjIgXSxcclxuXHRcdFx0XHRqdW1waW5nIDogWyAwLCAyODMsIDUxLCA4MiwgLTMsIDEwIF0sXHJcblx0XHRcdFx0Ym9vc3QgOiBbIDc1LCA1NjIsIDQzLCAxMTMsIDAsIC00NSBdLFxyXG5cclxuXHRcdFx0XHQvLyBXcmVjayBzZXF1ZW5jZVxyXG5cdFx0XHRcdHdyZWNrMSA6IFsgMCwgNDMzLCA2OCwgNzAgXSxcclxuXHRcdFx0XHR3cmVjazIgOiBbIDU3LCAyMDksIDY4LCA2NCBdLFxyXG5cdFx0XHRcdHdyZWNrMyA6IFsgNDMsIDAsIDcwLCA1MCBdLFxyXG5cdFx0XHRcdHdyZWNrNCA6IFsgMCwgNTYyLCA3NSwgNzMgXSxcclxuXHRcdFx0XHR3cmVjazUgOiBbIDAsIDUwMywgODMsIDU5IF0sXHJcblx0XHRcdFx0d3JlY2s2IDogWyA1NCwgMTM1LCA3MSwgNTkgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCb3hlczoge1xyXG5cdFx0XHRcdC8vTGVmdCwgVG9wLCBSaWdodCwgQm90dG9tXHJcblx0XHRcdFx0MDogWyAwLCAyMCwgNDUsIDYwIF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aWQgOiAncGxheWVyJyxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCdwbGF5ZXIzJzoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlIDogJ2Fzc2V0cy9yb21hbnNvbGRpZXItc3ByaXRlcy5wbmcnLFxyXG5cdFx0XHRwYXJ0cyA6IHtcclxuXHRcdFx0XHQvLyB4LCB5LCB3aWR0aCwgaGVpZ2h0LCBjYW52YXNPZmZzZXRYLCBjYW52YXNPZmZzZXRZLCBoaXRib3hPZmZzZXRYLCBoaXRib3hPZmZzZXRZIFxyXG5cdFx0XHRcdGJsYW5rIDogWyAwLCAwLCAwLCAwIF0sXHJcblx0XHRcdFx0ZWFzdCA6IFsgMTMxLCA2MiwgNzMsIDcwLCAwLCAwLCAyNSwgMCBdLFxyXG5cdFx0XHRcdGVzRWFzdCA6IFsgNzIsIDEzMiwgNjUsIDcxLCAwLCAwLCAyMSwgMCBdLFxyXG5cdFx0XHRcdHNFYXN0IDogWyAxMzIsIDIwMywgNTcsIDc0LCAwLCAwLCAxMywgMCBdLFxyXG5cdFx0XHRcdHNvdXRoIDogWyA3OSwgMjAzLCA1MywgNzQsIDAsIDAsIDYsIDAgXSxcclxuXHRcdFx0XHRzV2VzdCA6IFsgMCwgNjIsIDY2LCA2OSwgMCwgMCwgMTUsIDAgXSxcclxuXHRcdFx0XHR3c1dlc3QgOiBbIDAsIDIwMywgNzksIDcyLCAwLCAwLCAxMCwgMCBdLFxyXG5cdFx0XHRcdHdlc3QgOiBbIDY2LCA2MiwgNjUsIDY5IF0sXHJcblx0XHRcdFx0anVtcGluZyA6IFsgNzUsIDI3NywgNjQsIDkxLCAtMTIsIDEwIF0sXHJcblx0XHRcdFx0Ym9vc3QgOiBbIDEzOSwgMjc3LCA1MywgMTIyLCAwLCAtNDUgXSxcclxuXHJcblx0XHRcdFx0Ly8gV3JlY2sgc2VxdWVuY2VcclxuXHRcdFx0XHR3cmVjazEgOiBbIDAsIDEzMiwgNzIsIDcwIF0sXHJcblx0XHRcdFx0d3JlY2syIDogWyA3NywgMCwgNjMsIDU5IF0sXHJcblx0XHRcdFx0d3JlY2szIDogWyAxMzcsIDEzMiwgNzAsIDcxIF0sXHJcblx0XHRcdFx0d3JlY2s0IDogWyAwLCAyNzcsIDc1LCA3NyBdLFxyXG5cdFx0XHRcdHdyZWNrNSA6IFsgMCwgMCwgNzcsIDU1IF0sXHJcblx0XHRcdFx0d3JlY2s2IDogWyAxNDAsIDAsIDcyLCA2MiBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJveGVzOiB7XHJcblx0XHRcdFx0Ly9MZWZ0LCBUb3AsIFJpZ2h0LCBCb3R0b21cclxuXHRcdFx0XHQwOiBbIDAsIDIwLCA0NSwgNjAgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpZCA6ICdwbGF5ZXInLFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3BsYXllcjQnOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL3NrZWxldG9uLXNwcml0ZXMucG5nJyxcclxuXHRcdFx0cGFydHMgOiB7XHJcblx0XHRcdFx0Ly8geCwgeSwgd2lkdGgsIGhlaWdodCwgY2FudmFzT2Zmc2V0WCwgY2FudmFzT2Zmc2V0WSwgaGl0Ym94T2Zmc2V0WCwgaGl0Ym94T2Zmc2V0WSBcclxuXHRcdFx0XHRibGFuayA6IFsgMCwgMCwgMCwgMCBdLFxyXG5cdFx0XHRcdGVhc3QgOiBbIDAsIDY4LCA3MywgNzEsIDAsIDAsIDI1LCAwIF0sXHJcblx0XHRcdFx0ZXNFYXN0IDogWyA3MywgNjgsIDY1LCA3MSwgMCwgMCwgMjEsIDAgXSxcclxuXHRcdFx0XHRzRWFzdCA6IFsgMjAyLCA2OCwgNTYsIDc0LCAwLCAwLCAxMywgMCBdLFxyXG5cdFx0XHRcdHNvdXRoIDogWyA0MzcsIDAsIDQzLCA2OCBdLFxyXG5cdFx0XHRcdHNXZXN0IDogWyAyNTgsIDY4LCA1NCwgNzQsIDAgXSxcclxuXHRcdFx0XHR3c1dlc3QgOiBbIDEzOCwgNjgsIDY0LCA3MSBdLFxyXG5cdFx0XHRcdHdlc3QgOiBbIDI5MCwgMCwgNjgsIDY2IF0sXHJcblx0XHRcdFx0anVtcGluZyA6IFsgMzg3LCA2OCwgNTYsIDkzLCAtMywgMTAgXSxcclxuXHRcdFx0XHRib29zdCA6IFsgNDQzLCA2OCwgNDYsIDEyMiwgMCwgLTQ1IF0sXHJcblxyXG5cdFx0XHRcdC8vIFdyZWNrIHNlcXVlbmNlXHJcblx0XHRcdFx0d3JlY2sxIDogWyAyMjMsIDAsIDY3LCA2NSBdLFxyXG5cdFx0XHRcdHdyZWNrMiA6IFsgMTU1LCAwLCA2OCwgNjQgXSxcclxuXHRcdFx0XHR3cmVjazMgOiBbIDAsIDAsIDcxLCA1MSBdLFxyXG5cdFx0XHRcdHdyZWNrNCA6IFsgMzEyLCA2OCwgNzUsIDc4IF0sXHJcblx0XHRcdFx0d3JlY2s1IDogWyA3MSwgMCwgODQsIDU5IF0sXHJcblx0XHRcdFx0d3JlY2s2IDogWyAzNTgsIDAsIDc5LCA2NyBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJveGVzOiB7XHJcblx0XHRcdFx0Ly9MZWZ0LCBUb3AsIFJpZ2h0LCBCb3R0b21cclxuXHRcdFx0XHQwOiBbIDAsIDIwLCA0NSwgNjAgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpZCA6ICdwbGF5ZXInLFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3Rva2VuJyA6IHtcclxuXHRcdFx0bmFtZTogJ3Rva2VuJyxcclxuXHRcdFx0JGltYWdlRmlsZTogJ2Fzc2V0cy90b2tlbi1zcHJpdGVzLnBuZycsXHJcblx0XHRcdGFuaW1hdGVkOiB0cnVlLFxyXG5cdFx0XHRjb2xsZWN0aWJsZTogdHJ1ZSxcclxuXHRcdFx0cG9pbnRWYWx1ZXM6IFsxMjUsIDE1MCwgMTc1LCAyMDAsIDI1MCwgMzAwLCAzNTAsIDQwMCwgNDUwLCA1MDBdLFxyXG5cdFx0XHRwYXJ0czoge1xyXG5cdFx0XHRcdGZyYW1lMTogWzAsIDAsIDI1LCAyNl0sXHJcblx0XHRcdFx0ZnJhbWUyOiBbMjUsIDAsIDI1LCAyNl0sXHJcblx0XHRcdFx0ZnJhbWUzOiBbNTAsIDAsIDI1LCAyNl0sXHJcblx0XHRcdFx0ZnJhbWU0OiBbNzUsIDAsIDI1LCAyNl1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCdvaWxTbGljaycgOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL29pbHNsaWNrLXNwcml0ZS5wbmcnLFxyXG5cdFx0XHRwYXJ0cyA6IHtcclxuXHRcdFx0XHRtYWluIDogWyAwLCAwLCA0MCwgMTkgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9LFxyXG5cdFx0XHRpc0RyYXduVW5kZXJQbGF5ZXI6IHRydWVcclxuXHRcdH0sXHJcblx0XHQnbW9uc3RlcicgOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL21hbG9yZC1zcHJpdGVzLnBuZycsXHJcblx0XHRcdHBhcnRzIDoge1xyXG5cdFx0XHRcdHNFYXN0MSA6IFsgMzMyLCAxNDksIDE2NiwgMTQ5IF0sXHJcblx0XHRcdFx0c0Vhc3QyIDogWyAwLCAyOTgsIDE2NiwgMTQ5IF0sXHJcblx0XHRcdFx0c1dlc3QxIDogWyAxNjYsIDI5OCwgMTY2LCAxNDkgXSxcclxuXHRcdFx0XHRzV2VzdDIgOiBbIDMzMiwgMjk4LCAxNjYsIDE0OSBdLFxyXG5cdFx0XHRcdGVhdGluZzEgOiBbIDAsIDAsIDE2NiwgMTQ5IF0sXHJcblx0XHRcdFx0ZWF0aW5nMiA6IFsgMTY2LCAwLCAxNjYsIDE0OSBdLFxyXG5cdFx0XHRcdGVhdGluZzMgOiBbIDMzMiwgMCwgMTY2LCAxNDkgXSxcclxuXHRcdFx0XHRlYXRpbmc0IDogWyAwLCAxNDksIDE2NiwgMTQ5IF0sXHJcblx0XHRcdFx0ZWF0aW5nNSA6IFsgMTY2LCAxNDksIDE2NiwgMTQ5IF0sXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge31cclxuXHRcdH0sXHJcblx0XHQnanVtcCcgOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL3JhbXAtc3ByaXRlLnBuZycsXHJcblx0XHRcdHBhcnRzIDoge1xyXG5cdFx0XHRcdG1haW4gOiBbIDAsIDAsIDU0LCAzNiBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJveGVzOiB7XHJcblx0XHRcdFx0Ly9MZWZ0LCBUb3AsIFJpZ2h0LCBCb3R0b21cclxuXHRcdFx0XHQwOiBbIDYsIDMsIDQ4LCAxMCBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge30sXHJcblx0XHRcdGlzRHJhd25VbmRlclBsYXllcjogdHJ1ZVxyXG5cdFx0fSxcclxuXHRcdCdzaWduU3RhcnQnIDoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlIDogJ2Fzc2V0cy9zdGFydHNpZ24tc3ByaXRlLnBuZycsXHJcblx0XHRcdHBhcnRzIDoge1xyXG5cdFx0XHRcdG1haW4gOiBbIDAsIDAsIDQyLCAyNyBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge31cclxuXHRcdH0sXHJcblx0XHQnbWlsa3NoYWtlJzoge1xyXG5cdFx0XHRuYW1lOiAnbWlsa3NoYWtlJyxcclxuXHRcdFx0JGltYWdlRmlsZTogJ2Fzc2V0cy9taWxrc2hha2Utc3ByaXRlLnBuZycsXHJcblx0XHRcdGNvbGxlY3RpYmxlOiB0cnVlLFxyXG5cdFx0XHRwb2ludFZhbHVlczogWzEyNSwgMTUwLCAxNzUsIDIwMCwgMjUwLCAzMDAsIDM1MCwgNDAwLCA0NTAsIDUwMF0sXHJcblx0XHRcdHBhcnRzOiB7XHJcblx0XHRcdFx0bWFpbiA6IFsgMCwgMCwgMjUsIDQzIF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCd0cmFmZmljQ29uZUxhcmdlJzoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlOiAnYXNzZXRzL3RyYWZmaWMtY29uZS1sYXJnZS5wbmcnLFxyXG5cdFx0XHRwYXJ0czoge1xyXG5cdFx0XHRcdG1haW4gOiBbIDAsIDAsIDM5LCA0OCBdXHJcblx0XHRcdH0sXHJcblx0XHRcdHpJbmRleGVzT2NjdXBpZWQgOiBbMCwgMV0sXHJcblx0XHRcdGhpdEJveGVzOiB7XHJcblx0XHRcdFx0MDogWyAwLCAyNiwgMzksIDQ4IF0sXHJcblx0XHRcdFx0MTogWyAxMiwgMCwgMjgsIDIwIF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCd0cmFmZmljQ29uZVNtYWxsJzoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlOiAnYXNzZXRzL3RyYWZmaWMtY29uZS1zbWFsbC5wbmcnLFxyXG5cdFx0XHRwYXJ0czoge1xyXG5cdFx0XHRcdG1haW4gOiBbIDAsIDAsIDE5LCAyNCBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJveGVzOiB7XHJcblx0XHRcdFx0MDogWyAwLCAxMywgMTksIDI0IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCdnYXJiYWdlQ2FuJzoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlOiAnYXNzZXRzL2dhcmJhZ2UtY2FuLnBuZycsXHJcblx0XHRcdHBhcnRzOiB7XHJcblx0XHRcdFx0bWFpbiA6IFsgMCwgMCwgMjksIDQ1IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0Qm94ZXM6IHtcclxuXHRcdFx0XHQwOiBbIDEsIDMwLCAyOCwgNDQgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0Ly8gTW9uc3RlciBoaXR0aW5nIHN0YXRpYyBvYmplY3RzIGRvZXNuJ3Qgc2VlbSB0byB3b3JrXHJcblx0ZnVuY3Rpb24gbW9uc3RlckhpdHNPYnN0YWNsZUJlaGF2aW9yKG1vbnN0ZXIpIHtcclxuXHRcdG1vbnN0ZXIuZGVsZXRlT25OZXh0Q3ljbGUoKTtcclxuXHR9XHJcblx0c3ByaXRlcy5tb25zdGVyLmhpdEJlaGF2aW91ci5nYXJiYWdlQ2FuID0gbW9uc3RlckhpdHNPYnN0YWNsZUJlaGF2aW9yO1xyXG5cdHNwcml0ZXMubW9uc3Rlci5oaXRCZWhhdmlvdXIudHJhZmZpY0NvbmVMYXJnZSA9IG1vbnN0ZXJIaXRzT2JzdGFjbGVCZWhhdmlvcjtcclxuXHRzcHJpdGVzLm1vbnN0ZXIuaGl0QmVoYXZpb3VyLnRyYWZmaWNDb25lU21hbGwgPSBtb25zdGVySGl0c09ic3RhY2xlQmVoYXZpb3I7XHJcblx0ZnVuY3Rpb24gb2JzdGFjbGVIaXRzTW9uc3RlckJlaGF2aW9yKG9ic3RhY2xlLCBtb25zdGVyKSB7XHJcblx0XHRtb25zdGVyLmRlbGV0ZU9uTmV4dEN5Y2xlKCk7XHJcblx0fVxyXG5cdHNwcml0ZXMuZ2FyYmFnZUNhbi5oaXRCZWhhdmlvdXIubW9uc3RlciA9IG9ic3RhY2xlSGl0c01vbnN0ZXJCZWhhdmlvcjtcclxuXHRzcHJpdGVzLnRyYWZmaWNDb25lTGFyZ2UuaGl0QmVoYXZpb3VyLm1vbnN0ZXIgPSBvYnN0YWNsZUhpdHNNb25zdGVyQmVoYXZpb3I7XHJcblx0c3ByaXRlcy50cmFmZmljQ29uZVNtYWxsLmhpdEJlaGF2aW91ci5tb25zdGVyID0gb2JzdGFjbGVIaXRzTW9uc3RlckJlaGF2aW9yO1xyXG5cclxuXHRmdW5jdGlvbiBqdW1wSGl0c1BsYXllckJlaGF2aW91cihqdW1wLCBwbGF5ZXIpIHtcclxuXHRcdHBsYXllci5oYXNIaXRKdW1wKGp1bXApO1xyXG5cdH1cclxuXHRzcHJpdGVzLmp1bXAuaGl0QmVoYXZpb3VyLnBsYXllciA9IGp1bXBIaXRzUGxheWVyQmVoYXZpb3VyO1xyXG5cclxuXHRmdW5jdGlvbiBvYnN0YWNsZUhpdHNQbGF5ZXJCZWhhdmlvdXIob2JzdGFjbGUsIHBsYXllcikge1xyXG5cdFx0cGxheWVyLmhhc0hpdE9ic3RhY2xlKG9ic3RhY2xlKTtcclxuXHR9XHJcblx0c3ByaXRlcy50cmFmZmljQ29uZUxhcmdlLmhpdEJlaGF2aW91ci5wbGF5ZXIgPSBvYnN0YWNsZUhpdHNQbGF5ZXJCZWhhdmlvdXI7XHJcblx0c3ByaXRlcy50cmFmZmljQ29uZVNtYWxsLmhpdEJlaGF2aW91ci5wbGF5ZXIgPSBvYnN0YWNsZUhpdHNQbGF5ZXJCZWhhdmlvdXI7XHJcblx0c3ByaXRlcy5nYXJiYWdlQ2FuLmhpdEJlaGF2aW91ci5wbGF5ZXIgPSBvYnN0YWNsZUhpdHNQbGF5ZXJCZWhhdmlvdXI7XHJcblxyXG5cdGZ1bmN0aW9uIG9pbFNsaWNrSGl0c1BsYXllckJlaGF2aW91cihvaWxTbGljaywgcGxheWVyKSB7XHJcblx0XHRwbGF5ZXIuaGFzSGl0T2lsU2xpY2sob2lsU2xpY2spO1xyXG5cdH1cclxuXHRzcHJpdGVzLm9pbFNsaWNrLmhpdEJlaGF2aW91ci5wbGF5ZXIgPSBvaWxTbGlja0hpdHNQbGF5ZXJCZWhhdmlvdXI7XHJcblxyXG5cdGZ1bmN0aW9uIHBsYXllckhpdHNDb2xsZWN0aWJsZUJlaGF2aW91cihpdGVtLCBwbGF5ZXIpIHtcclxuXHRcdHBsYXllci5oYXNIaXRDb2xsZWN0aWJsZShpdGVtKTtcclxuXHRcdGl0ZW0uZGVsZXRlT25OZXh0Q3ljbGUoKTtcclxuXHR9XHJcblx0c3ByaXRlcy50b2tlbi5oaXRCZWhhdmlvdXIucGxheWVyID0gcGxheWVySGl0c0NvbGxlY3RpYmxlQmVoYXZpb3VyO1xyXG5cdHNwcml0ZXMubWlsa3NoYWtlLmhpdEJlaGF2aW91ci5wbGF5ZXIgPSBwbGF5ZXJIaXRzQ29sbGVjdGlibGVCZWhhdmlvdXI7XHJcblx0XHJcblx0Z2xvYmFsLnNwcml0ZUluZm8gPSBzcHJpdGVzO1xyXG59KSggdGhpcyApO1xyXG5cclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG5cdG1vZHVsZS5leHBvcnRzID0gdGhpcy5zcHJpdGVJbmZvO1xyXG59IiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMiBDcmFpZyBDYW1wYmVsbFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqIE1vdXNldHJhcCBpcyBhIHNpbXBsZSBrZXlib2FyZCBzaG9ydGN1dCBsaWJyYXJ5IGZvciBKYXZhc2NyaXB0IHdpdGhcbiAqIG5vIGV4dGVybmFsIGRlcGVuZGVuY2llc1xuICpcbiAqIEB2ZXJzaW9uIDEuMS4zXG4gKiBAdXJsIGNyYWlnLmlzL2tpbGxpbmcvbWljZVxuICovXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBtYXBwaW5nIG9mIHNwZWNpYWwga2V5Y29kZXMgdG8gdGhlaXIgY29ycmVzcG9uZGluZyBrZXlzXG4gICAgICpcbiAgICAgKiBldmVyeXRoaW5nIGluIHRoaXMgZGljdGlvbmFyeSBjYW5ub3QgdXNlIGtleXByZXNzIGV2ZW50c1xuICAgICAqIHNvIGl0IGhhcyB0byBiZSBoZXJlIHRvIG1hcCB0byB0aGUgY29ycmVjdCBrZXljb2RlcyBmb3JcbiAgICAgKiBrZXl1cC9rZXlkb3duIGV2ZW50c1xuICAgICAqXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICB2YXIgX01BUCA9IHtcbiAgICAgICAgICAgIDg6ICdiYWNrc3BhY2UnLFxuICAgICAgICAgICAgOTogJ3RhYicsXG4gICAgICAgICAgICAxMzogJ2VudGVyJyxcbiAgICAgICAgICAgIDE2OiAnc2hpZnQnLFxuICAgICAgICAgICAgMTc6ICdjdHJsJyxcbiAgICAgICAgICAgIDE4OiAnYWx0JyxcbiAgICAgICAgICAgIDIwOiAnY2Fwc2xvY2snLFxuICAgICAgICAgICAgMjc6ICdlc2MnLFxuICAgICAgICAgICAgMzI6ICdzcGFjZScsXG4gICAgICAgICAgICAzMzogJ3BhZ2V1cCcsXG4gICAgICAgICAgICAzNDogJ3BhZ2Vkb3duJyxcbiAgICAgICAgICAgIDM1OiAnZW5kJyxcbiAgICAgICAgICAgIDM2OiAnaG9tZScsXG4gICAgICAgICAgICAzNzogJ2xlZnQnLFxuICAgICAgICAgICAgMzg6ICd1cCcsXG4gICAgICAgICAgICAzOTogJ3JpZ2h0JyxcbiAgICAgICAgICAgIDQwOiAnZG93bicsXG4gICAgICAgICAgICA0NTogJ2lucycsXG4gICAgICAgICAgICA0NjogJ2RlbCcsXG4gICAgICAgICAgICA5MTogJ21ldGEnLFxuICAgICAgICAgICAgOTM6ICdtZXRhJyxcbiAgICAgICAgICAgIDIyNDogJ21ldGEnXG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIG1hcHBpbmcgZm9yIHNwZWNpYWwgY2hhcmFjdGVycyBzbyB0aGV5IGNhbiBzdXBwb3J0XG4gICAgICAgICAqXG4gICAgICAgICAqIHRoaXMgZGljdGlvbmFyeSBpcyBvbmx5IHVzZWQgaW5jYXNlIHlvdSB3YW50IHRvIGJpbmQgYVxuICAgICAgICAgKiBrZXl1cCBvciBrZXlkb3duIGV2ZW50IHRvIG9uZSBvZiB0aGVzZSBrZXlzXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBfS0VZQ09ERV9NQVAgPSB7XG4gICAgICAgICAgICAxMDY6ICcqJyxcbiAgICAgICAgICAgIDEwNzogJysnLFxuICAgICAgICAgICAgMTA5OiAnLScsXG4gICAgICAgICAgICAxMTA6ICcuJyxcbiAgICAgICAgICAgIDExMSA6ICcvJyxcbiAgICAgICAgICAgIDE4NjogJzsnLFxuICAgICAgICAgICAgMTg3OiAnPScsXG4gICAgICAgICAgICAxODg6ICcsJyxcbiAgICAgICAgICAgIDE4OTogJy0nLFxuICAgICAgICAgICAgMTkwOiAnLicsXG4gICAgICAgICAgICAxOTE6ICcvJyxcbiAgICAgICAgICAgIDE5MjogJ2AnLFxuICAgICAgICAgICAgMjE5OiAnWycsXG4gICAgICAgICAgICAyMjA6ICdcXFxcJyxcbiAgICAgICAgICAgIDIyMTogJ10nLFxuICAgICAgICAgICAgMjIyOiAnXFwnJ1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiB0aGlzIGlzIGEgbWFwcGluZyBvZiBrZXlzIHRoYXQgcmVxdWlyZSBzaGlmdCBvbiBhIFVTIGtleXBhZFxuICAgICAgICAgKiBiYWNrIHRvIHRoZSBub24gc2hpZnQgZXF1aXZlbGVudHNcbiAgICAgICAgICpcbiAgICAgICAgICogdGhpcyBpcyBzbyB5b3UgY2FuIHVzZSBrZXl1cCBldmVudHMgd2l0aCB0aGVzZSBrZXlzXG4gICAgICAgICAqXG4gICAgICAgICAqIG5vdGUgdGhhdCB0aGlzIHdpbGwgb25seSB3b3JrIHJlbGlhYmx5IG9uIFVTIGtleWJvYXJkc1xuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgX1NISUZUX01BUCA9IHtcbiAgICAgICAgICAgICd+JzogJ2AnLFxuICAgICAgICAgICAgJyEnOiAnMScsXG4gICAgICAgICAgICAnQCc6ICcyJyxcbiAgICAgICAgICAgICcjJzogJzMnLFxuICAgICAgICAgICAgJyQnOiAnNCcsXG4gICAgICAgICAgICAnJSc6ICc1JyxcbiAgICAgICAgICAgICdeJzogJzYnLFxuICAgICAgICAgICAgJyYnOiAnNycsXG4gICAgICAgICAgICAnKic6ICc4JyxcbiAgICAgICAgICAgICcoJzogJzknLFxuICAgICAgICAgICAgJyknOiAnMCcsXG4gICAgICAgICAgICAnXyc6ICctJyxcbiAgICAgICAgICAgICcrJzogJz0nLFxuICAgICAgICAgICAgJzonOiAnOycsXG4gICAgICAgICAgICAnXFxcIic6ICdcXCcnLFxuICAgICAgICAgICAgJzwnOiAnLCcsXG4gICAgICAgICAgICAnPic6ICcuJyxcbiAgICAgICAgICAgICc/JzogJy8nLFxuICAgICAgICAgICAgJ3wnOiAnXFxcXCdcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogdGhpcyBpcyBhIGxpc3Qgb2Ygc3BlY2lhbCBzdHJpbmdzIHlvdSBjYW4gdXNlIHRvIG1hcFxuICAgICAgICAgKiB0byBtb2RpZmllciBrZXlzIHdoZW4geW91IHNwZWNpZnkgeW91ciBrZXlib2FyZCBzaG9ydGN1dHNcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIF9TUEVDSUFMX0FMSUFTRVMgPSB7XG4gICAgICAgICAgICAnb3B0aW9uJzogJ2FsdCcsXG4gICAgICAgICAgICAnY29tbWFuZCc6ICdtZXRhJyxcbiAgICAgICAgICAgICdyZXR1cm4nOiAnZW50ZXInLFxuICAgICAgICAgICAgJ2VzY2FwZSc6ICdlc2MnXG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHZhcmlhYmxlIHRvIHN0b3JlIHRoZSBmbGlwcGVkIHZlcnNpb24gb2YgX01BUCBmcm9tIGFib3ZlXG4gICAgICAgICAqIG5lZWRlZCB0byBjaGVjayBpZiB3ZSBzaG91bGQgdXNlIGtleXByZXNzIG9yIG5vdCB3aGVuIG5vIGFjdGlvblxuICAgICAgICAgKiBpcyBzcGVjaWZpZWRcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge09iamVjdHx1bmRlZmluZWR9XG4gICAgICAgICAqL1xuICAgICAgICBfUkVWRVJTRV9NQVAsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIGEgbGlzdCBvZiBhbGwgdGhlIGNhbGxiYWNrcyBzZXR1cCB2aWEgTW91c2V0cmFwLmJpbmQoKVxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgX2NhbGxiYWNrcyA9IHt9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBkaXJlY3QgbWFwIG9mIHN0cmluZyBjb21iaW5hdGlvbnMgdG8gY2FsbGJhY2tzIHVzZWQgZm9yIHRyaWdnZXIoKVxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgX2RpcmVjdF9tYXAgPSB7fSxcblxuICAgICAgICAvKipcbiAgICAgICAgICoga2VlcHMgdHJhY2sgb2Ygd2hhdCBsZXZlbCBlYWNoIHNlcXVlbmNlIGlzIGF0IHNpbmNlIG11bHRpcGxlXG4gICAgICAgICAqIHNlcXVlbmNlcyBjYW4gc3RhcnQgb3V0IHdpdGggdGhlIHNhbWUgc2VxdWVuY2VcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIF9zZXF1ZW5jZV9sZXZlbHMgPSB7fSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogdmFyaWFibGUgdG8gc3RvcmUgdGhlIHNldFRpbWVvdXQgY2FsbFxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7bnVsbHxudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICBfcmVzZXRfdGltZXIsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHRlbXBvcmFyeSBzdGF0ZSB3aGVyZSB3ZSB3aWxsIGlnbm9yZSB0aGUgbmV4dCBrZXl1cFxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbnxzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBfaWdub3JlX25leHRfa2V5dXAgPSBmYWxzZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogYXJlIHdlIGN1cnJlbnRseSBpbnNpZGUgb2YgYSBzZXF1ZW5jZT9cbiAgICAgICAgICogdHlwZSBvZiBhY3Rpb24gKFwia2V5dXBcIiBvciBcImtleWRvd25cIiBvciBcImtleXByZXNzXCIpIG9yIGZhbHNlXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufHN0cmluZ31cbiAgICAgICAgICovXG4gICAgICAgIF9pbnNpZGVfc2VxdWVuY2UgPSBmYWxzZTtcblxuICAgIC8qKlxuICAgICAqIGxvb3AgdGhyb3VnaCB0aGUgZiBrZXlzLCBmMSB0byBmMTkgYW5kIGFkZCB0aGVtIHRvIHRoZSBtYXBcbiAgICAgKiBwcm9ncmFtYXRpY2FsbHlcbiAgICAgKi9cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IDIwOyArK2kpIHtcbiAgICAgICAgX01BUFsxMTEgKyBpXSA9ICdmJyArIGk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogbG9vcCB0aHJvdWdoIHRvIG1hcCBudW1iZXJzIG9uIHRoZSBudW1lcmljIGtleXBhZFxuICAgICAqL1xuICAgIGZvciAoaSA9IDA7IGkgPD0gOTsgKytpKSB7XG4gICAgICAgIF9NQVBbaSArIDk2XSA9IGk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY3Jvc3MgYnJvd3NlciBhZGQgZXZlbnQgbWV0aG9kXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0VsZW1lbnR8SFRNTERvY3VtZW50fSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9hZGRFdmVudChvYmplY3QsIHR5cGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChvYmplY3QuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgb2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIGZhbHNlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIG9iamVjdC5hdHRhY2hFdmVudCgnb24nICsgdHlwZSwgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHRha2VzIHRoZSBldmVudCBhbmQgcmV0dXJucyB0aGUga2V5IGNoYXJhY3RlclxuICAgICAqXG4gICAgICogQHBhcmFtIHtFdmVudH0gZVxuICAgICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfY2hhcmFjdGVyRnJvbUV2ZW50KGUpIHtcblxuICAgICAgICAvLyBmb3Iga2V5cHJlc3MgZXZlbnRzIHdlIHNob3VsZCByZXR1cm4gdGhlIGNoYXJhY3RlciBhcyBpc1xuICAgICAgICBpZiAoZS50eXBlID09ICdrZXlwcmVzcycpIHtcbiAgICAgICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGUud2hpY2gpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZm9yIG5vbiBrZXlwcmVzcyBldmVudHMgdGhlIHNwZWNpYWwgbWFwcyBhcmUgbmVlZGVkXG4gICAgICAgIGlmIChfTUFQW2Uud2hpY2hdKSB7XG4gICAgICAgICAgICByZXR1cm4gX01BUFtlLndoaWNoXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfS0VZQ09ERV9NQVBbZS53aGljaF0pIHtcbiAgICAgICAgICAgIHJldHVybiBfS0VZQ09ERV9NQVBbZS53aGljaF07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiBpdCBpcyBub3QgaW4gdGhlIHNwZWNpYWwgbWFwXG4gICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGUud2hpY2gpLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY2hlY2tzIGlmIHR3byBhcnJheXMgYXJlIGVxdWFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBtb2RpZmllcnMxXG4gICAgICogQHBhcmFtIHtBcnJheX0gbW9kaWZpZXJzMlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9tb2RpZmllcnNNYXRjaChtb2RpZmllcnMxLCBtb2RpZmllcnMyKSB7XG4gICAgICAgIHJldHVybiBtb2RpZmllcnMxLnNvcnQoKS5qb2luKCcsJykgPT09IG1vZGlmaWVyczIuc29ydCgpLmpvaW4oJywnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXNldHMgYWxsIHNlcXVlbmNlIGNvdW50ZXJzIGV4Y2VwdCBmb3IgdGhlIG9uZXMgcGFzc2VkIGluXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZG9fbm90X3Jlc2V0XG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9yZXNldFNlcXVlbmNlcyhkb19ub3RfcmVzZXQpIHtcbiAgICAgICAgZG9fbm90X3Jlc2V0ID0gZG9fbm90X3Jlc2V0IHx8IHt9O1xuXG4gICAgICAgIHZhciBhY3RpdmVfc2VxdWVuY2VzID0gZmFsc2UsXG4gICAgICAgICAgICBrZXk7XG5cbiAgICAgICAgZm9yIChrZXkgaW4gX3NlcXVlbmNlX2xldmVscykge1xuICAgICAgICAgICAgaWYgKGRvX25vdF9yZXNldFtrZXldKSB7XG4gICAgICAgICAgICAgICAgYWN0aXZlX3NlcXVlbmNlcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfc2VxdWVuY2VfbGV2ZWxzW2tleV0gPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFhY3RpdmVfc2VxdWVuY2VzKSB7XG4gICAgICAgICAgICBfaW5zaWRlX3NlcXVlbmNlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBmaW5kcyBhbGwgY2FsbGJhY2tzIHRoYXQgbWF0Y2ggYmFzZWQgb24gdGhlIGtleWNvZGUsIG1vZGlmaWVycyxcbiAgICAgKiBhbmQgYWN0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2hhcmFjdGVyXG4gICAgICogQHBhcmFtIHtBcnJheX0gbW9kaWZpZXJzXG4gICAgICogQHBhcmFtIHtFdmVudHxPYmplY3R9IGVcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW49fSByZW1vdmUgLSBzaG91bGQgd2UgcmVtb3ZlIGFueSBtYXRjaGVzXG4gICAgICogQHBhcmFtIHtzdHJpbmc9fSBjb21iaW5hdGlvblxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0TWF0Y2hlcyhjaGFyYWN0ZXIsIG1vZGlmaWVycywgZSwgcmVtb3ZlLCBjb21iaW5hdGlvbikge1xuICAgICAgICB2YXIgaSxcbiAgICAgICAgICAgIGNhbGxiYWNrLFxuICAgICAgICAgICAgbWF0Y2hlcyA9IFtdLFxuICAgICAgICAgICAgYWN0aW9uID0gZS50eXBlO1xuXG4gICAgICAgIC8vIGlmIHRoZXJlIGFyZSBubyBldmVudHMgcmVsYXRlZCB0byB0aGlzIGtleWNvZGVcbiAgICAgICAgaWYgKCFfY2FsbGJhY2tzW2NoYXJhY3Rlcl0pIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIGEgbW9kaWZpZXIga2V5IGlzIGNvbWluZyB1cCBvbiBpdHMgb3duIHdlIHNob3VsZCBhbGxvdyBpdFxuICAgICAgICBpZiAoYWN0aW9uID09ICdrZXl1cCcgJiYgX2lzTW9kaWZpZXIoY2hhcmFjdGVyKSkge1xuICAgICAgICAgICAgbW9kaWZpZXJzID0gW2NoYXJhY3Rlcl07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBsb29wIHRocm91Z2ggYWxsIGNhbGxiYWNrcyBmb3IgdGhlIGtleSB0aGF0IHdhcyBwcmVzc2VkXG4gICAgICAgIC8vIGFuZCBzZWUgaWYgYW55IG9mIHRoZW0gbWF0Y2hcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IF9jYWxsYmFja3NbY2hhcmFjdGVyXS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBfY2FsbGJhY2tzW2NoYXJhY3Rlcl1baV07XG5cbiAgICAgICAgICAgIC8vIGlmIHRoaXMgaXMgYSBzZXF1ZW5jZSBidXQgaXQgaXMgbm90IGF0IHRoZSByaWdodCBsZXZlbFxuICAgICAgICAgICAgLy8gdGhlbiBtb3ZlIG9udG8gdGhlIG5leHQgbWF0Y2hcbiAgICAgICAgICAgIGlmIChjYWxsYmFjay5zZXEgJiYgX3NlcXVlbmNlX2xldmVsc1tjYWxsYmFjay5zZXFdICE9IGNhbGxiYWNrLmxldmVsKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZSBhY3Rpb24gd2UgYXJlIGxvb2tpbmcgZm9yIGRvZXNuJ3QgbWF0Y2ggdGhlIGFjdGlvbiB3ZSBnb3RcbiAgICAgICAgICAgIC8vIHRoZW4gd2Ugc2hvdWxkIGtlZXAgZ29pbmdcbiAgICAgICAgICAgIGlmIChhY3Rpb24gIT0gY2FsbGJhY2suYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHRoaXMgaXMgYSBrZXlwcmVzcyBldmVudCBhbmQgdGhlIG1ldGEga2V5IGFuZCBjb250cm9sIGtleVxuICAgICAgICAgICAgLy8gYXJlIG5vdCBwcmVzc2VkIHRoYXQgbWVhbnMgdGhhdCB3ZSBuZWVkIHRvIG9ubHkgbG9vayBhdCB0aGVcbiAgICAgICAgICAgIC8vIGNoYXJhY3Rlciwgb3RoZXJ3aXNlIGNoZWNrIHRoZSBtb2RpZmllcnMgYXMgd2VsbFxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIGNocm9tZSB3aWxsIG5vdCBmaXJlIGEga2V5cHJlc3MgaWYgbWV0YSBvciBjb250cm9sIGlzIGRvd25cbiAgICAgICAgICAgIC8vIHNhZmFyaSB3aWxsIGZpcmUgYSBrZXlwcmVzcyBpZiBtZXRhIG9yIG1ldGErc2hpZnQgaXMgZG93blxuICAgICAgICAgICAgLy8gZmlyZWZveCB3aWxsIGZpcmUgYSBrZXlwcmVzcyBpZiBtZXRhIG9yIGNvbnRyb2wgaXMgZG93blxuICAgICAgICAgICAgaWYgKChhY3Rpb24gPT0gJ2tleXByZXNzJyAmJiAhZS5tZXRhS2V5ICYmICFlLmN0cmxLZXkpIHx8IF9tb2RpZmllcnNNYXRjaChtb2RpZmllcnMsIGNhbGxiYWNrLm1vZGlmaWVycykpIHtcblxuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBpcyB1c2VkIHNvIGlmIHlvdSBjaGFuZ2UgeW91ciBtaW5kIGFuZCBjYWxsIGJpbmQgYVxuICAgICAgICAgICAgICAgIC8vIHNlY29uZCB0aW1lIHdpdGggYSBuZXcgZnVuY3Rpb24gdGhlIGZpcnN0IG9uZSBpcyBvdmVyd3JpdHRlblxuICAgICAgICAgICAgICAgIGlmIChyZW1vdmUgJiYgY2FsbGJhY2suY29tYm8gPT0gY29tYmluYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgX2NhbGxiYWNrc1tjaGFyYWN0ZXJdLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBtYXRjaGVzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1hdGNoZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogdGFrZXMgYSBrZXkgZXZlbnQgYW5kIGZpZ3VyZXMgb3V0IHdoYXQgdGhlIG1vZGlmaWVycyBhcmVcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGVcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2V2ZW50TW9kaWZpZXJzKGUpIHtcbiAgICAgICAgdmFyIG1vZGlmaWVycyA9IFtdO1xuXG4gICAgICAgIGlmIChlLnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICBtb2RpZmllcnMucHVzaCgnc2hpZnQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlLmFsdEtleSkge1xuICAgICAgICAgICAgbW9kaWZpZXJzLnB1c2goJ2FsdCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGUuY3RybEtleSkge1xuICAgICAgICAgICAgbW9kaWZpZXJzLnB1c2goJ2N0cmwnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlLm1ldGFLZXkpIHtcbiAgICAgICAgICAgIG1vZGlmaWVycy5wdXNoKCdtZXRhJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbW9kaWZpZXJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGFjdHVhbGx5IGNhbGxzIHRoZSBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqXG4gICAgICogaWYgeW91ciBjYWxsYmFjayBmdW5jdGlvbiByZXR1cm5zIGZhbHNlIHRoaXMgd2lsbCB1c2UgdGhlIGpxdWVyeVxuICAgICAqIGNvbnZlbnRpb24gLSBwcmV2ZW50IGRlZmF1bHQgYW5kIHN0b3AgcHJvcG9nYXRpb24gb24gdGhlIGV2ZW50XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7RXZlbnR9IGVcbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2ZpcmVDYWxsYmFjayhjYWxsYmFjaywgZSkge1xuICAgICAgICBpZiAoY2FsbGJhY2soZSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaGFuZGxlcyBhIGNoYXJhY3RlciBrZXkgZXZlbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjaGFyYWN0ZXJcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9oYW5kbGVDaGFyYWN0ZXIoY2hhcmFjdGVyLCBlKSB7XG5cbiAgICAgICAgLy8gaWYgdGhpcyBldmVudCBzaG91bGQgbm90IGhhcHBlbiBzdG9wIGhlcmVcbiAgICAgICAgaWYgKE1vdXNldHJhcC5zdG9wQ2FsbGJhY2soZSwgZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNhbGxiYWNrcyA9IF9nZXRNYXRjaGVzKGNoYXJhY3RlciwgX2V2ZW50TW9kaWZpZXJzKGUpLCBlKSxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBkb19ub3RfcmVzZXQgPSB7fSxcbiAgICAgICAgICAgIHByb2Nlc3NlZF9zZXF1ZW5jZV9jYWxsYmFjayA9IGZhbHNlO1xuXG4gICAgICAgIC8vIGxvb3AgdGhyb3VnaCBtYXRjaGluZyBjYWxsYmFja3MgZm9yIHRoaXMga2V5IGV2ZW50XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyArK2kpIHtcblxuICAgICAgICAgICAgLy8gZmlyZSBmb3IgYWxsIHNlcXVlbmNlIGNhbGxiYWNrc1xuICAgICAgICAgICAgLy8gdGhpcyBpcyBiZWNhdXNlIGlmIGZvciBleGFtcGxlIHlvdSBoYXZlIG11bHRpcGxlIHNlcXVlbmNlc1xuICAgICAgICAgICAgLy8gYm91bmQgc3VjaCBhcyBcImcgaVwiIGFuZCBcImcgdFwiIHRoZXkgYm90aCBuZWVkIHRvIGZpcmUgdGhlXG4gICAgICAgICAgICAvLyBjYWxsYmFjayBmb3IgbWF0Y2hpbmcgZyBjYXVzZSBvdGhlcndpc2UgeW91IGNhbiBvbmx5IGV2ZXJcbiAgICAgICAgICAgIC8vIG1hdGNoIHRoZSBmaXJzdCBvbmVcbiAgICAgICAgICAgIGlmIChjYWxsYmFja3NbaV0uc2VxKSB7XG4gICAgICAgICAgICAgICAgcHJvY2Vzc2VkX3NlcXVlbmNlX2NhbGxiYWNrID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIC8vIGtlZXAgYSBsaXN0IG9mIHdoaWNoIHNlcXVlbmNlcyB3ZXJlIG1hdGNoZXMgZm9yIGxhdGVyXG4gICAgICAgICAgICAgICAgZG9fbm90X3Jlc2V0W2NhbGxiYWNrc1tpXS5zZXFdID0gMTtcbiAgICAgICAgICAgICAgICBfZmlyZUNhbGxiYWNrKGNhbGxiYWNrc1tpXS5jYWxsYmFjaywgZSk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZXJlIHdlcmUgbm8gc2VxdWVuY2UgbWF0Y2hlcyBidXQgd2UgYXJlIHN0aWxsIGhlcmVcbiAgICAgICAgICAgIC8vIHRoYXQgbWVhbnMgdGhpcyBpcyBhIHJlZ3VsYXIgbWF0Y2ggc28gd2Ugc2hvdWxkIGZpcmUgdGhhdFxuICAgICAgICAgICAgaWYgKCFwcm9jZXNzZWRfc2VxdWVuY2VfY2FsbGJhY2sgJiYgIV9pbnNpZGVfc2VxdWVuY2UpIHtcbiAgICAgICAgICAgICAgICBfZmlyZUNhbGxiYWNrKGNhbGxiYWNrc1tpXS5jYWxsYmFjaywgZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiB5b3UgYXJlIGluc2lkZSBvZiBhIHNlcXVlbmNlIGFuZCB0aGUga2V5IHlvdSBhcmUgcHJlc3NpbmdcbiAgICAgICAgLy8gaXMgbm90IGEgbW9kaWZpZXIga2V5IHRoZW4gd2Ugc2hvdWxkIHJlc2V0IGFsbCBzZXF1ZW5jZXNcbiAgICAgICAgLy8gdGhhdCB3ZXJlIG5vdCBtYXRjaGVkIGJ5IHRoaXMga2V5IGV2ZW50XG4gICAgICAgIGlmIChlLnR5cGUgPT0gX2luc2lkZV9zZXF1ZW5jZSAmJiAhX2lzTW9kaWZpZXIoY2hhcmFjdGVyKSkge1xuICAgICAgICAgICAgX3Jlc2V0U2VxdWVuY2VzKGRvX25vdF9yZXNldCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBoYW5kbGVzIGEga2V5ZG93biBldmVudFxuICAgICAqXG4gICAgICogQHBhcmFtIHtFdmVudH0gZVxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfaGFuZGxlS2V5KGUpIHtcblxuICAgICAgICAvLyBub3JtYWxpemUgZS53aGljaCBmb3Iga2V5IGV2ZW50c1xuICAgICAgICAvLyBAc2VlIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNDI4NTYyNy9qYXZhc2NyaXB0LWtleWNvZGUtdnMtY2hhcmNvZGUtdXR0ZXItY29uZnVzaW9uXG4gICAgICAgIGUud2hpY2ggPSB0eXBlb2YgZS53aGljaCA9PSBcIm51bWJlclwiID8gZS53aGljaCA6IGUua2V5Q29kZTtcblxuICAgICAgICB2YXIgY2hhcmFjdGVyID0gX2NoYXJhY3RlckZyb21FdmVudChlKTtcblxuICAgICAgICAvLyBubyBjaGFyYWN0ZXIgZm91bmQgdGhlbiBzdG9wXG4gICAgICAgIGlmICghY2hhcmFjdGVyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZS50eXBlID09ICdrZXl1cCcgJiYgX2lnbm9yZV9uZXh0X2tleXVwID09IGNoYXJhY3Rlcikge1xuICAgICAgICAgICAgX2lnbm9yZV9uZXh0X2tleXVwID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBfaGFuZGxlQ2hhcmFjdGVyKGNoYXJhY3RlciwgZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGV0ZXJtaW5lcyBpZiB0aGUga2V5Y29kZSBzcGVjaWZpZWQgaXMgYSBtb2RpZmllciBrZXkgb3Igbm90XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2lzTW9kaWZpZXIoa2V5KSB7XG4gICAgICAgIHJldHVybiBrZXkgPT0gJ3NoaWZ0JyB8fCBrZXkgPT0gJ2N0cmwnIHx8IGtleSA9PSAnYWx0JyB8fCBrZXkgPT0gJ21ldGEnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNhbGxlZCB0byBzZXQgYSAxIHNlY29uZCB0aW1lb3V0IG9uIHRoZSBzcGVjaWZpZWQgc2VxdWVuY2VcbiAgICAgKlxuICAgICAqIHRoaXMgaXMgc28gYWZ0ZXIgZWFjaCBrZXkgcHJlc3MgaW4gdGhlIHNlcXVlbmNlIHlvdSBoYXZlIDEgc2Vjb25kXG4gICAgICogdG8gcHJlc3MgdGhlIG5leHQga2V5IGJlZm9yZSB5b3UgaGF2ZSB0byBzdGFydCBvdmVyXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gX3Jlc2V0U2VxdWVuY2VUaW1lcigpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KF9yZXNldF90aW1lcik7XG4gICAgICAgIF9yZXNldF90aW1lciA9IHNldFRpbWVvdXQoX3Jlc2V0U2VxdWVuY2VzLCAxMDAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXZlcnNlcyB0aGUgbWFwIGxvb2t1cCBzbyB0aGF0IHdlIGNhbiBsb29rIGZvciBzcGVjaWZpYyBrZXlzXG4gICAgICogdG8gc2VlIHdoYXQgY2FuIGFuZCBjYW4ndCB1c2Uga2V5cHJlc3NcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge09iamVjdH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmV2ZXJzZU1hcCgpIHtcbiAgICAgICAgaWYgKCFfUkVWRVJTRV9NQVApIHtcbiAgICAgICAgICAgIF9SRVZFUlNFX01BUCA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIF9NQVApIHtcblxuICAgICAgICAgICAgICAgIC8vIHB1bGwgb3V0IHRoZSBudW1lcmljIGtleXBhZCBmcm9tIGhlcmUgY2F1c2Uga2V5cHJlc3Mgc2hvdWxkXG4gICAgICAgICAgICAgICAgLy8gYmUgYWJsZSB0byBkZXRlY3QgdGhlIGtleXMgZnJvbSB0aGUgY2hhcmFjdGVyXG4gICAgICAgICAgICAgICAgaWYgKGtleSA+IDk1ICYmIGtleSA8IDExMikge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoX01BUC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIF9SRVZFUlNFX01BUFtfTUFQW2tleV1dID0ga2V5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gX1JFVkVSU0VfTUFQO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHBpY2tzIHRoZSBiZXN0IGFjdGlvbiBiYXNlZCBvbiB0aGUga2V5IGNvbWJpbmF0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IC0gY2hhcmFjdGVyIGZvciBrZXlcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBtb2RpZmllcnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZz19IGFjdGlvbiBwYXNzZWQgaW5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfcGlja0Jlc3RBY3Rpb24oa2V5LCBtb2RpZmllcnMsIGFjdGlvbikge1xuXG4gICAgICAgIC8vIGlmIG5vIGFjdGlvbiB3YXMgcGlja2VkIGluIHdlIHNob3VsZCB0cnkgdG8gcGljayB0aGUgb25lXG4gICAgICAgIC8vIHRoYXQgd2UgdGhpbmsgd291bGQgd29yayBiZXN0IGZvciB0aGlzIGtleVxuICAgICAgICBpZiAoIWFjdGlvbikge1xuICAgICAgICAgICAgYWN0aW9uID0gX2dldFJldmVyc2VNYXAoKVtrZXldID8gJ2tleWRvd24nIDogJ2tleXByZXNzJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG1vZGlmaWVyIGtleXMgZG9uJ3Qgd29yayBhcyBleHBlY3RlZCB3aXRoIGtleXByZXNzLFxuICAgICAgICAvLyBzd2l0Y2ggdG8ga2V5ZG93blxuICAgICAgICBpZiAoYWN0aW9uID09ICdrZXlwcmVzcycgJiYgbW9kaWZpZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgYWN0aW9uID0gJ2tleWRvd24nO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGFjdGlvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBiaW5kcyBhIGtleSBzZXF1ZW5jZSB0byBhbiBldmVudFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbWJvIC0gY29tYm8gc3BlY2lmaWVkIGluIGJpbmQgY2FsbFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGtleXNcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7c3RyaW5nPX0gYWN0aW9uXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9iaW5kU2VxdWVuY2UoY29tYm8sIGtleXMsIGNhbGxiYWNrLCBhY3Rpb24pIHtcblxuICAgICAgICAvLyBzdGFydCBvZmYgYnkgYWRkaW5nIGEgc2VxdWVuY2UgbGV2ZWwgcmVjb3JkIGZvciB0aGlzIGNvbWJpbmF0aW9uXG4gICAgICAgIC8vIGFuZCBzZXR0aW5nIHRoZSBsZXZlbCB0byAwXG4gICAgICAgIF9zZXF1ZW5jZV9sZXZlbHNbY29tYm9dID0gMDtcblxuICAgICAgICAvLyBpZiB0aGVyZSBpcyBubyBhY3Rpb24gcGljayB0aGUgYmVzdCBvbmUgZm9yIHRoZSBmaXJzdCBrZXlcbiAgICAgICAgLy8gaW4gdGhlIHNlcXVlbmNlXG4gICAgICAgIGlmICghYWN0aW9uKSB7XG4gICAgICAgICAgICBhY3Rpb24gPSBfcGlja0Jlc3RBY3Rpb24oa2V5c1swXSwgW10pO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIGNhbGxiYWNrIHRvIGluY3JlYXNlIHRoZSBzZXF1ZW5jZSBsZXZlbCBmb3IgdGhpcyBzZXF1ZW5jZSBhbmQgcmVzZXRcbiAgICAgICAgICogYWxsIG90aGVyIHNlcXVlbmNlcyB0aGF0IHdlcmUgYWN0aXZlXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGVcbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIF9pbmNyZWFzZVNlcXVlbmNlID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIF9pbnNpZGVfc2VxdWVuY2UgPSBhY3Rpb247XG4gICAgICAgICAgICAgICAgKytfc2VxdWVuY2VfbGV2ZWxzW2NvbWJvXTtcbiAgICAgICAgICAgICAgICBfcmVzZXRTZXF1ZW5jZVRpbWVyKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIHdyYXBzIHRoZSBzcGVjaWZpZWQgY2FsbGJhY2sgaW5zaWRlIG9mIGFub3RoZXIgZnVuY3Rpb24gaW4gb3JkZXJcbiAgICAgICAgICAgICAqIHRvIHJlc2V0IGFsbCBzZXF1ZW5jZSBjb3VudGVycyBhcyBzb29uIGFzIHRoaXMgc2VxdWVuY2UgaXMgZG9uZVxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGVcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX2NhbGxiYWNrQW5kUmVzZXQgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgX2ZpcmVDYWxsYmFjayhjYWxsYmFjaywgZSk7XG5cbiAgICAgICAgICAgICAgICAvLyB3ZSBzaG91bGQgaWdub3JlIHRoZSBuZXh0IGtleSB1cCBpZiB0aGUgYWN0aW9uIGlzIGtleSBkb3duXG4gICAgICAgICAgICAgICAgLy8gb3Iga2V5cHJlc3MuICB0aGlzIGlzIHNvIGlmIHlvdSBmaW5pc2ggYSBzZXF1ZW5jZSBhbmRcbiAgICAgICAgICAgICAgICAvLyByZWxlYXNlIHRoZSBrZXkgdGhlIGZpbmFsIGtleSB3aWxsIG5vdCB0cmlnZ2VyIGEga2V5dXBcbiAgICAgICAgICAgICAgICBpZiAoYWN0aW9uICE9PSAna2V5dXAnKSB7XG4gICAgICAgICAgICAgICAgICAgIF9pZ25vcmVfbmV4dF9rZXl1cCA9IF9jaGFyYWN0ZXJGcm9tRXZlbnQoZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gd2VpcmQgcmFjZSBjb25kaXRpb24gaWYgYSBzZXF1ZW5jZSBlbmRzIHdpdGggdGhlIGtleVxuICAgICAgICAgICAgICAgIC8vIGFub3RoZXIgc2VxdWVuY2UgYmVnaW5zIHdpdGhcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KF9yZXNldFNlcXVlbmNlcywgMTApO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGk7XG5cbiAgICAgICAgLy8gbG9vcCB0aHJvdWdoIGtleXMgb25lIGF0IGEgdGltZSBhbmQgYmluZCB0aGUgYXBwcm9wcmlhdGUgY2FsbGJhY2tcbiAgICAgICAgLy8gZnVuY3Rpb24uICBmb3IgYW55IGtleSBsZWFkaW5nIHVwIHRvIHRoZSBmaW5hbCBvbmUgaXQgc2hvdWxkXG4gICAgICAgIC8vIGluY3JlYXNlIHRoZSBzZXF1ZW5jZS4gYWZ0ZXIgdGhlIGZpbmFsLCBpdCBzaG91bGQgcmVzZXQgYWxsIHNlcXVlbmNlc1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgX2JpbmRTaW5nbGUoa2V5c1tpXSwgaSA8IGtleXMubGVuZ3RoIC0gMSA/IF9pbmNyZWFzZVNlcXVlbmNlIDogX2NhbGxiYWNrQW5kUmVzZXQsIGFjdGlvbiwgY29tYm8sIGkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogYmluZHMgYSBzaW5nbGUga2V5Ym9hcmQgY29tYmluYXRpb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb21iaW5hdGlvblxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtzdHJpbmc9fSBhY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZz19IHNlcXVlbmNlX25hbWUgLSBuYW1lIG9mIHNlcXVlbmNlIGlmIHBhcnQgb2Ygc2VxdWVuY2VcbiAgICAgKiBAcGFyYW0ge251bWJlcj19IGxldmVsIC0gd2hhdCBwYXJ0IG9mIHRoZSBzZXF1ZW5jZSB0aGUgY29tbWFuZCBpc1xuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfYmluZFNpbmdsZShjb21iaW5hdGlvbiwgY2FsbGJhY2ssIGFjdGlvbiwgc2VxdWVuY2VfbmFtZSwgbGV2ZWwpIHtcblxuICAgICAgICAvLyBtYWtlIHN1cmUgbXVsdGlwbGUgc3BhY2VzIGluIGEgcm93IGJlY29tZSBhIHNpbmdsZSBzcGFjZVxuICAgICAgICBjb21iaW5hdGlvbiA9IGNvbWJpbmF0aW9uLnJlcGxhY2UoL1xccysvZywgJyAnKTtcblxuICAgICAgICB2YXIgc2VxdWVuY2UgPSBjb21iaW5hdGlvbi5zcGxpdCgnICcpLFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIGtleSxcbiAgICAgICAgICAgIGtleXMsXG4gICAgICAgICAgICBtb2RpZmllcnMgPSBbXTtcblxuICAgICAgICAvLyBpZiB0aGlzIHBhdHRlcm4gaXMgYSBzZXF1ZW5jZSBvZiBrZXlzIHRoZW4gcnVuIHRocm91Z2ggdGhpcyBtZXRob2RcbiAgICAgICAgLy8gdG8gcmVwcm9jZXNzIGVhY2ggcGF0dGVybiBvbmUga2V5IGF0IGEgdGltZVxuICAgICAgICBpZiAoc2VxdWVuY2UubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgX2JpbmRTZXF1ZW5jZShjb21iaW5hdGlvbiwgc2VxdWVuY2UsIGNhbGxiYWNrLCBhY3Rpb24pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdGFrZSB0aGUga2V5cyBmcm9tIHRoaXMgcGF0dGVybiBhbmQgZmlndXJlIG91dCB3aGF0IHRoZSBhY3R1YWxcbiAgICAgICAgLy8gcGF0dGVybiBpcyBhbGwgYWJvdXRcbiAgICAgICAga2V5cyA9IGNvbWJpbmF0aW9uID09PSAnKycgPyBbJysnXSA6IGNvbWJpbmF0aW9uLnNwbGl0KCcrJyk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGtleSA9IGtleXNbaV07XG5cbiAgICAgICAgICAgIC8vIG5vcm1hbGl6ZSBrZXkgbmFtZXNcbiAgICAgICAgICAgIGlmIChfU1BFQ0lBTF9BTElBU0VTW2tleV0pIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBfU1BFQ0lBTF9BTElBU0VTW2tleV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHRoaXMgaXMgbm90IGEga2V5cHJlc3MgZXZlbnQgdGhlbiB3ZSBzaG91bGRcbiAgICAgICAgICAgIC8vIGJlIHNtYXJ0IGFib3V0IHVzaW5nIHNoaWZ0IGtleXNcbiAgICAgICAgICAgIC8vIHRoaXMgd2lsbCBvbmx5IHdvcmsgZm9yIFVTIGtleWJvYXJkcyBob3dldmVyXG4gICAgICAgICAgICBpZiAoYWN0aW9uICYmIGFjdGlvbiAhPSAna2V5cHJlc3MnICYmIF9TSElGVF9NQVBba2V5XSkge1xuICAgICAgICAgICAgICAgIGtleSA9IF9TSElGVF9NQVBba2V5XTtcbiAgICAgICAgICAgICAgICBtb2RpZmllcnMucHVzaCgnc2hpZnQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdGhpcyBrZXkgaXMgYSBtb2RpZmllciB0aGVuIGFkZCBpdCB0byB0aGUgbGlzdCBvZiBtb2RpZmllcnNcbiAgICAgICAgICAgIGlmIChfaXNNb2RpZmllcihrZXkpKSB7XG4gICAgICAgICAgICAgICAgbW9kaWZpZXJzLnB1c2goa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGRlcGVuZGluZyBvbiB3aGF0IHRoZSBrZXkgY29tYmluYXRpb24gaXNcbiAgICAgICAgLy8gd2Ugd2lsbCB0cnkgdG8gcGljayB0aGUgYmVzdCBldmVudCBmb3IgaXRcbiAgICAgICAgYWN0aW9uID0gX3BpY2tCZXN0QWN0aW9uKGtleSwgbW9kaWZpZXJzLCBhY3Rpb24pO1xuXG4gICAgICAgIC8vIG1ha2Ugc3VyZSB0byBpbml0aWFsaXplIGFycmF5IGlmIHRoaXMgaXMgdGhlIGZpcnN0IHRpbWVcbiAgICAgICAgLy8gYSBjYWxsYmFjayBpcyBhZGRlZCBmb3IgdGhpcyBrZXlcbiAgICAgICAgaWYgKCFfY2FsbGJhY2tzW2tleV0pIHtcbiAgICAgICAgICAgIF9jYWxsYmFja3Nba2V5XSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmVtb3ZlIGFuIGV4aXN0aW5nIG1hdGNoIGlmIHRoZXJlIGlzIG9uZVxuICAgICAgICBfZ2V0TWF0Y2hlcyhrZXksIG1vZGlmaWVycywge3R5cGU6IGFjdGlvbn0sICFzZXF1ZW5jZV9uYW1lLCBjb21iaW5hdGlvbik7XG5cbiAgICAgICAgLy8gYWRkIHRoaXMgY2FsbCBiYWNrIHRvIHRoZSBhcnJheVxuICAgICAgICAvLyBpZiBpdCBpcyBhIHNlcXVlbmNlIHB1dCBpdCBhdCB0aGUgYmVnaW5uaW5nXG4gICAgICAgIC8vIGlmIG5vdCBwdXQgaXQgYXQgdGhlIGVuZFxuICAgICAgICAvL1xuICAgICAgICAvLyB0aGlzIGlzIGltcG9ydGFudCBiZWNhdXNlIHRoZSB3YXkgdGhlc2UgYXJlIHByb2Nlc3NlZCBleHBlY3RzXG4gICAgICAgIC8vIHRoZSBzZXF1ZW5jZSBvbmVzIHRvIGNvbWUgZmlyc3RcbiAgICAgICAgX2NhbGxiYWNrc1trZXldW3NlcXVlbmNlX25hbWUgPyAndW5zaGlmdCcgOiAncHVzaCddKHtcbiAgICAgICAgICAgIGNhbGxiYWNrOiBjYWxsYmFjayxcbiAgICAgICAgICAgIG1vZGlmaWVyczogbW9kaWZpZXJzLFxuICAgICAgICAgICAgYWN0aW9uOiBhY3Rpb24sXG4gICAgICAgICAgICBzZXE6IHNlcXVlbmNlX25hbWUsXG4gICAgICAgICAgICBsZXZlbDogbGV2ZWwsXG4gICAgICAgICAgICBjb21ibzogY29tYmluYXRpb25cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogYmluZHMgbXVsdGlwbGUgY29tYmluYXRpb25zIHRvIHRoZSBzYW1lIGNhbGxiYWNrXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb21iaW5hdGlvbnNcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfHVuZGVmaW5lZH0gYWN0aW9uXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9iaW5kTXVsdGlwbGUoY29tYmluYXRpb25zLCBjYWxsYmFjaywgYWN0aW9uKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29tYmluYXRpb25zLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBfYmluZFNpbmdsZShjb21iaW5hdGlvbnNbaV0sIGNhbGxiYWNrLCBhY3Rpb24pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gc3RhcnQhXG4gICAgX2FkZEV2ZW50KGRvY3VtZW50LCAna2V5cHJlc3MnLCBfaGFuZGxlS2V5KTtcbiAgICBfYWRkRXZlbnQoZG9jdW1lbnQsICdrZXlkb3duJywgX2hhbmRsZUtleSk7XG4gICAgX2FkZEV2ZW50KGRvY3VtZW50LCAna2V5dXAnLCBfaGFuZGxlS2V5KTtcblxuICAgIHZhciBNb3VzZXRyYXAgPSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIGJpbmRzIGFuIGV2ZW50IHRvIG1vdXNldHJhcFxuICAgICAgICAgKlxuICAgICAgICAgKiBjYW4gYmUgYSBzaW5nbGUga2V5LCBhIGNvbWJpbmF0aW9uIG9mIGtleXMgc2VwYXJhdGVkIHdpdGggKyxcbiAgICAgICAgICogYW4gYXJyYXkgb2Yga2V5cywgb3IgYSBzZXF1ZW5jZSBvZiBrZXlzIHNlcGFyYXRlZCBieSBzcGFjZXNcbiAgICAgICAgICpcbiAgICAgICAgICogYmUgc3VyZSB0byBsaXN0IHRoZSBtb2RpZmllciBrZXlzIGZpcnN0IHRvIG1ha2Ugc3VyZSB0aGF0IHRoZVxuICAgICAgICAgKiBjb3JyZWN0IGtleSBlbmRzIHVwIGdldHRpbmcgYm91bmQgKHRoZSBsYXN0IGtleSBpbiB0aGUgcGF0dGVybilcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd8QXJyYXl9IGtleXNcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmc9fSBhY3Rpb24gLSAna2V5cHJlc3MnLCAna2V5ZG93bicsIG9yICdrZXl1cCdcbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgYmluZDogZnVuY3Rpb24oa2V5cywgY2FsbGJhY2ssIGFjdGlvbikge1xuICAgICAgICAgICAgX2JpbmRNdWx0aXBsZShrZXlzIGluc3RhbmNlb2YgQXJyYXkgPyBrZXlzIDogW2tleXNdLCBjYWxsYmFjaywgYWN0aW9uKTtcbiAgICAgICAgICAgIF9kaXJlY3RfbWFwW2tleXMgKyAnOicgKyBhY3Rpb25dID0gY2FsbGJhY2s7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogdW5iaW5kcyBhbiBldmVudCB0byBtb3VzZXRyYXBcbiAgICAgICAgICpcbiAgICAgICAgICogdGhlIHVuYmluZGluZyBzZXRzIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgc3BlY2lmaWVkIGtleSBjb21ib1xuICAgICAgICAgKiB0byBhbiBlbXB0eSBmdW5jdGlvbiBhbmQgZGVsZXRlcyB0aGUgY29ycmVzcG9uZGluZyBrZXkgaW4gdGhlXG4gICAgICAgICAqIF9kaXJlY3RfbWFwIGRpY3QuXG4gICAgICAgICAqXG4gICAgICAgICAqIHRoZSBrZXljb21ibythY3Rpb24gaGFzIHRvIGJlIGV4YWN0bHkgdGhlIHNhbWUgYXNcbiAgICAgICAgICogaXQgd2FzIGRlZmluZWQgaW4gdGhlIGJpbmQgbWV0aG9kXG4gICAgICAgICAqXG4gICAgICAgICAqIFRPRE86IGFjdHVhbGx5IHJlbW92ZSB0aGlzIGZyb20gdGhlIF9jYWxsYmFja3MgZGljdGlvbmFyeSBpbnN0ZWFkXG4gICAgICAgICAqIG9mIGJpbmRpbmcgYW4gZW1wdHkgZnVuY3Rpb25cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd8QXJyYXl9IGtleXNcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvblxuICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAqL1xuICAgICAgICB1bmJpbmQ6IGZ1bmN0aW9uKGtleXMsIGFjdGlvbikge1xuICAgICAgICAgICAgaWYgKF9kaXJlY3RfbWFwW2tleXMgKyAnOicgKyBhY3Rpb25dKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIF9kaXJlY3RfbWFwW2tleXMgKyAnOicgKyBhY3Rpb25dO1xuICAgICAgICAgICAgICAgIHRoaXMuYmluZChrZXlzLCBmdW5jdGlvbigpIHt9LCBhY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHRyaWdnZXJzIGFuIGV2ZW50IHRoYXQgaGFzIGFscmVhZHkgYmVlbiBib3VuZFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5c1xuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZz19IGFjdGlvblxuICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAqL1xuICAgICAgICB0cmlnZ2VyOiBmdW5jdGlvbihrZXlzLCBhY3Rpb24pIHtcbiAgICAgICAgICAgIF9kaXJlY3RfbWFwW2tleXMgKyAnOicgKyBhY3Rpb25dKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogcmVzZXRzIHRoZSBsaWJyYXJ5IGJhY2sgdG8gaXRzIGluaXRpYWwgc3RhdGUuICB0aGlzIGlzIHVzZWZ1bFxuICAgICAgICAgKiBpZiB5b3Ugd2FudCB0byBjbGVhciBvdXQgdGhlIGN1cnJlbnQga2V5Ym9hcmQgc2hvcnRjdXRzIGFuZCBiaW5kXG4gICAgICAgICAqIG5ldyBvbmVzIC0gZm9yIGV4YW1wbGUgaWYgeW91IHN3aXRjaCB0byBhbm90aGVyIHBhZ2VcbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX2NhbGxiYWNrcyA9IHt9O1xuICAgICAgICAgICAgX2RpcmVjdF9tYXAgPSB7fTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgLyoqXG4gICAgICAgICogc2hvdWxkIHdlIHN0b3AgdGhpcyBldmVudCBiZWZvcmUgZmlyaW5nIG9mZiBjYWxsYmFja3NcbiAgICAgICAgKlxuICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGVcbiAgICAgICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnRcbiAgICAgICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgICAgICAqL1xuICAgICAgICBzdG9wQ2FsbGJhY2s6IGZ1bmN0aW9uKGUsIGVsZW1lbnQpIHtcblxuICAgICAgICAgICAgLy8gaWYgdGhlIGVsZW1lbnQgaGFzIHRoZSBjbGFzcyBcIm1vdXNldHJhcFwiIHRoZW4gbm8gbmVlZCB0byBzdG9wXG4gICAgICAgICAgICBpZiAoKCcgJyArIGVsZW1lbnQuY2xhc3NOYW1lICsgJyAnKS5pbmRleE9mKCcgbW91c2V0cmFwICcpID4gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHN0b3AgZm9yIGlucHV0LCBzZWxlY3QsIGFuZCB0ZXh0YXJlYVxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQudGFnTmFtZSA9PSAnSU5QVVQnIHx8IGVsZW1lbnQudGFnTmFtZSA9PSAnU0VMRUNUJyB8fCBlbGVtZW50LnRhZ05hbWUgPT0gJ1RFWFRBUkVBJyB8fCAoZWxlbWVudC5jb250ZW50RWRpdGFibGUgJiYgZWxlbWVudC5jb250ZW50RWRpdGFibGUgPT0gJ3RydWUnKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBleHBvc2UgbW91c2V0cmFwIHRvIHRoZSBnbG9iYWwgb2JqZWN0XG4gICAgd2luZG93Lk1vdXNldHJhcCA9IE1vdXNldHJhcDtcblxuICAgIC8vIGV4cG9zZSBtb3VzZXRyYXAgYXMgYW4gQU1EIG1vZHVsZVxuICAgIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoJ21vdXNldHJhcCcsIGZ1bmN0aW9uKCkgeyByZXR1cm4gTW91c2V0cmFwOyB9KTtcbiAgICB9XG4gICAgLy8gYnJvd3NlcmlmeSBzdXBwb3J0XG4gICAgaWYodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBNb3VzZXRyYXA7XG4gICAgfVxufSkgKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJvb3QgPSB0aGlzO1xuICAgIHZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cdHZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXHR2YXIgaW50ZXJ2YWxQYXJzZXIgPSAvKFswLTlcXC5dKykobXN8c3xtfGgpPy87XG5cdHZhciByb290ID0gZ2xvYmFsIHx8IHdpbmRvdztcblxuXHQvLyBMaWwgYml0IG9mIHVzZWZ1bCBwb2x5ZmlsbC4uLlxuXHRpZiAodHlwZW9mKEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cykgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0RnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzID0gZnVuY3Rpb24ocGFyZW50KSB7XG5cdFx0XHR0aGlzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUocGFyZW50LnByb3RvdHlwZSk7XG5cdFx0fTtcblx0fVxuXG5cdGlmICh0eXBlb2YoQXJyYXkucHJvdG90eXBlLnJlbW92ZU9uZSkgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0QXJyYXkucHJvdG90eXBlLnJlbW92ZU9uZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHdoYXQsIGEgPSBhcmd1bWVudHMsIEwgPSBhLmxlbmd0aCwgYXg7XG5cdFx0XHR3aGlsZSAoTCAmJiB0aGlzLmxlbmd0aCkge1xuXHRcdFx0XHR3aGF0ID0gYVstLUxdO1xuXHRcdFx0XHR3aGlsZSAoKGF4ID0gdGhpcy5pbmRleE9mKHdoYXQpKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zcGxpY2UoYXgsIDEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdyZWF0ZXN0Q29tbW9uRmFjdG9yKGludGVydmFscykge1xuXHRcdHZhciBzdW1PZk1vZHVsaSA9IDE7XG5cdFx0dmFyIGludGVydmFsID0gXy5taW4oaW50ZXJ2YWxzKTtcblx0XHR3aGlsZSAoc3VtT2ZNb2R1bGkgIT09IDApIHtcblx0XHRcdHN1bU9mTW9kdWxpID0gXy5yZWR1Y2UoaW50ZXJ2YWxzLCBmdW5jdGlvbihtZW1vLCBpKXsgcmV0dXJuIG1lbW8gKyAoaSAlIGludGVydmFsKTsgfSwgMCk7XG5cdFx0XHRpZiAoc3VtT2ZNb2R1bGkgIT09IDApIHtcblx0XHRcdFx0aW50ZXJ2YWwgLT0gMTA7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBpbnRlcnZhbDtcblx0fVxuXG5cdGZ1bmN0aW9uIHBhcnNlRXZlbnQoZSkge1xuXHRcdHZhciBpbnRlcnZhbEdyb3VwcyA9IGludGVydmFsUGFyc2VyLmV4ZWMoZSk7XG5cdFx0aWYgKCFpbnRlcnZhbEdyb3Vwcykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJIGRvblxcJ3QgdW5kZXJzdGFuZCB0aGF0IHBhcnRpY3VsYXIgaW50ZXJ2YWwnKTtcblx0XHR9XG5cdFx0dmFyIGludGVydmFsQW1vdW50ID0gK2ludGVydmFsR3JvdXBzWzFdO1xuXHRcdHZhciBpbnRlcnZhbFR5cGUgPSBpbnRlcnZhbEdyb3Vwc1syXSB8fCAnbXMnO1xuXHRcdGlmIChpbnRlcnZhbFR5cGUgPT09ICdzJykge1xuXHRcdFx0aW50ZXJ2YWxBbW91bnQgPSBpbnRlcnZhbEFtb3VudCAqIDEwMDA7XG5cdFx0fSBlbHNlIGlmIChpbnRlcnZhbFR5cGUgPT09ICdtJykge1xuXHRcdFx0aW50ZXJ2YWxBbW91bnQgPSBpbnRlcnZhbEFtb3VudCAqIDEwMDAgKiA2MDtcblx0XHR9IGVsc2UgaWYgKGludGVydmFsVHlwZSA9PT0gJ2gnKSB7XG5cdFx0XHRpbnRlcnZhbEFtb3VudCA9IGludGVydmFsQW1vdW50ICogMTAwMCAqIDYwICogNjA7XG5cdFx0fSBlbHNlIGlmICghIWludGVydmFsVHlwZSAmJiBpbnRlcnZhbFR5cGUgIT09ICdtcycpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignWW91IGNhbiBvbmx5IHNwZWNpZnkgaW50ZXJ2YWxzIG9mIG1zLCBzLCBtLCBvciBoJyk7XG5cdFx0fVxuXHRcdGlmIChpbnRlcnZhbEFtb3VudCA8IDEwIHx8IGludGVydmFsQW1vdW50ICUgMTAgIT09IDApIHtcblx0XHRcdC8vIFdlIG9ubHkgZGVhbCBpbiAxMCdzIG9mIG1pbGxpc2Vjb25kcyBmb3Igc2ltcGxpY2l0eVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdZb3UgY2FuIG9ubHkgc3BlY2lmeSAxMHMgb2YgbWlsbGlzZWNvbmRzLCB0cnVzdCBtZSBvbiB0aGlzIG9uZScpO1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0YW1vdW50OmludGVydmFsQW1vdW50LFxuXHRcdFx0dHlwZTppbnRlcnZhbFR5cGVcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gRXZlbnRlZExvb3AoKSB7XG5cdFx0dGhpcy5pbnRlcnZhbElkID0gdW5kZWZpbmVkO1xuXHRcdHRoaXMuaW50ZXJ2YWxMZW5ndGggPSB1bmRlZmluZWQ7XG5cdFx0dGhpcy5pbnRlcnZhbHNUb0VtaXQgPSB7fTtcblx0XHR0aGlzLmN1cnJlbnRUaWNrID0gMTtcblx0XHR0aGlzLm1heFRpY2tzID0gMDtcblx0XHR0aGlzLmxpc3RlbmluZ0ZvckZvY3VzID0gZmFsc2U7XG5cblx0XHQvLyBQcml2YXRlIG1ldGhvZFxuXHRcdHZhciBkZXRlcm1pbmVJbnRlcnZhbExlbmd0aCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciBwb3RlbnRpYWxJbnRlcnZhbExlbmd0aCA9IGdyZWF0ZXN0Q29tbW9uRmFjdG9yKF8ua2V5cyh0aGlzLmludGVydmFsc1RvRW1pdCkpO1xuXHRcdFx0dmFyIGNoYW5nZWQgPSBmYWxzZTtcblxuXHRcdFx0aWYgKHRoaXMuaW50ZXJ2YWxMZW5ndGgpIHtcblx0XHRcdFx0aWYgKHBvdGVudGlhbEludGVydmFsTGVuZ3RoICE9PSB0aGlzLmludGVydmFsTGVuZ3RoKSB7XG5cdFx0XHRcdFx0Ly8gTG9va3MgbGlrZSB3ZSBuZWVkIGEgbmV3IGludGVydmFsXG5cdFx0XHRcdFx0dGhpcy5pbnRlcnZhbExlbmd0aCA9IHBvdGVudGlhbEludGVydmFsTGVuZ3RoO1xuXHRcdFx0XHRcdGNoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLmludGVydmFsTGVuZ3RoID0gcG90ZW50aWFsSW50ZXJ2YWxMZW5ndGg7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMubWF4VGlja3MgPSBfLm1heChfLm1hcChfLmtleXModGhpcy5pbnRlcnZhbHNUb0VtaXQpLCBmdW5jdGlvbihhKSB7IHJldHVybiArYTsgfSkpIC8gdGhpcy5pbnRlcnZhbExlbmd0aDtcblx0XHRcdHJldHVybiBjaGFuZ2VkO1xuXHRcdH0uYmluZCh0aGlzKTtcblxuXHRcdHRoaXMub24oJ25ld0xpc3RlbmVyJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGlmIChlID09PSAncmVtb3ZlTGlzdGVuZXInIHx8IGUgPT09ICduZXdMaXN0ZW5lcicpIHJldHVybjsgLy8gV2UgZG9uJ3QgY2FyZSBhYm91dCB0aGF0IG9uZVxuXHRcdFx0dmFyIGludGVydmFsSW5mbyA9IHBhcnNlRXZlbnQoZSk7XG5cdFx0XHR2YXIgaW50ZXJ2YWxBbW91bnQgPSBpbnRlcnZhbEluZm8uYW1vdW50O1xuXG5cdFx0XHR0aGlzLmludGVydmFsc1RvRW1pdFsraW50ZXJ2YWxBbW91bnRdID0gXy51bmlvbih0aGlzLmludGVydmFsc1RvRW1pdFsraW50ZXJ2YWxBbW91bnRdIHx8IFtdLCBbZV0pO1xuXHRcdFx0XG5cdFx0XHRpZiAoZGV0ZXJtaW5lSW50ZXJ2YWxMZW5ndGgoKSAmJiB0aGlzLmlzU3RhcnRlZCgpKSB7XG5cdFx0XHRcdHRoaXMuc3RvcCgpLnN0YXJ0KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLm9uKCdyZW1vdmVMaXN0ZW5lcicsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRpZiAoRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQodGhpcywgZSkgPiAwKSByZXR1cm47XG5cdFx0XHR2YXIgaW50ZXJ2YWxJbmZvID0gcGFyc2VFdmVudChlKTtcblx0XHRcdHZhciBpbnRlcnZhbEFtb3VudCA9IGludGVydmFsSW5mby5hbW91bnQ7XG5cblx0XHRcdHZhciByZW1vdmVkRXZlbnQgPSB0aGlzLmludGVydmFsc1RvRW1pdFsraW50ZXJ2YWxBbW91bnRdLnJlbW92ZU9uZShlKTtcblx0XHRcdGlmICh0aGlzLmludGVydmFsc1RvRW1pdFsraW50ZXJ2YWxBbW91bnRdLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRkZWxldGUgdGhpcy5pbnRlcnZhbHNUb0VtaXRbK2ludGVydmFsQW1vdW50XTtcblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdEZXRlcm1pbmluZyBpbnRlcnZhbCBsZW5ndGggYWZ0ZXIgcmVtb3ZhbCBvZicsIHJlbW92ZWRFdmVudCk7XG5cdFx0XHRkZXRlcm1pbmVJbnRlcnZhbExlbmd0aCgpO1xuXG5cdFx0XHRpZiAoZGV0ZXJtaW5lSW50ZXJ2YWxMZW5ndGgoKSAmJiB0aGlzLmlzU3RhcnRlZCgpKSB7XG5cdFx0XHRcdHRoaXMuc3RvcCgpLnN0YXJ0KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRFdmVudGVkTG9vcC5pbmhlcml0cyhFdmVudEVtaXR0ZXIpO1xuXG5cdC8vIFB1YmxpYyBtZXRob2RzXG5cdEV2ZW50ZWRMb29wLnByb3RvdHlwZS50aWNrID0gZnVuY3Rpb24gKCkge1xuXHRcdHZhciBtaWxsaXNlY29uZHMgPSB0aGlzLmN1cnJlbnRUaWNrICogdGhpcy5pbnRlcnZhbExlbmd0aDtcblx0XHRfLmVhY2godGhpcy5pbnRlcnZhbHNUb0VtaXQsIGZ1bmN0aW9uIChldmVudHMsIGtleSkge1xuXHRcdFx0aWYgKG1pbGxpc2Vjb25kcyAlIGtleSA9PT0gMCkge1xuXHRcdFx0XHRfLmVhY2goZXZlbnRzLCBmdW5jdGlvbihlKSB7IHRoaXMuZW1pdChlLCBlLCBrZXkpOyB9LmJpbmQodGhpcykpO1xuXHRcdFx0fVxuXHRcdH0uYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5jdXJyZW50VGljayArPSAxO1xuXHRcdGlmICh0aGlzLmN1cnJlbnRUaWNrID4gdGhpcy5tYXhUaWNrcykge1xuXHRcdFx0dGhpcy5jdXJyZW50VGljayA9IDE7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdEV2ZW50ZWRMb29wLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIXRoaXMuaW50ZXJ2YWxMZW5ndGgpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignWW91IGhhdmVuXFwndCBzcGVjaWZpZWQgYW55IGludGVydmFsIGNhbGxiYWNrcy4gVXNlIEV2ZW50ZWRMb29wLm9uKFxcJzUwMG1zXFwnLCBmdW5jdGlvbiAoKSB7IC4uLiB9KSB0byBkbyBzbywgYW5kIHRoZW4geW91IGNhbiBzdGFydCcpO1xuXHRcdH1cblx0XHRpZiAodGhpcy5pbnRlcnZhbElkKSB7XG5cdFx0XHRyZXR1cm4gY29uc29sZS5sb2coJ05vIG5lZWQgdG8gc3RhcnQgdGhlIGxvb3AgYWdhaW4sIGl0XFwncyBhbHJlYWR5IHN0YXJ0ZWQuJyk7XG5cdFx0fVxuXG5cdFx0dGhpcy5pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwodGhpcy50aWNrLmJpbmQodGhpcyksIHRoaXMuaW50ZXJ2YWxMZW5ndGgpO1xuXG5cdFx0aWYgKHJvb3QgJiYgIXRoaXMubGlzdGVuaW5nRm9yRm9jdXMgJiYgcm9vdC5hZGRFdmVudExpc3RlbmVyKSB7XG5cdFx0XHRyb290LmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHRoaXMuc3RhcnQoKTtcblx0XHRcdH0uYmluZCh0aGlzKSk7XG5cblx0XHRcdHJvb3QuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aGlzLnN0b3AoKTtcblx0XHRcdH0uYmluZCh0aGlzKSk7XG5cblx0XHRcdHRoaXMubGlzdGVuaW5nRm9yRm9jdXMgPSB0cnVlO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRFdmVudGVkTG9vcC5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcblx0XHRjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWxJZCk7XG5cdFx0dGhpcy5pbnRlcnZhbElkID0gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdEV2ZW50ZWRMb29wLnByb3RvdHlwZS5pc1N0YXJ0ZWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuICEhdGhpcy5pbnRlcnZhbElkO1xuXHR9O1xuXG5cdEV2ZW50ZWRMb29wLnByb3RvdHlwZS5ldmVyeSA9IEV2ZW50ZWRMb29wLnByb3RvdHlwZS5vbjtcblxuICAgIC8vIEV4cG9ydCB0aGUgRXZlbnRlZExvb3Agb2JqZWN0IGZvciAqKk5vZGUuanMqKiBvciBvdGhlclxuICAgIC8vIGNvbW1vbmpzIHN5c3RlbXMuIE90aGVyd2lzZSwgYWRkIGl0IGFzIGEgZ2xvYmFsIG9iamVjdCB0byB0aGUgcm9vdFxuICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBFdmVudGVkTG9vcDtcbiAgICAgICAgfVxuICAgICAgICBleHBvcnRzLkV2ZW50ZWRMb29wID0gRXZlbnRlZExvb3A7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB3aW5kb3cuRXZlbnRlZExvb3AgPSBFdmVudGVkTG9vcDtcbiAgICB9XG59KS5jYWxsKHRoaXMpOyIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBSID0gdHlwZW9mIFJlZmxlY3QgPT09ICdvYmplY3QnID8gUmVmbGVjdCA6IG51bGxcbnZhciBSZWZsZWN0QXBwbHkgPSBSICYmIHR5cGVvZiBSLmFwcGx5ID09PSAnZnVuY3Rpb24nXG4gID8gUi5hcHBseVxuICA6IGZ1bmN0aW9uIFJlZmxlY3RBcHBseSh0YXJnZXQsIHJlY2VpdmVyLCBhcmdzKSB7XG4gICAgcmV0dXJuIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5jYWxsKHRhcmdldCwgcmVjZWl2ZXIsIGFyZ3MpO1xuICB9XG5cbnZhciBSZWZsZWN0T3duS2V5c1xuaWYgKFIgJiYgdHlwZW9mIFIub3duS2V5cyA9PT0gJ2Z1bmN0aW9uJykge1xuICBSZWZsZWN0T3duS2V5cyA9IFIub3duS2V5c1xufSBlbHNlIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG4gIFJlZmxlY3RPd25LZXlzID0gZnVuY3Rpb24gUmVmbGVjdE93bktleXModGFyZ2V0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRhcmdldClcbiAgICAgIC5jb25jYXQoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyh0YXJnZXQpKTtcbiAgfTtcbn0gZWxzZSB7XG4gIFJlZmxlY3RPd25LZXlzID0gZnVuY3Rpb24gUmVmbGVjdE93bktleXModGFyZ2V0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRhcmdldCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIFByb2Nlc3NFbWl0V2FybmluZyh3YXJuaW5nKSB7XG4gIGlmIChjb25zb2xlICYmIGNvbnNvbGUud2FybikgY29uc29sZS53YXJuKHdhcm5pbmcpO1xufVxuXG52YXIgTnVtYmVySXNOYU4gPSBOdW1iZXIuaXNOYU4gfHwgZnVuY3Rpb24gTnVtYmVySXNOYU4odmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlICE9PSB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICBFdmVudEVtaXR0ZXIuaW5pdC5jYWxsKHRoaXMpO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5tb2R1bGUuZXhwb3J0cy5vbmNlID0gb25jZTtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHNDb3VudCA9IDA7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbnZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbmZ1bmN0aW9uIGNoZWNrTGlzdGVuZXIobGlzdGVuZXIpIHtcbiAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIEZ1bmN0aW9uLiBSZWNlaXZlZCB0eXBlICcgKyB0eXBlb2YgbGlzdGVuZXIpO1xuICB9XG59XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShFdmVudEVtaXR0ZXIsICdkZWZhdWx0TWF4TGlzdGVuZXJzJywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnICE9PSAnbnVtYmVyJyB8fCBhcmcgPCAwIHx8IE51bWJlcklzTmFOKGFyZykpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgb2YgXCJkZWZhdWx0TWF4TGlzdGVuZXJzXCIgaXMgb3V0IG9mIHJhbmdlLiBJdCBtdXN0IGJlIGEgbm9uLW5lZ2F0aXZlIG51bWJlci4gUmVjZWl2ZWQgJyArIGFyZyArICcuJyk7XG4gICAgfVxuICAgIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSBhcmc7XG4gIH1cbn0pO1xuXG5FdmVudEVtaXR0ZXIuaW5pdCA9IGZ1bmN0aW9uKCkge1xuXG4gIGlmICh0aGlzLl9ldmVudHMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgdGhpcy5fZXZlbnRzID09PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcykuX2V2ZW50cykge1xuICAgIHRoaXMuX2V2ZW50cyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgdGhpcy5fZXZlbnRzQ291bnQgPSAwO1xuICB9XG5cbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn07XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIHNldE1heExpc3RlbmVycyhuKSB7XG4gIGlmICh0eXBlb2YgbiAhPT0gJ251bWJlcicgfHwgbiA8IDAgfHwgTnVtYmVySXNOYU4obikpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIHZhbHVlIG9mIFwiblwiIGlzIG91dCBvZiByYW5nZS4gSXQgbXVzdCBiZSBhIG5vbi1uZWdhdGl2ZSBudW1iZXIuIFJlY2VpdmVkICcgKyBuICsgJy4nKTtcbiAgfVxuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbmZ1bmN0aW9uIF9nZXRNYXhMaXN0ZW5lcnModGhhdCkge1xuICBpZiAodGhhdC5fbWF4TGlzdGVuZXJzID09PSB1bmRlZmluZWQpXG4gICAgcmV0dXJuIEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICByZXR1cm4gdGhhdC5fbWF4TGlzdGVuZXJzO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmdldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIGdldE1heExpc3RlbmVycygpIHtcbiAgcmV0dXJuIF9nZXRNYXhMaXN0ZW5lcnModGhpcyk7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KHR5cGUpIHtcbiAgdmFyIGFyZ3MgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIGFyZ3MucHVzaChhcmd1bWVudHNbaV0pO1xuICB2YXIgZG9FcnJvciA9ICh0eXBlID09PSAnZXJyb3InKTtcblxuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzO1xuICBpZiAoZXZlbnRzICE9PSB1bmRlZmluZWQpXG4gICAgZG9FcnJvciA9IChkb0Vycm9yICYmIGV2ZW50cy5lcnJvciA9PT0gdW5kZWZpbmVkKTtcbiAgZWxzZSBpZiAoIWRvRXJyb3IpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKGRvRXJyb3IpIHtcbiAgICB2YXIgZXI7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID4gMClcbiAgICAgIGVyID0gYXJnc1swXTtcbiAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgLy8gTm90ZTogVGhlIGNvbW1lbnRzIG9uIHRoZSBgdGhyb3dgIGxpbmVzIGFyZSBpbnRlbnRpb25hbCwgdGhleSBzaG93XG4gICAgICAvLyB1cCBpbiBOb2RlJ3Mgb3V0cHV0IGlmIHRoaXMgcmVzdWx0cyBpbiBhbiB1bmhhbmRsZWQgZXhjZXB0aW9uLlxuICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgfVxuICAgIC8vIEF0IGxlYXN0IGdpdmUgc29tZSBraW5kIG9mIGNvbnRleHQgdG8gdGhlIHVzZXJcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdVbmhhbmRsZWQgZXJyb3IuJyArIChlciA/ICcgKCcgKyBlci5tZXNzYWdlICsgJyknIDogJycpKTtcbiAgICBlcnIuY29udGV4dCA9IGVyO1xuICAgIHRocm93IGVycjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgfVxuXG4gIHZhciBoYW5kbGVyID0gZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChoYW5kbGVyID09PSB1bmRlZmluZWQpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIFJlZmxlY3RBcHBseShoYW5kbGVyLCB0aGlzLCBhcmdzKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgUmVmbGVjdEFwcGx5KGxpc3RlbmVyc1tpXSwgdGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbmZ1bmN0aW9uIF9hZGRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGxpc3RlbmVyLCBwcmVwZW5kKSB7XG4gIHZhciBtO1xuICB2YXIgZXZlbnRzO1xuICB2YXIgZXhpc3Rpbmc7XG5cbiAgY2hlY2tMaXN0ZW5lcihsaXN0ZW5lcik7XG5cbiAgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG4gIGlmIChldmVudHMgPT09IHVuZGVmaW5lZCkge1xuICAgIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB0YXJnZXQuX2V2ZW50c0NvdW50ID0gMDtcbiAgfSBlbHNlIHtcbiAgICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAgIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgICBpZiAoZXZlbnRzLm5ld0xpc3RlbmVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRhcmdldC5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA/IGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gICAgICAvLyBSZS1hc3NpZ24gYGV2ZW50c2AgYmVjYXVzZSBhIG5ld0xpc3RlbmVyIGhhbmRsZXIgY291bGQgaGF2ZSBjYXVzZWQgdGhlXG4gICAgICAvLyB0aGlzLl9ldmVudHMgdG8gYmUgYXNzaWduZWQgdG8gYSBuZXcgb2JqZWN0XG4gICAgICBldmVudHMgPSB0YXJnZXQuX2V2ZW50cztcbiAgICB9XG4gICAgZXhpc3RpbmcgPSBldmVudHNbdHlwZV07XG4gIH1cblxuICBpZiAoZXhpc3RpbmcgPT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIGV4aXN0aW5nID0gZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gICAgKyt0YXJnZXQuX2V2ZW50c0NvdW50O1xuICB9IGVsc2Uge1xuICAgIGlmICh0eXBlb2YgZXhpc3RpbmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgICAgZXhpc3RpbmcgPSBldmVudHNbdHlwZV0gPVxuICAgICAgICBwcmVwZW5kID8gW2xpc3RlbmVyLCBleGlzdGluZ10gOiBbZXhpc3RpbmcsIGxpc3RlbmVyXTtcbiAgICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB9IGVsc2UgaWYgKHByZXBlbmQpIHtcbiAgICAgIGV4aXN0aW5nLnVuc2hpZnQobGlzdGVuZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBleGlzdGluZy5wdXNoKGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICAgIG0gPSBfZ2V0TWF4TGlzdGVuZXJzKHRhcmdldCk7XG4gICAgaWYgKG0gPiAwICYmIGV4aXN0aW5nLmxlbmd0aCA+IG0gJiYgIWV4aXN0aW5nLndhcm5lZCkge1xuICAgICAgZXhpc3Rpbmcud2FybmVkID0gdHJ1ZTtcbiAgICAgIC8vIE5vIGVycm9yIGNvZGUgZm9yIHRoaXMgc2luY2UgaXQgaXMgYSBXYXJuaW5nXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcmVzdHJpY3RlZC1zeW50YXhcbiAgICAgIHZhciB3ID0gbmV3IEVycm9yKCdQb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5IGxlYWsgZGV0ZWN0ZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZy5sZW5ndGggKyAnICcgKyBTdHJpbmcodHlwZSkgKyAnIGxpc3RlbmVycyAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJ2FkZGVkLiBVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJ2luY3JlYXNlIGxpbWl0Jyk7XG4gICAgICB3Lm5hbWUgPSAnTWF4TGlzdGVuZXJzRXhjZWVkZWRXYXJuaW5nJztcbiAgICAgIHcuZW1pdHRlciA9IHRhcmdldDtcbiAgICAgIHcudHlwZSA9IHR5cGU7XG4gICAgICB3LmNvdW50ID0gZXhpc3RpbmcubGVuZ3RoO1xuICAgICAgUHJvY2Vzc0VtaXRXYXJuaW5nKHcpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0YXJnZXQ7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiBhZGRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICByZXR1cm4gX2FkZExpc3RlbmVyKHRoaXMsIHR5cGUsIGxpc3RlbmVyLCBmYWxzZSk7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kTGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIHByZXBlbmRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuIF9hZGRMaXN0ZW5lcih0aGlzLCB0eXBlLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gICAgfTtcblxuZnVuY3Rpb24gb25jZVdyYXBwZXIoKSB7XG4gIGlmICghdGhpcy5maXJlZCkge1xuICAgIHRoaXMudGFyZ2V0LnJlbW92ZUxpc3RlbmVyKHRoaXMudHlwZSwgdGhpcy53cmFwRm4pO1xuICAgIHRoaXMuZmlyZWQgPSB0cnVlO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgcmV0dXJuIHRoaXMubGlzdGVuZXIuY2FsbCh0aGlzLnRhcmdldCk7XG4gICAgcmV0dXJuIHRoaXMubGlzdGVuZXIuYXBwbHkodGhpcy50YXJnZXQsIGFyZ3VtZW50cyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX29uY2VXcmFwKHRhcmdldCwgdHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIHN0YXRlID0geyBmaXJlZDogZmFsc2UsIHdyYXBGbjogdW5kZWZpbmVkLCB0YXJnZXQ6IHRhcmdldCwgdHlwZTogdHlwZSwgbGlzdGVuZXI6IGxpc3RlbmVyIH07XG4gIHZhciB3cmFwcGVkID0gb25jZVdyYXBwZXIuYmluZChzdGF0ZSk7XG4gIHdyYXBwZWQubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgc3RhdGUud3JhcEZuID0gd3JhcHBlZDtcbiAgcmV0dXJuIHdyYXBwZWQ7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uIG9uY2UodHlwZSwgbGlzdGVuZXIpIHtcbiAgY2hlY2tMaXN0ZW5lcihsaXN0ZW5lcik7XG4gIHRoaXMub24odHlwZSwgX29uY2VXcmFwKHRoaXMsIHR5cGUsIGxpc3RlbmVyKSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kT25jZUxpc3RlbmVyID1cbiAgICBmdW5jdGlvbiBwcmVwZW5kT25jZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgICBjaGVja0xpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgIHRoaXMucHJlcGVuZExpc3RlbmVyKHR5cGUsIF9vbmNlV3JhcCh0aGlzLCB0eXBlLCBsaXN0ZW5lcikpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuLy8gRW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmIGFuZCBvbmx5IGlmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgICB2YXIgbGlzdCwgZXZlbnRzLCBwb3NpdGlvbiwgaSwgb3JpZ2luYWxMaXN0ZW5lcjtcblxuICAgICAgY2hlY2tMaXN0ZW5lcihsaXN0ZW5lcik7XG5cbiAgICAgIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcbiAgICAgIGlmIChldmVudHMgPT09IHVuZGVmaW5lZClcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgIGxpc3QgPSBldmVudHNbdHlwZV07XG4gICAgICBpZiAobGlzdCA9PT0gdW5kZWZpbmVkKVxuICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8IGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB7XG4gICAgICAgIGlmICgtLXRoaXMuX2V2ZW50c0NvdW50ID09PSAwKVxuICAgICAgICAgIHRoaXMuX2V2ZW50cyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBldmVudHNbdHlwZV07XG4gICAgICAgICAgaWYgKGV2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgICAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0Lmxpc3RlbmVyIHx8IGxpc3RlbmVyKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbGlzdCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBwb3NpdGlvbiA9IC0xO1xuXG4gICAgICAgIGZvciAoaSA9IGxpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHwgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIG9yaWdpbmFsTGlzdGVuZXIgPSBsaXN0W2ldLmxpc3RlbmVyO1xuICAgICAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgICBpZiAocG9zaXRpb24gPT09IDApXG4gICAgICAgICAgbGlzdC5zaGlmdCgpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBzcGxpY2VPbmUobGlzdCwgcG9zaXRpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKVxuICAgICAgICAgIGV2ZW50c1t0eXBlXSA9IGxpc3RbMF07XG5cbiAgICAgICAgaWYgKGV2ZW50cy5yZW1vdmVMaXN0ZW5lciAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBvcmlnaW5hbExpc3RlbmVyIHx8IGxpc3RlbmVyKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9XG4gICAgZnVuY3Rpb24gcmVtb3ZlQWxsTGlzdGVuZXJzKHR5cGUpIHtcbiAgICAgIHZhciBsaXN0ZW5lcnMsIGV2ZW50cywgaTtcblxuICAgICAgZXZlbnRzID0gdGhpcy5fZXZlbnRzO1xuICAgICAgaWYgKGV2ZW50cyA9PT0gdW5kZWZpbmVkKVxuICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICAgICAgaWYgKGV2ZW50cy5yZW1vdmVMaXN0ZW5lciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgICB0aGlzLl9ldmVudHNDb3VudCA9IDA7XG4gICAgICAgIH0gZWxzZSBpZiAoZXZlbnRzW3R5cGVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAoLS10aGlzLl9ldmVudHNDb3VudCA9PT0gMClcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50cyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgZGVsZXRlIGV2ZW50c1t0eXBlXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGV2ZW50cyk7XG4gICAgICAgIHZhciBrZXk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgICAgICB0aGlzLl9ldmVudHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICB0aGlzLl9ldmVudHNDb3VudCA9IDA7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICBsaXN0ZW5lcnMgPSBldmVudHNbdHlwZV07XG5cbiAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgICAgIH0gZWxzZSBpZiAobGlzdGVuZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gTElGTyBvcmRlclxuICAgICAgICBmb3IgKGkgPSBsaXN0ZW5lcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuZnVuY3Rpb24gX2xpc3RlbmVycyh0YXJnZXQsIHR5cGUsIHVud3JhcCkge1xuICB2YXIgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG5cbiAgaWYgKGV2ZW50cyA9PT0gdW5kZWZpbmVkKVxuICAgIHJldHVybiBbXTtcblxuICB2YXIgZXZsaXN0ZW5lciA9IGV2ZW50c1t0eXBlXTtcbiAgaWYgKGV2bGlzdGVuZXIgPT09IHVuZGVmaW5lZClcbiAgICByZXR1cm4gW107XG5cbiAgaWYgKHR5cGVvZiBldmxpc3RlbmVyID09PSAnZnVuY3Rpb24nKVxuICAgIHJldHVybiB1bndyYXAgPyBbZXZsaXN0ZW5lci5saXN0ZW5lciB8fCBldmxpc3RlbmVyXSA6IFtldmxpc3RlbmVyXTtcblxuICByZXR1cm4gdW53cmFwID9cbiAgICB1bndyYXBMaXN0ZW5lcnMoZXZsaXN0ZW5lcikgOiBhcnJheUNsb25lKGV2bGlzdGVuZXIsIGV2bGlzdGVuZXIubGVuZ3RoKTtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiBsaXN0ZW5lcnModHlwZSkge1xuICByZXR1cm4gX2xpc3RlbmVycyh0aGlzLCB0eXBlLCB0cnVlKTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmF3TGlzdGVuZXJzID0gZnVuY3Rpb24gcmF3TGlzdGVuZXJzKHR5cGUpIHtcbiAgcmV0dXJuIF9saXN0ZW5lcnModGhpcywgdHlwZSwgZmFsc2UpO1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIGlmICh0eXBlb2YgZW1pdHRlci5saXN0ZW5lckNvdW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGVtaXR0ZXIubGlzdGVuZXJDb3VudCh0eXBlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbGlzdGVuZXJDb3VudC5jYWxsKGVtaXR0ZXIsIHR5cGUpO1xuICB9XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyQ291bnQgPSBsaXN0ZW5lckNvdW50O1xuZnVuY3Rpb24gbGlzdGVuZXJDb3VudCh0eXBlKSB7XG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHM7XG5cbiAgaWYgKGV2ZW50cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIGV2bGlzdGVuZXIgPSBldmVudHNbdHlwZV07XG5cbiAgICBpZiAodHlwZW9mIGV2bGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAoZXZsaXN0ZW5lciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZXZsaXN0ZW5lci5sZW5ndGg7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIDA7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnROYW1lcyA9IGZ1bmN0aW9uIGV2ZW50TmFtZXMoKSB7XG4gIHJldHVybiB0aGlzLl9ldmVudHNDb3VudCA+IDAgPyBSZWZsZWN0T3duS2V5cyh0aGlzLl9ldmVudHMpIDogW107XG59O1xuXG5mdW5jdGlvbiBhcnJheUNsb25lKGFyciwgbikge1xuICB2YXIgY29weSA9IG5ldyBBcnJheShuKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyArK2kpXG4gICAgY29weVtpXSA9IGFycltpXTtcbiAgcmV0dXJuIGNvcHk7XG59XG5cbmZ1bmN0aW9uIHNwbGljZU9uZShsaXN0LCBpbmRleCkge1xuICBmb3IgKDsgaW5kZXggKyAxIDwgbGlzdC5sZW5ndGg7IGluZGV4KyspXG4gICAgbGlzdFtpbmRleF0gPSBsaXN0W2luZGV4ICsgMV07XG4gIGxpc3QucG9wKCk7XG59XG5cbmZ1bmN0aW9uIHVud3JhcExpc3RlbmVycyhhcnIpIHtcbiAgdmFyIHJldCA9IG5ldyBBcnJheShhcnIubGVuZ3RoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXQubGVuZ3RoOyArK2kpIHtcbiAgICByZXRbaV0gPSBhcnJbaV0ubGlzdGVuZXIgfHwgYXJyW2ldO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIG9uY2UoZW1pdHRlciwgbmFtZSkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGZ1bmN0aW9uIGVycm9yTGlzdGVuZXIoZXJyKSB7XG4gICAgICBlbWl0dGVyLnJlbW92ZUxpc3RlbmVyKG5hbWUsIHJlc29sdmVyKTtcbiAgICAgIHJlamVjdChlcnIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc29sdmVyKCkge1xuICAgICAgaWYgKHR5cGVvZiBlbWl0dGVyLnJlbW92ZUxpc3RlbmVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGVtaXR0ZXIucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgZXJyb3JMaXN0ZW5lcik7XG4gICAgICB9XG4gICAgICByZXNvbHZlKFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG4gICAgfTtcblxuICAgIGV2ZW50VGFyZ2V0QWdub3N0aWNBZGRMaXN0ZW5lcihlbWl0dGVyLCBuYW1lLCByZXNvbHZlciwgeyBvbmNlOiB0cnVlIH0pO1xuICAgIGlmIChuYW1lICE9PSAnZXJyb3InKSB7XG4gICAgICBhZGRFcnJvckhhbmRsZXJJZkV2ZW50RW1pdHRlcihlbWl0dGVyLCBlcnJvckxpc3RlbmVyLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkRXJyb3JIYW5kbGVySWZFdmVudEVtaXR0ZXIoZW1pdHRlciwgaGFuZGxlciwgZmxhZ3MpIHtcbiAgaWYgKHR5cGVvZiBlbWl0dGVyLm9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgZXZlbnRUYXJnZXRBZ25vc3RpY0FkZExpc3RlbmVyKGVtaXR0ZXIsICdlcnJvcicsIGhhbmRsZXIsIGZsYWdzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBldmVudFRhcmdldEFnbm9zdGljQWRkTGlzdGVuZXIoZW1pdHRlciwgbmFtZSwgbGlzdGVuZXIsIGZsYWdzKSB7XG4gIGlmICh0eXBlb2YgZW1pdHRlci5vbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGlmIChmbGFncy5vbmNlKSB7XG4gICAgICBlbWl0dGVyLm9uY2UobmFtZSwgbGlzdGVuZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbWl0dGVyLm9uKG5hbWUsIGxpc3RlbmVyKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIGVtaXR0ZXIuYWRkRXZlbnRMaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIEV2ZW50VGFyZ2V0IGRvZXMgbm90IGhhdmUgYGVycm9yYCBldmVudCBzZW1hbnRpY3MgbGlrZSBOb2RlXG4gICAgLy8gRXZlbnRFbWl0dGVycywgd2UgZG8gbm90IGxpc3RlbiBmb3IgYGVycm9yYCBldmVudHMgaGVyZS5cbiAgICBlbWl0dGVyLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgZnVuY3Rpb24gd3JhcExpc3RlbmVyKGFyZykge1xuICAgICAgLy8gSUUgZG9lcyBub3QgaGF2ZSBidWlsdGluIGB7IG9uY2U6IHRydWUgfWAgc3VwcG9ydCBzbyB3ZVxuICAgICAgLy8gaGF2ZSB0byBkbyBpdCBtYW51YWxseS5cbiAgICAgIGlmIChmbGFncy5vbmNlKSB7XG4gICAgICAgIGVtaXR0ZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCB3cmFwTGlzdGVuZXIpO1xuICAgICAgfVxuICAgICAgbGlzdGVuZXIoYXJnKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJlbWl0dGVyXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIEV2ZW50RW1pdHRlci4gUmVjZWl2ZWQgdHlwZSAnICsgdHlwZW9mIGVtaXR0ZXIpO1xuICB9XG59XG4iLCIvLyAgICAgVW5kZXJzY29yZS5qcyAxLjYuMFxuLy8gICAgIGh0dHA6Ly91bmRlcnNjb3JlanMub3JnXG4vLyAgICAgKGMpIDIwMDktMjAxNCBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuLy8gICAgIFVuZGVyc2NvcmUgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cbihmdW5jdGlvbigpIHtcblxuICAvLyBCYXNlbGluZSBzZXR1cFxuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEVzdGFibGlzaCB0aGUgcm9vdCBvYmplY3QsIGB3aW5kb3dgIGluIHRoZSBicm93c2VyLCBvciBgZXhwb3J0c2Agb24gdGhlIHNlcnZlci5cbiAgdmFyIHJvb3QgPSB0aGlzO1xuXG4gIC8vIFNhdmUgdGhlIHByZXZpb3VzIHZhbHVlIG9mIHRoZSBgX2AgdmFyaWFibGUuXG4gIHZhciBwcmV2aW91c1VuZGVyc2NvcmUgPSByb290Ll87XG5cbiAgLy8gRXN0YWJsaXNoIHRoZSBvYmplY3QgdGhhdCBnZXRzIHJldHVybmVkIHRvIGJyZWFrIG91dCBvZiBhIGxvb3AgaXRlcmF0aW9uLlxuICB2YXIgYnJlYWtlciA9IHt9O1xuXG4gIC8vIFNhdmUgYnl0ZXMgaW4gdGhlIG1pbmlmaWVkIChidXQgbm90IGd6aXBwZWQpIHZlcnNpb246XG4gIHZhciBBcnJheVByb3RvID0gQXJyYXkucHJvdG90eXBlLCBPYmpQcm90byA9IE9iamVjdC5wcm90b3R5cGUsIEZ1bmNQcm90byA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxuICAvLyBDcmVhdGUgcXVpY2sgcmVmZXJlbmNlIHZhcmlhYmxlcyBmb3Igc3BlZWQgYWNjZXNzIHRvIGNvcmUgcHJvdG90eXBlcy5cbiAgdmFyXG4gICAgcHVzaCAgICAgICAgICAgICA9IEFycmF5UHJvdG8ucHVzaCxcbiAgICBzbGljZSAgICAgICAgICAgID0gQXJyYXlQcm90by5zbGljZSxcbiAgICBjb25jYXQgICAgICAgICAgID0gQXJyYXlQcm90by5jb25jYXQsXG4gICAgdG9TdHJpbmcgICAgICAgICA9IE9ialByb3RvLnRvU3RyaW5nLFxuICAgIGhhc093blByb3BlcnR5ICAgPSBPYmpQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuICAvLyBBbGwgKipFQ01BU2NyaXB0IDUqKiBuYXRpdmUgZnVuY3Rpb24gaW1wbGVtZW50YXRpb25zIHRoYXQgd2UgaG9wZSB0byB1c2VcbiAgLy8gYXJlIGRlY2xhcmVkIGhlcmUuXG4gIHZhclxuICAgIG5hdGl2ZUZvckVhY2ggICAgICA9IEFycmF5UHJvdG8uZm9yRWFjaCxcbiAgICBuYXRpdmVNYXAgICAgICAgICAgPSBBcnJheVByb3RvLm1hcCxcbiAgICBuYXRpdmVSZWR1Y2UgICAgICAgPSBBcnJheVByb3RvLnJlZHVjZSxcbiAgICBuYXRpdmVSZWR1Y2VSaWdodCAgPSBBcnJheVByb3RvLnJlZHVjZVJpZ2h0LFxuICAgIG5hdGl2ZUZpbHRlciAgICAgICA9IEFycmF5UHJvdG8uZmlsdGVyLFxuICAgIG5hdGl2ZUV2ZXJ5ICAgICAgICA9IEFycmF5UHJvdG8uZXZlcnksXG4gICAgbmF0aXZlU29tZSAgICAgICAgID0gQXJyYXlQcm90by5zb21lLFxuICAgIG5hdGl2ZUluZGV4T2YgICAgICA9IEFycmF5UHJvdG8uaW5kZXhPZixcbiAgICBuYXRpdmVMYXN0SW5kZXhPZiAgPSBBcnJheVByb3RvLmxhc3RJbmRleE9mLFxuICAgIG5hdGl2ZUlzQXJyYXkgICAgICA9IEFycmF5LmlzQXJyYXksXG4gICAgbmF0aXZlS2V5cyAgICAgICAgID0gT2JqZWN0LmtleXMsXG4gICAgbmF0aXZlQmluZCAgICAgICAgID0gRnVuY1Byb3RvLmJpbmQ7XG5cbiAgLy8gQ3JlYXRlIGEgc2FmZSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciB1c2UgYmVsb3cuXG4gIHZhciBfID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiBpbnN0YW5jZW9mIF8pIHJldHVybiBvYmo7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIF8pKSByZXR1cm4gbmV3IF8ob2JqKTtcbiAgICB0aGlzLl93cmFwcGVkID0gb2JqO1xuICB9O1xuXG4gIC8vIEV4cG9ydCB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yICoqTm9kZS5qcyoqLCB3aXRoXG4gIC8vIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IGZvciB0aGUgb2xkIGByZXF1aXJlKClgIEFQSS4gSWYgd2UncmUgaW5cbiAgLy8gdGhlIGJyb3dzZXIsIGFkZCBgX2AgYXMgYSBnbG9iYWwgb2JqZWN0IHZpYSBhIHN0cmluZyBpZGVudGlmaWVyLFxuICAvLyBmb3IgQ2xvc3VyZSBDb21waWxlciBcImFkdmFuY2VkXCIgbW9kZS5cbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gXztcbiAgICB9XG4gICAgZXhwb3J0cy5fID0gXztcbiAgfSBlbHNlIHtcbiAgICByb290Ll8gPSBfO1xuICB9XG5cbiAgLy8gQ3VycmVudCB2ZXJzaW9uLlxuICBfLlZFUlNJT04gPSAnMS42LjAnO1xuXG4gIC8vIENvbGxlY3Rpb24gRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gVGhlIGNvcm5lcnN0b25lLCBhbiBgZWFjaGAgaW1wbGVtZW50YXRpb24sIGFrYSBgZm9yRWFjaGAuXG4gIC8vIEhhbmRsZXMgb2JqZWN0cyB3aXRoIHRoZSBidWlsdC1pbiBgZm9yRWFjaGAsIGFycmF5cywgYW5kIHJhdyBvYmplY3RzLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZm9yRWFjaGAgaWYgYXZhaWxhYmxlLlxuICB2YXIgZWFjaCA9IF8uZWFjaCA9IF8uZm9yRWFjaCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBvYmo7XG4gICAgaWYgKG5hdGl2ZUZvckVhY2ggJiYgb2JqLmZvckVhY2ggPT09IG5hdGl2ZUZvckVhY2gpIHtcbiAgICAgIG9iai5mb3JFYWNoKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gb2JqLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2tleXNbaV1dLCBrZXlzW2ldLCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRvciB0byBlYWNoIGVsZW1lbnQuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBtYXBgIGlmIGF2YWlsYWJsZS5cbiAgXy5tYXAgPSBfLmNvbGxlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIGlmIChuYXRpdmVNYXAgJiYgb2JqLm1hcCA9PT0gbmF0aXZlTWFwKSByZXR1cm4gb2JqLm1hcChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmVzdWx0cy5wdXNoKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgdmFyIHJlZHVjZUVycm9yID0gJ1JlZHVjZSBvZiBlbXB0eSBhcnJheSB3aXRoIG5vIGluaXRpYWwgdmFsdWUnO1xuXG4gIC8vICoqUmVkdWNlKiogYnVpbGRzIHVwIGEgc2luZ2xlIHJlc3VsdCBmcm9tIGEgbGlzdCBvZiB2YWx1ZXMsIGFrYSBgaW5qZWN0YCxcbiAgLy8gb3IgYGZvbGRsYC4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHJlZHVjZWAgaWYgYXZhaWxhYmxlLlxuICBfLnJlZHVjZSA9IF8uZm9sZGwgPSBfLmluamVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNvbnRleHQpIHtcbiAgICB2YXIgaW5pdGlhbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICAgIGlmIChvYmogPT0gbnVsbCkgb2JqID0gW107XG4gICAgaWYgKG5hdGl2ZVJlZHVjZSAmJiBvYmoucmVkdWNlID09PSBuYXRpdmVSZWR1Y2UpIHtcbiAgICAgIGlmIChjb250ZXh0KSBpdGVyYXRvciA9IF8uYmluZChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgICByZXR1cm4gaW5pdGlhbCA/IG9iai5yZWR1Y2UoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZShpdGVyYXRvcik7XG4gICAgfVxuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmICghaW5pdGlhbCkge1xuICAgICAgICBtZW1vID0gdmFsdWU7XG4gICAgICAgIGluaXRpYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgbWVtbywgdmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFRoZSByaWdodC1hc3NvY2lhdGl2ZSB2ZXJzaW9uIG9mIHJlZHVjZSwgYWxzbyBrbm93biBhcyBgZm9sZHJgLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgcmVkdWNlUmlnaHRgIGlmIGF2YWlsYWJsZS5cbiAgXy5yZWR1Y2VSaWdodCA9IF8uZm9sZHIgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGlmIChuYXRpdmVSZWR1Y2VSaWdodCAmJiBvYmoucmVkdWNlUmlnaHQgPT09IG5hdGl2ZVJlZHVjZVJpZ2h0KSB7XG4gICAgICBpZiAoY29udGV4dCkgaXRlcmF0b3IgPSBfLmJpbmQoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGluaXRpYWwgPyBvYmoucmVkdWNlUmlnaHQoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZVJpZ2h0KGl0ZXJhdG9yKTtcbiAgICB9XG4gICAgdmFyIGxlbmd0aCA9IG9iai5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCAhPT0gK2xlbmd0aCkge1xuICAgICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIH1cbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpbmRleCA9IGtleXMgPyBrZXlzWy0tbGVuZ3RoXSA6IC0tbGVuZ3RoO1xuICAgICAgaWYgKCFpbml0aWFsKSB7XG4gICAgICAgIG1lbW8gPSBvYmpbaW5kZXhdO1xuICAgICAgICBpbml0aWFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG1lbW8sIG9ialtpbmRleF0sIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgZmlyc3QgdmFsdWUgd2hpY2ggcGFzc2VzIGEgdHJ1dGggdGVzdC4gQWxpYXNlZCBhcyBgZGV0ZWN0YC5cbiAgXy5maW5kID0gXy5kZXRlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgYW55KG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyB0aGF0IHBhc3MgYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZmlsdGVyYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYHNlbGVjdGAuXG4gIF8uZmlsdGVyID0gXy5zZWxlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBpZiAobmF0aXZlRmlsdGVyICYmIG9iai5maWx0ZXIgPT09IG5hdGl2ZUZpbHRlcikgcmV0dXJuIG9iai5maWx0ZXIocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkgcmVzdWx0cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyBmb3Igd2hpY2ggYSB0cnV0aCB0ZXN0IGZhaWxzLlxuICBfLnJlamVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXR1cm4gIXByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgfSwgY29udGV4dCk7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgYWxsIG9mIHRoZSBlbGVtZW50cyBtYXRjaCBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBldmVyeWAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBhbGxgLlxuICBfLmV2ZXJ5ID0gXy5hbGwgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSB8fCAocHJlZGljYXRlID0gXy5pZGVudGl0eSk7XG4gICAgdmFyIHJlc3VsdCA9IHRydWU7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVFdmVyeSAmJiBvYmouZXZlcnkgPT09IG5hdGl2ZUV2ZXJ5KSByZXR1cm4gb2JqLmV2ZXJ5KHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKCEocmVzdWx0ID0gcmVzdWx0ICYmIHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpKSByZXR1cm4gYnJlYWtlcjtcbiAgICB9KTtcbiAgICByZXR1cm4gISFyZXN1bHQ7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGF0IGxlYXN0IG9uZSBlbGVtZW50IGluIHRoZSBvYmplY3QgbWF0Y2hlcyBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBzb21lYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYGFueWAuXG4gIHZhciBhbnkgPSBfLnNvbWUgPSBfLmFueSA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcHJlZGljYXRlIHx8IChwcmVkaWNhdGUgPSBfLmlkZW50aXR5KTtcbiAgICB2YXIgcmVzdWx0ID0gZmFsc2U7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVTb21lICYmIG9iai5zb21lID09PSBuYXRpdmVTb21lKSByZXR1cm4gb2JqLnNvbWUocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocmVzdWx0IHx8IChyZXN1bHQgPSBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSkgcmV0dXJuIGJyZWFrZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuICEhcmVzdWx0O1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiB0aGUgYXJyYXkgb3Igb2JqZWN0IGNvbnRhaW5zIGEgZ2l2ZW4gdmFsdWUgKHVzaW5nIGA9PT1gKS5cbiAgLy8gQWxpYXNlZCBhcyBgaW5jbHVkZWAuXG4gIF8uY29udGFpbnMgPSBfLmluY2x1ZGUgPSBmdW5jdGlvbihvYmosIHRhcmdldCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIG9iai5pbmRleE9mID09PSBuYXRpdmVJbmRleE9mKSByZXR1cm4gb2JqLmluZGV4T2YodGFyZ2V0KSAhPSAtMTtcbiAgICByZXR1cm4gYW55KG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZSA9PT0gdGFyZ2V0O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEludm9rZSBhIG1ldGhvZCAod2l0aCBhcmd1bWVudHMpIG9uIGV2ZXJ5IGl0ZW0gaW4gYSBjb2xsZWN0aW9uLlxuICBfLmludm9rZSA9IGZ1bmN0aW9uKG9iaiwgbWV0aG9kKSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGlzRnVuYyA9IF8uaXNGdW5jdGlvbihtZXRob2QpO1xuICAgIHJldHVybiBfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gKGlzRnVuYyA/IG1ldGhvZCA6IHZhbHVlW21ldGhvZF0pLmFwcGx5KHZhbHVlLCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBtYXBgOiBmZXRjaGluZyBhIHByb3BlcnR5LlxuICBfLnBsdWNrID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBfLnByb3BlcnR5KGtleSkpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbHRlcmA6IHNlbGVjdGluZyBvbmx5IG9iamVjdHNcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy53aGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBfLm1hdGNoZXMoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaW5kYDogZ2V0dGluZyB0aGUgZmlyc3Qgb2JqZWN0XG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uZmluZFdoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbmQob2JqLCBfLm1hdGNoZXMoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1heGltdW0gZWxlbWVudCBvciAoZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIC8vIENhbid0IG9wdGltaXplIGFycmF5cyBvZiBpbnRlZ2VycyBsb25nZXIgdGhhbiA2NSw1MzUgZWxlbWVudHMuXG4gIC8vIFNlZSBbV2ViS2l0IEJ1ZyA4MDc5N10oaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTgwNzk3KVxuICBfLm1heCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNBcnJheShvYmopICYmIG9ialswXSA9PT0gK29ialswXSAmJiBvYmoubGVuZ3RoIDwgNjU1MzUpIHtcbiAgICAgIHJldHVybiBNYXRoLm1heC5hcHBseShNYXRoLCBvYmopO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gLUluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSAtSW5maW5pdHk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGlmIChjb21wdXRlZCA+IGxhc3RDb21wdXRlZCkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1pbmltdW0gZWxlbWVudCAob3IgZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIF8ubWluID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0FycmF5KG9iaikgJiYgb2JqWzBdID09PSArb2JqWzBdICYmIG9iai5sZW5ndGggPCA2NTUzNSkge1xuICAgICAgcmV0dXJuIE1hdGgubWluLmFwcGx5KE1hdGgsIG9iaik7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSBJbmZpbml0eSwgbGFzdENvbXB1dGVkID0gSW5maW5pdHk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGlmIChjb21wdXRlZCA8IGxhc3RDb21wdXRlZCkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBTaHVmZmxlIGFuIGFycmF5LCB1c2luZyB0aGUgbW9kZXJuIHZlcnNpb24gb2YgdGhlXG4gIC8vIFtGaXNoZXItWWF0ZXMgc2h1ZmZsZV0oaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaXNoZXLigJNZYXRlc19zaHVmZmxlKS5cbiAgXy5zaHVmZmxlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJhbmQ7XG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc2h1ZmZsZWQgPSBbXTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJhbmQgPSBfLnJhbmRvbShpbmRleCsrKTtcbiAgICAgIHNodWZmbGVkW2luZGV4IC0gMV0gPSBzaHVmZmxlZFtyYW5kXTtcbiAgICAgIHNodWZmbGVkW3JhbmRdID0gdmFsdWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHNodWZmbGVkO1xuICB9O1xuXG4gIC8vIFNhbXBsZSAqKm4qKiByYW5kb20gdmFsdWVzIGZyb20gYSBjb2xsZWN0aW9uLlxuICAvLyBJZiAqKm4qKiBpcyBub3Qgc3BlY2lmaWVkLCByZXR1cm5zIGEgc2luZ2xlIHJhbmRvbSBlbGVtZW50LlxuICAvLyBUaGUgaW50ZXJuYWwgYGd1YXJkYCBhcmd1bWVudCBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBtYXBgLlxuICBfLnNhbXBsZSA9IGZ1bmN0aW9uKG9iaiwgbiwgZ3VhcmQpIHtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSB7XG4gICAgICBpZiAob2JqLmxlbmd0aCAhPT0gK29iai5sZW5ndGgpIG9iaiA9IF8udmFsdWVzKG9iaik7XG4gICAgICByZXR1cm4gb2JqW18ucmFuZG9tKG9iai5sZW5ndGggLSAxKV07XG4gICAgfVxuICAgIHJldHVybiBfLnNodWZmbGUob2JqKS5zbGljZSgwLCBNYXRoLm1heCgwLCBuKSk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdG8gZ2VuZXJhdGUgbG9va3VwIGl0ZXJhdG9ycy5cbiAgdmFyIGxvb2t1cEl0ZXJhdG9yID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIF8uaWRlbnRpdHk7XG4gICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHJldHVybiB2YWx1ZTtcbiAgICByZXR1cm4gXy5wcm9wZXJ0eSh2YWx1ZSk7XG4gIH07XG5cbiAgLy8gU29ydCB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uIHByb2R1Y2VkIGJ5IGFuIGl0ZXJhdG9yLlxuICBfLnNvcnRCeSA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICByZXR1cm4gXy5wbHVjayhfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgIGNyaXRlcmlhOiBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdClcbiAgICAgIH07XG4gICAgfSkuc29ydChmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhO1xuICAgICAgdmFyIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgIGlmIChhICE9PSBiKSB7XG4gICAgICAgIGlmIChhID4gYiB8fCBhID09PSB2b2lkIDApIHJldHVybiAxO1xuICAgICAgICBpZiAoYSA8IGIgfHwgYiA9PT0gdm9pZCAwKSByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGVmdC5pbmRleCAtIHJpZ2h0LmluZGV4O1xuICAgIH0pLCAndmFsdWUnKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB1c2VkIGZvciBhZ2dyZWdhdGUgXCJncm91cCBieVwiIG9wZXJhdGlvbnMuXG4gIHZhciBncm91cCA9IGZ1bmN0aW9uKGJlaGF2aW9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgIGl0ZXJhdG9yID0gbG9va3VwSXRlcmF0b3IoaXRlcmF0b3IpO1xuICAgICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICB2YXIga2V5ID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIG9iaik7XG4gICAgICAgIGJlaGF2aW9yKHJlc3VsdCwga2V5LCB2YWx1ZSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBHcm91cHMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbi4gUGFzcyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlXG4gIC8vIHRvIGdyb3VwIGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgY3JpdGVyaW9uLlxuICBfLmdyb3VwQnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICBfLmhhcyhyZXN1bHQsIGtleSkgPyByZXN1bHRba2V5XS5wdXNoKHZhbHVlKSA6IHJlc3VsdFtrZXldID0gW3ZhbHVlXTtcbiAgfSk7XG5cbiAgLy8gSW5kZXhlcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLCBzaW1pbGFyIHRvIGBncm91cEJ5YCwgYnV0IGZvclxuICAvLyB3aGVuIHlvdSBrbm93IHRoYXQgeW91ciBpbmRleCB2YWx1ZXMgd2lsbCBiZSB1bmlxdWUuXG4gIF8uaW5kZXhCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5LCB2YWx1ZSkge1xuICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gIH0pO1xuXG4gIC8vIENvdW50cyBpbnN0YW5jZXMgb2YgYW4gb2JqZWN0IHRoYXQgZ3JvdXAgYnkgYSBjZXJ0YWluIGNyaXRlcmlvbi4gUGFzc1xuICAvLyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlIHRvIGNvdW50IGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGVcbiAgLy8gY3JpdGVyaW9uLlxuICBfLmNvdW50QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSkge1xuICAgIF8uaGFzKHJlc3VsdCwga2V5KSA/IHJlc3VsdFtrZXldKysgOiByZXN1bHRba2V5XSA9IDE7XG4gIH0pO1xuXG4gIC8vIFVzZSBhIGNvbXBhcmF0b3IgZnVuY3Rpb24gdG8gZmlndXJlIG91dCB0aGUgc21hbGxlc3QgaW5kZXggYXQgd2hpY2hcbiAgLy8gYW4gb2JqZWN0IHNob3VsZCBiZSBpbnNlcnRlZCBzbyBhcyB0byBtYWludGFpbiBvcmRlci4gVXNlcyBiaW5hcnkgc2VhcmNoLlxuICBfLnNvcnRlZEluZGV4ID0gZnVuY3Rpb24oYXJyYXksIG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICB2YXIgdmFsdWUgPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9iaik7XG4gICAgdmFyIGxvdyA9IDAsIGhpZ2ggPSBhcnJheS5sZW5ndGg7XG4gICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgIHZhciBtaWQgPSAobG93ICsgaGlnaCkgPj4+IDE7XG4gICAgICBpdGVyYXRvci5jYWxsKGNvbnRleHQsIGFycmF5W21pZF0pIDwgdmFsdWUgPyBsb3cgPSBtaWQgKyAxIDogaGlnaCA9IG1pZDtcbiAgICB9XG4gICAgcmV0dXJuIGxvdztcbiAgfTtcblxuICAvLyBTYWZlbHkgY3JlYXRlIGEgcmVhbCwgbGl2ZSBhcnJheSBmcm9tIGFueXRoaW5nIGl0ZXJhYmxlLlxuICBfLnRvQXJyYXkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIW9iaikgcmV0dXJuIFtdO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSkgcmV0dXJuIHNsaWNlLmNhbGwob2JqKTtcbiAgICBpZiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpIHJldHVybiBfLm1hcChvYmosIF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBfLnZhbHVlcyhvYmopO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIGFuIG9iamVjdC5cbiAgXy5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gMDtcbiAgICByZXR1cm4gKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSA/IG9iai5sZW5ndGggOiBfLmtleXMob2JqKS5sZW5ndGg7XG4gIH07XG5cbiAgLy8gQXJyYXkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgZmlyc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBBbGlhc2VkIGFzIGBoZWFkYCBhbmQgYHRha2VgLiBUaGUgKipndWFyZCoqIGNoZWNrXG4gIC8vIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5maXJzdCA9IF8uaGVhZCA9IF8udGFrZSA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmICgobiA9PSBudWxsKSB8fCBndWFyZCkgcmV0dXJuIGFycmF5WzBdO1xuICAgIGlmIChuIDwgMCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBuKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IGVudHJ5IG9mIHRoZSBhcnJheS4gRXNwZWNpYWxseSB1c2VmdWwgb25cbiAgLy8gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gYWxsIHRoZSB2YWx1ZXMgaW5cbiAgLy8gdGhlIGFycmF5LCBleGNsdWRpbmcgdGhlIGxhc3QgTi4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoXG4gIC8vIGBfLm1hcGAuXG4gIF8uaW5pdGlhbCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBhcnJheS5sZW5ndGggLSAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyAxIDogbikpO1xuICB9O1xuXG4gIC8vIEdldCB0aGUgbGFzdCBlbGVtZW50IG9mIGFuIGFycmF5LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIHRoZSBsYXN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ubGFzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmICgobiA9PSBudWxsKSB8fCBndWFyZCkgcmV0dXJuIGFycmF5W2FycmF5Lmxlbmd0aCAtIDFdO1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBNYXRoLm1heChhcnJheS5sZW5ndGggLSBuLCAwKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgZmlyc3QgZW50cnkgb2YgdGhlIGFycmF5LiBBbGlhc2VkIGFzIGB0YWlsYCBhbmQgYGRyb3BgLlxuICAvLyBFc3BlY2lhbGx5IHVzZWZ1bCBvbiB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyBhbiAqKm4qKiB3aWxsIHJldHVyblxuICAvLyB0aGUgcmVzdCBOIHZhbHVlcyBpbiB0aGUgYXJyYXkuIFRoZSAqKmd1YXJkKipcbiAgLy8gY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLnJlc3QgPSBfLnRhaWwgPSBfLmRyb3AgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyAxIDogbik7XG4gIH07XG5cbiAgLy8gVHJpbSBvdXQgYWxsIGZhbHN5IHZhbHVlcyBmcm9tIGFuIGFycmF5LlxuICBfLmNvbXBhY3QgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgXy5pZGVudGl0eSk7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgaW1wbGVtZW50YXRpb24gb2YgYSByZWN1cnNpdmUgYGZsYXR0ZW5gIGZ1bmN0aW9uLlxuICB2YXIgZmxhdHRlbiA9IGZ1bmN0aW9uKGlucHV0LCBzaGFsbG93LCBvdXRwdXQpIHtcbiAgICBpZiAoc2hhbGxvdyAmJiBfLmV2ZXJ5KGlucHV0LCBfLmlzQXJyYXkpKSB7XG4gICAgICByZXR1cm4gY29uY2F0LmFwcGx5KG91dHB1dCwgaW5wdXQpO1xuICAgIH1cbiAgICBlYWNoKGlucHV0LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc0FyZ3VtZW50cyh2YWx1ZSkpIHtcbiAgICAgICAgc2hhbGxvdyA/IHB1c2guYXBwbHkob3V0cHV0LCB2YWx1ZSkgOiBmbGF0dGVuKHZhbHVlLCBzaGFsbG93LCBvdXRwdXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0cHV0LnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG5cbiAgLy8gRmxhdHRlbiBvdXQgYW4gYXJyYXksIGVpdGhlciByZWN1cnNpdmVseSAoYnkgZGVmYXVsdCksIG9yIGp1c3Qgb25lIGxldmVsLlxuICBfLmZsYXR0ZW4gPSBmdW5jdGlvbihhcnJheSwgc2hhbGxvdykge1xuICAgIHJldHVybiBmbGF0dGVuKGFycmF5LCBzaGFsbG93LCBbXSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgdmVyc2lvbiBvZiB0aGUgYXJyYXkgdGhhdCBkb2VzIG5vdCBjb250YWluIHRoZSBzcGVjaWZpZWQgdmFsdWUocykuXG4gIF8ud2l0aG91dCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZGlmZmVyZW5jZShhcnJheSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcblxuICAvLyBTcGxpdCBhbiBhcnJheSBpbnRvIHR3byBhcnJheXM6IG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgc2F0aXNmeSB0aGUgZ2l2ZW5cbiAgLy8gcHJlZGljYXRlLCBhbmQgb25lIHdob3NlIGVsZW1lbnRzIGFsbCBkbyBub3Qgc2F0aXNmeSB0aGUgcHJlZGljYXRlLlxuICBfLnBhcnRpdGlvbiA9IGZ1bmN0aW9uKGFycmF5LCBwcmVkaWNhdGUpIHtcbiAgICB2YXIgcGFzcyA9IFtdLCBmYWlsID0gW107XG4gICAgZWFjaChhcnJheSwgZnVuY3Rpb24oZWxlbSkge1xuICAgICAgKHByZWRpY2F0ZShlbGVtKSA/IHBhc3MgOiBmYWlsKS5wdXNoKGVsZW0pO1xuICAgIH0pO1xuICAgIHJldHVybiBbcGFzcywgZmFpbF07XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhIGR1cGxpY2F0ZS1mcmVlIHZlcnNpb24gb2YgdGhlIGFycmF5LiBJZiB0aGUgYXJyYXkgaGFzIGFscmVhZHlcbiAgLy8gYmVlbiBzb3J0ZWQsIHlvdSBoYXZlIHRoZSBvcHRpb24gb2YgdXNpbmcgYSBmYXN0ZXIgYWxnb3JpdGhtLlxuICAvLyBBbGlhc2VkIGFzIGB1bmlxdWVgLlxuICBfLnVuaXEgPSBfLnVuaXF1ZSA9IGZ1bmN0aW9uKGFycmF5LCBpc1NvcnRlZCwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGlzU29ydGVkKSkge1xuICAgICAgY29udGV4dCA9IGl0ZXJhdG9yO1xuICAgICAgaXRlcmF0b3IgPSBpc1NvcnRlZDtcbiAgICAgIGlzU29ydGVkID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBpbml0aWFsID0gaXRlcmF0b3IgPyBfLm1hcChhcnJheSwgaXRlcmF0b3IsIGNvbnRleHQpIDogYXJyYXk7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIGVhY2goaW5pdGlhbCwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICBpZiAoaXNTb3J0ZWQgPyAoIWluZGV4IHx8IHNlZW5bc2Vlbi5sZW5ndGggLSAxXSAhPT0gdmFsdWUpIDogIV8uY29udGFpbnMoc2VlbiwgdmFsdWUpKSB7XG4gICAgICAgIHNlZW4ucHVzaCh2YWx1ZSk7XG4gICAgICAgIHJlc3VsdHMucHVzaChhcnJheVtpbmRleF0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdW5pb246IGVhY2ggZGlzdGluY3QgZWxlbWVudCBmcm9tIGFsbCBvZlxuICAvLyB0aGUgcGFzc2VkLWluIGFycmF5cy5cbiAgXy51bmlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuaXEoXy5mbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSkpO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyBldmVyeSBpdGVtIHNoYXJlZCBiZXR3ZWVuIGFsbCB0aGVcbiAgLy8gcGFzc2VkLWluIGFycmF5cy5cbiAgXy5pbnRlcnNlY3Rpb24gPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBfLmZpbHRlcihfLnVuaXEoYXJyYXkpLCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gXy5ldmVyeShyZXN0LCBmdW5jdGlvbihvdGhlcikge1xuICAgICAgICByZXR1cm4gXy5jb250YWlucyhvdGhlciwgaXRlbSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBUYWtlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gb25lIGFycmF5IGFuZCBhIG51bWJlciBvZiBvdGhlciBhcnJheXMuXG4gIC8vIE9ubHkgdGhlIGVsZW1lbnRzIHByZXNlbnQgaW4ganVzdCB0aGUgZmlyc3QgYXJyYXkgd2lsbCByZW1haW4uXG4gIF8uZGlmZmVyZW5jZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIGZ1bmN0aW9uKHZhbHVlKXsgcmV0dXJuICFfLmNvbnRhaW5zKHJlc3QsIHZhbHVlKTsgfSk7XG4gIH07XG5cbiAgLy8gWmlwIHRvZ2V0aGVyIG11bHRpcGxlIGxpc3RzIGludG8gYSBzaW5nbGUgYXJyYXkgLS0gZWxlbWVudHMgdGhhdCBzaGFyZVxuICAvLyBhbiBpbmRleCBnbyB0b2dldGhlci5cbiAgXy56aXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGVuZ3RoID0gXy5tYXgoXy5wbHVjayhhcmd1bWVudHMsICdsZW5ndGgnKS5jb25jYXQoMCkpO1xuICAgIHZhciByZXN1bHRzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0c1tpXSA9IF8ucGx1Y2soYXJndW1lbnRzLCAnJyArIGkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBDb252ZXJ0cyBsaXN0cyBpbnRvIG9iamVjdHMuIFBhc3MgZWl0aGVyIGEgc2luZ2xlIGFycmF5IG9mIGBba2V5LCB2YWx1ZV1gXG4gIC8vIHBhaXJzLCBvciB0d28gcGFyYWxsZWwgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCAtLSBvbmUgb2Yga2V5cywgYW5kIG9uZSBvZlxuICAvLyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gIF8ub2JqZWN0ID0gZnVuY3Rpb24obGlzdCwgdmFsdWVzKSB7XG4gICAgaWYgKGxpc3QgPT0gbnVsbCkgcmV0dXJuIHt9O1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbGlzdC5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICByZXN1bHRbbGlzdFtpXV0gPSB2YWx1ZXNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRbbGlzdFtpXVswXV0gPSBsaXN0W2ldWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIElmIHRoZSBicm93c2VyIGRvZXNuJ3Qgc3VwcGx5IHVzIHdpdGggaW5kZXhPZiAoSSdtIGxvb2tpbmcgYXQgeW91LCAqKk1TSUUqKiksXG4gIC8vIHdlIG5lZWQgdGhpcyBmdW5jdGlvbi4gUmV0dXJuIHRoZSBwb3NpdGlvbiBvZiB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiBhblxuICAvLyBpdGVtIGluIGFuIGFycmF5LCBvciAtMSBpZiB0aGUgaXRlbSBpcyBub3QgaW5jbHVkZWQgaW4gdGhlIGFycmF5LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgaW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICAvLyBJZiB0aGUgYXJyYXkgaXMgbGFyZ2UgYW5kIGFscmVhZHkgaW4gc29ydCBvcmRlciwgcGFzcyBgdHJ1ZWBcbiAgLy8gZm9yICoqaXNTb3J0ZWQqKiB0byB1c2UgYmluYXJ5IHNlYXJjaC5cbiAgXy5pbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGlzU29ydGVkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaSA9IDAsIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgICBpZiAoaXNTb3J0ZWQpIHtcbiAgICAgIGlmICh0eXBlb2YgaXNTb3J0ZWQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgaSA9IChpc1NvcnRlZCA8IDAgPyBNYXRoLm1heCgwLCBsZW5ndGggKyBpc1NvcnRlZCkgOiBpc1NvcnRlZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpID0gXy5zb3J0ZWRJbmRleChhcnJheSwgaXRlbSk7XG4gICAgICAgIHJldHVybiBhcnJheVtpXSA9PT0gaXRlbSA/IGkgOiAtMTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG5hdGl2ZUluZGV4T2YgJiYgYXJyYXkuaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIGFycmF5LmluZGV4T2YoaXRlbSwgaXNTb3J0ZWQpO1xuICAgIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBsYXN0SW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICBfLmxhc3RJbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGZyb20pIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBoYXNJbmRleCA9IGZyb20gIT0gbnVsbDtcbiAgICBpZiAobmF0aXZlTGFzdEluZGV4T2YgJiYgYXJyYXkubGFzdEluZGV4T2YgPT09IG5hdGl2ZUxhc3RJbmRleE9mKSB7XG4gICAgICByZXR1cm4gaGFzSW5kZXggPyBhcnJheS5sYXN0SW5kZXhPZihpdGVtLCBmcm9tKSA6IGFycmF5Lmxhc3RJbmRleE9mKGl0ZW0pO1xuICAgIH1cbiAgICB2YXIgaSA9IChoYXNJbmRleCA/IGZyb20gOiBhcnJheS5sZW5ndGgpO1xuICAgIHdoaWxlIChpLS0pIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGFuIGludGVnZXIgQXJyYXkgY29udGFpbmluZyBhbiBhcml0aG1ldGljIHByb2dyZXNzaW9uLiBBIHBvcnQgb2ZcbiAgLy8gdGhlIG5hdGl2ZSBQeXRob24gYHJhbmdlKClgIGZ1bmN0aW9uLiBTZWVcbiAgLy8gW3RoZSBQeXRob24gZG9jdW1lbnRhdGlvbl0oaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L2Z1bmN0aW9ucy5odG1sI3JhbmdlKS5cbiAgXy5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPD0gMSkge1xuICAgICAgc3RvcCA9IHN0YXJ0IHx8IDA7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICAgIHN0ZXAgPSBhcmd1bWVudHNbMl0gfHwgMTtcblxuICAgIHZhciBsZW5ndGggPSBNYXRoLm1heChNYXRoLmNlaWwoKHN0b3AgLSBzdGFydCkgLyBzdGVwKSwgMCk7XG4gICAgdmFyIGlkeCA9IDA7XG4gICAgdmFyIHJhbmdlID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cbiAgICB3aGlsZShpZHggPCBsZW5ndGgpIHtcbiAgICAgIHJhbmdlW2lkeCsrXSA9IHN0YXJ0O1xuICAgICAgc3RhcnQgKz0gc3RlcDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmFuZ2U7XG4gIH07XG5cbiAgLy8gRnVuY3Rpb24gKGFoZW0pIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXVzYWJsZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgcHJvdG90eXBlIHNldHRpbmcuXG4gIHZhciBjdG9yID0gZnVuY3Rpb24oKXt9O1xuXG4gIC8vIENyZWF0ZSBhIGZ1bmN0aW9uIGJvdW5kIHRvIGEgZ2l2ZW4gb2JqZWN0IChhc3NpZ25pbmcgYHRoaXNgLCBhbmQgYXJndW1lbnRzLFxuICAvLyBvcHRpb25hbGx5KS4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYEZ1bmN0aW9uLmJpbmRgIGlmXG4gIC8vIGF2YWlsYWJsZS5cbiAgXy5iaW5kID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCkge1xuICAgIHZhciBhcmdzLCBib3VuZDtcbiAgICBpZiAobmF0aXZlQmluZCAmJiBmdW5jLmJpbmQgPT09IG5hdGl2ZUJpbmQpIHJldHVybiBuYXRpdmVCaW5kLmFwcGx5KGZ1bmMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgaWYgKCFfLmlzRnVuY3Rpb24oZnVuYykpIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gYm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBib3VuZCkpIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBmdW5jLnByb3RvdHlwZTtcbiAgICAgIHZhciBzZWxmID0gbmV3IGN0b3I7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IG51bGw7XG4gICAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseShzZWxmLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGlmIChPYmplY3QocmVzdWx0KSA9PT0gcmVzdWx0KSByZXR1cm4gcmVzdWx0O1xuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgfTtcblxuICAvLyBQYXJ0aWFsbHkgYXBwbHkgYSBmdW5jdGlvbiBieSBjcmVhdGluZyBhIHZlcnNpb24gdGhhdCBoYXMgaGFkIHNvbWUgb2YgaXRzXG4gIC8vIGFyZ3VtZW50cyBwcmUtZmlsbGVkLCB3aXRob3V0IGNoYW5naW5nIGl0cyBkeW5hbWljIGB0aGlzYCBjb250ZXh0LiBfIGFjdHNcbiAgLy8gYXMgYSBwbGFjZWhvbGRlciwgYWxsb3dpbmcgYW55IGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyB0byBiZSBwcmUtZmlsbGVkLlxuICBfLnBhcnRpYWwgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIGJvdW5kQXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSAwO1xuICAgICAgdmFyIGFyZ3MgPSBib3VuZEFyZ3Muc2xpY2UoKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBhcmdzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhcmdzW2ldID09PSBfKSBhcmdzW2ldID0gYXJndW1lbnRzW3Bvc2l0aW9uKytdO1xuICAgICAgfVxuICAgICAgd2hpbGUgKHBvc2l0aW9uIDwgYXJndW1lbnRzLmxlbmd0aCkgYXJncy5wdXNoKGFyZ3VtZW50c1twb3NpdGlvbisrXSk7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEJpbmQgYSBudW1iZXIgb2YgYW4gb2JqZWN0J3MgbWV0aG9kcyB0byB0aGF0IG9iamVjdC4gUmVtYWluaW5nIGFyZ3VtZW50c1xuICAvLyBhcmUgdGhlIG1ldGhvZCBuYW1lcyB0byBiZSBib3VuZC4gVXNlZnVsIGZvciBlbnN1cmluZyB0aGF0IGFsbCBjYWxsYmFja3NcbiAgLy8gZGVmaW5lZCBvbiBhbiBvYmplY3QgYmVsb25nIHRvIGl0LlxuICBfLmJpbmRBbGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgZnVuY3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKGZ1bmNzLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdiaW5kQWxsIG11c3QgYmUgcGFzc2VkIGZ1bmN0aW9uIG5hbWVzJyk7XG4gICAgZWFjaChmdW5jcywgZnVuY3Rpb24oZikgeyBvYmpbZl0gPSBfLmJpbmQob2JqW2ZdLCBvYmopOyB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIE1lbW9pemUgYW4gZXhwZW5zaXZlIGZ1bmN0aW9uIGJ5IHN0b3JpbmcgaXRzIHJlc3VsdHMuXG4gIF8ubWVtb2l6ZSA9IGZ1bmN0aW9uKGZ1bmMsIGhhc2hlcikge1xuICAgIHZhciBtZW1vID0ge307XG4gICAgaGFzaGVyIHx8IChoYXNoZXIgPSBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIga2V5ID0gaGFzaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gXy5oYXMobWVtbywga2V5KSA/IG1lbW9ba2V5XSA6IChtZW1vW2tleV0gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gRGVsYXlzIGEgZnVuY3Rpb24gZm9yIHRoZSBnaXZlbiBudW1iZXIgb2YgbWlsbGlzZWNvbmRzLCBhbmQgdGhlbiBjYWxsc1xuICAvLyBpdCB3aXRoIHRoZSBhcmd1bWVudHMgc3VwcGxpZWQuXG4gIF8uZGVsYXkgPSBmdW5jdGlvbihmdW5jLCB3YWl0KSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKXsgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJncyk7IH0sIHdhaXQpO1xuICB9O1xuXG4gIC8vIERlZmVycyBhIGZ1bmN0aW9uLCBzY2hlZHVsaW5nIGl0IHRvIHJ1biBhZnRlciB0aGUgY3VycmVudCBjYWxsIHN0YWNrIGhhc1xuICAvLyBjbGVhcmVkLlxuICBfLmRlZmVyID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHJldHVybiBfLmRlbGF5LmFwcGx5KF8sIFtmdW5jLCAxXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCB3aGVuIGludm9rZWQsIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgYXQgbW9zdCBvbmNlXG4gIC8vIGR1cmluZyBhIGdpdmVuIHdpbmRvdyBvZiB0aW1lLiBOb3JtYWxseSwgdGhlIHRocm90dGxlZCBmdW5jdGlvbiB3aWxsIHJ1blxuICAvLyBhcyBtdWNoIGFzIGl0IGNhbiwgd2l0aG91dCBldmVyIGdvaW5nIG1vcmUgdGhhbiBvbmNlIHBlciBgd2FpdGAgZHVyYXRpb247XG4gIC8vIGJ1dCBpZiB5b3UnZCBsaWtlIHRvIGRpc2FibGUgdGhlIGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlLCBwYXNzXG4gIC8vIGB7bGVhZGluZzogZmFsc2V9YC4gVG8gZGlzYWJsZSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2UsIGRpdHRvLlxuICBfLnRocm90dGxlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICAgIHZhciBjb250ZXh0LCBhcmdzLCByZXN1bHQ7XG4gICAgdmFyIHRpbWVvdXQgPSBudWxsO1xuICAgIHZhciBwcmV2aW91cyA9IDA7XG4gICAgb3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHByZXZpb3VzID0gb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSA/IDAgOiBfLm5vdygpO1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vdyA9IF8ubm93KCk7XG4gICAgICBpZiAoIXByZXZpb3VzICYmIG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UpIHByZXZpb3VzID0gbm93O1xuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIHByZXZpb3VzID0gbm93O1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKCF0aW1lb3V0ICYmIG9wdGlvbnMudHJhaWxpbmcgIT09IGZhbHNlKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3RcbiAgLy8gYmUgdHJpZ2dlcmVkLiBUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgaXQgc3RvcHMgYmVpbmcgY2FsbGVkIGZvclxuICAvLyBOIG1pbGxpc2Vjb25kcy4gSWYgYGltbWVkaWF0ZWAgaXMgcGFzc2VkLCB0cmlnZ2VyIHRoZSBmdW5jdGlvbiBvbiB0aGVcbiAgLy8gbGVhZGluZyBlZGdlLCBpbnN0ZWFkIG9mIHRoZSB0cmFpbGluZy5cbiAgXy5kZWJvdW5jZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIGltbWVkaWF0ZSkge1xuICAgIHZhciB0aW1lb3V0LCBhcmdzLCBjb250ZXh0LCB0aW1lc3RhbXAsIHJlc3VsdDtcblxuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGxhc3QgPSBfLm5vdygpIC0gdGltZXN0YW1wO1xuICAgICAgaWYgKGxhc3QgPCB3YWl0KSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0IC0gbGFzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgaWYgKCFpbW1lZGlhdGUpIHtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICB0aW1lc3RhbXAgPSBfLm5vdygpO1xuICAgICAgdmFyIGNhbGxOb3cgPSBpbW1lZGlhdGUgJiYgIXRpbWVvdXQ7XG4gICAgICBpZiAoIXRpbWVvdXQpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgfVxuICAgICAgaWYgKGNhbGxOb3cpIHtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93XG4gIC8vIG9mdGVuIHlvdSBjYWxsIGl0LiBVc2VmdWwgZm9yIGxhenkgaW5pdGlhbGl6YXRpb24uXG4gIF8ub25jZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB2YXIgcmFuID0gZmFsc2UsIG1lbW87XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHJhbikgcmV0dXJuIG1lbW87XG4gICAgICByYW4gPSB0cnVlO1xuICAgICAgbWVtbyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGZ1bmMgPSBudWxsO1xuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBmdW5jdGlvbiBwYXNzZWQgYXMgYW4gYXJndW1lbnQgdG8gdGhlIHNlY29uZCxcbiAgLy8gYWxsb3dpbmcgeW91IHRvIGFkanVzdCBhcmd1bWVudHMsIHJ1biBjb2RlIGJlZm9yZSBhbmQgYWZ0ZXIsIGFuZFxuICAvLyBjb25kaXRpb25hbGx5IGV4ZWN1dGUgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uLlxuICBfLndyYXAgPSBmdW5jdGlvbihmdW5jLCB3cmFwcGVyKSB7XG4gICAgcmV0dXJuIF8ucGFydGlhbCh3cmFwcGVyLCBmdW5jKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBpcyB0aGUgY29tcG9zaXRpb24gb2YgYSBsaXN0IG9mIGZ1bmN0aW9ucywgZWFjaFxuICAvLyBjb25zdW1pbmcgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gdGhhdCBmb2xsb3dzLlxuICBfLmNvbXBvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnVuY3MgPSBhcmd1bWVudHM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBmb3IgKHZhciBpID0gZnVuY3MubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXJncyA9IFtmdW5jc1tpXS5hcHBseSh0aGlzLCBhcmdzKV07XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJnc1swXTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCBhZnRlciBiZWluZyBjYWxsZWQgTiB0aW1lcy5cbiAgXy5hZnRlciA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPCAxKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBPYmplY3QgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXRyaWV2ZSB0aGUgbmFtZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYE9iamVjdC5rZXlzYFxuICBfLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIFtdO1xuICAgIGlmIChuYXRpdmVLZXlzKSByZXR1cm4gbmF0aXZlS2V5cyhvYmopO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgdGhlIHZhbHVlcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICBfLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZXNbaV0gPSBvYmpba2V5c1tpXV07XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH07XG5cbiAgLy8gQ29udmVydCBhbiBvYmplY3QgaW50byBhIGxpc3Qgb2YgYFtrZXksIHZhbHVlXWAgcGFpcnMuXG4gIF8ucGFpcnMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBwYWlyc1tpXSA9IFtrZXlzW2ldLCBvYmpba2V5c1tpXV1dO1xuICAgIH1cbiAgICByZXR1cm4gcGFpcnM7XG4gIH07XG5cbiAgLy8gSW52ZXJ0IHRoZSBrZXlzIGFuZCB2YWx1ZXMgb2YgYW4gb2JqZWN0LiBUaGUgdmFsdWVzIG11c3QgYmUgc2VyaWFsaXphYmxlLlxuICBfLmludmVydCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICByZXN1bHRbb2JqW2tleXNbaV1dXSA9IGtleXNbaV07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgc29ydGVkIGxpc3Qgb2YgdGhlIGZ1bmN0aW9uIG5hbWVzIGF2YWlsYWJsZSBvbiB0aGUgb2JqZWN0LlxuICAvLyBBbGlhc2VkIGFzIGBtZXRob2RzYFxuICBfLmZ1bmN0aW9ucyA9IF8ubWV0aG9kcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBuYW1lcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24ob2JqW2tleV0pKSBuYW1lcy5wdXNoKGtleSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lcy5zb3J0KCk7XG4gIH07XG5cbiAgLy8gRXh0ZW5kIGEgZ2l2ZW4gb2JqZWN0IHdpdGggYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHBhc3NlZC1pbiBvYmplY3QocykuXG4gIF8uZXh0ZW5kID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5waWNrID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGVhY2goa2V5cywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoa2V5IGluIG9iaikgY29weVtrZXldID0gb2JqW2tleV07XG4gICAgfSk7XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCB3aXRob3V0IHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLm9taXQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgY29weSA9IHt9O1xuICAgIHZhciBrZXlzID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKCFfLmNvbnRhaW5zKGtleXMsIGtleSkpIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICAvLyBGaWxsIGluIGEgZ2l2ZW4gb2JqZWN0IHdpdGggZGVmYXVsdCBwcm9wZXJ0aWVzLlxuICBfLmRlZmF1bHRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIGlmIChvYmpbcHJvcF0gPT09IHZvaWQgMCkgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSAoc2hhbGxvdy1jbG9uZWQpIGR1cGxpY2F0ZSBvZiBhbiBvYmplY3QuXG4gIF8uY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gXy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBvYmopO1xuICB9O1xuXG4gIC8vIEludm9rZXMgaW50ZXJjZXB0b3Igd2l0aCB0aGUgb2JqLCBhbmQgdGhlbiByZXR1cm5zIG9iai5cbiAgLy8gVGhlIHByaW1hcnkgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2QgY2hhaW4sIGluXG4gIC8vIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW4gdGhlIGNoYWluLlxuICBfLnRhcCA9IGZ1bmN0aW9uKG9iaiwgaW50ZXJjZXB0b3IpIHtcbiAgICBpbnRlcmNlcHRvcihvYmopO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgcmVjdXJzaXZlIGNvbXBhcmlzb24gZnVuY3Rpb24gZm9yIGBpc0VxdWFsYC5cbiAgdmFyIGVxID0gZnVuY3Rpb24oYSwgYiwgYVN0YWNrLCBiU3RhY2spIHtcbiAgICAvLyBJZGVudGljYWwgb2JqZWN0cyBhcmUgZXF1YWwuIGAwID09PSAtMGAsIGJ1dCB0aGV5IGFyZW4ndCBpZGVudGljYWwuXG4gICAgLy8gU2VlIHRoZSBbSGFybW9ueSBgZWdhbGAgcHJvcG9zYWxdKGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6ZWdhbCkuXG4gICAgaWYgKGEgPT09IGIpIHJldHVybiBhICE9PSAwIHx8IDEgLyBhID09IDEgLyBiO1xuICAgIC8vIEEgc3RyaWN0IGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYG51bGwgPT0gdW5kZWZpbmVkYC5cbiAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGEgPT09IGI7XG4gICAgLy8gVW53cmFwIGFueSB3cmFwcGVkIG9iamVjdHMuXG4gICAgaWYgKGEgaW5zdGFuY2VvZiBfKSBhID0gYS5fd3JhcHBlZDtcbiAgICBpZiAoYiBpbnN0YW5jZW9mIF8pIGIgPSBiLl93cmFwcGVkO1xuICAgIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSk7XG4gICAgaWYgKGNsYXNzTmFtZSAhPSB0b1N0cmluZy5jYWxsKGIpKSByZXR1cm4gZmFsc2U7XG4gICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgIC8vIFN0cmluZ3MsIG51bWJlcnMsIGRhdGVzLCBhbmQgYm9vbGVhbnMgYXJlIGNvbXBhcmVkIGJ5IHZhbHVlLlxuICAgICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzpcbiAgICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgICAgLy8gZXF1aXZhbGVudCB0byBgbmV3IFN0cmluZyhcIjVcIilgLlxuICAgICAgICByZXR1cm4gYSA9PSBTdHJpbmcoYik7XG4gICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgICAvLyBgTmFOYHMgYXJlIGVxdWl2YWxlbnQsIGJ1dCBub24tcmVmbGV4aXZlLiBBbiBgZWdhbGAgY29tcGFyaXNvbiBpcyBwZXJmb3JtZWQgZm9yXG4gICAgICAgIC8vIG90aGVyIG51bWVyaWMgdmFsdWVzLlxuICAgICAgICByZXR1cm4gYSAhPSArYSA/IGIgIT0gK2IgOiAoYSA9PSAwID8gMSAvIGEgPT0gMSAvIGIgOiBhID09ICtiKTtcbiAgICAgIGNhc2UgJ1tvYmplY3QgRGF0ZV0nOlxuICAgICAgY2FzZSAnW29iamVjdCBCb29sZWFuXSc6XG4gICAgICAgIC8vIENvZXJjZSBkYXRlcyBhbmQgYm9vbGVhbnMgdG8gbnVtZXJpYyBwcmltaXRpdmUgdmFsdWVzLiBEYXRlcyBhcmUgY29tcGFyZWQgYnkgdGhlaXJcbiAgICAgICAgLy8gbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zLiBOb3RlIHRoYXQgaW52YWxpZCBkYXRlcyB3aXRoIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAvLyBvZiBgTmFOYCBhcmUgbm90IGVxdWl2YWxlbnQuXG4gICAgICAgIHJldHVybiArYSA9PSArYjtcbiAgICAgIC8vIFJlZ0V4cHMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyIHNvdXJjZSBwYXR0ZXJucyBhbmQgZmxhZ3MuXG4gICAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOlxuICAgICAgICByZXR1cm4gYS5zb3VyY2UgPT0gYi5zb3VyY2UgJiZcbiAgICAgICAgICAgICAgIGEuZ2xvYmFsID09IGIuZ2xvYmFsICYmXG4gICAgICAgICAgICAgICBhLm11bHRpbGluZSA9PSBiLm11bHRpbGluZSAmJlxuICAgICAgICAgICAgICAgYS5pZ25vcmVDYXNlID09IGIuaWdub3JlQ2FzZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBhICE9ICdvYmplY3QnIHx8IHR5cGVvZiBiICE9ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gQXNzdW1lIGVxdWFsaXR5IGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhlIGFsZ29yaXRobSBmb3IgZGV0ZWN0aW5nIGN5Y2xpY1xuICAgIC8vIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gLlxuICAgIHZhciBsZW5ndGggPSBhU3RhY2subGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgLy8gTGluZWFyIHNlYXJjaC4gUGVyZm9ybWFuY2UgaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mXG4gICAgICAvLyB1bmlxdWUgbmVzdGVkIHN0cnVjdHVyZXMuXG4gICAgICBpZiAoYVN0YWNrW2xlbmd0aF0gPT0gYSkgcmV0dXJuIGJTdGFja1tsZW5ndGhdID09IGI7XG4gICAgfVxuICAgIC8vIE9iamVjdHMgd2l0aCBkaWZmZXJlbnQgY29uc3RydWN0b3JzIGFyZSBub3QgZXF1aXZhbGVudCwgYnV0IGBPYmplY3Rgc1xuICAgIC8vIGZyb20gZGlmZmVyZW50IGZyYW1lcyBhcmUuXG4gICAgdmFyIGFDdG9yID0gYS5jb25zdHJ1Y3RvciwgYkN0b3IgPSBiLmNvbnN0cnVjdG9yO1xuICAgIGlmIChhQ3RvciAhPT0gYkN0b3IgJiYgIShfLmlzRnVuY3Rpb24oYUN0b3IpICYmIChhQ3RvciBpbnN0YW5jZW9mIGFDdG9yKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oYkN0b3IpICYmIChiQ3RvciBpbnN0YW5jZW9mIGJDdG9yKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICYmICgnY29uc3RydWN0b3InIGluIGEgJiYgJ2NvbnN0cnVjdG9yJyBpbiBiKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBBZGQgdGhlIGZpcnN0IG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnB1c2goYSk7XG4gICAgYlN0YWNrLnB1c2goYik7XG4gICAgdmFyIHNpemUgPSAwLCByZXN1bHQgPSB0cnVlO1xuICAgIC8vIFJlY3Vyc2l2ZWx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgIGlmIChjbGFzc05hbWUgPT0gJ1tvYmplY3QgQXJyYXldJykge1xuICAgICAgLy8gQ29tcGFyZSBhcnJheSBsZW5ndGhzIHRvIGRldGVybWluZSBpZiBhIGRlZXAgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkuXG4gICAgICBzaXplID0gYS5sZW5ndGg7XG4gICAgICByZXN1bHQgPSBzaXplID09IGIubGVuZ3RoO1xuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAvLyBEZWVwIGNvbXBhcmUgdGhlIGNvbnRlbnRzLCBpZ25vcmluZyBub24tbnVtZXJpYyBwcm9wZXJ0aWVzLlxuICAgICAgICB3aGlsZSAoc2l6ZS0tKSB7XG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gZXEoYVtzaXplXSwgYltzaXplXSwgYVN0YWNrLCBiU3RhY2spKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRGVlcCBjb21wYXJlIG9iamVjdHMuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYSkge1xuICAgICAgICBpZiAoXy5oYXMoYSwga2V5KSkge1xuICAgICAgICAgIC8vIENvdW50IHRoZSBleHBlY3RlZCBudW1iZXIgb2YgcHJvcGVydGllcy5cbiAgICAgICAgICBzaXplKys7XG4gICAgICAgICAgLy8gRGVlcCBjb21wYXJlIGVhY2ggbWVtYmVyLlxuICAgICAgICAgIGlmICghKHJlc3VsdCA9IF8uaGFzKGIsIGtleSkgJiYgZXEoYVtrZXldLCBiW2tleV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBFbnN1cmUgdGhhdCBib3RoIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBudW1iZXIgb2YgcHJvcGVydGllcy5cbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgZm9yIChrZXkgaW4gYikge1xuICAgICAgICAgIGlmIChfLmhhcyhiLCBrZXkpICYmICEoc2l6ZS0tKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gIXNpemU7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJlbW92ZSB0aGUgZmlyc3Qgb2JqZWN0IGZyb20gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wb3AoKTtcbiAgICBiU3RhY2sucG9wKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBQZXJmb3JtIGEgZGVlcCBjb21wYXJpc29uIHRvIGNoZWNrIGlmIHR3byBvYmplY3RzIGFyZSBlcXVhbC5cbiAgXy5pc0VxdWFsID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBlcShhLCBiLCBbXSwgW10pO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gYXJyYXksIHN0cmluZywgb3Igb2JqZWN0IGVtcHR5P1xuICAvLyBBbiBcImVtcHR5XCIgb2JqZWN0IGhhcyBubyBlbnVtZXJhYmxlIG93bi1wcm9wZXJ0aWVzLlxuICBfLmlzRW1wdHkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiB0cnVlO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSB8fCBfLmlzU3RyaW5nKG9iaikpIHJldHVybiBvYmoubGVuZ3RoID09PSAwO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgRE9NIGVsZW1lbnQ/XG4gIF8uaXNFbGVtZW50ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuICEhKG9iaiAmJiBvYmoubm9kZVR5cGUgPT09IDEpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYW4gYXJyYXk/XG4gIC8vIERlbGVnYXRlcyB0byBFQ01BNSdzIG5hdGl2ZSBBcnJheS5pc0FycmF5XG4gIF8uaXNBcnJheSA9IG5hdGl2ZUlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBBcnJheV0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgYW4gb2JqZWN0P1xuICBfLmlzT2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gT2JqZWN0KG9iaik7XG4gIH07XG5cbiAgLy8gQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAuXG4gIGVhY2goWydBcmd1bWVudHMnLCAnRnVuY3Rpb24nLCAnU3RyaW5nJywgJ051bWJlcicsICdEYXRlJywgJ1JlZ0V4cCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgX1snaXMnICsgbmFtZV0gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRGVmaW5lIGEgZmFsbGJhY2sgdmVyc2lvbiBvZiB0aGUgbWV0aG9kIGluIGJyb3dzZXJzIChhaGVtLCBJRSksIHdoZXJlXG4gIC8vIHRoZXJlIGlzbid0IGFueSBpbnNwZWN0YWJsZSBcIkFyZ3VtZW50c1wiIHR5cGUuXG4gIGlmICghXy5pc0FyZ3VtZW50cyhhcmd1bWVudHMpKSB7XG4gICAgXy5pc0FyZ3VtZW50cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuICEhKG9iaiAmJiBfLmhhcyhvYmosICdjYWxsZWUnKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIE9wdGltaXplIGBpc0Z1bmN0aW9uYCBpZiBhcHByb3ByaWF0ZS5cbiAgaWYgKHR5cGVvZiAoLy4vKSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIF8uaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdmdW5jdGlvbic7XG4gICAgfTtcbiAgfVxuXG4gIC8vIElzIGEgZ2l2ZW4gb2JqZWN0IGEgZmluaXRlIG51bWJlcj9cbiAgXy5pc0Zpbml0ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBpc0Zpbml0ZShvYmopICYmICFpc05hTihwYXJzZUZsb2F0KG9iaikpO1xuICB9O1xuXG4gIC8vIElzIHRoZSBnaXZlbiB2YWx1ZSBgTmFOYD8gKE5hTiBpcyB0aGUgb25seSBudW1iZXIgd2hpY2ggZG9lcyBub3QgZXF1YWwgaXRzZWxmKS5cbiAgXy5pc05hTiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfLmlzTnVtYmVyKG9iaikgJiYgb2JqICE9ICtvYmo7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIGJvb2xlYW4/XG4gIF8uaXNCb29sZWFuID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdHJ1ZSB8fCBvYmogPT09IGZhbHNlIHx8IHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBlcXVhbCB0byBudWxsP1xuICBfLmlzTnVsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IG51bGw7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSB1bmRlZmluZWQ/XG4gIF8uaXNVbmRlZmluZWQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB2b2lkIDA7XG4gIH07XG5cbiAgLy8gU2hvcnRjdXQgZnVuY3Rpb24gZm9yIGNoZWNraW5nIGlmIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBwcm9wZXJ0eSBkaXJlY3RseVxuICAvLyBvbiBpdHNlbGYgKGluIG90aGVyIHdvcmRzLCBub3Qgb24gYSBwcm90b3R5cGUpLlxuICBfLmhhcyA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xuICB9O1xuXG4gIC8vIFV0aWxpdHkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUnVuIFVuZGVyc2NvcmUuanMgaW4gKm5vQ29uZmxpY3QqIG1vZGUsIHJldHVybmluZyB0aGUgYF9gIHZhcmlhYmxlIHRvIGl0c1xuICAvLyBwcmV2aW91cyBvd25lci4gUmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJvb3QuXyA9IHByZXZpb3VzVW5kZXJzY29yZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvLyBLZWVwIHRoZSBpZGVudGl0eSBmdW5jdGlvbiBhcm91bmQgZm9yIGRlZmF1bHQgaXRlcmF0b3JzLlxuICBfLmlkZW50aXR5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgXy5jb25zdGFudCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICB9O1xuXG4gIF8ucHJvcGVydHkgPSBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqW2tleV07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgcHJlZGljYXRlIGZvciBjaGVja2luZyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2YgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ubWF0Y2hlcyA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgaWYgKG9iaiA9PT0gYXR0cnMpIHJldHVybiB0cnVlOyAvL2F2b2lkIGNvbXBhcmluZyBhbiBvYmplY3QgdG8gaXRzZWxmLlxuICAgICAgZm9yICh2YXIga2V5IGluIGF0dHJzKSB7XG4gICAgICAgIGlmIChhdHRyc1trZXldICE9PSBvYmpba2V5XSlcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH07XG5cbiAgLy8gUnVuIGEgZnVuY3Rpb24gKipuKiogdGltZXMuXG4gIF8udGltZXMgPSBmdW5jdGlvbihuLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciBhY2N1bSA9IEFycmF5KE1hdGgubWF4KDAsIG4pKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykgYWNjdW1baV0gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIGkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG1pbiBhbmQgbWF4IChpbmNsdXNpdmUpLlxuICBfLnJhbmRvbSA9IGZ1bmN0aW9uKG1pbiwgbWF4KSB7XG4gICAgaWYgKG1heCA9PSBudWxsKSB7XG4gICAgICBtYXggPSBtaW47XG4gICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbiAgfTtcblxuICAvLyBBIChwb3NzaWJseSBmYXN0ZXIpIHdheSB0byBnZXQgdGhlIGN1cnJlbnQgdGltZXN0YW1wIGFzIGFuIGludGVnZXIuXG4gIF8ubm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuICAvLyBMaXN0IG9mIEhUTUwgZW50aXRpZXMgZm9yIGVzY2FwaW5nLlxuICB2YXIgZW50aXR5TWFwID0ge1xuICAgIGVzY2FwZToge1xuICAgICAgJyYnOiAnJmFtcDsnLFxuICAgICAgJzwnOiAnJmx0OycsXG4gICAgICAnPic6ICcmZ3Q7JyxcbiAgICAgICdcIic6ICcmcXVvdDsnLFxuICAgICAgXCInXCI6ICcmI3gyNzsnXG4gICAgfVxuICB9O1xuICBlbnRpdHlNYXAudW5lc2NhcGUgPSBfLmludmVydChlbnRpdHlNYXAuZXNjYXBlKTtcblxuICAvLyBSZWdleGVzIGNvbnRhaW5pbmcgdGhlIGtleXMgYW5kIHZhbHVlcyBsaXN0ZWQgaW1tZWRpYXRlbHkgYWJvdmUuXG4gIHZhciBlbnRpdHlSZWdleGVzID0ge1xuICAgIGVzY2FwZTogICBuZXcgUmVnRXhwKCdbJyArIF8ua2V5cyhlbnRpdHlNYXAuZXNjYXBlKS5qb2luKCcnKSArICddJywgJ2cnKSxcbiAgICB1bmVzY2FwZTogbmV3IFJlZ0V4cCgnKCcgKyBfLmtleXMoZW50aXR5TWFwLnVuZXNjYXBlKS5qb2luKCd8JykgKyAnKScsICdnJylcbiAgfTtcblxuICAvLyBGdW5jdGlvbnMgZm9yIGVzY2FwaW5nIGFuZCB1bmVzY2FwaW5nIHN0cmluZ3MgdG8vZnJvbSBIVE1MIGludGVycG9sYXRpb24uXG4gIF8uZWFjaChbJ2VzY2FwZScsICd1bmVzY2FwZSddLCBmdW5jdGlvbihtZXRob2QpIHtcbiAgICBfW21ldGhvZF0gPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIGlmIChzdHJpbmcgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuICgnJyArIHN0cmluZykucmVwbGFjZShlbnRpdHlSZWdleGVzW21ldGhvZF0sIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiBlbnRpdHlNYXBbbWV0aG9kXVttYXRjaF07XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBJZiB0aGUgdmFsdWUgb2YgdGhlIG5hbWVkIGBwcm9wZXJ0eWAgaXMgYSBmdW5jdGlvbiB0aGVuIGludm9rZSBpdCB3aXRoIHRoZVxuICAvLyBgb2JqZWN0YCBhcyBjb250ZXh0OyBvdGhlcndpc2UsIHJldHVybiBpdC5cbiAgXy5yZXN1bHQgPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7XG4gICAgaWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIHZhciB2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgcmV0dXJuIF8uaXNGdW5jdGlvbih2YWx1ZSkgPyB2YWx1ZS5jYWxsKG9iamVjdCkgOiB2YWx1ZTtcbiAgfTtcblxuICAvLyBBZGQgeW91ciBvd24gY3VzdG9tIGZ1bmN0aW9ucyB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubWl4aW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKF8uZnVuY3Rpb25zKG9iaiksIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmdW5jID0gX1tuYW1lXSA9IG9ialtuYW1lXTtcbiAgICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW3RoaXMuX3dyYXBwZWRdO1xuICAgICAgICBwdXNoLmFwcGx5KGFyZ3MsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBmdW5jLmFwcGx5KF8sIGFyZ3MpKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYSB1bmlxdWUgaW50ZWdlciBpZCAodW5pcXVlIHdpdGhpbiB0aGUgZW50aXJlIGNsaWVudCBzZXNzaW9uKS5cbiAgLy8gVXNlZnVsIGZvciB0ZW1wb3JhcnkgRE9NIGlkcy5cbiAgdmFyIGlkQ291bnRlciA9IDA7XG4gIF8udW5pcXVlSWQgPSBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICB2YXIgaWQgPSArK2lkQ291bnRlciArICcnO1xuICAgIHJldHVybiBwcmVmaXggPyBwcmVmaXggKyBpZCA6IGlkO1xuICB9O1xuXG4gIC8vIEJ5IGRlZmF1bHQsIFVuZGVyc2NvcmUgdXNlcyBFUkItc3R5bGUgdGVtcGxhdGUgZGVsaW1pdGVycywgY2hhbmdlIHRoZVxuICAvLyBmb2xsb3dpbmcgdGVtcGxhdGUgc2V0dGluZ3MgdG8gdXNlIGFsdGVybmF0aXZlIGRlbGltaXRlcnMuXG4gIF8udGVtcGxhdGVTZXR0aW5ncyA9IHtcbiAgICBldmFsdWF0ZSAgICA6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gICAgaW50ZXJwb2xhdGUgOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgICBlc2NhcGUgICAgICA6IC88JS0oW1xcc1xcU10rPyklPi9nXG4gIH07XG5cbiAgLy8gV2hlbiBjdXN0b21pemluZyBgdGVtcGxhdGVTZXR0aW5nc2AsIGlmIHlvdSBkb24ndCB3YW50IHRvIGRlZmluZSBhblxuICAvLyBpbnRlcnBvbGF0aW9uLCBldmFsdWF0aW9uIG9yIGVzY2FwaW5nIHJlZ2V4LCB3ZSBuZWVkIG9uZSB0aGF0IGlzXG4gIC8vIGd1YXJhbnRlZWQgbm90IHRvIG1hdGNoLlxuICB2YXIgbm9NYXRjaCA9IC8oLileLztcblxuICAvLyBDZXJ0YWluIGNoYXJhY3RlcnMgbmVlZCB0byBiZSBlc2NhcGVkIHNvIHRoYXQgdGhleSBjYW4gYmUgcHV0IGludG8gYVxuICAvLyBzdHJpbmcgbGl0ZXJhbC5cbiAgdmFyIGVzY2FwZXMgPSB7XG4gICAgXCInXCI6ICAgICAgXCInXCIsXG4gICAgJ1xcXFwnOiAgICAgJ1xcXFwnLFxuICAgICdcXHInOiAgICAgJ3InLFxuICAgICdcXG4nOiAgICAgJ24nLFxuICAgICdcXHQnOiAgICAgJ3QnLFxuICAgICdcXHUyMDI4JzogJ3UyMDI4JyxcbiAgICAnXFx1MjAyOSc6ICd1MjAyOSdcbiAgfTtcblxuICB2YXIgZXNjYXBlciA9IC9cXFxcfCd8XFxyfFxcbnxcXHR8XFx1MjAyOHxcXHUyMDI5L2c7XG5cbiAgLy8gSmF2YVNjcmlwdCBtaWNyby10ZW1wbGF0aW5nLCBzaW1pbGFyIHRvIEpvaG4gUmVzaWcncyBpbXBsZW1lbnRhdGlvbi5cbiAgLy8gVW5kZXJzY29yZSB0ZW1wbGF0aW5nIGhhbmRsZXMgYXJiaXRyYXJ5IGRlbGltaXRlcnMsIHByZXNlcnZlcyB3aGl0ZXNwYWNlLFxuICAvLyBhbmQgY29ycmVjdGx5IGVzY2FwZXMgcXVvdGVzIHdpdGhpbiBpbnRlcnBvbGF0ZWQgY29kZS5cbiAgXy50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHRleHQsIGRhdGEsIHNldHRpbmdzKSB7XG4gICAgdmFyIHJlbmRlcjtcbiAgICBzZXR0aW5ncyA9IF8uZGVmYXVsdHMoe30sIHNldHRpbmdzLCBfLnRlbXBsYXRlU2V0dGluZ3MpO1xuXG4gICAgLy8gQ29tYmluZSBkZWxpbWl0ZXJzIGludG8gb25lIHJlZ3VsYXIgZXhwcmVzc2lvbiB2aWEgYWx0ZXJuYXRpb24uXG4gICAgdmFyIG1hdGNoZXIgPSBuZXcgUmVnRXhwKFtcbiAgICAgIChzZXR0aW5ncy5lc2NhcGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmludGVycG9sYXRlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5ldmFsdWF0ZSB8fCBub01hdGNoKS5zb3VyY2VcbiAgICBdLmpvaW4oJ3wnKSArICd8JCcsICdnJyk7XG5cbiAgICAvLyBDb21waWxlIHRoZSB0ZW1wbGF0ZSBzb3VyY2UsIGVzY2FwaW5nIHN0cmluZyBsaXRlcmFscyBhcHByb3ByaWF0ZWx5LlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNvdXJjZSA9IFwiX19wKz0nXCI7XG4gICAgdGV4dC5yZXBsYWNlKG1hdGNoZXIsIGZ1bmN0aW9uKG1hdGNoLCBlc2NhcGUsIGludGVycG9sYXRlLCBldmFsdWF0ZSwgb2Zmc2V0KSB7XG4gICAgICBzb3VyY2UgKz0gdGV4dC5zbGljZShpbmRleCwgb2Zmc2V0KVxuICAgICAgICAucmVwbGFjZShlc2NhcGVyLCBmdW5jdGlvbihtYXRjaCkgeyByZXR1cm4gJ1xcXFwnICsgZXNjYXBlc1ttYXRjaF07IH0pO1xuXG4gICAgICBpZiAoZXNjYXBlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgZXNjYXBlICsgXCIpKT09bnVsbD8nJzpfLmVzY2FwZShfX3QpKStcXG4nXCI7XG4gICAgICB9XG4gICAgICBpZiAoaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBpbnRlcnBvbGF0ZSArIFwiKSk9PW51bGw/Jyc6X190KStcXG4nXCI7XG4gICAgICB9XG4gICAgICBpZiAoZXZhbHVhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJztcXG5cIiArIGV2YWx1YXRlICsgXCJcXG5fX3ArPSdcIjtcbiAgICAgIH1cbiAgICAgIGluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuICAgICAgcmV0dXJuIG1hdGNoO1xuICAgIH0pO1xuICAgIHNvdXJjZSArPSBcIic7XFxuXCI7XG5cbiAgICAvLyBJZiBhIHZhcmlhYmxlIGlzIG5vdCBzcGVjaWZpZWQsIHBsYWNlIGRhdGEgdmFsdWVzIGluIGxvY2FsIHNjb3BlLlxuICAgIGlmICghc2V0dGluZ3MudmFyaWFibGUpIHNvdXJjZSA9ICd3aXRoKG9ianx8e30pe1xcbicgKyBzb3VyY2UgKyAnfVxcbic7XG5cbiAgICBzb3VyY2UgPSBcInZhciBfX3QsX19wPScnLF9faj1BcnJheS5wcm90b3R5cGUuam9pbixcIiArXG4gICAgICBcInByaW50PWZ1bmN0aW9uKCl7X19wKz1fX2ouY2FsbChhcmd1bWVudHMsJycpO307XFxuXCIgK1xuICAgICAgc291cmNlICsgXCJyZXR1cm4gX19wO1xcblwiO1xuXG4gICAgdHJ5IHtcbiAgICAgIHJlbmRlciA9IG5ldyBGdW5jdGlvbihzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJywgJ18nLCBzb3VyY2UpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGUuc291cmNlID0gc291cmNlO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICBpZiAoZGF0YSkgcmV0dXJuIHJlbmRlcihkYXRhLCBfKTtcbiAgICB2YXIgdGVtcGxhdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gcmVuZGVyLmNhbGwodGhpcywgZGF0YSwgXyk7XG4gICAgfTtcblxuICAgIC8vIFByb3ZpZGUgdGhlIGNvbXBpbGVkIGZ1bmN0aW9uIHNvdXJjZSBhcyBhIGNvbnZlbmllbmNlIGZvciBwcmVjb21waWxhdGlvbi5cbiAgICB0ZW1wbGF0ZS5zb3VyY2UgPSAnZnVuY3Rpb24oJyArIChzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJykgKyAnKXtcXG4nICsgc291cmNlICsgJ30nO1xuXG4gICAgcmV0dXJuIHRlbXBsYXRlO1xuICB9O1xuXG4gIC8vIEFkZCBhIFwiY2hhaW5cIiBmdW5jdGlvbiwgd2hpY2ggd2lsbCBkZWxlZ2F0ZSB0byB0aGUgd3JhcHBlci5cbiAgXy5jaGFpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfKG9iaikuY2hhaW4oKTtcbiAgfTtcblxuICAvLyBPT1BcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG4gIC8vIElmIFVuZGVyc2NvcmUgaXMgY2FsbGVkIGFzIGEgZnVuY3Rpb24sIGl0IHJldHVybnMgYSB3cmFwcGVkIG9iamVjdCB0aGF0XG4gIC8vIGNhbiBiZSB1c2VkIE9PLXN0eWxlLiBUaGlzIHdyYXBwZXIgaG9sZHMgYWx0ZXJlZCB2ZXJzaW9ucyBvZiBhbGwgdGhlXG4gIC8vIHVuZGVyc2NvcmUgZnVuY3Rpb25zLiBXcmFwcGVkIG9iamVjdHMgbWF5IGJlIGNoYWluZWQuXG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNvbnRpbnVlIGNoYWluaW5nIGludGVybWVkaWF0ZSByZXN1bHRzLlxuICB2YXIgcmVzdWx0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NoYWluID8gXyhvYmopLmNoYWluKCkgOiBvYmo7XG4gIH07XG5cbiAgLy8gQWRkIGFsbCBvZiB0aGUgVW5kZXJzY29yZSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIgb2JqZWN0LlxuICBfLm1peGluKF8pO1xuXG4gIC8vIEFkZCBhbGwgbXV0YXRvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIGVhY2goWydwb3AnLCAncHVzaCcsICdyZXZlcnNlJywgJ3NoaWZ0JywgJ3NvcnQnLCAnc3BsaWNlJywgJ3Vuc2hpZnQnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgb2JqID0gdGhpcy5fd3JhcHBlZDtcbiAgICAgIG1ldGhvZC5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICBpZiAoKG5hbWUgPT0gJ3NoaWZ0JyB8fCBuYW1lID09ICdzcGxpY2UnKSAmJiBvYmoubGVuZ3RoID09PSAwKSBkZWxldGUgb2JqWzBdO1xuICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIG9iaik7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gQWRkIGFsbCBhY2Nlc3NvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIGVhY2goWydjb25jYXQnLCAnam9pbicsICdzbGljZSddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBtZXRob2QuYXBwbHkodGhpcy5fd3JhcHBlZCwgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgXy5leHRlbmQoXy5wcm90b3R5cGUsIHtcblxuICAgIC8vIFN0YXJ0IGNoYWluaW5nIGEgd3JhcHBlZCBVbmRlcnNjb3JlIG9iamVjdC5cbiAgICBjaGFpbjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9jaGFpbiA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy8gRXh0cmFjdHMgdGhlIHJlc3VsdCBmcm9tIGEgd3JhcHBlZCBhbmQgY2hhaW5lZCBvYmplY3QuXG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3dyYXBwZWQ7XG4gICAgfVxuXG4gIH0pO1xuXG4gIC8vIEFNRCByZWdpc3RyYXRpb24gaGFwcGVucyBhdCB0aGUgZW5kIGZvciBjb21wYXRpYmlsaXR5IHdpdGggQU1EIGxvYWRlcnNcbiAgLy8gdGhhdCBtYXkgbm90IGVuZm9yY2UgbmV4dC10dXJuIHNlbWFudGljcyBvbiBtb2R1bGVzLiBFdmVuIHRob3VnaCBnZW5lcmFsXG4gIC8vIHByYWN0aWNlIGZvciBBTUQgcmVnaXN0cmF0aW9uIGlzIHRvIGJlIGFub255bW91cywgdW5kZXJzY29yZSByZWdpc3RlcnNcbiAgLy8gYXMgYSBuYW1lZCBtb2R1bGUgYmVjYXVzZSwgbGlrZSBqUXVlcnksIGl0IGlzIGEgYmFzZSBsaWJyYXJ5IHRoYXQgaXNcbiAgLy8gcG9wdWxhciBlbm91Z2ggdG8gYmUgYnVuZGxlZCBpbiBhIHRoaXJkIHBhcnR5IGxpYiwgYnV0IG5vdCBiZSBwYXJ0IG9mXG4gIC8vIGFuIEFNRCBsb2FkIHJlcXVlc3QuIFRob3NlIGNhc2VzIGNvdWxkIGdlbmVyYXRlIGFuIGVycm9yIHdoZW4gYW5cbiAgLy8gYW5vbnltb3VzIGRlZmluZSgpIGlzIGNhbGxlZCBvdXRzaWRlIG9mIGEgbG9hZGVyIHJlcXVlc3QuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoJ3VuZGVyc2NvcmUnLCBbXSwgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXztcbiAgICB9KTtcbiAgfVxufSkuY2FsbCh0aGlzKTtcbiJdfQ==
