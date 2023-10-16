
import { z } from "zod";

export const AddCollectionSchema = z.object({
    name: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/, "only accept alphanumeric and underscore"),
    description: z.string().min(5),
    creator: z.string().min(3),
    dataType: z.string()
});


export const DumpCollectionSchema = z.object({
    id: z.string()
});

export const ExportRecordsSchema = z.object({
    collection_id: z.string(),
    ids: z.array(z.string())
});

export const ImportRecordsSchema = z.object({
    collection_id: z.string(),
    records: z.array(z.object({
        instruction: z.string(),
        response: z.string(),
        input: z.string().optional(),
        history: z.array(z.array(z.string())).optional()
    }))
});


export const GetRecordSchema = z.object({
    id: z.string().min(3),
    collectionId: z.string().min(10)
});


export const AddRecordSchema = z.object({
    prompt: z.string().min(3),
    response: z.string().min(10),
    input: z.string().default(""),
    // creator: z.string().min(3),
    history: z.array(z.array(z.string())),
    collectionId: z.string(),

    // -- for reward model --
    outputPositive: z.string().optional(),
    outputNegative: z.string().optional()
});


export const UpdateRecordSchema = z.object({
    id: z.string(),
    prompt: z.string().min(3),
    response: z.string().min(10),
    input: z.string().default(""),
    // creator: z.string().min(3),
    history: z.array(z.string()).or(z.array(z.array(z.string()))),
    collectionId: z.string().optional()
});


export const MoveRecordSchema = z.object({
    id: z.string().min(3),
    colSrcId: z.string(),
    colDstId: z.string()
});


export const DeleteRecordSchema = z.object({
    id: z.string(),
    collectionId: z.string()
});

