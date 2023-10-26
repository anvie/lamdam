const mongoose = require("mongoose")
const Schema = mongoose.Schema


const DataRecordModel = new Schema({
  prompt: { type: String, required: true },
  response: { type: String, default: "" },
  input: { type: String, required: true, default: "" },
  history: { type: Array<String>, default: [] },
  creator: { type: String, default: "" },
  creatorId: { type: String, default: "" },
  createdAt: { type: Number, required: true },
  lastUpdated: { type: Number, required: true },
  hash: { type: String, unique: true }, // ini merupakan sha1 hash dari prompt, input, response, dan history.
  // collectionId: { type: String, required: true },
  meta: { type: Object, default: {} },
})

void (async () => {
  await DataRecordModel.createIndex({ hash: 1 }, { unique: true })
})

const DataRecordRow =
  mongoose.models.DataRecordRow || mongoose.model("DataRecordRow", DataRecordModel)

export { DataRecordRow }

