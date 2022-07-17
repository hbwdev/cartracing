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