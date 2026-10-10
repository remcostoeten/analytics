import type { Filters, ProjectScope } from "@spoar/client";

import { countryName, formatCount, formatPercent } from "../format";
import { useRead } from "../use-read";
import { ReadFrame } from "./read-frame";

type Props = {
  scope: ProjectScope;
  scopeKey: string;
  onPick: (dimension: keyof Filters, value: string) => void;
};

export function CountryTable({ scope, scopeKey, onPick }: Props) {
  const places = useRead(() => scope.map({ level: "country", limit: 25 }), [scopeKey]);
  return (
    <ReadFrame
      title="Countries"
      read={places}
      isEmpty={(value) => value.data.length === 0}
      empty="No located visitors in this range."
      skeleton={<div className="table-wrap skeleton" style={{ height: 240 }} />}
    >
      {(value) => (
        <div className="table-wrap">
          <table className="rows">
            <thead>
              <tr>
                <th>Country</th>
                <th>Code</th>
                <th>Visitors</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {value.data.map((place) => (
                <tr
                  key={place.country}
                  onClick={() => onPick("country", place.country)}
                  className="clickable"
                >
                  <td>{countryName(place.country)}</td>
                  <td className="mono">{place.country}</td>
                  <td>{formatCount(place.visitors)}</td>
                  <td>{formatPercent(place.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="table-foot">
            {value.total} {value.total === 1 ? "country" : "countries"} in total
          </p>
        </div>
      )}
    </ReadFrame>
  );
}
