import { cache } from "react";
import { resolvePlace } from "@/lib/page-search/find-place";

// Une seule lecture du lieu par requête, partagée par le titre de la page
// (`generateMetadata`) et son contenu.
export const resolvePlaceForRequest = cache(resolvePlace);
