export const jwtConstants = {
  secret: 'mysecretkey', // Mude para process.env.JWT_SECRET em produção
  expiresIn: '60m',      // Tempo de expiração do Token Principal (Access Token)
  
  refreshSecret: 'myrefreshsecretkey', // Mude para process.env.JWT_REFRESH_SECRET em produção
  refreshExpiresIn: '7d', // Tempo de expiração do Refresh Token (7 dias)
};
