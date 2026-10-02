const root = `${import.meta.dir}/../out`;

Bun.serve({
  port: 3300,
  async fetch(request) {
    const path = new URL(request.url).pathname.replace(/^\//, "") || "index.html";
    const file = Bun.file(`${root}/${path}`);
    if (await file.exists()) return new Response(file);
    const page = Bun.file(`${root}/${path}.html`);
    if (await page.exists()) return new Response(page);
    return new Response("Not found", { status: 404 });
  },
});
