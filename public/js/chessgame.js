const socket = io(); // Initialize Socket.IO

const chess = new Chess(); // Initialize Chess.js
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null; // Player's role: 'w' for white, 'b' for black, or null for spectators

let selectedSquare = { row: 0, col: 0 }; // Currently selected square for keyboard navigation

const renderBoard = () => {
	const board = chess.board();
	boardElement.innerHTML = ""; // Clear the board

	board.forEach((row, rowIndex) => {
		row.forEach((square, squareIndex) => {
			const squareElement = document.createElement("div");
			squareElement.classList.add(
				"square",
				(rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
			);
			squareElement.dataset.row = rowIndex;
			squareElement.dataset.col = squareIndex;

			if (square) {
				const pieceElement = document.createElement("div");
				pieceElement.classList.add(
					"piece",
					square.color === "w" ? "white" : "black"
				);
				pieceElement.innerText = getPieceUnicode(square);
				pieceElement.draggable = playerRole === square.color; // Allow dragging only if it's the player's piece

				pieceElement.addEventListener("dragstart", (e) => {
					draggedPiece = pieceElement;
					sourceSquare = { row: rowIndex, col: squareIndex };
					e.dataTransfer.setData("text/plain", ""); // Required for Firefox
				});

				pieceElement.addEventListener("dragend", () => {
					draggedPiece = null;
					sourceSquare = null;
				});

				squareElement.appendChild(pieceElement);
			}

			squareElement.addEventListener("dragover", (e) => {
				e.preventDefault(); // Necessary to allow dropping
			});

			squareElement.addEventListener("drop", (e) => {
				e.preventDefault();
				if (draggedPiece) {
					const targetSquare = {
						row: parseInt(squareElement.dataset.row),
						col: parseInt(squareElement.dataset.col),
					};
					handleMove(sourceSquare, targetSquare);
				}
			});

			// Highlight the selected square
			if (selectedSquare.row === rowIndex && selectedSquare.col === squareIndex) {
				squareElement.classList.add("selected");
			}

			boardElement.appendChild(squareElement);
		});
	});

	// Flip the board if the player is black
	if (playerRole === "b") {
		boardElement.classList.add("flipped");
	} else {
		boardElement.classList.remove("flipped");
	}
};

const handleMove = (source, target) => {
	const move = {
		from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
		to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
		promotion: "q", // Always promote to queen for simplicity
	};

	console.log("Attempting move:", move);
	const moveResult = chess.move(move); // Try to make the move

	if (moveResult) {
		socket.emit("move", move); // Emit the move to the server
	} else {
		console.log("Invalid move attempted");
		// Optionally: provide visual feedback for invalid move
	}

	renderBoard(); // Re-render the board after each move attempt
};

const getPieceUnicode = (piece) => {
	const unicodePieces = {
		p: "♟", P: "♙",
		r: "♜", R: "♖",
		n: "♞", N: "♘",
		b: "♝", B: "♗",
		q: "♛", Q: "♕",
		k: "♚", K: "♔",
	};
	return unicodePieces[piece.type] || "";
};


document.addEventListener("keydown", (e) => {
	switch (e.key) {
		case "ArrowUp":
			if (selectedSquare.row > 0) selectedSquare.row--;
			break;
		case "ArrowDown":
			if (selectedSquare.row < 7) selectedSquare.row++;
			break;
		case "ArrowLeft":
			if (selectedSquare.col > 0) selectedSquare.col--;
			break;
		case "ArrowRight":
			if (selectedSquare.col < 7) selectedSquare.col++;
			break;
		case "Enter":
			if (sourceSquare) {

				handleMove(sourceSquare, selectedSquare);
				sourceSquare = null;
			} else {

				const piece = chess.board()[selectedSquare.row][selectedSquare.col];
				if (piece && piece.color === playerRole) {
					sourceSquare = { ...selectedSquare };
				}
			}
			break;
	}
	renderBoard();
});


socket.on("playerRole", function (role) {
	playerRole = role;
	renderBoard();
});

socket.on("spectatorRole", function () {
	playerRole = null;
	renderBoard();
});

socket.on("boardState", function (fen) {
	chess.load(fen);
	renderBoard();
});

socket.on("move", function (move) {
	chess.move(move);
	renderBoard();
});


renderBoard();
