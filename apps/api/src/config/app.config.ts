export default () => ({
  api: {
    port: parseInt(process.env.API_PORT ?? '3000', 10),
    prefix: 'api/v1',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    disabled: process.env.REDIS_DISABLED === 'true',
  },
});
