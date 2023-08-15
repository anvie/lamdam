const mongoose = require("mongoose");

console.log("Connecting to DB...");
console.log("   ", process.env.MONGODB_URI);

if (!process.env.MONGODB_URI) {
  throw Error("Please set MONGODB_URI env variable");
}

mongoose.connect(process.env.MONGODB_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  retryWrites: false,
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));

db.once("open", function callback() {
  console.log("MongoDB Connected.");
});

export default db;
