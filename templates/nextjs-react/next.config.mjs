/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { webpack }) => {
    // Suppress optional native modules from MetaMask SDK / Coinbase SDK
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-async-storage\/async-storage$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^@x402\//,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^@coinbase\/cdp-sdk$/,
      }),
    );
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
