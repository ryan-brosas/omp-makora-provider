declare module "@earendil-works/pi-coding-agent" {
  export interface ExtensionAPI {
    [key: string]: any;
  }

  export class AuthStorage {
    static getInstance(): AuthStorage;
    static create(...args: any[]): any;
    [key: string]: any;
  }

  export class ModelRegistry {
    static getInstance(): ModelRegistry;
    static create(...args: any[]): any;
    [key: string]: any;
  }

  export class SessionManager {
    static inMemory(...args: any[]): SessionManager;
    [key: string]: any;
  }

  export function createAgentSession(...args: any[]): any;

  const _default: any;
  export default _default;
}

declare module "@earendil-works/pi-ai" {
  const _default: any;
  export default _default;
  export function generateObject(...args: any[]): any;
  export function generateText(...args: any[]): any;
  export function StringEnum(...args: any[]): any;
}
