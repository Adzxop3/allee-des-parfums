// Serveur des tests de bout en bout : base de test remise à zéro, puis l'API en mode production
// (elle sert aussi le site compilé client/dist, à construire avant : npm run build --prefix client)
process.env.NODE_ENV = 'production'
await import('../server/test/env.js')
await import('../server/test/setup-db.js')
await import('../server/src/index.js')
