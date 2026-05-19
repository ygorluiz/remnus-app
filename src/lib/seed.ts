import { db } from '@/db';
import { workspaces, workspaceItems, standalonePages, databases, pages, workspaceMembers } from '@/db/schema';

export async function createSeedWorkspace(userId: string, userName?: string | null) {
  const workspaceName = userName ? `${userName} Workspace` : 'Personal Workspace';

  // 1. Create a workspace
  const workspaceId = crypto.randomUUID();
  await db.insert(workspaces).values({
    id: workspaceId,
    name: workspaceName,
    sortOrder: 0,
    createdAt: new Date(),
  });

  // 2. Add the user as owner
  await db.insert(workspaceMembers).values({
    id: crypto.randomUUID(),
    workspaceId,
    userId,
    role: 'owner',
    createdAt: new Date(),
  });

  // 3. Create a "Getting Started" Standalone Page
  const pageItemId = crypto.randomUUID();
  const pageId = crypto.randomUUID();
  await db.insert(workspaceItems).values({
    id: pageItemId,
    workspaceId,
    type: 'page',
    title: 'Welcome to Remna',
    sortOrder: 0,
    icon: '👋',
    iconColor: 'default',
  });

  await db.insert(standalonePages).values({
    id: pageId,
    itemId: pageItemId,
    content: `## Welcome to your new workspace! 🚀

Remna is a Notion-like application built around a **workspace** model. You can create standalone pages and fully customizable databases side-by-side.

### Quick Tips:
1. **Sidebar Navigation**: Use the sidebar to switch between workspaces, open pages, or create new ones using templates.
2. **Interactive Databases**: Below you'll find a **Tasks** database. Databases support Table, Kanban, and Calendar views!
3. **Slash Commands**: In any page editor or description, press \`/\` to open the command menu for headers, lists, code blocks, and more.
4. **Custom Icons**: Click the page/database icons in the sidebar or at the top of the editors to select emojis or Lucide icons with custom theme colors.
5. **Reorderable Sidebar**: You can now **drag and drop** both your Workspaces and Sidebar Items to organize them exactly how you like!

Have fun organizing your ideas! 💡
`,
  });

  // 4. Create an example "Tasks" Database
  const dbItemId = crypto.randomUUID();
  const dbId = crypto.randomUUID();
  
  // Define schema for Tasks database
  const schema = [
    { id: 'title', name: 'Title', type: 'text' as const },
    {
      id: 'status',
      name: 'Status',
      type: 'select' as const,
      options: [
        { value: 'To Do', color: 'blue' as const },
        { value: 'In Progress', color: 'yellow' as const },
        { value: 'Done', color: 'green' as const },
      ],
    },
    {
      id: 'priority',
      name: 'Priority',
      type: 'select' as const,
      options: [
        { value: 'Low', color: 'green' as const },
        { value: 'Medium', color: 'yellow' as const },
        { value: 'High', color: 'red' as const },
      ],
    },
    { id: 'dueDate', name: 'Due Date', type: 'date' as const, dateFormat: 'default' as const },
  ];

  const views = [
    {
      id: 'v1',
      name: 'Kanban Board',
      config: {
        type: 'kanban' as const,
        groupByCol: 'status',
        groupOrder: ['To Do', 'In Progress', 'Done'],
        filters: [],
        sorts: [],
        openBehavior: 'center' as const,
        cardProperties: ['priority', 'dueDate'],
        showPropertyLabels: true,
        propertyTextClamp: 'truncate' as const,
        cardColorCol: 'priority',
        groupColBg: true,
      },
    },
    {
      id: 'v2',
      name: 'Table View',
      config: {
        type: 'table' as const,
        columnOrder: ['title', 'status', 'priority', 'dueDate'],
        hiddenColumns: [],
        filters: [],
        sorts: [],
        openBehavior: 'center' as const,
      },
    },
  ];

  await db.insert(workspaceItems).values({
    id: dbItemId,
    workspaceId,
    type: 'database',
    title: 'Tasks',
    sortOrder: 1,
    icon: '✅',
    iconColor: 'default',
  });

  await db.insert(databases).values({
    id: dbId,
    name: 'Tasks',
    itemId: dbItemId,
    schema,
    views,
  });

  // Seed some initial task pages
  const seedRows = [
    { title: 'Learn how to use Remna', properties: { status: 'In Progress', priority: 'High', dueDate: new Date().toISOString().split('T')[0] } },
    { title: 'Create a new database from a template', properties: { status: 'To Do', priority: 'Medium', dueDate: '' } },
    { title: 'Set up my profile and avatar', properties: { status: 'Done', priority: 'Low', dueDate: '' } },
  ];

  for (let i = 0; i < seedRows.length; i++) {
    const row = seedRows[i];
    await db.insert(pages).values({
      id: crypto.randomUUID(),
      databaseId: dbId,
      title: row.title,
      content: `This is a sample page for task: **${row.title}**. You can write markdown content here, add bullet lists, tables, and images!`,
      properties: row.properties,
      sortOrder: i,
    });
  }
}

// ── Demo seed data ─────────────────────────────────────────────────────────

const GETTING_STARTED = `## Getting Started with Remna

Remna is a workspace for notes, databases, and project management — all in one sidebar. This guide walks you through everything in this demo workspace.

---

### What's in this workspace?

This workspace includes four databases and this page to help you explore all of Remna's features:

- **Sprint Board** — Kanban + Table views. Tasks with status, priority, assignee, and story points. Notice the color-coded columns and row tints.
- **Bug Tracker** — Three views of the same bug data: All Bugs (table), Open (filtered), and Board (kanban). Row colors reflect severity.
- **Team Calendar** — Calendar view for scheduling events, plus a Schedule table view sorted by date.
- **Reading List** — Simple table database with two views: all books and a filtered/sorted "Finished" view.

---

### Pages

Standalone pages like this one hold freeform **markdown content** — great for notes, docs, meeting minutes, and long-form writing.

A few things to try:
- Press \`/\` at the start of any line to open the **slash command menu** — insert headings, bullet lists, numbered lists, code blocks, quotes, and more.
- Select any text to reveal the **bubble toolbar** for bold, italic, strikethrough, code, and heading shortcuts.
- Click the **icon** at the top of this page to pick any emoji or Lucide icon with a custom color.
- Use the **width toggle** (top-right toolbar) to switch between Narrow, Wide, and Full width layouts.

---

### Databases

Databases are like spreadsheets where every row is also a full page. Each cell is editable inline — no need to open the row to change a value.

#### Views
Every database can have multiple named views — each with its own layout, visible columns, filters, and sorts. Click the **view tabs** at the top of a database to switch between them.

Supported view types:
- **Table** — Spreadsheet layout with sortable columns, resizable widths, and row color tinting
- **Kanban** — Card board grouped by any select property; supports card colors and column background tints
- **Calendar** — Monthly or weekly calendar placing cards by a date property

#### Properties
Open any database row to see its full property panel on the right. Supported types: Text, Number, Date, DateTime, Select, and Multi-select. Select and multi-select options have 9 color options.

#### Filters & Sorts
Click the **Properties** button (top-right of any database) to open the sidebar. From there you can:
- Show/hide columns per view
- Add filters (applied only to the current view)
- Add sorts
- Configure group-by for kanban, date column for calendar
- Set page open behavior (center peek, side peek, or full page)

---

### Sidebar

- **Workspaces** — You can have multiple workspaces. Click the **+** button or hover a workspace to access its settings.
- **Drag to reorder** — Drag any item or workspace to rearrange the sidebar.
- **Settings** — Hover a workspace and click the gear icon to rename it, manage members, or delete it.
- **New items** — Click the **+** next to a workspace to open the template picker and choose from pages and database templates.
`;

export async function createDemoSeedData(userId: string, userName?: string | null) {
  const workspaceName = userName ? `${userName} Workspace` : 'Demo Workspace';
  const d = (n: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + n);
    return dt.toISOString().split('T')[0];
  };

  // ── Single workspace ────────────────────────────────────────────────────────

  const ws1 = crypto.randomUUID();
  await db.insert(workspaces).values({ id: ws1, name: workspaceName, sortOrder: 0, createdAt: new Date() });
  await db.insert(workspaceMembers).values({ id: crypto.randomUUID(), workspaceId: ws1, userId, role: 'owner', createdAt: new Date() });

  // Getting Started page
  const gettingStartedItem = crypto.randomUUID();
  await db.insert(workspaceItems).values({ id: gettingStartedItem, workspaceId: ws1, type: 'page', title: 'Getting Started', sortOrder: 0, icon: '👋', iconColor: 'default' });
  await db.insert(standalonePages).values({ id: crypto.randomUUID(), itemId: gettingStartedItem, content: GETTING_STARTED });

  // ── Sprint Board database ───────────────────────────────────────────────────

  const sprintSchema = [
    { id: 'title', name: 'Title', type: 'text' as const },
    { id: 'status', name: 'Status', type: 'select' as const, options: [
      { value: 'To Do', color: 'blue' as const },
      { value: 'In Progress', color: 'yellow' as const },
      { value: 'In Review', color: 'teal' as const },
      { value: 'Done', color: 'green' as const },
    ]},
    { id: 'priority', name: 'Priority', type: 'select' as const, options: [
      { value: 'P1 — Critical', color: 'red' as const },
      { value: 'P2 — High', color: 'orange' as const },
      { value: 'P3 — Medium', color: 'yellow' as const },
      { value: 'P4 — Low', color: 'green' as const },
    ]},
    { id: 'assignee', name: 'Assignee', type: 'text' as const },
    { id: 'sprint', name: 'Sprint', type: 'select' as const, options: [
      { value: 'Sprint 12', color: 'purple' as const },
      { value: 'Sprint 13', color: 'blue' as const },
    ]},
    { id: 'points', name: 'Points', type: 'number' as const },
  ];
  const sprintViews = [
    {
      id: 'v-sprint-1',
      name: 'Board',
      config: {
        type: 'kanban' as const,
        groupByCol: 'status',
        groupOrder: ['To Do', 'In Progress', 'In Review', 'Done'],
        filters: [],
        sorts: [],
        openBehavior: 'center' as const,
        cardProperties: ['priority', 'assignee', 'points'],
        showPropertyLabels: true,
        propertyTextClamp: 'truncate' as const,
        cardColorCol: 'priority',
        groupColBg: true,
      },
    },
    {
      id: 'v-sprint-2',
      name: 'Table',
      config: {
        type: 'table' as const,
        columnOrder: ['title', 'status', 'priority', 'assignee', 'sprint', 'points'],
        hiddenColumns: [],
        filters: [],
        sorts: [],
        openBehavior: 'center' as const,
        rowColorCol: 'priority',
      },
    },
  ];
  const sprintDbItem = crypto.randomUUID();
  const sprintDb = crypto.randomUUID();
  await db.insert(workspaceItems).values({ id: sprintDbItem, workspaceId: ws1, type: 'database', title: 'Sprint Board', sortOrder: 1, icon: '✅', iconColor: 'green' });
  await db.insert(databases).values({ id: sprintDb, name: 'Sprint Board', itemId: sprintDbItem, schema: sprintSchema, views: sprintViews });

  const sprintTasks = [
    { title: 'Implement OAuth login flow', status: 'In Progress', priority: 'P1 — Critical', assignee: 'Alice', sprint: 'Sprint 12', points: 8 },
    { title: 'Design new onboarding screens', status: 'In Review', priority: 'P2 — High', assignee: 'Bob', sprint: 'Sprint 12', points: 5 },
    { title: 'Fix mobile navigation bug', status: 'To Do', priority: 'P2 — High', assignee: 'Charlie', sprint: 'Sprint 12', points: 3 },
    { title: 'Add export to CSV feature', status: 'In Progress', priority: 'P3 — Medium', assignee: 'Alice', sprint: 'Sprint 12', points: 5 },
    { title: 'Write API documentation', status: 'To Do', priority: 'P3 — Medium', assignee: 'Bob', sprint: 'Sprint 12', points: 3 },
    { title: 'Set up CI/CD pipeline', status: 'Done', priority: 'P1 — Critical', assignee: 'Charlie', sprint: 'Sprint 12', points: 8 },
    { title: 'Database query optimization', status: 'Done', priority: 'P2 — High', assignee: 'Alice', sprint: 'Sprint 12', points: 5 },
    { title: 'User dashboard redesign', status: 'In Progress', priority: 'P2 — High', assignee: 'Bob', sprint: 'Sprint 13', points: 8 },
    { title: 'Push notification system', status: 'To Do', priority: 'P1 — Critical', assignee: 'Charlie', sprint: 'Sprint 13', points: 13 },
    { title: 'Performance monitoring setup', status: 'To Do', priority: 'P3 — Medium', assignee: 'Alice', sprint: 'Sprint 13', points: 5 },
    { title: 'Customer portal MVP', status: 'To Do', priority: 'P2 — High', assignee: 'Bob', sprint: 'Sprint 13', points: 13 },
    { title: 'Security audit remediation', status: 'Done', priority: 'P1 — Critical', assignee: 'Charlie', sprint: 'Sprint 12', points: 8 },
  ];
  for (let i = 0; i < sprintTasks.length; i++) {
    const t = sprintTasks[i];
    await db.insert(pages).values({
      id: crypto.randomUUID(),
      databaseId: sprintDb,
      title: t.title,
      content: '',
      properties: { title: t.title, status: t.status, priority: t.priority, assignee: t.assignee, sprint: t.sprint, points: t.points },
      sortOrder: i,
    });
  }

  // ── Bug Tracker database ────────────────────────────────────────────────────

  const bugSchema = [
    { id: 'title', name: 'Title', type: 'text' as const },
    { id: 'severity', name: 'Severity', type: 'select' as const, options: [
      { value: 'Critical', color: 'red' as const },
      { value: 'High', color: 'orange' as const },
      { value: 'Medium', color: 'yellow' as const },
      { value: 'Low', color: 'green' as const },
    ]},
    { id: 'status', name: 'Status', type: 'select' as const, options: [
      { value: 'Open', color: 'red' as const },
      { value: 'In Progress', color: 'yellow' as const },
      { value: 'Resolved', color: 'green' as const },
      { value: 'Closed', color: 'default' as const },
    ]},
    { id: 'module', name: 'Module', type: 'select' as const, options: [
      { value: 'Auth', color: 'blue' as const },
      { value: 'Dashboard', color: 'teal' as const },
      { value: 'API', color: 'purple' as const },
      { value: 'Settings', color: 'default' as const },
      { value: 'Mobile', color: 'orange' as const },
    ]},
    { id: 'reporter', name: 'Reporter', type: 'text' as const },
    { id: 'reported', name: 'Reported', type: 'date' as const, dateFormat: 'default' as const },
  ];
  const bugViews = [
    {
      id: 'v-bug-1',
      name: 'All Bugs',
      config: {
        type: 'table' as const,
        columnOrder: ['title', 'severity', 'status', 'module', 'reporter', 'reported'],
        hiddenColumns: [],
        filters: [],
        sorts: [{ id: 's1', columnId: 'severity', direction: 'asc' as const }],
        openBehavior: 'side' as const,
        rowColorCol: 'severity',
      },
    },
    {
      id: 'v-bug-2',
      name: 'Open',
      config: {
        type: 'table' as const,
        columnOrder: ['title', 'severity', 'module', 'reporter', 'reported'],
        hiddenColumns: [],
        filters: [{ id: 'f1', columnId: 'status', operator: 'equals' as const, value: 'Open' }],
        sorts: [{ id: 's1', columnId: 'severity', direction: 'asc' as const }],
        openBehavior: 'side' as const,
      },
    },
    {
      id: 'v-bug-3',
      name: 'Board',
      config: {
        type: 'kanban' as const,
        groupByCol: 'status',
        groupOrder: ['Open', 'In Progress', 'Resolved', 'Closed'],
        filters: [],
        sorts: [],
        openBehavior: 'side' as const,
        cardProperties: ['severity', 'module', 'reporter'],
        showPropertyLabels: true,
        propertyTextClamp: 'truncate' as const,
        cardColorCol: 'severity',
        groupColBg: false,
      },
    },
  ];
  const bugDbItem = crypto.randomUUID();
  const bugDb = crypto.randomUUID();
  await db.insert(workspaceItems).values({ id: bugDbItem, workspaceId: ws1, type: 'database', title: 'Bug Tracker', sortOrder: 2, icon: '🐛', iconColor: 'red' });
  await db.insert(databases).values({ id: bugDb, name: 'Bug Tracker', itemId: bugDbItem, schema: bugSchema, views: bugViews });

  const bugs = [
    { title: 'Login fails after password reset', severity: 'Critical', status: 'Open', module: 'Auth', reporter: 'Alice', reported: d(-5) },
    { title: 'Dashboard charts not loading on Safari', severity: 'High', status: 'In Progress', module: 'Dashboard', reporter: 'Bob', reported: d(-8) },
    { title: 'API rate limiting not working correctly', severity: 'Critical', status: 'In Progress', module: 'API', reporter: 'Charlie', reported: d(-3) },
    { title: 'Settings page crashes on mobile iOS', severity: 'High', status: 'Open', module: 'Mobile', reporter: 'Alice', reported: d(-6) },
    { title: 'CSV export includes soft-deleted rows', severity: 'Medium', status: 'Open', module: 'API', reporter: 'Bob', reported: d(-2) },
    { title: 'Dark mode toggle resets on page refresh', severity: 'Low', status: 'Resolved', module: 'Settings', reporter: 'Charlie', reported: d(-12) },
    { title: 'Search results showing duplicate entries', severity: 'Medium', status: 'In Progress', module: 'Dashboard', reporter: 'Alice', reported: d(-4) },
    { title: 'Email notifications delayed by ~30 minutes', severity: 'High', status: 'Open', module: 'API', reporter: 'Bob', reported: d(-1) },
  ];
  for (let i = 0; i < bugs.length; i++) {
    const b = bugs[i];
    await db.insert(pages).values({
      id: crypto.randomUUID(),
      databaseId: bugDb,
      title: b.title,
      content: '',
      properties: { title: b.title, severity: b.severity, status: b.status, module: b.module, reporter: b.reporter, reported: b.reported },
      sortOrder: i,
    });
  }

  // ── Team Calendar database ──────────────────────────────────────────────────

  const calSchema = [
    { id: 'title', name: 'Title', type: 'text' as const },
    { id: 'date', name: 'Date', type: 'date' as const, dateFormat: 'default' as const },
    { id: 'type', name: 'Type', type: 'select' as const, options: [
      { value: 'Meeting', color: 'blue' as const },
      { value: 'Review', color: 'teal' as const },
      { value: 'Release', color: 'green' as const },
      { value: 'Sprint', color: 'purple' as const },
      { value: 'Social', color: 'pink' as const },
    ]},
    { id: 'attendees', name: 'Attendees', type: 'text' as const },
  ];
  const calViews = [
    {
      id: 'v-cal-1',
      name: 'Calendar',
      config: {
        type: 'calendar' as const,
        dateCol: 'date',
        viewMode: 'month' as const,
        firstDayOfWeek: 'monday' as const,
        filters: [],
        sorts: [],
        openBehavior: 'center' as const,
        cardColorCol: 'type',
        cardProperties: ['attendees'],
        showPropertyLabels: false,
        propertyTextClamp: 'truncate' as const,
      },
    },
    {
      id: 'v-cal-2',
      name: 'Schedule',
      config: {
        type: 'table' as const,
        columnOrder: ['title', 'date', 'type', 'attendees'],
        hiddenColumns: [],
        filters: [],
        sorts: [{ id: 's1', columnId: 'date', direction: 'asc' as const }],
        openBehavior: 'center' as const,
      },
    },
  ];
  const calDbItem = crypto.randomUUID();
  const calDb = crypto.randomUUID();
  await db.insert(workspaceItems).values({ id: calDbItem, workspaceId: ws1, type: 'database', title: 'Team Calendar', sortOrder: 3, icon: '📅', iconColor: 'teal' });
  await db.insert(databases).values({ id: calDb, name: 'Team Calendar', itemId: calDbItem, schema: calSchema, views: calViews });

  const events = [
    { title: 'Daily Standup', date: d(-2), type: 'Meeting', attendees: 'Alice, Bob, Charlie, Diana' },
    { title: 'Daily Standup', date: d(-1), type: 'Meeting', attendees: 'Alice, Bob, Charlie, Diana' },
    { title: 'Daily Standup', date: d(0), type: 'Meeting', attendees: 'Alice, Bob, Charlie, Diana' },
    { title: 'Daily Standup', date: d(1), type: 'Meeting', attendees: 'Alice, Bob, Charlie, Diana' },
    { title: 'Daily Standup', date: d(2), type: 'Meeting', attendees: 'Alice, Bob, Charlie, Diana' },
    { title: 'Sprint 12 Review', date: d(-3), type: 'Review', attendees: 'Full team' },
    { title: 'Design Critique', date: d(-1), type: 'Review', attendees: 'Alice, Bob' },
    { title: 'Sprint 13 Planning', date: d(1), type: 'Sprint', attendees: 'Full team' },
    { title: 'API Architecture Review', date: d(3), type: 'Review', attendees: 'Charlie, Alice' },
    { title: 'Team Lunch', date: d(4), type: 'Social', attendees: 'All team' },
    { title: 'Customer Demo', date: d(6), type: 'Meeting', attendees: 'Bob, Diana' },
    { title: 'Tech Debt Session', date: d(8), type: 'Meeting', attendees: 'Charlie, Alice' },
    { title: 'Team Retrospective', date: d(10), type: 'Review', attendees: 'Full team' },
    { title: 'Sprint 13 Review', date: d(14), type: 'Review', attendees: 'Full team' },
    { title: 'Q3 Release — v2.1', date: d(16), type: 'Release', attendees: 'Full team' },
  ];
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    await db.insert(pages).values({
      id: crypto.randomUUID(),
      databaseId: calDb,
      title: e.title,
      content: '',
      properties: { title: e.title, date: e.date, type: e.type, attendees: e.attendees },
      sortOrder: i,
    });
  }

  // ── Reading List database (same workspace) ─────────────────────────────────

  const readingSchema = [
    { id: 'title', name: 'Title', type: 'text' as const },
    { id: 'author', name: 'Author', type: 'text' as const },
    { id: 'status', name: 'Status', type: 'select' as const, options: [
      { value: 'To Read', color: 'blue' as const },
      { value: 'Reading', color: 'yellow' as const },
      { value: 'Finished', color: 'green' as const },
    ]},
    { id: 'rating', name: 'Rating', type: 'number' as const },
    { id: 'category', name: 'Category', type: 'select' as const, options: [
      { value: 'Tech', color: 'blue' as const },
      { value: 'Business', color: 'teal' as const },
      { value: 'Design', color: 'pink' as const },
      { value: 'Self-Help', color: 'green' as const },
      { value: 'Fiction', color: 'purple' as const },
    ]},
  ];
  const readingViews = [
    {
      id: 'v-reading-1',
      name: 'All Books',
      config: {
        type: 'table' as const,
        columnOrder: ['title', 'author', 'status', 'rating', 'category'],
        hiddenColumns: [],
        filters: [],
        sorts: [],
        openBehavior: 'center' as const,
        rowColorCol: 'status',
      },
    },
    {
      id: 'v-reading-2',
      name: 'Finished',
      config: {
        type: 'table' as const,
        columnOrder: ['title', 'author', 'rating', 'category'],
        hiddenColumns: [],
        filters: [{ id: 'f1', columnId: 'status', operator: 'equals' as const, value: 'Finished' }],
        sorts: [{ id: 's1', columnId: 'rating', direction: 'desc' as const }],
        openBehavior: 'center' as const,
      },
    },
  ];
  const readingDbItem = crypto.randomUUID();
  const readingDb = crypto.randomUUID();
  await db.insert(workspaceItems).values({ id: readingDbItem, workspaceId: ws1, type: 'database', title: 'Reading List', sortOrder: 4, icon: '📚', iconColor: 'purple' });
  await db.insert(databases).values({ id: readingDb, name: 'Reading List', itemId: readingDbItem, schema: readingSchema, views: readingViews });

  const books = [
    { title: 'The Pragmatic Programmer', author: 'David Thomas', status: 'Finished', rating: 5, category: 'Tech' },
    { title: 'Design Systems', author: 'Alla Kholmatova', status: 'Reading', rating: 4, category: 'Design' },
    { title: 'Zero to One', author: 'Peter Thiel', status: 'Finished', rating: 5, category: 'Business' },
    { title: 'Clean Code', author: 'Robert C. Martin', status: 'Finished', rating: 4, category: 'Tech' },
    { title: 'Shape Up', author: 'Ryan Singer', status: 'To Read', rating: null, category: 'Business' },
    { title: "Don't Make Me Think", author: 'Steve Krug', status: 'Finished', rating: 5, category: 'Design' },
    { title: 'The Lean Startup', author: 'Eric Ries', status: 'Finished', rating: 4, category: 'Business' },
    { title: 'Atomic Habits', author: 'James Clear', status: 'Reading', rating: 5, category: 'Self-Help' },
    { title: 'An Elegant Puzzle', author: 'Will Larson', status: 'To Read', rating: null, category: 'Tech' },
  ];
  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    await db.insert(pages).values({
      id: crypto.randomUUID(),
      databaseId: readingDb,
      title: b.title,
      content: '',
      properties: { title: b.title, author: b.author, status: b.status, rating: b.rating, category: b.category },
      sortOrder: i,
    });
  }
}
