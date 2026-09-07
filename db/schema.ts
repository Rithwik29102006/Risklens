import {sqliteTable,text,real,integer} from 'drizzle-orm/sqlite-core';
export const assessments=sqliteTable('assessments',{id:integer('id').primaryKey({autoIncrement:true}),payload:text('payload').notNull(),eal:real('eal').notNull(),createdAt:text('created_at').notNull(),kind:text('kind').notNull()});
export const plans=sqliteTable('plans',{id:integer('id').primaryKey({autoIncrement:true}),payload:text('payload').notNull(),createdAt:text('created_at').notNull()});
export const onboardingDrafts=sqliteTable('onboarding_drafts',{id:integer('id').primaryKey({autoIncrement:true}),orgName:text('org_name').notNull(),step:integer('step').notNull(),stateJson:text('state_json').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});
