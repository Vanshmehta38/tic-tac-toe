/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import confetti from "canvas-confetti";
import toast, { Toaster } from "react-hot-toast";

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
  const [showPopup, setShowPopup] = useState(!roomId);

  // Stable identity for player
  const userIdRef = useRef(localStorage.getItem("userId") || uuidv4());
  useEffect(() => {
    localStorage.setItem("userId", userIdRef.current);
  }, []);

  const [socket, setSocket] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [winner, setWinner] = useState(null);
  const [line, setLine] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cheatEnabled, setCheatEnabled] = useState(
    localStorage.getItem("cheatEnabled") === "true"
  );

  // Shared scores from server: { byUser: { [userId]: wins }, draws: number }
  const [scores, setScores] = useState({ byUser: {}, draws: 0 });

  useEffect(() => {
    if (!roomId) return;
    const newSocket = io(SOCKET_URL, { transports: ["polling", "websocket"] });

    newSocket.on("connect", () => {
      newSocket.emit("joinRoom", {
        roomId,
        userId: userIdRef.current,
        cheatEnabled,
      });
    });

    newSocket.on("joined", ({ symbol, isAdmin }) => {
      setSymbol(symbol);
      setIsAdmin(isAdmin);
    });

    newSocket.on(
      "state",
      ({ board, currentPlayer, winner, line, players, scores }) => {
        setBoard(board);
        setCurrentPlayer(currentPlayer);
        setWinner(winner);
        setLine(line);
        setPlayers(players || []);
        if (scores) setScores(scores);

        // Party animation on win
        if (winner && winner !== "draw") {
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        }
      }
    );

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [roomId]);

  useEffect(() => {
    const sequence = ["ArrowUp", "ArrowUp", "k", "v"];
    let position = 0;

    const handler = (e) => {
      if (!isAdmin) return;

      if (e.key === sequence[position]) {
        position++;
        if (position === sequence.length) {
          // ✅ Toggle cheat mode
          const newState = !cheatEnabled;
          setCheatEnabled(newState);
          localStorage.setItem("cheatEnabled", newState ? "true" : "false");

          if (newState) {
            toast("Fun Mode Activated!", {
              icon: "🧩",
            });
          } else {
            toast("Fun Mode Deactivated!", {
              icon: "🚫",
            });
          }
          position = 0;
        }
      } else {
        position = 0;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isAdmin, cheatEnabled]);

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
    setScores({ byUser: {}, draws: 0 });
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

  // Helpers
  const mask = (uid) =>
    uid === userIdRef.current ? "You" : `${uid.slice(0, 4)}…${uid.slice(-4)}`;
  const activePlayers = players.filter(
    (p) => p.symbol === "X" || p.symbol === "O"
  );
  const xPlayer = activePlayers.find((p) => p.symbol === "X");
  const oPlayer = activePlayers.find((p) => p.symbol === "O");

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
    <>
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        toastOptions={{
          duration: 800,
        }}
      />
      <div className="min-h-screen text-white flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-indigo-600">
        <div className="w-full max-w-xl">
          <div className={`${cheatEnabled ? "mt-7" : "mt-3"} mb-6 text-center`}>
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

          {/* 🏆 Compact Scoreboard with Players */}
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-bold">🏆 Scoreboard</h2>
            <p className="mt-2">
              {xPlayer ? (
                <>
                  {mask(xPlayer.userId)} (X):{" "}
                  <span className="font-bold">
                    {scores.byUser?.[xPlayer.userId] ?? 0}
                  </span>
                </>
              ) : (
                "X: —"
              )}
              {" | "}
              {oPlayer ? (
                <>
                  {mask(oPlayer.userId)} (O):{" "}
                  <span className="font-bold">
                    {scores.byUser?.[oPlayer.userId] ?? 0}
                  </span>
                </>
              ) : (
                "O: —"
              )}
              {" | "}
              Draws: <span className="font-bold">{scores.draws ?? 0}</span>
            </p>
          </div>

          <div className="mb-4 text-center">
            <p className="text-lg">
              You are:{" "}
              <span className="font-bold">{symbol ?? "Spectator"}</span>
            </p>
            <p className="mt-1">
              {winner
                ? winner === "draw"
                  ? "It's a draw!"
                  : `Winner: ${winner} (${
                      winner === "X"
                        ? mask(xPlayer?.userId || "")
                        : mask(oPlayer?.userId || "")
                    })`
                : `Turn: ${currentPlayer}`}
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

          {/* 🧩 Cheat Panel (Admin Only) */}
          {isAdmin && cheatEnabled && (
            <div className="relative mt-10 flex justify-center">
              <div className="group relative">
                <div className="absolute -top-6 left-0 w-full h-6 cursor-pointer"></div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <h2 className="text-xl font-bold text-red-300 mb-2 text-center">
                    🧩 Make Some Fun!
                  </h2>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      className="px-3 py-1 rounded bg-emerald-400 text-black font-semibold hover:bg-emerald-300"
                      onClick={() =>
                        socket?.emit("cheat", { action: "forceX" })
                      }
                    >
                      Force X Wins
                    </button>
                    <button
                      className="px-3 py-1 rounded bg-pink-400 text-black font-semibold hover:bg-pink-300"
                      onClick={() =>
                        socket?.emit("cheat", { action: "forceO" })
                      }
                    >
                      Force O Wins
                    </button>
                    <button
                      className="px-3 py-1 rounded bg-yellow-400 text-black font-semibold hover:bg-yellow-300"
                      onClick={() =>
                        socket?.emit("cheat", { action: "forceDraw" })
                      }
                    >
                      Force Draw
                    </button>
                    <button
                      className="px-3 py-1 rounded bg-red-500 text-black font-semibold hover:bg-red-400"
                      onClick={() =>
                        socket?.emit("cheat", { action: "clearScores" })
                      }
                    >
                      Clear Scores
                    </button>
                    {/* New cheats */}
                    <button
                      className="px-3 py-1 rounded bg-blue-400 text-black font-semibold hover:bg-blue-300"
                      onClick={() =>
                        socket?.emit("cheat", { action: "fillRandom" })
                      }
                    >
                      Fill Random Move
                    </button>
                    <button
                      className="px-3 py-1 rounded bg-teal-400 text-black font-semibold hover:bg-teal-300"
                      onClick={() =>
                        socket?.emit("cheat", { action: "skipTurn" })
                      }
                    >
                      Skip Turn
                    </button>
                    <button
                      className="px-3 py-1 rounded bg-gray-400 text-black font-semibold hover:bg-gray-300"
                      onClick={() =>
                        socket?.emit("cheat", { action: "clearBoard" })
                      }
                    >
                      Clear Board
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🔖 Cheat Mode Badge (Admin Only) */}
        {/* {isAdmin && (
          <div
            className="fixed bottom-4 right-4 px-3 py-1 rounded-lg shadow-lg text-sm font-bold
                  transition-colors duration-300
                  bg-gray-700 text-white
                  border border-gray-500
                  opacity-80"
          >
            {cheatEnabled ? (
              <span className="text-green-400">🧩 Fun Mode: ON</span>
            ) : (
              <span className="text-red-400">🚫 Fun Mode: OFF</span>
            )}
          </div>
        )} */}
      </div>
    </>
  );
}
