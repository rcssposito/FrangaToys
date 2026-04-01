import { useInfiniteQuery } from '@tanstack/react-query';
import { FiltersSchema, FiguraSchema } from '@/lib/dto';
import { z } from 'zod';

const ResponseSchema = z.object({
    items: z.array(FiguraSchema),
    nextCursor: z.number().optional(),
    total: z.number().optional(),
});

type Filters = z.infer<typeof FiltersSchema>;

const fetchFiguras = async ({ pageParam = 0, queryKey }: any) => {
    const [_, filters] = queryKey;

    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.categoria) params.set('categoria', filters.categoria);
    if (filters.studioIds) params.set('studioIds', filters.studioIds);
    if (filters.incluirNaoVendaveis) params.set('incluirNaoVendaveis', filters.incluirNaoVendaveis);
    if (filters.novidades) params.set('novidades', filters.novidades);
    if (filters.sort) params.set('sort', filters.sort);

    // Pass 'page' to backend
    params.set('page', pageParam.toString());
    // Optional: override limit if needed, default is 20 in backend now
    // params.set('limit', '20');

    const res = await fetch(`/api/figuras?${params.toString()}`);
    if (!res.ok) throw new Error('Network error');
    return ResponseSchema.parse(await res.json());
};

export const useFiguras = (filters: Filters) => {
    return useInfiniteQuery({
        queryKey: ['figuras', filters],
        queryFn: fetchFiguras,
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });
};
