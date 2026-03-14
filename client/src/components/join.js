import { startCall, handleSignal, closePeer } from "./webrtc.js";
import { removeRemoteAudio } from "./audio.js";

const wsProto = window.location.protocol === "https:" ? "wss" : "ws";
const WS_URL = `${wsProto}://${window.location.host}/ws`;

export async function join(
  wsRef,
  localStreamRef,
  pcsRef,
  setJoined,
  setMyId,
  setPeers,
  name,
  setPeerName,
) {
  localStreamRef.current = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  const socket = new WebSocket(WS_URL);
  wsRef.current = socket;

  socket.onopen = () => setJoined(true);

  let queue = Promise.resolve();
  let iceServers = [];

  socket.onmessage = (event) => {
    queue = queue.then(() => handleMessage(event));
  };

  async function handleMessage(event) {
    const msg = JSON.parse(event.data);

    if (msg.type === "Welcome") {
      iceServers = msg.iceServers ?? [];
      setMyId(msg.peerId);
      setPeers(msg.peers);
      socket.send(JSON.stringify({ type: "setName", realName: name }));

      for (const peerId of msg.peers) {
        await startCall({
          peerId,
          socket,
          localStream: localStreamRef.current,
          pcsRef,
          iceServers,
        });
      }
      return;
    }

    if (msg.type === "setRealNameMap") {
      setPeerName((prev) => {
        const merged = new Map(prev.map((p) => [p.peerId, p]));
        for (const np of msg.namePeers) merged.set(np.peerId, np);
        return [...merged.values()];
      });
    }

    if (msg.type === "peer-joined") {
      setPeers((prev) =>
        prev.includes(msg.peerId) ? prev : [...prev, msg.peerId],
      );
      return;
    }

    if (msg.type === "peer-left") {
      closePeer(msg.peerId, pcsRef);
      removeRemoteAudio(msg.peerId);
      setPeers((prev) => prev.filter((id) => id !== msg.peerId));
      setPeerName((prev) => prev.filter((id) => id.realname != msg.leaving));
      return;
    }

    if (msg.type === "signal") {
      await handleSignal({
        from: msg.from,
        data: msg.data,
        socket,
        localStream: localStreamRef.current,
        pcsRef,
        iceServers,
      });
    }
  }

  socket.onclose = () => {
    setJoined(false);
    setMyId(null);
    setPeers([]);
    for (const [peerId] of pcsRef.current) {
      closePeer(peerId, pcsRef);
      removeRemoteAudio(peerId);
    }
  };
}

export function leave(wsRef, localStreamRef, pcsRef) {
  for (const [peerId] of pcsRef.current) {
    closePeer(peerId, pcsRef);
    removeRemoteAudio(peerId);
  }

  if (localStreamRef.current) {
    localStreamRef.current.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }
  if (wsRef.current) {
    wsRef.current.close();
    wsRef.current = null;
  }
}
