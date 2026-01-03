import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { dbMiddleware } from '@/core/middleware/db-middleware';
import * as schema from '@/db/schema';
import { asc } from 'drizzle-orm';

// --- Server Function ---
export const getTaxonomyFn = createServerFn({ method: "GET" })
    .middleware([dbMiddleware])
    .handler(async ({ context }) => {
        const { db } = context;

        // Fetch Key Questions
        const keyQuestions = await db.select().from(schema.cqcKeyQuestions).orderBy(asc(schema.cqcKeyQuestions.displayOrder));

        // Fetch Quality Statements
        const qualityStatements = await db.select().from(schema.cqcQualityStatements).orderBy(asc(schema.cqcQualityStatements.displayOrder));

        // Group QS by Key Question
        const grouped = keyQuestions.map((kq: typeof schema.cqcKeyQuestions.$inferSelect) => ({
            ...kq,
            qualityStatements: qualityStatements.filter((qs: typeof schema.cqcQualityStatements.$inferSelect) => qs.keyQuestionId === kq.id)
        }));

        return grouped;
    });

// --- Component ---
export const Route = createFileRoute('/_app/dashboard/qs/')({
    component: QSList,
    loader: async () => await getTaxonomyFn(),
});

type KeyQuestion = typeof schema.cqcKeyQuestions.$inferSelect;
type QualityStatement = typeof schema.cqcQualityStatements.$inferSelect;

interface KeyQuestionWithQS extends KeyQuestion {
    qualityStatements: QualityStatement[];
}

function QSList() {
    // We can use the loader data or useQuery for client-side revalidation
    const { data: taxonomy, isLoading } = useQuery({
        queryKey: ['cqc-taxonomy'],
        queryFn: () => getTaxonomyFn(),
    });

    if (isLoading) return <div className="p-8">Loading taxonomy...</div>;

    // Cast response to explicit type to help TS
    const items = taxonomy as unknown as KeyQuestionWithQS[] | undefined;

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">CQC Framework</h1>
            <p className="text-lg text-muted-foreground">Select a quality statement to manage evidence.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {items?.map((kq) => (
                    <div key={kq.id} className="space-y-4">
                        <div className={`p-4 rounded-lg bg-${kq.id === 'safe' ? 'blue' : kq.id === 'effective' ? 'green' : kq.id === 'caring' ? 'pink' : kq.id === 'responsive' ? 'purple' : 'orange'}-100 border`}>
                            <h2 className="text-xl font-bold capitalize">{kq.title}</h2>
                        </div>
                        <ul className="space-y-2">
                            {kq.qualityStatements.map((qs) => (
                                <li key={qs.id}>
                                    <Link to="/dashboard/qs/$qsId" params={{ qsId: qs.id }} className="block p-3 rounded hover:bg-slate-100 border transition-colors">
                                        <span className="text-sm font-medium">{qs.title}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
