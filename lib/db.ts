import type { ConnectOptions, Connection } from "mongoose";
import mongoose from "mongoose";

let db: Connection | null = null;

export const createConnection = async () => {
  if (db) {
    console.log("DB already connected.");
    return Promise.resolve(db)
  };

  if (!process.env.MONGODB_URI) {
    return Promise.reject("Please set MONGODB_URI env variable");
  }

  console.log("Connecting to DB...");
  await mongoose.connect(process.env.MONGODB_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    retryWrites: false,
    connectTimeoutMS: 8000,
  } as ConnectOptions)

  db = mongoose.connection;

  return Promise.resolve(db);
}

createConnection()
  .then(() => console.log("👌 MongoDB Connected."))
  .catch((err) => console.error("😭 Creating new connection failed:", err.message));

export default db;
