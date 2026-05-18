import { gettext } from "i18n";
import { COLOR, DEVICE } from "../../../utils/tokens";

const W = DEVICE.width;
const H = DEVICE.height;

export const QR_SIZE = px(300);
export const QR_X = (W - QR_SIZE) / 2;
export const QR_Y = px(70);

export const BG_STYLE = {
  x: 0,
  y: 0,
  w: W,
  h: H,
  color: COLOR.WHITE,
  radius: 0,
};

export const QR_IMG_STYLE = {
  x: QR_X,
  y: QR_Y,
  w: QR_SIZE,
  h: QR_SIZE,
};

export { gettext };
