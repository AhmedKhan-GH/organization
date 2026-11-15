import type { ReactNode } from "react";
import { AssetImage } from "@/components/AssetImage";
import { Spec } from "./Spec";

/** A drawing at specimen size with its name and specification, such as the logo or the seal. */
export function Specimen({ file, alt, name, spec }: { file: string; alt: string; name: string; spec: [string, ReactNode][] }) {
  return (
    <figure style={{ margin: 0 }}>
      <AssetImage className="specimen" file={file} alt={alt} />
      <figcaption>
        <div className="name specimen-name">{name}</div>
        <Spec rows={spec} />
      </figcaption>
    </figure>
  );
}
