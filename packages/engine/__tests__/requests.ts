export const agents = {
  chrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  brave:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  firefox: "Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0",
  safari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
  chromeIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1",
  headless:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36",
  googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  gptbot:
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
  curl: "curl/8.5.0",
  requests: "python-requests/2.32.3",
};

const fetchMetadata = {
  "sec-fetch-site": "cross-site",
  "sec-fetch-mode": "no-cors",
  "sec-fetch-dest": "empty",
};

export const browserHeaders = {
  chrome: {
    "user-agent": agents.chrome,
    "accept-language": "en-GB,en;q=0.9",
    "sec-ch-ua": '"Chromium";v="140", "Google Chrome";v="140", "Not;A=Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    ...fetchMetadata,
  },
  brave: {
    "user-agent": agents.brave,
    "accept-language": "en-US,en;q=0.5",
    "sec-ch-ua": '"Chromium";v="140", "Brave";v="140", "Not;A=Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-gpc": "1",
    ...fetchMetadata,
  },
  firefox: {
    "user-agent": agents.firefox,
    "accept-language": "nl,en-US;q=0.7,en;q=0.3",
    ...fetchMetadata,
  },
  safari: {
    "user-agent": agents.safari,
    "accept-language": "en-GB,en;q=0.9",
    ...fetchMetadata,
  },
};
