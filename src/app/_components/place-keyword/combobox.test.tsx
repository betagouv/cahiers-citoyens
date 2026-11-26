// @vitest-environment happy-dom
import { act, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  type Mounted,
  click,
  mount,
  press,
  typeInto,
  unmount,
} from "@/test/dom";
import { Combobox, statusText } from "./combobox";

const FRUITS = ["pomme", "poire", "prune"];

function Harness({ emptyText }: { emptyText?: string }) {
  const [value, setValue] = useState("");
  const [chosen, setChosen] = useState("");
  const options = value === "" || value === "zz" ? [] : FRUITS;
  return (
    <>
      <Combobox
        id="fruit"
        label="Fruit"
        hint="Un fruit du verger"
        name="fruit"
        value={value}
        onValueChange={setValue}
        options={options}
        optionKey={(fruit) => fruit}
        renderOption={(fruit) => <span>{fruit}</span>}
        onSelect={(fruit) => {
          setChosen(fruit);
          setValue(fruit);
        }}
        clearLabel="Effacer le fruit"
        emptyText={emptyText}
        footer={<a href="/aide">Aide</a>}
        maxLength={50}
      />
      <output>{chosen}</output>
      <button type="button" id="outside">
        Ailleurs
      </button>
    </>
  );
}

let mounted: Mounted;

function input() {
  const element = mounted.container.querySelector("input");
  if (element === null) throw new Error("champ absent");
  return element;
}

function options() {
  return [...mounted.container.querySelectorAll('[role="option"]')];
}

function popup() {
  return mounted.container.querySelector('[role="listbox"]')?.parentElement;
}

function status() {
  return mounted.container.querySelector('[role="status"]')?.textContent;
}

afterEach(() => {
  unmount(mounted);
});

describe("Combobox", () => {
  it("relie le champ, son étiquette, son aide et la liste", async () => {
    mounted = await mount(<Harness />);

    const field = input();
    expect(field.getAttribute("role")).toBe("combobox");
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(field.getAttribute("aria-autocomplete")).toBe("list");
    expect(field.getAttribute("aria-controls")).toBe("fruit-listbox");
    expect(field.name).toBe("fruit");
    expect(mounted.container.querySelector("label")?.textContent).toBe(
      "FruitUn fruit du verger",
    );
    expect(popup()?.hidden).toBe(true);
    expect(mounted.container.querySelector("button[title]")).toBeNull();
  });

  it("ouvre la liste à la saisie et annonce le nombre de suggestions", async () => {
    mounted = await mount(<Harness />);

    await typeInto(input(), "p");

    expect(input().getAttribute("aria-expanded")).toBe("true");
    expect(popup()?.hidden).toBe(false);
    expect(options().map((option) => option.textContent)).toEqual(FRUITS);
    expect(status()).toBe(statusText(3));
    expect(mounted.container.textContent).toContain("Aide");
  });

  it("parcourt les options au clavier et choisit avec Entrée", async () => {
    mounted = await mount(<Harness />);
    await typeInto(input(), "p");

    const down = await press(input(), "ArrowDown");
    expect(down.defaultPrevented).toBe(true);
    expect(input().getAttribute("aria-activedescendant")).toBe(
      "fruit-option-0",
    );
    expect(options()[0].getAttribute("aria-selected")).toBe("true");
    await press(input(), "End");
    expect(input().getAttribute("aria-activedescendant")).toBe(
      "fruit-option-2",
    );
    await press(input(), "Enter");

    expect(mounted.container.querySelector("output")?.textContent).toBe(
      "prune",
    );
    expect(input().value).toBe("prune");
    expect(input().getAttribute("aria-expanded")).toBe("false");
    expect(input().hasAttribute("aria-activedescendant")).toBe(false);
  });

  it("laisse Entrée envoyer le formulaire sans option active", async () => {
    mounted = await mount(<Harness />);
    await typeInto(input(), "p");

    const enter = await press(input(), "Enter");
    const letter = await press(input(), "a");

    expect(enter.defaultPrevented).toBe(false);
    expect(letter.defaultPrevented).toBe(false);
  });

  it("choisit une option à la souris sans quitter le champ", async () => {
    mounted = await mount(<Harness />);
    await typeInto(input(), "p");

    await click(options()[1]);

    expect(mounted.container.querySelector("output")?.textContent).toBe(
      "poire",
    );
  });

  it("ferme avec Échap, puis vide le champ et rend le focus", async () => {
    mounted = await mount(<Harness />);
    await typeInto(input(), "p");

    await press(input(), "Escape");
    expect(input().getAttribute("aria-expanded")).toBe("false");
    expect(input().value).toBe("p");
    await press(input(), "Escape");
    expect(input().value).toBe("");
  });

  it("vide le champ avec son bouton, nommé et rendu au focus", async () => {
    mounted = await mount(<Harness />);
    await typeInto(input(), "p");
    const clear = mounted.container.querySelector("button[title]");

    expect(clear?.textContent).toBe("Effacer le fruit");
    expect(clear?.getAttribute("title")).toBe("Effacer le fruit");
    await act(async () => {
      clear?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(input().value).toBe("");
    expect(document.activeElement).toBe(input());
  });

  it("se ferme quand le focus quitte le champ et son aide", async () => {
    mounted = await mount(<Harness />);
    await typeInto(input(), "p");
    const help = mounted.container.querySelector('a[href="/aide"]');
    const outside = mounted.container.querySelector("#outside");

    await act(async () => {
      input().dispatchEvent(
        new FocusEvent("focusout", { bubbles: true, relatedTarget: help }),
      );
      await Promise.resolve();
    });
    expect(input().getAttribute("aria-expanded")).toBe("true");
    await act(async () => {
      input().dispatchEvent(
        new FocusEvent("focusout", { bubbles: true, relatedTarget: outside }),
      );
      await Promise.resolve();
    });
    expect(input().getAttribute("aria-expanded")).toBe("false");
  });

  it("dit qu'aucune suggestion ne correspond", async () => {
    mounted = await mount(<Harness emptyText="Aucun fruit." />);

    await typeInto(input(), "zz");

    expect(input().getAttribute("aria-expanded")).toBe("true");
    expect(popup()?.textContent).toContain("Aucun fruit.");
    expect(status()).toBe("Aucun fruit.");
  });

  it("reste fermée sans suggestion ni message", async () => {
    mounted = await mount(<Harness />);

    await typeInto(input(), "zz");

    expect(input().getAttribute("aria-expanded")).toBe("false");
    expect(status()).toBe("");
  });
});

describe("statusText", () => {
  it("accorde l'annonce", () => {
    expect(statusText(1)).toBe(
      "1 suggestion. Flèches haut et bas pour la sélectionner.",
    );
    expect(statusText(0)).toBe("");
  });
});
