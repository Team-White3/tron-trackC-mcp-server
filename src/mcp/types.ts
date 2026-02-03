export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  execute: (inputs: any) => Promise<any>;
}

export interface MCPResource {
  name: string;
  description: string;
  data: () => Promise<any>;
}

export class MCPServer {
  private tools: Map<string, MCPTool> = new Map();

  registerTool(tool: MCPTool) {
    this.tools.set(tool.name, tool);
  }

  async executeTool(toolName: string, inputs: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }

    // 验证输入
    if (tool.inputSchema && tool.inputSchema.required) {
      const missingFields = tool.inputSchema.required.filter((field: string) => 
        !inputs.hasOwnProperty(field)
      );
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
    }

    return tool.execute(inputs);
  }

  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }
}
