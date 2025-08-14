import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:4000";

function randomRoom() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function useQuery() {
  return new URLSearchParams(window.location.search);
}

export default function App() {
  const query = useQuery();
  const initialRoom = query.get("room") || randomRoom();

  // Ensure URL has a room param
  useEffect(() => {
    if (!query.get("room")) {
      const url = new URL(window.location.href);
      url.searchParams.set("room", initialRoom);
      window.history.replaceState(null, "", url.toString());
    }
  }, []); // eslint-disable-line

  const [socket] = useState(() =>
    io(SOCKET_URL, { transports: ["websocket"] })
  );
  const [symbol, setSymbol] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [winner, setWinner] = useState(null);
  const [line, setLine] = useState(null);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    socket.emit("joinRoom", initialRoom);

    socket.on("joined", ({ symbol }) => {
      setSymbol(symbol);
    });

    socket.on("state", ({ board, currentPlayer, winner, line, players }) => {
      setBoard(board);
      setCurrentPlayer(currentPlayer);
      setWinner(winner);
      setLine(line);
      setPlayers(players);
    });

    return () => {
      socket.disconnect();
    };
  }, [socket, initialRoom]);

  const isMyTurn = symbol && currentPlayer === symbol && !winner;

  const handleMove = (i) => {
    if (!isMyTurn || board[i]) return;
    socket.emit("move", i);
  };

  const reset = () => socket.emit("reset");

  const shareUrl = useMemo(() => window.location.href, []);

  const cellClasses = (i) => {
    const inWin = line?.includes(i);
    return [
      "w-24 h-24 sm:w-28 sm:h-28",
      "rounded-2xl font-extrabold text-4xl sm:text-5xl",
      "flex items-center justify-center",
      "bg-white/20 backdrop-blur-lg",
      "transition hover:bg-white/30",
      inWin ? "ring-4 ring-yellow-300 scale-105" : "ring-1 ring-white/30",
      board[i] === "X"
        ? "text-emerald-200"
        : board[i] === "O"
        ? "text-pink-200"
        : "text-white",
    ].join(" ");
  };

  return (
    <div className="min-h-screen text-white flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-indigo-600">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-black drop-shadow">
            🎮 Online Tic Tac Toe
          </h1>
          <p className="mt-2 opacity-90">
            Room:{" "}
            <span className="font-mono bg-white/10 px-2 py-0.5 rounded">
              {initialRoom}
            </span>
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              className="px-4 py-2 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 transition"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
              }}
              title="Copy invite link"
            >
              📋 Copy Invite Link
            </button>
            <button
              className="px-4 py-2 rounded-2xl bg-yellow-300 text-black font-semibold hover:bg-yellow-200 active:scale-95 transition"
              onClick={reset}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mb-4 text-center">
          <p className="text-lg">
            You are: <span className="font-bold">{symbol ?? "Spectator"}</span>
          </p>
          <p
            className={
              "mt-1 " +
              (winner
                ? "text-yellow-200"
                : isMyTurn
                ? "text-green-200"
                : "text-red-200")
            }
          >
            {winner
              ? winner === "draw"
                ? "It's a draw!"
                : `Winner: ${winner}`
              : `Turn: ${currentPlayer}`}
          </p>
          <p className="text-sm opacity-80 mt-1">
            Players in room: {players.join(" , ") || "—"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 justify-center mx-auto w-fit">
          {board.map((v, i) => (
            <button
              key={i}
              className={cellClasses(i)}
              onClick={() => handleMove(i)}
              disabled={!isMyTurn && !board[i]}
            >
              {v}
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-xs opacity-70">
          Share this link with a friend to join as the second player.
        </p>
      </div>
    </div>
  );
}
