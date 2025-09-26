#implementation-work-package #progtrackplug 

**Realizes**:: [[Obsidian Progress Tracker Plugin]]

PRGS:[[]]

- [x] Render inline field
	- [x] Inline field should be editable if cursor within the field
	- [x] Calculate ratio on a single page
		- [x] Define [[task-tree calculation rules]]
		- [x] Build full tree of tasks
	- [x] Handle [[malformed task-tree]]. Add exclamation icon in the end of a rendered expression
	- [x] Ignore tasks in pages marked by specified tag
		- [x] Introduce customizable`ignoretag` setting (custom tag)
	- [x] Render inline field with linked to a page
		- [x] Simple link to page with tasks
		- [x] Handle the task linked to a page without tasks
		- [x] Check that non-task links aren't considered as links
	- [x] Handle cyclic task trees (circular lists)
	- [x] Handle complex obsidian links
	- [x] Handle multiple task trees on a page
		- [x] `Ignore tag` allows to ignore any task on page
- [x] Refresh inline fields if linked pages are changed (only if they contain task trees)
- [x] Configurable inline field expression
- [x] Configurable `ignore tag`
- [x] Remove `No link name`
- [x] Remove the 'Plugin' from plugin' name
