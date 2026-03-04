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
) {
  localStreamRef.current = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  const socket = new WebSocket(WS_URL);
  wsRef.current = socket;

  socket.onopen = () => setJoined(true);

  socket.onmessage = async (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "Welcome") {
      setMyId(msg.peerId);
      setPeers(msg.peers);

      for (const peerId of msg.peers) {
        await startCall({
          peerId,
          socket,
          localStream: localStreamRef.current,
          pcsRef,
        });
      }
      return;
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
      return;
    }

    if (msg.type === "signal") {
      await handleSignal({
        from: msg.from,
        data: msg.data,
        socket,
        localStream: localStreamRef.current,
        pcsRef,
      });
      console.log("hey");
    }
  };

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
