import moment from "moment";



export const timeFormat = (time: Date) => {

    const mailTime = moment(time);
    const now = moment();

    if (mailTime.isSame(now, "day")) {
        return mailTime.format("HH:mm");
    }

    if (mailTime.isSame(now, "week")) {
        return mailTime.format("dddd");
    }

    if (mailTime.isSame(now, "year")) {
        return mailTime.format("DD MMM");
    }

    return mailTime.format("DD MMM YYYY HH:mm");
}

// function to get current date time in milliseconds
export const getCurrentTimeMillis = () => {
    return new Date().getTime();
}

export enum Days {
    Sunday = 0,
    Monday,
    Tuesday,
    Wednesday,
    Thursday,
    Friday,
    Saturday
}

/*
    Returns the number of days in the current month, excluding the days in the excludes array.
    The excludes array defaults to excluding Sundays.
    @params excludes: number[] = [Days.Sunday]
*/
export function getDaysInCurrentMonth(excludes = [Days.Sunday]) {
    let day, counter, date;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    day = 1;
    counter = 0;
    date = new Date(year, month, day);
    while (date.getMonth() === month) {
        if (excludes.includes(date.getDay())) {
            counter += 1;
        }
        day += 1;
        date = new Date(year, month, day);
    }

    return day - counter
}