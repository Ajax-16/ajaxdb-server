import { DB, createDb } from "nuedb_core";
import bcrypt from "bcrypt"
import dotenv from 'dotenv';

async function main() {

    let ROOT_USERNAME, ROOT_PASSWORD;

    if (process.env.ROOT_USERNAME || process.env.ROOT_PASSWORD) {
        ROOT_USERNAME = process.env.ROOT_USERNAME || 'root';
        ROOT_PASSWORD = process.env.ROOT_PASSWORD || 'root';
    } else {
        dotenv.config({ path: '../.env' || '../.env.example' })
        ROOT_USERNAME = process.env.ROOT_USERNAME || 'root';
        ROOT_PASSWORD = process.env.ROOT_PASSWORD || 'root'; 
    }

    const sysDB = new DB();

    await createDb('system', 'nue');

    await sysDB.init('system', 'nue');

    const tableExists = new Set(sysDB.showAllTableNames());

    if (!tableExists.has('databases') && !tableExists.has('users')) {

        await sysDB.createTable({ tableName: 'database', columns: ['name'] });

        await sysDB.createTable({ tableName: 'user', columns: ['username', 'password', 'host', 'can_create', 'can_read', 'can_update', 'can_delete'] });
        const encryptedRootPasswd = bcrypt.hashSync(ROOT_PASSWORD, 8)
        await sysDB.insert({ tableName: 'user', columns: ['username', 'password', 'host'], values: [ROOT_USERNAME, encryptedRootPasswd, 'localhost', true, true, true, true] });
        
    } else if (!tableExists.has('user')) {

        await sysDB.createTable({ tableName: 'user', columns: ['username', 'password', 'host', 'can_create', 'can_read', 'can_update', 'can_delete'] });
        const encryptedRootPasswd = bcrypt.hashSync(ROOT_PASSWORD, 8)
        await sysDB.insert({ tableName: 'user', columns: ['username', 'password', 'host'], values: [ROOT_USERNAME, encryptedRootPasswd, 'localhost', true, true, true, true] });
    
    } else if (!tableExists.has('databases')) {

        await sysDB.createTable({ tableName: 'databases', columns: ['name'] });
    
    }

    await sysDB.save();

}

main();