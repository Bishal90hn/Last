const Agent = require('socks5-http-client/lib/Agent');

const proxyList = [
  { host: 'proxy1.example.com', port: 1080, username: 'user1', password: 'pass1' },
  { host: 'proxy2.example.com', port: 1080, username: 'user2', password: 'pass2' },
  // Add more proxies here
];

function getRandomProxy() {
  if (proxyList.length === 0) {
    return null; // No proxy fallback
  }
  return proxyList[Math.floor(Math.random() * proxyList.length)];
}

function createProxyAgent() {
  const proxy = getRandomProxy();
  if (!proxy) return null;
  return new Agent({
    socksHost: proxy.host,
    socksPort: proxy.port,
    socksUsername: proxy.username,
    socksPassword: proxy.password,
  });
}

module.exports = { createProxyAgent };
