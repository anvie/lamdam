import { Collection } from "@/models/Collection";
import { DataRecordModel } from "@/models/DataRecordRow";
import { User } from "@/models/User";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import db from "@/lib/db";
import mongoose from "mongoose";

async function populateRecordStatus() {
    try {
        const collections = await Collection.find({});

        for (const { name } of collections) {
            const model = mongoose.models[name] || db.model(name, DataRecordModel, name)
            const docsToUpdate = await model.find({ createdAt: { $exists: false } });

            const updatePromises = docsToUpdate.map(async (doc) => {
                const ts = doc._id.getTimestamp().getTime();

                await model.findByIdAndUpdate(doc._id, {
                    createdAt: ts,
                    lastUpdated: ts,
                });
            });

            await Promise.all(updatePromises);

            console.log("Populating default 'pending' status to collection:", name);

            const result = await model.updateMany({}, { $set: { status: "pending" } });
            console.log("Updated:", result.modifiedCount);
        }
    } catch (error) {
        throw error;
    }
}


async function populateRole() {
    try {
        const result = await Promise.all([
            User.updateMany({ status: { $exists: false } }, { status: "active", role: "contributor", meta: { monthlyTarget: 0 } }),
            User.findOneAndUpdate({ email: process.env.ADMIN_EMAIL, role: { $exists: false } }, { role: "superuser" }),
        ])
        console.log("User Updated:", result);
    } catch (error) {
        throw error;
    }
}

async function main() {
    return Promise.all([
        populateRecordStatus(),
        populateRole(),
    ])
}

main()
    .then(() => {
        console.log("Done");
        process.exit(0);
    })
    .catch((err) => {
        console.log("Error", err);
        process.exit(1);
    })
    .finally(() => db.close())