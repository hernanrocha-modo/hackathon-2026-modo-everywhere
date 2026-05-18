import { BG_STYLE, QR_IMG_STYLE } from "./index.style";

const logger = DeviceRuntimeCore.HmLogger.getLogger("modo.qr");

const QR_IMAGES = [
  "qr/qr-success.png",
  "qr/qr-error.png",
  "qr/qr-invalid.png",
  "qr/qr-no-balance.png",
];

// Mantener la pantalla siempre encendida mientras el QR está visible.
// ZeppOS 1.0 no expone control de brillo programático, pero sí permite
// evitar que el reloj entre en AOD / se duerma al bajar la muñeca.
function keepScreenOn() {
  try {
    if (typeof hmSetting !== "undefined" && hmSetting.setBrightScreen) {
      hmSetting.setBrightScreen(600);
    } else if (typeof hmApp !== "undefined" && hmApp.setScreenKeepBright) {
      hmApp.setScreenKeepBright(true);
    }
  } catch (err) {
    logger.error("keepScreenOn failed", err);
  }
}

function releaseScreenOn() {
  try {
    if (typeof hmSetting !== "undefined" && hmSetting.setBrightScreenCancel) {
      hmSetting.setBrightScreenCancel();
    } else if (typeof hmApp !== "undefined" && hmApp.setScreenKeepBright) {
      hmApp.setScreenKeepBright(false);
    }
  } catch (err) {
    logger.error("releaseScreenOn failed", err);
  }
}

Page({
  state: {
    qrWidget: null,
    currentIndex: 0,
  },

  build() {
    logger.debug("qr build");

    hmUI.createWidget(hmUI.widget.FILL_RECT, BG_STYLE);
    this.renderQR();
  },

  renderQR() {
    if (this.state.qrWidget) {
      hmUI.deleteWidget(this.state.qrWidget);
      this.state.qrWidget = null;
    }
    const src = QR_IMAGES[this.state.currentIndex];
    const widget = hmUI.createWidget(hmUI.widget.IMG, {
      ...QR_IMG_STYLE,
      src,
    });
    widget.addEventListener(hmUI.event.CLICK_UP, () => this.swap());
    this.state.qrWidget = widget;
  },

  swap() {
    this.state.currentIndex =
      (this.state.currentIndex + 1) % QR_IMAGES.length;
    logger.debug("swap to " + QR_IMAGES[this.state.currentIndex]);
    this.renderQR();
  },

  onInit() {
    logger.debug("qr onInit");
    keepScreenOn();
  },

  onDestroy() {
    logger.debug("qr onDestroy");
    releaseScreenOn();
  },
});
