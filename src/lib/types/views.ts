export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty';

export interface ViewFilter {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: string;
}

export interface ViewSort {
  id: string;
  columnId: string;
  direction: 'asc' | 'desc';
}

export type OpenBehavior = 'center' | 'side' | 'full';

export interface TableViewConfig {
  type: 'table';
  columnOrder: string[];   // visible column IDs in order; [] = use schema order
  hiddenColumns: string[];
  filters: ViewFilter[];
  sorts: ViewSort[];
  openBehavior?: OpenBehavior;
}

export interface KanbanViewConfig {
  type: 'kanban';
  groupByCol: string;
  groupOrder: string[];    // option values in display order; [] = use options order
  filters: ViewFilter[];
  sorts: ViewSort[];
  openBehavior?: OpenBehavior;
}

export interface CalendarViewConfig {
  type: 'calendar';
  dateCol: string;         // which date or datetime column to place cards on
  viewMode: 'month' | 'week';
  firstDayOfWeek?: 'sunday' | 'monday';
  filters: ViewFilter[];
  sorts: ViewSort[];
  openBehavior?: OpenBehavior;
}

export interface DatabaseView {
  id: string;
  name: string;
  config: TableViewConfig | KanbanViewConfig | CalendarViewConfig;
}


