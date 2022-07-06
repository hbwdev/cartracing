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