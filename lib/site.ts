/** The path the site is published under, set once in next.config.ts. */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The published URL of a file in public/assets/, such as a mark or a font. */
export const asset = (file: string) => `${basePath}/assets/${file}`;

/** The published URL of a page, such as "/" or "/design/". */
export const page = (path: string) => `${basePath}${path}`;

export const github = "https://github.com/AhmedKhan-GH";
export const contact = "mailto:emailahmedebadkhan@gmail.com";
