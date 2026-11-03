const HEX = /(#(?:[0-9a-f]{6}|[0-9a-f]{3}))\b/gi;

/** Renders text with a colour dot in front of every hex code, e.g. the "Önskad färg: #1f6f8b" line of an inquiry. */
export default function ColorText({ text }: { text: string }) {
  const parts = text.split(HEX);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="whitespace-nowrap">
            <span className="mr-1 inline-block h-3.5 w-3.5 rounded-full align-[-0.15em] ring-1 ring-black/15" style={{ background: part }} aria-hidden="true" />
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}
