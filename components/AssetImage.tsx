/* eslint-disable @next/next/no-img-element -- The marks and the logo are SVG drawings served as they are (a static
   export does not optimize images), and next/image would add lazy loading and inline styles the page never had. */
import type { ImgHTMLAttributes } from "react";
import { asset } from "@/lib/site";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  /** The file in public/assets/. */
  file: string;
  alt?: string;
};

/** An image from public/assets/, at its published path. */
export function AssetImage({ file, alt = "", ...rest }: Props) {
  return <img src={asset(file)} alt={alt} {...rest} />;
}
