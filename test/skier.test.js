var extenders = require(__dirname + '/../js/lib/extenders');
var Sprite = require(__dirname + '/../js/lib/sprite');
var Player = require(__dirname + '/../js/lib/player');
var should = require('should');
var sugar = require('sugar');

describe('Player', function() {
	describe('#getMovingTowardOpposite()', function() {
		it('should return the point relative to the player, rotated 180 degrees around the player if the player is going right', function() {
			var player = new Player();
			player.setSpeed(3);
			player.setMapPosition(10, 30);
			player.setMapPositionTarget(100, 36);

			player.getMovingTowardOpposite()[0].should.equal(-90);
			player.getMovingTowardOpposite()[1].should.equal(-6);
		});

		it('should return the point relative to the player, rotated 180 degrees around the player if the player is going left', function() {
			var player = new Player();
			player.setSpeed(3);
			player.setMapPosition(10, 30);
			player.setMapPositionTarget(-100, 36);

			player.getMovingTowardOpposite()[0].should.equal(110);
			player.getMovingTowardOpposite()[1].should.equal(-6);
		});
	});

	describe('#hits()', function() {
		it('should still hit taller objects if jumping', function() {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.hasHitJump();
			
			var tallSprite = new Sprite({
				zIndexesOccupied : [0, 1]
			});

			tallSprite.setHeight(10);
			tallSprite.setWidth(10);
			tallSprite.setMapPosition(10, 30);

			player.hits(tallSprite).should.equal(true);
		});

		it('should still hit taller objects with a high-up z-index if jumping', function() {
			var player = new Player();
			player.setMapPosition(30, 25);
			player.setHeight(10);
			player.setWidth(10);
			player.hasHitJump();
			
			var tallSprite = new Sprite({
				zIndexesOccupied : [0, 1],
				hitBoxes: {
					0: [0, 15, 10, 20],
					1: [0, 5, 10, 15]
				}
			});

			tallSprite.setHeight(20);
			tallSprite.setWidth(10);
			tallSprite.setMapPosition(30, 30);

			player.hits(tallSprite).should.equal(true);
		});

		it('should not hit shorter objects if jumping', function() {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.hasHitJump();

			var shortSprite = new Sprite({
				zIndexesOccupied : [0]
			});

			shortSprite.setHeight(10);
			shortSprite.setWidth(10);
			shortSprite.setMapPosition(10, 30);

			player.hits(shortSprite).should.equal(false);
		});
	});

	describe('#getSpeedX()', function() {
		it('should ease on the x-axis when the player turns south-east', function () {
			var player = new Player();
			player.setTurnEaseCycles(5);
			player.setSpeed(4);
			player.setMapPosition(10, 30);
			player.setMapPositionTarget(10, 30);
			player.getSpeedX().should.equal(0);
			player.setMapPositionTarget(150, 35);
			player.getSpeedX().should.equal(4 * (0.33 / 5));
			player.getSpeedX().should.equal(4 * (0.33 / 5) * 2);
			player.getSpeedX().should.equal(4 * (0.33 / 5) * 3);
			player.getSpeedX().should.equal(4 * (0.33 / 5) * 4);
			player.getSpeedX().should.equal(4 * 0.33);
		});

		it('should ease on the x-axis when the player turns east-south-east', function () {
			var player = new Player();
			player.setTurnEaseCycles(5);
			player.setSpeed(4);
			player.setMapPosition(10, 30);
			player.setMapPositionTarget(10, 30);
			player.getSpeedX().should.equal(0);
			player.setMapPositionTarget(450, 35);
			player.getSpeedX().should.equal(4 * (0.5 / 5));
			player.getSpeedX().should.equal(4 * (0.5 / 5) * 2);
			player.getSpeedX().should.equal(4 * (0.5 / 5) * 3);
			player.getSpeedX().should.equal(4 * (0.5 / 5) * 4);
			player.getSpeedX().should.equal(4 * 0.5);
		});

		it('should ease on the x-axis back down when the player turns from east-south-east to south', function () {
			var player = new Player();
			player.setTurnEaseCycles(5);
			player.setSpeed(4);
			player.setMapPosition(10, 30);
			player.setMapPositionTarget(10, 30);
			player.getSpeedX().should.equal(0);
			player.setMapPositionTarget(450, 35);
			player.getSpeedX().should.equal(4 * (0.5 / 5));
			player.getSpeedX().should.equal(4 * (0.5 / 5) * 2);
			player.getSpeedX().should.equal(4 * (0.5 / 5) * 3);
			player.getSpeedX().should.equal(4 * (0.5 / 5) * 4);
			player.getSpeedX().should.equal(4 * 0.5);
			player.setMapPositionTarget(10, 35);
			player.getSpeedX().should.equal(4 * (0.5 / 5) * 4);
		});
	});

	describe('#getSpeedY()', function() {
		it('should ease on the y-axis when the player turns from east (stationary) to south-east', function () {
			var player = new Player();
			player.setTurnEaseCycles(5);
			player.setSpeed(4);
			player.setMapPosition(10, 30);
			player.setMapPositionTarget(15, 30);
			player.getSpeedY().should.equal(0);
			player.setMapPositionTarget(150, 35);
			player.getSpeedY().should.equal(4 * (0.85 / 5));
			player.getSpeedY().should.equal(4 * (0.85 / 5) * 2);
			player.getSpeedY().should.equal(4 * (0.85 / 5) * 3);
			player.getSpeedY().should.equal(4 * (0.85 / 5) * 4);
			player.getSpeedY().should.equal(4 * (0.85 / 5) * 5);
		});

		it('should ease on the y-axis when the player turns from east (stationary) to east-south-east from', function () {
			var player = new Player();
			player.setTurnEaseCycles(5);
			player.setSpeed(4);
			player.setMapPosition(10, 30);
			player.setMapPositionTarget(10, 30);
			player.getSpeedY().should.equal(0);
			player.setMapPositionTarget(450, 35);
			player.getSpeedY().should.equal(4 * (0.6 / 5));
			player.getSpeedY().should.equal(4 * (0.6 / 5) * 2);
			player.getSpeedY().should.equal(4 * (0.6 / 5) * 3);
			player.getSpeedY().should.equal(4 * (0.6 / 5) * 4);
			player.getSpeedY().should.equal(4 * 0.6);
		});

		it('should ease on the y-axis when the player turns from east (stationary) to east-south-east to south', function () {
			var player = new Player();
			player.setTurnEaseCycles(5);
			player.setSpeed(4);
			player.setMapPosition(10, 30);
			player.setMapPositionTarget(10, 30);
			player.getSpeedY().should.equal(0);
			player.setMapPositionTarget(450, 35);
			player.getSpeedY().should.equal(4 * (0.6 / 5));
			player.getSpeedY().should.equal(4 * (0.6 / 5) * 2);
			player.getSpeedY().should.equal(4 * (0.6 / 5) * 3);
			player.getSpeedY().should.equal(4 * (0.6 / 5) * 4);
			player.getSpeedY().should.equal(4 * 0.6);
			player.setMapPositionTarget(10, 45);
			player.getSpeedY().should.equal(4 * (0.6 / 5) * 6);
			player.getSpeedY().should.equal(4 * (0.6 / 5) * 7);
		});
	});

	describe('#setMapPositionTarget()', function() {
		it('should not allow setting the map position target whilst jumping', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setSpeed(4);
			player.setSpeedY(4);
			player.setMapPositionTarget(10, 70);
			player.getSpeedY().should.equal(4);
			player.hasHitJump();
			player.cycle();
			player.setMapPositionTarget(80, -40);
			player.getSpeedY().should.equal(6);
		});
	});

	describe('#turnEast()', function() {
		it('should go one discrete direction from stopping west', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setDirection(270);
			player.turnEast();
			player.direction.should.equal(240);
		});
		
		it('should go two discrete directions from stopping west', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setDirection(270);
			player.turnEast();
			player.turnEast();
			player.direction.should.equal(195);
		});

		it('should go three discrete directions from stopping west', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setDirection(270);
			player.turnEast();
			player.turnEast();
			player.turnEast();
			player.direction.should.equal(180);
		});

		it('should go four discrete directions from stopping west', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setDirection(270);
			player.turnEast();
			player.turnEast();
			player.turnEast();
			player.turnEast();
			player.direction.should.equal(165);
		});

		it('should go five discrete directions from stopping west', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setDirection(270);
			player.turnEast();
			player.turnEast();
			player.turnEast();
			player.turnEast();
			player.turnEast();
			player.direction.should.equal(120);
		});

		it('should go six discrete directions from stopping west', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setDirection(270);
			player.turnEast();
			player.turnEast();
			player.turnEast();
			player.turnEast();
			player.turnEast();
			player.turnEast();
			player.direction.should.equal(90);
		});

		it('should go to next discrete direction from arbitrary direction', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setDirection(255);
			player.turnEast();
			player.direction.should.equal(195);
		});
	});

	describe('#turnWest()', function() {
		it('should go one discrete directions from stopping east', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setDirection(90);
			player.turnWest();
			player.direction.should.equal(120);
		});

		it('should go two discrete directions from stopping east', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setDirection(90);
			player.turnWest();
			player.turnWest();
			player.direction.should.equal(165);
		});

		it('should go three discrete directions from stopping east', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setDirection(90);
			player.turnWest();
			player.turnWest();
			player.turnWest();
			player.direction.should.equal(180);
		});
		
		it('should go four discrete directions from stopping east', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setDirection(90);
			player.turnWest();
			player.turnWest();
			player.turnWest();
			player.turnWest();
			player.direction.should.equal(195);
		});

		it('should go five discrete direction from stopping east', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setDirection(90);
			player.turnWest();
			player.turnWest();
			player.turnWest();
			player.turnWest();
			player.turnWest();
			player.direction.should.equal(240);
		});

		it('should go six discrete direction from stopping east', function () {
			var player = new Player();
			player.setMapPosition(10, 30);
			player.setDirection(90);
			player.turnWest();
			player.turnWest();
			player.turnWest();
			player.turnWest();
			player.turnWest();
			player.turnWest();
			player.direction.should.equal(270);
		});
	});

	describe('#stepWest()',  function() {
		it('should go twice the speed steps to the west', function () {
			var player = new Player();
			player.setSpeed(3);
			player.setMapPosition(10, 30);
			player.stepWest();
			player.mapPosition[0].should.equal(4);
		});
	});

	describe('#stepEast()',  function() {
		it('should go twice the speed steps to the east', function () {
			var player = new Player();
			player.setSpeed(3);
			player.setMapPosition(10, 30);
			player.stepEast();
			player.mapPosition[0].should.equal(16);
		});
	});
});