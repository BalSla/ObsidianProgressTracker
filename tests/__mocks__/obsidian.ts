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
