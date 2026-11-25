import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyQuestion } from "./empty-question";

describe("EmptyQuestion", () => {
  it("propose des questions d'exemple sous forme de liens de recherche", () => {
    const html = renderToStaticMarkup(<EmptyQuestion />);

    expect(
      [...html.matchAll(/<a href="([^"]*)"/g)].map(([, href]) => href),
    ).toEqual([
      "/search?q=Il%20n&#x27;y%20a%20plus%20de%20m%C3%A9decin%20au%20village",
      "/search?q=Que%20disent%20les%20habitants%20du%20prix%20du%20carburant%20%3F",
      "/search?q=Quelles%20propositions%20pour%20le%20r%C3%A9f%C3%A9rendum%20d&#x27;initiative%20citoyenne%20%3F",
    ]);
  });
});
