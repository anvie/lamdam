const mongoose = require("mongoose")
const Schema = mongoose.Schema

import { UpdateHistory } from "@/types";

const CollectionModel = new Schema({
  // id: { type: String, required: true, index: { unique: true }},
  name: { type: String, required: true },
  description: { type: String, required: true },
  creator: { type: String, default: "" },
  createdAt: { type: Number, required: true },
  lastUpdated: { type: Number, required: true },
  updateHistory: { type: Array<UpdateHistory>, required: true, default: []},
  count: { type: Number, required: true, default: 0 },
  meta: { type: Object, default: {} },
})

const Collection =
  mongoose.models.Collection || mongoose.model("Collection", CollectionModel)

export { Collection }
