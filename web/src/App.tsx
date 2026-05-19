import { useState, useCallback, useEffect, useMemo } from "react";
import { GameShell, GameTopbar, GameAuth, GameButton } from "@freegamestore/games";
import { useHighScore } from "./hooks/useHighScore";

type Cell = "X" | "O" | null;
type Board = Cell[];
type Result = "X" | "O" | "draw" | null;

const LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function evaluate(board: Board): { result: Result; line: readonly number[] | null } {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { result: board[a] as "X" | "O", line };
    }
  }
  return { result: board.every((c) => c !== null) ? "draw" : null, line: null };
}

function minimax(board: Board, player: "X" | "O", ai: "X" | "O"): number {
  const { result } = evaluate(board);
  if (result === ai) return 10;
  if (result && result !== "draw") return -10;
  if (result === "draw") return 0;

  const scores: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = player;
      scores.push(minimax(board, player === "X" ? "O" : "X", ai));
      board[i] = null;
    }
  }
  return player === ai ? Math.max(...scores) : Math.min(...scores);
}

function bestMove(board: Board, ai: "X" | "O"): number {
  let best = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = ai;
      const score = minimax(board, ai === "X" ? "O" : "X", ai);
      board[i] = null;
      if (score > best) {
        best = score;
        move = i;
      }
    }
  }
  return move;
}

const EMPTY: Board = Array(9).fill(null);

export default function App() {
  const [board, setBoard] = useState<Board>(EMPTY);
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [draws, setDraws] = useState(0);
  const { highScore: bestStreak, updateHighScore } = useHighScore("tictactoe-streak");
  const [streak, setStreak] = useState(0);

  const { result, line } = useMemo(() => evaluate(board), [board]);
  const gameOver = result !== null;
  const winningLine = useMemo(() => new Set(line ?? []), [line]);

  const handlePlay = useCallback(
    (idx: number) => {
      if (gameOver || board[idx] !== null || turn !== "X") return;
      const next = board.slice();
      next[idx] = "X";
      setBoard(next);
      setTurn("O");
    },
    [board, turn, gameOver],
  );

  useEffect(() => {
    if (gameOver || turn !== "O") return;
    const timer = setTimeout(() => {
      const next = board.slice();
      const move = bestMove(next, "O");
      if (move !== -1) {
        next[move] = "O";
        setBoard(next);
      }
      setTurn("X");
    }, 380);
    return () => clearTimeout(timer);
  }, [turn, board, gameOver]);

  useEffect(() => {
    if (!result) return;
    if (result === "X") {
      setWins((w) => w + 1);
      setStreak((s) => {
        const ns = s + 1;
        updateHighScore(ns);
        return ns;
      });
    } else if (result === "O") {
      setLosses((l) => l + 1);
      setStreak(0);
    } else {
      setDraws((d) => d + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const reset = useCallback(() => {
    setBoard(EMPTY);
    setTurn("X");
  }, []);

  const status =
    result === "X" ? "You win!" :
    result === "O" ? "AI wins" :
    result === "draw" ? "Draw" :
    turn === "X" ? "Your move" : "AI thinking…";

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Tic-Tac-Toe"
          stats={[
            { label: "Win", value: wins, accent: true },
            { label: "Loss", value: losses },
            { label: "Draw", value: draws },
            { label: "Streak", value: streak },
            { label: "Best", value: bestStreak },
          ]}
          rules={
            <div>
              <h3 style={{ marginBottom: "0.5rem", fontWeight: 700 }}>Tic-Tac-Toe</h3>
              <p>You're X. AI is O. Get three in a row.</p>
              <h4 style={{ marginTop: "0.75rem", fontWeight: 600 }}>Controls</h4>
              <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem" }}>
                <li>Tap an empty square to play</li>
                <li>Tap New Game any time to reset the board</li>
              </ul>
              <h4 style={{ marginTop: "0.75rem", fontWeight: 600 }}>Rules</h4>
              <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem" }}>
                <li>AI plays perfectly — the best you can do is draw</li>
                <li>Streak counts consecutive wins (it won't go far)</li>
              </ul>
            </div>
          }
          actions={<GameAuth />}
        />
      }
    >
      <div className="flex flex-col items-center justify-center h-full gap-5">
        <p style={{ color: "var(--muted)", fontFamily: "Manrope, sans-serif" }}>
          {status}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, clamp(4.5rem, 22vmin, 7rem))",
            gridTemplateRows: "repeat(3, clamp(4.5rem, 22vmin, 7rem))",
            gap: "0.5rem",
            touchAction: "manipulation",
          }}
        >
          {board.map((cell, i) => {
            const isWin = winningLine.has(i);
            const playable = !gameOver && cell === null && turn === "X";
            return (
              <button
                key={i}
                onClick={() => handlePlay(i)}
                disabled={!playable}
                aria-label={`square ${i + 1}${cell ? ` ${cell}` : " empty"}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--line)",
                  background: isWin ? "var(--accent)" : "var(--panel)",
                  color: isWin ? "var(--paper)" : cell === "X" ? "var(--accent)" : "var(--ink)",
                  cursor: playable ? "pointer" : "default",
                  fontFamily: "Fraunces, serif",
                  fontWeight: 800,
                  fontSize: "clamp(2rem, 11vmin, 3.5rem)",
                  transition: "transform 120ms ease, background 200ms ease",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  touchAction: "manipulation",
                }}
              >
                {cell}
              </button>
            );
          })}
        </div>

        {gameOver && (
          <GameButton size="md" variant="primary" onClick={reset}>
            New Game
          </GameButton>
        )}
        {!gameOver && (
          <GameButton size="sm" variant="ghost" onClick={reset}>
            Reset
          </GameButton>
        )}

        <a
          href="https://freegamestore.online"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--muted)",
            fontSize: "0.75rem",
            textDecoration: "none",
          }}
        >
          Part of FreeGameStore — free forever
        </a>
      </div>
    </GameShell>
  );
}
