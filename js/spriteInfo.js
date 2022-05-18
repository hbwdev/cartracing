(function (global) {
	var sprites = {
		'player' : {
			$imageFile : 'sprite-characters.png',
			parts : {
				blank : [ 0, 0, 0, 0 ],
				//east : [ 0, 0, 24, 34 ],
				east : [ 110, 37, 36, 34 ],
				//esEast : [ 24, 0, 24, 34 ],
				esEast : [ 207, 74, 60, 34 ],
				//sEast : [ 49, 0, 17, 34 ],
				sEast : [ 207, 74, 60, 34 ],
				south : [ 65, 0, 17, 34 ],
				//sWest : [ 49, 37, 17, 34 ],
				sWest : [ 144, 74, 60, 34 ],
				//wsWest : [ 24, 37, 24, 34 ],
				wsWest : [ 144, 74, 60, 34 ],
				//west : [ 0, 37, 24, 34 ],
				west : [ 71, 37, 37, 34 ],
				//hit : [ 0, 78, 31, 31 ],
				hit : [ 65, 0, 17, 34 ],
				//jumping : [ 84, 0, 32, 34 ],
				jumping : [ 65, 0, 17, 34 ],
				//somersault1 : [ 116, 0, 32, 34 ],
				somersault1 : [ 65, 0, 17, 34 ],
				//somersault2 : [ 148, 0, 32, 34 ]
				somersault1 : [ 65, 0, 17, 34 ]
			},
			hitBoxes: {
				0: [ 7, 20, 27, 34 ]
			},
			id : 'player',
			hitBehaviour: {}
		},
		'smallTree' : {
			$imageFile : 'skifree-objects.png',
			parts : {
				main : [ 0, 28, 30, 34 ]
			},
			hitBoxes: {
				0: [ 0, 18, 30, 34 ]
			},
			hitBehaviour: {}
		},
		'tallTree' : {
			$imageFile : 'skifree-objects.png',
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
			$imageFile : 'skifree-objects.png',
			parts : {
				main : [ 143, 53, 43, 10 ]
			},
			hitBehaviour: {}
		},
		'rock' : {
			$imageFile : 'skifree-objects.png',
			parts : {
				main : [ 30, 52, 23, 11 ]
			},
			hitBehaviour: {}
		},
		'monster' : {
			$imageFile : 'sprite-characters.png',
			parts : {
				sEast1 : [ 64, 112, 26, 43 ],
				sEast2 : [ 90, 112, 32, 43 ],
				sWest1 : [ 64, 158, 26, 43 ],
				sWest2 : [ 90, 158, 32, 43 ],
				eating1 : [ 122, 112, 34, 43 ],
				eating2 : [ 156, 112, 31, 43 ],
				eating3 : [ 187, 112, 31, 43 ],
				eating4 : [ 219, 112, 25, 43 ],
				eating5 : [ 243, 112, 26, 43 ]
			},
			hitBehaviour: {}
		},
		'jump' : {
			$imageFile : 'skifree-objects.png',
			parts : {
				main : [ 109, 55, 32, 8 ]
			},
			hitBehaviour: {}
		},
		'signStart' : {
			$imageFile : 'skifree-objects.png',
			parts : {
				main : [ 260, 103, 42, 27 ]
			},
			hitBehaviour: {}
		},
		'snowboarder' : {
			$imageFile : 'sprite-characters.png',
			parts : {
				sEast : [ 73, 229, 20, 29 ],
				sWest : [ 95, 228, 26, 30 ]
			},
			hitBehaviour: {}
		},
		'emptyChairLift': {
			$imageFile : 'skifree-objects.png',
			parts: {
				main : [ 92, 136, 26, 30 ]
			},
			zIndexesOccupied : [1],
		}
	};

	function monsterHitsTreeBehaviour(monster) {
		monster.deleteOnNextCycle();
	}

	sprites.monster.hitBehaviour.tree = monsterHitsTreeBehaviour;

	function treeHitsMonsterBehaviour(tree, monster) {
		monster.deleteOnNextCycle();
	}

	sprites.smallTree.hitBehaviour.monster = treeHitsMonsterBehaviour;
	sprites.tallTree.hitBehaviour.monster = treeHitsMonsterBehaviour;

	function playerHitsTreeBehaviour(player, tree) {
		player.hasHitObstacle(tree);
	}

	function treeHitsSkierBehaviour(tree, player) {
		player.hasHitObstacle(tree);
	}

	sprites.smallTree.hitBehaviour.player = treeHitsSkierBehaviour;
	sprites.tallTree.hitBehaviour.player = treeHitsSkierBehaviour;

	function rockHitsSkierBehaviour(rock, player) {
		player.hasHitObstacle(rock);
	}

	sprites.rock.hitBehaviour.player = rockHitsSkierBehaviour;

	function playerHitsJumpBehaviour(player, jump) {
		player.hasHitJump(jump);
	}

	function jumpHitsSkierBehaviour(jump, player) {
		player.hasHitJump(jump);
	}

	sprites.jump.hitBehaviour.player = jumpHitsSkierBehaviour;

// Really not a fan of this behaviour.
/*	function playerHitsThickSnowBehaviour(player, thickSnow) {
		// Need to implement this properly
		player.setSpeed(2);
		setTimeout(function() {
			player.resetSpeed();
		}, 700);
	}

	function thickSnowHitsSkierBehaviour(thickSnow, player) {
		// Need to implement this properly
		player.setSpeed(2);
		setTimeout(function() {
			player.resetSpeed();
		}, 300);
	}*/

	// sprites.thickSnow.hitBehaviour.player = thickSnowHitsSkierBehaviour;

	function snowboarderHitsSkierBehaviour(snowboarder, player) {
		player.hasHitObstacle(snowboarder);
	}

	sprites.snowboarder.hitBehaviour.player = snowboarderHitsSkierBehaviour;

	global.spriteInfo = sprites;
})( this );


if (typeof module !== 'undefined') {
	module.exports = this.spriteInfo;
}