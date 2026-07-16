const { Pool } = require('pg');

// When DB_IAM_AUTH=true (Aurora/RDS in the cluster), we authenticate with a
// short-lived IAM auth token instead of a stored password. The token is valid
// for 15 minutes, so we generate a fresh one for every new pool connection by
// passing `password` as an async function — pg calls it per new client.
//
// This relies on the pod's IRSA service account having rds-db:connect on the
// DB user. No password is ever stored.
function buildConfig() {
  const base = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'todo_user',
    database: process.env.DB_NAME || 'todo_db',
  };

  if (process.env.DB_IAM_AUTH === 'true') {
    // Lazy-require so local/password runs don't need the AWS SDK installed.
    const { Signer } = require('@aws-sdk/rds-signer');
    const signer = new Signer({
      region: process.env.AWS_REGION,
      hostname: base.host,
      port: base.port,
      username: base.user,
    });
    // IAM auth on RDS always requires TLS.
    base.ssl = { rejectUnauthorized: false };
    // Async function → pg fetches a fresh token for each new connection.
    base.password = () => signer.getAuthToken();
  } else {
    base.password = process.env.DB_PASSWORD || 'todo_pass';
    base.ssl =
      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;
  }

  return base;
}

const pool = new Pool(buildConfig());

module.exports = pool;
