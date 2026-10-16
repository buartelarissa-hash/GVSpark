import { parseVideoUrl } from "@/lib/video-embed";

export function VideoEmbed({ url, title }: { url: string | null | undefined; title: string }) {
  const video = parseVideoUrl(url);
  if (!video) return null;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-navy-950 shadow-[var(--shadow-card)]">
      <iframe
        src={video.embedUrl}
        title={title}
        className="size-full"
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
