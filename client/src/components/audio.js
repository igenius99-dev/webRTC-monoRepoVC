export function attachRemoteAudio(stream, peerId) {
  const id = `audio-${peerId}`;
  if (document.getElementById(id)) return;

  const audio = document.createElement("audio");
  audio.id = id;
  audio.autoplay = true;
  audio.playsInline = true;
  audio.srcObject = stream;
  document.body.appendChild(audio);
  audio.play().catch(() => {});
}

export function removeRemoteAudio(peerId) {
  const el = document.getElementById(`audio-${peerId}`);
  if (el) {
    el.srcObject = null;
    el.remove();
  }
}
