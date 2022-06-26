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
				main : [ 0, 0, 39, 18 ]
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
			$imageFile : 'assets/skifree-objects.png',
			parts : {
				main : [ 260, 103, 42, 27 ]
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