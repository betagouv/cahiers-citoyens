import { join } from "node:path";
import {
  type Canvas,
  createCanvas,
  GlobalFonts,
  type SKRSContext2D,
} from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import type { Cahier } from "./domaine";
import { creerHasard, type Hasard } from "./hasard";
import { enTete } from "./transcription";

// A4 à 150 ppp : assez pour lire l'écriture, assez léger pour 200 cahiers.
const LARGEUR = 1240;
const HAUTEUR = 1754;
const PX_PAR_MM = LARGEUR / 210;
const INTERLIGNE = 8 * PX_PAR_MM;
const MARGE_GAUCHE = Math.round(34 * PX_PAR_MM);
const PREMIERE_LIGNE = 3 * INTERLIGNE;
const LIGNES_PAR_PAGE =
  Math.floor((HAUTEUR - PREMIERE_LIGNE - 1.5 * INTERLIGNE) / INTERLIGNE) + 1;
const DEBUT_TEXTE = MARGE_GAUCHE + 18;
const FIN_TEXTE = LARGEUR - 60;
const QUALITE_JPEG = 65;
const A4_POINTS: [number, number] = [595.28, 841.89];

interface Police {
  famille: string;
  fichier: string;
  taille: number;
}

const POLICES: readonly Police[] = [
  { famille: "Caveat", fichier: "Caveat.ttf", taille: 40 },
  { famille: "Indie Flower", fichier: "IndieFlower.ttf", taille: 30 },
  { famille: "Kalam", fichier: "Kalam.ttf", taille: 29 },
  { famille: "Patrick Hand", fichier: "PatrickHand.ttf", taille: 33 },
  {
    famille: "Shadows Into Light",
    fichier: "ShadowsIntoLight.ttf",
    taille: 33,
  },
];

const ENCRES = [
  "#1d3a8f",
  "#22348a",
  "#183070",
  "#2a3f9e",
  "#1f2430",
  "#2b2b33",
  "#1a2a55",
];

type Reglure = "seyes" | "simple";

interface Main {
  police: Police;
  encre: string;
  inclinaison: number;
  pression: number;
}

type Ligne =
  | {
      sorte: "texte";
      mots: string[];
      main: Main;
      alignement: "gauche" | "droite" | "centre";
    }
  | { sorte: "trait"; main: Main }
  | { sorte: "vide" };

export function enregistrerPolices(dossier: string): void {
  for (const { famille, fichier } of POLICES) {
    if (!GlobalFonts.registerFromPath(join(dossier, fichier), famille)) {
      throw new Error(`police illisible : ${join(dossier, fichier)}`);
    }
  }
}

function fonte(main: Main): string {
  return `${main.police.taille}px "${main.police.famille}"`;
}

function couperEnLignes(
  ctx: SKRSContext2D,
  texte: string,
  main: Main,
  largeur: number,
): string[][] {
  ctx.font = fonte(main);
  const lignes: string[][] = [];
  let courante: string[] = [];
  for (const mot of texte.split(/\s+/).filter(Boolean)) {
    const essai = [...courante, mot].join(" ");
    if (courante.length > 0 && ctx.measureText(essai).width > largeur) {
      lignes.push(courante);
      courante = [mot];
    } else {
      courante.push(mot);
    }
  }
  if (courante.length > 0) lignes.push(courante);
  return lignes;
}

function nouvelleMain(hasard: Hasard, precedente: Police | null): Main {
  const police = hasard.choix(POLICES.filter((p) => p !== precedente));
  return {
    police,
    encre: hasard.choix(ENCRES),
    inclinaison: hasard.reel() * 0.22 - 0.14,
    pression: 0.82 + hasard.reel() * 0.16,
  };
}

function mettreEnPages(
  cahier: Cahier,
  ctx: SKRSContext2D,
  hasard: Hasard,
): Ligne[][] {
  const flux: Ligne[] = [];
  const mairie = nouvelleMain(hasard, null);
  for (const [i, ligne] of enTete(cahier).entries()) {
    flux.push({
      sorte: "texte",
      mots: ligne.split(" "),
      main: mairie,
      alignement: i === 0 ? "centre" : "gauche",
    });
  }
  flux.push({ sorte: "vide" });

  let precedente: Police | null = mairie.police;
  for (const contribution of cahier.contributions) {
    const main = nouvelleMain(hasard, precedente);
    precedente = main.police;
    const retrait = hasard.entier(0, 2) * 20;
    for (const mots of couperEnLignes(
      ctx,
      contribution.texte,
      main,
      FIN_TEXTE - DEBUT_TEXTE - retrait,
    )) {
      flux.push({ sorte: "texte", mots, main, alignement: "gauche" });
    }
    if (contribution.signature !== null) {
      flux.push({
        sorte: "texte",
        mots: contribution.signature.split(" "),
        main,
        alignement: "droite",
      });
    }
    flux.push(
      hasard.probabilite(0.5) ? { sorte: "trait", main } : { sorte: "vide" },
    );
  }

  const pages: Ligne[][] = [];
  for (let i = 0; i < flux.length; i += LIGNES_PAR_PAGE) {
    const page = flux.slice(i, i + LIGNES_PAR_PAGE);
    while (page.length > 0 && page[page.length - 1].sorte !== "texte")
      page.pop();
    if (page.length > 0) pages.push(page);
  }
  return pages;
}

function dessinerPapier(
  ctx: SKRSContext2D,
  reglure: Reglure,
  teinte: [number, number, number],
  hasard: Hasard,
) {
  const [r, g, b] = teinte;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  for (let i = 0; i < 6; i++) {
    const x = hasard.reel() * LARGEUR;
    const y = hasard.reel() * HAUTEUR;
    const rayon = 200 + hasard.reel() * 500;
    const tache = ctx.createRadialGradient(x, y, 0, x, y, rayon);
    tache.addColorStop(0, "rgba(150,130,90,0.05)");
    tache.addColorStop(1, "rgba(150,130,90,0)");
    ctx.fillStyle = tache;
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  }

  ctx.lineWidth = 1;
  if (reglure === "seyes") {
    ctx.strokeStyle = "rgba(150,140,200,0.35)";
    for (
      let y = PREMIERE_LIGNE - 3 * INTERLIGNE;
      y < HAUTEUR;
      y += INTERLIGNE / 4
    ) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(LARGEUR, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(120,110,190,0.45)";
    for (let x = MARGE_GAUCHE + INTERLIGNE; x < LARGEUR; x += INTERLIGNE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HAUTEUR);
      ctx.stroke();
    }
  }
  ctx.strokeStyle =
    reglure === "seyes" ? "rgba(110,100,190,0.6)" : "rgba(90,140,200,0.5)";
  ctx.lineWidth = reglure === "seyes" ? 1.4 : 1.2;
  for (let y = PREMIERE_LIGNE - 2 * INTERLIGNE; y < HAUTEUR; y += INTERLIGNE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(LARGEUR, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(210,60,70,0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGE_GAUCHE, 0);
  ctx.lineTo(MARGE_GAUCHE, HAUTEUR);
  ctx.stroke();
}

function dessinerLigne(
  ctx: SKRSContext2D,
  ligne: Ligne,
  y: number,
  hasard: Hasard,
) {
  if (ligne.sorte === "vide") return;
  const main = ligne.main;
  ctx.strokeStyle = main.encre;
  ctx.fillStyle = main.encre;
  if (ligne.sorte === "trait") {
    const debut = DEBUT_TEXTE + 120 + hasard.reel() * 200;
    const fin = FIN_TEXTE - 120 - hasard.reel() * 200;
    ctx.globalAlpha = main.pression;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(debut, y - 10);
    ctx.bezierCurveTo(
      debut + 150,
      y - 14 + hasard.reel() * 8,
      fin - 150,
      y - 6 - hasard.reel() * 8,
      fin,
      y - 11,
    );
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  ctx.font = fonte(main);
  const espace = ctx.measureText(" ").width;
  const largeurs = ligne.mots.map((mot) => ctx.measureText(mot).width);
  const total =
    largeurs.reduce((a, b) => a + b, 0) + espace * (ligne.mots.length - 1);
  let x =
    ligne.alignement === "gauche"
      ? DEBUT_TEXTE + hasard.reel() * 6
      : ligne.alignement === "droite"
        ? FIN_TEXTE - total - 30
        : (DEBUT_TEXTE + FIN_TEXTE - total) / 2;
  const derive = hasard.reel() * 6 - 3;
  ligne.mots.forEach((mot, i) => {
    const dy =
      derive * ((x - DEBUT_TEXTE) / (FIN_TEXTE - DEBUT_TEXTE)) +
      hasard.reel() * 2.4 -
      1.2;
    ctx.save();
    ctx.translate(x, y - 2 + dy);
    ctx.transform(1, 0, main.inclinaison, 1, 0, 0);
    ctx.rotate((hasard.reel() - 0.5) * 0.025);
    ctx.globalAlpha = main.pression + hasard.reel() * 0.06;
    ctx.fillText(mot, 0, 0);
    ctx.restore();
    x += largeurs[i] + espace * (0.85 + hasard.reel() * 0.4);
  });
}

function creerGrain(hasard: Hasard): Canvas {
  const cote = 256;
  const grain = createCanvas(cote, cote);
  const ctx = grain.getContext("2d");
  const image = ctx.createImageData(cote, cote);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = hasard.reel() < 0.5 ? 0 : 255;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = Math.floor(hasard.reel() * 7);
  }
  ctx.putImageData(image, 0, 0);
  return grain;
}

function numeriser(papier: Canvas, grain: Canvas, hasard: Hasard): Canvas {
  const scan = createCanvas(LARGEUR, HAUTEUR);
  const ctx = scan.getContext("2d");
  ctx.fillStyle = "rgb(214,214,210)";
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  ctx.save();
  ctx.translate(
    LARGEUR / 2 + hasard.reel() * 16 - 8,
    HAUTEUR / 2 + hasard.reel() * 16 - 8,
  );
  ctx.rotate(((hasard.reel() - 0.5) * 1.6 * Math.PI) / 180);
  ctx.scale(0.975, 0.975);
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 12;
  ctx.drawImage(papier, -LARGEUR / 2, -HAUTEUR / 2);
  ctx.restore();

  const motif = ctx.createPattern(grain, "repeat");
  if (motif === null) throw new Error("motif de grain impossible à créer");
  ctx.save();
  ctx.translate(-hasard.entier(0, 255), -hasard.entier(0, 255));
  ctx.fillStyle = motif;
  ctx.fillRect(0, 0, LARGEUR + 256, HAUTEUR + 256);
  ctx.restore();

  const vignette = ctx.createRadialGradient(
    LARGEUR / 2,
    HAUTEUR / 2,
    HAUTEUR * 0.35,
    LARGEUR / 2,
    HAUTEUR / 2,
    HAUTEUR * 0.75,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(60,50,30,0.12)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  return scan;
}

export async function rendreScan(
  cahier: Cahier,
  graine: string,
): Promise<Uint8Array> {
  const hasard = creerHasard(graine);
  const grain = creerGrain(hasard.fils("grain"));
  const papier = createCanvas(LARGEUR, HAUTEUR);
  const ctx = papier.getContext("2d");
  const reglure: Reglure = hasard.probabilite(0.7) ? "seyes" : "simple";
  const teinte: [number, number, number] = [
    hasard.entier(240, 250),
    hasard.entier(234, 244),
    hasard.entier(214, 230),
  ];

  const pdf = await PDFDocument.create({ updateMetadata: false });
  for (const page of mettreEnPages(cahier, ctx, hasard)) {
    dessinerPapier(ctx, reglure, teinte, hasard);
    page.forEach((ligne, i) =>
      dessinerLigne(ctx, ligne, PREMIERE_LIGNE + i * INTERLIGNE, hasard),
    );
    const jpeg = await numeriser(papier, grain, hasard).encode(
      "jpeg",
      QUALITE_JPEG,
    );
    const image = await pdf.embedJpg(jpeg);
    pdf.addPage(A4_POINTS).drawImage(image, {
      x: 0,
      y: 0,
      width: A4_POINTS[0],
      height: A4_POINTS[1],
    });
  }
  return pdf.save();
}
