const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);

const sqlite = require("sqlite3");
const db = new sqlite.Database("db/record.db", sqlite.OPEN_READWRITE, (err) => {
	if (err) {
		console.error(err.message);
		return;
	}

	console.log("Connected to database.");
	db.run("CREATE TABLE IF NOT EXISTS leaderboard(username, password, score INTEGER)");
});

const path = require("path");

app.use(express.static(path.join(__dirname, "src")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "src", "index.html")));
app.post("/score", (req, res) => {
	const { score, username, password } = req.body;

	db.get(`SELECT * FROM leaderboard WHERE username='${username}'`, (err, row) => {
		if (err) {
			res.send(JSON.stringify({ result: "ERROR" }));
			return;
		}

		if (row) {
			if (row.password !== password) {
				res.send(JSON.stringify({ result: "INVALID_PASSWORD" }));
				return;
			}

			if (row.score > score) {
				res.send(JSON.stringify({ result: "NOT_SAVED" }));
				return;
			}

			db.run(`UPDATE leaderboard SET score=${score} WHERE username='${username}'`, (err) => {
				if (err) {
					res.send(JSON.stringify({ result: "ERROR" }));
					return;
				}

				res.send(JSON.stringify({ result: "SUCCESS" }));
			});
		} else {
			db.run(`INSERT INTO leaderboard VALUES('${username}', '${password}', ${score})`, (err) => {
				if (err) {
					res.send(JSON.stringify({ result: "ERROR" }));
					return;
				}

				res.send(JSON.stringify({ result: "SUCCESS" }));
			});
		}
	});
});
app.post("/top", (req, res) => {
	const { username } = req.body;

	db.all("SELECT * FROM leaderboard ORDER BY score desc", (err, rows) => {
		if (err) {
			res.send(JSON.stringify({ error: true }));
			return;
		}

		const top20 = rows.length > 20 ? rows.splice(0, 20) : rows;
		const rank = rows.indexOf(rows.find((row) => row.username === username)) + 1;

		res.send(JSON.stringify({ top20, rank: rank || "Unranked" }));
	});
});
app.post("/delete", (req, res) => {
	const { username, password } = req.body;

	db.get(`SELECT password FROM leaderboard WHERE username='${username}'`, (err, row) => {
		if (err) {
			res.send(JSON.stringify({ result: "ERROR" }));
			return;
		}

		if (row) {
			if (row.password !== password) {
				res.send(JSON.stringify({ result: "INVALID_PASSWORD" }));
				return;
			} else {
				db.run(`DELETE FROM leaderboard WHERE username='${username}'`, (err) => {
					if (err) {
						res.send(JSON.stringify({ result: "ERROR" }));
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
