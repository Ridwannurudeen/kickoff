/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // wagmi's metaMask connector pulls in an optional React Native storage dep
    // that has no place in a web build; stub it so the build is warning-free.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@base-org/account": false,
      "@coinbase/wallet-sdk": false,
      "@metamask/connect-evm": false,
      "@react-native-async-storage/async-storage": false,
      "@safe-global/safe-apps-provider": false,
      "@safe-global/safe-apps-sdk": false,
      "@walletconnect/ethereum-provider": false,
      accounts: false,
      porto: false,
    };
    // wagmi/walletconnect pull in optional native deps that we don't use
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
