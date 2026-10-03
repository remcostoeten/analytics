type Props = {
  lines: string[];
};

export function PixelHeading({ lines }: Props) {
  return (
    <h1 className="hero-rise font-pixel max-w-2xl text-[2.6rem] leading-[1.05] font-normal text-fg sm:text-[3.6rem]">
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </h1>
  );
}
