import { ormParse } from "../../utils/orm.js";
import { clean } from "../../utils/string.js";
import { currentDB } from "./nueHandler.js";

export const fetchTable = async (data, tableName) => {
    const columns = [];
    const rows = [];

    const processDataRow = async (rowData, parentIndex) => {
        
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
                            await currentDB.insert({ tableName: relationTableName, values: [parentIndex, row] });
                        }
    
                    } else if (typeof value === 'object') {
    
                        const childTableName = `${key}`;
                        const childId = await fetchTable(value, childTableName);
                        tempValues.push(clean(childId[0]));
    
                        if (!Array.isArray(value)) {
                            columns.push(`${key}_id`);
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
            if(data[0]!==null) {
                for (const [key, value] of Object.entries(data[0])) {
                    if(typeof value === 'object' && !Array.isArray(value)) {
                        columns.push(`${key}_id`)
                    }
                    else if (!Array.isArray(value)) {
                        columns.push(key)
                    }
                }
                await currentDB.createTable({ tableName, primaryKey: '_nue_id_', columns });
                let indexCounter = currentDB.getNextTableIndex(tableName);
                for (let i = 0; i <data.length;i++) {
                    await processDataRow(data[i], indexCounter);
                    indexCounter++;
                }
            }
        }
    }
    
    if (typeof data === 'string') {
        await currentDB.createTable({ tableName, primaryKey: '_nue_id_', columns: ['value'] });
        await processDataRow(data);
    }
    
    if( typeof data === 'object' && !Array.isArray(data)){
        const columns = []
        if(data!==null) {
            for (const [key, value] of Object.entries(data)) {
                if (!Array.isArray(value)) {
                    if(typeof value === 'object') {
                        columns.push(`${key}_id`)
                    }else {
                        columns.push(key)
                    }
                }
            }
            await currentDB.createTable({ tableName, primaryKey: '_nue_id_', columns });
            const nextIndex = currentDB.getNextTableIndex(tableName);
            await processDataRow(data, nextIndex);
        }
    }
    
    const insertionIds = [];
    const conditions = []
    let count = 0;

    for (const column of columns) {
        conditions.push({condition: column, operator: '=', conditionValue: rows[0][count], logicalOperator: 'AND'})
        count++;
    }

    for (const row of rows) {
        const elementExist = ormParse(currentDB.find({ tableName, conditions }))
            let insertionId;
        if (elementExist._nue_id_>=0) {
            insertionId = elementExist._nue_id_
        } else {
            insertionId = await currentDB.insert({ tableName, values: clean(row) });
        }
        insertionIds.push(clean(insertionId));
    }

    return insertionIds;
};
