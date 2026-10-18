import Gio  from 'gi://Gio';
import GLib from 'gi://GLib';

import { CLI } from './constants.js';

export function runCli(args, timeoutSec = 20) {
    return new Promise((resolve, reject) => {
        let proc;
        try {
            proc = Gio.Subprocess.new(
                [CLI, ...args],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
            );
        } catch (e) {
            reject(new Error(`Cannot launch ${CLI}`));
            return;
        }
        let active = true;
        const tid = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, timeoutSec, () => {
            active = false;
            try { proc.force_exit(); } catch (_) {}
            return GLib.SOURCE_REMOVE;
        });
        proc.communicate_utf8_async(null, null, (p, res) => {
            if (active) { GLib.source_remove(tid); active = false; }
            try {
                const [, stdout, stderr] = p.communicate_utf8_finish(res);
                if (!p.get_successful()) {
                    const errFull = (stderr || '').trim();
                    const last    = errFull.split('\n').filter(Boolean).pop() || '';
                    const code    = p.get_exit_status();
                    const err = new Error(last || `exit ${code}`);
                    err.stderrFull = errFull;
                    err.exitCode   = code;
                    reject(err);
                    return;
                }
                resolve(stdout || '');
            } catch (e) { reject(e); }
        });
    });
}

export function runCmd(fullArgs, timeoutSec = 20) {
    return new Promise((resolve, reject) => {
        let proc;
        try {
            proc = Gio.Subprocess.new(
                fullArgs,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
            );
        } catch (e) {
            reject(new Error(`Cannot launch ${fullArgs[0]}`));
            return;
        }
        let active = true;
        const tid = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, timeoutSec, () => {
            active = false;
            try { proc.force_exit(); } catch (_) {}
            return GLib.SOURCE_REMOVE;
        });
        proc.communicate_utf8_async(null, null, (p, res) => {
            if (active) { GLib.source_remove(tid); active = false; }
            try {
                const [, stdout, stderr] = p.communicate_utf8_finish(res);
                if (!p.get_successful()) {
                    const errFull = (stderr || '').trim();
                    const last    = errFull.split('\n').filter(Boolean).pop() || '';
                    const code    = p.get_exit_status();
                    const err = new Error(last || `exit ${code}`);
                    err.stderrFull = errFull;
                    err.exitCode   = code;
                    reject(err);
                    return;
                }
                resolve(stdout || '');
            } catch (e) { reject(e); }
        });
    });
}

export function cleanCliOutput(text) {
    if (!text) return '(no reply)';
    let s = String(text);

    try {
        const j = JSON.parse(s);
        if (j && typeof j.output === 'string') s = j.output;
    } catch (_) {
        const m = /"output"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/.exec(s);
        if (m) s = m[1];
    }

    s = s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');

    s = s.replace(/\\n/g, '\n')
         .replace(/\\t/g, '\t')
         .replace(/\\r/g, '')
         .replace(/\\"/g, '"');

    const noise = [
        /^\s*\[🦆📜\]/,
        /Loading fuzzy index from:/i,
        /^Compiling\s+/i,
        /^Finished\s+.*profile/i,
        /^\s*$/,
    ];
    s = s.split('\n')
         .filter(l => !noise.slice(0, 4).some(re => re.test(l)))
         .join('\n');

    s = s.replace(/\n{3,}/g, '\n\n');

    return s.trim() || '(no reply)';
}

export function parseYoBlock(text) {
    if (!text) return { cleaned: text, command: null, ms: null };

    const lines = String(text).split('\n');
    let command = null;
    const args = [];
    let ms = null;
    const out = [];
    let inBlock = false;

    for (const line of lines) {
        if (/^\s*\[🦆📜\]/.test(line)) continue;

        if (/^\s*┌─\(yo-[^)]+\)/.test(line)) {
            inBlock = true;
            continue;
        }

        if (inBlock) {
            if (/^\s*[│└]/.test(line)) {
                const cmdM = /^\s*│\s*🦆\s*quack!\s*(.+?)\s*$/.exec(line);
                if (cmdM) { command = cmdM[1]; continue; }

                const argM = /^\s*└─⮞\s*(.+?)\s*$/.exec(line);
                if (argM) { args.push(argM[1]); continue; }

                if (/^\s*└─\s*🦆\s*says\s*⮞/.test(line)) continue;

                const timeM = /do took\s+([\d.]+)\s*ms/i.exec(line);
                if (timeM) { ms = parseFloat(timeM[1]); continue; }

                continue;
            }
            inBlock = false;
        }

        out.push(line);
    }

    let fullCommand = null;
    if (command !== null || args.length) {
        const parts = [];
        if (command) parts.push(command);
        for (const a of args) parts.push(a);
        fullCommand = parts.join(' ');
    }

    return {
        cleaned: out.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
        command: fullCommand,
        ms,
    };
}
