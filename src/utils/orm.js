import { getArrayDimensions } from "./array.js"

export function ormParse(table) {

    let dimensions;

    if (Array.isArray(table)) {
        dimensions = getArrayDimensions(table);
    } else {
        return { response: table };
    }

    if (dimensions === 3) {

        if (table.length > 1) {

            let responses = {};

            for (let i = 0; i < table.length; i++) {
                responses[`q${i + 1}`] = ormParse(table[i]);
            }

            return responses;

        } else {

            return ormParse(table[0]);

        }


    } else if (dimensions === 2) {
        if (table.length === 3) {
            let resultObject = {};

            for (let j = 0; j < table[1].length; j++) {
                resultObject[table[1][j]] = table[2][j];
            }

            return resultObject;
        } else if (table.length === 2) {
            let resultObject = {};
            return resultObject;
        }

        let resultObject = [];

        for (let i = 2; i < table.length; i++) {
            let innerObject = {};

            for (let j = 0; j < table[1].length; j++) {
                innerObject[table[1][j]] = table[i][j];
            }

            resultObject.push(innerObject);
        }

        return resultObject;
    } else if (dimensions === 1) {
        return { response: table[0] };
    }
}
