import { exec as execNode } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(execNode);

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * 执行 shell 命令
 */
export async function execShell(command: string): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execAsync(command);
    return {
      success: true,
      stdout,
      stderr,
      exitCode: 0,
    };
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1,
    };
  }
}

/**
 * 执行 shell 命令（后台运行）
 */
export async function execShellBackground(command: string): Promise<ExecResult> {
  // 后台执行的命令会立即返回
  return await execShell(`${command} > /dev/null 2>&1 &`);
}
