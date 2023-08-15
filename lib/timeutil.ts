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
