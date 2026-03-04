import { useRef, useState } from "react";
import { join, leave } from "./components/join.js";
import "./index.css";

function App() {
  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcsRef = useRef(new Map());

  const [joined, setJoined] = useState(false);
  const [myId, setMyId] = useState(null);
  const [peers, setPeers] = useState([]);

  function handleJoin() {
    join(wsRef, localStreamRef, pcsRef, setJoined, setMyId, setPeers);
  }

  function handleLeave() {
    leave(wsRef, localStreamRef, pcsRef);
    setJoined(false);
    setMyId(null);
    setPeers([]);
  }

  return (
    <div className="container">
      <h1>Voice Chat</h1>
      {!joined ? (
        <button className="btn join" onClick={handleJoin}>
          Join Voice
        </button>
      ) : (
        <div className="room">
          <div className="me">You: <span className="id">{myId}</span></div>
          <div className="peer-list">
            <h3>Peers ({peers.length})</h3>
            {peers.length === 0 ? (
              <p className="muted">Waiting for others to join...</p>
            ) : (
              <ul>
                {peers.map((p) => (
                  <li key={p} className="peer">{p}</li>
                ))}
              </ul>
            )}
          </div>
          <button className="btn leave" onClick={handleLeave}>
            Leave
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
