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
		'player': {
			$imageFile : 'assets/hatguy-sprites.png',
			parts : {
				blank : [ 0, 0, 0, 0 ],
				east : [ 91, 0, 98, 91 ],
				esEast : [ 70, 187, 91,99 ],
				sEast : [ 143, 91, 73, 96 ],
				south : [ 83, 91, 60, 95 ],
				sWest : [ 0, 187, 70, 96 ],
				wsWest : [ 0, 91, 83, 92 ],
				west : [ 0, 0, 91, 85 ],
				hit : [ 83, 91, 60, 95 ],
				jumping : [ 161, 187, 65, 151 ],
				somersault1 : [ 83, 91, 60, 95 ],
				somersault1 : [ 83, 91, 60, 95 ],
				boost : [ 161, 187, 65, 151 ]
			},
			hitBoxes: {
				//Left, Top, Right, Bottom
				0: [ 5, 10, 55, 90 ]
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
		'smallTree' : {
			$imageFile : 'assets/skifree-objects.png',
			parts : {
				main : [ 0, 28, 30, 34 ]
			},
			hitBoxes: {
				0: [ 0, 18, 30, 34 ]
			},
			hitBehaviour: {}
		},
		'tallTree' : {
			$imageFile : 'assets/skifree-objects.png',
			parts : {
				main : [ 95, 66, 32, 64 ]
			},
			zIndexesOccupied : [0, 1],
			hitBoxes: {
				0: [0, 54, 32, 64],
				1: [0, 10, 32, 54]
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
		'rock' : {
			$imageFile : 'assets/skifree-objects.png',
			parts : {
				main : [ 30, 52, 23, 11 ]
			},
			hitBehaviour: {}
		},
		'monster' : {
			$imageFile : 'assets/malord-sprites.png',
			parts : {
				sEast1 : [ 332, 0, 166, 149 ],
				sEast2 : [ 498, 0, 166, 149 ],
				sWest1 : [ 0, 0, 166, 149 ],
				sWest2 : [ 166, 0, 166, 149 ],
				eating1 : [ 332, 0, 166, 149 ],
				eating2 : [ 498, 0, 166, 149 ],
				eating3 : [ 0, 0, 166, 149 ],
				eating4 : [ 166, 0, 166, 149 ],
				eating5 : [ 0, 0, 166, 149 ],
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

/* 	function monsterHitsTreeBehaviour(monster) {
		monster.deleteOnNextCycle();
	}

	sprites.monster.hitBehaviour.tree = monsterHitsTreeBehaviour;

	function treeHitsMonsterBehaviour(tree, monster) {
		monster.deleteOnNextCycle();
	}

	sprites.smallTree.hitBehaviour.monster = treeHitsMonsterBehaviour;
	sprites.tallTree.hitBehaviour.monster = treeHitsMonsterBehaviour; */

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

	function treeHitsPlayerBehaviour(tree, player) {
		player.hasHitObstacle(tree);
	}

	sprites.smallTree.hitBehaviour.player = treeHitsPlayerBehaviour;
	sprites.tallTree.hitBehaviour.player = treeHitsPlayerBehaviour;

	function rockHitsPlayerBehaviour(rock, player) {
		player.hasHitObstacle(rock);
	}
	sprites.rock.hitBehaviour.player = rockHitsPlayerBehaviour;

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

// Really not a fan of this behaviour.
/*	function playerHitsThickSnowBehaviour(player, thickSnow) {
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
	}*/

	// sprites.thickSnow.hitBehaviour.player = thickSnowHitsPlayerBehaviour;

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