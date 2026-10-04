import { alerts, discord, mail, smtp, webhook } from "@spoar/engine/alerts";
import { defineConfig } from "@spoar/engine/config";

export default defineConfig({
  plugins: [
    alerts({
      channels: [
        mail({
          transport: smtp(process.env.MAIL_URL),
          from: process.env.MAIL_FROM || "Analytics <remco@gmail.com>",
        }),
        webhook(),
        discord({ retry: { maxAge: "1h" } }),
      ],
    }),
  ],
});
