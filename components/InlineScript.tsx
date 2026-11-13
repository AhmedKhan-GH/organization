/**
 * A script that the browser runs while it parses the page, before the first paint, as the static page's inline
 * scripts did. It is rendered by the server only; React does not run it again.
 */
export function InlineScript({ code }: { code: string }) {
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
