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
},{"./sprite":12}],2:[function(require,module,exports){
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
		canvas: [ Math.round(this.canvas.width * 0.5), Math.round(this.canvas.height * 0.5), 0]
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

			player.setHitBoxesVisible(showHitBoxes);
			player.draw(dContext);

			player.cycle();

			movingObjects.each(function (movingObject, i) {
				movingObject.draw(dContext);
			});
			
			staticObjects.each(function (staticObject, i) {
				if (staticObject.draw) {
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
},{"./sprite":12,"./spriteArray":13,"eventedloop":17}],5:[function(require,module,exports){
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
		ctx.drawImage(hudImage, 0, 0, ctx.canvas.width, hudImage.height, 0, 0, ctx.canvas.width, hudImage.height);
		
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
},{"./sprite":12}],9:[function(require,module,exports){
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

		that.isMoving = true;
		that.hasBeenHit = false;
		that.isJumping = false;
		that.isPerformingTrick = false;
		that.onHitObstacleCb = function() {};
		that.onCollectItemCb = function() {};
		that.setSpeed(standardSpeed);

		that.reset = function () {
			obstaclesHit = [];
			pixelsTravelled = 0;
			that.isMoving = true;
			that.hasBeenHit = false;
			canSpeedBoost = true;
			setNormal();
		};

		function setNormal() {
			that.setSpeed(standardSpeed);
			that.isMoving = true;
			that.hasBeenHit = false;
			that.isJumping = false;
			that.isPerformingTrick = false;
			if (cancelableStateInterval) {
				clearInterval(cancelableStateInterval);
			}
			that.setMapPosition(undefined, undefined, 0);
		}

		function setCrashed() {
			that.isMoving = false;
			that.hasBeenHit = true;
			that.isJumping = false;
			that.isPerformingTrick = false;
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

		function getTrickSprite() {
			console.log('Trick step is', trickStep);
			if (trickStep === 0) {
				return 'jumping';
			} else if (trickStep === 1) {
				return 'somersault1';
			} else {
				return 'somersault2';
			}
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
					if (that.isPerformingTrick) {
						return getTrickSprite();
					}
					return getJumpingSprite();
				}

				if (that.hasBeenHit) {
					return 'hit';
				}

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
				setTimeout(function () {
					that.setSpeed(originalSpeed);
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
		return that;
	}

	global.player = Player;
})(this);

if (typeof module !== 'undefined') {
	module.exports = this.player;
}

},{"./sprite":12}],10:[function(require,module,exports){
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
var Sprite = require('./sprite');

(function(global) {
	function Snowboarder(data) {
		var that = new Sprite(data);
		var sup = {
			draw: that.superior('draw'),
			cycle: that.superior('cycle')
		};
		var directions = {
			sEast: function(xDiff) { return xDiff > 0; },
			sWest: function(xDiff) { return xDiff <= 0; }
		};
		var standardSpeed = 3;

		that.setSpeed(standardSpeed);

		function getDirection() {
			var xDiff = that.movingToward[0] - that.mapPosition[0];
			var yDiff = that.movingToward[1] - that.mapPosition[1];

			if (directions.sEast(xDiff)) {
				return 'sEast';
			} else {
				return 'sWest';
			}
		}

		that.cycle = function (dContext) {
			if (Number.random(10) === 1) {
				that.setMapPositionTarget(dContext.getRandomlyInTheCentreOfMap());
				that.setSpeed(standardSpeed + Number.random(-1, 1));
			}

			that.setMapPositionTarget(undefined, dContext.getMapBelowViewport() + 600);

			sup.cycle();
		};

		that.draw = function(dContext) {
			var spritePartToUse = function () {
				return getDirection();
			};

			return sup.draw(dContext, spritePartToUse());
		};

		return that;
	}

	global.snowboarder = Snowboarder;
})( this );


if (typeof module !== 'undefined') {
	module.exports = this.snowboarder;
}
},{"./sprite":12}],12:[function(require,module,exports){
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
},{"./animatedSprite":1,"./guid":6}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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
var Snowboarder = require('./lib/snowboarder');
var Player = require('./lib/player');
var GameHud = require('./lib/gameHud');
var Game = require('./lib/game');

// Local variables for starting the game
var mainCanvas = document.getElementById('game-canvas');
var dContext = mainCanvas.getContext('2d');

var imageSources = [ 'assets/cart-sprites.png', 'assets/sprite-characters.png', 'assets/skifree-objects.png', 
	'assets/token-sprites.png', 'assets/milkshake-sprite.png', 'assets/malord-sprites.png', 'assets/hatguy-sprites.png', 'assets/pilot-sprites.png',
	'assets/traffic-cone-large.png', 'assets/traffic-cone-small.png', 'assets/garbage-can.png' ];

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

var dropRates = { trafficConeLarge: 1, trafficConeSmall: 1, garbageCan: 1, jump: 1, thickSnow: 1, 
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

	function spawnBoarder () {
		var newBoarder = new Snowboarder(sprites.snowboarder);
		var randomPositionAbove = dContext.getRandomMapPositionAboveViewport();
		var randomPositionBelow = dContext.getRandomMapPositionBelowViewport();
		newBoarder.setMapPosition(randomPositionAbove[0], randomPositionAbove[1]);
		newBoarder.setMapPositionTarget(randomPositionBelow[0], randomPositionBelow[1]);
		newBoarder.onHitting(player, sprites.snowboarder.hitBehaviour.player);

		game.addMovingObject(newBoarder);
	}

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

	game.beforeCycle(function () {
		var newObjects = [];
		if (player.isMoving) {
			newObjects = Sprite.createObjects([
				{ sprite: sprites.jump, dropRate: dropRates.jump },
				{ sprite: sprites.thickSnow, dropRate: dropRates.thickSnow },
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

			// Disabled snowboarder spawn for cart conversion
			//randomlySpawnNPC(spawnBoarder, 0.1);

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
	//Mousetrap.bind('b', spawnBoarder);
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

	$('.play').click(function() {
		$('#menu').hide();
		mainCanvas.style.display = '';
		game.start();
		currentTrack = sounds.track1;
		currentTrack.play();
	  });

	showMainMenu();
}

function resizeCanvas() {
	mainCanvas.width = window.innerWidth;
	mainCanvas.height = window.innerHeight;
}

$('.credits').click(function() {
	$('#main').hide();
	$('#credits').show();
	$('#menu').addClass('credits');
  });

$('.back').click(function() {
	$('#credits').hide();
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

},{"./lib/animatedSprite":1,"./lib/canvasRenderingContext2DExtensions":2,"./lib/extenders":3,"./lib/game":4,"./lib/gameHud":5,"./lib/isMobileDevice":7,"./lib/monster":8,"./lib/player":9,"./lib/plugins":10,"./lib/snowboarder":11,"./lib/sprite":12,"./lib/spriteArray":13,"./spriteInfo":15,"br-mousetrap":16}],15:[function(require,module,exports){
const game = require("./lib/game");

(function (global) {
	var sprites = {
		'emptycart' : {
			$imageFile : 'assets/cart-sprites.png',
			parts : {
				blank : [ 0, 0, 0, 0 ],
				east : [ 0, 210, 120, 99 ],
				esEast : [ 247, 104, 105, 104 ],
				sEast : [ 140, 104, 79, 104 ],
				south : [ 26, 104, 67, 104 ],
				sWest : [ 260, 0, 79, 104 ],
				wsWest : [ 127, 0, 105, 104 ],
				west : [ 0,0,120,104 ],
				hit : [ 26, 104, 67, 104 ],
				jumping : [ 26, 104, 67, 104 ],
				somersault1 : [ 26, 104, 67, 104 ],
				somersault1 : [ 26, 104, 67, 104 ]
			},
			hitBoxes: {
				//Left, Top, Right, Bottom
				0: [ 5, 10, 62, 90 ]
			},
			id : 'player',
			hitBehaviour: {}
		},
		'player-hatguy': {
			$imageFile : 'assets/hatguy-sprites.png',
			parts : {
				// x, y, width, height, canvasOffsetX, canvasOffsetY, hitboxOffsetX, hitboxOffsetY 
				blank : [ 0, 0, 0, 0 ],
				east : [ 91, 0, 98, 91, 0, 0, 35, 0 ],
				esEast : [ 70, 187, 91,99, 0, 0, 31, 0 ],
				sEast : [ 143, 91, 73, 96, 0, 0, 13, 0 ],
				south : [ 83, 91, 60, 95 ],
				sWest : [ 0, 187, 70, 96 ],
				wsWest : [ 0, 91, 83, 92 ],
				west : [ 0, 0, 91, 85 ],
				hit : [ 83, 91, 60, 95 ],
				jumping : [ 161, 187, 65, 151, 0, -45 ],
				somersault1 : [ 83, 91, 60, 95 ],
				somersault1 : [ 83, 91, 60, 95 ],
				boost : [ 161, 187, 65, 151, 0, -45 ]
			},
			hitBoxes: {
				//Left, Top, Right, Bottom
				0: [ 5, 20, 55, 90 ]
			},
			id : 'player',
			hitBehaviour: {}
		},
		'player': {
			$imageFile : 'assets/pilot-sprites.png',
			parts : {
				// x, y, width, height, canvasOffsetX, canvasOffsetY, hitboxOffsetX, hitboxOffsetY 
				blank : [ 0, 0, 0, 0 ],
				east : [ 43, 0, 70, 68, 0, 0, 25, 0 ],
				esEast : [ 0, 113, 65, 71, 0, 0, 21, 0 ],
				sEast : [ 43, 195, 57, 74, 0, 0, 13, 0 ],
				south : [ 0, 195, 43, 68 ],
				sWest : [ 0, 269, 54, 74, 0 ],
				wsWest : [ 0, 343, 60, 67 ],
				west : [ 54, 269, 65, 62 ],
				hit : [ 60, 343, 67, 71 ],
				jumping : [ 0, 0, 43, 113, 0, -45 ],//[ 65, 113, 51, 82, 0, -45 ],
				somersault1 : [ 0, 195, 43, 68 ], // match south for now
				somersault1 : [ 0, 195, 43, 68 ], // match south for now
				boost : [ 0, 0, 43, 113, 0, -45 ]
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
		'thickSnow' : {
			$imageFile : 'assets/skifree-objects.png',
			parts : {
				main : [ 143, 53, 43, 10 ]
			},
			hitBehaviour: {}
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
			$imageFile : 'assets/skifree-objects.png',
			parts : {
				main : [ 109, 55, 32, 8 ]
			},
			hitBehaviour: {}
		},
		'signStart' : {
			$imageFile : 'assets/skifree-objects.png',
			parts : {
				main : [ 260, 103, 42, 27 ]
			},
			hitBehaviour: {}
		},
		'snowboarder' : {
			$imageFile : 'assets/sprite-characters.png',
			parts : {
				sEast : [ 73, 229, 20, 29 ],
				sWest : [ 95, 228, 26, 30 ]
			},
			hitBehaviour: {}
		},
		'emptyChairLift': {
			$imageFile: 'assets/skifree-objects.png',
			parts: {
				main : [ 92, 136, 26, 30 ]
			},
			zIndexesOccupied : [1],
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

	function playerHitsThickSnowBehaviour(player, thickSnow) {
		// Need to implement this properly
		player.setSpeed(2);
		setTimeout(function() {
			player.resetSpeed();
		}, 700);
	}

	function thickSnowHitsPlayerBehaviour(thickSnow, player) {
		// Need to implement this properly
		player.setSpeed(2);
		setTimeout(function() {
			player.resetSpeed();
		}, 300);
	}

	sprites.thickSnow.hitBehaviour.player = thickSnowHitsPlayerBehaviour;
	sprites.player.hitBehaviour.thickSnow = playerHitsThickSnowBehaviour;

	function snowboarderHitsPlayerBehaviour(snowboarder, player) {
		player.hasHitObstacle(snowboarder);
	}
	sprites.snowboarder.hitBehaviour.player = snowboarderHitsPlayerBehaviour;

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
},{"./lib/game":4}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{"events":18,"underscore":19}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{}]},{},[14])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9saWIvYW5pbWF0ZWRTcHJpdGUuanMiLCJqcy9saWIvY2FudmFzUmVuZGVyaW5nQ29udGV4dDJERXh0ZW5zaW9ucy5qcyIsImpzL2xpYi9leHRlbmRlcnMuanMiLCJqcy9saWIvZ2FtZS5qcyIsImpzL2xpYi9nYW1lSHVkLmpzIiwianMvbGliL2d1aWQuanMiLCJqcy9saWIvaXNNb2JpbGVEZXZpY2UuanMiLCJqcy9saWIvbW9uc3Rlci5qcyIsImpzL2xpYi9wbGF5ZXIuanMiLCJqcy9saWIvcGx1Z2lucy5qcyIsImpzL2xpYi9zbm93Ym9hcmRlci5qcyIsImpzL2xpYi9zcHJpdGUuanMiLCJqcy9saWIvc3ByaXRlQXJyYXkuanMiLCJqcy9tYWluLmpzIiwianMvc3ByaXRlSW5mby5qcyIsIm5vZGVfbW9kdWxlcy9ici1tb3VzZXRyYXAvbW91c2V0cmFwLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50ZWRsb29wL2xpYi9tYWluLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCJub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6ZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy95QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDekxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwidmFyIFNwcml0ZSA9IHJlcXVpcmUoJy4vc3ByaXRlJyk7XHJcblxyXG4oZnVuY3Rpb24oZ2xvYmFsKSB7XHJcblx0ZnVuY3Rpb24gQW5pbWF0ZWRTcHJpdGUoZGF0YSkge1xyXG5cdFx0dmFyIHRoYXQgPSBuZXcgU3ByaXRlKGRhdGEpO1xyXG5cdFx0dmFyIHN1cGVyX2RyYXcgPSB0aGF0LnN1cGVyaW9yKCdkcmF3Jyk7XHJcblx0XHR2YXIgY3VycmVudEZyYW1lID0gMDtcclxuXHRcdHZhciBzdGFydGVkID0gZmFsc2U7XHJcblxyXG5cdFx0dGhhdC5kcmF3ID0gZnVuY3Rpb24oZENvbnRleHQpIHtcclxuXHRcdFx0dmFyIHNwcml0ZVBhcnRUb1VzZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRpZiAoIXN0YXJ0ZWQpIHtcclxuXHRcdFx0XHRcdHN0YXJ0ZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0c3RhcnRBbmltYXRpb24oKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIE9iamVjdC5rZXlzKGRhdGEucGFydHMpW2N1cnJlbnRGcmFtZV07XHJcblx0XHRcdH07XHJcblx0XHRcdHJldHVybiBzdXBlcl9kcmF3KGRDb250ZXh0LCBzcHJpdGVQYXJ0VG9Vc2UoKSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIHN0YXJ0QW5pbWF0aW9uKCkge1xyXG5cdFx0XHRjdXJyZW50RnJhbWUgKz0gMTtcclxuXHRcdFx0aWYgKGN1cnJlbnRGcmFtZSA8IE9iamVjdC5rZXlzKGRhdGEucGFydHMpLmxlbmd0aCkge1xyXG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyBcclxuXHRcdFx0XHRcdHN0YXJ0QW5pbWF0aW9uKCk7XHJcblx0XHRcdFx0fSwgMzAwKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRjdXJyZW50RnJhbWUgPSAwO1xyXG5cdFx0XHRcdHN0YXJ0ZWQgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoYXQuc3RhcnRBbmltYXRpb24gPSBzdGFydEFuaW1hdGlvbjtcclxuXHJcblx0XHRyZXR1cm4gdGhhdDtcclxuXHR9XHJcblxyXG5cdGdsb2JhbC5hbmltYXRlZFNwcml0ZSA9IEFuaW1hdGVkU3ByaXRlO1xyXG59KSggdGhpcyApO1xyXG5cclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG5cdG1vZHVsZS5leHBvcnRzID0gdGhpcy5hbmltYXRlZFNwcml0ZTtcclxufSIsIkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuc3RvcmVMb2FkZWRJbWFnZSA9IGZ1bmN0aW9uIChrZXksIGltYWdlKSB7XHJcblx0aWYgKCF0aGlzLmltYWdlcykge1xyXG5cdFx0dGhpcy5pbWFnZXMgPSB7fTtcclxuXHR9XHJcblxyXG5cdHRoaXMuaW1hZ2VzW2tleV0gPSBpbWFnZTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0TG9hZGVkSW1hZ2UgPSBmdW5jdGlvbiAoa2V5KSB7XHJcblx0aWYgKHRoaXMuaW1hZ2VzW2tleV0pIHtcclxuXHRcdHJldHVybiB0aGlzLmltYWdlc1trZXldO1xyXG5cdH1cclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZm9sbG93U3ByaXRlID0gZnVuY3Rpb24gKHNwcml0ZSkge1xyXG5cdHRoaXMuY2VudHJhbFNwcml0ZSA9IHNwcml0ZTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0Q2VudHJhbFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xyXG5cdHJldHVybiB7XHJcblx0XHRtYXA6IHRoaXMuY2VudHJhbFNwcml0ZS5tYXBQb3NpdGlvbixcclxuXHRcdGNhbnZhczogWyBNYXRoLnJvdW5kKHRoaXMuY2FudmFzLndpZHRoICogMC41KSwgTWF0aC5yb3VuZCh0aGlzLmNhbnZhcy5oZWlnaHQgKiAwLjUpLCAwXVxyXG5cdH07XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLm1hcFBvc2l0aW9uVG9DYW52YXNQb3NpdGlvbiA9IGZ1bmN0aW9uIChwb3NpdGlvbikge1xyXG5cdHZhciBjZW50cmFsID0gdGhpcy5nZXRDZW50cmFsUG9zaXRpb24oKTtcclxuXHR2YXIgY2VudHJhbE1hcFBvc2l0aW9uID0gY2VudHJhbC5tYXA7XHJcblx0dmFyIGNlbnRyYWxDYW52YXNQb3NpdGlvbiA9IGNlbnRyYWwuY2FudmFzO1xyXG5cdHZhciBtYXBEaWZmZXJlbmNlWCA9IGNlbnRyYWxNYXBQb3NpdGlvblswXSAtIHBvc2l0aW9uWzBdO1xyXG5cdHZhciBtYXBEaWZmZXJlbmNlWSA9IGNlbnRyYWxNYXBQb3NpdGlvblsxXSAtIHBvc2l0aW9uWzFdO1xyXG5cdHJldHVybiBbIGNlbnRyYWxDYW52YXNQb3NpdGlvblswXSAtIG1hcERpZmZlcmVuY2VYLCBjZW50cmFsQ2FudmFzUG9zaXRpb25bMV0gLSBtYXBEaWZmZXJlbmNlWSBdO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5jYW52YXNQb3NpdGlvblRvTWFwUG9zaXRpb24gPSBmdW5jdGlvbiAocG9zaXRpb24pIHtcclxuXHR2YXIgY2VudHJhbCA9IHRoaXMuZ2V0Q2VudHJhbFBvc2l0aW9uKCk7XHJcblx0dmFyIGNlbnRyYWxNYXBQb3NpdGlvbiA9IGNlbnRyYWwubWFwO1xyXG5cdHZhciBjZW50cmFsQ2FudmFzUG9zaXRpb24gPSBjZW50cmFsLmNhbnZhcztcclxuXHR2YXIgbWFwRGlmZmVyZW5jZVggPSBjZW50cmFsQ2FudmFzUG9zaXRpb25bMF0gLSBwb3NpdGlvblswXTtcclxuXHR2YXIgbWFwRGlmZmVyZW5jZVkgPSBjZW50cmFsQ2FudmFzUG9zaXRpb25bMV0gLSBwb3NpdGlvblsxXTtcclxuXHRyZXR1cm4gWyBjZW50cmFsTWFwUG9zaXRpb25bMF0gLSBtYXBEaWZmZXJlbmNlWCwgY2VudHJhbE1hcFBvc2l0aW9uWzFdIC0gbWFwRGlmZmVyZW5jZVkgXTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0Q2VudHJlT2ZWaWV3cG9ydCA9IGZ1bmN0aW9uICgpIHtcclxuXHRyZXR1cm4gKHRoaXMuY2FudmFzLndpZHRoIC8gMikuZmxvb3IoKTtcclxufTtcclxuXHJcbi8vIFktcG9zIGNhbnZhcyBmdW5jdGlvbnNcclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRNaWRkbGVPZlZpZXdwb3J0ID0gZnVuY3Rpb24gKCkge1xyXG5cdHJldHVybiAodGhpcy5jYW52YXMuaGVpZ2h0IC8gMikuZmxvb3IoKTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0QmVsb3dWaWV3cG9ydCA9IGZ1bmN0aW9uICgpIHtcclxuXHRyZXR1cm4gdGhpcy5jYW52YXMuaGVpZ2h0LmZsb29yKCk7XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmdldE1hcEJlbG93Vmlld3BvcnQgPSBmdW5jdGlvbiAoKSB7XHJcblx0dmFyIGJlbG93ID0gdGhpcy5nZXRCZWxvd1ZpZXdwb3J0KCk7XHJcblx0cmV0dXJuIHRoaXMuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFsgMCwgYmVsb3cgXSlbMV07XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmdldFJhbmRvbWx5SW5UaGVDZW50cmVPZkNhbnZhcyA9IGZ1bmN0aW9uIChidWZmZXIpIHtcclxuXHR2YXIgbWluID0gMDtcclxuXHR2YXIgbWF4ID0gdGhpcy5jYW52YXMud2lkdGg7XHJcblxyXG5cdGlmIChidWZmZXIpIHtcclxuXHRcdG1pbiAtPSBidWZmZXI7XHJcblx0XHRtYXggKz0gYnVmZmVyO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIE51bWJlci5yYW5kb20obWluLCBtYXgpO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRSYW5kb21seUluVGhlQ2VudHJlT2ZNYXAgPSBmdW5jdGlvbiAoYnVmZmVyKSB7XHJcblx0dmFyIHJhbmRvbSA9IHRoaXMuZ2V0UmFuZG9tbHlJblRoZUNlbnRyZU9mQ2FudmFzKGJ1ZmZlcik7XHJcblx0cmV0dXJuIHRoaXMuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFsgcmFuZG9tLCAwIF0pWzBdO1xyXG59O1xyXG5cclxuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5nZXRSYW5kb21NYXBQb3NpdGlvbkJlbG93Vmlld3BvcnQgPSBmdW5jdGlvbiAoKSB7XHJcblx0dmFyIHhDYW52YXMgPSB0aGlzLmdldFJhbmRvbWx5SW5UaGVDZW50cmVPZkNhbnZhcygpO1xyXG5cdHZhciB5Q2FudmFzID0gdGhpcy5nZXRCZWxvd1ZpZXdwb3J0KCk7XHJcblx0cmV0dXJuIHRoaXMuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFsgeENhbnZhcywgeUNhbnZhcyBdKTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0UmFuZG9tTWFwUG9zaXRpb25BYm92ZVZpZXdwb3J0ID0gZnVuY3Rpb24gKCkge1xyXG5cdHZhciB4Q2FudmFzID0gdGhpcy5nZXRSYW5kb21seUluVGhlQ2VudHJlT2ZDYW52YXMoKTtcclxuXHR2YXIgeUNhbnZhcyA9IHRoaXMuZ2V0QWJvdmVWaWV3cG9ydCgpO1xyXG5cdHJldHVybiB0aGlzLmNhbnZhc1Bvc2l0aW9uVG9NYXBQb3NpdGlvbihbIHhDYW52YXMsIHlDYW52YXMgXSk7XHJcbn07XHJcblxyXG5DYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmdldFRvcE9mVmlld3BvcnQgPSBmdW5jdGlvbiAoKSB7XHJcblx0cmV0dXJuIHRoaXMuY2FudmFzUG9zaXRpb25Ub01hcFBvc2l0aW9uKFsgMCwgMCBdKVsxXTtcclxufTtcclxuXHJcbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZ2V0QWJvdmVWaWV3cG9ydCA9IGZ1bmN0aW9uICgpIHtcclxuXHRyZXR1cm4gMCAtICh0aGlzLmNhbnZhcy5oZWlnaHQgLyA0KS5mbG9vcigpO1xyXG59OyIsIi8vIEV4dGVuZHMgZnVuY3Rpb24gc28gdGhhdCBuZXctYWJsZSBvYmplY3RzIGNhbiBiZSBnaXZlbiBuZXcgbWV0aG9kcyBlYXNpbHlcclxuRnVuY3Rpb24ucHJvdG90eXBlLm1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBmdW5jKSB7XHJcbiAgICB0aGlzLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmM7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8vIFdpbGwgcmV0dXJuIHRoZSBvcmlnaW5hbCBtZXRob2Qgb2YgYW4gb2JqZWN0IHdoZW4gaW5oZXJpdGluZyBmcm9tIGFub3RoZXJcclxuT2JqZWN0Lm1ldGhvZCgnc3VwZXJpb3InLCBmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdmFyIG1ldGhvZCA9IHRoYXRbbmFtZV07XHJcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIG1ldGhvZC5hcHBseSh0aGF0LCBhcmd1bWVudHMpO1xyXG4gICAgfTtcclxufSk7IiwidmFyIFNwcml0ZUFycmF5ID0gcmVxdWlyZSgnLi9zcHJpdGVBcnJheScpO1xyXG52YXIgRXZlbnRlZExvb3AgPSByZXF1aXJlKCdldmVudGVkbG9vcCcpO1xyXG5jb25zdCBzcHJpdGUgPSByZXF1aXJlKCcuL3Nwcml0ZScpO1xyXG5cclxuKGZ1bmN0aW9uIChnbG9iYWwpIHtcclxuXHRmdW5jdGlvbiBHYW1lIChtYWluQ2FudmFzLCBwbGF5ZXIpIHtcclxuXHRcdHZhciBzdGF0aWNPYmplY3RzID0gbmV3IFNwcml0ZUFycmF5KCk7XHJcblx0XHR2YXIgbW92aW5nT2JqZWN0cyA9IG5ldyBTcHJpdGVBcnJheSgpO1xyXG5cdFx0dmFyIHVpRWxlbWVudHMgPSBuZXcgU3ByaXRlQXJyYXkoKTtcclxuXHRcdHZhciBkQ29udGV4dCA9IG1haW5DYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHRcdHZhciBzaG93SGl0Qm94ZXMgPSBmYWxzZTtcclxuXHRcdFxyXG5cdFx0Ly8gU2Nyb2xsaW5nIGJhY2tncm91bmRcclxuXHRcdHZhciBiYWNrZ3JvdW5kSW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdGJhY2tncm91bmRJbWFnZS5zcmMgPSAnYXNzZXRzL2JhY2tncm91bmQucG5nJztcclxuXHRcdHZhciBiYWNrZ3JvdW5kWCA9IDA7XHJcblx0XHR2YXIgYmFja2dyb3VuZFkgPSAwO1xyXG5cclxuXHRcdHZhciBtb3VzZVggPSBkQ29udGV4dC5nZXRDZW50cmVPZlZpZXdwb3J0KCk7XHJcblx0XHR2YXIgbW91c2VZID0gMDtcclxuXHRcdHZhciBwYXVzZWQgPSBmYWxzZTtcclxuXHRcdHZhciB0aGF0ID0gdGhpcztcclxuXHRcdHZhciBiZWZvcmVDeWNsZUNhbGxiYWNrcyA9IFtdO1xyXG5cdFx0dmFyIGFmdGVyQ3ljbGVDYWxsYmFja3MgPSBbXTtcclxuXHRcdHZhciBnYW1lTG9vcCA9IG5ldyBFdmVudGVkTG9vcCgpO1xyXG5cclxuXHRcdHRoaXMudG9nZ2xlSGl0Qm94ZXMgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0c2hvd0hpdEJveGVzID0gIXNob3dIaXRCb3hlcztcclxuXHRcdFx0c3RhdGljT2JqZWN0cy5lYWNoKGZ1bmN0aW9uIChzcHJpdGUpIHtcclxuXHRcdFx0XHRzcHJpdGUuc2V0SGl0Qm94ZXNWaXNpYmxlKHNob3dIaXRCb3hlcyk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmFkZFN0YXRpY09iamVjdCA9IGZ1bmN0aW9uIChzcHJpdGUpIHtcclxuXHRcdFx0c3ByaXRlLnNldEhpdEJveGVzVmlzaWJsZShzaG93SGl0Qm94ZXMpO1xyXG5cdFx0XHRzdGF0aWNPYmplY3RzLnB1c2goc3ByaXRlKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5hZGRTdGF0aWNPYmplY3RzID0gZnVuY3Rpb24gKHNwcml0ZXMpIHtcclxuXHRcdFx0c3ByaXRlcy5mb3JFYWNoKHRoaXMuYWRkU3RhdGljT2JqZWN0LmJpbmQodGhpcykpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmFkZE1vdmluZ09iamVjdCA9IGZ1bmN0aW9uIChtb3ZpbmdPYmplY3QsIG1vdmluZ09iamVjdFR5cGUpIHtcclxuXHRcdFx0aWYgKG1vdmluZ09iamVjdFR5cGUpIHtcclxuXHRcdFx0XHRzdGF0aWNPYmplY3RzLm9uUHVzaChmdW5jdGlvbiAob2JqKSB7XHJcblx0XHRcdFx0XHRpZiAob2JqLmRhdGEgJiYgb2JqLmRhdGEuaGl0QmVoYXZpb3VyW21vdmluZ09iamVjdFR5cGVdKSB7XHJcblx0XHRcdFx0XHRcdG9iai5vbkhpdHRpbmcobW92aW5nT2JqZWN0LCBvYmouZGF0YS5oaXRCZWhhdmlvdXJbbW92aW5nT2JqZWN0VHlwZV0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sIHRydWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRtb3ZpbmdPYmplY3Quc2V0SGl0Qm94ZXNWaXNpYmxlKHNob3dIaXRCb3hlcyk7XHJcblx0XHRcdG1vdmluZ09iamVjdHMucHVzaChtb3ZpbmdPYmplY3QpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmFkZFVJRWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XHJcblx0XHRcdHVpRWxlbWVudHMucHVzaChlbGVtZW50KTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5iZWZvcmVDeWNsZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG5cdFx0XHRiZWZvcmVDeWNsZUNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5hZnRlckN5Y2xlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcblx0XHRcdGFmdGVyQ3ljbGVDYWxsYmFja3MucHVzaChjYWxsYmFjayk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0TW91c2VYID0gZnVuY3Rpb24gKHgpIHtcclxuXHRcdFx0bW91c2VYID0geDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXRNb3VzZVkgPSBmdW5jdGlvbiAoeSkge1xyXG5cdFx0XHRtb3VzZVkgPSB5O1xyXG5cdFx0fTtcclxuXHJcblx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb24oMCwgMCk7XHJcblx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb25UYXJnZXQoMCwgLTEwKTtcclxuXHRcdGRDb250ZXh0LmZvbGxvd1Nwcml0ZShwbGF5ZXIpO1xyXG5cclxuXHRcdHZhciBpbnRlcnZhbE51bSA9IDA7XHJcblxyXG5cdFx0dGhpcy5jeWNsZSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdGJlZm9yZUN5Y2xlQ2FsbGJhY2tzLmVhY2goZnVuY3Rpb24oYykge1xyXG5cdFx0XHRcdGMoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDbGVhciBjYW52YXNcclxuXHRcdFx0dmFyIG1vdXNlTWFwUG9zaXRpb24gPSBkQ29udGV4dC5jYW52YXNQb3NpdGlvblRvTWFwUG9zaXRpb24oW21vdXNlWCwgbW91c2VZXSk7XHJcblxyXG5cdFx0XHRpZiAoIXBsYXllci5pc0p1bXBpbmcpIHtcclxuXHRcdFx0XHRwbGF5ZXIuc2V0TWFwUG9zaXRpb25UYXJnZXQobW91c2VNYXBQb3NpdGlvblswXSwgbW91c2VNYXBQb3NpdGlvblsxXSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGludGVydmFsTnVtKys7XHJcblxyXG5cdFx0XHRwbGF5ZXIuY3ljbGUoKTtcclxuXHJcblx0XHRcdG1vdmluZ09iamVjdHMuZWFjaChmdW5jdGlvbiAobW92aW5nT2JqZWN0LCBpKSB7XHJcblx0XHRcdFx0bW92aW5nT2JqZWN0LmN5Y2xlKGRDb250ZXh0KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0XHRzdGF0aWNPYmplY3RzLmN1bGwoKTtcclxuXHRcdFx0c3RhdGljT2JqZWN0cy5lYWNoKGZ1bmN0aW9uIChzdGF0aWNPYmplY3QsIGkpIHtcclxuXHRcdFx0XHRpZiAoc3RhdGljT2JqZWN0LmN5Y2xlKSB7XHJcblx0XHRcdFx0XHRzdGF0aWNPYmplY3QuY3ljbGUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dWlFbGVtZW50cy5lYWNoKGZ1bmN0aW9uICh1aUVsZW1lbnQsIGkpIHtcclxuXHRcdFx0XHRpZiAodWlFbGVtZW50LmN5Y2xlKSB7XHJcblx0XHRcdFx0XHR1aUVsZW1lbnQuY3ljbGUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0YWZ0ZXJDeWNsZUNhbGxiYWNrcy5lYWNoKGZ1bmN0aW9uKGMpIHtcclxuXHRcdFx0XHRjKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHRmdW5jdGlvbiBkcmF3QmFja2dyb3VuZCgpIHtcclxuXHRcdFx0Ly8gU3RyZXRjaCBiYWNrZ3JvdW5kIGltYWdlIHRvIGNhbnZhcyBzaXplXHJcblx0XHRcdGJhY2tncm91bmRJbWFnZS53aWR0aCA9IG1haW5DYW52YXMud2lkdGg7XHJcblx0XHRcdGJhY2tncm91bmRJbWFnZS5oZWlnaHQgPSBtYWluQ2FudmFzLmhlaWdodDtcclxuXHRcdFx0XHJcblx0XHRcdGJhY2tncm91bmRYID0gcGxheWVyLm1hcFBvc2l0aW9uWzBdICUgYmFja2dyb3VuZEltYWdlLndpZHRoICogLTE7XHJcblx0XHRcdGJhY2tncm91bmRZID0gcGxheWVyLm1hcFBvc2l0aW9uWzFdICUgYmFja2dyb3VuZEltYWdlLmhlaWdodCAqIC0xO1xyXG5cclxuXHRcdFx0Ly8gUmVkcmF3IGJhY2tncm91bmRcclxuXHRcdFx0ZENvbnRleHQuZHJhd0ltYWdlKGJhY2tncm91bmRJbWFnZSwgYmFja2dyb3VuZFgsIGJhY2tncm91bmRZLCBtYWluQ2FudmFzLndpZHRoLCBiYWNrZ3JvdW5kSW1hZ2UuaGVpZ2h0KTtcclxuXHRcdFx0ZENvbnRleHQuZHJhd0ltYWdlKGJhY2tncm91bmRJbWFnZSwgYmFja2dyb3VuZFggKyBtYWluQ2FudmFzLndpZHRoLCBiYWNrZ3JvdW5kWSwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHRcdGRDb250ZXh0LmRyYXdJbWFnZShiYWNrZ3JvdW5kSW1hZ2UsIGJhY2tncm91bmRYIC0gbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZFksIG1haW5DYW52YXMud2lkdGgsIGJhY2tncm91bmRJbWFnZS5oZWlnaHQpO1xyXG5cdFx0XHRkQ29udGV4dC5kcmF3SW1hZ2UoYmFja2dyb3VuZEltYWdlLCBiYWNrZ3JvdW5kWCwgYmFja2dyb3VuZFkgKyBtYWluQ2FudmFzLmhlaWdodCwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHRcdGRDb250ZXh0LmRyYXdJbWFnZShiYWNrZ3JvdW5kSW1hZ2UsIGJhY2tncm91bmRYICsgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZFkgKyBtYWluQ2FudmFzLmhlaWdodCwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHRcdGRDb250ZXh0LmRyYXdJbWFnZShiYWNrZ3JvdW5kSW1hZ2UsIGJhY2tncm91bmRYIC0gbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZFkgKyBtYWluQ2FudmFzLmhlaWdodCwgbWFpbkNhbnZhcy53aWR0aCwgYmFja2dyb3VuZEltYWdlLmhlaWdodCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5kcmF3ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHQvLyBDbGVhciBjYW52YXNcclxuXHRcdFx0bWFpbkNhbnZhcy53aWR0aCA9IG1haW5DYW52YXMud2lkdGg7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBVcGRhdGUgc2Nyb2xsaW5nIGJhY2tncm91bmRcclxuXHRcdFx0ZHJhd0JhY2tncm91bmQoKTtcclxuXHJcblx0XHRcdHBsYXllci5zZXRIaXRCb3hlc1Zpc2libGUoc2hvd0hpdEJveGVzKTtcclxuXHRcdFx0cGxheWVyLmRyYXcoZENvbnRleHQpO1xyXG5cclxuXHRcdFx0cGxheWVyLmN5Y2xlKCk7XHJcblxyXG5cdFx0XHRtb3ZpbmdPYmplY3RzLmVhY2goZnVuY3Rpb24gKG1vdmluZ09iamVjdCwgaSkge1xyXG5cdFx0XHRcdG1vdmluZ09iamVjdC5kcmF3KGRDb250ZXh0KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0XHRzdGF0aWNPYmplY3RzLmVhY2goZnVuY3Rpb24gKHN0YXRpY09iamVjdCwgaSkge1xyXG5cdFx0XHRcdGlmIChzdGF0aWNPYmplY3QuZHJhdykge1xyXG5cdFx0XHRcdFx0c3RhdGljT2JqZWN0LmRyYXcoZENvbnRleHQsICdtYWluJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdHVpRWxlbWVudHMuZWFjaChmdW5jdGlvbiAodWlFbGVtZW50LCBpKSB7XHJcblx0XHRcdFx0aWYgKHVpRWxlbWVudC5kcmF3KSB7XHJcblx0XHRcdFx0XHR1aUVsZW1lbnQuZHJhdyhkQ29udGV4dCwgJ21haW4nKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRnYW1lTG9vcC5zdGFydCgpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnBhdXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRwYXVzZWQgPSB0cnVlO1xyXG5cdFx0XHRnYW1lTG9vcC5zdG9wKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuaXNQYXVzZWQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiBwYXVzZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMucmVzZXQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHBhdXNlZCA9IGZhbHNlO1xyXG5cdFx0XHRzdGF0aWNPYmplY3RzID0gbmV3IFNwcml0ZUFycmF5KCk7XHJcblx0XHRcdG1vdmluZ09iamVjdHMgPSBuZXcgU3ByaXRlQXJyYXkoKTtcclxuXHRcdFx0bW91c2VYID0gZENvbnRleHQuZ2V0Q2VudHJlT2ZWaWV3cG9ydCgpO1xyXG5cdFx0XHRtb3VzZVkgPSAwO1xyXG5cdFx0XHRwbGF5ZXIucmVzZXQoKTtcclxuXHRcdFx0cGxheWVyLnNldE1hcFBvc2l0aW9uKDAsIDAsIDApO1xyXG5cdFx0XHR0aGlzLnN0YXJ0KCk7XHJcblx0XHR9LmJpbmQodGhpcyk7XHJcblxyXG5cdFx0Z2FtZUxvb3Aub24oJzIwJywgdGhpcy5jeWNsZSk7XHJcblx0XHRnYW1lTG9vcC5vbignMjAnLCB0aGlzLmRyYXcpO1xyXG5cdH1cclxuXHJcblx0Z2xvYmFsLmdhbWUgPSBHYW1lO1xyXG59KSggdGhpcyApO1xyXG5cclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG5cdG1vZHVsZS5leHBvcnRzID0gdGhpcy5nYW1lO1xyXG59IiwiZnVuY3Rpb24gR2FtZUh1ZChkYXRhKSB7XHJcblx0dmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuXHR2YXIgaHVkSW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuXHRodWRJbWFnZS5zcmMgPSAnYXNzZXRzL3RvcC1iYXIucG5nJztcclxuXHJcblx0dGhhdC5saW5lcyA9IGRhdGEuaW5pdGlhbExpbmVzO1xyXG5cclxuXHR0aGF0LnRvcCA9IGRhdGEucG9zaXRpb24udG9wO1xyXG5cdHRoYXQucmlnaHQgPSBkYXRhLnBvc2l0aW9uLnJpZ2h0O1xyXG5cdHRoYXQuYm90dG9tID0gZGF0YS5wb3NpdGlvbi5ib3R0b207XHJcblx0dGhhdC5sZWZ0ID0gZGF0YS5wb3NpdGlvbi5sZWZ0O1xyXG5cclxuXHR0aGF0LndpZHRoID0gZGF0YS53aWR0aDtcclxuXHR0aGF0LmhlaWdodCA9IGRhdGEuaGVpZ2h0O1xyXG5cclxuXHR0aGF0LnNldExpbmVzID0gZnVuY3Rpb24gKGxpbmVzKSB7XHJcblx0XHR0aGF0LmxpbmVzID0gbGluZXM7XHJcblx0fTtcclxuXHJcblx0dGhhdC5kcmF3ID0gZnVuY3Rpb24gKGN0eCkge1xyXG5cdFx0Y3R4LmRyYXdJbWFnZShodWRJbWFnZSwgMCwgMCwgY3R4LmNhbnZhcy53aWR0aCwgaHVkSW1hZ2UuaGVpZ2h0LCAwLCAwLCBjdHguY2FudmFzLndpZHRoLCBodWRJbWFnZS5oZWlnaHQpO1xyXG5cdFx0XHJcblx0XHRjdHguZm9udCA9ICcxMnB4IG1vbm9zcGFjZSc7XHJcblx0XHR2YXIgeU9mZnNldCA9IDA7XHJcblx0XHR0aGF0LmxpbmVzLmVhY2goZnVuY3Rpb24gKGxpbmUpIHtcclxuXHRcdFx0dmFyIGZvbnRTaXplID0gK2N0eC5mb250LnNsaWNlKDAsIDIpO1xyXG5cdFx0XHR2YXIgdGV4dFdpZHRoID0gY3R4Lm1lYXN1cmVUZXh0KGxpbmUpLndpZHRoO1xyXG5cdFx0XHR2YXIgdGV4dEhlaWdodCA9IGZvbnRTaXplICogMS4zO1xyXG5cdFx0XHR2YXIgeFBvcywgeVBvcztcclxuXHRcdFx0aWYgKHRoYXQudG9wKSB7XHJcblx0XHRcdFx0eVBvcyA9IHRoYXQudG9wICsgeU9mZnNldDtcclxuXHRcdFx0fSBlbHNlIGlmICh0aGF0LmJvdHRvbSkge1xyXG5cdFx0XHRcdHlQb3MgPSBjdHguY2FudmFzLmhlaWdodCAtIHRoYXQudG9wIC0gdGV4dEhlaWdodCArIHlPZmZzZXQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh0aGF0LnJpZ2h0KSB7XHJcblx0XHRcdFx0eFBvcyA9IGN0eC5jYW52YXMud2lkdGggLSB0aGF0LnJpZ2h0IC0gdGV4dFdpZHRoO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHRoYXQubGVmdCkge1xyXG5cdFx0XHRcdHhQb3MgPSB0aGF0LmxlZnQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHlPZmZzZXQgKz0gdGV4dEhlaWdodDtcclxuXHRcdFx0Y3R4LmZpbGxTdHlsZSA9IFwiI0ZGRkZGRlwiO1xyXG5cdFx0XHRjdHguZmlsbFRleHQobGluZSwgeFBvcywgeVBvcyk7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHRyZXR1cm4gdGhhdDtcclxufVxyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSBHYW1lSHVkO1xyXG59XHJcbiIsIi8vIENyZWF0ZXMgYSByYW5kb20gSUQgc3RyaW5nXHJcbihmdW5jdGlvbihnbG9iYWwpIHtcclxuICAgIGZ1bmN0aW9uIGd1aWQgKClcclxuICAgIHtcclxuICAgICAgICB2YXIgUzQgPSBmdW5jdGlvbiAoKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoXHJcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yYW5kb20oKSAqIDB4MTAwMDAgLyogNjU1MzYgKi9cclxuICAgICAgICAgICAgICAgICkudG9TdHJpbmcoMTYpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICBTNCgpICsgUzQoKSArIFwiLVwiICtcclxuICAgICAgICAgICAgICAgIFM0KCkgKyBcIi1cIiArXHJcbiAgICAgICAgICAgICAgICBTNCgpICsgXCItXCIgK1xyXG4gICAgICAgICAgICAgICAgUzQoKSArIFwiLVwiICtcclxuICAgICAgICAgICAgICAgIFM0KCkgKyBTNCgpICsgUzQoKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgfVxyXG4gICAgZ2xvYmFsLmd1aWQgPSBndWlkO1xyXG59KSh0aGlzKTtcclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB0aGlzLmd1aWQ7XHJcbn0iLCJmdW5jdGlvbiBpc01vYmlsZURldmljZSgpIHtcclxuXHRpZihuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9BbmRyb2lkL2kpIHx8XHJcblx0XHRuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC93ZWJPUy9pKSB8fFxyXG5cdFx0bmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBob25lL2kpIHx8XHJcblx0XHRuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9pUGFkL2kpIHx8XHJcblx0XHRuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9pUG9kL2kpIHx8XHJcblx0XHRuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9CbGFja0JlcnJ5L2kpIHx8XHJcblx0XHRuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9XaW5kb3dzIFBob25lL2kpXHJcblx0KSB7XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGlzTW9iaWxlRGV2aWNlOyIsInZhciBTcHJpdGUgPSByZXF1aXJlKCcuL3Nwcml0ZScpO1xyXG5cclxuKGZ1bmN0aW9uKGdsb2JhbCkge1xyXG5cdGZ1bmN0aW9uIE1vbnN0ZXIoZGF0YSkge1xyXG5cdFx0dmFyIHRoYXQgPSBuZXcgU3ByaXRlKGRhdGEpO1xyXG5cdFx0dmFyIHN1cGVyX2RyYXcgPSB0aGF0LnN1cGVyaW9yKCdkcmF3Jyk7XHJcblx0XHR2YXIgc3ByaXRlVmVyc2lvbiA9IDE7XHJcblx0XHR2YXIgZWF0aW5nU3RhZ2UgPSAwO1xyXG5cdFx0dmFyIHN0YW5kYXJkU3BlZWQgPSA2O1xyXG5cclxuXHRcdHRoYXQuaXNFYXRpbmcgPSBmYWxzZTtcclxuXHRcdHRoYXQuaXNGdWxsID0gZmFsc2U7XHJcblx0XHR0aGF0LnNldFNwZWVkKHN0YW5kYXJkU3BlZWQpO1xyXG5cclxuXHRcdHRoYXQuZHJhdyA9IGZ1bmN0aW9uKGRDb250ZXh0KSB7XHJcblx0XHRcdHZhciBzcHJpdGVQYXJ0VG9Vc2UgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0dmFyIHhEaWZmID0gdGhhdC5tb3ZpbmdUb3dhcmRbMF0gLSB0aGF0LmNhbnZhc1g7XHJcblxyXG5cdFx0XHRcdGlmICh0aGF0LmlzRWF0aW5nKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ2VhdGluZycgKyBlYXRpbmdTdGFnZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmIChzcHJpdGVWZXJzaW9uICsgMC4xID4gMikge1xyXG5cdFx0XHRcdFx0c3ByaXRlVmVyc2lvbiA9IDAuMTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0c3ByaXRlVmVyc2lvbiArPSAwLjE7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmICh4RGlmZiA+PSAwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3NFYXN0JyArIE1hdGguY2VpbChzcHJpdGVWZXJzaW9uKTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHhEaWZmIDwgMCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdzV2VzdCcgKyBNYXRoLmNlaWwoc3ByaXRlVmVyc2lvbik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0cmV0dXJuIHN1cGVyX2RyYXcoZENvbnRleHQsIHNwcml0ZVBhcnRUb1VzZSgpKTtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gc3RhcnRFYXRpbmcgKHdoZW5Eb25lKSB7XHJcblx0XHRcdGVhdGluZ1N0YWdlICs9IDE7XHJcblx0XHRcdHRoYXQuaXNFYXRpbmcgPSB0cnVlO1xyXG5cdFx0XHR0aGF0LmlzTW92aW5nID0gZmFsc2U7XHJcblx0XHRcdGlmIChlYXRpbmdTdGFnZSA8IDYpIHtcclxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHN0YXJ0RWF0aW5nKHdoZW5Eb25lKTtcclxuXHRcdFx0XHR9LCAzMDApO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGVhdGluZ1N0YWdlID0gMDtcclxuXHRcdFx0XHR0aGF0LmlzRWF0aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHRcdFx0d2hlbkRvbmUoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoYXQuc3RhcnRFYXRpbmcgPSBzdGFydEVhdGluZztcclxuXHJcblx0XHRyZXR1cm4gdGhhdDtcclxuXHR9XHJcblxyXG5cdGdsb2JhbC5tb25zdGVyID0gTW9uc3RlcjtcclxufSkoIHRoaXMgKTtcclxuXHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IHRoaXMubW9uc3RlcjtcclxufSIsInZhciBTcHJpdGUgPSByZXF1aXJlKCcuL3Nwcml0ZScpO1xyXG5pZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRuYXZpZ2F0b3IudmlicmF0ZSA9IG5hdmlnYXRvci52aWJyYXRlIHx8XHJcblx0XHRuYXZpZ2F0b3Iud2Via2l0VmlicmF0ZSB8fFxyXG5cdFx0bmF2aWdhdG9yLm1velZpYnJhdGUgfHxcclxuXHRcdG5hdmlnYXRvci5tc1ZpYnJhdGU7XHJcbn0gZWxzZSB7XHJcblx0bmF2aWdhdG9yID0ge1xyXG5cdFx0dmlicmF0ZTogZmFsc2VcclxuXHR9O1xyXG59XHJcblxyXG4oZnVuY3Rpb24oZ2xvYmFsKSB7XHJcblx0ZnVuY3Rpb24gUGxheWVyKGRhdGEpIHtcclxuXHRcdHZhciBkaXNjcmV0ZURpcmVjdGlvbnMgPSB7XHJcblx0XHRcdCd3ZXN0JzogMjcwLFxyXG5cdFx0XHQnd3NXZXN0JzogMjQwLFxyXG5cdFx0XHQnc1dlc3QnOiAxOTUsXHJcblx0XHRcdCdzb3V0aCc6IDE4MCxcclxuXHRcdFx0J3NFYXN0JzogMTY1LFxyXG5cdFx0XHQnZXNFYXN0JzogMTIwLFxyXG5cdFx0XHQnZWFzdCc6IDkwXHJcblx0XHR9O1xyXG5cdFx0dmFyIHRoYXQgPSBuZXcgU3ByaXRlKGRhdGEpO1xyXG5cdFx0dmFyIHN1cCA9IHtcclxuXHRcdFx0ZHJhdzogdGhhdC5zdXBlcmlvcignZHJhdycpLFxyXG5cdFx0XHRjeWNsZTogdGhhdC5zdXBlcmlvcignY3ljbGUnKSxcclxuXHRcdFx0Z2V0U3BlZWRYOiB0aGF0LnN1cGVyaW9yKCdnZXRTcGVlZFgnKSxcclxuXHRcdFx0Z2V0U3BlZWRZOiB0aGF0LnN1cGVyaW9yKCdnZXRTcGVlZFknKSxcclxuXHRcdFx0aGl0czogdGhhdC5zdXBlcmlvcignaGl0cycpXHJcblx0XHR9O1xyXG5cdFx0dmFyIGRpcmVjdGlvbnMgPSB7XHJcblx0XHRcdGVzRWFzdDogZnVuY3Rpb24oeERpZmYpIHsgcmV0dXJuIHhEaWZmID4gMzAwOyB9LFxyXG5cdFx0XHRzRWFzdDogZnVuY3Rpb24oeERpZmYpIHsgcmV0dXJuIHhEaWZmID4gNzU7IH0sXHJcblx0XHRcdHdzV2VzdDogZnVuY3Rpb24oeERpZmYpIHsgcmV0dXJuIHhEaWZmIDwgLTMwMDsgfSxcclxuXHRcdFx0c1dlc3Q6IGZ1bmN0aW9uKHhEaWZmKSB7IHJldHVybiB4RGlmZiA8IC03NTsgfVxyXG5cdFx0fTtcclxuXHJcblx0XHR2YXIgY2FuY2VsYWJsZVN0YXRlVGltZW91dDtcclxuXHRcdHZhciBjYW5jZWxhYmxlU3RhdGVJbnRlcnZhbDtcclxuXHJcblx0XHR2YXIgY2FuU3BlZWRCb29zdCA9IHRydWU7XHJcblxyXG5cdFx0dmFyIG9ic3RhY2xlc0hpdCA9IFtdO1xyXG5cdFx0dmFyIHBpeGVsc1RyYXZlbGxlZCA9IDA7XHJcblx0XHR2YXIgc3RhbmRhcmRTcGVlZCA9IDU7XHJcblx0XHR2YXIgYm9vc3RNdWx0aXBsaWVyID0gMjtcclxuXHRcdHZhciB0dXJuRWFzZUN5Y2xlcyA9IDcwO1xyXG5cdFx0dmFyIHNwZWVkWCA9IDA7XHJcblx0XHR2YXIgc3BlZWRYRmFjdG9yID0gMDtcclxuXHRcdHZhciBzcGVlZFkgPSAwO1xyXG5cdFx0dmFyIHNwZWVkWUZhY3RvciA9IDE7XHJcblx0XHR2YXIgdHJpY2tTdGVwID0gMDsgLy8gVGhlcmUgYXJlIHRocmVlIG9mIHRoZXNlXHJcblxyXG5cdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHR0aGF0Lmhhc0JlZW5IaXQgPSBmYWxzZTtcclxuXHRcdHRoYXQuaXNKdW1waW5nID0gZmFsc2U7XHJcblx0XHR0aGF0LmlzUGVyZm9ybWluZ1RyaWNrID0gZmFsc2U7XHJcblx0XHR0aGF0Lm9uSGl0T2JzdGFjbGVDYiA9IGZ1bmN0aW9uKCkge307XHJcblx0XHR0aGF0Lm9uQ29sbGVjdEl0ZW1DYiA9IGZ1bmN0aW9uKCkge307XHJcblx0XHR0aGF0LnNldFNwZWVkKHN0YW5kYXJkU3BlZWQpO1xyXG5cclxuXHRcdHRoYXQucmVzZXQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdG9ic3RhY2xlc0hpdCA9IFtdO1xyXG5cdFx0XHRwaXhlbHNUcmF2ZWxsZWQgPSAwO1xyXG5cdFx0XHR0aGF0LmlzTW92aW5nID0gdHJ1ZTtcclxuXHRcdFx0dGhhdC5oYXNCZWVuSGl0ID0gZmFsc2U7XHJcblx0XHRcdGNhblNwZWVkQm9vc3QgPSB0cnVlO1xyXG5cdFx0XHRzZXROb3JtYWwoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0ZnVuY3Rpb24gc2V0Tm9ybWFsKCkge1xyXG5cdFx0XHR0aGF0LnNldFNwZWVkKHN0YW5kYXJkU3BlZWQpO1xyXG5cdFx0XHR0aGF0LmlzTW92aW5nID0gdHJ1ZTtcclxuXHRcdFx0dGhhdC5oYXNCZWVuSGl0ID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuaXNKdW1waW5nID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuaXNQZXJmb3JtaW5nVHJpY2sgPSBmYWxzZTtcclxuXHRcdFx0aWYgKGNhbmNlbGFibGVTdGF0ZUludGVydmFsKSB7XHJcblx0XHRcdFx0Y2xlYXJJbnRlcnZhbChjYW5jZWxhYmxlU3RhdGVJbnRlcnZhbCk7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhhdC5zZXRNYXBQb3NpdGlvbih1bmRlZmluZWQsIHVuZGVmaW5lZCwgMCk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gc2V0Q3Jhc2hlZCgpIHtcclxuXHRcdFx0dGhhdC5pc01vdmluZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0Lmhhc0JlZW5IaXQgPSB0cnVlO1xyXG5cdFx0XHR0aGF0LmlzSnVtcGluZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LmlzUGVyZm9ybWluZ1RyaWNrID0gZmFsc2U7XHJcblx0XHRcdGlmIChjYW5jZWxhYmxlU3RhdGVJbnRlcnZhbCkge1xyXG5cdFx0XHRcdGNsZWFySW50ZXJ2YWwoY2FuY2VsYWJsZVN0YXRlSW50ZXJ2YWwpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoYXQuc2V0TWFwUG9zaXRpb24odW5kZWZpbmVkLCB1bmRlZmluZWQsIDApO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHNldEp1bXBpbmcoKSB7XHJcblx0XHRcdHZhciBjdXJyZW50U3BlZWQgPSB0aGF0LmdldFNwZWVkKCk7XHJcblx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdzb3V0aCcpO1xyXG5cdFx0XHR0aGF0LnNldFNwZWVkKGN1cnJlbnRTcGVlZCArIDIpO1xyXG5cdFx0XHR0aGF0LnNldFNwZWVkWShjdXJyZW50U3BlZWQgKyAyKTtcclxuXHRcdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHRcdHRoYXQuaGFzQmVlbkhpdCA9IGZhbHNlO1xyXG5cdFx0XHR0aGF0LmlzSnVtcGluZyA9IHRydWU7XHJcblx0XHRcdHRoYXQuc2V0TWFwUG9zaXRpb24odW5kZWZpbmVkLCB1bmRlZmluZWQsIDEpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldERpc2NyZXRlRGlyZWN0aW9uKCkge1xyXG5cdFx0XHRpZiAodGhhdC5kaXJlY3Rpb24pIHtcclxuXHRcdFx0XHRpZiAodGhhdC5kaXJlY3Rpb24gPD0gOTApIHtcclxuXHRcdFx0XHRcdHJldHVybiAnZWFzdCc7XHJcblx0XHRcdFx0fSBlbHNlIGlmICh0aGF0LmRpcmVjdGlvbiA+IDkwICYmIHRoYXQuZGlyZWN0aW9uIDwgMTUwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ2VzRWFzdCc7XHJcblx0XHRcdFx0fSBlbHNlIGlmICh0aGF0LmRpcmVjdGlvbiA+PSAxNTAgJiYgdGhhdC5kaXJlY3Rpb24gPCAxODApIHtcclxuXHRcdFx0XHRcdHJldHVybiAnc0Vhc3QnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5kaXJlY3Rpb24gPT09IDE4MCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdzb3V0aCc7XHJcblx0XHRcdFx0fSBlbHNlIGlmICh0aGF0LmRpcmVjdGlvbiA+IDE4MCAmJiB0aGF0LmRpcmVjdGlvbiA8PSAyMTApIHtcclxuXHRcdFx0XHRcdHJldHVybiAnc1dlc3QnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5kaXJlY3Rpb24gPiAyMTAgJiYgdGhhdC5kaXJlY3Rpb24gPCAyNzApIHtcclxuXHRcdFx0XHRcdHJldHVybiAnd3NXZXN0JztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHRoYXQuZGlyZWN0aW9uID49IDI3MCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICd3ZXN0JztcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdzb3V0aCc7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHZhciB4RGlmZiA9IHRoYXQubW92aW5nVG93YXJkWzBdIC0gdGhhdC5tYXBQb3NpdGlvblswXTtcclxuXHRcdFx0XHR2YXIgeURpZmYgPSB0aGF0Lm1vdmluZ1Rvd2FyZFsxXSAtIHRoYXQubWFwUG9zaXRpb25bMV07XHJcblx0XHRcdFx0aWYgKHlEaWZmIDw9IDApIHtcclxuXHRcdFx0XHRcdGlmICh4RGlmZiA+IDApIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuICdlYXN0JztcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiAnd2VzdCc7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAoZGlyZWN0aW9ucy5lc0Vhc3QoeERpZmYpKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ2VzRWFzdCc7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChkaXJlY3Rpb25zLnNFYXN0KHhEaWZmKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICdzRWFzdCc7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChkaXJlY3Rpb25zLndzV2VzdCh4RGlmZikpIHtcclxuXHRcdFx0XHRcdHJldHVybiAnd3NXZXN0JztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKGRpcmVjdGlvbnMuc1dlc3QoeERpZmYpKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJ3NXZXN0JztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuICdzb3V0aCc7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gc2V0RGlzY3JldGVEaXJlY3Rpb24oZCkge1xyXG5cdFx0XHRpZiAoZGlzY3JldGVEaXJlY3Rpb25zW2RdKSB7XHJcblx0XHRcdFx0dGhhdC5zZXREaXJlY3Rpb24oZGlzY3JldGVEaXJlY3Rpb25zW2RdKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGQgPT09ICd3ZXN0JyB8fCBkID09PSAnZWFzdCcpIHtcclxuXHRcdFx0XHR0aGF0LmlzTW92aW5nID0gZmFsc2U7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRCZWluZ0VhdGVuU3ByaXRlKCkge1xyXG5cdFx0XHRyZXR1cm4gJ2JsYW5rJztcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRKdW1waW5nU3ByaXRlKCkge1xyXG5cdFx0XHRyZXR1cm4gJ2p1bXBpbmcnO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGdldFRyaWNrU3ByaXRlKCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZygnVHJpY2sgc3RlcCBpcycsIHRyaWNrU3RlcCk7XHJcblx0XHRcdGlmICh0cmlja1N0ZXAgPT09IDApIHtcclxuXHRcdFx0XHRyZXR1cm4gJ2p1bXBpbmcnO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHRyaWNrU3RlcCA9PT0gMSkge1xyXG5cdFx0XHRcdHJldHVybiAnc29tZXJzYXVsdDEnO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHJldHVybiAnc29tZXJzYXVsdDInO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5zdG9wID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRpZiAodGhhdC5kaXJlY3Rpb24gPiAxODApIHtcclxuXHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignd2VzdCcpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdlYXN0Jyk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC50dXJuRWFzdCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dmFyIGRpc2NyZXRlRGlyZWN0aW9uID0gZ2V0RGlzY3JldGVEaXJlY3Rpb24oKTtcclxuXHJcblx0XHRcdHN3aXRjaCAoZGlzY3JldGVEaXJlY3Rpb24pIHtcclxuXHRcdFx0XHRjYXNlICd3ZXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCd3c1dlc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3dzV2VzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc1dlc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3NXZXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdzb3V0aCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnc291dGgnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NFYXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdzRWFzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignZXNFYXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdlc0Vhc3QnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ2Vhc3QnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc291dGgnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQudHVybldlc3QgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHZhciBkaXNjcmV0ZURpcmVjdGlvbiA9IGdldERpc2NyZXRlRGlyZWN0aW9uKCk7XHJcblxyXG5cdFx0XHRzd2l0Y2ggKGRpc2NyZXRlRGlyZWN0aW9uKSB7XHJcblx0XHRcdFx0Y2FzZSAnZWFzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignZXNFYXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdlc0Vhc3QnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NFYXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdzRWFzdCc6XHJcblx0XHRcdFx0XHRzZXREaXNjcmV0ZURpcmVjdGlvbignc291dGgnKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3NvdXRoJzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCdzV2VzdCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnc1dlc3QnOlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3dzV2VzdCcpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnd3NXZXN0JzpcclxuXHRcdFx0XHRcdHNldERpc2NyZXRlRGlyZWN0aW9uKCd3ZXN0Jyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0c2V0RGlzY3JldGVEaXJlY3Rpb24oJ3NvdXRoJyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnN0ZXBXZXN0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR0aGF0Lm1hcFBvc2l0aW9uWzBdIC09IHRoYXQuc3BlZWQgKiAyO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnN0ZXBFYXN0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR0aGF0Lm1hcFBvc2l0aW9uWzBdICs9IHRoYXQuc3BlZWQgKiAyO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnNldE1hcFBvc2l0aW9uVGFyZ2V0ID0gZnVuY3Rpb24gKHgsIHkpIHtcclxuXHRcdFx0aWYgKHRoYXQuaGFzQmVlbkhpdCkgcmV0dXJuO1xyXG5cclxuXHRcdFx0aWYgKE1hdGguYWJzKHRoYXQubWFwUG9zaXRpb25bMF0gLSB4KSA8PSA3NSkge1xyXG5cdFx0XHRcdHggPSB0aGF0Lm1hcFBvc2l0aW9uWzBdO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGF0Lm1vdmluZ1Rvd2FyZCA9IFsgeCwgeSBdO1xyXG5cclxuXHRcdFx0Ly8gdGhhdC5yZXNldERpcmVjdGlvbigpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnN0YXJ0TW92aW5nSWZQb3NzaWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0aWYgKCF0aGF0Lmhhc0JlZW5IaXQgJiYgIXRoYXQuaXNCZWluZ0VhdGVuKSB7XHJcblx0XHRcdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zZXRUdXJuRWFzZUN5Y2xlcyA9IGZ1bmN0aW9uIChjKSB7XHJcblx0XHRcdHR1cm5FYXNlQ3ljbGVzID0gYztcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5nZXRQaXhlbHNUcmF2ZWxsZWREb3duTW91bnRhaW4gPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiBwaXhlbHNUcmF2ZWxsZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQucmVzZXRTcGVlZCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dGhhdC5zZXRTcGVlZChzdGFuZGFyZFNwZWVkKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5jeWNsZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0aWYgKCB0aGF0LmdldFNwZWVkWCgpIDw9IDAgJiYgdGhhdC5nZXRTcGVlZFkoKSA8PSAwICkge1xyXG5cdFx0XHRcdFx0XHR0aGF0LmlzTW92aW5nID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHRoYXQuaXNNb3ZpbmcpIHtcclxuXHRcdFx0XHRwaXhlbHNUcmF2ZWxsZWQgKz0gdGhhdC5zcGVlZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHRoYXQuaXNKdW1waW5nKSB7XHJcblx0XHRcdFx0dGhhdC5zZXRNYXBQb3NpdGlvblRhcmdldCh1bmRlZmluZWQsIHRoYXQubWFwUG9zaXRpb25bMV0gKyB0aGF0LmdldFNwZWVkKCkpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzdXAuY3ljbGUoKTtcclxuXHRcdFx0XHJcblx0XHRcdHRoYXQuY2hlY2tIaXR0YWJsZU9iamVjdHMoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5kcmF3ID0gZnVuY3Rpb24oZENvbnRleHQpIHtcclxuXHRcdFx0dmFyIHNwcml0ZVBhcnRUb1VzZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRpZiAodGhhdC5pc0JlaW5nRWF0ZW4pIHtcclxuXHRcdFx0XHRcdHJldHVybiBnZXRCZWluZ0VhdGVuU3ByaXRlKCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAodGhhdC5pc0p1bXBpbmcpIHtcclxuXHRcdFx0XHRcdGlmICh0aGF0LmlzUGVyZm9ybWluZ1RyaWNrKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBnZXRUcmlja1Nwcml0ZSgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0cmV0dXJuIGdldEp1bXBpbmdTcHJpdGUoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmICh0aGF0Lmhhc0JlZW5IaXQpIHtcclxuXHRcdFx0XHRcdHJldHVybiAnaGl0JztcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiBnZXREaXNjcmV0ZURpcmVjdGlvbigpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0cmV0dXJuIHN1cC5kcmF3KGRDb250ZXh0LCBzcHJpdGVQYXJ0VG9Vc2UoKSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuaGl0cyA9IGZ1bmN0aW9uIChvYnMpIHtcclxuXHRcdFx0aWYgKG9ic3RhY2xlc0hpdC5pbmRleE9mKG9icy5pZCkgIT09IC0xKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoIW9icy5vY2N1cGllc1pJbmRleCh0aGF0Lm1hcFBvc2l0aW9uWzJdKSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHN1cC5oaXRzKG9icykpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnNwZWVkQm9vc3QgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHZhciBvcmlnaW5hbFNwZWVkID0gdGhhdC5zcGVlZDtcclxuXHRcdFx0aWYgKGNhblNwZWVkQm9vc3QpIHtcclxuXHRcdFx0XHRjYW5TcGVlZEJvb3N0ID0gZmFsc2U7XHJcblx0XHRcdFx0dGhhdC5zZXRTcGVlZCh0aGF0LnNwZWVkICogYm9vc3RNdWx0aXBsaWVyKTtcclxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHRoYXQuc2V0U3BlZWQob3JpZ2luYWxTcGVlZCk7XHJcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0Y2FuU3BlZWRCb29zdCA9IHRydWU7XHJcblx0XHRcdFx0XHR9LCAxMDAwMCk7XHJcblx0XHRcdFx0fSwgMjAwMCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5hdHRlbXB0VHJpY2sgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGlmICh0aGF0LmlzSnVtcGluZykge1xyXG5cdFx0XHRcdHRoYXQuaXNQZXJmb3JtaW5nVHJpY2sgPSB0cnVlO1xyXG5cdFx0XHRcdGNhbmNlbGFibGVTdGF0ZUludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0aWYgKHRyaWNrU3RlcCA+PSAyKSB7XHJcblx0XHRcdFx0XHRcdHRyaWNrU3RlcCA9IDA7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0cmlja1N0ZXAgKz0gMTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LCAzMDApO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuZ2V0U3RhbmRhcmRTcGVlZCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIHN0YW5kYXJkU3BlZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIGVhc2VTcGVlZFRvVGFyZ2V0VXNpbmdGYWN0b3Ioc3AsIHRhcmdldFNwZWVkLCBmKSB7XHJcblx0XHRcdGlmIChmID09PSAwIHx8IGYgPT09IDEpIHtcclxuXHRcdFx0XHRyZXR1cm4gdGFyZ2V0U3BlZWQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChzcCA8IHRhcmdldFNwZWVkKSB7XHJcblx0XHRcdFx0c3AgKz0gdGhhdC5nZXRTcGVlZCgpICogKGYgLyB0dXJuRWFzZUN5Y2xlcyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChzcCA+IHRhcmdldFNwZWVkKSB7XHJcblx0XHRcdFx0c3AgLT0gdGhhdC5nZXRTcGVlZCgpICogKGYgLyB0dXJuRWFzZUN5Y2xlcyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBzcDtcclxuXHRcdH1cclxuXHJcblx0XHR0aGF0LmdldFNwZWVkWCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0aWYgKGdldERpc2NyZXRlRGlyZWN0aW9uKCkgPT09ICdlc0Vhc3QnIHx8IGdldERpc2NyZXRlRGlyZWN0aW9uKCkgPT09ICd3c1dlc3QnKSB7XHJcblx0XHRcdFx0c3BlZWRYRmFjdG9yID0gMC41O1xyXG5cdFx0XHRcdHNwZWVkWCA9IGVhc2VTcGVlZFRvVGFyZ2V0VXNpbmdGYWN0b3Ioc3BlZWRYLCB0aGF0LmdldFNwZWVkKCkgKiBzcGVlZFhGYWN0b3IsIHNwZWVkWEZhY3Rvcik7XHJcblxyXG5cdFx0XHRcdHJldHVybiBzcGVlZFg7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChnZXREaXNjcmV0ZURpcmVjdGlvbigpID09PSAnc0Vhc3QnIHx8IGdldERpc2NyZXRlRGlyZWN0aW9uKCkgPT09ICdzV2VzdCcpIHtcclxuXHRcdFx0XHRzcGVlZFhGYWN0b3IgPSAwLjMzO1xyXG5cdFx0XHRcdHNwZWVkWCA9IGVhc2VTcGVlZFRvVGFyZ2V0VXNpbmdGYWN0b3Ioc3BlZWRYLCB0aGF0LmdldFNwZWVkKCkgKiBzcGVlZFhGYWN0b3IsIHNwZWVkWEZhY3Rvcik7XHJcblxyXG5cdFx0XHRcdHJldHVybiBzcGVlZFg7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNvIGl0IG11c3QgYmUgc291dGhcclxuXHJcblx0XHRcdHNwZWVkWCA9IGVhc2VTcGVlZFRvVGFyZ2V0VXNpbmdGYWN0b3Ioc3BlZWRYLCAwLCBzcGVlZFhGYWN0b3IpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHNwZWVkWDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zZXRTcGVlZFkgPSBmdW5jdGlvbihzeSkge1xyXG5cdFx0XHRzcGVlZFkgPSBzeTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5nZXRTcGVlZFkgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHZhciB0YXJnZXRTcGVlZDtcclxuXHJcblx0XHRcdGlmICh0aGF0LmlzSnVtcGluZykge1xyXG5cdFx0XHRcdHJldHVybiBzcGVlZFk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChnZXREaXNjcmV0ZURpcmVjdGlvbigpID09PSAnZXNFYXN0JyB8fCBnZXREaXNjcmV0ZURpcmVjdGlvbigpID09PSAnd3NXZXN0Jykge1xyXG5cdFx0XHRcdHNwZWVkWUZhY3RvciA9IDAuNjtcclxuXHRcdFx0XHRzcGVlZFkgPSBlYXNlU3BlZWRUb1RhcmdldFVzaW5nRmFjdG9yKHNwZWVkWSwgdGhhdC5nZXRTcGVlZCgpICogMC42LCAwLjYpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gc3BlZWRZO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoZ2V0RGlzY3JldGVEaXJlY3Rpb24oKSA9PT0gJ3NFYXN0JyB8fCBnZXREaXNjcmV0ZURpcmVjdGlvbigpID09PSAnc1dlc3QnKSB7XHJcblx0XHRcdFx0c3BlZWRZRmFjdG9yID0gMC44NTtcclxuXHRcdFx0XHRzcGVlZFkgPSBlYXNlU3BlZWRUb1RhcmdldFVzaW5nRmFjdG9yKHNwZWVkWSwgdGhhdC5nZXRTcGVlZCgpICogMC44NSwgMC44NSk7XHJcblxyXG5cdFx0XHRcdHJldHVybiBzcGVlZFk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChnZXREaXNjcmV0ZURpcmVjdGlvbigpID09PSAnZWFzdCcgfHwgZ2V0RGlzY3JldGVEaXJlY3Rpb24oKSA9PT0gJ3dlc3QnKSB7XHJcblx0XHRcdFx0c3BlZWRZRmFjdG9yID0gMTtcclxuXHRcdFx0XHRzcGVlZFkgPSAwO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gc3BlZWRZO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBTbyBpdCBtdXN0IGJlIHNvdXRoXHJcblxyXG5cdFx0XHRzcGVlZFkgPSBlYXNlU3BlZWRUb1RhcmdldFVzaW5nRmFjdG9yKHNwZWVkWSwgdGhhdC5nZXRTcGVlZCgpLCBzcGVlZFlGYWN0b3IpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHNwZWVkWTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5oYXNIaXRPYnN0YWNsZSA9IGZ1bmN0aW9uIChvYnMpIHtcclxuXHRcdFx0c2V0Q3Jhc2hlZCgpO1xyXG5cclxuXHRcdFx0aWYgKG5hdmlnYXRvci52aWJyYXRlKSB7XHJcblx0XHRcdFx0bmF2aWdhdG9yLnZpYnJhdGUoNTAwKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0b2JzdGFjbGVzSGl0LnB1c2gob2JzLmlkKTtcclxuXHJcblx0XHRcdHRoYXQucmVzZXRTcGVlZCgpO1xyXG5cdFx0XHR0aGF0Lm9uSGl0T2JzdGFjbGVDYihvYnMpO1xyXG5cclxuXHRcdFx0aWYgKGNhbmNlbGFibGVTdGF0ZVRpbWVvdXQpIHtcclxuXHRcdFx0XHRjbGVhclRpbWVvdXQoY2FuY2VsYWJsZVN0YXRlVGltZW91dCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FuY2VsYWJsZVN0YXRlVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0c2V0Tm9ybWFsKCk7XHJcblx0XHRcdH0sIDE1MDApO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0Lmhhc0hpdEp1bXAgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHNldEp1bXBpbmcoKTtcclxuXHJcblx0XHRcdGlmIChjYW5jZWxhYmxlU3RhdGVUaW1lb3V0KSB7XHJcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KGNhbmNlbGFibGVTdGF0ZVRpbWVvdXQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhbmNlbGFibGVTdGF0ZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHNldE5vcm1hbCgpO1xyXG5cdFx0XHR9LCAxMDAwKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5oYXNIaXRDb2xsZWN0aWJsZSA9IGZ1bmN0aW9uIChpdGVtKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdIaXQgaXRlbTonLCBpdGVtLmRhdGEubmFtZSlcclxuXHRcdFx0dGhhdC5vbkNvbGxlY3RJdGVtQ2IoaXRlbSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhhdC5pc0VhdGVuQnkgPSBmdW5jdGlvbiAobW9uc3Rlciwgd2hlbkVhdGVuKSB7XHJcblx0XHRcdHRoYXQuaGFzSGl0T2JzdGFjbGUobW9uc3Rlcik7XHJcblx0XHRcdG1vbnN0ZXIuc3RhcnRFYXRpbmcod2hlbkVhdGVuKTtcclxuXHRcdFx0b2JzdGFjbGVzSGl0LnB1c2gobW9uc3Rlci5pZCk7XHJcblx0XHRcdHRoYXQuaXNNb3ZpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhhdC5pc0JlaW5nRWF0ZW4gPSB0cnVlO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LnJlc2V0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRvYnN0YWNsZXNIaXQgPSBbXTtcclxuXHRcdFx0cGl4ZWxzVHJhdmVsbGVkID0gMDtcclxuXHRcdFx0dGhhdC5pc01vdmluZyA9IHRydWU7XHJcblx0XHRcdHRoYXQuaXNKdW1waW5nID0gZmFsc2U7XHJcblx0XHRcdHRoYXQuaGFzQmVlbkhpdCA9IGZhbHNlO1xyXG5cdFx0XHRjYW5TcGVlZEJvb3N0ID0gdHJ1ZTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zZXRIaXRPYnN0YWNsZUNiID0gZnVuY3Rpb24gKGZuKSB7XHJcblx0XHRcdHRoYXQub25IaXRPYnN0YWNsZUNiID0gZm4gfHwgZnVuY3Rpb24oKSB7fTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5zZXRDb2xsZWN0SXRlbUNiID0gZnVuY3Rpb24gKGZuKSB7XHJcblx0XHRcdHRoYXQub25Db2xsZWN0SXRlbUNiID0gZm4gfHwgZnVuY3Rpb24oKSB7fTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB0aGF0O1xyXG5cdH1cclxuXHJcblx0Z2xvYmFsLnBsYXllciA9IFBsYXllcjtcclxufSkodGhpcyk7XHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IHRoaXMucGxheWVyO1xyXG59XHJcbiIsIi8vIEF2b2lkIGBjb25zb2xlYCBlcnJvcnMgaW4gYnJvd3NlcnMgdGhhdCBsYWNrIGEgY29uc29sZS5cclxuKGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIG1ldGhvZDtcclxuICAgIHZhciBub29wID0gZnVuY3Rpb24gbm9vcCgpIHt9O1xyXG4gICAgdmFyIG1ldGhvZHMgPSBbXHJcbiAgICAgICAgJ2Fzc2VydCcsICdjbGVhcicsICdjb3VudCcsICdkZWJ1ZycsICdkaXInLCAnZGlyeG1sJywgJ2Vycm9yJyxcclxuICAgICAgICAnZXhjZXB0aW9uJywgJ2dyb3VwJywgJ2dyb3VwQ29sbGFwc2VkJywgJ2dyb3VwRW5kJywgJ2luZm8nLCAnbG9nJyxcclxuICAgICAgICAnbWFya1RpbWVsaW5lJywgJ3Byb2ZpbGUnLCAncHJvZmlsZUVuZCcsICd0YWJsZScsICd0aW1lJywgJ3RpbWVFbmQnLFxyXG4gICAgICAgICd0aW1lU3RhbXAnLCAndHJhY2UnLCAnd2FybidcclxuICAgIF07XHJcbiAgICB2YXIgbGVuZ3RoID0gbWV0aG9kcy5sZW5ndGg7XHJcbiAgICB2YXIgY29uc29sZSA9ICh3aW5kb3cuY29uc29sZSA9IHdpbmRvdy5jb25zb2xlIHx8IHt9KTtcclxuXHJcbiAgICB3aGlsZSAobGVuZ3RoLS0pIHtcclxuICAgICAgICBtZXRob2QgPSBtZXRob2RzW2xlbmd0aF07XHJcblxyXG4gICAgICAgIC8vIE9ubHkgc3R1YiB1bmRlZmluZWQgbWV0aG9kcy5cclxuICAgICAgICBpZiAoIWNvbnNvbGVbbWV0aG9kXSkge1xyXG4gICAgICAgICAgICBjb25zb2xlW21ldGhvZF0gPSBub29wO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSgpKTsiLCJ2YXIgU3ByaXRlID0gcmVxdWlyZSgnLi9zcHJpdGUnKTtcclxuXHJcbihmdW5jdGlvbihnbG9iYWwpIHtcclxuXHRmdW5jdGlvbiBTbm93Ym9hcmRlcihkYXRhKSB7XHJcblx0XHR2YXIgdGhhdCA9IG5ldyBTcHJpdGUoZGF0YSk7XHJcblx0XHR2YXIgc3VwID0ge1xyXG5cdFx0XHRkcmF3OiB0aGF0LnN1cGVyaW9yKCdkcmF3JyksXHJcblx0XHRcdGN5Y2xlOiB0aGF0LnN1cGVyaW9yKCdjeWNsZScpXHJcblx0XHR9O1xyXG5cdFx0dmFyIGRpcmVjdGlvbnMgPSB7XHJcblx0XHRcdHNFYXN0OiBmdW5jdGlvbih4RGlmZikgeyByZXR1cm4geERpZmYgPiAwOyB9LFxyXG5cdFx0XHRzV2VzdDogZnVuY3Rpb24oeERpZmYpIHsgcmV0dXJuIHhEaWZmIDw9IDA7IH1cclxuXHRcdH07XHJcblx0XHR2YXIgc3RhbmRhcmRTcGVlZCA9IDM7XHJcblxyXG5cdFx0dGhhdC5zZXRTcGVlZChzdGFuZGFyZFNwZWVkKTtcclxuXHJcblx0XHRmdW5jdGlvbiBnZXREaXJlY3Rpb24oKSB7XHJcblx0XHRcdHZhciB4RGlmZiA9IHRoYXQubW92aW5nVG93YXJkWzBdIC0gdGhhdC5tYXBQb3NpdGlvblswXTtcclxuXHRcdFx0dmFyIHlEaWZmID0gdGhhdC5tb3ZpbmdUb3dhcmRbMV0gLSB0aGF0Lm1hcFBvc2l0aW9uWzFdO1xyXG5cclxuXHRcdFx0aWYgKGRpcmVjdGlvbnMuc0Vhc3QoeERpZmYpKSB7XHJcblx0XHRcdFx0cmV0dXJuICdzRWFzdCc7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cmV0dXJuICdzV2VzdCc7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGF0LmN5Y2xlID0gZnVuY3Rpb24gKGRDb250ZXh0KSB7XHJcblx0XHRcdGlmIChOdW1iZXIucmFuZG9tKDEwKSA9PT0gMSkge1xyXG5cdFx0XHRcdHRoYXQuc2V0TWFwUG9zaXRpb25UYXJnZXQoZENvbnRleHQuZ2V0UmFuZG9tbHlJblRoZUNlbnRyZU9mTWFwKCkpO1xyXG5cdFx0XHRcdHRoYXQuc2V0U3BlZWQoc3RhbmRhcmRTcGVlZCArIE51bWJlci5yYW5kb20oLTEsIDEpKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhhdC5zZXRNYXBQb3NpdGlvblRhcmdldCh1bmRlZmluZWQsIGRDb250ZXh0LmdldE1hcEJlbG93Vmlld3BvcnQoKSArIDYwMCk7XHJcblxyXG5cdFx0XHRzdXAuY3ljbGUoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5kcmF3ID0gZnVuY3Rpb24oZENvbnRleHQpIHtcclxuXHRcdFx0dmFyIHNwcml0ZVBhcnRUb1VzZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRyZXR1cm4gZ2V0RGlyZWN0aW9uKCk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRyZXR1cm4gc3VwLmRyYXcoZENvbnRleHQsIHNwcml0ZVBhcnRUb1VzZSgpKTtcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIHRoYXQ7XHJcblx0fVxyXG5cclxuXHRnbG9iYWwuc25vd2JvYXJkZXIgPSBTbm93Ym9hcmRlcjtcclxufSkoIHRoaXMgKTtcclxuXHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IHRoaXMuc25vd2JvYXJkZXI7XHJcbn0iLCIoZnVuY3Rpb24gKGdsb2JhbCkge1xyXG5cdHZhciBHVUlEID0gcmVxdWlyZSgnLi9ndWlkJyk7XHJcblx0ZnVuY3Rpb24gU3ByaXRlIChkYXRhKSB7XHJcblx0XHR2YXIgaGl0dGFibGVPYmplY3RzID0ge307XHJcblx0XHR2YXIgekluZGV4ZXNPY2N1cGllZCA9IFsgMCBdO1xyXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xyXG5cdFx0dmFyIHRyYWNrZWRTcHJpdGVUb01vdmVUb3dhcmQ7XHJcblx0XHR2YXIgc2hvd0hpdEJveGVzID0gZmFsc2U7XHJcblxyXG5cdFx0dGhhdC5kaXJlY3Rpb24gPSB1bmRlZmluZWQ7XHJcblx0XHR0aGF0Lm1hcFBvc2l0aW9uID0gWzAsIDAsIDBdO1xyXG5cdFx0dGhhdC5pZCA9IEdVSUQoKTtcclxuXHRcdHRoYXQuY2FudmFzWCA9IDA7XHJcblx0XHR0aGF0LmNhbnZhc1kgPSAwO1xyXG5cdFx0dGhhdC5jYW52YXNaID0gMDtcclxuXHRcdHRoYXQuaGVpZ2h0ID0gMDtcclxuXHRcdHRoYXQuc3BlZWQgPSAwO1xyXG5cdFx0dGhhdC5kYXRhID0gZGF0YSB8fCB7IHBhcnRzIDoge30gfTtcclxuXHRcdHRoYXQubW92aW5nVG93YXJkID0gWyAwLCAwIF07XHJcblx0XHR0aGF0Lm1ldHJlc0Rvd25UaGVNb3VudGFpbiA9IDA7XHJcblx0XHR0aGF0Lm1vdmluZ1dpdGhDb252aWN0aW9uID0gZmFsc2U7XHJcblx0XHR0aGF0LmRlbGV0ZWQgPSBmYWxzZTtcclxuXHRcdHRoYXQubWF4SGVpZ2h0ID0gKGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIE9iamVjdC52YWx1ZXModGhhdC5kYXRhLnBhcnRzKS5tYXAoZnVuY3Rpb24gKHApIHsgcmV0dXJuIHBbM107IH0pLm1heCgpO1xyXG5cdFx0fSgpKTtcclxuXHRcdHRoYXQuaXNNb3ZpbmcgPSB0cnVlO1xyXG5cdFx0XHJcblx0XHRpZiAoIXRoYXQuZGF0YS5wYXJ0cykge1xyXG5cdFx0XHR0aGF0LmRhdGEucGFydHMgPSB7fTtcclxuXHRcdFx0dGhhdC5jdXJyZW50RnJhbWUgPSB1bmRlZmluZWQ7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGF0LmN1cnJlbnRGcmFtZSA9IHRoYXQuZGF0YS5wYXJ0c1swXTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoZGF0YSAmJiBkYXRhLmlkKXtcclxuXHRcdFx0dGhhdC5pZCA9IGRhdGEuaWQ7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGRhdGEgJiYgZGF0YS56SW5kZXhlc09jY3VwaWVkKSB7XHJcblx0XHRcdHpJbmRleGVzT2NjdXBpZWQgPSBkYXRhLnpJbmRleGVzT2NjdXBpZWQ7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gaW5jcmVtZW50WChhbW91bnQpIHtcclxuXHRcdFx0dGhhdC5jYW52YXNYICs9IGFtb3VudC50b051bWJlcigpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGluY3JlbWVudFkoYW1vdW50KSB7XHJcblx0XHRcdHRoYXQuY2FudmFzWSArPSBhbW91bnQudG9OdW1iZXIoKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBnZXRIaXRCb3goZm9yWkluZGV4KSB7XHJcblx0XHRcdGlmICh0aGF0LmRhdGEuaGl0Qm94ZXMpIHtcclxuXHRcdFx0XHRpZiAoZGF0YS5oaXRCb3hlc1tmb3JaSW5kZXhdKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gZGF0YS5oaXRCb3hlc1tmb3JaSW5kZXhdO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHJvdW5kSGFsZihudW0pIHtcclxuXHRcdFx0bnVtID0gTWF0aC5yb3VuZChudW0qMikvMjtcclxuXHRcdFx0cmV0dXJuIG51bTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBtb3ZlKCkge1xyXG5cdFx0XHRpZiAoIXRoYXQuaXNNb3ZpbmcpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGxldCBjdXJyZW50WCA9IHRoYXQubWFwUG9zaXRpb25bMF07XHJcblx0XHRcdGxldCBjdXJyZW50WSA9IHRoYXQubWFwUG9zaXRpb25bMV07XHJcblxyXG5cdFx0XHRpZiAodHlwZW9mIHRoYXQuZGlyZWN0aW9uICE9PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdC8vIEZvciB0aGlzIHdlIG5lZWQgdG8gbW9kaWZ5IHRoZSB0aGF0LmRpcmVjdGlvbiBzbyBpdCByZWxhdGVzIHRvIHRoZSBob3Jpem9udGFsXHJcblx0XHRcdFx0dmFyIGQgPSB0aGF0LmRpcmVjdGlvbiAtIDkwO1xyXG5cdFx0XHRcdGlmIChkIDwgMCkgZCA9IDM2MCArIGQ7XHJcblx0XHRcdFx0Y3VycmVudFggKz0gcm91bmRIYWxmKHRoYXQuc3BlZWQgKiBNYXRoLmNvcyhkICogKE1hdGguUEkgLyAxODApKSk7XHJcblx0XHRcdFx0Y3VycmVudFkgKz0gcm91bmRIYWxmKHRoYXQuc3BlZWQgKiBNYXRoLnNpbihkICogKE1hdGguUEkgLyAxODApKSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiB0aGF0Lm1vdmluZ1Rvd2FyZFswXSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0XHRcdGlmIChjdXJyZW50WCA+IHRoYXQubW92aW5nVG93YXJkWzBdKSB7XHJcblx0XHRcdFx0XHRcdGN1cnJlbnRYIC09IE1hdGgubWluKHRoYXQuZ2V0U3BlZWRYKCksIE1hdGguYWJzKGN1cnJlbnRYIC0gdGhhdC5tb3ZpbmdUb3dhcmRbMF0pKTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoY3VycmVudFggPCB0aGF0Lm1vdmluZ1Rvd2FyZFswXSkge1xyXG5cdFx0XHRcdFx0XHRjdXJyZW50WCArPSBNYXRoLm1pbih0aGF0LmdldFNwZWVkWCgpLCBNYXRoLmFicyhjdXJyZW50WCAtIHRoYXQubW92aW5nVG93YXJkWzBdKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmICh0eXBlb2YgdGhhdC5tb3ZpbmdUb3dhcmRbMV0gIT09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0XHRpZiAoY3VycmVudFkgPiB0aGF0Lm1vdmluZ1Rvd2FyZFsxXSkge1xyXG5cdFx0XHRcdFx0XHRjdXJyZW50WSAtPSBNYXRoLm1pbih0aGF0LmdldFNwZWVkWSgpLCBNYXRoLmFicyhjdXJyZW50WSAtIHRoYXQubW92aW5nVG93YXJkWzFdKSk7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGN1cnJlbnRZIDwgdGhhdC5tb3ZpbmdUb3dhcmRbMV0pIHtcclxuXHRcdFx0XHRcdFx0Y3VycmVudFkgKz0gTWF0aC5taW4odGhhdC5nZXRTcGVlZFkoKSwgTWF0aC5hYnMoY3VycmVudFkgLSB0aGF0Lm1vdmluZ1Rvd2FyZFsxXSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhhdC5zZXRNYXBQb3NpdGlvbihjdXJyZW50WCwgY3VycmVudFkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuc2V0SGl0Qm94ZXNWaXNpYmxlID0gZnVuY3Rpb24oc2hvdykge1xyXG5cdFx0XHRzaG93SGl0Qm94ZXMgPSBzaG93O1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuZHJhdyA9IGZ1bmN0aW9uIChkQ3R4LCBzcHJpdGVGcmFtZSkge1xyXG5cdFx0XHR0aGF0LmN1cnJlbnRGcmFtZSA9IHRoYXQuZGF0YS5wYXJ0c1tzcHJpdGVGcmFtZV07XHJcblx0XHRcdGxldCBmciA9IHRoYXQuY3VycmVudEZyYW1lOy8vIHRoYXQuZGF0YS5wYXJ0c1tzcHJpdGVGcmFtZV07XHJcblx0XHRcdHRoYXQuaGVpZ2h0ID0gZnJbM107XHJcblx0XHRcdHRoYXQud2lkdGggPSBmclsyXTtcclxuXHJcblx0XHRcdGNvbnN0IG5ld0NhbnZhc1Bvc2l0aW9uID0gZEN0eC5tYXBQb3NpdGlvblRvQ2FudmFzUG9zaXRpb24odGhhdC5tYXBQb3NpdGlvbik7XHJcblx0XHRcdHRoYXQuc2V0Q2FudmFzUG9zaXRpb24obmV3Q2FudmFzUG9zaXRpb25bMF0sIG5ld0NhbnZhc1Bvc2l0aW9uWzFdKTtcclxuXHJcblx0XHRcdC8vIFNwcml0ZSBvZmZzZXQgZm9yIGtlZXBpbmcgc3ByaXRlIGZyYW1lIGNlbnRlcmVkIChmb3Igc3ByaXRlIGZyYW1lcyBvZiB2YXJpb3VzIHNpemVzKVxyXG5cdFx0XHRjb25zdCBvZmZzZXRYID0gZnIubGVuZ3RoID4gNCA/IGZyWzRdIDogMDtcclxuXHRcdFx0Y29uc3Qgb2Zmc2V0WSA9IGZyLmxlbmd0aCA+IDUgPyBmcls1XSA6IDA7XHJcblxyXG5cdFx0XHRkQ3R4LmRyYXdJbWFnZShkQ3R4LmdldExvYWRlZEltYWdlKHRoYXQuZGF0YS4kaW1hZ2VGaWxlKSwgZnJbMF0sIGZyWzFdLCBmclsyXSwgZnJbM10sIHRoYXQuY2FudmFzWCArIG9mZnNldFgsIHRoYXQuY2FudmFzWSArIG9mZnNldFksIGZyWzJdLCBmclszXSk7XHJcblx0XHRcclxuXHRcdFx0ZHJhd0hpdGJveChkQ3R4LCBmcik7XHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIGRyYXdIaXRib3goZEN0eCwgc3ByaXRlUGFydCkge1xyXG5cdFx0XHRpZiAoIXNob3dIaXRCb3hlcylcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcclxuXHRcdFx0Y29uc3QgaGl0Ym94T2Zmc2V0WCA9IHNwcml0ZVBhcnQubGVuZ3RoID4gNiA/IHNwcml0ZVBhcnRbNl0gOiAwO1xyXG5cdFx0XHRjb25zdCBoaXRib3hPZmZzZXRZID0gc3ByaXRlUGFydC5sZW5ndGggPiA3ID8gc3ByaXRlUGFydFs3XSA6IDA7XHJcblxyXG5cdFx0XHQvLyBEcmF3IGhpdGJveGVzXHJcblx0XHRcdGZvciAoY29uc3QgYm94IGluIHRoYXQuZGF0YS5oaXRCb3hlcykge1xyXG5cdFx0XHRcdGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbCh0aGF0LmRhdGEuaGl0Qm94ZXMsIGJveCkpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGhpdEJveCA9IHRoYXQuZGF0YS5oaXRCb3hlc1tib3hdO1xyXG5cdFx0XHRcdFx0Y29uc3QgbGVmdCA9IGhpdEJveFswXSArIGhpdGJveE9mZnNldFg7XHJcblx0XHRcdFx0XHRjb25zdCB0b3AgPSBoaXRCb3hbMV0gKyBoaXRib3hPZmZzZXRZO1xyXG5cdFx0XHRcdFx0Y29uc3QgcmlnaHQgPSBoaXRCb3hbMl0gKyBoaXRib3hPZmZzZXRYO1xyXG5cdFx0XHRcdFx0Y29uc3QgYm90dG9tID0gaGl0Qm94WzNdICsgaGl0Ym94T2Zmc2V0WTtcclxuXHRcdFx0XHRcdGRDdHguc3Ryb2tlU3R5bGUgPSAneWVsbG93JztcclxuXHRcdFx0XHRcdGRDdHguc3Ryb2tlUmVjdCh0aGF0LmNhbnZhc1ggKyBsZWZ0LCB0aGF0LmNhbnZhc1kgKyB0b3AsIHJpZ2h0IC0gbGVmdCwgYm90dG9tIC0gdG9wKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnNldE1hcFBvc2l0aW9uID0gZnVuY3Rpb24gKHgsIHksIHopIHtcclxuXHRcdFx0aWYgKHR5cGVvZiB4ID09PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdHggPSB0aGF0Lm1hcFBvc2l0aW9uWzBdO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlb2YgeSA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0XHR5ID0gdGhhdC5tYXBQb3NpdGlvblsxXTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodHlwZW9mIHogPT09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0eiA9IHRoYXQubWFwUG9zaXRpb25bMl07XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhhdC56SW5kZXhlc09jY3VwaWVkID0gWyB6IF07XHJcblx0XHRcdH1cclxuXHRcdFx0dGhhdC5tYXBQb3NpdGlvbiA9IFt4LCB5LCB6XTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXRDYW52YXNQb3NpdGlvbiA9IGZ1bmN0aW9uIChjeCwgY3kpIHtcclxuXHRcdFx0aWYgKGN4KSB7XHJcblx0XHRcdFx0aWYgKE9iamVjdC5pc1N0cmluZyhjeCkgJiYgKGN4LmZpcnN0KCkgPT09ICcrJyB8fCBjeC5maXJzdCgpID09PSAnLScpKSBpbmNyZW1lbnRYKGN4KTtcclxuXHRcdFx0XHRlbHNlIHRoYXQuY2FudmFzWCA9IGN4O1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoY3kpIHtcclxuXHRcdFx0XHRpZiAoT2JqZWN0LmlzU3RyaW5nKGN5KSAmJiAoY3kuZmlyc3QoKSA9PT0gJysnIHx8IGN5LmZpcnN0KCkgPT09ICctJykpIGluY3JlbWVudFkoY3kpO1xyXG5cdFx0XHRcdGVsc2UgdGhhdC5jYW52YXNZID0gY3k7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nZXRDYW52YXNQb3NpdGlvblggPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiB0aGF0LmNhbnZhc1g7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZ2V0Q2FudmFzUG9zaXRpb25ZID0gZnVuY3Rpb24gICgpIHtcclxuXHRcdFx0cmV0dXJuIHRoYXQuY2FudmFzWTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nZXRMZWZ0SGl0Qm94RWRnZSA9IGZ1bmN0aW9uICh6SW5kZXgpIHtcclxuXHRcdFx0ekluZGV4ID0gekluZGV4IHx8IDA7XHJcblx0XHRcdGxldCBsaGJlID0gdGhpcy5nZXRDYW52YXNQb3NpdGlvblgoKTtcclxuXHRcdFx0Y29uc3QgaGl0Ym94ID0gZ2V0SGl0Qm94KHpJbmRleCk7XHJcblx0XHRcdGlmIChoaXRib3gpIHtcclxuXHRcdFx0XHRsaGJlICs9IGhpdGJveFswXTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gbGhiZTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nZXRUb3BIaXRCb3hFZGdlID0gZnVuY3Rpb24gKHpJbmRleCkge1xyXG5cdFx0XHR6SW5kZXggPSB6SW5kZXggfHwgMDtcclxuXHRcdFx0bGV0IHRoYmUgPSB0aGlzLmdldENhbnZhc1Bvc2l0aW9uWSgpO1xyXG5cdFx0XHRjb25zdCBoaXRib3ggPSBnZXRIaXRCb3goekluZGV4KTtcclxuXHRcdFx0aWYgKGhpdGJveCkge1xyXG5cdFx0XHRcdHRoYmUgKz0gaGl0Ym94WzFdO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB0aGJlO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmdldFJpZ2h0SGl0Qm94RWRnZSA9IGZ1bmN0aW9uICh6SW5kZXgpIHtcclxuXHRcdFx0ekluZGV4ID0gekluZGV4IHx8IDA7XHJcblxyXG5cdFx0XHRjb25zdCBoaXRib3ggPSBnZXRIaXRCb3goekluZGV4KTtcclxuXHRcdFx0aWYgKGhpdGJveCkge1xyXG5cdFx0XHRcdHJldHVybiB0aGF0LmNhbnZhc1ggKyBoaXRib3hbMl07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB0aGF0LmNhbnZhc1ggKyB0aGF0LndpZHRoO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmdldEJvdHRvbUhpdEJveEVkZ2UgPSBmdW5jdGlvbiAoekluZGV4KSB7XHJcblx0XHRcdHpJbmRleCA9IHpJbmRleCB8fCAwO1xyXG5cclxuXHRcdFx0Y29uc3QgaGl0Ym94ID0gZ2V0SGl0Qm94KHpJbmRleCk7XHJcblx0XHRcdGlmIChoaXRib3gpIHtcclxuXHRcdFx0XHRyZXR1cm4gdGhhdC5jYW52YXNZICsgaGl0Ym94WzNdO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gdGhhdC5jYW52YXNZICsgdGhhdC5oZWlnaHQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZ2V0UG9zaXRpb25JbkZyb250T2YgPSBmdW5jdGlvbiAgKCkge1xyXG5cdFx0XHRyZXR1cm4gW3RoYXQuY2FudmFzWCwgdGhhdC5jYW52YXNZICsgdGhhdC5oZWlnaHRdO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnNldFNwZWVkID0gZnVuY3Rpb24gKHMpIHtcclxuXHRcdFx0dGhhdC5zcGVlZCA9IHM7XHJcblx0XHRcdHRoYXQuc3BlZWRYID0gcztcclxuXHRcdFx0dGhhdC5zcGVlZFkgPSBzO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmluY3JlbWVudFNwZWVkQnkgPSBmdW5jdGlvbiAocykge1xyXG5cdFx0XHR0aGF0LnNwZWVkICs9IHM7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuZ2V0U3BlZWQgPSBmdW5jdGlvbiBnZXRTcGVlZCAoKSB7XHJcblx0XHRcdHJldHVybiB0aGF0LnNwZWVkO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGF0LmdldFNwZWVkWCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIHRoYXQuc3BlZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoYXQuZ2V0U3BlZWRZID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gdGhhdC5zcGVlZDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXRIZWlnaHQgPSBmdW5jdGlvbiAoaCkge1xyXG5cdFx0XHR0aGF0LmhlaWdodCA9IGg7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0V2lkdGggPSBmdW5jdGlvbiAodykge1xyXG5cdFx0XHR0aGF0LndpZHRoID0gdztcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5nZXRNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiB0aGF0Lm1heEhlaWdodDtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhhdC5nZXRNb3ZpbmdUb3dhcmRPcHBvc2l0ZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0aWYgKCF0aGF0LmlzTW92aW5nKSB7XHJcblx0XHRcdFx0cmV0dXJuIFswLCAwXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIGR4ID0gKHRoYXQubW92aW5nVG93YXJkWzBdIC0gdGhhdC5tYXBQb3NpdGlvblswXSk7XHJcblx0XHRcdHZhciBkeSA9ICh0aGF0Lm1vdmluZ1Rvd2FyZFsxXSAtIHRoYXQubWFwUG9zaXRpb25bMV0pO1xyXG5cclxuXHRcdFx0dmFyIG9wcG9zaXRlWCA9IChNYXRoLmFicyhkeCkgPiA3NSA/IDAgLSBkeCA6IDApO1xyXG5cdFx0XHR2YXIgb3Bwb3NpdGVZID0gLWR5O1xyXG5cclxuXHRcdFx0cmV0dXJuIFsgb3Bwb3NpdGVYLCBvcHBvc2l0ZVkgXTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5jaGVja0hpdHRhYmxlT2JqZWN0cyA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0T2JqZWN0LmtleXMoaGl0dGFibGVPYmplY3RzLCBmdW5jdGlvbiAoaywgb2JqZWN0RGF0YSkge1xyXG5cdFx0XHRcdGlmIChvYmplY3REYXRhLm9iamVjdC5kZWxldGVkKSB7XHJcblx0XHRcdFx0XHRkZWxldGUgaGl0dGFibGVPYmplY3RzW2tdO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRpZiAob2JqZWN0RGF0YS5vYmplY3QuaGl0cyh0aGF0KSkge1xyXG5cdFx0XHRcdFx0XHRvYmplY3REYXRhLmNhbGxiYWNrcy5lYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG5cdFx0XHRcdFx0XHRcdGNhbGxiYWNrKHRoYXQsIG9iamVjdERhdGEub2JqZWN0KTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5jeWNsZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0dGhhdC5jaGVja0hpdHRhYmxlT2JqZWN0cygpO1xyXG5cclxuXHRcdFx0aWYgKHRyYWNrZWRTcHJpdGVUb01vdmVUb3dhcmQpIHtcclxuXHRcdFx0XHR0aGF0LnNldE1hcFBvc2l0aW9uVGFyZ2V0KHRyYWNrZWRTcHJpdGVUb01vdmVUb3dhcmQubWFwUG9zaXRpb25bMF0sIHRyYWNrZWRTcHJpdGVUb01vdmVUb3dhcmQubWFwUG9zaXRpb25bMV0sIHRydWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRtb3ZlKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuc2V0TWFwUG9zaXRpb25UYXJnZXQgPSBmdW5jdGlvbiAoeCwgeSwgb3ZlcnJpZGUpIHtcclxuXHRcdFx0aWYgKG92ZXJyaWRlKSB7XHJcblx0XHRcdFx0dGhhdC5tb3ZpbmdXaXRoQ29udmljdGlvbiA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoIXRoYXQubW92aW5nV2l0aENvbnZpY3Rpb24pIHtcclxuXHRcdFx0XHRpZiAodHlwZW9mIHggPT09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0XHR4ID0gdGhhdC5tb3ZpbmdUb3dhcmRbMF07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAodHlwZW9mIHkgPT09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0XHR5ID0gdGhhdC5tb3ZpbmdUb3dhcmRbMV07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0aGF0Lm1vdmluZ1Rvd2FyZCA9IFsgeCwgeSBdO1xyXG5cclxuXHRcdFx0XHR0aGF0Lm1vdmluZ1dpdGhDb252aWN0aW9uID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHRoYXQucmVzZXREaXJlY3Rpb24oKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zZXREaXJlY3Rpb24gPSBmdW5jdGlvbiAoYW5nbGUpIHtcclxuXHRcdFx0aWYgKGFuZ2xlID49IDM2MCkge1xyXG5cdFx0XHRcdGFuZ2xlID0gMzYwIC0gYW5nbGU7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhhdC5kaXJlY3Rpb24gPSBhbmdsZTtcclxuXHRcdFx0dGhhdC5tb3ZpbmdUb3dhcmQgPSB1bmRlZmluZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMucmVzZXREaXJlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRoYXQuZGlyZWN0aW9uID0gdW5kZWZpbmVkO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLnNldE1hcFBvc2l0aW9uVGFyZ2V0V2l0aENvbnZpY3Rpb24gPSBmdW5jdGlvbiAoY3gsIGN5KSB7XHJcblx0XHRcdHRoYXQuc2V0TWFwUG9zaXRpb25UYXJnZXQoY3gsIGN5KTtcclxuXHRcdFx0dGhhdC5tb3ZpbmdXaXRoQ29udmljdGlvbiA9IHRydWU7XHJcblx0XHRcdC8vIHRoYXQucmVzZXREaXJlY3Rpb24oKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5mb2xsb3cgPSBmdW5jdGlvbiAoc3ByaXRlKSB7XHJcblx0XHRcdHRyYWNrZWRTcHJpdGVUb01vdmVUb3dhcmQgPSBzcHJpdGU7XHJcblx0XHRcdC8vIHRoYXQucmVzZXREaXJlY3Rpb24oKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5zdG9wRm9sbG93aW5nID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR0cmFja2VkU3ByaXRlVG9Nb3ZlVG93YXJkID0gZmFsc2U7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMub25IaXR0aW5nID0gZnVuY3Rpb24gKG9iamVjdFRvSGl0LCBjYWxsYmFjaykge1xyXG5cdFx0XHRpZiAoaGl0dGFibGVPYmplY3RzW29iamVjdFRvSGl0LmlkXSkge1xyXG5cdFx0XHRcdHJldHVybiBoaXR0YWJsZU9iamVjdHNbb2JqZWN0VG9IaXQuaWRdLmNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aGl0dGFibGVPYmplY3RzW29iamVjdFRvSGl0LmlkXSA9IHtcclxuXHRcdFx0XHRvYmplY3Q6IG9iamVjdFRvSGl0LFxyXG5cdFx0XHRcdGNhbGxiYWNrczogWyBjYWxsYmFjayBdXHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuZGVsZXRlT25OZXh0Q3ljbGUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHRoYXQuZGVsZXRlZCA9IHRydWU7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMub2NjdXBpZXNaSW5kZXggPSBmdW5jdGlvbiAoeikge1xyXG5cdFx0XHRyZXR1cm4gekluZGV4ZXNPY2N1cGllZC5pbmRleE9mKHopID49IDA7XHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuaGl0cyA9IGZ1bmN0aW9uIChvdGhlcikge1xyXG5cdFx0XHRcclxuXHRcdFx0Y29uc3QgcmVjdDF4ID0gb3RoZXIuZ2V0TGVmdEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSk7XHJcblx0XHRcdGNvbnN0IHJlY3QxdyA9IG90aGVyLmdldFJpZ2h0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSAtIHJlY3QxeDtcclxuXHJcblx0XHRcdGNvbnN0IHJlY3QxeSA9IG90aGVyLmdldFRvcEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSk7XHJcblx0XHRcdGNvbnN0IHJlY3QxaCA9IG90aGVyLmdldEJvdHRvbUhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgLSByZWN0MXk7XHJcblxyXG5cdFx0XHQvLyBHZXQgaGl0Ym94IG9mZnNldCB3aGVuIHNwZWNpZmllZFxyXG5cdFx0XHRjb25zdCBpc2FycmF5ID0gQXJyYXkuaXNBcnJheSh0aGF0LmN1cnJlbnRGcmFtZSk7XHJcblx0XHRcdGNvbnN0IGhpdGJveE9mZnNldFggPSAgaXNhcnJheSAmJiB0aGF0LmN1cnJlbnRGcmFtZS5sZW5ndGggPiA2ID8gdGhhdC5jdXJyZW50RnJhbWVbNl0gOiAwO1xyXG5cdFx0XHRjb25zdCBoaXRib3hPZmZzZXRZID0gaXNhcnJheSAmJiB0aGF0LmN1cnJlbnRGcmFtZS5sZW5ndGggPiA3ID8gdGhhdC5jdXJyZW50RnJhbWVbN10gOiAwO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVjdDJ4ID0gdGhhdC5nZXRMZWZ0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSArIGhpdGJveE9mZnNldFg7XHJcblx0XHRcdGNvbnN0IHJlY3QydyA9IHRoYXQuZ2V0UmlnaHRIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pIC0gcmVjdDJ4ICsgaGl0Ym94T2Zmc2V0WDtcclxuXHRcdFx0Y29uc3QgcmVjdDJ5ID0gdGhhdC5nZXRUb3BIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pICsgaGl0Ym94T2Zmc2V0WTtcclxuXHRcdFx0Y29uc3QgcmVjdDJoID0gdGhhdC5nZXRCb3R0b21IaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pIC0gcmVjdDJ5ICsgaGl0Ym94T2Zmc2V0WTtcclxuXHJcblx0XHRcdGlmIChyZWN0MXggPCByZWN0MnggKyByZWN0MncgJiZcclxuXHRcdFx0XHRyZWN0MXggKyByZWN0MXcgPiByZWN0MnggJiZcclxuXHRcdFx0XHRyZWN0MXkgPCByZWN0MnkgKyByZWN0MmggJiZcclxuXHRcdFx0XHRyZWN0MWggKyByZWN0MXkgPiByZWN0MnkpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdFx0Ly8gT3JpZ2luYWwgY29sbGlzaW9uIGRldGVjdGlvbjpcclxuXHRcdFx0LyogdmFyIHZlcnRpY2FsSW50ZXJzZWN0ID0gZmFsc2U7XHJcblx0XHRcdHZhciBob3Jpem9udGFsSW50ZXJzZWN0ID0gZmFsc2U7XHJcblxyXG5cdFx0XHQvLyBUZXN0IHRoYXQgVEhJUyBoYXMgYSBib3R0b20gZWRnZSBpbnNpZGUgb2YgdGhlIG90aGVyIG9iamVjdFxyXG5cdFx0XHRpZiAob3RoZXIuZ2V0VG9wSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSA8PSB0aGF0LmdldEJvdHRvbUhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgJiYgb3RoZXIuZ2V0Qm90dG9tSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSA+PSB0aGF0LmdldEJvdHRvbUhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkpIHtcclxuXHRcdFx0XHR2ZXJ0aWNhbEludGVyc2VjdCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRlc3QgdGhhdCBUSElTIGhhcyBhIHRvcCBlZGdlIGluc2lkZSBvZiB0aGUgb3RoZXIgb2JqZWN0XHJcblx0XHRcdGlmIChvdGhlci5nZXRUb3BIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pIDw9IHRoYXQuZ2V0VG9wSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSAmJiBvdGhlci5nZXRCb3R0b21IaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pID49IHRoYXQuZ2V0VG9wSGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSkge1xyXG5cdFx0XHRcdHZlcnRpY2FsSW50ZXJzZWN0ID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVGVzdCB0aGF0IFRISVMgaGFzIGEgcmlnaHQgZWRnZSBpbnNpZGUgb2YgdGhlIG90aGVyIG9iamVjdFxyXG5cdFx0XHRpZiAob3RoZXIuZ2V0TGVmdEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgPD0gdGhhdC5nZXRSaWdodEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgJiYgb3RoZXIuZ2V0UmlnaHRIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pID49IHRoYXQuZ2V0UmlnaHRIaXRCb3hFZGdlKHRoYXQubWFwUG9zaXRpb25bMl0pKSB7XHJcblx0XHRcdFx0aG9yaXpvbnRhbEludGVyc2VjdCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRlc3QgdGhhdCBUSElTIGhhcyBhIGxlZnQgZWRnZSBpbnNpZGUgb2YgdGhlIG90aGVyIG9iamVjdFxyXG5cdFx0XHRpZiAob3RoZXIuZ2V0TGVmdEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgPD0gdGhhdC5nZXRMZWZ0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSAmJiBvdGhlci5nZXRSaWdodEhpdEJveEVkZ2UodGhhdC5tYXBQb3NpdGlvblsyXSkgPj0gdGhhdC5nZXRMZWZ0SGl0Qm94RWRnZSh0aGF0Lm1hcFBvc2l0aW9uWzJdKSkge1xyXG5cdFx0XHRcdGhvcml6b250YWxJbnRlcnNlY3QgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gdmVydGljYWxJbnRlcnNlY3QgJiYgaG9yaXpvbnRhbEludGVyc2VjdDsgKi9cclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5pc0Fib3ZlT25DYW52YXMgPSBmdW5jdGlvbiAoY3kpIHtcclxuXHRcdFx0cmV0dXJuICh0aGF0LmNhbnZhc1kgKyB0aGF0LmhlaWdodCkgPCBjeTtcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5pc0JlbG93T25DYW52YXMgPSBmdW5jdGlvbiAoY3kpIHtcclxuXHRcdFx0cmV0dXJuICh0aGF0LmNhbnZhc1kpID4gY3k7XHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiB0aGF0O1xyXG5cdH1cclxuXHJcblx0U3ByaXRlLmNyZWF0ZU9iamVjdHMgPSBmdW5jdGlvbiBjcmVhdGVPYmplY3RzKHNwcml0ZUluZm9BcnJheSwgb3B0cykge1xyXG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KHNwcml0ZUluZm9BcnJheSkpIHNwcml0ZUluZm9BcnJheSA9IFsgc3ByaXRlSW5mb0FycmF5IF07XHJcblx0XHRvcHRzID0gT2JqZWN0Lm1lcmdlKG9wdHMsIHtcclxuXHRcdFx0cmF0ZU1vZGlmaWVyOiAwLFxyXG5cdFx0XHRkcm9wUmF0ZTogMSxcclxuXHRcdFx0cG9zaXRpb246IFswLCAwXVxyXG5cdFx0fSwgZmFsc2UsIGZhbHNlKTtcclxuXHJcblx0XHR2YXIgQW5pbWF0ZWRTcHJpdGUgPSByZXF1aXJlKCcuL2FuaW1hdGVkU3ByaXRlJyk7XHJcblx0XHRmdW5jdGlvbiBjcmVhdGVPbmUgKHNwcml0ZUluZm8pIHtcclxuXHRcdFx0dmFyIHBvc2l0aW9uID0gb3B0cy5wb3NpdGlvbjtcclxuXHRcdFx0aWYgKE51bWJlci5yYW5kb20oMTAwICsgb3B0cy5yYXRlTW9kaWZpZXIpIDw9IHNwcml0ZUluZm8uZHJvcFJhdGUpIHtcclxuXHRcdFx0XHR2YXIgc3ByaXRlO1xyXG5cdFx0XHRcdGlmIChzcHJpdGVJbmZvLnNwcml0ZS5hbmltYXRlZCkge1xyXG5cdFx0XHRcdFx0c3ByaXRlID0gbmV3IEFuaW1hdGVkU3ByaXRlKHNwcml0ZUluZm8uc3ByaXRlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0c3ByaXRlID0gbmV3IFNwcml0ZShzcHJpdGVJbmZvLnNwcml0ZSk7XHJcblx0XHRcdFx0fVx0XHJcblxyXG5cdFx0XHRcdHNwcml0ZS5zZXRTcGVlZCgwKTtcclxuXHJcblx0XHRcdFx0aWYgKE9iamVjdC5pc0Z1bmN0aW9uKHBvc2l0aW9uKSkge1xyXG5cdFx0XHRcdFx0cG9zaXRpb24gPSBwb3NpdGlvbigpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0c3ByaXRlLnNldE1hcFBvc2l0aW9uKHBvc2l0aW9uWzBdLCBwb3NpdGlvblsxXSk7XHJcblxyXG5cdFx0XHRcdGlmIChzcHJpdGVJbmZvLnNwcml0ZS5oaXRCZWhhdmlvdXIgJiYgc3ByaXRlSW5mby5zcHJpdGUuaGl0QmVoYXZpb3VyLnBsYXllciAmJiBvcHRzLnBsYXllcikge1xyXG5cdFx0XHRcdFx0c3ByaXRlLm9uSGl0dGluZyhvcHRzLnBsYXllciwgc3ByaXRlSW5mby5zcHJpdGUuaGl0QmVoYXZpb3VyLnBsYXllcik7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gc3ByaXRlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIG9iamVjdHMgPSBzcHJpdGVJbmZvQXJyYXkubWFwKGNyZWF0ZU9uZSkucmVtb3ZlKHVuZGVmaW5lZCk7XHJcblxyXG5cdFx0cmV0dXJuIG9iamVjdHM7XHJcblx0fTtcclxuXHJcblx0Z2xvYmFsLnNwcml0ZSA9IFNwcml0ZTtcclxufSkoIHRoaXMgKTtcclxuXHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IHRoaXMuc3ByaXRlO1xyXG59IiwiKGZ1bmN0aW9uIChnbG9iYWwpIHtcclxuXHRmdW5jdGlvbiBTcHJpdGVBcnJheSgpIHtcclxuXHRcdHRoaXMucHVzaEhhbmRsZXJzID0gW107XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fVxyXG5cclxuXHRTcHJpdGVBcnJheS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEFycmF5LnByb3RvdHlwZSk7XHJcblxyXG5cdFNwcml0ZUFycmF5LnByb3RvdHlwZS5vblB1c2ggPSBmdW5jdGlvbihmLCByZXRyb2FjdGl2ZSkge1xyXG5cdFx0dGhpcy5wdXNoSGFuZGxlcnMucHVzaChmKTtcclxuXHJcblx0XHRpZiAocmV0cm9hY3RpdmUpIHtcclxuXHRcdFx0dGhpcy5lYWNoKGYpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdFNwcml0ZUFycmF5LnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24ob2JqKSB7XHJcblx0XHRBcnJheS5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsIG9iaik7XHJcblx0XHR0aGlzLnB1c2hIYW5kbGVycy5lYWNoKGZ1bmN0aW9uKGhhbmRsZXIpIHtcclxuXHRcdFx0aGFuZGxlcihvYmopO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0U3ByaXRlQXJyYXkucHJvdG90eXBlLmN1bGwgPSBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMuZWFjaChmdW5jdGlvbiAob2JqLCBpKSB7XHJcblx0XHRcdGlmIChvYmouZGVsZXRlZCkge1xyXG5cdFx0XHRcdHJldHVybiAoZGVsZXRlIHRoaXNbaV0pO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHRnbG9iYWwuc3ByaXRlQXJyYXkgPSBTcHJpdGVBcnJheTtcclxufSkodGhpcyk7XHJcblxyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSB0aGlzLnNwcml0ZUFycmF5O1xyXG59IiwiLy8gR2xvYmFsIGRlcGVuZGVuY2llcyB3aGljaCByZXR1cm4gbm8gbW9kdWxlc1xyXG5yZXF1aXJlKCcuL2xpYi9jYW52YXNSZW5kZXJpbmdDb250ZXh0MkRFeHRlbnNpb25zJyk7XHJcbnJlcXVpcmUoJy4vbGliL2V4dGVuZGVycycpO1xyXG5yZXF1aXJlKCcuL2xpYi9wbHVnaW5zJyk7XHJcblxyXG4vLyBFeHRlcm5hbCBkZXBlbmRlbmNpZXNcclxudmFyIE1vdXNldHJhcCA9IHJlcXVpcmUoJ2JyLW1vdXNldHJhcCcpO1xyXG5cclxuLy8gTWV0aG9kIG1vZHVsZXNcclxudmFyIGlzTW9iaWxlRGV2aWNlID0gcmVxdWlyZSgnLi9saWIvaXNNb2JpbGVEZXZpY2UnKTtcclxuXHJcbi8vIEdhbWUgT2JqZWN0c1xyXG52YXIgU3ByaXRlQXJyYXkgPSByZXF1aXJlKCcuL2xpYi9zcHJpdGVBcnJheScpO1xyXG52YXIgTW9uc3RlciA9IHJlcXVpcmUoJy4vbGliL21vbnN0ZXInKTtcclxudmFyIEFuaW1hdGVkU3ByaXRlID0gcmVxdWlyZSgnLi9saWIvYW5pbWF0ZWRTcHJpdGUnKTtcclxudmFyIFNwcml0ZSA9IHJlcXVpcmUoJy4vbGliL3Nwcml0ZScpO1xyXG52YXIgU25vd2JvYXJkZXIgPSByZXF1aXJlKCcuL2xpYi9zbm93Ym9hcmRlcicpO1xyXG52YXIgUGxheWVyID0gcmVxdWlyZSgnLi9saWIvcGxheWVyJyk7XHJcbnZhciBHYW1lSHVkID0gcmVxdWlyZSgnLi9saWIvZ2FtZUh1ZCcpO1xyXG52YXIgR2FtZSA9IHJlcXVpcmUoJy4vbGliL2dhbWUnKTtcclxuXHJcbi8vIExvY2FsIHZhcmlhYmxlcyBmb3Igc3RhcnRpbmcgdGhlIGdhbWVcclxudmFyIG1haW5DYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZS1jYW52YXMnKTtcclxudmFyIGRDb250ZXh0ID0gbWFpbkNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxudmFyIGltYWdlU291cmNlcyA9IFsgJ2Fzc2V0cy9jYXJ0LXNwcml0ZXMucG5nJywgJ2Fzc2V0cy9zcHJpdGUtY2hhcmFjdGVycy5wbmcnLCAnYXNzZXRzL3NraWZyZWUtb2JqZWN0cy5wbmcnLCBcclxuXHQnYXNzZXRzL3Rva2VuLXNwcml0ZXMucG5nJywgJ2Fzc2V0cy9taWxrc2hha2Utc3ByaXRlLnBuZycsICdhc3NldHMvbWFsb3JkLXNwcml0ZXMucG5nJywgJ2Fzc2V0cy9oYXRndXktc3ByaXRlcy5wbmcnLCAnYXNzZXRzL3BpbG90LXNwcml0ZXMucG5nJyxcclxuXHQnYXNzZXRzL3RyYWZmaWMtY29uZS1sYXJnZS5wbmcnLCAnYXNzZXRzL3RyYWZmaWMtY29uZS1zbWFsbC5wbmcnLCAnYXNzZXRzL2dhcmJhZ2UtY2FuLnBuZycgXTtcclxuXHJcbnZhciBwbGF5U291bmQ7XHJcbnZhciBzb3VuZHMgPSB7ICd0cmFjazEnOiAnYXNzZXRzL211c2ljL3RyYWNrMS5vZ2cnLFxyXG5cdFx0XHQgICAndHJhY2syJzogJ2Fzc2V0cy9tdXNpYy90cmFjazIub2dnJyxcclxuXHRcdFx0ICAgJ3RyYWNrMyc6ICdhc3NldHMvbXVzaWMvdHJhY2szLm9nZycsXHJcblx0XHRcdCAgICdnYW1lT3Zlcic6ICdhc3NldHMvbXVzaWMvZ2FtZW92ZXIub2dnJyB9O1xyXG52YXIgY3VycmVudFRyYWNrO1xyXG52YXIgcGxheWluZ1RyYWNrTnVtYmVyID0gMTtcclxuXHJcbnZhciBnbG9iYWwgPSB0aGlzO1xyXG52YXIgZ2FtZUh1ZENvbnRyb2xzID0gJ1VzZSB0aGUgbW91c2Ugb3IgV0FTRCB0byBjb250cm9sIHRoZSBjYXJ0JztcclxuaWYgKGlzTW9iaWxlRGV2aWNlKCkpIGdhbWVIdWRDb250cm9scyA9ICdUYXAgb3IgZHJhZyBvbiB0aGUgcm9hZCB0byBjb250cm9sIHRoZSBjYXJ0JztcclxudmFyIHNwcml0ZXMgPSByZXF1aXJlKCcuL3Nwcml0ZUluZm8nKTtcclxuXHJcbnZhciBwaXhlbHNQZXJNZXRyZSA9IDE4O1xyXG52YXIgbW9uc3RlckRpc3RhbmNlVGhyZXNob2xkID0gMjAwMDtcclxuY29uc3QgdG90YWxMaXZlcyA9IDU7XHJcbnZhciBsaXZlc0xlZnQgPSB0b3RhbExpdmVzO1xyXG52YXIgaGlnaFNjb3JlID0gMDtcclxuXHJcbmNvbnN0IGdhbWVJbmZvID0ge1xyXG5cdGRpc3RhbmNlOiAwLFxyXG5cdG1vbmV5OiAwLFxyXG5cdHRva2VuczogMCxcclxuXHRwb2ludHM6IDAsXHJcblx0Y2FuczogMCxcclxuXHRsZXZlbEJvb3N0OiAwLFxyXG5cdGF3YWtlOiAxMDAsXHJcblxyXG5cdGdvZDogZmFsc2UsXHJcblxyXG5cdHJlc2V0KCkge1xyXG5cdFx0ZGlzdGFuY2UgPSAwO1xyXG5cdFx0bW9uZXkgPSAwO1xyXG5cdFx0dG9rZW5zID0gMDtcclxuXHRcdHBvaW50cyA9IDA7XHJcblx0XHRjYW5zID0gMDtcclxuXHRcdGF3YWtlID0gMDtcclxuXHR9XHJcbn07XHJcblxyXG52YXIgZHJvcFJhdGVzID0geyB0cmFmZmljQ29uZUxhcmdlOiAxLCB0cmFmZmljQ29uZVNtYWxsOiAxLCBnYXJiYWdlQ2FuOiAxLCBqdW1wOiAxLCB0aGlja1Nub3c6IDEsIFxyXG5cdFx0XHRcdCAgdG9rZW46IDMsIG1pbGtzaGFrZTogMC4wMDAxfTtcclxuaWYgKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdoaWdoU2NvcmUnKSkgaGlnaFNjb3JlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2hpZ2hTY29yZScpO1xyXG5cclxuZnVuY3Rpb24gbG9hZEltYWdlcyAoc291cmNlcywgbmV4dCkge1xyXG5cdHZhciBsb2FkZWQgPSAwO1xyXG5cdHZhciBpbWFnZXMgPSB7fTtcclxuXHJcblx0ZnVuY3Rpb24gZmluaXNoICgpIHtcclxuXHRcdGxvYWRlZCArPSAxO1xyXG5cdFx0aWYgKGxvYWRlZCA9PT0gc291cmNlcy5sZW5ndGgpIHtcclxuXHRcdFx0bmV4dChpbWFnZXMpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0c291cmNlcy5lYWNoKGZ1bmN0aW9uIChzcmMpIHtcclxuXHRcdHZhciBpbSA9IG5ldyBJbWFnZSgpO1xyXG5cdFx0aW0ub25sb2FkID0gZmluaXNoO1xyXG5cdFx0aW0uc3JjID0gc3JjO1xyXG5cdFx0ZENvbnRleHQuc3RvcmVMb2FkZWRJbWFnZShzcmMsIGltKTtcclxuXHR9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gX2NoZWNrQXVkaW9TdGF0ZShzb3VuZCkge1xyXG5cdC8qIGlmIChzb3VuZHNbc291bmRdLnN0YXR1cyA9PT0gJ2xvYWRpbmcnICYmIHNvdW5kc1tzb3VuZF0ucmVhZHlTdGF0ZSA9PT0gNCkge1xyXG5cdFx0YXNzZXRMb2FkZWQuY2FsbCh0aGlzLCAnc291bmRzJywgc291bmQpO1xyXG5cdH0gKi9cclxufVxyXG5cclxuZnVuY3Rpb24gbG9hZFNvdW5kcyAoKSB7XHJcblx0Zm9yICh2YXIgc291bmQgaW4gc291bmRzKSB7XHJcblx0XHRpZiAoc291bmRzLmhhc093blByb3BlcnR5KHNvdW5kKSkge1xyXG5cdFx0XHRzcmMgPSBzb3VuZHNbc291bmRdO1xyXG5cdFx0XHQvLyBjcmVhdGUgYSBjbG9zdXJlIGZvciBldmVudCBiaW5kaW5nXHJcblx0XHRcdChmdW5jdGlvbihzb3VuZCkge1xyXG5cdFx0XHRcdHNvdW5kc1tzb3VuZF0gPSBuZXcgQXVkaW8oKTtcclxuXHRcdFx0XHRzb3VuZHNbc291bmRdLnN0YXR1cyA9ICdsb2FkaW5nJztcclxuXHRcdFx0XHRzb3VuZHNbc291bmRdLm5hbWUgPSBzb3VuZDtcclxuXHRcdFx0XHRzb3VuZHNbc291bmRdLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXknLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdF9jaGVja0F1ZGlvU3RhdGUuY2FsbChzb3VuZCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0c291bmRzW3NvdW5kXS5zcmMgPSBzcmM7XHJcblx0XHRcdFx0c291bmRzW3NvdW5kXS5wcmVsb2FkID0gJ2F1dG8nO1xyXG5cdFx0XHRcdHNvdW5kc1tzb3VuZF0ubG9hZCgpO1xyXG5cdFx0XHR9KShzb3VuZCk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiBtb25zdGVySGl0c1BsYXllckJlaGF2aW91cihtb25zdGVyLCBwbGF5ZXIpIHtcclxuXHRwbGF5ZXIuaXNFYXRlbkJ5KG1vbnN0ZXIsIGZ1bmN0aW9uICgpIHtcclxuXHRcdG1vbnN0ZXIuaXNGdWxsID0gdHJ1ZTtcclxuXHRcdG1vbnN0ZXIuaXNFYXRpbmcgPSBmYWxzZTtcclxuXHRcdHBsYXllci5pc0JlaW5nRWF0ZW4gPSBmYWxzZTtcclxuXHRcdG1vbnN0ZXIuc2V0U3BlZWQocGxheWVyLmdldFNwZWVkKCkpO1xyXG5cdFx0bW9uc3Rlci5zdG9wRm9sbG93aW5nKCk7XHJcblx0XHR2YXIgcmFuZG9tUG9zaXRpb25BYm92ZSA9IGRDb250ZXh0LmdldFJhbmRvbU1hcFBvc2l0aW9uQWJvdmVWaWV3cG9ydCgpO1xyXG5cdFx0bW9uc3Rlci5zZXRNYXBQb3NpdGlvblRhcmdldChyYW5kb21Qb3NpdGlvbkFib3ZlWzBdLCByYW5kb21Qb3NpdGlvbkFib3ZlWzFdKTtcclxuXHR9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGxheU11c2ljVHJhY2sobmV4dFRyYWNrKSB7XHJcblx0aWYgKG5leHRUcmFjayA9PT0gcGxheWluZ1RyYWNrTnVtYmVyKSByZXR1cm47XHJcblxyXG5cdGN1cnJlbnRUcmFjay5tdXRlZCA9IHRydWU7XHJcblx0cGxheWluZ1RyYWNrTnVtYmVyID0gbmV4dFRyYWNrO1xyXG5cdGlmIChuZXh0VHJhY2sgPiBzb3VuZHMubGVuZ3RoIC0gMSlcclxuXHRcdHBsYXlpbmdUcmFja051bWJlciA9IDE7XHJcblx0Y3VycmVudFRyYWNrID0gc291bmRzW1widHJhY2tcIiArIG5leHRUcmFja107XHJcblx0Y3VycmVudFRyYWNrLmN1cnJlbnRUaW1lID0gMDtcclxuXHRjdXJyZW50VHJhY2subG9vcCA9IHRydWU7XHJcblxyXG5cdGlmIChwbGF5U291bmQpIHtcclxuXHRcdGN1cnJlbnRUcmFjay5wbGF5KCk7XHJcblx0XHRjdXJyZW50VHJhY2subXV0ZWQgPSBmYWxzZTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN0YXJ0TmV2ZXJFbmRpbmdHYW1lIChpbWFnZXMpIHtcclxuXHR2YXIgcGxheWVyO1xyXG5cdHZhciBzdGFydFNpZ247XHJcblx0dmFyIGdhbWVIdWQ7XHJcblx0dmFyIGdhbWU7XHJcblxyXG5cdGZ1bmN0aW9uIHNob3dNYWluTWVudShpbWFnZXMpIHtcclxuXHRcdGZvciAodmFyIHNvdW5kIGluIHNvdW5kcykge1xyXG5cdFx0XHRpZiAoc291bmRzLmhhc093blByb3BlcnR5KHNvdW5kKSkge1xyXG5cdFx0XHRcdHNvdW5kc1tzb3VuZF0ubXV0ZWQgPSB0cnVlO1xyXG5cdFx0XHRcdGN1cnJlbnRUcmFjay5tdXRlZCA9ICFwbGF5U291bmQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdG1haW5DYW52YXMuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHRcdCQoJyNtYWluJykuc2hvdygpO1xyXG5cdFx0JCgnI21lbnUnKS5hZGRDbGFzcygnbWFpbicpO1xyXG5cdFx0JCgnLnNvdW5kJykuc2hvdygpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdG9nZ2xlR29kTW9kZSgpIHtcclxuXHRcdGdhbWVJbmZvLmdvZCA9ICFnYW1lSW5mby5nb2Q7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiByZXNldEdhbWUgKCkge1xyXG5cdFx0bGl2ZXNMZWZ0ID0gNTtcclxuXHRcdGhpZ2hTY29yZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdoaWdoU2NvcmUnKTtcclxuXHRcdGdhbWUucmVzZXQoKTtcclxuXHRcdGdhbWUuYWRkU3RhdGljT2JqZWN0KHN0YXJ0U2lnbik7XHJcblx0XHRnYW1lSW5mby5yZXNldCgpO1xyXG5cdFx0cGxheU11c2ljVHJhY2soMSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBkZXRlY3RFbmQgKCkge1xyXG5cdFx0aWYgKCFnYW1lLmlzUGF1c2VkKCkpIHtcclxuXHRcdFx0aGlnaFNjb3JlID0gbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2hpZ2hTY29yZScsIGdhbWVJbmZvLmRpc3RhbmNlKTtcclxuXHRcdFx0dXBkYXRlSHVkKCdHYW1lIG92ZXIhIEhpdCBzcGFjZSB0byByZXN0YXJ0LicpO1xyXG5cdFx0XHRnYW1lLnBhdXNlKCk7XHJcblx0XHRcdGdhbWUuY3ljbGUoKTtcclxuXHJcblx0XHRcdHBsYXlpbmdUcmFja051bWJlciA9IDA7XHJcblx0XHRcdGN1cnJlbnRUcmFjay5tdXRlZCA9IHRydWU7XHJcblx0XHRcdGN1cnJlbnRUcmFjayA9IHNvdW5kcy5nYW1lT3ZlcjtcclxuXHRcdFx0Y3VycmVudFRyYWNrLmN1cnJlbnRUaW1lID0gMDtcclxuXHRcdFx0Y3VycmVudFRyYWNrLmxvb3AgPSB0cnVlO1xyXG5cdFx0XHRpZiAocGxheVNvdW5kKSB7XHJcblx0XHRcdFx0Y3VycmVudFRyYWNrLnBsYXkoKTtcclxuXHRcdFx0XHRjdXJyZW50VHJhY2subXV0ZWQgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcmFuZG9tbHlTcGF3bk5QQyhzcGF3bkZ1bmN0aW9uLCBkcm9wUmF0ZSkge1xyXG5cdFx0dmFyIHJhdGVNb2RpZmllciA9IE1hdGgubWF4KDgwMCAtIG1haW5DYW52YXMud2lkdGgsIDApO1xyXG5cdFx0aWYgKE51bWJlci5yYW5kb20oMTAwMCArIHJhdGVNb2RpZmllcikgPD0gZHJvcFJhdGUpIHtcclxuXHRcdFx0c3Bhd25GdW5jdGlvbigpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc3Bhd25Nb25zdGVyICgpIHtcclxuXHRcdHZhciBuZXdNb25zdGVyID0gbmV3IE1vbnN0ZXIoc3ByaXRlcy5tb25zdGVyKTtcclxuXHRcdHZhciByYW5kb21Qb3NpdGlvbiA9IGRDb250ZXh0LmdldFJhbmRvbU1hcFBvc2l0aW9uQWJvdmVWaWV3cG9ydCgpO1xyXG5cdFx0bmV3TW9uc3Rlci5zZXRNYXBQb3NpdGlvbihyYW5kb21Qb3NpdGlvblswXSwgcmFuZG9tUG9zaXRpb25bMV0pO1xyXG5cdFx0bmV3TW9uc3Rlci5mb2xsb3cocGxheWVyKTtcclxuXHRcdG5ld01vbnN0ZXIuc2V0U3BlZWQocGxheWVyLmdldFN0YW5kYXJkU3BlZWQoKSk7XHJcblx0XHRuZXdNb25zdGVyLm9uSGl0dGluZyhwbGF5ZXIsIG1vbnN0ZXJIaXRzUGxheWVyQmVoYXZpb3VyKTtcclxuXHJcblx0XHRnYW1lLmFkZE1vdmluZ09iamVjdChuZXdNb25zdGVyLCAnbW9uc3RlcicpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc3Bhd25Cb2FyZGVyICgpIHtcclxuXHRcdHZhciBuZXdCb2FyZGVyID0gbmV3IFNub3dib2FyZGVyKHNwcml0ZXMuc25vd2JvYXJkZXIpO1xyXG5cdFx0dmFyIHJhbmRvbVBvc2l0aW9uQWJvdmUgPSBkQ29udGV4dC5nZXRSYW5kb21NYXBQb3NpdGlvbkFib3ZlVmlld3BvcnQoKTtcclxuXHRcdHZhciByYW5kb21Qb3NpdGlvbkJlbG93ID0gZENvbnRleHQuZ2V0UmFuZG9tTWFwUG9zaXRpb25CZWxvd1ZpZXdwb3J0KCk7XHJcblx0XHRuZXdCb2FyZGVyLnNldE1hcFBvc2l0aW9uKHJhbmRvbVBvc2l0aW9uQWJvdmVbMF0sIHJhbmRvbVBvc2l0aW9uQWJvdmVbMV0pO1xyXG5cdFx0bmV3Qm9hcmRlci5zZXRNYXBQb3NpdGlvblRhcmdldChyYW5kb21Qb3NpdGlvbkJlbG93WzBdLCByYW5kb21Qb3NpdGlvbkJlbG93WzFdKTtcclxuXHRcdG5ld0JvYXJkZXIub25IaXR0aW5nKHBsYXllciwgc3ByaXRlcy5zbm93Ym9hcmRlci5oaXRCZWhhdmlvdXIucGxheWVyKTtcclxuXHJcblx0XHRnYW1lLmFkZE1vdmluZ09iamVjdChuZXdCb2FyZGVyKTtcclxuXHR9XHJcblxyXG5cdHBsYXllciA9IG5ldyBQbGF5ZXIoc3ByaXRlcy5wbGF5ZXIpO1xyXG5cdHBsYXllci5zZXRNYXBQb3NpdGlvbigwLCAwKTtcclxuXHRwbGF5ZXIuc2V0TWFwUG9zaXRpb25UYXJnZXQoMCwgLTEwKTtcclxuXHJcblx0cGxheWVyLnNldEhpdE9ic3RhY2xlQ2IoZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoZ2FtZUluZm8uZ29kKVxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHRsaXZlc0xlZnQgLT0gMTtcclxuXHR9KTtcclxuXHJcblx0cGxheWVyLnNldENvbGxlY3RJdGVtQ2IoZnVuY3Rpb24oaXRlbSkge1xyXG5cdFx0c3dpdGNoIChpdGVtLmRhdGEubmFtZSlcclxuXHRcdHtcclxuXHRcdFx0Y2FzZSAndG9rZW4nOlxyXG5cdFx0XHRcdGdhbWVJbmZvLnRva2VucyArPSBpdGVtLmRhdGEucG9pbnRWYWx1ZXNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaXRlbS5kYXRhLnBvaW50VmFsdWVzLmxlbmd0aCldO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlICdtaWxrc2hha2UnOlxyXG5cdFx0XHRcdGlmIChsaXZlc0xlZnQgPCB0b3RhbExpdmVzKSB7XHJcblx0XHRcdFx0XHRsaXZlc0xlZnQgKz0gMTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Z2FtZUluZm8ubGV2ZWxCb29zdCArPSAxO1xyXG5cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0Z2FtZSA9IG5ldyBHYW1lKG1haW5DYW52YXMsIHBsYXllcik7XHJcblxyXG5cdHN0YXJ0U2lnbiA9IG5ldyBTcHJpdGUoc3ByaXRlcy5zaWduU3RhcnQpO1xyXG5cdGdhbWUuYWRkU3RhdGljT2JqZWN0KHN0YXJ0U2lnbik7XHJcblx0c3RhcnRTaWduLnNldE1hcFBvc2l0aW9uKC01MCwgMCk7XHJcblx0ZENvbnRleHQuZm9sbG93U3ByaXRlKHBsYXllcik7XHJcblx0XHJcblx0dXBkYXRlSHVkKCk7XHJcblxyXG5cclxuXHRmdW5jdGlvbiB1cGRhdGVIdWQobWVzc2FnZSkge1xyXG5cdFx0aWYgKCFtZXNzYWdlKVxyXG5cdFx0XHRtZXNzYWdlID0gJyc7XHJcblxyXG5cdFx0aWYgKCFnYW1lSHVkKSB7XHJcblx0XHRcdGdhbWVIdWQgPSBuZXcgR2FtZUh1ZCh7XHJcblx0XHRcdFx0aW5pdGlhbExpbmVzIDogW1xyXG5cdFx0XHRcdFx0J0Nhc2ggJDAnLnBhZEVuZCgyMikgKyAnTGV2ZWwgMScsXHJcblx0XHRcdFx0XHQnUG9pbnRzIDAnLnBhZEVuZCgyMikgKyAnTGlmZSAwJScsXHJcblx0XHRcdFx0XHQnVG9rZW5zIDAnLnBhZEVuZCgyMikgKyAnQXdha2UgMTAwLzEwMCcsXHJcblx0XHRcdFx0XHQnRGlzdGFuY2UgMG0nLnBhZEVuZCgyMikgKyAnU3BlZWQgMCcsXHJcblx0XHRcdFx0XHRnYW1lSW5mby5nb2QgPyAnR29kIE1vZGUnIDogJydcclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdHBvc2l0aW9uOiB7XHJcblx0XHRcdFx0XHR0b3A6IDE1LFxyXG5cdFx0XHRcdFx0bGVmdDogMTE1XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBsZXZlbCA9IGdhbWVJbmZvLmRpc3RhbmNlIDwgMTAwID8gMSA6IE1hdGguZmxvb3IoZ2FtZUluZm8uZGlzdGFuY2UgLyAxMDApICsgZ2FtZUluZm8ubGV2ZWxCb29zdDtcclxuXHRcdGdhbWVIdWQuc2V0TGluZXMoW1xyXG5cdFx0XHQoJ0Nhc2ggJCcgKyBnYW1lSW5mby5tb25leSkucGFkRW5kKDIyKSArICdMZXZlbCAnICsgbGV2ZWwsXHJcblx0XHRcdCgnUG9pbnRzICcgKyBnYW1lSW5mby5tb25leSkucGFkRW5kKDIyKSArICdMaWZlICcgKyBsaXZlc0xlZnQgLyB0b3RhbExpdmVzICogMTAwICsgJyUnLFxyXG5cdFx0XHQoJ1Rva2VucyAnICsgZ2FtZUluZm8udG9rZW5zKS5wYWRFbmQoMjIpICsgJ0F3YWtlICcgKyBnYW1lSW5mby5hd2FrZSArICcvMTAwJyxcclxuXHRcdFx0KCdEaXN0YW5jZSAnICsgZ2FtZUluZm8uZGlzdGFuY2UgKyAnbScpLnBhZEVuZCgyMikgKyAnU3BlZWQgJyArIHBsYXllci5nZXRTcGVlZCgpLFxyXG5cdFx0XHQoZ2FtZUluZm8uZ29kID8gJ0dvZCBNb2RlJyA6ICcnKS5wYWRFbmQoMjIpICsgbWVzc2FnZVxyXG5cdFx0XSk7XHJcblxyXG5cdFx0XHRwbGF5TXVzaWNUcmFjayhNYXRoLmZsb29yKGdhbWVJbmZvLmRpc3RhbmNlIC8gMTAwMCAlIDMpICsgMSk7XHJcblx0fVxyXG5cclxuXHRnYW1lLmJlZm9yZUN5Y2xlKGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBuZXdPYmplY3RzID0gW107XHJcblx0XHRpZiAocGxheWVyLmlzTW92aW5nKSB7XHJcblx0XHRcdG5ld09iamVjdHMgPSBTcHJpdGUuY3JlYXRlT2JqZWN0cyhbXHJcblx0XHRcdFx0eyBzcHJpdGU6IHNwcml0ZXMuanVtcCwgZHJvcFJhdGU6IGRyb3BSYXRlcy5qdW1wIH0sXHJcblx0XHRcdFx0eyBzcHJpdGU6IHNwcml0ZXMudGhpY2tTbm93LCBkcm9wUmF0ZTogZHJvcFJhdGVzLnRoaWNrU25vdyB9LFxyXG5cdFx0XHRcdHsgc3ByaXRlOiBzcHJpdGVzLnRyYWZmaWNDb25lTGFyZ2UsIGRyb3BSYXRlOiBkcm9wUmF0ZXMudHJhZmZpY0NvbmVMYXJnZSB9LFxyXG5cdFx0XHRcdHsgc3ByaXRlOiBzcHJpdGVzLnRyYWZmaWNDb25lU21hbGwsIGRyb3BSYXRlOiBkcm9wUmF0ZXMudHJhZmZpY0NvbmVTbWFsbCB9LFxyXG5cdFx0XHRcdHsgc3ByaXRlOiBzcHJpdGVzLmdhcmJhZ2VDYW4sIGRyb3BSYXRlOiBkcm9wUmF0ZXMuZ2FyYmFnZUNhbiB9LFxyXG5cdFx0XHRcdHsgc3ByaXRlOiBzcHJpdGVzLnRva2VuLCBkcm9wUmF0ZTogZHJvcFJhdGVzLnRva2VuIH0sXHJcblx0XHRcdFx0eyBzcHJpdGU6IHNwcml0ZXMubWlsa3NoYWtlLCBkcm9wUmF0ZTogZHJvcFJhdGVzLm1pbGtzaGFrZSB9XHJcblx0XHRcdF0sIHtcclxuXHRcdFx0XHRyYXRlTW9kaWZpZXI6IE1hdGgubWF4KDgwMCAtIG1haW5DYW52YXMud2lkdGgsIDApLFxyXG5cdFx0XHRcdHBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gZENvbnRleHQuZ2V0UmFuZG9tTWFwUG9zaXRpb25CZWxvd1ZpZXdwb3J0KCk7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRwbGF5ZXI6IHBsYXllclxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGlmICghZ2FtZS5pc1BhdXNlZCgpKSB7XHJcblx0XHRcdGdhbWUuYWRkU3RhdGljT2JqZWN0cyhuZXdPYmplY3RzKTtcclxuXHJcblx0XHRcdC8vIERpc2FibGVkIHNub3dib2FyZGVyIHNwYXduIGZvciBjYXJ0IGNvbnZlcnNpb25cclxuXHRcdFx0Ly9yYW5kb21seVNwYXduTlBDKHNwYXduQm9hcmRlciwgMC4xKTtcclxuXHJcblx0XHRcdGdhbWVJbmZvLmRpc3RhbmNlID0gcGFyc2VGbG9hdChwbGF5ZXIuZ2V0UGl4ZWxzVHJhdmVsbGVkRG93bk1vdW50YWluKCkgLyBwaXhlbHNQZXJNZXRyZSkudG9GaXhlZCgxKTtcclxuXHJcblx0XHRcdGlmIChnYW1lSW5mby5kaXN0YW5jZSA+IG1vbnN0ZXJEaXN0YW5jZVRocmVzaG9sZCkge1xyXG5cdFx0XHRcdHJhbmRvbWx5U3Bhd25OUEMoc3Bhd25Nb25zdGVyLCAwLjAwMSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChnYW1lSW5mby5kaXN0YW5jZSlcclxuXHJcblx0XHRcdHVwZGF0ZUh1ZCgpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRnYW1lLmFmdGVyQ3ljbGUoZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAobGl2ZXNMZWZ0ID09PSAwKSB7XHJcblx0XHRcdGRldGVjdEVuZCgpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRnYW1lLmFkZFVJRWxlbWVudChnYW1lSHVkKTtcclxuXHRcclxuXHQkKG1haW5DYW52YXMpXHJcblx0XHQubW91c2Vtb3ZlKGZ1bmN0aW9uIChlKSB7XHJcblx0XHRcdGdhbWUuc2V0TW91c2VYKGUucGFnZVgpO1xyXG5cdFx0XHRnYW1lLnNldE1vdXNlWShlLnBhZ2VZKTtcclxuXHRcdFx0cGxheWVyLnJlc2V0RGlyZWN0aW9uKCk7XHJcblx0XHRcdHBsYXllci5zdGFydE1vdmluZ0lmUG9zc2libGUoKTtcclxuXHRcdH0pXHJcblx0XHQuYmluZCgnY2xpY2snLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRnYW1lLnNldE1vdXNlWChlLnBhZ2VYKTtcclxuXHRcdFx0Z2FtZS5zZXRNb3VzZVkoZS5wYWdlWSk7XHJcblx0XHRcdHBsYXllci5yZXNldERpcmVjdGlvbigpO1xyXG5cdFx0XHRwbGF5ZXIuc3RhcnRNb3ZpbmdJZlBvc3NpYmxlKCk7XHJcblx0XHR9KVxyXG5cdFx0LmZvY3VzKCk7IC8vIFNvIHdlIGNhbiBsaXN0ZW4gdG8gZXZlbnRzIGltbWVkaWF0ZWx5XHJcblxyXG5cdE1vdXNldHJhcC5iaW5kKCdmJywgcGxheWVyLnNwZWVkQm9vc3QpO1xyXG5cdE1vdXNldHJhcC5iaW5kKCd0JywgcGxheWVyLmF0dGVtcHRUcmljayk7XHJcblx0TW91c2V0cmFwLmJpbmQoWyd3JywgJ3VwJ10sIGZ1bmN0aW9uICgpIHtcclxuXHRcdHBsYXllci5zdG9wKCk7XHJcblx0fSk7XHJcblx0TW91c2V0cmFwLmJpbmQoWydhJywgJ2xlZnQnXSwgZnVuY3Rpb24gKCkge1xyXG5cdFx0aWYgKHBsYXllci5kaXJlY3Rpb24gPT09IDI3MCkge1xyXG5cdFx0XHRwbGF5ZXIuc3RlcFdlc3QoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHBsYXllci50dXJuV2VzdCgpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cdE1vdXNldHJhcC5iaW5kKFsncycsICdkb3duJ10sIGZ1bmN0aW9uICgpIHtcclxuXHRcdHBsYXllci5zZXREaXJlY3Rpb24oMTgwKTtcclxuXHRcdHBsYXllci5zdGFydE1vdmluZ0lmUG9zc2libGUoKTtcclxuXHR9KTtcclxuXHRNb3VzZXRyYXAuYmluZChbJ2QnLCAncmlnaHQnXSwgZnVuY3Rpb24gKCkge1xyXG5cdFx0aWYgKHBsYXllci5kaXJlY3Rpb24gPT09IDkwKSB7XHJcblx0XHRcdHBsYXllci5zdGVwRWFzdCgpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0cGxheWVyLnR1cm5FYXN0KCk7XHJcblx0XHR9XHJcblx0fSk7XHJcblx0TW91c2V0cmFwLmJpbmQoJ20nLCBzcGF3bk1vbnN0ZXIpO1xyXG5cdC8vTW91c2V0cmFwLmJpbmQoJ2InLCBzcGF3bkJvYXJkZXIpO1xyXG5cdE1vdXNldHJhcC5iaW5kKCdzcGFjZScsIHJlc2V0R2FtZSk7XHJcblx0TW91c2V0cmFwLmJpbmQoJ2cnLCB0b2dnbGVHb2RNb2RlKTtcclxuXHRNb3VzZXRyYXAuYmluZCgnaCcsIGdhbWUudG9nZ2xlSGl0Qm94ZXMpO1xyXG5cclxuXHR2YXIgaGFtbWVydGltZSA9IG5ldyBIYW1tZXIobWFpbkNhbnZhcyk7XHJcblx0aGFtbWVydGltZS5vbigncHJlc3MnLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0Z2FtZS5zZXRNb3VzZVgoZS5jZW50ZXIueCk7XHJcblx0XHRnYW1lLnNldE1vdXNlWShlLmNlbnRlci55KTtcclxuXHR9KTtcclxuXHRoYW1tZXJ0aW1lLm9uKCd0YXAnLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0Z2FtZS5zZXRNb3VzZVgoZS5jZW50ZXIueCk7XHJcblx0XHRnYW1lLnNldE1vdXNlWShlLmNlbnRlci55KTtcclxuXHR9KTtcclxuXHRoYW1tZXJ0aW1lLm9uKCdwYW4nLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0Z2FtZS5zZXRNb3VzZVgoZS5jZW50ZXIueCk7XHJcblx0XHRnYW1lLnNldE1vdXNlWShlLmNlbnRlci55KTtcclxuXHRcdHBsYXllci5yZXNldERpcmVjdGlvbigpO1xyXG5cdFx0cGxheWVyLnN0YXJ0TW92aW5nSWZQb3NzaWJsZSgpO1xyXG5cdH0pXHJcblx0aGFtbWVydGltZS5vbignZG91YmxldGFwJywgZnVuY3Rpb24gKGUpIHtcclxuXHRcdHBsYXllci5zcGVlZEJvb3N0KCk7XHJcblx0fSk7XHJcblxyXG5cdHBsYXllci5pc01vdmluZyA9IGZhbHNlO1xyXG5cdHBsYXllci5zZXREaXJlY3Rpb24oMjcwKTtcclxuXHJcblx0JCgnLnBsYXknKS5jbGljayhmdW5jdGlvbigpIHtcclxuXHRcdCQoJyNtZW51JykuaGlkZSgpO1xyXG5cdFx0bWFpbkNhbnZhcy5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcblx0XHRnYW1lLnN0YXJ0KCk7XHJcblx0XHRjdXJyZW50VHJhY2sgPSBzb3VuZHMudHJhY2sxO1xyXG5cdFx0Y3VycmVudFRyYWNrLnBsYXkoKTtcclxuXHQgIH0pO1xyXG5cclxuXHRzaG93TWFpbk1lbnUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVzaXplQ2FudmFzKCkge1xyXG5cdG1haW5DYW52YXMud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcclxuXHRtYWluQ2FudmFzLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcclxufVxyXG5cclxuJCgnLmNyZWRpdHMnKS5jbGljayhmdW5jdGlvbigpIHtcclxuXHQkKCcjbWFpbicpLmhpZGUoKTtcclxuXHQkKCcjY3JlZGl0cycpLnNob3coKTtcclxuXHQkKCcjbWVudScpLmFkZENsYXNzKCdjcmVkaXRzJyk7XHJcbiAgfSk7XHJcblxyXG4kKCcuYmFjaycpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG5cdCQoJyNjcmVkaXRzJykuaGlkZSgpO1xyXG5cdCQoJyNtYWluJykuc2hvdygpO1xyXG5cdCQoJyNtZW51JykucmVtb3ZlQ2xhc3MoJ2NyZWRpdHMnKTtcclxuICB9KTtcclxuXHJcbi8vIHNldCB0aGUgc291bmQgcHJlZmVyZW5jZVxyXG52YXIgY2FuVXNlTG9jYWxTdG9yYWdlID0gJ2xvY2FsU3RvcmFnZScgaW4gd2luZG93ICYmIHdpbmRvdy5sb2NhbFN0b3JhZ2UgIT09IG51bGw7XHJcbmlmIChjYW5Vc2VMb2NhbFN0b3JhZ2UpIHtcclxuXHRwbGF5U291bmQgPSAobG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2hid0NhcnRSYWNpbmcucGxheVNvdW5kJykgPT09IFwidHJ1ZVwiKVxyXG5cdGlmIChwbGF5U291bmQpIHtcclxuXHRcdCQoJy5zb3VuZCcpLmFkZENsYXNzKCdzb3VuZC1vbicpLnJlbW92ZUNsYXNzKCdzb3VuZC1vZmYnKTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHQkKCcuc291bmQnKS5hZGRDbGFzcygnc291bmQtb2ZmJykucmVtb3ZlQ2xhc3MoJ3NvdW5kLW9uJyk7XHJcblx0fVxyXG59XHJcblxyXG4kKCcuc291bmQnKS5jbGljayhmdW5jdGlvbigpIHtcclxuXHR2YXIgJHRoaXMgPSAkKHRoaXMpO1xyXG5cdC8vIHNvdW5kIG9mZlxyXG5cdGlmICgkdGhpcy5oYXNDbGFzcygnc291bmQtb24nKSkge1xyXG5cdCAgJHRoaXMucmVtb3ZlQ2xhc3MoJ3NvdW5kLW9uJykuYWRkQ2xhc3MoJ3NvdW5kLW9mZicpO1xyXG5cdCAgcGxheVNvdW5kID0gZmFsc2U7XHJcblx0fVxyXG5cdC8vIHNvdW5kIG9uXHJcblx0ZWxzZSB7XHJcblx0ICAkdGhpcy5yZW1vdmVDbGFzcygnc291bmQtb2ZmJykuYWRkQ2xhc3MoJ3NvdW5kLW9uJyk7XHJcblx0ICBwbGF5U291bmQgPSB0cnVlO1xyXG5cdH1cclxuXHRpZiAoY2FuVXNlTG9jYWxTdG9yYWdlKSB7XHJcblx0ICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnaGJ3Q2FydFJhY2luZy5wbGF5U291bmQnLCBwbGF5U291bmQpO1xyXG5cdH1cclxuXHQvLyBtdXRlIG9yIHVubXV0ZSBhbGwgc291bmRzXHJcblx0Zm9yICh2YXIgc291bmQgaW4gc291bmRzKSB7XHJcblx0XHRpZiAoc291bmRzLmhhc093blByb3BlcnR5KHNvdW5kKSkge1xyXG5cdFx0XHRzb3VuZHNbc291bmRdLm11dGVkID0gdHJ1ZTtcclxuXHRcdFx0Y3VycmVudFRyYWNrLm11dGVkID0gIXBsYXlTb3VuZDtcclxuXHRcdH1cclxuXHR9XHJcblx0aWYgKHBsYXlTb3VuZCkgY3VycmVudFRyYWNrLnBsYXkoKTtcclxufSk7XHJcblxyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgcmVzaXplQ2FudmFzLCBmYWxzZSk7XHJcblxyXG5yZXNpemVDYW52YXMoKTtcclxuXHJcbmxvYWRTb3VuZHMoKTtcclxuXHJcbmN1cnJlbnRUcmFjayA9IHNvdW5kcy50cmFjazE7XHJcbmN1cnJlbnRUcmFjay5jdXJyZW50VGltZSA9IDA7XHJcbmN1cnJlbnRUcmFjay5sb29wID0gdHJ1ZTtcclxuXHJcbmxvYWRJbWFnZXMoaW1hZ2VTb3VyY2VzLCBzdGFydE5ldmVyRW5kaW5nR2FtZSk7XHJcblxyXG50aGlzLmV4cG9ydHMgPSB3aW5kb3c7XHJcbiIsImNvbnN0IGdhbWUgPSByZXF1aXJlKFwiLi9saWIvZ2FtZVwiKTtcclxuXHJcbihmdW5jdGlvbiAoZ2xvYmFsKSB7XHJcblx0dmFyIHNwcml0ZXMgPSB7XHJcblx0XHQnZW1wdHljYXJ0JyA6IHtcclxuXHRcdFx0JGltYWdlRmlsZSA6ICdhc3NldHMvY2FydC1zcHJpdGVzLnBuZycsXHJcblx0XHRcdHBhcnRzIDoge1xyXG5cdFx0XHRcdGJsYW5rIDogWyAwLCAwLCAwLCAwIF0sXHJcblx0XHRcdFx0ZWFzdCA6IFsgMCwgMjEwLCAxMjAsIDk5IF0sXHJcblx0XHRcdFx0ZXNFYXN0IDogWyAyNDcsIDEwNCwgMTA1LCAxMDQgXSxcclxuXHRcdFx0XHRzRWFzdCA6IFsgMTQwLCAxMDQsIDc5LCAxMDQgXSxcclxuXHRcdFx0XHRzb3V0aCA6IFsgMjYsIDEwNCwgNjcsIDEwNCBdLFxyXG5cdFx0XHRcdHNXZXN0IDogWyAyNjAsIDAsIDc5LCAxMDQgXSxcclxuXHRcdFx0XHR3c1dlc3QgOiBbIDEyNywgMCwgMTA1LCAxMDQgXSxcclxuXHRcdFx0XHR3ZXN0IDogWyAwLDAsMTIwLDEwNCBdLFxyXG5cdFx0XHRcdGhpdCA6IFsgMjYsIDEwNCwgNjcsIDEwNCBdLFxyXG5cdFx0XHRcdGp1bXBpbmcgOiBbIDI2LCAxMDQsIDY3LCAxMDQgXSxcclxuXHRcdFx0XHRzb21lcnNhdWx0MSA6IFsgMjYsIDEwNCwgNjcsIDEwNCBdLFxyXG5cdFx0XHRcdHNvbWVyc2F1bHQxIDogWyAyNiwgMTA0LCA2NywgMTA0IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0Qm94ZXM6IHtcclxuXHRcdFx0XHQvL0xlZnQsIFRvcCwgUmlnaHQsIEJvdHRvbVxyXG5cdFx0XHRcdDA6IFsgNSwgMTAsIDYyLCA5MCBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGlkIDogJ3BsYXllcicsXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge31cclxuXHRcdH0sXHJcblx0XHQncGxheWVyLWhhdGd1eSc6IHtcclxuXHRcdFx0JGltYWdlRmlsZSA6ICdhc3NldHMvaGF0Z3V5LXNwcml0ZXMucG5nJyxcclxuXHRcdFx0cGFydHMgOiB7XHJcblx0XHRcdFx0Ly8geCwgeSwgd2lkdGgsIGhlaWdodCwgY2FudmFzT2Zmc2V0WCwgY2FudmFzT2Zmc2V0WSwgaGl0Ym94T2Zmc2V0WCwgaGl0Ym94T2Zmc2V0WSBcclxuXHRcdFx0XHRibGFuayA6IFsgMCwgMCwgMCwgMCBdLFxyXG5cdFx0XHRcdGVhc3QgOiBbIDkxLCAwLCA5OCwgOTEsIDAsIDAsIDM1LCAwIF0sXHJcblx0XHRcdFx0ZXNFYXN0IDogWyA3MCwgMTg3LCA5MSw5OSwgMCwgMCwgMzEsIDAgXSxcclxuXHRcdFx0XHRzRWFzdCA6IFsgMTQzLCA5MSwgNzMsIDk2LCAwLCAwLCAxMywgMCBdLFxyXG5cdFx0XHRcdHNvdXRoIDogWyA4MywgOTEsIDYwLCA5NSBdLFxyXG5cdFx0XHRcdHNXZXN0IDogWyAwLCAxODcsIDcwLCA5NiBdLFxyXG5cdFx0XHRcdHdzV2VzdCA6IFsgMCwgOTEsIDgzLCA5MiBdLFxyXG5cdFx0XHRcdHdlc3QgOiBbIDAsIDAsIDkxLCA4NSBdLFxyXG5cdFx0XHRcdGhpdCA6IFsgODMsIDkxLCA2MCwgOTUgXSxcclxuXHRcdFx0XHRqdW1waW5nIDogWyAxNjEsIDE4NywgNjUsIDE1MSwgMCwgLTQ1IF0sXHJcblx0XHRcdFx0c29tZXJzYXVsdDEgOiBbIDgzLCA5MSwgNjAsIDk1IF0sXHJcblx0XHRcdFx0c29tZXJzYXVsdDEgOiBbIDgzLCA5MSwgNjAsIDk1IF0sXHJcblx0XHRcdFx0Ym9vc3QgOiBbIDE2MSwgMTg3LCA2NSwgMTUxLCAwLCAtNDUgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCb3hlczoge1xyXG5cdFx0XHRcdC8vTGVmdCwgVG9wLCBSaWdodCwgQm90dG9tXHJcblx0XHRcdFx0MDogWyA1LCAyMCwgNTUsIDkwIF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aWQgOiAncGxheWVyJyxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCdwbGF5ZXInOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL3BpbG90LXNwcml0ZXMucG5nJyxcclxuXHRcdFx0cGFydHMgOiB7XHJcblx0XHRcdFx0Ly8geCwgeSwgd2lkdGgsIGhlaWdodCwgY2FudmFzT2Zmc2V0WCwgY2FudmFzT2Zmc2V0WSwgaGl0Ym94T2Zmc2V0WCwgaGl0Ym94T2Zmc2V0WSBcclxuXHRcdFx0XHRibGFuayA6IFsgMCwgMCwgMCwgMCBdLFxyXG5cdFx0XHRcdGVhc3QgOiBbIDQzLCAwLCA3MCwgNjgsIDAsIDAsIDI1LCAwIF0sXHJcblx0XHRcdFx0ZXNFYXN0IDogWyAwLCAxMTMsIDY1LCA3MSwgMCwgMCwgMjEsIDAgXSxcclxuXHRcdFx0XHRzRWFzdCA6IFsgNDMsIDE5NSwgNTcsIDc0LCAwLCAwLCAxMywgMCBdLFxyXG5cdFx0XHRcdHNvdXRoIDogWyAwLCAxOTUsIDQzLCA2OCBdLFxyXG5cdFx0XHRcdHNXZXN0IDogWyAwLCAyNjksIDU0LCA3NCwgMCBdLFxyXG5cdFx0XHRcdHdzV2VzdCA6IFsgMCwgMzQzLCA2MCwgNjcgXSxcclxuXHRcdFx0XHR3ZXN0IDogWyA1NCwgMjY5LCA2NSwgNjIgXSxcclxuXHRcdFx0XHRoaXQgOiBbIDYwLCAzNDMsIDY3LCA3MSBdLFxyXG5cdFx0XHRcdGp1bXBpbmcgOiBbIDAsIDAsIDQzLCAxMTMsIDAsIC00NSBdLC8vWyA2NSwgMTEzLCA1MSwgODIsIDAsIC00NSBdLFxyXG5cdFx0XHRcdHNvbWVyc2F1bHQxIDogWyAwLCAxOTUsIDQzLCA2OCBdLCAvLyBtYXRjaCBzb3V0aCBmb3Igbm93XHJcblx0XHRcdFx0c29tZXJzYXVsdDEgOiBbIDAsIDE5NSwgNDMsIDY4IF0sIC8vIG1hdGNoIHNvdXRoIGZvciBub3dcclxuXHRcdFx0XHRib29zdCA6IFsgMCwgMCwgNDMsIDExMywgMCwgLTQ1IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0Qm94ZXM6IHtcclxuXHRcdFx0XHQvL0xlZnQsIFRvcCwgUmlnaHQsIEJvdHRvbVxyXG5cdFx0XHRcdDA6IFsgMCwgMjAsIDQ1LCA2MCBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGlkIDogJ3BsYXllcicsXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge31cclxuXHRcdH0sXHJcblx0XHQndG9rZW4nIDoge1xyXG5cdFx0XHRuYW1lOiAndG9rZW4nLFxyXG5cdFx0XHQkaW1hZ2VGaWxlOiAnYXNzZXRzL3Rva2VuLXNwcml0ZXMucG5nJyxcclxuXHRcdFx0YW5pbWF0ZWQ6IHRydWUsXHJcblx0XHRcdGNvbGxlY3RpYmxlOiB0cnVlLFxyXG5cdFx0XHRwb2ludFZhbHVlczogWzEyNSwgMTUwLCAxNzUsIDIwMCwgMjUwLCAzMDAsIDM1MCwgNDAwLCA0NTAsIDUwMF0sXHJcblx0XHRcdHBhcnRzOiB7XHJcblx0XHRcdFx0ZnJhbWUxOiBbMCwgMCwgMjUsIDI2XSxcclxuXHRcdFx0XHRmcmFtZTI6IFsyNSwgMCwgMjUsIDI2XSxcclxuXHRcdFx0XHRmcmFtZTM6IFs1MCwgMCwgMjUsIDI2XSxcclxuXHRcdFx0XHRmcmFtZTQ6IFs3NSwgMCwgMjUsIDI2XVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3RoaWNrU25vdycgOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL3NraWZyZWUtb2JqZWN0cy5wbmcnLFxyXG5cdFx0XHRwYXJ0cyA6IHtcclxuXHRcdFx0XHRtYWluIDogWyAxNDMsIDUzLCA0MywgMTAgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J21vbnN0ZXInIDoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlIDogJ2Fzc2V0cy9tYWxvcmQtc3ByaXRlcy5wbmcnLFxyXG5cdFx0XHRwYXJ0cyA6IHtcclxuXHRcdFx0XHRzRWFzdDEgOiBbIDMzMiwgMTQ5LCAxNjYsIDE0OSBdLFxyXG5cdFx0XHRcdHNFYXN0MiA6IFsgMCwgMjk4LCAxNjYsIDE0OSBdLFxyXG5cdFx0XHRcdHNXZXN0MSA6IFsgMTY2LCAyOTgsIDE2NiwgMTQ5IF0sXHJcblx0XHRcdFx0c1dlc3QyIDogWyAzMzIsIDI5OCwgMTY2LCAxNDkgXSxcclxuXHRcdFx0XHRlYXRpbmcxIDogWyAwLCAwLCAxNjYsIDE0OSBdLFxyXG5cdFx0XHRcdGVhdGluZzIgOiBbIDE2NiwgMCwgMTY2LCAxNDkgXSxcclxuXHRcdFx0XHRlYXRpbmczIDogWyAzMzIsIDAsIDE2NiwgMTQ5IF0sXHJcblx0XHRcdFx0ZWF0aW5nNCA6IFsgMCwgMTQ5LCAxNjYsIDE0OSBdLFxyXG5cdFx0XHRcdGVhdGluZzUgOiBbIDE2NiwgMTQ5LCAxNjYsIDE0OSBdLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J2p1bXAnIDoge1xyXG5cdFx0XHQkaW1hZ2VGaWxlIDogJ2Fzc2V0cy9za2lmcmVlLW9iamVjdHMucG5nJyxcclxuXHRcdFx0cGFydHMgOiB7XHJcblx0XHRcdFx0bWFpbiA6IFsgMTA5LCA1NSwgMzIsIDggXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3NpZ25TdGFydCcgOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL3NraWZyZWUtb2JqZWN0cy5wbmcnLFxyXG5cdFx0XHRwYXJ0cyA6IHtcclxuXHRcdFx0XHRtYWluIDogWyAyNjAsIDEwMywgNDIsIDI3IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCdzbm93Ym9hcmRlcicgOiB7XHJcblx0XHRcdCRpbWFnZUZpbGUgOiAnYXNzZXRzL3Nwcml0ZS1jaGFyYWN0ZXJzLnBuZycsXHJcblx0XHRcdHBhcnRzIDoge1xyXG5cdFx0XHRcdHNFYXN0IDogWyA3MywgMjI5LCAyMCwgMjkgXSxcclxuXHRcdFx0XHRzV2VzdCA6IFsgOTUsIDIyOCwgMjYsIDMwIF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0QmVoYXZpb3VyOiB7fVxyXG5cdFx0fSxcclxuXHRcdCdlbXB0eUNoYWlyTGlmdCc6IHtcclxuXHRcdFx0JGltYWdlRmlsZTogJ2Fzc2V0cy9za2lmcmVlLW9iamVjdHMucG5nJyxcclxuXHRcdFx0cGFydHM6IHtcclxuXHRcdFx0XHRtYWluIDogWyA5MiwgMTM2LCAyNiwgMzAgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR6SW5kZXhlc09jY3VwaWVkIDogWzFdLFxyXG5cdFx0fSxcclxuXHRcdCdtaWxrc2hha2UnOiB7XHJcblx0XHRcdG5hbWU6ICdtaWxrc2hha2UnLFxyXG5cdFx0XHQkaW1hZ2VGaWxlOiAnYXNzZXRzL21pbGtzaGFrZS1zcHJpdGUucG5nJyxcclxuXHRcdFx0Y29sbGVjdGlibGU6IHRydWUsXHJcblx0XHRcdHBvaW50VmFsdWVzOiBbMTI1LCAxNTAsIDE3NSwgMjAwLCAyNTAsIDMwMCwgMzUwLCA0MDAsIDQ1MCwgNTAwXSxcclxuXHRcdFx0cGFydHM6IHtcclxuXHRcdFx0XHRtYWluIDogWyAwLCAwLCAyNSwgNDMgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3RyYWZmaWNDb25lTGFyZ2UnOiB7XHJcblx0XHRcdCRpbWFnZUZpbGU6ICdhc3NldHMvdHJhZmZpYy1jb25lLWxhcmdlLnBuZycsXHJcblx0XHRcdHBhcnRzOiB7XHJcblx0XHRcdFx0bWFpbiA6IFsgMCwgMCwgMzksIDQ4IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0ekluZGV4ZXNPY2N1cGllZCA6IFswLCAxXSxcclxuXHRcdFx0aGl0Qm94ZXM6IHtcclxuXHRcdFx0XHQwOiBbIDAsIDI2LCAzOSwgNDggXSxcclxuXHRcdFx0XHQxOiBbIDEyLCAwLCAyOCwgMjAgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J3RyYWZmaWNDb25lU21hbGwnOiB7XHJcblx0XHRcdCRpbWFnZUZpbGU6ICdhc3NldHMvdHJhZmZpYy1jb25lLXNtYWxsLnBuZycsXHJcblx0XHRcdHBhcnRzOiB7XHJcblx0XHRcdFx0bWFpbiA6IFsgMCwgMCwgMTksIDI0IF1cclxuXHRcdFx0fSxcclxuXHRcdFx0aGl0Qm94ZXM6IHtcclxuXHRcdFx0XHQwOiBbIDAsIDEzLCAxOSwgMjQgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCZWhhdmlvdXI6IHt9XHJcblx0XHR9LFxyXG5cdFx0J2dhcmJhZ2VDYW4nOiB7XHJcblx0XHRcdCRpbWFnZUZpbGU6ICdhc3NldHMvZ2FyYmFnZS1jYW4ucG5nJyxcclxuXHRcdFx0cGFydHM6IHtcclxuXHRcdFx0XHRtYWluIDogWyAwLCAwLCAyOSwgNDUgXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRoaXRCb3hlczoge1xyXG5cdFx0XHRcdDA6IFsgMSwgMzAsIDI4LCA0NCBdXHJcblx0XHRcdH0sXHJcblx0XHRcdGhpdEJlaGF2aW91cjoge31cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHQvLyBNb25zdGVyIGhpdHRpbmcgc3RhdGljIG9iamVjdHMgZG9lc24ndCBzZWVtIHRvIHdvcmtcclxuXHRmdW5jdGlvbiBtb25zdGVySGl0c09ic3RhY2xlQmVoYXZpb3IobW9uc3Rlcikge1xyXG5cdFx0bW9uc3Rlci5kZWxldGVPbk5leHRDeWNsZSgpO1xyXG5cdH1cclxuXHRzcHJpdGVzLm1vbnN0ZXIuaGl0QmVoYXZpb3VyLmdhcmJhZ2VDYW4gPSBtb25zdGVySGl0c09ic3RhY2xlQmVoYXZpb3I7XHJcblx0c3ByaXRlcy5tb25zdGVyLmhpdEJlaGF2aW91ci50cmFmZmljQ29uZUxhcmdlID0gbW9uc3RlckhpdHNPYnN0YWNsZUJlaGF2aW9yO1xyXG5cdHNwcml0ZXMubW9uc3Rlci5oaXRCZWhhdmlvdXIudHJhZmZpY0NvbmVTbWFsbCA9IG1vbnN0ZXJIaXRzT2JzdGFjbGVCZWhhdmlvcjtcclxuXHRmdW5jdGlvbiBvYnN0YWNsZUhpdHNNb25zdGVyQmVoYXZpb3Iob2JzdGFjbGUsIG1vbnN0ZXIpIHtcclxuXHRcdG1vbnN0ZXIuZGVsZXRlT25OZXh0Q3ljbGUoKTtcclxuXHR9XHJcblx0c3ByaXRlcy5nYXJiYWdlQ2FuLmhpdEJlaGF2aW91ci5tb25zdGVyID0gb2JzdGFjbGVIaXRzTW9uc3RlckJlaGF2aW9yO1xyXG5cdHNwcml0ZXMudHJhZmZpY0NvbmVMYXJnZS5oaXRCZWhhdmlvdXIubW9uc3RlciA9IG9ic3RhY2xlSGl0c01vbnN0ZXJCZWhhdmlvcjtcclxuXHRzcHJpdGVzLnRyYWZmaWNDb25lU21hbGwuaGl0QmVoYXZpb3VyLm1vbnN0ZXIgPSBvYnN0YWNsZUhpdHNNb25zdGVyQmVoYXZpb3I7XHJcblxyXG5cdGZ1bmN0aW9uIGp1bXBIaXRzUGxheWVyQmVoYXZpb3VyKGp1bXAsIHBsYXllcikge1xyXG5cdFx0cGxheWVyLmhhc0hpdEp1bXAoanVtcCk7XHJcblx0fVxyXG5cdHNwcml0ZXMuanVtcC5oaXRCZWhhdmlvdXIucGxheWVyID0ganVtcEhpdHNQbGF5ZXJCZWhhdmlvdXI7XHJcblxyXG5cdGZ1bmN0aW9uIG9ic3RhY2xlSGl0c1BsYXllckJlaGF2aW91cihvYnN0YWNsZSwgcGxheWVyKSB7XHJcblx0XHRwbGF5ZXIuaGFzSGl0T2JzdGFjbGUob2JzdGFjbGUpO1xyXG5cdH1cclxuXHRzcHJpdGVzLnRyYWZmaWNDb25lTGFyZ2UuaGl0QmVoYXZpb3VyLnBsYXllciA9IG9ic3RhY2xlSGl0c1BsYXllckJlaGF2aW91cjtcclxuXHRzcHJpdGVzLnRyYWZmaWNDb25lU21hbGwuaGl0QmVoYXZpb3VyLnBsYXllciA9IG9ic3RhY2xlSGl0c1BsYXllckJlaGF2aW91cjtcclxuXHRzcHJpdGVzLmdhcmJhZ2VDYW4uaGl0QmVoYXZpb3VyLnBsYXllciA9IG9ic3RhY2xlSGl0c1BsYXllckJlaGF2aW91cjtcclxuXHJcblx0ZnVuY3Rpb24gcGxheWVySGl0c1RoaWNrU25vd0JlaGF2aW91cihwbGF5ZXIsIHRoaWNrU25vdykge1xyXG5cdFx0Ly8gTmVlZCB0byBpbXBsZW1lbnQgdGhpcyBwcm9wZXJseVxyXG5cdFx0cGxheWVyLnNldFNwZWVkKDIpO1xyXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0cGxheWVyLnJlc2V0U3BlZWQoKTtcclxuXHRcdH0sIDcwMCk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB0aGlja1Nub3dIaXRzUGxheWVyQmVoYXZpb3VyKHRoaWNrU25vdywgcGxheWVyKSB7XHJcblx0XHQvLyBOZWVkIHRvIGltcGxlbWVudCB0aGlzIHByb3Blcmx5XHJcblx0XHRwbGF5ZXIuc2V0U3BlZWQoMik7XHJcblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRwbGF5ZXIucmVzZXRTcGVlZCgpO1xyXG5cdFx0fSwgMzAwKTtcclxuXHR9XHJcblxyXG5cdHNwcml0ZXMudGhpY2tTbm93LmhpdEJlaGF2aW91ci5wbGF5ZXIgPSB0aGlja1Nub3dIaXRzUGxheWVyQmVoYXZpb3VyO1xyXG5cdHNwcml0ZXMucGxheWVyLmhpdEJlaGF2aW91ci50aGlja1Nub3cgPSBwbGF5ZXJIaXRzVGhpY2tTbm93QmVoYXZpb3VyO1xyXG5cclxuXHRmdW5jdGlvbiBzbm93Ym9hcmRlckhpdHNQbGF5ZXJCZWhhdmlvdXIoc25vd2JvYXJkZXIsIHBsYXllcikge1xyXG5cdFx0cGxheWVyLmhhc0hpdE9ic3RhY2xlKHNub3dib2FyZGVyKTtcclxuXHR9XHJcblx0c3ByaXRlcy5zbm93Ym9hcmRlci5oaXRCZWhhdmlvdXIucGxheWVyID0gc25vd2JvYXJkZXJIaXRzUGxheWVyQmVoYXZpb3VyO1xyXG5cclxuXHRmdW5jdGlvbiBwbGF5ZXJIaXRzQ29sbGVjdGlibGVCZWhhdmlvdXIoaXRlbSwgcGxheWVyKSB7XHJcblx0XHRwbGF5ZXIuaGFzSGl0Q29sbGVjdGlibGUoaXRlbSk7XHJcblx0XHRpdGVtLmRlbGV0ZU9uTmV4dEN5Y2xlKCk7XHJcblx0fVxyXG5cdHNwcml0ZXMudG9rZW4uaGl0QmVoYXZpb3VyLnBsYXllciA9IHBsYXllckhpdHNDb2xsZWN0aWJsZUJlaGF2aW91cjtcclxuXHRzcHJpdGVzLm1pbGtzaGFrZS5oaXRCZWhhdmlvdXIucGxheWVyID0gcGxheWVySGl0c0NvbGxlY3RpYmxlQmVoYXZpb3VyO1xyXG5cdFxyXG5cdGdsb2JhbC5zcHJpdGVJbmZvID0gc3ByaXRlcztcclxufSkoIHRoaXMgKTtcclxuXHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IHRoaXMuc3ByaXRlSW5mbztcclxufSIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTIgQ3JhaWcgQ2FtcGJlbGxcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKiBNb3VzZXRyYXAgaXMgYSBzaW1wbGUga2V5Ym9hcmQgc2hvcnRjdXQgbGlicmFyeSBmb3IgSmF2YXNjcmlwdCB3aXRoXG4gKiBubyBleHRlcm5hbCBkZXBlbmRlbmNpZXNcbiAqXG4gKiBAdmVyc2lvbiAxLjEuM1xuICogQHVybCBjcmFpZy5pcy9raWxsaW5nL21pY2VcbiAqL1xuKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogbWFwcGluZyBvZiBzcGVjaWFsIGtleWNvZGVzIHRvIHRoZWlyIGNvcnJlc3BvbmRpbmcga2V5c1xuICAgICAqXG4gICAgICogZXZlcnl0aGluZyBpbiB0aGlzIGRpY3Rpb25hcnkgY2Fubm90IHVzZSBrZXlwcmVzcyBldmVudHNcbiAgICAgKiBzbyBpdCBoYXMgdG8gYmUgaGVyZSB0byBtYXAgdG8gdGhlIGNvcnJlY3Qga2V5Y29kZXMgZm9yXG4gICAgICoga2V5dXAva2V5ZG93biBldmVudHNcbiAgICAgKlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgdmFyIF9NQVAgPSB7XG4gICAgICAgICAgICA4OiAnYmFja3NwYWNlJyxcbiAgICAgICAgICAgIDk6ICd0YWInLFxuICAgICAgICAgICAgMTM6ICdlbnRlcicsXG4gICAgICAgICAgICAxNjogJ3NoaWZ0JyxcbiAgICAgICAgICAgIDE3OiAnY3RybCcsXG4gICAgICAgICAgICAxODogJ2FsdCcsXG4gICAgICAgICAgICAyMDogJ2NhcHNsb2NrJyxcbiAgICAgICAgICAgIDI3OiAnZXNjJyxcbiAgICAgICAgICAgIDMyOiAnc3BhY2UnLFxuICAgICAgICAgICAgMzM6ICdwYWdldXAnLFxuICAgICAgICAgICAgMzQ6ICdwYWdlZG93bicsXG4gICAgICAgICAgICAzNTogJ2VuZCcsXG4gICAgICAgICAgICAzNjogJ2hvbWUnLFxuICAgICAgICAgICAgMzc6ICdsZWZ0JyxcbiAgICAgICAgICAgIDM4OiAndXAnLFxuICAgICAgICAgICAgMzk6ICdyaWdodCcsXG4gICAgICAgICAgICA0MDogJ2Rvd24nLFxuICAgICAgICAgICAgNDU6ICdpbnMnLFxuICAgICAgICAgICAgNDY6ICdkZWwnLFxuICAgICAgICAgICAgOTE6ICdtZXRhJyxcbiAgICAgICAgICAgIDkzOiAnbWV0YScsXG4gICAgICAgICAgICAyMjQ6ICdtZXRhJ1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBtYXBwaW5nIGZvciBzcGVjaWFsIGNoYXJhY3RlcnMgc28gdGhleSBjYW4gc3VwcG9ydFxuICAgICAgICAgKlxuICAgICAgICAgKiB0aGlzIGRpY3Rpb25hcnkgaXMgb25seSB1c2VkIGluY2FzZSB5b3Ugd2FudCB0byBiaW5kIGFcbiAgICAgICAgICoga2V5dXAgb3Iga2V5ZG93biBldmVudCB0byBvbmUgb2YgdGhlc2Uga2V5c1xuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgX0tFWUNPREVfTUFQID0ge1xuICAgICAgICAgICAgMTA2OiAnKicsXG4gICAgICAgICAgICAxMDc6ICcrJyxcbiAgICAgICAgICAgIDEwOTogJy0nLFxuICAgICAgICAgICAgMTEwOiAnLicsXG4gICAgICAgICAgICAxMTEgOiAnLycsXG4gICAgICAgICAgICAxODY6ICc7JyxcbiAgICAgICAgICAgIDE4NzogJz0nLFxuICAgICAgICAgICAgMTg4OiAnLCcsXG4gICAgICAgICAgICAxODk6ICctJyxcbiAgICAgICAgICAgIDE5MDogJy4nLFxuICAgICAgICAgICAgMTkxOiAnLycsXG4gICAgICAgICAgICAxOTI6ICdgJyxcbiAgICAgICAgICAgIDIxOTogJ1snLFxuICAgICAgICAgICAgMjIwOiAnXFxcXCcsXG4gICAgICAgICAgICAyMjE6ICddJyxcbiAgICAgICAgICAgIDIyMjogJ1xcJydcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogdGhpcyBpcyBhIG1hcHBpbmcgb2Yga2V5cyB0aGF0IHJlcXVpcmUgc2hpZnQgb24gYSBVUyBrZXlwYWRcbiAgICAgICAgICogYmFjayB0byB0aGUgbm9uIHNoaWZ0IGVxdWl2ZWxlbnRzXG4gICAgICAgICAqXG4gICAgICAgICAqIHRoaXMgaXMgc28geW91IGNhbiB1c2Uga2V5dXAgZXZlbnRzIHdpdGggdGhlc2Uga2V5c1xuICAgICAgICAgKlxuICAgICAgICAgKiBub3RlIHRoYXQgdGhpcyB3aWxsIG9ubHkgd29yayByZWxpYWJseSBvbiBVUyBrZXlib2FyZHNcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIF9TSElGVF9NQVAgPSB7XG4gICAgICAgICAgICAnfic6ICdgJyxcbiAgICAgICAgICAgICchJzogJzEnLFxuICAgICAgICAgICAgJ0AnOiAnMicsXG4gICAgICAgICAgICAnIyc6ICczJyxcbiAgICAgICAgICAgICckJzogJzQnLFxuICAgICAgICAgICAgJyUnOiAnNScsXG4gICAgICAgICAgICAnXic6ICc2JyxcbiAgICAgICAgICAgICcmJzogJzcnLFxuICAgICAgICAgICAgJyonOiAnOCcsXG4gICAgICAgICAgICAnKCc6ICc5JyxcbiAgICAgICAgICAgICcpJzogJzAnLFxuICAgICAgICAgICAgJ18nOiAnLScsXG4gICAgICAgICAgICAnKyc6ICc9JyxcbiAgICAgICAgICAgICc6JzogJzsnLFxuICAgICAgICAgICAgJ1xcXCInOiAnXFwnJyxcbiAgICAgICAgICAgICc8JzogJywnLFxuICAgICAgICAgICAgJz4nOiAnLicsXG4gICAgICAgICAgICAnPyc6ICcvJyxcbiAgICAgICAgICAgICd8JzogJ1xcXFwnXG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHRoaXMgaXMgYSBsaXN0IG9mIHNwZWNpYWwgc3RyaW5ncyB5b3UgY2FuIHVzZSB0byBtYXBcbiAgICAgICAgICogdG8gbW9kaWZpZXIga2V5cyB3aGVuIHlvdSBzcGVjaWZ5IHlvdXIga2V5Ym9hcmQgc2hvcnRjdXRzXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBfU1BFQ0lBTF9BTElBU0VTID0ge1xuICAgICAgICAgICAgJ29wdGlvbic6ICdhbHQnLFxuICAgICAgICAgICAgJ2NvbW1hbmQnOiAnbWV0YScsXG4gICAgICAgICAgICAncmV0dXJuJzogJ2VudGVyJyxcbiAgICAgICAgICAgICdlc2NhcGUnOiAnZXNjJ1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiB2YXJpYWJsZSB0byBzdG9yZSB0aGUgZmxpcHBlZCB2ZXJzaW9uIG9mIF9NQVAgZnJvbSBhYm92ZVxuICAgICAgICAgKiBuZWVkZWQgdG8gY2hlY2sgaWYgd2Ugc2hvdWxkIHVzZSBrZXlwcmVzcyBvciBub3Qgd2hlbiBubyBhY3Rpb25cbiAgICAgICAgICogaXMgc3BlY2lmaWVkXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R8dW5kZWZpbmVkfVxuICAgICAgICAgKi9cbiAgICAgICAgX1JFVkVSU0VfTUFQLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBhIGxpc3Qgb2YgYWxsIHRoZSBjYWxsYmFja3Mgc2V0dXAgdmlhIE1vdXNldHJhcC5iaW5kKClcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIF9jYWxsYmFja3MgPSB7fSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogZGlyZWN0IG1hcCBvZiBzdHJpbmcgY29tYmluYXRpb25zIHRvIGNhbGxiYWNrcyB1c2VkIGZvciB0cmlnZ2VyKClcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIF9kaXJlY3RfbWFwID0ge30sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIGtlZXBzIHRyYWNrIG9mIHdoYXQgbGV2ZWwgZWFjaCBzZXF1ZW5jZSBpcyBhdCBzaW5jZSBtdWx0aXBsZVxuICAgICAgICAgKiBzZXF1ZW5jZXMgY2FuIHN0YXJ0IG91dCB3aXRoIHRoZSBzYW1lIHNlcXVlbmNlXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBfc2VxdWVuY2VfbGV2ZWxzID0ge30sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHZhcmlhYmxlIHRvIHN0b3JlIHRoZSBzZXRUaW1lb3V0IGNhbGxcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge251bGx8bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgX3Jlc2V0X3RpbWVyLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiB0ZW1wb3Jhcnkgc3RhdGUgd2hlcmUgd2Ugd2lsbCBpZ25vcmUgdGhlIG5leHQga2V5dXBcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW58c3RyaW5nfVxuICAgICAgICAgKi9cbiAgICAgICAgX2lnbm9yZV9uZXh0X2tleXVwID0gZmFsc2UsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIGFyZSB3ZSBjdXJyZW50bHkgaW5zaWRlIG9mIGEgc2VxdWVuY2U/XG4gICAgICAgICAqIHR5cGUgb2YgYWN0aW9uIChcImtleXVwXCIgb3IgXCJrZXlkb3duXCIgb3IgXCJrZXlwcmVzc1wiKSBvciBmYWxzZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbnxzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBfaW5zaWRlX3NlcXVlbmNlID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBsb29wIHRocm91Z2ggdGhlIGYga2V5cywgZjEgdG8gZjE5IGFuZCBhZGQgdGhlbSB0byB0aGUgbWFwXG4gICAgICogcHJvZ3JhbWF0aWNhbGx5XG4gICAgICovXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCAyMDsgKytpKSB7XG4gICAgICAgIF9NQVBbMTExICsgaV0gPSAnZicgKyBpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGxvb3AgdGhyb3VnaCB0byBtYXAgbnVtYmVycyBvbiB0aGUgbnVtZXJpYyBrZXlwYWRcbiAgICAgKi9cbiAgICBmb3IgKGkgPSAwOyBpIDw9IDk7ICsraSkge1xuICAgICAgICBfTUFQW2kgKyA5Nl0gPSBpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNyb3NzIGJyb3dzZXIgYWRkIGV2ZW50IG1ldGhvZFxuICAgICAqXG4gICAgICogQHBhcmFtIHtFbGVtZW50fEhUTUxEb2N1bWVudH0gb2JqZWN0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfYWRkRXZlbnQob2JqZWN0LCB0eXBlLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAob2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIG9iamVjdC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGNhbGxiYWNrLCBmYWxzZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBvYmplY3QuYXR0YWNoRXZlbnQoJ29uJyArIHR5cGUsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiB0YWtlcyB0aGUgZXZlbnQgYW5kIHJldHVybnMgdGhlIGtleSBjaGFyYWN0ZXJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGVcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2NoYXJhY3RlckZyb21FdmVudChlKSB7XG5cbiAgICAgICAgLy8gZm9yIGtleXByZXNzIGV2ZW50cyB3ZSBzaG91bGQgcmV0dXJuIHRoZSBjaGFyYWN0ZXIgYXMgaXNcbiAgICAgICAgaWYgKGUudHlwZSA9PSAna2V5cHJlc3MnKSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShlLndoaWNoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZvciBub24ga2V5cHJlc3MgZXZlbnRzIHRoZSBzcGVjaWFsIG1hcHMgYXJlIG5lZWRlZFxuICAgICAgICBpZiAoX01BUFtlLndoaWNoXSkge1xuICAgICAgICAgICAgcmV0dXJuIF9NQVBbZS53aGljaF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoX0tFWUNPREVfTUFQW2Uud2hpY2hdKSB7XG4gICAgICAgICAgICByZXR1cm4gX0tFWUNPREVfTUFQW2Uud2hpY2hdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgaXQgaXMgbm90IGluIHRoZSBzcGVjaWFsIG1hcFxuICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShlLndoaWNoKS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNoZWNrcyBpZiB0d28gYXJyYXlzIGFyZSBlcXVhbFxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gbW9kaWZpZXJzMVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG1vZGlmaWVyczJcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfbW9kaWZpZXJzTWF0Y2gobW9kaWZpZXJzMSwgbW9kaWZpZXJzMikge1xuICAgICAgICByZXR1cm4gbW9kaWZpZXJzMS5zb3J0KCkuam9pbignLCcpID09PSBtb2RpZmllcnMyLnNvcnQoKS5qb2luKCcsJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXRzIGFsbCBzZXF1ZW5jZSBjb3VudGVycyBleGNlcHQgZm9yIHRoZSBvbmVzIHBhc3NlZCBpblxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRvX25vdF9yZXNldFxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfcmVzZXRTZXF1ZW5jZXMoZG9fbm90X3Jlc2V0KSB7XG4gICAgICAgIGRvX25vdF9yZXNldCA9IGRvX25vdF9yZXNldCB8fCB7fTtcblxuICAgICAgICB2YXIgYWN0aXZlX3NlcXVlbmNlcyA9IGZhbHNlLFxuICAgICAgICAgICAga2V5O1xuXG4gICAgICAgIGZvciAoa2V5IGluIF9zZXF1ZW5jZV9sZXZlbHMpIHtcbiAgICAgICAgICAgIGlmIChkb19ub3RfcmVzZXRba2V5XSkge1xuICAgICAgICAgICAgICAgIGFjdGl2ZV9zZXF1ZW5jZXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX3NlcXVlbmNlX2xldmVsc1trZXldID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghYWN0aXZlX3NlcXVlbmNlcykge1xuICAgICAgICAgICAgX2luc2lkZV9zZXF1ZW5jZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZmluZHMgYWxsIGNhbGxiYWNrcyB0aGF0IG1hdGNoIGJhc2VkIG9uIHRoZSBrZXljb2RlLCBtb2RpZmllcnMsXG4gICAgICogYW5kIGFjdGlvblxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNoYXJhY3RlclxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG1vZGlmaWVyc1xuICAgICAqIEBwYXJhbSB7RXZlbnR8T2JqZWN0fSBlXG4gICAgICogQHBhcmFtIHtib29sZWFuPX0gcmVtb3ZlIC0gc2hvdWxkIHdlIHJlbW92ZSBhbnkgbWF0Y2hlc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nPX0gY29tYmluYXRpb25cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldE1hdGNoZXMoY2hhcmFjdGVyLCBtb2RpZmllcnMsIGUsIHJlbW92ZSwgY29tYmluYXRpb24pIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgICBjYWxsYmFjayxcbiAgICAgICAgICAgIG1hdGNoZXMgPSBbXSxcbiAgICAgICAgICAgIGFjdGlvbiA9IGUudHlwZTtcblxuICAgICAgICAvLyBpZiB0aGVyZSBhcmUgbm8gZXZlbnRzIHJlbGF0ZWQgdG8gdGhpcyBrZXljb2RlXG4gICAgICAgIGlmICghX2NhbGxiYWNrc1tjaGFyYWN0ZXJdKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiBhIG1vZGlmaWVyIGtleSBpcyBjb21pbmcgdXAgb24gaXRzIG93biB3ZSBzaG91bGQgYWxsb3cgaXRcbiAgICAgICAgaWYgKGFjdGlvbiA9PSAna2V5dXAnICYmIF9pc01vZGlmaWVyKGNoYXJhY3RlcikpIHtcbiAgICAgICAgICAgIG1vZGlmaWVycyA9IFtjaGFyYWN0ZXJdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbG9vcCB0aHJvdWdoIGFsbCBjYWxsYmFja3MgZm9yIHRoZSBrZXkgdGhhdCB3YXMgcHJlc3NlZFxuICAgICAgICAvLyBhbmQgc2VlIGlmIGFueSBvZiB0aGVtIG1hdGNoXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBfY2FsbGJhY2tzW2NoYXJhY3Rlcl0ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gX2NhbGxiYWNrc1tjaGFyYWN0ZXJdW2ldO1xuXG4gICAgICAgICAgICAvLyBpZiB0aGlzIGlzIGEgc2VxdWVuY2UgYnV0IGl0IGlzIG5vdCBhdCB0aGUgcmlnaHQgbGV2ZWxcbiAgICAgICAgICAgIC8vIHRoZW4gbW92ZSBvbnRvIHRoZSBuZXh0IG1hdGNoXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2suc2VxICYmIF9zZXF1ZW5jZV9sZXZlbHNbY2FsbGJhY2suc2VxXSAhPSBjYWxsYmFjay5sZXZlbCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGUgYWN0aW9uIHdlIGFyZSBsb29raW5nIGZvciBkb2Vzbid0IG1hdGNoIHRoZSBhY3Rpb24gd2UgZ290XG4gICAgICAgICAgICAvLyB0aGVuIHdlIHNob3VsZCBrZWVwIGdvaW5nXG4gICAgICAgICAgICBpZiAoYWN0aW9uICE9IGNhbGxiYWNrLmFjdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGlzIGlzIGEga2V5cHJlc3MgZXZlbnQgYW5kIHRoZSBtZXRhIGtleSBhbmQgY29udHJvbCBrZXlcbiAgICAgICAgICAgIC8vIGFyZSBub3QgcHJlc3NlZCB0aGF0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byBvbmx5IGxvb2sgYXQgdGhlXG4gICAgICAgICAgICAvLyBjaGFyYWN0ZXIsIG90aGVyd2lzZSBjaGVjayB0aGUgbW9kaWZpZXJzIGFzIHdlbGxcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBjaHJvbWUgd2lsbCBub3QgZmlyZSBhIGtleXByZXNzIGlmIG1ldGEgb3IgY29udHJvbCBpcyBkb3duXG4gICAgICAgICAgICAvLyBzYWZhcmkgd2lsbCBmaXJlIGEga2V5cHJlc3MgaWYgbWV0YSBvciBtZXRhK3NoaWZ0IGlzIGRvd25cbiAgICAgICAgICAgIC8vIGZpcmVmb3ggd2lsbCBmaXJlIGEga2V5cHJlc3MgaWYgbWV0YSBvciBjb250cm9sIGlzIGRvd25cbiAgICAgICAgICAgIGlmICgoYWN0aW9uID09ICdrZXlwcmVzcycgJiYgIWUubWV0YUtleSAmJiAhZS5jdHJsS2V5KSB8fCBfbW9kaWZpZXJzTWF0Y2gobW9kaWZpZXJzLCBjYWxsYmFjay5tb2RpZmllcnMpKSB7XG5cbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgaXMgdXNlZCBzbyBpZiB5b3UgY2hhbmdlIHlvdXIgbWluZCBhbmQgY2FsbCBiaW5kIGFcbiAgICAgICAgICAgICAgICAvLyBzZWNvbmQgdGltZSB3aXRoIGEgbmV3IGZ1bmN0aW9uIHRoZSBmaXJzdCBvbmUgaXMgb3ZlcndyaXR0ZW5cbiAgICAgICAgICAgICAgICBpZiAocmVtb3ZlICYmIGNhbGxiYWNrLmNvbWJvID09IGNvbWJpbmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIF9jYWxsYmFja3NbY2hhcmFjdGVyXS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbWF0Y2hlcy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtYXRjaGVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHRha2VzIGEga2V5IGV2ZW50IGFuZCBmaWd1cmVzIG91dCB3aGF0IHRoZSBtb2RpZmllcnMgYXJlXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9ldmVudE1vZGlmaWVycyhlKSB7XG4gICAgICAgIHZhciBtb2RpZmllcnMgPSBbXTtcblxuICAgICAgICBpZiAoZS5zaGlmdEtleSkge1xuICAgICAgICAgICAgbW9kaWZpZXJzLnB1c2goJ3NoaWZ0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZS5hbHRLZXkpIHtcbiAgICAgICAgICAgIG1vZGlmaWVycy5wdXNoKCdhbHQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlLmN0cmxLZXkpIHtcbiAgICAgICAgICAgIG1vZGlmaWVycy5wdXNoKCdjdHJsJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZS5tZXRhS2V5KSB7XG4gICAgICAgICAgICBtb2RpZmllcnMucHVzaCgnbWV0YScpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vZGlmaWVycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBhY3R1YWxseSBjYWxscyB0aGUgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKlxuICAgICAqIGlmIHlvdXIgY2FsbGJhY2sgZnVuY3Rpb24gcmV0dXJucyBmYWxzZSB0aGlzIHdpbGwgdXNlIHRoZSBqcXVlcnlcbiAgICAgKiBjb252ZW50aW9uIC0gcHJldmVudCBkZWZhdWx0IGFuZCBzdG9wIHByb3BvZ2F0aW9uIG9uIHRoZSBldmVudFxuICAgICAqXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9maXJlQ2FsbGJhY2soY2FsbGJhY2ssIGUpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKGUpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgaWYgKGUucHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChlLnN0b3BQcm9wYWdhdGlvbikge1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGUucmV0dXJuVmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGhhbmRsZXMgYSBjaGFyYWN0ZXIga2V5IGV2ZW50XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2hhcmFjdGVyXG4gICAgICogQHBhcmFtIHtFdmVudH0gZVxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfaGFuZGxlQ2hhcmFjdGVyKGNoYXJhY3RlciwgZSkge1xuXG4gICAgICAgIC8vIGlmIHRoaXMgZXZlbnQgc2hvdWxkIG5vdCBoYXBwZW4gc3RvcCBoZXJlXG4gICAgICAgIGlmIChNb3VzZXRyYXAuc3RvcENhbGxiYWNrKGUsIGUudGFyZ2V0IHx8IGUuc3JjRWxlbWVudCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjYWxsYmFja3MgPSBfZ2V0TWF0Y2hlcyhjaGFyYWN0ZXIsIF9ldmVudE1vZGlmaWVycyhlKSwgZSksXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgZG9fbm90X3Jlc2V0ID0ge30sXG4gICAgICAgICAgICBwcm9jZXNzZWRfc2VxdWVuY2VfY2FsbGJhY2sgPSBmYWxzZTtcblxuICAgICAgICAvLyBsb29wIHRocm91Z2ggbWF0Y2hpbmcgY2FsbGJhY2tzIGZvciB0aGlzIGtleSBldmVudFxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgKytpKSB7XG5cbiAgICAgICAgICAgIC8vIGZpcmUgZm9yIGFsbCBzZXF1ZW5jZSBjYWxsYmFja3NcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgYmVjYXVzZSBpZiBmb3IgZXhhbXBsZSB5b3UgaGF2ZSBtdWx0aXBsZSBzZXF1ZW5jZXNcbiAgICAgICAgICAgIC8vIGJvdW5kIHN1Y2ggYXMgXCJnIGlcIiBhbmQgXCJnIHRcIiB0aGV5IGJvdGggbmVlZCB0byBmaXJlIHRoZVxuICAgICAgICAgICAgLy8gY2FsbGJhY2sgZm9yIG1hdGNoaW5nIGcgY2F1c2Ugb3RoZXJ3aXNlIHlvdSBjYW4gb25seSBldmVyXG4gICAgICAgICAgICAvLyBtYXRjaCB0aGUgZmlyc3Qgb25lXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2tzW2ldLnNlcSkge1xuICAgICAgICAgICAgICAgIHByb2Nlc3NlZF9zZXF1ZW5jZV9jYWxsYmFjayA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAvLyBrZWVwIGEgbGlzdCBvZiB3aGljaCBzZXF1ZW5jZXMgd2VyZSBtYXRjaGVzIGZvciBsYXRlclxuICAgICAgICAgICAgICAgIGRvX25vdF9yZXNldFtjYWxsYmFja3NbaV0uc2VxXSA9IDE7XG4gICAgICAgICAgICAgICAgX2ZpcmVDYWxsYmFjayhjYWxsYmFja3NbaV0uY2FsbGJhY2ssIGUpO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGVyZSB3ZXJlIG5vIHNlcXVlbmNlIG1hdGNoZXMgYnV0IHdlIGFyZSBzdGlsbCBoZXJlXG4gICAgICAgICAgICAvLyB0aGF0IG1lYW5zIHRoaXMgaXMgYSByZWd1bGFyIG1hdGNoIHNvIHdlIHNob3VsZCBmaXJlIHRoYXRcbiAgICAgICAgICAgIGlmICghcHJvY2Vzc2VkX3NlcXVlbmNlX2NhbGxiYWNrICYmICFfaW5zaWRlX3NlcXVlbmNlKSB7XG4gICAgICAgICAgICAgICAgX2ZpcmVDYWxsYmFjayhjYWxsYmFja3NbaV0uY2FsbGJhY2ssIGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgeW91IGFyZSBpbnNpZGUgb2YgYSBzZXF1ZW5jZSBhbmQgdGhlIGtleSB5b3UgYXJlIHByZXNzaW5nXG4gICAgICAgIC8vIGlzIG5vdCBhIG1vZGlmaWVyIGtleSB0aGVuIHdlIHNob3VsZCByZXNldCBhbGwgc2VxdWVuY2VzXG4gICAgICAgIC8vIHRoYXQgd2VyZSBub3QgbWF0Y2hlZCBieSB0aGlzIGtleSBldmVudFxuICAgICAgICBpZiAoZS50eXBlID09IF9pbnNpZGVfc2VxdWVuY2UgJiYgIV9pc01vZGlmaWVyKGNoYXJhY3RlcikpIHtcbiAgICAgICAgICAgIF9yZXNldFNlcXVlbmNlcyhkb19ub3RfcmVzZXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaGFuZGxlcyBhIGtleWRvd24gZXZlbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGVcbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2hhbmRsZUtleShlKSB7XG5cbiAgICAgICAgLy8gbm9ybWFsaXplIGUud2hpY2ggZm9yIGtleSBldmVudHNcbiAgICAgICAgLy8gQHNlZSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzQyODU2MjcvamF2YXNjcmlwdC1rZXljb2RlLXZzLWNoYXJjb2RlLXV0dGVyLWNvbmZ1c2lvblxuICAgICAgICBlLndoaWNoID0gdHlwZW9mIGUud2hpY2ggPT0gXCJudW1iZXJcIiA/IGUud2hpY2ggOiBlLmtleUNvZGU7XG5cbiAgICAgICAgdmFyIGNoYXJhY3RlciA9IF9jaGFyYWN0ZXJGcm9tRXZlbnQoZSk7XG5cbiAgICAgICAgLy8gbm8gY2hhcmFjdGVyIGZvdW5kIHRoZW4gc3RvcFxuICAgICAgICBpZiAoIWNoYXJhY3Rlcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGUudHlwZSA9PSAna2V5dXAnICYmIF9pZ25vcmVfbmV4dF9rZXl1cCA9PSBjaGFyYWN0ZXIpIHtcbiAgICAgICAgICAgIF9pZ25vcmVfbmV4dF9rZXl1cCA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgX2hhbmRsZUNoYXJhY3RlcihjaGFyYWN0ZXIsIGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRldGVybWluZXMgaWYgdGhlIGtleWNvZGUgc3BlY2lmaWVkIGlzIGEgbW9kaWZpZXIga2V5IG9yIG5vdFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9pc01vZGlmaWVyKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5ID09ICdzaGlmdCcgfHwga2V5ID09ICdjdHJsJyB8fCBrZXkgPT0gJ2FsdCcgfHwga2V5ID09ICdtZXRhJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjYWxsZWQgdG8gc2V0IGEgMSBzZWNvbmQgdGltZW91dCBvbiB0aGUgc3BlY2lmaWVkIHNlcXVlbmNlXG4gICAgICpcbiAgICAgKiB0aGlzIGlzIHNvIGFmdGVyIGVhY2gga2V5IHByZXNzIGluIHRoZSBzZXF1ZW5jZSB5b3UgaGF2ZSAxIHNlY29uZFxuICAgICAqIHRvIHByZXNzIHRoZSBuZXh0IGtleSBiZWZvcmUgeW91IGhhdmUgdG8gc3RhcnQgb3ZlclxuICAgICAqXG4gICAgICogQHJldHVybnMgdm9pZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9yZXNldFNlcXVlbmNlVGltZXIoKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChfcmVzZXRfdGltZXIpO1xuICAgICAgICBfcmVzZXRfdGltZXIgPSBzZXRUaW1lb3V0KF9yZXNldFNlcXVlbmNlcywgMTAwMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmV2ZXJzZXMgdGhlIG1hcCBsb29rdXAgc28gdGhhdCB3ZSBjYW4gbG9vayBmb3Igc3BlY2lmaWMga2V5c1xuICAgICAqIHRvIHNlZSB3aGF0IGNhbiBhbmQgY2FuJ3QgdXNlIGtleXByZXNzXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJldmVyc2VNYXAoKSB7XG4gICAgICAgIGlmICghX1JFVkVSU0VfTUFQKSB7XG4gICAgICAgICAgICBfUkVWRVJTRV9NQVAgPSB7fTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBfTUFQKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBwdWxsIG91dCB0aGUgbnVtZXJpYyBrZXlwYWQgZnJvbSBoZXJlIGNhdXNlIGtleXByZXNzIHNob3VsZFxuICAgICAgICAgICAgICAgIC8vIGJlIGFibGUgdG8gZGV0ZWN0IHRoZSBrZXlzIGZyb20gdGhlIGNoYXJhY3RlclxuICAgICAgICAgICAgICAgIGlmIChrZXkgPiA5NSAmJiBrZXkgPCAxMTIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKF9NQVAuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBfUkVWRVJTRV9NQVBbX01BUFtrZXldXSA9IGtleTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF9SRVZFUlNFX01BUDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBwaWNrcyB0aGUgYmVzdCBhY3Rpb24gYmFzZWQgb24gdGhlIGtleSBjb21iaW5hdGlvblxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSAtIGNoYXJhY3RlciBmb3Iga2V5XG4gICAgICogQHBhcmFtIHtBcnJheX0gbW9kaWZpZXJzXG4gICAgICogQHBhcmFtIHtzdHJpbmc9fSBhY3Rpb24gcGFzc2VkIGluXG4gICAgICovXG4gICAgZnVuY3Rpb24gX3BpY2tCZXN0QWN0aW9uKGtleSwgbW9kaWZpZXJzLCBhY3Rpb24pIHtcblxuICAgICAgICAvLyBpZiBubyBhY3Rpb24gd2FzIHBpY2tlZCBpbiB3ZSBzaG91bGQgdHJ5IHRvIHBpY2sgdGhlIG9uZVxuICAgICAgICAvLyB0aGF0IHdlIHRoaW5rIHdvdWxkIHdvcmsgYmVzdCBmb3IgdGhpcyBrZXlcbiAgICAgICAgaWYgKCFhY3Rpb24pIHtcbiAgICAgICAgICAgIGFjdGlvbiA9IF9nZXRSZXZlcnNlTWFwKClba2V5XSA/ICdrZXlkb3duJyA6ICdrZXlwcmVzcyc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBtb2RpZmllciBrZXlzIGRvbid0IHdvcmsgYXMgZXhwZWN0ZWQgd2l0aCBrZXlwcmVzcyxcbiAgICAgICAgLy8gc3dpdGNoIHRvIGtleWRvd25cbiAgICAgICAgaWYgKGFjdGlvbiA9PSAna2V5cHJlc3MnICYmIG1vZGlmaWVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFjdGlvbiA9ICdrZXlkb3duJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhY3Rpb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogYmluZHMgYSBrZXkgc2VxdWVuY2UgdG8gYW4gZXZlbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb21ibyAtIGNvbWJvIHNwZWNpZmllZCBpbiBiaW5kIGNhbGxcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBrZXlzXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge3N0cmluZz19IGFjdGlvblxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfYmluZFNlcXVlbmNlKGNvbWJvLCBrZXlzLCBjYWxsYmFjaywgYWN0aW9uKSB7XG5cbiAgICAgICAgLy8gc3RhcnQgb2ZmIGJ5IGFkZGluZyBhIHNlcXVlbmNlIGxldmVsIHJlY29yZCBmb3IgdGhpcyBjb21iaW5hdGlvblxuICAgICAgICAvLyBhbmQgc2V0dGluZyB0aGUgbGV2ZWwgdG8gMFxuICAgICAgICBfc2VxdWVuY2VfbGV2ZWxzW2NvbWJvXSA9IDA7XG5cbiAgICAgICAgLy8gaWYgdGhlcmUgaXMgbm8gYWN0aW9uIHBpY2sgdGhlIGJlc3Qgb25lIGZvciB0aGUgZmlyc3Qga2V5XG4gICAgICAgIC8vIGluIHRoZSBzZXF1ZW5jZVxuICAgICAgICBpZiAoIWFjdGlvbikge1xuICAgICAgICAgICAgYWN0aW9uID0gX3BpY2tCZXN0QWN0aW9uKGtleXNbMF0sIFtdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBjYWxsYmFjayB0byBpbmNyZWFzZSB0aGUgc2VxdWVuY2UgbGV2ZWwgZm9yIHRoaXMgc2VxdWVuY2UgYW5kIHJlc2V0XG4gICAgICAgICAqIGFsbCBvdGhlciBzZXF1ZW5jZXMgdGhhdCB3ZXJlIGFjdGl2ZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgIHZhciBfaW5jcmVhc2VTZXF1ZW5jZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBfaW5zaWRlX3NlcXVlbmNlID0gYWN0aW9uO1xuICAgICAgICAgICAgICAgICsrX3NlcXVlbmNlX2xldmVsc1tjb21ib107XG4gICAgICAgICAgICAgICAgX3Jlc2V0U2VxdWVuY2VUaW1lcigpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiB3cmFwcyB0aGUgc3BlY2lmaWVkIGNhbGxiYWNrIGluc2lkZSBvZiBhbm90aGVyIGZ1bmN0aW9uIGluIG9yZGVyXG4gICAgICAgICAgICAgKiB0byByZXNldCBhbGwgc2VxdWVuY2UgY291bnRlcnMgYXMgc29vbiBhcyB0aGlzIHNlcXVlbmNlIGlzIGRvbmVcbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9jYWxsYmFja0FuZFJlc2V0ID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIF9maXJlQ2FsbGJhY2soY2FsbGJhY2ssIGUpO1xuXG4gICAgICAgICAgICAgICAgLy8gd2Ugc2hvdWxkIGlnbm9yZSB0aGUgbmV4dCBrZXkgdXAgaWYgdGhlIGFjdGlvbiBpcyBrZXkgZG93blxuICAgICAgICAgICAgICAgIC8vIG9yIGtleXByZXNzLiAgdGhpcyBpcyBzbyBpZiB5b3UgZmluaXNoIGEgc2VxdWVuY2UgYW5kXG4gICAgICAgICAgICAgICAgLy8gcmVsZWFzZSB0aGUga2V5IHRoZSBmaW5hbCBrZXkgd2lsbCBub3QgdHJpZ2dlciBhIGtleXVwXG4gICAgICAgICAgICAgICAgaWYgKGFjdGlvbiAhPT0gJ2tleXVwJykge1xuICAgICAgICAgICAgICAgICAgICBfaWdub3JlX25leHRfa2V5dXAgPSBfY2hhcmFjdGVyRnJvbUV2ZW50KGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIHdlaXJkIHJhY2UgY29uZGl0aW9uIGlmIGEgc2VxdWVuY2UgZW5kcyB3aXRoIHRoZSBrZXlcbiAgICAgICAgICAgICAgICAvLyBhbm90aGVyIHNlcXVlbmNlIGJlZ2lucyB3aXRoXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChfcmVzZXRTZXF1ZW5jZXMsIDEwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpO1xuXG4gICAgICAgIC8vIGxvb3AgdGhyb3VnaCBrZXlzIG9uZSBhdCBhIHRpbWUgYW5kIGJpbmQgdGhlIGFwcHJvcHJpYXRlIGNhbGxiYWNrXG4gICAgICAgIC8vIGZ1bmN0aW9uLiAgZm9yIGFueSBrZXkgbGVhZGluZyB1cCB0byB0aGUgZmluYWwgb25lIGl0IHNob3VsZFxuICAgICAgICAvLyBpbmNyZWFzZSB0aGUgc2VxdWVuY2UuIGFmdGVyIHRoZSBmaW5hbCwgaXQgc2hvdWxkIHJlc2V0IGFsbCBzZXF1ZW5jZXNcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIF9iaW5kU2luZ2xlKGtleXNbaV0sIGkgPCBrZXlzLmxlbmd0aCAtIDEgPyBfaW5jcmVhc2VTZXF1ZW5jZSA6IF9jYWxsYmFja0FuZFJlc2V0LCBhY3Rpb24sIGNvbWJvLCBpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGJpbmRzIGEgc2luZ2xlIGtleWJvYXJkIGNvbWJpbmF0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29tYmluYXRpb25cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7c3RyaW5nPX0gYWN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmc9fSBzZXF1ZW5jZV9uYW1lIC0gbmFtZSBvZiBzZXF1ZW5jZSBpZiBwYXJ0IG9mIHNlcXVlbmNlXG4gICAgICogQHBhcmFtIHtudW1iZXI9fSBsZXZlbCAtIHdoYXQgcGFydCBvZiB0aGUgc2VxdWVuY2UgdGhlIGNvbW1hbmQgaXNcbiAgICAgKiBAcmV0dXJucyB2b2lkXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2JpbmRTaW5nbGUoY29tYmluYXRpb24sIGNhbGxiYWNrLCBhY3Rpb24sIHNlcXVlbmNlX25hbWUsIGxldmVsKSB7XG5cbiAgICAgICAgLy8gbWFrZSBzdXJlIG11bHRpcGxlIHNwYWNlcyBpbiBhIHJvdyBiZWNvbWUgYSBzaW5nbGUgc3BhY2VcbiAgICAgICAgY29tYmluYXRpb24gPSBjb21iaW5hdGlvbi5yZXBsYWNlKC9cXHMrL2csICcgJyk7XG5cbiAgICAgICAgdmFyIHNlcXVlbmNlID0gY29tYmluYXRpb24uc3BsaXQoJyAnKSxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBrZXksXG4gICAgICAgICAgICBrZXlzLFxuICAgICAgICAgICAgbW9kaWZpZXJzID0gW107XG5cbiAgICAgICAgLy8gaWYgdGhpcyBwYXR0ZXJuIGlzIGEgc2VxdWVuY2Ugb2Yga2V5cyB0aGVuIHJ1biB0aHJvdWdoIHRoaXMgbWV0aG9kXG4gICAgICAgIC8vIHRvIHJlcHJvY2VzcyBlYWNoIHBhdHRlcm4gb25lIGtleSBhdCBhIHRpbWVcbiAgICAgICAgaWYgKHNlcXVlbmNlLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIF9iaW5kU2VxdWVuY2UoY29tYmluYXRpb24sIHNlcXVlbmNlLCBjYWxsYmFjaywgYWN0aW9uKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRha2UgdGhlIGtleXMgZnJvbSB0aGlzIHBhdHRlcm4gYW5kIGZpZ3VyZSBvdXQgd2hhdCB0aGUgYWN0dWFsXG4gICAgICAgIC8vIHBhdHRlcm4gaXMgYWxsIGFib3V0XG4gICAgICAgIGtleXMgPSBjb21iaW5hdGlvbiA9PT0gJysnID8gWycrJ10gOiBjb21iaW5hdGlvbi5zcGxpdCgnKycpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBrZXkgPSBrZXlzW2ldO1xuXG4gICAgICAgICAgICAvLyBub3JtYWxpemUga2V5IG5hbWVzXG4gICAgICAgICAgICBpZiAoX1NQRUNJQUxfQUxJQVNFU1trZXldKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gX1NQRUNJQUxfQUxJQVNFU1trZXldO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB0aGlzIGlzIG5vdCBhIGtleXByZXNzIGV2ZW50IHRoZW4gd2Ugc2hvdWxkXG4gICAgICAgICAgICAvLyBiZSBzbWFydCBhYm91dCB1c2luZyBzaGlmdCBrZXlzXG4gICAgICAgICAgICAvLyB0aGlzIHdpbGwgb25seSB3b3JrIGZvciBVUyBrZXlib2FyZHMgaG93ZXZlclxuICAgICAgICAgICAgaWYgKGFjdGlvbiAmJiBhY3Rpb24gIT0gJ2tleXByZXNzJyAmJiBfU0hJRlRfTUFQW2tleV0pIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBfU0hJRlRfTUFQW2tleV07XG4gICAgICAgICAgICAgICAgbW9kaWZpZXJzLnB1c2goJ3NoaWZ0Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHRoaXMga2V5IGlzIGEgbW9kaWZpZXIgdGhlbiBhZGQgaXQgdG8gdGhlIGxpc3Qgb2YgbW9kaWZpZXJzXG4gICAgICAgICAgICBpZiAoX2lzTW9kaWZpZXIoa2V5KSkge1xuICAgICAgICAgICAgICAgIG1vZGlmaWVycy5wdXNoKGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkZXBlbmRpbmcgb24gd2hhdCB0aGUga2V5IGNvbWJpbmF0aW9uIGlzXG4gICAgICAgIC8vIHdlIHdpbGwgdHJ5IHRvIHBpY2sgdGhlIGJlc3QgZXZlbnQgZm9yIGl0XG4gICAgICAgIGFjdGlvbiA9IF9waWNrQmVzdEFjdGlvbihrZXksIG1vZGlmaWVycywgYWN0aW9uKTtcblxuICAgICAgICAvLyBtYWtlIHN1cmUgdG8gaW5pdGlhbGl6ZSBhcnJheSBpZiB0aGlzIGlzIHRoZSBmaXJzdCB0aW1lXG4gICAgICAgIC8vIGEgY2FsbGJhY2sgaXMgYWRkZWQgZm9yIHRoaXMga2V5XG4gICAgICAgIGlmICghX2NhbGxiYWNrc1trZXldKSB7XG4gICAgICAgICAgICBfY2FsbGJhY2tzW2tleV0gPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlbW92ZSBhbiBleGlzdGluZyBtYXRjaCBpZiB0aGVyZSBpcyBvbmVcbiAgICAgICAgX2dldE1hdGNoZXMoa2V5LCBtb2RpZmllcnMsIHt0eXBlOiBhY3Rpb259LCAhc2VxdWVuY2VfbmFtZSwgY29tYmluYXRpb24pO1xuXG4gICAgICAgIC8vIGFkZCB0aGlzIGNhbGwgYmFjayB0byB0aGUgYXJyYXlcbiAgICAgICAgLy8gaWYgaXQgaXMgYSBzZXF1ZW5jZSBwdXQgaXQgYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAvLyBpZiBub3QgcHV0IGl0IGF0IHRoZSBlbmRcbiAgICAgICAgLy9cbiAgICAgICAgLy8gdGhpcyBpcyBpbXBvcnRhbnQgYmVjYXVzZSB0aGUgd2F5IHRoZXNlIGFyZSBwcm9jZXNzZWQgZXhwZWN0c1xuICAgICAgICAvLyB0aGUgc2VxdWVuY2Ugb25lcyB0byBjb21lIGZpcnN0XG4gICAgICAgIF9jYWxsYmFja3Nba2V5XVtzZXF1ZW5jZV9uYW1lID8gJ3Vuc2hpZnQnIDogJ3B1c2gnXSh7XG4gICAgICAgICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICAgICAgICBtb2RpZmllcnM6IG1vZGlmaWVycyxcbiAgICAgICAgICAgIGFjdGlvbjogYWN0aW9uLFxuICAgICAgICAgICAgc2VxOiBzZXF1ZW5jZV9uYW1lLFxuICAgICAgICAgICAgbGV2ZWw6IGxldmVsLFxuICAgICAgICAgICAgY29tYm86IGNvbWJpbmF0aW9uXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGJpbmRzIG11bHRpcGxlIGNvbWJpbmF0aW9ucyB0byB0aGUgc2FtZSBjYWxsYmFja1xuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gY29tYmluYXRpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3x1bmRlZmluZWR9IGFjdGlvblxuICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfYmluZE11bHRpcGxlKGNvbWJpbmF0aW9ucywgY2FsbGJhY2ssIGFjdGlvbikge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbWJpbmF0aW9ucy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgX2JpbmRTaW5nbGUoY29tYmluYXRpb25zW2ldLCBjYWxsYmFjaywgYWN0aW9uKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIHN0YXJ0IVxuICAgIF9hZGRFdmVudChkb2N1bWVudCwgJ2tleXByZXNzJywgX2hhbmRsZUtleSk7XG4gICAgX2FkZEV2ZW50KGRvY3VtZW50LCAna2V5ZG93bicsIF9oYW5kbGVLZXkpO1xuICAgIF9hZGRFdmVudChkb2N1bWVudCwgJ2tleXVwJywgX2hhbmRsZUtleSk7XG5cbiAgICB2YXIgTW91c2V0cmFwID0ge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBiaW5kcyBhbiBldmVudCB0byBtb3VzZXRyYXBcbiAgICAgICAgICpcbiAgICAgICAgICogY2FuIGJlIGEgc2luZ2xlIGtleSwgYSBjb21iaW5hdGlvbiBvZiBrZXlzIHNlcGFyYXRlZCB3aXRoICssXG4gICAgICAgICAqIGFuIGFycmF5IG9mIGtleXMsIG9yIGEgc2VxdWVuY2Ugb2Yga2V5cyBzZXBhcmF0ZWQgYnkgc3BhY2VzXG4gICAgICAgICAqXG4gICAgICAgICAqIGJlIHN1cmUgdG8gbGlzdCB0aGUgbW9kaWZpZXIga2V5cyBmaXJzdCB0byBtYWtlIHN1cmUgdGhhdCB0aGVcbiAgICAgICAgICogY29ycmVjdCBrZXkgZW5kcyB1cCBnZXR0aW5nIGJvdW5kICh0aGUgbGFzdCBrZXkgaW4gdGhlIHBhdHRlcm4pXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfEFycmF5fSBrZXlzXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nPX0gYWN0aW9uIC0gJ2tleXByZXNzJywgJ2tleWRvd24nLCBvciAna2V5dXAnXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgIGJpbmQ6IGZ1bmN0aW9uKGtleXMsIGNhbGxiYWNrLCBhY3Rpb24pIHtcbiAgICAgICAgICAgIF9iaW5kTXVsdGlwbGUoa2V5cyBpbnN0YW5jZW9mIEFycmF5ID8ga2V5cyA6IFtrZXlzXSwgY2FsbGJhY2ssIGFjdGlvbik7XG4gICAgICAgICAgICBfZGlyZWN0X21hcFtrZXlzICsgJzonICsgYWN0aW9uXSA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHVuYmluZHMgYW4gZXZlbnQgdG8gbW91c2V0cmFwXG4gICAgICAgICAqXG4gICAgICAgICAqIHRoZSB1bmJpbmRpbmcgc2V0cyB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHNwZWNpZmllZCBrZXkgY29tYm9cbiAgICAgICAgICogdG8gYW4gZW1wdHkgZnVuY3Rpb24gYW5kIGRlbGV0ZXMgdGhlIGNvcnJlc3BvbmRpbmcga2V5IGluIHRoZVxuICAgICAgICAgKiBfZGlyZWN0X21hcCBkaWN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiB0aGUga2V5Y29tYm8rYWN0aW9uIGhhcyB0byBiZSBleGFjdGx5IHRoZSBzYW1lIGFzXG4gICAgICAgICAqIGl0IHdhcyBkZWZpbmVkIGluIHRoZSBiaW5kIG1ldGhvZFxuICAgICAgICAgKlxuICAgICAgICAgKiBUT0RPOiBhY3R1YWxseSByZW1vdmUgdGhpcyBmcm9tIHRoZSBfY2FsbGJhY2tzIGRpY3Rpb25hcnkgaW5zdGVhZFxuICAgICAgICAgKiBvZiBiaW5kaW5nIGFuIGVtcHR5IGZ1bmN0aW9uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfEFycmF5fSBrZXlzXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb25cbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgdW5iaW5kOiBmdW5jdGlvbihrZXlzLCBhY3Rpb24pIHtcbiAgICAgICAgICAgIGlmIChfZGlyZWN0X21hcFtrZXlzICsgJzonICsgYWN0aW9uXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBfZGlyZWN0X21hcFtrZXlzICsgJzonICsgYWN0aW9uXTtcbiAgICAgICAgICAgICAgICB0aGlzLmJpbmQoa2V5cywgZnVuY3Rpb24oKSB7fSwgYWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiB0cmlnZ2VycyBhbiBldmVudCB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gYm91bmRcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGtleXNcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmc9fSBhY3Rpb25cbiAgICAgICAgICogQHJldHVybnMgdm9pZFxuICAgICAgICAgKi9cbiAgICAgICAgdHJpZ2dlcjogZnVuY3Rpb24oa2V5cywgYWN0aW9uKSB7XG4gICAgICAgICAgICBfZGlyZWN0X21hcFtrZXlzICsgJzonICsgYWN0aW9uXSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHJlc2V0cyB0aGUgbGlicmFyeSBiYWNrIHRvIGl0cyBpbml0aWFsIHN0YXRlLiAgdGhpcyBpcyB1c2VmdWxcbiAgICAgICAgICogaWYgeW91IHdhbnQgdG8gY2xlYXIgb3V0IHRoZSBjdXJyZW50IGtleWJvYXJkIHNob3J0Y3V0cyBhbmQgYmluZFxuICAgICAgICAgKiBuZXcgb25lcyAtIGZvciBleGFtcGxlIGlmIHlvdSBzd2l0Y2ggdG8gYW5vdGhlciBwYWdlXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm5zIHZvaWRcbiAgICAgICAgICovXG4gICAgICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF9jYWxsYmFja3MgPSB7fTtcbiAgICAgICAgICAgIF9kaXJlY3RfbWFwID0ge307XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgIC8qKlxuICAgICAgICAqIHNob3VsZCB3ZSBzdG9wIHRoaXMgZXZlbnQgYmVmb3JlIGZpcmluZyBvZmYgY2FsbGJhY2tzXG4gICAgICAgICpcbiAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICAgICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50XG4gICAgICAgICogQHJldHVybiB7Ym9vbGVhbn1cbiAgICAgICAgKi9cbiAgICAgICAgc3RvcENhbGxiYWNrOiBmdW5jdGlvbihlLCBlbGVtZW50KSB7XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZSBlbGVtZW50IGhhcyB0aGUgY2xhc3MgXCJtb3VzZXRyYXBcIiB0aGVuIG5vIG5lZWQgdG8gc3RvcFxuICAgICAgICAgICAgaWYgKCgnICcgKyBlbGVtZW50LmNsYXNzTmFtZSArICcgJykuaW5kZXhPZignIG1vdXNldHJhcCAnKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzdG9wIGZvciBpbnB1dCwgc2VsZWN0LCBhbmQgdGV4dGFyZWFcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50LnRhZ05hbWUgPT0gJ0lOUFVUJyB8fCBlbGVtZW50LnRhZ05hbWUgPT0gJ1NFTEVDVCcgfHwgZWxlbWVudC50YWdOYW1lID09ICdURVhUQVJFQScgfHwgKGVsZW1lbnQuY29udGVudEVkaXRhYmxlICYmIGVsZW1lbnQuY29udGVudEVkaXRhYmxlID09ICd0cnVlJyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gZXhwb3NlIG1vdXNldHJhcCB0byB0aGUgZ2xvYmFsIG9iamVjdFxuICAgIHdpbmRvdy5Nb3VzZXRyYXAgPSBNb3VzZXRyYXA7XG5cbiAgICAvLyBleHBvc2UgbW91c2V0cmFwIGFzIGFuIEFNRCBtb2R1bGVcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKCdtb3VzZXRyYXAnLCBmdW5jdGlvbigpIHsgcmV0dXJuIE1vdXNldHJhcDsgfSk7XG4gICAgfVxuICAgIC8vIGJyb3dzZXJpZnkgc3VwcG9ydFxuICAgIGlmKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gTW91c2V0cmFwO1xuICAgIH1cbn0pICgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAgIHZhciByb290ID0gdGhpcztcbiAgICB2YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXHR2YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblx0dmFyIGludGVydmFsUGFyc2VyID0gLyhbMC05XFwuXSspKG1zfHN8bXxoKT8vO1xuXHR2YXIgcm9vdCA9IGdsb2JhbCB8fCB3aW5kb3c7XG5cblx0Ly8gTGlsIGJpdCBvZiB1c2VmdWwgcG9seWZpbGwuLi5cblx0aWYgKHR5cGVvZihGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMpID09PSAndW5kZWZpbmVkJykge1xuXHRcdEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyA9IGZ1bmN0aW9uKHBhcmVudCkge1xuXHRcdFx0dGhpcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUpO1xuXHRcdH07XG5cdH1cblxuXHRpZiAodHlwZW9mKEFycmF5LnByb3RvdHlwZS5yZW1vdmVPbmUpID09PSAndW5kZWZpbmVkJykge1xuXHRcdEFycmF5LnByb3RvdHlwZS5yZW1vdmVPbmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB3aGF0LCBhID0gYXJndW1lbnRzLCBMID0gYS5sZW5ndGgsIGF4O1xuXHRcdFx0d2hpbGUgKEwgJiYgdGhpcy5sZW5ndGgpIHtcblx0XHRcdFx0d2hhdCA9IGFbLS1MXTtcblx0XHRcdFx0d2hpbGUgKChheCA9IHRoaXMuaW5kZXhPZih3aGF0KSkgIT09IC0xKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuc3BsaWNlKGF4LCAxKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBncmVhdGVzdENvbW1vbkZhY3RvcihpbnRlcnZhbHMpIHtcblx0XHR2YXIgc3VtT2ZNb2R1bGkgPSAxO1xuXHRcdHZhciBpbnRlcnZhbCA9IF8ubWluKGludGVydmFscyk7XG5cdFx0d2hpbGUgKHN1bU9mTW9kdWxpICE9PSAwKSB7XG5cdFx0XHRzdW1PZk1vZHVsaSA9IF8ucmVkdWNlKGludGVydmFscywgZnVuY3Rpb24obWVtbywgaSl7IHJldHVybiBtZW1vICsgKGkgJSBpbnRlcnZhbCk7IH0sIDApO1xuXHRcdFx0aWYgKHN1bU9mTW9kdWxpICE9PSAwKSB7XG5cdFx0XHRcdGludGVydmFsIC09IDEwO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gaW50ZXJ2YWw7XG5cdH1cblxuXHRmdW5jdGlvbiBwYXJzZUV2ZW50KGUpIHtcblx0XHR2YXIgaW50ZXJ2YWxHcm91cHMgPSBpbnRlcnZhbFBhcnNlci5leGVjKGUpO1xuXHRcdGlmICghaW50ZXJ2YWxHcm91cHMpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSSBkb25cXCd0IHVuZGVyc3RhbmQgdGhhdCBwYXJ0aWN1bGFyIGludGVydmFsJyk7XG5cdFx0fVxuXHRcdHZhciBpbnRlcnZhbEFtb3VudCA9ICtpbnRlcnZhbEdyb3Vwc1sxXTtcblx0XHR2YXIgaW50ZXJ2YWxUeXBlID0gaW50ZXJ2YWxHcm91cHNbMl0gfHwgJ21zJztcblx0XHRpZiAoaW50ZXJ2YWxUeXBlID09PSAncycpIHtcblx0XHRcdGludGVydmFsQW1vdW50ID0gaW50ZXJ2YWxBbW91bnQgKiAxMDAwO1xuXHRcdH0gZWxzZSBpZiAoaW50ZXJ2YWxUeXBlID09PSAnbScpIHtcblx0XHRcdGludGVydmFsQW1vdW50ID0gaW50ZXJ2YWxBbW91bnQgKiAxMDAwICogNjA7XG5cdFx0fSBlbHNlIGlmIChpbnRlcnZhbFR5cGUgPT09ICdoJykge1xuXHRcdFx0aW50ZXJ2YWxBbW91bnQgPSBpbnRlcnZhbEFtb3VudCAqIDEwMDAgKiA2MCAqIDYwO1xuXHRcdH0gZWxzZSBpZiAoISFpbnRlcnZhbFR5cGUgJiYgaW50ZXJ2YWxUeXBlICE9PSAnbXMnKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1lvdSBjYW4gb25seSBzcGVjaWZ5IGludGVydmFscyBvZiBtcywgcywgbSwgb3IgaCcpO1xuXHRcdH1cblx0XHRpZiAoaW50ZXJ2YWxBbW91bnQgPCAxMCB8fCBpbnRlcnZhbEFtb3VudCAlIDEwICE9PSAwKSB7XG5cdFx0XHQvLyBXZSBvbmx5IGRlYWwgaW4gMTAncyBvZiBtaWxsaXNlY29uZHMgZm9yIHNpbXBsaWNpdHlcblx0XHRcdHRocm93IG5ldyBFcnJvcignWW91IGNhbiBvbmx5IHNwZWNpZnkgMTBzIG9mIG1pbGxpc2Vjb25kcywgdHJ1c3QgbWUgb24gdGhpcyBvbmUnKTtcblx0XHR9XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFtb3VudDppbnRlcnZhbEFtb3VudCxcblx0XHRcdHR5cGU6aW50ZXJ2YWxUeXBlXG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIEV2ZW50ZWRMb29wKCkge1xuXHRcdHRoaXMuaW50ZXJ2YWxJZCA9IHVuZGVmaW5lZDtcblx0XHR0aGlzLmludGVydmFsTGVuZ3RoID0gdW5kZWZpbmVkO1xuXHRcdHRoaXMuaW50ZXJ2YWxzVG9FbWl0ID0ge307XG5cdFx0dGhpcy5jdXJyZW50VGljayA9IDE7XG5cdFx0dGhpcy5tYXhUaWNrcyA9IDA7XG5cdFx0dGhpcy5saXN0ZW5pbmdGb3JGb2N1cyA9IGZhbHNlO1xuXG5cdFx0Ly8gUHJpdmF0ZSBtZXRob2Rcblx0XHR2YXIgZGV0ZXJtaW5lSW50ZXJ2YWxMZW5ndGggPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgcG90ZW50aWFsSW50ZXJ2YWxMZW5ndGggPSBncmVhdGVzdENvbW1vbkZhY3RvcihfLmtleXModGhpcy5pbnRlcnZhbHNUb0VtaXQpKTtcblx0XHRcdHZhciBjaGFuZ2VkID0gZmFsc2U7XG5cblx0XHRcdGlmICh0aGlzLmludGVydmFsTGVuZ3RoKSB7XG5cdFx0XHRcdGlmIChwb3RlbnRpYWxJbnRlcnZhbExlbmd0aCAhPT0gdGhpcy5pbnRlcnZhbExlbmd0aCkge1xuXHRcdFx0XHRcdC8vIExvb2tzIGxpa2Ugd2UgbmVlZCBhIG5ldyBpbnRlcnZhbFxuXHRcdFx0XHRcdHRoaXMuaW50ZXJ2YWxMZW5ndGggPSBwb3RlbnRpYWxJbnRlcnZhbExlbmd0aDtcblx0XHRcdFx0XHRjaGFuZ2VkID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5pbnRlcnZhbExlbmd0aCA9IHBvdGVudGlhbEludGVydmFsTGVuZ3RoO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLm1heFRpY2tzID0gXy5tYXgoXy5tYXAoXy5rZXlzKHRoaXMuaW50ZXJ2YWxzVG9FbWl0KSwgZnVuY3Rpb24oYSkgeyByZXR1cm4gK2E7IH0pKSAvIHRoaXMuaW50ZXJ2YWxMZW5ndGg7XG5cdFx0XHRyZXR1cm4gY2hhbmdlZDtcblx0XHR9LmJpbmQodGhpcyk7XG5cblx0XHR0aGlzLm9uKCduZXdMaXN0ZW5lcicsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRpZiAoZSA9PT0gJ3JlbW92ZUxpc3RlbmVyJyB8fCBlID09PSAnbmV3TGlzdGVuZXInKSByZXR1cm47IC8vIFdlIGRvbid0IGNhcmUgYWJvdXQgdGhhdCBvbmVcblx0XHRcdHZhciBpbnRlcnZhbEluZm8gPSBwYXJzZUV2ZW50KGUpO1xuXHRcdFx0dmFyIGludGVydmFsQW1vdW50ID0gaW50ZXJ2YWxJbmZvLmFtb3VudDtcblxuXHRcdFx0dGhpcy5pbnRlcnZhbHNUb0VtaXRbK2ludGVydmFsQW1vdW50XSA9IF8udW5pb24odGhpcy5pbnRlcnZhbHNUb0VtaXRbK2ludGVydmFsQW1vdW50XSB8fCBbXSwgW2VdKTtcblx0XHRcdFxuXHRcdFx0aWYgKGRldGVybWluZUludGVydmFsTGVuZ3RoKCkgJiYgdGhpcy5pc1N0YXJ0ZWQoKSkge1xuXHRcdFx0XHR0aGlzLnN0b3AoKS5zdGFydCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbigncmVtb3ZlTGlzdGVuZXInLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0aWYgKEV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50KHRoaXMsIGUpID4gMCkgcmV0dXJuO1xuXHRcdFx0dmFyIGludGVydmFsSW5mbyA9IHBhcnNlRXZlbnQoZSk7XG5cdFx0XHR2YXIgaW50ZXJ2YWxBbW91bnQgPSBpbnRlcnZhbEluZm8uYW1vdW50O1xuXG5cdFx0XHR2YXIgcmVtb3ZlZEV2ZW50ID0gdGhpcy5pbnRlcnZhbHNUb0VtaXRbK2ludGVydmFsQW1vdW50XS5yZW1vdmVPbmUoZSk7XG5cdFx0XHRpZiAodGhpcy5pbnRlcnZhbHNUb0VtaXRbK2ludGVydmFsQW1vdW50XS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0ZGVsZXRlIHRoaXMuaW50ZXJ2YWxzVG9FbWl0WytpbnRlcnZhbEFtb3VudF07XG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnRGV0ZXJtaW5pbmcgaW50ZXJ2YWwgbGVuZ3RoIGFmdGVyIHJlbW92YWwgb2YnLCByZW1vdmVkRXZlbnQpO1xuXHRcdFx0ZGV0ZXJtaW5lSW50ZXJ2YWxMZW5ndGgoKTtcblxuXHRcdFx0aWYgKGRldGVybWluZUludGVydmFsTGVuZ3RoKCkgJiYgdGhpcy5pc1N0YXJ0ZWQoKSkge1xuXHRcdFx0XHR0aGlzLnN0b3AoKS5zdGFydCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0RXZlbnRlZExvb3AuaW5oZXJpdHMoRXZlbnRFbWl0dGVyKTtcblxuXHQvLyBQdWJsaWMgbWV0aG9kc1xuXHRFdmVudGVkTG9vcC5wcm90b3R5cGUudGljayA9IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgbWlsbGlzZWNvbmRzID0gdGhpcy5jdXJyZW50VGljayAqIHRoaXMuaW50ZXJ2YWxMZW5ndGg7XG5cdFx0Xy5lYWNoKHRoaXMuaW50ZXJ2YWxzVG9FbWl0LCBmdW5jdGlvbiAoZXZlbnRzLCBrZXkpIHtcblx0XHRcdGlmIChtaWxsaXNlY29uZHMgJSBrZXkgPT09IDApIHtcblx0XHRcdFx0Xy5lYWNoKGV2ZW50cywgZnVuY3Rpb24oZSkgeyB0aGlzLmVtaXQoZSwgZSwga2V5KTsgfS5iaW5kKHRoaXMpKTtcblx0XHRcdH1cblx0XHR9LmJpbmQodGhpcykpO1xuXHRcdHRoaXMuY3VycmVudFRpY2sgKz0gMTtcblx0XHRpZiAodGhpcy5jdXJyZW50VGljayA+IHRoaXMubWF4VGlja3MpIHtcblx0XHRcdHRoaXMuY3VycmVudFRpY2sgPSAxO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRFdmVudGVkTG9vcC5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCF0aGlzLmludGVydmFsTGVuZ3RoKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1lvdSBoYXZlblxcJ3Qgc3BlY2lmaWVkIGFueSBpbnRlcnZhbCBjYWxsYmFja3MuIFVzZSBFdmVudGVkTG9vcC5vbihcXCc1MDBtc1xcJywgZnVuY3Rpb24gKCkgeyAuLi4gfSkgdG8gZG8gc28sIGFuZCB0aGVuIHlvdSBjYW4gc3RhcnQnKTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuaW50ZXJ2YWxJZCkge1xuXHRcdFx0cmV0dXJuIGNvbnNvbGUubG9nKCdObyBuZWVkIHRvIHN0YXJ0IHRoZSBsb29wIGFnYWluLCBpdFxcJ3MgYWxyZWFkeSBzdGFydGVkLicpO1xuXHRcdH1cblxuXHRcdHRoaXMuaW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMudGljay5iaW5kKHRoaXMpLCB0aGlzLmludGVydmFsTGVuZ3RoKTtcblxuXHRcdGlmIChyb290ICYmICF0aGlzLmxpc3RlbmluZ0ZvckZvY3VzICYmIHJvb3QuYWRkRXZlbnRMaXN0ZW5lcikge1xuXHRcdFx0cm9vdC5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aGlzLnN0YXJ0KCk7XG5cdFx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0XHRyb290LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhpcy5zdG9wKCk7XG5cdFx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0XHR0aGlzLmxpc3RlbmluZ0ZvckZvY3VzID0gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0RXZlbnRlZExvb3AucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG5cdFx0Y2xlYXJJbnRlcnZhbCh0aGlzLmludGVydmFsSWQpO1xuXHRcdHRoaXMuaW50ZXJ2YWxJZCA9IHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHRFdmVudGVkTG9vcC5wcm90b3R5cGUuaXNTdGFydGVkID0gZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiAhIXRoaXMuaW50ZXJ2YWxJZDtcblx0fTtcblxuXHRFdmVudGVkTG9vcC5wcm90b3R5cGUuZXZlcnkgPSBFdmVudGVkTG9vcC5wcm90b3R5cGUub247XG5cbiAgICAvLyBFeHBvcnQgdGhlIEV2ZW50ZWRMb29wIG9iamVjdCBmb3IgKipOb2RlLmpzKiogb3Igb3RoZXJcbiAgICAvLyBjb21tb25qcyBzeXN0ZW1zLiBPdGhlcndpc2UsIGFkZCBpdCBhcyBhIGdsb2JhbCBvYmplY3QgdG8gdGhlIHJvb3RcbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gRXZlbnRlZExvb3A7XG4gICAgICAgIH1cbiAgICAgICAgZXhwb3J0cy5FdmVudGVkTG9vcCA9IEV2ZW50ZWRMb29wO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgd2luZG93LkV2ZW50ZWRMb29wID0gRXZlbnRlZExvb3A7XG4gICAgfVxufSkuY2FsbCh0aGlzKTsiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgUiA9IHR5cGVvZiBSZWZsZWN0ID09PSAnb2JqZWN0JyA/IFJlZmxlY3QgOiBudWxsXG52YXIgUmVmbGVjdEFwcGx5ID0gUiAmJiB0eXBlb2YgUi5hcHBseSA9PT0gJ2Z1bmN0aW9uJ1xuICA/IFIuYXBwbHlcbiAgOiBmdW5jdGlvbiBSZWZsZWN0QXBwbHkodGFyZ2V0LCByZWNlaXZlciwgYXJncykge1xuICAgIHJldHVybiBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHkuY2FsbCh0YXJnZXQsIHJlY2VpdmVyLCBhcmdzKTtcbiAgfVxuXG52YXIgUmVmbGVjdE93bktleXNcbmlmIChSICYmIHR5cGVvZiBSLm93bktleXMgPT09ICdmdW5jdGlvbicpIHtcbiAgUmVmbGVjdE93bktleXMgPSBSLm93bktleXNcbn0gZWxzZSBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scykge1xuICBSZWZsZWN0T3duS2V5cyA9IGZ1bmN0aW9uIFJlZmxlY3RPd25LZXlzKHRhcmdldCkge1xuICAgIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0YXJnZXQpXG4gICAgICAuY29uY2F0KE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHModGFyZ2V0KSk7XG4gIH07XG59IGVsc2Uge1xuICBSZWZsZWN0T3duS2V5cyA9IGZ1bmN0aW9uIFJlZmxlY3RPd25LZXlzKHRhcmdldCkge1xuICAgIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0YXJnZXQpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBQcm9jZXNzRW1pdFdhcm5pbmcod2FybmluZykge1xuICBpZiAoY29uc29sZSAmJiBjb25zb2xlLndhcm4pIGNvbnNvbGUud2Fybih3YXJuaW5nKTtcbn1cblxudmFyIE51bWJlcklzTmFOID0gTnVtYmVyLmlzTmFOIHx8IGZ1bmN0aW9uIE51bWJlcklzTmFOKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPT0gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgRXZlbnRFbWl0dGVyLmluaXQuY2FsbCh0aGlzKTtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xubW9kdWxlLmV4cG9ydHMub25jZSA9IG9uY2U7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzQ291bnQgPSAwO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG52YXIgZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG5mdW5jdGlvbiBjaGVja0xpc3RlbmVyKGxpc3RlbmVyKSB7XG4gIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBGdW5jdGlvbi4gUmVjZWl2ZWQgdHlwZSAnICsgdHlwZW9mIGxpc3RlbmVyKTtcbiAgfVxufVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRXZlbnRFbWl0dGVyLCAnZGVmYXVsdE1heExpc3RlbmVycycsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZGVmYXVsdE1heExpc3RlbmVycztcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbihhcmcpIHtcbiAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ251bWJlcicgfHwgYXJnIDwgMCB8fCBOdW1iZXJJc05hTihhcmcpKSB7XG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIHZhbHVlIG9mIFwiZGVmYXVsdE1heExpc3RlbmVyc1wiIGlzIG91dCBvZiByYW5nZS4gSXQgbXVzdCBiZSBhIG5vbi1uZWdhdGl2ZSBudW1iZXIuIFJlY2VpdmVkICcgKyBhcmcgKyAnLicpO1xuICAgIH1cbiAgICBkZWZhdWx0TWF4TGlzdGVuZXJzID0gYXJnO1xuICB9XG59KTtcblxuRXZlbnRFbWl0dGVyLmluaXQgPSBmdW5jdGlvbigpIHtcblxuICBpZiAodGhpcy5fZXZlbnRzID09PSB1bmRlZmluZWQgfHxcbiAgICAgIHRoaXMuX2V2ZW50cyA9PT0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpLl9ldmVudHMpIHtcbiAgICB0aGlzLl9ldmVudHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgfVxuXG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59O1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbiBzZXRNYXhMaXN0ZW5lcnMobikge1xuICBpZiAodHlwZW9mIG4gIT09ICdudW1iZXInIHx8IG4gPCAwIHx8IE51bWJlcklzTmFOKG4pKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSB2YWx1ZSBvZiBcIm5cIiBpcyBvdXQgb2YgcmFuZ2UuIEl0IG11c3QgYmUgYSBub24tbmVnYXRpdmUgbnVtYmVyLiBSZWNlaXZlZCAnICsgbiArICcuJyk7XG4gIH1cbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5mdW5jdGlvbiBfZ2V0TWF4TGlzdGVuZXJzKHRoYXQpIHtcbiAgaWYgKHRoYXQuX21heExpc3RlbmVycyA9PT0gdW5kZWZpbmVkKVxuICAgIHJldHVybiBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgcmV0dXJuIHRoYXQuX21heExpc3RlbmVycztcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5nZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbiBnZXRNYXhMaXN0ZW5lcnMoKSB7XG4gIHJldHVybiBfZ2V0TWF4TGlzdGVuZXJzKHRoaXMpO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gZW1pdCh0eXBlKSB7XG4gIHZhciBhcmdzID0gW107XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSBhcmdzLnB1c2goYXJndW1lbnRzW2ldKTtcbiAgdmFyIGRvRXJyb3IgPSAodHlwZSA9PT0gJ2Vycm9yJyk7XG5cbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcbiAgaWYgKGV2ZW50cyAhPT0gdW5kZWZpbmVkKVxuICAgIGRvRXJyb3IgPSAoZG9FcnJvciAmJiBldmVudHMuZXJyb3IgPT09IHVuZGVmaW5lZCk7XG4gIGVsc2UgaWYgKCFkb0Vycm9yKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmIChkb0Vycm9yKSB7XG4gICAgdmFyIGVyO1xuICAgIGlmIChhcmdzLmxlbmd0aCA+IDApXG4gICAgICBlciA9IGFyZ3NbMF07XG4gICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIC8vIE5vdGU6IFRoZSBjb21tZW50cyBvbiB0aGUgYHRocm93YCBsaW5lcyBhcmUgaW50ZW50aW9uYWwsIHRoZXkgc2hvd1xuICAgICAgLy8gdXAgaW4gTm9kZSdzIG91dHB1dCBpZiB0aGlzIHJlc3VsdHMgaW4gYW4gdW5oYW5kbGVkIGV4Y2VwdGlvbi5cbiAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgIH1cbiAgICAvLyBBdCBsZWFzdCBnaXZlIHNvbWUga2luZCBvZiBjb250ZXh0IHRvIHRoZSB1c2VyXG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcignVW5oYW5kbGVkIGVycm9yLicgKyAoZXIgPyAnICgnICsgZXIubWVzc2FnZSArICcpJyA6ICcnKSk7XG4gICAgZXJyLmNvbnRleHQgPSBlcjtcbiAgICB0aHJvdyBlcnI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gIH1cblxuICB2YXIgaGFuZGxlciA9IGV2ZW50c1t0eXBlXTtcblxuICBpZiAoaGFuZGxlciA9PT0gdW5kZWZpbmVkKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICBSZWZsZWN0QXBwbHkoaGFuZGxlciwgdGhpcywgYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIFJlZmxlY3RBcHBseShsaXN0ZW5lcnNbaV0sIHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5mdW5jdGlvbiBfYWRkTGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBsaXN0ZW5lciwgcHJlcGVuZCkge1xuICB2YXIgbTtcbiAgdmFyIGV2ZW50cztcbiAgdmFyIGV4aXN0aW5nO1xuXG4gIGNoZWNrTGlzdGVuZXIobGlzdGVuZXIpO1xuXG4gIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzO1xuICBpZiAoZXZlbnRzID09PSB1bmRlZmluZWQpIHtcbiAgICBldmVudHMgPSB0YXJnZXQuX2V2ZW50cyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgdGFyZ2V0Ll9ldmVudHNDb3VudCA9IDA7XG4gIH0gZWxzZSB7XG4gICAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gICAgaWYgKGV2ZW50cy5uZXdMaXN0ZW5lciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0YXJnZXQuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgPyBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICAgICAgLy8gUmUtYXNzaWduIGBldmVudHNgIGJlY2F1c2UgYSBuZXdMaXN0ZW5lciBoYW5kbGVyIGNvdWxkIGhhdmUgY2F1c2VkIHRoZVxuICAgICAgLy8gdGhpcy5fZXZlbnRzIHRvIGJlIGFzc2lnbmVkIHRvIGEgbmV3IG9iamVjdFxuICAgICAgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG4gICAgfVxuICAgIGV4aXN0aW5nID0gZXZlbnRzW3R5cGVdO1xuICB9XG5cbiAgaWYgKGV4aXN0aW5nID09PSB1bmRlZmluZWQpIHtcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICBleGlzdGluZyA9IGV2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICAgICsrdGFyZ2V0Ll9ldmVudHNDb3VudDtcbiAgfSBlbHNlIHtcbiAgICBpZiAodHlwZW9mIGV4aXN0aW5nID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICAgIGV4aXN0aW5nID0gZXZlbnRzW3R5cGVdID1cbiAgICAgICAgcHJlcGVuZCA/IFtsaXN0ZW5lciwgZXhpc3RpbmddIDogW2V4aXN0aW5nLCBsaXN0ZW5lcl07XG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgfSBlbHNlIGlmIChwcmVwZW5kKSB7XG4gICAgICBleGlzdGluZy51bnNoaWZ0KGxpc3RlbmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhpc3RpbmcucHVzaChsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgICBtID0gX2dldE1heExpc3RlbmVycyh0YXJnZXQpO1xuICAgIGlmIChtID4gMCAmJiBleGlzdGluZy5sZW5ndGggPiBtICYmICFleGlzdGluZy53YXJuZWQpIHtcbiAgICAgIGV4aXN0aW5nLndhcm5lZCA9IHRydWU7XG4gICAgICAvLyBObyBlcnJvciBjb2RlIGZvciB0aGlzIHNpbmNlIGl0IGlzIGEgV2FybmluZ1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXJlc3RyaWN0ZWQtc3ludGF4XG4gICAgICB2YXIgdyA9IG5ldyBFcnJvcignUG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSBsZWFrIGRldGVjdGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3RpbmcubGVuZ3RoICsgJyAnICsgU3RyaW5nKHR5cGUpICsgJyBsaXN0ZW5lcnMgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICdhZGRlZC4gVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICdpbmNyZWFzZSBsaW1pdCcpO1xuICAgICAgdy5uYW1lID0gJ01heExpc3RlbmVyc0V4Y2VlZGVkV2FybmluZyc7XG4gICAgICB3LmVtaXR0ZXIgPSB0YXJnZXQ7XG4gICAgICB3LnR5cGUgPSB0eXBlO1xuICAgICAgdy5jb3VudCA9IGV4aXN0aW5nLmxlbmd0aDtcbiAgICAgIFByb2Nlc3NFbWl0V2FybmluZyh3KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGFyZ2V0O1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24gYWRkTGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgcmV0dXJuIF9hZGRMaXN0ZW5lcih0aGlzLCB0eXBlLCBsaXN0ZW5lciwgZmFsc2UpO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZExpc3RlbmVyID1cbiAgICBmdW5jdGlvbiBwcmVwZW5kTGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgICAgIHJldHVybiBfYWRkTGlzdGVuZXIodGhpcywgdHlwZSwgbGlzdGVuZXIsIHRydWUpO1xuICAgIH07XG5cbmZ1bmN0aW9uIG9uY2VXcmFwcGVyKCkge1xuICBpZiAoIXRoaXMuZmlyZWQpIHtcbiAgICB0aGlzLnRhcmdldC5yZW1vdmVMaXN0ZW5lcih0aGlzLnR5cGUsIHRoaXMud3JhcEZuKTtcbiAgICB0aGlzLmZpcmVkID0gdHJ1ZTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHJldHVybiB0aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQpO1xuICAgIHJldHVybiB0aGlzLmxpc3RlbmVyLmFwcGx5KHRoaXMudGFyZ2V0LCBhcmd1bWVudHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9vbmNlV3JhcCh0YXJnZXQsIHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBzdGF0ZSA9IHsgZmlyZWQ6IGZhbHNlLCB3cmFwRm46IHVuZGVmaW5lZCwgdGFyZ2V0OiB0YXJnZXQsIHR5cGU6IHR5cGUsIGxpc3RlbmVyOiBsaXN0ZW5lciB9O1xuICB2YXIgd3JhcHBlZCA9IG9uY2VXcmFwcGVyLmJpbmQoc3RhdGUpO1xuICB3cmFwcGVkLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHN0YXRlLndyYXBGbiA9IHdyYXBwZWQ7XG4gIHJldHVybiB3cmFwcGVkO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiBvbmNlKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGNoZWNrTGlzdGVuZXIobGlzdGVuZXIpO1xuICB0aGlzLm9uKHR5cGUsIF9vbmNlV3JhcCh0aGlzLCB0eXBlLCBsaXN0ZW5lcikpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZE9uY2VMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcHJlcGVuZE9uY2VMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgICAgY2hlY2tMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICB0aGlzLnByZXBlbmRMaXN0ZW5lcih0eXBlLCBfb25jZVdyYXAodGhpcywgdHlwZSwgbGlzdGVuZXIpKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbi8vIEVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZiBhbmQgb25seSBpZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID1cbiAgICBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgICAgdmFyIGxpc3QsIGV2ZW50cywgcG9zaXRpb24sIGksIG9yaWdpbmFsTGlzdGVuZXI7XG5cbiAgICAgIGNoZWNrTGlzdGVuZXIobGlzdGVuZXIpO1xuXG4gICAgICBldmVudHMgPSB0aGlzLl9ldmVudHM7XG4gICAgICBpZiAoZXZlbnRzID09PSB1bmRlZmluZWQpXG4gICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgICBsaXN0ID0gZXZlbnRzW3R5cGVdO1xuICAgICAgaWYgKGxpc3QgPT09IHVuZGVmaW5lZClcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fCBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikge1xuICAgICAgICBpZiAoLS10aGlzLl9ldmVudHNDb3VudCA9PT0gMClcbiAgICAgICAgICB0aGlzLl9ldmVudHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgZXZlbnRzW3R5cGVdO1xuICAgICAgICAgIGlmIChldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdC5saXN0ZW5lciB8fCBsaXN0ZW5lcik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxpc3QgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcG9zaXRpb24gPSAtMTtcblxuICAgICAgICBmb3IgKGkgPSBsaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8IGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB7XG4gICAgICAgICAgICBvcmlnaW5hbExpc3RlbmVyID0gbGlzdFtpXS5saXN0ZW5lcjtcbiAgICAgICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uID09PSAwKVxuICAgICAgICAgIGxpc3Quc2hpZnQoKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgc3BsaWNlT25lKGxpc3QsIHBvc2l0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSlcbiAgICAgICAgICBldmVudHNbdHlwZV0gPSBsaXN0WzBdO1xuXG4gICAgICAgIGlmIChldmVudHMucmVtb3ZlTGlzdGVuZXIgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgb3JpZ2luYWxMaXN0ZW5lciB8fCBsaXN0ZW5lcik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPVxuICAgIGZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycyh0eXBlKSB7XG4gICAgICB2YXIgbGlzdGVuZXJzLCBldmVudHMsIGk7XG5cbiAgICAgIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcbiAgICAgIGlmIChldmVudHMgPT09IHVuZGVmaW5lZClcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgICAgIGlmIChldmVudHMucmVtb3ZlTGlzdGVuZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMuX2V2ZW50cyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzQ291bnQgPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKGV2ZW50c1t0eXBlXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKC0tdGhpcy5fZXZlbnRzQ291bnQgPT09IDApXG4gICAgICAgICAgICB0aGlzLl9ldmVudHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGRlbGV0ZSBldmVudHNbdHlwZV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhldmVudHMpO1xuICAgICAgICB2YXIga2V5O1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICAgICAgdGhpcy5fZXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgdGhpcy5fZXZlbnRzQ291bnQgPSAwO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgbGlzdGVuZXJzID0gZXZlbnRzW3R5cGVdO1xuXG4gICAgICBpZiAodHlwZW9mIGxpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gICAgICB9IGVsc2UgaWYgKGxpc3RlbmVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIExJRk8gb3JkZXJcbiAgICAgICAgZm9yIChpID0gbGlzdGVuZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbmZ1bmN0aW9uIF9saXN0ZW5lcnModGFyZ2V0LCB0eXBlLCB1bndyYXApIHtcbiAgdmFyIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzO1xuXG4gIGlmIChldmVudHMgPT09IHVuZGVmaW5lZClcbiAgICByZXR1cm4gW107XG5cbiAgdmFyIGV2bGlzdGVuZXIgPSBldmVudHNbdHlwZV07XG4gIGlmIChldmxpc3RlbmVyID09PSB1bmRlZmluZWQpXG4gICAgcmV0dXJuIFtdO1xuXG4gIGlmICh0eXBlb2YgZXZsaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJylcbiAgICByZXR1cm4gdW53cmFwID8gW2V2bGlzdGVuZXIubGlzdGVuZXIgfHwgZXZsaXN0ZW5lcl0gOiBbZXZsaXN0ZW5lcl07XG5cbiAgcmV0dXJuIHVud3JhcCA/XG4gICAgdW53cmFwTGlzdGVuZXJzKGV2bGlzdGVuZXIpIDogYXJyYXlDbG9uZShldmxpc3RlbmVyLCBldmxpc3RlbmVyLmxlbmd0aCk7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24gbGlzdGVuZXJzKHR5cGUpIHtcbiAgcmV0dXJuIF9saXN0ZW5lcnModGhpcywgdHlwZSwgdHJ1ZSk7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJhd0xpc3RlbmVycyA9IGZ1bmN0aW9uIHJhd0xpc3RlbmVycyh0eXBlKSB7XG4gIHJldHVybiBfbGlzdGVuZXJzKHRoaXMsIHR5cGUsIGZhbHNlKTtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICBpZiAodHlwZW9mIGVtaXR0ZXIubGlzdGVuZXJDb3VudCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBlbWl0dGVyLmxpc3RlbmVyQ291bnQodHlwZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGxpc3RlbmVyQ291bnQuY2FsbChlbWl0dGVyLCB0eXBlKTtcbiAgfVxufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50ID0gbGlzdGVuZXJDb3VudDtcbmZ1bmN0aW9uIGxpc3RlbmVyQ291bnQodHlwZSkge1xuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzO1xuXG4gIGlmIChldmVudHMgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBldmxpc3RlbmVyID0gZXZlbnRzW3R5cGVdO1xuXG4gICAgaWYgKHR5cGVvZiBldmxpc3RlbmVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKGV2bGlzdGVuZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGV2bGlzdGVuZXIubGVuZ3RoO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiAwO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXMgPSBmdW5jdGlvbiBldmVudE5hbWVzKCkge1xuICByZXR1cm4gdGhpcy5fZXZlbnRzQ291bnQgPiAwID8gUmVmbGVjdE93bktleXModGhpcy5fZXZlbnRzKSA6IFtdO1xufTtcblxuZnVuY3Rpb24gYXJyYXlDbG9uZShhcnIsIG4pIHtcbiAgdmFyIGNvcHkgPSBuZXcgQXJyYXkobik7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgKytpKVxuICAgIGNvcHlbaV0gPSBhcnJbaV07XG4gIHJldHVybiBjb3B5O1xufVxuXG5mdW5jdGlvbiBzcGxpY2VPbmUobGlzdCwgaW5kZXgpIHtcbiAgZm9yICg7IGluZGV4ICsgMSA8IGxpc3QubGVuZ3RoOyBpbmRleCsrKVxuICAgIGxpc3RbaW5kZXhdID0gbGlzdFtpbmRleCArIDFdO1xuICBsaXN0LnBvcCgpO1xufVxuXG5mdW5jdGlvbiB1bndyYXBMaXN0ZW5lcnMoYXJyKSB7XG4gIHZhciByZXQgPSBuZXcgQXJyYXkoYXJyLmxlbmd0aCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcmV0Lmxlbmd0aDsgKytpKSB7XG4gICAgcmV0W2ldID0gYXJyW2ldLmxpc3RlbmVyIHx8IGFycltpXTtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBvbmNlKGVtaXR0ZXIsIG5hbWUpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBmdW5jdGlvbiBlcnJvckxpc3RlbmVyKGVycikge1xuICAgICAgZW1pdHRlci5yZW1vdmVMaXN0ZW5lcihuYW1lLCByZXNvbHZlcik7XG4gICAgICByZWplY3QoZXJyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNvbHZlcigpIHtcbiAgICAgIGlmICh0eXBlb2YgZW1pdHRlci5yZW1vdmVMaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBlbWl0dGVyLnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIGVycm9yTGlzdGVuZXIpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZShbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuICAgIH07XG5cbiAgICBldmVudFRhcmdldEFnbm9zdGljQWRkTGlzdGVuZXIoZW1pdHRlciwgbmFtZSwgcmVzb2x2ZXIsIHsgb25jZTogdHJ1ZSB9KTtcbiAgICBpZiAobmFtZSAhPT0gJ2Vycm9yJykge1xuICAgICAgYWRkRXJyb3JIYW5kbGVySWZFdmVudEVtaXR0ZXIoZW1pdHRlciwgZXJyb3JMaXN0ZW5lciwgeyBvbmNlOiB0cnVlIH0pO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFkZEVycm9ySGFuZGxlcklmRXZlbnRFbWl0dGVyKGVtaXR0ZXIsIGhhbmRsZXIsIGZsYWdzKSB7XG4gIGlmICh0eXBlb2YgZW1pdHRlci5vbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGV2ZW50VGFyZ2V0QWdub3N0aWNBZGRMaXN0ZW5lcihlbWl0dGVyLCAnZXJyb3InLCBoYW5kbGVyLCBmbGFncyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXZlbnRUYXJnZXRBZ25vc3RpY0FkZExpc3RlbmVyKGVtaXR0ZXIsIG5hbWUsIGxpc3RlbmVyLCBmbGFncykge1xuICBpZiAodHlwZW9mIGVtaXR0ZXIub24gPT09ICdmdW5jdGlvbicpIHtcbiAgICBpZiAoZmxhZ3Mub25jZSkge1xuICAgICAgZW1pdHRlci5vbmNlKG5hbWUsIGxpc3RlbmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZW1pdHRlci5vbihuYW1lLCBsaXN0ZW5lcik7XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiBlbWl0dGVyLmFkZEV2ZW50TGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyBFdmVudFRhcmdldCBkb2VzIG5vdCBoYXZlIGBlcnJvcmAgZXZlbnQgc2VtYW50aWNzIGxpa2UgTm9kZVxuICAgIC8vIEV2ZW50RW1pdHRlcnMsIHdlIGRvIG5vdCBsaXN0ZW4gZm9yIGBlcnJvcmAgZXZlbnRzIGhlcmUuXG4gICAgZW1pdHRlci5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGZ1bmN0aW9uIHdyYXBMaXN0ZW5lcihhcmcpIHtcbiAgICAgIC8vIElFIGRvZXMgbm90IGhhdmUgYnVpbHRpbiBgeyBvbmNlOiB0cnVlIH1gIHN1cHBvcnQgc28gd2VcbiAgICAgIC8vIGhhdmUgdG8gZG8gaXQgbWFudWFsbHkuXG4gICAgICBpZiAoZmxhZ3Mub25jZSkge1xuICAgICAgICBlbWl0dGVyLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgd3JhcExpc3RlbmVyKTtcbiAgICAgIH1cbiAgICAgIGxpc3RlbmVyKGFyZyk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiZW1pdHRlclwiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBFdmVudEVtaXR0ZXIuIFJlY2VpdmVkIHR5cGUgJyArIHR5cGVvZiBlbWl0dGVyKTtcbiAgfVxufVxuIiwiLy8gICAgIFVuZGVyc2NvcmUuanMgMS42LjBcbi8vICAgICBodHRwOi8vdW5kZXJzY29yZWpzLm9yZ1xuLy8gICAgIChjKSAyMDA5LTIwMTQgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbi8vICAgICBVbmRlcnNjb3JlIG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuXG4oZnVuY3Rpb24oKSB7XG5cbiAgLy8gQmFzZWxpbmUgc2V0dXBcbiAgLy8gLS0tLS0tLS0tLS0tLS1cblxuICAvLyBFc3RhYmxpc2ggdGhlIHJvb3Qgb2JqZWN0LCBgd2luZG93YCBpbiB0aGUgYnJvd3Nlciwgb3IgYGV4cG9ydHNgIG9uIHRoZSBzZXJ2ZXIuXG4gIHZhciByb290ID0gdGhpcztcblxuICAvLyBTYXZlIHRoZSBwcmV2aW91cyB2YWx1ZSBvZiB0aGUgYF9gIHZhcmlhYmxlLlxuICB2YXIgcHJldmlvdXNVbmRlcnNjb3JlID0gcm9vdC5fO1xuXG4gIC8vIEVzdGFibGlzaCB0aGUgb2JqZWN0IHRoYXQgZ2V0cyByZXR1cm5lZCB0byBicmVhayBvdXQgb2YgYSBsb29wIGl0ZXJhdGlvbi5cbiAgdmFyIGJyZWFrZXIgPSB7fTtcblxuICAvLyBTYXZlIGJ5dGVzIGluIHRoZSBtaW5pZmllZCAoYnV0IG5vdCBnemlwcGVkKSB2ZXJzaW9uOlxuICB2YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZSwgT2JqUHJvdG8gPSBPYmplY3QucHJvdG90eXBlLCBGdW5jUHJvdG8gPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgLy8gQ3JlYXRlIHF1aWNrIHJlZmVyZW5jZSB2YXJpYWJsZXMgZm9yIHNwZWVkIGFjY2VzcyB0byBjb3JlIHByb3RvdHlwZXMuXG4gIHZhclxuICAgIHB1c2ggICAgICAgICAgICAgPSBBcnJheVByb3RvLnB1c2gsXG4gICAgc2xpY2UgICAgICAgICAgICA9IEFycmF5UHJvdG8uc2xpY2UsXG4gICAgY29uY2F0ICAgICAgICAgICA9IEFycmF5UHJvdG8uY29uY2F0LFxuICAgIHRvU3RyaW5nICAgICAgICAgPSBPYmpQcm90by50b1N0cmluZyxcbiAgICBoYXNPd25Qcm9wZXJ0eSAgID0gT2JqUHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbiAgLy8gQWxsICoqRUNNQVNjcmlwdCA1KiogbmF0aXZlIGZ1bmN0aW9uIGltcGxlbWVudGF0aW9ucyB0aGF0IHdlIGhvcGUgdG8gdXNlXG4gIC8vIGFyZSBkZWNsYXJlZCBoZXJlLlxuICB2YXJcbiAgICBuYXRpdmVGb3JFYWNoICAgICAgPSBBcnJheVByb3RvLmZvckVhY2gsXG4gICAgbmF0aXZlTWFwICAgICAgICAgID0gQXJyYXlQcm90by5tYXAsXG4gICAgbmF0aXZlUmVkdWNlICAgICAgID0gQXJyYXlQcm90by5yZWR1Y2UsXG4gICAgbmF0aXZlUmVkdWNlUmlnaHQgID0gQXJyYXlQcm90by5yZWR1Y2VSaWdodCxcbiAgICBuYXRpdmVGaWx0ZXIgICAgICAgPSBBcnJheVByb3RvLmZpbHRlcixcbiAgICBuYXRpdmVFdmVyeSAgICAgICAgPSBBcnJheVByb3RvLmV2ZXJ5LFxuICAgIG5hdGl2ZVNvbWUgICAgICAgICA9IEFycmF5UHJvdG8uc29tZSxcbiAgICBuYXRpdmVJbmRleE9mICAgICAgPSBBcnJheVByb3RvLmluZGV4T2YsXG4gICAgbmF0aXZlTGFzdEluZGV4T2YgID0gQXJyYXlQcm90by5sYXN0SW5kZXhPZixcbiAgICBuYXRpdmVJc0FycmF5ICAgICAgPSBBcnJheS5pc0FycmF5LFxuICAgIG5hdGl2ZUtleXMgICAgICAgICA9IE9iamVjdC5rZXlzLFxuICAgIG5hdGl2ZUJpbmQgICAgICAgICA9IEZ1bmNQcm90by5iaW5kO1xuXG4gIC8vIENyZWF0ZSBhIHNhZmUgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgdXNlIGJlbG93LlxuICB2YXIgXyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBfKSByZXR1cm4gb2JqO1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBfKSkgcmV0dXJuIG5ldyBfKG9iaik7XG4gICAgdGhpcy5fd3JhcHBlZCA9IG9iajtcbiAgfTtcblxuICAvLyBFeHBvcnQgdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciAqKk5vZGUuanMqKiwgd2l0aFxuICAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBmb3IgdGhlIG9sZCBgcmVxdWlyZSgpYCBBUEkuIElmIHdlJ3JlIGluXG4gIC8vIHRoZSBicm93c2VyLCBhZGQgYF9gIGFzIGEgZ2xvYmFsIG9iamVjdCB2aWEgYSBzdHJpbmcgaWRlbnRpZmllcixcbiAgLy8gZm9yIENsb3N1cmUgQ29tcGlsZXIgXCJhZHZhbmNlZFwiIG1vZGUuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IF87XG4gICAgfVxuICAgIGV4cG9ydHMuXyA9IF87XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5fID0gXztcbiAgfVxuXG4gIC8vIEN1cnJlbnQgdmVyc2lvbi5cbiAgXy5WRVJTSU9OID0gJzEuNi4wJztcblxuICAvLyBDb2xsZWN0aW9uIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFRoZSBjb3JuZXJzdG9uZSwgYW4gYGVhY2hgIGltcGxlbWVudGF0aW9uLCBha2EgYGZvckVhY2hgLlxuICAvLyBIYW5kbGVzIG9iamVjdHMgd2l0aCB0aGUgYnVpbHQtaW4gYGZvckVhY2hgLCBhcnJheXMsIGFuZCByYXcgb2JqZWN0cy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGZvckVhY2hgIGlmIGF2YWlsYWJsZS5cbiAgdmFyIGVhY2ggPSBfLmVhY2ggPSBfLmZvckVhY2ggPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gb2JqO1xuICAgIGlmIChuYXRpdmVGb3JFYWNoICYmIG9iai5mb3JFYWNoID09PSBuYXRpdmVGb3JFYWNoKSB7XG4gICAgICBvYmouZm9yRWFjaChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpbaV0sIGksIG9iaikgPT09IGJyZWFrZXIpIHJldHVybjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtrZXlzW2ldXSwga2V5c1tpXSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgcmVzdWx0cyBvZiBhcHBseWluZyB0aGUgaXRlcmF0b3IgdG8gZWFjaCBlbGVtZW50LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgbWFwYCBpZiBhdmFpbGFibGUuXG4gIF8ubWFwID0gXy5jb2xsZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBpZiAobmF0aXZlTWFwICYmIG9iai5tYXAgPT09IG5hdGl2ZU1hcCkgcmV0dXJuIG9iai5tYXAoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJlc3VsdHMucHVzaChpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIHZhciByZWR1Y2VFcnJvciA9ICdSZWR1Y2Ugb2YgZW1wdHkgYXJyYXkgd2l0aCBubyBpbml0aWFsIHZhbHVlJztcblxuICAvLyAqKlJlZHVjZSoqIGJ1aWxkcyB1cCBhIHNpbmdsZSByZXN1bHQgZnJvbSBhIGxpc3Qgb2YgdmFsdWVzLCBha2EgYGluamVjdGAsXG4gIC8vIG9yIGBmb2xkbGAuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGByZWR1Y2VgIGlmIGF2YWlsYWJsZS5cbiAgXy5yZWR1Y2UgPSBfLmZvbGRsID0gXy5pbmplY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGlmIChuYXRpdmVSZWR1Y2UgJiYgb2JqLnJlZHVjZSA9PT0gbmF0aXZlUmVkdWNlKSB7XG4gICAgICBpZiAoY29udGV4dCkgaXRlcmF0b3IgPSBfLmJpbmQoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGluaXRpYWwgPyBvYmoucmVkdWNlKGl0ZXJhdG9yLCBtZW1vKSA6IG9iai5yZWR1Y2UoaXRlcmF0b3IpO1xuICAgIH1cbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoIWluaXRpYWwpIHtcbiAgICAgICAgbWVtbyA9IHZhbHVlO1xuICAgICAgICBpbml0aWFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG1lbW8sIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFpbml0aWFsKSB0aHJvdyBuZXcgVHlwZUVycm9yKHJlZHVjZUVycm9yKTtcbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBUaGUgcmlnaHQtYXNzb2NpYXRpdmUgdmVyc2lvbiBvZiByZWR1Y2UsIGFsc28ga25vd24gYXMgYGZvbGRyYC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHJlZHVjZVJpZ2h0YCBpZiBhdmFpbGFibGUuXG4gIF8ucmVkdWNlUmlnaHQgPSBfLmZvbGRyID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgbWVtbywgY29udGV4dCkge1xuICAgIHZhciBpbml0aWFsID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICBpZiAobmF0aXZlUmVkdWNlUmlnaHQgJiYgb2JqLnJlZHVjZVJpZ2h0ID09PSBuYXRpdmVSZWR1Y2VSaWdodCkge1xuICAgICAgaWYgKGNvbnRleHQpIGl0ZXJhdG9yID0gXy5iaW5kKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBpbml0aWFsID8gb2JqLnJlZHVjZVJpZ2h0KGl0ZXJhdG9yLCBtZW1vKSA6IG9iai5yZWR1Y2VSaWdodChpdGVyYXRvcik7XG4gICAgfVxuICAgIHZhciBsZW5ndGggPSBvYmoubGVuZ3RoO1xuICAgIGlmIChsZW5ndGggIT09ICtsZW5ndGgpIHtcbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgICBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB9XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaW5kZXggPSBrZXlzID8ga2V5c1stLWxlbmd0aF0gOiAtLWxlbmd0aDtcbiAgICAgIGlmICghaW5pdGlhbCkge1xuICAgICAgICBtZW1vID0gb2JqW2luZGV4XTtcbiAgICAgICAgaW5pdGlhbCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZW1vID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBtZW1vLCBvYmpbaW5kZXhdLCBpbmRleCwgbGlzdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFpbml0aWFsKSB0aHJvdyBuZXcgVHlwZUVycm9yKHJlZHVjZUVycm9yKTtcbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIGZpcnN0IHZhbHVlIHdoaWNoIHBhc3NlcyBhIHRydXRoIHRlc3QuIEFsaWFzZWQgYXMgYGRldGVjdGAuXG4gIF8uZmluZCA9IF8uZGV0ZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGFueShvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgdGhhdCBwYXNzIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGZpbHRlcmAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBzZWxlY3RgLlxuICBfLmZpbHRlciA9IF8uc2VsZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgaWYgKG5hdGl2ZUZpbHRlciAmJiBvYmouZmlsdGVyID09PSBuYXRpdmVGaWx0ZXIpIHJldHVybiBvYmouZmlsdGVyKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpIHJlc3VsdHMucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgZm9yIHdoaWNoIGEgdHJ1dGggdGVzdCBmYWlscy5cbiAgXy5yZWplY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuICFwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgIH0sIGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIGFsbCBvZiB0aGUgZWxlbWVudHMgbWF0Y2ggYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZXZlcnlgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgYWxsYC5cbiAgXy5ldmVyeSA9IF8uYWxsID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgfHwgKHByZWRpY2F0ZSA9IF8uaWRlbnRpdHkpO1xuICAgIHZhciByZXN1bHQgPSB0cnVlO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAobmF0aXZlRXZlcnkgJiYgb2JqLmV2ZXJ5ID09PSBuYXRpdmVFdmVyeSkgcmV0dXJuIG9iai5ldmVyeShwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmICghKHJlc3VsdCA9IHJlc3VsdCAmJiBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSkgcmV0dXJuIGJyZWFrZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuICEhcmVzdWx0O1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiBhdCBsZWFzdCBvbmUgZWxlbWVudCBpbiB0aGUgb2JqZWN0IG1hdGNoZXMgYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgc29tZWAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBhbnlgLlxuICB2YXIgYW55ID0gXy5zb21lID0gXy5hbnkgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSB8fCAocHJlZGljYXRlID0gXy5pZGVudGl0eSk7XG4gICAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAobmF0aXZlU29tZSAmJiBvYmouc29tZSA9PT0gbmF0aXZlU29tZSkgcmV0dXJuIG9iai5zb21lKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHJlc3VsdCB8fCAocmVzdWx0ID0gcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkpIHJldHVybiBicmVha2VyO1xuICAgIH0pO1xuICAgIHJldHVybiAhIXJlc3VsdDtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgdGhlIGFycmF5IG9yIG9iamVjdCBjb250YWlucyBhIGdpdmVuIHZhbHVlICh1c2luZyBgPT09YCkuXG4gIC8vIEFsaWFzZWQgYXMgYGluY2x1ZGVgLlxuICBfLmNvbnRhaW5zID0gXy5pbmNsdWRlID0gZnVuY3Rpb24ob2JqLCB0YXJnZXQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICBpZiAobmF0aXZlSW5kZXhPZiAmJiBvYmouaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIG9iai5pbmRleE9mKHRhcmdldCkgIT0gLTE7XG4gICAgcmV0dXJuIGFueShvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgPT09IHRhcmdldDtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBJbnZva2UgYSBtZXRob2QgKHdpdGggYXJndW1lbnRzKSBvbiBldmVyeSBpdGVtIGluIGEgY29sbGVjdGlvbi5cbiAgXy5pbnZva2UgPSBmdW5jdGlvbihvYmosIG1ldGhvZCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBpc0Z1bmMgPSBfLmlzRnVuY3Rpb24obWV0aG9kKTtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIChpc0Z1bmMgPyBtZXRob2QgOiB2YWx1ZVttZXRob2RdKS5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgbWFwYDogZmV0Y2hpbmcgYSBwcm9wZXJ0eS5cbiAgXy5wbHVjayA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgXy5wcm9wZXJ0eShrZXkpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaWx0ZXJgOiBzZWxlY3Rpbmcgb25seSBvYmplY3RzXG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ud2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgXy5tYXRjaGVzKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmluZGA6IGdldHRpbmcgdGhlIGZpcnN0IG9iamVjdFxuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLmZpbmRXaGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maW5kKG9iaiwgXy5tYXRjaGVzKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtYXhpbXVtIGVsZW1lbnQgb3IgKGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICAvLyBDYW4ndCBvcHRpbWl6ZSBhcnJheXMgb2YgaW50ZWdlcnMgbG9uZ2VyIHRoYW4gNjUsNTM1IGVsZW1lbnRzLlxuICAvLyBTZWUgW1dlYktpdCBCdWcgODA3OTddKGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD04MDc5NylcbiAgXy5tYXggPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzQXJyYXkob2JqKSAmJiBvYmpbMF0gPT09ICtvYmpbMF0gJiYgb2JqLmxlbmd0aCA8IDY1NTM1KSB7XG4gICAgICByZXR1cm4gTWF0aC5tYXguYXBwbHkoTWF0aCwgb2JqKTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IC1JbmZpbml0eSwgbGFzdENvbXB1dGVkID0gLUluZmluaXR5O1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHZhciBjb21wdXRlZCA9IGl0ZXJhdG9yID8gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpIDogdmFsdWU7XG4gICAgICBpZiAoY29tcHV0ZWQgPiBsYXN0Q29tcHV0ZWQpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIGxhc3RDb21wdXRlZCA9IGNvbXB1dGVkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtaW5pbXVtIGVsZW1lbnQgKG9yIGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICBfLm1pbiA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNBcnJheShvYmopICYmIG9ialswXSA9PT0gK29ialswXSAmJiBvYmoubGVuZ3RoIDwgNjU1MzUpIHtcbiAgICAgIHJldHVybiBNYXRoLm1pbi5hcHBseShNYXRoLCBvYmopO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IEluZmluaXR5O1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHZhciBjb21wdXRlZCA9IGl0ZXJhdG9yID8gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpIDogdmFsdWU7XG4gICAgICBpZiAoY29tcHV0ZWQgPCBsYXN0Q29tcHV0ZWQpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIGxhc3RDb21wdXRlZCA9IGNvbXB1dGVkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gU2h1ZmZsZSBhbiBhcnJheSwgdXNpbmcgdGhlIG1vZGVybiB2ZXJzaW9uIG9mIHRoZVxuICAvLyBbRmlzaGVyLVlhdGVzIHNodWZmbGVdKGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlzaGVy4oCTWWF0ZXNfc2h1ZmZsZSkuXG4gIF8uc2h1ZmZsZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByYW5kO1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNodWZmbGVkID0gW107XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByYW5kID0gXy5yYW5kb20oaW5kZXgrKyk7XG4gICAgICBzaHVmZmxlZFtpbmRleCAtIDFdID0gc2h1ZmZsZWRbcmFuZF07XG4gICAgICBzaHVmZmxlZFtyYW5kXSA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHJldHVybiBzaHVmZmxlZDtcbiAgfTtcblxuICAvLyBTYW1wbGUgKipuKiogcmFuZG9tIHZhbHVlcyBmcm9tIGEgY29sbGVjdGlvbi5cbiAgLy8gSWYgKipuKiogaXMgbm90IHNwZWNpZmllZCwgcmV0dXJucyBhIHNpbmdsZSByYW5kb20gZWxlbWVudC5cbiAgLy8gVGhlIGludGVybmFsIGBndWFyZGAgYXJndW1lbnQgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgbWFwYC5cbiAgXy5zYW1wbGUgPSBmdW5jdGlvbihvYmosIG4sIGd1YXJkKSB7XG4gICAgaWYgKG4gPT0gbnVsbCB8fCBndWFyZCkge1xuICAgICAgaWYgKG9iai5sZW5ndGggIT09ICtvYmoubGVuZ3RoKSBvYmogPSBfLnZhbHVlcyhvYmopO1xuICAgICAgcmV0dXJuIG9ialtfLnJhbmRvbShvYmoubGVuZ3RoIC0gMSldO1xuICAgIH1cbiAgICByZXR1cm4gXy5zaHVmZmxlKG9iaikuc2xpY2UoMCwgTWF0aC5tYXgoMCwgbikpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIGxvb2t1cCBpdGVyYXRvcnMuXG4gIHZhciBsb29rdXBJdGVyYXRvciA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBfLmlkZW50aXR5O1xuICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSByZXR1cm4gdmFsdWU7XG4gICAgcmV0dXJuIF8ucHJvcGVydHkodmFsdWUpO1xuICB9O1xuXG4gIC8vIFNvcnQgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiBwcm9kdWNlZCBieSBhbiBpdGVyYXRvci5cbiAgXy5zb3J0QnkgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgcmV0dXJuIF8ucGx1Y2soXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICBjcml0ZXJpYTogaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpXG4gICAgICB9O1xuICAgIH0pLnNvcnQoZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYTtcbiAgICAgIHZhciBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICBpZiAoYSAhPT0gYikge1xuICAgICAgICBpZiAoYSA+IGIgfHwgYSA9PT0gdm9pZCAwKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGEgPCBiIHx8IGIgPT09IHZvaWQgMCkgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxlZnQuaW5kZXggLSByaWdodC5pbmRleDtcbiAgICB9KSwgJ3ZhbHVlJyk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdXNlZCBmb3IgYWdncmVnYXRlIFwiZ3JvdXAgYnlcIiBvcGVyYXRpb25zLlxuICB2YXIgZ3JvdXAgPSBmdW5jdGlvbihiZWhhdmlvcikge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgdmFyIGtleSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBvYmopO1xuICAgICAgICBiZWhhdmlvcihyZXN1bHQsIGtleSwgdmFsdWUpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gR3JvdXBzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24uIFBhc3MgZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZVxuICAvLyB0byBncm91cCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGNyaXRlcmlvbi5cbiAgXy5ncm91cEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXksIHZhbHVlKSB7XG4gICAgXy5oYXMocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0ucHVzaCh2YWx1ZSkgOiByZXN1bHRba2V5XSA9IFt2YWx1ZV07XG4gIH0pO1xuXG4gIC8vIEluZGV4ZXMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiwgc2ltaWxhciB0byBgZ3JvdXBCeWAsIGJ1dCBmb3JcbiAgLy8gd2hlbiB5b3Uga25vdyB0aGF0IHlvdXIgaW5kZXggdmFsdWVzIHdpbGwgYmUgdW5pcXVlLlxuICBfLmluZGV4QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICB9KTtcblxuICAvLyBDb3VudHMgaW5zdGFuY2VzIG9mIGFuIG9iamVjdCB0aGF0IGdyb3VwIGJ5IGEgY2VydGFpbiBjcml0ZXJpb24uIFBhc3NcbiAgLy8gZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZSB0byBjb3VudCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlXG4gIC8vIGNyaXRlcmlvbi5cbiAgXy5jb3VudEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXkpIHtcbiAgICBfLmhhcyhyZXN1bHQsIGtleSkgPyByZXN1bHRba2V5XSsrIDogcmVzdWx0W2tleV0gPSAxO1xuICB9KTtcblxuICAvLyBVc2UgYSBjb21wYXJhdG9yIGZ1bmN0aW9uIHRvIGZpZ3VyZSBvdXQgdGhlIHNtYWxsZXN0IGluZGV4IGF0IHdoaWNoXG4gIC8vIGFuIG9iamVjdCBzaG91bGQgYmUgaW5zZXJ0ZWQgc28gYXMgdG8gbWFpbnRhaW4gb3JkZXIuIFVzZXMgYmluYXJ5IHNlYXJjaC5cbiAgXy5zb3J0ZWRJbmRleCA9IGZ1bmN0aW9uKGFycmF5LCBvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgdmFyIHZhbHVlID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmopO1xuICAgIHZhciBsb3cgPSAwLCBoaWdoID0gYXJyYXkubGVuZ3RoO1xuICAgIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgICB2YXIgbWlkID0gKGxvdyArIGhpZ2gpID4+PiAxO1xuICAgICAgaXRlcmF0b3IuY2FsbChjb250ZXh0LCBhcnJheVttaWRdKSA8IHZhbHVlID8gbG93ID0gbWlkICsgMSA6IGhpZ2ggPSBtaWQ7XG4gICAgfVxuICAgIHJldHVybiBsb3c7XG4gIH07XG5cbiAgLy8gU2FmZWx5IGNyZWF0ZSBhIHJlYWwsIGxpdmUgYXJyYXkgZnJvbSBhbnl0aGluZyBpdGVyYWJsZS5cbiAgXy50b0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFvYmopIHJldHVybiBbXTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikpIHJldHVybiBzbGljZS5jYWxsKG9iaik7XG4gICAgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSByZXR1cm4gXy5tYXAob2JqLCBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gXy52YWx1ZXMob2JqKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiBhbiBvYmplY3QuXG4gIF8uc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIDA7XG4gICAgcmV0dXJuIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkgPyBvYmoubGVuZ3RoIDogXy5rZXlzKG9iaikubGVuZ3RoO1xuICB9O1xuXG4gIC8vIEFycmF5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGZpcnN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgaGVhZGAgYW5kIGB0YWtlYC4gVGhlICoqZ3VhcmQqKiBjaGVja1xuICAvLyBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8uZmlyc3QgPSBfLmhlYWQgPSBfLnRha2UgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQpIHJldHVybiBhcnJheVswXTtcbiAgICBpZiAobiA8IDApIHJldHVybiBbXTtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgMCwgbik7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgbGFzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEVzcGVjaWFsbHkgdXNlZnVsIG9uXG4gIC8vIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIGFsbCB0aGUgdmFsdWVzIGluXG4gIC8vIHRoZSBhcnJheSwgZXhjbHVkaW5nIHRoZSBsYXN0IE4uIFRoZSAqKmd1YXJkKiogY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aFxuICAvLyBgXy5tYXBgLlxuICBfLmluaXRpYWwgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgMCwgYXJyYXkubGVuZ3RoIC0gKChuID09IG51bGwpIHx8IGd1YXJkID8gMSA6IG4pKTtcbiAgfTtcblxuICAvLyBHZXQgdGhlIGxhc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgbGFzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuIFRoZSAqKmd1YXJkKiogY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLmxhc3QgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQpIHJldHVybiBhcnJheVthcnJheS5sZW5ndGggLSAxXTtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgTWF0aC5tYXgoYXJyYXkubGVuZ3RoIC0gbiwgMCkpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGZpcnN0IGVudHJ5IG9mIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgdGFpbGAgYW5kIGBkcm9wYC5cbiAgLy8gRXNwZWNpYWxseSB1c2VmdWwgb24gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgYW4gKipuKiogd2lsbCByZXR1cm5cbiAgLy8gdGhlIHJlc3QgTiB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqXG4gIC8vIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5yZXN0ID0gXy50YWlsID0gXy5kcm9wID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIChuID09IG51bGwpIHx8IGd1YXJkID8gMSA6IG4pO1xuICB9O1xuXG4gIC8vIFRyaW0gb3V0IGFsbCBmYWxzeSB2YWx1ZXMgZnJvbSBhbiBhcnJheS5cbiAgXy5jb21wYWN0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIF8uaWRlbnRpdHkpO1xuICB9O1xuXG4gIC8vIEludGVybmFsIGltcGxlbWVudGF0aW9uIG9mIGEgcmVjdXJzaXZlIGBmbGF0dGVuYCBmdW5jdGlvbi5cbiAgdmFyIGZsYXR0ZW4gPSBmdW5jdGlvbihpbnB1dCwgc2hhbGxvdywgb3V0cHV0KSB7XG4gICAgaWYgKHNoYWxsb3cgJiYgXy5ldmVyeShpbnB1dCwgXy5pc0FycmF5KSkge1xuICAgICAgcmV0dXJuIGNvbmNhdC5hcHBseShvdXRwdXQsIGlucHV0KTtcbiAgICB9XG4gICAgZWFjaChpbnB1dCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICAgIHNoYWxsb3cgPyBwdXNoLmFwcGx5KG91dHB1dCwgdmFsdWUpIDogZmxhdHRlbih2YWx1ZSwgc2hhbGxvdywgb3V0cHV0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb3V0cHV0O1xuICB9O1xuXG4gIC8vIEZsYXR0ZW4gb3V0IGFuIGFycmF5LCBlaXRoZXIgcmVjdXJzaXZlbHkgKGJ5IGRlZmF1bHQpLCBvciBqdXN0IG9uZSBsZXZlbC5cbiAgXy5mbGF0dGVuID0gZnVuY3Rpb24oYXJyYXksIHNoYWxsb3cpIHtcbiAgICByZXR1cm4gZmxhdHRlbihhcnJheSwgc2hhbGxvdywgW10pO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHZlcnNpb24gb2YgdGhlIGFycmF5IHRoYXQgZG9lcyBub3QgY29udGFpbiB0aGUgc3BlY2lmaWVkIHZhbHVlKHMpLlxuICBfLndpdGhvdXQgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmRpZmZlcmVuY2UoYXJyYXksIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH07XG5cbiAgLy8gU3BsaXQgYW4gYXJyYXkgaW50byB0d28gYXJyYXlzOiBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIHNhdGlzZnkgdGhlIGdpdmVuXG4gIC8vIHByZWRpY2F0ZSwgYW5kIG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgZG8gbm90IHNhdGlzZnkgdGhlIHByZWRpY2F0ZS5cbiAgXy5wYXJ0aXRpb24gPSBmdW5jdGlvbihhcnJheSwgcHJlZGljYXRlKSB7XG4gICAgdmFyIHBhc3MgPSBbXSwgZmFpbCA9IFtdO1xuICAgIGVhY2goYXJyYXksIGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgIChwcmVkaWNhdGUoZWxlbSkgPyBwYXNzIDogZmFpbCkucHVzaChlbGVtKTtcbiAgICB9KTtcbiAgICByZXR1cm4gW3Bhc3MsIGZhaWxdO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYSBkdXBsaWNhdGUtZnJlZSB2ZXJzaW9uIG9mIHRoZSBhcnJheS4gSWYgdGhlIGFycmF5IGhhcyBhbHJlYWR5XG4gIC8vIGJlZW4gc29ydGVkLCB5b3UgaGF2ZSB0aGUgb3B0aW9uIG9mIHVzaW5nIGEgZmFzdGVyIGFsZ29yaXRobS5cbiAgLy8gQWxpYXNlZCBhcyBgdW5pcXVlYC5cbiAgXy51bmlxID0gXy51bmlxdWUgPSBmdW5jdGlvbihhcnJheSwgaXNTb3J0ZWQsIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihpc1NvcnRlZCkpIHtcbiAgICAgIGNvbnRleHQgPSBpdGVyYXRvcjtcbiAgICAgIGl0ZXJhdG9yID0gaXNTb3J0ZWQ7XG4gICAgICBpc1NvcnRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgaW5pdGlhbCA9IGl0ZXJhdG9yID8gXy5tYXAoYXJyYXksIGl0ZXJhdG9yLCBjb250ZXh0KSA6IGFycmF5O1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgdmFyIHNlZW4gPSBbXTtcbiAgICBlYWNoKGluaXRpYWwsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgaWYgKGlzU29ydGVkID8gKCFpbmRleCB8fCBzZWVuW3NlZW4ubGVuZ3RoIC0gMV0gIT09IHZhbHVlKSA6ICFfLmNvbnRhaW5zKHNlZW4sIHZhbHVlKSkge1xuICAgICAgICBzZWVuLnB1c2godmFsdWUpO1xuICAgICAgICByZXN1bHRzLnB1c2goYXJyYXlbaW5kZXhdKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHVuaW9uOiBlYWNoIGRpc3RpbmN0IGVsZW1lbnQgZnJvbSBhbGwgb2ZcbiAgLy8gdGhlIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8udW5pb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXy51bmlxKF8uZmxhdHRlbihhcmd1bWVudHMsIHRydWUpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgZXZlcnkgaXRlbSBzaGFyZWQgYmV0d2VlbiBhbGwgdGhlXG4gIC8vIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8uaW50ZXJzZWN0aW9uID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgcmVzdCA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gXy5maWx0ZXIoXy51bmlxKGFycmF5KSwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgcmV0dXJuIF8uZXZlcnkocmVzdCwgZnVuY3Rpb24ob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIF8uY29udGFpbnMob3RoZXIsIGl0ZW0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gVGFrZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIG9uZSBhcnJheSBhbmQgYSBudW1iZXIgb2Ygb3RoZXIgYXJyYXlzLlxuICAvLyBPbmx5IHRoZSBlbGVtZW50cyBwcmVzZW50IGluIGp1c3QgdGhlIGZpcnN0IGFycmF5IHdpbGwgcmVtYWluLlxuICBfLmRpZmZlcmVuY2UgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBmdW5jdGlvbih2YWx1ZSl7IHJldHVybiAhXy5jb250YWlucyhyZXN0LCB2YWx1ZSk7IH0pO1xuICB9O1xuXG4gIC8vIFppcCB0b2dldGhlciBtdWx0aXBsZSBsaXN0cyBpbnRvIGEgc2luZ2xlIGFycmF5IC0tIGVsZW1lbnRzIHRoYXQgc2hhcmVcbiAgLy8gYW4gaW5kZXggZ28gdG9nZXRoZXIuXG4gIF8uemlwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxlbmd0aCA9IF8ubWF4KF8ucGx1Y2soYXJndW1lbnRzLCAnbGVuZ3RoJykuY29uY2F0KDApKTtcbiAgICB2YXIgcmVzdWx0cyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdHNbaV0gPSBfLnBsdWNrKGFyZ3VtZW50cywgJycgKyBpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gQ29udmVydHMgbGlzdHMgaW50byBvYmplY3RzLiBQYXNzIGVpdGhlciBhIHNpbmdsZSBhcnJheSBvZiBgW2tleSwgdmFsdWVdYFxuICAvLyBwYWlycywgb3IgdHdvIHBhcmFsbGVsIGFycmF5cyBvZiB0aGUgc2FtZSBsZW5ndGggLS0gb25lIG9mIGtleXMsIGFuZCBvbmUgb2ZcbiAgLy8gdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWVzLlxuICBfLm9iamVjdCA9IGZ1bmN0aW9uKGxpc3QsIHZhbHVlcykge1xuICAgIGlmIChsaXN0ID09IG51bGwpIHJldHVybiB7fTtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGxpc3QubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1dID0gdmFsdWVzW2ldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1bMF1dID0gbGlzdFtpXVsxXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBJZiB0aGUgYnJvd3NlciBkb2Vzbid0IHN1cHBseSB1cyB3aXRoIGluZGV4T2YgKEknbSBsb29raW5nIGF0IHlvdSwgKipNU0lFKiopLFxuICAvLyB3ZSBuZWVkIHRoaXMgZnVuY3Rpb24uIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYW5cbiAgLy8gaXRlbSBpbiBhbiBhcnJheSwgb3IgLTEgaWYgdGhlIGl0ZW0gaXMgbm90IGluY2x1ZGVkIGluIHRoZSBhcnJheS5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGluZGV4T2ZgIGlmIGF2YWlsYWJsZS5cbiAgLy8gSWYgdGhlIGFycmF5IGlzIGxhcmdlIGFuZCBhbHJlYWR5IGluIHNvcnQgb3JkZXIsIHBhc3MgYHRydWVgXG4gIC8vIGZvciAqKmlzU29ydGVkKiogdG8gdXNlIGJpbmFyeSBzZWFyY2guXG4gIF8uaW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBpc1NvcnRlZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGkgPSAwLCBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG4gICAgaWYgKGlzU29ydGVkKSB7XG4gICAgICBpZiAodHlwZW9mIGlzU29ydGVkID09ICdudW1iZXInKSB7XG4gICAgICAgIGkgPSAoaXNTb3J0ZWQgPCAwID8gTWF0aC5tYXgoMCwgbGVuZ3RoICsgaXNTb3J0ZWQpIDogaXNTb3J0ZWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaSA9IF8uc29ydGVkSW5kZXgoYXJyYXksIGl0ZW0pO1xuICAgICAgICByZXR1cm4gYXJyYXlbaV0gPT09IGl0ZW0gPyBpIDogLTE7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIGFycmF5LmluZGV4T2YgPT09IG5hdGl2ZUluZGV4T2YpIHJldHVybiBhcnJheS5pbmRleE9mKGl0ZW0sIGlzU29ydGVkKTtcbiAgICBmb3IgKDsgaSA8IGxlbmd0aDsgaSsrKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHJldHVybiBpO1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgbGFzdEluZGV4T2ZgIGlmIGF2YWlsYWJsZS5cbiAgXy5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBmcm9tKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaGFzSW5kZXggPSBmcm9tICE9IG51bGw7XG4gICAgaWYgKG5hdGl2ZUxhc3RJbmRleE9mICYmIGFycmF5Lmxhc3RJbmRleE9mID09PSBuYXRpdmVMYXN0SW5kZXhPZikge1xuICAgICAgcmV0dXJuIGhhc0luZGV4ID8gYXJyYXkubGFzdEluZGV4T2YoaXRlbSwgZnJvbSkgOiBhcnJheS5sYXN0SW5kZXhPZihpdGVtKTtcbiAgICB9XG4gICAgdmFyIGkgPSAoaGFzSW5kZXggPyBmcm9tIDogYXJyYXkubGVuZ3RoKTtcbiAgICB3aGlsZSAoaS0tKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHJldHVybiBpO1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvLyBHZW5lcmF0ZSBhbiBpbnRlZ2VyIEFycmF5IGNvbnRhaW5pbmcgYW4gYXJpdGhtZXRpYyBwcm9ncmVzc2lvbi4gQSBwb3J0IG9mXG4gIC8vIHRoZSBuYXRpdmUgUHl0aG9uIGByYW5nZSgpYCBmdW5jdGlvbi4gU2VlXG4gIC8vIFt0aGUgUHl0aG9uIGRvY3VtZW50YXRpb25dKGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS9mdW5jdGlvbnMuaHRtbCNyYW5nZSkuXG4gIF8ucmFuZ2UgPSBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDw9IDEpIHtcbiAgICAgIHN0b3AgPSBzdGFydCB8fCAwO1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICBzdGVwID0gYXJndW1lbnRzWzJdIHx8IDE7XG5cbiAgICB2YXIgbGVuZ3RoID0gTWF0aC5tYXgoTWF0aC5jZWlsKChzdG9wIC0gc3RhcnQpIC8gc3RlcCksIDApO1xuICAgIHZhciBpZHggPSAwO1xuICAgIHZhciByYW5nZSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG4gICAgd2hpbGUoaWR4IDwgbGVuZ3RoKSB7XG4gICAgICByYW5nZVtpZHgrK10gPSBzdGFydDtcbiAgICAgIHN0YXJ0ICs9IHN0ZXA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIC8vIEZ1bmN0aW9uIChhaGVtKSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUmV1c2FibGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHByb3RvdHlwZSBzZXR0aW5nLlxuICB2YXIgY3RvciA9IGZ1bmN0aW9uKCl7fTtcblxuICAvLyBDcmVhdGUgYSBmdW5jdGlvbiBib3VuZCB0byBhIGdpdmVuIG9iamVjdCAoYXNzaWduaW5nIGB0aGlzYCwgYW5kIGFyZ3VtZW50cyxcbiAgLy8gb3B0aW9uYWxseSkuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBGdW5jdGlvbi5iaW5kYCBpZlxuICAvLyBhdmFpbGFibGUuXG4gIF8uYmluZCA9IGZ1bmN0aW9uKGZ1bmMsIGNvbnRleHQpIHtcbiAgICB2YXIgYXJncywgYm91bmQ7XG4gICAgaWYgKG5hdGl2ZUJpbmQgJiYgZnVuYy5iaW5kID09PSBuYXRpdmVCaW5kKSByZXR1cm4gbmF0aXZlQmluZC5hcHBseShmdW5jLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGlmICghXy5pc0Z1bmN0aW9uKGZ1bmMpKSB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIGJvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgYm91bmQpKSByZXR1cm4gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGN0b3IucHJvdG90eXBlID0gZnVuYy5wcm90b3R5cGU7XG4gICAgICB2YXIgc2VsZiA9IG5ldyBjdG9yO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBudWxsO1xuICAgICAgdmFyIHJlc3VsdCA9IGZ1bmMuYXBwbHkoc2VsZiwgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICBpZiAoT2JqZWN0KHJlc3VsdCkgPT09IHJlc3VsdCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUGFydGlhbGx5IGFwcGx5IGEgZnVuY3Rpb24gYnkgY3JlYXRpbmcgYSB2ZXJzaW9uIHRoYXQgaGFzIGhhZCBzb21lIG9mIGl0c1xuICAvLyBhcmd1bWVudHMgcHJlLWZpbGxlZCwgd2l0aG91dCBjaGFuZ2luZyBpdHMgZHluYW1pYyBgdGhpc2AgY29udGV4dC4gXyBhY3RzXG4gIC8vIGFzIGEgcGxhY2Vob2xkZXIsIGFsbG93aW5nIGFueSBjb21iaW5hdGlvbiBvZiBhcmd1bWVudHMgdG8gYmUgcHJlLWZpbGxlZC5cbiAgXy5wYXJ0aWFsID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciBib3VuZEFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBvc2l0aW9uID0gMDtcbiAgICAgIHZhciBhcmdzID0gYm91bmRBcmdzLnNsaWNlKCk7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gYXJncy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYXJnc1tpXSA9PT0gXykgYXJnc1tpXSA9IGFyZ3VtZW50c1twb3NpdGlvbisrXTtcbiAgICAgIH1cbiAgICAgIHdoaWxlIChwb3NpdGlvbiA8IGFyZ3VtZW50cy5sZW5ndGgpIGFyZ3MucHVzaChhcmd1bWVudHNbcG9zaXRpb24rK10pO1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBCaW5kIGEgbnVtYmVyIG9mIGFuIG9iamVjdCdzIG1ldGhvZHMgdG8gdGhhdCBvYmplY3QuIFJlbWFpbmluZyBhcmd1bWVudHNcbiAgLy8gYXJlIHRoZSBtZXRob2QgbmFtZXMgdG8gYmUgYm91bmQuIFVzZWZ1bCBmb3IgZW5zdXJpbmcgdGhhdCBhbGwgY2FsbGJhY2tzXG4gIC8vIGRlZmluZWQgb24gYW4gb2JqZWN0IGJlbG9uZyB0byBpdC5cbiAgXy5iaW5kQWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGZ1bmNzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGlmIChmdW5jcy5sZW5ndGggPT09IDApIHRocm93IG5ldyBFcnJvcignYmluZEFsbCBtdXN0IGJlIHBhc3NlZCBmdW5jdGlvbiBuYW1lcycpO1xuICAgIGVhY2goZnVuY3MsIGZ1bmN0aW9uKGYpIHsgb2JqW2ZdID0gXy5iaW5kKG9ialtmXSwgb2JqKTsgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBNZW1vaXplIGFuIGV4cGVuc2l2ZSBmdW5jdGlvbiBieSBzdG9yaW5nIGl0cyByZXN1bHRzLlxuICBfLm1lbW9pemUgPSBmdW5jdGlvbihmdW5jLCBoYXNoZXIpIHtcbiAgICB2YXIgbWVtbyA9IHt9O1xuICAgIGhhc2hlciB8fCAoaGFzaGVyID0gXy5pZGVudGl0eSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGtleSA9IGhhc2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIF8uaGFzKG1lbW8sIGtleSkgPyBtZW1vW2tleV0gOiAobWVtb1trZXldID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIERlbGF5cyBhIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcywgYW5kIHRoZW4gY2FsbHNcbiAgLy8gaXQgd2l0aCB0aGUgYXJndW1lbnRzIHN1cHBsaWVkLlxuICBfLmRlbGF5ID0gZnVuY3Rpb24oZnVuYywgd2FpdCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7IHJldHVybiBmdW5jLmFwcGx5KG51bGwsIGFyZ3MpOyB9LCB3YWl0KTtcbiAgfTtcblxuICAvLyBEZWZlcnMgYSBmdW5jdGlvbiwgc2NoZWR1bGluZyBpdCB0byBydW4gYWZ0ZXIgdGhlIGN1cnJlbnQgY2FsbCBzdGFjayBoYXNcbiAgLy8gY2xlYXJlZC5cbiAgXy5kZWZlciA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICByZXR1cm4gXy5kZWxheS5hcHBseShfLCBbZnVuYywgMV0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgd2hlbiBpbnZva2VkLCB3aWxsIG9ubHkgYmUgdHJpZ2dlcmVkIGF0IG1vc3Qgb25jZVxuICAvLyBkdXJpbmcgYSBnaXZlbiB3aW5kb3cgb2YgdGltZS4gTm9ybWFsbHksIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gd2lsbCBydW5cbiAgLy8gYXMgbXVjaCBhcyBpdCBjYW4sIHdpdGhvdXQgZXZlciBnb2luZyBtb3JlIHRoYW4gb25jZSBwZXIgYHdhaXRgIGR1cmF0aW9uO1xuICAvLyBidXQgaWYgeW91J2QgbGlrZSB0byBkaXNhYmxlIHRoZSBleGVjdXRpb24gb24gdGhlIGxlYWRpbmcgZWRnZSwgcGFzc1xuICAvLyBge2xlYWRpbmc6IGZhbHNlfWAuIFRvIGRpc2FibGUgZXhlY3V0aW9uIG9uIHRoZSB0cmFpbGluZyBlZGdlLCBkaXR0by5cbiAgXy50aHJvdHRsZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgICB2YXIgY29udGV4dCwgYXJncywgcmVzdWx0O1xuICAgIHZhciB0aW1lb3V0ID0gbnVsbDtcbiAgICB2YXIgcHJldmlvdXMgPSAwO1xuICAgIG9wdGlvbnMgfHwgKG9wdGlvbnMgPSB7fSk7XG4gICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICBwcmV2aW91cyA9IG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UgPyAwIDogXy5ub3coKTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICB9O1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBub3cgPSBfLm5vdygpO1xuICAgICAgaWYgKCFwcmV2aW91cyAmJiBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlKSBwcmV2aW91cyA9IG5vdztcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdyAtIHByZXZpb3VzKTtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICghdGltZW91dCAmJiBvcHRpb25zLnRyYWlsaW5nICE9PSBmYWxzZSkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90XG4gIC8vIGJlIHRyaWdnZXJlZC4gVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGl0IHN0b3BzIGJlaW5nIGNhbGxlZCBmb3JcbiAgLy8gTiBtaWxsaXNlY29uZHMuIElmIGBpbW1lZGlhdGVgIGlzIHBhc3NlZCwgdHJpZ2dlciB0aGUgZnVuY3Rpb24gb24gdGhlXG4gIC8vIGxlYWRpbmcgZWRnZSwgaW5zdGVhZCBvZiB0aGUgdHJhaWxpbmcuXG4gIF8uZGVib3VuY2UgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBpbW1lZGlhdGUpIHtcbiAgICB2YXIgdGltZW91dCwgYXJncywgY29udGV4dCwgdGltZXN0YW1wLCByZXN1bHQ7XG5cbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsYXN0ID0gXy5ub3coKSAtIHRpbWVzdGFtcDtcbiAgICAgIGlmIChsYXN0IDwgd2FpdCkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCAtIGxhc3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIGlmICghaW1tZWRpYXRlKSB7XG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgdGltZXN0YW1wID0gXy5ub3coKTtcbiAgICAgIHZhciBjYWxsTm93ID0gaW1tZWRpYXRlICYmICF0aW1lb3V0O1xuICAgICAgaWYgKCF0aW1lb3V0KSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgIH1cbiAgICAgIGlmIChjYWxsTm93KSB7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgYXQgbW9zdCBvbmUgdGltZSwgbm8gbWF0dGVyIGhvd1xuICAvLyBvZnRlbiB5b3UgY2FsbCBpdC4gVXNlZnVsIGZvciBsYXp5IGluaXRpYWxpemF0aW9uLlxuICBfLm9uY2UgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIHJhbiA9IGZhbHNlLCBtZW1vO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChyYW4pIHJldHVybiBtZW1vO1xuICAgICAgcmFuID0gdHJ1ZTtcbiAgICAgIG1lbW8gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBmdW5jID0gbnVsbDtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgZnVuY3Rpb24gcGFzc2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBzZWNvbmQsXG4gIC8vIGFsbG93aW5nIHlvdSB0byBhZGp1c3QgYXJndW1lbnRzLCBydW4gY29kZSBiZWZvcmUgYW5kIGFmdGVyLCBhbmRcbiAgLy8gY29uZGl0aW9uYWxseSBleGVjdXRlIHRoZSBvcmlnaW5hbCBmdW5jdGlvbi5cbiAgXy53cmFwID0gZnVuY3Rpb24oZnVuYywgd3JhcHBlcikge1xuICAgIHJldHVybiBfLnBhcnRpYWwod3JhcHBlciwgZnVuYyk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgaXMgdGhlIGNvbXBvc2l0aW9uIG9mIGEgbGlzdCBvZiBmdW5jdGlvbnMsIGVhY2hcbiAgLy8gY29uc3VtaW5nIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgZm9sbG93cy5cbiAgXy5jb21wb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZ1bmNzID0gYXJndW1lbnRzO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgZm9yICh2YXIgaSA9IGZ1bmNzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGFyZ3MgPSBbZnVuY3NbaV0uYXBwbHkodGhpcywgYXJncyldO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFyZ3NbMF07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgYWZ0ZXIgYmVpbmcgY2FsbGVkIE4gdGltZXMuXG4gIF8uYWZ0ZXIgPSBmdW5jdGlvbih0aW1lcywgZnVuYykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLXRpbWVzIDwgMSkge1xuICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgIH07XG4gIH07XG5cbiAgLy8gT2JqZWN0IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUmV0cmlldmUgdGhlIG5hbWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBPYmplY3Qua2V5c2BcbiAgXy5rZXlzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBbXTtcbiAgICBpZiAobmF0aXZlS2V5cykgcmV0dXJuIG5hdGl2ZUtleXMob2JqKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIHJldHVybiBrZXlzO1xuICB9O1xuXG4gIC8vIFJldHJpZXZlIHRoZSB2YWx1ZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgXy52YWx1ZXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWVzW2ldID0gb2JqW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9O1xuXG4gIC8vIENvbnZlcnQgYW4gb2JqZWN0IGludG8gYSBsaXN0IG9mIGBba2V5LCB2YWx1ZV1gIHBhaXJzLlxuICBfLnBhaXJzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgdmFyIHBhaXJzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcGFpcnNbaV0gPSBba2V5c1tpXSwgb2JqW2tleXNbaV1dXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9O1xuXG4gIC8vIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAgXy5pbnZlcnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0W29ialtrZXlzW2ldXV0gPSBrZXlzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHNvcnRlZCBsaXN0IG9mIHRoZSBmdW5jdGlvbiBuYW1lcyBhdmFpbGFibGUgb24gdGhlIG9iamVjdC5cbiAgLy8gQWxpYXNlZCBhcyBgbWV0aG9kc2BcbiAgXy5mdW5jdGlvbnMgPSBfLm1ldGhvZHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9ialtrZXldKSkgbmFtZXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZXMuc29ydCgpO1xuICB9O1xuXG4gIC8vIEV4dGVuZCBhIGdpdmVuIG9iamVjdCB3aXRoIGFsbCB0aGUgcHJvcGVydGllcyBpbiBwYXNzZWQtaW4gb2JqZWN0KHMpLlxuICBfLmV4dGVuZCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCBvbmx5IGNvbnRhaW5pbmcgdGhlIHdoaXRlbGlzdGVkIHByb3BlcnRpZXMuXG4gIF8ucGljayA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBjb3B5ID0ge307XG4gICAgdmFyIGtleXMgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBlYWNoKGtleXMsIGZ1bmN0aW9uKGtleSkge1xuICAgICAgaWYgKGtleSBpbiBvYmopIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH0pO1xuICAgIHJldHVybiBjb3B5O1xuICB9O1xuXG4gICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgd2l0aG91dCB0aGUgYmxhY2tsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5vbWl0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmICghXy5jb250YWlucyhrZXlzLCBrZXkpKSBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgLy8gRmlsbCBpbiBhIGdpdmVuIG9iamVjdCB3aXRoIGRlZmF1bHQgcHJvcGVydGllcy5cbiAgXy5kZWZhdWx0cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBpZiAob2JqW3Byb3BdID09PSB2b2lkIDApIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gQ3JlYXRlIGEgKHNoYWxsb3ctY2xvbmVkKSBkdXBsaWNhdGUgb2YgYW4gb2JqZWN0LlxuICBfLmNsb25lID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgcmV0dXJuIF8uaXNBcnJheShvYmopID8gb2JqLnNsaWNlKCkgOiBfLmV4dGVuZCh7fSwgb2JqKTtcbiAgfTtcblxuICAvLyBJbnZva2VzIGludGVyY2VwdG9yIHdpdGggdGhlIG9iaiwgYW5kIHRoZW4gcmV0dXJucyBvYmouXG4gIC8vIFRoZSBwcmltYXJ5IHB1cnBvc2Ugb2YgdGhpcyBtZXRob2QgaXMgdG8gXCJ0YXAgaW50b1wiIGEgbWV0aG9kIGNoYWluLCBpblxuICAvLyBvcmRlciB0byBwZXJmb3JtIG9wZXJhdGlvbnMgb24gaW50ZXJtZWRpYXRlIHJlc3VsdHMgd2l0aGluIHRoZSBjaGFpbi5cbiAgXy50YXAgPSBmdW5jdGlvbihvYmosIGludGVyY2VwdG9yKSB7XG4gICAgaW50ZXJjZXB0b3Iob2JqKTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIEludGVybmFsIHJlY3Vyc2l2ZSBjb21wYXJpc29uIGZ1bmN0aW9uIGZvciBgaXNFcXVhbGAuXG4gIHZhciBlcSA9IGZ1bmN0aW9uKGEsIGIsIGFTdGFjaywgYlN0YWNrKSB7XG4gICAgLy8gSWRlbnRpY2FsIG9iamVjdHMgYXJlIGVxdWFsLiBgMCA9PT0gLTBgLCBidXQgdGhleSBhcmVuJ3QgaWRlbnRpY2FsLlxuICAgIC8vIFNlZSB0aGUgW0hhcm1vbnkgYGVnYWxgIHByb3Bvc2FsXShodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWwpLlxuICAgIGlmIChhID09PSBiKSByZXR1cm4gYSAhPT0gMCB8fCAxIC8gYSA9PSAxIC8gYjtcbiAgICAvLyBBIHN0cmljdCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIGBudWxsID09IHVuZGVmaW5lZGAuXG4gICAgaWYgKGEgPT0gbnVsbCB8fCBiID09IG51bGwpIHJldHVybiBhID09PSBiO1xuICAgIC8vIFVud3JhcCBhbnkgd3JhcHBlZCBvYmplY3RzLlxuICAgIGlmIChhIGluc3RhbmNlb2YgXykgYSA9IGEuX3dyYXBwZWQ7XG4gICAgaWYgKGIgaW5zdGFuY2VvZiBfKSBiID0gYi5fd3JhcHBlZDtcbiAgICAvLyBDb21wYXJlIGBbW0NsYXNzXV1gIG5hbWVzLlxuICAgIHZhciBjbGFzc05hbWUgPSB0b1N0cmluZy5jYWxsKGEpO1xuICAgIGlmIChjbGFzc05hbWUgIT0gdG9TdHJpbmcuY2FsbChiKSkgcmV0dXJuIGZhbHNlO1xuICAgIHN3aXRjaCAoY2xhc3NOYW1lKSB7XG4gICAgICAvLyBTdHJpbmdzLCBudW1iZXJzLCBkYXRlcywgYW5kIGJvb2xlYW5zIGFyZSBjb21wYXJlZCBieSB2YWx1ZS5cbiAgICAgIGNhc2UgJ1tvYmplY3QgU3RyaW5nXSc6XG4gICAgICAgIC8vIFByaW1pdGl2ZXMgYW5kIHRoZWlyIGNvcnJlc3BvbmRpbmcgb2JqZWN0IHdyYXBwZXJzIGFyZSBlcXVpdmFsZW50OyB0aHVzLCBgXCI1XCJgIGlzXG4gICAgICAgIC8vIGVxdWl2YWxlbnQgdG8gYG5ldyBTdHJpbmcoXCI1XCIpYC5cbiAgICAgICAgcmV0dXJuIGEgPT0gU3RyaW5nKGIpO1xuICAgICAgY2FzZSAnW29iamVjdCBOdW1iZXJdJzpcbiAgICAgICAgLy8gYE5hTmBzIGFyZSBlcXVpdmFsZW50LCBidXQgbm9uLXJlZmxleGl2ZS4gQW4gYGVnYWxgIGNvbXBhcmlzb24gaXMgcGVyZm9ybWVkIGZvclxuICAgICAgICAvLyBvdGhlciBudW1lcmljIHZhbHVlcy5cbiAgICAgICAgcmV0dXJuIGEgIT0gK2EgPyBiICE9ICtiIDogKGEgPT0gMCA/IDEgLyBhID09IDEgLyBiIDogYSA9PSArYik7XG4gICAgICBjYXNlICdbb2JqZWN0IERhdGVdJzpcbiAgICAgIGNhc2UgJ1tvYmplY3QgQm9vbGVhbl0nOlxuICAgICAgICAvLyBDb2VyY2UgZGF0ZXMgYW5kIGJvb2xlYW5zIHRvIG51bWVyaWMgcHJpbWl0aXZlIHZhbHVlcy4gRGF0ZXMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyXG4gICAgICAgIC8vIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9ucy4gTm90ZSB0aGF0IGludmFsaWQgZGF0ZXMgd2l0aCBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgLy8gb2YgYE5hTmAgYXJlIG5vdCBlcXVpdmFsZW50LlxuICAgICAgICByZXR1cm4gK2EgPT0gK2I7XG4gICAgICAvLyBSZWdFeHBzIGFyZSBjb21wYXJlZCBieSB0aGVpciBzb3VyY2UgcGF0dGVybnMgYW5kIGZsYWdzLlxuICAgICAgY2FzZSAnW29iamVjdCBSZWdFeHBdJzpcbiAgICAgICAgcmV0dXJuIGEuc291cmNlID09IGIuc291cmNlICYmXG4gICAgICAgICAgICAgICBhLmdsb2JhbCA9PSBiLmdsb2JhbCAmJlxuICAgICAgICAgICAgICAgYS5tdWx0aWxpbmUgPT0gYi5tdWx0aWxpbmUgJiZcbiAgICAgICAgICAgICAgIGEuaWdub3JlQ2FzZSA9PSBiLmlnbm9yZUNhc2U7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgYSAhPSAnb2JqZWN0JyB8fCB0eXBlb2YgYiAhPSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICAgIC8vIEFzc3VtZSBlcXVhbGl0eSBmb3IgY3ljbGljIHN0cnVjdHVyZXMuIFRoZSBhbGdvcml0aG0gZm9yIGRldGVjdGluZyBjeWNsaWNcbiAgICAvLyBzdHJ1Y3R1cmVzIGlzIGFkYXB0ZWQgZnJvbSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLCBhYnN0cmFjdCBvcGVyYXRpb24gYEpPYC5cbiAgICB2YXIgbGVuZ3RoID0gYVN0YWNrLmxlbmd0aDtcbiAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgIC8vIExpbmVhciBzZWFyY2guIFBlcmZvcm1hbmNlIGlzIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gdGhlIG51bWJlciBvZlxuICAgICAgLy8gdW5pcXVlIG5lc3RlZCBzdHJ1Y3R1cmVzLlxuICAgICAgaWYgKGFTdGFja1tsZW5ndGhdID09IGEpIHJldHVybiBiU3RhY2tbbGVuZ3RoXSA9PSBiO1xuICAgIH1cbiAgICAvLyBPYmplY3RzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWl2YWxlbnQsIGJ1dCBgT2JqZWN0YHNcbiAgICAvLyBmcm9tIGRpZmZlcmVudCBmcmFtZXMgYXJlLlxuICAgIHZhciBhQ3RvciA9IGEuY29uc3RydWN0b3IsIGJDdG9yID0gYi5jb25zdHJ1Y3RvcjtcbiAgICBpZiAoYUN0b3IgIT09IGJDdG9yICYmICEoXy5pc0Z1bmN0aW9uKGFDdG9yKSAmJiAoYUN0b3IgaW5zdGFuY2VvZiBhQ3RvcikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0Z1bmN0aW9uKGJDdG9yKSAmJiAoYkN0b3IgaW5zdGFuY2VvZiBiQ3RvcikpXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiAoJ2NvbnN0cnVjdG9yJyBpbiBhICYmICdjb25zdHJ1Y3RvcicgaW4gYikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gQWRkIHRoZSBmaXJzdCBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wdXNoKGEpO1xuICAgIGJTdGFjay5wdXNoKGIpO1xuICAgIHZhciBzaXplID0gMCwgcmVzdWx0ID0gdHJ1ZTtcbiAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICBpZiAoY2xhc3NOYW1lID09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgIC8vIENvbXBhcmUgYXJyYXkgbGVuZ3RocyB0byBkZXRlcm1pbmUgaWYgYSBkZWVwIGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5LlxuICAgICAgc2l6ZSA9IGEubGVuZ3RoO1xuICAgICAgcmVzdWx0ID0gc2l6ZSA9PSBiLmxlbmd0aDtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgLy8gRGVlcCBjb21wYXJlIHRoZSBjb250ZW50cywgaWdub3Jpbmcgbm9uLW51bWVyaWMgcHJvcGVydGllcy5cbiAgICAgICAgd2hpbGUgKHNpemUtLSkge1xuICAgICAgICAgIGlmICghKHJlc3VsdCA9IGVxKGFbc2l6ZV0sIGJbc2l6ZV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERlZXAgY29tcGFyZSBvYmplY3RzLlxuICAgICAgZm9yICh2YXIga2V5IGluIGEpIHtcbiAgICAgICAgaWYgKF8uaGFzKGEsIGtleSkpIHtcbiAgICAgICAgICAvLyBDb3VudCB0aGUgZXhwZWN0ZWQgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgIC8vIERlZXAgY29tcGFyZSBlYWNoIG1lbWJlci5cbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBfLmhhcyhiLCBrZXkpICYmIGVxKGFba2V5XSwgYltrZXldLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRW5zdXJlIHRoYXQgYm90aCBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIGZvciAoa2V5IGluIGIpIHtcbiAgICAgICAgICBpZiAoXy5oYXMoYiwga2V5KSAmJiAhKHNpemUtLSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9ICFzaXplO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IG9iamVjdCBmcm9tIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucG9wKCk7XG4gICAgYlN0YWNrLnBvcCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUGVyZm9ybSBhIGRlZXAgY29tcGFyaXNvbiB0byBjaGVjayBpZiB0d28gb2JqZWN0cyBhcmUgZXF1YWwuXG4gIF8uaXNFcXVhbCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gZXEoYSwgYiwgW10sIFtdKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIGFycmF5LCBzdHJpbmcsIG9yIG9iamVjdCBlbXB0eT9cbiAgLy8gQW4gXCJlbXB0eVwiIG9iamVjdCBoYXMgbm8gZW51bWVyYWJsZSBvd24tcHJvcGVydGllcy5cbiAgXy5pc0VtcHR5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikgfHwgXy5pc1N0cmluZyhvYmopKSByZXR1cm4gb2JqLmxlbmd0aCA9PT0gMDtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIERPTSBlbGVtZW50P1xuICBfLmlzRWxlbWVudCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiAhIShvYmogJiYgb2JqLm5vZGVUeXBlID09PSAxKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGFuIGFycmF5P1xuICAvLyBEZWxlZ2F0ZXMgdG8gRUNNQTUncyBuYXRpdmUgQXJyYXkuaXNBcnJheVxuICBfLmlzQXJyYXkgPSBuYXRpdmVJc0FycmF5IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIGFuIG9iamVjdD9cbiAgXy5pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IE9iamVjdChvYmopO1xuICB9O1xuXG4gIC8vIEFkZCBzb21lIGlzVHlwZSBtZXRob2RzOiBpc0FyZ3VtZW50cywgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0RhdGUsIGlzUmVnRXhwLlxuICBlYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIF9bJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0ICcgKyBuYW1lICsgJ10nO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIERlZmluZSBhIGZhbGxiYWNrIHZlcnNpb24gb2YgdGhlIG1ldGhvZCBpbiBicm93c2VycyAoYWhlbSwgSUUpLCB3aGVyZVxuICAvLyB0aGVyZSBpc24ndCBhbnkgaW5zcGVjdGFibGUgXCJBcmd1bWVudHNcIiB0eXBlLlxuICBpZiAoIV8uaXNBcmd1bWVudHMoYXJndW1lbnRzKSkge1xuICAgIF8uaXNBcmd1bWVudHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiAhIShvYmogJiYgXy5oYXMob2JqLCAnY2FsbGVlJykpO1xuICAgIH07XG4gIH1cblxuICAvLyBPcHRpbWl6ZSBgaXNGdW5jdGlvbmAgaWYgYXBwcm9wcmlhdGUuXG4gIGlmICh0eXBlb2YgKC8uLykgIT09ICdmdW5jdGlvbicpIHtcbiAgICBfLmlzRnVuY3Rpb24gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nO1xuICAgIH07XG4gIH1cblxuICAvLyBJcyBhIGdpdmVuIG9iamVjdCBhIGZpbml0ZSBudW1iZXI/XG4gIF8uaXNGaW5pdGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gaXNGaW5pdGUob2JqKSAmJiAhaXNOYU4ocGFyc2VGbG9hdChvYmopKTtcbiAgfTtcblxuICAvLyBJcyB0aGUgZ2l2ZW4gdmFsdWUgYE5hTmA/IChOYU4gaXMgdGhlIG9ubHkgbnVtYmVyIHdoaWNoIGRvZXMgbm90IGVxdWFsIGl0c2VsZikuXG4gIF8uaXNOYU4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXy5pc051bWJlcihvYmopICYmIG9iaiAhPSArb2JqO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBib29sZWFuP1xuICBfLmlzQm9vbGVhbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHRydWUgfHwgb2JqID09PSBmYWxzZSB8fCB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgZXF1YWwgdG8gbnVsbD9cbiAgXy5pc051bGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgdW5kZWZpbmVkP1xuICBfLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdm9pZCAwO1xuICB9O1xuXG4gIC8vIFNob3J0Y3V0IGZ1bmN0aW9uIGZvciBjaGVja2luZyBpZiBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gcHJvcGVydHkgZGlyZWN0bHlcbiAgLy8gb24gaXRzZWxmIChpbiBvdGhlciB3b3Jkcywgbm90IG9uIGEgcHJvdG90eXBlKS5cbiAgXy5oYXMgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbiAgfTtcblxuICAvLyBVdGlsaXR5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJ1biBVbmRlcnNjb3JlLmpzIGluICpub0NvbmZsaWN0KiBtb2RlLCByZXR1cm5pbmcgdGhlIGBfYCB2YXJpYWJsZSB0byBpdHNcbiAgLy8gcHJldmlvdXMgb3duZXIuIFJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICByb290Ll8gPSBwcmV2aW91c1VuZGVyc2NvcmU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gS2VlcCB0aGUgaWRlbnRpdHkgZnVuY3Rpb24gYXJvdW5kIGZvciBkZWZhdWx0IGl0ZXJhdG9ycy5cbiAgXy5pZGVudGl0eSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuXG4gIF8uY29uc3RhbnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgfTtcblxuICBfLnByb3BlcnR5ID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9ialtrZXldO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIHByZWRpY2F0ZSBmb3IgY2hlY2tpbmcgd2hldGhlciBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gc2V0IG9mIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLm1hdGNoZXMgPSBmdW5jdGlvbihhdHRycykge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIGlmIChvYmogPT09IGF0dHJzKSByZXR1cm4gdHJ1ZTsgLy9hdm9pZCBjb21wYXJpbmcgYW4gb2JqZWN0IHRvIGl0c2VsZi5cbiAgICAgIGZvciAodmFyIGtleSBpbiBhdHRycykge1xuICAgICAgICBpZiAoYXR0cnNba2V5XSAhPT0gb2JqW2tleV0pXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9O1xuXG4gIC8vIFJ1biBhIGZ1bmN0aW9uICoqbioqIHRpbWVzLlxuICBfLnRpbWVzID0gZnVuY3Rpb24obiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgYWNjdW0gPSBBcnJheShNYXRoLm1heCgwLCBuKSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIGFjY3VtW2ldID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBpKTtcbiAgICByZXR1cm4gYWNjdW07XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBtaW4gYW5kIG1heCAoaW5jbHVzaXZlKS5cbiAgXy5yYW5kb20gPSBmdW5jdGlvbihtaW4sIG1heCkge1xuICAgIGlmIChtYXggPT0gbnVsbCkge1xuICAgICAgbWF4ID0gbWluO1xuICAgICAgbWluID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIG1pbiArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSk7XG4gIH07XG5cbiAgLy8gQSAocG9zc2libHkgZmFzdGVyKSB3YXkgdG8gZ2V0IHRoZSBjdXJyZW50IHRpbWVzdGFtcCBhcyBhbiBpbnRlZ2VyLlxuICBfLm5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG5cbiAgLy8gTGlzdCBvZiBIVE1MIGVudGl0aWVzIGZvciBlc2NhcGluZy5cbiAgdmFyIGVudGl0eU1hcCA9IHtcbiAgICBlc2NhcGU6IHtcbiAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICc8JzogJyZsdDsnLFxuICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgIFwiJ1wiOiAnJiN4Mjc7J1xuICAgIH1cbiAgfTtcbiAgZW50aXR5TWFwLnVuZXNjYXBlID0gXy5pbnZlcnQoZW50aXR5TWFwLmVzY2FwZSk7XG5cbiAgLy8gUmVnZXhlcyBjb250YWluaW5nIHRoZSBrZXlzIGFuZCB2YWx1ZXMgbGlzdGVkIGltbWVkaWF0ZWx5IGFib3ZlLlxuICB2YXIgZW50aXR5UmVnZXhlcyA9IHtcbiAgICBlc2NhcGU6ICAgbmV3IFJlZ0V4cCgnWycgKyBfLmtleXMoZW50aXR5TWFwLmVzY2FwZSkuam9pbignJykgKyAnXScsICdnJyksXG4gICAgdW5lc2NhcGU6IG5ldyBSZWdFeHAoJygnICsgXy5rZXlzKGVudGl0eU1hcC51bmVzY2FwZSkuam9pbignfCcpICsgJyknLCAnZycpXG4gIH07XG5cbiAgLy8gRnVuY3Rpb25zIGZvciBlc2NhcGluZyBhbmQgdW5lc2NhcGluZyBzdHJpbmdzIHRvL2Zyb20gSFRNTCBpbnRlcnBvbGF0aW9uLlxuICBfLmVhY2goWydlc2NhcGUnLCAndW5lc2NhcGUnXSwgZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgX1ttZXRob2RdID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICBpZiAoc3RyaW5nID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHJldHVybiAoJycgKyBzdHJpbmcpLnJlcGxhY2UoZW50aXR5UmVnZXhlc1ttZXRob2RdLCBmdW5jdGlvbihtYXRjaCkge1xuICAgICAgICByZXR1cm4gZW50aXR5TWFwW21ldGhvZF1bbWF0Y2hdO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBgcHJvcGVydHlgIGlzIGEgZnVuY3Rpb24gdGhlbiBpbnZva2UgaXQgd2l0aCB0aGVcbiAgLy8gYG9iamVjdGAgYXMgY29udGV4dDsgb3RoZXJ3aXNlLCByZXR1cm4gaXQuXG4gIF8ucmVzdWx0ID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkge1xuICAgIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICB2YXIgdmFsdWUgPSBvYmplY3RbcHJvcGVydHldO1xuICAgIHJldHVybiBfLmlzRnVuY3Rpb24odmFsdWUpID8gdmFsdWUuY2FsbChvYmplY3QpIDogdmFsdWU7XG4gIH07XG5cbiAgLy8gQWRkIHlvdXIgb3duIGN1c3RvbSBmdW5jdGlvbnMgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm1peGluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChfLmZ1bmN0aW9ucyhvYmopLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgZnVuYyA9IF9bbmFtZV0gPSBvYmpbbmFtZV07XG4gICAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IFt0aGlzLl93cmFwcGVkXTtcbiAgICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgZnVuYy5hcHBseShfLCBhcmdzKSk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGEgdW5pcXVlIGludGVnZXIgaWQgKHVuaXF1ZSB3aXRoaW4gdGhlIGVudGlyZSBjbGllbnQgc2Vzc2lvbikuXG4gIC8vIFVzZWZ1bCBmb3IgdGVtcG9yYXJ5IERPTSBpZHMuXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuICBfLnVuaXF1ZUlkID0gZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbiAgfTtcblxuICAvLyBCeSBkZWZhdWx0LCBVbmRlcnNjb3JlIHVzZXMgRVJCLXN0eWxlIHRlbXBsYXRlIGRlbGltaXRlcnMsIGNoYW5nZSB0aGVcbiAgLy8gZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZSBkZWxpbWl0ZXJzLlxuICBfLnRlbXBsYXRlU2V0dGluZ3MgPSB7XG4gICAgZXZhbHVhdGUgICAgOiAvPCUoW1xcc1xcU10rPyklPi9nLFxuICAgIGludGVycG9sYXRlIDogLzwlPShbXFxzXFxTXSs/KSU+L2csXG4gICAgZXNjYXBlICAgICAgOiAvPCUtKFtcXHNcXFNdKz8pJT4vZ1xuICB9O1xuXG4gIC8vIFdoZW4gY3VzdG9taXppbmcgYHRlbXBsYXRlU2V0dGluZ3NgLCBpZiB5b3UgZG9uJ3Qgd2FudCB0byBkZWZpbmUgYW5cbiAgLy8gaW50ZXJwb2xhdGlvbiwgZXZhbHVhdGlvbiBvciBlc2NhcGluZyByZWdleCwgd2UgbmVlZCBvbmUgdGhhdCBpc1xuICAvLyBndWFyYW50ZWVkIG5vdCB0byBtYXRjaC5cbiAgdmFyIG5vTWF0Y2ggPSAvKC4pXi87XG5cbiAgLy8gQ2VydGFpbiBjaGFyYWN0ZXJzIG5lZWQgdG8gYmUgZXNjYXBlZCBzbyB0aGF0IHRoZXkgY2FuIGJlIHB1dCBpbnRvIGFcbiAgLy8gc3RyaW5nIGxpdGVyYWwuXG4gIHZhciBlc2NhcGVzID0ge1xuICAgIFwiJ1wiOiAgICAgIFwiJ1wiLFxuICAgICdcXFxcJzogICAgICdcXFxcJyxcbiAgICAnXFxyJzogICAgICdyJyxcbiAgICAnXFxuJzogICAgICduJyxcbiAgICAnXFx0JzogICAgICd0JyxcbiAgICAnXFx1MjAyOCc6ICd1MjAyOCcsXG4gICAgJ1xcdTIwMjknOiAndTIwMjknXG4gIH07XG5cbiAgdmFyIGVzY2FwZXIgPSAvXFxcXHwnfFxccnxcXG58XFx0fFxcdTIwMjh8XFx1MjAyOS9nO1xuXG4gIC8vIEphdmFTY3JpcHQgbWljcm8tdGVtcGxhdGluZywgc2ltaWxhciB0byBKb2huIFJlc2lnJ3MgaW1wbGVtZW50YXRpb24uXG4gIC8vIFVuZGVyc2NvcmUgdGVtcGxhdGluZyBoYW5kbGVzIGFyYml0cmFyeSBkZWxpbWl0ZXJzLCBwcmVzZXJ2ZXMgd2hpdGVzcGFjZSxcbiAgLy8gYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gIF8udGVtcGxhdGUgPSBmdW5jdGlvbih0ZXh0LCBkYXRhLCBzZXR0aW5ncykge1xuICAgIHZhciByZW5kZXI7XG4gICAgc2V0dGluZ3MgPSBfLmRlZmF1bHRzKHt9LCBzZXR0aW5ncywgXy50ZW1wbGF0ZVNldHRpbmdzKTtcblxuICAgIC8vIENvbWJpbmUgZGVsaW1pdGVycyBpbnRvIG9uZSByZWd1bGFyIGV4cHJlc3Npb24gdmlhIGFsdGVybmF0aW9uLlxuICAgIHZhciBtYXRjaGVyID0gbmV3IFJlZ0V4cChbXG4gICAgICAoc2V0dGluZ3MuZXNjYXBlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5pbnRlcnBvbGF0ZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuZXZhbHVhdGUgfHwgbm9NYXRjaCkuc291cmNlXG4gICAgXS5qb2luKCd8JykgKyAnfCQnLCAnZycpO1xuXG4gICAgLy8gQ29tcGlsZSB0aGUgdGVtcGxhdGUgc291cmNlLCBlc2NhcGluZyBzdHJpbmcgbGl0ZXJhbHMgYXBwcm9wcmlhdGVseS5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzb3VyY2UgPSBcIl9fcCs9J1wiO1xuICAgIHRleHQucmVwbGFjZShtYXRjaGVyLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlLCBpbnRlcnBvbGF0ZSwgZXZhbHVhdGUsIG9mZnNldCkge1xuICAgICAgc291cmNlICs9IHRleHQuc2xpY2UoaW5kZXgsIG9mZnNldClcbiAgICAgICAgLnJlcGxhY2UoZXNjYXBlciwgZnVuY3Rpb24obWF0Y2gpIHsgcmV0dXJuICdcXFxcJyArIGVzY2FwZXNbbWF0Y2hdOyB9KTtcblxuICAgICAgaWYgKGVzY2FwZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInK1xcbigoX190PShcIiArIGVzY2FwZSArIFwiKSk9PW51bGw/Jyc6Xy5lc2NhcGUoX190KSkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGludGVycG9sYXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgaW50ZXJwb2xhdGUgKyBcIikpPT1udWxsPycnOl9fdCkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGV2YWx1YXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIic7XFxuXCIgKyBldmFsdWF0ZSArIFwiXFxuX19wKz0nXCI7XG4gICAgICB9XG4gICAgICBpbmRleCA9IG9mZnNldCArIG1hdGNoLmxlbmd0aDtcbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9KTtcbiAgICBzb3VyY2UgKz0gXCInO1xcblwiO1xuXG4gICAgLy8gSWYgYSB2YXJpYWJsZSBpcyBub3Qgc3BlY2lmaWVkLCBwbGFjZSBkYXRhIHZhbHVlcyBpbiBsb2NhbCBzY29wZS5cbiAgICBpZiAoIXNldHRpbmdzLnZhcmlhYmxlKSBzb3VyY2UgPSAnd2l0aChvYmp8fHt9KXtcXG4nICsgc291cmNlICsgJ31cXG4nO1xuXG4gICAgc291cmNlID0gXCJ2YXIgX190LF9fcD0nJyxfX2o9QXJyYXkucHJvdG90eXBlLmpvaW4sXCIgK1xuICAgICAgXCJwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xcblwiICtcbiAgICAgIHNvdXJjZSArIFwicmV0dXJuIF9fcDtcXG5cIjtcblxuICAgIHRyeSB7XG4gICAgICByZW5kZXIgPSBuZXcgRnVuY3Rpb24oc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicsICdfJywgc291cmNlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgaWYgKGRhdGEpIHJldHVybiByZW5kZXIoZGF0YSwgXyk7XG4gICAgdmFyIHRlbXBsYXRlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIHJlbmRlci5jYWxsKHRoaXMsIGRhdGEsIF8pO1xuICAgIH07XG5cbiAgICAvLyBQcm92aWRlIHRoZSBjb21waWxlZCBmdW5jdGlvbiBzb3VyY2UgYXMgYSBjb252ZW5pZW5jZSBmb3IgcHJlY29tcGlsYXRpb24uXG4gICAgdGVtcGxhdGUuc291cmNlID0gJ2Z1bmN0aW9uKCcgKyAoc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicpICsgJyl7XFxuJyArIHNvdXJjZSArICd9JztcblxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfTtcblxuICAvLyBBZGQgYSBcImNoYWluXCIgZnVuY3Rpb24sIHdoaWNoIHdpbGwgZGVsZWdhdGUgdG8gdGhlIHdyYXBwZXIuXG4gIF8uY2hhaW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXyhvYmopLmNoYWluKCk7XG4gIH07XG5cbiAgLy8gT09QXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuICAvLyBJZiBVbmRlcnNjb3JlIGlzIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLCBpdCByZXR1cm5zIGEgd3JhcHBlZCBvYmplY3QgdGhhdFxuICAvLyBjYW4gYmUgdXNlZCBPTy1zdHlsZS4gVGhpcyB3cmFwcGVyIGhvbGRzIGFsdGVyZWQgdmVyc2lvbnMgb2YgYWxsIHRoZVxuICAvLyB1bmRlcnNjb3JlIGZ1bmN0aW9ucy4gV3JhcHBlZCBvYmplY3RzIG1heSBiZSBjaGFpbmVkLlxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb250aW51ZSBjaGFpbmluZyBpbnRlcm1lZGlhdGUgcmVzdWx0cy5cbiAgdmFyIHJlc3VsdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0aGlzLl9jaGFpbiA/IF8ob2JqKS5jaGFpbigpIDogb2JqO1xuICB9O1xuXG4gIC8vIEFkZCBhbGwgb2YgdGhlIFVuZGVyc2NvcmUgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgXy5taXhpbihfKTtcblxuICAvLyBBZGQgYWxsIG11dGF0b3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsncG9wJywgJ3B1c2gnLCAncmV2ZXJzZScsICdzaGlmdCcsICdzb3J0JywgJ3NwbGljZScsICd1bnNoaWZ0J10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG9iaiA9IHRoaXMuX3dyYXBwZWQ7XG4gICAgICBtZXRob2QuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKChuYW1lID09ICdzaGlmdCcgfHwgbmFtZSA9PSAnc3BsaWNlJykgJiYgb2JqLmxlbmd0aCA9PT0gMCkgZGVsZXRlIG9ialswXTtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBvYmopO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFkZCBhbGwgYWNjZXNzb3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsnY29uY2F0JywgJ2pvaW4nLCAnc2xpY2UnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgbWV0aG9kLmFwcGx5KHRoaXMuX3dyYXBwZWQsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH0pO1xuXG4gIF8uZXh0ZW5kKF8ucHJvdG90eXBlLCB7XG5cbiAgICAvLyBTdGFydCBjaGFpbmluZyBhIHdyYXBwZWQgVW5kZXJzY29yZSBvYmplY3QuXG4gICAgY2hhaW46IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fY2hhaW4gPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIEV4dHJhY3RzIHRoZSByZXN1bHQgZnJvbSBhIHdyYXBwZWQgYW5kIGNoYWluZWQgb2JqZWN0LlxuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl93cmFwcGVkO1xuICAgIH1cblxuICB9KTtcblxuICAvLyBBTUQgcmVnaXN0cmF0aW9uIGhhcHBlbnMgYXQgdGhlIGVuZCBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIEFNRCBsb2FkZXJzXG4gIC8vIHRoYXQgbWF5IG5vdCBlbmZvcmNlIG5leHQtdHVybiBzZW1hbnRpY3Mgb24gbW9kdWxlcy4gRXZlbiB0aG91Z2ggZ2VuZXJhbFxuICAvLyBwcmFjdGljZSBmb3IgQU1EIHJlZ2lzdHJhdGlvbiBpcyB0byBiZSBhbm9ueW1vdXMsIHVuZGVyc2NvcmUgcmVnaXN0ZXJzXG4gIC8vIGFzIGEgbmFtZWQgbW9kdWxlIGJlY2F1c2UsIGxpa2UgalF1ZXJ5LCBpdCBpcyBhIGJhc2UgbGlicmFyeSB0aGF0IGlzXG4gIC8vIHBvcHVsYXIgZW5vdWdoIHRvIGJlIGJ1bmRsZWQgaW4gYSB0aGlyZCBwYXJ0eSBsaWIsIGJ1dCBub3QgYmUgcGFydCBvZlxuICAvLyBhbiBBTUQgbG9hZCByZXF1ZXN0LiBUaG9zZSBjYXNlcyBjb3VsZCBnZW5lcmF0ZSBhbiBlcnJvciB3aGVuIGFuXG4gIC8vIGFub255bW91cyBkZWZpbmUoKSBpcyBjYWxsZWQgb3V0c2lkZSBvZiBhIGxvYWRlciByZXF1ZXN0LlxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKCd1bmRlcnNjb3JlJywgW10sIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIF87XG4gICAgfSk7XG4gIH1cbn0pLmNhbGwodGhpcyk7XG4iXX0=
