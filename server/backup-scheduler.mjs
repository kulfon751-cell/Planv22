import cron from 'node-cron';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/pm-plan';
const BACKUP_CRON = process.env.BACKUP_CRON || '0 2 * * *';
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

function runBackup() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    const backupSubDir = path.join(BACKUP_DIR, year.toString(), month.toString());
    if (!fs.existsSync(backupSubDir)) {
        fs.mkdirSync(backupSubDir, { recursive: true });
    }

    const backupFile = `pm_plan_${year}${month}${day}_${hours}${minutes}.dump`;
    const backupPath = path.join(backupSubDir, backupFile);

    const command = `pg_dump --format=custom -f ${backupPath}`;

    console.log(`[Backup] Starting backup to ${backupPath}...`);
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`[Backup] Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`[Backup] Stderr: ${stderr}`);
        }
        console.log(`[Backup] Successfully created backup: ${backupPath}`);
        cleanupOldBackups();
    });
}

function cleanupOldBackups() {
    const now = new Date();
    const retentionPeriod = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    fs.readdir(BACKUP_DIR, { withFileTypes: true }, (err, yearDirs) => {
        if (err) {
            console.error(`[Backup Cleanup] Error reading backup directory: ${err.message}`);
            return;
        }

        yearDirs.forEach(yearDir => {
            if (yearDir.isDirectory()) {
                const yearPath = path.join(BACKUP_DIR, yearDir.name);
                fs.readdir(yearPath, { withFileTypes: true }, (err, monthDirs) => {
                    monthDirs.forEach(monthDir => {
                        if (monthDir.isDirectory()) {
                            const monthPath = path.join(yearPath, monthDir.name);
                            fs.readdir(monthPath, (err, files) => {
                                files.forEach(file => {
                                    const filePath = path.join(monthPath, file);
                                    fs.stat(filePath, (err, stats) => {
                                        if (now.getTime() - stats.mtime.getTime() > retentionPeriod) {
                                            console.log(`[Backup Cleanup] Deleting old backup: ${filePath}`);
                                            fs.unlink(filePath, err => {
                                                if (err) console.error(`[Backup Cleanup] Error deleting file: ${err.message}`);
                                            });
                                        }
                                    });
                                });
                            });
                        }
                    });
                });
            }
        });
    });
}

export function scheduleBackups() {
    if (cron.validate(BACKUP_CRON)) {
        console.log(`[Backup] Scheduling backups with cron expression: ${BACKUP_CRON}`);
        cron.schedule(BACKUP_CRON, runBackup);
    } else {
        console.error(`[Backup] Invalid cron expression: ${BACKUP_CRON}`);
    }
}
