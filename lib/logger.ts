

let __loggerLog = (level: string, ...args: any[]) => {
    console.log(`[${level}]`, ...args);
}

let __loggerLog2 = (level: string, ...args: any[]) => {
    console.log(`[${level}]`, ...args);
}

// strip out all logging if not in dev mode
if (process.env.NODE_ENV !== 'development' && process.env.DEBUG_MODE !== 'true') {
    __loggerLog = () => { };
}

const __logl = __loggerLog;
const __log = (...args: any[]) => __loggerLog('LOG', ...args);
const __warn = (...args: any[]) => __loggerLog2('WARN', ...args);
const __error = (...args: any[]) => __loggerLog2('ERROR', ...args);
const __debug = (...args: any[]) => __loggerLog('DEBUG', ...args);
const __trace = (...args: any[]) => __loggerLog('TRACE', ...args);


export { __debug, __error, __log, __logl, __trace, __warn };

