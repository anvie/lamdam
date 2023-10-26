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

export function errorMessage(errs: any): string {
    let _errs: ValidationError[] | string = errs;
    if (typeof errs === "string") {
        // try to parse
        try {
            _errs = JSON.parse(errs)
        } catch (e) {
            return errs
        }
    }
    if (typeof errs.message === "string") {
        // try to parse
        try {
            _errs = JSON.parse(errs.message)
            if ((_errs as any).error) {
                return (_errs as any).error as string
            }
        } catch (e) {
            return errs.message
        }
        return errs.message
    }
    if (errs.error) {
        return errs.error
    }

    __debug('_errs:', _errs)
    let messages: string[] = []
    for (let i = 0; i < _errs.length; i++) {
        const e: ValidationError = _errs[i] as ValidationError;
        __debug("e.path:", e)
        messages.push(`${e.path[0]} ${e.message}`)
    }
    return messages.join("\n");
}