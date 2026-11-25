import type { Theme, ThemeId } from "./domain";
import { taxes } from "./themes/taxes";
import { publicServices } from "./themes/public-services";
import { transport } from "./themes/transport";
import { health } from "./themes/health";
import { ecology } from "./themes/ecology";
import { democracy } from "./themes/democracy";
import { agriculture } from "./themes/agriculture";
import { education } from "./themes/education";
import { pensions } from "./themes/pensions";
import { housing } from "./themes/housing";

// Gabarits remplis à la composition : {municipality}, {km}, {euros}, {years}, {months}.
export const THEMES: Record<ThemeId, Theme> = {
  taxes,
  publicServices,
  transport,
  health,
  ecology,
  democracy,
  agriculture,
  education,
  pensions,
  housing,
};
