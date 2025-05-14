#application-interface #obsidian 

> [!info] Obsidian provides the MarkdownPostProcessor API to let plugins inspect and modify rendered HTML from markdown. You can scan for inline patterns and replace them with custom HTML elements.

```ts
import { Plugin } from "obsidian";
export default class JiraInlinePlugin extends Plugin {
  async onload() {
    this.registerMarkdownPostProcessor((element, context) => {
      element.querySelectorAll("p").forEach(p => {
        const regex = /JIRA:([A-Z]+-\d+)/g;
        let html = p.innerHTML;
        html = html.replace(regex, (match, issueKey) => {
          // Replace with a styled HTML span or container
          return `<span class="jira-issue" data-key="${issueKey}">[${issueKey}] Loading...</span>`;
        });
        p.innerHTML = html;
      });
    });
  }
}
```