import { gettext } from "i18n";
import { COLOR, DEVICE } from "../../../utils/tokens";

const W = DEVICE.width;
const H = DEVICE.height;

export const BG_STYLE = {
  x: 0,
  y: 0,
  w: W,
  h: H,
  color: COLOR.BG,
  radius: 0,
};

export const TITLE_STYLE = {
  text: gettext("appName"),
  x: 0,
  y: px(90),
  w: W,
  h: px(50),
  color: COLOR.WHITE,
  text_size: px(34),
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
};

export const PRIMARY_BTN_STYLE = {
  text: gettext("btn_transport_qr"),
  x: px(47),
  y: px(190),
  w: W - px(47) * 2,
  h: px(160),
  radius: px(32),
  normal_color: 0x008859,
  press_color: 0x006a44,
  color: COLOR.WHITE,
  text_size: px(38),
};
