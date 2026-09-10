const { getDefaultConfig } = require("expo/metro-config");
const http = require("http");

const config = getDefaultConfig(__dirname);
const originalEnhance = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const inner = originalEnhance ? originalEnhance(middleware, server) : middleware;
    return (req, res, next) => {
      if (req.url && req.url.startsWith("/api")) {
        const proxy = http.request(
          {
            hostname: "127.0.0.1",
            port: 8000,
            path: req.url,
            method: req.method,
            headers: { ...req.headers, host: "127.0.0.1:8000" },
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
            proxyRes.pipe(res);
          },
        );
        proxy.on("error", (err) => {
          res.statusCode = 502;
          res.end(String(err));
        });
        req.pipe(proxy);
        return;
      }
      return inner(req, res, next);
    };
  },
};

module.exports = config;
