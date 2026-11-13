import { cssVar, type ColorPath } from "@/lib/tokens";

/** A sample of a colour token, painted with its custom property. */
export function Swatch({ token }: { token: ColorPath }) {
  return <span className="sw" style={{ background: cssVar(token) }} />;
}
