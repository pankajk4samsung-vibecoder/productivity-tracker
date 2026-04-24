import { useMemo, useState } from 'react';
import './App.css';

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function Square({ value, onClick, isWinningSquare }) {
  return (
    <button
      type="button"
      className={`square ${isWinningSquare ? 'square--winner' : ''}`}
      onClick={onClick}
      aria-label={value ? `Square ${value}` : 'Empty square'}
    >
      {value}
    </button>
  );
}

function calculateWinner(squares) {
  for (const [a, b, c] of winningLines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: [a, b, c] };
    }
  }

  return { winner: null, line: [] };
}

export default function App() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [isXTurn, setIsXTurn] = useState(true);

  const gameState = useMemo(() => calculateWinner(squares), [squares]);
  const isDraw = !gameState.winner && squares.every(Boolean);

  const statusText = gameState.winner
    ? `Winner: ${gameState.winner}`
    : isDraw
      ? 'Draw!'
      : `Next player: ${isXTurn ? 'X' : 'O'}`;

  const handleSquareClick = (index) => {
    if (squares[index] || gameState.winner) {
      return;
    }

    const nextSquares = [...squares];
    nextSquares[index] = isXTurn ? 'X' : 'O';

    setSquares(nextSquares);
    setIsXTurn((prevTurn) => !prevTurn);
  };

  const handleReset = () => {
    setSquares(Array(9).fill(null));
    setIsXTurn(true);
  };

  return (
    <main className="app">
      <section className="game-card">
        <h1>Tic-Tac-Toe</h1>
        <p className="status">{statusText}</p>

        <div className="board" role="grid" aria-label="Tic-Tac-Toe board">
          {squares.map((square, index) => (
            <Square
              key={index}
              value={square}
              onClick={() => handleSquareClick(index)}
              isWinningSquare={gameState.line.includes(index)}
            />
          ))}
        </div>

        <button type="button" className="reset-button" onClick={handleReset}>
          New game
        </button>
      </section>
    </main>
  );
}
