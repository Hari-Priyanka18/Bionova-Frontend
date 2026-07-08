const fs = require('fs');

try {
  let code = fs.readFileSync('c:/Basha1/frontend/src/components/Projectmanager/TaskBoard.jsx', 'utf8');

  // 1. Move Project Summary Card
  const projSummaryStart = code.indexOf('{/* Project Summary Card */}');
  const projSummaryEnd = code.indexOf('{/* ===== ROW 1: Filter Dropdowns + Search ===== */}');
  if (projSummaryStart === -1 || projSummaryEnd === -1) throw new Error("Could not find Project Summary boundaries");
  const projSummaryCode = code.substring(projSummaryStart, projSummaryEnd);
  
  code = code.replace(projSummaryCode, '');
  
  const filtersEndIndex = code.indexOf('{/* ===== ROW 2: Status Tab Pills ===== */}');
  const beforeFiltersEnd = code.substring(0, filtersEndIndex);
  const afterFiltersEnd = code.substring(filtersEndIndex);
  
  const wrappedProjSummary = '{selectedProjectId !== "All" && (\n' + projSummaryCode.trim() + '\n)}\\n\\n          ';
  
  code = beforeFiltersEnd + wrappedProjSummary + afterFiltersEnd;

  // 2. Remove Assignee field
  const assigneeStart = code.indexOf('{/* Assignee */}');
  const taskTypeStart = code.indexOf('{/* Task Type */}');
  if (assigneeStart !== -1 && taskTypeStart !== -1) {
    code = code.substring(0, assigneeStart) + code.substring(taskTypeStart);
  }

  // 3. Remove Filters & View buttons
  const toolbarActionsRegex = /<div className="tb-toolbar-actions"[\s\S]*?<\/div>/;
  code = code.replace(toolbarActionsRegex, '');

  // 4. Update Priority Options
  const priorityRegex = /options=\{\[\s*\{\s*value:\s*"All",\s*label:\s*"All"\s*\},[\s\S]*?\{\s*value:\s*"Overdue",\s*label:\s*"Overdue"\s*\}\s*\]\}/;
  const newPriorityOpts = `options={[
                    { value: "All", label: "All" },
                    { value: "Critical", label: "Critical" },
                    { value: "High", label: "High" },
                    { value: "Medium", label: "Medium" },
                    { value: "Normal", label: "Normal" },
                    { value: "Low", label: "Low" }
                  ]}`;
  code = code.replace(priorityRegex, newPriorityOpts);

  // 5. Remove Drag & Drop
  code = code.replace(/draggable\s*onDragStart=\{[^}]+\}/g, '');
  code = code.replace(/onDragOver=\{[^}]+\}\s*onDragLeave=\{[^}]+\}\s*onDrop=\{[^}]+\}/g, '');
  code = code.replace(/\s*\$\{draggedOverCol === [^}]+\}\s*/g, '');

  fs.writeFileSync('c:/Basha1/frontend/src/components/Projectmanager/TaskBoard.jsx', code);
  console.log("SUCCESS");
} catch (e) {
  console.error(e);
}
