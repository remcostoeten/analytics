type Props = {
  mode: string;
  online: number;
  views: number;
  lcp: string;
  errors: number;
  ingest: string;
};

export function Statusline(props: Props) {
  return (
    <footer className="statusline">
      <span className="mode">{props.mode}</span>
      <span>
        online <b>{props.online}</b>
      </span>
      <span>
        views/min <b>{props.views}</b>
      </span>
      <span className="hide-sm">
        lcp p75 <b>{props.lcp}</b>
      </span>
      <span className="hide-sm">
        errors 30m <b>{props.errors}</b>
      </span>
      <span className="hide-sm">
        ingest <b>{props.ingest}</b>
      </span>
      <span className="help">1-6 buffers j/k rows / filter ⇧F10 menu esc close</span>
    </footer>
  );
}
