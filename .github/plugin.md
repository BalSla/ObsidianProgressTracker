#progtrackplug #application-component #project 

> [!Definition] Calculates the completion ratio of linked task trees

*Obsidian plugin that displays progress statistics inline by calculating the ratio of completed to incomplete tasks within task trees. It includes tasks from both the current note and any linked notes, offering insights like Complete 10% (10/100). Designed to integrate seamlessly via markdown post-processing, it avoids automatic parent task completion for full user control.*
## Requirements
### Functional requirements

- Can be inserted into any Obsidian's note in as inline string. See [[MarkdownPostProcessor]]
- Shows how many tasks are complete `Complete 10%(10/100)`
- Task trees from linked pages are also counted. Pages considered as linked if linked from task.
- Automatically updates parent task checkboxes when all of their subtasks change state
## Issues

Open issues PRGS:[[Obsidian Progress Tracker Plugin Issues]]