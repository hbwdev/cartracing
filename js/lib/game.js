var SpriteArray = require('./spriteArray');
var EventedLoop = require('eventedloop');
var isMobileDevice = require('../lib/isMobileDevice');

(function (global) {
	function Game (mainCanvas, player) {
		var staticObjects = new SpriteArray();
		var movingObjects = new SpriteArray();
		var uiElements = new SpriteArray();
		var dContext = mainCanvas.getContext('2d');
		
		// Scrolling background
		var backgroundImage = new Image();
		backgroundImage.src = 'road.png';
		var backgroundX = 0;
		var backgroundY = 0;

		// Hud mockup
		var hudImage = new Image();
		if (isMobileDevice())
			hudImage.src = 'mobilehud-mockup.png';
		else
			hudImage.src = 'hud-mockup.png';

		var mouseX = dContext.getCentreOfViewport();
		var mouseY = 0;
		var paused = false;
		var that = this;
		var beforeCycleCallbacks = [];
		var afterCycleCallbacks = [];
		var gameLoop = new EventedLoop();

		this.addStaticObject = function (sprite) {
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

		function drawHud() {
			if (isMobileDevice())
				dContext.drawImage(hudImage, 0, 0)
			else
				dContext.drawImage(hudImage, 0, 0, mainCanvas.width, hudImage.height, 0, 0, mainCanvas.width, hudImage.height);
		}

		that.draw = function () {
			// Clear canvas
			mainCanvas.width = mainCanvas.width;
			
			// Update scrolling background
			drawBackground();

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
			
			drawHud();
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