import { relations } from 'drizzle-orm';
import { cqcQualityStatements, cqcKeyQuestions } from './schema';

export const cqcQualityStatementRelations = relations(cqcQualityStatements, ({ one }) => ({
    keyQuestion: one(cqcKeyQuestions, {
        fields: [cqcQualityStatements.keyQuestionId],
        references: [cqcKeyQuestions.id],
    }),
}));

export const cqcKeyQuestionRelations = relations(cqcKeyQuestions, ({ many }) => ({
    qualityStatements: many(cqcQualityStatements),
}));
