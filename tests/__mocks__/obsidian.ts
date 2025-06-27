export class Plugin {
  app: any;
  manifest: any;
  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }
}
export class PluginSettingTab {}
export class Setting {
  constructor(public el?: any) {}
  setName() { return this; }
  setDesc() { return this; }
  addText(cb?: any) { const t = { setPlaceholder: ()=>t, setValue:()=>t, onChange:()=>t }; if (cb) cb(t); return this; }
}
export class TFile { constructor(public path: string) {} }
export class MarkdownView {}
export class App { vault: any; workspace: any; metadataCache: any; constructor() {} }
export const editorLivePreviewField = {};

export class FileSystemAdapter {
  constructor(private basePath: string) {}
  getBasePath() { return this.basePath; }
}

export class Vault {
  adapter: { getBasePath: () => string };
  constructor(basePath: string) {
    this.adapter = { getBasePath: () => basePath };
  }
  async read(file: TFile): Promise<string> {
    const fs = require('fs');
    const path = require('path');
    const full = path.join(this.adapter.getBasePath(), file.path);
    return fs.readFileSync(full, 'utf8');
  }
  async readBinary(file: TFile): Promise<Uint8Array> {
    const fs = require('fs');
    const path = require('path');
    const full = path.join(this.adapter.getBasePath(), file.path);
    return fs.readFileSync(full);
  }
  async create(filePath: string, data: string): Promise<TFile> {
    const fs = require('fs');
    const path = require('path');
    const full = path.join(this.adapter.getBasePath(), filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, data);
    return new TFile(filePath);
  }
  async modify(file: TFile, data: string): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    const full = path.join(this.adapter.getBasePath(), file.path);
    fs.writeFileSync(full, data);
  }
  getAbstractFileByPath(filePath: string): TFile | null {
    const fs = require('fs');
    const path = require('path');
    const full = path.join(this.adapter.getBasePath(), filePath);
    return fs.existsSync(full) ? new TFile(filePath) : null;
  }
}
