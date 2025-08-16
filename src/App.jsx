import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:4000";

function randomRoom() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function App() {
  const [roomId, setRoomId] = useState(
    () => localStorage.getItem("roomId") || ""
  );
  const [userId, setUserId] = useState(
    () => localStorage.getItem("userId") || uuidv4()
  );
  const [showPopup, setShowPopup] = useState(!roomId);

  const [socket, setSocket] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [winner, setWinner] = useState(null);
  const [line, setLine] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    localStorage.setItem("userId", userId);
  }, [userId]);

  useEffect(() => {
    if (!roomId) return;

    const newSocket = io(SOCKET_URL, { transports: ["polling", "websocket"] });

    newSocket.on("connect", () => {
      console.log("✅ Connected:", newSocket.id);
      newSocket.emit("joinRoom", { roomId, userId });
    });

    newSocket.on("joined", ({ symbol, isAdmin }) => {
      setSymbol(symbol);
      setIsAdmin(isAdmin);
    });

    newSocket.on("state", ({ board, currentPlayer, winner, line, players }) => {
      setBoard(board);
      setCurrentPlayer(currentPlayer);
      setWinner(winner);
      setLine(line);
      setPlayers(players);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [roomId, userId]);

  const handleMove = (i) => {
    if (!socket) return;
    if (symbol && currentPlayer === symbol && !winner && !board[i]) {
      socket.emit("move", i);
    }
  };

  const reset = () => socket?.emit("reset");

  const leaveRoom = () => {
    socket?.emit("leaveRoom");
    localStorage.removeItem("roomId");
    setRoomId("");
    setShowPopup(true);
    setSymbol(null);
    setBoard(Array(9).fill(null));
    setPlayers([]);
  };

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

  if (showPopup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
        <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-lg max-w-md w-full text-center">
          <h1 className="text-3xl font-black mb-2 flex gap-2">
            <img
              src="/logo.png"
              alt="App Logo"
              className="w-10 h-10 rounded-lg shadow-md text-center"
            />{" "}
            Welcome to Tic Tac Toe
          </h1>
          <p className="opacity-90 mb-6">
            Play online with your friends! Enter a Room ID to join, or create a
            new room.
          </p>

          <input
            type="text"
            placeholder="Enter Room ID"
            className="p-2 rounded text-black w-full mb-3"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.trim())}
          />

          <div className="flex justify-center gap-3">
            <button
              className="px-4 py-2 rounded bg-green-400 text-black font-semibold hover:bg-green-300"
              onClick={() => {
                if (roomId) {
                  localStorage.setItem("roomId", roomId);
                  setShowPopup(false);
                }
              }}
            >
              Join Room
            </button>
            <button
              className="px-4 py-2 rounded bg-yellow-300 text-black font-semibold hover:bg-yellow-200"
              onClick={() => {
                const newId = randomRoom();
                localStorage.setItem("roomId", newId);
                setRoomId(newId);
                setShowPopup(false);
              }}
            >
              Create Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-indigo-600">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-black drop-shadow title-box">
            <img
              src="/logo.png"
              alt="App Logo"
              className="w-10 h-10 rounded-lg shadow-md"
            />{" "}
            Tic Tac Toe
          </h1>
          <p className="mt-2">
            Room ID: <span className="font-mono">{roomId}</span>
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            <button
              className="px-4 py-2 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 transition"
              onClick={() => navigator.clipboard.writeText(roomId)}
            >
              📋 Copy Room ID
            </button>
            {isAdmin && (
              <button
                className="px-4 py-2 rounded-2xl bg-yellow-300 text-black font-semibold hover:bg-yellow-200 active:scale-95 transition"
                onClick={reset}
              >
                Reset
              </button>
            )}
            <button
              className="px-4 py-2 rounded-2xl bg-red-400 text-black font-semibold hover:bg-red-300 active:scale-95 transition"
              onClick={leaveRoom}
            >
              Leave Room
            </button>
          </div>
        </div>

        <div className="mb-4 text-center">
          <p className="text-lg">
            You are: <span className="font-bold">{symbol ?? "Spectator"}</span>
          </p>
          <p className="mt-1">
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
              disabled={!symbol || winner || board[i]}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
