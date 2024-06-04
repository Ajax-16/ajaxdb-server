import { DB, createDb } from "nuedb_core";
import bcryptjs from "bcryptjs"
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

export async function verifySysSetup() {
    const sysPath = process.platform === 'win32' ? 'C:/nuedb/system/' : '/var/nuedb/system/';
    try {
        await fs.access(path.join(sysPath, 'nue.json'))
    }catch(err) {
        if (err.code === 'ENOENT') {
            await sysSetup();
        } else {
            console.log(err.message);
        }
    }
}

async function sysSetup() {
    let NUEDB_ROOT_USERNAME, NUEDB_ROOT_PASSWORD;

    if (process.env.NUEDB_ROOT_USERNAME || process.env.NUEDB_ROOT_PASSWORD) {
        NUEDB_ROOT_USERNAME = process.env.NUEDB_ROOT_USERNAME || 'root';
        NUEDB_ROOT_PASSWORD = process.env.NUEDB_ROOT_PASSWORD || 'root';
    } else {
        dotenv.config({ path: '../.env' || '../.env.example' })
        NUEDB_ROOT_USERNAME = process.env.NUEDB_ROOT_USERNAME || 'root';
        NUEDB_ROOT_PASSWORD = process.env.NUEDB_ROOT_PASSWORD || 'root';
    }

    const sysDB = new DB();

    await createDb('system', 'nue');

    await sysDB.init('system', 'nue');

    const tableExists = new Set(sysDB.showAllTableNames());

    if (!tableExists.has('databases') && !tableExists.has('users')) {

        await sysDB.createTable({ tableName: 'database', columns: ['name'] });

        await sysDB.createTable({ tableName: 'user', columns: ['username', 'password', 'can_create', 'can_read', 'can_update', 'can_delete'] });
        const encryptedRootPasswd = bcryptjs.hashSync(NUEDB_ROOT_PASSWORD, 8)
        await sysDB.insert({ tableName: 'user', values: [NUEDB_ROOT_USERNAME, encryptedRootPasswd, true, true, true, true] });

    } else if (!tableExists.has('user')) {

        await sysDB.createTable({ tableName: 'user', columns: ['username', 'password', 'can_create', 'can_read', 'can_update', 'can_delete'] });
        const encryptedRootPasswd = bcryptjs.hashSync(NUEDB_ROOT_PASSWORD, 8)
        await sysDB.insert({ tableName: 'user', values: [NUEDB_ROOT_USERNAME, encryptedRootPasswd, true, true, true, true] });

    } else if (!tableExists.has('databases')) {

        await sysDB.createTable({ tableName: 'databases', columns: ['name'] });

    }

    await sysDB.save();
}