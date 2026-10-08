type Props = { value: string };

export function Code({ value }: Props) {
  return (
    <pre className="card overflow-x-auto px-3 py-2 font-mono text-xs leading-5 whitespace-pre">
      {value}
    </pre>
  );
}
