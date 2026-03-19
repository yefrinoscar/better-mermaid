import { boolean, index, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const graphs = pgTable(
  'graphs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    title: text('title').notNull().default('Untitled graph'),
    mermaidCode: text('mermaid_code').notNull(),
    theme: text('theme').notNull().default('github-dark'),
    codeFontSize: smallint('code_font_size').notNull().default(16),
    transparent: boolean('transparent').notNull().default(false),
    sourcePresetId: text('source_preset_id'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('graphs_user_updated_idx').on(table.userId, table.updatedAt),
    index('graphs_user_title_idx').on(table.userId, table.title),
  ],
)
