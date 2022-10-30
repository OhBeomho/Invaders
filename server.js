const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);

require("dotenv").config();

const { Client } = require("pg");
const {  DB_URL } = process.env;
const db = new Client(DB_URL);
db.connect((err) => {
	if (err) {
		console.error("Database connection failed. Error: " + err.message);
		return;
	}

	console.log("Connected to database.");

	db.query(
		"CREATE TABLE IF NOT EXISTS leaderboard(username TEXT, password TEXT, score INTEGER)",
		(err, _result) => {
			if (err) {
				console.error("Failed to initialize database. " + err.message);
				return;
			}

			console.log("Initialized database.");
		}
	);
});

const path = require("path");

app.use(express.static(path.join(__dirname, "src")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "src", "index.html")));
app.post("/score", (req, res) => {
	const { score, username, password } = req.body;

	db.query(`SELECT * FROM leaderboard WHERE username='${username}'`, (err, result) => {
		if (err) {
			res.sendStatus(500);
			return;
		}

		const row = result.rows[0];

		if (row) {
			if (row.password !== password) {
				res.send(JSON.stringify({ result: "INVALID_PASSWORD" }));
				return;
			}

			if (row.score > score) {
				res.send(JSON.stringify({ result: "NOT_SAVED" }));
				return;
			}

			db.query(`UPDATE leaderboard SET score=${score} WHERE username='${username}'`, (err, _result) => {
				if (err) {
					res.sendStatus(500);
					return;
				}

				res.send(JSON.stringify({ result: "SUCCESS" }));
			});
		} else {
			db.query(`INSERT INTO leaderboard VALUES('${username}', '${password}', ${score})`, (err, _result) => {
				if (err) {
					res.sendStatus(500);
					return;
				}

				res.send(JSON.stringify({ result: "SUCCESS" }));
			});
		}
	});
});
app.post("/top", (req, res) => {
	const { username } = req.body;

	db.query("SELECT * FROM leaderboard ORDER BY score desc", (err, result) => {
		if (err) {
			res.sendStatus(500);
			return;
		}

		const rows = result.rows;
		const top20 = rows.length > 20 ? rows.splice(0, 20) : rows;

		const me = rows.find((row) => row.username === username);
		const rank = rows.indexOf(me) + 1;

		res.send(JSON.stringify({ top20, rank: rank || "Unranked", score: me?.score || 0 }));
	});
});
app.post("/delete", (req, res) => {
	const { username, password } = req.body;

	db.query(`SELECT password FROM leaderboard WHERE username='${username}'`, (err, result) => {
		if (err) {
			res.sendStatus(500);
			return;
		}

		const row = result.rows[0];

		if (row) {
			if (row.password !== password) {
				res.send(JSON.stringify({ result: "INVALID_PASSWORD" }));
				return;
			} else {
				db.query(`DELETE FROM leaderboard WHERE username='${username}'`, (err, _result) => {
					if (err) {
						res.sendStatus(500);
						return;
					}

					res.send(JSON.stringify({ result: "SUCCESS" }));
					return;
				});
			}
		} else {
			res.send(JSON.stringify({ result: "UNRANKED" }));
			return;
		}
	});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server started. Port: " + PORT));
