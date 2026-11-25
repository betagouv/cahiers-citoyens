// A4 à 150 ppp : assez pour lire l'écriture, assez léger pour 200 cahiers.
export const WIDTH = 1240;
export const HEIGHT = 1754;
const PX_PER_MM = WIDTH / 210;
export const LINE_SPACING = 8 * PX_PER_MM;
export const LEFT_MARGIN = Math.round(34 * PX_PER_MM);
export const FIRST_LINE = 3 * LINE_SPACING;
export const LINES_PER_PAGE =
  Math.floor((HEIGHT - FIRST_LINE - 1.5 * LINE_SPACING) / LINE_SPACING) + 1;
export const TEXT_START = LEFT_MARGIN + 18;
export const TEXT_END = WIDTH - 60;
// digitize() pose la feuille réduite de 2,5 % au centre du scan.
export const PAPER_SCALE = 0.975;
