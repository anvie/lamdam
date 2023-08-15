import { __debug } from "./logger";


export function formatErrorMessage(message: string | undefined | any): string {
    if (!message) {
        return "";
    }
    return message.replace(/String /g, " ");
}


type ValidationError = {
    code: string;
    type: string;
    message: string;
    path: string[];
}

export function errorMessage(errs: ValidationError[] | string):string {
    let _errs:ValidationError[] | string = errs;
    if (typeof errs === "string") {
        _errs = JSON.parse(errs)
    }
    __debug('_errs:', _errs)
    let messages:string[] = []
    for (let i = 0; i < _errs.length; i++) {
        const e:ValidationError = _errs[i] as ValidationError;
        __debug("e.path:", e)
        messages.push(`${e.path[0]} ${e.message}`)
    }
    return messages.join("\n");
}