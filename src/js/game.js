const font = new FontFace("PressStart2P", "url(../fonts/PressStart2P.ttf)");
font.load().then((font) => document.fonts.add(font));

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const SCREEN_WIDTH = canvas.width;
const SCREEN_HEIGHT = canvas.height;

const rectCollision = (x1, y1, w1, h1, x2, y2, w2, h2) => x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;

class Player {
	static get WIDTH() {
		return 30;
	}

	static get HEIGHT() {
		return 30;
	}

	static get SPEED() {
		return 3.5 * (60 / FPS);
	}

	static get SHOOT_COOLTIME() {
		return 30 / (60 / FPS);
	}

	static get SHIELD_COOLTIME() {
		return 250 / (60 / FPS);
	}

	static get HIT_COOLTIME() {
		return 80 / (60 / FPS);
	}

	static get life() {
		return Player.#life;
	}

	static get shieldAvailable() {
		return Player.#shieldCooltime <= 0;
	}

	static x = SCREEN_WIDTH / 2 - Player.WIDTH / 2;
	static y = SCREEN_HEIGHT - Player.HEIGHT * 3;

	static score = 0;

	static #life = 3;
	static #shootCooltime = 0;
	static #shieldCooltime = 0;
	static #hitCooltime = 0;

	static #checkHit() {
		if (Player.#hitCooltime > 0) return;

		const hitEffect = () => {
			stopAnimate = true;

			ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
			ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

			setTimeout(() => {
				if (Player.life <= 0) {
					stopAnimate = true;
					gameOver();
				}

				animate();
			}, 400);
		};

		for (let bullet of objects.filter((obj) => obj instanceof Bullet && obj.type === "Invader")) {
			if (
				rectCollision(
					Player.x,
					Player.y,
					Player.WIDTH,
					Player.HEIGHT,
					bullet.x,
					bullet.y,
					Bullet.WIDTH,
					Bullet.HEIGHT
				)
			) {
				Player.#hitCooltime = Player.HIT_COOLTIME;
				Player.#life--;
				objects.splice(objects.indexOf(bullet), 1);

				hitEffect();

				return;
			}
		}

		for (let invader of objects.filter((obj) => obj instanceof Invader)) {
			if (
				rectCollision(
					Player.x,
					Player.y,
					Player.WIDTH,
					Player.HEIGHT,
					invader.x,
					invader.y,
					Invader.WIDTH,
					Invader.HEIGHT
				)
			) {
				Player.#hitCooltime = Player.HIT_COOLTIME;
				Player.#life--;
				objects.splice(objects.indexOf(invader), 1);

				hitEffect();

				return;
			}
		}
	}

	static #shoot() {
		Player.#shootCooltime = Player.SHOOT_COOLTIME;
		objects.push(new Bullet(Player.x + Player.WIDTH / 2, Player.y, "Player"));
	}

	static #createShield() {
		Player.#shieldCooltime = Player.SHIELD_COOLTIME;
		objects.push(new Shield(Player.x - Player.WIDTH / 2, Player.y - Player.HEIGHT * 2));
	}

	static update() {
		if ((keys["A"] || keys["ARROWLEFT"]) && this.x > 0) {
			Player.x -= Player.SPEED;
		} else if ((keys["D"] || keys["ARROWRIGHT"]) && this.x + Player.WIDTH < SCREEN_WIDTH) {
			Player.x += Player.SPEED;
		}

		if (keys[" "] && Player.#shootCooltime <= 0) {
			Player.#shoot();
		} else if (keys["S"] && Player.#shieldCooltime <= 0) {
			Player.#createShield();
		}

		if (Player.#shootCooltime > 0) {
			Player.#shootCooltime--;
		} else if (Player.#shieldCooltime > 0) {
			Player.#shieldCooltime--;
		} else if (Player.#hitCooltime > 0) {
			Player.#hitCooltime--;
		}

		Player.#checkHit();
		Player.#draw();
	}

	static #draw() {
		ctx.fillStyle = "white";
		ctx.fillRect(Player.x, Player.y, Player.WIDTH, Player.HEIGHT);

		if (Player.#hitCooltime > 0) {
			ctx.fillStyle = "gray";
			ctx.globalAlpha = 0.5;

			ctx.beginPath();
			ctx.arc(
				this.x + Player.WIDTH / 2,
				this.y + Player.HEIGHT / 2,
				(Player.WIDTH * this.#hitCooltime) / Player.HIT_COOLTIME,
				0,
				2 * Math.PI
			);
			ctx.fill();

			ctx.globalAlpha = 1;
		}
	}
}

class Invader {
	static get WIDTH() {
		return 30;
	}

	static get HEIGHT() {
		return 30;
	}

	static get SPEED() {
		return 0.8 * (60 / FPS);
	}

	static get SCORE_PER_INVADER() {
		return 100;
	}

	static get SHOOT_COOLTIME() {
		return 70 / (60 / FPS);
	}

	#cooltime = 0;

	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	#checkHit() {
		for (let bullet of objects.filter((obj) => obj instanceof Bullet && obj.type === "Player")) {
			if (
				rectCollision(
					this.x,
					this.y,
					Invader.WIDTH,
					Invader.HEIGHT,
					bullet.x,
					bullet.y,
					Bullet.WIDTH,
					Bullet.HEIGHT
				)
			) {
				Player.score += Invader.SCORE_PER_INVADER;

				objects.splice(objects.indexOf(bullet), 1);
				objects.splice(objects.indexOf(this), 1);

				objects.push(
					new CircleEffect(this.x + Invader.WIDTH / 2, this.y + Invader.HEIGHT / 2, Invader.WIDTH, "green")
				);

				return;
			}
		}

		for (let shield of objects.filter((obj) => obj instanceof Shield)) {
			if (
				rectCollision(
					this.x,
					this.y,
					Invader.WIDTH,
					Invader.HEIGHT,
					shield.x,
					shield.y,
					Shield.WIDTH,
					Shield.HEIGHT
				)
			) {
				this.y -= Invader.SPEED;
			}
		}
	}

	#shoot() {
		this.#cooltime = Invader.SHOOT_COOLTIME;
		objects.push(new Bullet(this.x + Invader.WIDTH / 2, this.y, "Invader"));
	}

	update() {
		if (Player.x < this.x + Invader.WIDTH + 5 && Player.x + Player.WIDTH > this.x - 5 && this.#cooltime <= 0) {
			this.#shoot();
		}

		if (this.#cooltime <= 0) {
			for (let shield of objects.filter((obj) => obj instanceof Shield)) {
				if (
					shield.x + Invader.WIDTH / 2 < this.x + Invader.WIDTH + 5 &&
					shield.x + Invader.WIDTH * 1.5 > this.x - 5
				) {
					this.#shoot();
					break;
				}
			}
		} else {
			this.#cooltime--;
		}

		this.y += Invader.SPEED;

		if (this.y + Invader.HEIGHT > SCREEN_HEIGHT) {
			objects.push(
				new CircleEffect(this.x + Invader.WIDTH / 2, this.y + Invader.HEIGHT / 2, Invader.WIDTH, "green")
			);

			// This code for decrease player's life
			this.x = Player.x;
			this.y = Player.y;
		}

		this.#checkHit();
		this.#draw();
	}

	#draw() {
		ctx.fillStyle = "green";
		ctx.fillRect(this.x, this.y, Invader.WIDTH, Invader.HEIGHT);
	}
}

class Bullet {
	static get WIDTH() {
		return 5;
	}

	static get HEIGHT() {
		return 20;
	}

	constructor(x, y, type) {
		if (!["Player", "Invader"].includes(type)) {
			throw new Error(`Bullet type must be "Player" or "Invader".`);
		}

		this.x = x;
		this.y = y;
		this.type = type;

		objects.push(this);
	}

	update() {
		this.y += this.type === "Player" ? -4 * (60 / FPS) : 3 * (60 / FPS);

		if ((this.type === "Player" && this.y < 0) || (this.type === "Invader" && this.y > SCREEN_HEIGHT)) {
			objects.splice(objects.indexOf(this), 1);
		}

		this.#draw();
	}

	#draw() {
		ctx.fillStyle = this.type === "Player" ? "yellow" : "red";
		ctx.fillRect(this.x, this.y, Bullet.WIDTH, Bullet.HEIGHT);
	}
}

class Shield {
	static get WIDTH() {
		return 100;
	}

	static get HEIGHT() {
		return 20;
	}

	#lifetime = 800;
	#fill = "lightblue";

	constructor(x, y) {
		this.x = x;
		this.y = y;

		objects.push(this);
		objects.push(new CircleEffect(this.x + Shield.WIDTH / 2, this.y + Shield.HEIGHT / 2, 50, "lightblue"));
	}

	#checkHit() {
		for (let bullet of objects.filter((obj) => obj instanceof Bullet && obj.type === "Invader")) {
			if (
				rectCollision(
					this.x,
					this.y,
					Shield.WIDTH,
					Shield.HEIGHT,
					bullet.x,
					bullet.y,
					Bullet.WIDTH,
					Bullet.HEIGHT
				)
			) {
				this.#lifetime -= 20;
				objects.splice(objects.indexOf(bullet), 1);
				return;
			}
		}
	}

	update() {
		this.#lifetime -= 60 / FPS;

		if (this.#lifetime <= 0) {
			// When #lifetime is 0, remove it from objects array
			objects.splice(objects.indexOf(this), 1);
			objects.push(new CircleEffect(this.x + Shield.WIDTH / 2, this.y + Shield.HEIGHT / 2, 50, "orangered"));
		} else if (this.#lifetime <= 200) {
			this.#fill = "orangered";
		} else if (this.#lifetime <= 400) {
			this.#fill = "skyblue";
		}

		this.#checkHit();
		this.#draw();
	}

	#draw() {
		ctx.fillStyle = this.#fill;
		ctx.fillRect(this.x, this.y, Shield.WIDTH, Shield.HEIGHT);
	}
}

class CircleEffect {
	#x = 0;
	#y = 0;
	#alpha = 1;
	#radius = 0;
	#color = "black";

	constructor(x, y, radius, color) {
		this.#x = x;
		this.#y = y;
		this.#radius = radius;
		this.#color = color;

		objects.push(this);
	}

	update() {
		if (this.#alpha > 0) {
			this.#alpha -= 0.1 * (60 / FPS);
			this.#radius += 60 / FPS;
		} else {
			objects.splice(objects.indexOf(this), 1);
		}

		this.#draw();
	}

	#draw() {
		ctx.fillStyle = this.#color;
		ctx.globalAlpha = this.#alpha;

		ctx.beginPath();
		ctx.arc(this.#x, this.#y, this.#radius, 0, 2 * Math.PI);
		ctx.fill();

		ctx.globalAlpha = 1;
	}
}

const keys = {};
window.addEventListener("keydown", (e) => (keys[e.key.toUpperCase()] = true));
window.addEventListener("keyup", (e) => delete keys[e.key.toUpperCase()]);

const startButton = document.getElementById("start");
startButton.addEventListener("click", startGame);

let started = false;
function startGame() {
	if (started) return;

	document.querySelector(".intro").style.display = "none";
	document.querySelector("main").style.display = "flex";

	started = true;
	setTimeout(animate, 1000);
}

const objects = [];

function gameOver() {
	setTimeout(() => ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT), 1500);
	setTimeout(() => {
		ctx.fillStyle = "white";

		ctx.font = "40px PressStart2P";
		ctx.textAlign = "center";
		ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 30);

		ctx.font = "25px PressStart2P";
		ctx.fillText(`Score: ${Player.score}`, canvas.width / 2, canvas.height / 2 + 20);

		const div = document.createElement("div");
		div.style.marginTop = "20px";

		const restartButton = document.createElement("button");
		restartButton.innerText = "Main Page";
		restartButton.addEventListener("click", () => location.reload());
		div.appendChild(restartButton);

		const saveButton = document.createElement("button");
		saveButton.innerText = "Save Record";
		saveButton.addEventListener("click", saveRecord);
		div.appendChild(saveButton);

		saveButton.style.margin = restartButton.style.margin = "0 5px";

		document.querySelector("main").appendChild(div);
	}, 3000);
}

function saveRecord() {
	const username = prompt("Enter your username");
	if (!username) {
		alert("Please enter your username.");
		return;
	} else if (username.length >= 20) {
		alert("Your username is so long.");
		return;
	}

	const password = prompt("Enter your password");
	if (!password) {
		alert("Please enter your password.");
		return;
	} else if (password.length >= 25) {
		alert("Your password is so long.");
		return;
	}

	const xhr = new XMLHttpRequest();
	xhr.open("POST", "/score", true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.send(JSON.stringify({ score: Player.score, username, password }));

	xhr.onreadystatechange = () => {
		if (xhr.readyState === 4 && xhr.status === 200) {
			const response = JSON.parse(xhr.response);
			const { result } = response;

			if (result === "SUCCESS") {
				alert("Successfully saved your record!");
			} else if (result === "INVALID_PASSWORD") {
				alert("Password is incorrect.");
			} else if (result === "NOT_SAVED") {
				alert("We didn't saved your record.\nYour previous score is higher than current score.");
			}
		} else if (xhr.readyState === 4 && xhr.status === 500) {
			alert("An error occurred while saving your record.");
		}
	};
}

let handle, stopAnimate;

const SPAWN_COOLTIME = 120;
let spawnCooltime = SPAWN_COOLTIME;

const FPS = 60;
const FRAME_MIN_TIME = (1000 / 60) * (60 / FPS) - (1000 / 60) * 0.5;
let lastFrameTime = 0;

function animate(time) {
	if (time - lastFrameTime < FRAME_MIN_TIME) {
		requestAnimationFrame(animate);
		return;
	}

	lastFrameTime = time;

	ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

	if (!spawnCooltime) {
		spawnCooltime = SPAWN_COOLTIME - Player.score / 100;
		objects.push(new Invader(Math.random() * (SCREEN_WIDTH - Invader.WIDTH), 0));
	} else {
		spawnCooltime--;
	}

	Player.update();

	for (let object of objects) {
		object.update();
	}

	ctx.fillStyle = "white";
	ctx.font = "16px PressStart2P";
	ctx.fillText(`Score: ${Player.score}`, 10, 20);

	ctx.fillStyle = "red";
	ctx.fillText(`Life: ${Player.life}`, 10, 40);

	ctx.fillStyle = Player.shieldAvailable ? "lightblue" : "orange";
	ctx.textAlign = "right";
	ctx.fillText(`Shield ${Player.shieldAvailable ? "is ready" : "is not ready"}`, SCREEN_WIDTH - 10, 20);

	ctx.textAlign = "left";

	if (stopAnimate) {
		stopAnimate = false;
		cancelAnimationFrame(handle);
		return;
	}

	handle = requestAnimationFrame(animate);
}
