/**
 * 文件上传工具
 *
 * 统一的文件上传处理和错误处理
 */

import { NextRequest, NextResponse } from 'next/server';

export interface FileUploadOptions {
  maxSize?: number; // 最大文件大小（字节），默认 10MB
  allowedTypes?: string[]; // 允许的文件类型
  allowedExtensions?: string[]; // 允许的文件扩展名
}

export interface UploadedFile {
  filename: string;
  size: number;
  mimetype: string;
  buffer: Buffer;
  extension: string;
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: FileUploadOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/json',
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.json'],
};

/**
 * 从请求中解析文件
 */
export async function parseUploadedFile(
  request: NextRequest,
  options: FileUploadOptions = DEFAULT_OPTIONS
): Promise<UploadedFile> {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    throw new Error('未找到文件');
  }

  return validateAndProcessFile(file, options);
}

/**
 * 从请求中解析多个文件
 */
export async function parseUploadedFiles(
  request: NextRequest,
  options: FileUploadOptions = DEFAULT_OPTIONS
): Promise<UploadedFile[]> {
  const formData = await request.formData();
  const files: UploadedFile[] = [];

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      try {
        const file = await validateAndProcessFile(value, options);
        files.push(file);
      } catch (error) {
        console.error(`文件验证失败 (${value.name}):`, error);
        // 继续处理其他文件
      }
    }
  }

  if (files.length === 0) {
    throw new Error('未找到有效文件');
  }

  return files;
}

/**
 * 验证并处理文件
 */
async function validateAndProcessFile(
  file: File,
  options: FileUploadOptions
): Promise<UploadedFile> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. 检查文件大小
  if (opts.maxSize && file.size > opts.maxSize) {
    const maxSizeMB = Math.round(opts.maxSize / 1024 / 1024);
    const fileSizeMB = Math.round(file.size / 1024 / 1024 * 10) / 10;
    throw new Error(
      `文件大小超过限制: ${fileSizeMB}MB / ${maxSizeMB}MB`
    );
  }

  // 2. 检查文件类型
  if (opts.allowedTypes && !opts.allowedTypes.includes(file.type)) {
    throw new Error(
      `不支持的文件类型: ${file.type}`
    );
  }

  // 3. 检查文件扩展名
  const extension = getFileExtension(file.name);
  if (opts.allowedExtensions && !opts.allowedExtensions.includes(extension)) {
    throw new Error(
      `不支持的文件扩展名: ${extension}`
    );
  }

  // 4. 读取文件内容
  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    filename: file.name,
    size: file.size,
    mimetype: file.type,
    buffer,
    extension,
  };
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return '';
  }
  return filename.substring(lastDot).toLowerCase();
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 文件上传错误
 */
export class FileUploadError extends Error {
  constructor(
    message: string,
    public code: string = 'FILE_UPLOAD_ERROR'
  ) {
    super(message);
    this.name = 'FileUploadError';
  }
}

/**
 * 文件大小错误
 */
export class FileSizeError extends FileUploadError {
  constructor(actualSize: number, maxSize: number) {
    const actualMB = formatFileSize(actualSize);
    const maxMB = formatFileSize(maxSize);
    super(
      `文件大小超过限制: ${actualMB} / ${maxMB}`,
      'FILE_SIZE_ERROR'
    );
    this.name = 'FileSizeError';
  }
}

/**
 * 文件类型错误
 */
export class FileTypeError extends FileUploadError {
  constructor(actualType: string, allowedTypes: string[]) {
    super(
      `不支持的文件类型: ${actualType}。允许的类型: ${allowedTypes.join(', ')}`,
      'FILE_TYPE_ERROR'
    );
    this.name = 'FileTypeError';
  }
}

/**
 * 创建文件上传处理器
 */
export function createFileUploadHandler(options: FileUploadOptions = DEFAULT_OPTIONS) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const uploadedFile = await parseUploadedFile(request, options);

      // TODO: 在这里添加文件存储逻辑（例如上传到对象存储）
      // const { url } = await uploadToObjectStorage(uploadedFile);

      return NextResponse.json({
        success: true,
        data: {
          filename: uploadedFile.filename,
          size: uploadedFile.size,
          mimetype: uploadedFile.mimetype,
          // url: url, // 取消注释并实现上传逻辑
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[文件上传] 上传失败:', error);

      return NextResponse.json(
        {
          success: false,
          error: error.message || '文件上传失败',
          code: error.code || 'FILE_UPLOAD_ERROR',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }
  };
}
