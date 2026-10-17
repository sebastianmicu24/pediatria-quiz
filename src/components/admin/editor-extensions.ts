import { Node } from "@tiptap/react";
import { Image as ImageExtension } from "@tiptap/extension-image";

/** Estensioni TipTap condivise dagli editor admin (quiz e blog). */

/** Larghezza/altezza intera valida (il sanitizzatore ammette solo 1-4 cifre). */
function integerSizeAttribute(name: "width" | "height") {
  return {
    default: null,
    parseHTML: (element: HTMLElement) => {
      const value = Number.parseInt(element.getAttribute(name) ?? "", 10);
      return Number.isFinite(value) && value > 0 ? value : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = Math.round(Number(attributes[name]));
      return Number.isFinite(value) && value > 0
        ? { [name]: Math.min(value, 9999) }
        : {};
    },
  };
}

/**
 * Immagine ridimensionabile: la maniglia d'angolo cambia la dimensione
 * (proporzioni mantenute) e il risultato viene salvato negli attributi
 * width/height, in pixel interi.
 */
export const ResizableImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: integerSizeAttribute("width"),
      height: integerSizeAttribute("height"),
    };
  },
});

const BLOG_HREF_REGEX = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/**
 * Pulsante verso un articolo del blog, da inserire nelle spiegazioni dei
 * quiz. È un nodo "atomico": nell'editor si comporta come un blocco unico
 * (si seleziona e si cancella intero) e si salva come
 * <a href="/blog/<slug>" data-blog-button="true">Titolo</a>, l'unico tipo
 * di link ammesso dal sanitizzatore nei quiz.
 */
export const BlogLinkButton = Node.create({
  name: "blogLinkButton",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      slug: {
        default: "",
        parseHTML: (element: HTMLElement) => {
          const match = (element.getAttribute("href") ?? "").match(BLOG_HREF_REGEX);
          return match ? match[1] : "";
        },
      },
      label: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          (element.textContent ?? "").trim().slice(0, 150),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-blog-button]",
        getAttrs: (element) => {
          const href = (element as HTMLElement).getAttribute("href") ?? "";
          return BLOG_HREF_REGEX.test(href) ? {} : false;
        },
      },
    ];
  },

  // Gli attributi del nodo (slug, label) non vanno nell'HTML: contano
  // solo href e testo.
  renderHTML({ node }) {
    return [
      "a",
      {
        href: `/blog/${node.attrs.slug}`,
        "data-blog-button": "true",
        target: "_blank",
        rel: "noopener",
      },
      node.attrs.label || node.attrs.slug,
    ];
  },
});
