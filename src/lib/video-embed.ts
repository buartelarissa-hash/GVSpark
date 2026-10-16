/**
 * Converte links de vídeo em endereços de incorporação, apenas para provedores
 * que permitem incorporar (YouTube e Vimeo). Qualquer outro link é recusado.
 */
export type VideoEmbed = { provider: "youtube" | "vimeo"; id: string; embedUrl: string };

export function parseVideoUrl(raw: string | null | undefined): VideoEmbed | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");

  let yt: string | null = null;
  if (host === "youtu.be") yt = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") yt = url.searchParams.get("v");
    else {
      const m = /^\/(embed|shorts|live)\/([^/?#]+)/.exec(url.pathname);
      if (m) yt = m[2];
    }
  }
  if (yt && /^[A-Za-z0-9_-]{6,20}$/.test(yt)) {
    return { provider: "youtube", id: yt, embedUrl: `https://www.youtube-nocookie.com/embed/${yt}` };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = /\/(?:video\/)?(\d{5,12})(?:\/|$)/.exec(url.pathname);
    if (m) return { provider: "vimeo", id: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}` };
  }
  return null;
}
