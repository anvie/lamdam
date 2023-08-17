const mongoose = require("mongoose")
const Schema = mongoose.Schema

import { UpdateHistory } from "@/types";

const DataRecordModel = new Schema({
  prompt: { type: String, required: true },
  response: { type: String, default: "" },
  history: { type: Array<String>, default: [] },
  creator: { type: String, default: "" },
  createdAt: { type: Number, required: true },
  lastUpdated: { type: Number, required: true },
  // collectionId: { type: String, required: true },
  meta: { type: Object, default: {} },
})

const DataRecordRow =
  mongoose.models.DataRecordRow || mongoose.model("DataRecordRow", DataRecordModel)

export { DataRecordRow }
