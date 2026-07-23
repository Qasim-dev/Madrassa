import 'dotenv/config';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;

async function main() {
  await connectDb();
  const app = createApp();
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${port}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // eslint-disable-next-line no-console
      console.error(
        `Port ${port} is already in use. Close the other process or change PORT in server/.env.\n` +
          `Windows: netstat -ano | findstr ":${port}"  then  taskkill /PID <pid> /F`
      );
    } else {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    process.exit(1);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
