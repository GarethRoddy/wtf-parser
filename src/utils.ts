
function arrayToHex(array, offset, length) {
    let result = [];
    for(let i = 0; i < length; i++) {
        result[i] = isFinite(array[i+offset]) ? array[i + offset].toString(16).padStart(2, '0'): null;
    }
    return result.join(" ");
}

module.exports = { arrayToHex }