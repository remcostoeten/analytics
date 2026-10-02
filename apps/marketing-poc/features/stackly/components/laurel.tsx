type Props = {
  title: string;
  note: string;
  year: string;
};

const leaves = Array.from({ length: 10 }, (_, index) => index);

function Branch({ mirrored }: { mirrored: boolean }) {
  return (
    <g transform={mirrored ? "translate(150 0) scale(-1 1)" : undefined} fill="#c2c2c6">
      {leaves.map((index) => {
        const t = index / (leaves.length - 1);
        const angle = 112 + t * 136;
        const rad = (angle * Math.PI) / 180;
        const x = 75 + Math.cos(rad) * 52;
        const y = 52 + Math.sin(rad) * 44;
        return (
          <g key={index} transform={`translate(${x} ${y}) rotate(${angle + 90})`}>
            <ellipse rx="2.4" ry="7" />
            <ellipse rx="2.2" ry="6.4" transform="rotate(-48)" opacity="0.7" />
          </g>
        );
      })}
    </g>
  );
}

export function Laurel({ title, note, year }: Props) {
  return (
    <div className="relative h-[104px] w-[150px]">
      <svg viewBox="0 0 150 104" className="absolute inset-0 h-full w-full" aria-hidden>
        <Branch mirrored={false} />
        <Branch mirrored />
      </svg>
      <div className="absolute inset-x-8 top-5 text-center">
        <p className="text-[11px] font-medium tracking-[0.06em] text-paper uppercase">{title}</p>
        <p className="mt-0.5 text-[6.5px] leading-[1.25] font-medium tracking-[0.04em] text-mist uppercase">
          {note}
        </p>
        <p className="mono mt-1.5 text-[10px] font-medium text-ember">{year}</p>
      </div>
    </div>
  );
}
