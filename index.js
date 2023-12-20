import dbMethods from './algorithms/array_methods.js';
import { treeSearch } from './algorithms/tree_search.js';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DB {

    tables = [];

    name = 'db';

    keywords = ['TABLE NOT FOUND!', 'TABLE CANNOT BE CREATED!', 'ROW CANNOT BE CREATED!', 'ROW OR ROWS CANNOT BE DELETED!', 'ROW OR ROWS NOT FOUND!', 'ROW OR ROWS NOT FOUND!, ANY TABLES FOUND!']

    intialized = false;

    constructor(name) {
        this.name = name;
        this.filePath = resolve(__dirname, `./db/${this.name}_db.json`);
    }

    async init() {
        try {
            const fileContent = await fs.readFile(this.filePath, 'utf8');
            this.tables = JSON.parse(fileContent);
            console.log('CONTENT LOADED');
            this.intialized = true;
        } catch (readError) {
            this.tables = [];

            try {
                await fs.writeFile(this.filePath, '');
                console.log('DATABASE CREATED SUCCESSFULY');
                this.intialized = true;
            } catch (writeError) {
                console.error('ERROR WRITING ON DATABASE FILE:', writeError);
            }
        }
    }

    createTable({tableName, primaryKey, columns}) {

        if(!this.intialized){
            console.log('TABLE WITH NAME "' + tableName + '" NOT CREATED. DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['TABLE CANNOT BE CREATED!', 'DATABASE ' + this.name + ' NOT INITIALIZED'], []];
        }

        let tableExist = this.getOneTable(tableName);

        if (tableExist[0][0] !== 'TABLE NOT FOUND!') {
            console.log('TABLE WITH NAME "' + tableName + '" NOT CREATED. TABLE NAME = "' + tableName + '" IS ALREADY CREATED');
            return [['TABLE CANNOT BE CREATED!', 'NAME ' + tableName + ' ALREADY IN USE'], []];
        }

        if(tableName === undefined){
            tableName = 'table';
        }

        if(primaryKey === undefined || columns === undefined ){
            primaryKey = 'id';
            columns = [];
        }

        let isKeyWord = treeSearch(this.keywords, tableName);

        if (isKeyWord !== -1) {
            console.log('TABLE WITH NAME "' + tableName + '" NOT CREATED. TABLE_NAME = "' + tableName + '" IS A KEYWORD');
            return [['TABLE CANNOT BE CREATED!', 'NAME "' + tableName + '" IS A KEYWORD'], []];
        }

        let table = [[], []];

        table[0][0] = tableName;

        table[0][1] = 0;

        table[1][0] = primaryKey;

        for (let i = 0; i < columns.length; i++) {
            table[1][i + 1] = columns[i];
        }

        dbMethods.insert(this.tables, table);

        this.save();

        console.log('TABLE WITH NAME "' + tableName + '" CREATED SUCCESSFULY');

        return true;

    }

    async dropTable(tableName) {

        if(!this.intialized){
            console.log('TABLE WITH NAME "' + tableName + '" COULD NOT BE DROPPED!. DATABASE "' + this.name + '" NOT INITIALIZED');
            return false;
        }

        let result;

        let tableNames = this.getAllTableNames();

        let tableIndex = treeSearch(tableNames, tableName);

        if(tableIndex===-1) {
            console.log('TABLE COULD NOT BE DROPPED!. TABLE DOES\'T EXIST')
            result = false;
        }

        result = dbMethods.deleteByIndex(this.tables, tableIndex);

        console.log('TABLE "' + tableName + '" DROPPED SUCCESSFULY');

        await this.save();

        return result;

    }

    getAllTables() {
        if(!this.intialized){
            console.log('ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['ANY TABLES FOUND!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        return this.tables;
    }

    getAllTableNames() {
        if(!this.intialized){
            console.log('ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['ANY TABLES FOUND!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let tableNames = [];
        for (let i = 0; i < this.tables.length; i++) {
            dbMethods.insert(tableNames, this.tables[i][0][0]);
        }
        return tableNames;
    }

    getOneTable(tableName) {
        if(!this.intialized){
            console.log('TABLE NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['TABLE NOT FOUND!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let tableNames = this.getAllTableNames();
        let position = treeSearch(tableNames, tableName);
        if (position !== -1) {
            return this.tables[position];
        }
        return [['TABLE NOT FOUND!'], []];
    }

    async insert({ tableName, values }) {
        if(!this.intialized){
            console.log('ROW CANNOT BE CREATED! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['ROW CANNOT BE CREATED!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let table = this.getOneTable(tableName);
        if (table[0][0] === 'TABLE NOT FOUND!') {
            console.log('ROW CANNOT BE CREATED! TABLE "' + tableName + '" DOESN\'T EXISTS');
            return [['ROW CANNOT BE CREATED!', 'TABLE ' + tableName + ' DOESN\'T EXISTS'], []]
        }
        let limitOnValues = table[1].length - 1;
        if (values.length < limitOnValues) {
            console.log('ROW CANNOT BE CREATED! SOME OF THE VALUES ARE NULL')
            return [['ROW CANNOT BE CREATED!', 'SOME OF THE VALUES ARE NULL'], []]
        }
        let row = [table[0][1]];
        for (let i = 0; i < limitOnValues; i++) {
            dbMethods.insert(row, values[i]);
        }

        dbMethods.insert(table, row);

        table[0][1]++;

        await this.save();

        console.log('CREATED ROW WITH "' + table[1][0] + '" VALUE = "' + table[table.length-1][0] + '"')

        return true;

    }

    async delete({ tableName, condition = this.getOneTable(tableName)[1][0], conditionValue }) {
        if(!this.intialized){
            console.log('ROW OR ROWS CANNOT BE DELETED! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['ROW OR ROWS CANNOT BE DELETED!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let table = this.getOneTable(tableName);
        if (table[0][0] === 'TABLE NOT FOUND!') {
            console.log('ROW OR ROWS CANNOT BE DELETED! TABLE "' + tableName + '" DOESN\'T EXISTS')
            return [['ROW OR ROWS CANNOT BE DELETED!', 'TABLE ' + tableName + ' DOESN\'T EXISTS'], []]
        }

        let columnIndex = treeSearch(table[1], condition);

        if (columnIndex === -1) {
            console.log('ROW OR ROWS CANNOT BE DELETED! CONDITION "' + condition + '" IS NOT A VALID COLUMN')
            return [['ROW OR ROWS CANNOT BE DELETED!', 'CONDITION ' + condition + ' IS NOT A VALID COLUMN'], []]
        }

        let columns = [];

        for (let i = 2; i < table.length; i++) {
            dbMethods.insert(columns, table[i][columnIndex]);
        }

        let elementExist = dbMethods.deleteAllByContent(columns, conditionValue);

        if (elementExist) {
            for (let i = table.length - 1; i >= 2; i--) {
                const deleteElement = treeSearch(columns, table[i][columnIndex]);
                if (deleteElement === -1) {
                    console.log('DELETED ONE ROW WITH "' + table[1][columnIndex] + '" VALUE = "' + table[i][columnIndex] + '"')
                    dbMethods.deleteByIndex(table, i);
                    await this.save();
                }
            }

            return true;
            
        }else {
            console.log('0 ROWS AFFECTED')
        }

    }

    async update({ tableName, set = [this.getOneTable(tableName)[1][0]], setValues, condition = this.getOneTable(tableName)[1][0], conditionValue }) {
        if(!this.intialized){
            console.log('ROW OR ROWS NOT UPDATED! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['ROW OR ROWS NOT UODATED!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let table = this.getOneTable(tableName);
        let columnsIndexes = [];
    
        for (let i = 0; i < set.length; i++) {
            dbMethods.insert(columnsIndexes, treeSearch(table[1], set[i]));
    
            if (columnsIndexes[i] === -1) {
                console.log('ROW OR ROWS NOT UPDATED! CONDITION "' + set[i] + '" IS NOT A VALID COLUMN');
                return [['ROW OR ROWS NOT UPDATED!', 'CONDITION ' + set[i] + ' IS NOT A VALID COLUMN'], []];
            }
        }
    
        if (table[0][0] === 'TABLE NOT FOUND!') {
            console.log('ROW OR ROWS NOT UPDATED! TABLE "' + tableName + '" DOESN\'T EXISTS');
            return [['ROW OR ROWS NOT UPDATED!', 'TABLE ' + tableName + ' DOESN\'T EXISTS'], []];
        }
    
        let columns = [];
    
        for (let i = 0; i < set.length; i++) {
            columns[i] = [];
            for (let j = 2; j < table.length; j++) {
                if (columnsIndexes[i] < table[j].length) {
                    dbMethods.insert(columns[i], table[j][columnsIndexes[i]]);
                }
            }
        }

        let anyRowsAffected = false;
    
        if (setValues && setValues.length === set.length) {
            for (let i = 2; i < table.length; i++) {
                const conditionIndex = table[1].indexOf(condition);
                if (conditionIndex !== -1 && table[i][conditionIndex] === conditionValue) {
                    for (let j = 0; j < set.length; j++) {
                        const updateElement = treeSearch(columns[j], table[i][columnsIndexes[j]]);
                        if (updateElement !== -1) {
                            table[i][columnsIndexes[j]] = setValues[j];
                            await this.save();
                        }
                    }
                }
            }
        } 

        return true;

    }

    find({ tableName, condition = this.getOneTable(tableName)[1][0], conditionValue, limit }) {
        if(!this.intialized){
            console.log('ROW OR ROWS NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['ROW OR ROWS NOT FOUND!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let table = this.getOneTable(tableName);
        if(limit === undefined || limit > table.length-2){
            limit = table.length-2;
        }
        if (table[0][0] === 'TABLE NOT FOUND!') {
            console.log('ROW OR ROWS NOT FOUND! TABLE "' + tableName + '" DOESN\'T EXISTS')
            return [['ROW OR ROWS NOT FOUND!', 'TABLE ' + tableName + ' DOESN\'T EXISTS'], []]
        }

        let columnIndex = treeSearch(table[1], condition);

        if (columnIndex === -1) {
            console.log('ROW OR ROWS NOT FOUND! CONDITION "' + condition + '" IS NOT A VALID COLUMN')
            return [['ROW OR ROWS NOT FOUND!', 'CONDITION ' + condition + ' IS NOT A VALID COLUMN'], []]
        }

        let columns = [];

        for (let i = 2; i < table.length; i++) {
            dbMethods.insert(columns, table[i][columnIndex]);
        }

        let values = [];

        for(let i = 0; i < table[1].length; i++) {
        
            dbMethods.insert(values, table[1][i]);

        }

        let rows = [[table[0][0]], values];

        let elementExist = dbMethods.deleteAllByContent(columns, conditionValue);

        let inserts = 0;

        if (elementExist) {
            for (let i = 2; i < table.length; i++) {
                const foundElement = treeSearch(columns, table[i][columnIndex]);
                if(inserts === limit){
                    break;
                }
                if (foundElement === -1) {
                    dbMethods.insert(rows, table[i]);
                    inserts++;
                }
            }
            
        }else {
            console.log('ROW OR ROWS NOT FOUND!')
            return [['ROW OR ROWS NOT FOUND!'], []]
        }

        return rows;

    }

    async save() {
        if(!this.intialized){
            console.log('YOU CAN\'T SAVE! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['YOU CAN\'T SAVE!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        await fs.writeFile(this.filePath, JSON.stringify(this.tables, null, 2));
    }

}