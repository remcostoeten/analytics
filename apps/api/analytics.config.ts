import { alerts, discord, mail, smtp, webhook } from "@remcostoeten/analytics-engine/alerts";
import { defineConfig } from "@remcostoeten/analytics-engine/config";

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
