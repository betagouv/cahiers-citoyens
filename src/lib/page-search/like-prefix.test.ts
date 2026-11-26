import { expect, it } from "vitest";
import { likePrefix } from "./like-prefix";

it("ajoute le joker final", () => {
  expect(likePrefix("retr")).toBe("retr%");
});

it("échappe les jokers et la barre oblique inverse de la saisie", () => {
  expect(likePrefix("50%_a\\b")).toBe("50\\%\\_a\\\\b%");
});
