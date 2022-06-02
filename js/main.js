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
var InfoBox = require('./lib/infoBox');
var Game = require('./lib/game');

// Local variables for starting the game
var mainCanvas = document.getElementById('game-canvas');
var dContext = mainCanvas.getContext('2d');

var imageSources = [ 'assets/cart-sprites.png', 'assets/sprite-characters.png', 'assets/skifree-objects.png', 'assets/token-sprites.png' ];
var global = this;
var infoBoxControls = 'Use the mouse or WASD to control the cart';
if (isMobileDevice()) infoBoxControls = 'Tap or drag on the road to control the cart';
var sprites = require('./spriteInfo');
const Hammer = require('hammerjs');

var pixelsPerMetre = 18;
var monsterDistanceThreshold = 2000;
const totalLives = 5;
var livesLeft = totalLives;
var highScore = 0;

const score = {
	distance: 0,
	money: 0,
	tokens: 0,
	points: 0,
	cans: 0,

	reset() {
		distance = 0;
		money = 0;
		tokens = 0;
		points = 0;
		cans = 0;
	}
};

var loseLifeOnObstacleHit = true;
var dropRates = {smallTree: 4, tallTree: 2, jump: 1, thickSnow: 1, rock: 1, token: 4};
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

function monsterHitsPlayerBehaviour(monster, player) {
	player.isEatenBy(monster, function () {
		livesLeft -= 1;
		monster.isFull = true;
		monster.isEating = false;
		player.isBeingEaten = false;
		monster.setSpeed(player.getSpeed());
		monster.stopFollowing();
		var randomPositionAbove = dContext.getRandomMapPositionAboveViewport();
		monster.setMapPositionTarget(randomPositionAbove[0], randomPositionAbove[1]);
	});
}

function startNeverEndingGame (images) {
	var player;
	var startSign;
	var infoBox;
	var game;

	function showMainMenu(images) {
		mainCanvas.style.display = 'none';
		$('#main').show();
	}

	function toggleGodMode() {
		loseLifeOnObstacleHit = !loseLifeOnObstacleHit;
		console.log('God mode changed: ' + !loseLifeOnObstacleHit);
	}

	function resetGame () {
		livesLeft = 5;
		highScore = localStorage.getItem('highScore');
		game.reset();
		game.addStaticObject(startSign);
		score.reset();
	}

	function detectEnd () {
		if (!game.isPaused()) {
			highScore = localStorage.setItem('highScore', score.distance);
			const level = score.distance < 100 ? 1 : Math.floor(score.distance / 100);
			infoBox.setLines([
				('Cash $' + score.money).padEnd(22) + 'Level ' + level,
				('Points' + score.money).padEnd(22) + 'Life 0%',
				('Tokens ' + score.tokens).padEnd(22) + 'Awake 100/100',
				('Distance ' + score.distance + 'm').padEnd(22) + 'Speed ' + player.getSpeed(),
				(loseLifeOnObstacleHit ? '' : 'God Mode').padEnd(22) + 'Game over! Hit space to restart.'
			]);
			game.pause();
			game.cycle();
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
		if (loseLifeOnObstacleHit)
			livesLeft -= 1;
	});

	player.setCollectItemCb(function(item) {
		if (item.data.name == 'Token')
		{
			// Pick a random token value
			score.tokens += item.data.pointValues[Math.floor(Math.random() * item.data.pointValues.length)];
		}
	});

	game = new Game(mainCanvas, player);

	startSign = new Sprite(sprites.signStart);
	game.addStaticObject(startSign);
	startSign.setMapPosition(-50, 0);
	dContext.followSprite(player);

	infoBox = new InfoBox({
		initialLines : [
			'Cash $0'.padEnd(22) + 'Level 1',
			'Points 0'.padEnd(22) + 'Life 0%',
			'Tokens 0'.padEnd(22) + 'Awake 100/100',
			'Distance 0m'.padEnd(22) + 'Speed 0',
			loseLifeOnObstacleHit ? '' : 'God Mode'
		],
		position: {
			top: 15,
			left: 115
		}
	});

	game.beforeCycle(function () {
		var newObjects = [];
		if (player.isMoving) {
			newObjects = Sprite.createObjects([
				//{ sprite: sprites.smallTree, dropRate: dropRates.smallTree },
				//{ sprite: sprites.tallTree, dropRate: dropRates.tallTree },
				{ sprite: sprites.jump, dropRate: dropRates.jump },
				{ sprite: sprites.thickSnow, dropRate: dropRates.thickSnow },
				{ sprite: sprites.rock, dropRate: dropRates.rock },
				{ sprite: sprites.token, dropRate: dropRates.token },
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

			score.distance = parseFloat(player.getPixelsTravelledDownMountain() / pixelsPerMetre).toFixed(1);

			if (score.distance > monsterDistanceThreshold) {
				randomlySpawnNPC(spawnMonster, 0.001);
			}

			const level = score.distance < 100 ? 1 : Math.floor(score.distance / 100);
			infoBox.setLines([
				('Cash $' + score.money).padEnd(22) + 'Level ' + level,
				('Points ' + score.money).padEnd(22) + 'Life ' + livesLeft / totalLives * 100 + '%',
				('Tokens ' + score.tokens).padEnd(22) + 'Awake 100/100',
				('Distance ' + score.distance + 'm').padEnd(22) + 'Speed ' + player.getSpeed(),
				loseLifeOnObstacleHit ? '' : 'God Mode'
			]);
		}
	});

	game.afterCycle(function() {
		if (livesLeft === 0) {
			detectEnd();
		}
	});

	game.addUIElement(infoBox);
	
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
	Mousetrap.bind('b', spawnBoarder);
	Mousetrap.bind('space', resetGame);
	Mousetrap.bind('g', toggleGodMode);
	Mousetrap.bind('h', game.toggleHitBoxes);

	var hammertime = new Hammer(mainCanvas).on('press', function (e) {
		e.preventDefault();
		game.setMouseX(e.gesture.center.x);
		game.setMouseY(e.gesture.center.y);
	}).on('tap', function (e) {
		game.setMouseX(e.gesture.center.x);
		game.setMouseY(e.gesture.center.y);
	}).on('pan', function (e) {
		game.setMouseX(e.gesture.center.x);
		game.setMouseY(e.gesture.center.y);
		player.resetDirection();
		player.startMovingIfPossible();
	}).on('doubletap', function (e) {
		player.speedBoost();
	});

	player.isMoving = false;
	player.setDirection(270);

	$('.play').click(function() {
		$('#menu').hide();
		mainCanvas.style.display = '';
		game.start();
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

window.addEventListener('resize', resizeCanvas, false);

resizeCanvas();

loadImages(imageSources, startNeverEndingGame);

this.exports = window;
