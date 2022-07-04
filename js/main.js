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
	awake: 100,
	gameEndDateTime: null,

	god: false,

	reset() {
		distance = 0;
		money = 0;
		tokens = 0;
		points = 0;
		cans = 0;
		awake = 0;
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
		if (!game.isPaused()) {
			gameInfo.gameEndDateTime = new Date();
			highScore = localStorage.setItem('highScore', gameInfo.distance);
			updateHud('Game over!');
			
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
			if (player.isBeingEaten)
				setTimeout(stopGame, 3000);
			else
				stopGame();
		}
	}

	function stopGame() {
		game.pause();
		game.cycle();
		showGameOverMenu();
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

		gameHud.setLines([
			('Cash $' + gameInfo.money).padEnd(22) + 'Level ' + gameInfo.getLevel(),
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
		}, 20000);

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
		
		Mousetrap.unbind('v');
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
