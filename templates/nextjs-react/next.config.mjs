/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@coinbase/cdp-sdk'],
  turbopack: {},
  // Legacy webpack config — only used with `next dev --webpack` or `next build --webpack`
  webpack: (config, { webpack }) => {
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
