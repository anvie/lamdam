
import { z } from "zod";

export const AddCollectionSchema = z.object({
    name: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/, "only accept alphanumeric and underscore"),
    description: z.string().min(5),
    creator: z.string().min(3),
});


export const DumpCollectionSchema = z.object({
    id: z.string()
});


export const AddRecordSchema = z.object({
    prompt: z.string().min(3),
    response: z.string().min(10),
    input: z.string().default(""),
    // creator: z.string().min(3),
    history: z.array(z.string()),
    collectionId: z.string()
});


export const UpdateRecordSchema = z.object({
    id: z.string(),
    prompt: z.string().min(3),
    response: z.string().min(10),
    input: z.string().default(""),
    // creator: z.string().min(3),
    history: z.array(z.string()),
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

