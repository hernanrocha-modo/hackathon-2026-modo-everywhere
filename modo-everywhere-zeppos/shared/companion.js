// Mock companion. Devuelve uno de dos QRs precargados, alternando en
// cada request. Cuando se cablée el companion real, esta función pasa
// a llamar al backend Modo (la imagen vendrá como base64 o como path
// cacheado tras descargarla en el side service).

const NETWORK_LATENCY_MS = 600;

// Paths relativos a la carpeta assets del target activo (gtr3). Los PNG
// están en assets/gtr3/qr/. Mantener orden estable para que el swap
// sea predecible.
const QR_IMAGES = ["qr/qr1.png", "qr/qr2.png"];

let qrIndex = 0;
let nextSeq = 1;

function uid() {
  const r = Math.floor(Math.random() * 0xffffffff).toString(16);
  return "qr-" + r + (nextSeq++).toString(16);
}

export async function requestQR() {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_LATENCY_MS));
  const image = QR_IMAGES[qrIndex];
  qrIndex = (qrIndex + 1) % QR_IMAGES.length;
  const qrId = uid();
  return {
    qrId,
    payload: "modo://transport/" + qrId,
    image,
    ttlSeconds: 60,
    issuedAt: Date.now(),
  };
}
