// Utils
export function get(selector) {
    return document.querySelector(".app").querySelector(selector);
}

export function max(array) {
    let max = -Infinity;
    for (let i = 0; i < array.length; i++ ) {
        if (array[i] > max) {
            max = array[i];
        }
    }

    return max;
}

export function formatDate(date) {
    const h = "0" + date.getHours();
    const m = "0" + date.getMinutes();

    return `${h.slice(-2)}:${m.slice(-2)}`;
}
