/** localStorage keys for Geveze CRM persistence (single source of truth). */

export const TASKS_STORAGE_KEY = 'geveze.crm.tasks';
export const VIEW_STORAGE_KEY = 'geveze.crm.currentView';
export const PORTFOLIO_STORAGE_KEY = 'geveze.crm.portfolioCompanies';
export const TABLE_SCHEMA_STORAGE_KEY = 'geveze.crm.tableColumnSchema';
export const OLD_CUSTOM_COLUMNS_KEY = 'geveze.crm.customColumns';
export const OLD_CUSTOM_VALUES_KEY = 'geveze.crm.customValues';
export const TASK_ORDER_STORAGE_KEY = 'geveze.crm.taskOrderByColumn';
export const SERVICE_TYPES_STORAGE_KEY = 'geveze.crm.serviceTypes';
export const TAGS_STORAGE_KEY = 'geveze.crm.tags';
export const TAG_SERVICE_MAP_KEY = 'geveze.crm.tagServiceMap';

export const GEVEZE_STORAGE_KEYS = [
  TASKS_STORAGE_KEY,
  VIEW_STORAGE_KEY,
  PORTFOLIO_STORAGE_KEY,
  TABLE_SCHEMA_STORAGE_KEY,
  OLD_CUSTOM_COLUMNS_KEY,
  OLD_CUSTOM_VALUES_KEY,
  TASK_ORDER_STORAGE_KEY,
  SERVICE_TYPES_STORAGE_KEY,
  TAGS_STORAGE_KEY,
  TAG_SERVICE_MAP_KEY,
] as const;
