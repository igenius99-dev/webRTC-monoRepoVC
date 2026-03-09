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
  const [name, setName] = useState("");
  const [peerName, setPeerName] = useState([]);

  function handleJoin() {
    join(
      wsRef,
      localStreamRef,
      pcsRef,
      setJoined,
      setMyId,
      setPeers,
      name,
      setPeerName,
    );
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
        <>
          <div>Enter your real name pls:</div>
          <input type="text" onChange={(e) => setName(e.target.value)}></input>
          <button className="btn join" onClick={handleJoin}>
            Join Voice
          </button>
        </>
      ) : (
        <div className="room">
          <div className="me">
            You: <span className="id">{myId}</span>
            <div>Real Name: {name}</div>
          </div>
          <div className="peer-list">
            <h3>Peers ({peerName.length})</h3>
            {peerName.length === 0 ? (
              <p className="muted">Waiting for others to join...</p>
            ) : (
              <ul>
                {peerName.map((item) => (
                  <li key={item.peerId} className="peer">
                    {item.realname}
                  </li>
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
