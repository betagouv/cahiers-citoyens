import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LineOverlay } from "./line-overlay";

describe("LineOverlay", () => {
  it("trace chaque ligne dans le repère de l'image, caché aux aides techniques", () => {
    const html = renderToStaticMarkup(
      <LineOverlay
        width={1200}
        height={1700}
        lines={["0,0 10,0 10,5", "1,1 2,2"]}
      />,
    );

    expect(html).toMatch(
      /^<svg aria-hidden="true" focusable="false" viewBox="0 0 1200 1700"/,
    );
    expect(html.match(/<polygon /g)).toHaveLength(2);
    expect(html).toContain('points="0,0 10,0 10,5"');
    expect(html).toContain('vector-effect="non-scaling-stroke"');
  });
});
