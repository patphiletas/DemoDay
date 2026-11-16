import { ImageResponse } from "next/og";

// Icône d'onglet : « A » en Gelasio (proche de Georgia, la police des titres du site) sur le rouge d'accent.
// Remplace le favicon.ico par défaut de Next.js (triangle noir), identique sur tous les projets.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const LETTRE = "A";

// Police chargée de Google Fonts, réduite à la seule lettre affichée. Satori n'accepte pas
// le woff2 : sans navigateur déclaré, Google renvoie du TrueType. En cas d'échec, l'icône
// sort avec la police par défaut plutôt que de planter.
async function police(): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Gelasio:wght@700&text=${encodeURIComponent(LETTRE)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const reponse = await fetch(url);
    return reponse.ok ? await reponse.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Icon() {
  const donnees = await police();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#b7352d",
          borderRadius: 14,
          color: "#fffdf8",
          fontSize: 48,
          fontWeight: 700,
          fontFamily: donnees ? "Gelasio" : undefined,
          lineHeight: 1,
        }}
      >
        {LETTRE}
      </div>
    ),
    { ...size, fonts: donnees ? [{ name: "Gelasio", data: donnees, weight: 700, style: "normal" }] : [] },
  );
}
