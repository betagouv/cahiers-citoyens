import { act } from "react";
import { type Root, createRoot } from "react-dom/client";

// Outils pour tester un composant client sous happy-dom : monter, saisir,
// appuyer sur une touche, comme le ferait un utilisateur.

export interface Mounted {
  container: HTMLDivElement;
  root: Root;
}

export async function mount(node: React.ReactNode): Promise<Mounted> {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
    await Promise.resolve();
  });
  return { container, root };
}

export function unmount({ container, root }: Mounted) {
  act(() => root.unmount());
  container.remove();
}

// Change la valeur comme une frappe : React suit la valeur par le setter
// natif, puis réagit à l'événement `input`.
export async function typeInto(input: HTMLInputElement, value: string) {
  await act(async () => {
    Reflect.set(HTMLInputElement.prototype, "value", value, input);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();
  });
}

export async function press(
  element: HTMLElement,
  key: string,
  options: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  await act(async () => {
    element.dispatchEvent(event);
    await Promise.resolve();
  });
  return event;
}

export async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
}
