import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { dbMiddleware } from '@/core/middleware/db-middleware';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

// --- Server Function ---
export const getQSDetailFn = createServerFn({ method: "POST" })
    .middleware([dbMiddleware])
    .inputValidator((qsId: unknown) => {
        if (typeof qsId !== 'string') throw new Error('Invalid input');
        return qsId;
    })
    .handler(async ({ data: qsId, context }: { data: string, context: any }) => {
        const { db } = context;

        const qs = await db.query.cqcQualityStatements.findFirst({
            where: eq(schema.cqcQualityStatements.id, qsId),
            with: {
                // We can add relations here later (evidence, actions, etc.)
            }
        });

        if (!qs) throw new Error("Quality Statement not found");

        return qs;
    });

// --- Component ---
export const Route = createFileRoute('/_app/dashboard/qs/$qsId')({
    component: QSDetail,
    loader: async ({ params }) => await getQSDetailFn({ data: params.qsId }),
});

function QSDetail() {
    const { qsId } = Route.useParams();
    const { data: qs, isLoading } = useQuery({
        queryKey: ['qs-detail', qsId],
        queryFn: () => getQSDetailFn({ data: qsId }),
    });

    if (isLoading) return <div>Loading...</div>;
    if (!qs) return <div>Not found</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{qs.id}</span>
                    <h1 className="text-3xl font-bold mt-1">{qs.title}</h1>
                </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-lg border">
                <h3 className="font-semibold mb-2">Evidence & Compliance</h3>
                <p className="text-sm text-gray-600">This section will contain the evidence library and action tracking (Milestone 3+).</p>
            </div>
        </div>
    );
}
