import { attachRemoteAudio } from "./audio.js";

const pendingCandidates = new Map();

function flushCandidates(peerId, pc) {
  const queued = pendingCandidates.get(peerId);
  if (!queued || queued.length === 0) return;
  console.log(`[webrtc] flushing ${queued.length} buffered ICE candidates for ${peerId}`);
  for (const c of queued) {
    pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
  }
  pendingCandidates.delete(peerId);
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.relay.metered.ca:80" },
  {
    urls: "turn:global.relay.metered.ca:80",
    username: "e03b0de978a9de297e011a1b",
    credential: "3ZpGqGsqMIhSwnZb",
  },
  {
    urls: "turn:global.relay.metered.ca:443",
    username: "e03b0de978a9de297e011a1b",
    credential: "3ZpGqGsqMIhSwnZb",
  },
  {
    urls: "turn:global.relay.metered.ca:443?transport=tcp",
    username: "e03b0de978a9de297e011a1b",
    credential: "3ZpGqGsqMIhSwnZb",
  },
];

export function createPeer({ peerId, socket, localStream, pcsRef }) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  pc.onicecandidate = (e) => {
    if (!e.candidate) return;
    socket.send(
      JSON.stringify({
        type: "signal",
        to: peerId,
        data: { kind: "ice", candidate: e.candidate },
      }),
    );
  };

  pc.ontrack = (e) => {
    const stream = e.streams?.[0] ?? new MediaStream([e.track]);
    console.log(`[webrtc] got remote track from ${peerId}`, e.track.kind);
    attachRemoteAudio(stream, peerId);
  };

  pc.onconnectionstatechange = () => {
    console.log(`[webrtc] ${peerId} connection: ${pc.connectionState}`);
  };

  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

  pcsRef.current.set(peerId, pc);
  return pc;
}

export async function startCall({ peerId, socket, localStream, pcsRef }) {
  console.log(`[webrtc] starting call with ${peerId}`);
  const pc = createPeer({ peerId, socket, localStream, pcsRef });
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.send(
    JSON.stringify({
      type: "signal",
      to: peerId,
      data: { kind: "offer", sdp: offer },
    }),
  );
}

export async function handleSignal({ from, data, socket, localStream, pcsRef }) {
  if (data.kind === "offer") {
    console.log(`[webrtc] got offer from ${from}`);
    const pc = createPeer({ peerId: from, socket, localStream, pcsRef });
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    flushCandidates(from, pc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.send(
      JSON.stringify({
        type: "signal",
        to: from,
        data: { kind: "answer", sdp: answer },
      }),
    );
    return;
  }

  if (data.kind === "ice") {
    const pc = pcsRef.current.get(from);
    if (!pc || !pc.remoteDescription) {
      if (!pendingCandidates.has(from)) pendingCandidates.set(from, []);
      pendingCandidates.get(from).push(data.candidate);
      console.log(`[webrtc] buffered ICE candidate from ${from} (total: ${pendingCandidates.get(from).length})`);
      return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    return;
  }

  if (data.kind === "answer") {
    console.log(`[webrtc] got answer from ${from}`);
    const pc = pcsRef.current.get(from);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    flushCandidates(from, pc);
  }
}

export function closePeer(peerId, pcsRef) {
  const pc = pcsRef.current.get(peerId);
  if (pc) {
    pc.close();
    pcsRef.current.delete(peerId);
  }
  pendingCandidates.delete(peerId);
}
