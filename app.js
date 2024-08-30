const express = require("express");
const http = require("http");
const socket = require("socket.io");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let player = {};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
	res.render("index", { title: "Chess game" });
});

io.on("connection", function (uSocket) {
	console.log("A user connected:", uSocket.id);

	if (!player.white) {
		player.white = uSocket.id;
		uSocket.emit("playerRole", "w");
	} else if (!player.black) {
		player.black = uSocket.id;
		uSocket.emit("playerRole", "b");
	} else {
		uSocket.emit("spectatorRole");
		uSocket.emit("boardState", chess.fen());
	}

	uSocket.on("disconnect", function () {
		if (uSocket.id === player.white) {
			delete player.white;
		} else if (uSocket.id === player.black) {
			delete player.black;
		}
		console.log("A user disconnected:", uSocket.id);
	});

	uSocket.on("move", (move) => {
		try {
			if (chess.turn() === "w" && uSocket.id !== player.white) return;
			if (chess.turn() === "b" && uSocket.id !== player.black) return;

			const result = chess.move(move);
			if (result) {
				io.emit("move", move);
				io.emit("boardState", chess.fen());

				if (chess.game_over()) {
					io.emit("gameOver", { result: chess.turn() === "w" ? "Black wins" : "White wins" });
				}
			} else {
				console.log("Invalid move: ", move);
				uSocket.emit("Invalid move", move);
			}
		} catch (err) {
			console.error("Error processing move:", err);
			uSocket.emit("error", { message: "An error occurred while processing the move." });
		}
	});
});

server.listen(3001, function () {
	console.log("listening on port 3001");
});
