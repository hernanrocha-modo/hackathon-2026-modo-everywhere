import {
  BG_STYLE,
  TITLE_STYLE,
  PRIMARY_BTN_STYLE,
} from "./index.style";

const logger = DeviceRuntimeCore.HmLogger.getLogger("modo.home");

Page({
  build() {
    logger.debug("home build");

    hmUI.createWidget(hmUI.widget.FILL_RECT, BG_STYLE);
    hmUI.createWidget(hmUI.widget.TEXT, TITLE_STYLE);

    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...PRIMARY_BTN_STYLE,
      click_func: () => {
        logger.debug("tap QR transport");
        hmApp.gotoPage({ file: "page/gtr3/qr/index.page" });
      },
    });
  },
  onInit() {
    logger.debug("home onInit");
  },
  onDestroy() {
    logger.debug("home onDestroy");
  },
});
