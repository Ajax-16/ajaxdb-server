import { ormParse } from "../../utils/orm.js";
import { clean } from "../../utils/string.js";
import { currentDB } from "./nueHandler.js";
let counter = 0;

export const fetchTable = async (data, tableName) => {
    const columns = [];
    const rows = [];
    let parentId;

    const processDataRow = async (rowData) => {
        const tempValues = [];
        if (typeof rowData === 'string') {
            tempValues.push(rowData);
            columns.push('value');
        } else {
            for (const [key, value] of Object.entries(rowData)) {
                if (Array.isArray(value)) {
                    // Si es un array, representa una relación N:N
                    const relationTableName = `${tableName}_${key}`;
                    const relationTableRows = [];

                    await currentDB.createTable({ tableName: relationTableName, primaryKey: '_nue_id_', columns: [`${tableName}_id`, `${key}_id`] });

                    for (const element of value) {
                        const childTableName = `${key}`;
                        const childId = await fetchTable(element, childTableName);
                        relationTableRows.push(childId[0]);
                    }
                    for (const row of relationTableRows) {
                        // Utiliza el ID de la inserción actual
                        await currentDB.insert({ tableName: relationTableName, values: [parentId, row] });
                    }

                } else if (typeof value === 'object') {

                    const childTableName = `${key}`;
                    const childId = await fetchTable(value, childTableName);
                    tempValues.push(clean(childId[0]));
                    parentId = childId[0];

                    if (!Array.isArray(value)) {
                        columns.push(key);
                    }
                } else {
                    tempValues.push(value);
                    if (!Array.isArray(value)) {
                        columns.push(key);
                    }
                }
            }
        }
        rows.push(tempValues);
    };

    if (Array.isArray(data)) {
        if (data.length === 0) return [];
        if (typeof data[0] === 'string') {
            await currentDB.createTable({ tableName, primaryKey: '_nue_id_', columns: ['value'] });
            await processDataRow(data);
        } else {
            const columns = []
            for (const [key, value] of Object.entries(data[0])) {
                if (!Array.isArray(value)) {
                    columns.push(key)
                }
            }
            await currentDB.createTable({ tableName, primaryKey: '_nue_id_', columns });
            for (const item of data) {
                await processDataRow(item);
            }
        }
    } else {
        if (typeof data === 'string') {
            await currentDB.createTable({ tableName, primaryKey: '_nue_id_', columns: ['value'] });
        } else {
            const columns = []
            for (const [key, value] of Object.entries(data)) {
                if (!Array.isArray(value)) {
                    columns.push(key)
                }
            }
            await currentDB.createTable({ tableName, primaryKey: '_nue_id_', columns });
        }
        await processDataRow(data);
    }

    const insertionIds = [];
    for (const row of rows) {
        let insertionId;
        const elementExist = ormParse(currentDB.find({ tableName, conditions: [{ condition: 'value', operator: '=', conditionValue: row[0] }] }))
        if (elementExist._nue_id_) {
            insertionId = elementExist._nue_id_
        } else {
            insertionId = await currentDB.insert({ tableName, values: clean(row) });
        }
        insertionIds.push(clean(insertionId));
    }

    return insertionIds;
};
