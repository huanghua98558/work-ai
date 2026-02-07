import { execShell } from '@/lib/shell';

// 知识库配置
export interface KnowledgeConfig {
  dataset: string;
}

// 搜索结果
export interface SearchResult {
  content: string;
  score?: number;
  metadata?: Record<string, any>;
}

// 搜索配置
export interface SearchConfig {
  topK?: number;
  dataset?: string;
}

/**
 * 知识库服务类
 */
export class KnowledgeService {
  private dataset: string;

  constructor(config: KnowledgeConfig) {
    this.dataset = config.dataset;
  }

  /**
   * 导入文本内容
   */
  async addContent(content: string): Promise<boolean> {
    try {
      const command = `coze-coding-ai knowledge add --dataset "${this.dataset}" --content "${content.replace(/"/g, '\\"')}"`;
      
      const result = await execShell(command);
      
      return result.success || result.exitCode === 0;
    } catch (error) {
      console.error('知识库导入文本失败:', error);
      return false;
    }
  }

  /**
   * 导入 URL
   */
  async addUrl(url: string): Promise<boolean> {
    try {
      const command = `coze-coding-ai knowledge add --dataset "${this.dataset}" --url "${url}"`;
      
      const result = await execShell(command);
      
      return result.success || result.exitCode === 0;
    } catch (error) {
      console.error('知识库导入 URL 失败:', error);
      return false;
    }
  }

  /**
   * 语义搜索
   */
  async search(query: string, config: SearchConfig = {}): Promise<SearchResult[]> {
    try {
      const topK = config.topK || 5;
      const dataset = config.dataset || this.dataset;

      let command = `coze-coding-ai knowledge search --query "${query.replace(/"/g, '\\"')}" --top-k ${topK}`;
      
      if (dataset) {
        command += ` --dataset "${dataset}"`;
      }

      const result = await execShell(command);
      
      // 解析输出
      if (result.stdout) {
        // 尝试解析 JSON 输出
        try {
          const json = JSON.parse(result.stdout);
          if (Array.isArray(json)) {
            return json.map((item: any) => ({
              content: item.content || item.text || '',
              score: item.score,
              metadata: item.metadata,
            }));
          }
        } catch (e) {
          // 如果不是 JSON，解析文本输出
          return parseTextOutput(result.stdout);
        }
      }

      return [];
    } catch (error) {
      console.error('知识库搜索失败:', error);
      return [];
    }
  }

  /**
   * 批量导入内容
   */
  async batchAddContent(contents: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const content of contents) {
      const result = await this.addContent(content);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * 获取相关上下文（用于增强 AI 回答）
   */
  async getContext(query: string, maxResults: number = 3): Promise<string> {
    const results = await this.search(query, { topK: maxResults });
    
    if (results.length === 0) {
      return '';
    }

    // 组合搜索结果
    const context = results
      .map((result, index) => `[参考${index + 1}] ${result.content}`)
      .join('\n\n');

    return context;
  }
}

/**
 * 解析文本输出
 */
function parseTextOutput(text: string): SearchResult[] {
  const results: SearchResult[] = [];
  const lines = text.split('\n');

  // 简单的文本解析逻辑
  for (const line of lines) {
    if (line.trim()) {
      results.push({
        content: line.trim(),
        score: 1,
      });
    }
  }

  return results;
}

// 默认知识库服务实例
let defaultKnowledgeService: KnowledgeService | null = null;

/**
 * 获取默认知识库服务实例
 */
export function getKnowledgeService(dataset: string = 'workbot_knowledge'): KnowledgeService {
  if (!defaultKnowledgeService) {
    defaultKnowledgeService = new KnowledgeService({ dataset });
  }
  return defaultKnowledgeService;
}
