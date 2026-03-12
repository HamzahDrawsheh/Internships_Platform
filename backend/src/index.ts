import { config } from "./config";
import { getDb } from "./db/connection";
import app from "./app";

getDb();

app.listen(config.PORT, () => {
  console.log(`Server listening on http://localhost:${config.PORT}`);
});
