// PM2 process manager config
// Start: pm2 start ecosystem.config.js
// Save:  pm2 save && pm2 startup   (so it survives reboots)
module.exports = {
  apps: [
    {
      name: "aiassets-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      instances: 1, // single instance is enough for 2 vCPU; avoid cluster mode to save RAM
      exec_mode: "fork",
      max_memory_restart: "700M", // restart if a leak pushes memory too high, leaves headroom for Postgres
      env: {
        NODE_ENV: "production",
      },
      out_file: "./logs/web-out.log",
      error_file: "./logs/web-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
