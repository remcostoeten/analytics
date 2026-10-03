type Props = {
  lines: string[];
};

export function PixelHeading({ lines }: Props) {
  let index = 0;
  return (
    <h1 className="font-pixel max-w-2xl text-[2.6rem] leading-[1.05] font-normal text-fg sm:text-[3.6rem]">
      {lines.map((line, lineIndex) => (
        <span key={line} className="block">
          {line.split(" ").map((word) => {
            const delay = `${80 + index++ * 70}ms`;
            return (
              <span
                key={`${lineIndex}-${word}-${delay}`}
                className="inline-block overflow-hidden pe-[0.28em]"
              >
                <span className="animate-rise inline-block" style={{ animationDelay: delay }}>
                  {word}
                </span>
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
