import { describe, expect, it } from "vitest";
import { polygonErrors } from "./polygon-bounds";
import { EXAMPLE_ID } from "./test-notebook";
import { example } from "./test-files";

describe("polygonErrors", () => {
  it("accepte des polygones dans la page, bords compris", () => {
    const notebook = example();
    notebook.pages[0].lines[0].polygon = [
      [
        [0, 0],
        [2484, 0],
        [2484, 3507],
        [0, 0],
      ],
    ];
    expect(polygonErrors(notebook)).toEqual([]);
  });

  it("signale chaque ligne qui dépasse en largeur ou en hauteur", () => {
    const notebook = example();
    const [first, second] = notebook.pages[0].lines;
    first.polygon[0][1] = [2485, 282];
    second.polygon[0][2] = [1632, 3508];
    expect(polygonErrors(notebook)).toEqual([
      {
        notebook: EXAMPLE_ID,
        file: `${EXAMPLE_ID}.json`,
        page: 1,
        code: "polygon-out-of-page",
        message: `Le polygone de la ligne ${EXAMPLE_ID}_1_1 sort de la page (2484 × 3507 pixels) : point (2485, 282).`,
      },
      expect.objectContaining({
        page: 1,
        message: `Le polygone de la ligne ${EXAMPLE_ID}_1_2 sort de la page (2484 × 3507 pixels) : point (1632, 3508).`,
      }),
    ]);
  });
});
